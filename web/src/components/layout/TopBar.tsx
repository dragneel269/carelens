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
} from 'lucide-react'
import { useAuthStore } from '../../lib/auth'

interface TopBarProps {
  isDark: boolean
  onToggleTheme: () => void
  onOpenCommand: () => void
  onOpenBadgeDialog: () => void
  onToggleDrawer: () => void
  isDrawerOpen: boolean
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  doctor: 'text-[var(--teal)] border-[#0E5E63]/30 bg-[#0E5E63]/10',
  nurse: 'text-[var(--teal)] border-[#0E5E63]/30 bg-[#0E5E63]/10',
  pharmacist: 'text-[var(--source-pharmacy)] border-[#C07A1F]/30 bg-[#C07A1F]/10',
  lab_tech: 'text-[var(--source-lab)] border-[#4F7F3A]/30 bg-[#4F7F3A]/10',
  billing: 'text-[var(--source-claims)] border-[#8C5B45]/30 bg-[#8C5B45]/10',
  admin: 'text-[var(--ink)] border-[var(--ink)]/30 bg-[var(--ink)]/10',
  patient: 'text-[var(--teal)] border-[#0E5E63]/30 bg-[#0E5E63]/10',
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

  const isAudit = location.pathname.startsWith('/audit')
  const isPortal = location.pathname.startsWith('/portal')
  const isPatients = !isAudit && !isPortal && !location.pathname.startsWith('/design')

  return (
    <header className="sticky top-0 z-40 flex h-13 w-full shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-4 sm:px-6 transition-colors">
      {/* Left: Brand & Nav Links */}
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="font-serif text-xl font-semibold tracking-tight text-[var(--teal)] group-hover:opacity-90 transition-opacity">
            CareLens
          </span>
          <span className="rounded-[4px] border border-[var(--line)] bg-[var(--paper)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-soft)]">
            India MedTech
          </span>
        </Link>

        {/* Primary nav navigation */}
        <nav className="hidden md:flex items-center gap-1 text-xs">
          <Link
            to="/"
            className={`flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 font-medium transition-colors ${
              isPatients
                ? 'bg-[var(--paper)] text-[var(--teal)] border border-[var(--line)]'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Patients</span>
          </Link>

          <Link
            to="/portal"
            className={`flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 font-medium transition-colors ${
              isPortal
                ? 'bg-[var(--paper)] text-[var(--teal)] border border-[var(--line)]'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Portal</span>
          </Link>

          <Link
            to="/audit"
            className={`flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 font-medium transition-colors ${
              isAudit
                ? 'bg-[var(--paper)] text-[var(--teal)] border border-[var(--line)]'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Audit Ledger</span>
          </Link>
        </nav>
      </div>

      {/* Right: Actions, Viewing as Switcher, Palette trigger, Theme, Drawer */}
      <div className="flex items-center gap-3">
        {/* Cmd+K Palette Trigger */}
        <button
          onClick={onOpenCommand}
          className="hidden sm:flex items-center gap-2 rounded-[6px] border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1 font-sans text-xs text-[var(--ink-soft)] hover:border-[var(--teal)]/60 hover:text-[var(--ink)] transition-colors cursor-pointer"
        >
          <Command className="h-3 w-3" />
          <span>Quick Find</span>
          <kbd className="rounded border border-[var(--line)] bg-[var(--surface)] px-1 py-0.2 font-mono text-[10px]">
            ⌘K
          </kbd>
        </button>

        <div className="hidden sm:block h-4 w-px bg-[var(--line)]" />

        {/* "Viewing as" Role Switcher */}
        <button
          onClick={onOpenBadgeDialog}
          className="flex items-center gap-2 rounded-[6px] border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-xs hover:border-[var(--teal)] hover:bg-[var(--paper)] transition-all cursor-pointer group"
          title="Click to switch badge / role"
        >
          <span className="text-[var(--ink-soft)] font-medium">Viewing as:</span>
          <span className="font-serif font-medium text-[var(--ink)] truncate max-w-[120px]">
            {currentUser?.full_name?.split(' ')[0] || 'Dr. Rao'}
          </span>
          <span
            className={`rounded-[3px] border px-1.5 py-0.2 font-mono text-[10px] font-medium uppercase tracking-wider ${
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
          className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)] cursor-pointer transition-colors"
        >
          {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </button>

        {/* Right Drawer Toggle */}
        <button
          onClick={onToggleDrawer}
          aria-label="Toggle inspector drawer"
          className={`flex h-7 w-7 items-center justify-center rounded-[6px] border transition-colors cursor-pointer ${
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
  )
}
