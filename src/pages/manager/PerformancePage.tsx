import { useQuery } from "@tanstack/react-query";
import { useThemeClasses } from "../../lib/theme";
import { cn, formatCurrency } from "../../lib/utils";
import { Card, PageHeader, EmptyState } from "../../components/ui";
import { TrendingUp, Star, Users, ShoppingBag } from "../../components/icons";
import { apiClient } from "../../services/api/client";

interface BranchPerformance {
  branchId: string;
  branchName: string;
  score: number;
  tier: string;
  completedOrders: number;
  totalOrders: number;
  completionRate: number;
  avgRating: number;
  totalRatings: number;
  totalRevenue: number;
  avgOrderValue: number;
  weeklyOrderVolume: number;
  monthlyOrderVolume: number;
  repeatCustomerRate: number;
}

// ─── Tier Visual Config ─────────────────────────────────────────────────

const TIER_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; bgDark: string }
> = {
  diamond: {
    label: "◆ Diamond",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-gradient-to-r from-blue-100 to-purple-100",
    bgDark: "bg-gradient-to-r from-blue-900/30 to-purple-900/30",
  },
  "5x": {
    label: "5x",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-100",
    bgDark: "bg-amber-900/30",
  },
  "4x": {
    label: "4x",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50",
    bgDark: "bg-amber-900/20",
  },
  "3x": {
    label: "3x",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50",
    bgDark: "bg-blue-900/20",
  },
  "2x": {
    label: "2x",
    color: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-100",
    bgDark: "bg-gray-700",
  },
  standard: {
    label: "Standard",
    color: "text-gray-500 dark:text-gray-500",
    bg: "bg-gray-50",
    bgDark: "bg-gray-800",
  },
};

// ─── Metric Bar ─────────────────────────────────────────────────────────

function MetricBar({
  label,
  value,
  max,
  suffix,
  color,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  color: string;
}) {
  const t = useThemeClasses();
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={cn("text-[11px]", t.textSecondary)}>{label}</span>
        <span className={cn("text-xs font-bold", t.text)}>
          {typeof value === "number" && suffix === "%"
            ? `${value.toFixed(1)}%`
            : value}
          {suffix && suffix !== "%" ? ` ${suffix}` : ""}
        </span>
      </div>
      <div
        className={cn(
          "h-1.5 rounded-full",
          t.isDark ? "bg-gray-700" : "bg-gray-100",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            color,
          )}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Branch Card ────────────────────────────────────────────────────────

function BranchPerformanceCard({ perf }: { perf: BranchPerformance }) {
  const t = useThemeClasses();
  const tier = TIER_CONFIG[perf.tier] || TIER_CONFIG.standard;

  return (
    <Card className="rounded-xl overflow-hidden">
      {/* Header with tier badge */}
      <div
        className={cn(
          "px-4 py-3 flex items-center justify-between",
          t.isDark ? tier.bgDark : tier.bg,
        )}
      >
        <div className="min-w-0">
          <h4 className={cn("text-sm font-bold truncate", t.text)}>
            {perf.branchName}
          </h4>
          <p className={cn("text-[11px]", t.textSecondary)}>
            Score: {perf.score}/100
          </p>
        </div>
        <span className={cn("text-lg font-black shrink-0 ml-3", tier.color)}>
          {tier.label}
        </span>
      </div>

      {/* Stats grid */}
      <div className="px-4 pt-3 pb-1 grid grid-cols-4 gap-3">
        <div className="text-center">
          <ShoppingBag size={14} className="mx-auto text-blue-500 mb-1" />
          <p className={cn("text-base font-bold", t.text)}>
            {perf.completedOrders}
          </p>
          <p className={cn("text-[10px]", t.textTertiary)}>Completed</p>
        </div>
        <div className="text-center">
          <Star size={14} className="mx-auto text-amber-500 mb-1" />
          <p className={cn("text-base font-bold", t.text)}>
            {perf.avgRating.toFixed(1)}
          </p>
          <p className={cn("text-[10px]", t.textTertiary)}>
            {perf.totalRatings} reviews
          </p>
        </div>
        <div className="text-center">
          <TrendingUp size={14} className="mx-auto text-emerald-500 mb-1" />
          <p className={cn("text-base font-bold", t.text)}>
            {formatCurrency(perf.totalRevenue, { compact: true })}
          </p>
          <p className={cn("text-[10px]", t.textTertiary)}>Revenue</p>
        </div>
        <div className="text-center">
          <Users size={14} className="mx-auto text-purple-500 mb-1" />
          <p className={cn("text-base font-bold", t.text)}>
            {perf.repeatCustomerRate.toFixed(0)}%
          </p>
          <p className={cn("text-[10px]", t.textTertiary)}>Returning</p>
        </div>
      </div>

      {/* Metric bars */}
      <div className="px-4 pb-4 pt-2 space-y-2.5">
        <MetricBar
          label="Completion Rate"
          value={perf.completionRate}
          max={100}
          suffix="%"
          color="bg-emerald-400"
        />
        <MetricBar
          label="Weekly Volume"
          value={perf.weeklyOrderVolume}
          max={Math.max(perf.monthlyOrderVolume, 1)}
          suffix="orders"
          color="bg-blue-400"
        />
        <MetricBar
          label="Avg Order Value"
          value={perf.avgOrderValue}
          max={perf.avgOrderValue * 2 || 100}
          suffix=""
          color="bg-amber-400"
        />
      </div>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────

export default function PerformancePage() {
  const t = useThemeClasses();

  const { data: branches = [], isLoading } = useQuery<BranchPerformance[]>({
    queryKey: ["performance", "my-branches"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: BranchPerformance[] }>(
        "/performance/my-branches",
      );
      return response.data?.data || [];
    },
    staleTime: 60000,
  });

  const aboveStandard = branches.filter((b) => b.tier !== "standard");

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Branch Performance"
        description="How your branches are performing on the marketplace. Tiers update every weekend."
      />

      {/* Tier legend */}
      <div className={cn("flex flex-wrap gap-2 text-[10px] font-bold")}>
        {Object.entries(TIER_CONFIG).map(([key, cfg]) => (
          <span
            key={key}
            className={cn(
              "px-2 py-1 rounded-full",
              cfg.color,
              t.isDark ? cfg.bgDark : cfg.bg,
            )}
          >
            {cfg.label}
          </span>
        ))}
      </div>

      {/* Summary */}
      {!isLoading && branches.length > 0 && (
        <div className={cn("text-sm", t.textSecondary)}>
          {aboveStandard.length} of {branches.length} branch
          {branches.length !== 1 ? "es" : ""} performing above standard
        </div>
      )}

      {/* Branch cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-64 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse"
            />
          ))}
        </div>
      ) : branches.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No performance data yet"
          description="Performance scores are calculated weekly. Check back after the first analysis runs."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map((perf) => (
            <BranchPerformanceCard key={perf.branchId} perf={perf} />
          ))}
        </div>
      )}
    </div>
  );
}
