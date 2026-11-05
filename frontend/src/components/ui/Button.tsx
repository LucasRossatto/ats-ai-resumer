import { forwardRef, type ComponentProps } from "react";
import { buttonVariants, type ButtonVariants } from "./Button.styles";
import { cn } from "@/lib/utils";

interface ButtonProps extends ComponentProps<"button">, ButtonVariants {}

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
