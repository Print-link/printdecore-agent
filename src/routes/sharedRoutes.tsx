import { lazy } from "react";
import type { RouteConfig } from ".";
import { PERMISSIONS } from "../hooks/usePermissions";

const HomePage = lazy(() => import("../pages/shared/HomePage"));
const ToHome = lazy(() => import("../pages/shared/ToHome"));
const OrdersPage = lazy(() => import("../pages/shared/OrdersPage"));
const ArtworksPage = lazy(() => import("../pages/shared/ArtworksPage"));
const ToPricing = lazy(() => import("../pages/shared/ToPricing"));
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
  // The old Services page: its products and prices now live under Pricing
  { path: "services", component: ToPricing },
  {
    path: "artworks",
    component: ArtworksPage,
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
