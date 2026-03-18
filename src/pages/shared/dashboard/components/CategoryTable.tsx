import { Card } from '../../../../components/ui';
import { useThemeClasses } from '../../../../lib/theme';
import { cn } from '../../../../lib/utils';
import type { CategoryAnalytics, ClerkCategoryAnalytics } from '../../../../types';

interface CategoryTableProps {
	categories: (CategoryAnalytics | ClerkCategoryAnalytics)[];
	showRevenue: boolean;
	isLoading?: boolean;
}

function getTopStatus(cat: CategoryAnalytics | ClerkCategoryAnalytics): {
	label: string;
	count: number;
	color: string;
	bgLight: string;
	bgDark: string;
} {
	const statuses = [
		{ label: 'Completed', count: cat.completedOrders, color: '#10b981', bgLight: 'bg-emerald-50 text-emerald-700', bgDark: 'bg-emerald-900/30 text-emerald-400' },
		{ label: 'In Progress', count: cat.inProgressOrders, color: '#8b5cf6', bgLight: 'bg-purple-50 text-purple-700', bgDark: 'bg-purple-900/30 text-purple-400' },
		{ label: 'Paid', count: cat.paidOrders, color: '#3b82f6', bgLight: 'bg-blue-50 text-blue-700', bgDark: 'bg-blue-900/30 text-blue-400' },
		{ label: 'Quoted', count: cat.quotedOrders, color: '#f59e0b', bgLight: 'bg-amber-50 text-amber-700', bgDark: 'bg-amber-900/30 text-amber-400' },
		{ label: 'Pending', count: cat.pendingOrders, color: '#ef4444', bgLight: 'bg-red-50 text-red-700', bgDark: 'bg-red-900/30 text-red-400' },
	];

	const top = statuses.reduce((a, b) => (b.count > a.count ? b : a), statuses[0]);
	return top;
}

export function CategoryTable({ categories, showRevenue, isLoading }: CategoryTableProps) {
	const t = useThemeClasses();

	if (isLoading && categories.length === 0) {
		return (
			<Card padding="sm" className="rounded-lg text-center">
				<p className={cn('text-sm', t.textSecondary)}>
					Loading categories...
				</p>
			</Card>
		);
	}

	if (categories.length === 0) {
		return (
			<Card padding="sm" className="rounded-lg text-center">
				<p className={cn('text-sm', t.textSecondary)}>
					No category data available
				</p>
			</Card>
		);
	}

	return (
		<Card padding="none" className="rounded-lg overflow-hidden">
			<div className="p-4 pb-2">
				<h3
					className={cn('text-sm font-semibold', t.isDark ? 'text-gray-300' : 'text-gray-700')}
				>
					Category Performance
				</h3>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className={cn('border-b', t.borderSubtle)}>
							<th className={cn('text-left px-4 py-2 text-xs font-medium', t.textTertiary)}>
								Category
							</th>
							<th className={cn('text-right px-4 py-2 text-xs font-medium', t.textTertiary)}>
								Orders
							</th>
							<th className={cn('text-right px-4 py-2 text-xs font-medium', t.textTertiary)}>
								Items
							</th>
							<th className={cn('text-center px-4 py-2 text-xs font-medium', t.textTertiary)}>
								Top Status
							</th>
							{showRevenue && (
								<th className={cn('text-right px-4 py-2 text-xs font-medium', t.textTertiary)}>
									Revenue
								</th>
							)}
						</tr>
					</thead>
					<tbody>
						{categories.map((cat) => {
							const topStatus = getTopStatus(cat);
							const revenue = 'totalRevenue' in cat ? (cat as CategoryAnalytics).totalRevenue : undefined;

							return (
								<tr
									key={cat.categoryId}
									className={cn(
										'border-b last:border-b-0 transition-colors',
										t.isDark
											? 'border-gray-700/50 hover:bg-gray-700/30'
											: 'border-gray-50 hover:bg-gray-50'
									)}
								>
									<td className="px-4 py-2.5">
										<div className="flex items-center gap-2.5">
											{cat.categoryImageUrl ? (
												<img
													src={cat.categoryImageUrl}
													alt={cat.categoryName}
													className="w-7 h-7 rounded object-cover flex-shrink-0"
												/>
											) : (
												<div
													className={cn(
														'w-7 h-7 rounded flex-shrink-0',
														t.isDark ? 'bg-gray-700' : 'bg-gray-100'
													)}
												/>
											)}
											<span
												className={cn(
													'font-medium text-sm truncate',
													t.isDark ? 'text-gray-200' : 'text-gray-800'
												)}
											>
												{cat.categoryName}
											</span>
										</div>
									</td>
									<td
										className={cn(
											'text-right px-4 py-2.5 font-semibold',
											t.isDark ? 'text-gray-200' : 'text-gray-900'
										)}
									>
										{cat.totalOrders}
									</td>
									<td
										className={cn(
											'text-right px-4 py-2.5',
											t.textSecondary
										)}
									>
										{cat.orderItemsCount}
									</td>
									<td className="text-center px-4 py-2.5">
										{cat.totalOrders > 0 && (
											<span
												className={cn(
													'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold',
													t.isDark ? topStatus.bgDark : topStatus.bgLight
												)}
											>
												{topStatus.label} ({topStatus.count})
											</span>
										)}
									</td>
									{showRevenue && (
										<td
											className={cn(
												'text-right px-4 py-2.5 font-semibold',
												t.isDark ? 'text-emerald-400' : 'text-emerald-600'
											)}
										>
											{revenue !== undefined
												? `₵${revenue.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
												: '-'}
										</td>
									)}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</Card>
	);
}
