import { apiClient } from "./client";
import { transformToUser } from "./auth";
import type { User } from "../../types";

async function getAllUsers(params?: {
	page?: number;
	limit?: number;
	role?: string;
	isActive?: boolean;
	search?: string;
}): Promise<{
	users: User[];
	pagination: {
		current: number;
		pages: number;
		total: number;
		limit: number;
	};
}> {
	const response = await apiClient.get("/users", { params });
	return response.data.data;
}

async function getUserById(id: string): Promise<User> {
	const response = await apiClient.get(`/users/${id}`);
	return response.data.data.user;
}

async function createUser(userData: {
	email: string;
	password: string;
	name: string;
	role: string;
	permissions?: string[];
}): Promise<User> {
	const response = await apiClient.post("/users", userData);
	return response.data.data.user;
}

async function updateUser(id: string, updates: Partial<User>): Promise<User> {
	const response = await apiClient.put(`/users/${id}`, updates);
	return response.data.data.user;
}

async function deleteUser(id: string): Promise<void> {
	await apiClient.delete(`/users/${id}`);
}

async function resetUserPassword(id: string, newPassword: string): Promise<void> {
	await apiClient.put(`/users/${id}/reset-password`, {
		newPassword,
	});
}

async function getUsersByRole(role: string): Promise<User[]> {
	const response = await apiClient.get(`/users/role/${role}`);
	return response.data.data.users;
}

async function getUserStats(): Promise<{
	totalUsers: number;
	usersByRole: Array<{ _id: string; count: number }>;
	recentUsers: User[];
}> {
	const response = await apiClient.get("/users/stats");
	return response.data.data;
}

async function bulkUpdateUserRoles(
	userIds: string[],
	role: string
): Promise<{
	modifiedCount: number;
}> {
	const response = await apiClient.put("/users/bulk-update-roles", {
		userIds,
		role,
	});
	return response.data.data;
}

async function createClerk(data: {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
	branch_id: string;
	phoneNumber?: string;
	avatar?: string;
}): Promise<User> {
	// Backend route: POST /auth/register/clerk (from authController.registerClerk)
	const response = await apiClient.post(
		"/auth/register/clerk",
		data
	);

	if (!response.data.success) {
		throw new Error(response.data.message || "Failed to create clerk");
	}

	const clerkData = response.data.data.clerk;
	return transformToUser(clerkData);
}

async function getClerksByBranchId(branchId: string): Promise<User[]> {
	// Backend route: GET /clerks/branch/:branchId
	const response = await apiClient.get(`/clerks/branch/${branchId}`);

	if (!response.data.success) {
		throw new Error(response.data.message || "Failed to get clerks");
	}

	const clerks = response.data.data || [];
	return clerks.map(
		(clerk: {
			id: string;
			firstName: string;
			lastName: string;
			email: string;
			phoneNumber?: string | null;
			avatar?: string | null;
			branch_id?: string | null;
			role?: "clerk";
			createdAt?: string | Date;
			updatedAt?: string | Date;
		}) => transformToUser(clerk)
	);
}

async function changeClerkPassword(
	clerkId: string,
	newPassword: string
): Promise<User> {
	// Backend route: PUT /clerks/:id (update with password field)
	const response = await apiClient.put(`/clerks/${clerkId}`, {
		password: newPassword,
	});

	if (!response.data.success) {
		throw new Error(
			response.data.message || "Failed to change clerk password"
		);
	}

	const clerkData = response.data.data;
	return transformToUser(clerkData);
}

export const userApi = {
	getAllUsers,
	getUserById,
	createUser,
	updateUser,
	deleteUser,
	resetUserPassword,
	getUsersByRole,
	getUserStats,
	bulkUpdateUserRoles,
	createClerk,
	getClerksByBranchId,
	changeClerkPassword,
};
