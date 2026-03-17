import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Crown,
  Rocket,
  Diamond,
  Zap,
  Check,
  Store,
  Users,
  ShoppingBag,
  BarChart3,
  MessageCircle,
  Shield,
  Wrench,
  TrendingUp,
  Banknote,
  ArrowRight,
  Star,
} from '../../components/icons';

// ─── Plan Data ────────────────────────────────────────────────────────

type PlanId = 'starter' | 'growth' | 'enterprise' | 'payg';

interface PlanFeature {
  label: string;
  included: boolean;
  detail?: string;
}

interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  price: number;
  priceLabel: string;
  commission: string;
  icon: typeof Crown;
  color: string;        // tailwind accent
  bgGradient: string;   // card header gradient
  popular?: boolean;
  features: PlanFeature[];
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Get started for free',
    price: 0,
    priceLabel: 'Free',
    commission: '8%',
    icon: Zap,
    color: 'gray',
    bgGradient: 'from-gray-500 to-gray-700',
    features: [
      { label: '1 branch', included: true },
      { label: '2 clerks', included: true },
      { label: '100 orders/month', included: true },
      { label: '10 active services', included: true },
      { label: 'Basic dashboard', included: true },
      { label: 'WhatsApp messaging', included: false },
      { label: 'Custom roles & permissions', included: false },
      { label: 'Analytics & reports', included: false },
      { label: 'Activity log', included: false },
      { label: 'Paystack sub-account', included: false },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'Scale your print business',
    price: 150,
    priceLabel: 'GHS 150',
    commission: '5%',
    icon: Rocket,
    color: 'amber',
    bgGradient: 'from-amber-500 to-amber-600',
    popular: true,
    features: [
      { label: 'Up to 3 branches', included: true },
      { label: '5 clerks per branch', included: true },
      { label: 'Unlimited orders', included: true },
      { label: '50 active services', included: true },
      { label: 'Full analytics', included: true },
      { label: 'WhatsApp messaging', included: true, detail: '1 number' },
      { label: '3 custom roles', included: true },
      { label: 'User management', included: true },
      { label: 'Activity log', included: true, detail: '30 days' },
      { label: 'Paystack sub-account', included: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Unlimited everything',
    price: 450,
    priceLabel: 'GHS 450',
    commission: '0%',
    icon: Diamond,
    color: 'purple',
    bgGradient: 'from-purple-600 to-indigo-700',
    features: [
      { label: 'Unlimited branches', included: true },
      { label: 'Unlimited clerks', included: true },
      { label: 'Unlimited orders', included: true },
      { label: 'Unlimited services', included: true },
      { label: 'Full analytics + export', included: true },
      { label: 'Unlimited WhatsApp numbers', included: true },
      { label: 'Unlimited roles', included: true },
      { label: 'Bulk user operations', included: true },
      { label: 'Unlimited activity log', included: true },
      { label: 'Priority support (4hr)', included: true },
    ],
  },
];

const PAYG_PLAN = {
  id: 'payg' as PlanId,
  name: 'Pay-As-You-Go',
  tagline: 'Only pay when you earn',
  commission: '8%',
  icon: Banknote,
  features: [
    'No monthly fee',
    '8% commission per completed order',
    'Same features as Starter',
    'Unlimited orders (no monthly cap)',
    'Best for seasonal or low-volume businesses',
  ],
};

// ─── Usage Stat Cards ─────────────────────────────────────────────────

interface UsageStat {
  label: string;
  current: number;
  limit: number | null; // null = unlimited
  icon: typeof Store;
}

// ─── Component ────────────────────────────────────────────────────────

export default function BillingPage() {
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const d = theme === 'dark';

  // Simulated current plan — in production this comes from the backend
  const [currentPlan] = useState<PlanId>('starter');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Simulated usage stats
  const usageStats: UsageStat[] = [
    { label: 'Branches', current: 1, limit: currentPlan === 'starter' || currentPlan === 'payg' ? 1 : currentPlan === 'growth' ? 3 : null, icon: Store },
    { label: 'Clerks', current: 2, limit: currentPlan === 'starter' || currentPlan === 'payg' ? 2 : currentPlan === 'growth' ? 15 : null, icon: Users },
    { label: 'Orders this month', current: 34, limit: currentPlan === 'starter' ? 100 : null, icon: ShoppingBag },
    { label: 'Active services', current: 6, limit: currentPlan === 'starter' || currentPlan === 'payg' ? 10 : currentPlan === 'growth' ? 50 : null, icon: Wrench },
  ];

  if (user?.role !== 'manager') {
    return (
      <div className={`p-6 text-center ${d ? 'text-gray-400' : 'text-gray-600'}`}>
        Access denied. Manager role required.
      </div>
    );
  }

  const activePlan = PLANS.find(p => p.id === currentPlan) || PLANS[0];

  const cardBase = `rounded-2xl border transition-all ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`;
  const subtleText = d ? 'text-gray-400' : 'text-gray-500';
  const headingText = d ? 'text-gray-100' : 'text-gray-900';

  return (
    <div className="space-y-8 max-w-6xl">
      {/* ─── Header ────────────────────────────────────────────────── */}
      <div>
        <h1 className={`text-2xl font-bold ${headingText}`}>Billing & Plans</h1>
        <p className={`text-sm mt-1 ${subtleText}`}>
          Manage your subscription and monitor usage
        </p>
      </div>

      {/* ─── Current Plan Banner ───────────────────────────────────── */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${activePlan.bgGradient} p-6 text-white`}>
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
          <activePlan.icon size={256} />
        </div>
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
      <div>
        <h3 className={`text-lg font-semibold mb-4 ${headingText}`}>Usage Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {usageStats.map((stat) => {
            const percentage = stat.limit ? Math.round((stat.current / stat.limit) * 100) : null;
            const isNearLimit = percentage !== null && percentage >= 80;
            return (
              <div key={stat.label} className={cardBase + ' p-4'}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-sm font-medium ${subtleText}`}>{stat.label}</span>
                  <stat.icon size={18} className={isNearLimit ? 'text-amber-500' : d ? 'text-gray-500' : 'text-gray-400'} />
                </div>
                <div className="flex items-end justify-between mb-2">
                  <span className={`text-2xl font-bold ${headingText}`}>{stat.current}</span>
                  <span className={`text-sm ${subtleText}`}>
                    {stat.limit ? `/ ${stat.limit}` : 'Unlimited'}
                  </span>
                </div>
                {stat.limit && (
                  <div className={`w-full h-2 rounded-full ${d ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isNearLimit ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(percentage!, 100)}%` }}
                    />
                  </div>
                )}
                {!stat.limit && (
                  <div className={`w-full h-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 opacity-30`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Billing Cycle Toggle ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${headingText}`}>Available Plans</h3>
        <div className={`flex items-center gap-1 p-1 rounded-lg ${d ? 'bg-gray-800 border border-gray-700' : 'bg-gray-100'}`}>
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              billingCycle === 'monthly'
                ? 'bg-amber-400 text-gray-900'
                : d ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
              billingCycle === 'yearly'
                ? 'bg-amber-400 text-gray-900'
                : d ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Yearly
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              billingCycle === 'yearly'
                ? 'bg-gray-900 text-amber-400'
                : 'bg-green-500/20 text-green-500'
            }`}>
              -20%
            </span>
          </button>
        </div>
      </div>

      {/* ─── Plan Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const isUpgrade = PLANS.indexOf(plan) > PLANS.indexOf(activePlan);
          const yearlyPrice = Math.round(plan.price * 12 * 0.8);
          const displayPrice = billingCycle === 'yearly' && plan.price > 0
            ? `GHS ${yearlyPrice}`
            : plan.priceLabel;
          const PlanIcon = plan.icon;

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border overflow-hidden transition-all ${
                plan.popular
                  ? d ? 'border-amber-500/50 ring-1 ring-amber-500/20' : 'border-amber-400 ring-1 ring-amber-400/30'
                  : d ? 'border-gray-700' : 'border-gray-200'
              } ${d ? 'bg-gray-800' : 'bg-white'} ${
                isCurrent ? 'ring-2 ring-amber-400' : ''
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute top-4 right-4">
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-gray-900 text-[10px] font-bold uppercase tracking-wider">
                    <Star size={10} />
                    Popular
                  </span>
                </div>
              )}

              {/* Current badge */}
              {isCurrent && (
                <div className="absolute top-4 right-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    d ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700'
                  }`}>
                    Current Plan
                  </span>
                </div>
              )}

              {/* Card header */}
              <div className="p-6 pb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br ${plan.bgGradient}`}>
                  <PlanIcon size={24} color="white" />
                </div>
                <h4 className={`text-xl font-bold mb-1 ${headingText}`}>{plan.name}</h4>
                <p className={`text-sm ${subtleText}`}>{plan.tagline}</p>
              </div>

              {/* Pricing */}
              <div className="px-6 pb-4">
                <div className="flex items-end gap-1">
                  <span className={`text-3xl font-bold ${headingText}`}>{displayPrice}</span>
                  {plan.price > 0 && (
                    <span className={`text-sm mb-1 ${subtleText}`}>
                      /{billingCycle === 'yearly' ? 'year' : 'month'}
                    </span>
                  )}
                </div>
                <div className={`flex items-center gap-2 mt-2 text-sm ${subtleText}`}>
                  <Banknote size={14} />
                  <span>{plan.commission} commission per order</span>
                </div>
              </div>

              {/* Divider */}
              <div className={`mx-6 border-t ${d ? 'border-gray-700' : 'border-gray-100'}`} />

              {/* Features */}
              <div className="p-6 pt-4 space-y-3">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`mt-0.5 flex-shrink-0 ${
                      feature.included
                        ? 'text-green-500'
                        : d ? 'text-gray-600' : 'text-gray-300'
                    }`}>
                      <Check size={16} />
                    </div>
                    <span className={`text-sm ${
                      feature.included
                        ? d ? 'text-gray-200' : 'text-gray-700'
                        : d ? 'text-gray-600 line-through' : 'text-gray-400 line-through'
                    }`}>
                      {feature.label}
                      {feature.detail && (
                        <span className={`ml-1 text-xs ${subtleText}`}>({feature.detail})</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="px-6 pb-6">
                {isCurrent ? (
                  <button
                    disabled
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold cursor-default ${
                      d ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    Current Plan
                  </button>
                ) : isUpgrade ? (
                  <button
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all bg-gradient-to-r ${plan.bgGradient} text-white hover:opacity-90 hover:shadow-lg`}
                  >
                    Upgrade to {plan.name}
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      d ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Downgrade
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Pay-As-You-Go Card ────────────────────────────────────── */}
      <div className={`${cardBase} p-6`}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                d ? 'bg-emerald-900/40' : 'bg-emerald-100'
              }`}>
                <PAYG_PLAN.icon size={22} className="text-emerald-500" />
              </div>
              <div>
                <h4 className={`text-lg font-bold ${headingText}`}>{PAYG_PLAN.name}</h4>
                <p className={`text-sm ${subtleText}`}>{PAYG_PLAN.tagline}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              {PAYG_PLAN.features.map((f, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                    d ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Check size={12} className="text-emerald-500" />
                  {f}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center lg:items-end gap-2">
            <div className="text-center lg:text-right">
              <span className={`text-3xl font-bold ${headingText}`}>GHS 0</span>
              <span className={`text-sm ${subtleText}`}>/month</span>
            </div>
            <span className={`text-sm ${subtleText}`}>8% per completed order</span>
            {currentPlan !== 'payg' && (
              <button className={`mt-1 px-6 py-2 rounded-xl text-sm font-semibold transition-all ${
                d ? 'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              }`}>
                Switch to Pay-As-You-Go
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Commission Breakdown ──────────────────────────────────── */}
      <div className={cardBase + ' p-6'}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={20} className="text-amber-500" />
          <h3 className={`text-lg font-semibold ${headingText}`}>Commission Breakdown</h3>
        </div>
        <p className={`text-sm mb-4 ${subtleText}`}>
          See how commission affects your earnings on a GHS 200 order
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { plan: 'Starter / PAYG', rate: '8%', commission: 16, payout: 184, color: 'gray' },
            { plan: 'Growth', rate: '5%', commission: 10, payout: 190, color: 'amber' },
            { plan: 'Enterprise', rate: '0%', commission: 0, payout: 200, color: 'purple' },
          ].map((item) => (
            <div
              key={item.plan}
              className={`p-4 rounded-xl border ${d ? 'border-gray-700' : 'border-gray-100'}`}
            >
              <p className={`text-sm font-medium mb-3 ${subtleText}`}>{item.plan}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className={d ? 'text-gray-400' : 'text-gray-500'}>Order value</span>
                  <span className={headingText}>GHS 200.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={d ? 'text-gray-400' : 'text-gray-500'}>Commission ({item.rate})</span>
                  <span className="text-red-400">- GHS {item.commission.toFixed(2)}</span>
                </div>
                <div className={`border-t pt-2 ${d ? 'border-gray-700' : 'border-gray-100'}`}>
                  <div className="flex justify-between text-sm font-semibold">
                    <span className={d ? 'text-gray-300' : 'text-gray-700'}>Your payout</span>
                    <span className="text-green-500">GHS {item.payout.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Features Comparison ───────────────────────────────────── */}
      <div className={cardBase + ' overflow-hidden'}>
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={20} className="text-amber-500" />
            <h3 className={`text-lg font-semibold ${headingText}`}>Full Feature Comparison</h3>
          </div>
          <p className={`text-sm ${subtleText}`}>Everything included in each plan at a glance</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={d ? 'bg-gray-700/50' : 'bg-gray-50'}>
                <th className={`text-left px-6 py-3 font-medium ${subtleText}`}>Feature</th>
                {PLANS.map(p => (
                  <th key={p.id} className={`text-center px-4 py-3 font-semibold ${
                    p.id === currentPlan ? 'text-amber-500' : headingText
                  }`}>
                    {p.name}
                    {p.id === currentPlan && <span className="block text-[10px] text-amber-500 font-medium">CURRENT</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
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
              ].map((row, i) => (
                <tr
                  key={row.feature}
                  className={`border-t ${d ? 'border-gray-700' : 'border-gray-100'} ${
                    i % 2 === 0 ? '' : d ? 'bg-gray-800/50' : 'bg-gray-50/50'
                  }`}
                >
                  <td className={`px-6 py-3 font-medium ${d ? 'text-gray-300' : 'text-gray-700'}`}>
                    {row.feature}
                  </td>
                  {row.values.map((val, j) => (
                    <td key={j} className="text-center px-4 py-3">
                      {val === true ? (
                        <Check size={16} className="text-green-500 mx-auto" />
                      ) : val === false ? (
                        <span className={d ? 'text-gray-600' : 'text-gray-300'}>&mdash;</span>
                      ) : (
                        <span className={d ? 'text-gray-200' : 'text-gray-700'}>{val}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
