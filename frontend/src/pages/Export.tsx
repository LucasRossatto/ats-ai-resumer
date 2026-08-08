import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import { ArrowLeft, Download, FileText, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { VersionSwitcher } from "@/components/resume/VersionSwitcher";
import { ResumeDocument } from "@/components/export/ResumeDocument";
import { useResume, useFullVersion } from "@/hooks/useResumes";
import { useAuth } from "@/context/AuthContext";

export default function Export() {
  const { t } = useTranslation("resumes");
  const { id = "" } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();

  const { data, isLoading, error } = useResume(id);
  const resume = data?.resume;
  const versions = data?.versions || [];

  const [activeVersionId, setActiveVersionId] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!activeVersionId && versions.length) {
      setActiveVersionId(resume?.currentVersionId || versions[versions.length - 1].id);
    }
  }, [versions, resume, activeVersionId]);

  const fullVersion = useFullVersion(id, activeVersionId ?? "");
  const version = fullVersion.data;

  const docProps = useMemo(
    () => ({ user, version, title: resume?.title }),
    [user, version, resume?.title]
  );

  const fileName = useMemo(() => {
    const base = (resume?.title || "resume").replace(/[^a-z0-9\-_ ]/gi, "").trim().replace(/\s+/g, "_");
    return `${base}_${version?.label || "V1"}.pdf`;
  }, [resume?.title, version?.label]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/3 rounded-2xl" />
        <Skeleton className="h-[600px] rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={FileText}
        title={t("export.loadErrorTitle")}
        description={error.message}
        action={
          <Button variant="outline" onClick={() => nav("/resumes")}>
            {t("export.backToResume")}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("export.title", { title: resume?.title || t("export.fallbackTitle") })}
        description={t("export.desc")}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => nav(`/resumes/${id}`)}>
              <ArrowLeft size={14} /> {t("export.backToResume")}
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="flex-wrap">
          <div>
            <CardTitle className="text-base">{t("export.versionTitle")}</CardTitle>
            <CardDescription className="mt-1">
              {t("export.versionDesc")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <VersionSwitcher
              versions={versions}
              activeId={activeVersionId}
              onChange={setActiveVersionId}
            />
            {version && (
              <PDFDownloadLink
                document={<ResumeDocument {...docProps} />}
                fileName={fileName}
              >
                {({ loading }) => (
                  <Button variant="accent" size="md" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> {t("export.preparing")}
                      </>
                    ) : (
                      <>
                        <Download size={14} /> {t("export.downloadPdf")}
                      </>
                    )}
                  </Button>
                )}
              </PDFDownloadLink>
            )}
          </div>
        </CardHeader>

        {version?.sourceType === "rewrite" && (
          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <Badge tone="accent">{t("export.aiImproved")}</Badge>
            {t("export.aiImprovedDesc")}
          </div>
        )}
      </Card>

      {fullVersion.isLoading && (
        <Skeleton className="h-[800px] rounded-3xl" />
      )}

      {fullVersion.error && (
        <EmptyState
          icon={FileText}
          title={t("export.versionLoadErrorTitle")}
          description={fullVersion.error.message}
        />
      )}

      {version && (
        <Card padding="none" className="overflow-hidden">
          <PDFViewer
            style={{
              width: "100%",
              height: "min(85vh, 1000px)",
              border: "none",
              borderRadius: 20,
            }}
            showToolbar={false}
          >
            <ResumeDocument {...docProps} />
          </PDFViewer>
        </Card>
      )}
    </div>
  );
}
