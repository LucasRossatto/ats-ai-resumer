import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";

/** Landing point of the Google login: the backend already set the refresh cookie. */
export default function AuthCallback() {
  const { t } = useTranslation("auth");
  const nav = useNavigate();
  const { refresh } = useAuth();
  const [params] = useSearchParams();
  const error = params.get("error");
  const invalidState = error === "invalid_state";
  const oauthFailed = error === "oauth_failed";
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (invalidState || oauthFailed) return;
    refresh()
      .then(() => nav("/dashboard", { replace: true }))
      .catch(() => setFailed(true));
  }, [invalidState, oauthFailed, refresh, nav]);

  const message = invalidState
    ? t("callback.invalidState")
    : oauthFailed
      ? t("callback.oauthFailed")
      : failed
      ? t("callback.failed")
      : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[var(--background)] text-base text-[var(--muted-foreground)] px-4 text-center">
      {message ? (
        <>
          <p role="alert">{message}</p>
          <Link to="/login" className="inline-flex min-h-11 items-center px-4 text-[var(--foreground)] underline">
            {t("callback.backToLogin")}
          </Link>
        </>
      ) : (
        <p>{t("callback.signingIn")}</p>
      )}
    </div>
  );
}
