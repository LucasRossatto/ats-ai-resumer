import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ChevronDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { AnalysisIssue } from "@/types/api";

const SEV_TONE: Record<string, "neutral" | "warning" | "danger"> = {
  low: "neutral",
  medium: "warning",
  high: "danger",
};

function IssueItem({ issue }: { issue: AnalysisIssue }) {
  const { t } = useTranslation("analysis");
  const { t: tCommon } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const severityTone = SEV_TONE[issue.severity] || "neutral";
  const severityToneLabel: Record<string, string> = {
    neutral: tCommon("badge.neutral"),
    warning: tCommon("badge.warning"),
    danger: tCommon("badge.alert"),
  };
  return (
    <button
      onClick={() => setOpen((v) => !v)}
      className="w-full text-left rounded-2xl bg-[var(--muted)] hover:bg-[var(--muted)]/80 border border-[var(--border)] p-4 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-xl bg-[var(--card)] flex items-center justify-center shrink-0 text-[var(--muted-foreground)]">
          <AlertCircle size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="font-medium text-sm text-[var(--foreground)]">{issue.title}</div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge tone={severityTone} title={severityToneLabel[severityTone]}>
                {tCommon(`badge.severity.${issue.severity}`)}
              </Badge>
              <ChevronDown
                size={14}
                className={cn(
                  "text-[var(--muted-foreground)] transition-transform",
                  open && "rotate-180"
                )}
              />
            </div>
          </div>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="text-xs text-[var(--muted-foreground)] mt-2">
                  {issue.explanation}
                </div>
                {issue.fix && (
                  <div className="mt-2 text-xs rounded-xl bg-[var(--accent)] text-[var(--primary-strong)] px-3 py-2">
                    <strong className="font-semibold">{t("issues.fix")}</strong> {issue.fix}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </button>
  );
}

export function IssuesList({ issues }: { issues: AnalysisIssue[] }) {
  const { t } = useTranslation("analysis");
  const { t: tCommon } = useTranslation("common");
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-base">{t("issues.title")}</CardTitle>
          <CardDescription className="mt-1">
            {t("issues.desc")}
          </CardDescription>
        </div>
        <Badge tone="neutral" title={tCommon("badge.neutral")}>{issues.length}</Badge>
      </CardHeader>
      <div className="space-y-2">
        {issues.map((issue, i) => (
          <IssueItem key={i} issue={issue} />
        ))}
      </div>
    </Card>
  );
}
