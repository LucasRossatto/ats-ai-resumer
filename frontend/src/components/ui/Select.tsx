import * as React from "react";
import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectTriggerProps extends ComponentProps<"button"> {
  children?: ReactNode;
}

export const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "h-12 w-full px-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[15px] text-[var(--foreground)] outline-none transition-all duration-200 focus:border-[var(--primary)]/40 focus:ring-4 focus:ring-[var(--primary)]/10 flex items-center justify-between",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown size={16} className="text-[var(--muted-foreground)]" />
    </button>
  )
);
SelectTrigger.displayName = "SelectTrigger";

export const SelectValue = ({ placeholder }: { placeholder?: string }) => (
  <span>{placeholder}</span>
);
SelectValue.displayName = "SelectValue";

interface SelectContentProps extends ComponentProps<"div"> {
  children?: ReactNode;
}

export const SelectContent = forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "absolute top-full left-0 right-0 mt-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-lg z-50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
SelectContent.displayName = "SelectContent";

interface SelectGroupProps extends ComponentProps<"div"> {
  children?: ReactNode;
}

export const SelectGroup = forwardRef<HTMLDivElement, SelectGroupProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("py-1", className)}
      {...props}
    >
      {children}
    </div>
  )
);
SelectGroup.displayName = "SelectGroup";

export const SelectLabel = ({ children }: { children?: ReactNode }) => (
  <div className="px-4 py-2 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">
    {children}
  </div>
);
SelectLabel.displayName = "SelectLabel";

interface SelectItemProps extends ComponentProps<"button"> {
  children?: ReactNode;
  value: string | null;
}

export const SelectItem = forwardRef<HTMLButtonElement, SelectItemProps>(
  ({ className, children, value, onClick, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "w-full px-4 py-2.5 text-left text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors",
        className
      )}
      onClick={onClick}
      data-value={value}
      {...props}
    >
      {children}
    </button>
  )
);
SelectItem.displayName = "SelectItem";

interface SelectProps extends ComponentProps<"div"> {
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  children?: ReactNode;
}

export const Select = forwardRef<HTMLDivElement, SelectProps>(
  ({ className, value, defaultValue, onValueChange, children, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedValue, setSelectedValue] = React.useState(defaultValue ?? value ?? null);
    const internalRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value);
      }
    }, [value]);

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          internalRef.current &&
          !internalRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelectItem = (value: string | null) => {
      setSelectedValue(value);
      setIsOpen(false);
      onValueChange?.(value);
    };

    return (
      <div
        ref={internalRef}
        className={cn("relative w-full", className)}
        {...props}
      >
        {React.Children.map(children, (child: any) => {
          if (
            child &&
            typeof child === "object" &&
            "type" in child &&
            child.type === SelectTrigger
          ) {
            return React.cloneElement(child as React.ReactElement, {
              onClick: () => setIsOpen(!isOpen),
            } as any);
          }

          if (
            child &&
            typeof child === "object" &&
            "type" in child &&
            child.type === SelectContent
          ) {
            return isOpen
              ? React.cloneElement(child as React.ReactElement, {
                  children: React.Children.map(child.props.children, (subChild: any) => {
                    if (
                      subChild &&
                      typeof subChild === "object" &&
                      "type" in subChild
                    ) {
                      if (subChild.type === SelectGroup) {
                        return React.cloneElement(
                          subChild as React.ReactElement,
                          {},
                          React.Children.map(subChild.props.children, (item: any) => {
                            if (
                              item &&
                              typeof item === "object" &&
                              "type" in item &&
                              item.type === SelectItem
                            ) {
                              return React.cloneElement(
                                item as React.ReactElement,
                                {
                                  onClick: () =>
                                    handleSelectItem(
                                      (item.props as SelectItemProps).value
                                    ),
                                } as any
                              );
                            }
                            return item;
                          })
                        );
                      }
                    }
                    return subChild;
                  }),
                } as any)
              : null;
          }

          return child;
        })}
      </div>
    );
  }
);
Select.displayName = "Select";
