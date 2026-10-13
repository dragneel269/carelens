import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Sun,
  Moon,
  Command,
  PanelRight,
  Shield,
  FileText,
  Users,
  ChevronDown,
  ShieldCheck,
  HelpCircle,
  Compass,
  Pill,
  Clock,
} from 'lucide-react'
import { useAuthStore } from '../../lib/auth'
import { RoleCheatSheetDialog } from '../usability/RoleCheatSheetDialog'
import { ShortcutsDialog } from '../usability/ShortcutsDialog'
import { GuidedTour } from '../usability/GuidedTour'

interface TopBarProps {
  isDark: boolean
  onToggleTheme: () => void
  onOpenCommand: () => void
  onOpenBadgeDialog: () => void
  onToggleDrawer: () => void
  isDrawerOpen: boolean
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  doctor: 'text-[var(--primary)] border-[var(--primary)]/40 bg-[var(--tint-teal)] font-semibold',
  nurse: 'text-[var(--primary-strong)] border-[var(--primary)]/40 bg-[var(--tint-teal)] font-semibold',
  pharmacist: 'text-[var(--source-pharmacy)] border-[var(--source-pharmacy)]/40 bg-[var(--source-pharmacy)]/15 font-semibold',
  lab_tech: 'text-[var(--source-lab)] border-[var(--source-lab)]/40 bg-[var(--source-lab)]/15 font-semibold',
  billing: 'text-[var(--source-claims)] border-[var(--source-claims)]/40 bg-[var(--source-claims)]/15 font-semibold',
  admin: 'text-[var(--ink)] border-[var(--ink)]/30 bg-[var(--ink)]/10 font-semibold',
  patient: 'text-[var(--ok)] border-[var(--ok)]/40 bg-[var(--ok)]/15 font-semibold',
}

export function TopBar({
  isDark,
  onToggleTheme,
  onOpenCommand,
  onOpenBadgeDialog,
  onToggleDrawer,
  isDrawerOpen,
}: TopBarProps) {
  const location = useLocation()
  const currentUser = useAuthStore((s) => s.currentUser)

  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
  const [isTourForceOpen, setIsTourForceOpen] = useState(false)

  const isAudit = location.pathname.startsWith('/audit')
  const isPortal = location.pathname.startsWith('/portal')
  const isCounter = location.pathname.startsWith('/counter')
  const isFollowups = location.pathname.startsWith('/followups')
  const isPatients =
    !isAudit &&
    !isPortal &&
    !isCounter &&
    !isFollowups &&
    !location.pathname.startsWith('/design')

  // Global hotkey listener for '?' to trigger shortcuts dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea, or contentEditable
      const target = e.target as HTMLElement
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setIsShortcutsOpen((prev) => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-40 flex h-13 w-full shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-3 sm:px-6 transition-colors">
        {/* Left: Brand & Nav Links */}
        <div className="flex items-center gap-3 sm:gap-6">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <span className="font-serif text-lg sm:text-xl font-semibold tracking-tight text-[var(--teal)] group-hover:opacity-90 transition-opacity">
              CareLens
            </span>
            <span className="hidden sm:inline-block rounded-[4px] border border-[var(--line)] bg-[var(--paper)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--teal)] font-medium">
              Neighbourhood Care
            </span>
          </Link>

          {/* Primary nav navigation */}
          <nav className="flex items-center gap-1 text-xs">
            <Link
              to="/"
              className={`flex items-center gap-1 sm:gap-1.5 rounded-[6px] px-2 sm:px-2.5 py-1.5 font-medium transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 ${
                isPatients
                  ? 'bg-[var(--paper)] text-[var(--teal)] border border-[var(--line)]'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]'
              }`}
            >
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Patients</span>
            </Link>

            <Link
              to="/counter"
              className={`flex items-center gap-1 sm:gap-1.5 rounded-[6px] px-2 sm:px-2.5 py-1.5 font-medium transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 ${
                isCounter
                  ? 'bg-[var(--paper)] text-[var(--teal)] border border-[var(--line)]'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]'
              }`}
            >
              <Pill className="h-3.5 w-3.5 shrink-0 text-[var(--source-pharmacy)]" />
              <span className="hidden sm:inline">Counter</span>
            </Link>

            <Link
              to="/followups"
              className={`flex items-center gap-1 sm:gap-1.5 rounded-[6px] px-2 sm:px-2.5 py-1.5 font-medium transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 ${
                isFollowups
                  ? 'bg-[var(--paper)] text-[var(--teal)] border border-[var(--line)]'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]'
              }`}
            >
              <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--warn)]" />
              <span className="hidden sm:inline">Follow-ups</span>
            </Link>

            <Link
              to="/portal"
              className={`flex items-center gap-1 sm:gap-1.5 rounded-[6px] px-2 sm:px-2.5 py-1.5 font-medium transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 ${
                isPortal
                  ? 'bg-[var(--paper)] text-[var(--teal)] border border-[var(--line)]'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]'
              }`}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Portal</span>
            </Link>

            <Link
              to="/audit"
              className={`flex items-center gap-1 sm:gap-1.5 rounded-[6px] px-2 sm:px-2.5 py-1.5 font-medium transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 ${
                isAudit
                  ? 'bg-[var(--paper)] text-[var(--teal)] border border-[var(--line)]'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]'
              }`}
            >
              <Shield className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Audit</span>
            </Link>
          </nav>
        </div>

        {/* Right: Actions, Viewing as Switcher, Usability tools, Theme, Drawer */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Cmd+K Quick Find */}
          <button
            onClick={onOpenCommand}
            className="hidden lg:flex items-center gap-1.5 rounded-[6px] border border-[var(--line)] bg-[var(--paper)] px-2 py-1 font-sans text-xs text-[var(--ink-soft)] hover:border-[var(--teal)]/60 hover:text-[var(--ink)] transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Command className="h-3 w-3" />
            <span>Quick Find</span>
            <kbd className="rounded border border-[var(--line)] bg-[var(--surface)] px-1 py-0.2 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>

          {/* Role Cheat-sheet button */}
          <button
            onClick={() => setIsCheatSheetOpen(true)}
            className="flex items-center gap-1 rounded-[6px] border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--ink-soft)] hover:text-[var(--teal)] hover:border-[var(--teal)]/50 hover:bg-[var(--paper)] transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            title="Open Role-Based Access Control (RBAC) Cheat-Sheet"
            aria-label="Role cheat-sheet"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--primary)]" />
            <span className="hidden md:inline font-medium text-[var(--ink)]">Roles</span>
          </button>

          {/* Guided Tour button */}
          <button
            onClick={() => setIsTourForceOpen(true)}
            className="hidden sm:flex items-center gap-1 rounded-[6px] border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--ink-soft)] hover:text-[var(--teal)] hover:border-[var(--teal)]/50 hover:bg-[var(--paper)] transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            title="Start Guided Tour"
            aria-label="Guided tour"
          >
            <Compass className="h-3.5 w-3.5 text-[var(--teal)]" />
            <span className="hidden md:inline font-medium text-[var(--ink)]">Tour</span>
          </button>

          {/* Keyboard Shortcuts (?) button */}
          <button
            onClick={() => setIsShortcutsOpen(true)}
            className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)] transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts dialog"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>

          <div className="hidden sm:block h-4 w-px bg-[var(--line)]" />

          {/* "Viewing as" Role Switcher */}
          <button
            onClick={onOpenBadgeDialog}
            className="flex items-center gap-1.5 sm:gap-2 rounded-[6px] border border-[var(--line)] bg-[var(--surface)] px-2 sm:px-2.5 py-1 text-xs hover:border-[var(--teal)] hover:bg-[var(--paper)] transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer group shrink-0"
            title="Click to switch badge / role"
          >
            <span className="hidden md:inline text-[var(--ink-soft)] font-medium">Viewing as:</span>
            <span className="font-serif font-medium text-[var(--ink)] truncate max-w-[80px] sm:max-w-[120px]">
              {currentUser?.full_name?.split(' ')[0] || 'Dr. Rao'}
            </span>
            <span
              className={`rounded-[3px] border px-1 sm:px-1.5 py-0.2 font-mono text-[10px] font-medium uppercase tracking-wider ${
                currentUser?.role ? ROLE_BADGE_COLORS[currentUser.role] : ''
              }`}
            >
              {currentUser?.role || 'doctor'}
            </span>
            <ChevronDown className="h-3 w-3 text-[var(--ink-soft)] group-hover:text-[var(--ink)] transition-colors" />
          </button>

          <div className="h-4 w-px bg-[var(--line)]" />

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle color theme"
            className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)] transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>

          {/* Right Drawer Toggle */}
          <button
            onClick={onToggleDrawer}
            aria-label="Toggle inspector drawer"
            className={`flex h-7 w-7 items-center justify-center rounded-[6px] border transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ${
              isDrawerOpen
                ? 'border-[var(--teal)] bg-[var(--paper)] text-[var(--teal)]'
                : 'border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]'
            }`}
            title="Toggle 380px inspector drawer"
          >
            <PanelRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Usability Modals */}
      <RoleCheatSheetDialog
        open={isCheatSheetOpen}
        onClose={() => setIsCheatSheetOpen(false)}
      />

      <ShortcutsDialog
        open={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <GuidedTour
        forceOpen={isTourForceOpen}
        onClose={() => setIsTourForceOpen(false)}
      />
    </>
  )
}
