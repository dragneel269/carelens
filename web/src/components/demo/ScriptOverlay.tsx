import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  RotateCcw,
  Zap,
  Play,
  ChevronRight,
  ChevronLeft,
  FastForward,
  Minimize2,
  Maximize2,
  FileText,
  Clock,
  User,
  ExternalLink,
} from 'lucide-react'
import { useDemoStore, DEMO_STEPS_CONFIG } from '../../lib/demo'
import { useState } from 'react'

export function ScriptOverlay() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isMinimized, setIsMinimized] = useState(false)

  const {
    isOverlayOpen,
    setOverlayOpen,
    activeStepIndex,
    completedRunsCount,
    isRunningSequence,
    isResetting,
    isPrewarming,
    resetDemoData,
    prewarmHero,
    executeStep,
    runScriptThreeTimes,
  } = useDemoStore()

  if (!isOverlayOpen) {
    return (
      <button
        onClick={() => setOverlayOpen(true)}
        data-testid="open-script-overlay-btn"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-[6px] border border-[var(--teal)]/40 bg-[var(--surface)] px-3 py-1.5 font-sans text-xs font-semibold text-[var(--teal)] shadow-sm hover:bg-[var(--teal)] hover:text-white transition-colors cursor-pointer"
        title="Open Demo Script Overlay (docs/demo-script.md)"
      >
        <FileText className="h-3.5 w-3.5" />
        <span>Demo Script</span>
        {completedRunsCount > 0 && (
          <span className="font-mono text-[10px] bg-[var(--ok)]/20 text-[var(--ok)] px-1 rounded">
            {completedRunsCount}/3
          </span>
        )}
      </button>
    )
  }

  const currentStep = DEMO_STEPS_CONFIG[activeStepIndex]

  if (isMinimized) {
    return (
      <div
        data-testid="minimized-script-overlay"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-[8px] border border-[var(--line)] bg-[var(--surface)] p-2.5 shadow-md font-sans text-xs"
      >
        <div className="flex items-center gap-2">
          <span className="rounded-[4px] border border-[var(--teal)]/30 bg-[var(--teal)]/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-[var(--teal)]">
            {currentStep.time}
          </span>
          <span className="font-serif font-bold text-[var(--ink)] max-w-[200px] truncate">
            {currentStep.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 border-l border-[var(--line)] pl-2">
          <button
            onClick={() => executeStep(Math.max(0, activeStepIndex - 1), navigate, queryClient)}
            disabled={activeStepIndex === 0 || isRunningSequence}
            className="rounded-[4px] p-1 text-[var(--ink-soft)] hover:text-[var(--ink)] cursor-pointer disabled:opacity-40"
            title="Previous step"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => executeStep(activeStepIndex, navigate, queryClient)}
            disabled={isRunningSequence}
            className="rounded-[4px] bg-[var(--teal)] p-1 text-white hover:bg-[var(--teal)]/90 cursor-pointer disabled:opacity-40"
            title="Execute current step"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
          </button>
          <button
            onClick={() =>
              executeStep(
                Math.min(DEMO_STEPS_CONFIG.length - 1, activeStepIndex + 1),
                navigate,
                queryClient
              )
            }
            disabled={activeStepIndex === DEMO_STEPS_CONFIG.length - 1 || isRunningSequence}
            className="rounded-[4px] p-1 text-[var(--ink-soft)] hover:text-[var(--ink)] cursor-pointer disabled:opacity-40"
            title="Next step"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setIsMinimized(false)}
            className="rounded-[4px] p-1 text-[var(--ink-soft)] hover:text-[var(--ink)] cursor-pointer ml-1"
            title="Expand script overlay"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <aside
      data-testid="demo-script-overlay"
      aria-label="Demo Script Overlay"
      className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-lg space-y-3 font-sans antialiased text-xs"
    >
      {/* Overlay Header */}
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[var(--teal)]" />
          <span className="font-serif font-bold text-sm text-[var(--ink)]">
            Script HUD (docs/demo-script.md)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            data-testid="overlay-runs-badge"
            className="font-mono text-[10px] font-bold text-[var(--ok)] bg-[var(--ok)]/10 px-1.5 py-0.5 rounded border border-[var(--ok)]/20"
          >
            Runs: {completedRunsCount}/3
          </span>
          <button
            onClick={() => setIsMinimized(true)}
            className="rounded-[4px] p-1 text-[var(--ink-soft)] hover:text-[var(--ink)] cursor-pointer"
            title="Minimize"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setOverlayOpen(false)}
            className="rounded-[4px] px-1 text-[var(--ink-soft)] hover:text-[var(--ink)] font-mono text-xs cursor-pointer"
            title="Close overlay"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Current Step Timing & Title */}
      <div className="space-y-1.5 rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-[var(--teal)]" />
            <span className="font-mono text-[11px] font-bold text-[var(--teal)]">
              {currentStep.time}
            </span>
            <span className="text-[var(--ink-soft)]">·</span>
            <span className="font-serif font-bold text-[var(--ink)] truncate max-w-[170px]">
              {currentStep.title}
            </span>
          </div>

          <div className="flex items-center gap-1 font-mono text-[10px] text-[var(--ink-soft)]">
            <User className="h-3 w-3" />
            <span className="uppercase font-semibold">{currentStep.role}</span>
          </div>
        </div>

        {/* Script Talking Point Prompt */}
        <p className="font-serif text-[12px] italic text-[var(--ink)] leading-snug bg-[var(--surface)] p-2 rounded border border-[var(--line)]">
          &ldquo;{currentStep.scriptPrompt}&rdquo;
        </p>

        <p className="text-[11px] text-[var(--ink-soft)] leading-tight">
          {currentStep.description}
        </p>
      </div>

      {/* Stepper Controls */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex items-center gap-1">
          <button
            onClick={() => executeStep(Math.max(0, activeStepIndex - 1), navigate, queryClient)}
            disabled={activeStepIndex === 0 || isRunningSequence}
            className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--line)] bg-[var(--paper)] px-2 py-1 text-[11px] text-[var(--ink)] hover:bg-[var(--surface)] cursor-pointer disabled:opacity-40"
          >
            <ChevronLeft className="h-3 w-3" />
            <span>Prev</span>
          </button>

          <span className="font-mono text-[10px] text-[var(--ink-soft)] px-1">
            {activeStepIndex + 1}/{DEMO_STEPS_CONFIG.length}
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
            className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--line)] bg-[var(--paper)] px-2 py-1 text-[11px] text-[var(--ink)] hover:bg-[var(--surface)] cursor-pointer disabled:opacity-40"
          >
            <span>Next</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <button
          onClick={() => executeStep(activeStepIndex, navigate, queryClient)}
          disabled={isRunningSequence}
          data-testid="overlay-play-step-btn"
          className="inline-flex items-center gap-1.5 rounded-[4px] border border-[var(--teal)] bg-[var(--teal)] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[var(--teal)]/90 cursor-pointer disabled:opacity-40"
        >
          <Play className="h-3 w-3 fill-current" />
          <span>Execute</span>
        </button>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-2 border-t border-[var(--line)] pt-2.5">
        <button
          onClick={() => resetDemoData(queryClient)}
          disabled={isResetting || isRunningSequence}
          data-testid="overlay-reset-btn"
          className="inline-flex items-center justify-center gap-1 rounded-[4px] border border-[var(--alert-vermilion)]/40 bg-[var(--alert-vermilion)]/10 px-2 py-1 text-[11px] font-semibold text-[var(--alert-vermilion)] hover:bg-[var(--alert-vermilion)] hover:text-white transition-colors cursor-pointer disabled:opacity-40"
        >
          <RotateCcw className={`h-3 w-3 ${isResetting ? 'animate-spin' : ''}`} />
          <span>Reset Data</span>
        </button>

        <button
          onClick={() => prewarmHero(queryClient)}
          disabled={isPrewarming || isRunningSequence}
          data-testid="overlay-prewarm-btn"
          className="inline-flex items-center justify-center gap-1 rounded-[4px] border border-[var(--teal)] bg-[var(--teal)] px-2 py-1 text-[11px] font-semibold text-white hover:bg-[var(--teal)]/90 transition-colors cursor-pointer disabled:opacity-40"
        >
          <Zap className={`h-3 w-3 ${isPrewarming ? 'animate-pulse' : ''}`} />
          <span>Pre-Warm Hero</span>
        </button>
      </div>

      {/* 3x Automated Script Verification */}
      <div className="border-t border-[var(--line)] pt-2.5">
        <button
          onClick={() => runScriptThreeTimes(navigate, queryClient)}
          disabled={isRunningSequence}
          data-testid="overlay-run-3x-btn"
          className="w-full inline-flex items-center justify-center gap-2 rounded-[6px] border border-[var(--ok)] bg-[var(--ok)] px-3 py-1.5 font-sans text-xs font-semibold text-white hover:bg-[var(--ok)]/90 transition-colors cursor-pointer disabled:opacity-50"
        >
          <FastForward className="h-3.5 w-3.5" />
          <span>{isRunningSequence ? 'Running 3x in a row...' : 'Run Script 3x in a Row'}</span>
        </button>
      </div>

      {/* Link to Full /demo Page */}
      <div className="flex items-center justify-between text-[10px] text-[var(--ink-soft)] pt-1">
        <span>Cmd+Shift+D for /demo</span>
        <button
          onClick={() => navigate('/demo')}
          className="inline-flex items-center gap-1 hover:text-[var(--teal)] cursor-pointer"
        >
          <span>Full Dashboard</span>
          <ExternalLink className="h-2.5 w-2.5" />
        </button>
      </div>
    </aside>
  )
}
