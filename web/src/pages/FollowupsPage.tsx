import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  Calendar,
  Clock,
  Filter,
  Pill,
  Send,
  Building,
  ArrowUpRight,
  RefreshCw,
  Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '../lib/auth'
import { useFollowups, type RefillAlert } from '../api/client'
import { EmptyState } from '../components/clinical/EmptyState'

export function FollowupsPage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const login = useAuthStore((s) => s.login)

  const [minDays, setMinDays] = useState<number>(0)
  const { data: alerts, isLoading, refetch } = useFollowups(minDays)

  const isAllowed =
    currentUser?.role === 'pharmacist' ||
    currentUser?.role === 'doctor' ||
    currentUser?.role === 'nurse'

  const handleSendReminder = (patientName: string, med: string) => {
    toast.success(
      `Simulated refill reminder SMS dispatched to ${patientName} for ${med}.`
    )
  }

  if (!isAllowed) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <EmptyState
          icon={Lock}
          title="Clinical Access Required"
          description="Refill gap alerts are restricted to doctors, nurses, and pharmacists under zero-trust RBAC."
          nextStep="Switch to Dr. Ramesh Rao (Doctor) or Imran Khan (Pharmacist) to review overdue patients."
          action={{
            label: 'Switch to Dr. Ramesh Rao (Doctor)',
            onClick: () => login('dr.rao'),
          }}
          secondaryAction={{
            label: 'Switch to Imran Khan (Pharmacist)',
            onClick: () => login('pharm.imran'),
          }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 antialiased">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--teal)] bg-[var(--tint-teal)] px-2 py-0.5 rounded-[4px] border border-[var(--primary)]/30">
              Adherence Monitoring
            </span>
            <span className="text-xs text-[var(--ink-soft)] font-mono">
              CareLens Neighbourhood
            </span>
          </div>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-[var(--ink)]">
            Refill Gap &amp; Adherence Alerts
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-[var(--ink-soft)]">
            Identifies chronic patients who have exhausted their supply and missed their expected refill date.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 self-start sm:self-auto rounded-[6px] border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--paper)] transition-all cursor-pointer shadow-2xs"
        >
          <RefreshCw className="h-3.5 w-3.5 text-[var(--ink-soft)]" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="flex items-center gap-1 text-[var(--ink-soft)] font-medium mr-1">
          <Filter className="h-3.5 w-3.5" />
          <span>Overdue Threshold:</span>
        </span>
        {[
          { label: 'All Overdue', days: 0 },
          { label: '7+ Days', days: 7 },
          { label: '14+ Days', days: 14 },
          { label: '20+ Days (High Risk)', days: 20 },
        ].map((f) => (
          <button
            key={f.days}
            onClick={() => setMinDays(f.days)}
            className={`rounded-[6px] px-3 py-1 font-mono transition-all cursor-pointer ${
              minDays === f.days
                ? 'bg-[var(--teal)] text-white font-semibold shadow-2xs'
                : 'border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--paper)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Overdue Alerts Table / Cards */}
      {isLoading ? (
        <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-soft)]">
          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[var(--teal)]" />
          Calculating refill gaps across pharmacy dispense records...
        </div>
      ) : alerts && alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert: RefillAlert, idx: number) => {
            const isSevere = alert.days_overdue >= 14
            return (
              <div
                key={idx}
                className={`rounded-[10px] border p-4 shadow-2xs transition-all ${
                  isSevere
                    ? 'border-[var(--alert)]/40 bg-[var(--alert)]/5'
                    : 'border-[var(--warn)]/40 bg-[var(--warn)]/5'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/patient/${alert.clid}`}
                        className="font-serif text-base font-bold text-[var(--ink)] hover:text-[var(--teal)] transition-colors flex items-center gap-1"
                      >
                        <span>{alert.patient_name}</span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-[var(--ink-soft)]" />
                      </Link>
                      <span className="rounded-[4px] border border-[var(--line)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--ink-soft)]">
                        {alert.clid}
                      </span>
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded-[4px] ${
                          isSevere
                            ? 'bg-[var(--alert)] text-white'
                            : 'bg-[var(--warn)] text-white'
                        }`}
                      >
                        {alert.days_overdue} days overdue
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--ink)]">
                      <span className="flex items-center gap-1 font-semibold text-[var(--teal)]">
                        <Pill className="h-3.5 w-3.5" />
                        <span>
                          {alert.brand_name || alert.generic_name}
                          {alert.dosage ? ` (${alert.dosage})` : ''}
                        </span>
                      </span>
                      <span className="text-[var(--ink-soft)]">
                        Generic: <strong className="font-mono">{alert.generic_name}</strong>
                      </span>
                      <span className="text-[var(--ink-soft)]">
                        Supply: <strong className="font-mono">{alert.days_supply} days</strong>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 text-[11px] text-[var(--ink-soft)] pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Last filled: {new Date(alert.last_dispensed).toLocaleDateString()}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Refill expected: {new Date(alert.expected_refill_date).toLocaleDateString()}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        <span>Pharmacy: {alert.pharmacy}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <button
                      onClick={() =>
                        handleSendReminder(
                          alert.patient_name,
                          alert.brand_name || alert.generic_name
                        )
                      }
                      className="flex items-center gap-1 rounded-[6px] bg-[var(--teal)] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[var(--teal-strong)] transition-all cursor-pointer"
                    >
                      <Send className="h-3 w-3" />
                      <span>Send Reminder SMS</span>
                    </button>
                    <Link
                      to={`/patient/${alert.clid}`}
                      className="rounded-[6px] border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper)] transition-all"
                    >
                      View Chart
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={AlertCircle}
          title="No Overdue Refills Found"
          description={`There are currently no chronic patients with unfulfilled refills exceeding ${minDays} days.`}
          nextStep="Try lowering the overdue threshold or checking back after new pharmacy dispense syncs."
          action={{
            label: 'Reset to All Overdue',
            onClick: () => setMinDays(0),
          }}
        />
      )}
    </div>
  )
}
