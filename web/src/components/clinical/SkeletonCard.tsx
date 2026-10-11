import * as React from "react"
import { cn } from "@/lib/utils"

export interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number
  showHeader?: boolean
}

export function SkeletonCard({
  lines = 3,
  showHeader = true,
  className,
  ...props
}: SkeletonCardProps) {
  return (
    <div
      aria-label="Loading clinical data..."
      role="status"
      className={cn(
        "rounded-[10px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-none animate-pulse",
        className
      )}
      {...props}
    >
      {showHeader && (
        <div className="flex items-center justify-between border-b border-[var(--line)]/70 pb-3.5 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-4 w-4 rounded-[4px] bg-[var(--line)]" />
            <div className="h-4 w-32 rounded-[4px] bg-[var(--line)]" />
          </div>
          <div className="h-4 w-16 rounded-[4px] bg-[var(--line)]/60" />
        </div>
      )}

      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div
              className={cn(
                "h-3.5 rounded-[4px] bg-[var(--line)]/80",
                i === 0 ? "w-3/4" : i === 1 ? "w-5/6" : "w-1/2"
              )}
            />
            <div className="h-2.5 w-1/3 rounded-[3px] bg-[var(--line)]/50" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading content...</span>
    </div>
  )
}
