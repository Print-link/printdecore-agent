import { PieChart } from '../../../../components/icons';
import { Card } from '../../../../components/ui';
import { useThemeClasses } from '../../../../lib/theme';
import { cn } from '../../../../lib/utils';
import type { CategoryAnalytics } from '../../../../types';

interface ManagerCategoryAnalyticsProps {
  categoryAnalytics: CategoryAnalytics[];
  isLoading?: boolean;
  showBranchBreakdown?: boolean;
}

export function ManagerCategoryAnalytics({
	categoryAnalytics,
	isLoading,
}: ManagerCategoryAnalyticsProps) {
	const t = useThemeClasses();

	if (isLoading && (!categoryAnalytics || categoryAnalytics.length === 0)) {
		return (
			<Card padding="sm" className="rounded-md text-center">
				<p className={t.textSecondary}>
					Loading category analytics...
				</p>
			</Card>
		);
	}

	if (!categoryAnalytics || categoryAnalytics.length === 0) {
		return (
			<Card padding="sm" className="rounded-md text-center">
				<p className={t.textSecondary}>
					No category data available
				</p>
			</Card>
		);
	}

	return (
		<Card padding="none" className="rounded-md">
			<div className="p-3 sm:p-4 md:p-6">
				<h2
					className={cn(
						'text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2.5 m-0',
						t.text
					)}
				>
					<PieChart size={20} className="text-amber-400 flex-shrink-0" />
					<span className="truncate">Category Performance</span>
				</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
					{categoryAnalytics.map((cat) => (
						<div
							key={cat.categoryId}
							className={cn('p-4 rounded-lg border', t.surface)}
						>
							<div className="flex gap-2 sm:gap-3 mb-3">
								{cat.categoryImageUrl && (
									<img
										src={cat.categoryImageUrl}
										alt={cat.categoryName}
										className="w-12 h-12 sm:w-[60px] sm:h-[60px] object-cover rounded flex-shrink-0"
									/>
								)}
								<div className="flex-1 min-w-0">
									<h3
										className={cn(
											'font-semibold mb-1 sm:mb-2 text-sm sm:text-base leading-tight truncate',
											t.text
										)}
									>
										{cat.categoryName}
									</h3>
									<div
										className={cn(
											'text-lg sm:text-xl font-bold mb-1',
											t.text
										)}
									>
										{cat.totalOrders.toLocaleString()} Orders
									</div>
									{cat.totalRevenue !== undefined && (
										<div className="text-sm sm:text-base font-semibold text-green-500">
											₵
											{cat.totalRevenue.toLocaleString("en-US", {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											})}
										</div>
									)}
								</div>
							</div>
							<div
								className={cn(
									'grid grid-cols-2 gap-2 sm:gap-3 pt-3 border-t',
									t.isDark ? 'border-gray-600' : 'border-gray-200'
								)}
							>
								<div>
									<div className={cn('text-[10px] sm:text-[11px] mb-0.5 sm:mb-1 font-medium', t.textSecondary)}>
										Completed
									</div>
									<div className="text-sm sm:text-base font-semibold text-green-500">
										{cat.completedOrders}
									</div>
								</div>
								<div>
									<div className={cn('text-[10px] sm:text-[11px] mb-0.5 sm:mb-1 font-medium', t.textSecondary)}>
										Pending
									</div>
									<div className="text-sm sm:text-base font-semibold text-yellow-500">
										{cat.pendingOrders}
									</div>
								</div>
								<div>
									<div className={cn('text-[10px] sm:text-[11px] mb-0.5 sm:mb-1 font-medium', t.textSecondary)}>
										Quoted
									</div>
									<div className="text-sm sm:text-base font-semibold text-amber-400">
										{cat.quotedOrders}
									</div>
								</div>
								<div>
									<div className={cn('text-[10px] sm:text-[11px] mb-0.5 sm:mb-1 font-medium', t.textSecondary)}>
										Paid
									</div>
									<div className="text-sm sm:text-base font-semibold text-green-500">
										{cat.paidOrders}
									</div>
								</div>
								<div>
									<div className={cn('text-[10px] sm:text-[11px] mb-0.5 sm:mb-1 font-medium', t.textSecondary)}>
										In Progress
									</div>
									<div className="text-sm sm:text-base font-semibold text-amber-400">
										{cat.inProgressOrders}
									</div>
								</div>
								{cat.paidRevenue !== undefined && (
									<div>
										<div className={cn('text-[10px] sm:text-[11px] mb-0.5 sm:mb-1 font-medium', t.textSecondary)}>
											Paid Revenue
										</div>
										<div className="text-xs sm:text-sm font-semibold text-green-500">
											₵
											{cat.paidRevenue.toLocaleString("en-US", {
												minimumFractionDigits: 2,
												maximumFractionDigits: 2,
											})}
										</div>
									</div>
								)}
							</div>
							{cat.orderItemsCount > 0 && (
								<div
									className={cn(
										'mt-3 pt-3 border-t text-xs',
										t.textSecondary,
										t.isDark ? 'border-gray-600' : 'border-gray-200'
									)}
								>
									<strong className={t.text}>
										Order Items:
									</strong>{" "}
									{cat.orderItemsCount.toLocaleString()}
								</div>
							)}
						</div>
					))}
				</div>
			</div>
		</Card>
	);
}
