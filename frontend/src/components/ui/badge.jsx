import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 uppercase tracking-wider",
  {
    variants: {
      variant: {
        default: "border-transparent bg-emerald-600 text-white shadow-sm",
        secondary: "border-slate-200 bg-slate-100 text-slate-900",
        destructive: "border-transparent bg-rose-500 text-white shadow-sm",
        outline: "text-slate-800 border-slate-300",
        success: "border-emerald-200 bg-emerald-50 text-emerald-700 font-bold",
        warning: "border-amber-200 bg-amber-50 text-amber-700 font-bold",
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
