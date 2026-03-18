import { useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import { useBranchStore } from "../../stores/branchStore";
import { usePermissions, PERMISSIONS } from "../../hooks/usePermissions";
import { useClerkDashboard } from "./dashboard/hooks/useClerkDashboard";
import { useManagerOverviewDashboard } from "./dashboard/hooks/useManagerOverviewDashboard";
import { useManagerBranchDashboard } from "./dashboard/hooks/useManagerBranchDashboard";
import { Card, Button, EmptyState } from "../../components/ui";
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
	const { user } = useAuthStore();
	const { selectedBranch } = useBranchStore();
	const { isManager, isClerk, hasPermission } = usePermissions();
	const [isOrdersPanelOpen, setIsOrdersPanelOpen] = useState(false);

	// All hooks called unconditionally (React rules)
	const clerkDashboardResult = useClerkDashboard();
	const managerOverviewResult = useManagerOverviewDashboard();
	const managerBranchResult = useManagerBranchDashboard(selectedBranch?.id || null);

	const clerkDashboard = isClerk ? clerkDashboardResult : null;
	const managerOverview = isManager && !selectedBranch ? managerOverviewResult : null;
	const managerBranch = isManager && selectedBranch ? managerBranchResult : null;
	const dashboard = clerkDashboard || managerOverview || managerBranch;

	// ─── Error / loading states ─────────────────────────────────────────

	if (!hasPermission(PERMISSIONS.DASHBOARD_VIEW)) {
		return (
			<Card>
				<EmptyState title="Access denied" description="You need dashboard permissions." />
			</Card>
		);
	}

	if (isClerk && !user?.branch_id) {
		return (
			<Card>
				<EmptyState title="No Branch Assigned" description="You are not assigned to a branch. Please contact your manager." />
			</Card>
		);
	}

	if (!dashboard) {
		return (
			<Card>
				<EmptyState title="Loading dashboard..." />
			</Card>
		);
	}

	const {
		selectedMonth, setSelectedMonth, selectedDate, setSelectedDate,
		stats, weeklyActivityMap, ordersByDate, calendarDates,
		calendarMonthHeader, calendarGridStart, isLoading, hasError, refetchAll,
	} = dashboard;

	if (hasError && !isLoading && !stats) {
		return (
			<Card>
				<EmptyState
					title="Error Loading Dashboard"
					description="Failed to load dashboard data. Please try again."
					action={<Button variant="primary" onClick={() => refetchAll()}>Retry</Button>}
				/>
			</Card>
		);
	}

	// ─── Extract pipeline data ──────────────────────────────────────────

	let pipelineData = { pending: 0, quoted: 0, paid: 0, inProgress: 0, completed: 0 };

	if (isClerk && clerkDashboard?.stats) {
		const s = clerkDashboard.stats;
		pipelineData = { pending: s.pending, quoted: s.quoted, paid: s.paid, inProgress: s.inProgress, completed: s.completed };
	} else if (isManager && (managerOverview || managerBranch)) {
		const s = (managerOverview || managerBranch)!.stats as any;
		pipelineData = { pending: s.pendingOrders, quoted: s.quotedOrders, paid: s.paidOrders, inProgress: s.inProgressOrders, completed: s.completedOrders };
	}

	// ─── Helpers ────────────────────────────────────────────────────────

	const toMonth = (date: Date) =>
		`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

	// ─── Render ─────────────────────────────────────────────────────────

	return (
		<div className="flex flex-col gap-3 h-full relative">
			<div className={`flex flex-col gap-3 transition-all ${isOrdersPanelOpen ? "lg:mr-[310px]" : ""}`}>
				<DashboardHeader
					selectedDate={selectedMonth}
					onDateChange={setSelectedMonth}
					onTodayClick={() => setSelectedMonth(toMonth(new Date()))}
				/>

				{isClerk && clerkDashboard?.stats && <KpiRow role="clerk" stats={clerkDashboard.stats} />}
				{isManager && (managerOverview || managerBranch) && (
					<KpiRow role="manager" stats={(managerOverview || managerBranch)!.stats as any} isBranchView={!!selectedBranch} />
				)}

				<OrderPipeline {...pipelineData} />

				{isManager && (managerOverview || managerBranch) && (
					<RevenueOverview stats={(managerOverview || managerBranch)!.stats as any} isBranchView={!!selectedBranch} />
				)}

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
					{isClerk && clerkDashboard && (
						<CategoryTable categories={clerkDashboard.categoryAnalytics} showRevenue={false} isLoading={isLoading} />
					)}
					{isManager && (managerOverview || managerBranch) && (
						<CategoryTable categories={(managerOverview || managerBranch)!.categoryAnalytics} showRevenue={true} isLoading={isLoading} />
					)}

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
							setSelectedMonth(toMonth(new Date(date)));
						}}
						onCalendarOffsetChange={() => {}}
						onTodayClick={() => {
							const today = new Date();
							setSelectedMonth(toMonth(today));
							setSelectedDate(today.toISOString().split("T")[0]);
							setIsOrdersPanelOpen(true);
						}}
					/>
				</div>
			</div>

			<OrdersPanel
				orders={ordersByDate || []}
				selectedDate={selectedDate || ""}
				isLoading={isLoading}
				isOpen={isOrdersPanelOpen}
				onClose={() => { setIsOrdersPanelOpen(false); setSelectedDate(null); }}
			/>
		</div>
	);
}
