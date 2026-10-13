/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] text-xs sm:text-sm font-medium transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] cursor-pointer disabled:pointer-events-none disabled:opacity-50 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface)]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--teal)] text-[var(--paper)] hover:bg-[var(--teal)]/90 border border-[var(--teal)] shadow-none",
        destructive:
          "bg-[var(--vermilion)] text-[var(--paper)] hover:bg-[var(--vermilion)]/90 border border-[var(--vermilion)] shadow-none",
        outline:
          "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--paper)] shadow-none",
        secondary:
          "border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--surface)] shadow-none",
        ghost:
          "text-[var(--ink)] hover:bg-[var(--paper)] hover:text-[var(--ink)]",
        link:
          "text-[var(--teal)] underline-offset-4 hover:underline p-0 h-auto font-normal",
        clinical:
          "border border-[var(--line)] bg-[var(--surface)] text-[var(--teal)] hover:border-[var(--teal)] hover:bg-[var(--paper)] font-mono text-xs",
      },
      size: {
        default: "h-8.5 px-3 py-1.5",
        sm: "h-7 rounded-[5px] px-2.5 text-xs",
        lg: "h-10 rounded-[6px] px-4 text-sm",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
