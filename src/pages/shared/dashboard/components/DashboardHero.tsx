/**
 * Dashboard Hero Banner
 *
 * Dark gradient banner with:
 *   - Greeting + branch name
 *   - Total revenue + trend %
 *   - Embedded area chart (last 14 days)
 *   - 4 KPI stats bar at the bottom
 */

import { useMemo } from "react";
import { LineChart } from "@mui/x-charts/LineChart";
import { useAuthStore } from "../../../../stores/authStore";
import { useBranchStore } from "../../../../stores/branchStore";
import { formatCurrency } from "../../../../lib/utils";
import { Zap } from "../../../../components/icons";
import type { ManagerBranchStats, ManagerOverviewStats } from "../../../../types";

interface DashboardHeroProps {
	stats: ManagerBranchStats | ManagerOverviewStats;
	isBranchView: boolean;
	activityMap: Map<string, number>;
	calendarDates: (string | Date)[];
	selectedMonth: string;
	onMonthChange: (month: string) => void;
	onTodayClick: () => void;
}

function getGreeting(): string {
	const hour = new Date().getHours();
	if (hour < 12) return "Good morning";
	if (hour < 17) return "Good afternoon";
	return "Good evening";
}

export function DashboardHero({
	stats,
	isBranchView,
	activityMap,
	calendarDates,
	selectedMonth,
	onMonthChange,
	onTodayClick,
}: DashboardHeroProps) {
	const { user } = useAuthStore();
	const { selectedBranch } = useBranchStore();
	const branchStats = stats as ManagerBranchStats;
	const firstName = user?.firstName || user?.name?.split(" ")[0] || "Manager";

	// Trend: show month's order count + today's revenue as context
	const trendAmount = useMemo(() => {
		if (!stats.todayRevenue) return null;
		return { todayRevenue: stats.todayRevenue, monthOrders: stats.thisMonthOrders };
	}, [stats]);

	// Chart data: last 14 days
	const chartData = useMemo(() => {
		const dates = calendarDates
			.map((d) => (d instanceof Date ? d.toISOString().split("T")[0] : d))
			.filter(Boolean)
			.slice(-14);
		return {
			labels: dates.map((d) => {
				const dt = new Date(d);
				return `${dt.toLocaleString("en", { month: "short" })} ${dt.getDate()}`;
			}),
			values: dates.map((d) => activityMap.get(d) || 0),
		};
	}, [calendarDates, activityMap]);

	// KPI bar items
	const activeJobs = stats.pendingOrders + stats.quotedOrders + stats.paidOrders + stats.inProgressOrders;
	const needsAttention = stats.pendingOrders + stats.quotedOrders;

	const kpis = [
		{ label: "Active Jobs", value: activeJobs, sub: needsAttention > 0 ? `${needsAttention} need attention` : "All on track" },
		{ label: "Today's Orders", value: stats.todayOrders, sub: formatCurrency(stats.todayRevenue, { compact: true }) },
		{
			label: "This Week",
			value: isBranchView && "thisWeekOrders" in branchStats ? branchStats.thisWeekOrders : stats.thisMonthOrders,
			sub: isBranchView && "thisWeekRevenue" in branchStats
				? formatCurrency(branchStats.thisWeekRevenue, { compact: true })
				: formatCurrency(stats.thisMonthRevenue, { compact: true }),
		},
		{ label: "Completed", value: stats.completedOrders, sub: `of ${stats.totalOrders} total` },
	];

	return (
		<div className="rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a3a3a] to-[#0f2828] text-white">
			{/* Top section */}
			<div className="relative px-5 pt-5 pb-0 md:px-8 md:pt-6">
				{/* Header row */}
				<div className="flex items-start justify-between gap-4 mb-1">
					<div>
						<h1 className="text-lg md:text-xl font-bold">
							{getGreeting()}, {firstName}
						</h1>
						{isBranchView && selectedBranch && (
							<p className="text-xs text-white/50 mt-0.5">
								{selectedBranch.name}
							</p>
						)}
					</div>

					{/* Month picker + Today */}
					<div className="flex items-center gap-1.5 shrink-0">
						<button
							onClick={onTodayClick}
							className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-1"
						>
							<Zap size={12} />
							Today
						</button>
						<input
							type="month"
							value={selectedMonth}
							onChange={(e) => onMonthChange(e.target.value)}
							className="px-2 py-1.5 rounded-lg text-[11px] bg-white/10 border-none text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/30 h-7"
						/>
					</div>
				</div>

				{/* Revenue for selected month */}
				<div className="flex items-end gap-3 mt-3 md:mt-4">
					<div>
						<p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">
							{(() => {
								const [y, m] = selectedMonth.split("-");
								const monthName = new Date(Number(y), Number(m) - 1).toLocaleString("en", { month: "long" });
								return `${monthName} ${y} Revenue`;
							})()}
						</p>
						<p className="text-3xl md:text-4xl font-extrabold tracking-tight">
							{formatCurrency(stats.thisMonthRevenue, { compact: stats.thisMonthRevenue >= 100000 })}
						</p>
					</div>
					{trendAmount && (
						<div className="flex items-center gap-2 mb-1.5">
							<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
								+{formatCurrency(trendAmount.todayRevenue, { compact: true })} today
							</span>
							<span className="text-[10px] text-white/40">
								{trendAmount.monthOrders} order{trendAmount.monthOrders !== 1 ? "s" : ""} this month
							</span>
						</div>
					)}
				</div>

				{/* Embedded line chart */}
				{chartData.values.length > 1 && (
					<div className="-mx-5 md:-mx-8 mt-2" style={{ height: 140 }}>
						<LineChart
							height={140}
							xAxis={[{
								data: chartData.labels,
								scaleType: "point",
								tickLabelStyle: { fontSize: 9, fill: "rgba(255,255,255,0.3)" },
							}]}
							yAxis={[{ tickLabelStyle: { fontSize: 0 }, disableLine: true, disableTicks: true }]}
							series={[{
								data: chartData.values,
								color: "rgba(255,255,255,0.6)",
								area: true,
								showMark: false,
								curve: "natural",
							}]}
							hideLegend
							margin={{ left: 0, right: 0, top: 10, bottom: 25 }}
							sx={{
								"& .MuiChartsAxis-line": { stroke: "transparent" },
								"& .MuiChartsAxis-tick": { stroke: "transparent" },
								"& .MuiChartsGrid-line": { stroke: "transparent" },
								"& .MuiAreaElement-root": { fill: "url(#heroGradient)", opacity: 0.3 },
								"& .MuiLineElement-root": { strokeWidth: 2 },
							}}
						>
							<defs>
								<linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
									<stop offset="100%" stopColor="rgba(255,255,255,0)" />
								</linearGradient>
							</defs>
						</LineChart>
					</div>
				)}
			</div>

			{/* KPI stats bar */}
			<div className="grid grid-cols-2 md:grid-cols-4 border-t border-white/10">
				{kpis.map((kpi, i) => (
					<div
						key={kpi.label}
						className={`px-5 py-3 md:px-8 md:py-4 ${i < kpis.length - 1 ? "border-r border-white/10" : ""} ${i < 2 ? "border-b md:border-b-0 border-white/10" : ""}`}
					>
						<p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">{kpi.label}</p>
						<p className="text-xl md:text-2xl font-bold">{kpi.value}</p>
						<p className="text-[10px] text-white/40 mt-0.5">{kpi.sub}</p>
					</div>
				))}
			</div>
		</div>
	);
}
