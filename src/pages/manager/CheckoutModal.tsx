import { useState } from 'react';
import { Modal, Button } from '../../components/ui';
import { Check, Shield, Banknote, Crown, Rocket, Diamond, Zap } from '../../components/icons';
import type { Plan } from '../../services/api/billing';
import { useThemeClasses } from '../../lib/theme';
import { cn } from '../../lib/utils';

const PLAN_ICONS: Record<string, typeof Crown> = {
  starter: Zap, growth: Rocket, enterprise: Diamond, payg: Banknote,
};

const PLAN_GRADIENTS: Record<string, string> = {
  starter: 'from-gray-500 to-gray-700',
  growth: 'from-amber-500 to-amber-600',
  enterprise: 'from-purple-600 to-indigo-700',
  payg: 'from-emerald-500 to-emerald-700',
};

interface CheckoutModalProps {
  open: boolean;
  plan: Plan | null;
  currentPlanName?: string;
  billingCycle: 'monthly' | 'yearly';
  loading: boolean;
  onConfirm: (cycle: 'monthly' | 'yearly') => void;
  onClose: () => void;
}

export default function CheckoutModal({
  open, plan, currentPlanName, billingCycle: initialCycle,
  loading, onConfirm, onClose,
}: CheckoutModalProps) {
  const t = useThemeClasses();
  const [cycle, setCycle] = useState(initialCycle);

  if (!plan) return null;

  const PIcon = PLAN_ICONS[plan.id] || Zap;
  const gradient = PLAN_GRADIENTS[plan.id] || PLAN_GRADIENTS.starter;
  const price = cycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
  const monthlyEquiv = cycle === 'yearly' ? (plan.priceYearly / 12) : plan.priceMonthly;
  const isFree = plan.priceMonthly === 0 && plan.priceYearly === 0;
  const savings = cycle === 'yearly' ? Math.round((1 - plan.priceYearly / (plan.priceMonthly * 12)) * 100) : 0;

  const features = [
    { label: `${plan.maxBranches ?? 'Unlimited'} branch${plan.maxBranches !== 1 ? 'es' : ''}`, on: true },
    { label: `${plan.maxClerksPerBranch ?? 'Unlimited'} clerks per branch`, on: true },
    { label: plan.maxOrdersPerMonth ? `${plan.maxOrdersPerMonth} orders/month` : 'Unlimited orders', on: true },
    { label: 'WhatsApp messaging', on: plan.hasWhatsapp },
    { label: 'Catalog & Polls', on: plan.hasWhatsappCatalog },
    { label: 'Broadcast campaigns', on: plan.hasWhatsappBroadcast },
    { label: 'CRM & Labels', on: plan.hasCrm },
    { label: 'Analytics' + (plan.hasAnalyticsExport ? ' + Export' : ''), on: plan.hasAnalytics },
    { label: 'Priority support', on: plan.hasPrioritySupport },
  ].filter(f => f.on);

  return (
    <Modal open={open} onClose={onClose} maxWidth="lg">
      <div className="flex flex-col lg:flex-row">
        {/* Left: Plan Info */}
        <div className={cn('flex-1 p-6 lg:p-8 lg:border-r', t.border)}>
          <div className="flex items-center gap-3 mb-6">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br', gradient)}>
              <PIcon size={24} color="white" />
            </div>
            <div>
              <h2 className={cn('text-xl font-bold', t.text)}>Get {plan.name}</h2>
              {currentPlanName && currentPlanName !== plan.name && (
                <p className={cn('text-xs', t.textTertiary)}>Upgrading from {currentPlanName}</p>
              )}
            </div>
          </div>

          {/* Plan benefits */}
          <div className={cn('rounded-xl border p-4 mb-6', t.isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200')}>
            <p className={cn('text-xs font-semibold uppercase tracking-wider mb-3', t.textTertiary)}>
              What you get with {plan.name}
            </p>
            <div className="space-y-2.5">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <Check size={16} className="text-green-500 flex-shrink-0" />
                  <span className={cn('text-sm', t.text)}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Commission */}
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-amber-500" />
            <span className={cn('text-sm', t.textSecondary)}>
              {plan.commissionRate}% commission per completed order
            </span>
          </div>
        </div>

        {/* Right: Billing Summary */}
        <div className="flex-1 p-6 lg:p-8">
          <h3 className={cn('text-lg font-bold mb-5', t.text)}>Billing</h3>

          {/* Billing cycle toggle */}
          {!isFree && (
            <div className={cn('flex items-center gap-1 p-1 rounded-xl mb-6', t.isDark ? 'bg-gray-800 border border-gray-700' : 'bg-gray-100')}>
              {(['monthly', 'yearly'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  className={cn(
                    'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all text-center',
                    cycle === c ? 'bg-amber-400 text-gray-900 shadow-sm' : t.isDark ? 'text-gray-400' : 'text-gray-500',
                  )}
                >
                  {c === 'monthly' ? 'Monthly' : 'Annual'}
                  {c === 'yearly' && savings > 0 && (
                    <span className={cn('ml-1.5 text-[10px] font-bold', cycle === 'yearly' ? 'text-gray-800' : 'text-green-500')}>
                      Save {savings}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Price breakdown */}
          <div className={cn('rounded-xl border p-5 mb-6', t.isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200')}>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className={t.textSecondary}>{plan.name} plan</span>
                <span className={t.text}>
                  {isFree ? 'Free' : `GHS ${monthlyEquiv.toFixed(2)}/mo`}
                </span>
              </div>

              {cycle === 'yearly' && !isFree && (
                <div className="flex justify-between text-sm">
                  <span className={t.textSecondary}>Billed annually</span>
                  <span className={t.text}>GHS {price.toFixed(2)}/yr</span>
                </div>
              )}

              {cycle === 'yearly' && savings > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-500">Annual savings</span>
                  <span className="text-green-500 font-medium">
                    - GHS {((plan.priceMonthly * 12) - plan.priceYearly).toFixed(2)}
                  </span>
                </div>
              )}

              <div className={cn('border-t pt-3 mt-3', t.borderSubtle)}>
                <div className="flex justify-between">
                  <span className={cn('text-sm font-semibold', t.text)}>
                    {isFree ? 'Total' : cycle === 'yearly' ? 'Charged today' : 'Charged monthly'}
                  </span>
                  <span className={cn('text-2xl font-bold', t.text)}>
                    {isFree ? 'Free' : `GHS ${price.toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Confirm button */}
          <Button
            onClick={() => onConfirm(cycle)}
            loading={loading}
            className={cn('w-full py-3 rounded-xl text-base font-semibold bg-gradient-to-r text-white', gradient)}
          >
            {isFree ? `Switch to ${plan.name}` : `Confirm and pay`}
          </Button>

          {/* Terms */}
          {!isFree && (
            <div className={cn('mt-4 space-y-1')}>
              <p className={cn('text-[11px] leading-relaxed', t.textTertiary)}>
                <strong>Secure payment:</strong> Processed via Paystack with SSL encryption.
              </p>
              <p className={cn('text-[11px] leading-relaxed', t.textTertiary)}>
                <strong>{cycle === 'yearly' ? 'Annual' : 'Monthly'} renewal:</strong> Your subscription will automatically renew. You&apos;ll be charged GHS {price.toFixed(2)} on the renewal date.
              </p>
              <p className={cn('text-[11px] leading-relaxed', t.textTertiary)}>
                <strong>Cancel:</strong> You can cancel anytime from the Billing page.
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
