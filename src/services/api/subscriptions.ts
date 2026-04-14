import { apiClient } from "./client";

// ─── Types ──────────────────────────────────────────────────────────────

export interface Plan {
  id: string;
  slug: "starter" | "growth" | "enterprise";
  name: string;
  priceMonthly: number;
  priceYearly: number;
  commissionRate: number;
  maxBranches: number;
  maxClerksPerBranch: number;
  maxOrdersPerMonth: number;
  maxServices: number;
  maxWhatsappNumbers: number;
  maxCustomRoles: number;
  maxBroadcastsPerMonth: number;
  hasWhatsapp: boolean;
  hasCrm: boolean;
  hasPaystackSubaccount: boolean;
  hasAnalyticsExport: boolean;
  hasWhiteLabel: boolean;
  hasApiAccess: boolean;
  hasPrioritySupport: boolean;
  paystackMonthlyPlanCode: string | null;
  paystackYearlyPlanCode: string | null;
}

export interface Subscription {
  id: string;
  managerId: string;
  planId: string;
  status: "trialing" | "active" | "past_due" | "cancelled" | "expired";
  billingCycle: "monthly" | "yearly" | null;
  trialStartsAt: string | null;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  paystackSubscriptionCode: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentPlanResponse {
  plan: Plan;
  subscription: Subscription;
  isTrialing: boolean;
  daysRemaining: number | null;
}

export interface SubscribeResponse {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

// ─── API ────────────────────────────────────────────────────────────────

export const subscriptionApi = {
  getPlans: async (): Promise<Plan[]> => {
    const { data } = await apiClient.get("/subscriptions/plans");
    return data.data;
  },

  getCurrent: async (): Promise<CurrentPlanResponse> => {
    const { data } = await apiClient.get("/subscriptions/current");
    return data.data;
  },

  subscribe: async (params: {
    planSlug: "growth" | "enterprise";
    billingCycle: "monthly" | "yearly";
  }): Promise<SubscribeResponse> => {
    const { data } = await apiClient.post("/subscriptions/subscribe", params);
    return data.data;
  },

  cancel: async (): Promise<{ message: string }> => {
    const { data } = await apiClient.post("/subscriptions/cancel");
    return data;
  },

  getHistory: async (): Promise<Subscription[]> => {
    const { data } = await apiClient.get("/subscriptions/history");
    return data.data;
  },

  updatePaymentMethod: async (): Promise<{ url: string }> => {
    const { data } = await apiClient.post("/subscriptions/update-payment");
    return data.data;
  },
};
