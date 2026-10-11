import * as React from "react"
import { Clock } from "lucide-react"
import { format, parseISO } from "date-fns"
import { SourceBadge, type RecordSource } from "./SourceBadge"
import { cn } from "@/lib/utils"

export interface ProvChipProps extends React.HTMLAttributes<HTMLDivElement> {
  source: RecordSource
  sourceRecordId?: string
  timestamp: string | Date
  dateFormat?: string
}

export function ProvChip({
  source,
  sourceRecordId,
  timestamp,
  dateFormat = "dd MMM yyyy, HH:mm",
  className,
  ...props
}: ProvChipProps) {
  const formattedDate = React.useMemo(() => {
    try {
      const dateObj = typeof timestamp === "string" ? parseISO(timestamp) : timestamp
      if (isNaN(dateObj.getTime())) {
        return typeof timestamp === "string" ? timestamp : "Unknown date"
      }
      return format(dateObj, dateFormat)
    } catch {
      return String(timestamp)
    }
  }, [timestamp, dateFormat])

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[4px] border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--ink)] select-none",
        className
      )}
      {...props}
    >
      <SourceBadge source={source} showDot={true} className="px-1.5 py-0 text-[10px]" />

      {sourceRecordId && (
        <span className="font-mono text-[11px] tabular-nums text-[var(--ink-soft)] font-medium">
          {sourceRecordId}
        </span>
      )}

      <span className="text-[var(--line)]">·</span>

      <span className="inline-flex items-center gap-1 font-mono text-[11px] tabular-nums text-[var(--ink-soft)]">
        <Clock className="h-3 w-3 shrink-0 opacity-70" strokeWidth={1.5} />
        {formattedDate}
      </span>
    </div>
  )
}
