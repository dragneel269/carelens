import { useParams } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  X,
  Database,
  Info,
} from 'lucide-react'
import { usePatientIdentity } from '../../api/client'
import { SourceBadge, type RecordSource } from '../clinical/SourceBadge'
import { ProvChip } from '../clinical/ProvChip'
import { SkeletonCard } from '../clinical/SkeletonCard'

interface RightDrawerProps {
  open: boolean
  onClose: () => void
}

export function RightDrawer({ open, onClose }: RightDrawerProps) {
  const { id: clid } = useParams<{ id: string }>()
  const { data: identity, isLoading } = usePatientIdentity(clid)
  const shouldReduceMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop on tablet / mobile screens */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-35 bg-black lg:hidden"
            aria-hidden="true"
          />

          {/* Sliding Inspector Drawer */}
          <motion.aside
            aria-label="Provenance and Record Inspector"
            initial={shouldReduceMotion ? { opacity: 0 } : { x: '100%' }}
            animate={shouldReduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { x: '100%' }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[380px] flex-col border-l border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] shadow-2xl antialiased"
          >
            {/* Drawer Header */}
            <div className="flex h-13 items-center justify-between border-b border-[var(--line)] px-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-[var(--teal)]" />
                <h2 className="font-serif text-base font-semibold tracking-tight text-[var(--ink)]">
                  Record Inspector
                </h2>
              </div>

              <button
                onClick={onClose}
                aria-label="Close inspector drawer"
                className="rounded-[6px] border border-[var(--line)] p-1 text-[var(--ink-soft)] hover:bg-[var(--paper)] hover:text-[var(--ink)] transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
              {!clid ? (
                <div className="rounded-[8px] border border-[var(--line)] bg-[var(--paper)] p-4 text-center">
                  <Info className="mx-auto h-5 w-5 text-[var(--ink-soft)] mb-2" />
                  <h3 className="font-serif text-sm font-medium text-[var(--ink)]">No patient selected</h3>
                  <p className="mt-1 text-[11px] text-[var(--ink-soft)]">
                    Select a patient from the directory on the left or press ⌘K to inspect feeder sources and link evidence.
                  </p>
                </div>
              ) : isLoading ? (
                <div className="space-y-3">
                  <SkeletonCard lines={2} />
                  <SkeletonCard lines={2} />
                </div>
              ) : identity ? (
                <>
                  {/* Patient Header Summary */}
                  <div className="rounded-[8px] border border-[var(--line)] bg-[var(--paper)] p-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--teal)] font-medium">
                        Golden Record
                      </span>
                      <span className="font-mono text-[11px] font-semibold text-[var(--ink)]">
                        {identity.clid}
                      </span>
                    </div>
                    <div className="mt-1 font-serif text-lg font-semibold text-[var(--ink)]">
                      {identity.golden_patient.name}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      <ProvChip
                        source="ehr"
                        timestamp={identity.golden_patient.created_at || new Date().toISOString()}
                      />
                    </div>
                  </div>

                  {/* Field Provenance Table */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--ink-soft)]">
                        Demographic Provenance
                      </span>
                      <span className="text-[10px] text-[var(--ink-soft)]">Priority: EHR &gt; Lab &gt; Pharm &gt; Claims</span>
                    </div>

                    <div className="rounded-[8px] border border-[var(--line)] bg-[var(--surface)] divide-y divide-[var(--line)] overflow-hidden shadow-2xs">
                      {Object.entries(identity.provenance || {}).map(([field, src]) => (
                        <div key={field} className="flex items-center justify-between px-3 py-2 text-xs hover:bg-[var(--paper)]/50 transition-colors">
                          <span className="font-mono text-[11px] capitalize text-[var(--ink-soft)]">
                            {field}
                          </span>
                          <SourceBadge source={src as RecordSource} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Linked Feeder Sources & Per-Field Evidence */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--ink-soft)]">
                        Linked Sources ({identity.links.length})
                      </span>
                      <span className="text-[10px] font-mono text-[var(--ok)]">&ge;90% match</span>
                    </div>

                    <div className="space-y-2.5">
                      {identity.links.map((link) => (
                        <div
                          key={`${link.source}-${link.source_record_id}`}
                          className="rounded-[8px] border border-[var(--line)] bg-[var(--paper)] p-3 space-y-2 transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--teal)]/40 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <SourceBadge source={link.source} />
                            <span className="font-mono text-[11px] font-semibold text-[var(--ok)]">
                              {Math.round(link.confidence_score * 100)}% Match
                            </span>
                          </div>

                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="text-[var(--ink-soft)]">Source Record ID:</span>
                            <span className="font-medium text-[var(--ink)]">{link.source_record_id}</span>
                          </div>

                          {/* Per-field evidence chips */}
                          {link.evidence && Object.keys(link.evidence).length > 0 && (
                            <div className="pt-2 border-t border-[var(--line)]">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink-soft)] block mb-1">
                                Evidence Breakdown:
                              </span>
                              <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                                {Object.entries(link.evidence).map(([key, val]) => (
                                  <div key={key} className="flex justify-between bg-[var(--surface)] p-1 rounded border border-[var(--line)]">
                                    <span className="text-[var(--ink-soft)]">{key}:</span>
                                    <span className="font-semibold text-[var(--ink)]">
                                      {typeof val === 'number' ? `${Math.round(val * 100)}%` : String(val)}
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

                  {/* Alternates if any */}
                  {identity.alternates && Object.keys(identity.alternates).length > 0 && (
                    <div>
                      <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--ink-soft)] block mb-2">
                        Alternate Values Tracked
                      </span>
                      <div className="space-y-2">
                        {Object.entries(identity.alternates).map(([field, alts]) => (
                          <div key={field} className="rounded-[6px] border border-[var(--line)] bg-[var(--surface)] p-2.5 shadow-2xs">
                            <div className="font-mono text-[10px] uppercase text-[var(--ink-soft)] mb-1">
                              {field} variants
                            </div>
                            <div className="space-y-1">
                              {alts.map((alt, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[11px]">
                                  <span className="font-serif text-[var(--ink)]">"{alt.value}"</span>
                                  <SourceBadge source={alt.source as RecordSource} />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
