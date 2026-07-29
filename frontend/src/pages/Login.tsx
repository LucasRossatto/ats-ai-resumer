import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ArrowRight, Loader2, Mail, Lock } from "lucide-react";
import {
  AuthShell,
  AuthField,
  AuthPrimaryButton,
  AuthErrorBanner,
} from "@/components/auth/AuthShell";
import AILogo from "@/components/layout/AILogo";
import { useAuth } from "@/context/AuthContext";
import type { ApiError } from "@/types/common";

export default function Login() {
  const { t } = useTranslation("auth");
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(form);
      nav("/dashboard");
    } catch (e) {
      setErr((e as ApiError)?.message || t("login.errorFallback"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      headline={
        <>
          {t("login.headlineLine1")}
          <br />
          <em style={{ fontStyle: "italic" }}>{t("login.headlineEm")}</em>
        </>
      }
      subhead={t("login.subhead")}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mb-12">
          <AILogo size={48} />
        </div>

        <h1 className="font-display text-[34px] font-semibold tracking-tight text-[var(--foreground)] leading-[1.05]">
          {t("login.welcomeBack")}
        </h1>
        <p className="text-[var(--muted-foreground)] mt-2 text-[15px]">
          {t("login.signInSubtitle")}
        </p>

        <form onSubmit={onSubmit} className="mt-9 space-y-4">
          <AuthField
            label={t("fields.email")}
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
            placeholder={t("fields.emailPlaceholder")}
            icon={Mail}
          />

          <AuthField
            label={t("fields.password")}
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
            placeholder={t("fields.passwordPlaceholderLogin")}
            icon={Lock}
            extra={
              <button
                type="button"
                className="text-xs text-[var(--primary-strong)] font-semibold hover:underline"
              >
                {t("login.forgot")}
              </button>
            }
          />

          <AuthErrorBanner>{err}</AuthErrorBanner>

          <div className="pt-1">
            <AuthPrimaryButton type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  {t("login.signingIn")}
                </>
              ) : (
                <>
                  {t("login.signIn")} <ArrowRight size={15} />
                </>
              )}
            </AuthPrimaryButton>
          </div>
        </form>

        <div className="text-sm text-[var(--muted-foreground)] text-center mt-8">
          {t("login.noAccount")}{" "}
          <Link
            to="/register"
            className="text-[var(--primary-strong)] font-semibold hover:underline"
          >
            {t("login.createOne")}
          </Link>
        </div>
      </motion.div>
    </AuthShell>
  );
}
