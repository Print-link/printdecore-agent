import axios from "axios";
import { apiClient } from "./client";
import type {
	ServiceCategory,
	ServiceSubCategory,
	ServiceTemplate,
	AgentService,
	CreateAgentServiceData,
	UpdateAgentServiceData,
	PricingConfig,
	CreateServiceTemplateData,
	UpdateServiceTemplateData,
	Category,
	CategoryType,
	RegularFormatProperties,
} from "../../types";

async function getServiceCategories(): Promise<ServiceCategory[]> {
	const response = await apiClient.get("/categories");
	return response.data.data || response.data;
}

async function getServiceSubCategories(
	categoryId: string
): Promise<ServiceSubCategory[]> {
	const response = await apiClient.get("/sub-categories", {
		params: { categoryId },
	});
	return response.data.data || response.data;
}

async function getServiceTemplates(
	subCategoryId: string,
	branchId?: string
): Promise<ServiceTemplate[]> {
	const response = await apiClient.get("/service-templates", {
		params: { subCategoryId, branchId },
	});
	return response.data.data || response.data;
}

async function createServiceTemplate(
	data: CreateServiceTemplateData
): Promise<ServiceTemplate> {
	const response = await apiClient.post("/service-templates", data);
	return response.data.data || response.data;
}

async function updateServiceTemplate(
	id: string,
	data: UpdateServiceTemplateData
): Promise<ServiceTemplate> {
	const response = await apiClient.put(
		`/service-templates/${id}`,
		data
	);
	return response.data.data || response.data;
}

async function deleteServiceTemplate(id: string): Promise<void> {
	await apiClient.delete(`/service-templates/${id}`);
}

//eslint@typescript-eslint/no-explicit-any
async function getPricingFormulas(): Promise<any[]> {
	const response = await apiClient.get("/pricing-formulas");
	return response.data.data || response.data;
}

async function getAgentServices(
	branchId: string,
	isActive?: boolean
): Promise<AgentService[]> {
	const params: Record<string, string | boolean> = { branchId };
	if (isActive !== undefined) {
		params.isActive = isActive;
	}
	const response = await apiClient.get("/agent-services", {
		params,
	});
	return response.data.data || response.data;
}

async function getAgentServiceById(agentServiceId: string): Promise<AgentService> {
	const response = await apiClient.get(
		`/agent-services/${agentServiceId}`
	);
	return response.data.data || response.data;
}

async function createAgentService(
	data: CreateAgentServiceData
): Promise<AgentService> {
	// Validate required fields before sending
	if (!data.branchId || !data.branchId.trim()) {
		throw new Error("Branch ID is required");
	}
	if (!data.serviceTemplateId || !data.serviceTemplateId.trim()) {
		throw new Error("Service template ID is required");
	}

	try {
		const response = await apiClient.post("/agent-services", data);
		if (!response.data.success && response.data.message) {
			throw new Error(response.data.message);
		}
		return response.data.data || response.data;
	} catch (error: unknown) {
		if (axios.isAxiosError(error)) {
			const errorMessage =
				error.response?.data?.message ||
				error.message ||
				"Failed to create agent service";
			console.error("Error creating agent service:", {
				status: error.response?.status,
				message: errorMessage,
				responseData: error.response?.data,
				requestData: data,
			});
			throw new Error(errorMessage);
		}
		throw error;
	}
}

async function updateAgentService(
	agentServiceId: string,
	data: UpdateAgentServiceData
): Promise<AgentService> {
	const response = await apiClient.put(
		`/agent-services/${agentServiceId}`,
		data
	);
	return response.data.data || response.data;
}

async function deleteAgentService(agentServiceId: string): Promise<void> {
	await apiClient.delete(`/agent-services/${agentServiceId}`);
}

async function updateAgentServicePricingConfig(
	agentServiceId: string,
	pricingConfig: PricingConfig
): Promise<AgentService> {
	const response = await apiClient.put(
		`/agent-services/${agentServiceId}/pricing-config`,
		{ pricingConfig }
	);
	return response.data.data || response.data;
}

// Category APIs
async function getAllCategories(adminId: string): Promise<Category[]> {
	const response = await apiClient.get("/categories", {
		params: { adminId },
	});
	return response.data.data;
}

async function createCategory(data: {
	name: string;
	unitPrice: number;
	description?: string;
	adminId: string;
	categoryType?: CategoryType;
	regularFormatProperties?: RegularFormatProperties;
}): Promise<Category> {
	const response = await apiClient.post("/categories", data);
	return response.data.data;
}

async function updateCategory(
	id: string,
	data: {
		name?: string;
		unitPrice?: number;
		description?: string;
		categoryType?: CategoryType;
		regularFormatProperties?: RegularFormatProperties;
	}
): Promise<Category> {
	const response = await apiClient.put(`/categories/${id}`, data);
	return response.data.data;
}

async function deleteCategory(id: string): Promise<void> {
	await apiClient.delete(`/categories/${id}`);
}

export const serviceApi = {
	getServiceCategories,
	getServiceSubCategories,
	getServiceTemplates,
	createServiceTemplate,
	updateServiceTemplate,
	deleteServiceTemplate,
	getPricingFormulas,
	getAgentServices,
	getAgentServiceById,
	createAgentService,
	updateAgentService,
	deleteAgentService,
	updateAgentServicePricingConfig,
	getAllCategories,
	createCategory,
	updateCategory,
	deleteCategory,
};
