import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText, ChevronRight, Trash2, Layers } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { relativeTime } from "@/lib/utils";
import { useDeleteResume } from "@/hooks/useResumes";
import type { ResumeListItem } from "@/types/api";

export function ResumeRow({ resume }: { resume: ResumeListItem }) {
  const { t } = useTranslation("resumes");
  const { t: tCommon } = useTranslation("common");
  const nav = useNavigate();
  const del = useDeleteResume();

  const versionNumber = resume.latestVersionNumber || 1;

  async function remove(e: MouseEvent) {
    e.stopPropagation();
    if (!confirm(t("row.confirmDelete"))) return;
    await del.mutateAsync(resume.id);
  }

  return (
    <Card
      onClick={() => nav(`/resumes/${resume.id}`)}
      className="cursor-pointer flex items-center gap-3 sm:gap-4"
    >
      <div className="hidden sm:flex h-12 w-12 rounded-2xl bg-[var(--accent)] text-[var(--primary-strong)] flex items-center justify-center shrink-0">
        <FileText size={18} />
      </div>

      <div className="flex-1 min-w-0">
        <button
          onClick={() => nav(`/resumes/${resume.id}`)}
          className="block w-full min-h-11 text-left font-display text-base font-semibold truncate focus-visible:outline-2 focus-visible:outline-[var(--primary)] rounded-lg"
        >
          {resume.title}
        </button>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base lg:text-xs text-[var(--muted-foreground)] sm:mt-0.5">
          <span>{t("row.updated", { time: relativeTime(resume.updatedAt) })}</span>
          <Badge tone="neutral" className="gap-1 sm:hidden" title={tCommon("badge.neutral")}>
            <Layers size={11} />
            {t("row.versionCount", { count: versionNumber })}
          </Badge>
        </div>
      </div>

      <Badge tone="neutral" className="gap-1 hidden sm:inline-flex" title={tCommon("badge.neutral")}>
        <Layers size={11} />
        {t("row.versionCount", { count: versionNumber })}
      </Badge>

      <button
        onClick={remove}
        disabled={del.isPending}
        aria-label={t("row.delete")}
        className="h-11 w-11 shrink-0 rounded-full hover:bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors"
        title={t("row.delete")}
      >
        <Trash2 size={15} />
      </button>

      <ChevronRight size={16} className="hidden sm:block text-[var(--muted-foreground)]" />
    </Card>
  );
}
