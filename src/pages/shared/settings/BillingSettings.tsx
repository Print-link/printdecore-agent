import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useThemeClasses } from "../../../lib/theme";
import { cn } from "../../../lib/utils";
import { Card, PageHeader, Badge } from "../../../components/ui";
import {
  Check,
  Crown,
  Clock,
  Zap,
  Shield,
  Loader2,
  ArrowRight,
  CreditCard,
} from "../../../components/icons";
import { subscriptionApi } from "../../../services/api/subscriptions";
import type { Plan } from "../../../services/api/subscriptions";
import { useToast } from "../../../contexts/ToastContext";

type BillingCycle = "monthly" | "yearly";

const planMeta: Record<
  string,
  {
    tagline: string;
    badgeColor: "amber" | "blue" | "purple" | "green";
    icon: typeof Crown;
  }
> = {
  starter: {
    tagline: "Get started for free",
    badgeColor: "gray" as any,
    icon: Zap,
  },
  growth: { tagline: "Scale your business", badgeColor: "amber", icon: Crown },
  enterprise: {
    tagline: "Unlimited everything",
    badgeColor: "purple",
    icon: Shield,
  },
};

function formatLimit(value: number): string {
  return value === -1 ? "Unlimited" : String(value);
}

function getLimits(plan: Plan) {
  return [
    { label: "Branches", value: formatLimit(plan.maxBranches) },
    {
      label: "Clerks",
      value:
        plan.maxClerksPerBranch === -1
          ? "Unlimited"
          : `${plan.maxClerksPerBranch} per branch`,
    },
    {
      label: "Orders",
      value:
        plan.maxOrdersPerMonth === -1
          ? "Unlimited"
          : `${plan.maxOrdersPerMonth} / month`,
    },
    { label: "Services", value: formatLimit(plan.maxServices) },
    {
      label: "WhatsApp",
      value:
        plan.maxWhatsappNumbers === 0
          ? "No"
          : plan.maxWhatsappNumbers === -1
            ? "Unlimited"
            : `${plan.maxWhatsappNumbers} number`,
    },
  ];
}

function getFeatures(plan: Plan): {
  included: string[];
  notIncluded: string[];
} {
  const included: string[] = [];
  const notIncluded: string[] = [];

  if (plan.slug === "starter") {
    included.push(
      "Order management dashboard",
      "Basic analytics",
      "Paystack payment processing",
      "Customer notifications",
      "File upload support",
    );
    notIncluded.push(
      "WhatsApp integration",
      "Custom roles & permissions",
      "CRM features",
      "Paystack subaccount (direct settlement)",
      "Analytics export",
    );
  } else if (plan.slug === "growth") {
    included.push(
      "Everything in Starter",
      "WhatsApp catalog & messaging",
      "WhatsApp broadcast (100/month)",
      "Customer labels & CRM",
      "3 custom roles",
      "Paystack subaccount (direct settlement)",
      "30-day activity log",
      "Analytics with export",
    );
    notIncluded.push("White-label branding", "API access", "Priority support");
  } else {
    included.push(
      "Everything in Growth",
      "Unlimited branches & clerks",
      "Unlimited WhatsApp numbers",
      "Unlimited custom roles",
      "Unlimited broadcasts",
      "White-label branding",
      "API access",
      "Priority support",
      "Dedicated account manager",
    );
  }

  return { included, notIncluded };
}

const comparisonRows: Array<{
  feature: string;
  starter: string | boolean;
  growth: string | boolean;
  enterprise: string | boolean;
}> = [
  {
    feature: "Monthly Price",
    starter: "Free",
    growth: "GHS 70",
    enterprise: "GHS 150",
  },
  { feature: "Branches", starter: "1", growth: "3", enterprise: "Unlimited" },
  {
    feature: "Orders / Month",
    starter: "100",
    growth: "Unlimited",
    enterprise: "Unlimited",
  },
  {
    feature: "WhatsApp Integration",
    starter: false,
    growth: true,
    enterprise: true,
  },
  {
    feature: "WhatsApp Broadcast",
    starter: false,
    growth: "100/month",
    enterprise: "Unlimited",
  },
  { feature: "CRM & Labels", starter: false, growth: true, enterprise: true },
  {
    feature: "Custom Roles",
    starter: false,
    growth: "3",
    enterprise: "Unlimited",
  },
  {
    feature: "Direct Bank Settlement",
    starter: false,
    growth: true,
    enterprise: true,
  },
  {
    feature: "Analytics Export",
    starter: false,
    growth: true,
    enterprise: true,
  },
  { feature: "White-Label", starter: false, growth: false, enterprise: true },
  { feature: "API Access", starter: false, growth: false, enterprise: true },
  {
    feature: "Priority Support",
    starter: false,
    growth: false,
    enterprise: true,
  },
];

// ─── Component ──────────────────────────────────────────────────────────

export default function BillingSettings() {
  const t = useThemeClasses();
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  // ─── Data Fetching ────────────────────────────────────────────────

  const { data: currentPlan, isLoading: isLoadingCurrent } = useQuery({
    queryKey: ["subscription", "current"],
    queryFn: subscriptionApi.getCurrent,
  });

  const { data: plans, isLoading: isLoadingPlans } = useQuery({
    queryKey: ["subscription", "plans"],
    queryFn: subscriptionApi.getPlans,
  });

  console.log("plans -------", plans);

  // ─── Mutations ────────────────────────────────────────────────────

  const subscribeMutation = useMutation({
    mutationFn: subscriptionApi.subscribe,
    onSuccess: (data) => {
      window.location.href = data.authorizationUrl;
    },
    onError: (err: any) => {
      showError(
        err?.response?.data?.message || "Failed to start subscription",
        "Subscription Error",
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: subscriptionApi.cancel,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      success(data.message, "Plan Updated");
    },
    onError: (err: any) => {
      showError(
        err?.response?.data?.message || "Failed to cancel subscription",
        "Error",
      );
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: subscriptionApi.updatePaymentMethod,
    onSuccess: (data) => {
      window.open(data.url, "_blank");
    },
    onError: (err: any) => {
      showError(
        err?.response?.data?.message || "Failed to generate update link",
        "Error",
      );
    },
  });

  // ─── Helpers ──────────────────────────────────────────────────────

  const getPrice = (plan: Plan) => {
    if (plan.priceMonthly === 0) return "Free";
    const price =
      billingCycle === "yearly"
        ? Math.round(plan.priceYearly / 100 / 12)
        : plan.priceMonthly / 100;
    return `GHS ${price}`;
  };

  const getYearlySavings = (plan: Plan) => {
    if (plan.priceMonthly === 0) return 0;
    return (plan.priceMonthly * 12 - plan.priceYearly) / 100;
  };

  const isCurrentPlan = (planSlug: string) =>
    currentPlan?.plan.slug === planSlug;

  const canUpgrade = (planSlug: string) => {
    if (!currentPlan) return false;
    const order = ["starter", "growth", "enterprise"];
    return order.indexOf(planSlug) > order.indexOf(currentPlan.plan.slug);
  };

  const canDowngrade = (planSlug: string) => {
    if (!currentPlan) return false;
    const order = ["starter", "growth", "enterprise"];
    return order.indexOf(planSlug) < order.indexOf(currentPlan.plan.slug);
  };

  const handleSubscribe = (planSlug: "growth" | "enterprise") => {
    subscribeMutation.mutate({ planSlug, billingCycle });
  };

  const handleCancel = () => {
    if (
      window.confirm(
        "Are you sure you want to cancel your subscription? You'll be moved to the Starter plan.",
      )
    ) {
      cancelMutation.mutate();
    }
  };

  // ─── Loading State ────────────────────────────────────────────────

  if (isLoadingCurrent || isLoadingPlans) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className={cn("animate-spin", t.textTertiary)} />
      </div>
    );
  }

  const sub = currentPlan?.subscription;
  const activePlan = currentPlan?.plan;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Billing & Plans"
        description="Manage your subscription and billing"
      />

      {/* ─── Current Plan Status Card ──────────────────────────────── */}
      {activePlan && sub && (
        <Card padding="none">
          <div className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              {/* Plan Info */}
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                    activePlan.slug === "enterprise"
                      ? "bg-purple-100 dark:bg-purple-900/30"
                      : activePlan.slug === "growth"
                        ? "bg-amber-100 dark:bg-amber-900/30"
                        : t.isDark
                          ? "bg-gray-700"
                          : "bg-gray-100",
                  )}
                >
                  {activePlan.slug === "enterprise" ? (
                    <Shield size={20} className="text-purple-500" />
                  ) : activePlan.slug === "growth" ? (
                    <Crown size={20} className="text-amber-500" />
                  ) : (
                    <Zap
                      size={20}
                      className={t.isDark ? "text-gray-400" : "text-gray-500"}
                    />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={cn("text-base font-bold", t.text)}>
                      {activePlan.name} Plan
                    </h3>
                    {currentPlan.isTrialing && (
                      <Badge color="blue">Free Trial</Badge>
                    )}
                    {sub.status === "active" && (
                      <Badge color="green">Active</Badge>
                    )}
                    {sub.status === "past_due" && (
                      <Badge color="red">Past Due</Badge>
                    )}
                    {sub.status === "cancelled" && (
                      <Badge color="gray">Cancelled</Badge>
                    )}
                  </div>

                  <p className={cn("text-xs mt-1", t.textTertiary)}>
                    {planMeta[activePlan.slug]?.tagline || ""}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {sub.paystackSubscriptionCode && (
                  <button
                    onClick={() => updatePaymentMutation.mutate()}
                    disabled={updatePaymentMutation.isPending}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                      t.border,
                      t.isDark
                        ? "text-gray-300 hover:bg-gray-700"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <CreditCard size={12} className="inline mr-1.5 -mt-0.5" />
                    Update Payment
                  </button>
                )}
                {(sub.status === "active" ||
                  sub.status === "trialing" ||
                  sub.status === "past_due") &&
                  activePlan.slug !== "starter" && (
                    <button
                      onClick={handleCancel}
                      disabled={cancelMutation.isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      {cancelMutation.isPending
                        ? "Cancelling..."
                        : "Cancel Plan"}
                    </button>
                  )}
              </div>
            </div>

            {/* Trial / Period Info Bar */}
            {(currentPlan.isTrialing || sub.currentPeriodEnd) && (
              <div
                className={cn(
                  "mt-4 rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6",
                  currentPlan.isTrialing
                    ? "bg-blue-50 dark:bg-blue-900/20"
                    : "bg-gray-50 dark:bg-gray-800/50",
                )}
              >
                {currentPlan.isTrialing && currentPlan.daysRemaining != null ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-blue-500 shrink-0" />
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                        {currentPlan.daysRemaining} day
                        {currentPlan.daysRemaining !== 1 ? "s" : ""} remaining
                        on your free trial
                      </span>
                    </div>
                    <div className="flex-1 hidden sm:block">
                      <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all"
                          style={{
                            width: `${Math.max(5, Math.min(100, (currentPlan.daysRemaining / 60) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                    {sub.trialEndsAt && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 shrink-0">
                        Ends{" "}
                        {new Date(sub.trialEndsAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </>
                ) : sub.currentPeriodEnd ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className={t.textTertiary} />
                      <span
                        className={cn("text-xs font-medium", t.textSecondary)}
                      >
                        {sub.status === "cancelled"
                          ? "Access until"
                          : "Next billing date"}
                        :{" "}
                        <span className={cn("font-semibold", t.text)}>
                          {new Date(sub.currentPeriodEnd).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </span>
                    </div>
                    {sub.billingCycle && (
                      <span
                        className={cn(
                          "text-[10px] font-medium",
                          t.textTertiary,
                        )}
                      >
                        Billed {sub.billingCycle}
                      </span>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ─── Billing Cycle Toggle ──────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-semibold transition-all",
            billingCycle === "monthly"
              ? "bg-amber-400 text-gray-900"
              : t.isDark
                ? "text-gray-400 hover:text-gray-200"
                : "text-gray-500 hover:text-gray-700",
          )}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle("yearly")}
          className={cn(
            "px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2",
            billingCycle === "yearly"
              ? "bg-amber-400 text-gray-900"
              : t.isDark
                ? "text-gray-400 hover:text-gray-200"
                : "text-gray-500 hover:text-gray-700",
          )}
        >
          Yearly
          <span className="text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-1.5 py-0.5 rounded-full">
            Save 20%
          </span>
        </button>
      </div>

      {/* ─── Plans Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(plans || []).map((plan) => {
          const meta = planMeta[plan.slug] || planMeta.starter;
          const isCurrent = isCurrentPlan(plan.slug);
          const isTrialing = currentPlan?.isTrialing ?? false;
          const isTrialPlan = isTrialing && plan.slug === "enterprise";
          const isGrayedOut = isTrialing && !isTrialPlan;
          const limits = getLimits(plan);
          const { included, notIncluded } = getFeatures(plan);

          return (
            <div
              key={plan.id}
              className={cn(
                "relative rounded-xl border p-6 flex flex-col transition-all",
                isGrayedOut && "opacity-50 pointer-events-none",
                isTrialPlan
                  ? "ring-2 ring-blue-400/40 border-blue-400/60"
                  : isCurrent
                    ? "ring-2 ring-amber-400/40 border-amber-400/60"
                    : plan.slug === "growth"
                      ? "ring-2 ring-amber-400/20 border-amber-400/40"
                      : t.isDark
                        ? "border-gray-700"
                        : "border-gray-200",
                t.isDark ? "bg-gray-800" : "bg-white",
              )}
            >
              {/* Badge */}
              {isTrialPlan ? (
                <Badge color="blue" className="absolute -top-2.5 left-4">
                  Free Trial Active
                </Badge>
              ) : isCurrent ? (
                <Badge color="green" className="absolute -top-2.5 left-4">
                  Current Plan
                </Badge>
              ) : !isGrayedOut && plan.slug === "growth" ? (
                <Badge color="amber" className="absolute -top-2.5 left-4">
                  Most Popular
                </Badge>
              ) : !isGrayedOut && plan.slug === "enterprise" ? (
                <Badge color="purple" className="absolute -top-2.5 left-4">
                  Best Value
                </Badge>
              ) : null}

              <h3 className={cn("text-lg font-bold", t.text)}>{plan.name}</h3>
              <p className={cn("text-xs mt-0.5 mb-4", t.textTertiary)}>
                {meta.tagline}
              </p>

              {/* Price */}
              <div className="mb-1">
                <div className="flex items-baseline gap-1">
                  <span className={cn("text-3xl font-extrabold", t.text)}>
                    {getPrice(plan)}
                  </span>
                  {plan.priceMonthly > 0 && (
                    <span className={cn("text-xs", t.textTertiary)}>
                      /month
                    </span>
                  )}
                </div>
                {billingCycle === "yearly" && plan.priceMonthly > 0 && (
                  <p className="text-[10px] text-green-500 font-semibold mt-0.5">
                    Save GHS {getYearlySavings(plan)} per year
                  </p>
                )}
              </div>

              {/* Trial countdown on Enterprise card */}
              {isTrialPlan && currentPlan?.daysRemaining != null && (
                <div className="mb-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={14} className="text-blue-500 shrink-0" />
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      {currentPlan.daysRemaining} day
                      {currentPlan.daysRemaining !== 1 ? "s" : ""} left on free
                      trial
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{
                        width: `${Math.max(5, Math.min(100, (currentPlan.daysRemaining / 60) * 100))}%`,
                      }}
                    />
                  </div>
                  {sub?.trialEndsAt && (
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1.5">
                      Expires{" "}
                      {new Date(sub.trialEndsAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {" — "}all Enterprise features included
                    </p>
                  )}
                </div>
              )}

              {/* Limits */}
              <div
                className={cn("space-y-1.5 my-4 pb-4 border-b", t.borderSubtle)}
              >
                {limits.map((limit) => (
                  <div
                    key={limit.label}
                    className="flex justify-between text-xs"
                  >
                    <span className={t.textSecondary}>{limit.label}</span>
                    <span className={cn("font-semibold", t.text)}>
                      {limit.value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Features */}
              <ul className="space-y-2 flex-grow">
                {included.map((feature) => (
                  <li
                    key={feature}
                    className={cn(
                      "flex items-start gap-2 text-xs",
                      t.textSecondary,
                    )}
                  >
                    <Check
                      size={14}
                      className="text-green-500 mt-0.5 shrink-0"
                    />
                    {feature}
                  </li>
                ))}
                {notIncluded.map((feature) => (
                  <li
                    key={feature}
                    className={cn(
                      "flex items-start gap-2 text-xs line-through",
                      t.textTertiary,
                    )}
                  >
                    <span className="w-3.5 text-center mt-0.5 shrink-0">
                      --
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <div className="mt-6">
                {isTrialPlan ? (
                  <div className="w-full text-center py-2.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                    <Shield size={14} className="inline mr-1.5 -mt-0.5" />
                    All features unlocked
                  </div>
                ) : isCurrent ? (
                  <div
                    className={cn(
                      "w-full text-center py-2.5 rounded-lg text-xs font-semibold",
                      "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
                    )}
                  >
                    <Check size={14} className="inline mr-1.5 -mt-0.5" />
                    Your Current Plan
                  </div>
                ) : plan.slug === "starter" ? (
                  canDowngrade("starter") ? (
                    <button
                      onClick={handleCancel}
                      disabled={cancelMutation.isPending}
                      className={cn(
                        "w-full py-2.5 rounded-lg text-xs font-semibold transition-colors border",
                        t.border,
                        t.isDark
                          ? "text-gray-300 hover:bg-gray-700"
                          : "text-gray-600 hover:bg-gray-50",
                      )}
                    >
                      {cancelMutation.isPending
                        ? "Processing..."
                        : "Downgrade to Free"}
                    </button>
                  ) : null
                ) : canUpgrade(plan.slug) ? (
                  <button
                    onClick={() =>
                      handleSubscribe(plan.slug as "growth" | "enterprise")
                    }
                    disabled={subscribeMutation.isPending}
                    className={cn(
                      "w-full py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                      plan.slug === "enterprise"
                        ? "bg-purple-500 text-white hover:bg-purple-600"
                        : "bg-amber-400 text-gray-900 hover:bg-amber-500",
                    )}
                  >
                    {subscribeMutation.isPending ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Upgrade to {plan.name}
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                ) : canDowngrade(plan.slug) ? (
                  <button
                    onClick={() =>
                      handleSubscribe(plan.slug as "growth" | "enterprise")
                    }
                    disabled={subscribeMutation.isPending}
                    className={cn(
                      "w-full py-2.5 rounded-lg text-xs font-semibold transition-colors border",
                      t.border,
                      t.isDark
                        ? "text-gray-300 hover:bg-gray-700"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    {subscribeMutation.isPending
                      ? "Processing..."
                      : `Switch to ${plan.name}`}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Comparison Table ──────────────────────────────────────── */}
      <Card padding="none">
        <div className="px-5 py-4">
          <h3 className={cn("text-sm font-semibold", t.text)}>
            Compare plans at a glance
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={cn("border-y", t.border)}>
                <th
                  className={cn("text-left py-2.5 px-5 font-semibold", t.text)}
                >
                  Feature
                </th>
                <th
                  className={cn(
                    "py-2.5 px-4 font-semibold text-center",
                    isCurrentPlan("starter")
                      ? "text-green-600 bg-green-50/50 dark:bg-green-900/10"
                      : t.textSecondary,
                  )}
                >
                  Starter
                  {isCurrentPlan("starter") && (
                    <span className="block text-[9px] font-normal text-green-500">
                      current
                    </span>
                  )}
                </th>
                <th
                  className={cn(
                    "py-2.5 px-4 font-semibold text-center",
                    isCurrentPlan("growth")
                      ? "text-green-600 bg-green-50/50 dark:bg-green-900/10"
                      : "text-amber-500 bg-amber-400/5",
                  )}
                >
                  Growth
                  {isCurrentPlan("growth") && (
                    <span className="block text-[9px] font-normal text-green-500">
                      current
                    </span>
                  )}
                </th>
                <th
                  className={cn(
                    "py-2.5 px-4 font-semibold text-center",
                    isCurrentPlan("enterprise")
                      ? "text-green-600 bg-green-50/50 dark:bg-green-900/10"
                      : t.textSecondary,
                  )}
                >
                  Enterprise
                  {isCurrentPlan("enterprise") && (
                    <span className="block text-[9px] font-normal text-green-500">
                      current
                    </span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr
                  key={row.feature}
                  className={cn(
                    "border-b last:border-0",
                    t.borderSubtle,
                    i % 2 === 0
                      ? t.isDark
                        ? "bg-gray-800/50"
                        : "bg-gray-50/50"
                      : "",
                  )}
                >
                  <td className={cn("py-2.5 px-5 font-medium", t.text)}>
                    {row.feature}
                  </td>
                  {(["starter", "growth", "enterprise"] as const).map(
                    (planKey) => (
                      <td
                        key={planKey}
                        className={cn(
                          "py-2.5 px-4 text-center",
                          isCurrentPlan(planKey)
                            ? "bg-green-50/30 dark:bg-green-900/5"
                            : planKey === "growth"
                              ? "bg-amber-400/5"
                              : "",
                        )}
                      >
                        {typeof row[planKey] === "boolean" ? (
                          row[planKey] ? (
                            <Check
                              size={16}
                              className="text-green-500 mx-auto"
                            />
                          ) : (
                            <span className={t.textTertiary}>--</span>
                          )
                        ) : (
                          <span className={cn("font-semibold", t.text)}>
                            {row[planKey]}
                          </span>
                        )}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
