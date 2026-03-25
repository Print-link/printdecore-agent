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
const BroadcastsPage = lazy(() => import("../pages/manager/BroadcastsPage"));
const QuickRepliesPage = lazy(
  () => import("../pages/manager/QuickRepliesPage"),
);
const ContactsPage = lazy(() => import("../pages/manager/ContactsPage"));
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
    path: "broadcasts",
    component: BroadcastsPage,
    roles: ["manager"],
  },
  {
    path: "quick-replies",
    component: QuickRepliesPage,
    roles: ["manager"],
  },
  {
    path: "contacts",
    component: ContactsPage,
    roles: ["manager"],
  },
];
