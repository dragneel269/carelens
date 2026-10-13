import * as React from "react"
import { LucideIcon, FileText, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon
  title: string
  description: string
  nextStep?: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  nextStep,
  action,
  secondaryAction,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[10px] border border-dashed border-[var(--line)] bg-[var(--surface)] p-8 text-center transition-colors antialiased",
        className
      )}
      {...props}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-[8px] border border-[var(--line)] bg-[var(--paper)] text-[var(--teal)] mb-3 shadow-2xs">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <h4 className="font-serif text-base font-semibold text-[var(--ink)] tracking-tight mb-1">
        {title}
      </h4>
      <p className="max-w-md text-xs text-[var(--ink-soft)] leading-relaxed mb-3">
        {description}
      </p>

      {/* Explicit Friendly Next Step Guidance */}
      {nextStep && (
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--primary)]/20 bg-[var(--tint-teal)] px-3 py-1.5 text-xs font-medium text-[var(--primary-strong)]">
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          <span>{nextStep}</span>
        </div>
      )}

      {(action || secondaryAction) && (
        <div className="flex items-center gap-2">
          {action && (
            <Button
              size="sm"
              variant="default"
              onClick={action.onClick}
              className="bg-[var(--primary)] text-white hover:bg-[var(--primary-strong)] font-sans text-xs px-3 py-1.5 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 shadow-xs cursor-pointer"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              size="sm"
              variant="outline"
              onClick={secondaryAction.onClick}
              className="border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] hover:bg-[var(--surface)] transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
