import { useState, useEffect, type ReactNode } from 'react'
import { TopBar } from './TopBar'
import { PatientSidebar } from './PatientSidebar'
import { RightDrawer } from './RightDrawer'
import { CommandPalette } from '../command/CommandPalette'
import { ChooseBadgeDialog } from '../auth/ChooseBadgeDialog'
import { useAuthStore } from '../../lib/auth'

interface AppShellProps {
  children: ReactNode
  showSidebar?: boolean
}

export function AppShell({ children, showSidebar = true }: AppShellProps) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('carelens_theme')
      if (stored) return stored === 'dark'
      if (typeof window.matchMedia === 'function') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
      }
    }
    return false
  })

  const token = useAuthStore((s) => s.token)
  const [isCommandOpen, setIsCommandOpen] = useState(false)
  const [isBadgeDialogOpen, setIsBadgeDialogOpen] = useState(!token)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Sync dark class on document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('carelens_theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('carelens_theme', 'light')
    }
  }, [isDark])

  const toggleTheme = () => setIsDark((prev) => !prev)

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--paper)] text-[var(--ink)] antialiased transition-colors duration-150">
      {/* Top Bar */}
      <TopBar
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenCommand={() => setIsCommandOpen(true)}
        onOpenBadgeDialog={() => setIsBadgeDialogOpen(true)}
        onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
        isDrawerOpen={isDrawerOpen}
      />

      {/* Main Workspace Layout */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Left Patient List Sidebar (280px) */}
        {showSidebar && <PatientSidebar />}

        {/* Central Content Area */}
        <main className="flex-1 overflow-y-auto bg-[var(--paper)]">
          {children}
        </main>

        {/* Right Inspector Drawer (380px) */}
        <RightDrawer
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />
      </div>

      {/* Cmd+K Palette */}
      <CommandPalette
        open={isCommandOpen}
        onOpenChange={setIsCommandOpen}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      {/* Choose your badge dialog */}
      <ChooseBadgeDialog
        open={isBadgeDialogOpen}
        onClose={() => setIsBadgeDialogOpen(false)}
      />
    </div>
  )
}
