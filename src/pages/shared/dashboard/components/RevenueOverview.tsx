import { useTheme } from '../../../../contexts/ThemeContext';
import type { ManagerOverviewStats, ManagerBranchStats } from '../../../../types';

interface RevenueOverviewProps {
	stats: ManagerOverviewStats | ManagerBranchStats;
	isBranchView: boolean;
}

function fmt(amount: number): string {
	if (amount >= 10000) return `₵${(amount / 1000).toFixed(1)}k`;
	return `₵${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function RevenueOverview({ stats, isBranchView }: RevenueOverviewProps) {
	const { theme } = useTheme();
	const branchStats = stats as ManagerBranchStats;

	const items = [
		{ label: 'Today', revenue: stats.todayRevenue, orders: stats.todayOrders },
		...(isBranchView && 'thisWeekRevenue' in branchStats
			? [{ label: 'This Week', revenue: branchStats.thisWeekRevenue, orders: branchStats.thisWeekOrders }]
			: []),
		{ label: 'This Month', revenue: stats.thisMonthRevenue, orders: stats.thisMonthOrders },
		{ label: 'All Time', revenue: stats.totalRevenue, orders: stats.totalOrders },
	];

	const maxRevenue = Math.max(...items.map((i) => i.revenue), 1);

	return (
		<div
			className={`p-4 rounded-lg border ${
				theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
			}`}
		>
			<h3
				className={`text-xs font-medium uppercase tracking-wide mb-3 ${
					theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
				}`}
			>
				Revenue
			</h3>

			<div className="space-y-3">
				{items.map((item) => (
					<div key={item.label}>
						<div className="flex items-center justify-between mb-1">
							<span
								className={`text-xs ${
									theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
								}`}
							>
								{item.label}
							</span>
							<div className="flex items-baseline gap-1.5">
								<span
									className={`text-sm font-semibold ${
										theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
									}`}
								>
									{fmt(item.revenue)}
								</span>
								<span
									className={`text-[10px] ${
										theme === 'dark' ? 'text-gray-600' : 'text-gray-300'
									}`}
								>
									{item.orders} orders
								</span>
							</div>
						</div>
						<div
							className={`h-1 rounded-full overflow-hidden ${
								theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
							}`}
						>
							<div
								className={`h-full rounded-full transition-all duration-500 ${
									theme === 'dark' ? 'bg-gray-500' : 'bg-gray-400'
								}`}
								style={{
									width: `${Math.max((item.revenue / maxRevenue) * 100, 2)}%`,
								}}
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
