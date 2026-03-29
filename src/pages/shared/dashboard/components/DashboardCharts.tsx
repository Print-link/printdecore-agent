/**
 * Dashboard Charts — MUI X Charts
 *
 * Three charts that replace the old card-heavy layout:
 *   1. RevenueBarChart  — revenue by period (today/week/month/all)
 *   2. OrderStatusPie   — status distribution donut
 *   3. WeeklyTrendLine  — daily order + revenue trend
 */

import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { useThemeClasses } from "../../../../lib/theme";
import { cn, formatCurrency } from "../../../../lib/utils";
import type {
  ManagerBranchStats,
  ManagerOverviewStats,
  CategoryAnalytics,
} from "../../../../types";

// ─── Shared chart theme ─────────────────────────────────────────────────

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
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ct = useChartTheme();
  const t = useThemeClasses();
  return (
    <div className={cn("p-4 rounded-xl border", ct.bg, className)}>
      <h3
        className={cn(
          "text-xs font-medium uppercase tracking-wide mb-3",
          t.textSecondary,
        )}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── 1. Revenue Bar Chart ───────────────────────────────────────────────

interface RevenueBarChartProps {
  stats: ManagerBranchStats | ManagerOverviewStats;
  isBranchView: boolean;
}

export function RevenueBarChart({ stats, isBranchView }: RevenueBarChartProps) {
  const ct = useChartTheme();
  const branchStats = stats as ManagerBranchStats;

  const periods = [
    { label: "Today", revenue: stats.todayRevenue, orders: stats.todayOrders },
    ...(isBranchView && "thisWeekRevenue" in branchStats
      ? [
          {
            label: "Week",
            revenue: branchStats.thisWeekRevenue,
            orders: branchStats.thisWeekOrders,
          },
        ]
      : []),
    {
      label: "Month",
      revenue: stats.thisMonthRevenue,
      orders: stats.thisMonthOrders,
    },
    {
      label: "All Time",
      revenue: stats.totalRevenue,
      orders: stats.totalOrders,
    },
  ];

  return (
    <ChartCard title="Revenue">
      <BarChart
        height={220}
        xAxis={[
          {
            data: periods.map((p) => p.label),
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
            data: periods.map((p) => p.revenue),
            label: "Revenue",
            color: "#fbbf24",
            valueFormatter: (v: number | null) => formatCurrency((v ?? 0) as number),
          },
        ]}
        grid={{ horizontal: true }}
        hideLegend
        margin={{ left: 60, right: 10, top: 10, bottom: 30 }}
        sx={{
          "& .MuiChartsGrid-line": { stroke: ct.gridColor },
          "& .MuiChartsAxis-line": { stroke: ct.gridColor },
          "& .MuiChartsAxis-tick": { stroke: ct.gridColor },
        }}
      />
    </ChartCard>
  );
}

// ─── 2. Order Status Pie ────────────────────────────────────────────────

interface OrderStatusPieProps {
  stats: ManagerBranchStats | ManagerOverviewStats;
}

const STATUS_PALETTE = [
  { key: "completed", label: "Completed", color: "#10b981" },
  { key: "inProgress", label: "In Progress", color: "#8b5cf6" },
  { key: "paid", label: "Paid", color: "#3b82f6" },
  { key: "quoted", label: "Quoted", color: "#f59e0b" },
  { key: "pending", label: "Pending", color: "#ef4444" },
];

export function OrderStatusPie({ stats }: OrderStatusPieProps) {
  const t = useThemeClasses();

  const data = STATUS_PALETTE.map((s) => ({
    id: s.key,
    label: s.label,
    value: (stats as any)[`${s.key}Orders`] || 0,
    color: s.color,
  })).filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <ChartCard title="Order Status">
        <p className={cn("text-xs text-center py-10", t.textTertiary)}>
          No orders yet
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Order Status">
      <div className="flex items-center gap-4">
        <PieChart
          height={180}
          width={180}
          series={[
            {
              data,
              innerRadius: 45,
              outerRadius: 80,
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

// ─── 3. Weekly Trend Line ───────────────────────────────────────────────

interface WeeklyTrendLineProps {
  activityMap: Map<string, number>;
  calendarDates: (string | Date)[];
}

export function WeeklyTrendLine({
  activityMap,
  calendarDates,
}: WeeklyTrendLineProps) {
  const ct = useChartTheme();

  // Normalise to YYYY-MM-DD strings, take last 14 days
  const recentDates = calendarDates
    .map((d) => (d instanceof Date ? d.toISOString().split("T")[0] : d))
    .filter(Boolean)
    .slice(-14);
  const labels = recentDates.map((d) => {
    const date = new Date(d);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  });
  const values = recentDates.map((d) => activityMap.get(d) || 0);

  if (recentDates.length === 0) return null;

  return (
    <ChartCard title="Daily Activity (Last 14 Days)">
      <LineChart
        height={200}
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
            data: values,
            label: "Orders",
            color: "#fbbf24",
            area: true,
            showMark: false,
            curve: "natural",
          },
        ]}
        grid={{ horizontal: true }}
        hideLegend
        margin={{ left: 35, right: 10, top: 10, bottom: 30 }}
        sx={{
          "& .MuiChartsGrid-line": { stroke: ct.gridColor },
          "& .MuiChartsAxis-line": { stroke: ct.gridColor },
          "& .MuiChartsAxis-tick": { stroke: ct.gridColor },
          "& .MuiAreaElement-root": { opacity: 0.15 },
        }}
      />
    </ChartCard>
  );
}

// ─── 4. Category Revenue Bar ────────────────────────────────────────────

interface CategoryRevenueBarProps {
  categories: CategoryAnalytics[];
}

export function CategoryRevenueBar({ categories }: CategoryRevenueBarProps) {
  const ct = useChartTheme();
  const t = useThemeClasses();

  // Top 6 categories by revenue
  const top = [...categories]
    .filter((c) => (c.totalRevenue || 0) > 0)
    .sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
    .slice(0, 6);

  if (top.length === 0) {
    return (
      <ChartCard title="Revenue by Category">
        <p className={cn("text-xs text-center py-10", t.textTertiary)}>
          No revenue data yet
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Revenue by Category">
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
            valueFormatter: (v: number | null) => formatCurrency((v ?? 0) as number),
          },
        ]}
        grid={{ vertical: true }}
        hideLegend
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
