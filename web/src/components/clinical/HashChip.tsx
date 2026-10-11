import * as React from "react"
import { Check, Copy } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export interface HashChipProps extends React.HTMLAttributes<HTMLButtonElement> {
  hash: string
  length?: number
  copyable?: boolean
}

export function HashChip({
  hash,
  length = 8,
  copyable = true,
  className,
  ...props
}: HashChipProps) {
  const [copied, setCopied] = React.useState(false)
  const displayHash = hash ? hash.slice(0, length) : "--------"

  const handleCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (!copyable || !hash) return
    navigator.clipboard.writeText(hash).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "group inline-flex items-center gap-1 rounded-[4px] border border-[var(--line)] bg-[var(--paper)] px-1.5 py-0.5 font-mono text-[11px] font-medium tabular-nums text-[var(--ink-soft)] transition-colors hover:border-[var(--teal)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)] cursor-pointer select-none",
              className
            )}
            aria-label={`Audit hash: ${hash}. Click to copy.`}
            {...props}
          >
            <span>{displayHash}</span>
            {copyable && (
              <span className="shrink-0 text-[var(--ink-soft)] opacity-60 group-hover:opacity-100">
                {copied ? (
                  <Check className="h-3 w-3 text-[var(--ok)]" strokeWidth={1.75} />
                ) : (
                  <Copy className="h-2.5 w-2.5" strokeWidth={1.5} />
                )}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] font-mono text-[11px] py-1 px-2.5 shadow-md"
        >
          {copied ? (
            <span className="text-[var(--ok)] font-medium">Copied to clipboard</span>
          ) : (
            <span>
              SHA-256: <strong className="text-[var(--teal)]">{hash}</strong>
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
