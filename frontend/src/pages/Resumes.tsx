import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { UploadDropzone } from "@/components/resume/UploadDropzone";
import { ResumeRow } from "@/components/resume/ResumeRow";
import { useResumesList } from "@/hooks/useResumes";
import type { Resume } from "@/types/api";

export default function Resumes() {
  const { t } = useTranslation("resumes");
  const { t: tCommon } = useTranslation("common");
  const nav = useNavigate();
  const { data: resumes, isLoading, isError, refetch } = useResumesList();

  function handleUploaded(resume: Resume) {
    nav(`/resumes/${resume.id}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("list.title")}
        description={t("list.desc")}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div id="upload" className="lg:col-span-5 scroll-mt-20">
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-base">{t("list.uploadTitle")}</CardTitle>
                <CardDescription className="mt-1">
                  {t("list.uploadDesc")}
                </CardDescription>
              </div>
            </CardHeader>
            <UploadDropzone onUploaded={handleUploaded} />
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-3">
          {isLoading && (
            <>
              <Skeleton className="h-[88px] rounded-2xl" />
              <Skeleton className="h-[88px] rounded-2xl" />
              <Skeleton className="h-[88px] rounded-2xl" />
            </>
          )}

          {isError && (
            <EmptyState
              icon={AlertCircle}
              title={t("list.errorTitle")}
              description={t("list.errorDesc")}
              action={
                <Button variant="outline" className="h-11 text-base lg:h-10 lg:text-sm" onClick={() => refetch()}>
                  {tCommon("actions.retry")}
                </Button>
              }
            />
          )}

          {!isLoading && !isError && resumes?.length === 0 && (
            <EmptyState
              icon={FileText}
              title={t("list.emptyTitle")}
              description={t("list.emptyDesc")}
              action={
                <a
                  href="#upload"
                  className="lg:hidden inline-flex h-11 items-center rounded-full bg-[var(--accent-hero)] px-6 text-base font-medium text-white"
                >
                  {t("list.emptyCta")}
                </a>
              }
            />
          )}

          {!isLoading && !isError &&
            resumes?.map((r) => <ResumeRow key={r.id} resume={r} />)}
        </div>
      </div>
    </div>
  );
}
