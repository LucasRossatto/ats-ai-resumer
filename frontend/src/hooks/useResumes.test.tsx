import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useResume, useResumesList, useUploadResume, resumeKeys } from "./useResumes";

const api = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn(), upload: vi.fn() }));
vi.mock("@/api/resumes", () => ({ resumesApi: api }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("@/context/ui", () => ({ useToast: () => toast }));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, Wrapper };
}

beforeEach(() => vi.clearAllMocks());

describe("useResumesList", () => {
  it("unwraps the resumes array from the API payload", async () => {
    api.list.mockResolvedValue({ resumes: [{ id: "1" }, { id: "2" }] });
    const { Wrapper } = setup();
    const { result } = renderHook(() => useResumesList(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "1" }, { id: "2" }]);
  });

  it("surfaces errors", async () => {
    api.list.mockRejectedValue(new Error("boom"));
    const { Wrapper } = setup();
    const { result } = renderHook(() => useResumesList(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useResume", () => {
  it("does not fetch while the id is empty", () => {
    const { Wrapper } = setup();
    renderHook(() => useResume(""), { wrapper: Wrapper });
    expect(api.get).not.toHaveBeenCalled();
  });
});

describe("useUploadResume", () => {
  it("invalidates the list and toasts on success", async () => {
    api.upload.mockResolvedValue({ resume: { id: "9", title: "CV" } });
    const { client, Wrapper } = setup();
    const spy = vi.spyOn(client, "invalidateQueries");
    const { result } = renderHook(() => useUploadResume(), { wrapper: Wrapper });
    const file = new File(["x"], "cv.pdf", { type: "application/pdf" });
    await result.current.mutateAsync({ file, title: "CV" });

    expect(api.upload).toHaveBeenCalledWith(file, "CV");
    expect(spy).toHaveBeenCalledWith({ queryKey: resumeKeys.list() });
    expect(toast.success).toHaveBeenCalled();
  });

  it("toasts the error message on failure", async () => {
    api.upload.mockRejectedValue({ message: "too big" });
    const { Wrapper } = setup();
    const { result } = renderHook(() => useUploadResume(), { wrapper: Wrapper });
    await expect(
      result.current.mutateAsync({ file: new File(["x"], "a.pdf") })
    ).rejects.toBeTruthy();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.any(String), "too big"));
  });
});
