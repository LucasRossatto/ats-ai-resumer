import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UploadDropzone } from "./UploadDropzone";

// `failWith` bypasses the vi.fn so a rejected promise is only observed by the component's try/catch.
const h = vi.hoisted(() => ({ mutateAsync: vi.fn(), failWith: null as unknown }));
const mutateAsync = h.mutateAsync;
vi.mock("@/hooks/useResumes", () => ({
  useUploadResume: () => ({
    mutateAsync: (...a: unknown[]) =>
      h.failWith ? Promise.reject(h.failWith) : h.mutateAsync(...a),
    isPending: false,
  }),
}));

beforeEach(() => {
  mutateAsync.mockReset();
  h.failWith = null;
});

function fileInput(container: HTMLElement) {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

describe("UploadDropzone", () => {
  it("accepts a PDF, prefills the title and uploads it", async () => {
    mutateAsync.mockResolvedValue({ resume: { id: "r1" } });
    const onUploaded = vi.fn();
    const { container } = render(<UploadDropzone onUploaded={onUploaded} />);
    const pdf = new File(["%PDF-1.4"], "my-cv.pdf", { type: "application/pdf" });
    await userEvent.upload(fileInput(container), pdf);

    expect(await screen.findByText("my-cv.pdf")).toBeInTheDocument();
    expect(screen.getByDisplayValue("my-cv")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /upload/i }));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith({ id: "r1" }));
    expect(mutateAsync).toHaveBeenCalledWith({ file: pdf, title: "my-cv" });
  });

  it("rejects a non-PDF file and shows an error", async () => {
    const { container } = render(<UploadDropzone />);
    const txt = new File(["hello"], "notes.txt", { type: "text/plain" });
    // applyAccept: false lets the file reach the dropzone validation, as a drag-and-drop would.
    const user = userEvent.setup({ applyAccept: false });
    await user.upload(fileInput(container), txt);

    expect(await screen.findByText(/file type must be/i)).toBeInTheDocument();
    expect(screen.queryByText("notes.txt")).not.toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("rejects a PDF over 5 MB", async () => {
    const { container } = render(<UploadDropzone />);
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "big.pdf", { type: "application/pdf" });
    await userEvent.upload(fileInput(container), big);
    expect(await screen.findByText(/larger than/i)).toBeInTheDocument();
  });

  it("shows the API error message when the upload fails", async () => {
    h.failWith = { message: "Parser exploded" };
    const { container } = render(<UploadDropzone />);
    await userEvent.upload(fileInput(container), new File(["x"], "a.pdf", { type: "application/pdf" }));
    await userEvent.click(await screen.findByRole("button", { name: /upload/i }));
    expect(await screen.findByText("Parser exploded")).toBeInTheDocument();
  });
});
