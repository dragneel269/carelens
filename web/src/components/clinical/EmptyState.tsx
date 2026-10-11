import * as React from "react"
import { LucideIcon, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[10px] border border-dashed border-[var(--line)] bg-[var(--surface)] p-8 text-center transition-colors",
        className
      )}
      {...props}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-soft)] mb-3">
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <h4 className="font-serif text-base font-medium text-[var(--ink)] tracking-tight mb-1">
        {title}
      </h4>
      <p className="max-w-sm text-xs text-[var(--ink-soft)] leading-relaxed mb-4">
        {description}
      </p>
      {action && (
        <Button
          size="sm"
          variant="outline"
          onClick={action.onClick}
          className="border-[var(--line)] text-xs text-[var(--ink)]"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
