import { apiClient } from "./client";
import type {
	PrintJob,
	PrinterAgent,
	PrinterLog,
	AnalyticsData,
} from "../../types";

// Print Jobs
async function getJobs(): Promise<PrintJob[]> {
	const response = await apiClient.get("/print/jobs");
	return response.data.data;
}

async function getJob(id: string): Promise<PrintJob> {
	const response = await apiClient.get(`/print/jobs/${id}`);
	return response.data.data;
}

async function createJob(
	job: Omit<PrintJob, "id" | "submittedAt">
): Promise<PrintJob> {
	const response = await apiClient.post("/print/jobs", job);
	return response.data.data;
}

async function updateJob(id: string, updates: Partial<PrintJob>): Promise<PrintJob> {
	const response = await apiClient.patch(
		`/print/jobs/${id}`,
		updates
	);
	return response.data.data;
}

async function deleteJob(id: string): Promise<void> {
	await apiClient.delete(`/print/jobs/${id}`);
}

async function submitJobToPrinter(jobId: string, agentId: string): Promise<void> {
	await apiClient.post(`/print/jobs/${jobId}/submit`, { agentId });
}

// Printer Agents
async function getAgents(): Promise<PrinterAgent[]> {
	try {
		const response = await apiClient.get("/print/agents");
		return response.data.data || [];
	} catch (error) {
		// Handle 404 or other errors gracefully - return empty array if endpoint doesn't exist
		if (error && typeof error === "object" && "response" in error) {
			const axiosError = error as { response?: { status?: number } };
			if (axiosError.response?.status === 404) {
				console.warn("Print agents endpoint not available (404)");
				return [];
			}
		}
		throw error;
	}
}

async function getAgent(id: string): Promise<PrinterAgent> {
	try {
		const response = await apiClient.get(`/print/agents/${id}`);
		return response.data.data;
	} catch (error) {
		// Handle 404 gracefully
		if (error && typeof error === "object" && "response" in error) {
			const axiosError = error as { response?: { status?: number } };
			if (axiosError.response?.status === 404) {
				throw new Error("Agent not found");
			}
		}
		throw error;
	}
}

async function updateAgentStatus(
	id: string,
	status: PrinterAgent["status"]
): Promise<PrinterAgent> {
	const response = await apiClient.patch(
		`/print/agents/${id}/status`,
		{ status }
	);
	return response.data.data;
}

// Printer Logs
async function getLogs(agentId?: string): Promise<PrinterLog[]> {
	const params = agentId ? { agentId } : {};
	const response = await apiClient.get("/print/logs", { params });
	return response.data.data;
}

async function getLogsByDateRange(
	startDate: string,
	endDate: string
): Promise<PrinterLog[]> {
	const response = await apiClient.get("/print/logs", {
		params: { startDate, endDate },
	});
	return response.data.data;
}

// Analytics
async function getAnalytics(dateRange?: {
	start: string;
	end: string;
}): Promise<AnalyticsData> {
	const params = dateRange
		? { start: dateRange.start, end: dateRange.end }
		: {};
	const response = await apiClient.get("/print/analytics", {
		params,
	});
	return response.data.data;
}

async function getComparisonData(): Promise<{
	requestedJobs: PrintJob[];
	actualPrints: PrinterLog[];
	discrepancies: Array<{
		jobId: string;
		requestedPages: number;
		actualPages: number;
		difference: number;
	}>;
}> {
	const response = await apiClient.get(
		"/print/analytics/comparison"
	);
	return response.data.data;
}

// File Upload
async function uploadFile(
	file: File
): Promise<{ fileId: string; fileName: string; fileSize: number }> {
	const formData = new FormData();
	formData.append("file", file);

	const response = await apiClient.post("/print/upload", formData, {
		headers: {
			"Content-Type": "multipart/form-data",
		},
	});

	return response.data.data;
}

// Health check
async function healthCheck(): Promise<{
	success: boolean;
	message: string;
	timestamp: string;
	version: string;
}> {
	const response = await apiClient.get("/health");
	return response.data;
}

export const legacyApi = {
	getJobs,
	getJob,
	createJob,
	updateJob,
	deleteJob,
	submitJobToPrinter,
	getAgents,
	getAgent,
	updateAgentStatus,
	getLogs,
	getLogsByDateRange,
	getAnalytics,
	getComparisonData,
	uploadFile,
	healthCheck,
};
