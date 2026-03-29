import { useState, useMemo } from "react";
import { X, Search, ChevronDown, ChevronUp, FileText, Download } from "../../../../components/icons";
import { useThemeClasses } from "../../../../lib/theme";
import { cn, formatCurrency } from "../../../../lib/utils";
import type { ClerkOrderDetail, ClerkOrderItem } from "../../../../types";

interface OrdersPanelProps {
	orders: ClerkOrderDetail[];
	selectedDate: string;
	isLoading?: boolean;
	isOpen: boolean;
	onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
	COMPLETED: "#10b981",
	IN_PROGRESS: "#8b5cf6",
	PAID: "#3b82f6",
	QUOTED: "#f59e0b",
	PENDING: "#ef4444",
};

function getFileIcon(type: string) {
	if (type?.startsWith("image/")) return null; // We'll show a thumbnail
	return <FileText size={20} className="text-amber-500 shrink-0" />;
}

function OrderItemRow({ item }: { item: ClerkOrderItem }) {
	const t = useThemeClasses();
	const files = item.options?.files || [];

	return (
		<div className={cn("px-3 py-2.5 rounded-lg border", t.isDark ? "bg-gray-700/40 border-gray-600" : "bg-gray-50 border-gray-200")}>
			<div className="flex items-center justify-between gap-2 mb-1">
				<span className={cn("text-xs font-semibold truncate", t.text)}>
					{item.serviceName}
				</span>
				<span className={cn("text-xs font-bold shrink-0", t.isDark ? "text-emerald-400" : "text-emerald-600")}>
					{formatCurrency(item.calculatedPrice)}
				</span>
			</div>

			<div className={cn("flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]", t.textTertiary)}>
				{item.quantity > 1 && <span>Qty: {item.quantity}</span>}
				{item.selectedConfigDetails?.baseConfig && (
					<span>{item.selectedConfigDetails.baseConfig.name}</span>
				)}
				{item.selectedConfigDetails?.options?.map((o) => (
					<span key={o.id}>{o.name}</span>
				))}
			</div>

			{/* Files */}
			{files.length > 0 && (
				<div className="mt-2 flex flex-wrap gap-2">
					{files.map((file, i) => (
						<a
							key={i}
							href={file.url}
							target="_blank"
							rel="noopener noreferrer"
							className="block"
						>
							{file.type?.startsWith("image/") ? (
								<img
									src={file.url}
									alt={file.name}
									className="w-12 h-12 rounded-md object-cover border border-gray-200 dark:border-gray-600 hover:opacity-80 transition-opacity"
								/>
							) : (
								<div className={cn(
									"flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-[10px] hover:opacity-80 transition-opacity",
									t.isDark ? "bg-gray-600 border-gray-500" : "bg-white border-gray-200",
								)}>
									{getFileIcon(file.type)}
									<span className={cn("truncate max-w-[80px]", t.text)}>{file.name}</span>
									<Download size={10} className={t.textTertiary} />
								</div>
							)}
						</a>
					))}
				</div>
			)}
		</div>
	);
}

export function OrdersPanel({
	orders,
	selectedDate,
	isLoading,
	isOpen,
	onClose,
}: OrdersPanelProps) {
	const t = useThemeClasses();
	const [searchQuery, setSearchQuery] = useState("");
	const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

	const filteredOrders = useMemo(() => {
		if (!searchQuery.trim()) return orders;
		const query = searchQuery.toLowerCase();
		return orders.filter(
			(order) =>
				order.orderNumber.toLowerCase().includes(query) ||
				order.client.fullName.toLowerCase().includes(query) ||
				order.status.toLowerCase().includes(query),
		);
	}, [orders, searchQuery]);

	if (!isOpen || !selectedDate) return null;

	const formattedDate = new Date(selectedDate).toLocaleDateString("en-US", {
		weekday: "short",
		year: "numeric",
		month: "short",
		day: "numeric",
	});

	return (
		<div
			className={cn(
				"fixed right-0 top-14 md:top-16 h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] w-full sm:w-[380px] z-40 flex flex-col transition-transform duration-300 border-l shadow-xl",
				t.isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200",
			)}
		>
			{/* Header */}
			<div className={cn("flex items-center justify-between px-4 py-3 border-b shrink-0", t.border)}>
				<div className="min-w-0">
					<h3 className={cn("text-sm font-bold truncate", t.text)}>{formattedDate}</h3>
					<p className={cn("text-xs", t.textSecondary)}>
						{filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
						{searchQuery && ` (of ${orders.length})`}
					</p>
				</div>
				<button
					onClick={onClose}
					className={cn("p-2 rounded-lg shrink-0", t.isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-600")}
				>
					<X size={18} />
				</button>
			</div>

			{/* Search */}
			<div className={cn("px-4 py-2.5 border-b shrink-0", t.border)}>
				<div className="relative">
					<Search size={14} className={cn("absolute left-3 top-1/2 -translate-y-1/2", t.textTertiary)} />
					<input
						type="text"
						placeholder="Search orders..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className={cn("w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400", t.input)}
					/>
				</div>
			</div>

			{/* Orders */}
			<div className="flex-1 overflow-y-auto">
				{isLoading ? (
					<div className="p-8 text-center">
						<p className={cn("text-sm", t.textSecondary)}>Loading...</p>
					</div>
				) : filteredOrders.length === 0 ? (
					<div className="p-8 text-center">
						<p className={cn("text-sm", t.textSecondary)}>
							{searchQuery ? "No orders match your search." : "No orders for this date."}
						</p>
					</div>
				) : (
					<div className={cn("divide-y", t.isDark ? "divide-gray-700" : "divide-gray-100")}>
						{filteredOrders.map((order) => {
							const isExpanded = expandedOrderId === order.id;
							const statusColor = STATUS_COLORS[order.status] || "#6b7280";

							return (
								<div key={order.id} className={cn("transition-colors", t.isDark ? "hover:bg-gray-700/30" : "hover:bg-gray-50/50")}>
									{/* Order summary row */}
									<div className="px-4 py-3">
										<div className="flex items-center justify-between gap-2 mb-1">
											<span className={cn("text-xs font-bold", t.text)}>
												{order.orderNumber}
											</span>
											<span
												className="px-1.5 py-0.5 rounded text-[10px] font-bold"
												style={{ background: `${statusColor}18`, color: statusColor }}
											>
												{order.status}
											</span>
										</div>
										<p className={cn("text-xs truncate mb-1", t.textSecondary)}>
											{order.client.fullName}
										</p>
										<div className="flex items-center justify-between">
											<span className={cn("text-sm font-bold", t.text)}>
												{formatCurrency(order.totalPrice)}
											</span>
											{order.items && order.items.length > 0 && (
												<button
													onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
													className={cn(
														"flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md transition-colors",
														isExpanded
															? "bg-amber-400/15 text-amber-600 dark:text-amber-400"
															: t.isDark
																? "text-gray-400 hover:bg-gray-700"
																: "text-gray-500 hover:bg-gray-100",
													)}
												>
													{order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
													{isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
												</button>
											)}
										</div>
										{order.comment && (
											<p className={cn("text-[10px] mt-1 truncate", t.textTertiary)}>
												{order.comment}
											</p>
										)}
									</div>

									{/* Expanded order items */}
									{isExpanded && order.items && order.items.length > 0 && (
										<div className={cn("px-4 pb-3 space-y-2", t.isDark ? "bg-gray-750" : "bg-gray-50/50")}>
											{order.items.map((item) => (
												<OrderItemRow key={item.id} item={item} />
											))}
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
