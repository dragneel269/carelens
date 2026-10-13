import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppShell } from './components/layout/AppShell'
import { HomePage } from './pages/HomePage'
import { PatientDetailPage } from './pages/PatientDetailPage'
import { PortalPage } from './pages/PortalPage'
import { AuditPage } from './pages/AuditPage'
import { DemoPage } from './pages/DemoPage'
import { CounterPage } from './pages/CounterPage'
import { FollowupsPage } from './pages/FollowupsPage'
import { ScriptOverlay } from './components/demo/ScriptOverlay'
import DesignSystemPage from './pages/DesignSystemPage'
import { useAuthStore } from './lib/auth'

function DemoShortcutListener() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const currentUser = useAuthStore((s) => s.currentUser)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        if (currentUser?.role !== 'admin') {
          login('admin.neha')
        }
        navigate('/demo')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigate, login, currentUser])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <DemoShortcutListener />
      <ScriptOverlay />
      {/* Toast notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          className:
            '!bg-[var(--surface)] !text-[var(--ink)] !border !border-[var(--line)] !font-sans !shadow-md',
          descriptionClassName: '!text-[var(--ink-soft)] !font-mono !text-xs',
        }}
      />

      <Routes>
        {/* Main patient chart routes */}
        <Route
          path="/"
          element={
            <AppShell>
              <HomePage />
            </AppShell>
          }
        />

        <Route
          path="/patient/:id"
          element={
            <AppShell>
              <PatientDetailPage />
            </AppShell>
          }
        />

        {/* Patient self-service portal */}
        <Route
          path="/portal"
          element={
            <AppShell showSidebar={false}>
              <PortalPage />
            </AppShell>
          }
        />

        {/* Audit ledger */}
        <Route
          path="/audit"
          element={
            <AppShell showSidebar={false}>
              <AuditPage />
            </AppShell>
          }
        />

        {/* Chemist Counter View */}
        <Route
          path="/counter"
          element={
            <AppShell showSidebar={false}>
              <CounterPage />
            </AppShell>
          }
        />

        {/* Refill Gap Alerts */}
        <Route
          path="/followups"
          element={
            <AppShell showSidebar={false}>
              <FollowupsPage />
            </AppShell>
          }
        />

        {/* Hidden Demo Command Center */}
        <Route
          path="/demo"
          element={
            <AppShell showSidebar={false}>
              <DemoPage />
            </AppShell>
          }
        />

        {/* Design System Specimen Route */}
        <Route path="/design" element={<DesignSystemPage />} />

        {/* Fallback to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
