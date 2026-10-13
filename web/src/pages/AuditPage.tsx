import { useState } from 'react'
import {
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  Lock,
  Filter,
  Check,
  AlertTriangle,
} from 'lucide-react'
import { useAuditEntries, useAuditVerify } from '../api/client'
import { useAuthStore } from '../lib/auth'
import { HashChip } from '../components/clinical/HashChip'
import { SkeletonCard } from '../components/clinical/SkeletonCard'
import { EmptyState } from '../components/clinical/EmptyState'
import { CountUp } from '../components/clinical/CountUp'

export function AuditPage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const [filterAction, setFilterAction] = useState<string>('all')
  const { data: entries = [], isLoading, isError, error, refetch } = useAuditEntries(100)
  const {
    data: verify,
    isLoading: isVerifying,
    refetch: reVerify,
    isFetching: isFetchingVerify,
  } = useAuditVerify()

  const handleVerifyClick = async () => {
    await Promise.all([refetch(), reVerify()])
  }

  const isChainIntact = verify ? verify.verified || verify.valid : false
  const brokenRowId = verify?.broken_at_id ?? null

  const filteredEntries = entries.filter((e) => {
    if (filterAction === 'all') return true
    if (filterAction === 'allow') return e.decision === 'ALLOW' || e.decision === 'allow'
    if (filterAction === 'deny') return e.decision === 'DENY' || e.decision === 'deny'
    return true
  })

  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-8 space-y-6 antialiased font-sans">
      {/* Header Banner */}
      <header
        data-testid="audit-header"
        className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-xs"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--teal)] font-semibold">
                Security & Compliance
              </span>
              <span className="text-[var(--line)]">·</span>
              <span className="font-mono text-xs text-[var(--ink-soft)] flex items-center gap-1 font-medium">
                <Lock className="h-3.5 w-3.5" /> Append-Only SHA-256 Ledger
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[var(--ink)]">
              Cryptographic Audit Ledger
            </h1>

            <p className="text-xs text-[var(--ink-soft)] max-w-2xl leading-relaxed">
              Every clinical read, access grant, revocation, and policy denial generates an immutable ledger entry chained with SHA-256 cryptographic hashes.
            </p>

            {currentUser?.role !== 'admin' && (
              <div className="pt-2 flex items-center gap-2">
                <span className="font-mono text-xs text-[var(--ink-soft)]">
                  Active role is {currentUser?.role}.
                </span>
                <button
                  onClick={async () => {
                    await useAuthStore.getState().login('admin.neha')
                    refetch()
                    reVerify()
                  }}
                  className="rounded-[4px] border border-[var(--teal)]/40 bg-[var(--teal)]/10 px-2.5 py-1 font-sans text-xs font-semibold text-[var(--teal)] hover:bg-[var(--teal)] hover:text-white transition-colors cursor-pointer"
                >
                  Switch to IT Admin (Neha Sharma)
                </button>
              </div>
            )}
          </div>

          {/* Verification Status Card & Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Status Indicator */}
            <div
              data-testid="verify-status-banner"
              className={`rounded-[8px] border p-3 text-xs flex items-center gap-3 transition-colors ${
                isChainIntact
                  ? 'border-[var(--ok)]/30 bg-[var(--ok)]/10 text-[var(--ok)]'
                  : brokenRowId !== null
                  ? 'border-[var(--alert-vermilion)]/40 bg-[var(--alert-vermilion)]/10 text-[var(--alert-vermilion)]'
                  : 'border-[var(--line)] bg-[var(--paper)] text-[var(--ink-soft)]'
              }`}
            >
              {isVerifying || isFetchingVerify ? (
                <div className="flex items-center gap-2 font-mono text-xs text-[var(--teal)]">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Verifying chain integrity...</span>
                </div>
              ) : isChainIntact ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-[var(--ok)] shrink-0" />
                  <div>
                    <span className="font-mono font-bold block text-sm">Chain Intact (ok)</span>
                    <span className="text-[10px] font-mono text-[var(--ink-soft)] block">
                      <CountUp value={verify?.count || verify?.total_entries || entries.length} /> contiguous blocks verified
                    </span>
                  </div>
                </div>
              ) : brokenRowId !== null ? (
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-[var(--alert-vermilion)] shrink-0" />
                  <div>
                    <span className="font-mono font-bold block text-sm">Chain Broken</span>
                    <span className="text-[10px] font-mono text-[var(--alert-vermilion)] block font-semibold">
                      Broken at Row #{brokenRowId}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[var(--ink-soft)]" />
                  <span className="font-mono text-xs">Ready to verify</span>
                </div>
              )}
            </div>

            {/* Prominent Verify Button */}
            <button
              onClick={handleVerifyClick}
              disabled={isVerifying || isFetchingVerify}
              data-testid="verify-ledger-button"
              className="inline-flex items-center justify-center gap-2 rounded-[6px] border border-[var(--teal)] bg-[var(--teal)] px-4 py-2.5 font-sans text-xs font-semibold text-white shadow-2xs hover:bg-[var(--teal)]/90 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isVerifying || isFetchingVerify ? 'animate-spin' : ''}`}
              />
              <span>Verify Chain</span>
            </button>
          </div>
        </div>

        {/* Verification Result Callout (if broken or verified) */}
        {verify && (
          <div
            data-testid="verification-message-box"
            className={`mt-4 rounded-[6px] border p-3 text-xs font-mono transition-colors ${
              isChainIntact
                ? 'border-[var(--ok)]/30 bg-[var(--ok)]/5 text-[var(--ok)]'
                : 'border-[var(--alert-vermilion)]/40 bg-[var(--alert-vermilion)]/5 text-[var(--alert-vermilion)] font-semibold'
            }`}
          >
            <div className="flex items-center gap-2">
              {isChainIntact ? <Check className="h-4 w-4 shrink-0" /> : <ShieldAlert className="h-4 w-4 shrink-0" />}
              <span>
                {isChainIntact
                  ? `Chain Verified: All ${verify.count || entries.length} entries successfully validated against genesis hash (ok).`
                  : `First broken row: Entry #${verify.broken_at_id}. ${verify.message}`}
              </span>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[var(--line)] pt-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[var(--ink-soft)] font-medium flex items-center gap-1 font-mono text-[11px]">
              <Filter className="h-3 w-3" /> Decision:
            </span>
            <button
              onClick={() => setFilterAction('all')}
              data-testid="filter-ledger-all"
              className={`rounded-[4px] px-2.5 py-1 font-mono text-xs transition-colors cursor-pointer ${
                filterAction === 'all'
                  ? 'bg-[var(--teal)] text-white font-medium'
                  : 'bg-[var(--paper)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              All ({entries.length})
            </button>
            <button
              onClick={() => setFilterAction('allow')}
              data-testid="filter-ledger-allow"
              className={`rounded-[4px] px-2.5 py-1 font-mono text-xs transition-colors cursor-pointer ${
                filterAction === 'allow'
                  ? 'bg-[var(--ok)] text-white font-medium'
                  : 'bg-[var(--paper)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              Allowed
            </button>
            <button
              onClick={() => setFilterAction('deny')}
              data-testid="filter-ledger-deny"
              className={`rounded-[4px] px-2.5 py-1 font-mono text-xs transition-colors cursor-pointer ${
                filterAction === 'deny'
                  ? 'bg-[var(--alert-vermilion)] text-white font-medium'
                  : 'bg-[var(--paper)] text-[var(--alert-vermilion)] hover:bg-[var(--alert-vermilion)]/10'
              }`}
            >
              Denied
            </button>
          </div>

          <span className="font-mono text-[11px] text-[var(--ink-soft)]">
            Showing {filteredEntries.length} ledger entries
          </span>
        </div>
      </header>

      {/* Ledger-Style Table with HashChip */}
      <section
        data-testid="ledger-table-section"
        className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] overflow-hidden shadow-xs"
      >
        {isLoading ? (
          <div className="p-6">
            <SkeletonCard lines={6} />
          </div>
        ) : isError ? (
          <div className="p-8">
            <EmptyState
              title="Failed to load ledger"
              description={error?.message || 'Access denied or database connection issue.'}
              nextStep="Switch to IT Admin (Neha Sharma) above or check backend status."
              action={{ label: 'Retry', onClick: () => refetch() }}
            />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No ledger events found"
              description="No audit records match your selected filter criteria."
              nextStep="Reset filter to 'All Decisions' or trigger reads in the patient chart."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--paper)] text-[10px] font-mono uppercase tracking-wider text-[var(--ink-soft)]">
                  <th className="py-2.5 px-3.5 font-medium">Block ID</th>
                  <th className="py-2.5 px-3.5 font-medium">Timestamp</th>
                  <th className="py-2.5 px-3.5 font-medium">Actor</th>
                  <th className="py-2.5 px-3.5 font-medium">Role</th>
                  <th className="py-2.5 px-3.5 font-medium">CLID</th>
                  <th className="py-2.5 px-3.5 font-medium">Action</th>
                  <th className="py-2.5 px-3.5 font-medium">Categories</th>
                  <th className="py-2.5 px-3.5 font-medium">Decision</th>
                  <th className="py-2.5 px-3.5 font-medium">Prev Hash</th>
                  <th className="py-2.5 px-3.5 font-medium">Block Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)] font-mono text-[11px]">
                {filteredEntries.map((row) => {
                  const isAllow = row.decision === 'ALLOW' || row.decision === 'allow'
                  const isBrokenRow = brokenRowId === row.id

                  return (
                    <tr
                      key={row.id}
                      data-testid={`ledger-row-${row.id}`}
                      className={`transition-colors ${
                        isBrokenRow
                          ? 'bg-[var(--alert-vermilion)]/15 border-l-4 border-l-[var(--alert-vermilion)] font-bold'
                          : 'hover:bg-[var(--paper)]'
                      }`}
                    >
                      {/* ID / Block */}
                      <td className="py-2.5 px-3.5 text-[var(--ink)] font-bold">
                        #{row.id}
                      </td>

                      {/* Timestamp */}
                      <td className="py-2.5 px-3.5 text-[var(--ink-soft)] whitespace-nowrap">
                        {row.ts.replace('T', ' ').split('.')[0]}
                      </td>

                      {/* Actor */}
                      <td className="py-2.5 px-3.5 font-medium text-[var(--ink)]">
                        {row.actor}
                      </td>

                      {/* Role */}
                      <td className="py-2.5 px-3.5 text-[var(--ink-soft)] capitalize">
                        {row.role}
                      </td>

                      {/* CLID */}
                      <td className="py-2.5 px-3.5 text-[var(--teal)] font-semibold">
                        {row.clid || '—'}
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3.5 text-[var(--ink-soft)] uppercase">
                        {row.action}
                      </td>

                      {/* Categories */}
                      <td
                        className="py-2.5 px-3.5 text-[var(--ink-soft)] max-w-[160px] truncate"
                        title={row.categories || row.reason}
                      >
                        {row.categories || '—'}
                      </td>

                      {/* Decision */}
                      <td className="py-2.5 px-3.5">
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

                      {/* Prev Hash */}
                      <td className="py-2.5 px-3.5">
                        <HashChip hash={row.prev_hash} length={8} />
                      </td>

                      {/* Block Hash */}
                      <td className="py-2.5 px-3.5">
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
