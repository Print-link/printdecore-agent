import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Card, PageHeader, Button, Badge, Section, EmptyState } from '../../components/ui';
import { useThemeClasses } from '../../lib/theme';
import { cn } from '../../lib/utils';
import {
  Crown, Rocket, Diamond, Zap, Check, Store, Users, ShoppingBag,
  BarChart3, Shield, Wrench, TrendingUp, Banknote, ArrowRight, Star,
} from '../../components/icons';

// ─── Plan Data ────────────────────────────────────────────────────────

type PlanId = 'starter' | 'growth' | 'enterprise' | 'payg';

interface PlanFeature { label: string; included: boolean; detail?: string; }

interface Plan {
  id: PlanId; name: string; tagline: string; price: number; priceLabel: string;
  commission: string; icon: typeof Crown; color: string; bgGradient: string;
  popular?: boolean; features: PlanFeature[];
}

const PLANS: Plan[] = [
  {
    id: 'starter', name: 'Starter', tagline: 'Get started for free', price: 0, priceLabel: 'Free',
    commission: '8%', icon: Zap, color: 'gray', bgGradient: 'from-gray-500 to-gray-700',
    features: [
      { label: '1 branch', included: true }, { label: '2 clerks', included: true },
      { label: '100 orders/month', included: true }, { label: '10 active services', included: true },
      { label: 'Basic dashboard', included: true }, { label: 'WhatsApp messaging', included: false },
      { label: 'Custom roles & permissions', included: false }, { label: 'Analytics & reports', included: false },
      { label: 'Activity log', included: false }, { label: 'Paystack sub-account', included: false },
    ],
  },
  {
    id: 'growth', name: 'Growth', tagline: 'Scale your print business', price: 150, priceLabel: 'GHS 150',
    commission: '5%', icon: Rocket, color: 'amber', bgGradient: 'from-amber-500 to-amber-600', popular: true,
    features: [
      { label: 'Up to 3 branches', included: true }, { label: '5 clerks per branch', included: true },
      { label: 'Unlimited orders', included: true }, { label: '50 active services', included: true },
      { label: 'Full analytics', included: true }, { label: 'WhatsApp messaging', included: true, detail: '1 number' },
      { label: '3 custom roles', included: true }, { label: 'User management', included: true },
      { label: 'Activity log', included: true, detail: '30 days' }, { label: 'Paystack sub-account', included: true },
    ],
  },
  {
    id: 'enterprise', name: 'Enterprise', tagline: 'Unlimited everything', price: 450, priceLabel: 'GHS 450',
    commission: '0%', icon: Diamond, color: 'purple', bgGradient: 'from-purple-600 to-indigo-700',
    features: [
      { label: 'Unlimited branches', included: true }, { label: 'Unlimited clerks', included: true },
      { label: 'Unlimited orders', included: true }, { label: 'Unlimited services', included: true },
      { label: 'Full analytics + export', included: true }, { label: 'Unlimited WhatsApp numbers', included: true },
      { label: 'Unlimited roles', included: true }, { label: 'Bulk user operations', included: true },
      { label: 'Unlimited activity log', included: true }, { label: 'Priority support (4hr)', included: true },
    ],
  },
];

const PAYG_PLAN = {
  id: 'payg' as PlanId, name: 'Pay-As-You-Go', tagline: 'Only pay when you earn',
  commission: '8%', icon: Banknote,
  features: ['No monthly fee', '8% commission per completed order', 'Same features as Starter', 'Unlimited orders (no monthly cap)', 'Best for seasonal or low-volume businesses'],
};

const COMPARISON_ROWS = [
  { feature: 'Monthly price', values: ['Free', 'GHS 150', 'GHS 450'] },
  { feature: 'Commission rate', values: ['8%', '5%', '0%'] },
  { feature: 'Branches', values: ['1', 'Up to 3', 'Unlimited'] },
  { feature: 'Clerks per branch', values: ['2', '5', 'Unlimited'] },
  { feature: 'Monthly orders', values: ['100', 'Unlimited', 'Unlimited'] },
  { feature: 'Active services', values: ['10', '50', 'Unlimited'] },
  { feature: 'Dashboard analytics', values: ['Basic', 'Full', 'Full + Export'] },
  { feature: 'WhatsApp messaging', values: [false, '1 number', 'Unlimited'] },
  { feature: 'Custom roles', values: [false, '3 roles', 'Unlimited'] },
  { feature: 'User management', values: ['Invite only', 'Full', 'Full + Bulk'] },
  { feature: 'Activity log', values: [false, '30 days', 'Unlimited'] },
  { feature: 'Paystack payouts', values: [false, true, 'Multi-account'] },
  { feature: 'Support', values: ['Community', 'Email (48hr)', 'Priority (4hr)'] },
  { feature: 'White-label branding', values: [false, false, true] },
] as const;

// ─── Component ────────────────────────────────────────────────────────

export default function BillingPage() {
  const { user } = useAuthStore();
  const t = useThemeClasses();

  const [currentPlan] = useState<PlanId>('starter');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const usageStats = [
    { label: 'Branches', current: 1, limit: currentPlan === 'starter' || currentPlan === 'payg' ? 1 : currentPlan === 'growth' ? 3 : null, icon: Store },
    { label: 'Clerks', current: 2, limit: currentPlan === 'starter' || currentPlan === 'payg' ? 2 : currentPlan === 'growth' ? 15 : null, icon: Users },
    { label: 'Orders this month', current: 34, limit: currentPlan === 'starter' ? 100 : null, icon: ShoppingBag },
    { label: 'Active services', current: 6, limit: currentPlan === 'starter' || currentPlan === 'payg' ? 10 : currentPlan === 'growth' ? 50 : null, icon: Wrench },
  ];

  if (user?.role !== 'manager') {
    return <EmptyState title="Access denied" description="Manager role required." />;
  }

  const activePlan = PLANS.find(p => p.id === currentPlan) || PLANS[0];

  return (
    <div className="space-y-8 max-w-6xl">
      <PageHeader title="Billing & Plans" description="Manage your subscription and monitor usage" />

      {/* ─── Current Plan Banner ───────────────────────────────────── */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${activePlan.bgGradient} p-6 text-white`}>
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10"><activePlan.icon size={256} /></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <activePlan.icon size={28} />
            <span className="text-sm font-medium uppercase tracking-wider opacity-80">Current Plan</span>
          </div>
          <h2 className="text-3xl font-bold mb-1">{activePlan.name}</h2>
          <p className="text-sm opacity-80 mb-4">{activePlan.tagline}</p>
          <div className="flex items-end gap-6">
            <div>
              <span className="text-4xl font-bold">{activePlan.priceLabel}</span>
              {activePlan.price > 0 && <span className="text-sm opacity-70">/month</span>}
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
              <TrendingUp size={16} />
              <span className="text-sm font-medium">{activePlan.commission} commission</span>
            </div>
          </div>
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
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const isUpgrade = PLANS.indexOf(plan) > PLANS.indexOf(activePlan);
          const displayPrice = billingCycle === 'yearly' && plan.price > 0 ? `GHS ${Math.round(plan.price * 12 * 0.8)}` : plan.priceLabel;
          const PlanIcon = plan.icon;

          return (
            <div
              key={plan.id}
              className={cn(
                'relative rounded-2xl border overflow-hidden transition-all',
                t.isDark ? 'bg-gray-800' : 'bg-white',
                plan.popular ? (t.isDark ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-amber-400 ring-1 ring-amber-400/30') : t.border,
                isCurrent && 'ring-2 ring-amber-400',
              )}
            >
              {plan.popular && (
                <div className="absolute top-4 right-4">
                  <Badge color="amber" className="gap-1 text-[10px] uppercase tracking-wider"><Star size={10} />Popular</Badge>
                </div>
              )}
              {isCurrent && !plan.popular && (
                <div className="absolute top-4 right-4"><Badge color="green" className="text-[10px] uppercase tracking-wider">Current Plan</Badge></div>
              )}

              <div className="p-6 pb-4">
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br', plan.bgGradient)}>
                  <PlanIcon size={24} color="white" />
                </div>
                <h4 className={cn('text-xl font-bold mb-1', t.text)}>{plan.name}</h4>
                <p className={cn('text-sm', t.textSecondary)}>{plan.tagline}</p>
              </div>

              <div className="px-6 pb-4">
                <div className="flex items-end gap-1">
                  <span className={cn('text-3xl font-bold', t.text)}>{displayPrice}</span>
                  {plan.price > 0 && <span className={cn('text-sm mb-1', t.textSecondary)}>/{billingCycle === 'yearly' ? 'year' : 'month'}</span>}
                </div>
                <div className={cn('flex items-center gap-2 mt-2 text-sm', t.textSecondary)}>
                  <Banknote size={14} /><span>{plan.commission} commission per order</span>
                </div>
              </div>

              <div className={cn('mx-6 border-t', t.borderSubtle)} />

              <div className="p-6 pt-4 space-y-3">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={cn('mt-0.5 flex-shrink-0', f.included ? 'text-green-500' : t.isDark ? 'text-gray-600' : 'text-gray-300')}><Check size={16} /></div>
                    <span className={cn('text-sm', f.included ? (t.isDark ? 'text-gray-200' : 'text-gray-700') : (t.isDark ? 'text-gray-600 line-through' : 'text-gray-400 line-through'))}>
                      {f.label}{f.detail && <span className={cn('ml-1 text-xs', t.textSecondary)}>({f.detail})</span>}
                    </span>
                  </div>
                ))}
              </div>

              <div className="px-6 pb-6">
                {isCurrent ? (
                  <Button variant="secondary" disabled className="w-full rounded-xl">Current Plan</Button>
                ) : isUpgrade ? (
                  <button className={cn('w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all bg-gradient-to-r text-white hover:opacity-90 hover:shadow-lg', plan.bgGradient)}>
                    Upgrade to {plan.name}<ArrowRight size={16} />
                  </button>
                ) : (
                  <Button variant="secondary" className="w-full rounded-xl">Downgrade</Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Pay-As-You-Go Card ────────────────────────────────────── */}
      <Card className="rounded-2xl" padding="lg">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', t.isDark ? 'bg-emerald-900/40' : 'bg-emerald-100')}>
                <PAYG_PLAN.icon size={22} className="text-emerald-500" />
              </div>
              <div>
                <h4 className={cn('text-lg font-bold', t.text)}>{PAYG_PLAN.name}</h4>
                <p className={cn('text-sm', t.textSecondary)}>{PAYG_PLAN.tagline}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              {PAYG_PLAN.features.map((f, i) => (
                <Badge key={i} color="gray" className="gap-1.5 px-3 py-1.5 rounded-lg text-xs"><Check size={12} className="text-emerald-500" />{f}</Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center lg:items-end gap-2">
            <div className="text-center lg:text-right">
              <span className={cn('text-3xl font-bold', t.text)}>GHS 0</span>
              <span className={cn('text-sm', t.textSecondary)}>/month</span>
            </div>
            <span className={cn('text-sm', t.textSecondary)}>8% per completed order</span>
            {currentPlan !== 'payg' && (
              <Button variant="secondary" className={cn('mt-1 rounded-xl', t.isDark ? 'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200')}>
                Switch to Pay-As-You-Go
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ─── Commission Breakdown ──────────────────────────────────── */}
      <Card className="rounded-2xl" padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={20} className="text-amber-500" />
          <h3 className={cn('text-lg font-semibold', t.text)}>Commission Breakdown</h3>
        </div>
        <p className={cn('text-sm mb-4', t.textSecondary)}>See how commission affects your earnings on a GHS 200 order</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { plan: 'Starter / PAYG', rate: '8%', commission: 16, payout: 184 },
            { plan: 'Growth', rate: '5%', commission: 10, payout: 190 },
            { plan: 'Enterprise', rate: '0%', commission: 0, payout: 200 },
          ].map((item) => (
            <div key={item.plan} className={cn('p-4 rounded-xl border', t.borderSubtle)}>
              <p className={cn('text-sm font-medium mb-3', t.textSecondary)}>{item.plan}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className={t.textSecondary}>Order value</span><span className={t.text}>GHS 200.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={t.textSecondary}>Commission ({item.rate})</span><span className="text-red-400">- GHS {item.commission.toFixed(2)}</span>
                </div>
                <div className={cn('border-t pt-2', t.borderSubtle)}>
                  <div className="flex justify-between text-sm font-semibold">
                    <span className={t.isDark ? 'text-gray-300' : 'text-gray-700'}>Your payout</span>
                    <span className="text-green-500">GHS {item.payout.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ─── Features Comparison ───────────────────────────────────── */}
      <Card className="rounded-2xl overflow-hidden" padding="none">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={20} className="text-amber-500" />
            <h3 className={cn('text-lg font-semibold', t.text)}>Full Feature Comparison</h3>
          </div>
          <p className={cn('text-sm', t.textSecondary)}>Everything included in each plan at a glance</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={t.isDark ? 'bg-gray-700/50' : 'bg-gray-50'}>
                <th className={cn('text-left px-6 py-3 font-medium', t.textSecondary)}>Feature</th>
                {PLANS.map(p => (
                  <th key={p.id} className={cn('text-center px-4 py-3 font-semibold', p.id === currentPlan ? 'text-amber-500' : t.text)}>
                    {p.name}
                    {p.id === currentPlan && <span className="block text-[10px] text-amber-500 font-medium">CURRENT</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, i) => (
                <tr key={row.feature} className={cn('border-t', t.borderSubtle, i % 2 !== 0 && (t.isDark ? 'bg-gray-800/50' : 'bg-gray-50/50'))}>
                  <td className={cn('px-6 py-3 font-medium', t.isDark ? 'text-gray-300' : 'text-gray-700')}>{row.feature}</td>
                  {row.values.map((val, j) => (
                    <td key={j} className="text-center px-4 py-3">
                      {val === true ? <Check size={16} className="text-green-500 mx-auto" />
                        : val === false ? <span className={t.isDark ? 'text-gray-600' : 'text-gray-300'}>&mdash;</span>
                        : <span className={t.isDark ? 'text-gray-200' : 'text-gray-700'}>{val}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
