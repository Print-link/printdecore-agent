/**
 * Overview Dashboard Charts
 *
 * Charts specific to the manager overview page:
 *   1. MonthlyRevenueHistogram — revenue by month (last 12 months)
 *   2. BranchRevenuePie        — revenue distribution by branch
 *   3. OrderStatusPie           — order status breakdown donut
 *   4. CategoryRevenueBar       — top categories by revenue
 *   5. DailyActivityTrend       — daily order/revenue trend line
 */

import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { useThemeClasses } from "../../../lib/theme";
import { cn, formatCurrency } from "../../../lib/utils";
import type {
  MonthlyRevenueTrend,
  BranchPerformanceStats,
  ManagerOverviewStats,
  CategoryAnalytics,
  WeeklyActivityItem,
} from "../../../types";

// ─── Shared ─────────────────────────────────────────────────────────────

const BRANCH_COLORS = [
  "#fbbf24",
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#f97316",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

function useChartTheme() {
  const t = useThemeClasses();
  return {
    isDark: t.isDark,
    textColor: t.isDark ? "#9ca3af" : "#6b7280",
    gridColor: t.isDark ? "#374151" : "#f3f4f6",
    bg: t.isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200",
  };
}

function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ct = useChartTheme();
  const t = useThemeClasses();
  return (
    <div className={cn("p-5 rounded-xl border", ct.bg, className)}>
      <div className="mb-4">
        <h3 className={cn("text-sm font-semibold", t.text)}>{title}</h3>
        {subtitle && (
          <p className={cn("text-xs mt-0.5", t.textTertiary)}>{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── 1. Monthly Revenue Histogram ───────────────────────────────────────

interface MonthlyRevenueHistogramProps {
  data: MonthlyRevenueTrend[];
  className?: string;
}

export function MonthlyRevenueHistogram({
  data,
  className,
}: MonthlyRevenueHistogramProps) {
  const ct = useChartTheme();
  const t = useThemeClasses();

  if (data.length === 0) {
    return (
      <ChartCard title="Revenue Trend" subtitle="Monthly" className={className}>
        <p className={cn("text-xs text-center py-16", t.textTertiary)}>
          No revenue data yet
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Revenue Trend"
      subtitle="Last 12 months"
      className={className}
    >
      <BarChart
        height={280}
        xAxis={[
          {
            data: data.map((d) => d.label),
            scaleType: "band",
            tickLabelStyle: { fontSize: 11, fill: ct.textColor },
          },
        ]}
        yAxis={[
          {
            tickLabelStyle: { fontSize: 10, fill: ct.textColor },
            valueFormatter: (v: number | null) =>
              formatCurrency((v ?? 0) as number, { compact: true }),
          },
        ]}
        series={[
          {
            data: data.map((d) => d.revenue),
            label: "Revenue",
            color: "#fbbf24",
            valueFormatter: (v: number | null) =>
              formatCurrency((v ?? 0) as number),
          },
        ]}
        grid={{ horizontal: true }}
        hideLegend
        borderRadius={6}
        margin={{ left: 65, right: 10, top: 10, bottom: 30 }}
        sx={{
          "& .MuiChartsGrid-line": { stroke: ct.gridColor },
          "& .MuiChartsAxis-line": { stroke: ct.gridColor },
          "& .MuiChartsAxis-tick": { stroke: ct.gridColor },
        }}
      />
    </ChartCard>
  );
}

// ─── 2. Branch Revenue Pie ──────────────────────────────────────────────

interface BranchRevenuePieProps {
  branches: BranchPerformanceStats[];
  className?: string;
}

export function BranchRevenuePie({
  branches,
  className,
}: BranchRevenuePieProps) {
  const t = useThemeClasses();

  const sorted = [...branches]
    .filter((b) => b.totalRevenue > 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  // Show top 7, group rest as "Other"
  const top = sorted.slice(0, 7);
  const rest = sorted.slice(7);
  const otherRevenue = rest.reduce((sum, b) => sum + b.totalRevenue, 0);

  const data = top.map((b, i) => ({
    id: b.branchId,
    label: b.branchName,
    value: b.totalRevenue,
    color: BRANCH_COLORS[i % BRANCH_COLORS.length],
  }));

  if (otherRevenue > 0) {
    data.push({
      id: "other",
      label: "Other",
      value: otherRevenue,
      color: "#6b7280",
    });
  }

  if (data.length === 0) {
    return (
      <ChartCard
        title="Revenue by Branch"
        subtitle="Distribution"
        className={className}
      >
        <p className={cn("text-xs text-center py-10", t.textTertiary)}>
          No revenue data yet
        </p>
      </ChartCard>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ChartCard
      title="Revenue by Branch"
      subtitle="All time"
      className={className}
    >
      <div className="flex items-center gap-4">
        <PieChart
          height={200}
          width={200}
          series={[
            {
              data,
              innerRadius: 50,
              outerRadius: 90,
              paddingAngle: 2,
              cornerRadius: 4,
              highlightScope: { fade: "global", highlight: "item" },
              valueFormatter: (v) => formatCurrency(v.value),
            },
          ]}
          hideLegend
          margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
        />
        <div className="flex-1 space-y-2 min-w-0">
          {data.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span
                  className={cn("text-xs truncate", t.textSecondary)}
                >
                  {d.label}
                </span>
              </div>
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums shrink-0",
                  t.text,
                )}
              >
                {total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

// ─── 3. Order Status Pie ────────────────────────────────────────────────

const STATUS_PALETTE = [
  { key: "completed", label: "Completed", color: "#10b981" },
  { key: "inProgress", label: "In Progress", color: "#8b5cf6" },
  { key: "paid", label: "Paid", color: "#3b82f6" },
  { key: "quoted", label: "Quoted", color: "#f59e0b" },
  { key: "pending", label: "Pending", color: "#ef4444" },
];

interface OrderStatusDonutProps {
  stats: ManagerOverviewStats;
  className?: string;
}

export function OrderStatusDonut({
  stats,
  className,
}: OrderStatusDonutProps) {
  const t = useThemeClasses();

  const data = STATUS_PALETTE.map((s) => ({
    id: s.key,
    label: s.label,
    value: (stats as any)[`${s.key}Orders`] || 0,
    color: s.color,
  })).filter((d) => d.value > 0);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (data.length === 0) {
    return (
      <ChartCard
        title="Order Status"
        subtitle="Distribution"
        className={className}
      >
        <p className={cn("text-xs text-center py-10", t.textTertiary)}>
          No orders yet
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Order Status"
      subtitle={`${total} total orders`}
      className={className}
    >
      <div className="flex items-center gap-4">
        <PieChart
          height={200}
          width={200}
          series={[
            {
              data,
              innerRadius: 50,
              outerRadius: 90,
              paddingAngle: 2,
              cornerRadius: 4,
              highlightScope: { fade: "global", highlight: "item" },
            },
          ]}
          hideLegend
          margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
        />
        <div className="flex-1 space-y-2">
          {data.map((d) => (
            <div key={d.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: d.color }}
                />
                <span className={cn("text-xs", t.textSecondary)}>
                  {d.label}
                </span>
              </div>
              <span className={cn("text-xs font-bold tabular-nums", t.text)}>
                {d.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

// ─── 4. Category Revenue Bar ────────────────────────────────────────────

interface CategoryRevenueChartProps {
  categories: CategoryAnalytics[];
  className?: string;
}

export function CategoryRevenueChart({
  categories,
  className,
}: CategoryRevenueChartProps) {
  const ct = useChartTheme();
  const t = useThemeClasses();

  const top = [...categories]
    .filter((c) => (c.totalRevenue || 0) > 0)
    .sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
    .slice(0, 6);

  if (top.length === 0) {
    return (
      <ChartCard
        title="Top Categories"
        subtitle="By revenue"
        className={className}
      >
        <p className={cn("text-xs text-center py-10", t.textTertiary)}>
          No category data yet
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Top Categories"
      subtitle="By revenue (last 30 days)"
      className={className}
    >
      <BarChart
        height={220}
        layout="horizontal"
        yAxis={[
          {
            data: top.map((c) => c.categoryName),
            scaleType: "band",
            tickLabelStyle: { fontSize: 11, fill: ct.textColor },
          },
        ]}
        xAxis={[
          {
            tickLabelStyle: { fontSize: 10, fill: ct.textColor },
            valueFormatter: (v: any) =>
              formatCurrency(v as number, { compact: true }),
          },
        ]}
        series={[
          {
            data: top.map((c) => c.totalRevenue || 0),
            label: "Revenue",
            color: "#10b981",
            valueFormatter: (v: number | null) =>
              formatCurrency((v ?? 0) as number),
          },
        ]}
        grid={{ vertical: true }}
        hideLegend
        borderRadius={4}
        margin={{ left: 100, right: 10, top: 10, bottom: 30 }}
        sx={{
          "& .MuiChartsGrid-line": { stroke: ct.gridColor },
          "& .MuiChartsAxis-line": { stroke: ct.gridColor },
          "& .MuiChartsAxis-tick": { stroke: ct.gridColor },
        }}
      />
    </ChartCard>
  );
}

// ─── 5. Daily Activity Trend ────────────────────────────────────────────

interface DailyActivityTrendProps {
  activity: WeeklyActivityItem[];
  className?: string;
}

export function DailyActivityTrend({
  activity,
  className,
}: DailyActivityTrendProps) {
  const ct = useChartTheme();
  const t = useThemeClasses();

  // Take the last 30 entries
  const recent = activity.slice(-30);

  if (recent.length === 0) {
    return (
      <ChartCard
        title="Daily Activity"
        subtitle="Orders trend"
        className={className}
      >
        <p className={cn("text-xs text-center py-10", t.textTertiary)}>
          No activity data yet
        </p>
      </ChartCard>
    );
  }

  const labels = recent.map((d) => {
    const date = new Date(d.date);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  });

  return (
    <ChartCard
      title="Daily Activity"
      subtitle="Orders this month"
      className={className}
    >
      <LineChart
        height={220}
        xAxis={[
          {
            data: labels,
            scaleType: "point",
            tickLabelStyle: { fontSize: 10, fill: ct.textColor },
          },
        ]}
        yAxis={[
          {
            tickLabelStyle: { fontSize: 10, fill: ct.textColor },
            tickMinStep: 1,
          },
        ]}
        series={[
          {
            data: recent.map((d) => d.orders),
            label: "Orders",
            color: "#3b82f6",
            area: true,
            showMark: false,
            curve: "natural",
          },
          ...(recent.some((d) => (d.revenue || 0) > 0)
            ? [
                {
                  data: recent.map((d) => d.revenue || 0),
                  label: "Revenue",
                  color: "#fbbf24",
                  showMark: false as const,
                  curve: "natural" as const,
                  yAxisId: "revenue",
                },
              ]
            : []),
        ]}
        grid={{ horizontal: true }}
        hideLegend
        margin={{ left: 35, right: 10, top: 10, bottom: 30 }}
        sx={{
          "& .MuiChartsGrid-line": { stroke: ct.gridColor },
          "& .MuiChartsAxis-line": { stroke: ct.gridColor },
          "& .MuiChartsAxis-tick": { stroke: ct.gridColor },
          "& .MuiAreaElement-root": { opacity: 0.12 },
        }}
      />
    </ChartCard>
  );
}
