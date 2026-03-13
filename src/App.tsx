import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import { Toaster } from "@/components/ui/sonner";

// ── Lazy-loaded page components ──────────────────────────────────────────────
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const JoinPage = lazy(() => import("@/pages/JoinPage"));
const CRDashboardPage = lazy(() => import("@/pages/CRDashboardPage"));
const StudentPortalPage = lazy(() => import("@/pages/StudentPortalPage"));
const ClassSetupPage = lazy(() => import("@/pages/cr/ClassSetupPage"));
const ConsentVerificationPage = lazy(() => import("@/pages/ConsentVerificationPage"));

// ── Full-page loading spinner used as Suspense fallback ───────────────────────
function PageSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageSpinner />}>
          <Routes>
            {/* ── Public ── */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/join/:inviteCode" element={<JoinPage />} />
            <Route path="/consent/:token" element={<ConsentVerificationPage />} />

            {/* ── Protected ── */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<CRDashboardPage />} />
              <Route path="/portal" element={<StudentPortalPage />} />
              <Route path="/class/setup" element={<ClassSetupPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}
