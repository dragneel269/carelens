import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  CheckCircle2,
  RefreshCw,
  Building2,
  Pill,
  Stethoscope,
  CreditCard,
  Ban,
  Clock,
  Filter,
} from 'lucide-react'
import { useConsents, useAuditEntries, apiRequest, type ConsentItem } from '../api/client'
import { useAuthStore } from '../lib/auth'
import { SkeletonCard } from '../components/clinical/SkeletonCard'
import { EmptyState } from '../components/clinical/EmptyState'

interface GroupDefinition {
  key: string
  label: string
  icon: typeof Stethoscope
  purpose: string
  description: string
  defaultCategories: string[]
}

const CONSENT_GROUPS: GroupDefinition[] = [
  {
    key: 'clinicians',
    label: 'Clinicians & Nursing',
    icon: Stethoscope,
    purpose: 'treatment',
    description: 'Internal medicine OPD, emergency care, inpatient wards, and clinical triage',
    defaultCategories: ['demographics_full', 'encounters', 'conditions', 'allergies', 'medications', 'labs'],
  },
  {
    key: 'pharmacy',
    label: 'Pharmacy Counter',
    icon: Pill,
    purpose: 'treatment',
    description: 'Central dispensary: medication dispensing, drug-allergy interactions, and dosage safety',
    defaultCategories: ['allergies', 'medications', 'demographics_min'],
  },
  {
    key: 'lab',
    label: 'Diagnostic Laboratory',
    icon: Building2,
    purpose: 'treatment',
    description: 'Diagnostic labs performing serial biochemistry panels, glucose, lipids, and urinalysis',
    defaultCategories: ['labs', 'demographics_min'],
  },
  {
    key: 'billing',
    label: 'Insurance & Claims Desk',
    icon: CreditCard,
    purpose: 'payment',
    description: 'Third-party administrator (TPA) and health insurer claims adjudication and reimbursement ledger',
    defaultCategories: ['claims', 'demographics_min'],
  },
]

export function PortalPage() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.currentUser)
  const isPatientUser = currentUser?.role === 'patient'
  const targetClid = currentUser?.linked_clid || 'CL-000001'

  const [filterOutcome, setFilterOutcome] = useState<'all' | 'denials'>('all')
  const [isProcessing, setIsProcessing] = useState(false)

  // Queries
  const {
    data: consents = [],
    isLoading: isLoadingConsents,
    isError: isErrorConsents,
    error: errorConsents,
    refetch: refetchConsents,
  } = useConsents()

  const {
    data: auditEntries = [],
    isLoading: isLoadingAudit,
    refetch: refetchAudit,
    isFetching: isFetchingAudit,
  } = useAuditEntries(100)

  // Map active consents by group
  const consentByGroup = useMemo(() => {
    const map: Record<string, ConsentItem> = {}
    for (const c of consents) {
      if (c.status === 'active') {
        map[c.group] = c
      }
    }
    return map
  }, [consents])

  // Single Group Revoke
  const handleRevokeGroup = async (groupKey: string) => {
    const existing = consentByGroup[groupKey]
    if (!existing) return

    setIsProcessing(true)
    try {
      await apiRequest(`/api/consents/${existing.id}/revoke`, { method: 'POST' })
      toast.success(`Revoked consent for ${groupKey}`, {
        description: 'Next read attempt by this provider will immediately be denied and redacted.',
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['consents'] }),
        queryClient.invalidateQueries({ queryKey: ['audit-entries'] }),
        queryClient.invalidateQueries({ queryKey: ['patient-summary'] }),
      ])
    } catch {
      toast.error(`Failed to revoke consent for ${groupKey}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // Single Group Grant / Restore
  const handleGrantGroup = async (groupDef: GroupDefinition) => {
    setIsProcessing(true)
    try {
      await apiRequest('/api/consents', {
        method: 'POST',
        body: JSON.stringify({
          clid: targetClid,
          group: groupDef.key,
          categories: groupDef.defaultCategories.join(','),
          purpose: groupDef.purpose,
          valid_days: 30,
        }),
      })
      toast.success(`Granted consent for ${groupDef.label}`, {
        description: 'Active for 30 days under specified purpose.',
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['consents'] }),
        queryClient.invalidateQueries({ queryKey: ['audit-entries'] }),
        queryClient.invalidateQueries({ queryKey: ['patient-summary'] }),
      ])
    } catch {
      toast.error(`Failed to grant consent for ${groupDef.label}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // Category Toggle inside a Group
  const handleToggleCategory = async (groupDef: GroupDefinition, category: string) => {
    const existing = consentByGroup[groupDef.key]
    setIsProcessing(true)

    try {
      if (!existing) {
        // Group was completely revoked -> Grant it with this category
        await apiRequest('/api/consents', {
          method: 'POST',
          body: JSON.stringify({
            clid: targetClid,
            group: groupDef.key,
            categories: category,
            purpose: groupDef.purpose,
            valid_days: 30,
          }),
        })
        toast.success(`Granted ${category} for ${groupDef.label}`)
      } else {
        const currentCats = existing.categories
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean)

        let newCats: string[]
        if (currentCats.includes(category)) {
          // Remove category
          newCats = currentCats.filter((c) => c !== category)
        } else {
          // Add category
          newCats = [...currentCats, category]
        }

        // Revoke old grant
        await apiRequest(`/api/consents/${existing.id}/revoke`, { method: 'POST' })

        if (newCats.length > 0) {
          // Create updated grant with remaining categories
          await apiRequest('/api/consents', {
            method: 'POST',
            body: JSON.stringify({
              clid: targetClid,
              group: groupDef.key,
              categories: newCats.join(','),
              purpose: existing.purpose || groupDef.purpose,
              valid_days: 30,
            }),
          })
          toast.success(`Updated ${groupDef.label} categories: ${newCats.join(', ')}`)
        } else {
          toast.success(`Revoked all categories for ${groupDef.label}`)
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['consents'] }),
        queryClient.invalidateQueries({ queryKey: ['audit-entries'] }),
        queryClient.invalidateQueries({ queryKey: ['patient-summary'] }),
      ])
    } catch {
      toast.error('Failed to update category consent')
    } finally {
      setIsProcessing(false)
    }
  }

  // Revoke All Consents
  const handleRevokeAll = async () => {
    const activeList = consents.filter((c) => c.status === 'active')
    if (activeList.length === 0) {
      toast.info('No active consents to revoke.')
      return
    }

    setIsProcessing(true)
    try {
      await Promise.all(
        activeList.map((c) =>
          apiRequest(`/api/consents/${c.id}/revoke`, { method: 'POST' })
        )
      )
      toast.success('Revoked all active consents', {
        description: 'All external providers will now be denied access to restricted records.',
      })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['consents'] }),
        queryClient.invalidateQueries({ queryKey: ['audit-entries'] }),
        queryClient.invalidateQueries({ queryKey: ['patient-summary'] }),
      ])
    } catch {
      toast.error('Failed to revoke all consents')
    } finally {
      setIsProcessing(false)
    }
  }

  // Filter audit history (calmer, larger, plainer styling)
  const filteredAudit = useMemo(() => {
    return auditEntries.filter((e) => {
      if (filterOutcome === 'denials') return e.decision === 'DENY' || e.decision === 'deny'
      return true
    })
  }, [auditEntries, filterOutcome])

  const totalDenialsCount = useMemo(() => {
    return auditEntries.filter((e) => e.decision === 'DENY' || e.decision === 'deny').length
  }, [auditEntries])

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-10 space-y-10 antialiased font-sans">
      {/* Patient Portal Header (Calmer, larger, plainer styling) */}
      <header
        data-testid="portal-header"
        className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-8 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--teal)] font-semibold">
                Patient Privacy & Consent Portal
              </span>
              <span className="text-[var(--line)]">·</span>
              <span className="font-mono text-xs text-[var(--ok)] flex items-center gap-1 font-medium">
                <ShieldCheck className="h-4 w-4" /> DPDP Act 2023 Compliant
              </span>
            </div>

            <h1 className="font-serif text-3xl font-bold tracking-tight text-[var(--ink)]">
              Consent Controls & Access History
            </h1>

            <p className="text-sm text-[var(--ink-soft)] max-w-2xl leading-relaxed">
              Under India's Digital Personal Data Protection Act, you have absolute ownership over your health data.
              Control which hospital departments, pharmacy counters, and insurance desks can view your records in real time.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-3 shrink-0">
            <div className="rounded-[8px] border border-[var(--line)] bg-[var(--paper)] p-3 text-xs font-mono">
              <span className="text-[var(--ink-soft)] block text-[11px]">Authenticated Patient:</span>
              <span className="font-bold text-[var(--ink)] text-sm">
                {isPatientUser ? currentUser.full_name : 'Ramesh Kumar'}
              </span>
              <span className="text-[var(--teal)] block font-semibold text-[11px] pt-0.5">
                {targetClid}
              </span>
            </div>

            {/* Revoke All Button */}
            <button
              onClick={handleRevokeAll}
              disabled={isProcessing}
              data-testid="revoke-all-button"
              className="inline-flex items-center gap-2 rounded-[6px] border border-[var(--alert-vermilion)] bg-[var(--alert-vermilion)]/10 px-3.5 py-2 font-sans text-xs font-semibold text-[var(--alert-vermilion)] hover:bg-[var(--alert-vermilion)] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <Ban className="h-4 w-4" />
              <span>Revoke All Consents</span>
            </button>
          </div>
        </div>
      </header>

      {/* SECTION 1: Consent Toggles by Group & Category */}
      <section
        data-testid="consent-groups-section"
        className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-8 space-y-6 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--line)] pb-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-[var(--ink)]">
              Departmental Consent Directives
            </h2>
            <p className="text-xs text-[var(--ink-soft)] pt-0.5">
              Policy decisions evaluate these grants directly without caching. Revoking immediately denies the next read.
            </p>
          </div>

          <span className="font-mono text-xs text-[var(--ink-soft)]">
            {Object.keys(consentByGroup).length} of {CONSENT_GROUPS.length} Groups Active
          </span>
        </div>

        {isLoadingConsents ? (
          <div className="space-y-4">
            <SkeletonCard lines={4} />
            <SkeletonCard lines={4} />
          </div>
        ) : isErrorConsents ? (
          <EmptyState
            title="Unable to load consents"
            description={errorConsents?.message || 'Check database connection.'}
            action={{ label: 'Retry', onClick: () => refetchConsents() }}
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {CONSENT_GROUPS.map((grp) => {
              const activeConsent = consentByGroup[grp.key]
              const isActive = Boolean(activeConsent)
              const IconComp = grp.icon
              const activeCats = activeConsent
                ? activeConsent.categories.split(',').map((c) => c.trim())
                : []

              return (
                <div
                  key={grp.key}
                  data-testid={`consent-card-${grp.key}`}
                  className={`rounded-[8px] border p-5 space-y-4 transition-all ${
                    isActive
                      ? 'border-[var(--line)] bg-[var(--paper)]'
                      : 'border-[var(--line)]/70 bg-[var(--surface)] opacity-75'
                  }`}
                >
                  {/* Card Header: Icon, Group Name, Status Pill, Grant/Revoke Button */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`rounded-[6px] p-2 border ${
                          isActive
                            ? 'border-[var(--ok)]/30 bg-[var(--ok)]/10 text-[var(--ok)]'
                            : 'border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)]'
                        }`}
                      >
                        <IconComp className="h-5 w-5" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif font-bold text-base text-[var(--ink)]">
                            {grp.label}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
                          <span
                            className={`rounded px-1.5 py-0.5 uppercase font-bold text-[10px] tracking-wider ${
                              isActive
                                ? 'bg-[var(--ok)]/10 text-[var(--ok)] border border-[var(--ok)]/30'
                                : 'bg-[var(--alert-vermilion)]/10 text-[var(--alert-vermilion)] border border-[var(--alert-vermilion)]/30'
                            }`}
                          >
                            {isActive ? 'Active Grant' : 'Access Revoked'}
                          </span>
                          <span className="text-[var(--ink-soft)]">
                            Purpose: <span className="text-[var(--ink)] capitalize font-semibold">{grp.purpose}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Group Toggle / Action Button */}
                    {isActive ? (
                      <button
                        onClick={() => handleRevokeGroup(grp.key)}
                        disabled={isProcessing}
                        data-testid={`btn-revoke-${grp.key}`}
                        className="rounded-[6px] border border-[var(--alert-vermilion)]/40 bg-[var(--alert-vermilion)]/10 px-3 py-1.5 font-sans text-xs font-semibold text-[var(--alert-vermilion)] hover:bg-[var(--alert-vermilion)] hover:text-white transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        Revoke Group
                      </button>
                    ) : (
                      <button
                        onClick={() => handleGrantGroup(grp)}
                        disabled={isProcessing}
                        data-testid={`btn-grant-${grp.key}`}
                        className="rounded-[6px] border border-[var(--ok)]/40 bg-[var(--ok)]/10 px-3 py-1.5 font-sans text-xs font-semibold text-[var(--ok)] hover:bg-[var(--ok)] hover:text-white transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        Grant Access
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
                    {grp.description}
                  </p>

                  {/* Category Toggles */}
                  <div className="space-y-1.5 pt-2 border-t border-[var(--line)]">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-soft)] block">
                      Permitted Data Categories (Click to Toggle):
                    </span>

                    <div className="flex flex-wrap gap-1.5">
                      {grp.defaultCategories.map((cat) => {
                        const isCatActive = activeCats.includes(cat)

                        return (
                          <button
                            key={cat}
                            onClick={() => handleToggleCategory(grp, cat)}
                            disabled={isProcessing}
                            data-testid={`toggle-${grp.key}-${cat}`}
                            className={`rounded-[4px] px-2 py-1 font-mono text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                              isCatActive
                                ? 'bg-[var(--teal)] text-white font-medium shadow-2xs'
                                : 'border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] line-through opacity-70 hover:opacity-100'
                            }`}
                          >
                            <span>{cat}</span>
                            {isCatActive && <CheckCircle2 className="h-2.5 w-2.5" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* SECTION 2: Access History Table (Calmer, larger, plainer styling with visible denials) */}
      <section
        data-testid="access-history-section"
        className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-8 space-y-6 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-[var(--teal)]" />
              <h2 className="font-serif text-xl font-bold text-[var(--ink)]">
                Real-Time Access History
              </h2>
            </div>
            <p className="text-xs text-[var(--ink-soft)] pt-1">
              Immutable audit log of provider read queries, purpose declarations, decisions, and policy denials.
            </p>
          </div>

          {/* Outcome Filter Chips */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[var(--ink-soft)] mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Filter:
            </span>

            <button
              onClick={() => setFilterOutcome('all')}
              data-testid="filter-audit-all"
              className={`rounded-[4px] px-3 py-1 font-mono text-xs transition-colors cursor-pointer ${
                filterOutcome === 'all'
                  ? 'bg-[var(--teal)] text-white font-semibold'
                  : 'border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              All Access ({auditEntries.length})
            </button>

            <button
              onClick={() => setFilterOutcome('denials')}
              data-testid="filter-audit-denials"
              className={`rounded-[4px] px-3 py-1 font-mono text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterOutcome === 'denials'
                  ? 'bg-[var(--alert-vermilion)] text-white font-semibold'
                  : 'border border-[var(--line)] bg-[var(--paper)] text-[var(--alert-vermilion)] hover:bg-[var(--alert-vermilion)]/10'
              }`}
            >
              <AlertOctagon className="h-3.5 w-3.5" />
              <span>Denials Visible ({totalDenialsCount})</span>
            </button>

            <button
              onClick={() => refetchAudit()}
              aria-label="Refresh audit history"
              className="rounded-[4px] border border-[var(--line)] bg-[var(--paper)] p-1.5 text-[var(--ink-soft)] hover:text-[var(--ink)] cursor-pointer ml-1"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetchingAudit ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Access History Ledger Table */}
        {isLoadingAudit ? (
          <SkeletonCard lines={6} />
        ) : filteredAudit.length === 0 ? (
          <EmptyState
            title="No access history records found"
            description="No provider query events match the current filter."
          />
        ) : (
          <div className="overflow-x-auto rounded-[8px] border border-[var(--line)] bg-[var(--paper)]">
            <table className="w-full text-left font-sans text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--surface)] text-xs font-mono uppercase tracking-wider text-[var(--ink-soft)]">
                  <th className="py-3 px-4 font-semibold">Accessing Provider</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Purpose</th>
                  <th className="py-3 px-4 font-semibold">Date & Time</th>
                  <th className="py-3 px-4 font-semibold">Outcome</th>
                  <th className="py-3 px-4 font-semibold">Categories & Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)] text-xs">
                {filteredAudit.map((row) => {
                  const isDenied = row.decision === 'DENY' || row.decision === 'deny'
                  const formattedTime = row.ts.replace('T', ' ').split('.')[0]

                  return (
                    <tr
                      key={row.id}
                      data-testid={`audit-row-${row.id}`}
                      className={`transition-colors ${
                        isDenied
                          ? 'bg-[var(--alert-vermilion)]/5 hover:bg-[var(--alert-vermilion)]/10 border-l-2 border-l-[var(--alert-vermilion)]'
                          : 'hover:bg-[var(--surface)]'
                      }`}
                    >
                      {/* Provider / Actor */}
                      <td className="py-3 px-4 font-mono font-medium text-[var(--ink)]">
                        <span className="block font-semibold">{row.actor}</span>
                        {row.clid && (
                          <span className="text-[10px] text-[var(--teal)] block font-mono">
                            CLID: {row.clid}
                          </span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4 capitalize font-mono text-[var(--ink-soft)]">
                        {row.role}
                      </td>

                      {/* Purpose */}
                      <td className="py-3 px-4 font-mono text-[var(--ink-soft)] capitalize">
                        {row.role === 'billing' ? 'payment' : 'treatment'}
                      </td>

                      {/* Time */}
                      <td className="py-3 px-4 font-mono text-[var(--ink-soft)] whitespace-nowrap">
                        {formattedTime}
                      </td>

                      {/* Outcome (ALLOW / DENIED) */}
                      <td className="py-3 px-4">
                        <span
                          data-testid={`outcome-${row.id}`}
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 uppercase font-mono text-[10px] font-bold tracking-wider ${
                            isDenied
                              ? 'bg-[var(--alert-vermilion)]/15 text-[var(--alert-vermilion)] border border-[var(--alert-vermilion)]/30'
                              : 'bg-[var(--ok)]/15 text-[var(--ok)] border border-[var(--ok)]/30'
                          }`}
                        >
                          {isDenied ? (
                            <>
                              <ShieldAlert className="h-3 w-3 shrink-0" />
                              <span>DENIED</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3 shrink-0" />
                              <span>ALLOWED</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Categories & Reason */}
                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-mono text-[11px] text-[var(--ink)]">
                          <span className="font-semibold">{row.categories || row.action}</span>
                        </div>
                        {row.reason && (
                          <p
                            className={`font-sans text-[11px] pt-0.5 leading-snug ${
                              isDenied
                                ? 'text-[var(--alert-vermilion)] font-medium'
                                : 'text-[var(--ink-soft)]'
                            }`}
                          >
                            {row.reason}
                          </p>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
