import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { billingApi, type BillingInfo, type Plan } from '../../services/api/billing';
import { Card, PageHeader, Button, Badge, Section, EmptyState } from '../../components/ui';
import { useThemeClasses } from '../../lib/theme';
import { cn } from '../../lib/utils';
import {
  Crown, Rocket, Diamond, Zap, Check, Store, Users, ShoppingBag,
  BarChart3, Shield, Wrench, TrendingUp, Banknote, ArrowRight, Star,
  Receipt, MessageCircle, Clock, AlertCircle,
} from '../../components/icons';

// ─── Icon map for plans ──────────────────────────────────────────────

const PLAN_ICONS: Record<string, typeof Crown> = {
  starter: Zap,
  growth: Rocket,
  enterprise: Diamond,
  payg: Banknote,
};

const PLAN_GRADIENTS: Record<string, string> = {
  starter: 'from-gray-500 to-gray-700',
  growth: 'from-amber-500 to-amber-600',
  enterprise: 'from-purple-600 to-indigo-700',
  payg: 'from-emerald-500 to-emerald-700',
};

// ─── Component ────────────────────────────────────────────────────────

export default function BillingPage() {
  const { user } = useAuthStore();
  const t = useThemeClasses();
  const queryClient = useQueryClient();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Fetch billing info
  const { data: billing, isLoading } = useQuery<BillingInfo>({
    queryKey: ['billing', 'me'],
    queryFn: () => billingApi.getMyBilling(),
    staleTime: 30000,
  });

  // Fetch all plans
  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['billing', 'plans'],
    queryFn: () => billingApi.getPlans(),
    staleTime: 60000,
  });

  // Track pending plan change while waiting for payment
  const pendingPlanRef = useRef<{ planId: string; billingCycle: 'monthly' | 'yearly' } | null>(null);
  const paymentWindowRef = useRef<Window | null>(null);
  const windowCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  // Listen for postMessage from payment callback window
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const { type, reference } = event.data || {};
      if (!reference || !pendingPlanRef.current) return;

      if (type === 'PAYSTACK_SUCCESS') {
        // Payment succeeded — confirm the plan change
        try {
          setUpgradeLoading(true);
          await billingApi.confirmPlanChange(
            pendingPlanRef.current.planId,
            pendingPlanRef.current.billingCycle,
            reference
          );
          setUpgradeSuccess(true);
          queryClient.invalidateQueries({ queryKey: ['billing'] });
          setTimeout(() => setUpgradeSuccess(false), 3000);
        } catch (err) {
          console.error('Failed to confirm plan change:', err);
        } finally {
          setUpgradeLoading(false);
          pendingPlanRef.current = null;
        }
      } else if (type === 'PAYSTACK_FAILED' || type === 'PAYSTACK_ERROR') {
        pendingPlanRef.current = null;
        setUpgradeLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [queryClient]);

  // Cleanup window check interval
  useEffect(() => {
    return () => {
      if (windowCheckRef.current) clearInterval(windowCheckRef.current);
    };
  }, []);

  // Change plan — for free plans, switches immediately; for paid, opens Paystack
  const changePlanMutation = useMutation({
    mutationFn: ({ planId, cycle }: { planId: string; cycle: 'monthly' | 'yearly' }) =>
      billingApi.changePlan(planId, cycle),
    onSuccess: (data, variables) => {
      if (data.paymentUrl) {
        // Paid plan — store pending plan info and open Paystack popup
        pendingPlanRef.current = { planId: variables.planId, billingCycle: variables.cycle };
        setUpgradeLoading(true);

        paymentWindowRef.current = window.open(
          data.paymentUrl,
          `PaystackPlan_${Date.now()}`,
          'width=600,height=700,scrollbars=yes'
        );

        // Watch for popup close without completing payment
        if (windowCheckRef.current) clearInterval(windowCheckRef.current);
        windowCheckRef.current = setInterval(() => {
          if (paymentWindowRef.current?.closed) {
            if (windowCheckRef.current) clearInterval(windowCheckRef.current);
            // If still pending after popup closed, reset state
            if (pendingPlanRef.current) {
              pendingPlanRef.current = null;
              setUpgradeLoading(false);
            }
          }
        }, 1000);
      } else {
        // Free plan — already switched
        queryClient.invalidateQueries({ queryKey: ['billing'] });
        setUpgradeSuccess(true);
        setTimeout(() => setUpgradeSuccess(false), 3000);
      }
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: () => billingApi.cancelSubscription(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
    },
  });

  const handleUpgrade = useCallback((planId: string) => {
    changePlanMutation.mutate({ planId, cycle: billingCycle });
  }, [billingCycle, changePlanMutation]);

  if (user?.role !== 'manager') {
    return <EmptyState title="Access denied" description="Manager role required." />;
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const currentPlanId = billing?.subscription?.planId || 'starter';
  const currentPlan = billing?.plan;
  const activePlans = plans.filter(p => p.id !== 'payg');
  const paygPlan = plans.find(p => p.id === 'payg');
  const PlanIcon = PLAN_ICONS[currentPlanId] || Zap;
  const gradient = PLAN_GRADIENTS[currentPlanId] || PLAN_GRADIENTS.starter;

  // Usage stats from real data
  const usage = billing?.realUsage;
  const usageStats = [
    {
      label: 'Branches', icon: Store,
      current: usage?.branchCount || 0,
      limit: currentPlan?.maxBranches,
    },
    {
      label: 'Clerks', icon: Users,
      current: usage?.clerkCount || 0,
      limit: currentPlan?.maxClerksPerBranch ? (currentPlan.maxClerksPerBranch * (currentPlan.maxBranches || 1)) : null,
    },
    {
      label: 'Orders this month', icon: ShoppingBag,
      current: usage?.ordersThisMonth || 0,
      limit: currentPlan?.maxOrdersPerMonth,
    },
    {
      label: 'Active services', icon: Wrench,
      current: usage?.activeServiceCount || 0,
      limit: currentPlan?.maxActiveServices,
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      <PageHeader title="Billing & Plans" description="Manage your subscription and monitor usage" />

      {/* Upgrade success banner */}
      {upgradeSuccess && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <Check size={20} className="text-green-500 flex-shrink-0" />
          <p className="text-sm font-medium text-green-700 dark:text-green-300">
            Plan upgraded successfully! Your new features are now active.
          </p>
        </div>
      )}

      {/* Upgrade in progress */}
      {upgradeLoading && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 animate-pulse">
          <Clock size={20} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Waiting for payment confirmation...
          </p>
        </div>
      )}

      {/* ─── Current Plan Banner ───────────────────────────────────── */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${gradient} p-6 text-white`}>
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10"><PlanIcon size={256} /></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <PlanIcon size={28} />
            <span className="text-sm font-medium uppercase tracking-wider opacity-80">Current Plan</span>
            {billing?.subscription?.status === 'cancelled' && (
              <Badge color="red">Cancelling</Badge>
            )}
          </div>
          <h2 className="text-3xl font-bold mb-1">{currentPlan?.name || 'Starter'}</h2>
          <p className="text-sm opacity-80 mb-4">{currentPlan?.tagline}</p>
          <div className="flex items-end gap-6">
            <div>
              <span className="text-4xl font-bold">
                {currentPlan?.priceMonthly === 0
                  ? 'Free'
                  : `GHS ${billing?.subscription?.billingCycle === 'yearly'
                      ? currentPlan?.priceYearly?.toFixed(0)
                      : currentPlan?.priceMonthly?.toFixed(0)}`}
              </span>
              {currentPlan && currentPlan.priceMonthly > 0 && (
                <span className="text-sm opacity-70">
                  /{billing?.subscription?.billingCycle === 'yearly' ? 'year' : 'month'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
              <TrendingUp size={16} />
              <span className="text-sm font-medium">{currentPlan?.commissionRate}% commission</span>
            </div>
          </div>
          {billing?.subscription?.currentPeriodEnd && (
            <p className="text-xs opacity-60 mt-3">
              {billing.subscription.status === 'cancelled' ? 'Active until' : 'Renews on'}{' '}
              {new Date(billing.subscription.currentPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      {/* ─── Usage Overview ────────────────────────────────────────── */}
      <Section title="Usage Overview">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {usageStats.map((stat) => {
            const pct = stat.limit ? Math.round((stat.current / stat.limit) * 100) : null;
            const warn = pct !== null && pct >= 80;
            return (
              <Card key={stat.label} className="rounded-2xl" padding="sm">
                <div className="p-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className={cn('text-sm font-medium', t.textSecondary)}>{stat.label}</span>
                    <stat.icon size={18} className={warn ? 'text-amber-500' : t.isDark ? 'text-gray-500' : 'text-gray-400'} />
                  </div>
                  <div className="flex items-end justify-between mb-2">
                    <span className={cn('text-2xl font-bold', t.text)}>{stat.current}</span>
                    <span className={cn('text-sm', t.textSecondary)}>{stat.limit ? `/ ${stat.limit}` : 'Unlimited'}</span>
                  </div>
                  {stat.limit ? (
                    <div className={cn('w-full h-2 rounded-full', t.isDark ? 'bg-gray-700' : 'bg-gray-100')}>
                      <div className={cn('h-2 rounded-full transition-all', warn ? 'bg-amber-500' : 'bg-green-500')} style={{ width: `${Math.min(pct!, 100)}%` }} />
                    </div>
                  ) : (
                    <div className="w-full h-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 opacity-30" />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </Section>

      {/* ─── Feature Access ─────────────────────────────────────────── */}
      {currentPlan && (
        <Section title="Your Features">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: 'Analytics', enabled: currentPlan.hasAnalytics, icon: BarChart3 },
              { label: 'WhatsApp', enabled: currentPlan.hasWhatsapp, icon: MessageCircle },
              { label: 'Catalog', enabled: currentPlan.hasWhatsappCatalog, icon: ShoppingBag },
              { label: 'Broadcast', enabled: currentPlan.hasWhatsappBroadcast, icon: Receipt },
              { label: 'Labels', enabled: currentPlan.hasWhatsappLabels, icon: Shield },
              { label: 'Polls', enabled: currentPlan.hasWhatsappPolls, icon: BarChart3 },
              { label: 'CRM', enabled: currentPlan.hasCrm, icon: Users },
              { label: 'Auto-reply', enabled: currentPlan.hasWhatsappAutoresponder, icon: Zap },
              { label: 'Roles', enabled: currentPlan.hasCustomRoles, icon: Shield },
              { label: 'API Access', enabled: currentPlan.hasApiAccess, icon: Wrench },
            ].map((feat) => (
              <div
                key={feat.label}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium',
                  feat.enabled
                    ? t.isDark ? 'bg-green-900/20 border-green-800 text-green-400' : 'bg-green-50 border-green-200 text-green-700'
                    : t.isDark ? 'bg-gray-800 border-gray-700 text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-400',
                )}
              >
                <feat.icon size={14} />
                {feat.label}
                {feat.enabled ? <Check size={12} className="ml-auto text-green-500" /> : <AlertCircle size={12} className="ml-auto opacity-40" />}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ─── Billing Cycle Toggle ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className={cn('text-lg font-semibold', t.text)}>Available Plans</h3>
        <div className={cn('flex items-center gap-1 p-1 rounded-lg', t.isDark ? 'bg-gray-800 border border-gray-700' : 'bg-gray-100')}>
          {(['monthly', 'yearly'] as const).map(cycle => (
            <button
              key={cycle}
              onClick={() => setBillingCycle(cycle)}
              className={cn(
                'px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5',
                billingCycle === cycle ? 'bg-amber-400 text-gray-900' : t.isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {cycle === 'monthly' ? 'Monthly' : 'Yearly'}
              {cycle === 'yearly' && (
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-bold', billingCycle === 'yearly' ? 'bg-gray-900 text-amber-400' : 'bg-green-500/20 text-green-500')}>-20%</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Plan Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {activePlans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isUpgrade = plan.sortOrder > (currentPlan?.sortOrder || 0);
          const displayPrice = billingCycle === 'yearly' && plan.priceYearly > 0
            ? `GHS ${plan.priceYearly.toFixed(0)}`
            : plan.priceMonthly === 0 ? 'Free' : `GHS ${plan.priceMonthly.toFixed(0)}`;
          const PIcon = PLAN_ICONS[plan.id] || Zap;
          const grad = PLAN_GRADIENTS[plan.id] || PLAN_GRADIENTS.starter;
          const isPopular = plan.id === 'growth';

          return (
            <div
              key={plan.id}
              className={cn(
                'relative rounded-2xl border overflow-hidden transition-all',
                t.isDark ? 'bg-gray-800' : 'bg-white',
                isPopular ? (t.isDark ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-amber-400 ring-1 ring-amber-400/30') : t.border,
                isCurrent && 'ring-2 ring-amber-400',
              )}
            >
              {isPopular && (
                <div className="absolute top-4 right-4">
                  <Badge color="amber" className="gap-1 text-[10px] uppercase tracking-wider"><Star size={10} />Popular</Badge>
                </div>
              )}
              {isCurrent && !isPopular && (
                <div className="absolute top-4 right-4"><Badge color="green" className="text-[10px] uppercase tracking-wider">Current</Badge></div>
              )}

              <div className="p-6 pb-4">
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br', grad)}>
                  <PIcon size={24} color="white" />
                </div>
                <h4 className={cn('text-xl font-bold mb-1', t.text)}>{plan.name}</h4>
                <p className={cn('text-sm', t.textSecondary)}>{plan.tagline}</p>
              </div>

              <div className="px-6 pb-4">
                {(() => {
                  const prevPrice = billingCycle === 'yearly' ? plan.previousPriceYearly : plan.previousPriceMonthly;
                  const currentPrice = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
                  const priceDropped = prevPrice != null && prevPrice > currentPrice && plan.priceChangedAt;
                  const commissionDropped = plan.previousCommissionRate != null && plan.previousCommissionRate > plan.commissionRate && plan.priceChangedAt;

                  return (
                    <>
                      {/* Price */}
                      <div>
                        {priceDropped && (
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={cn('text-sm line-through', t.isDark ? 'text-gray-500' : 'text-gray-400')}>
                              GHS {prevPrice!.toFixed(0)}
                            </span>
                            <Badge color="green" className="text-[9px]">Price Drop</Badge>
                          </div>
                        )}
                        <div className="flex items-baseline gap-1">
                          <span className={cn('text-3xl font-bold', priceDropped ? 'text-green-500' : t.text)}>
                            {displayPrice}
                          </span>
                          {plan.priceMonthly > 0 && (
                            <span className={cn('text-sm', t.textSecondary)}>/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                          )}
                        </div>
                      </div>

                      {/* Commission */}
                      <div className={cn('flex items-center gap-2 mt-2 text-sm', t.textSecondary)}>
                        <Banknote size={14} className="flex-shrink-0" />
                        {commissionDropped ? (
                          <span className="flex items-center gap-1.5">
                            <span className="line-through opacity-60">{plan.previousCommissionRate}%</span>
                            <span className="text-green-500 font-semibold">{plan.commissionRate}%</span>
                            <span>commission</span>
                          </span>
                        ) : (
                          <span>{plan.commissionRate}% commission per order</span>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className={cn('mx-6 border-t', t.borderSubtle)} />

              <div className="p-6 pt-4 space-y-2.5">
                {[
                  { label: `${plan.maxBranches ?? 'Unlimited'} branch${plan.maxBranches !== 1 ? 'es' : ''}`, on: true },
                  { label: `${plan.maxClerksPerBranch ?? 'Unlimited'} clerks/branch`, on: true },
                  { label: plan.maxOrdersPerMonth ? `${plan.maxOrdersPerMonth} orders/mo` : 'Unlimited orders', on: true },
                  { label: 'WhatsApp messaging', on: plan.hasWhatsapp },
                  { label: 'Catalog & Polls', on: plan.hasWhatsappCatalog },
                  { label: 'Broadcast campaigns', on: plan.hasWhatsappBroadcast },
                  { label: 'CRM & Labels', on: plan.hasCrm },
                  { label: 'Auto-responder', on: plan.hasWhatsappAutoresponder },
                  { label: 'Analytics' + (plan.hasAnalyticsExport ? ' + Export' : ''), on: plan.hasAnalytics },
                  { label: 'Priority support', on: plan.hasPrioritySupport },
                ].map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className={cn('mt-0.5 flex-shrink-0', f.on ? 'text-green-500' : t.isDark ? 'text-gray-600' : 'text-gray-300')}>
                      <Check size={14} />
                    </div>
                    <span className={cn('text-sm', f.on
                      ? (t.isDark ? 'text-gray-200' : 'text-gray-700')
                      : (t.isDark ? 'text-gray-600 line-through' : 'text-gray-400 line-through')
                    )}>
                      {f.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="px-6 pb-6">
                {isCurrent ? (
                  billing?.subscription?.status !== 'cancelled' && currentPlanId !== 'starter' && currentPlanId !== 'payg' ? (
                    <Button
                      variant="danger"
                      size="sm"
                      className="w-full rounded-xl"
                      onClick={() => cancelMutation.mutate()}
                      loading={cancelMutation.isPending}
                    >
                      Cancel Plan
                    </Button>
                  ) : (
                    <Button variant="secondary" disabled className="w-full rounded-xl">Current Plan</Button>
                  )
                ) : isUpgrade ? (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={changePlanMutation.isPending || upgradeLoading}
                    className={cn('w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all bg-gradient-to-r text-white hover:opacity-90 hover:shadow-lg disabled:opacity-50', grad)}
                  >
                    {(changePlanMutation.isPending || upgradeLoading) ? 'Processing...' : <>Upgrade to {plan.name}<ArrowRight size={16} /></>}
                  </button>
                ) : (
                  <Button variant="secondary" className="w-full rounded-xl" onClick={() => handleUpgrade(plan.id)}>
                    Downgrade
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Pay-As-You-Go ──────────────────────────────────────────── */}
      {paygPlan && (
        <Card className="rounded-2xl" padding="lg">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', t.isDark ? 'bg-emerald-900/40' : 'bg-emerald-100')}>
                  <Banknote size={22} className="text-emerald-500" />
                </div>
                <div>
                  <h4 className={cn('text-lg font-bold', t.text)}>{paygPlan.name}</h4>
                  <p className={cn('text-sm', t.textSecondary)}>{paygPlan.tagline}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                {['No monthly fee', `${paygPlan.commissionRate}% commission per order`, 'Same features as Starter', 'Unlimited orders'].map((f, i) => (
                  <Badge key={i} color="gray" className="gap-1.5 px-3 py-1.5 rounded-lg text-xs"><Check size={12} className="text-emerald-500" />{f}</Badge>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center lg:items-end gap-2">
              <div className="text-center lg:text-right">
                <span className={cn('text-3xl font-bold', t.text)}>GHS 0</span>
                <span className={cn('text-sm', t.textSecondary)}>/month</span>
              </div>
              {currentPlanId !== 'payg' && (
                <Button
                  variant="secondary"
                  onClick={() => handleUpgrade('payg')}
                  className={cn('mt-1 rounded-xl', t.isDark ? 'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200')}
                >
                  Switch to Pay-As-You-Go
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ─── Commission Breakdown ──────────────────────────────────── */}
      <Card className="rounded-2xl" padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={20} className="text-amber-500" />
          <h3 className={cn('text-lg font-semibold', t.text)}>Commission Breakdown</h3>
        </div>
        <p className={cn('text-sm mb-4', t.textSecondary)}>See how commission affects your earnings on a GHS 200 order</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {activePlans.map((plan) => {
            const commission = 200 * (plan.commissionRate / 100);
            const prevCommission = plan.previousCommissionRate != null && plan.previousCommissionRate > plan.commissionRate
              ? 200 * (plan.previousCommissionRate / 100) : null;
            const commissionDropped = prevCommission !== null;
            return (
              <div key={plan.id} className={cn('p-4 rounded-xl border', t.borderSubtle, plan.id === currentPlanId && 'ring-1 ring-amber-400')}>
                <div className="flex items-center justify-between mb-3">
                  <p className={cn('text-sm font-medium', t.textSecondary)}>
                    {plan.name}
                    {plan.id === currentPlanId && <span className="text-amber-500 ml-1">(Current)</span>}
                  </p>
                  {commissionDropped && <Badge color="green" className="text-[9px]">Reduced</Badge>}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className={t.textSecondary}>Order value</span>
                    <span className={t.text}>GHS 200.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className={t.textSecondary}>
                      Commission ({plan.commissionRate}%)
                    </span>
                    <span className="text-red-400">- GHS {commission.toFixed(2)}</span>
                  </div>
                  {commissionDropped && (
                    <div className={cn('flex justify-between text-xs', t.isDark ? 'text-gray-500' : 'text-gray-400')}>
                      <span>Was {plan.previousCommissionRate}%</span>
                      <span className="line-through">- GHS {prevCommission!.toFixed(2)}</span>
                    </div>
                  )}
                  <div className={cn('border-t pt-2', t.borderSubtle)}>
                    <div className="flex justify-between text-sm font-semibold">
                      <span className={t.isDark ? 'text-gray-300' : 'text-gray-700'}>Your payout</span>
                      <span className="text-green-500">GHS {(200 - commission).toFixed(2)}</span>
                    </div>
                    {commissionDropped && (
                      <div className={cn('flex justify-between text-xs mt-0.5', t.isDark ? 'text-gray-500' : 'text-gray-400')}>
                        <span>Was</span>
                        <span className="line-through">GHS {(200 - prevCommission!).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

    </div>
  );
}
