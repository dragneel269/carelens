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
              "group inline-flex items-center gap-1 rounded-[4px] border border-[var(--line)] bg-[var(--paper)] px-1.5 py-0.5 font-mono text-[11px] font-medium tabular-nums text-[var(--ink-soft)] transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 hover:border-[var(--teal)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)] cursor-pointer select-none",
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
          className="border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] font-sans text-xs py-1.5 px-3 shadow-md max-w-xs"
        >
          {copied ? (
            <span className="text-[var(--ok)] font-medium">Copied full hash to clipboard</span>
          ) : (
            <div>
              <div className="font-semibold text-[var(--ink)] mb-0.5">
                Cryptographic Block Hash
              </div>
              <p className="text-[11px] text-[var(--ink-soft)] font-mono break-all mb-1">
                {hash}
              </p>
              <p className="text-[10px] text-[var(--ink-soft)]">
                Immutable SHA-256 hash chaining each read/write audit event to its parent block. Click to copy.
              </p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
