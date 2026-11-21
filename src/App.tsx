import { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ToastProvider } from "./contexts/ToastContext";
import { useAuthStore } from "./stores/authStore";
import { OfflineBanner } from "./shared/components/OfflineBanner";
import { ToastContainer } from "./components/shared/toast/ToastContainer";
import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import SetupPasswordPage from "./pages/auth/SetupPasswordPage";
import AppLayout from "./layouts/AppLayout";
import { Spinner } from "./components/icons";
import { queryClient } from "./lib/queryClient";
import { openRoutes, renderRoutes } from "./routes";
import { managerRoutes } from "./routes/managerRoutes";
import { sharedRoutes } from "./routes/sharedRoutes";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import { LegacyRedirect } from "./pages/shared/NotFoundPage";

const AcceptInvitationPage = lazy(
  () => import("./pages/shared/AcceptInvitationPage"),
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function SetupPasswordRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!user || user.isTemporaryPassword !== true) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated && user.isTemporaryPassword !== true) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Spinner size="lg" />
    </div>
  );
}

/** Managers and clerks both start on Home */
function RootRedirect() {
  return <Navigate to="/app/home" replace />;
}

// ─── App ────────────────────────────────────────────────────────────────

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SettingsProvider>
          <ToastProvider>
            <OfflineBanner />
            <ToastContainer />
            <Router>
              <ErrorBoundary>
              <Suspense fallback={<LoadingScreen />}>
                <Routes>
                  {/* Auth */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route
                    path="/forgot-password"
                    element={<ForgotPasswordPage />}
                  />
                  <Route
                    path="/reset-password"
                    element={<ResetPasswordPage />}
                  />
                  <Route
                    path="/setup-password"
                    element={
                      <SetupPasswordRoute>
                        <SetupPasswordPage />
                      </SetupPasswordRoute>
                    }
                  />

                  {/* Protected app routes */}
                  <Route
                    path="/app"
                    element={
                      <ProtectedRoute>
                        <AppLayout />
                      </ProtectedRoute>
                    }
                  >
                    {/* Shared pages (both roles, permission-gated for clerks) */}
                    {renderRoutes(sharedRoutes)}

                    {/* Open pages (any authenticated user) */}
                    {renderRoutes(openRoutes)}

                    {/* Manager-only pages */}
                    {renderRoutes(managerRoutes)}

                    {/* Anything else under /app */}
                    <Route path="*" element={<LegacyRedirect />} />
                  </Route>

                  {/* Invitation signup */}
                  <Route
                    path="/accept-invitation"
                    element={<AcceptInvitationPage />}
                  />

                  {/* Root redirect */}
                  <Route path="/" element={<RootRedirect />} />

                  {/* Old links without /app (e.g. /orders) */}
                  <Route path="*" element={<LegacyRedirect />} />
                </Routes>
              </Suspense>
              </ErrorBoundary>
            </Router>
            <ReactQueryDevtools initialIsOpen={false} />
          </ToastProvider>
        </SettingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
