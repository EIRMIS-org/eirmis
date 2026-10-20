import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5 rounded-full border border-transparent px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-[var(--primary-foreground)] [a]:hover:bg-[var(--primary-hover)]",
        secondary:
          "bg-[var(--secondary)] text-[var(--secondary-foreground)] [a]:hover:bg-[var(--secondary-hover)]",
        destructive:
          "bg-[var(--error-bg)] text-[var(--error)] border border-[var(--error-border)] [a]:hover:bg-[var(--error-border)]",
        outline:
          "border border-[var(--border)] text-foreground [a]:hover:bg-[var(--muted)]",
        ghost:
          "hover:bg-[var(--muted)] hover:text-muted-foreground",
        link: "text-[var(--primary)] underline-offset-4 hover:underline",
        success:
          "bg-[var(--success-bg)] text-[var(--success)] border border-[var(--success-border)]",
        warning:
          "bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning-border)]",
        error:
          "bg-[var(--error-bg)] text-[var(--error)] border border-[var(--error-border)]",
        info:
          "bg-[var(--info-bg)] text-[var(--info)] border border-[var(--info-border)]",
      },
      size: {
        default: "px-3 py-1 text-xs",
        sm: "px-2.5 py-0.5 text-[11px]",
        lg: "px-4 py-1.5 text-xs font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  size = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, size }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
      size,
    },
  })
}

export { Badge, badgeVariants }
