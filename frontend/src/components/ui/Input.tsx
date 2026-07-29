import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-10 w-full rounded-full border border-[var(--border)] bg-[var(--card)] px-4 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none transition-colors focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/15 disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

interface SearchInputProps extends ComponentProps<"input"> {
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, leftIcon, rightSlot, ...props }, ref) => (
    <div
      className={cn(
        "group flex items-center gap-3 h-11 rounded-full bg-[var(--card)] border border-[var(--border)] pl-5 pr-1.5 shadow-card transition-shadow hover:shadow-hover focus-within:ring-2 focus-within:ring-[var(--primary)]/20",
        className
      )}
    >
      {leftIcon && (
        <span className="text-[var(--muted-foreground)] shrink-0">{leftIcon}</span>
      )}
      <input
        ref={ref}
        type="text"
        className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none"
        {...props}
      />
      {rightSlot}
    </div>
  )
);
SearchInput.displayName = "SearchInput";
