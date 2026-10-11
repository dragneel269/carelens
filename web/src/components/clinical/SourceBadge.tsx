import * as React from "react"
import { cn } from "@/lib/utils"

export type RecordSource = "ehr" | "lab" | "pharmacy" | "claims" | string

export interface SourceBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  source: RecordSource
  showDot?: boolean
  customLabel?: string
}

const sourceConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  ehr: {
    label: "EHR",
    bg: "bg-[var(--source-ehr)]/10",
    text: "text-[var(--source-ehr)]",
    border: "border-[var(--source-ehr)]/30",
    dot: "bg-[var(--source-ehr)]",
  },
  lab: {
    label: "Lab",
    bg: "bg-[var(--source-lab)]/10",
    text: "text-[var(--source-lab)]",
    border: "border-[var(--source-lab)]/30",
    dot: "bg-[var(--source-lab)]",
  },
  pharmacy: {
    label: "Pharmacy",
    bg: "bg-[var(--source-pharmacy)]/10",
    text: "text-[var(--source-pharmacy)]",
    border: "border-[var(--source-pharmacy)]/30",
    dot: "bg-[var(--source-pharmacy)]",
  },
  claims: {
    label: "Claims",
    bg: "bg-[var(--source-claims)]/10",
    text: "text-[var(--source-claims)]",
    border: "border-[var(--source-claims)]/30",
    dot: "bg-[var(--source-claims)]",
  },
}

export function SourceBadge({
  source,
  showDot = true,
  customLabel,
  className,
  ...props
}: SourceBadgeProps) {
  const key = source.toLowerCase()
  const cfg = sourceConfig[key] ?? {
    label: source.toUpperCase(),
    bg: "bg-[var(--paper)]",
    text: "text-[var(--ink)]",
    border: "border-[var(--line)]",
    dot: "bg-[var(--ink-soft)]",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider select-none",
        cfg.border,
        cfg.bg,
        cfg.text,
        className
      )}
      {...props}
    >
      {showDot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />}
      <span>{customLabel ?? cfg.label}</span>
    </span>
  )
}
