import * as React from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export type RecordSource = "ehr" | "lab" | "pharmacy" | "claims" | string

export interface SourceBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  source: RecordSource
  showDot?: boolean
  customLabel?: string
  disableTooltip?: boolean
}

const sourceConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string; description: string }
> = {
  ehr: {
    label: "EHR",
    bg: "bg-[var(--source-ehr)]/10",
    text: "text-[var(--source-ehr)]",
    border: "border-[var(--source-ehr)]/30",
    dot: "bg-[var(--source-ehr)]",
    description: "Electronic Health Record: Primary hospital inpatient/outpatient encounters, doctor diagnoses & care plans.",
  },
  lab: {
    label: "Lab",
    bg: "bg-[var(--source-lab)]/10",
    text: "text-[var(--source-lab)]",
    border: "border-[var(--source-lab)]/30",
    dot: "bg-[var(--source-lab)]",
    description: "Diagnostic Laboratory: Biochemistry, haematology & clinical pathology test observations with reference ranges.",
  },
  pharmacy: {
    label: "Pharmacy",
    bg: "bg-[var(--source-pharmacy)]/10",
    text: "text-[var(--source-pharmacy)]",
    border: "border-[var(--source-pharmacy)]/30",
    dot: "bg-[var(--source-pharmacy)]",
    description: "Retail & Hospital Pharmacy: Prescription dispensations, generic-brand mappings & medication reconciliation.",
  },
  claims: {
    label: "Claims",
    bg: "bg-[var(--source-claims)]/10",
    text: "text-[var(--source-claims)]",
    border: "border-[var(--source-claims)]/30",
    dot: "bg-[var(--source-claims)]",
    description: "Insurance Payer / TPA: Health insurance pre-authorizations, cashless claims & adjudication status.",
  },
}

export function SourceBadge({
  source,
  showDot = true,
  customLabel,
  disableTooltip = false,
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
    description: `Feeder system record from ${source}.`,
  }

  const badgeElement = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider select-none cursor-help transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0",
        cfg.border,
        cfg.bg,
        cfg.text,
        className
      )}
      tabIndex={0}
      role="status"
      aria-label={`Source: ${cfg.label}`}
      {...props}
    >
      {showDot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />}
      <span>{customLabel ?? cfg.label}</span>
    </span>
  )

  if (disableTooltip) {
    return badgeElement
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeElement}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] font-sans text-xs py-1.5 px-3 shadow-md max-w-xs"
        >
          <div className="font-semibold text-[var(--ink)] mb-0.5 flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
            Source System: {cfg.label}
          </div>
          <p className="text-[11px] text-[var(--ink-soft)] leading-relaxed">
            {cfg.description}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
