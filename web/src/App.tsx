import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppShell } from './components/layout/AppShell'
import { HomePage } from './pages/HomePage'
import { PatientDetailPage } from './pages/PatientDetailPage'
import { PortalPage } from './pages/PortalPage'
import { AuditPage } from './pages/AuditPage'
import DesignSystemPage from './pages/DesignSystemPage'

export default function App() {

  return (
    <BrowserRouter>
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

        {/* Design System Specimen Route */}
        <Route path="/design" element={<DesignSystemPage />} />

        {/* Fallback to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
