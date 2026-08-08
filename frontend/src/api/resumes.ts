// ─────────────────────────────────────────────────────────────────────────────
// RESUMES API — wired to the real backend.
//
// Every route here is scoped to the authenticated user by the backend: the
// bearer token `client.ts` attaches is what decides which resumes come back,
// and a resume that belongs to someone else answers 404, not 403.
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from "./client";
import i18n from "@/i18n";
import type {
  Analysis,
  AnalysesResponse,
  AnalysisResponse,
  DiffMode,
  DiffResponse,
  ResumeGetResponse,
  ResumeListItem,
  ResumeUploadResponse,
  ResumeVersion,
  ResumeVersionResponse,
  ResumesListResponse,
  RewriteResponse,
} from "@/types/api";

export const resumesApi = {
  /** Backend returns a raw array; wrapped here to match `analyses()` below. */
  list: (): Promise<ResumesListResponse> =>
    apiClient
      .get<ResumeListItem[]>("/resumes")
      .then((r) => ({ resumes: r.data ?? [] })),

  get: (id: string): Promise<ResumeGetResponse> =>
    apiClient.get<ResumeGetResponse>(`/resumes/${id}`).then((r) => r.data),

  getVersion: (id: string, versionId: string): Promise<ResumeVersionResponse> =>
    apiClient
      .get<ResumeVersion>(`/resumes/${id}/versions/${versionId}`)
      .then((r) => ({ version: r.data })),

  /**
   * `Content-Type` is cleared rather than set: axios has to fill it in itself
   * so the multipart boundary of this particular body goes with it, which a
   * hardcoded "multipart/form-data" would drop.
   */
  upload: (file: File, title?: string): Promise<ResumeUploadResponse> => {
    const form = new FormData();
    form.append("file", file);
    if (title) form.append("title", title);

    return apiClient
      .post<ResumeUploadResponse>("/resumes", form, {
        headers: { "Content-Type": undefined },
      })
      .then((r) => r.data);
  },

  remove: (id: string): Promise<void> =>
    apiClient.delete(`/resumes/${id}`).then(() => undefined),

  analyze: (
    id: string,
    body: { versionId?: string; targetRole?: string } = {},
  ): Promise<AnalysisResponse> => {
    const language = i18n.language.startsWith('pt') ? 'pt-BR' : 'en';
    return apiClient
      .post<Analysis>(`/resumes/${id}/analyze`, { ...body, language })
      .then((r) => ({ analysis: r.data }));
  },

  analyses: (id: string): Promise<AnalysesResponse> =>
    apiClient
      .get<Analysis[]>(`/resumes/${id}/analyses`)
      .then((r) => ({ analyses: r.data ?? [] })),

  analysisForVersion: (
    id: string,
    versionId: string,
  ): Promise<AnalysisResponse> =>
    apiClient
      .get<Analysis>(`/resumes/${id}/versions/${versionId}/analysis`)
      .then((r) => ({ analysis: r.data })),

  /**
   * The whole analysis is applied at once: the backend takes an `analysisId`
   * and rewrites every bullet it holds, there is no per-bullet selection.
   */
  rewrite: (
    id: string,
    body: { analysisId: string },
  ): Promise<RewriteResponse> =>
    apiClient
      .post<RewriteResponse>(`/resumes/${id}/rewrite`, body)
      .then((r) => r.data),

  diff: (
    id: string,
    from: string,
    to: string,
    mode: DiffMode = "words",
  ): Promise<DiffResponse> =>
    apiClient
      .get<DiffResponse>(`/resumes/${id}/diff`, { params: { from, to, mode } })
      .then((r) => r.data),
};
