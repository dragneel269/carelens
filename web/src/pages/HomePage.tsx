import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Shield,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  UserX,
  Pill,
  Clock,
} from 'lucide-react'
import { usePatientsSearch } from '../api/client'
import { useAuthStore } from '../lib/auth'
import { MatchBadge } from '../components/clinical/MatchBadge'
import { SkeletonCard } from '../components/clinical/SkeletonCard'
import { EmptyState } from '../components/clinical/EmptyState'

export function HomePage() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.currentUser)
  const { data: patients = [], isLoading, isError, error, refetch } = usePatientsSearch('')

  const heroPatient = patients.find((p) => p.clid === 'CL-000001') || patients[0]

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8 space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--teal)] font-medium">
                {currentUser?.desk || 'CareLens Workspace'}
              </span>
              <span className="text-[var(--line)]">·</span>
              <span className="font-mono text-xs text-[var(--ok)] flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Zero-Trust Policy Active
              </span>
            </div>
            <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--ink)]">
              CareLens Neighbourhood
            </h1>
            <p className="mt-1 text-sm text-[var(--ink-soft)] max-w-2xl font-serif italic text-[var(--teal)]">
              &ldquo;ABDM connects hospitals to the nation. CareLens connects your doctor to your chemist, no national ID required.&rdquo;
            </p>
            <p className="mt-0.5 text-xs text-[var(--ink-soft)] max-w-2xl">
              Cross-facility continuity of care between local single-doctor clinics and standalone chemists. Real-time simulated OTP consent, allergy safety checks, and zero-trust role redaction.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-[4px] border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1 font-mono text-xs text-[var(--ink)]">
              Role: <strong className="text-[var(--teal)] uppercase">{currentUser?.role || 'doctor'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Featured Hero Patient */}
      {isLoading ? (
        <SkeletonCard lines={3} />
      ) : isError ? (
        <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-6">
          <EmptyState
            title="Failed to load patient records"
            description={error?.message || 'Check your network connection or session.'}
            nextStep="Retry fetching directory or re-authenticate badge from top bar."
            action={{ label: 'Retry', onClick: () => refetch() }}
            icon={AlertCircle}
          />
        </div>
      ) : patients.length === 0 ? (
        <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-6">
          <EmptyState
            title="No patients found"
            description="No patient records have been linked yet or directory is empty."
            nextStep="Run ingestion pipeline from demo command center (⌘⇧D) or reset seed."
            icon={UserX}
          />
        </div>
      ) : heroPatient ? (
        <section aria-labelledby="hero-patient-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="hero-patient-heading" className="font-mono text-xs uppercase tracking-wider text-[var(--ink-soft)] font-medium">
              Featured Hero Patient (Spec §8)
            </h2>
            <span className="text-xs text-[var(--ink-soft)]">4 Feeder Systems Linked</span>
          </div>

          <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-6 hover:border-[var(--teal)] transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-serif text-2xl font-bold tracking-tight text-[var(--ink)]">
                    {heroPatient.name}
                  </span>
                  <span className="rounded-[4px] border border-[var(--line)] bg-[var(--paper)] px-2 py-0.5 font-mono text-xs text-[var(--ink-soft)]">
                    {heroPatient.clid}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--ink-soft)] font-mono">
                  <span>DOB: 1968-03-14 (58y)</span>
                  <span>·</span>
                  <span>Mysuru, KA (570001)</span>
                  <span>·</span>
                  <span>Phone: +91 90000 12345</span>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-2">
                <MatchBadge
                  linkedSystems={heroPatient.linked_systems}
                  confidenceScore={heroPatient.best_score}
                  size="md"
                />
                <button
                  onClick={() => navigate(`/patient/${heroPatient.clid}`)}
                  className="mt-1 flex items-center gap-1.5 rounded-[6px] bg-[var(--teal)] px-3.5 py-1.5 font-sans text-xs font-medium text-white hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <span>Open Unified Chart</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-4 border-t border-[var(--line)] pt-3 text-xs text-[var(--ink-soft)]">
              Planted issues: Penicillin allergy conflict, duplicate lipid panel, missing EHR Atorvastatin record.
            </div>
          </div>
        </section>
      ) : null}

      {/* Quick Navigation Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          onClick={() => navigate('/counter')}
          className="rounded-[8px] border border-[var(--source-pharmacy)]/40 bg-[var(--surface)] p-4 hover:border-[var(--source-pharmacy)] cursor-pointer transition-all shadow-2xs group"
        >
          <div className="flex items-center gap-2 text-[var(--source-pharmacy)]">
            <Pill className="h-4 w-4" />
            <h3 className="font-serif font-semibold text-sm text-[var(--ink)] group-hover:text-[var(--source-pharmacy)]">Chemist Counter</h3>
          </div>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            Simulated OTP consent, allergy safety check, duplicate therapy detection at point of dispense.
          </p>
        </div>

        <div
          onClick={() => navigate('/followups')}
          className="rounded-[8px] border border-[var(--warn)]/40 bg-[var(--surface)] p-4 hover:border-[var(--warn)] cursor-pointer transition-all shadow-2xs group"
        >
          <div className="flex items-center gap-2 text-[var(--warn)]">
            <Clock className="h-4 w-4" />
            <h3 className="font-serif font-semibold text-sm text-[var(--ink)] group-hover:text-[var(--warn)]">Refill Gap Alerts</h3>
          </div>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            Identify patients with overdue chronic medication refills across neighbourhood pharmacies.
          </p>
        </div>

        <div
          onClick={() => navigate('/portal')}
          className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4 hover:border-[var(--teal)] cursor-pointer transition-all shadow-2xs group"
        >
          <div className="flex items-center gap-2 text-[var(--teal)]">
            <FileText className="h-4 w-4" />
            <h3 className="font-serif font-semibold text-sm text-[var(--ink)] group-hover:text-[var(--teal)]">Patient Portal</h3>
          </div>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            Self-service patient consent management, consent revocations, and access history.
          </p>
        </div>

        <div
          onClick={() => navigate('/audit')}
          className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-4 hover:border-[var(--teal)] cursor-pointer transition-all shadow-2xs group"
        >
          <div className="flex items-center gap-2 text-[var(--teal)]">
            <Shield className="h-4 w-4" />
            <h3 className="font-serif font-semibold text-sm text-[var(--ink)] group-hover:text-[var(--teal)]">Audit Ledger</h3>
          </div>
          <p className="mt-1 text-xs text-[var(--ink-soft)]">
            Cryptographic SHA-256 tamper-evident access log verifying chain integrity.
          </p>
        </div>
      </div>
    </div>
  )
}
