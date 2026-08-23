import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

/**
 * Sistema de botones — 3 variantes × 2 tamaños
 * Variantes: primary (default), secondary, ghost
 *           + destructive (semántica), link (casos puntuales)
 * Tamaños:  sm (h-8) y md (h-10, default) — múltiplos de 4px
 * Estados:  hover, active (scale-95), focus (ring esmeralda), disabled
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] [&_svg]:w-5 [&_svg]:h-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary — acción principal (emerald)
        primary: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20",
        default: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20",
        // Secondary — acción secundaria (borde + fondo claro)
        secondary: "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300 shadow-sm",
        outline: "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300 shadow-sm",
        // Ghost — acción terciaria / icono
        ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-none",
        // Semánticas
        destructive: "bg-rose-500 text-white hover:bg-rose-600 shadow-sm shadow-rose-500/20",
        link: "text-emerald-700 underline-offset-4 hover:underline shadow-none h-auto p-0",
      },
      size: {
        sm: "h-8 px-3 rounded-lg text-xs",
        md: "h-10 px-4 py-2",
        default: "h-10 px-4 py-2",
        lg: "h-12 px-6 text-sm rounded-2xl",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
