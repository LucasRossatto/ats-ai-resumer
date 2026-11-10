import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedShell() {
  const { t } = useTranslation("common");
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div
        role="status"
        className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--muted-foreground)] text-base"
      >
        {t("status.loading")}
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell />;
}
