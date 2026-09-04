import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 uppercase tracking-wider",
  {
    variants: {
      variant: {
        default: "border-transparent bg-emerald-600 text-white shadow-sm",
        secondary: "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100",
        destructive: "border-transparent bg-rose-500 text-white shadow-sm",
        outline: "text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700",
        success: "border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold",
        warning: "border-amber-200 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
