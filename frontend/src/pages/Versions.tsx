import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Layers, FileText, PenLine, ChevronRight, Search, type LucideIcon } from "lucide-react";
import type { VersionsListItem } from "@/types/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/Input";
import { cn, relativeTime } from "@/lib/utils";
import { useAllVersions } from "@/hooks/useAnalytics";

export default function Versions() {
  const { t } = useTranslation("resumes");
  const nav = useNavigate();
  const { data, isLoading, error } = useAllVersions();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const FILTERS = [
    { key: "all", label: t("versions.filterAll") },
    { key: "upload", label: t("versions.filterUploads") },
    { key: "rewrite", label: t("versions.filterRewrites") },
  ];

  const versions = data?.versions || [];
  const totals = data?.totals || { all: 0, uploads: 0, rewrites: 0 };

  const filtered = useMemo(() => {
    let v = versions;
    if (filter === "upload") v = v.filter((x) => x.sourceType === "upload");
    if (filter === "rewrite") v = v.filter((x) => x.sourceType === "rewrite");
    if (query.trim()) {
      const q = query.toLowerCase();
      v = v.filter(
        (x) =>
          x.resumeTitle?.toLowerCase().includes(q) ||
          x.label?.toLowerCase().includes(q)
      );
    }
    return v;
  }, [versions, filter, query]);

  if (isLoading) return <VersionsSkeleton />;

  if (error) {
    return (
      <EmptyState
        icon={Layers}
        title={t("versions.loadErrorTitle")}
        description={error.message}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("versions.title")}
        description={t("versions.desc")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <TotalCard label={t("versions.totalVersions")} value={totals.all} icon={Layers} />
        <TotalCard label={t("versions.uploads")} value={totals.uploads} icon={FileText} />
        <TotalCard label={t("versions.rewrites")} value={totals.rewrites} icon={PenLine} accent />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center gap-1 bg-[var(--card)] border border-[var(--border)] p-1 rounded-full shadow-card">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "h-8 px-3.5 text-xs font-medium rounded-full transition-colors",
                filter === f.key
                  ? "bg-[var(--foreground)] text-[var(--background)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <SearchInput
          className="w-full sm:w-[320px]"
          placeholder={t("versions.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={<Search size={14} />}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={t("versions.noMatchTitle")}
          description={
            versions.length === 0
              ? t("versions.noMatchEmptyDesc")
              : t("versions.noMatchFilterDesc")
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => (
            <VersionRow
              key={v.id}
              version={v}
              onClick={() => nav(`/resumes/${v.resumeId}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VersionRow({ version, onClick }: { version: VersionsListItem; onClick: () => void }) {
  const { t } = useTranslation("resumes");
  const { t: tCommon } = useTranslation("common");
  const isUpload = version.sourceType === "upload";
  return (
    <Card onClick={onClick} className="cursor-pointer flex items-center gap-4">
      <div
        className={cn(
          "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0",
          isUpload
            ? "bg-[var(--muted)] text-[var(--muted-foreground)]"
            : "bg-[var(--accent)] text-[var(--primary-strong)]"
        )}
      >
        {isUpload ? <FileText size={18} /> : <PenLine size={18} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display text-base font-semibold tabular">
            {version.label}
          </span>
          <span className="text-[var(--muted-foreground)] text-sm truncate">
            {version.resumeTitle}
          </span>
        </div>
        <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
          {isUpload ? t("versions.uploaded") : t("versions.rewritten")} {relativeTime(version.createdAt)}
        </div>
      </div>

      {version.score != null ? (
        <div className="text-right shrink-0">
          <div className="font-display tabular text-xl font-semibold">
            {version.score}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
            {t("versions.ats")}
          </div>
        </div>
      ) : (
        <Badge tone="neutral" title={tCommon("badge.neutral")}>{t("versions.noScore")}</Badge>
      )}

      <Badge tone={isUpload ? "neutral" : "accent"} className="capitalize" title={tCommon(`badge.sourceType.${version.sourceType}`)}>
        {tCommon(`badge.sourceType.${version.sourceType}`)}
      </Badge>

      <ChevronRight size={16} className="text-[var(--muted-foreground)]" />
    </Card>
  );
}

interface TotalCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  accent?: boolean;
}

function TotalCard({ label, value, icon: Icon, accent }: TotalCardProps) {
  return (
    <Card variant={accent ? "accent" : "default"}>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "h-10 w-10 rounded-2xl flex items-center justify-center shrink-0",
            accent
              ? "bg-white/15 text-white"
              : "bg-[var(--accent)] text-[var(--primary-strong)]"
          )}
        >
          <Icon size={16} />
        </div>
        <div className="flex-1">
          <div
            className={cn(
              "text-xs",
              accent ? "text-white/70" : "text-[var(--muted-foreground)]"
            )}
          >
            {label}
          </div>
          <div className="font-display tabular text-2xl font-semibold tracking-tight">
            {value}
          </div>
        </div>
      </div>
    </Card>
  );
}

function VersionsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-1/3 rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[80px] rounded-2xl" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-[80px] rounded-2xl" />
      ))}
    </div>
  );
}
