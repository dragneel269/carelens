import * as React from "react"
import { Clock } from "lucide-react"
import { format, parseISO } from "date-fns"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { SourceBadge, type RecordSource } from "./SourceBadge"
import { cn } from "@/lib/utils"

export interface ProvChipProps extends React.HTMLAttributes<HTMLDivElement> {
  source: RecordSource
  sourceRecordId?: string
  timestamp: string | Date
  dateFormat?: string
  disableTooltip?: boolean
}

export function ProvChip({
  source,
  sourceRecordId,
  timestamp,
  dateFormat = "dd MMM yyyy, HH:mm",
  disableTooltip = false,
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

  const chipContent = (
    <div
      tabIndex={0}
      role="status"
      aria-label={`Provenance: ${source.toUpperCase()}, ID ${sourceRecordId || 'N/A'}, date ${formattedDate}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[4px] border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--ink)] select-none cursor-help transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 hover:border-[var(--teal)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]",
        className
      )}
      {...props}
    >
      <SourceBadge source={source} showDot={true} disableTooltip={true} className="px-1.5 py-0 text-[10px]" />

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

  if (disableTooltip) {
    return chipContent
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          {chipContent}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] font-sans text-xs py-1.5 px-3 shadow-md max-w-xs"
        >
          <div className="font-semibold text-[var(--ink)] mb-0.5">
            Provenance Lineage
          </div>
          <p className="text-[11px] text-[var(--ink-soft)] leading-relaxed">
            Record originated from <span className="font-semibold text-[var(--teal)] uppercase">{source}</span>
            {sourceRecordId ? ` under feeder ID ${sourceRecordId}` : ''} at {formattedDate}. Verified and linked by ingestion pipeline.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
