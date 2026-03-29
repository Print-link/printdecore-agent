import { useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import { useBranchStore } from "../../stores/branchStore";
import { usePermissions, PERMISSIONS } from "../../hooks/usePermissions";
import { useClerkDashboard } from "./dashboard/hooks/useClerkDashboard";
import { useManagerOverviewDashboard } from "./dashboard/hooks/useManagerOverviewDashboard";
import { useManagerBranchDashboard } from "./dashboard/hooks/useManagerBranchDashboard";
import { Card, Button, EmptyState } from "../../components/ui";
import { DashboardSkeleton } from "../../components/ui/skeletons";
import {
  DashboardHeader,
  DashboardHero,
  KpiRow,
  CategoryTable,
  ActivityCalendar,
  OrdersPanel,
  CategoryRevenueBar,
} from "./dashboard/components";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();
  const { isManager, isClerk, hasPermission } = usePermissions();
  const [isOrdersPanelOpen, setIsOrdersPanelOpen] = useState(false);

  const clerkDashboardResult = useClerkDashboard();
  const managerOverviewResult = useManagerOverviewDashboard();
  const managerBranchResult = useManagerBranchDashboard(
    selectedBranch?.id || null,
  );

  const clerkDashboard = isClerk ? clerkDashboardResult : null;
  const managerOverview =
    isManager && !selectedBranch ? managerOverviewResult : null;
  const managerBranch =
    isManager && selectedBranch ? managerBranchResult : null;
  const dashboard = clerkDashboard || managerOverview || managerBranch;

  if (!hasPermission(PERMISSIONS.DASHBOARD_VIEW)) {
    return (
      <Card><EmptyState title="Access denied" description="You need dashboard permissions." /></Card>
    );
  }

  if (isClerk && !user?.branch_id) {
    return (
      <Card><EmptyState title="No Branch Assigned" description="You are not assigned to a branch." /></Card>
    );
  }

  if (!dashboard) return <DashboardSkeleton />;

  const {
    selectedMonth, setSelectedMonth,
    selectedDate, setSelectedDate,
    stats, weeklyActivityMap, ordersByDate,
    calendarDates, calendarMonthHeader, calendarGridStart,
    isLoading, hasError, refetchAll,
  } = dashboard;

  if (hasError && !isLoading && !stats) {
    return (
      <Card>
        <EmptyState
          title="Error Loading Dashboard"
          description="Failed to load dashboard data."
          action={<Button variant="primary" onClick={() => refetchAll()}>Retry</Button>}
        />
      </Card>
    );
  }

  const toMonth = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

  const managerStats = (managerOverview || managerBranch)?.stats as any;
  const categoryAnalytics =
    (managerOverview || managerBranch)?.categoryAnalytics ||
    clerkDashboard?.categoryAnalytics ||
    [];

  return (
    <div className="flex flex-col gap-4 h-full relative">
      <div className={`flex flex-col gap-4 transition-all ${isOrdersPanelOpen ? "lg:mr-[340px]" : ""}`}>

        {/* Hero Banner — managers only */}
        {isManager && managerStats && (
          <DashboardHero
            stats={managerStats}
            isBranchView={!!selectedBranch}
            activityMap={weeklyActivityMap}
            calendarDates={calendarDates}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            onTodayClick={() => setSelectedMonth(toMonth(new Date()))}
          />
        )}

        {/* Clerk: simple header + KPI row (no hero) */}
        {isClerk && (
          <>
            <DashboardHeader
              selectedDate={selectedMonth}
              onDateChange={setSelectedMonth}
              onTodayClick={() => setSelectedMonth(toMonth(new Date()))}
            />
            {clerkDashboard?.stats && (
              <KpiRow role="clerk" stats={clerkDashboard.stats} />
            )}
          </>
        )}

        {/* Two-column: Category performance + Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Category table + optional revenue chart */}
          <div className="space-y-4">
            <CategoryTable
              categories={categoryAnalytics}
              showRevenue={isManager}
              isLoading={isLoading}
            />
            {isManager && categoryAnalytics.length > 0 && (
              <CategoryRevenueBar categories={categoryAnalytics} />
            )}
          </div>

          {/* Right: Activity calendar */}
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
        onClose={() => {
          setIsOrdersPanelOpen(false);
          setSelectedDate(null);
        }}
      />
    </div>
  );
}
