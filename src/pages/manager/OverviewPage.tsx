import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useBranchStore } from '../../stores/branchStore';
import { usePermissions, PERMISSIONS } from '../../hooks/usePermissions';
import { apiService } from '../../services/api';
import {
	Package, DollarSign, TrendingUp, Store, Star, MessageSquare,
	ArrowRight, ShoppingBag, Clock, Check, Eye,
} from "../../components/icons";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	Cell,
	Legend,
	PieChart,
	Pie,
} from "recharts";
import type { CategoryAnalytics, BranchReview, BranchPerformanceStats, ManagerOverviewStats, ManagerBranchStats } from "../../types";
import { Card, PageHeader, EmptyState } from '../../components/ui';
import { OverviewSkeleton } from '../../components/ui/skeletons';
import { useThemeClasses } from '../../lib/theme';
import { cn } from '../../lib/utils';

// ─── Local stat card ─────────────────────────────────────────────────
function StatCard({ label, value, icon, subtitle }: { label: string; value: ReactNode; icon: ReactNode; subtitle?: string }) {
	const t = useThemeClasses();
	return (
		<Card padding="lg">
			<div className="flex items-center justify-between">
				<div>
					<p className={cn('text-sm font-medium', t.textSecondary)}>{label}</p>
					<p className={cn('text-3xl font-bold mt-2', t.text)}>{value}</p>
					{subtitle && <p className={cn('text-xs mt-1', t.textTertiary)}>{subtitle}</p>}
				</div>
				{icon}
			</div>
		</Card>
	);
}

const COLORS = ["#fbbf24", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#f59e0b"];

export default function OverviewPage() {
	const { user } = useAuthStore();
	const { selectBranch } = useBranchStore();
	const navigate = useNavigate();
	const t = useThemeClasses();
	const { isManager, isClerk, hasPermission } = usePermissions();
	const [branchView, setBranchView] = useState<'chart' | 'table'>('table');
	const [chartMetric, setChartMetric] = useState<'revenue' | 'orders' | 'comparison'>('comparison');

	// For clerks, use their branch for branch-level analytics
	const clerkBranchId = isClerk ? user?.branch_id : undefined;

	const { data: stats, isLoading: isLoadingStats } = useQuery<ManagerOverviewStats | ManagerBranchStats>({
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

	const { data: branchBreakdown = [] } = useQuery<BranchPerformanceStats[]>({
		queryKey: ["managerOverview", "branches"],
		queryFn: () => apiService.getManagerOverviewBranches(),
		enabled: isManager,
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
		enabled: isManager,
		staleTime: 60000,
	});

	const branchChartData = useMemo(() => {
		return branchBreakdown.map((branch, i) => ({
			name:
				branch.branchName.length > 12
					? branch.branchName.substring(0, 12) + "…"
					: branch.branchName,
			fullName: branch.branchName,
			revenue: Number(branch.totalRevenue) || 0,
			orders: Number(branch.totalOrders) || 0,
			pending: branch.pendingOrders || 0,
			paid: branch.paidOrders || 0,
			inProgress: branch.inProgressOrders || 0,
			completed: branch.completedOrders || 0,
			todayRevenue: Number(branch.todayRevenue) || 0,
			todayOrders: branch.todayOrders || 0,
			rating: Number(branch.averageRating) || 0,
			reviewCount: branch.reviewCount || 0,
			color: COLORS[i % COLORS.length],
		}));
	}, [branchBreakdown]);

	// Status distribution for the donut chart
	const statusDistribution = useMemo(() => {
		const totals = branchBreakdown.reduce(
			(acc, b) => ({
				pending: acc.pending + b.pendingOrders,
				quoted: acc.quoted + b.quotedOrders,
				paid: acc.paid + b.paidOrders,
				inProgress: acc.inProgress + b.inProgressOrders,
				completed: acc.completed + b.completedOrders,
			}),
			{ pending: 0, quoted: 0, paid: 0, inProgress: 0, completed: 0 }
		);
		return [
			{ name: 'Pending', value: totals.pending, fill: '#f59e0b' },
			{ name: 'Quoted', value: totals.quoted, fill: '#6366f1' },
			{ name: 'Paid', value: totals.paid, fill: '#8b5cf6' },
			{ name: 'In Progress', value: totals.inProgress, fill: '#3b82f6' },
			{ name: 'Completed', value: totals.completed, fill: '#10b981' },
		].filter(s => s.value > 0);
	}, [branchBreakdown]);

	// Sort branches by revenue for the table
	const sortedBranches = useMemo(() => {
		return [...branchBreakdown].sort((a, b) => b.totalRevenue - a.totalRevenue);
	}, [branchBreakdown]);

	// Total across all branches for percentage calculations
	const totalAllRevenue = useMemo(() => {
		return branchBreakdown.reduce((sum, b) => sum + b.totalRevenue, 0);
	}, [branchBreakdown]);

	const handleBranchClick = (branch: BranchPerformanceStats) => {
		selectBranch({
			id: branch.branchId,
			name: branch.branchName,
		} as any);
		navigate('/app/dashboard');
	};

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
		return <OverviewSkeleton />;
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Overview Dashboard"
				description="See how all your branches are performing"
			/>

			{/* Stats Grid */}
			{stats && (
				<>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<StatCard
							label="Total Orders"
							value={stats.totalOrders}
							icon={<Package className="text-blue-500" size={32} />}
							subtitle={`${stats.todayOrders || 0} today`}
						/>
						<StatCard
							label="Total Revenue"
							value={`₵${stats.totalRevenue?.toFixed(2) || "0.00"}`}
							icon={<DollarSign className="text-green-500" size={32} />}
							subtitle={`₵${stats.thisMonthRevenue?.toFixed(2) || "0.00"} this month`}
						/>
						{isManager && 'branchCount' in stats && (
							<StatCard
								label="Branches"
								value={stats.branchCount}
								icon={<Store className="text-purple-500" size={32} />}
								subtitle={`${stats.activeBranchCount || 0} active`}
							/>
						)}
						<StatCard
							label="Today's Revenue"
							value={`₵${stats.todayRevenue?.toFixed(2) || "0.00"}`}
							icon={<TrendingUp className="text-amber-500" size={32} />}
							subtitle={`${stats.todayOrders || 0} orders`}
						/>
					</div>

					{/* WhatsApp Quotes Overview */}
					{stats.whatsappQuotes && stats.whatsappQuotes.totalQuotes > 0 && (
						<Card className="shadow-sm rounded-2xl" padding="lg">
							<h3 className={cn('text-lg font-bold mb-4', t.text)}>WhatsApp Quotes</h3>
							<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
								<div>
									<p className={cn('text-sm', t.textSecondary)}>Total Quotes</p>
									<p className={cn('text-2xl font-bold', t.text)}>{stats.whatsappQuotes.totalQuotes}</p>
									<p className={cn('text-xs', t.textTertiary)}>{stats.whatsappQuotes.thisMonthQuotes} this month</p>
								</div>
								<div>
									<p className={cn('text-sm', t.textSecondary)}>Quote Revenue</p>
									<p className={cn('text-2xl font-bold text-green-500')}>
										₵{stats.whatsappQuotes.quoteRevenue.toFixed(2)}
									</p>
									<p className={cn('text-xs', t.textTertiary)}>
										₵{stats.whatsappQuotes.thisMonthQuoteRevenue.toFixed(2)} this month
									</p>
								</div>
								<div>
									<p className={cn('text-sm', t.textSecondary)}>Conversion Rate</p>
									<p className={cn('text-2xl font-bold text-amber-500')}>
										{stats.whatsappQuotes.conversionRate}%
									</p>
									<p className={cn('text-xs', t.textTertiary)}>
										{stats.whatsappQuotes.paidQuotes} of {stats.whatsappQuotes.totalQuotes} paid
									</p>
								</div>
								<div>
									<p className={cn('text-sm', t.textSecondary)}>Pending</p>
									<p className={cn('text-2xl font-bold', t.text)}>{stats.whatsappQuotes.pendingQuotes}</p>
									<p className={cn('text-xs', t.textTertiary)}>
										{stats.whatsappQuotes.declinedQuotes} declined, {stats.whatsappQuotes.expiredQuotes} expired
									</p>
								</div>
							</div>
						</Card>
					)}
				</>
			)}

			{/* ─── Branch Performance Section ─────────────────────────────── */}
			{isManager && (
				<Card className="shadow-sm rounded-2xl" padding="none">
					{/* Section header */}
					<div className="flex items-center justify-between px-6 pt-6 pb-4">
						<div>
							<h3 className={cn('text-lg font-bold', t.text)}>Branch Performance</h3>
							<p className={cn('text-sm mt-0.5', t.textTertiary)}>
								{branchBreakdown.length} branch{branchBreakdown.length !== 1 ? 'es' : ''} — all time
							</p>
						</div>
						<div className={cn('flex rounded-lg border', t.border)}>
							<button
								onClick={() => setBranchView('table')}
								className={cn(
									'px-3 py-1.5 text-xs font-medium rounded-l-lg transition-colors',
									branchView === 'table'
										? 'bg-amber-400 text-gray-900'
										: cn(t.textSecondary, 'hover:bg-gray-100 dark:hover:bg-gray-700'),
								)}
							>
								Table
							</button>
							<button
								onClick={() => setBranchView('chart')}
								className={cn(
									'px-3 py-1.5 text-xs font-medium rounded-r-lg transition-colors',
									branchView === 'chart'
										? 'bg-amber-400 text-gray-900'
										: cn(t.textSecondary, 'hover:bg-gray-100 dark:hover:bg-gray-700'),
								)}
							>
								Chart
							</button>
						</div>
					</div>

					{branchBreakdown.length > 0 ? (
						branchView === 'table' ? (
							/* ─── Table View ──────────────────────────────────────── */
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className={cn('border-y', t.border)}>
											<th className={cn('text-left py-3 px-6 font-semibold text-xs uppercase tracking-wider', t.textTertiary)}>Branch</th>
											<th className={cn('text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider', t.textTertiary)}>Revenue</th>
											<th className={cn('text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider hidden md:table-cell', t.textTertiary)}>Orders</th>
											<th className={cn('text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider hidden lg:table-cell', t.textTertiary)}>Status Breakdown</th>
											<th className={cn('text-center py-3 px-4 font-semibold text-xs uppercase tracking-wider hidden sm:table-cell', t.textTertiary)}>Rating</th>
											<th className={cn('text-right py-3 px-4 font-semibold text-xs uppercase tracking-wider hidden xl:table-cell', t.textTertiary)}>Today</th>
											<th className={cn('py-3 px-4', t.textTertiary)}></th>
										</tr>
									</thead>
									<tbody>
										{sortedBranches.map((branch, index) => {
											const revenueShare = totalAllRevenue > 0
												? ((branch.totalRevenue / totalAllRevenue) * 100).toFixed(1)
												: '0';

											return (
												<tr
													key={branch.branchId}
													onClick={() => handleBranchClick(branch)}
													className={cn(
														'border-b last:border-0 transition-colors cursor-pointer',
														t.borderSubtle,
														t.isDark ? 'hover:bg-gray-700/50' : 'hover:bg-amber-50/50',
													)}
												>
													{/* Branch name + rank */}
													<td className="py-4 px-6">
														<div className="flex items-center gap-3">
															<div
																className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
																style={{
																	backgroundColor: `${COLORS[index % COLORS.length]}20`,
																	color: COLORS[index % COLORS.length],
																}}
															>
																{index + 1}
															</div>
															<div className="min-w-0">
																<p className={cn('font-semibold truncate', t.text)}>{branch.branchName}</p>
																<p className={cn('text-xs', t.textTertiary)}>{revenueShare}% of total</p>
															</div>
														</div>
													</td>

													{/* Revenue with bar */}
													<td className="py-4 px-4 text-right">
														<p className={cn('font-bold', t.text)}>₵{branch.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
														<div className={cn('w-full h-1.5 rounded-full mt-1.5', t.isDark ? 'bg-gray-700' : 'bg-gray-100')}>
															<div
																className="h-full rounded-full transition-all"
																style={{
																	width: `${totalAllRevenue > 0 ? (branch.totalRevenue / totalAllRevenue) * 100 : 0}%`,
																	backgroundColor: COLORS[index % COLORS.length],
																}}
															/>
														</div>
													</td>

													{/* Orders */}
													<td className={cn('py-4 px-4 text-right hidden md:table-cell')}>
														<p className={cn('font-semibold', t.text)}>{branch.totalOrders}</p>
														<p className={cn('text-xs', t.textTertiary)}>
															₵{branch.totalOrders > 0 ? (branch.totalRevenue / branch.totalOrders).toFixed(0) : '0'} avg
														</p>
													</td>

													{/* Status breakdown mini badges */}
													<td className="py-4 px-4 hidden lg:table-cell">
														<div className="flex items-center justify-center gap-1.5 flex-wrap">
															{branch.pendingOrders > 0 && (
																<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
																	<Clock size={10} /> {branch.pendingOrders}
																</span>
															)}
															{branch.paidOrders > 0 && (
																<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
																	<DollarSign size={10} /> {branch.paidOrders}
																</span>
															)}
															{branch.inProgressOrders > 0 && (
																<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
																	<ShoppingBag size={10} /> {branch.inProgressOrders}
																</span>
															)}
															{branch.completedOrders > 0 && (
																<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
																	<Check size={10} /> {branch.completedOrders}
																</span>
															)}
															{branch.totalOrders === 0 && (
																<span className={cn('text-xs', t.textTertiary)}>—</span>
															)}
														</div>
													</td>

													{/* Rating */}
													<td className="py-4 px-4 text-center hidden sm:table-cell">
														{branch.averageRating > 0 ? (
															<div className="flex items-center justify-center gap-1">
																<Star className="text-amber-400 fill-amber-400" size={14} />
																<span className={cn('font-semibold', t.text)}>{branch.averageRating.toFixed(1)}</span>
																<span className={cn('text-xs', t.textTertiary)}>({branch.reviewCount})</span>
															</div>
														) : (
															<span className={cn('text-xs', t.textTertiary)}>No reviews</span>
														)}
													</td>

													{/* Today */}
													<td className="py-4 px-4 text-right hidden xl:table-cell">
														<p className={cn('font-semibold', t.text)}>₵{branch.todayRevenue.toFixed(2)}</p>
														<p className={cn('text-xs', t.textTertiary)}>{branch.todayOrders} orders</p>
													</td>

													{/* View */}
													<td className="py-4 px-4">
														<button className={cn('p-1.5 rounded-lg transition-colors', t.isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100')}>
															<Eye size={16} className={t.textTertiary} />
														</button>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						) : (
							/* ─── Chart View ─────────────────────────────────────── */
							<div className="px-6 pb-6 space-y-5">
								{/* Metric selector tabs */}
								<div className="flex items-center gap-2">
									{([
										{ key: 'comparison', label: 'Revenue vs Orders' },
										{ key: 'revenue', label: 'Revenue' },
										{ key: 'orders', label: 'Order Status' },
									] as const).map(tab => (
										<button
											key={tab.key}
											onClick={() => setChartMetric(tab.key)}
											className={cn(
												'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
												chartMetric === tab.key
													? 'bg-amber-400/15 text-amber-600 dark:text-amber-400'
													: cn(t.textTertiary, 'hover:bg-gray-100 dark:hover:bg-gray-700'),
											)}
										>
											{tab.label}
										</button>
									))}
								</div>

								<div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
									{/* Main chart area */}
									<div className="xl:col-span-3">
										<ResponsiveContainer width="100%" height={380}>
											{chartMetric === 'orders' ? (
												/* Stacked bar: order status per branch */
												<BarChart data={branchChartData} barCategoryGap="20%">
													<CartesianGrid strokeDasharray="3 3" stroke={t.isDark ? "#374151" : "#f0f0f0"} vertical={false} />
													<XAxis dataKey="name" stroke={t.isDark ? "#9ca3af" : "#6b7280"} fontSize={11} tickLine={false} axisLine={false} />
													<YAxis stroke={t.isDark ? "#9ca3af" : "#6b7280"} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
													<RechartsTooltip
														contentStyle={{ backgroundColor: t.isDark ? "#1f2937" : "#fff", border: "none", borderRadius: "12px", boxShadow: "0 10px 25px -5px rgba(0,0,0,.15)", padding: "12px 16px" }}
														labelStyle={{ fontWeight: 700, marginBottom: 6, color: t.isDark ? "#f3f4f6" : "#111" }}
														itemStyle={{ fontSize: 12, padding: "2px 0" }}
													/>
													<Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
													<Bar dataKey="completed" name="Completed" stackId="status" fill="#10b981" radius={[0, 0, 0, 0]} />
													<Bar dataKey="inProgress" name="In Progress" stackId="status" fill="#3b82f6" />
													<Bar dataKey="paid" name="Paid" stackId="status" fill="#8b5cf6" />
													<Bar dataKey="pending" name="Pending" stackId="status" fill="#f59e0b" radius={[4, 4, 0, 0]} />
												</BarChart>
											) : chartMetric === 'comparison' ? (
												/* Grouped bar: revenue + orders side by side */
												<BarChart data={branchChartData} barCategoryGap="20%">
													<CartesianGrid strokeDasharray="3 3" stroke={t.isDark ? "#374151" : "#f0f0f0"} vertical={false} />
													<XAxis dataKey="name" stroke={t.isDark ? "#9ca3af" : "#6b7280"} fontSize={11} tickLine={false} axisLine={false} />
													<YAxis yAxisId="revenue" stroke="#f59e0b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₵${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
													<YAxis yAxisId="orders" orientation="right" stroke="#3b82f6" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
													<RechartsTooltip
														content={({ active, payload, label }) => {
															if (!active || !payload?.length) return null;
															const data = payload[0]?.payload;
															return (
																<div className={cn('rounded-xl p-4 shadow-xl border min-w-[200px]', t.isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100')}>
																	<p className={cn('font-bold text-sm mb-3', t.text)}>{data?.fullName || label}</p>
																	<div className="space-y-2">
																		<div className="flex justify-between gap-6">
																			<span className="text-xs text-amber-500 font-medium">Revenue</span>
																			<span className={cn('text-xs font-bold', t.text)}>₵{data?.revenue?.toLocaleString()}</span>
																		</div>
																		<div className="flex justify-between gap-6">
																			<span className="text-xs text-blue-500 font-medium">Orders</span>
																			<span className={cn('text-xs font-bold', t.text)}>{data?.orders}</span>
																		</div>
																		<div className={cn('border-t pt-2 mt-1', t.borderSubtle)}>
																			<div className="flex justify-between gap-6">
																				<span className={cn('text-xs', t.textTertiary)}>Today</span>
																				<span className={cn('text-xs font-medium', t.text)}>₵{data?.todayRevenue?.toFixed(2)} ({data?.todayOrders} orders)</span>
																			</div>
																			{data?.rating > 0 && (
																				<div className="flex justify-between gap-6 mt-1">
																					<span className={cn('text-xs', t.textTertiary)}>Rating</span>
																					<span className={cn('text-xs font-medium', t.text)}>⭐ {data.rating.toFixed(1)} ({data.reviewCount})</span>
																				</div>
																			)}
																		</div>
																	</div>
																</div>
															);
														}}
													/>
													<Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
													<Bar yAxisId="revenue" dataKey="revenue" name="Revenue (₵)" fill="#f59e0b" radius={[4, 4, 0, 0]} fillOpacity={0.85} barSize={branchChartData.length > 6 ? undefined : 32} />
													<Bar yAxisId="orders" dataKey="orders" name="Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} fillOpacity={0.7} barSize={branchChartData.length > 6 ? undefined : 32} />
												</BarChart>
											) : (
												/* Single metric: revenue with colored cells */
												<BarChart data={branchChartData} barCategoryGap="15%">
													<CartesianGrid strokeDasharray="3 3" stroke={t.isDark ? "#374151" : "#f0f0f0"} vertical={false} />
													<XAxis dataKey="name" stroke={t.isDark ? "#9ca3af" : "#6b7280"} fontSize={11} tickLine={false} axisLine={false} />
													<YAxis stroke={t.isDark ? "#9ca3af" : "#6b7280"} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₵${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
													<RechartsTooltip
														contentStyle={{ backgroundColor: t.isDark ? "#1f2937" : "#fff", border: "none", borderRadius: "12px", boxShadow: "0 10px 25px -5px rgba(0,0,0,.15)", padding: "12px 16px" }}
														formatter={(value) => [`₵${(value as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, "Revenue"]}
														labelStyle={{ fontWeight: 700, marginBottom: 4, color: t.isDark ? "#f3f4f6" : "#111" }}
													/>
													<Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
														{branchChartData.map((entry, index) => (
															<Cell key={index} fill={entry.color} fillOpacity={0.85} />
														))}
													</Bar>
												</BarChart>
											)}
										</ResponsiveContainer>
									</div>

									{/* Side panel: status donut + top branch summary */}
									<div className="space-y-5">
										{/* Order status donut */}
										{statusDistribution.length > 0 && (
											<div className={cn('rounded-xl border p-4', t.isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-100')}>
												<p className={cn('text-xs font-semibold uppercase tracking-wider mb-3', t.textTertiary)}>Order Status</p>
												<ResponsiveContainer width="100%" height={140}>
													<PieChart>
														<Pie
															data={statusDistribution}
															cx="50%"
															cy="50%"
															innerRadius={38}
															outerRadius={60}
															paddingAngle={3}
															dataKey="value"
															strokeWidth={0}
														>
															{statusDistribution.map((entry, i) => (
																<Cell key={i} fill={entry.fill} />
															))}
														</Pie>
														<RechartsTooltip
															contentStyle={{ backgroundColor: t.isDark ? "#1f2937" : "#fff", border: "none", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,.1)", fontSize: 12, padding: "8px 12px" }}
															formatter={(value, name) => [value as number, name as string]}
														/>
													</PieChart>
												</ResponsiveContainer>
												<div className="space-y-1.5 mt-2">
													{statusDistribution.map(s => (
														<div key={s.name} className="flex items-center justify-between">
															<div className="flex items-center gap-2">
																<div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.fill }} />
																<span className={cn('text-xs', t.textSecondary)}>{s.name}</span>
															</div>
															<span className={cn('text-xs font-semibold', t.text)}>{s.value}</span>
														</div>
													))}
												</div>
											</div>
										)}

										{/* Top branch highlight */}
										{sortedBranches[0] && (
											<div className={cn('rounded-xl border p-4', t.isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-100')}>
												<p className={cn('text-xs font-semibold uppercase tracking-wider mb-3', t.textTertiary)}>Top Branch</p>
												<p className={cn('font-bold text-sm', t.text)}>{sortedBranches[0].branchName}</p>
												<div className="mt-3 space-y-2">
													<div className="flex justify-between">
														<span className={cn('text-xs', t.textTertiary)}>Revenue</span>
														<span className={cn('text-xs font-bold text-green-500')}>₵{sortedBranches[0].totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
													</div>
													<div className="flex justify-between">
														<span className={cn('text-xs', t.textTertiary)}>Orders</span>
														<span className={cn('text-xs font-bold', t.text)}>{sortedBranches[0].totalOrders}</span>
													</div>
													<div className="flex justify-between">
														<span className={cn('text-xs', t.textTertiary)}>Completed</span>
														<span className="text-xs font-bold text-green-500">{sortedBranches[0].completedOrders}</span>
													</div>
													{sortedBranches[0].averageRating > 0 && (
														<div className="flex justify-between">
															<span className={cn('text-xs', t.textTertiary)}>Rating</span>
															<span className="text-xs font-bold text-amber-500">⭐ {sortedBranches[0].averageRating.toFixed(1)}</span>
														</div>
													)}
												</div>
											</div>
										)}
									</div>
								</div>
							</div>
						)
					) : (
						<div className="px-6 pb-6">
							<EmptyState
								icon={TrendingUp}
								title="No Performance Data"
								description="Revenue data will appear here once your branches start processing orders."
								className="h-[300px]"
							/>
						</div>
					)}
				</Card>
			)}

			{/* Reviews */}
			{isManager && (
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
								className="h-[200px]"
							/>
						)}
					</div>
				</Card>
			)}

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
