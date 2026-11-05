import { Navigate, createBrowserRouter } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Landing from "@/pages/Landing";
import AuthCallback from "@/pages/AuthCallback";
import ProtectedShell from "@/pages/ProtectedShell";
import Resumes from "@/pages/Resumes";
import ResumeDetail from "@/pages/ResumeDetail";
import ExportPage from "@/pages/Export";
import Insights from "@/pages/Insights";
import Versions from "@/pages/Versions";
import History from "@/pages/History";
import Settings from "@/pages/Settings";

export const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/auth/callback", element: <AuthCallback /> },
  {
    path: "/",
    element: <ProtectedShell />,
    children: [
      { path: "dashboard", element: <Dashboard /> },
      { path: "resumes", element: <Resumes /> },
      { path: "resumes/:id", element: <ResumeDetail /> },
      { path: "resumes/:id/export", element: <ExportPage /> },
      { path: "insights", element: <Insights /> },
      { path: "versions", element: <Versions /> },
      { path: "history", element: <History /> },
      { path: "settings", element: <Settings /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
