import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Loader2, User, Mail } from "lucide-react";
import {
  AuthShell,
  AuthField,
  AuthPrimaryButton,
  AuthErrorBanner,
} from "@/components/auth/AuthShell";
import PasswordStrengthInput from "@/components/auth/PasswordStrengthInput";
import AILogo from "@/components/layout/AILogo";
import { GoogleSignIn } from "@/components/auth/GoogleSignIn";
import { useAuth } from "@/context/AuthContext";
import { authErrorMessage, DEFAULT_RETRY_SECONDS, MIN_PASSWORD } from "@/lib/authErrors";
import { useCooldown } from "@/lib/useCooldown";
import type { ApiError } from "@/types/common";

export default function Register() {
  const { t } = useTranslation("auth");
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const cooldown = useCooldown();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (cooldown.left > 0) return;
    setErr("");
    if (form.password.length < MIN_PASSWORD) {
      setErr(t("errors.passwordTooShort"));
      return;
    }
    setLoading(true);
    try {
      await register(form);
      nav("/dashboard");
    } catch (e) {
      const api = e as ApiError;
      if (api?.status === 429) cooldown.start(api.retryAfter ?? DEFAULT_RETRY_SECONDS);
      else setErr(authErrorMessage(api, t, "register"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      headline={
        <>
          {t("register.headlineLine1")}
          <br />
          {t("register.headlineEm")}
        </>
      }
      subhead={t("register.subhead")}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mb-12">
          <Link to="/" aria-label={t("marquee.brand")} className="inline-block"><AILogo size={48} /></Link>
        </div>

        <h1 className="font-display text-[34px] font-semibold tracking-tight text-[var(--foreground)] leading-[1.05]">
          {t("register.getStarted")}
        </h1>
        <p className="text-[var(--muted-foreground)] mt-2 text-base">
          {t("register.freeSubtitle")}
        </p>

        <form onSubmit={onSubmit} className="mt-9 space-y-4">
          <AuthField
            label={t("fields.fullName")}
            autoComplete="name"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            placeholder={t("fields.fullNamePlaceholder")}
            icon={User}
            enterKeyHint="next"
          />

          <AuthField
            label={t("fields.email")}
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
            placeholder={t("fields.emailPlaceholder")}
            icon={Mail}
            enterKeyHint="next"
          />

          <PasswordStrengthInput
            label={t("fields.password")}
            autoComplete="new-password"
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
            placeholder={t("fields.passwordPlaceholderRegister")}
          />

          <AuthErrorBanner>
            {cooldown.left > 0 ? t("errors.tooManyRequests", { seconds: cooldown.left }) : err}
          </AuthErrorBanner>

          <div className="pt-1">
            <AuthPrimaryButton type="submit" disabled={loading || cooldown.left > 0}>
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  {t("register.creatingAccount")}
                </>
              ) : (
                <>
                  {t("register.createAccount")}
                </>
              )}
            </AuthPrimaryButton>
          </div>
        </form>

        <GoogleSignIn />

        <div className="text-sm text-[var(--muted-foreground)] text-center mt-8">
          {t("register.alreadyHaveAccount")}{" "}
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center text-[var(--primary-strong)] font-semibold hover:underline"
          >
            {t("register.signIn")}
          </Link>
        </div>

        <p className="text-xs text-[var(--muted-foreground)]/80 text-center mt-6 leading-relaxed">
          {t("register.terms")}
          <br />
          {t("register.privacy")}
        </p>
      </motion.div>
    </AuthShell>
  );
}
