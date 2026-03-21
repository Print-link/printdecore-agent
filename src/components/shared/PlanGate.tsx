import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { usePermissions, type PermissionKey } from "../../hooks/usePermissions";
import { usePlanFeature } from "../../hooks/usePlanFeature";
import { Card, Button } from "../ui";
import { Crown, Shield } from "../icons";
import { useThemeClasses } from "../../lib/theme";
import { cn } from "../../lib/utils";

// ─── Role Guard ─────────────────────────────────────────────────────────

interface RoleGuardProps {
  /** Which roles can access this page */
  roles: Array<"manager" | "clerk">;
  children: ReactNode;
}

/**
 * Blocks access if the user's role is not in the allowed list.
 * Redirects clerks away from manager-only pages, etc.
 */
export function RoleGuard({ roles, children }: RoleGuardProps) {
  const { isManager, isClerk } = usePermissions();
  const userRole = isManager ? "manager" : isClerk ? "clerk" : null;

  if (!userRole || !roles.includes(userRole)) {
    return <AccessDenied reason="You don't have the required role to access this page." />;
  }

  return <>{children}</>;
}

// ─── Permission Guard ───────────────────────────────────────────────────

interface PermissionGuardProps {
  /** At least ONE of these permissions is required (OR logic) */
  permissions: PermissionKey[];
  children: ReactNode;
}

/**
 * Blocks access if the user doesn't have any of the required permissions.
 * Managers always pass. Clerks check their permission list.
 */
export function PermissionGuard({ permissions, children }: PermissionGuardProps) {
  const { hasPermission } = usePermissions();

  if (!hasPermission(...permissions)) {
    return <AccessDenied reason="You don't have the required permissions to access this page." />;
  }

  return <>{children}</>;
}

// ─── Plan Gate ───────────────────────────────────────────────────────────

interface PlanGateProps {
  /** Plan feature key to check (e.g., "hasWhatsappBroadcast") */
  feature: string;
  /** Human-readable label for the upgrade prompt */
  featureLabel: string;
  children: ReactNode;
}

/**
 * Blocks access if the manager's plan doesn't include the required feature.
 * Shows an upgrade prompt with a link to the billing page.
 */
export default function PlanGate({ feature, featureLabel, children }: PlanGateProps) {
  const { allowed, loading } = usePlanFeature(feature);
  const navigate = useNavigate();
  const t = useThemeClasses();

  if (loading) return null;

  if (!allowed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md text-center" padding="lg">
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5", t.isDark ? "bg-amber-900/30" : "bg-amber-50")}>
            <Crown size={32} className="text-amber-400" />
          </div>
          <h2 className={cn("text-xl font-bold mb-2", t.text)}>Upgrade to unlock {featureLabel}</h2>
          <p className={cn("text-sm mb-6", t.textSecondary)}>
            This feature is not available on your current plan. Upgrade to access {featureLabel.toLowerCase()} and more powerful tools.
          </p>
          <Button onClick={() => navigate("/app/billing")}>
            View Plans
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

// ─── Combined Guard ─────────────────────────────────────────────────────

interface GuardedRouteProps {
  /** Allowed roles (default: both manager and clerk) */
  roles?: Array<"manager" | "clerk">;
  /** Required permissions (OR logic — at least one must match). Managers skip this check. */
  permissions?: PermissionKey[];
  /** Required plan feature key */
  planFeature?: string;
  /** Label for the plan upgrade prompt */
  planFeatureLabel?: string;
  children: ReactNode;
}

/**
 * Unified route guard combining role, permission, and plan checks.
 * Checks in order: role → permission → plan feature.
 *
 * Usage:
 *   <GuardedRoute roles={["manager"]} planFeature="hasWhatsappBroadcast" planFeatureLabel="Broadcasts">
 *     <BroadcastsPage />
 *   </GuardedRoute>
 *
 *   <GuardedRoute permissions={[PERMISSIONS.ORDERS_VIEW]}>
 *     <OrdersPage />
 *   </GuardedRoute>
 */
export function GuardedRoute({
  roles,
  permissions,
  planFeature,
  planFeatureLabel,
  children,
}: GuardedRouteProps) {
  // 1. Role check
  if (roles) {
    return (
      <RoleGuard roles={roles}>
        <InnerGuard permissions={permissions} planFeature={planFeature} planFeatureLabel={planFeatureLabel}>
          {children}
        </InnerGuard>
      </RoleGuard>
    );
  }

  return (
    <InnerGuard permissions={permissions} planFeature={planFeature} planFeatureLabel={planFeatureLabel}>
      {children}
    </InnerGuard>
  );
}

function InnerGuard({
  permissions,
  planFeature,
  planFeatureLabel,
  children,
}: Omit<GuardedRouteProps, "roles">) {
  // 2. Permission check
  if (permissions && permissions.length > 0) {
    return (
      <PermissionGuard permissions={permissions}>
        {planFeature ? (
          <PlanGate feature={planFeature} featureLabel={planFeatureLabel || planFeature}>
            {children}
          </PlanGate>
        ) : (
          <>{children}</>
        )}
      </PermissionGuard>
    );
  }

  // 3. Plan check only
  if (planFeature) {
    return (
      <PlanGate feature={planFeature} featureLabel={planFeatureLabel || planFeature}>
        {children}
      </PlanGate>
    );
  }

  return <>{children}</>;
}

// ─── Access Denied Component ────────────────────────────────────────────

function AccessDenied({ reason }: { reason: string }) {
  const navigate = useNavigate();
  const t = useThemeClasses();

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md text-center" padding="lg">
        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5", t.isDark ? "bg-red-900/30" : "bg-red-50")}>
          <Shield size={32} className="text-red-400" />
        </div>
        <h2 className={cn("text-xl font-bold mb-2", t.text)}>Access Denied</h2>
        <p className={cn("text-sm mb-6", t.textSecondary)}>{reason}</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </Card>
    </div>
  );
}
