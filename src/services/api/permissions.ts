import { apiClient } from "./client";

// ─── Permissions API ─────────────────────────────────────────────────
async function getPermissions(): Promise<{ permissions: any[]; grouped: Record<string, any[]> }> {
	const response = await apiClient.get("/permissions");
	return response.data.data;
}

// ─── Roles API ───────────────────────────────────────────────────────
async function getRoles(): Promise<any[]> {
	const response = await apiClient.get("/roles");
	return response.data.data;
}

async function createRole(data: { name: string; description?: string; permissionIds?: string[] }): Promise<any> {
	const response = await apiClient.post("/roles", data);
	return response.data.data;
}

async function updateRole(id: string, data: { name?: string; description?: string; permissionIds?: string[] }): Promise<any> {
	const response = await apiClient.put(`/roles/${id}`, data);
	return response.data.data;
}

async function deleteRole(id: string): Promise<void> {
	await apiClient.delete(`/roles/${id}`);
}

// ─── User Management API ─────────────────────────────────────────────
async function getManagedUsers(params?: {
	search?: string; branchId?: string; roleId?: string; status?: string; page?: number; limit?: number;
}): Promise<{ users: any[]; pagination: any }> {
	const response = await apiClient.get("/user-management/users", { params });
	return response.data.data;
}

async function getUserPermissions(userId: string): Promise<{ effectivePermissions: string[]; directPermissions: any[] }> {
	const response = await apiClient.get(`/user-management/users/${userId}/permissions`);
	return response.data.data;
}

async function updateUserRole(userId: string, roleId: string | null): Promise<void> {
	await apiClient.put(`/user-management/users/${userId}/role`, { roleId });
}

async function updateUserPermissions(userId: string, permissionIds: string[], branchId?: string): Promise<void> {
	await apiClient.put(`/user-management/users/${userId}/permissions`, { permissionIds, branchId });
}

async function updateUserStatus(userId: string, isActive: boolean): Promise<void> {
	await apiClient.put(`/user-management/users/${userId}/status`, { isActive });
}

async function bulkUpdateRoles(userIds: string[], roleId: string | null): Promise<{ updated: number }> {
	const response = await apiClient.put("/user-management/bulk-role", { userIds, roleId });
	return response.data.data;
}

async function bulkDeactivateUsers(userIds: string[]): Promise<{ deactivated: number }> {
	const response = await apiClient.put("/user-management/bulk-deactivate", { userIds });
	return response.data.data;
}

async function getUserManagementStats(): Promise<any> {
	const response = await apiClient.get("/user-management/stats");
	return response.data.data;
}

// ─── Invitations API ─────────────────────────────────────────────────
async function sendInvitation(data: {
	email: string; roleId?: string; branchId?: string; userType?: string; permissionKeys?: string[];
}): Promise<any> {
	const response = await apiClient.post("/invitations", data);
	return response.data.data;
}

async function getInvitations(status?: string): Promise<any[]> {
	const response = await apiClient.get("/invitations", { params: status ? { status } : {} });
	return response.data.data;
}

async function revokeInvitation(id: string): Promise<void> {
	await apiClient.put(`/invitations/${id}/revoke`);
}

async function getInvitationByToken(token: string): Promise<any> {
	const response = await apiClient.get(`/invitations/accept/${token}`);
	return response.data.data;
}

async function acceptInvitation(token: string, data: {
	firstName: string; lastName: string; password: string; phoneNumber?: string;
}): Promise<any> {
	const response = await apiClient.post(`/invitations/accept/${token}`, data);
	return response.data.data;
}

// ─── Access Control API (Branch-scoped) ──────────────────────────────
async function getBranchAccessControlUsers(branchId: string): Promise<any[]> {
	const response = await apiClient.get(`/branches/${branchId}/access-control/users`);
	return response.data.data;
}

async function getBranchUserPermissions(branchId: string, userId: string): Promise<{ effectivePermissions: string[]; directPermissions: any[] }> {
	const response = await apiClient.get(`/branches/${branchId}/access-control/users/${userId}/permissions`);
	return response.data.data;
}

async function updateBranchUserPermissions(branchId: string, userId: string, permissionIds: string[]): Promise<void> {
	await apiClient.put(`/branches/${branchId}/access-control/users/${userId}/permissions`, { permissionIds });
}

async function getBranchActivityLog(branchId: string, page?: number, limit?: number): Promise<{ logs: any[]; pagination: any }> {
	const response = await apiClient.get(`/branches/${branchId}/access-control/activity-log`, {
		params: { page, limit },
	});
	return response.data.data;
}

export const permissionApi = {
	getPermissions,
	getRoles,
	createRole,
	updateRole,
	deleteRole,
	getManagedUsers,
	getUserPermissions,
	updateUserRole,
	updateUserPermissions,
	updateUserStatus,
	bulkUpdateRoles,
	bulkDeactivateUsers,
	getUserManagementStats,
	sendInvitation,
	getInvitations,
	revokeInvitation,
	getInvitationByToken,
	acceptInvitation,
	getBranchAccessControlUsers,
	getBranchUserPermissions,
	updateBranchUserPermissions,
	getBranchActivityLog,
};
