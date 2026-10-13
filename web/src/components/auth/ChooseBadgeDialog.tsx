import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Stethoscope,
  HeartPulse,
  Pill,
  FlaskConical,
  Receipt,
  ShieldCheck,
  User as UserIcon,
  Check,
  Building2,
  Lock,
} from 'lucide-react'
import { BADGES, useAuthStore, type UserBadge } from '../../lib/auth'

interface ChooseBadgeDialogProps {
  open: boolean
  onClose: () => void
}

const ROLE_AVATAR_CONFIG: Record<
  string,
  { icon: React.ReactNode; bg: string; text: string; badgeStyle: string }
> = {
  doctor: {
    icon: <Stethoscope className="h-4 w-4" />,
    bg: 'bg-[var(--primary)]',
    text: 'text-white',
    badgeStyle: 'bg-[var(--tint-teal)] text-[var(--primary-strong)] border-[var(--primary)]/40',
  },
  nurse: {
    icon: <HeartPulse className="h-4 w-4" />,
    bg: 'bg-[var(--primary-strong)]',
    text: 'text-white',
    badgeStyle: 'bg-[var(--tint-teal)] text-[var(--primary-strong)] border-[var(--primary)]/40',
  },
  pharmacist: {
    icon: <Pill className="h-4 w-4" />,
    bg: 'bg-[var(--source-pharmacy)]',
    text: 'text-white',
    badgeStyle: 'bg-[var(--source-pharmacy)]/15 text-[var(--source-pharmacy)] border-[var(--source-pharmacy)]/40',
  },
  lab_tech: {
    icon: <FlaskConical className="h-4 w-4" />,
    bg: 'bg-[var(--source-lab)]',
    text: 'text-white',
    badgeStyle: 'bg-[var(--source-lab)]/15 text-[var(--source-lab)] border-[var(--source-lab)]/40',
  },
  billing: {
    icon: <Receipt className="h-4 w-4" />,
    bg: 'bg-[var(--source-claims)]',
    text: 'text-white',
    badgeStyle: 'bg-[var(--source-claims)]/15 text-[var(--source-claims)] border-[var(--source-claims)]/40',
  },
  admin: {
    icon: <ShieldCheck className="h-4 w-4" />,
    bg: 'bg-[var(--ink)]',
    text: 'text-white',
    badgeStyle: 'bg-[var(--ink)]/10 text-[var(--ink)] border-[var(--ink)]/30',
  },
  patient: {
    icon: <UserIcon className="h-4 w-4" />,
    bg: 'bg-[var(--ok)]',
    text: 'text-white',
    badgeStyle: 'bg-[var(--ok)]/15 text-[var(--ok)] border-[var(--ok)]/40',
  },
}

export function ChooseBadgeDialog({ open, onClose }: ChooseBadgeDialogProps) {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.currentUser)
  const login = useAuthStore((s) => s.login)
  const [switchingUser, setSwitchingUser] = useState<string | null>(null)

  if (!open) return null

  const handleSelectBadge = async (badge: UserBadge) => {
    setSwitchingUser(badge.username)
    try {
      const ok = await login(badge.username)
      if (ok) {
        toast.success(`Switched badge to ${badge.full_name}`, {
          description: `Logged in as ${badge.role} · ${badge.desk}`,
        })
        // Invalidate all TanStack Query queries so clinical views refetch under new role policy
        await queryClient.invalidateQueries()
        onClose()
      } else {
        toast.error('Authentication failed')
      }
    } finally {
      setSwitchingUser(null)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="choose-badge-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />

      {/* Modal Surface */}
      <div className="relative w-full max-w-2xl rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-md transition-all antialiased max-h-[90vh] flex flex-col">
        <div className="mb-4 flex items-start justify-between border-b border-[var(--line)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--teal)] font-medium">
                Authentication
              </span>
              <span className="text-[var(--line)]">·</span>
              <span className="flex items-center gap-1 font-mono text-[11px] text-[var(--ink-soft)]">
                <Lock className="h-3 w-3" /> Demo Password Active
              </span>
            </div>
            <h2 id="choose-badge-title" className="mt-1 font-serif text-2xl font-semibold tracking-tight text-[var(--ink)]">
              Choose your badge
            </h2>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              Select an authorized clinical or administrative identity. Data visibility and redactions adapt immediately via policy engine.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-[6px] border border-[var(--line)] px-2.5 py-1 font-mono text-xs text-[var(--ink-soft)] hover:bg-[var(--paper)] hover:text-[var(--ink)] cursor-pointer"
          >
            Esc
          </button>
        </div>

        {/* Badge Cards Grid */}
        <div className="grid gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
          {BADGES.map((badge) => {
            const isSelected = currentUser?.username === badge.username
            const isSwitching = switchingUser === badge.username

            return (
              <button
                key={badge.username}
                data-testid={`badge-${badge.username}`}
                aria-label={`Select badge for ${badge.full_name} (${badge.role})`}
                onClick={() => handleSelectBadge(badge)}
                disabled={isSwitching}
                className={`group relative flex flex-col items-start rounded-[8px] border p-3.5 text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[var(--teal)] bg-[var(--paper)] ring-1 ring-[var(--teal)]'
                    : 'border-[var(--line)] bg-[var(--surface)] hover:border-[var(--teal)]/60 hover:bg-[var(--paper)]'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-[8px] font-medium shadow-xs ${
                        ROLE_AVATAR_CONFIG[badge.role]?.bg ?? 'bg-[var(--primary)]'
                      } ${ROLE_AVATAR_CONFIG[badge.role]?.text ?? 'text-white'}`}
                    >
                      {ROLE_AVATAR_CONFIG[badge.role]?.icon}
                    </div>
                    <div>
                      <div className="font-serif text-sm font-semibold tracking-tight text-[var(--ink)]">
                        {badge.full_name}
                      </div>
                      <div className="font-mono text-[11px] text-[var(--ink-soft)]">
                        {badge.username}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`rounded-[4px] border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                      ROLE_AVATAR_CONFIG[badge.role]?.badgeStyle ?? 'border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]'
                    }`}
                  >
                    {badge.role}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[var(--ink-soft)]">
                  <Building2 className="h-3 w-3 shrink-0 text-[var(--ink-soft)]" />
                  <span className="truncate">{badge.desk}</span>
                </div>

                <p className="mt-1 line-clamp-2 text-[11px] text-[var(--ink-soft)]">
                  {badge.description}
                </p>

                {isSelected && (
                  <div className="mt-2 flex items-center gap-1 font-mono text-[10px] font-medium text-[var(--teal)]">
                    <Check className="h-3 w-3" />
                    <span>Active Session</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-[var(--line)] pt-3 text-[11px] text-[var(--ink-soft)]">
          <span>Password for all: <code className="font-mono text-[var(--ink)] bg-[var(--paper)] px-1.5 py-0.5 rounded border border-[var(--line)]">carelens-demo</code></span>
          <span className="font-mono">7 badges available</span>
        </div>
      </div>
    </div>
  )
}
