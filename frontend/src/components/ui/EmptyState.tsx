import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={cn("flex flex-col items-center text-center py-12", className)}>
      {Icon && (
        <div className="h-14 w-14 rounded-2xl bg-[var(--accent)] text-[var(--primary-strong)] flex items-center justify-center mb-3">
          <Icon size={22} />
        </div>
      )}
      <div className="font-display text-lg font-semibold tracking-tight">{title}</div>
      {description && (
        <p className="text-sm text-[var(--muted-foreground)] mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}
