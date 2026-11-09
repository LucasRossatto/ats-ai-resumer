import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BASE_URL } from "@/api/client";
import { isApiAwake, waitForApi } from "@/api/wakeApi";

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

const goTo = (url: string) => window.location.assign(url);

type Status = "idle" | "checking" | "failed";

/**
 * "or" divider plus the Google button. The backend answers `/auth/google` with
 * a redirect to Google, which is a full-page navigation. If the API is asleep,
 * the host would show its own waking page, so the click first waits for the API
 * (staying in the app, with the button in its loading state) and navigates
 * only once it answers. Opening the screen
 * already pings it in the background, so the server is usually up by the click.
 */
export function GoogleSignIn({ navigate = goTo }: { navigate?: (url: string) => void }) {
  const { t } = useTranslation("auth");
  const [status, setStatus] = useState<Status>("idle");
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    void isApiAwake();
    return () => abort.current?.abort();
  }, []);

  async function handleClick() {
    if (status === "checking") return;
    const controller = new AbortController();
    abort.current = controller;
    setStatus("checking");
    const awake = await waitForApi(controller.signal);
    if (controller.signal.aborted) return;
    if (awake) {
      navigate(`${BASE_URL}/auth/google`);
    } else {
      setStatus("failed");
    }
  }

  const checking = status === "checking";

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]" aria-hidden="true">
        <span className="h-px flex-1 bg-[var(--border)]" />
        {t("google.divider")}
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={checking}
        aria-busy={checking}
        className="mt-6 w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] font-semibold text-[15px] flex items-center justify-center gap-3 transition-colors duration-200 hover:bg-[var(--muted)] disabled:opacity-70 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--primary)]/25"
      >
        {checking ? <Loader2 className="size-[18px] animate-spin" aria-hidden="true" /> : <GoogleLogo />}
        {t("google.continue")}
      </button>
      {status === "failed" ? (
        <p role="alert" className="mt-3 text-center text-xs text-[var(--destructive)]">
          {t("google.wakeFailed")}
        </p>
      ) : null}
    </div>
  );
}
