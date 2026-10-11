import { useState, useEffect } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Search,
  User,
  Sun,
  Moon,
  FileText,
  Shield,
  Layers,
} from 'lucide-react'
import { usePatientsSearch } from '../../api/client'
import { BADGES, useAuthStore, type UserBadge } from '../../lib/auth'
import { MatchBadge } from '../clinical/MatchBadge'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isDark: boolean
  onToggleTheme: () => void
}

export function CommandPalette({
  open,
  onOpenChange,
  isDark,
  onToggleTheme,
}: CommandPaletteProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const login = useAuthStore((s) => s.login)
  const currentUser = useAuthStore((s) => s.currentUser)

  const [query, setQuery] = useState('')
  const { data: searchHits = [] } = usePatientsSearch(query)

  // Listen for Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  if (!open) return null

  const handleSelectPatient = (clid: string) => {
    navigate(`/patient/${clid}`)
    onOpenChange(false)
  }

  const handleSelectBadge = async (badge: UserBadge) => {
    const ok = await login(badge.username)
    if (ok) {
      toast.success(`Switched role to ${badge.full_name}`, {
        description: `Logged in as ${badge.role} · ${badge.desk}`,
      })
      await queryClient.invalidateQueries()
      onOpenChange(false)
    }
  }

  const handleSelectNav = (path: string) => {
    navigate(path)
    onOpenChange(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      {/* Command Palette Surface */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-[10px] border border-[var(--line)] bg-[var(--surface)] shadow-lg antialiased">
        <Command label="Global Command Palette" className="w-full">
          {/* Search Input */}
          <div className="flex items-center border-b border-[var(--line)] px-3.5 py-3">
            <Search className="mr-2.5 h-4 w-4 shrink-0 text-[var(--ink-soft)]" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search patients, switch roles, or navigate..."
              className="w-full bg-transparent font-sans text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)] focus:outline-none"
              autoFocus
            />
            <span className="rounded-[4px] border border-[var(--line)] bg-[var(--paper)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--ink-soft)]">
              ESC
            </span>
          </div>

          {/* List of items */}
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-xs text-[var(--ink-soft)]">
              No matching patients or commands found.
            </Command.Empty>

            {/* Patients section */}
            {searchHits.length > 0 && (
              <Command.Group
                heading="Patients"
                className="px-2 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-medium"
              >
                {searchHits.map((patient) => (
                  <Command.Item
                    key={patient.clid}
                    onSelect={() => handleSelectPatient(patient.clid)}
                    className="flex cursor-pointer items-center justify-between rounded-[6px] px-2.5 py-2 text-xs text-[var(--ink)] hover:bg-[var(--paper)] aria-selected:bg-[var(--paper)] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-[4px] border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] font-mono text-[10px]">
                        {patient.gender?.charAt(0).toUpperCase() || 'P'}
                      </div>
                      <div>
                        <div className="font-serif font-medium text-[var(--ink)]">
                          {patient.name}
                        </div>
                        <div className="font-mono text-[11px] text-[var(--ink-soft)]">
                          {patient.clid}
                        </div>
                      </div>
                    </div>

                    <MatchBadge
                      linkedSystems={patient.linked_systems}
                      confidenceScore={patient.best_score}
                      size="sm"
                    />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Switch Role Section */}
            <Command.Group
              heading="Switch Role (Viewing as)"
              className="px-2 py-1.5 mt-2 font-mono text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-medium"
            >
              {BADGES.map((badge) => {
                const isSelected = currentUser?.username === badge.username
                return (
                  <Command.Item
                    key={badge.username}
                    onSelect={() => handleSelectBadge(badge)}
                    className="flex cursor-pointer items-center justify-between rounded-[6px] px-2.5 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--paper)] aria-selected:bg-[var(--paper)] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-[var(--ink-soft)]" />
                      <span>{badge.full_name}</span>
                      <span className="font-mono text-[11px] text-[var(--ink-soft)]">
                        ({badge.role})
                      </span>
                    </div>
                    {isSelected && (
                      <span className="font-mono text-[10px] text-[var(--teal)] font-medium">
                        Active
                      </span>
                    )}
                  </Command.Item>
                )
              })}
            </Command.Group>

            {/* Navigation Section */}
            <Command.Group
              heading="Navigation"
              className="px-2 py-1.5 mt-2 font-mono text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-medium"
            >
              <Command.Item
                onSelect={() => handleSelectNav('/')}
                className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--paper)] aria-selected:bg-[var(--paper)] transition-colors"
              >
                <Layers className="h-3.5 w-3.5 text-[var(--ink-soft)]" />
                <span>Patient Chart & Records (/)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelectNav('/portal')}
                className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--paper)] aria-selected:bg-[var(--paper)] transition-colors"
              >
                <FileText className="h-3.5 w-3.5 text-[var(--ink-soft)]" />
                <span>Patient Portal & Consents (/portal)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelectNav('/audit')}
                className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--paper)] aria-selected:bg-[var(--paper)] transition-colors"
              >
                <Shield className="h-3.5 w-3.5 text-[var(--ink-soft)]" />
                <span>Audit Ledger (/audit)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => handleSelectNav('/design')}
                className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--paper)] aria-selected:bg-[var(--paper)] transition-colors"
              >
                <Layers className="h-3.5 w-3.5 text-[var(--ink-soft)]" />
                <span>Design System Specimen (/design)</span>
              </Command.Item>
            </Command.Group>

            {/* System Actions */}
            <Command.Group
              heading="System"
              className="px-2 py-1.5 mt-2 font-mono text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-medium"
            >
              <Command.Item
                onSelect={() => {
                  onToggleTheme()
                  onOpenChange(false)
                }}
                className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-xs text-[var(--ink)] hover:bg-[var(--paper)] aria-selected:bg-[var(--paper)] transition-colors"
              >
                {isDark ? (
                  <Sun className="h-3.5 w-3.5 text-[var(--ink-soft)]" />
                ) : (
                  <Moon className="h-3.5 w-3.5 text-[var(--ink-soft)]" />
                )}
                <span>Toggle Theme ({isDark ? 'Switch to Light' : 'Switch to Dark'})</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
