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
import { usePermissions, PERMISSIONS } from "./hooks/usePermissions";
import { OfflineBanner } from "./shared/components/OfflineBanner";
import { ToastContainer } from "./components/shared/toast/ToastContainer";
import LoginPage from "./pages/auth/LoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import SetupPasswordPage from "./pages/auth/SetupPasswordPage";
import AppLayout from "./layouts/AppLayout";
import { Spinner } from "./components/icons";

// ─── Manager pages ──────────────────────────────────────────────────────
const OverviewPage = lazy(() => import("./pages/manager/OverviewPage"));
const BranchesPage = lazy(() => import("./pages/manager/BranchesPage"));
const UserManagementPage = lazy(
  () => import("./pages/manager/UserManagementPage"),
);
const AccessControlPage = lazy(
  () => import("./pages/manager/AccessControlPage"),
);
const BillingPage = lazy(() => import("./pages/manager/BillingPage"));
const BranchCreatePage = lazy(
  () => import("./pages/manager/branches/BranchCreatePage"),
);
const BranchEditPage = lazy(
  () => import("./pages/manager/branches/BranchEditPage"),
);

// ─── Shared pages ───────────────────────────────────────────────────────
const DashboardPage = lazy(() => import("./pages/shared/DashboardPage"));
const OrdersPage = lazy(() => import("./pages/shared/OrdersPage"));
const ServicesPage = lazy(() => import("./pages/shared/ServicesPage"));
const MessagesPage = lazy(() => import("./pages/shared/MessagesPage"));
const ReportsPage = lazy(() => import("./pages/shared/ReportsPage"));
const ProfilePage = lazy(() => import("./pages/shared/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/shared/SettingsPage"));
const BranchInfoPage = lazy(() => import("./pages/shared/BranchInfoPage"));
const AcceptInvitationPage = lazy(
  () => import("./pages/shared/AcceptInvitationPage"),
);

import { queryClient } from "./lib/queryClient";

// ─── Route guards ───────────────────────────────────────────────────────

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

function RootRedirect() {
  const user = useAuthStore((state) => state.user);
  const { isClerk, hasPermission } = usePermissions();

  if (user?.role === "manager") {
    return <Navigate to="/app/overview" replace />;
  }

  // Clerks: redirect to the first page they have permission for
  if (isClerk) {
    const routes: Array<{ path: string; permission: string }> = [
      { path: "/app/dashboard", permission: PERMISSIONS.DASHBOARD_VIEW },
      { path: "/app/orders", permission: PERMISSIONS.ORDERS_VIEW },
      { path: "/app/messages", permission: PERMISSIONS.MESSAGES_VIEW },
      { path: "/app/services", permission: PERMISSIONS.SERVICES_VIEW },
      { path: "/app/reports", permission: PERMISSIONS.REPORTS_VIEW },
    ];
    for (const route of routes) {
      if (hasPermission(route.permission as any)) {
        return <Navigate to={route.path} replace />;
      }
    }
    // Fallback: profile is always accessible
    return <Navigate to="/app/profile" replace />;
  }

  return <Navigate to="/app/dashboard" replace />;
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

                  {/* Main app — shared layout for both roles */}
                  <Route
                    path="/app"
                    element={
                      <ProtectedRoute>
                        <AppLayout />
                      </ProtectedRoute>
                    }
                  >
                    {/* Shared pages */}
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="jobs" element={<OrdersPage />} />
                    <Route path="orders" element={<OrdersPage />} />
                    <Route path="services" element={<ServicesPage />} />
                    <Route path="messages" element={<MessagesPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="branch-info" element={<BranchInfoPage />} />

                    {/* Manager pages */}
                    <Route path="overview" element={<OverviewPage />} />
                    <Route path="branches" element={<BranchesPage />} />
                    <Route
                      path="branches/create"
                      element={<BranchCreatePage />}
                    />
                    <Route
                      path="branches/edit/:id"
                      element={<BranchEditPage />}
                    />
                    <Route
                      path="user-management"
                      element={<UserManagementPage />}
                    />
                    <Route
                      path="access-control"
                      element={<AccessControlPage />}
                    />
                    <Route path="billing" element={<BillingPage />} />
                  </Route>

                  {/* Invitation signup */}
                  <Route
                    path="/accept-invitation"
                    element={<AcceptInvitationPage />}
                  />

                  {/* Root redirect */}
                  <Route path="/" element={<RootRedirect />} />
                </Routes>
              </Suspense>
            </Router>
            <ReactQueryDevtools initialIsOpen={false} />
          </ToastProvider>
        </SettingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
