import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Upload,
  Sparkles,
  PenLine,
  CheckCircle2,
  FileDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { relativeTime } from "@/lib/utils";

interface ActivityFeedItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  label?: string;
  at: string;
}

const ICONS: Record<string, LucideIcon> = {
  upload: Upload,
  analyze: Sparkles,
  rewrite: PenLine,
  complete: CheckCircle2,
  export: FileDown,
};

const TONES: Record<string, "neutral" | "accent" | "warning" | "success"> = {
  upload: "neutral",
  analyze: "accent",
  rewrite: "warning",
  complete: "success",
  export: "neutral",
};

export function ActivityFeed({ items }: { items: ActivityFeedItem[] }) {
  const { t } = useTranslation("dashboard");
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div>
          <CardTitle className="text-base">{t("activityFeed.title")}</CardTitle>
          <CardDescription className="mt-1">
            {t("activityFeed.desc")}
          </CardDescription>
        </div>
        <Badge tone="neutral">{items.length}</Badge>
      </CardHeader>

      <div className="flex-1 space-y-3">
        {items.map((item) => {
          const Icon = ICONS[item.type];
          return (
            <div key={item.id} className="flex items-start gap-3">
              <div className="h-9 w-9 shrink-0 rounded-xl bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)]">
                {Icon && <Icon size={15} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--foreground)] truncate">
                  {item.title}
                </div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {item.subtitle}
                </div>
              </div>
              <div className="text-right shrink-0">
                <Badge tone={TONES[item.type] || "neutral"}>{item.label}</Badge>
                <div className="text-[10px] text-[var(--muted-foreground)] mt-1">
                  {relativeTime(item.at)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
