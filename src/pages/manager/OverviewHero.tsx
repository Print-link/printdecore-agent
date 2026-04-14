import { useAuthStore } from "../../stores/authStore";
import { cn, formatCurrency, formatCount } from "../../lib/utils";
import { useThemeClasses } from "../../lib/theme";
import {
  ShoppingBag,
  BarChart3,
  TrendingUp,
  Store,
} from "../../components/icons";
import type { ManagerOverviewStats } from "../../types";
import type { IconProps } from "../../components/icons";

interface OverviewHeroProps {
  stats: ManagerOverviewStats;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface KpiItemProps {
  label: string;
  value: string;
  sub: string;
  icon: (props: IconProps) => React.ReactNode;
  iconColor: string;
  iconBg: string;
}

function KpiItem({ label, value, sub, icon: Icon, iconColor, iconBg }: KpiItemProps) {
  const t = useThemeClasses();
  return (
    <div className={cn("flex items-center gap-3 p-4 rounded-xl border", t.surface)}>
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: iconBg }}
      >
        <Icon size={20} style={{ color: iconColor }} />
      </div>
      <div className="min-w-0">
        <p className={cn("text-[10px] uppercase tracking-wider font-medium", t.textTertiary)}>
          {label}
        </p>
        <p className={cn("text-lg font-bold tabular-nums leading-tight", t.text)}>
          {value}
        </p>
        <p className={cn("text-[10px]", t.textTertiary)}>{sub}</p>
      </div>
    </div>
  );
}

export default function OverviewHero({ stats }: OverviewHeroProps) {
  const { user } = useAuthStore();
  const t = useThemeClasses();
  const firstName = user?.firstName || user?.name?.split(" ")[0] || "Manager";

  const avgOrderValue =
    stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;
  const completionRate =
    stats.totalOrders > 0
      ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(0)
      : "0";

  return (
    <div className="space-y-4">
      {/* Greeting + summary */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={cn("text-xl font-bold", t.text)}>
            {getGreeting()}, {firstName}
          </h1>
          <p className={cn("text-xs mt-0.5", t.textTertiary)}>
            Here's how your business is performing across all branches
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <p className={cn("text-2xl font-extrabold tabular-nums", t.text)}>
            {formatCurrency(stats.totalRevenue, {
              compact: stats.totalRevenue >= 100000,
            })}
          </p>
          <p className={cn("text-[10px]", t.textTertiary)}>Total Revenue</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiItem
          label="This Month"
          value={formatCurrency(stats.thisMonthRevenue, { compact: true })}
          sub={`${stats.thisMonthOrders} orders`}
          icon={TrendingUp}
          iconColor="#fbbf24"
          iconBg={t.isDark ? "rgba(251,191,36,0.12)" : "rgba(251,191,36,0.1)"}
        />
        <KpiItem
          label="Total Orders"
          value={formatCount(stats.totalOrders)}
          sub={`${stats.todayOrders} today`}
          icon={ShoppingBag}
          iconColor="#3b82f6"
          iconBg={t.isDark ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.1)"}
        />
        <KpiItem
          label="Avg. Order Value"
          value={formatCurrency(avgOrderValue, { compact: true })}
          sub={`${completionRate}% completion rate`}
          icon={BarChart3}
          iconColor="#10b981"
          iconBg={t.isDark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.1)"}
        />
        <KpiItem
          label="Branches"
          value={String(stats.branchCount)}
          sub={`${stats.activeBranchCount} active`}
          icon={Store}
          iconColor="#8b5cf6"
          iconBg={t.isDark ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.1)"}
        />
      </div>
    </div>
  );
}
