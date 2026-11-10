import { Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { AppLoader } from "@/components/ui/AppLoader";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedShell() {
  const { user, loading } = useAuth();
  if (loading) return <AppLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppShell />;
}
