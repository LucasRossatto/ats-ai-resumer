import { forwardRef, type ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:opacity-50 disabled:pointer-events-none select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 active:scale-[0.98]",
        accent:
          "bg-[var(--primary)] text-white hover:bg-[var(--primary-strong)] active:scale-[0.98]",
        outline:
          "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]",
        ghost:
          "bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]",
        soft:
          "bg-[var(--accent)] text-[var(--primary-strong)] hover:bg-[var(--accent)]/80",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-full",
        md: "h-10 px-4 text-sm rounded-full",
        lg: "h-12 px-6 text-sm rounded-full",
        icon: "h-10 w-10 rounded-full",
        iconSm: "h-8 w-8 rounded-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

interface ButtonProps extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { buttonVariants };
