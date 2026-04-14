import { apiClient } from "./client";
import type {
	ClerkDashboardStats,
	ClerkCategoryAnalytics,
	ClerkWeeklyActivity,
	ManagerOverviewStats,
	ManagerBranchStats,
	CategoryAnalytics,
	WeeklyActivityItem,
	BranchPerformanceStats,
	BranchReview,
	MonthlyRevenueTrend,
} from "../../types";

async function getClerkDashboardStats(
	branchId?: string
): Promise<ClerkDashboardStats> {
	const params = branchId ? { branchId } : {};
	const response = await apiClient.get("/clerk/dashboard/stats", {
		params,
	});
	return response.data.data;
}

async function getClerkCategoryAnalytics(
	days?: number,
	branchId?: string
): Promise<ClerkCategoryAnalytics[]> {
	const params: Record<string, string | number> = {};
	if (days) params.days = days;
	if (branchId) params.branchId = branchId;
	const response = await apiClient.get(
		"/clerk/dashboard/category-analytics",
		{ params }
	);
	return response.data.data;
}

async function getClerkWeeklyActivity(
	month?: string,
	year?: string,
	branchId?: string
): Promise<ClerkWeeklyActivity[]> {
	const params: Record<string, string> = {};
	if (month) params.month = month;
	if (year) params.year = year;
	if (branchId) params.branchId = branchId;
	const response = await apiClient.get(
		"/clerk/dashboard/weekly-activity",
		{ params }
	);
	return response.data.data;
}

async function getManagerOverviewStats(filters?: {
	startDate?: string;
	endDate?: string;
	month?: string;
	year?: string;
}): Promise<ManagerOverviewStats> {
	const response = await apiClient.get(
		"/manager/dashboard/overview/stats",
		{ params: filters }
	);
	return response.data.data;
}

async function getManagerOverviewBranches(filters?: {
	startDate?: string;
	endDate?: string;
	month?: string;
	year?: string;
}): Promise<BranchPerformanceStats[]> {
	const response = await apiClient.get(
		"/manager/dashboard/overview/branches",
		{ params: filters }
	);
	return response.data.data;
}

async function getManagerOverviewCategoryAnalytics(
	days?: number
): Promise<CategoryAnalytics[]> {
	const params = days ? { days } : {};
	const response = await apiClient.get(
		"/manager/dashboard/overview/category-analytics",
		{ params }
	);
	return response.data.data;
}

async function getManagerOverviewWeeklyActivity(
	month?: string,
	year?: string
): Promise<WeeklyActivityItem[]> {
	const params: Record<string, string> = {};
	if (month) params.month = month;
	if (year) params.year = year;
	const response = await apiClient.get(
		"/manager/dashboard/overview/weekly-activity",
		{ params }
	);
	return response.data.data;
}

async function getManagerOverviewReviews(limit?: number): Promise<BranchReview[]> {
	const params = limit ? { limit } : {};
	const response = await apiClient.get(
		"/manager/dashboard/overview/reviews",
		{ params }
	);
	return response.data.data;
}

async function getManagerOverviewMonthlyRevenue(
	months?: number
): Promise<MonthlyRevenueTrend[]> {
	const params = months ? { months } : {};
	const response = await apiClient.get(
		"/manager/dashboard/overview/monthly-revenue",
		{ params }
	);
	return response.data.data;
}

async function getManagerBranchStats(
	branchId: string,
	filters?: {
		startDate?: string;
		endDate?: string;
		month?: string;
		year?: string;
	}
): Promise<ManagerBranchStats> {
	const response = await apiClient.get(
		`/manager/dashboard/branch/${branchId}/stats`,
		{ params: filters }
	);
	return response.data.data;
}

async function getManagerBranchCategoryAnalytics(
	branchId: string,
	days?: number
): Promise<CategoryAnalytics[]> {
	const params = days ? { days } : {};
	const response = await apiClient.get(
		`/manager/dashboard/branch/${branchId}/category-analytics`,
		{ params }
	);
	return response.data.data;
}

async function getManagerBranchWeeklyActivity(
	branchId: string,
	month?: string,
	year?: string
): Promise<WeeklyActivityItem[]> {
	const params: Record<string, string> = {};
	if (month) params.month = month;
	if (year) params.year = year;
	const response = await apiClient.get(
		`/manager/dashboard/branch/${branchId}/weekly-activity`,
		{ params }
	);
	return response.data.data;
}

export const dashboardApi = {
	getClerkDashboardStats,
	getClerkCategoryAnalytics,
	getClerkWeeklyActivity,
	getManagerOverviewStats,
	getManagerOverviewBranches,
	getManagerOverviewCategoryAnalytics,
	getManagerOverviewWeeklyActivity,
	getManagerOverviewReviews,
	getManagerOverviewMonthlyRevenue,
	getManagerBranchStats,
	getManagerBranchCategoryAnalytics,
	getManagerBranchWeeklyActivity,
};
