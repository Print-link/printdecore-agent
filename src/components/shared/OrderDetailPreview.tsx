import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useThemeClasses } from '../../lib/theme';
import { stepDoneMessage } from '../../lib/shopSteps';
import { useAuthStore } from '../../stores/authStore';
import { useBranchStore } from '../../stores/branchStore';
import { useToast } from "../../contexts/ToastContext";
import { apiService } from "../../services/api";
import { FilePreviewDrawer } from "./FilePreviewDrawer";
import {
	OrderDetailHeader,
	OrderInfoCard,
	ClientInfoCard,
	OrderItemsList,
	CompleteOrderModal,
	DeclineOrderModal,
	QuoteRequestCard,
	QuoteActionBanner,
} from "./order-detail";
import { Spinner } from "../icons";
import { formatOrderDate } from "./utils/orderUtils";
import type { ClerkOrder, OrderStatus } from "../../types";

interface OrderDetailPreviewProps {
	order: ClerkOrder;
	branchId?: string;
	onClose: () => void;
	onOrderUpdate?: () => void;
}

/**
 * OrderDetailPreview - Displays detailed order information with file preview capability
 * Works for both clerk and manager roles - no role restrictions on file preview
 * Files can be previewed by clicking on file thumbnails, which opens the FilePreviewDrawer
 */
export default function OrderDetailPreview({
	order,
	branchId: propBranchId,
	onClose,
	onOrderUpdate,
}: OrderDetailPreviewProps) {
	const t = useThemeClasses();
	const { user } = useAuthStore();
	const { selectedBranch } = useBranchStore();
	const { success, error: showError } = useToast();
	const queryClient = useQueryClient();
	const [selectedFileIndex, setSelectedFileIndex] = useState<{
		itemIndex: number;
		fileIndex: number;
	} | null>(null);
	const [showCompleteModal, setShowCompleteModal] = useState(false);
	const [showDeclineModal, setShowDeclineModal] = useState(false);

	// Determine branchId: use prop if provided, otherwise determine based on role
	// For managers use selectedBranch, for clerks use user.branch_id
	const branchId =
		propBranchId ||
		(user?.role === "manager" ? selectedBranch?.id : user?.branch_id);

	const { data: orderDetail, isLoading } = useQuery({
		queryKey: ["orderDetail", order.id, branchId],
		queryFn: async () => {
			// Pass branchId for managers to ensure proper data fetching
			const data = await apiService.getBranchOrderDetail(order.id, branchId);
			return data;
		},
		enabled: !!order.id,
	});

	// Mutation for updating to COMPLETED status
	const updateOrderMutation = useMutation({
		mutationFn: (status: "COMPLETED") => {
			return apiService.updateBranchOrder(order.id, { status });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["orderDetail", order.id, branchId],
			});
			queryClient.invalidateQueries({ queryKey: ["branchOrders", branchId] });
			setShowCompleteModal(false);
			// Refresh the page data
			queryClient.refetchQueries({ queryKey: ["branchOrders", branchId] });
			queryClient.refetchQueries({
				queryKey: ["orderDetail", order.id, branchId],
			});
			// Show success toast
			success(
				`Order ${order.orderNumber} has been marked as completed`,
				"Order Completed",
				4000
			);
			if (onOrderUpdate) onOrderUpdate();
		},
		onError: (error: unknown) => {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Failed to mark order as completed";
			showError(errorMessage, "Update Failed", 5000);
		},
	});

	// Accepting a paid order starts production, with a ready-by time for the customer
	const markAsReceivedMutation = useMutation({
		mutationFn: (estimatedCompletionTime: Date) => {
			return apiService.updateBranchOrder(order.id, {
				status: "IN_PROGRESS",
				estimatedCompletionTime: estimatedCompletionTime.toISOString(),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["orderDetail", order.id, branchId],
			});
			queryClient.invalidateQueries({ queryKey: ["branchOrders", branchId] });
			// Refresh the page data
			queryClient.refetchQueries({ queryKey: ["branchOrders", branchId] });
			queryClient.refetchQueries({
				queryKey: ["orderDetail", order.id, branchId],
			});
			// Show success toast
			success(
				`Order ${order.orderNumber} is in production — the customer has the ready-by time`,
				"Order accepted",
				4000
			);
			if (onOrderUpdate) onOrderUpdate();
		},
		onError: (error: unknown) => {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Couldn't accept this order";
			showError(errorMessage, "Update Failed", 5000);
		},
	});

	// Mutation for advancing through production/delivery stages
	const advanceStatusMutation = useMutation({
		mutationFn: (status: OrderStatus) => {
			return apiService.updateBranchOrder(order.id, { status });
		},
		onSuccess: (_data, status) => {
			queryClient.invalidateQueries({
				queryKey: ["orderDetail", order.id, branchId],
			});
			queryClient.invalidateQueries({ queryKey: ["branchOrders", branchId] });
			success(
				stepDoneMessage(status),
				`Order ${order.orderNumber} updated`,
				4000
			);
			if (onOrderUpdate) onOrderUpdate();
		},
		onError: (error: unknown) => {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to update order status";
			showError(errorMessage, "Update Failed", 5000);
		},
	});

	// Marketplace only: turn the order down; the backend refunds the customer
	const declineMutation = useMutation({
		mutationFn: (reason: string) => apiService.declineOrder(order.id, reason),
		onSuccess: (result) => {
			queryClient.invalidateQueries({ queryKey: ["orderDetail", order.id, branchId] });
			queryClient.invalidateQueries({ queryKey: ["branchOrders", branchId] });
			setShowDeclineModal(false);
			success(result.message, "Order declined", 5000);
			if (onOrderUpdate) onOrderUpdate();
		},
		onError: (error: unknown) => {
			showError(error instanceof Error ? error.message : "Couldn't decline this order", "Decline failed", 5000);
		},
	});

	// A request the customer sent this shop: send (or change) its price
	const sendQuoteMutation = useMutation({
		mutationFn: ({ quotationId, amount }: { quotationId: string; amount: number }) => apiService.sendQuote(quotationId, amount),
		onSuccess: (_data, { amount }) => {
			queryClient.invalidateQueries({ queryKey: ["orderDetail", order.id, branchId] });
			queryClient.invalidateQueries({ queryKey: ["branchOrders", branchId] });
			success(`Your price of GHS ${amount.toLocaleString()} is with the customer`, "Price sent", 4000);
			if (onOrderUpdate) onOrderUpdate();
		},
		onError: (error: unknown) => {
			showError(error instanceof Error ? error.message : "Couldn't send the price", "Price not sent", 5000);
		},
	});

	const handleAdvanceStatus = (nextStatus: OrderStatus) => {
		advanceStatusMutation.mutate(nextStatus);
	};

	const handleMarkAsCompleted = () => {
		if (order.status === "COMPLETED") {
			return;
		}
		setShowCompleteModal(true);
	};

	const confirmMarkAsCompleted = () => {
		updateOrderMutation.mutate("COMPLETED");
	};

	const handleMarkAsReceived = (estimatedTime: Date) => {
		markAsReceivedMutation.mutate(estimatedTime);
	};

	const handleFileSelect = (
		itemIndex: number | null,
		fileIndex: number | null
	) => {
		if (itemIndex === null || fileIndex === null) {
			setSelectedFileIndex(null);
		} else {
			setSelectedFileIndex({ itemIndex, fileIndex });
		}
	};

	const formattedDate = formatOrderDate(order.createdAt);

	return (
		<div
			className={`h-full flex flex-col ${
				t.isDark ? "bg-gray-800" : "bg-white"
			}`}
		>
			<OrderDetailHeader formattedDate={formattedDate} onClose={onClose} />

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
				{isLoading ? (
					<div className="flex items-center justify-center h-64">
						<Spinner size="lg" />
					</div>
				) : (
					<>
						{orderDetail?.printRequest?.canQuote &&
							orderDetail.status === "PENDING" &&
							orderDetail.printRequest.quotation?.status !== "SENT" && (
								<QuoteActionBanner
									requestedAt={orderDetail.createdAt}
									declined={orderDetail.printRequest.quotation?.status === "REJECTED"}
									onAct={() => {
										const input = document.getElementById(`quote-${orderDetail.printRequest?.id}`);
										input?.scrollIntoView({ behavior: "smooth", block: "center" });
										input?.focus({ preventScroll: true });
									}}
								/>
							)}
						<OrderInfoCard
							order={orderDetail || order}
							isUpdating={
								declineMutation.isPending ||
								updateOrderMutation.isPending ||
								markAsReceivedMutation.isPending ||
								advanceStatusMutation.isPending
							}
							onMarkAsComplete={handleMarkAsCompleted}
							onMarkAsReceived={handleMarkAsReceived}
							onAdvanceStatus={handleAdvanceStatus}
							onDecline={() => setShowDeclineModal(true)}
						/>

						{orderDetail?.printRequest && (
							<QuoteRequestCard
								request={orderDetail.printRequest}
								status={orderDetail.status}
								isSending={sendQuoteMutation.isPending || declineMutation.isPending}
								onSendQuote={(amount) =>
									orderDetail.printRequest?.quotation &&
									sendQuoteMutation.mutate({ quotationId: orderDetail.printRequest.quotation.id, amount })
								}
								// Only a request sent to your shop can be turned down; Printdecore handles its own
								onDecline={orderDetail.channel === 'marketplace' ? () => setShowDeclineModal(true) : undefined}
							/>
						)}

						<ClientInfoCard client={orderDetail?.client ?? order.client} channel={(orderDetail ?? order).channel} />

						{orderDetail && (
							<OrderItemsList
								orderDetail={orderDetail}
								selectedFileIndex={selectedFileIndex}
								onFileSelect={handleFileSelect}
							/>
						)}
					</>
				)}
			</div>

			{/* File Preview Drawer */}
			<FilePreviewDrawer
				isOpen={selectedFileIndex !== null}
				onClose={() => setSelectedFileIndex(null)}
				orderDetail={orderDetail || null}
				selectedFileIndex={selectedFileIndex}
				onFileChange={(itemIndex, fileIndex) =>
					setSelectedFileIndex({ itemIndex, fileIndex })
				}
			/>

			<DeclineOrderModal
				open={showDeclineModal}
				isPending={declineMutation.isPending}
				onClose={() => setShowDeclineModal(false)}
				onConfirm={(reason) => declineMutation.mutate(reason)}
				unpaid={(orderDetail ?? order).status === "PENDING" || (orderDetail ?? order).status === "QUOTED"}
			/>

			{/* Complete Order Modal */}
			<CompleteOrderModal
				order={order}
				isOpen={showCompleteModal}
				isPending={updateOrderMutation.isPending}
				onClose={() => setShowCompleteModal(false)}
				onConfirm={confirmMarkAsCompleted}
			/>
		</div>
	);
}
