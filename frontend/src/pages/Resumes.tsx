import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardTitle, CardDescription, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { UploadDropzone } from "@/components/resume/UploadDropzone";
import { ResumeRow } from "@/components/resume/ResumeRow";
import { useResumesList } from "@/hooks/useResumes";
import type { Resume } from "@/types/api";

export default function Resumes() {
  const { t } = useTranslation("resumes");
  const nav = useNavigate();
  const { data: resumes, isLoading } = useResumesList();

  function handleUploaded(resume: Resume) {
    nav(`/resumes/${resume._id}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("list.title")}
        description={t("list.desc")}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5">
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

          {!isLoading && resumes?.length === 0 && (
            <EmptyState
              icon={FileText}
              title={t("list.emptyTitle")}
              description={t("list.emptyDesc")}
            />
          )}

          {!isLoading &&
            resumes?.map((r) => <ResumeRow key={r._id} resume={r} />)}
        </div>
      </div>
    </div>
  );
}
