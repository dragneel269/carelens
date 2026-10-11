import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-8.5 w-full rounded-[6px] border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs sm:text-sm text-[var(--ink)] shadow-none transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-[var(--ink-soft)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
