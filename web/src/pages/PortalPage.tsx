import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldCheck } from 'lucide-react'
import { useConsents, apiRequest } from '../api/client'
import { useAuthStore } from '../lib/auth'
import { SkeletonCard } from '../components/clinical/SkeletonCard'
import { EmptyState } from '../components/clinical/EmptyState'

export function PortalPage() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.currentUser)
  const { data: consents = [], isLoading, isError, error, refetch } = useConsents()

  const handleRevoke = async (id: number, group: string) => {
    try {
      await apiRequest(`/api/consents/${id}/revoke`, { method: 'POST' })
      toast.success(`Revoked consent for ${group}`, {
        description: 'Policy decisions on next read will immediately deny access.',
      })
      await queryClient.invalidateQueries()
    } catch {
      toast.error('Failed to revoke consent')
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8 space-y-6 antialiased">
      {/* Header */}
      <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--teal)] font-medium">
                Patient Self-Service Portal
              </span>
              <span className="text-[var(--line)]">·</span>
              <span className="font-mono text-xs text-[var(--ok)] flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> DPDP Act 2023 Compliant
              </span>
            </div>
            <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-[var(--ink)]">
              Consent & Privacy Controls
            </h1>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              You own your clinical data. Manage which departmental groups and providers can access specific categories of your medical records.
            </p>
          </div>

          <div className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-3 text-xs font-mono">
            <span className="text-[var(--ink-soft)] block">Authenticated Patient:</span>
            <span className="font-semibold text-[var(--ink)]">
              {currentUser?.role === 'patient' ? currentUser.full_name : 'Ramesh Kumar (CL-000001)'}
            </span>
          </div>
        </div>
      </div>

      {/* Consents List */}
      <section className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div>
            <h2 className="font-serif text-lg font-semibold text-[var(--ink)]">
              Active Consent Directives
            </h2>
            <p className="text-xs text-[var(--ink-soft)]">
              Directives evaluated in real-time on every query without caching.
            </p>
          </div>

          <span className="font-mono text-xs text-[var(--ink-soft)]">
            {consents.length} Grants
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </div>
        ) : isError ? (
          <EmptyState
            title="Failed to load consents"
            description={error?.message || 'Check your permissions.'}
            action={{ label: 'Retry', onClick: () => refetch() }}
          />
        ) : consents.length === 0 ? (
          <EmptyState
            title="No active consents"
            description="You have not granted access to any provider groups yet."
          />
        ) : (
          <div className="space-y-3">
            {consents.map((c) => {
              const isActive = c.status === 'active'

              return (
                <div
                  key={c.id}
                  className={`rounded-[8px] border p-4 text-xs transition-all ${
                    isActive
                      ? 'border-[var(--line)] bg-[var(--paper)]'
                      : 'border-[var(--line)] bg-[var(--surface)] opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-bold text-sm text-[var(--ink)] uppercase">
                          {c.group}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.2 font-mono text-[10px] uppercase tracking-wider ${
                            isActive
                              ? 'bg-[var(--ok)]/10 text-[var(--ok)] border border-[var(--ok)]/30'
                              : 'bg-[var(--alert-vermilion)]/10 text-[var(--alert-vermilion)] border border-[var(--alert-vermilion)]/30'
                          }`}
                        >
                          {c.status}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--ink-soft)]">
                          Purpose: {c.purpose}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1 font-mono text-[10px]">
                        <span className="text-[var(--ink-soft)] mr-1">Categories:</span>
                        {c.categories.split(',').map((cat) => (
                          <span
                            key={cat}
                            className="rounded bg-[var(--surface)] px-1.5 py-0.2 border border-[var(--line)] text-[var(--ink)]"
                          >
                            {cat.trim()}
                          </span>
                        ))}
                      </div>

                      <div className="mt-2 font-mono text-[10px] text-[var(--ink-soft)]">
                        Valid until: {c.valid_to?.split('T')[0] || 'Perpetual'}
                      </div>
                    </div>

                    {isActive && (
                      <button
                        onClick={() => handleRevoke(c.id, c.group)}
                        className="rounded-[6px] border border-[var(--alert-vermilion)]/40 bg-[var(--alert-vermilion)]/10 px-3 py-1.5 font-sans text-xs font-medium text-[var(--alert-vermilion)] hover:bg-[var(--alert-vermilion)] hover:text-white transition-colors cursor-pointer shrink-0"
                      >
                        Revoke Access
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
