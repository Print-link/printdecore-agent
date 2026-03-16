import { useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../stores/authStore";
import { useBranchStore } from "../../stores/branchStore";
import { useClerkDashboard } from "./dashboard/hooks/useClerkDashboard";
import { useManagerOverviewDashboard } from "./dashboard/hooks/useManagerOverviewDashboard";
import { useManagerBranchDashboard } from "./dashboard/hooks/useManagerBranchDashboard";
import {
	DashboardHeader,
	KpiRow,
	OrderPipeline,
	RevenueOverview,
	CategoryTable,
	ActivityCalendar,
	OrdersPanel,
} from "./dashboard/components";

export default function DashboardPage() {
	const { theme } = useTheme();
	const { user } = useAuthStore();
	const { selectedBranch } = useBranchStore();
	const isManager = user?.role === "manager";
	const isClerk = user?.role === "clerk";
	const [isOrdersPanelOpen, setIsOrdersPanelOpen] = useState(false);

	// All hooks called unconditionally (React rules)
	const clerkDashboardResult = useClerkDashboard();
	const managerOverviewResult = useManagerOverviewDashboard();
	const managerBranchResult = useManagerBranchDashboard(
		selectedBranch?.id || null
	);

	const clerkDashboard = isClerk ? clerkDashboardResult : null;
	const managerOverview =
		isManager && !selectedBranch ? managerOverviewResult : null;
	const managerBranch =
		isManager && selectedBranch ? managerBranchResult : null;

	const dashboard = clerkDashboard || managerOverview || managerBranch;

	// ─── Error / loading states ─────────────────────────────────────────

	if (isClerk && !user?.branch_id) {
		return (
			<div
				className={`p-6 rounded-lg ${
					theme === "dark"
						? "bg-gray-800 border border-gray-700"
						: "bg-white border border-gray-200"
				}`}
			>
				<h2
					className={`text-xl font-semibold mb-4 ${
						theme === "dark" ? "text-red-400" : "text-red-600"
					}`}
				>
					No Branch Assigned
				</h2>
				<p className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
					You are not assigned to a branch. Please contact your manager.
				</p>
			</div>
		);
	}

	if (!dashboard) {
		return (
			<div
				className={`p-6 rounded-lg ${
					theme === "dark"
						? "bg-gray-800 border border-gray-700"
						: "bg-white border border-gray-200"
				}`}
			>
				<p className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
					Loading dashboard...
				</p>
			</div>
		);
	}

	const {
		selectedMonth,
		setSelectedMonth,
		selectedDate,
		setSelectedDate,
		stats,
		weeklyActivityMap,
		ordersByDate,
		calendarDates,
		calendarMonthHeader,
		calendarGridStart,
		isLoading,
		hasError,
		refetchAll,
	} = dashboard;

	if (hasError && !isLoading && !stats) {
		return (
			<div
				className={`p-6 rounded-lg ${
					theme === "dark"
						? "bg-gray-800 border border-gray-700"
						: "bg-white border border-gray-200"
				}`}
			>
				<div className="text-center py-8">
					<h2
						className={`text-xl font-semibold mb-4 ${
							theme === "dark" ? "text-red-400" : "text-red-600"
						}`}
					>
						Error Loading Dashboard
					</h2>
					<p
						className={`text-sm mb-6 ${
							theme === "dark" ? "text-gray-400" : "text-gray-600"
						}`}
					>
						Failed to load dashboard data. Please try again.
					</p>
					<button
						onClick={() => refetchAll()}
						className="px-6 py-2.5 bg-amber-400 hover:bg-amber-500 text-black rounded-lg font-semibold text-sm transition-colors"
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	// ─── Extract pipeline data ──────────────────────────────────────────

	let pipelineData = { pending: 0, quoted: 0, paid: 0, inProgress: 0, completed: 0 };

	if (isClerk && clerkDashboard?.stats) {
		const s = clerkDashboard.stats;
		pipelineData = {
			pending: s.pending,
			quoted: s.quoted,
			paid: s.paid,
			inProgress: s.inProgress,
			completed: s.completed,
		};
	} else if (isManager && (managerOverview || managerBranch)) {
		const s = (managerOverview || managerBranch)!.stats as any;
		pipelineData = {
			pending: s.pendingOrders,
			quoted: s.quotedOrders,
			paid: s.paidOrders,
			inProgress: s.inProgressOrders,
			completed: s.completedOrders,
		};
	}

	// ─── Render ─────────────────────────────────────────────────────────

	return (
		<div className="flex flex-col gap-3 h-full relative">
			<div
				className={`flex flex-col gap-3 transition-all ${
					isOrdersPanelOpen ? "lg:mr-[310px]" : ""
				}`}
			>
				<DashboardHeader
					selectedDate={selectedMonth}
					onDateChange={setSelectedMonth}
					onTodayClick={() => {
						const today = new Date();
						const month = `${today.getFullYear()}-${String(
							today.getMonth() + 1
						).padStart(2, "0")}`;
						setSelectedMonth(month);
					}}
				/>

				{/* KPI Cards */}
				{isClerk && clerkDashboard?.stats && (
					<KpiRow role="clerk" stats={clerkDashboard.stats} />
				)}
				{isManager && (managerOverview || managerBranch) && (
					<KpiRow
						role="manager"
						stats={(managerOverview || managerBranch)!.stats as any}
						isBranchView={!!selectedBranch}
					/>
				)}

				{/* Order Pipeline */}
				<OrderPipeline {...pipelineData} />

				{/* Revenue Overview (managers only) */}
				{isManager && (managerOverview || managerBranch) && (
					<RevenueOverview
						stats={(managerOverview || managerBranch)!.stats as any}
						isBranchView={!!selectedBranch}
					/>
				)}

				{/* Category Table + Activity Calendar */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
					{/* Category Performance */}
					{isClerk && clerkDashboard && (
						<CategoryTable
							categories={clerkDashboard.categoryAnalytics}
							showRevenue={false}
							isLoading={isLoading}
						/>
					)}
					{isManager && (managerOverview || managerBranch) && (
						<CategoryTable
							categories={(managerOverview || managerBranch)!.categoryAnalytics}
							showRevenue={true}
							isLoading={isLoading}
						/>
					)}

					{/* Activity Calendar */}
					<ActivityCalendar
						calendarDates={calendarDates}
						calendarMonthHeader={calendarMonthHeader}
						calendarGridStart={calendarGridStart}
						monthlyCountMap={weeklyActivityMap}
						selectedDate={selectedDate || ""}
						calendarOffset={0}
						onDateSelect={(date: string) => {
							setSelectedDate(date);
							setIsOrdersPanelOpen(true);
							const dateObj = new Date(date);
							const month = `${dateObj.getFullYear()}-${String(
								dateObj.getMonth() + 1
							).padStart(2, "0")}`;
							setSelectedMonth(month);
						}}
						onCalendarOffsetChange={() => {}}
						onTodayClick={() => {
							const today = new Date();
							const month = `${today.getFullYear()}-${String(
								today.getMonth() + 1
							).padStart(2, "0")}`;
							setSelectedMonth(month);
							setSelectedDate(today.toISOString().split("T")[0]);
							setIsOrdersPanelOpen(true);
						}}
					/>
				</div>
			</div>

			{/* Orders Panel */}
			<OrdersPanel
				orders={ordersByDate || []}
				selectedDate={selectedDate || ""}
				isLoading={isLoading}
				isOpen={isOrdersPanelOpen}
				onClose={() => {
					setIsOrdersPanelOpen(false);
					setSelectedDate(null);
				}}
			/>
		</div>
	);
}
