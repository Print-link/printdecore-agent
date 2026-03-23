import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { billingApi, type BillingInfo, type Plan } from '../../services/api/billing';
import { Card, PageHeader, Button, Badge, EmptyState } from '../../components/ui';
import { useThemeClasses } from '../../lib/theme';
import { cn } from '../../lib/utils';
import {
  Crown, Rocket, Diamond, Zap, Check, ArrowRight, Star,
  Banknote, Clock, AlertCircle,
} from '../../components/icons';

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

export default function BillingPage() {
  const { user } = useAuthStore();
  const t = useThemeClasses();
  const queryClient = useQueryClient();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const { data: billing, isLoading } = useQuery<BillingInfo>({
    queryKey: ['billing', 'me'],
    queryFn: () => billingApi.getMyBilling(),
    staleTime: 30000,
  });

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ['billing', 'plans'],
    queryFn: () => billingApi.getPlans(),
    staleTime: 60000,
  });

  // Payment popup handling
  const pendingPlanRef = useRef<{ planId: string; billingCycle: 'monthly' | 'yearly' } | null>(null);
  const paymentWindowRef = useRef<Window | null>(null);
  const windowCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const { type, reference } = event.data || {};
      if (!reference || !pendingPlanRef.current) return;

      if (type === 'PAYSTACK_SUCCESS') {
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

  useEffect(() => {
    return () => {
      if (windowCheckRef.current) clearInterval(windowCheckRef.current);
    };
  }, []);

  const changePlanMutation = useMutation({
    mutationFn: ({ planId, cycle }: { planId: string; cycle: 'monthly' | 'yearly' }) =>
      billingApi.changePlan(planId, cycle),
    onSuccess: (data, variables) => {
      if (data.paymentUrl) {
        pendingPlanRef.current = { planId: variables.planId, billingCycle: variables.cycle };
        setUpgradeLoading(true);
        paymentWindowRef.current = window.open(
          data.paymentUrl,
          `PaystackPlan_${Date.now()}`,
          'width=600,height=700,scrollbars=yes'
        );
        if (windowCheckRef.current) clearInterval(windowCheckRef.current);
        windowCheckRef.current = setInterval(() => {
          if (paymentWindowRef.current?.closed) {
            if (windowCheckRef.current) clearInterval(windowCheckRef.current);
            if (pendingPlanRef.current) {
              pendingPlanRef.current = null;
              setUpgradeLoading(false);
            }
          }
        }, 1000);
      } else {
        queryClient.invalidateQueries({ queryKey: ['billing'] });
        setUpgradeSuccess(true);
        setTimeout(() => setUpgradeSuccess(false), 3000);
      }
    },
  });

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
      <div className="space-y-6 max-w-4xl animate-pulse">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
      </div>
    );
  }

  const currentPlanId = billing?.subscription?.planId || 'starter';
  const currentPlan = billing?.plan;
  const trial = billing?.trial;
  const isTrialing = trial?.isTrialing;
  const activePlans = plans.filter(p => p.id !== 'payg');

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Billing & Plans"
        description={isTrialing
          ? `Free trial — ${trial!.daysRemaining} day${trial!.daysRemaining !== 1 ? 's' : ''} remaining`
          : "Manage your subscription"
        }
      />

      {/* Status banners */}
      {upgradeSuccess && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <Check size={18} className="text-green-500 flex-shrink-0" />
          <p className="text-sm font-medium text-green-700 dark:text-green-300">
            Plan updated successfully!
          </p>
        </div>
      )}

      {upgradeLoading && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 animate-pulse">
          <Clock size={18} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Waiting for payment confirmation...
          </p>
        </div>
      )}

      {/* ─── Trial / Current Plan Card ────────────────────────────── */}
      <Card className="rounded-2xl overflow-hidden" padding="none">
        {isTrialing ? (
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 p-6 text-white">
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />
            <div className="absolute top-6 right-20 w-3 h-3 rounded-full bg-amber-400/60" />
            <div className="absolute bottom-10 right-10 w-2 h-2 rounded-full bg-purple-300/40" />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Diamond size={18} />
                    </div>
                    <span className="text-sm font-semibold uppercase tracking-wider text-purple-200">Free Trial</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-1">All features unlocked</h2>
                  <p className="text-sm text-purple-200">
                    Enjoy full Enterprise access until{' '}
                    {new Date(trial!.trialEndsAt!).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="text-center bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3">
                  <p className={cn('text-3xl font-bold', trial!.daysRemaining <= 3 ? 'text-red-300' : 'text-white')}>
                    {trial!.daysRemaining}
                  </p>
                  <p className="text-[11px] text-purple-200 font-medium">days left</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-white/20 mb-4">
                <div
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    trial!.daysRemaining <= 3 ? 'bg-red-400' : 'bg-amber-400',
                  )}
                  style={{ width: `${Math.min(100, ((trial!.totalDays - trial!.daysRemaining) / trial!.totalDays) * 100)}%` }}
                />
              </div>

              {/* Feature highlights */}
              <div className="flex flex-wrap gap-2">
                {['Unlimited branches', 'WhatsApp', 'CRM', 'Broadcasts', 'Analytics', '0% commission'].map(f => (
                  <span key={f} className="flex items-center gap-1 text-xs bg-white/15 backdrop-blur-sm rounded-full px-2.5 py-1 text-purple-100">
                    <Check size={10} className="text-amber-400" />
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className={`p-6 bg-gradient-to-r ${PLAN_GRADIENTS[currentPlanId] || PLAN_GRADIENTS.starter} text-white`}>
            <div className="flex items-center gap-3 mb-1">
              {(() => { const Icon = PLAN_ICONS[currentPlanId] || Zap; return <Icon size={22} />; })()}
              <span className="text-sm font-medium uppercase tracking-wider opacity-80">Current Plan</span>
              {billing?.subscription?.status === 'cancelled' && <Badge color="red">Cancelling</Badge>}
            </div>
            <h2 className="text-2xl font-bold">{currentPlan?.name || 'Starter'}</h2>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-3xl font-bold">
                {currentPlan?.priceMonthly === 0
                  ? 'Free'
                  : `GHS ${billing?.subscription?.billingCycle === 'yearly'
                      ? currentPlan?.priceYearly?.toFixed(0)
                      : currentPlan?.priceMonthly?.toFixed(0)}`}
              </span>
              {currentPlan && currentPlan.priceMonthly > 0 && (
                <span className="text-sm opacity-70">/{billing?.subscription?.billingCycle === 'yearly' ? 'year' : 'month'}</span>
              )}
              <span className="text-sm bg-white/20 rounded-lg px-2.5 py-1">{currentPlan?.commissionRate}% commission</span>
            </div>
            {billing?.subscription?.currentPeriodEnd && (
              <p className="text-xs opacity-60 mt-2">
                {billing.subscription.status === 'cancelled' ? 'Active until' : 'Renews on'}{' '}
                {new Date(billing.subscription.currentPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* ─── Plans Section (hidden during trial) ──────────────────── */}
      {isTrialing ? (
        <Card className="rounded-2xl" padding="lg">
          <div className="text-center py-4">
            <AlertCircle size={24} className={cn('mx-auto mb-3', t.isDark ? 'text-gray-500' : 'text-gray-400')} />
            <p className={cn('text-sm font-medium mb-1', t.text)}>
              You're on a free trial with all features unlocked
            </p>
            <p className={cn('text-sm', t.textSecondary)}>
              After your trial ends, you'll be automatically moved to the <strong>Starter</strong> plan. You can upgrade to a paid plan at that time.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-between">
            <h3 className={cn('text-lg font-semibold', t.text)}>Choose a Plan</h3>
            <div className={cn('flex items-center gap-1 p-1 rounded-lg', t.isDark ? 'bg-gray-800 border border-gray-700' : 'bg-gray-100')}>
              {(['monthly', 'yearly'] as const).map(cycle => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5',
                    billingCycle === cycle ? 'bg-amber-400 text-gray-900' : t.isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700',
                  )}
                >
                  {cycle === 'monthly' ? 'Monthly' : 'Yearly'}
                  {cycle === 'yearly' && (
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-bold', billingCycle === 'yearly' ? 'bg-gray-900 text-amber-400' : 'bg-green-500/20 text-green-500')}>Save 20%</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activePlans.map((plan) => {
              const isCurrent = plan.id === currentPlanId;
              const isUpgrade = plan.sortOrder > (currentPlan?.sortOrder || 0);
              const displayPrice = billingCycle === 'yearly' && plan.priceYearly > 0
                ? `GHS ${plan.priceYearly.toFixed(0)}`
                : plan.priceMonthly === 0 ? 'Free' : `GHS ${plan.priceMonthly.toFixed(0)}`;
              const PIcon = PLAN_ICONS[plan.id] || Zap;
              const isRecommended = plan.id === 'growth';

              return (
                <div
                  key={plan.id}
                  className={cn(
                    'relative rounded-2xl border overflow-hidden',
                    t.isDark ? 'bg-gray-800' : 'bg-white',
                    isRecommended ? (t.isDark ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-amber-400 ring-1 ring-amber-400/30') : t.border,
                    isCurrent && 'ring-2 ring-green-400',
                  )}
                >
                  {isRecommended && (
                    <div className="bg-amber-400 text-gray-900 text-center py-1 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                      <Star size={12} /> Recommended
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <PIcon size={20} className={t.isDark ? 'text-gray-300' : 'text-gray-700'} />
                      <h4 className={cn('text-lg font-bold', t.text)}>{plan.name}</h4>
                      {isCurrent && <Badge color="green" className="text-[10px]">Current</Badge>}
                    </div>

                    <div className="mb-4">
                      <div className="flex items-baseline gap-1">
                        <span className={cn('text-2xl font-bold', t.text)}>{displayPrice}</span>
                        {plan.priceMonthly > 0 && (
                          <span className={cn('text-sm', t.textSecondary)}>/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                        )}
                      </div>
                      <p className={cn('text-xs mt-1', t.textSecondary)}>{plan.commissionRate}% commission per order</p>
                    </div>

                    <div className={cn('border-t pt-3 space-y-2', t.borderSubtle)}>
                      {[
                        `${plan.maxBranches ?? '∞'} branch${(plan.maxBranches ?? 0) !== 1 ? 'es' : ''}`,
                        `${plan.maxClerksPerBranch ?? '∞'} clerks/branch`,
                        plan.maxOrdersPerMonth ? `${plan.maxOrdersPerMonth} orders/mo` : 'Unlimited orders',
                        plan.hasWhatsapp ? 'WhatsApp messaging' : null,
                        plan.hasCrm ? 'CRM & contacts' : null,
                        plan.hasWhatsappBroadcast ? 'Broadcast campaigns' : null,
                        plan.hasPrioritySupport ? 'Priority support' : null,
                      ].filter(Boolean).map((f, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Check size={14} className="text-green-500 flex-shrink-0" />
                          <span className={cn('text-sm', t.isDark ? 'text-gray-300' : 'text-gray-600')}>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="px-5 pb-5">
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
                        className={cn(
                          'w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all text-white hover:opacity-90 disabled:opacity-50',
                          `bg-gradient-to-r ${PLAN_GRADIENTS[plan.id] || PLAN_GRADIENTS.starter}`,
                        )}
                      >
                        {(changePlanMutation.isPending || upgradeLoading) ? 'Processing...' : <>Choose {plan.name} <ArrowRight size={14} /></>}
                      </button>
                    ) : (
                      <Button variant="secondary" className="w-full rounded-xl" onClick={() => handleUpgrade(plan.id)}>
                        Switch to {plan.name}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
