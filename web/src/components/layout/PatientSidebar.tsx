import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Search, UserX, AlertCircle } from 'lucide-react'
import { usePatientsSearch, isRestricted } from '../../api/client'
import { MatchBadge } from '../clinical/MatchBadge'
import { SkeletonCard } from '../clinical/SkeletonCard'
import { EmptyState } from '../clinical/EmptyState'

interface PatientSidebarProps {
  onSelectPatient?: (clid: string) => void
}

export function PatientSidebar({ onSelectPatient }: PatientSidebarProps) {
  const navigate = useNavigate()
  const { id: activeClid } = useParams<{ id: string }>()
  const [searchTerm, setSearchTerm] = useState('')

  const {
    data: patients = [],
    isLoading,
    isError,
    error,
    refetch,
  } = usePatientsSearch(searchTerm)

  const handlePatientClick = (clid: string) => {
    if (onSelectPatient) {
      onSelectPatient(clid)
    }
    navigate(`/patient/${clid}`)
  }

  return (
    <aside
      aria-label="Patient search and directory"
      className="flex h-full w-[280px] shrink-0 flex-col border-r border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] antialiased transition-colors"
    >
      {/* Search Header */}
      <div className="border-b border-[var(--line)] p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ink-soft)]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, phone, CLID..."
            aria-label="Search patients"
            className="w-full rounded-[6px] border border-[var(--line)] bg-[var(--paper)] py-1.5 pl-8 pr-3 font-sans text-xs text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:border-[var(--teal)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)] transition-colors"
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-[var(--ink-soft)]">
          <span>{patients.length} records</span>
          <span>Fuzzy matching &ge;90%</span>
        </div>
      </div>

      {/* Patient List Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {isLoading ? (
          <div className="space-y-2 p-1">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
        ) : isError ? (
          <div className="p-3 text-center">
            <EmptyState
              title="Failed to load patients"
              description={error?.message || 'Check connection or backend authorization.'}
              nextStep="Retry search query or re-authenticate user badge."
              action={{ label: 'Retry', onClick: () => refetch() }}
              icon={AlertCircle}
            />
          </div>
        ) : patients.length === 0 ? (
          <div className="p-3">
            <EmptyState
              title="No patients found"
              description={searchTerm ? `No records matched "${searchTerm}".` : 'No patient records linked yet.'}
              nextStep={searchTerm ? "Try searching by Master ID (CL-000001) or phone (90000 12345)." : "Check ingestion status."}
              icon={UserX}
            />
          </div>
        ) : (
          patients.map((patient) => {
            const isSelected = activeClid === patient.clid
            const phoneDisplay = isRestricted(patient.phone)
              ? '••••• •••••'
              : patient.phone || 'No phone'

            return (
              <button
                key={patient.clid}
                onClick={() => handlePatientClick(patient.clid)}
                className={`w-full text-left rounded-[6px] border p-2.5 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-2xs ${
                  isSelected
                    ? 'border-[var(--teal)] bg-[var(--paper)] ring-1 ring-[var(--teal)]'
                    : 'border-[var(--line)] bg-[var(--surface)] hover:border-[var(--teal)]/40 hover:bg-[var(--paper)]'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <div className="truncate">
                    <span className="font-serif text-sm font-semibold tracking-tight text-[var(--ink)] block truncate">
                      {patient.name}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--ink-soft)] block">
                      {patient.clid}
                    </span>
                  </div>

                  <span className="font-mono text-[10px] text-[var(--ink-soft)] shrink-0">
                    {patient.gender ? patient.gender.charAt(0).toUpperCase() : '—'}
                  </span>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className="font-mono text-[10px] text-[var(--ink-soft)] truncate">
                    {phoneDisplay}
                  </span>
                </div>

                {/* MatchBadge with linked systems and score */}
                <div className="mt-2 pt-1 border-t border-[var(--line)]/50">
                  <MatchBadge
                    linkedSystems={patient.linked_systems}
                    confidenceScore={patient.best_score}
                    size="sm"
                  />
                </div>
              </button>
            )
          })
        )}
      </div>
    </aside>
  )
}
