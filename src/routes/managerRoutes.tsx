import { lazy } from "react";
import type { RouteConfig } from ".";
import { PERMISSIONS } from "../hooks/usePermissions";
const OverviewPage = lazy(() => import("../pages/manager/OverviewPage"));
const BranchesPage = lazy(() => import("../pages/manager/BranchesPage"));
const UserManagementPage = lazy(
  () => import("../pages/manager/UserManagementPage"),
);
const AccessControlPage = lazy(
  () => import("../pages/manager/AccessControlPage"),
);
const MarketingPage = lazy(() => import("../pages/manager/MarketingPage"));
const BranchCreatePage = lazy(
  () => import("../pages/manager/branches/BranchCreatePage"),
);
const BranchEditPage = lazy(
  () => import("../pages/manager/branches/BranchEditPage"),
);

export const managerRoutes: RouteConfig[] = [
  {
    path: "overview",
    component: OverviewPage,
    roles: ["manager"],
    permissions: [PERMISSIONS.DASHBOARD_ANALYTICS],
  },
  {
    path: "branches",
    component: BranchesPage,
    roles: ["manager"],
    permissions: [PERMISSIONS.BRANCH_VIEW],
  },
  {
    path: "branches/create",
    component: BranchCreatePage,
    roles: ["manager"],
    permissions: [PERMISSIONS.BRANCH_CREATE],
  },
  {
    path: "branches/edit/:id",
    component: BranchEditPage,
    roles: ["manager"],
    permissions: [PERMISSIONS.BRANCH_MANAGE],
  },
  {
    path: "user-management",
    component: UserManagementPage,
    roles: ["manager"],
    permissions: [PERMISSIONS.USERS_VIEW],
  },
  {
    path: "access-control",
    component: AccessControlPage,
    roles: ["manager"],
    permissions: [PERMISSIONS.USERS_PERMISSIONS],
  },
  {
    path: "marketing/*",
    component: MarketingPage,
    roles: ["manager"],
  },
];
