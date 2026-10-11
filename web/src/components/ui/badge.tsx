/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-0.5 text-xs font-medium transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "border-[var(--teal)]/30 bg-[var(--teal)]/10 text-[var(--teal)]",
        secondary:
          "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]",
        destructive:
          "border-[var(--vermilion)]/30 bg-[var(--vermilion)]/10 text-[var(--vermilion)]",
        ok:
          "border-[var(--ok)]/30 bg-[var(--ok)]/10 text-[var(--ok)]",
        outline:
          "border-[var(--line)] bg-transparent text-[var(--ink-soft)]",
        ehr:
          "border-[var(--source-ehr)]/30 bg-[var(--source-ehr)]/10 text-[var(--source-ehr)]",
        lab:
          "border-[var(--source-lab)]/30 bg-[var(--source-lab)]/10 text-[var(--source-lab)]",
        pharmacy:
          "border-[var(--source-pharmacy)]/30 bg-[var(--source-pharmacy)]/10 text-[var(--source-pharmacy)]",
        claims:
          "border-[var(--source-claims)]/30 bg-[var(--source-claims)]/10 text-[var(--source-claims)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
