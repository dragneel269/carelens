import * as React from "react"
import { cn } from "@/lib/utils"

export type SystemSource = "ehr" | "lab" | "pharmacy" | "claims"

export interface MatchBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  systems?: SystemSource[]
  confidence?: number // e.g. 96 or 0.96
  label?: string
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
  systems = ["ehr", "lab", "pharmacy", "claims"],
  confidence = 96,
  label,
  className,
  ...props
}: MatchBadgeProps) {
  const percentage = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence)

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-[6px] border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--ink)] shadow-none select-none",
        className
      )}
      {...props}
    >
      {/* Source Dots */}
      <div className="flex items-center gap-1" aria-hidden="true">
        {systems.map((sys) => (
          <span
            key={sys}
            title={sourceLabels[sys]}
            className={cn("h-2 w-2 rounded-full", sourceDotColors[sys])}
          />
        ))}
      </div>

      {/* Badge Text */}
      <span className="font-sans font-medium text-[var(--ink)]">
        {label ?? `${systems.length} systems linked`}
      </span>

      <span className="text-[var(--line)]">·</span>

      {/* Confidence in Mono Tabular */}
      <span className="font-mono text-xs font-semibold tabular-nums text-[var(--teal)]">
        {percentage}%
      </span>
    </div>
  )
}
