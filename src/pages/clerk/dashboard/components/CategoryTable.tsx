import { useTheme } from '../../../../contexts/ThemeContext';
import type { CategoryAnalytics, ClerkCategoryAnalytics } from '../../../../types';

interface CategoryTableProps {
	categories: (CategoryAnalytics | ClerkCategoryAnalytics)[];
	showRevenue: boolean;
	isLoading?: boolean;
}

function getTopStatus(cat: CategoryAnalytics | ClerkCategoryAnalytics): {
	label: string;
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
	const { theme } = useTheme();

	if (isLoading && categories.length === 0) {
		return (
			<div
				className={`p-4 rounded-lg border text-center ${
					theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
				}`}
			>
				<p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
					Loading categories...
				</p>
			</div>
		);
	}

	if (categories.length === 0) {
		return (
			<div
				className={`p-4 rounded-lg border text-center ${
					theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
				}`}
			>
				<p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
					No category data available
				</p>
			</div>
		);
	}

	return (
		<div
			className={`rounded-lg border overflow-hidden ${
				theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
			}`}
		>
			<div className="p-4 pb-2">
				<h3
					className={`text-sm font-semibold ${
						theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
					}`}
				>
					Category Performance
				</h3>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr
							className={`border-b ${
								theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
							}`}
						>
							<th
								className={`text-left px-4 py-2 text-xs font-medium ${
									theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
								}`}
							>
								Category
							</th>
							<th
								className={`text-right px-4 py-2 text-xs font-medium ${
									theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
								}`}
							>
								Orders
							</th>
							<th
								className={`text-right px-4 py-2 text-xs font-medium ${
									theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
								}`}
							>
								Items
							</th>
							<th
								className={`text-center px-4 py-2 text-xs font-medium ${
									theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
								}`}
							>
								Top Status
							</th>
							{showRevenue && (
								<th
									className={`text-right px-4 py-2 text-xs font-medium ${
										theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
									}`}
								>
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
									className={`border-b last:border-b-0 transition-colors ${
										theme === 'dark'
											? 'border-gray-700/50 hover:bg-gray-700/30'
											: 'border-gray-50 hover:bg-gray-50'
									}`}
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
													className={`w-7 h-7 rounded flex-shrink-0 ${
														theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
													}`}
												/>
											)}
											<span
												className={`font-medium text-sm truncate ${
													theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
												}`}
											>
												{cat.categoryName}
											</span>
										</div>
									</td>
									<td
										className={`text-right px-4 py-2.5 font-semibold ${
											theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
										}`}
									>
										{cat.totalOrders}
									</td>
									<td
										className={`text-right px-4 py-2.5 ${
											theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
										}`}
									>
										{cat.orderItemsCount}
									</td>
									<td className="text-center px-4 py-2.5">
										{cat.totalOrders > 0 && (
											<span
												className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
													theme === 'dark' ? topStatus.bgDark : topStatus.bgLight
												}`}
											>
												{topStatus.label} ({topStatus.count})
											</span>
										)}
									</td>
									{showRevenue && (
										<td
											className={`text-right px-4 py-2.5 font-semibold ${
												theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
											}`}
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
		</div>
	);
}
