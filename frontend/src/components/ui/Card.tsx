import { forwardRef, type ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "bg-[var(--card)] border border-[var(--border)] shadow-card transition-all duration-300",
  {
    variants: {
      variant: {
        default: "hover:shadow-hover",
        accent:
          "bg-[var(--accent-hero)] text-white border-transparent bg-[image:linear-gradient(135deg,var(--accent-hero-2)_0%,var(--accent-hero)_55%,var(--accent-hero)_100%)]",
        flat: "",
      },
      radius: {
        md: "rounded-2xl",
        lg: "rounded-3xl",
      },
      padding: {
        none: "",
        sm: "p-4",
        md: "p-5",
        lg: "p-6",
      },
    },
    defaultVariants: { variant: "default", radius: "md", padding: "md" },
  }
);

interface CardProps extends ComponentProps<"div">, VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, radius, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, radius, padding }), className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const CardHeader = ({ className, ...props }: ComponentProps<"div">) => (
  <div className={cn("flex items-start justify-between gap-3 mb-4", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: ComponentProps<"h3">) => (
  <h3
    className={cn(
      "text-sm font-semibold text-[var(--foreground)] tracking-tight",
      className
    )}
    {...props}
  />
);

export const CardDescription = ({ className, ...props }: ComponentProps<"p">) => (
  <p className={cn("text-xs text-[var(--muted-foreground)]", className)} {...props} />
);

export const CardContent = ({ className, ...props }: ComponentProps<"div">) => (
  <div className={cn("", className)} {...props} />
);
