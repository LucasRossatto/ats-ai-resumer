import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface IconButtonProps extends ComponentProps<"button"> {
  dot?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, dot, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "relative inline-flex items-center justify-center h-11 w-11 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] shadow-card transition-all hover:shadow-hover hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30",
        className
      )}
      {...props}
    >
      {props.children}
      {dot && (
        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--destructive)] ring-2 ring-[var(--card)]" />
      )}
    </button>
  )
);
IconButton.displayName = "IconButton";
