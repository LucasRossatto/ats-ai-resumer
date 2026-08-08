import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Label = forwardRef<HTMLLabelElement, ComponentProps<"label">>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "text-sm font-medium text-[var(--foreground)]",
        className
      )}
      {...props}
    />
  )
);
Label.displayName = "Label";
