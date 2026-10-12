import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  RotateCcw,
  Zap,
  Play,
  Lock,
  ChevronRight,
  ChevronLeft,
  FastForward,
  Terminal,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react'
import { useAuthStore } from '../lib/auth'
import { useDemoStore, DEMO_STEPS_CONFIG } from '../lib/demo'

export function DemoPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.currentUser)
  const login = useAuthStore((s) => s.login)

  const {
    activeStepIndex,
    completedRunsCount,
    isRunningSequence,
    isResetting,
    isPrewarming,
    runLogs,
    isOverlayOpen,
    setOverlayOpen,
    resetDemoData,
    prewarmHero,
    executeStep,
    runScriptThreeTimes,
  } = useDemoStore()

  const currentStep = DEMO_STEPS_CONFIG[activeStepIndex]

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-10 space-y-8 antialiased font-sans">
      {/* Header Banner */}
      <header
        data-testid="demo-header"
        className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-8 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--teal)] font-semibold">
                CareLens Control Center
              </span>
              <span className="text-[var(--line)]">·</span>
              <span className="font-mono text-xs text-[var(--ink-soft)] flex items-center gap-1 font-medium">
                <Lock className="h-3.5 w-3.5" /> Admin Only (Cmd+Shift+D)
              </span>
            </div>

            <h1 className="font-serif text-3xl font-bold tracking-tight text-[var(--ink)]">
              Demo Script Automation & State Reset
            </h1>

            <p className="text-sm text-[var(--ink-soft)] max-w-2xl leading-relaxed">
              Automated runner for the 5-minute hackathon pitch following <span className="font-mono text-xs">docs/demo-script.md</span>.
              Reset state deterministically, pre-warm hero records, or auto-run the sequence three times in a row without refreshing the page.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-3 shrink-0">
            {/* Quick Role Elevation */}
            {currentUser?.role !== 'admin' && (
              <button
                onClick={() => login('admin.neha')}
                data-testid="authorize-admin-btn"
                className="rounded-[6px] border border-[var(--teal)]/40 bg-[var(--teal)]/10 px-3 py-1.5 font-sans text-xs font-semibold text-[var(--teal)] hover:bg-[var(--teal)] hover:text-white transition-colors cursor-pointer"
              >
                Authorize as IT Admin (Neha Sharma)
              </button>
            )}

            <div className="flex items-center gap-2">
              {/* Reset Demo Data Button */}
              <button
                onClick={() => resetDemoData(queryClient)}
                disabled={isResetting || isRunningSequence}
                data-testid="reset-demo-button"
                className="inline-flex items-center gap-2 rounded-[6px] border border-[var(--alert-vermilion)]/40 bg-[var(--alert-vermilion)]/10 px-3.5 py-2 font-sans text-xs font-semibold text-[var(--alert-vermilion)] hover:bg-[var(--alert-vermilion)] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
                <span>Reset Demo Data</span>
              </button>

              {/* Pre-warm Hero Record Button */}
              <button
                onClick={() => prewarmHero(queryClient)}
                disabled={isPrewarming || isRunningSequence}
                data-testid="prewarm-hero-button"
                className="inline-flex items-center gap-2 rounded-[6px] border border-[var(--teal)] bg-[var(--teal)] px-3.5 py-2 font-sans text-xs font-semibold text-white hover:bg-[var(--teal)]/90 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Zap className={`h-4 w-4 ${isPrewarming ? 'animate-pulse' : ''}`} />
                <span>Pre-Warm Hero</span>
              </button>

              {/* Script Overlay Toggle */}
              <button
                onClick={() => setOverlayOpen(!isOverlayOpen)}
                data-testid="toggle-overlay-btn"
                className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--line)] bg-[var(--paper)] px-3 py-2 font-sans text-xs font-semibold text-[var(--ink)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
              >
                <Layers className="h-4 w-4 text-[var(--teal)]" />
                <span>{isOverlayOpen ? 'Hide HUD' : 'Show HUD'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3-Runs Automated Suite Banner */}
        <div className="mt-4 rounded-[8px] border border-[var(--line)] bg-[var(--paper)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[var(--teal)]" />
              <span className="font-serif font-bold text-sm text-[var(--ink)]">
                Autonomous Script Verification (Zero Page Refresh)
              </span>
            </div>
            <p className="text-xs text-[var(--ink-soft)]">
              Executes the full 8-step script 3 times in a row, resetting the database and confirming identical hero state each time.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span
              data-testid="runs-counter"
              className="font-mono text-xs font-bold text-[var(--ok)] bg-[var(--ok)]/10 px-2.5 py-1 rounded-[4px] border border-[var(--ok)]/20"
            >
              Runs Completed: {completedRunsCount} / 3
            </span>

            <button
              onClick={() => runScriptThreeTimes(navigate, queryClient)}
              disabled={isRunningSequence}
              data-testid="run-script-3x-button"
              className="inline-flex items-center gap-2 rounded-[6px] border border-[var(--ok)] bg-[var(--ok)] px-4 py-2 font-sans text-xs font-semibold text-white shadow-xs hover:bg-[var(--ok)]/90 transition-colors cursor-pointer disabled:opacity-50"
            >
              <FastForward className="h-4 w-4" />
              <span>{isRunningSequence ? 'Running 3x in a row...' : 'Run Script 3x in a Row'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Script Stepper Showcase */}
      <section
        data-testid="demo-stepper-section"
        className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-8 space-y-6 shadow-xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-[var(--ink)]">
              Interactive Demo Script Stepper
            </h2>
            <p className="text-xs text-[var(--ink-soft)] pt-0.5">
              Step-by-step walkthrough following the 5-minute hackathon pitch flow in <span className="font-mono text-[11px]">docs/demo-script.md</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                executeStep(Math.max(0, activeStepIndex - 1), navigate, queryClient)
              }
              disabled={activeStepIndex === 0 || isRunningSequence}
              aria-label="Previous step"
              className="rounded-[4px] border border-[var(--line)] bg-[var(--paper)] p-1.5 text-[var(--ink-soft)] hover:text-[var(--ink)] cursor-pointer disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="font-mono text-xs text-[var(--ink)] font-semibold">
              Step {activeStepIndex + 1} of {DEMO_STEPS_CONFIG.length}
            </span>

            <button
              onClick={() =>
                executeStep(
                  Math.min(DEMO_STEPS_CONFIG.length - 1, activeStepIndex + 1),
                  navigate,
                  queryClient
                )
              }
              disabled={activeStepIndex === DEMO_STEPS_CONFIG.length - 1 || isRunningSequence}
              aria-label="Next step"
              className="rounded-[4px] border border-[var(--line)] bg-[var(--paper)] p-1.5 text-[var(--ink-soft)] hover:text-[var(--ink)] cursor-pointer disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Active Step Showcase Card */}
        <div
          data-testid="active-step-card"
          className="rounded-[8px] border border-[var(--line)] bg-[var(--paper)] p-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="rounded-[4px] border border-[var(--teal)]/30 bg-[var(--teal)]/10 px-2 py-0.5 font-mono text-xs font-bold text-[var(--teal)]">
                {currentStep.time}
              </span>
              <h3 className="font-serif text-lg font-bold text-[var(--ink)]">
                {currentStep.title}
              </h3>
            </div>

            <button
              onClick={() => executeStep(activeStepIndex, navigate, queryClient)}
              disabled={isRunningSequence}
              data-testid="execute-step-button"
              className="inline-flex items-center gap-2 rounded-[6px] border border-[var(--teal)] bg-[var(--teal)] px-3.5 py-1.5 font-sans text-xs font-semibold text-white hover:bg-[var(--teal)]/90 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{currentStep.actionName}</span>
            </button>
          </div>

          <div className="rounded-[6px] border border-[var(--line)] bg-[var(--surface)] p-3">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-[var(--teal)] font-semibold mb-1">
              <Sparkles className="h-3 w-3" /> Presenter Talking Point
            </div>
            <p className="font-serif text-sm italic text-[var(--ink)] leading-snug">
              &ldquo;{currentStep.scriptPrompt}&rdquo;
            </p>
          </div>

          <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
            {currentStep.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[var(--ink-soft)] pt-2 border-t border-[var(--line)]">
            <div>
              <span>Role: </span>
              <span className="font-semibold text-[var(--ink)] uppercase">
                {currentStep.role} ({currentStep.username})
              </span>
            </div>
            <span>·</span>
            <div>
              <span>Route: </span>
              <span className="font-semibold text-[var(--teal)]">{currentStep.route}</span>
            </div>
          </div>
        </div>

        {/* Step Index Grid */}
        <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-4 pt-2">
          {DEMO_STEPS_CONFIG.map((step, idx) => {
            const isSelected = activeStepIndex === idx

            return (
              <button
                key={idx}
                onClick={() => executeStep(idx, navigate, queryClient)}
                data-testid={`step-chip-${idx}`}
                className={`rounded-[6px] border p-3 text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[var(--teal)] bg-[var(--teal)]/10 ring-1 ring-[var(--teal)]'
                    : 'border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--surface)]'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-[var(--teal)] font-bold">{step.time}</span>
                  <span className="text-[var(--ink-soft)] uppercase font-semibold">
                    {step.role}
                  </span>
                </div>
                <div className="font-serif font-bold text-xs text-[var(--ink)] mt-1 truncate">
                  {step.title}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Execution Console Log */}
      <section className="rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-6 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-[var(--teal)]" />
            <h3 className="font-serif text-sm font-bold text-[var(--ink)]">
              Demo Execution Console
            </h3>
          </div>
          <span className="font-mono text-[10px] text-[var(--ink-soft)]">
            Real-Time State Logs
          </span>
        </div>

        <div className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-3 font-mono text-[11px] space-y-1 max-h-48 overflow-y-auto">
          {runLogs.length === 0 ? (
            <span className="text-[var(--ink-soft)] italic">
              Console idle. Click &quot;Reset Demo Data&quot;, &quot;Pre-Warm Hero&quot;, or &quot;Run Script 3x in a Row&quot; to begin.
            </span>
          ) : (
            runLogs.map((log, lIdx) => (
              <div key={lIdx} className="text-[var(--ink)]">
                {log}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
