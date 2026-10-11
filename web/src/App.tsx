import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Database,
  Moon,
  Palette,
  RefreshCw,
  Server,
  ShieldAlert,
  Sun,
} from 'lucide-react'
import { format } from 'date-fns'
import { fetchHealth } from './api/health'
import DesignSystemPage from './pages/DesignSystemPage'
import { MatchBadge } from './components/clinical/MatchBadge'
import { Redacted } from './components/clinical/Redacted'
import { HashChip } from './components/clinical/HashChip'

function DashboardView({ isDark, setIsDark }: { isDark: boolean; setIsDark: React.Dispatch<React.SetStateAction<boolean>> }) {
  const {
    data: health,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['backend-health'],
    queryFn: fetchHealth,
    refetchInterval: 15000,
  })

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] antialiased transition-colors duration-150">
      {/* Top Banner Navigation */}
      <header className="border-b border-[var(--line)] bg-[var(--surface)] px-6 py-3.5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-2xl font-semibold tracking-tight text-[var(--teal)]">
              CareLens
            </span>
            <span className="rounded-[4px] border border-[var(--line)] bg-[var(--paper)] px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-[var(--ink-soft)]">
              v0.1.0-alpha
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--ok)] animate-pulse" />
              <span className="font-medium text-[var(--ink-soft)]">System Online</span>
            </div>

            <div className="h-3.5 w-px bg-[var(--line)]" />

            <Link
              to="/design"
              className="flex items-center gap-1.5 rounded-[4px] border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 font-mono text-[11px] text-[var(--teal)] hover:border-[var(--teal)] hover:bg-[var(--paper)] transition-colors"
            >
              <Palette className="h-3 w-3" />
              <span>Design System (/design)</span>
            </Link>

            <div className="h-3.5 w-px bg-[var(--line)]" />

            <div className="font-mono text-[12px] text-[var(--ink-soft)]">
              dr.rao <span className="text-[var(--teal)] font-medium">· Doctor</span>
            </div>

            <button
              onClick={() => setIsDark((prev) => !prev)}
              aria-label="Toggle dark mode"
              className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] hover:text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)] cursor-pointer"
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-6xl p-6 sm:p-8">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="font-serif text-2xl font-medium tracking-tight text-[var(--ink)]">
            Platform Infrastructure & Unified Health Engine
          </h1>
          <p className="text-sm text-[var(--ink-soft)]">
            A calm, paper-like medical chart. Ingesting records across EHR, lab, pharmacy, and insurer systems with zero national ID dependency.
          </p>
        </div>

        {/* Grid Section */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Backend Health Status Card (Spans 2 columns) */}
          <section
            aria-labelledby="backend-health-heading"
            className="md:col-span-2 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-5"
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
              <div className="flex items-center gap-2.5">
                <Server className="h-4 w-4 text-[var(--teal)]" />
                <h2 id="backend-health-heading" className="text-sm font-semibold tracking-wide uppercase text-[var(--ink)]">
                  Backend Service Health
                </h2>
              </div>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                aria-label="Refresh backend status"
                className="flex items-center gap-1.5 rounded-[6px] border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1 text-xs font-medium text-[var(--ink-soft)] hover:text-[var(--ink)] hover:border-[var(--teal)] transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Health Content Area with Loading, Error, Empty, and Success states */}
            <div className="pt-4">
              {isLoading && (
                <div data-testid="health-loading" className="space-y-3">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--line)]" />
                  <div className="h-10 w-full animate-pulse rounded bg-[var(--line)] opacity-60" />
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="h-12 animate-pulse rounded bg-[var(--line)] opacity-50" />
                    <div className="h-12 animate-pulse rounded bg-[var(--line)] opacity-50" />
                  </div>
                </div>
              )}

              {isError && (
                <div
                  data-testid="health-error"
                  className="rounded-[6px] border border-[var(--vermilion)] bg-[var(--paper)] p-4 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-[var(--vermilion)] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-[var(--vermilion)]">
                        Backend Connection Failed
                      </div>
                      <p className="mt-1 text-[var(--ink-soft)]">
                        {error instanceof Error ? error.message : 'Unable to reach backend at /api/health.'}
                      </p>
                      <div className="mt-2 font-mono text-[11px] text-[var(--ink-soft)]">
                        Verify FastAPI service is running on http://127.0.0.1:8000
                      </div>
                      <button
                        onClick={() => refetch()}
                        className="mt-3 rounded-[4px] border border-[var(--vermilion)] px-2.5 py-1 text-xs font-medium text-[var(--vermilion)] hover:bg-[var(--vermilion)] hover:text-white transition-colors cursor-pointer"
                      >
                        Retry Connection
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!isLoading && !isError && !health && (
                <div data-testid="health-empty" className="py-8 text-center text-xs text-[var(--ink-soft)]">
                  <Database className="mx-auto h-8 w-8 mb-2 opacity-40" />
                  <p>No telemetry received from backend service.</p>
                </div>
              )}

              {!isLoading && !isError && health && (
                <div data-testid="health-success" className="space-y-4">
                  <div className="flex items-center justify-between rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-3">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[var(--ok)]" />
                      <div>
                        <div className="text-xs font-semibold text-[var(--ink)]">
                          FastAPI Operational
                        </div>
                        <div className="font-mono text-[11px] text-[var(--ink-soft)]">
                          GET /health → 200 OK
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[4px] border border-[var(--ok)] px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--ok)] uppercase tracking-wide">
                      {health.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-3">
                      <div className="text-[11px] text-[var(--ink-soft)]">Service</div>
                      <div className="mt-1 font-mono text-xs font-medium text-[var(--ink)]">
                        {health.service}
                      </div>
                    </div>

                    <div className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-3">
                      <div className="text-[11px] text-[var(--ink-soft)]">API Version</div>
                      <div className="mt-1 font-mono text-xs font-medium text-[var(--ink)]">
                        v{health.version}
                      </div>
                    </div>

                    <div className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-3 col-span-2 sm:col-span-1">
                      <div className="text-[11px] text-[var(--ink-soft)]">Last Pulse</div>
                      <div className="mt-1 font-mono text-[11px] text-[var(--ink-soft)]">
                        {health.timestamp
                          ? format(new Date(health.timestamp), 'HH:mm:ss.SSS')
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Integration Sources Sidebar */}
          <section
            aria-labelledby="sources-heading"
            className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-5"
          >
            <div className="flex items-center gap-2 border-b border-[var(--line)] pb-4">
              <Activity className="h-4 w-4 text-[var(--teal)]" />
              <h2 id="sources-heading" className="text-sm font-semibold tracking-wide uppercase text-[var(--ink)]">
                Data Feeds
              </h2>
            </div>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--source-ehr)]" />
                  <span className="font-medium text-[var(--ink)]">EHR Hospital</span>
                </div>
                <span className="font-mono text-[11px] text-[var(--ink-soft)]">APL-004512</span>
              </div>

              <div className="flex items-center justify-between rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--source-lab)]" />
                  <span className="font-medium text-[var(--ink)]">Diagnostic Lab</span>
                </div>
                <span className="font-mono text-[11px] text-[var(--ink-soft)]">LB-77120</span>
              </div>

              <div className="flex items-center justify-between rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--source-pharmacy)]" />
                  <span className="font-medium text-[var(--ink)]">Retail Pharmacy</span>
                </div>
                <span className="font-mono text-[11px] text-[var(--ink-soft)]">PH-30991</span>
              </div>

              <div className="flex items-center justify-between rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--source-claims)]" />
                  <span className="font-medium text-[var(--ink)]">Health Insurer</span>
                </div>
                <span className="font-mono text-[11px] text-[var(--ink-soft)]">STAR-48221</span>
              </div>
            </div>
          </section>
        </div>

        {/* Spec Signature Verification Preview */}
        <section
          aria-labelledby="spec-preview-heading"
          className="mt-6 rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-5"
        >
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
            <h2 id="spec-preview-heading" className="text-sm font-semibold tracking-wide uppercase text-[var(--ink)]">
              Core Design Signatures (Docs/Design-System.md)
            </h2>
            <Link to="/design" className="font-mono text-xs text-[var(--teal)] hover:underline">
              Inspect Full Design Specimen →
            </Link>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {/* Signature 1: MatchBadge */}
            <div className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-3.5">
              <div className="text-[11px] font-medium text-[var(--ink-soft)] mb-2">
                Signature 1 · MatchBadge
              </div>
              <MatchBadge systems={['ehr', 'lab', 'pharmacy', 'claims']} confidence={96} />
            </div>

            {/* Signature 2: Redacted Field */}
            <div className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-3.5">
              <div className="text-[11px] font-medium text-[var(--ink-soft)] mb-2">
                Signature 2 · Redacted Hatching
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[var(--ink-soft)]">Claim:</span>
                <Redacted reason="Hidden for Billing - consent required" width="w-24" />
              </div>
            </div>

            {/* Signature 3: Audit Ledger Hash Chip */}
            <div className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-3.5">
              <div className="text-[11px] font-medium text-[var(--ink-soft)] mb-2">
                Signature 3 · Tamper Ledger
              </div>
              <div className="flex items-center gap-2 text-xs">
                <ShieldAlert className="h-3.5 w-3.5 text-[var(--teal)]" />
                <HashChip hash="7f9a2e01ca88b491" />
                <span className="text-[11px] text-[var(--ok)] font-medium">Chain verified</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default function App() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardView isDark={isDark} setIsDark={setIsDark} />} />
        <Route path="/design" element={<DesignSystemPage />} />
      </Routes>
    </BrowserRouter>
  )
}
