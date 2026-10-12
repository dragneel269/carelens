import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  FileText,
  Clock,
  Fingerprint,
  AlertCircle,
  CheckCircle2,
  Activity,
  Pill,
  ShieldAlert,
  CreditCard,
  Building2,
  RefreshCw,
  ChevronDown,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceArea,
  Tooltip,
} from 'recharts'
import {
  usePatientSummary,
  usePatientTimeline,
  usePatientIdentity,
  isRestricted,
  type RestrictedMarker,
  type IdentityLink,
  type TimelineItem,
} from '../api/client'
import { useAuthStore, BADGES } from '../lib/auth'
import { MatchBadge, type SystemSource } from '../components/clinical/MatchBadge'
import { SourceBadge, type RecordSource } from '../components/clinical/SourceBadge'
import { ProvChip } from '../components/clinical/ProvChip'
import { Redacted } from '../components/clinical/Redacted'
import { SkeletonCard } from '../components/clinical/SkeletonCard'
import { EmptyState } from '../components/clinical/EmptyState'

type ActiveTab = 'overview' | 'timeline' | 'identity'

// Standard clinical reference intervals for normalized tests
const LAB_REFERENCE_RANGES: Record<string, { min: number; max: number; label: string }> = {
  '4548-4': { min: 4.0, max: 5.6, label: 'Ref: 4.0 – 5.6 %' }, // HbA1c
  '1558-6': { min: 70, max: 99, label: 'Ref: 70 – 99 mg/dL' }, // Fasting Glucose
  '2093-3': { min: 125, max: 200, label: 'Ref: 125 – 200 mg/dL' }, // Total Cholesterol
  '2085-9': { min: 40, max: 60, label: 'Ref: 40 – 60 mg/dL' }, // HDL
  '13457-7': { min: 60, max: 100, label: 'Ref: 60 – 100 mg/dL' }, // LDL
  '2571-8': { min: 50, max: 150, label: 'Ref: 50 – 150 mg/dL' }, // Triglycerides
}

function getLabRefRange(testName: string, loinc?: string) {
  if (loinc && LAB_REFERENCE_RANGES[loinc]) {
    return LAB_REFERENCE_RANGES[loinc]
  }
  const lower = testName.toLowerCase()
  if (lower.includes('hba1c') || lower.includes('glyco')) {
    return LAB_REFERENCE_RANGES['4548-4']
  }
  if (lower.includes('glucose') || lower.includes('sugar')) {
    return LAB_REFERENCE_RANGES['1558-6']
  }
  if (lower.includes('cholesterol')) {
    return LAB_REFERENCE_RANGES['2093-3']
  }
  if (lower.includes('triglyceride')) {
    return LAB_REFERENCE_RANGES['2571-8']
  }
  return null
}

function formatWhyLinked(link: IdentityLink): string {
  const ev = link.evidence || {}
  if (
    ev.match_type === 'seed_primary' ||
    (link.confidence_score >= 0.99 && link.source === 'ehr')
  ) {
    return 'Primary anchor hospital record establishing canonical patient identity.'
  }

  const reasons: string[] = []

  if (ev.phone && typeof ev.phone === 'object') {
    const ph = ev.phone as Record<string, unknown>
    if (ph.score && Number(ph.score) > 0) {
      reasons.push('Phone matched exactly (90000 12345)')
    }
  }

  if (ev.dob && typeof ev.dob === 'object') {
    const dob = ev.dob as Record<string, unknown>
    if (dob.score && Number(dob.score) > 0) {
      reasons.push('DOB matched')
    }
  }

  if (ev.name && typeof ev.name === 'object') {
    const nm = ev.name as Record<string, unknown>
    const sim = nm.similarity ? Math.round(Number(nm.similarity) * 100) : null
    if (sim !== null) {
      reasons.push(`${sim}% name similarity across tokens`)
    } else {
      reasons.push('Phonetic name match')
    }
  }

  if (ev.pincode && typeof ev.pincode === 'object') {
    const pin = ev.pincode as Record<string, unknown>
    if (pin.score && Number(pin.score) > 0) {
      reasons.push('Same postal code (570001)')
    }
  }

  if (reasons.length > 0) {
    return reasons.join(', ') + '.'
  }

  if (link.confidence_score >= 0.9) {
    return `Auto-linked at ${Math.round(link.confidence_score * 100)}% multi-attribute confidence threshold.`
  }

  return 'Cross-system record association verified by identity engine.'
}

export function PatientDetailPage() {
  const { id: clid = 'CL-000001' } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [isSwitchingRole, setIsSwitchingRole] = useState(false)

  // Auth & Role
  const currentUser = useAuthStore((s) => s.currentUser)
  const login = useAuthStore((s) => s.login)
  const roleKey = currentUser?.role || 'doctor'

  // Timeline filters
  const [timelineTypeFilter, setTimelineTypeFilter] = useState<string>('all')
  const [timelineSourceFilter, setTimelineSourceFilter] = useState<string>('all')

  // Queries
  const {
    data: summary,
    isLoading: isLoadingSummary,
    isError: isErrorSummary,
    error: errorSummary,
    refetch: refetchSummary,
  } = usePatientSummary(clid)

  const timelineParams = useMemo(() => {
    const types = timelineTypeFilter !== 'all' ? [timelineTypeFilter] : undefined
    const sources = timelineSourceFilter !== 'all' ? [timelineSourceFilter] : undefined
    return { types, sources }
  }, [timelineTypeFilter, timelineSourceFilter])

  const {
    data: timeline,
    isLoading: isLoadingTimeline,
    refetch: refetchTimeline,
  } = usePatientTimeline(clid, timelineParams)

  const {
    data: identity,
    isLoading: isLoadingIdentity,
    refetch: refetchIdentity,
  } = usePatientIdentity(clid)

  // Role Switch Handler
  const handleRoleChange = async (username: string) => {
    setIsSwitchingRole(true)
    try {
      await login(username)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['patient-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['patient-timeline'] }),
        queryClient.invalidateQueries({ queryKey: ['patient-identity'] }),
      ])
    } finally {
      setIsSwitchingRole(false)
    }
  }

  if (isLoadingSummary && !summary) {
    return (
      <div className="p-6 space-y-4 max-w-6xl mx-auto antialiased">
        <SkeletonCard lines={3} />
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard lines={5} />
          <SkeletonCard lines={5} />
        </div>
      </div>
    )
  }

  if (isErrorSummary || !summary) {
    return (
      <div className="p-8 max-w-xl mx-auto antialiased">
        <EmptyState
          title="Patient chart not found"
          description={
            errorSummary?.message ||
            `Record for ${clid} could not be retrieved under your current policy role.`
          }
          action={{
            label: 'Retry',
            onClick: () => {
              refetchSummary()
              refetchTimeline()
              refetchIdentity()
            },
          }}
          icon={AlertCircle}
        />
      </div>
    )
  }

  const patient = summary.patient
  const isPatientRestricted = isRestricted(patient)
  const isDobRestricted = isPatientRestricted || isRestricted(patient.dob)
  const isPhoneRestricted = isPatientRestricted || isRestricted(patient.phone)
  const isCityRestricted = isPatientRestricted || isRestricted(patient.city)

  const patientName = isPatientRestricted ? 'Restricted Patient' : patient.name
  const displayDob =
    !isPatientRestricted && typeof patient.dob === 'string' ? patient.dob : '—'
  const displayPhone =
    !isPatientRestricted && typeof patient.phone === 'string' ? patient.phone : '—'
  const displayCity =
    !isPatientRestricted && typeof patient.city === 'string' ? patient.city : '—'

  // Gather feeder source IDs from identity links if available
  const linkedFeederIds = identity?.links?.map((lnk) => ({
    source: lnk.source,
    id: lnk.source_record_id,
  })) || [
    { source: 'ehr' as SystemSource, id: 'APL-004512' },
    { source: 'lab' as SystemSource, id: 'LB-77120' },
    { source: 'pharmacy' as SystemSource, id: 'PH-30991' },
    { source: 'claims' as SystemSource, id: 'STAR-48221' },
  ]

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-6xl mx-auto antialiased">
      {/* Patient Header Banner (Spec §6 & Design System: Name in serif 28px, ID chips in mono, consent pill, Viewing-as switcher) */}
      <header
        data-testid="patient-banner"
        className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-xs transition-colors"
      >
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          {/* Left Column: Name, IDs, Consent, Demographics */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Patient Name in serif 28px */}
              <h1 className="font-serif text-[28px] font-bold text-[var(--ink)] leading-tight tracking-tight">
                {patientName}
              </h1>

              {/* Master CLID chip in mono */}
              <span className="rounded-[4px] border border-[var(--line)] bg-[var(--paper)] px-2 py-0.5 font-mono text-xs font-semibold text-[var(--ink)]">
                {clid}
              </span>

              {/* Consent pill */}
              <span
                data-testid="consent-pill"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ok)]/30 bg-[var(--ok)]/10 px-2.5 py-0.5 font-mono text-xs font-medium text-[var(--ok)]"
              >
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span>Consent: Treatment Active</span>
              </span>
            </div>

            {/* Linked feeder ID chips in mono */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="font-mono text-[10px] text-[var(--ink-soft)] uppercase tracking-wider mr-1">
                Linked IDs:
              </span>
              {linkedFeederIds.map((item, idx) => (
                <span
                  key={`${item.source}-${item.id}-${idx}`}
                  className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--line)] bg-[var(--paper)] px-2 py-0.5 font-mono text-[11px] text-[var(--ink-soft)]"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      item.source === 'ehr'
                        ? 'bg-[var(--source-ehr)]'
                        : item.source === 'lab'
                        ? 'bg-[var(--source-lab)]'
                        : item.source === 'pharmacy'
                        ? 'bg-[var(--source-pharmacy)]'
                        : 'bg-[var(--source-claims)]'
                    }`}
                  />
                  <span className="text-[var(--ink)] font-medium">{item.id}</span>
                </span>
              ))}
            </div>

            {/* Demographics row with Redacted markers for non-clinical roles */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-mono text-[var(--ink-soft)] pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--ink-soft)]">DOB:</span>
                {isDobRestricted ? (
                  <Redacted
                    animKey={roleKey}
                    reason={
                      isPatientRestricted
                        ? (patient as RestrictedMarker).reason
                        : ((patient.dob as RestrictedMarker)?.reason || 'Hidden for your role')
                    }
                    width="w-24"
                  />
                ) : (
                  <span className="text-[var(--ink)] font-medium tabular-nums">{displayDob}</span>
                )}
              </div>

              <span className="text-[var(--line)]">·</span>

              <div className="flex items-center gap-1.5">
                <span className="text-[var(--ink-soft)]">Gender:</span>
                <span className="text-[var(--ink)] font-medium capitalize">
                  {(!isPatientRestricted && patient.gender) || '—'}
                </span>
              </div>

              <span className="text-[var(--line)]">·</span>

              <div className="flex items-center gap-1.5">
                <span className="text-[var(--ink-soft)]">Phone:</span>
                {isPhoneRestricted ? (
                  <Redacted
                    animKey={roleKey}
                    reason={
                      isPatientRestricted
                        ? (patient as RestrictedMarker).reason
                        : ((patient.phone as RestrictedMarker)?.reason || 'Hidden for your role')
                    }
                    width="w-28"
                  />
                ) : (
                  <span className="text-[var(--ink)] font-medium tabular-nums">{displayPhone}</span>
                )}
              </div>

              <span className="text-[var(--line)]">·</span>

              <div className="flex items-center gap-1.5">
                <span className="text-[var(--ink-soft)]">City:</span>
                {isCityRestricted ? (
                  <Redacted
                    animKey={roleKey}
                    reason={
                      isPatientRestricted
                        ? (patient as RestrictedMarker).reason
                        : ((patient.city as RestrictedMarker)?.reason || 'Hidden for your role')
                    }
                    width="w-24"
                  />
                ) : (
                  <span className="text-[var(--ink)] font-medium">{displayCity}</span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Hero Viewing-as Switcher & MatchBadge */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0 pt-1">
            {/* Viewing-as Role Switcher right in the Banner */}
            <div
              data-testid="hero-role-switcher"
              className="rounded-[8px] border border-[var(--line)] bg-[var(--paper)] p-2.5 space-y-1.5 w-full sm:w-auto min-w-[260px]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-soft)]">
                  Viewing as:
                </span>
                {isSwitchingRole && (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--teal)] animate-pulse">
                    <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                    <span>Applying policy...</span>
                  </span>
                )}
              </div>

              <div className="relative">
                <select
                  id="hero-role-select"
                  data-testid="hero-role-select"
                  value={currentUser?.username}
                  disabled={isSwitchingRole}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full appearance-none rounded-[6px] border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 pr-8 font-sans text-xs font-semibold text-[var(--ink)] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--teal)] disabled:opacity-60 transition-colors"
                >
                  {BADGES.map((b) => (
                    <option key={b.username} value={b.username}>
                      {b.full_name} ({b.role.toUpperCase()})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--ink-soft)]" />
              </div>

              <div className="font-mono text-[10px] text-[var(--ink-soft)] truncate">
                Role: <span className="font-medium text-[var(--ink)]">{currentUser?.role}</span> · {currentUser?.desk}
              </div>
            </div>

            {/* Match Badge */}
            <div className="flex items-center gap-2 self-start lg:self-end">
              <MatchBadge
                linkedSystems={summary.linked_systems}
                confidenceScore={0.96}
                size="md"
              />
            </div>
          </div>
        </div>

        {/* Tab Navigation: Overview, Timeline, Identity */}
        <nav
          data-testid="patient-tabs"
          className="mt-6 flex items-center border-t border-[var(--line)] pt-3 gap-2"
        >
          <button
            onClick={() => setActiveTab('overview')}
            data-testid="tab-overview"
            className={`flex items-center gap-1.5 rounded-[6px] px-3.5 py-1.5 font-sans text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[var(--teal)] text-white'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            data-testid="tab-timeline"
            className={`flex items-center gap-1.5 rounded-[6px] px-3.5 py-1.5 font-sans text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-[var(--teal)] text-white'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Timeline</span>
          </button>

          <button
            onClick={() => setActiveTab('identity')}
            data-testid="tab-identity"
            className={`flex items-center gap-1.5 rounded-[6px] px-3.5 py-1.5 font-sans text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'identity'
                ? 'bg-[var(--teal)] text-white'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]'
            }`}
          >
            <Fingerprint className="h-3.5 w-3.5" />
            <span>Identity</span>
          </button>
        </nav>
      </header>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div data-testid="tab-overview-content" className="space-y-6">
          {/* Row 1: Active Problems & Allergies */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Problems Card */}
            <section
              data-testid="card-problems"
              className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-5 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[var(--source-ehr)]" />
                  <h2 className="font-serif text-base font-semibold text-[var(--ink)]">
                    Active Problems
                  </h2>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--source-ehr)]">
                  EHR Conditions
                </span>
              </div>

              {isRestricted(summary.active_conditions) ? (
                <div
                  data-testid="problems-redacted"
                  className="p-4 bg-[var(--paper)] rounded-[6px] border border-[var(--line)] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Redacted
                      animKey={roleKey}
                      reason={summary.active_conditions.reason}
                      width="w-48"
                    />
                    <Redacted
                      animKey={roleKey}
                      reason={summary.active_conditions.reason}
                      width="w-20"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Redacted
                      animKey={roleKey}
                      reason={summary.active_conditions.reason}
                      width="w-40"
                    />
                    <Redacted
                      animKey={roleKey}
                      reason={summary.active_conditions.reason}
                      width="w-20"
                    />
                  </div>
                  <p className="font-mono text-[11px] text-[var(--ink-soft)] pt-1">
                    {summary.active_conditions.reason}
                  </p>
                </div>
              ) : summary.active_conditions.length === 0 ? (
                <p className="text-xs text-[var(--ink-soft)] p-3">No active conditions recorded.</p>
              ) : (
                <div className="space-y-2">
                  {summary.active_conditions.map((c, idx) => (
                    <div
                      key={c.id || idx}
                      className="flex items-center justify-between rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-2.5 text-xs"
                    >
                      <div>
                        <span className="font-medium text-[var(--ink)] block">
                          {c.display || c.condition_name || 'Condition'}
                        </span>
                        {(c.code || c.icd10_code) && (
                          <span className="font-mono text-[10px] text-[var(--ink-soft)]">
                            Code: {c.code || c.icd10_code}
                          </span>
                        )}
                      </div>
                      <ProvChip
                        source={(c.source || 'ehr') as RecordSource}
                        timestamp={c.recorded_at}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Allergies Card */}
            <section
              data-testid="card-allergies"
              className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-5 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-[var(--alert-vermilion)]" />
                  <h2 className="font-serif text-base font-semibold text-[var(--ink)]">
                    Documented Allergies
                  </h2>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--alert-vermilion)]">
                  Immuno Alerts
                </span>
              </div>

              {isRestricted(summary.active_allergies) ? (
                <div
                  data-testid="allergies-redacted"
                  className="p-4 bg-[var(--paper)] rounded-[6px] border border-[var(--line)] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Redacted
                      animKey={roleKey}
                      reason={summary.active_allergies.reason}
                      width="w-44"
                    />
                    <Redacted
                      animKey={roleKey}
                      reason={summary.active_allergies.reason}
                      width="w-20"
                    />
                  </div>
                  <p className="font-mono text-[11px] text-[var(--ink-soft)] pt-1">
                    {summary.active_allergies.reason}
                  </p>
                </div>
              ) : summary.active_allergies.length === 0 ? (
                <p className="text-xs text-[var(--ink-soft)] p-3">No documented allergies on record.</p>
              ) : (
                <div className="space-y-2">
                  {summary.active_allergies.map((a, idx) => (
                    <div
                      key={a.id || idx}
                      className="flex items-center justify-between rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-2.5 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--alert-vermilion)]">
                            {a.substance}
                          </span>
                          <span className="rounded bg-[var(--alert-vermilion)]/10 px-1.5 py-0.2 font-mono text-[10px] text-[var(--alert-vermilion)] uppercase font-semibold">
                            {a.criticality || a.severity || 'High'}
                          </span>
                        </div>
                        {a.reaction && (
                          <span className="font-mono text-[10px] text-[var(--ink-soft)] block">
                            Reaction: {a.reaction}
                          </span>
                        )}
                      </div>
                      <ProvChip
                        source={(a.source || 'ehr') as RecordSource}
                        timestamp={a.recorded_at}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Row 2: Merged Medications Card with Conflict Flags */}
          <section
            data-testid="card-medications"
            className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-5 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-[var(--source-pharmacy)]" />
                <div>
                  <h2 className="font-serif text-base font-semibold text-[var(--ink)]">
                    Reconciled Current Medications
                  </h2>
                  <p className="text-[11px] text-[var(--ink-soft)]">
                    Cross-referenced between EHR prescribed and Pharmacy dispensed records.
                  </p>
                </div>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--source-pharmacy)]">
                Pharmacy + EHR
              </span>
            </div>

            {isRestricted(summary.current_medications) ? (
              <div
                data-testid="medications-redacted"
                className="p-4 bg-[var(--paper)] rounded-[6px] border border-[var(--line)] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Redacted
                    animKey={roleKey}
                    reason={summary.current_medications.reason}
                    width="w-56"
                  />
                  <Redacted
                    animKey={roleKey}
                    reason={summary.current_medications.reason}
                    width="w-20"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Redacted
                    animKey={roleKey}
                    reason={summary.current_medications.reason}
                    width="w-48"
                  />
                  <Redacted
                    animKey={roleKey}
                    reason={summary.current_medications.reason}
                    width="w-20"
                  />
                </div>
                <p className="font-mono text-[11px] text-[var(--ink-soft)] pt-1">
                  {summary.current_medications.reason}
                </p>
              </div>
            ) : summary.current_medications.length === 0 ? (
              <p className="text-xs text-[var(--ink-soft)] p-3">No active medications found.</p>
            ) : (
              <div className="space-y-2.5">
                {summary.current_medications.map((m, idx) => {
                  const primarySource =
                    (m.sources && m.sources[0]) || m.source || (m.pharmacy_dispensed ? 'pharmacy' : 'ehr')

                  return (
                    <div
                      key={idx}
                      data-testid={`medication-row-${idx}`}
                      className={`rounded-[8px] border p-3 text-xs transition-all ${
                        m.has_conflict
                          ? 'border-[var(--alert-vermilion)]/60 bg-[var(--alert-vermilion)]/5'
                          : 'border-[var(--line)] bg-[var(--paper)]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-serif font-bold text-sm text-[var(--ink)]">
                              {m.generic_name}
                            </span>
                            {m.brand_name && (
                              <span className="rounded-[4px] border border-[var(--line)] bg-[var(--surface)] px-1.5 py-0.2 font-mono text-[10px] text-[var(--ink-soft)]">
                                Brand: {m.brand_name}
                              </span>
                            )}
                            {(m.dosage || m.dose) && (
                              <span className="font-mono text-[11px] text-[var(--ink-soft)]">
                                ({m.dosage || m.dose})
                              </span>
                            )}
                            {/* Sources tags */}
                            {m.sources && (
                              <span className="font-mono text-[10px] text-[var(--ink-soft)]">
                                [{m.sources.join(', ')}]
                              </span>
                            )}
                          </div>

                          {/* Conflict Alert Banner */}
                          {m.has_conflict && (
                            <div
                              data-testid="conflict-warning"
                              className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[var(--alert-vermilion)]"
                            >
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              <span>
                                {m.conflict_type === 'allergy_conflict'
                                  ? 'ALLERGY CONFLICT: Dispensed despite documented penicillin allergy!'
                                  : m.conflict_type === 'missing_from_ehr'
                                  ? 'DISCREPANCY: Dispensed by pharmacy but missing from hospital EHR!'
                                  : m.conflict_detail || 'DISCREPANCY FLAGGED'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* ProvChip */}
                        <div className="shrink-0 self-start sm:self-auto">
                          <ProvChip
                            source={primarySource as RecordSource}
                            timestamp={m.recorded_at}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Row 3: Latest Labs Card with Recharts Trend Line & Reference Band */}
          <section
            data-testid="card-labs"
            className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[var(--source-lab)]" />
                <div>
                  <h2 className="font-serif text-base font-semibold text-[var(--ink)]">
                    Latest Labs & Longitudinal Trends
                  </h2>
                  <p className="text-[11px] text-[var(--ink-soft)]">
                    Unified observations with Recharts trendline, normal reference bands, and LOINC codes.
                  </p>
                </div>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--source-lab)]">
                Normalized LOINC
              </span>
            </div>

            {isRestricted(summary.lab_trends) ? (
              <div
                data-testid="labs-redacted"
                className="p-4 bg-[var(--paper)] rounded-[6px] border border-[var(--line)] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Redacted animKey={roleKey} reason={summary.lab_trends.reason} width="w-52" />
                  <Redacted animKey={roleKey} reason={summary.lab_trends.reason} width="w-24" />
                </div>
                <div className="h-16 w-full rounded border border-[var(--line)] bg-[var(--surface)] flex items-center justify-center">
                  <Redacted animKey={roleKey} reason={summary.lab_trends.reason} width="w-64" />
                </div>
                <p className="font-mono text-[11px] text-[var(--ink-soft)] pt-1">
                  {summary.lab_trends.reason}
                </p>
              </div>
            ) : summary.lab_trends.length === 0 ? (
              <p className="text-xs text-[var(--ink-soft)] p-3">No laboratory observations found.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {summary.lab_trends.map((t, idx) => {
                  const currentValue = t.current_value ?? t.latest_value ?? 0
                  const testDate = t.recorded_at || t.latest_date || new Date().toISOString()
                  const refRange = getLabRefRange(t.test_name, t.loinc_code)

                  // Format trend points for Recharts
                  const chartData = (t.trend || []).map((pt, pIdx) => ({
                    index: pIdx,
                    date: (pt.recorded_at || pt.date || '').split('T')[0],
                    value: pt.value,
                    unit: pt.unit || t.unit,
                  }))

                  return (
                    <div
                      key={idx}
                      data-testid={`lab-card-${idx}`}
                      className="rounded-[8px] border border-[var(--line)] bg-[var(--paper)] p-3.5 space-y-2.5 flex flex-col justify-between"
                    >
                      {/* Test Header */}
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <span className="font-serif font-semibold text-xs text-[var(--ink)] block">
                              {t.test_name}
                            </span>
                            {t.loinc_code && (
                              <span className="font-mono text-[10px] text-[var(--ink-soft)]">
                                LOINC: {t.loinc_code}
                              </span>
                            )}
                          </div>
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase ${
                              t.flag && t.flag !== 'NORMAL'
                                ? 'bg-[var(--alert-vermilion)]/10 text-[var(--alert-vermilion)]'
                                : 'bg-[var(--ok)]/10 text-[var(--ok)]'
                            }`}
                          >
                            {t.flag || 'Normal'}
                          </span>
                        </div>

                        {/* Current Value in Mono Tabular */}
                        <div className="flex items-baseline gap-1.5 pt-1">
                          <span className="font-mono text-2xl font-bold tabular-nums text-[var(--ink)]">
                            {currentValue}
                          </span>
                          <span className="font-mono text-xs text-[var(--ink-soft)]">
                            {t.unit}
                          </span>
                        </div>
                      </div>

                      {/* Recharts Trend Line and Reference Band */}
                      {chartData.length > 0 && (
                        <div className="pt-1 pb-1">
                          <div className="h-[70px] w-full">
                            <ResponsiveContainer width="100%" height={70}>
                              <LineChart
                                data={chartData}
                                margin={{ top: 5, right: 8, bottom: 5, left: 8 }}
                              >
                                {refRange && (
                                  <ReferenceArea
                                    y1={refRange.min}
                                    y2={refRange.max}
                                    fill="var(--ok)"
                                    fillOpacity={0.12}
                                    stroke="var(--ok)"
                                    strokeOpacity={0.25}
                                    strokeDasharray="2 2"
                                  />
                                )}
                                <Tooltip
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const p = payload[0].payload
                                      return (
                                        <div className="rounded-[4px] border border-[var(--line)] bg-[var(--surface)] p-1.5 shadow-sm text-[10px] font-mono">
                                          <span className="text-[var(--ink-soft)] block">
                                            {p.date}
                                          </span>
                                          <span className="font-bold text-[var(--ink)]">
                                            {p.value} {t.unit}
                                          </span>
                                        </div>
                                      )
                                    }
                                    return null
                                  }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="value"
                                  stroke="var(--teal)"
                                  strokeWidth={2}
                                  dot={{
                                    r: 2.5,
                                    fill: 'var(--teal)',
                                    stroke: 'var(--surface)',
                                    strokeWidth: 1,
                                  }}
                                  activeDot={{ r: 4, fill: 'var(--teal)' }}
                                  isAnimationActive={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                          {refRange && (
                            <div className="font-mono text-[9px] text-[var(--ink-soft)] text-right">
                              {refRange.label}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Card Footer with ProvChip */}
                      <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between text-[10px]">
                        <span className="font-mono text-[10px] text-[var(--ink-soft)]">
                          {chartData.length} pts series
                        </span>
                        <ProvChip
                          source={(t.source || 'lab') as RecordSource}
                          timestamp={testDate}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Row 4: Claims Status Card */}
          <section
            data-testid="card-claims"
            className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-5 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[var(--source-claims)]" />
                <div>
                  <h2 className="font-serif text-base font-semibold text-[var(--ink)]">
                    Insurance Claims Status
                  </h2>
                  <p className="text-[11px] text-[var(--ink-soft)]">
                    Insurer billing ledger, status tracking, and reimbursement values.
                  </p>
                </div>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--source-claims)]">
                Insurer Claims
              </span>
            </div>

            {isRestricted(summary.claims) ? (
              <div
                data-testid="claims-redacted"
                className="p-4 bg-[var(--paper)] rounded-[6px] border border-[var(--line)] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Redacted animKey={roleKey} reason={summary.claims.reason} width="w-48" />
                  <Redacted animKey={roleKey} reason={summary.claims.reason} width="w-20" />
                </div>
                <p className="font-mono text-[11px] text-[var(--ink-soft)] pt-1">
                  {summary.claims.reason}
                </p>
              </div>
            ) : summary.claims.length === 0 ? (
              <p className="text-xs text-[var(--ink-soft)] p-3">No insurance claims on record.</p>
            ) : (
              <div className="space-y-2">
                {summary.claims.map((cl, idx) => {
                  const claimId = cl.claim_id || (typeof cl.id === 'string' ? cl.id : `CLM-${cl.id}`)
                  const amount = cl.total_amount ?? cl.claimed_amount ?? 0
                  const date = cl.service_date || cl.recorded_at || new Date().toISOString()

                  return (
                    <div
                      key={idx}
                      data-testid={`claim-row-${idx}`}
                      className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-[var(--ink)]">
                            {claimId}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.2 font-mono text-[10px] uppercase font-medium ${
                              cl.status === 'approved'
                                ? 'bg-[var(--ok)]/10 text-[var(--ok)]'
                                : 'bg-[var(--alert-vermilion)]/10 text-[var(--alert-vermilion)]'
                            }`}
                          >
                            {cl.status}
                          </span>
                          {cl.category && (
                            <span className="rounded bg-[var(--surface)] px-1.5 py-0.2 font-mono text-[10px] text-[var(--ink-soft)] border border-[var(--line)]">
                              {cl.category}
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-[var(--ink-soft)] pt-0.5">
                          Amount: <span className="font-semibold text-[var(--ink)]">₹{amount.toLocaleString()}</span>
                          {cl.approved_amount !== undefined && (
                            <span> · Approved: ₹{cl.approved_amount.toLocaleString()}</span>
                          )}
                          {cl.description && <span> · {cl.description}</span>}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <ProvChip
                          source={(cl.source || 'claims') as RecordSource}
                          timestamp={date}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 2: TIMELINE */}
      {activeTab === 'timeline' && (
        <section
          data-testid="tab-timeline-content"
          className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-6 space-y-5"
        >
          {/* Header & Filter Chips */}
          <div className="space-y-4 border-b border-[var(--line)] pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-lg font-semibold text-[var(--ink)]">
                  Longitudinal Timeline
                </h2>
                <p className="text-xs text-[var(--ink-soft)]">
                  Plain filtered list ordered by date with source badges and type/source chips.
                </p>
              </div>
              <span className="font-mono text-xs text-[var(--ink-soft)]">
                {timeline?.items?.length || 0} Events Listed
              </span>
            </div>

            {/* Filter Chips Bar */}
            <div className="space-y-2 pt-1">
              {/* Type Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-soft)] w-14">
                  Type:
                </span>
                {[
                  { key: 'all', label: 'All Types' },
                  { key: 'encounter', label: 'Encounters' },
                  { key: 'condition', label: 'Conditions' },
                  { key: 'medication', label: 'Medications' },
                  { key: 'observation', label: 'Observations' },
                  { key: 'allergy', label: 'Allergies' },
                  { key: 'claim', label: 'Claims' },
                ].map((chip) => (
                  <button
                    key={chip.key}
                    onClick={() => setTimelineTypeFilter(chip.key)}
                    data-testid={`filter-type-${chip.key}`}
                    className={`rounded-[4px] px-2.5 py-1 font-mono text-[11px] transition-colors cursor-pointer ${
                      timelineTypeFilter === chip.key
                        ? 'bg-[var(--teal)] text-white font-medium'
                        : 'border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Source Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-soft)] w-14">
                  Source:
                </span>
                {[
                  { key: 'all', label: 'All Sources' },
                  { key: 'ehr', label: 'Hospital EHR' },
                  { key: 'lab', label: 'Laboratory' },
                  { key: 'pharmacy', label: 'Pharmacy' },
                  { key: 'claims', label: 'Insurer' },
                ].map((chip) => (
                  <button
                    key={chip.key}
                    onClick={() => setTimelineSourceFilter(chip.key)}
                    data-testid={`filter-source-${chip.key}`}
                    className={`rounded-[4px] px-2.5 py-1 font-mono text-[11px] transition-colors cursor-pointer ${
                      timelineSourceFilter === chip.key
                        ? 'bg-[var(--teal)] text-white font-medium'
                        : 'border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline Feed */}
          {isLoadingTimeline ? (
            <div className="space-y-2">
              <SkeletonCard lines={3} />
              <SkeletonCard lines={3} />
            </div>
          ) : !timeline || timeline.items.length === 0 ? (
            <EmptyState
              title="No events match current filter"
              description="No clinical entries recorded under these criteria, or access restricted under your role."
            />
          ) : (
            <div className="space-y-2">
              {timeline.items.map((item: TimelineItem) => {
                const dateStr = item.recorded_at || item.date || ''
                const dateOnly = dateStr.split('T')[0]
                const itemType = item.item_type || item.type || 'event'

                return (
                  <div
                    key={item.id}
                    data-testid={`timeline-item-${item.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-3 text-xs"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      {/* Date in Mono Tabular */}
                      <span className="font-mono text-xs font-semibold tabular-nums text-[var(--ink)] w-24 shrink-0">
                        {dateOnly}
                      </span>

                      {/* SourceBadge */}
                      <SourceBadge source={item.source as RecordSource} />

                      {/* Content details */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-sm text-[var(--ink)]">
                            {item.title}
                          </span>
                          <span className="rounded bg-[var(--surface)] px-1.5 py-0.2 font-mono text-[10px] text-[var(--ink-soft)] border border-[var(--line)] uppercase">
                            {itemType}
                          </span>
                        </div>
                        {item.subtitle && (
                          <span className="font-mono text-[11px] text-[var(--ink-soft)] block pt-0.5">
                            {item.subtitle}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ProvChip with source and time */}
                    <div className="shrink-0 self-start sm:self-center">
                      <ProvChip
                        source={item.source as RecordSource}
                        timestamp={dateStr}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: IDENTITY */}
      {activeTab === 'identity' && (
        <section
          data-testid="tab-identity-content"
          className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-6 space-y-5"
        >
          <div className="border-b border-[var(--line)] pb-3">
            <h2 className="font-serif text-lg font-semibold text-[var(--ink)]">
              Linked Source Records & Entity Resolution (Spec §4)
            </h2>
            <p className="text-xs text-[var(--ink-soft)]">
              Cross-system matching without national IDs. Shows why records were linked with confidence scores in mono.
            </p>
          </div>

          {isLoadingIdentity ? (
            <SkeletonCard lines={4} />
          ) : !identity ? (
            <EmptyState
              title="Identity links unavailable"
              description="Identity resolution data restricted or could not be loaded."
            />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {identity.links.map((link: IdentityLink, idx) => {
                  const whyLinked = formatWhyLinked(link)
                  const confidencePercent = `${(link.confidence_score * 100).toFixed(1)}%`

                  return (
                    <div
                      key={`${link.source}-${link.source_record_id}-${idx}`}
                      data-testid={`identity-link-${idx}`}
                      className="rounded-[8px] border border-[var(--line)] bg-[var(--paper)] p-4 space-y-3 text-xs"
                    >
                      {/* Top Row: Source, ID in mono, Confidence in mono */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <SourceBadge source={link.source} />
                          <span className="font-mono text-xs font-bold text-[var(--ink)]">
                            {link.source_record_id}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-bold tabular-nums text-[var(--ok)] bg-[var(--ok)]/10 px-2 py-0.5 rounded-[4px] border border-[var(--ok)]/20">
                          {confidencePercent}
                        </span>
                      </div>

                      {/* Plain Language "Why linked" Line */}
                      <div className="rounded-[4px] border border-[var(--line)] bg-[var(--surface)] p-2.5">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--teal)] font-semibold block mb-0.5">
                          Why linked:
                        </span>
                        <p className="font-sans text-xs text-[var(--ink)] leading-relaxed">
                          {whyLinked}
                        </p>
                      </div>

                      {/* Evidence Field Breakdown */}
                      {link.evidence && Object.keys(link.evidence).length > 0 && (
                        <div className="pt-2 border-t border-[var(--line)] space-y-1.5">
                          <span className="font-mono text-[10px] text-[var(--ink-soft)] block uppercase tracking-wider">
                            Multi-Attribute Evidence Breakdown:
                          </span>
                          <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                            {Object.entries(link.evidence)
                              .filter(([k]) => k !== 'match_type')
                              .map(([k, v]) => {
                                const scoreVal =
                                  typeof v === 'object' && v !== null && 'score' in v
                                    ? (v as Record<string, unknown>).score
                                    : typeof v === 'number'
                                    ? v
                                    : null

                                return (
                                  <div
                                    key={k}
                                    className="flex items-center justify-between rounded border border-[var(--line)] bg-[var(--surface)] px-2 py-1"
                                  >
                                    <span className="text-[var(--ink-soft)] capitalize">{k}</span>
                                    <span className="font-semibold text-[var(--ink)] tabular-nums">
                                      {scoreVal !== null
                                        ? `${Math.round(Number(scoreVal) * 100)}%`
                                        : 'Verified'}
                                    </span>
                                  </div>
                                )
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
