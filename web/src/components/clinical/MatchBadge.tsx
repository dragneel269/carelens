import * as React from "react"
import { motion, useReducedMotion } from "motion/react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CountUp } from "./CountUp"
import { cn } from "@/lib/utils"

export type SystemSource = "ehr" | "lab" | "pharmacy" | "claims"

export interface MatchBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  systems?: SystemSource[]
  linkedSystems?: SystemSource[]
  confidence?: number // e.g. 96 or 0.96
  confidenceScore?: number
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

const sourceDotColors: Record<SystemSource, string> = {
  ehr: "bg-[var(--source-ehr)]",
  lab: "bg-[var(--source-lab)]",
  pharmacy: "bg-[var(--source-pharmacy)]",
  claims: "bg-[var(--source-claims)]",
}

const sourceLabels: Record<SystemSource, string> = {
  ehr: "EHR (Hospital Core)",
  lab: "Lab (Biochemistry)",
  pharmacy: "Pharmacy (Dispensation)",
  claims: "Claims (Insurer TPA)",
}

export function MatchBadge({
  systems,
  linkedSystems,
  confidence,
  confidenceScore,
  label,
  size = 'md',
  className,
  ...props
}: MatchBadgeProps) {
  const shouldReduceMotion = useReducedMotion()
  const activeSystems = linkedSystems ?? systems ?? ["ehr", "lab", "pharmacy", "claims"]
  const rawConfidence = confidenceScore ?? confidence ?? 96
  const percentage = rawConfidence <= 1 ? Math.round(rawConfidence * 100) : Math.round(rawConfidence)

  // Determine ring stroke color based on confidence threshold
  const ringStroke =
    percentage >= 90
      ? "stroke-[var(--ok)] text-[var(--ok)]"
      : percentage >= 70
      ? "stroke-[var(--warn)] text-[var(--warn)]"
      : "stroke-[var(--alert)] text-[var(--alert)]"

  const radius = 12
  const circumference = 2 * Math.PI * radius
  const targetOffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference

  const ringDimensions = {
    sm: { size: 24, text: "text-[8px]" },
    md: { size: 28, text: "text-[9px]" },
    lg: { size: 34, text: "text-[11px]" },
  }[size]

  const sizeClasses = {
    sm: "px-2 py-1 text-[11px] gap-2",
    md: "px-2.5 py-1.5 text-xs gap-2.5",
    lg: "px-3.5 py-2 text-sm gap-3",
  }[size]

  const badgeContent = (
    <div
      tabIndex={0}
      role="status"
      aria-label={`Match badge: ${activeSystems.length} systems linked, ${percentage}% confidence`}
      className={cn(
        "inline-flex items-center rounded-[8px] border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] shadow-xs select-none transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]",
        sizeClasses,
        className
      )}
      {...props}
    >
      {/* Large Coloured Confidence Ring with Motion */}
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: ringDimensions.size, height: ringDimensions.size }}
        aria-hidden="true"
      >
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 32 32">
          {/* Background track circle */}
          <circle
            cx="16"
            cy="16"
            r={radius}
            className="stroke-[var(--line)] fill-none"
            strokeWidth="3"
          />
          {/* Vibrant animated progress circle */}
          {shouldReduceMotion ? (
            <circle
              cx="16"
              cy="16"
              r={radius}
              className={cn("fill-none", ringStroke)}
              strokeWidth="3.2"
              strokeDasharray={circumference}
              strokeDashoffset={targetOffset}
              strokeLinecap="round"
            />
          ) : (
            <motion.circle
              cx="16"
              cy="16"
              r={radius}
              className={cn("fill-none", ringStroke)}
              strokeWidth="3.2"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: targetOffset }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              strokeLinecap="round"
            />
          )}
        </svg>
        <span
          className={cn(
            "absolute font-mono font-bold tabular-nums text-[var(--ink)]",
            ringDimensions.text
          )}
        >
          <CountUp value={percentage} suffix="%" duration={0.7} />
        </span>
      </div>

      {/* Source Dots */}
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {activeSystems.map((sys) => (
          <span
            key={sys}
            className={cn("h-2.5 w-2.5 rounded-full ring-1 ring-white/30 dark:ring-black/30", sourceDotColors[sys])}
          />
        ))}
      </div>

      {/* Badge Text */}
      <span className="font-sans font-semibold text-[var(--ink)]">
        {label ?? `${activeSystems.length} systems linked`}
      </span>
    </div>
  )

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] font-sans text-xs py-1.5 px-3 shadow-md max-w-xs"
        >
          <div className="font-medium text-[var(--teal)] mb-0.5">
            Cross-System Identity Match: {percentage}%
          </div>
          <div className="text-[11px] text-[var(--ink-soft)] leading-normal">
            Linked across {activeSystems.length} records ({activeSystems.map(s => sourceLabels[s]?.split(' ')[0]).join(', ')}) with &ge;90% multi-attribute algorithmic confidence without national IDs.
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
