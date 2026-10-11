import * as React from "react"
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
  ehr: "EHR",
  lab: "Lab",
  pharmacy: "Pharmacy",
  claims: "Claims",
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
  const activeSystems = linkedSystems ?? systems ?? ["ehr", "lab", "pharmacy", "claims"]
  const rawConfidence = confidenceScore ?? confidence ?? 96
  const percentage = rawConfidence <= 1 ? Math.round(rawConfidence * 100) : Math.round(rawConfidence)

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  }[size]

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-[6px] border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] shadow-none select-none",
        sizeClasses,
        className
      )}
      {...props}
    >
      {/* Source Dots */}
      <div className="flex items-center gap-1" aria-hidden="true">
        {activeSystems.map((sys) => (
          <span
            key={sys}
            title={sourceLabels[sys]}
            className={cn("h-2 w-2 rounded-full", sourceDotColors[sys])}
          />
        ))}
      </div>

      {/* Badge Text */}
      <span className="font-sans font-medium text-[var(--ink)]">
        {label ?? `${activeSystems.length} systems linked`}
      </span>

      <span className="text-[var(--line)]">·</span>

      {/* Confidence in Mono Tabular */}
      <span className="font-mono text-xs font-semibold tabular-nums text-[var(--teal)]">
        {percentage}%
      </span>
    </div>
  )
}
