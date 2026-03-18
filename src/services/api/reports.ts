import { apiClient } from "./client";
import type { BranchRevenueReport } from "../../types/reports";

async function getBranchRevenueReport(
	branchId: string,
	startDate: string,
	endDate: string
): Promise<BranchRevenueReport> {
	const response = await apiClient.get(
		`/manager/dashboard/branch/${branchId}/revenue-report`,
		{ params: { startDate, endDate } }
	);
	return response.data.data;
}

async function emailBranchRevenueReport(
	branchId: string,
	startDate: string,
	endDate: string,
	recipientEmail?: string
): Promise<string> {
	const response = await apiClient.post(
		`/manager/dashboard/branch/${branchId}/revenue-report/email`,
		{ startDate, endDate, recipientEmail }
	);
	return response.data.message;
}

export const reportApi = {
	getBranchRevenueReport,
	emailBranchRevenueReport,
};
