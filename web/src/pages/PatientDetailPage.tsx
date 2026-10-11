import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  AlertTriangle,
  FileText,
  Clock,
  Layers,
  Fingerprint,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import {
  usePatientSummary,
  usePatientTimeline,
  usePatientUnified,
  usePatientIdentity,
  isRestricted,
  type RestrictedMarker,
} from '../api/client'
import { MatchBadge } from '../components/clinical/MatchBadge'
import { SourceBadge, type RecordSource } from '../components/clinical/SourceBadge'
import { ProvChip } from '../components/clinical/ProvChip'
import { Redacted } from '../components/clinical/Redacted'
import { SkeletonCard } from '../components/clinical/SkeletonCard'
import { EmptyState } from '../components/clinical/EmptyState'

type ActiveTab = 'summary' | 'timeline' | 'unified' | 'identity'

export function PatientDetailPage() {
  const { id: clid = 'CL-000001' } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<ActiveTab>('summary')

  // Queries
  const {
    data: summary,
    isLoading: isLoadingSummary,
    isError: isErrorSummary,
    error: errorSummary,
    refetch: refetchSummary,
  } = usePatientSummary(clid)

  const {
    data: timeline,
    isLoading: isLoadingTimeline,
  } = usePatientTimeline(clid)

  const {
    data: unified,
    isLoading: isLoadingUnified,
  } = usePatientUnified(clid)

  const {
    data: identity,
    isLoading: isLoadingIdentity,
  } = usePatientIdentity(clid)

  if (isLoadingSummary && !summary) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <SkeletonCard lines={2} />
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    )
  }

  if (isErrorSummary || !summary) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <EmptyState
          title="Patient chart not found"
          description={errorSummary?.message || `Record for ${clid} could not be retrieved under your current policy role.`}
          action={{ label: 'Retry', onClick: () => refetchSummary() }}
          icon={AlertCircle}
        />
      </div>
    )
  }

  const patient = summary.patient
  const isDobRestricted = isRestricted(patient.dob)
  const isPhoneRestricted = isRestricted(patient.phone)
  const isCityRestricted = isRestricted(patient.city)

  const displayDob = typeof patient.dob === 'string' ? patient.dob : '—'
  const displayPhone = typeof patient.phone === 'string' ? patient.phone : '—'
  const displayCity = typeof patient.city === 'string' ? patient.city : '—'

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-6xl mx-auto antialiased">
      {/* Patient Header Banner (Spec §6 & Design System §Layout) */}
      <div className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-3xl font-bold tracking-tight text-[var(--ink)]">
                {patient.name}
              </h1>
              <span className="rounded-[4px] border border-[var(--line)] bg-[var(--paper)] px-2 py-0.5 font-mono text-xs font-medium text-[var(--ink-soft)]">
                {patient.clid}
              </span>
              <span className="rounded-[4px] border border-[var(--ok)]/30 bg-[var(--ok)]/10 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--ok)] flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Consent Active
              </span>
            </div>

            {/* Demographics row with potential Redacted markers */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono text-[var(--ink-soft)]">
              <div>
                <span className="text-[var(--ink-soft)]">DOB: </span>
                {isDobRestricted ? (
                  <Redacted
                    reason={(patient.dob as RestrictedMarker).reason}
                    width="w-24"
                  />
                ) : (
                  <span className="text-[var(--ink)]">{displayDob}</span>
                )}
              </div>

              <span>·</span>

              <div>
                <span className="text-[var(--ink-soft)]">Gender: </span>
                <span className="text-[var(--ink)] capitalize">{patient.gender || '—'}</span>
              </div>

              <span>·</span>

              <div>
                <span className="text-[var(--ink-soft)]">Phone: </span>
                {isPhoneRestricted ? (
                  <Redacted
                    reason={(patient.phone as RestrictedMarker).reason}
                    width="w-28"
                  />
                ) : (
                  <span className="text-[var(--ink)]">{displayPhone}</span>
                )}
              </div>

              <span>·</span>

              <div>
                <span className="text-[var(--ink-soft)]">Location: </span>
                {isCityRestricted ? (
                  <Redacted
                    reason={(patient.city as RestrictedMarker).reason}
                    width="w-32"
                  />
                ) : (
                  <span className="text-[var(--ink)]">{displayCity}</span>
                )}
              </div>
            </div>
          </div>

          {/* MatchBadge with source dots */}
          <div className="flex flex-col md:items-end gap-2 shrink-0">
            <MatchBadge
              linkedSystems={summary.linked_systems}
              confidenceScore={0.96}
              size="md"
            />
            <span className="font-mono text-[10px] text-[var(--ink-soft)]">
              {summary.linked_systems.length} systems contributing records
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 flex items-center border-t border-[var(--line)] pt-3 gap-1">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 font-sans text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'summary'
                ? 'bg-[var(--teal)] text-white'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Summary</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 font-sans text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-[var(--teal)] text-white'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Timeline</span>
          </button>

          <button
            onClick={() => setActiveTab('unified')}
            className={`flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 font-sans text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'unified'
                ? 'bg-[var(--teal)] text-white'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Unified Table</span>
          </button>

          <button
            onClick={() => setActiveTab('identity')}
            className={`flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 font-sans text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'identity'
                ? 'bg-[var(--teal)] text-white'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]'
            }`}
          >
            <Fingerprint className="h-3.5 w-3.5" />
            <span>Identity & Evidence</span>
          </button>
        </div>
      </div>

      {/* Tab: Summary */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Active Problems & Allergies Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Active Conditions */}
            <section className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
                <h2 className="font-serif text-base font-semibold text-[var(--ink)]">
                  Active Problems
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-soft)]">
                  EHR Conditions
                </span>
              </div>

              {isRestricted(summary.active_conditions) ? (
                <div className="p-3 bg-[var(--paper)] rounded-[6px] border border-[var(--line)]">
                  <Redacted
                    reason={summary.active_conditions.reason}
                    width="w-36"
                  />
                  <p className="mt-1 font-mono text-[11px] text-[var(--ink-soft)]">
                    Access restricted for your current role.
                  </p>
                </div>
              ) : summary.active_conditions.length === 0 ? (
                <p className="text-xs text-[var(--ink-soft)]">No active conditions recorded.</p>
              ) : (
                <div className="space-y-2">
                  {summary.active_conditions.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-2.5 text-xs"
                    >
                      <div>
                        <span className="font-medium text-[var(--ink)] block">{c.condition_name}</span>
                        {c.icd10_code && (
                          <span className="font-mono text-[10px] text-[var(--ink-soft)]">
                            ICD-10: {c.icd10_code}
                          </span>
                        )}
                      </div>
                      <ProvChip source={c.source as RecordSource} timestamp={c.recorded_at} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Active Allergies */}
            <section className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
                <h2 className="font-serif text-base font-semibold text-[var(--ink)]">
                  Documented Allergies
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-soft)]">
                  Immuno Alerts
                </span>
              </div>

              {isRestricted(summary.active_allergies) ? (
                <div className="p-3 bg-[var(--paper)] rounded-[6px] border border-[var(--line)]">
                  <Redacted
                    reason={summary.active_allergies.reason}
                    width="w-36"
                  />
                  <p className="mt-1 font-mono text-[11px] text-[var(--ink-soft)]">
                    Access restricted for your current role.
                  </p>
                </div>
              ) : summary.active_allergies.length === 0 ? (
                <p className="text-xs text-[var(--ink-soft)]">No known documented allergies.</p>
              ) : (
                <div className="space-y-2">
                  {summary.active_allergies.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-2.5 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-[var(--alert-vermilion)]">{a.substance}</span>
                          <span className="rounded bg-[var(--alert-vermilion)]/10 px-1.5 py-0.2 font-mono text-[10px] text-[var(--alert-vermilion)] uppercase">
                            {a.severity || 'High'}
                          </span>
                        </div>
                        {a.allergy_class && (
                          <span className="font-mono text-[10px] text-[var(--ink-soft)]">
                            Class: {a.allergy_class}
                          </span>
                        )}
                      </div>
                      <ProvChip source={a.source as RecordSource} timestamp={a.recorded_at} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Current Reconciled Medications with Conflict Flags */}
          <section className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
              <div>
                <h2 className="font-serif text-base font-semibold text-[var(--ink)]">
                  Reconciled Current Medications
                </h2>
                <p className="text-[11px] text-[var(--ink-soft)]">
                  Cross-referenced between EHR prescribed and Pharmacy dispensed regimens.
                </p>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--source-pharmacy)]">
                Pharmacy + EHR
              </span>
            </div>

            {isRestricted(summary.current_medications) ? (
              <div className="p-4 bg-[var(--paper)] rounded-[6px] border border-[var(--line)]">
                <Redacted
                  reason={summary.current_medications.reason}
                  width="w-48"
                />
                <p className="mt-1 font-mono text-[11px] text-[var(--ink-soft)]">
                  Access restricted for your current role.
                </p>
              </div>
            ) : summary.current_medications.length === 0 ? (
              <p className="text-xs text-[var(--ink-soft)]">No active medications recorded.</p>
            ) : (
              <div className="space-y-2.5">
                {summary.current_medications.map((m, idx) => (
                  <div
                    key={idx}
                    className={`rounded-[8px] border p-3 text-xs transition-all ${
                      m.has_conflict
                        ? 'border-[var(--alert-vermilion)]/60 bg-[var(--alert-vermilion)]/5'
                        : 'border-[var(--line)] bg-[var(--paper)]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-sm text-[var(--ink)]">
                            {m.generic_name}
                          </span>
                          {m.brand_name && (
                            <span className="rounded-[4px] border border-[var(--line)] bg-[var(--surface)] px-1.5 py-0.2 font-mono text-[10px] text-[var(--ink-soft)]">
                              Brand: {m.brand_name}
                            </span>
                          )}
                          {m.dose && (
                            <span className="font-mono text-[11px] text-[var(--ink-soft)]">
                              ({m.dose})
                            </span>
                          )}
                        </div>

                        {/* Conflict warning callout */}
                        {m.has_conflict && (
                          <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] font-medium text-[var(--alert-vermilion)]">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              {m.conflict_type === 'allergy_conflict'
                                ? 'ALLERGY CONFLICT: Dispensed despite documented penicillin allergy!'
                                : m.conflict_type === 'missing_from_ehr'
                                ? 'DISCREPANCY: Dispensed by pharmacy but missing from hospital EHR!'
                                : 'DISCREPANCY FLAGGED'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <ProvChip source={m.source as RecordSource} timestamp={m.recorded_at} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Lab Test Trends & Serial Results */}
          <section className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
              <div>
                <h2 className="font-serif text-base font-semibold text-[var(--ink)]">
                  Laboratory Test Results & Trends
                </h2>
                <p className="text-[11px] text-[var(--ink-soft)]">
                  Unified serial observations across Lab A and Lab B normalized into standardized units.
                </p>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--source-lab)]">
                Normalized LOINC
              </span>
            </div>

            {isRestricted(summary.lab_trends) ? (
              <div className="p-4 bg-[var(--paper)] rounded-[6px] border border-[var(--line)]">
                <Redacted
                  reason={summary.lab_trends.reason}
                  width="w-48"
                />
                <p className="mt-1 font-mono text-[11px] text-[var(--ink-soft)]">
                  Access restricted for your current role.
                </p>
              </div>
            ) : summary.lab_trends.length === 0 ? (
              <p className="text-xs text-[var(--ink-soft)]">No laboratory observations found.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {summary.lab_trends.map((t, idx) => (
                  <div
                    key={idx}
                    className="rounded-[8px] border border-[var(--line)] bg-[var(--paper)] p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-serif font-semibold text-xs text-[var(--ink)] block truncate">
                          {t.test_name}
                        </span>
                        {t.loinc_code && (
                          <span className="font-mono text-[10px] text-[var(--ink-soft)]">
                            LOINC: {t.loinc_code}
                          </span>
                        )}
                      </div>
                      <span className="rounded bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-soft)] border border-[var(--line)]">
                        {t.trend.length} pts
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-xl font-bold tabular-nums text-[var(--ink)]">
                        {t.latest_value}
                      </span>
                      <span className="font-mono text-xs text-[var(--ink-soft)]">
                        {t.unit}
                      </span>
                    </div>

                    {/* Serial trend mini listing */}
                    <div className="pt-2 border-t border-[var(--line)]/50 space-y-1">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--ink-soft)] block">
                        Series Timeline:
                      </span>
                      {t.trend.map((pt, pIdx) => (
                        <div key={pIdx} className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-[var(--ink-soft)]">{pt.date.split('T')[0]}</span>
                          <span className="font-semibold text-[var(--ink)]">{pt.value} {pt.unit}</span>
                          <SourceBadge source={pt.source as RecordSource} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Encounters & Claims */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Encounters */}
            <section className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
                <h2 className="font-serif text-base font-semibold text-[var(--ink)]">
                  Clinical Encounters
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-soft)]">
                  Visits & Admissions
                </span>
              </div>

              {isRestricted(summary.recent_encounters) ? (
                <div className="p-3 bg-[var(--paper)] rounded-[6px] border border-[var(--line)]">
                  <Redacted
                    reason={summary.recent_encounters.reason}
                    width="w-32"
                  />
                  <p className="mt-1 font-mono text-[11px] text-[var(--ink-soft)]">
                    Access restricted for your current role.
                  </p>
                </div>
              ) : summary.recent_encounters.length === 0 ? (
                <p className="text-xs text-[var(--ink-soft)]">No clinical encounters recorded.</p>
              ) : (
                <div className="space-y-2">
                  {summary.recent_encounters.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-2.5 text-xs flex justify-between items-center"
                    >
                      <div>
                        <span className="font-medium text-[var(--ink)] block capitalize">
                          {e.encounter_type}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--ink-soft)]">
                          {e.facility || e.department || 'General Ward'} · {e.period_start.split('T')[0]}
                        </span>
                      </div>
                      <ProvChip source={e.source as RecordSource} timestamp={e.period_start} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Claims */}
            <section className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
                <h2 className="font-serif text-base font-semibold text-[var(--ink)]">
                  Insurance Claims
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--source-claims)]">
                  Insurer Ledger
                </span>
              </div>

              {isRestricted(summary.claims) ? (
                <div className="p-3 bg-[var(--paper)] rounded-[6px] border border-[var(--line)]">
                  <Redacted
                    reason={summary.claims.reason}
                    width="w-32"
                  />
                  <p className="mt-1 font-mono text-[11px] text-[var(--ink-soft)]">
                    Access restricted for your current role.
                  </p>
                </div>
              ) : summary.claims.length === 0 ? (
                <p className="text-xs text-[var(--ink-soft)]">No insurance claims on record.</p>
              ) : (
                <div className="space-y-2">
                  {summary.claims.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-2.5 text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-medium text-[var(--ink)]">
                            {c.claim_id}
                          </span>
                          <span className={`rounded px-1.5 py-0.2 font-mono text-[10px] uppercase ${
                            c.status === 'approved'
                              ? 'bg-[var(--ok)]/10 text-[var(--ok)]'
                              : 'bg-[var(--alert-vermilion)]/10 text-[var(--alert-vermilion)]'
                          }`}>
                            {c.status}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-[var(--ink-soft)]">
                          ₹{c.total_amount.toLocaleString()} · {c.service_date.split('T')[0]}
                        </span>
                      </div>
                      <ProvChip source={c.source as RecordSource} timestamp={c.service_date} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* Tab: Timeline */}
      {activeTab === 'timeline' && (
        <section className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
            <div>
              <h2 className="font-serif text-lg font-semibold text-[var(--ink)]">
                Chronological Event Stream
              </h2>
              <p className="text-xs text-[var(--ink-soft)]">
                Unified cross-system medical events ordered by date.
              </p>
            </div>
            <span className="font-mono text-xs text-[var(--ink-soft)]">
              {timeline?.items?.length || 0} Events
            </span>
          </div>

          {isLoadingTimeline ? (
            <div className="space-y-2">
              <SkeletonCard lines={3} />
              <SkeletonCard lines={3} />
            </div>
          ) : !timeline || timeline.items.length === 0 ? (
            <EmptyState
              title="No events in timeline"
              description="No clinical events recorded or authorized for this patient under your current role."
            />
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--line)]">
              {timeline.items.map((item) => (
                <div key={item.id} className="relative group">
                  <div className="absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)] bg-[var(--teal)]" />
                  <div className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-soft)]">
                          {item.type}
                        </span>
                        <span className="font-serif font-semibold text-[var(--ink)]">
                          {item.title}
                        </span>
                      </div>
                      <ProvChip source={item.source as RecordSource} timestamp={item.date} />
                    </div>

                    <div className="font-mono text-[11px] text-[var(--ink-soft)]">
                      Recorded ID: {item.source_record_id} · {item.date.split('T')[0]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tab: Unified Table */}
      {activeTab === 'unified' && (
        <section className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-6 space-y-4">
          <div className="border-b border-[var(--line)] pb-3">
            <h2 className="font-serif text-lg font-semibold text-[var(--ink)]">
              Unified Canonical Clinical Record
            </h2>
            <p className="text-xs text-[var(--ink-soft)]">
              Direct presentation of canonical clinical models with field-level redaction markers.
            </p>
          </div>

          {isLoadingUnified ? (
            <SkeletonCard lines={5} />
          ) : (
            <div className="overflow-x-auto rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-4 font-mono text-xs">
              <pre className="text-[var(--ink)] max-h-96 overflow-y-auto">
                {JSON.stringify(unified, null, 2)}
              </pre>
            </div>
          )}
        </section>
      )}

      {/* Tab: Identity */}
      {activeTab === 'identity' && (
        <section className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-6 space-y-6">
          <div className="border-b border-[var(--line)] pb-3">
            <h2 className="font-serif text-lg font-semibold text-[var(--ink)]">
              Identity Matching & Link Evidence (Spec §4)
            </h2>
            <p className="text-xs text-[var(--ink-soft)]">
              Cross-system entity resolution with per-field RapidFuzz scoring and provenance tracking.
            </p>
          </div>

          {isLoadingIdentity ? (
            <SkeletonCard lines={4} />
          ) : identity ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {identity.links.map((link) => (
                  <div
                    key={`${link.source}-${link.source_record_id}`}
                    className="rounded-[8px] border border-[var(--line)] bg-[var(--paper)] p-3 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <SourceBadge source={link.source} />
                      <span className="font-mono text-xs font-bold text-[var(--ok)]">
                        {Math.round(link.confidence_score * 100)}% Match
                      </span>
                    </div>

                    <div className="font-mono text-[11px] text-[var(--ink-soft)]">
                      Record ID: <span className="text-[var(--ink)]">{link.source_record_id}</span>
                    </div>

                    {link.evidence && (
                      <div className="pt-2 border-t border-[var(--line)] space-y-1">
                        <span className="font-mono text-[10px] text-[var(--ink-soft)] block">
                          Field-Level Scoring:
                        </span>
                        <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                          {Object.entries(link.evidence).map(([k, v]) => (
                            <div key={k} className="flex justify-between bg-[var(--surface)] p-1 rounded border border-[var(--line)]">
                              <span className="text-[var(--ink-soft)]">{k}</span>
                              <span className="font-semibold text-[var(--ink)]">
                                {typeof v === 'number' ? `${Math.round(v * 100)}%` : String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      )}
    </div>
  )
}
