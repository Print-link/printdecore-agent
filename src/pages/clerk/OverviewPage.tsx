import { useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { useBranchStore } from '../../stores/branchStore';
import { usePermissions, PERMISSIONS } from '../../hooks/usePermissions';
import { apiService } from '../../services/api';
import { Package, DollarSign, TrendingUp, Store, Star, MessageSquare, ArrowRight, Spinner } from "../../components/icons";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	Cell,
} from "recharts";
import type { CategoryAnalytics, BranchReview } from "../../types";
import { Card, PageHeader, EmptyState } from '../../components/ui';
import { useThemeClasses } from '../../lib/theme';
import { cn } from '../../lib/utils';

// ─── Local stat card ─────────────────────────────────────────────────
function StatCard({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
	const t = useThemeClasses();
	return (
		<Card padding="lg">
			<div className="flex items-center justify-between">
				<div>
					<p className={cn('text-sm font-medium', t.textSecondary)}>{label}</p>
					<p className={cn('text-3xl font-bold mt-2', t.text)}>{value}</p>
				</div>
				{icon}
			</div>
		</Card>
	);
}

const COLORS = ["#fbbf24", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#f59e0b"];

export default function OverviewPage() {
	const { user } = useAuthStore();
	const { selectedBranch } = useBranchStore();
	const t = useThemeClasses();
	const { isManager, isClerk, hasPermission } = usePermissions();

	// For clerks, use their branch for branch-level analytics
	const clerkBranchId = isClerk ? user?.branch_id : undefined;

	// Manager: overview stats across all branches
	// Clerk with analytics permission: branch-level stats
	const { data: stats, isLoading: isLoadingStats } = useQuery({
		queryKey: isManager
			? ["managerOverview", "stats"]
			: ["managerBranch", "stats", clerkBranchId],
		queryFn: () =>
			isManager
				? apiService.getManagerOverviewStats()
				: apiService.getManagerBranchStats(clerkBranchId!),
		enabled: isManager || !!clerkBranchId,
		staleTime: 30000,
		refetchInterval: 60000,
	});

	const { data: branchBreakdown = [] } = useQuery({
		queryKey: ["managerOverview", "branches"],
		queryFn: () => apiService.getManagerOverviewBranches(),
		enabled: isManager, // Only managers see multi-branch breakdown
		staleTime: 30000,
		refetchInterval: 60000,
	});

	const { data: categoryAnalytics = [] } = useQuery({
		queryKey: isManager
			? ["managerOverview", "categoryAnalytics"]
			: ["managerBranch", "categoryAnalytics", clerkBranchId],
		queryFn: () =>
			isManager
				? apiService.getManagerOverviewCategoryAnalytics()
				: apiService.getManagerBranchCategoryAnalytics(clerkBranchId!),
		enabled: isManager || !!clerkBranchId,
		staleTime: 60000,
		refetchInterval: 120000,
	});

	const { data: reviews = [] } = useQuery({
		queryKey: ["managerOverview", "reviews"],
		queryFn: () => apiService.getManagerOverviewReviews(5),
		enabled: isManager, // Only managers see cross-branch reviews
		staleTime: 60000,
	});

	const branchChartData = useMemo(() => {
		return (branchBreakdown as any[]).map((branch: any) => ({
			name:
				branch.branchName.length > 15
					? branch.branchName.substring(0, 15) + "..."
					: branch.branchName,
			revenue: Number(branch.totalRevenue) || 0,
			orders: Number(branch.totalOrders) || 0,
			rating: Number(branch.averageRating) || 0,
		}));
	}, [branchBreakdown]);

	if (!hasPermission(PERMISSIONS.REPORTS_VIEW, PERMISSIONS.DASHBOARD_ANALYTICS)) {
		return (
			<Card>
				<p className={t.textSecondary}>
					Access denied. You need analytics permissions.
				</p>
			</Card>
		);
	}

	if (isLoadingStats && !stats) {
		return (
			<div className="flex items-center justify-center h-64">
				<Spinner size="lg" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<PageHeader
				title="Overview Dashboard"
				description="See how all your branches are performing"
			/>

			{/* Stats Grid */}
			{stats && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<StatCard label="Total Orders" value={stats.totalOrders} icon={<Package className="text-blue-500" size={32} />} />
					<StatCard label="Total Revenue" value={`₵${stats.totalRevenue?.toFixed(2) || "0.00"}`} icon={<DollarSign className="text-green-500" size={32} />} />
					<StatCard label="Branches" value={stats.branchCount} icon={<Store className="text-purple-500" size={32} />} />
					<StatCard label="Today's Revenue" value={`₵${stats.todayRevenue?.toFixed(2) || "0.00"}`} icon={<TrendingUp className="text-amber-500" size={32} />} />
				</div>
			)}

			{/* Charts and Reviews Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Branch Performance Chart */}
				<Card className="lg:col-span-2 shadow-sm rounded-2xl" padding="lg">
					<div className="flex items-center justify-between mb-6">
						<h3 className={cn('text-lg font-bold', t.text)}>Branch Performance</h3>
						<div className="flex gap-2">
							<span className="flex items-center gap-1 text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
								<DollarSign size={12} /> Revenue
							</span>
						</div>
					</div>

					{branchChartData.length > 0 ? (
						<ResponsiveContainer width="100%" height={350}>
							<BarChart data={branchChartData}>
								<CartesianGrid
									strokeDasharray="3 3"
									stroke={t.isDark ? "#374151" : "#f3f4f6"}
									vertical={false}
								/>
								<XAxis
									dataKey="name"
									stroke={t.isDark ? "#9ca3af" : "#6b7280"}
									fontSize={12}
									tickLine={false}
									axisLine={false}
								/>
								<YAxis
									stroke={t.isDark ? "#9ca3af" : "#6b7280"}
									fontSize={12}
									tickLine={false}
									axisLine={false}
									tickFormatter={(value) => `₵${value}`}
								/>
								<RechartsTooltip
									contentStyle={{
										backgroundColor: t.isDark ? "#1f2937" : "#ffffff",
										border: "none",
										borderRadius: "12px",
										boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
									}}
									formatter={(value: number) => [`₵${value.toLocaleString()}`, "Revenue"]}
								/>
								<Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
									{branchChartData.map((_, index) => (
										<Cell
											key={`cell-${index}`}
											fill={COLORS[index % COLORS.length]}
											fillOpacity={0.8}
										/>
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					) : (
						<EmptyState
							icon={TrendingUp}
							title="No Performance Data"
							description="Revenue data will appear here once your branches start processing orders."
							className="h-[350px]"
						/>
					)}
				</Card>

				{/* Latest Reviews Section */}
				<Card className="shadow-sm rounded-2xl" padding="lg">
					<div className="flex items-center justify-between mb-6">
						<h3 className={cn('text-lg font-bold', t.text)}>Latest Reviews</h3>
						<MessageSquare className="text-blue-500" size={20} />
					</div>

					<div className="space-y-4">
						{reviews.length > 0 ? (
							reviews.map((review: BranchReview) => (
								<div
									key={review.id}
									className={cn(
										'p-4 rounded-xl border',
										t.isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-100'
									)}
								>
									<div className="flex items-start gap-3">
										<div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400 font-bold uppercase overflow-hidden">
											{review.avatar ? (
												<img src={review.avatar} alt={review.customerName} className="w-full h-full object-cover" />
											) : (
												review.customerName.charAt(0)
											)}
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center justify-between mb-1">
												<h4 className={cn('text-sm font-semibold truncate', t.text)}>
													{review.customerName}
												</h4>
												<div className="flex items-center gap-0.5">
													<Star className="text-amber-400 fill-amber-400" size={12} />
													<span className="text-xs font-bold text-amber-500">{review.rating}</span>
												</div>
											</div>
											<p className={cn('text-xs mb-2', t.textSecondary)}>
												at <span className="font-medium">{review.branchName}</span>
											</p>
											{review.review && (
												<p className={cn('text-sm italic line-clamp-2', t.isDark ? 'text-gray-300' : 'text-gray-600')}>
													"{review.review}"
												</p>
											)}
										</div>
									</div>
								</div>
							))
						) : (
							<EmptyState
								icon={Star}
								title="No Reviews Yet"
								description="Customer feedback for your branches will show up here."
								className="h-[350px]"
							/>
						)}
					</div>
				</Card>
			</div>

			{/* Category Analytics */}
			<Card className="shadow-sm rounded-2xl" padding="lg">
				<div className="flex items-center justify-between mb-6">
					<h3 className={cn('text-lg font-bold', t.text)}>Category Performance</h3>
					<div className="flex items-center gap-2 text-sm text-amber-500 font-medium">
						Last 30 days <ArrowRight size={16} />
					</div>
				</div>

				{categoryAnalytics.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						{categoryAnalytics
							.slice(0, 8)
							.map((category: CategoryAnalytics, index: number) => (
								<div
									key={category.categoryId}
									className={cn(
										'p-5 rounded-2xl border transition-all hover:shadow-md',
										t.isDark
											? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
											: 'bg-white border-gray-100 hover:border-amber-200'
									)}
								>
									<div className="flex items-center gap-3 mb-4">
										<div
											className="w-10 h-10 rounded-xl flex items-center justify-center"
											style={{ backgroundColor: `${COLORS[index % COLORS.length]}20` }}
										>
											<Package size={20} style={{ color: COLORS[index % COLORS.length] }} />
										</div>
										<h4 className={cn('font-bold truncate', t.text)}>
											{category.categoryName}
										</h4>
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-1">Orders</p>
											<p className="text-xl font-bold">{category.totalOrders}</p>
										</div>
										<div>
											<p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-1">Revenue</p>
											<p className="text-xl font-bold text-amber-500">₵{category.totalRevenue?.toFixed(0)}</p>
										</div>
									</div>
								</div>
							))}
					</div>
				) : (
					<EmptyState
						icon={Package}
						title="No Categories Yet"
						description="When you start selling across different categories, they will appear here."
						className="h-[200px]"
					/>
				)}
			</Card>
		</div>
	);
}
