import { apiClient } from "./client";
import type { User, AuthResponse } from "../../types";

// Helper to transform backend response to unified User format
function transformToUser(userData: {
	id: string;
	verified?: boolean;
	firstName?: string;
	lastName?: string;
	email: string;
	phoneNumber?: string | null;
	avatar?: string | null;
	branch_id?: string | null;
	role?: "manager" | "clerk";
	permissions?: string[];
	businessName?: string | null;
	businessPhone?: string | null;
	businessCoverImage?: string | null;
	websiteUrl?: string | null;
	workingHours?: Array<{
		day: string;
		isOpen: boolean;
		openTime?: string;
		closeTime?: string;
	}> | null;
	location?: {
		latitude: number;
		longitude: number;
		address: string;
	} | null;
	isActive?: boolean;
	isTemporaryPassword?: boolean;
	createdAt?: string | number | Date;
	updatedAt?: string | number | Date;
}): User {
	return {
		id: userData.id,
		firstName: userData.firstName,
		lastName: userData.lastName,
		name:
			`${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
			userData.email,
		email: userData.email,
		phoneNumber: userData.phoneNumber || undefined,
		avatar: userData.avatar || undefined,
		branch_id: userData.branch_id || undefined,
		role: userData.role || "manager",
		permissions: userData.permissions || [],
		// Note: business fields, location, and workingHours belong to branches, not users
		isActive: userData.isActive !== undefined ? userData.isActive : true,
		isTemporaryPassword: userData.isTemporaryPassword || false,
		createdAt: userData.createdAt
			? typeof userData.createdAt === "string"
				? new Date(userData.createdAt).getTime()
				: userData.createdAt
			: Date.now(),
		updatedAt: userData.updatedAt
			? typeof userData.updatedAt === "string"
				? new Date(userData.updatedAt).getTime()
				: userData.updatedAt
			: Date.now(),
	};
}

async function login(
	email: string,
	password: string,
	role?: "manager" | "clerk"
): Promise<AuthResponse> {
	// Route to correct endpoint based on role
	const endpoint = role === "clerk" ? "/auth/login/clerk" : "/auth/login";
	const response = await apiClient.post(endpoint, {
		email,
		password,
	});

	if (!response.data.success) {
		throw new Error(response.data.message || "Login failed");
	}

	// Backend returns different structures for manager vs clerk
	// Manager: { success: true, data: { manager: {...}, token } }
	// Clerk: { success: true, data: { clerk: {...}, token } }
	const data = response.data.data;
	const userData = data.manager || data.clerk;
	const token = data.token;

	// Transform to unified User format
	const user: User = {
		id: userData.id,
		firstName: userData.firstName,
		lastName: userData.lastName,
		name:
			`${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
			userData.email, // For backward compatibility
		email: userData.email,
		phoneNumber: userData.phoneNumber || undefined,
		avatar: userData.avatar || undefined,
		branch_id: userData.branch_id || undefined, // Only for clerks
		role: userData.role || role || "manager",
		permissions: userData.permissions || [],
		verified: userData.verified ?? false,
		// Note: business fields, location, and workingHours belong to branches, not users
		isActive: userData.isActive !== undefined ? userData.isActive : true,
		isTemporaryPassword: userData.isTemporaryPassword || false,
		createdAt: userData.createdAt
			? typeof userData.createdAt === "string"
				? new Date(userData.createdAt).getTime()
				: userData.createdAt
			: Date.now(),
		updatedAt: userData.updatedAt
			? typeof userData.updatedAt === "string"
				? new Date(userData.updatedAt).getTime()
				: userData.updatedAt
			: Date.now(),
	};

	// Store token in localStorage
	if (token) {
		localStorage.setItem("auth-token", token);
	}

	return {
		user,
		token,
		requiresPasswordSetup: user.isTemporaryPassword === true,
	};
}

async function getProfile(): Promise<User> {
	const response = await apiClient.get("/auth/profile");

	// Backend returns different structures based on role
	// Manager: { success: true, data: { ...manager fields } }
	// Clerk: { success: true, data: { ...clerk fields } }
	const userData = response.data.data || response.data;

	// Transform to unified User format
	const user: User = {
		id: userData.id,
		firstName: userData.firstName,
		lastName: userData.lastName,
		name:
			`${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
			userData.email,
		email: userData.email,
		phoneNumber: userData.phoneNumber || undefined,
		avatar: userData.avatar || undefined,
		branch_id: userData.branch_id || undefined,
		role: userData.role || "manager",
		permissions: userData.permissions || [],
		// Note: business fields, location, and workingHours belong to branches, not users
		isActive: userData.isActive !== undefined ? userData.isActive : true,
		isTemporaryPassword: userData.isTemporaryPassword || false,
		createdAt: userData.createdAt
			? typeof userData.createdAt === "string"
				? new Date(userData.createdAt).getTime()
				: userData.createdAt
			: Date.now(),
		updatedAt: userData.updatedAt
			? typeof userData.updatedAt === "string"
				? new Date(userData.updatedAt).getTime()
				: userData.updatedAt
			: Date.now(),
	};

	return user;
}

async function updateProfile(updates: {
	firstName?: string;
	lastName?: string;
	name?: string;
	email?: string;
	phoneNumber?: string;
	avatar?: string;
}): Promise<User> {
	// Regular JSON update - users only have basic profile fields
	const response = await apiClient.put("/auth/profile", updates);
	const userData = response.data.data || response.data;
	return transformToUser(userData);
}

async function changePassword(
	currentPassword: string,
	newPassword: string
): Promise<void> {
	await apiClient.put("/auth/change-password", {
		currentPassword,
		newPassword,
	});
}

async function logout(): Promise<void> {
	await apiClient.post("/auth/logout");
}

async function refreshToken(): Promise<{ token: string }> {
	const response = await apiClient.post("/auth/refresh");
	return response.data.data;
}

async function forgotPassword(
	email: string
): Promise<{ success: boolean; message: string }> {
	const response = await apiClient.post("/auth/forgot-password", {
		email,
	});
	if (!response.data.success) {
		throw new Error(response.data.message || "Failed to send reset email");
	}
	return response.data;
}

async function resetPassword(
	token: string,
	newPassword: string
): Promise<{ success: boolean; message: string }> {
	const response = await apiClient.post("/auth/reset-password", {
		token,
		newPassword,
	});
	if (!response.data.success) {
		throw new Error(response.data.message || "Failed to reset password");
	}
	return response.data;
}

async function setupPassword(password: string): Promise<User> {
	const response = await apiClient.post("/auth/setup-password", {
		password,
	});
	return response.data.data.user;
}

async function registerManager(data: {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
	phoneNumber?: string;
}): Promise<AuthResponse> {
	const response = await apiClient.post("/auth/register", data);

	if (!response.data.success) {
		throw new Error(response.data.message || "Registration failed");
	}

	const respData = response.data.data;
	const userData = respData.manager || respData;
	const token = respData.token;

	const user: User = transformToUser(userData);

	if (token) {
		localStorage.setItem("auth-token", token);
	}

	return { user, token };
}

async function sendManagerOtp(email: string): Promise<void> {
	const response = await apiClient.post("/auth/register/send-otp", { email });
	if (!response.data.success) {
		throw new Error(response.data.message || "Failed to send OTP");
	}
}

async function verifyOtp(email: string, otp: string): Promise<void> {
	const response = await apiClient.post("/otp/verify-otp", { email, otp });
	if (!response.data.success) {
		throw new Error(response.data.message || "OTP verification failed");
	}
}

async function resendManagerOtp(email: string): Promise<void> {
	const response = await apiClient.post("/otp/resend-otp", { email });
	if (!response.data.success) {
		throw new Error(response.data.message || "Failed to resend OTP");
	}
}

export { transformToUser };

export const authApi = {
	login,
	registerManager,
	sendManagerOtp,
	verifyOtp,
	resendManagerOtp,
	getProfile,
	updateProfile,
	changePassword,
	logout,
	refreshToken,
	forgotPassword,
	resetPassword,
	setupPassword,
};
