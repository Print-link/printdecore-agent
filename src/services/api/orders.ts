import { apiClient } from "./client";
import type {
	ClerkOrdersResponse,
	ClerkOrdersFilters,
	ClerkOrderDetail,
	ClerkOrder,
	OrderStatus,
} from "../../types";

async function getBranchOrders(branchId: string): Promise<ClerkOrder[]> {
	// Backend route: GET /orders/branch/:branchId
	// Returns orders with client info but without orderNumber or itemCount
	const response = await apiClient.get(`/orders/branch/${branchId}`);

	if (!response.data.status && !response.data.success) {
		throw new Error(response.data.message || "Failed to get branch orders");
	}

	const orders = response.data.data || [];

	// Transform backend response to match ClerkOrder type
	// Backend returns: { id, clientId, branchId, status, totalPrice, createdAt, updatedAt, client: {...} }
	// We need: { id, orderNumber, status, totalPrice, client: {...}, itemCount, createdAt, updatedAt }
	return orders.map(
		(order: {
			id: string;
			clientId: string;
			branchId: string;
			status: string;
			totalPrice: number;
			itemCount: number;
			channel?: 'managed' | 'marketplace';
			fulfilmentType?: 'delivery' | 'pickup';
			estimatedCompletionTime?: Date | string;
			createdAt: Date | string;
			updatedAt: Date | string;
			client: {
				id: string;
				firstName: string;
				lastName: string;
				fullName: string;
				email: string;
				phoneNumber: string;
				avatar?: string;
			};
		}) => ({
			id: order.id,
			orderNumber: `ORD-${order.id.substring(0, 8).toUpperCase()}`, // Generate orderNumber
			status: order.status as OrderStatus,
			totalPrice: order.totalPrice,
			client: order.client,
			itemCount: order.itemCount || 0,
			channel: order.channel || 'managed',
			fulfilmentType: order.fulfilmentType,
			estimatedCompletionTime: order.estimatedCompletionTime,
			createdAt: order.createdAt,
			updatedAt: order.updatedAt,
		})
	);
}

async function getBranchOrderDetail(
	orderId: string,
	branchId?: string
): Promise<ClerkOrderDetail> {
	// Backend route: GET /clerk/dashboard/orders/:orderId
	// This endpoint returns ClerkOrderDetail with items array
	// For managers, we need to pass branchId as query param
	const params = branchId ? { branchId } : {};
	const response = await apiClient.get(
		`/clerk/dashboard/orders/${orderId}`,
		{ params }
	);
	if (!response.data.success) {
		throw new Error(response.data.message || "Failed to get order detail");
	}
	// Backend returns ClerkOrderDetail which extends ClerkOrder with items
	return response.data.data;
}

async function updateBranchOrder(
	orderId: string,
	order: Partial<ClerkOrder> & { estimatedCompletionTime?: string }
): Promise<ClerkOrderDetail> {
	// Backend route: PUT /orders/:id
	const response = await apiClient.put(`/orders/${orderId}`, order);
	if (!response.data.success) {
		throw new Error(response.data.message || "Failed to update order");
	}
	return response.data.data;
}

async function updateClerkOrder(
	orderId: string,
	order: Partial<ClerkOrder> & { estimatedCompletionTime?: string }
): Promise<ClerkOrderDetail> {
	return updateBranchOrder(orderId, order);
}

async function getClerkOrders(
	filters?: ClerkOrdersFilters
): Promise<ClerkOrdersResponse> {
	const response = await apiClient.get("/clerk/orders", {
		params: filters,
	});
	return response.data.data;
}

async function getClerkOrderDetail(orderId: string): Promise<ClerkOrderDetail> {
	const response = await apiClient.get(`/clerk/orders/${orderId}`);
	return response.data.data;
}

async function getClerkOrdersByDate(
	date: string,
	branchId?: string
): Promise<ClerkOrderDetail[]> {
	const params = branchId ? { date, branchId } : { date };
	const response = await apiClient.get("/clerk/orders/by-date", {
		params,
	});
	return response.data.data;
}


/**
 * Turn down a marketplace order you can't take. The customer is refunded in
 * full and told your reason. Only before you've started work on it.
 */
async function declineOrder(orderId: string, reason: string): Promise<{ message: string }> {
	const response = await apiClient.post(`/orders/${orderId}/decline`, { reason });
	return { message: response.data.message };
}

/** Send (or change) the price for a request a customer sent to your shop */
async function sendQuote(quotationId: string, amount: number): Promise<void> {
	await apiClient.patch(`/quotations/${quotationId}/send`, { amount });
}

export const orderApi = {
	declineOrder,
	sendQuote,
	getBranchOrders,
	getBranchOrderDetail,
	updateBranchOrder,
	updateClerkOrder,
	getClerkOrders,
	getClerkOrderDetail,
	getClerkOrdersByDate,
};
