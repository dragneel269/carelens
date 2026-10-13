import { useState, useCallback } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Phone,
  ShieldCheck,
  Search,
  Sparkles,
  Lock,
  RefreshCw,
  Building2,
  FileWarning,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '../lib/auth'
import {
  searchPatients,
  requestCounterOTP,
  confirmCounterOTP,
  useCounterSafety,
  type PatientSearchHit,
} from '../api/client'
import { MatchBadge } from '../components/clinical/MatchBadge'
import { EmptyState } from '../components/clinical/EmptyState'

export function CounterPage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const login = useAuthStore((s) => s.login)

  const [query, setQuery] = useState('90000 55001') // Default to Priya Nair for easy demo
  const [searching, setSearching] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchHit | null>(null)

  // OTP flow state
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null)
  const [confirmingOtp, setConfirmingOtp] = useState(false)
  const [consentActive, setConsentActive] = useState(false)

  const isPharmacist = currentUser?.role === 'pharmacist'

  const handleSearch = useCallback(async (term: string) => {
    if (!term.trim()) return
    setSearching(true)
    setSelectedPatient(null)
    setOtpSent(false)
    setConsentActive(false)
    setSimulatedCode(null)
    setOtpCode('')

    try {
      const results = await searchPatients(term.trim())
      if (results && results.length > 0) {
        const hit = results[0]
        setSelectedPatient(hit)
      } else {
        toast.info('No patient found for that phone number or name.')
      }
    } catch {
      toast.error('Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }, [])


  // Safety check query
  const {
    data: safetyData,
    isLoading: loadingSafety,
    refetch: refetchSafety,
  } = useCounterSafety(selectedPatient?.clid || null, consentActive)

  const handleRequestOTP = async () => {
    if (!selectedPatient) return
    const phone =
      typeof selectedPatient.phone === 'string'
        ? selectedPatient.phone
        : query

    try {
      const res = await requestCounterOTP(phone, selectedPatient.clid)
      setOtpSent(true)
      if (res.otp_code) {
        setSimulatedCode(res.otp_code)
        toast.info(`Simulated OTP generated: ${res.otp_code}`)
      }
    } catch {
      toast.error('Failed to request OTP.')
    }
  }

  const handleConfirmOTP = async () => {
    if (!selectedPatient || !otpCode) return
    setConfirmingOtp(true)
    try {
      await confirmCounterOTP(selectedPatient.clid, otpCode.trim())
      setConsentActive(true)
      toast.success('Patient consent verified! 24h counter access active.')
      refetchSafety()
    } catch {
      toast.error('Invalid OTP code. Please verify and try again.')
    } finally {
      setConfirmingOtp(false)
    }
  }

  const prefillPatient = (_name: string, phone: string) => {
    setQuery(phone)
    handleSearch(phone)
  }

  if (!isPharmacist) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <EmptyState
          icon={Lock}
          title="Pharmacist Role Required"
          description="The Pharmacy Counter Safety Check is restricted to dispensing chemists under zero-trust policy. Switch to Imran Khan (Pharmacist) to verify OTP consent and evaluate drug interactions."
          nextStep="Click the button below to switch your active role to Pharmacist."
          action={{
            label: 'Switch to Imran Khan (Pharmacist)',
            onClick: () => login('pharm.imran'),
          }}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 antialiased">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--source-pharmacy)] bg-[var(--source-pharmacy)]/10 px-2 py-0.5 rounded-[4px] border border-[var(--source-pharmacy)]/30">
              Chemist Counter
            </span>
            <span className="text-xs text-[var(--ink-soft)] font-mono">
              CareLens Neighbourhood
            </span>
          </div>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-[var(--ink)]">
            Pharmacy Dispense & Safety Check
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-[var(--ink-soft)]">
            Point-of-dispense allergy warnings, duplicate therapies, and clinic-prescribed history — no national ID required.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="rounded-[6px] border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--ink)]">
            <span className="text-[var(--ink-soft)]">Dispensing as: </span>
            <span className="font-semibold text-[var(--source-pharmacy)]">
              Imran Khan (Chemist Corner)
            </span>
          </div>
        </div>
      </div>

      {/* Lookup Bar & Demo Presets */}
      <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--ink-soft)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
              placeholder="Enter patient mobile number (e.g. 90000 55001) or name..."
              className="w-full rounded-[6px] border border-[var(--line)] bg-[var(--paper)] py-2 pl-9 pr-3 font-mono text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[var(--teal)] focus:outline-none"
            />
          </div>
          <button
            onClick={() => handleSearch(query)}
            disabled={searching}
            className="flex items-center justify-center gap-1.5 rounded-[6px] bg-[var(--teal)] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[var(--teal-strong)] transition-all cursor-pointer disabled:opacity-50"
          >
            {searching ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            <span>Lookup Patient</span>
          </button>
        </div>

        {/* Demo Scenario Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[var(--line)]/60 text-xs">
          <span className="text-[var(--ink-soft)] font-medium">Demo Scenarios:</span>
          <button
            onClick={() => prefillPatient('Priya Nair', '90000 55001')}
            className="rounded-[4px] border border-[var(--alert)]/40 bg-[var(--alert)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--alert)] hover:bg-[var(--alert)]/20 transition-colors cursor-pointer"
          >
            🔴 Priya Nair (Penicillin Allergy Conflict)
          </button>
          <button
            onClick={() => prefillPatient('Ramesh Kumar', '90000 11001')}
            className="rounded-[4px] border border-[var(--primary)]/40 bg-[var(--tint-teal)] px-2 py-0.5 text-[11px] font-medium text-[var(--teal)] hover:bg-[var(--primary)]/15 transition-colors cursor-pointer"
          >
            🔵 Ramesh Kumar (Missing from EHR)
          </button>
          <button
            onClick={() => prefillPatient('Suresh Pai', '90000 55002')}
            className="rounded-[4px] border border-[var(--warn)]/40 bg-[var(--warn)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--warn)] hover:bg-[var(--warn)]/20 transition-colors cursor-pointer"
          >
            🟡 Suresh Pai (Metformin Refill Overdue)
          </button>
        </div>
      </div>

      {/* Patient Identification Card */}
      {selectedPatient && (
        <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl font-bold text-[var(--ink)]">
                  {selectedPatient.name}
                </h2>
                <span className="rounded-[4px] border border-[var(--line)] bg-[var(--paper)] px-2 py-0.5 font-mono text-xs text-[var(--ink-soft)]">
                  {selectedPatient.clid}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--ink-soft)]">
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  <span className="font-mono">
                    {typeof selectedPatient.phone === 'string'
                      ? selectedPatient.phone
                      : 'Restricted'}
                  </span>
                </span>
                <span>Gender: {selectedPatient.gender || 'Unknown'}</span>
                <span>
                  DOB:{' '}
                  <span className="font-mono">
                    {typeof selectedPatient.dob === 'string'
                      ? selectedPatient.dob
                      : 'Restricted'}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MatchBadge
                linkedSystems={selectedPatient.linked_systems}
                confidenceScore={selectedPatient.best_score}
              />
            </div>
          </div>

          {/* Consent Banner / OTP Verification */}
          <div className="mt-4">
            {consentActive ? (
              <div className="flex items-center justify-between rounded-[8px] border border-[var(--ok)]/40 bg-[var(--ok)]/10 p-3 text-xs">
                <div className="flex items-center gap-2 text-[var(--ok)]">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span className="font-medium">
                    24-Hour Counter Consent Active — Verified by Patient OTP
                  </span>
                </div>
                <span className="font-mono text-[11px] text-[var(--ok)]">
                  Purpose: counter_check (Treatment)
                </span>
              </div>
            ) : (
              <div className="rounded-[8px] border border-[var(--warn)]/40 bg-[var(--warn)]/10 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-[var(--warn)] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-semibold text-[var(--ink)]">
                      Patient Consent Required for Clinical Safety Check
                    </h3>
                    <p className="mt-0.5 text-xs text-[var(--ink-soft)]">
                      To protect patient privacy, full clinic allergy records and prescription history require explicit 24-hour counter consent via OTP.
                    </p>
                  </div>
                </div>

                {!otpSent ? (
                  <button
                    onClick={handleRequestOTP}
                    className="flex items-center gap-2 rounded-[6px] bg-[var(--teal)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[var(--teal-strong)] transition-all cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Request Simulated Patient OTP</span>
                  </button>
                ) : (
                  <div className="space-y-3 pt-1">
                    {simulatedCode && (
                      <div className="flex items-center justify-between rounded-[6px] border border-[var(--line)] bg-[var(--surface)] p-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-[var(--teal)]" />
                          <span className="text-[var(--ink)]">
                            Patient&apos;s Phone received code:{' '}
                            <strong className="font-mono text-sm text-[var(--teal)]">
                              {simulatedCode}
                            </strong>
                          </span>
                        </div>
                        <button
                          onClick={() => setOtpCode(simulatedCode)}
                          className="rounded-[4px] border border-[var(--line)] bg-[var(--paper)] px-2 py-1 text-[11px] font-mono text-[var(--ink)] hover:bg-[var(--teal)]/10 cursor-pointer"
                        >
                          Auto-Fill
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="Enter 6-digit OTP..."
                        className="w-40 rounded-[6px] border border-[var(--line)] bg-[var(--paper)] px-3 py-1.5 font-mono text-sm tracking-widest text-[var(--ink)] focus:border-[var(--teal)] focus:outline-none"
                      />
                      <button
                        onClick={handleConfirmOTP}
                        disabled={confirmingOtp || otpCode.length < 6}
                        className="flex items-center gap-1.5 rounded-[6px] bg-[var(--ok)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {confirmingOtp ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        <span>Confirm OTP</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Safety Check Evaluation Panel */}
      {selectedPatient && consentActive && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-[var(--ink)] flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[var(--teal)]" />
              <span>Dispensing Safety Report</span>
            </h3>
            {safetyData && (
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="rounded-[4px] border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-[var(--ink-soft)]">
                  {safetyData.allergies_checked} allergies checked
                </span>
                <span className="rounded-[4px] border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-[var(--ink-soft)]">
                  {safetyData.medications_checked} medications evaluated
                </span>
              </div>
            )}
          </div>

          {loadingSafety ? (
            <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-soft)]">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[var(--teal)]" />
              Analyzing clinic EHR records against chemist dispense history...
            </div>
          ) : safetyData && safetyData.flags && safetyData.flags.length > 0 ? (
            <div className="space-y-3">
              {safetyData.flags.map((flag, idx) => {
                const isCritical = flag.severity === 'critical'
                const isWarning = flag.severity === 'warning'

                return (
                  <div
                    key={idx}
                    className={`rounded-[10px] border p-4 shadow-2xs transition-all ${
                      isCritical
                        ? 'border-[var(--alert)]/50 bg-[var(--alert)]/5'
                        : isWarning
                        ? 'border-[var(--warn)]/50 bg-[var(--warn)]/5'
                        : 'border-[var(--primary)]/40 bg-[var(--tint-teal)]/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-[6px] shrink-0 ${
                            isCritical
                              ? 'bg-[var(--alert)] text-white'
                              : isWarning
                              ? 'bg-[var(--warn)] text-white'
                              : 'bg-[var(--teal)] text-white'
                          }`}
                        >
                          {isCritical ? (
                            <FileWarning className="h-4 w-4" />
                          ) : isWarning ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[4px] ${
                                isCritical
                                  ? 'bg-[var(--alert)]/20 text-[var(--alert)] border border-[var(--alert)]/40'
                                  : isWarning
                                  ? 'bg-[var(--warn)]/20 text-[var(--warn)] border border-[var(--warn)]/40'
                                  : 'bg-[var(--teal)]/20 text-[var(--teal)] border border-[var(--teal)]/40'
                              }`}
                            >
                              {flag.flag.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs font-semibold text-[var(--ink)]">
                              {flag.medication}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-[var(--ink)] font-medium leading-relaxed">
                            {flag.message}
                          </p>

                          {flag.suggestion && (
                            <p className="mt-1.5 text-xs text-[var(--teal)] font-medium">
                              💡 Suggestion: {flag.suggestion}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-[10px] text-[var(--ink-soft)] block">
                          Source: {flag.source}
                        </span>
                        {flag.dispensed_at && (
                          <span className="font-mono text-[10px] text-[var(--ink-soft)] block">
                            {new Date(flag.dispensed_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action recommendations for critical flags */}
                    {isCritical && (
                      <div className="mt-3 pt-3 border-t border-[var(--alert)]/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[var(--alert)] flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          High Risk: Potential anaphylaxis / drug-allergy reaction
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              toast.warning(
                                'Prescription flagged. Chemist contacting Dr. Ramesh Rao (Apollo/HealthPoint Clinic).'
                              )
                            }
                            className="rounded-[6px] border border-[var(--alert)]/40 bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--alert)] hover:bg-[var(--alert)]/10 cursor-pointer"
                          >
                            Contact Prescribing Clinic
                          </button>
                          <button
                            onClick={() =>
                              toast.info('Dispensing halted. Marked as conflict on ledger.')
                            }
                            className="rounded-[6px] bg-[var(--alert)] px-2.5 py-1 text-xs font-semibold text-white shadow-2xs hover:opacity-90 cursor-pointer"
                          >
                            Halt Dispense
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-[10px] border border-[var(--ok)]/40 bg-[var(--ok)]/5 p-6 text-center text-xs text-[var(--ok)] space-y-1">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-[var(--ok)]" />
              <p className="font-semibold">All Clear — No Drug Conflicts Detected</p>
              <p className="text-[var(--ink-soft)]">
                Patient has no documented allergies matching this dispense class.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Information footer for judges */}
      <div className="rounded-[8px] border border-[var(--line)] bg-[var(--paper)] p-4 text-xs text-[var(--ink-soft)] space-y-1">
        <div className="flex items-center gap-2 text-[var(--ink)] font-semibold">
          <Building2 className="h-4 w-4 text-[var(--teal)]" />
          <span>CareLens Neighbourhood Continuity Layer</span>
        </div>
        <p>
          Single-doctor clinics and local chemists lack ABDM hospital integration.
          CareLens links clinical records across systems using phonetic &amp; multi-attribute matching,
          safeguarded by 24h simulated OTP consent and append-only cryptographic auditing.
        </p>
      </div>
    </div>
  )
}
