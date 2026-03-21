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
import { GuardedRoute } from "./components/shared/PlanGate";

// ─── Public pages ──────────────────────────────────────────────────────
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));

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
const BroadcastsPage = lazy(() => import("./pages/manager/BroadcastsPage"));
const QuickRepliesPage = lazy(
  () => import("./pages/manager/QuickRepliesPage"),
);
const ContactsPage = lazy(() => import("./pages/manager/ContactsPage"));
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
                  {/* Public */}
                  <Route
                    path="/payment/callback"
                    element={<PaymentCallback />}
                  />

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

                  {/* ═══════════════════════════════════════════════════ */}
                  {/* Main app — all routes guarded by auth + role/perm  */}
                  {/* ═══════════════════════════════════════════════════ */}
                  <Route
                    path="/app"
                    element={
                      <ProtectedRoute>
                        <AppLayout />
                      </ProtectedRoute>
                    }
                  >
                    {/* ─── Shared pages (both roles, permission-gated for clerks) ─── */}

                    <Route
                      path="dashboard"
                      element={
                        <GuardedRoute
                          permissions={[PERMISSIONS.DASHBOARD_VIEW]}
                        >
                          <DashboardPage />
                        </GuardedRoute>
                      }
                    />
                    <Route
                      path="jobs"
                      element={
                        <GuardedRoute permissions={[PERMISSIONS.ORDERS_VIEW]}>
                          <OrdersPage />
                        </GuardedRoute>
                      }
                    />
                    <Route
                      path="orders"
                      element={
                        <GuardedRoute permissions={[PERMISSIONS.ORDERS_VIEW]}>
                          <OrdersPage />
                        </GuardedRoute>
                      }
                    />
                    <Route
                      path="services"
                      element={
                        <GuardedRoute permissions={[PERMISSIONS.SERVICES_VIEW]}>
                          <ServicesPage />
                        </GuardedRoute>
                      }
                    />
                    <Route
                      path="messages"
                      element={
                        <GuardedRoute
                          permissions={[PERMISSIONS.MESSAGES_VIEW]}
                        >
                          <MessagesPage />
                        </GuardedRoute>
                      }
                    />
                    <Route
                      path="reports"
                      element={
                        <GuardedRoute
                          permissions={[
                            PERMISSIONS.REPORTS_VIEW,
                            PERMISSIONS.DASHBOARD_ANALYTICS,
                          ]}
                        >
                          <ReportsPage />
                        </GuardedRoute>
                      }
                    />
                    <Route
                      path="branch-info"
                      element={
                        <GuardedRoute permissions={[PERMISSIONS.BRANCH_VIEW]}>
                          <BranchInfoPage />
                        </GuardedRoute>
                      }
                    />

                    {/* Always accessible to any authenticated user */}
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="settings" element={<SettingsPage />} />

                    {/* ─── Manager-only pages ──────────────────────────────────── */}

                    <Route
                      path="overview"
                      element={
                        <GuardedRoute
                          roles={["manager"]}
                          permissions={[PERMISSIONS.DASHBOARD_ANALYTICS]}
                        >
                          <OverviewPage />
                        </GuardedRoute>
                      }
                    />
                    <Route
                      path="branches"
                      element={
                        <GuardedRoute
                          roles={["manager"]}
                          permissions={[PERMISSIONS.BRANCH_VIEW]}
                        >
                          <BranchesPage />
                        </GuardedRoute>
                      }
                    />
                    <Route
                      path="branches/create"
                      element={
                        <GuardedRoute
                          roles={["manager"]}
                          permissions={[PERMISSIONS.BRANCH_CREATE]}
                        >
                          <BranchCreatePage />
                        </GuardedRoute>
                      }
                    />
                    <Route
                      path="branches/edit/:id"
                      element={
                        <GuardedRoute
                          roles={["manager"]}
                          permissions={[PERMISSIONS.BRANCH_MANAGE]}
                        >
                          <BranchEditPage />
                        </GuardedRoute>
                      }
                    />
                    <Route
                      path="user-management"
                      element={
                        <GuardedRoute
                          roles={["manager"]}
                          permissions={[PERMISSIONS.USERS_VIEW]}
                        >
                          <UserManagementPage />
                        </GuardedRoute>
                      }
                    />
                    <Route
                      path="access-control"
                      element={
                        <GuardedRoute
                          roles={["manager"]}
                          permissions={[PERMISSIONS.USERS_PERMISSIONS]}
                        >
                          <AccessControlPage />
                        </GuardedRoute>
                      }
                    />
                    <Route
                      path="billing"
                      element={
                        <GuardedRoute roles={["manager"]}>
                          <BillingPage />
                        </GuardedRoute>
                      }
                    />

                    {/* ─── Plan-gated pages (manager-only + plan feature) ──────── */}

                    <Route
                      path="broadcasts"
                      element={
                        <GuardedRoute
                          roles={["manager"]}
                          planFeature="hasWhatsappBroadcast"
                          planFeatureLabel="Broadcast Campaigns"
                        >
                          <BroadcastsPage />
                        </GuardedRoute>
                      }
                    />
                    <Route
                      path="quick-replies"
                      element={
                        <GuardedRoute
                          roles={["manager"]}
                          planFeature="hasWhatsapp"
                          planFeatureLabel="Quick Replies"
                        >
                          <QuickRepliesPage />
                        </GuardedRoute>
                      }
                    />
                    <Route
                      path="contacts"
                      element={
                        <GuardedRoute
                          roles={["manager"]}
                          planFeature="hasCrm"
                          planFeatureLabel="CRM Contacts"
                        >
                          <ContactsPage />
                        </GuardedRoute>
                      }
                    />
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
