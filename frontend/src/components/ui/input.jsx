import * as React from "react"
import { cn } from "../../lib/utils"

/**
 * Input — altura fija h-10 (40px), bordes y estados consistentes
 * Usa múltiplos de 4px: px-3.5 (14px), rounded-xl (12px), gap-2 (8px)
 * Estados: focus (ring esmeralda), disabled, placeholder, file
 */
const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 ring-offset-white transition-all duration-200",
        "placeholder:text-slate-400 placeholder:font-medium",
        "focus-visible:outline-none focus-visible:border-emerald-300 focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:ring-offset-0",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
        "file:border-0 file:bg-transparent file:text-xs file:font-bold file:text-slate-700",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
