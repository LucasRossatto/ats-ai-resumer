import { useState, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Sun, Moon, Check, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/UIContext";
import { authApi } from "@/api/auth";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/types/common";

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="text-xs font-medium text-[var(--muted-foreground)] mb-1.5 block">
      {children}
    </label>
  );
}

function ProfileSection() {
  const { t } = useTranslation("settings");
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);

  const dirty = name.trim() !== (user?.name || "") && name.trim().length > 0;

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!dirty) return;
    setSaving(true);
    try {
      await updateProfile({ name: name.trim() });
      toast.success(t("profile.successMsg"));
    } catch (err) {
      toast.error(t("profile.errorMsg"), (err as ApiError)?.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card padding="lg" className="max-w-2xl">
      <CardHeader>
        <div>
          <CardTitle className="text-base">{t("profile.title")}</CardTitle>
          <CardDescription className="mt-1">
            {t("profile.desc")}
          </CardDescription>
        </div>
      </CardHeader>

      <form onSubmit={onSave} className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-[var(--accent)] text-[var(--primary-strong)] font-semibold flex items-center justify-center text-lg ring-2 ring-[var(--card)] shrink-0">
            {(user?.name?.[0] || "?").toUpperCase()}
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">
            {t("profile.avatar")}
          </div>
        </div>

        <div>
          <FieldLabel>{t("profile.fullName")}</FieldLabel>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder={t("profile.fullNamePlaceholder")}
          />
        </div>

        <div>
          <FieldLabel>{t("profile.email")}</FieldLabel>
          <Input value={user?.email || ""} disabled />
          <p className="text-[11px] text-[var(--muted-foreground)] mt-1.5">
            {t("profile.emailNote")}
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={!dirty || saving}>
            {saving ? t("profile.saving") : t("profile.saveChanges")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

interface ThemeOptionProps {
  value: "light" | "dark";
  label: string;
  desc: string;
  icon: LucideIcon;
  current: string;
  onSelect: (value: "light" | "dark") => void;
}

function ThemeOption({ value, label, desc, icon: Icon, current, onSelect }: ThemeOptionProps) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        "relative flex-1 flex flex-col items-start gap-3 p-4 rounded-2xl border text-left transition-all",
        active
          ? "border-[var(--primary)] bg-[var(--accent)]"
          : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)]"
      )}
    >
      <div
        className={cn(
          "h-9 w-9 rounded-xl flex items-center justify-center",
          active
            ? "bg-[var(--primary-strong)] text-white"
            : "bg-[var(--muted)] text-[var(--muted-foreground)]"
        )}
      >
        <Icon size={16} />
      </div>
      <div>
        <div className="text-sm font-semibold text-[var(--foreground)]">{label}</div>
        <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
          {desc}
        </div>
      </div>
      {active && (
        <span className="absolute top-3 right-3 h-5 w-5 rounded-full bg-[var(--primary-strong)] text-white flex items-center justify-center">
          <Check size={12} />
        </span>
      )}
    </button>
  );
}

function AppearanceSection() {
  const { t } = useTranslation("settings");
  const { theme, setTheme } = useTheme();
  return (
    <Card padding="lg" className="max-w-2xl">
      <CardHeader>
        <div>
          <CardTitle className="text-base">{t("appearance.title")}</CardTitle>
          <CardDescription className="mt-1">
            {t("appearance.desc")}
          </CardDescription>
        </div>
      </CardHeader>

      <div className="flex gap-3">
        <ThemeOption
          value="light"
          label={t("appearance.light")}
          desc={t("appearance.lightDesc")}
          icon={Sun}
          current={theme}
          onSelect={setTheme}
        />
        <ThemeOption
          value="dark"
          label={t("appearance.dark")}
          desc={t("appearance.darkDesc")}
          icon={Moon}
          current={theme}
          onSelect={setTheme}
        />
      </div>
    </Card>
  );
}

function PasswordSection() {
  const { t } = useTranslation("settings");
  const toast = useToast();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const newTooShort = newPassword.length > 0 && newPassword.length < 8;
  const mismatch = confirm.length > 0 && confirm !== newPassword;
  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    confirm === newPassword &&
    !saving;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      toast.success(t("password.successMsg"));
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      toast.error(t("password.errorMsg"), (err as ApiError)?.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card padding="lg" className="max-w-2xl">
      <CardHeader>
        <div>
          <CardTitle className="text-base">{t("password.title")}</CardTitle>
          <CardDescription className="mt-1">
            {t("password.desc")}
          </CardDescription>
        </div>
      </CardHeader>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <FieldLabel>{t("password.current")}</FieldLabel>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <div>
          <FieldLabel>{t("password.new")}</FieldLabel>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
          />
          {newTooShort && (
            <p className="text-[11px] text-[var(--destructive)] mt-1.5">
              {t("password.newShortError")}
            </p>
          )}
        </div>

        <div>
          <FieldLabel>{t("password.confirm")}</FieldLabel>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          {mismatch && (
            <p className="text-[11px] text-[var(--destructive)] mt-1.5">
              {t("password.mismatchError")}
            </p>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={!canSubmit}>
            {saving ? t("password.updating") : t("password.updateBtn")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function Settings() {
  const { t } = useTranslation("settings");
  const [tab, setTab] = useState("profile");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("page.title")}
        description={t("page.desc")}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="profile">{t("tabs.profile")}</TabsTrigger>
          <TabsTrigger value="appearance">{t("tabs.appearance")}</TabsTrigger>
          <TabsTrigger value="password">{t("tabs.password")}</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="profile">
            <ProfileSection />
          </TabsContent>
          <TabsContent value="appearance">
            <AppearanceSection />
          </TabsContent>
          <TabsContent value="password">
            <PasswordSection />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
