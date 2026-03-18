import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBranchStore } from "../../stores/branchStore";
import { useAuthStore } from "../../stores/authStore";
import { useThemeClasses } from "../../lib/theme";
import { cn } from "../../lib/utils";
import { useToast } from "../../contexts/ToastContext";
import { usePermissions, PERMISSIONS } from "../../hooks/usePermissions";
import { apiService } from "../../services/api";
import { generateRevenueReportPdf } from "../../lib/reportPdfGenerator";
import {
	Card,
	PageHeader,
	Button,
	Input,
	Modal,
	EmptyState,
	StatusBadge,
} from "../../components/ui";
import {
	FileText,
	Download,
	Mail,
	BarChart3,
} from "../../components/icons";
import type { BranchRevenueReport } from "../../types/reports";

export default function ReportsPage() {
	const { selectedBranch } = useBranchStore();
	const { user } = useAuthStore();
	const { isClerk, hasPermission } = usePermissions();
	const t = useThemeClasses();
	const { success, error: showError } = useToast();

	const canExport = hasPermission(PERMISSIONS.REPORTS_EXPORT);

	// Date range — default to current month
	const now = new Date();
	const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
	const today = now.toISOString().split("T")[0];

	const [startDate, setStartDate] = useState(firstOfMonth);
	const [endDate, setEndDate] = useState(today);
	const [showEmailModal, setShowEmailModal] = useState(false);
	const [recipientEmail, setRecipientEmail] = useState(selectedBranch?.branchEmailAddress || "");
	const [isSendingEmail, setIsSendingEmail] = useState(false);

	// Clerks use their assigned branch; managers use the selected branch
	const branchId = isClerk ? user?.branch_id : selectedBranch?.id;
	const branchName = isClerk ? "Your Branch" : selectedBranch?.name;

	const {
		data: report,
		isLoading,
		isFetching,
		refetch,
		isError,
	} = useQuery<BranchRevenueReport>({
		queryKey: ["branchRevenueReport", branchId, startDate, endDate],
		queryFn: () => apiService.getBranchRevenueReport(branchId!, startDate, endDate),
		enabled: false,
	});

	const handleGenerate = () => {
		if (!branchId) return;
		if (!startDate || !endDate) {
			showError("Please select both start and end dates", "Missing Dates");
			return;
		}
		if (startDate > endDate) {
			showError("Start date must be before end date", "Invalid Range");
			return;
		}
		refetch();
	};

	const handleDownloadPdf = () => {
		if (!report) return;
		generateRevenueReportPdf(report);
		success("PDF downloaded successfully", "Download Complete");
	};

	const handleEmailReport = async () => {
		if (!branchId || !report) return;
		if (!recipientEmail) {
			showError("Please enter a recipient email", "Missing Email");
			return;
		}
		setIsSendingEmail(true);
		try {
			const message = await apiService.emailBranchRevenueReport(
				branchId,
				startDate,
				endDate,
				recipientEmail
			);
			success(message, "Email Sent");
			setShowEmailModal(false);
		} catch (err) {
			showError(
				err instanceof Error ? err.message : "Failed to send email",
				"Email Failed"
			);
		} finally {
			setIsSendingEmail(false);
		}
	};

	if (!branchId) {
		return (
			<div className="space-y-6">
				<PageHeader title="Reports" description="Select a branch to generate reports" />
				<EmptyState
					icon={FileText}
					title="No Branch Selected"
					description="Please select a branch from the sidebar to generate revenue reports."
				/>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title="Revenue Report"
				description={branchName}
				actions={
					report && canExport ? (
						<div className="flex gap-2">
							<Button icon={Download} onClick={handleDownloadPdf}>
								Download PDF
							</Button>
							<Button
								variant="secondary"
								icon={Mail}
								onClick={() => setShowEmailModal(true)}
							>
								Email Report
							</Button>
						</div>
					) : undefined
				}
			/>

			{/* Date Range & Generate */}
			<Card>
				<div className="flex flex-wrap items-end gap-4">
					<div className="flex-1 min-w-[180px]">
						<Input
							label="Start Date"
							type="date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
						/>
					</div>
					<div className="flex-1 min-w-[180px]">
						<Input
							label="End Date"
							type="date"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
						/>
					</div>
					<Button
						icon={BarChart3}
						onClick={handleGenerate}
						loading={isLoading || isFetching}
					>
						Generate Report
					</Button>
				</div>
			</Card>

			{/* Error state */}
			{isError && (
				<Card>
					<EmptyState
						icon={FileText}
						title="Failed to generate report"
						description="Something went wrong. Please try again."
						action={<Button onClick={handleGenerate}>Retry</Button>}
					/>
				</Card>
			)}

			{/* Report Preview */}
			{report && (
				<>
					{/* Summary Cards */}
					<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
						<SummaryCard
							label="Total Revenue"
							value={formatCurrency(report.summary.totalRevenue)}
							t={t}
						/>
						<SummaryCard
							label="Total Orders"
							value={String(report.summary.totalOrders)}
							t={t}
						/>
						<SummaryCard
							label="Avg Order Value"
							value={formatCurrency(report.summary.averageOrderValue)}
							t={t}
						/>
						<SummaryCard
							label="Paid Revenue"
							value={formatCurrency(report.summary.paidRevenue)}
							highlight="green"
							t={t}
						/>
						<SummaryCard
							label="Pending Revenue"
							value={formatCurrency(report.summary.pendingRevenue)}
							highlight="amber"
							t={t}
						/>
					</div>

					{/* Revenue by Status */}
					{report.revenueByStatus.length > 0 && (
						<Card>
							<h3 className={cn("text-lg font-semibold mb-4", t.text)}>
								Revenue by Status
							</h3>
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className={cn("border-b", t.border)}>
											<th className={cn("text-left py-2 px-3 font-medium", t.textSecondary)}>Status</th>
											<th className={cn("text-right py-2 px-3 font-medium", t.textSecondary)}>Orders</th>
											<th className={cn("text-right py-2 px-3 font-medium", t.textSecondary)}>Revenue</th>
										</tr>
									</thead>
									<tbody>
										{report.revenueByStatus.map((s) => (
											<tr key={s.status} className={cn("border-b last:border-0", t.borderSubtle)}>
												<td className="py-2.5 px-3">
													<StatusBadge status={s.status} />
												</td>
												<td className={cn("text-right py-2.5 px-3", t.text)}>{s.orderCount}</td>
												<td className={cn("text-right py-2.5 px-3 font-medium", t.text)}>
													{formatCurrency(s.revenue)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</Card>
					)}

					{/* Category Performance */}
					{report.categoryPerformance.length > 0 && (
						<Card>
							<h3 className={cn("text-lg font-semibold mb-4", t.text)}>
								Category & Service Performance
							</h3>
							<div className="overflow-x-auto">
								<table className="w-full text-sm">
									<thead>
										<tr className={cn("border-b", t.border)}>
											<th className={cn("text-left py-2 px-3 font-medium", t.textSecondary)}>Category</th>
											<th className={cn("text-left py-2 px-3 font-medium", t.textSecondary)}>Service</th>
											<th className={cn("text-right py-2 px-3 font-medium", t.textSecondary)}>Orders</th>
											<th className={cn("text-right py-2 px-3 font-medium", t.textSecondary)}>Items</th>
											<th className={cn("text-right py-2 px-3 font-medium", t.textSecondary)}>Revenue</th>
										</tr>
									</thead>
									<tbody>
										{report.categoryPerformance.map((c, i) => (
											<tr key={i} className={cn("border-b last:border-0", t.borderSubtle)}>
												<td className={cn("py-2.5 px-3", t.text)}>{c.categoryName}</td>
												<td className={cn("py-2.5 px-3", t.textSecondary)}>{c.serviceName}</td>
												<td className={cn("text-right py-2.5 px-3", t.text)}>{c.orderCount}</td>
												<td className={cn("text-right py-2.5 px-3", t.text)}>{c.itemCount}</td>
												<td className={cn("text-right py-2.5 px-3 font-medium", t.text)}>
													{formatCurrency(c.revenue)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</Card>
					)}

					{/* Daily Trend */}
					{report.dailyTrend.length > 0 && (
						<Card>
							<h3 className={cn("text-lg font-semibold mb-4", t.text)}>
								Daily Revenue Trend
							</h3>
							<div className="overflow-x-auto max-h-80 overflow-y-auto">
								<table className="w-full text-sm">
									<thead className="sticky top-0">
										<tr className={cn("border-b", t.border, t.isDark ? "bg-gray-800" : "bg-white")}>
											<th className={cn("text-left py-2 px-3 font-medium", t.textSecondary)}>Date</th>
											<th className={cn("text-right py-2 px-3 font-medium", t.textSecondary)}>Orders</th>
											<th className={cn("text-right py-2 px-3 font-medium", t.textSecondary)}>Revenue</th>
										</tr>
									</thead>
									<tbody>
										{report.dailyTrend.map((d) => (
											<tr key={d.date} className={cn("border-b last:border-0", t.borderSubtle)}>
												<td className={cn("py-2.5 px-3", t.text)}>{formatDate(d.date)}</td>
												<td className={cn("text-right py-2.5 px-3", t.text)}>{d.orderCount}</td>
												<td className={cn("text-right py-2.5 px-3 font-medium", t.text)}>
													{formatCurrency(d.revenue)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</Card>
					)}

					{/* Order Details */}
					{report.orders.length > 0 && (
						<Card>
							<h3 className={cn("text-lg font-semibold mb-4", t.text)}>
								Order Details ({report.orders.length} orders)
							</h3>
							<div className="overflow-x-auto max-h-96 overflow-y-auto">
								<table className="w-full text-sm">
									<thead className="sticky top-0">
										<tr className={cn("border-b", t.border, t.isDark ? "bg-gray-800" : "bg-white")}>
											<th className={cn("text-left py-2 px-3 font-medium", t.textSecondary)}>Order ID</th>
											<th className={cn("text-left py-2 px-3 font-medium", t.textSecondary)}>Customer</th>
											<th className={cn("text-left py-2 px-3 font-medium", t.textSecondary)}>Status</th>
											<th className={cn("text-right py-2 px-3 font-medium", t.textSecondary)}>Items</th>
											<th className={cn("text-right py-2 px-3 font-medium", t.textSecondary)}>Total</th>
											<th className={cn("text-right py-2 px-3 font-medium", t.textSecondary)}>Date</th>
										</tr>
									</thead>
									<tbody>
										{report.orders.map((o) => (
											<tr key={o.orderId} className={cn("border-b last:border-0", t.borderSubtle)}>
												<td className={cn("py-2.5 px-3 font-mono text-xs", t.textSecondary)}>
													{o.orderId.slice(0, 8)}...
												</td>
												<td className={cn("py-2.5 px-3", t.text)}>{o.customerName}</td>
												<td className="py-2.5 px-3">
													<StatusBadge status={o.status} />
												</td>
												<td className={cn("text-right py-2.5 px-3", t.text)}>{o.items.length}</td>
												<td className={cn("text-right py-2.5 px-3 font-medium", t.text)}>
													{formatCurrency(o.totalPrice)}
												</td>
												<td className={cn("text-right py-2.5 px-3", t.textSecondary)}>
													{formatDate(o.createdAt)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</Card>
					)}

					{/* Empty report */}
					{report.summary.totalOrders === 0 && (
						<Card>
							<EmptyState
								icon={FileText}
								title="No orders found"
								description={`No orders found for ${branchName} between ${formatDate(startDate)} and ${formatDate(endDate)}.`}
							/>
						</Card>
					)}
				</>
			)}

			{/* No report generated yet */}
			{!report && !isLoading && !isFetching && !isError && (
				<Card>
					<EmptyState
						icon={BarChart3}
						title="Generate a Report"
						description="Select a date range and click Generate Report to view comprehensive revenue data for this branch."
					/>
				</Card>
			)}

			{/* Email Modal */}
			<Modal
				open={showEmailModal}
				onClose={() => setShowEmailModal(false)}
				title="Email Report"
			>
				<div className="space-y-4">
					<p className={cn("text-sm", t.textSecondary)}>
						Send the revenue report for <strong>{branchName}</strong> as a PDF attachment.
					</p>
					<Input
						label="Recipient Email"
						type="email"
						value={recipientEmail}
						onChange={(e) => setRecipientEmail(e.target.value)}
						placeholder="Enter email address"
					/>
					<div className="flex justify-end gap-3 pt-2">
						<Button
							variant="secondary"
							onClick={() => setShowEmailModal(false)}
						>
							Cancel
						</Button>
						<Button
							icon={Mail}
							onClick={handleEmailReport}
							loading={isSendingEmail}
						>
							Send Report
						</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
}

// ─── Helper Components ──────────────────────────────────────────────

function SummaryCard({
	label,
	value,
	highlight,
	t,
}: {
	label: string;
	value: string;
	highlight?: "green" | "amber";
	t: ReturnType<typeof useThemeClasses>;
}) {
	const valueColor = highlight === "green"
		? "text-green-500"
		: highlight === "amber"
			? "text-amber-500"
			: t.text;

	return (
		<Card>
			<p className={cn("text-xs font-medium mb-1", t.textSecondary)}>{label}</p>
			<p className={cn("text-xl font-bold", valueColor)}>{value}</p>
		</Card>
	);
}

// ─── Formatters ─────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
	return amount.toLocaleString("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
	});
}

function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	if (isNaN(date.getTime())) return dateStr;
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}
