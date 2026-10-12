import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-md border border-[var(--border)] bg-white px-2.5 py-1 text-base transition-[color,box-shadow] duration-200 outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[var(--text-subtle)] focus-visible:border-[var(--primary)] focus-visible:ring-3 focus-visible:ring-[var(--primary-glow)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--error)] aria-invalid:ring-3 aria-invalid:ring-[rgba(185,28,28,0.18)] md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
