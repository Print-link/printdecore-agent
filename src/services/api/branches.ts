import { apiClient } from "./client";
import type { Branch } from "../../types";

function transformBranch(branch: any): Branch {
	if (!branch) return branch;
	return {
		...branch,
		branchEmailAddress: branch.branchEmailAddress || branch.email,
		branchCoverImage: branch.branchCoverImage || branch.coverImage,
	};
}

async function getAllBranches(managerId: string): Promise<Branch[]> {
	const response = await apiClient.get(`/branches/manager/${managerId}`);
	return response.data.data.map((b: any) => transformBranch(b));
}

async function getBranchById(branchId: string): Promise<Branch> {
	const response = await apiClient.get(`/branches/${branchId}`);
	return transformBranch(response.data.data);
}

async function createBranch(
	branchData: Omit<Branch, "id" | "createdAt" | "updatedAt">,
	coverImageFile?: File
): Promise<Branch> {
	// If we have a file, send as FormData (required by backend multer middleware)
	if (coverImageFile) {
		const formData = new FormData();

		// Add file
		formData.append("branchCoverImage", coverImageFile);

		// Add branch data fields
		formData.append("name", branchData.name);
		formData.append("manager_id", branchData.manager_id);
		formData.append("status", branchData.status);
		formData.append("isMainBranch", String(branchData.isMainBranch));

		if (branchData.phoneNumber) {
			formData.append("phoneNumber", branchData.phoneNumber);
		}
		if (branchData.branchEmailAddress) {
			formData.append("branchEmailAddress", branchData.branchEmailAddress);
		}

		// Stringify operatingHours (backend expects string or object)
		formData.append(
			"operatingHours",
			JSON.stringify(branchData.operatingHours)
		);

		// Add location_id if provided (location will be created separately)
		if (branchData.location_id) {
			formData.append("location_id", branchData.location_id);
		}

		const response = await apiClient.post("/branches", formData, {
			headers: {
				"Content-Type": "multipart/form-data",
			},
		});
		return response.data.data;
	}

	// Fallback to JSON if no file (though backend requires file)
	const response = await apiClient.post("/branches", branchData);
	return response.data.data;
}

async function updateBranch(
	branchId: string,
	branchData: Partial<Omit<Branch, "id" | "createdAt" | "updatedAt">> & { location?: any },
	coverImageFile?: File
): Promise<Branch> {
	if (coverImageFile || (branchData.branchCoverImage as any) instanceof File) {
		const formData = new FormData();

		// Add file
		if (coverImageFile) formData.append("branchCoverImage", coverImageFile);
		else if (branchData.branchCoverImage) formData.append("branchCoverImage", branchData.branchCoverImage as any);

		// Add branch data fields
		if (branchData.name) formData.append("name", branchData.name);
		if (branchData.manager_id) formData.append("manager_id", branchData.manager_id);
		if (branchData.status) formData.append("status", branchData.status);
		if (branchData.isMainBranch !== undefined) formData.append("isMainBranch", String(branchData.isMainBranch));
		if (branchData.phoneNumber) formData.append("phoneNumber", branchData.phoneNumber);
		if (branchData.branchEmailAddress) formData.append("branchEmailAddress", branchData.branchEmailAddress);

		if (branchData.operatingHours) {
			formData.append("operatingHours", JSON.stringify(branchData.operatingHours));
		}

		if (branchData.location) {
			formData.append("location", JSON.stringify(branchData.location));
		} else if (branchData.location_id) {
			formData.append("location_id", branchData.location_id);
		}

		const response = await apiClient.put(`/branches/${branchId}`, formData, {
			headers: {
				"Content-Type": "multipart/form-data",
			},
		});
		return response.data.data;
	}

	// Fallback to JSON if no new file
	const response = await apiClient.put(
		`/branches/${branchId}`,
		branchData
	);
	return response.data.data;
}

async function deleteBranch(branchId: string): Promise<void> {
	await apiClient.delete(`/branches/${branchId}`);
}

// Location APIs
async function createLocation(locationData: {
	branch_id: string;
	address: string;
	latitude: number;
	longitude: number;
	city?: string;
	state?: string;
	country?: string;
	postalCode?: string;
}): Promise<{ id: string }> {
	const response = await apiClient.post("/locations", locationData);
	return response.data.data;
}

async function updateLocation(
	locationId: string,
	locationData: {
		branch_id?: string;
		address?: string;
		latitude?: number;
		longitude?: number;
		city?: string;
		state?: string;
		country?: string;
		postalCode?: string;
	}
): Promise<{ id: string }> {
	const response = await apiClient.put(
		`/locations/${locationId}`,
		locationData
	);
	return response.data.data;
}

export const branchApi = {
	getAllBranches,
	getBranchById,
	createBranch,
	updateBranch,
	deleteBranch,
	createLocation,
	updateLocation,
};
