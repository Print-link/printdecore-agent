/**
 * Overview Hero Banner
 *
 * Distinct from the branch DashboardHero (teal gradient).
 * Uses a warm dark amber/charcoal gradient for the multi-branch overview.
 *
 * Shows:
 *   - Greeting + "All Branches" subtitle
 *   - Total revenue across all branches
 *   - Today's revenue badge
 *   - Branch count + active count
 *   - 4 KPI stats: Total Orders, Today's Revenue, Branches, WhatsApp Quotes
 */

import { BarChart } from "@mui/x-charts/BarChart";
import { useAuthStore } from "../../stores/authStore";
import { formatCurrency } from "../../lib/utils";
import type { ManagerOverviewStats, BranchPerformanceStats } from "../../types";

interface OverviewHeroProps {
  stats: ManagerOverviewStats;
  branches: BranchPerformanceStats[];
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function OverviewHero({ stats, branches }: OverviewHeroProps) {
  const { user } = useAuthStore();
  const firstName = user?.firstName || user?.name?.split(" ")[0] || "Manager";

  const topBranches = [...branches]
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);

  const wq = stats.whatsappQuotes;

  const kpis = [
    {
      label: "Total Orders",
      value: String(stats.totalOrders),
      sub: `${stats.todayOrders} today`,
    },
    {
      label: "Today's Revenue",
      value: formatCurrency(stats.todayRevenue, { compact: true }),
      sub: `${stats.todayOrders} order${stats.todayOrders !== 1 ? "s" : ""}`,
    },
    {
      label: "Branches",
      value: String((stats as any).branchCount || branches.length),
      sub: `${(stats as any).activeBranchCount || branches.length} active`,
    },
    {
      label: "WhatsApp Quotes",
      value: wq ? String(wq.totalQuotes) : "0",
      sub:
        wq && wq.totalQuotes > 0
          ? `${wq.paidQuotes} paid · ${formatCurrency(wq.quoteRevenue, { compact: true })}`
          : "No quotes yet",
    },
  ];

  return (
    <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-[#2a1f0e] to-[#1a1408] text-white">
      {/* Top section */}
      <div className="relative px-5 pt-5 pb-0 md:px-8 md:pt-6">
        {/* Header */}
        <div className="mb-1">
          <h1 className="text-lg md:text-xl font-bold">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-xs text-white/40 mt-0.5">All branches overview</p>
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mt-3 md:mt-4">
          {/* Revenue */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
              Total Revenue
            </p>
            <p className="text-3xl md:text-4xl font-extrabold tracking-tight">
              {formatCurrency(stats.totalRevenue, {
                compact: stats.totalRevenue >= 100000,
              })}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {stats.todayRevenue > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                  +{formatCurrency(stats.todayRevenue, { compact: true })} today
                </span>
              )}
              <span className="text-[10px] text-white/40">
                {formatCurrency(stats.thisMonthRevenue, { compact: true })} this
                month
              </span>
            </div>
          </div>

          {/* Mini branch revenue bar chart */}
          {topBranches.length > 1 && (
            <div
              className="w-full md:w-[280px] shrink-0"
              style={{ height: 120 }}
            >
              <BarChart
                height={120}
                xAxis={[
                  {
                    data: topBranches.map((b) =>
                      b.branchName.length > 8
                        ? b.branchName.slice(0, 8) + "…"
                        : b.branchName,
                    ),
                    scaleType: "band",
                    tickLabelStyle: {
                      fontSize: 8,
                      fill: "rgba(255,255,255,0.35)",
                    },
                  },
                ]}
                yAxis={[
                  {
                    tickLabelStyle: { fontSize: 0 },
                    disableLine: true,
                    disableTicks: true,
                  },
                ]}
                series={[
                  {
                    data: topBranches.map((b) => b.totalRevenue),
                    color: "#fbbf24",
                  },
                ]}
                grid={{ horizontal: false }}
                hideLegend
                margin={{ left: 0, right: 0, top: 5, bottom: 25 }}
                borderRadius={4}
                sx={{
                  "& .MuiChartsAxis-line": { stroke: "transparent" },
                  "& .MuiChartsAxis-tick": { stroke: "transparent" },
                  "& .MuiBarElement-root": { opacity: 0.7 },
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-t border-white/10 mt-3">
        {kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            className={`px-5 py-3 md:px-8 md:py-4 ${i < kpis.length - 1 ? "border-r border-white/10" : ""} ${i < 2 ? "border-b md:border-b-0 border-white/10" : ""}`}
          >
            <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
              {kpi.label}
            </p>
            <p className="text-xl md:text-2xl font-bold">{kpi.value}</p>
            <p className="text-[10px] text-white/40 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
