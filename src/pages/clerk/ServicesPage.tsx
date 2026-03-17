import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useBranchStore } from '../../stores/branchStore';
import { useThemeClasses } from '../../lib/theme';
import { cn } from '../../lib/utils';
import { useToast } from "../../contexts/ToastContext";
import { usePermissions, PERMISSIONS } from '../../hooks/usePermissions';
import { apiService } from "../../services/api";
import { Card, Button } from '../../components/ui';
import type {
	ServiceCategory,
	ServiceSubCategory,
	ServiceTemplate,
	AgentService,
} from "../../types";
import {
	CategoriesView,
	SubCategoriesView,
	ServiceTemplatesView,
	AgentServicesView,
	AgentServiceForm,
	PricingConfigForm,
	ServiceTemplateForm,
} from "./services/components";

type ViewState =
	| "categories"
	| "subcategories"
	| "templates"
	| "agent-services";

interface NavigationState {
	view: ViewState;
	selectedCategory?: ServiceCategory;
	selectedSubCategory?: ServiceSubCategory;
	selectedTemplate?: ServiceTemplate;
}

export default function ServicesPage() {
	const { user } = useAuthStore();
	const { selectedBranch } = useBranchStore();
	const t = useThemeClasses();
	const { success, error: showError } = useToast();
	const { isClerk, hasPermission } = usePermissions();

	// Clerks can only manage services if they have the services.manage permission
	const canManageServices = hasPermission(PERMISSIONS.SERVICES_MANAGE);

	const [categories, setCategories] = useState<ServiceCategory[]>([]);
	const [subCategories, setSubCategories] = useState<ServiceSubCategory[]>([]);
	const [serviceTemplates, setServiceTemplates] = useState<ServiceTemplate[]>(
		[]
	);
	const [agentServices, setAgentServices] = useState<AgentService[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [navState, setNavState] = useState<NavigationState>({
		view: "categories",
	});
	const [showServiceForm, setShowServiceForm] = useState(false);
	const [editingService, setEditingService] = useState<AgentService | null>(
		null
	);
	const [showPricingConfigForm, setShowPricingConfigForm] = useState(false);
	const [pricingConfigService, setPricingConfigService] =
		useState<AgentService | null>(null);
	const [showTemplateForm, setShowTemplateForm] = useState(false);
	const [editingTemplate, setEditingTemplate] = useState<ServiceTemplate | null>(null);

	// Resolve the active branch ID: clerks use their assigned branch, managers use selected branch
	const branchId = isClerk ? user?.branch_id : selectedBranch?.id;
	const branchName = isClerk ? "Your Branch" : selectedBranch?.name || "";

	const loadCategories = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const data = await apiService.getServiceCategories();
			setCategories(data);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load categories"
			);
		} finally {
			setIsLoading(false);
		}
	};

	const loadAgentServices = useCallback(async () => {
		if (!branchId) return;
		setIsLoading(true);
		setError(null);
		try {
			const data = await apiService.getAgentServices(branchId);
			setAgentServices(data);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load agent services"
			);
		} finally {
			setIsLoading(false);
		}
	}, [branchId]);

	// Load categories on mount
	useEffect(() => {
		loadCategories();
	}, []);

	// Load agent services when branch changes
	useEffect(() => {
		if (branchId) {
			loadAgentServices();
		}
	}, [branchId, loadAgentServices]);

	// Check access - managers always pass, clerks need services.view
	if (!hasPermission(PERMISSIONS.SERVICES_VIEW)) {
		return (
			<Card>
				<p className={t.textSecondary}>
					Access denied. You need service permissions.
				</p>
			</Card>
		);
	}

	// Check if branch is available
	if (!branchId) {
		return (
			<Card>
				<p className={t.textSecondary}>
					{isClerk ? "No branch assigned. Please contact your manager." : "Please select a branch to manage services"}
				</p>
			</Card>
		);
	}

	const loadSubCategories = async (categoryId: string) => {
		setIsLoading(true);
		setError(null);
		try {
			const data = await apiService.getServiceSubCategories(categoryId);
			setSubCategories(data);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load subcategories"
			);
		} finally {
			setIsLoading(false);
		}
	};

	const loadServiceTemplates = async (subCategoryId: string) => {
		if (!branchId) return;
		setIsLoading(true);
		setError(null);
		try {
			const data = await apiService.getServiceTemplates(subCategoryId, branchId);
			setServiceTemplates(data);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to load service templates"
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleCategorySelect = (category: ServiceCategory) => {
		setNavState({ view: "subcategories", selectedCategory: category });
		loadSubCategories(category.id);
	};

	const handleSubCategorySelect = (subCategory: ServiceSubCategory) => {
		setNavState((prev) => ({
			...prev,
			view: "templates",
			selectedSubCategory: subCategory,
		}));
		loadServiceTemplates(subCategory.id);
	};

	const handleTemplateSelect = async (template: ServiceTemplate) => {
		if (!branchId) {
			setError("No branch available");
			showError("No branch available", "Branch Required", 3000);
			return;
		}

		if (!template?.id) {
			setError("Service template ID is missing");
			showError("Service template ID is missing", "Template Error", 3000);
			return;
		}

		setIsLoading(true);
		setError(null);
		try {
			// Check if service already exists for this branch and template
			const existingServices = await apiService.getAgentServices(
				branchId!
			);
			const existingService = existingServices.find(
				(s) => s.serviceTemplateId === template.id
			);

			let fullService: AgentService;

			if (existingService) {
				// Service already exists, use it
				fullService = await apiService.getAgentServiceById(existingService.id);
				success(
					"Service already exists. Opening pricing configuration.",
					"Service Found",
					3000
				);
			} else {
				// Create a minimal service first
				const serviceData = {
					branchId: branchId!.trim(),
					serviceTemplateId: template.id.trim(),
					pricePerUnit: 0, // Will be configured in pricing config
					isActive: false, // Start as inactive until pricing is configured
					supportsPrintCut: template.supportsPrintCut || false,
					supportsColor: template.supportsColor || false,
					supportsFrontBack: template.supportsFrontBack || false,
					supportsFrontOnly: false,
				};

				console.log("Creating agent service with data:", serviceData);

				const newService = await apiService.createAgentService(serviceData);

				// Fetch the full service with populated fields
				fullService = await apiService.getAgentServiceById(newService.id);
			}

			// Open pricing config form immediately
			setPricingConfigService(fullService);
			setShowPricingConfigForm(true);
			setNavState((prev) => ({
				...prev,
				view: "agent-services",
				selectedTemplate: template,
			}));

			// Success message is already shown above if service exists
			if (!existingService) {
				success(
					"Service created. Configure pricing to activate.",
					"Service Created",
					3000
				);
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to create service";
			setError(errorMessage);
			showError(errorMessage, "Creation Failed", 5000);
		} finally {
			setIsLoading(false);
		}
	};

	const handleBack = () => {
		if (navState.view === "subcategories") {
			setNavState({ view: "categories" });
			setSubCategories([]);
		} else if (navState.view === "templates") {
			setNavState((prev) => ({
				...prev,
				view: "subcategories",
				selectedTemplate: undefined,
			}));
			setServiceTemplates([]);
		} else if (navState.view === "agent-services") {
			setNavState((prev) => ({
				...prev,
				view: "templates",
				selectedTemplate: undefined,
			}));
		}
	};

	const handleViewAgentServices = () => {
		setNavState({ view: "agent-services" });
	};

	const handleServiceUpdated = () => {
		setShowServiceForm(false);
		setEditingService(null);
		loadAgentServices();
	};

	const handleEditService = (service: AgentService) => {
		setEditingService(service);
		setShowServiceForm(true);
	};

	const handleDeleteService = async (serviceId: string) => {
		if (!window.confirm("Are you sure you want to delete this service?")) {
			return;
		}
		try {
			await apiService.deleteAgentService(serviceId);
			await loadAgentServices();
		} catch (err) {
			alert(err instanceof Error ? err.message : "Failed to delete service");
		}
	};

	const handleAddCustomTemplate = () => {
		setEditingTemplate(null);
		setShowTemplateForm(true);
	};

	const handleEditTemplate = (template: ServiceTemplate) => {
		setEditingTemplate(template);
		setShowTemplateForm(true);
	};

	const handleDeleteTemplate = async (template: ServiceTemplate) => {
		if (!window.confirm(`Are you sure you want to delete "${template.name}"? This will also remove any services using this template.`)) {
			return;
		}
		try {
			await apiService.deleteServiceTemplate(template.id);
			success("Template deleted successfully", "Deleted", 3000);
			if (navState.selectedSubCategory) {
				loadServiceTemplates(navState.selectedSubCategory.id);
			}
		} catch (err) {
			showError(err instanceof Error ? err.message : "Failed to delete template");
		}
	};

	const handleTemplateFormSuccess = () => {
		if (navState.selectedSubCategory) {
			loadServiceTemplates(navState.selectedSubCategory.id);
		}
		success(editingTemplate ? "Template updated" : "Template created", "Success", 3000);
	};

	const handleConfigurePricing = (service: AgentService) => {
		setPricingConfigService(service);
		setShowPricingConfigForm(true);
	};

	const handlePricingConfigSuccess = () => {
		setShowPricingConfigForm(false);
		setPricingConfigService(null);
		loadAgentServices();
	};

	const renderBreadcrumb = () => {
		const items: string[] = ["Categories"];
		if (navState.selectedCategory) {
			items.push(navState.selectedCategory.name);
		}
		if (navState.selectedSubCategory) {
			items.push(navState.selectedSubCategory.name);
		}
		if (navState.selectedTemplate) {
			items.push(navState.selectedTemplate.name);
		}
		if (navState.view === "agent-services") {
			items.push("Agent Services");
		}

		return (
			<div className="flex items-center gap-2 mb-4 flex-wrap">
				{items.map((item, index) => (
					<div key={index} className="flex items-center gap-2">
						<span
							className={cn(
								'text-sm',
								index === items.length - 1
									? cn(t.text, 'font-semibold')
									: t.textSecondary
							)}
						>
							{item}
						</span>
						{index < items.length - 1 && (
							<span className={t.textSecondary}>/</span>
						)}
					</div>
				))}
			</div>
		);
	};

	return (
		<div className={cn('p-3 h-full overflow-auto', t.surfaceInset)}>
			<div className="max-w-[1400px] mx-auto">
				{/* Header */}
				<div className="mb-6">
					<div className="flex justify-between items-center mb-2">
						<div>
							<h1 className={cn('text-2xl font-semibold m-0 mb-1', t.text)}>
								Services Configuration
							</h1>
							<p className={cn('text-sm m-0', t.textSecondary)}>
								Browse platform services and configure branch-specific pricing
							</p>
						</div>
						{navState.view === "agent-services" && canManageServices && (
							<Button
								onClick={() => {
									setEditingService(null);
									setShowServiceForm(true);
								}}
								size="lg"
							>
								+ Configure New Service
							</Button>
						)}
					</div>
					<p className={cn('text-sm m-0 mb-2', t.textSecondary)}>
						Branch: <strong>{branchName}</strong>
					</p>
					{renderBreadcrumb()}
				</div>

				{/* Error Display */}
				{error && (
					<div className="p-3 rounded-lg bg-red-500/20 border border-red-500 text-red-500 text-sm mb-6">
						{error}
					</div>
				)}

				{/* Loading State */}
				{isLoading && categories.length === 0 && (
					<Card>
						<p className={cn('text-center', t.text)}>
							Loading...
						</p>
					</Card>
				)}

				{/* Content Views */}
				{!isLoading && (
					<>
						{navState.view === "categories" && (
							<CategoriesView
								categories={categories}
								onCategorySelect={handleCategorySelect}
							/>
						)}

						{navState.view === "subcategories" && navState.selectedCategory && (
							<SubCategoriesView
								subCategories={subCategories}
								onSubCategorySelect={handleSubCategorySelect}
								onBack={handleBack}
								isLoading={isLoading}
							/>
						)}

						{navState.view === "templates" && navState.selectedSubCategory && (
							<ServiceTemplatesView
								templates={serviceTemplates}
								onTemplateSelect={handleTemplateSelect}
								onBack={handleBack}
								onViewAgentServices={handleViewAgentServices}
								isLoading={isLoading}
								onAddCustomTemplate={handleAddCustomTemplate}
								onEditTemplate={handleEditTemplate}
								onDeleteTemplate={handleDeleteTemplate}
							/>
						)}

						{navState.view === "agent-services" && (
							<AgentServicesView
								agentServices={agentServices}
								onEdit={handleEditService}
								onDelete={handleDeleteService}
								onConfigurePricing={handleConfigurePricing}
								onBack={handleBack}
								isLoading={isLoading}
							/>
						)}
					</>
				)}

				{/* Agent Service Form Modal - Only for editing existing services */}
				{showServiceForm && editingService && (
					<AgentServiceForm
						isOpen={showServiceForm}
						branchId={branchId!}
						template={editingService?.serviceTemplate}
						editingService={editingService}
						subCategory={editingService?.subCategory}
						onClose={() => {
							setShowServiceForm(false);
							setEditingService(null);
						}}
						onSuccess={handleServiceUpdated}
					/>
				)}

				{/* Pricing Config Form Modal */}
				{showPricingConfigForm && pricingConfigService && (
					<PricingConfigForm
						isOpen={showPricingConfigForm}
						agentService={pricingConfigService}
						onClose={() => {
							setShowPricingConfigForm(false);
							setPricingConfigService(null);
						}}
						onSuccess={handlePricingConfigSuccess}
					/>
				)}

				{/* Custom Template Form Modal */}
				{showTemplateForm && navState.selectedSubCategory && (
					<ServiceTemplateForm
						isOpen={showTemplateForm}
						branchId={branchId!}
						subCategoryId={navState.selectedSubCategory.id}
						editingTemplate={editingTemplate}
						onClose={() => {
							setShowTemplateForm(false);
							setEditingTemplate(null);
						}}
						onSuccess={handleTemplateFormSuccess}
					/>
				)}
			</div>
		</div>
	);
}
