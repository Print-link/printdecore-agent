import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { useBranchStore } from '../../stores/branchStore';
import { usePermissions, PERMISSIONS } from '../../hooks/usePermissions';
import { apiService } from '../../services/api';
import { Search, RefreshCw } from "../../components/icons";
import { Card, IconButton, StatusBadge, EmptyState, Input } from '../../components/ui';
import { OrdersListSkeleton } from '../../components/ui/skeletons';
import { useThemeClasses } from '../../lib/theme';
import { cn } from '../../lib/utils';
import OrderDetailPreview from "../../components/shared/OrderDetailPreview";
import { ReviewOrderModal } from "../../components/shared/order-prompts/ReviewOrderModal";
import { useOrderPromptStore } from "../../stores/orderPromptStore";
import type { ClerkOrder } from "../../types";
import type { PipelineStage } from "../../services/api/vendorHome";
import { STAGE_STATUSES, STAGE_LABELS, isOpenStatus } from "../../lib/orderStages";

/**
 * The filter lives in the link (?filter=), so Home can open the list already
 * narrowed: a status, "stage:<stage>", "due:today" or "due:overdue".
 */
function matchesFilter(order: ClerkOrder, filter: string) {
	if (filter === "all") return true;
	if (filter.startsWith("stage:")) return STAGE_STATUSES[filter.slice(6) as PipelineStage]?.includes(order.status) ?? false;
	if (filter.startsWith("due:")) {
		if (!order.estimatedCompletionTime || !isOpenStatus(order.status)) return false;
		const due = new Date(order.estimatedCompletionTime);
		const now = new Date();
		if (filter === "due:overdue") return due < now;
		return due.toDateString() === now.toDateString();
	}
	return order.status === filter;
}

export default function OrdersPage() {
	const { user } = useAuthStore();
	const { selectedBranch } = useBranchStore();
	const t = useThemeClasses();
	const { isClerk, hasPermission } = usePermissions();
	const [searchQuery, setSearchQuery] = useState("");
	const [params, setParams] = useSearchParams();
	const statusFilter = params.get("filter") || "all";
	const setStatusFilter = (value: string) =>
		setParams((p) => {
			if (value === "all") p.delete("filter");
			else p.set("filter", value);
			return p;
		}, { replace: true });
	const [selectedOrder, setSelectedOrder] = useState<ClerkOrder | null>(null);
	// A new paid order asks to be reviewed (marked Received) before it opens
	const [reviewing, setReviewing] = useState<ClerkOrder | null>(null);
	const setReviewOpen = useOrderPromptStore((s) => s.setReviewOpen);
	useEffect(() => {
		setReviewOpen(!!reviewing);
		return () => setReviewOpen(false);
	}, [reviewing, setReviewOpen]);

	// Determine which branch_id to use
	// Clerks use their own branch_id from login, managers use selected branch
	const branchId = isClerk ? user?.branch_id : selectedBranch?.id;
	const queryClient = useQueryClient();
	const canUpdate = hasPermission(PERMISSIONS.ORDERS_UPDATE);

	/** Open an order — a new paid one first asks to be reviewed */
	const openOrder = (order: ClerkOrder) => {
		if (order.status === "PAID" && canUpdate) setReviewing(order);
		else setSelectedOrder(order);
	};

	// Use getBranchOrders API (same as agent app)
	const {
		data: orders = [],
		isLoading,
		refetch,
	} = useQuery({
		queryKey: ["branchOrders", branchId],
		queryFn: async () => {
			if (!branchId) {
				throw new Error(
					user?.role === "clerk"
						? "No branch assigned to this clerk"
						: "No branch selected"
				);
			}
			return await apiService.getBranchOrders(branchId);
		},
		enabled: !!branchId,
		staleTime: 10000, // 10 seconds
		refetchInterval: 15000, // Refetch every 15 seconds
	});

	// ?order=<id> opens that order (links from Home)
	const openId = params.get("order");
	useEffect(() => {
		if (!openId) return;
		const found = orders.find((o) => o.id === openId);
		if (found) {
			openOrder(found);
			setParams((p) => {
				p.delete("order");
				return p;
			}, { replace: true });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- openOrder only reads the permission
	}, [openId, orders, setParams]);

	const filteredOrders = useMemo(() => {
		let filtered = [...orders];

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(order) =>
					order.client.fullName?.toLowerCase().includes(query) ||
					order.client.email?.toLowerCase().includes(query) ||
					order.client.phoneNumber?.toLowerCase().includes(query) ||
					order.id?.toLowerCase().includes(query)
			);
		}

		filtered = filtered.filter((order) => matchesFilter(order, statusFilter));

		return filtered;
	}, [orders, searchQuery, statusFilter]);

	if (!hasPermission(PERMISSIONS.ORDERS_VIEW)) {
		return (
			<Card>
				<p className={t.textSecondary}>
					Access denied. You need order permissions.
				</p>
			</Card>
		);
	}

	if (!selectedBranch && !isClerk) {
		return (
			<Card>
				<p className={t.textSecondary}>
					Please select a branch to view orders
				</p>
			</Card>
		);
	}

	return (
		<div className="flex flex-col h-full overflow-hidden">
			{/* Header */}
			<div className="flex-shrink-0 mb-2">
				<div className="flex items-center justify-between mb-2 flex-wrap gap-2">
					<h2 className={cn('text-lg sm:text-xl font-bold', t.text)}>
						Orders ({filteredOrders.length})
					</h2>
					<IconButton icon={RefreshCw} label="Refresh orders" onClick={() => refetch()} />
				</div>

				{/* Filters */}
				<div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
					<div className="relative flex-1">
						<Search
							className={cn('absolute left-3 top-1/2 -translate-y-1/2', t.textSecondary)}
							size={20}
						/>
						<Input
							type="text"
							placeholder="Search orders..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>
					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						className={cn(
							'px-3 sm:px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-amber-400',
							t.input
						)}
					>
						<option value="all">All orders</option>
						<optgroup label="Open orders">
							{(Object.keys(STAGE_LABELS) as PipelineStage[]).map((stage) => (
								<option key={stage} value={`stage:${stage}`}>{STAGE_LABELS[stage]}</option>
							))}
							<option value="due:today">Due today</option>
							<option value="due:overdue">Overdue</option>
						</optgroup>
						<optgroup label="Status">
						<option value="PENDING">Pending</option>
						<option value="QUOTED">Quoted</option>
						<option value="PAID">Paid</option>
						<option value="RECEIVED">Received</option>
						<option value="PRINTING">Printing</option>
						<option value="IN_PROGRESS">In Progress</option>
						<option value="QUALITY_CHECK">Quality Check</option>
						<option value="READY_FOR_PICKUP">Ready for Pickup</option>
						<option value="OUT_FOR_DELIVERY">Out for Delivery</option>
						<option value="DELIVERED">Delivered</option>
						<option value="COMPLETED">Completed</option>
						<option value="CANCELLED">Cancelled</option>
						</optgroup>
					</select>
				</div>
			</div>

			{/* Main Content - Split View */}
			<div className="flex flex-1 overflow-hidden gap-0 min-h-0 flex-col lg:flex-row">
				{/* Orders List */}
				<div
					className={cn(
						'flex flex-col overflow-hidden transition-all duration-300',
						selectedOrder
							? cn('w-full lg:w-[380px] xl:w-[420px] lg:max-w-[420px] lg:min-w-[380px] border-b lg:border-b-0 lg:border-r', t.border)
							: 'w-full max-w-full lg:max-w-[600px]'
					)}
				>
					<div className="flex-1 overflow-y-auto overflow-x-hidden pr-1 max-h-[40vh] lg:max-h-none">
						{isLoading ? (
							<OrdersListSkeleton />
						) : filteredOrders.length === 0 ? (
							<Card>
								<EmptyState title="No orders found" />
							</Card>
						) : (
							<div className="space-y-2">
								{filteredOrders.map((order) => (
									<div
										key={order.id}
										onClick={() =>
											selectedOrder?.id === order.id ? setSelectedOrder(null) : openOrder(order)
										}
										className={cn(
											'p-3 rounded-lg cursor-pointer transition-all',
											selectedOrder?.id === order.id
												? 'ring-2 ring-amber-400 bg-amber-50 dark:bg-amber-900/20'
												: cn(t.surface, t.isDark ? 'hover:border-gray-600' : 'hover:border-gray-300')
										)}
									>
										<div className="flex items-center justify-between mb-1.5">
											<span className={cn('text-xs font-semibold', t.text)}>
												{order.orderNumber}
											</span>
											{order.channel === "marketplace" && (
												<span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
													Your customer
												</span>
											)}
											<StatusBadge status={order.status} className="text-[10px] px-1.5 py-0.5" />
										</div>
										<p className={cn('text-xs mb-1', t.textSecondary)}>
											{order.client.fullName}
										</p>
										<div className="flex items-center justify-between">
											<p className={cn('text-base font-bold', t.text)}>
												{'\u20B5'}{order.totalPrice.toFixed(2)}
											</p>
											<p className="text-[10px] text-gray-500">
												{order.itemCount} item{order.itemCount !== 1 ? "s" : ""}
											</p>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Preview Panel */}
				{selectedOrder && (
					<div className="flex-1 flex flex-col overflow-hidden min-w-0 w-full lg:w-auto">
						<OrderDetailPreview
							order={selectedOrder}
							branchId={branchId}
							onClose={() => setSelectedOrder(null)}
							onOrderUpdate={() => {
								queryClient.invalidateQueries({ queryKey: ["branchOrders"] });
								queryClient.invalidateQueries({
									queryKey: ["orderDetail", selectedOrder.id],
								});
								refetch();
							}}
						/>
					</div>
				)}

				<ReviewOrderModal
					order={reviewing}
					onClose={() => setReviewing(null)}
					onReviewed={(order) => {
						setReviewing(null);
						setSelectedOrder(order);
						refetch();
					}}
				/>

				{/* Empty State when no order selected */}
				{!selectedOrder && (
					<div className={cn('flex-1 flex items-center justify-center', t.surfaceInset)}>
						<EmptyState
							title="Select an order to view details"
							description="Click on any order from the list to see its details and files"
						/>
					</div>
				)}
			</div>
		</div>
	);
}
