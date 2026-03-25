import { lazy } from "react";
import { Route } from "react-router-dom";
import { GuardedRoute } from "../components/shared/PlanGate";
import type { PermissionKey } from "../hooks/usePermissions";

export interface RouteConfig {
  path: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  roles?: Array<"manager" | "clerk">;
  permissions?: PermissionKey[];
  planFeature?: string;
  planFeatureLabel?: string;
}

const ProfilePage = lazy(() => import("../pages/shared/ProfilePage"));
const SettingsPage = lazy(() => import("../pages/shared/SettingsPage"));

export const openRoutes: RouteConfig[] = [
  { path: "profile", component: ProfilePage },
  { path: "settings", component: SettingsPage },
];

export function renderRoutes(routes: RouteConfig[]) {
  return routes.map(
    ({
      path,
      component: Component,
      roles,
      permissions,
      planFeature,
      planFeatureLabel,
    }) => {
      const needsGuard = roles || permissions || planFeature;

      return (
        <Route
          key={path}
          path={path}
          element={
            needsGuard ? (
              <GuardedRoute
                roles={roles}
                permissions={permissions}
                planFeature={planFeature}
                planFeatureLabel={planFeatureLabel}
              >
                <Component />
              </GuardedRoute>
            ) : (
              <Component />
            )
          }
        />
      );
    },
  );
}
