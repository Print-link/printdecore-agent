import { lazy } from "react";
import type { RouteConfig } from ".";
import { PERMISSIONS } from "../hooks/usePermissions";

const DashboardPage = lazy(() => import("../pages/shared/DashboardPage"));
const OrdersPage = lazy(() => import("../pages/shared/OrdersPage"));
const ServicesPage = lazy(() => import("../pages/shared/ServicesPage"));
const MessagesPage = lazy(() => import("../pages/shared/MessagesPage"));
const BranchInfoPage = lazy(() => import("../pages/shared/BranchInfoPage"));
const ReportsPage = lazy(() => import("../pages/shared/ReportsPage"));

export const sharedRoutes: RouteConfig[] = [
  {
    path: "dashboard",
    component: DashboardPage,
    permissions: [PERMISSIONS.DASHBOARD_VIEW],
  },
  {
    path: "jobs",
    component: OrdersPage,
    permissions: [PERMISSIONS.ORDERS_VIEW],
  },
  {
    path: "orders",
    component: OrdersPage,
    permissions: [PERMISSIONS.ORDERS_VIEW],
  },
  {
    path: "services",
    component: ServicesPage,
    permissions: [PERMISSIONS.SERVICES_VIEW],
  },
  {
    path: "messages",
    component: MessagesPage,
    permissions: [PERMISSIONS.MESSAGES_VIEW],
  },
  {
    path: "reports",
    component: ReportsPage,
    permissions: [PERMISSIONS.REPORTS_VIEW, PERMISSIONS.DASHBOARD_ANALYTICS],
  },
  {
    path: "branch-info",
    component: BranchInfoPage,
    permissions: [PERMISSIONS.BRANCH_VIEW],
  },
];
