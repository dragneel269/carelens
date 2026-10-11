import { useState } from 'react'
import {
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  Lock,
} from 'lucide-react'
import { useAuditEntries, useAuditVerify } from '../api/client'
import { HashChip } from '../components/clinical/HashChip'
import { SkeletonCard } from '../components/clinical/SkeletonCard'
import { EmptyState } from '../components/clinical/EmptyState'

export function AuditPage() {
  const [filterAction, setFilterAction] = useState<string>('all')
  const { data: entries = [], isLoading, isError, error, refetch, isFetching } = useAuditEntries(100)
  const { data: verify, isLoading: isVerifying, refetch: reVerify } = useAuditVerify()

  const filteredEntries = entries.filter((e) => {
    if (filterAction === 'all') return true
    if (filterAction === 'allow') return e.decision === 'allow'
    if (filterAction === 'deny') return e.decision === 'deny'
    return true
  })

  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-8 space-y-6 antialiased">
      {/* Header Banner */}
      <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--teal)] font-medium">
                Security & Compliance
              </span>
              <span className="text-[var(--line)]">·</span>
              <span className="font-mono text-xs text-[var(--ink-soft)] flex items-center gap-1">
                <Lock className="h-3 w-3" /> Append-Only SHA-256 Chain
              </span>
            </div>
            <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
              Cryptographic Audit Ledger
            </h1>
            <p className="mt-1 text-xs text-[var(--ink-soft)] max-w-2xl">
              Every clinical read and policy check generates an immutable ledger entry chained with SHA-256 cryptographic hashes. Tamper-evident and verifiable.
            </p>
          </div>

          {/* Verification Status Card */}
          <div className="rounded-[8px] border border-[var(--line)] bg-[var(--paper)] p-3 text-xs shrink-0 flex items-center gap-3">
            {verify?.valid ? (
              <div className="flex items-center gap-2 text-[var(--ok)]">
                <CheckCircle2 className="h-5 w-5" />
                <div>
                  <span className="font-mono font-bold block">Chain Verified</span>
                  <span className="text-[10px] font-mono text-[var(--ink-soft)]">
                    {verify.total_entries} contiguous blocks
                  </span>
                </div>
              </div>
            ) : isVerifying ? (
              <div className="font-mono text-xs text-[var(--ink-soft)] flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Verifying chain...
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[var(--alert-vermilion)]">
                <ShieldAlert className="h-5 w-5" />
                <div>
                  <span className="font-mono font-bold block">Integrity Alert</span>
                  <span className="text-[10px] font-mono text-[var(--alert-vermilion)]">
                    Hash mismatch detected!
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                refetch()
                reVerify()
              }}
              aria-label="Refresh and verify ledger"
              className="rounded-[6px] border border-[var(--line)] bg-[var(--surface)] p-1.5 text-[var(--ink-soft)] hover:text-[var(--ink)] cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-6 flex items-center justify-between border-t border-[var(--line)] pt-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[var(--ink-soft)] font-medium">Filter Decision:</span>
            <button
              onClick={() => setFilterAction('all')}
              className={`rounded-[4px] px-2 py-1 font-mono text-xs transition-colors cursor-pointer ${
                filterAction === 'all'
                  ? 'bg-[var(--teal)] text-white'
                  : 'bg-[var(--paper)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              All ({entries.length})
            </button>
            <button
              onClick={() => setFilterAction('allow')}
              className={`rounded-[4px] px-2 py-1 font-mono text-xs transition-colors cursor-pointer ${
                filterAction === 'allow'
                  ? 'bg-[var(--ok)] text-white'
                  : 'bg-[var(--paper)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              Allowed
            </button>
            <button
              onClick={() => setFilterAction('deny')}
              className={`rounded-[4px] px-2 py-1 font-mono text-xs transition-colors cursor-pointer ${
                filterAction === 'deny'
                  ? 'bg-[var(--alert-vermilion)] text-white'
                  : 'bg-[var(--paper)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              Denied
            </button>
          </div>

          <span className="font-mono text-[11px] text-[var(--ink-soft)]">
            Showing {filteredEntries.length} entries
          </span>
        </div>
      </div>

      {/* Ledger Table */}
      <section className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-6">
            <SkeletonCard lines={5} />
          </div>
        ) : isError ? (
          <div className="p-8">
            <EmptyState
              title="Failed to load ledger"
              description={error?.message || 'Access denied or connection issue.'}
              action={{ label: 'Retry', onClick: () => refetch() }}
            />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No ledger events found"
              description="No audit records match your selected filter criteria."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--paper)] text-[10px] font-mono uppercase tracking-wider text-[var(--ink-soft)]">
                  <th className="py-2.5 px-4 font-medium">Timestamp</th>
                  <th className="py-2.5 px-4 font-medium">Actor</th>
                  <th className="py-2.5 px-4 font-medium">Role</th>
                  <th className="py-2.5 px-4 font-medium">CLID</th>
                  <th className="py-2.5 px-4 font-medium">Action</th>
                  <th className="py-2.5 px-4 font-medium">Categories</th>
                  <th className="py-2.5 px-4 font-medium">Decision</th>
                  <th className="py-2.5 px-4 font-medium">Chain Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)] font-mono text-[11px]">
                {filteredEntries.map((row) => {
                  const isAllow = row.decision === 'allow'

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-[var(--paper)] transition-colors"
                    >
                      <td className="py-2 px-4 text-[var(--ink-soft)] whitespace-nowrap">
                        {row.ts.replace('T', ' ').split('.')[0]}
                      </td>

                      <td className="py-2 px-4 font-medium text-[var(--ink)]">
                        {row.actor}
                      </td>

                      <td className="py-2 px-4 text-[var(--ink-soft)] capitalize">
                        {row.role}
                      </td>

                      <td className="py-2 px-4 text-[var(--teal)] font-semibold">
                        {row.clid}
                      </td>

                      <td className="py-2 px-4 text-[var(--ink-soft)] uppercase">
                        {row.action}
                      </td>

                      <td className="py-2 px-4 text-[var(--ink-soft)] max-w-xs truncate" title={row.categories}>
                        {row.categories}
                      </td>

                      <td className="py-2 px-4">
                        <span
                          className={`rounded px-1.5 py-0.2 uppercase text-[10px] font-bold tracking-wider ${
                            isAllow
                              ? 'bg-[var(--ok)]/10 text-[var(--ok)] border border-[var(--ok)]/30'
                              : 'bg-[var(--alert-vermilion)]/10 text-[var(--alert-vermilion)] border border-[var(--alert-vermilion)]/30'
                          }`}
                        >
                          {row.decision}
                        </span>
                      </td>

                      <td className="py-2 px-4">
                        <HashChip hash={row.hash} length={8} />
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
