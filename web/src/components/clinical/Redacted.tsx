import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export interface RedactedProps {
  /** Text or content revealed when unredacted */
  children?: React.ReactNode
  /** Whether the field is currently redacted. Defaults to true */
  redacted?: boolean
  /** Reason shown in tooltip, e.g. "Hidden for Billing - consent required" */
  reason?: string
  /** Approximate width for the bar when redacted, e.g. "w-28" or "120px" */
  width?: string
  /** Optional class name */
  className?: string
  /** Optional animation key to replay sweep on role switch */
  animKey?: string | number
}

export function Redacted({
  children,
  redacted = true,
  reason = "Hidden for Billing - consent required",
  width,
  className,
  animKey,
}: RedactedProps) {
  if (!redacted) {
    return <span className={cn("inline-block", className)}>{children}</span>
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            role="status"
            aria-label={`Redacted data: ${reason}`}
            className={cn(
              "group relative inline-flex items-center align-middle cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)] rounded-[3px]",
              className
            )}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={animKey}
                initial={{ opacity: 0, scaleX: 0.15 }}
                animate={{ opacity: 1, scaleX: 1 }}
                exit={{ opacity: 0, scaleX: 0.15 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "redacted-bar inline-block h-[1.15em] min-w-[70px] rounded-[3px] border border-[var(--ink)]/40 bg-[var(--ink)] origin-left",
                  width ? width : "w-24"
                )}
                style={{
                  backgroundImage: `repeating-linear-gradient(-45deg, var(--line) 0, var(--line) 2px, transparent 2px, transparent 6px)`,
                  transformOrigin: "left",
                }}
              />
            </AnimatePresence>
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] font-sans text-xs py-1 px-2.5 shadow-md"
        >
          <span className="font-medium text-[var(--vermilion)] mr-1">●</span>
          {reason}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
