import { lazy } from "react";
import type { RouteConfig } from ".";
import { PERMISSIONS } from "../hooks/usePermissions";

const HomePage = lazy(() => import("../pages/shared/HomePage"));
const ToHome = lazy(() => import("../pages/shared/ToHome"));
const OrdersPage = lazy(() => import("../pages/shared/OrdersPage"));
const ServicesPage = lazy(() => import("../pages/shared/ServicesPage"));
const ShopPricingPage = lazy(() => import("../pages/shared/ShopPricingPage"));
const MessagesPage = lazy(() => import("../pages/shared/MessagesPage"));
const BranchInfoPage = lazy(() => import("../pages/shared/BranchInfoPage"));
const ReportsPage = lazy(() => import("../pages/shared/ReportsPage"));

export const sharedRoutes: RouteConfig[] = [
  // Home replaces the old branch Dashboard and manager Overview
  { path: "home", component: HomePage },
  { path: "dashboard", component: ToHome },
  { path: "overview", component: ToHome },
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
    path: "pricing",
    component: ShopPricingPage,
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
    path: "branch-info/*",
    component: BranchInfoPage,
    permissions: [PERMISSIONS.BRANCH_VIEW],
  },
];
