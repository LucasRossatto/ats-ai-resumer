import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { badgeVariants, type BadgeVariants } from "./Badge.styles";

interface BadgeProps extends ComponentProps<"span">, BadgeVariants {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}