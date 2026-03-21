import { apiClient } from "./client";

// ─── Types ─────────────────────────────────────────────────────────────

export interface Plan {
  id: string;
  name: string;
  tagline?: string;
  priceMonthly: number;
  priceYearly: number;
  commissionRate: number;
  currency: string;
  maxBranches: number | null;
  maxClerksPerBranch: number | null;
  maxOrdersPerMonth: number | null;
  maxActiveServices: number | null;
  maxWhatsappNumbers: number | null;
  maxCustomRoles: number | null;
  maxBroadcastPerMonth: number | null;
  activityLogDays: number | null;
  hasAnalytics: boolean;
  hasAnalyticsExport: boolean;
  hasWhatsapp: boolean;
  hasWhatsappCatalog: boolean;
  hasWhatsappBroadcast: boolean;
  hasWhatsappAutoresponder: boolean;
  hasWhatsappLabels: boolean;
  hasWhatsappPolls: boolean;
  hasCrm: boolean;
  hasCustomRoles: boolean;
  hasBulkOperations: boolean;
  hasPaystackSubaccount: boolean;
  hasWhiteLabel: boolean;
  hasPrioritySupport: boolean;
  hasApiAccess: boolean;
  isActive: boolean;
  sortOrder: number;
  previousPriceMonthly?: number;
  previousPriceYearly?: number;
  previousCommissionRate?: number;
  priceChangedAt?: string;
}

export interface Subscription {
  id: string;
  managerId: string;
  planId: string;
  status: "active" | "trialing" | "past_due" | "cancelled" | "expired";
  billingCycle: "monthly" | "yearly" | "none";
  currentPeriodStart: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string;
  cancelledAt?: string;
}

export interface SubscriptionUsage {
  managerId: string;
  period: string;
  ordersCount: number;
  broadcastsCount: number;
}

export interface RealUsage {
  branchCount: number;
  clerkCount: number;
  activeServiceCount: number;
  ordersThisMonth: number;
  broadcastsThisMonth: number;
}

export interface BillingInfo {
  subscription: Subscription;
  plan: Plan;
  usage: SubscriptionUsage;
  realUsage: RealUsage;
}

export interface BillingHistoryItem {
  id: string;
  planId?: string;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  billingCycle?: string;
  createdAt: string;
}

// ─── API Functions ─────────────────────────────────────────────────────

async function getPlans(): Promise<Plan[]> {
  const response = await apiClient.get("/billing/plans");
  return response.data.data;
}

async function getMyBilling(): Promise<BillingInfo> {
  const response = await apiClient.get("/billing/me");
  return response.data.data;
}

async function changePlan(
  planId: string,
  billingCycle: "monthly" | "yearly"
): Promise<{ subscription: Subscription; paymentUrl?: string }> {
  const response = await apiClient.post("/billing/change-plan", {
    planId,
    billingCycle,
  });
  return response.data.data;
}

async function confirmPlanChange(
  planId: string,
  billingCycle: "monthly" | "yearly",
  paymentReference: string
): Promise<Subscription> {
  const response = await apiClient.post("/billing/confirm", {
    planId,
    billingCycle,
    paymentReference,
  });
  return response.data.data;
}

async function cancelSubscription(): Promise<Subscription> {
  const response = await apiClient.post("/billing/cancel");
  return response.data.data;
}

async function getBillingHistory(): Promise<BillingHistoryItem[]> {
  const response = await apiClient.get("/billing/history");
  return response.data.data;
}

async function checkFeature(feature: string): Promise<boolean> {
  const response = await apiClient.get(`/billing/check/${feature}`);
  return response.data.data.allowed;
}

// ─── Admin API Functions ───────────────────────────────────────────────

async function updatePlan(
  planId: string,
  data: Partial<Plan>
): Promise<{ plan: Plan; changes: any }> {
  const response = await apiClient.put(`/billing/admin/plans/${planId}`, data);
  return response.data.data;
}

async function bulkUpdatePricing(
  updates: Array<{
    planId: string;
    priceMonthly?: number;
    priceYearly?: number;
    commissionRate?: number;
  }>
): Promise<{ plans: Plan[]; changes: any[] }> {
  const response = await apiClient.put("/billing/admin/plans/bulk-pricing", { updates });
  return response.data.data;
}

async function getAdminPlans(): Promise<Plan[]> {
  const response = await apiClient.get("/billing/admin/plans");
  return response.data.data;
}

export const billingApi = {
  getPlans,
  getMyBilling,
  changePlan,
  confirmPlanChange,
  cancelSubscription,
  getBillingHistory,
  checkFeature,
  updatePlan,
  bulkUpdatePricing,
  getAdminPlans,
};
