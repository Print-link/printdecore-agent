import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useThemeClasses } from "../../lib/theme";
import { cn } from "../../lib/utils";
import { apiService } from "../../services/api";
import { Card, EmptyState, Button } from "../../components/ui";
import { PrinterGridSkeleton } from "../../components/ui/skeletons";
import { Printer, RefreshCw, Circle } from "../../components/icons";
import type { PrinterAgent } from "../../types";

export default function StatusPage() {
	const t = useThemeClasses();
	const [autoRefresh, setAutoRefresh] = useState(true);

	const {
		data: printers = [],
		isLoading,
		refetch,
	} = useQuery({
		queryKey: ["printers"],
		queryFn: () => apiService.getAgents(),
		staleTime: 3000,
		refetchInterval: autoRefresh ? 3000 : false,
	});

	const getStatusColor = (status: string) => {
		switch (status?.toLowerCase()) {
			case "online":
				return "text-green-500";
			case "busy":
				return "text-yellow-500";
			case "offline":
			case "error":
				return "text-red-500";
			default:
				return t.textSecondary;
		}
	};

	const getStatusBg = (status: string) => {
		switch (status?.toLowerCase()) {
			case "online":
				return t.isDark
					? "bg-green-900/30 border-green-800"
					: "bg-green-50 border-green-200";
			case "busy":
				return t.isDark
					? "bg-yellow-900/30 border-yellow-800"
					: "bg-yellow-50 border-yellow-200";
			case "offline":
			case "error":
				return t.isDark
					? "bg-red-900/30 border-red-800"
					: "bg-red-50 border-red-200";
			default:
				return t.isDark
					? "bg-gray-700 border-gray-600"
					: "bg-gray-50 border-gray-200";
		}
	};

	return (
		<Card padding="lg" className="rounded-lg">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<label
						className={cn('flex items-center gap-2 text-sm', t.isDark ? 'text-gray-300' : 'text-gray-700')}
					>
						<input
							type="checkbox"
							checked={autoRefresh}
							onChange={(e) => setAutoRefresh(e.target.checked)}
							className="rounded"
						/>
						Auto-refresh
					</label>
					<Button
						variant="secondary"
						onClick={() => refetch()}
						disabled={isLoading}
						icon={RefreshCw}
						className={isLoading ? '[&_svg]:animate-spin' : ''}
					>
						Refresh
					</Button>
				</div>
			</div>

			{isLoading && printers.length === 0 ? (
				<PrinterGridSkeleton />
			) : printers.length === 0 ? (
				<EmptyState
					icon={Printer}
					title="No printers available"
				/>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{printers.map((printer: PrinterAgent) => (
						<div
							key={printer.id}
							className={cn('p-4 rounded-lg border', getStatusBg(printer.status))}
						>
							<div className="flex items-start justify-between mb-3">
								<div className="flex items-center gap-3">
									<Printer
										className={getStatusColor(printer.status)}
										size={24}
									/>
									<div>
										<h3 className={cn('font-semibold', t.text)}>
											{printer.name}
										</h3>
										{printer.computerId && (
											<p className={cn('text-sm', t.textSecondary)}>
												{printer.computerId}
											</p>
										)}
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Circle
										size={12}
										className={getStatusColor(printer.status)}
									/>
									<span
										className={cn(
											'text-xs font-semibold uppercase',
											getStatusColor(printer.status)
										)}
									>
										{printer.status || "Unknown"}
									</span>
								</div>
							</div>
							{printer.currentJob && (
								<div className={cn('mt-3 pt-3 border-t', t.border)}>
									<p className={cn('text-xs', t.textSecondary)}>
										Current Job: {printer.currentJob}
									</p>
								</div>
							)}
							{printer.totalJobs !== undefined && (
								<div className={cn('mt-2 text-xs', t.textSecondary)}>
									Total Jobs: {printer.totalJobs}
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</Card>
	);
}
