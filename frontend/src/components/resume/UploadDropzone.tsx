import { useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { UploadCloud, FileText, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useUploadResume } from "@/hooks/useResumes";
import type { Resume } from "@/types/api";
import type { ApiError } from "@/types/common";

const MAX_BYTES = 5 * 1024 * 1024;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

interface UploadDropzoneProps {
  onUploaded?: (resume: Resume) => void;
  compact?: boolean;
}

export function UploadDropzone({ onUploaded, compact = false }: UploadDropzoneProps) {
  const { t } = useTranslation("resumes");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [err, setErr] = useState("");
  const upload = useUploadResume();

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: MAX_BYTES,
    multiple: false,
    onDropAccepted: (files: File[]) => {
      setErr("");
      setFile(files[0]);
      if (!title) setTitle(files[0].name.replace(/\.pdf$/i, ""));
    },
    onDropRejected: (rejections: FileRejection[]) => {
      const reason = rejections?.[0]?.errors?.[0]?.message || "File rejected";
      setErr(reason);
    },
  });

  async function submit() {
    if (!file) return;
    setErr("");
    try {
      const data = await upload.mutateAsync({ file, title });
      setFile(null);
      setTitle("");
      onUploaded?.(data.resume);
    } catch (e) {
      setErr((e as ApiError)?.message || "Upload failed");
    }
  }

  function reset() {
    setFile(null);
    setTitle("");
    setErr("");
  }

  return (
    <div className="space-y-3">
      {!file && (
        <div
          {...getRootProps()}
          className={cn(
            "rounded-3xl border border-dashed cursor-pointer transition-all duration-200 outline-none",
            compact ? "p-6" : "p-10",
            isDragActive
              ? "border-[var(--primary)] bg-[var(--accent)]"
              : "border-[var(--border)] bg-[var(--muted)] hover:border-[var(--primary)]/40 hover:bg-[var(--accent)]/40",
            isDragReject && "border-[var(--destructive)] bg-[#F8E3E0]"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center text-center">
            <motion.div
              animate={isDragActive ? { y: -4 } : { y: 0 }}
              className={cn(
                "rounded-2xl flex items-center justify-center mb-3",
                compact ? "h-10 w-10" : "h-14 w-14",
                isDragActive
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--accent)] text-[var(--primary-strong)]"
              )}
            >
              <UploadCloud size={compact ? 18 : 22} />
            </motion.div>
            <div className={cn("font-display font-semibold tracking-tight", compact ? "text-sm" : "text-base")}>
              {isDragActive ? t("upload.dropHere") : t("upload.dropPrompt")}
            </div>
            <div className="text-xs text-[var(--muted-foreground)] mt-1">
              {t("upload.hint")}
            </div>
          </div>
        </div>
      )}

      {file && (
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-[var(--primary-strong)] shrink-0">
            <FileText size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{file.name}</div>
            <div className="text-xs text-[var(--muted-foreground)]">{formatBytes(file.size)}</div>
          </div>
          <button
            onClick={reset}
            className="h-8 w-8 rounded-full hover:bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)]"
            disabled={upload.isPending}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {file && (
        <div className="space-y-3">
          <Input
            placeholder={t("upload.titlePlaceholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button
            onClick={submit}
            variant="accent"
            size="lg"
            disabled={upload.isPending}
            className="w-full"
          >
            {upload.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {t("upload.parsing")}
              </>
            ) : (
              t("upload.submit")
            )}
          </Button>
        </div>
      )}

      {err && (
        <div className="text-xs text-[var(--destructive)] bg-[#F8E3E0] rounded-xl px-3 py-2">
          {err}
        </div>
      )}
    </div>
  );
}
