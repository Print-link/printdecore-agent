import { apiClient } from "./client";

export interface Discount {
	id: string;
	code: string;
	name: string;
	description?: string;
	discountType: "percentage" | "fixed";
	discountValue: number;
	currency: string;
	scope: "platform" | "manager";
	managerId?: string;
	branchId?: string;
	targetType: "all" | "customer" | "waitlist" | "branch";
	maxUses?: number;
	maxUsesPerCustomer: number;
	currentUses: number;
	minOrderAmount?: number;
	maxDiscountAmount?: number;
	startsAt: string;
	expiresAt?: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface DiscountValidation {
	discountId: string;
	code: string;
	discountType: "percentage" | "fixed";
	discountValue: number;
	discountAmount: number;
	subtotal: number;
	finalTotal: number;
}

async function getDiscounts(): Promise<Discount[]> {
	const response = await apiClient.get("/discounts");
	return response.data.data || [];
}

async function getDiscount(id: string): Promise<Discount> {
	const response = await apiClient.get(`/discounts/${id}`);
	return response.data.data;
}

async function createDiscount(
	data: Partial<Discount> & { code: string; name: string; discountType: string; discountValue: number }
): Promise<Discount> {
	const response = await apiClient.post("/discounts", data);
	return response.data.data;
}

async function updateDiscount(
	id: string,
	data: Partial<Discount>
): Promise<Discount> {
	const response = await apiClient.put(`/discounts/${id}`, data);
	return response.data.data;
}

async function deleteDiscount(id: string): Promise<void> {
	await apiClient.delete(`/discounts/${id}`);
}

async function validateDiscount(
	code: string,
	orderTotal: number,
	branchId?: string
): Promise<DiscountValidation> {
	const response = await apiClient.post("/discounts/validate", {
		code,
		orderTotal,
		branchId,
	});
	return response.data.data;
}

async function assignDiscount(
	id: string,
	data: { customerIds?: string[]; waitlistIds?: string[]; emails?: string[] }
): Promise<{ assigned: number; total: number }> {
	const response = await apiClient.post(`/discounts/${id}/assign`, data);
	return response.data.data;
}

export const discountApi = {
	getDiscounts,
	getDiscount,
	createDiscount,
	updateDiscount,
	deleteDiscount,
	validateDiscount,
	assignDiscount,
};
