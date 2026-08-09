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
import type { HistoryEvent } from "@/types/api";

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

const TONE_LABELS: Record<string, string> = {
  neutral: "badge.neutral",
  accent: "badge.highlight",
  warning: "badge.warning",
  success: "badge.success",
};

export function ActivityFeed({ items }: { items: HistoryEvent[] }) {
  const { t } = useTranslation("dashboard");
  const { t: tCommon } = useTranslation("common");
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div>
          <CardTitle className="text-base">{t("activityFeed.title")}</CardTitle>
          <CardDescription className="mt-1">
            {t("activityFeed.desc")}
          </CardDescription>
        </div>
        <Badge tone="neutral" title={tCommon("badge.neutral")}>{items.length}</Badge>
      </CardHeader>

      <div className="flex-1 space-y-3">
        {items.map((item) => {
          const Icon = ICONS[item.type];
          const eventTitle = t(`activityFeed.events.${item.type}`) || item.title;
          const eventSubtitle = t(`activityFeed.subtitles.${item.type}`) || item.subtitle;
          return (
            <div key={item.id} className="flex items-start gap-3">
              <div className="h-9 w-9 shrink-0 rounded-xl bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)]">
                {Icon && <Icon size={15} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--foreground)] truncate">
                  {eventTitle} - {item.resumeTitle}
                </div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {eventSubtitle}
                </div>
              </div>
              <div className="text-right shrink-0">
                <Badge tone={TONES[item.type] || "neutral"} title={tCommon(TONE_LABELS[TONES[item.type] || "neutral"])}>{t(`activityFeed.labels.${item.type}`)}</Badge>
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
