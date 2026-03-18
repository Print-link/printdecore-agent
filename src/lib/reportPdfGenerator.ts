import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { BranchRevenueReport } from "../types/reports";

/**
 * Generate and download a revenue report PDF on the client side
 */
export function generateRevenueReportPdf(report: BranchRevenueReport): void {
	const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

	const pageWidth = doc.internal.pageSize.getWidth();
	const margin = 14;
	let y = 20;

	// ─── Header ─────────────────────────────────────────────────────
	doc.setFontSize(22);
	doc.setFont("helvetica", "bold");
	doc.text(report.branch.name, pageWidth / 2, y, { align: "center" });
	y += 8;

	doc.setFontSize(14);
	doc.setFont("helvetica", "normal");
	doc.setTextColor(100);
	doc.text("Revenue Report", pageWidth / 2, y, { align: "center" });
	y += 6;

	doc.setFontSize(10);
	doc.text(
		`${formatDate(report.period.startDate)} — ${formatDate(report.period.endDate)}`,
		pageWidth / 2, y, { align: "center" }
	);
	y += 5;

	if (report.branch.address) {
		doc.setFontSize(9);
		doc.text(report.branch.address, pageWidth / 2, y, { align: "center" });
		y += 4;
	}
	if (report.branch.phone || report.branch.email) {
		doc.setFontSize(9);
		doc.text(
			[report.branch.phone, report.branch.email].filter(Boolean).join(" | "),
			pageWidth / 2, y, { align: "center" }
		);
		y += 4;
	}

	// Divider line
	y += 3;
	doc.setDrawColor(200);
	doc.setLineWidth(0.3);
	doc.line(margin, y, pageWidth - margin, y);
	y += 8;

	doc.setTextColor(0);

	// ─── Revenue Summary ────────────────────────────────────────────
	doc.setFontSize(13);
	doc.setFont("helvetica", "bold");
	doc.text("Revenue Summary", margin, y);
	y += 2;

	autoTable(doc, {
		startY: y,
		head: [["Metric", "Value"]],
		body: [
			["Total Revenue", formatCurrency(report.summary.totalRevenue)],
			["Total Orders", String(report.summary.totalOrders)],
			["Average Order Value", formatCurrency(report.summary.averageOrderValue)],
			["Paid Revenue", formatCurrency(report.summary.paidRevenue)],
			["Pending Revenue", formatCurrency(report.summary.pendingRevenue)],
		],
		theme: "striped",
		headStyles: { fillColor: [245, 158, 11], textColor: [30, 30, 30], fontStyle: "bold" },
		styles: { fontSize: 9 },
		margin: { left: margin, right: margin },
	});
	y = (doc as any).lastAutoTable.finalY + 10;

	// ─── Revenue by Status ──────────────────────────────────────────
	if (report.revenueByStatus.length > 0) {
		checkPageBreak(doc, y);
		y = doc.internal.pageSize.getHeight() > y + 30 ? y : 20;

		doc.setFontSize(13);
		doc.setFont("helvetica", "bold");
		doc.text("Revenue by Status", margin, y);
		y += 2;

		autoTable(doc, {
			startY: y,
			head: [["Status", "Orders", "Revenue"]],
			body: report.revenueByStatus.map(s => [
				s.status,
				String(s.orderCount),
				formatCurrency(s.revenue),
			]),
			theme: "striped",
			headStyles: { fillColor: [245, 158, 11], textColor: [30, 30, 30], fontStyle: "bold" },
			styles: { fontSize: 9 },
			margin: { left: margin, right: margin },
		});
		y = (doc as any).lastAutoTable.finalY + 10;
	}

	// ─── Category Performance ───────────────────────────────────────
	if (report.categoryPerformance.length > 0) {
		checkPageBreak(doc, y);
		y = doc.internal.pageSize.getHeight() > y + 30 ? y : 20;

		doc.setFontSize(13);
		doc.setFont("helvetica", "bold");
		doc.text("Category & Service Performance", margin, y);
		y += 2;

		autoTable(doc, {
			startY: y,
			head: [["Category", "Service", "Orders", "Items", "Revenue"]],
			body: report.categoryPerformance.map(c => [
				c.categoryName,
				c.serviceName,
				String(c.orderCount),
				String(c.itemCount),
				formatCurrency(c.revenue),
			]),
			theme: "striped",
			headStyles: { fillColor: [245, 158, 11], textColor: [30, 30, 30], fontStyle: "bold" },
			styles: { fontSize: 9 },
			margin: { left: margin, right: margin },
		});
		y = (doc as any).lastAutoTable.finalY + 10;
	}

	// ─── Daily Trend ────────────────────────────────────────────────
	if (report.dailyTrend.length > 0) {
		checkPageBreak(doc, y);
		y = doc.internal.pageSize.getHeight() > y + 30 ? y : 20;

		doc.setFontSize(13);
		doc.setFont("helvetica", "bold");
		doc.text("Daily Revenue Trend", margin, y);
		y += 2;

		autoTable(doc, {
			startY: y,
			head: [["Date", "Orders", "Revenue"]],
			body: report.dailyTrend.map(d => [
				formatDate(d.date),
				String(d.orderCount),
				formatCurrency(d.revenue),
			]),
			theme: "striped",
			headStyles: { fillColor: [245, 158, 11], textColor: [30, 30, 30], fontStyle: "bold" },
			styles: { fontSize: 9 },
			margin: { left: margin, right: margin },
		});
		y = (doc as any).lastAutoTable.finalY + 10;
	}

	// ─── Order Details ──────────────────────────────────────────────
	if (report.orders.length > 0) {
		checkPageBreak(doc, y);
		y = doc.internal.pageSize.getHeight() > y + 30 ? y : 20;

		doc.setFontSize(13);
		doc.setFont("helvetica", "bold");
		doc.text(`Order Details (${report.orders.length} orders)`, margin, y);
		y += 2;

		autoTable(doc, {
			startY: y,
			head: [["Order ID", "Customer", "Status", "Items", "Total", "Date"]],
			body: report.orders.map(o => [
				o.orderId.slice(0, 8) + "...",
				o.customerName,
				o.status,
				String(o.items.length),
				formatCurrency(o.totalPrice),
				formatDate(o.createdAt),
			]),
			theme: "striped",
			headStyles: { fillColor: [245, 158, 11], textColor: [30, 30, 30], fontStyle: "bold" },
			styles: { fontSize: 8 },
			margin: { left: margin, right: margin },
		});
	}

	// ─── Footer ─────────────────────────────────────────────────────
	const pageCount = doc.getNumberOfPages();
	for (let i = 1; i <= pageCount; i++) {
		doc.setPage(i);
		doc.setFontSize(8);
		doc.setTextColor(150);
		const footerY = doc.internal.pageSize.getHeight() - 8;
		doc.text(
			`Generated on ${new Date(report.generatedAt).toLocaleString()} — Printdecore Revenue Report`,
			pageWidth / 2, footerY, { align: "center" }
		);
		doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, footerY, { align: "right" });
	}

	// Save
	const fileName = `${report.branch.name.replace(/[^a-zA-Z0-9]/g, "_")}_Revenue_Report_${report.period.startDate}_to_${report.period.endDate}.pdf`;
	doc.save(fileName);
}

function checkPageBreak(doc: jsPDF, y: number) {
	if (y > doc.internal.pageSize.getHeight() - 40) {
		doc.addPage();
	}
}

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
