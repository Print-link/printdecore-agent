import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useBranchStore } from "../../stores/branchStore";
import { usePermissions, PERMISSIONS } from "../../hooks/usePermissions";
import { apiService } from "../../services/api";
import { Star, ArrowRight } from "../../components/icons";
import type {
  BranchPerformanceStats,
  ManagerOverviewStats,
  MonthlyRevenueTrend,
  CategoryAnalytics,
  WeeklyActivityItem,
} from "../../types";
import { Card, EmptyState } from "../../components/ui";
import { OverviewSkeleton } from "../../components/ui/skeletons";
import { useThemeClasses } from "../../lib/theme";
import { cn, formatCurrency } from "../../lib/utils";
import OverviewHero from "./OverviewHero";
import {
  MonthlyRevenueHistogram,
  BranchRevenuePie,
  OrderStatusDonut,
  CategoryRevenueChart,
  DailyActivityTrend,
} from "./overview/OverviewCharts";

const RANK_COLORS = [
  "#fbbf24",
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#ef4444",
  "#f59e0b",
];

export default function OverviewPage() {
  const { selectBranch } = useBranchStore();
  const navigate = useNavigate();
  const t = useThemeClasses();
  const { isManager, hasPermission } = usePermissions();

  // ── Data fetching ──────────────────────────────────────────────────

  const { data: stats, isLoading: isLoadingStats } =
    useQuery<ManagerOverviewStats>({
      queryKey: ["managerOverview", "stats"],
      queryFn: () => apiService.getManagerOverviewStats(),
      enabled: isManager,
      staleTime: 30000,
      refetchInterval: 60000,
    });

  const { data: branchBreakdown = [] } = useQuery<BranchPerformanceStats[]>({
    queryKey: ["managerOverview", "branches"],
    queryFn: () => apiService.getManagerOverviewBranches(),
    enabled: isManager,
    staleTime: 30000,
  });

  const { data: monthlyRevenue = [] } = useQuery<MonthlyRevenueTrend[]>({
    queryKey: ["managerOverview", "monthlyRevenue"],
    queryFn: () => apiService.getManagerOverviewMonthlyRevenue(12),
    enabled: isManager,
    staleTime: 60000,
  });

  const { data: categoryAnalytics = [] } = useQuery<CategoryAnalytics[]>({
    queryKey: ["managerOverview", "categoryAnalytics"],
    queryFn: () => apiService.getManagerOverviewCategoryAnalytics(30),
    enabled: isManager,
    staleTime: 60000,
  });

  const { data: weeklyActivity = [] } = useQuery<WeeklyActivityItem[]>({
    queryKey: ["managerOverview", "weeklyActivity"],
    queryFn: () => {
      const now = new Date();
      return apiService.getManagerOverviewWeeklyActivity(
        String(now.getMonth() + 1),
        String(now.getFullYear()),
      );
    },
    enabled: isManager,
    staleTime: 60000,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["managerOverview", "reviews"],
    queryFn: () => apiService.getManagerOverviewReviews(5),
    enabled: isManager,
    staleTime: 60000,
  });

  // ── Derived data ───────────────────────────────────────────────────

  const sortedBranches = useMemo(
    () => [...branchBreakdown].sort((a, b) => b.totalRevenue - a.totalRevenue),
    [branchBreakdown],
  );

  const totalAllRevenue = useMemo(
    () => branchBreakdown.reduce((sum, b) => sum + b.totalRevenue, 0),
    [branchBreakdown],
  );

  const handleBranchClick = (branch: BranchPerformanceStats) => {
    selectBranch({ id: branch.branchId, name: branch.branchName } as any);
    navigate("/app/dashboard");
  };

  // ── Guards ─────────────────────────────────────────────────────────

  if (
    !hasPermission(PERMISSIONS.REPORTS_VIEW, PERMISSIONS.DASHBOARD_ANALYTICS)
  ) {
    return (
      <Card>
        <EmptyState
          title="Access denied"
          description="You need analytics permissions."
        />
      </Card>
    );
  }

  if (isLoadingStats && !stats) return <OverviewSkeleton />;

  return (
    <div className="space-y-5">
      {/* KPI Hero */}
      {stats && <OverviewHero stats={stats} />}

      {/* Row 1: Revenue Histogram (full width) */}
      <MonthlyRevenueHistogram data={monthlyRevenue} />

      {/* Row 2: Order Status Pie + Branch Revenue Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {stats && <OrderStatusDonut stats={stats} />}
        <BranchRevenuePie branches={branchBreakdown} />
      </div>

      {/* Row 3: Category Bar + Daily Activity Line */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CategoryRevenueChart categories={categoryAnalytics} />
        <DailyActivityTrend activity={weeklyActivity} />
      </div>

      {/* Row 4: Branch Performance Table */}
      {sortedBranches.length > 0 && (
        <div
          className={cn(
            "rounded-xl border overflow-hidden",
            t.isDark
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200",
          )}
        >
          <div className="px-5 py-4 md:px-6">
            <h3 className={cn("text-sm font-semibold", t.text)}>
              Branch Performance
            </h3>
            <p className={cn("text-xs mt-0.5", t.textTertiary)}>
              {branchBreakdown.length} branch
              {branchBreakdown.length !== 1 ? "es" : ""} — click to view
              details
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={cn("border-y", t.border)}>
                  <th
                    className={cn(
                      "text-left py-2.5 px-5 md:px-6 text-[10px] font-semibold uppercase tracking-wider",
                      t.textTertiary,
                    )}
                  >
                    Branch
                  </th>
                  <th
                    className={cn(
                      "text-right py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wider",
                      t.textTertiary,
                    )}
                  >
                    Revenue
                  </th>
                  <th
                    className={cn(
                      "text-right py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wider hidden md:table-cell",
                      t.textTertiary,
                    )}
                  >
                    Orders
                  </th>
                  <th
                    className={cn(
                      "text-center py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wider hidden sm:table-cell",
                      t.textTertiary,
                    )}
                  >
                    Rating
                  </th>
                  <th className="py-2.5 px-4" />
                </tr>
              </thead>
              <tbody>
                {sortedBranches.map((branch, i) => {
                  const share =
                    totalAllRevenue > 0
                      ? (
                          (branch.totalRevenue / totalAllRevenue) *
                          100
                        ).toFixed(1)
                      : "0";
                  return (
                    <tr
                      key={branch.branchId}
                      onClick={() => handleBranchClick(branch)}
                      className={cn(
                        "border-b last:border-0 cursor-pointer transition-colors",
                        t.borderSubtle,
                        t.isDark
                          ? "hover:bg-gray-700/50"
                          : "hover:bg-amber-50/50",
                      )}
                    >
                      <td className="py-3 px-5 md:px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{
                              backgroundColor: `${RANK_COLORS[i % RANK_COLORS.length]}20`,
                              color: RANK_COLORS[i % RANK_COLORS.length],
                            }}
                          >
                            {i + 1}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={cn(
                                "font-semibold text-xs truncate",
                                t.text,
                              )}
                            >
                              {branch.branchName}
                            </p>
                            <p className={cn("text-[10px]", t.textTertiary)}>
                              {share}% of total
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <p className={cn("font-bold text-xs", t.text)}>
                          {formatCurrency(branch.totalRevenue, {
                            compact: true,
                          })}
                        </p>
                        <div
                          className={cn(
                            "w-full h-1 rounded-full mt-1",
                            t.isDark ? "bg-gray-700" : "bg-gray-100",
                          )}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${totalAllRevenue > 0 ? (branch.totalRevenue / totalAllRevenue) * 100 : 0}%`,
                              backgroundColor:
                                RANK_COLORS[i % RANK_COLORS.length],
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right hidden md:table-cell">
                        <p className={cn("font-semibold text-xs", t.text)}>
                          {branch.totalOrders}
                        </p>
                        <p className={cn("text-[10px]", t.textTertiary)}>
                          {branch.todayOrders} today
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center hidden sm:table-cell">
                        {branch.averageRating > 0 ? (
                          <div className="flex items-center justify-center gap-1">
                            <Star className="text-amber-400" size={12} />
                            <span
                              className={cn("text-xs font-semibold", t.text)}
                            >
                              {branch.averageRating.toFixed(1)}
                            </span>
                          </div>
                        ) : (
                          <span className={cn("text-[10px]", t.textTertiary)}>
                            —
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <ArrowRight size={14} className={t.textTertiary} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row 5: Recent Reviews */}
      {reviews.length > 0 && (
        <div
          className={cn(
            "rounded-xl border p-5 md:p-6",
            t.isDark
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200",
          )}
        >
          <h3 className={cn("text-sm font-semibold mb-3", t.text)}>
            Recent Reviews
          </h3>
          <div className="space-y-3">
            {reviews.map((review: any) => (
              <div key={review.id} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    {(review.customerName || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-xs font-semibold", t.text)}>
                      {review.customerName}
                    </p>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={10}
                          className={
                            i < review.rating
                              ? "text-amber-400"
                              : t.textTertiary
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <p className={cn("text-[10px] mt-0.5", t.textTertiary)}>
                    {review.branchName}
                  </p>
                  {review.review && (
                    <p
                      className={cn(
                        "text-xs mt-1 line-clamp-2",
                        t.textSecondary,
                      )}
                    >
                      {review.review}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
