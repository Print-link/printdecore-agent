import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useBranchStore } from "../../stores/branchStore";
import { useThemeClasses } from "../../lib/theme";
import { cn } from "../../lib/utils";
import { useToast } from "../../contexts/ToastContext";
import { usePermissions, PERMISSIONS } from "../../hooks/usePermissions";
import { apiService } from "../../services/api";
import { Card, Button } from "../../components/ui";
import { CategoryGridSkeleton } from "../../components/ui/skeletons";
import { ChevronRight, Wrench } from "../../components/icons";
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
  ArtworksView,
} from "./services/components";
import { Palette } from "../../components/icons";

// ─── URL-driven view state ───────────────────────────────────────────

type ViewState =
  | "categories"
  | "subcategories"
  | "templates"
  | "agent-services";

function useServiceNav() {
  const [searchParams, setSearchParams] = useSearchParams();

  const view = (searchParams.get("view") as ViewState) || "categories";
  const categoryId = searchParams.get("categoryId") || undefined;
  const categoryName = searchParams.get("categoryName") || undefined;
  const subCategoryId = searchParams.get("subCategoryId") || undefined;
  const subCategoryName = searchParams.get("subCategoryName") || undefined;

  const goToCategories = () => {
    setSearchParams({});
  };

  const goToSubCategories = (category: ServiceCategory) => {
    setSearchParams({
      view: "subcategories",
      categoryId: category.id,
      categoryName: category.name,
    });
  };

  const goToTemplates = (
    category: { id: string; name: string },
    subCategory: ServiceSubCategory,
  ) => {
    setSearchParams({
      view: "templates",
      categoryId: category.id,
      categoryName: category.name,
      subCategoryId: subCategory.id,
      subCategoryName: subCategory.name,
    });
  };

  const goToAgentServices = (params?: Record<string, string>) => {
    const current = Object.fromEntries(searchParams.entries());
    setSearchParams({ ...current, ...params, view: "agent-services" });
  };

  return {
    view,
    categoryId,
    categoryName,
    subCategoryId,
    subCategoryName,
    goToCategories,
    goToSubCategories,
    goToTemplates,
    goToAgentServices,
  };
}

// ─── Page ────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const { user } = useAuthStore();
  const { selectedBranch } = useBranchStore();
  const t = useThemeClasses();
  const { success, error: showError } = useToast();
  const { isClerk, hasPermission } = usePermissions();
  const nav = useServiceNav();

  const canManageServices = hasPermission(PERMISSIONS.SERVICES_MANAGE);
  const [activeTab, setActiveTab] = useState<"services" | "artworks">("services");

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [subCategories, setSubCategories] = useState<ServiceSubCategory[]>([]);
  const [serviceTemplates, setServiceTemplates] = useState<ServiceTemplate[]>(
    [],
  );
  const [agentServices, setAgentServices] = useState<AgentService[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState<AgentService | null>(
    null,
  );
  const [showPricingConfigForm, setShowPricingConfigForm] = useState(false);
  const [pricingConfigService, setPricingConfigService] =
    useState<AgentService | null>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<ServiceTemplate | null>(null);

  // Resolve selected subcategory object for template form
  const [_, setSelectedSubCategory] = useState<ServiceSubCategory | null>(null);

  const branchId = isClerk ? user?.branch_id : selectedBranch?.id;
  const branchName = isClerk ? "Your Branch" : selectedBranch?.name || "";

  // ─── Data loaders ────────────────────────────────────────────────

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.getServiceCategories(branchId);
      setCategories(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load categories",
      );
    } finally {
      setIsLoading(false);
    }
  }, [branchId]);

  const loadSubCategories = useCallback(
    async (catId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiService.getServiceSubCategories(catId, branchId);
        setSubCategories(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load subcategories",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [branchId],
  );

  const loadServiceTemplates = useCallback(
    async (subCatId: string) => {
      if (!branchId) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiService.getServiceTemplates(subCatId, branchId);
        setServiceTemplates(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load service templates",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [branchId],
  );

  const loadAgentServices = useCallback(async () => {
    if (!branchId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiService.getAgentServices(branchId);
      setAgentServices(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load agent services",
      );
    } finally {
      setIsLoading(false);
    }
  }, [branchId]);

  // ─── React to URL changes ────────────────────────────────────────

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);
  useEffect(() => {
    if (branchId) loadAgentServices();
  }, [branchId, loadAgentServices]);

  useEffect(() => {
    if (nav.view === "subcategories" && nav.categoryId) {
      loadSubCategories(nav.categoryId);
    }
  }, [nav.view, nav.categoryId, loadSubCategories]);

  useEffect(() => {
    if (nav.view === "templates" && nav.subCategoryId) {
      loadServiceTemplates(nav.subCategoryId);
    }
  }, [nav.view, nav.subCategoryId, loadServiceTemplates]);

  // ─── Guards ──────────────────────────────────────────────────────

  if (!hasPermission(PERMISSIONS.SERVICES_VIEW)) {
    return (
      <Card>
        <p className={t.textSecondary}>
          Access denied. You need service permissions.
        </p>
      </Card>
    );
  }

  if (!branchId) {
    return (
      <Card>
        <p className={t.textSecondary}>
          {isClerk
            ? "No branch assigned. Please contact your manager."
            : "Please select a branch to manage services"}
        </p>
      </Card>
    );
  }

  // ─── Handlers ────────────────────────────────────────────────────

  const handleCategorySelect = (category: ServiceCategory) => {
    nav.goToSubCategories(category);
  };

  const handleSubCategorySelect = (subCategory: ServiceSubCategory) => {
    setSelectedSubCategory(subCategory);
    nav.goToTemplates(
      { id: nav.categoryId!, name: nav.categoryName! },
      subCategory,
    );
  };

  const handleTemplateSelect = async (template: ServiceTemplate) => {
    if (!branchId || !template?.id) {
      showError("Missing branch or template", "Error", 3000);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const existingServices = await apiService.getAgentServices(branchId);
      const existingService = existingServices.find(
        (s) => s.serviceTemplateId === template.id,
      );
      let fullService: AgentService;

      if (existingService) {
        fullService = await apiService.getAgentServiceById(existingService.id);
        success(
          "Service found. Opening pricing configuration.",
          "Service Found",
          3000,
        );
      } else {
        const newService = await apiService.createAgentService({
          branchId: branchId.trim(),
          serviceTemplateId: template.id.trim(),
          pricePerUnit: 0,
          isActive: false,
          supportsPrintCut: template.supportsPrintCut || false,
          supportsColor: template.supportsColor || false,
          supportsFrontBack: template.supportsFrontBack || false,
          supportsFrontOnly: false,
        });
        fullService = await apiService.getAgentServiceById(newService.id);
        success(
          "Service created. Configure pricing to activate.",
          "Service Created",
          3000,
        );
      }

      setPricingConfigService(fullService);
      setShowPricingConfigForm(true);
      nav.goToAgentServices();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to create service";
      setError(msg);
      showError(msg, "Creation Failed", 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (nav.view === "subcategories") {
      nav.goToCategories();
      setSubCategories([]);
    } else if (nav.view === "templates") {
      nav.goToSubCategories({
        id: nav.categoryId!,
        name: nav.categoryName!,
      } as ServiceCategory);
      setServiceTemplates([]);
    } else if (nav.view === "agent-services") {
      if (nav.subCategoryId) {
        nav.goToTemplates({ id: nav.categoryId!, name: nav.categoryName! }, {
          id: nav.subCategoryId,
          name: nav.subCategoryName!,
        } as ServiceSubCategory);
      } else {
        nav.goToCategories();
      }
    }
  };

  const handleCreateCategory = async (data: {
    name: string;
    description?: string;
    image?: File;
  }) => {
    if (!branchId) return;
    try {
      await apiService.createServiceCategory({ ...data, branchId });
      success("Category created", "Success", 3000);
      await loadCategories();
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to create category",
        "Error",
        5000,
      );
      throw err;
    }
  };

  const handleCreateSubCategory = async (data: {
    name: string;
    pricingType: string;
    description?: string;
    image?: File;
  }) => {
    if (!branchId || !nav.categoryId) return;
    try {
      await apiService.createServiceSubCategory({
        ...data,
        categoryId: nav.categoryId,
        branchId,
      });
      success("SubCategory created", "Success", 3000);
      await loadSubCategories(nav.categoryId);
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to create subcategory",
        "Error",
        5000,
      );
      throw err;
    }
  };

  const handleViewAgentServices = () => nav.goToAgentServices();

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
    if (!window.confirm("Are you sure you want to delete this service?"))
      return;
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
    if (
      !window.confirm(
        `Delete "${template.name}"? This also removes services using it.`,
      )
    )
      return;
    try {
      await apiService.deleteServiceTemplate(template.id);
      success("Template deleted", "Deleted", 3000);
      if (nav.subCategoryId) loadServiceTemplates(nav.subCategoryId);
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to delete template",
      );
    }
  };
  const handleTemplateFormSuccess = () => {
    if (nav.subCategoryId) loadServiceTemplates(nav.subCategoryId);
    success(
      editingTemplate ? "Template updated" : "Template created",
      "Success",
      3000,
    );
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

  // ─── Breadcrumb ──────────────────────────────────────────────────

  const breadcrumbs: Array<{ label: string; onClick?: () => void }> = [
    {
      label: "Services",
      onClick: nav.view !== "categories" ? nav.goToCategories : undefined,
    },
  ];
  if (nav.categoryName) {
    breadcrumbs.push({
      label: nav.categoryName,
      onClick:
        nav.view !== "subcategories"
          ? () =>
              nav.goToSubCategories({
                id: nav.categoryId!,
                name: nav.categoryName!,
              } as ServiceCategory)
          : undefined,
    });
  }
  if (nav.subCategoryName) {
    breadcrumbs.push({
      label: nav.subCategoryName,
      onClick:
        nav.view !== "templates"
          ? () =>
              nav.goToTemplates(
                { id: nav.categoryId!, name: nav.categoryName! },
                {
                  id: nav.subCategoryId!,
                  name: nav.subCategoryName!,
                } as ServiceSubCategory,
              )
          : undefined,
    });
  }
  if (nav.view === "agent-services") {
    breadcrumbs.push({ label: "My Services" });
  }

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className={cn("p-4 h-full overflow-auto", t.surfaceInset)}>
      <div className="max-w-[1400px] mx-auto">
        {/* ── Header ── */}
        <div className="mb-6">
          <div className="flex justify-between items-start gap-4 mb-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  t.isDark ? "bg-amber-500/10" : "bg-amber-50",
                )}
              >
                <Wrench size={20} className="text-amber-500" />
              </div>
              <div>
                <h1 className={cn("text-lg font-bold m-0", t.text)}>
                  Services
                </h1>
                <p className={cn("text-xs m-0", t.textTertiary)}>
                  <span className={cn("font-medium", t.textSecondary)}>
                    {branchName}
                  </span>{" "}
                  — manage categories, templates & pricing
                </p>
              </div>
            </div>
            {activeTab === "services" && nav.view === "agent-services" && canManageServices && (
              <Button
                onClick={() => {
                  setEditingService(null);
                  setShowServiceForm(true);
                }}
                size="lg"
              >
                + New Service
              </Button>
            )}
          </div>

          {/* ── Tabs: Services | Art Works ── */}
          <div
            className={cn(
              "flex gap-1 p-1 rounded-xl mb-3",
              t.isDark ? "bg-gray-800/60" : "bg-gray-100",
            )}
          >
            <button
              onClick={() => setActiveTab("services")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all",
                activeTab === "services"
                  ? cn("shadow-sm", t.isDark ? "bg-gray-700 text-white" : "bg-white text-gray-900")
                  : cn(t.isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"),
              )}
            >
              <Wrench size={16} />
              Services
            </button>
            <button
              onClick={() => setActiveTab("artworks")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all",
                activeTab === "artworks"
                  ? cn("shadow-sm", t.isDark ? "bg-gray-700 text-white" : "bg-white text-gray-900")
                  : cn(t.isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"),
              )}
            >
              <Palette size={16} />
              Art Works
            </button>
          </div>

          {/* ── Breadcrumb (services tab only) ── */}
          {activeTab === "services" && (
          <div
            className={cn(
              "flex items-center gap-1 flex-wrap px-3 py-2 rounded-lg",
              t.isDark ? "bg-gray-800/60" : "bg-gray-50/80",
            )}
          >
            {breadcrumbs.map((crumb, i) => (
              <div key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={12} className={t.textTertiary} />}
                {crumb.onClick ? (
                  <button
                    onClick={crumb.onClick}
                    className={cn(
                      "text-xs font-medium px-1.5 py-0.5 rounded-md transition-colors",
                      t.isDark
                        ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                        : "text-gray-500 hover:text-gray-800 hover:bg-gray-100",
                    )}
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span
                    className={cn(
                      "text-xs font-semibold px-1.5 py-0.5",
                      t.text,
                    )}
                  >
                    {crumb.label}
                  </span>
                )}
              </div>
            ))}
          </div>
          )}
        </div>

        {/* ── Art Works Tab ── */}
        {activeTab === "artworks" && branchId && (
          <ArtworksView branchId={branchId} canManage={canManageServices} />
        )}

        {/* ── Services Tab ── */}
        {activeTab === "services" && (
        <>
        {/* ── Error ── */}
        {error && (
          <div
            className={cn(
              "p-3 rounded-xl text-sm mb-5 border",
              t.isDark
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-red-50 border-red-200 text-red-600",
            )}
          >
            {error}
          </div>
        )}

        {/* ── Loading ── */}
        {isLoading && categories.length === 0 && <CategoryGridSkeleton />}

        {/* ── Views ── */}
        {!isLoading && (
          <>
            {nav.view === "categories" && (
              <CategoriesView
                categories={categories}
                onCategorySelect={handleCategorySelect}
                onCreateCategory={
                  canManageServices ? handleCreateCategory : undefined
                }
              />
            )}

            {nav.view === "subcategories" && nav.categoryId && (
              <SubCategoriesView
                subCategories={subCategories}
                onSubCategorySelect={handleSubCategorySelect}
                onBack={handleBack}
                isLoading={isLoading}
                onCreateSubCategory={
                  canManageServices ? handleCreateSubCategory : undefined
                }
              />
            )}

            {nav.view === "templates" && nav.subCategoryId && (
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

            {nav.view === "agent-services" && (
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

        </>
        )}

        {/* ── Modals ── */}
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

        {showTemplateForm && nav.subCategoryId && (
          <ServiceTemplateForm
            isOpen={showTemplateForm}
            branchId={branchId!}
            subCategoryId={nav.subCategoryId}
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
