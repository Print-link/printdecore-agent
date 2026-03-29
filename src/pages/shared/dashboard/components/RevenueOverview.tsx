import { useThemeClasses } from "../../../../lib/theme";
import { cn, formatCurrency } from "../../../../lib/utils";
import type { ManagerOverviewStats, ManagerBranchStats } from "../../../../types";

interface RevenueOverviewProps {
	stats: ManagerOverviewStats | ManagerBranchStats;
	isBranchView: boolean;
}

const periodColors = [
	{ bar: "bg-amber-400", dot: "bg-amber-400" },
	{ bar: "bg-blue-400", dot: "bg-blue-400" },
	{ bar: "bg-emerald-400", dot: "bg-emerald-400" },
	{ bar: "bg-purple-400", dot: "bg-purple-400" },
];

export function RevenueOverview({ stats, isBranchView }: RevenueOverviewProps) {
	const t = useThemeClasses();
	const branchStats = stats as ManagerBranchStats;

	const items = [
		{ label: "Today", revenue: stats.todayRevenue, orders: stats.todayOrders },
		...(isBranchView && "thisWeekRevenue" in branchStats
			? [{ label: "This Week", revenue: branchStats.thisWeekRevenue, orders: branchStats.thisWeekOrders }]
			: []),
		{ label: "This Month", revenue: stats.thisMonthRevenue, orders: stats.thisMonthOrders },
		{ label: "All Time", revenue: stats.totalRevenue, orders: stats.totalOrders },
	];

	const maxRevenue = Math.max(...items.map((i) => i.revenue), 1);

	return (
		<div className={cn("p-4 rounded-xl border", t.isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200")}>
			<h3 className={cn("text-xs font-medium uppercase tracking-wide mb-4", t.textSecondary)}>
				Revenue Breakdown
			</h3>

			<div className="space-y-4">
				{items.map((item, i) => {
					const color = periodColors[i % periodColors.length];
					const pct = Math.max((item.revenue / maxRevenue) * 100, 2);

					return (
						<div key={item.label}>
							<div className="flex items-center justify-between mb-1.5">
								<div className="flex items-center gap-2">
									<span className={cn("w-2 h-2 rounded-full", color.dot)} />
									<span className={cn("text-xs font-medium", t.text)}>
										{item.label}
									</span>
								</div>
								<div className="flex items-center gap-3">
									<span className={cn("text-sm font-bold tabular-nums", t.text)}>
										{formatCurrency(item.revenue, { compact: true })}
									</span>
									<span className={cn("text-[10px] tabular-nums w-16 text-right", t.textTertiary)}>
										{item.orders} order{item.orders !== 1 ? "s" : ""}
									</span>
								</div>
							</div>
							<div className={cn("h-2 rounded-full overflow-hidden", t.isDark ? "bg-gray-700" : "bg-gray-100")}>
								<div
									className={cn("h-full rounded-full transition-all duration-700 ease-out", color.bar)}
									style={{ width: `${pct}%` }}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
