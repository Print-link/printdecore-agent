import { useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../stores/authStore";
import { useBranchStore } from "../../../stores/branchStore";
import { useThemeClasses } from "../../../lib/theme";
import { useToast } from "../../../contexts/ToastContext";
import { apiService } from "../../../services/api";
import { useBranchForm } from "../../manager/branches/hooks/useBranchForm";
import { useBranchImage } from "../../manager/branches/hooks/useBranchImage";
import {
  BasicInfoStep,
  LocationStep,
  OperatingHoursStep,
} from "../../manager/branches/components";
import { Button, PageHeader, Section } from "../../../components/ui";
import {
  AlertCircle,
  Save,
  Info,
  MapPin,
  Clock,
  CreditCard,
} from "../../../components/icons";
import PaymentSettingsSection from "./PaymentSettingsSection";
import SidebarTabLayout, {
  type SidebarTab,
} from "../../../components/layouts/SidebarTabLayout";

const tabs: SidebarTab[] = [
  { id: "basic", label: "Basic Info", icon: Info },
  { id: "location", label: "Location", icon: MapPin },
  { id: "hours", label: "Hours", icon: Clock },
  { id: "payment", label: "Settlement", icon: CreditCard },
];

export default function BranchInfoSettings() {
  const { user } = useAuthStore();
  const { selectedBranch: branch, selectBranch } = useBranchStore();
  const t = useThemeClasses();
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();

  const {
    formData,
    locationData,
    operatingHours,
    errors,
    updateFormData,
    updateLocationData,
    updateOperatingHours,
    toggleDayClosed,
    validateAll,
    setFormData,
    setLocationData,
    setOperatingHours,
  } = useBranchForm();

  const {
    imagePreview,
    setImagePreview,
    handleImageSelect: handleImageSelectBase,
    handleRemoveImage: handleRemoveImageBase,
  } = useBranchImage();

  useEffect(() => {
    if (branch) {
      setFormData({
        name: branch.name,
        phoneNumber: branch.phoneNumber || "",
        branchEmailAddress: branch.branchEmailAddress || "",
        status: branch.status || "active",
        isMainBranch: branch.isMainBranch,
        branchCoverImage: branch.branchCoverImage || null,
      });

      if (branch.location) {
        setLocationData({
          address: branch.location.address,
          latitude: branch.location.latitude,
          longitude: branch.location.longitude,
          city: (branch.location as any).city || "",
          state: (branch.location as any).state || "",
          country: (branch.location as any).country || "",
          postalCode: (branch.location as any).postalCode || "",
        });
      }

      if (branch.operatingHours) {
        setOperatingHours(branch.operatingHours);
      }

      if (branch.branchCoverImage) {
        setImagePreview(branch.branchCoverImage);
      }
    }
  }, [
    branch,
    setFormData,
    setLocationData,
    setOperatingHours,
    setImagePreview,
  ]);

  const handleImageSelect = (file: File) => {
    handleImageSelectBase(file, (selectedFile: File) => {
      updateFormData({ branchCoverImage: selectedFile });
    });
  };

  const handleRemoveImage = () => {
    handleRemoveImageBase(() => {
      updateFormData({ branchCoverImage: null });
    });
  };

  const updateBranchMutation = useMutation({
    mutationFn: async (updateData: any) => {
      if (!branch?.id) throw new Error("No branch selected");
      return await apiService.updateBranch(
        branch.id,
        updateData,
        formData.branchCoverImage instanceof File
          ? formData.branchCoverImage
          : undefined,
      );
    },
    onSuccess: (updatedBranch) => {
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ["branches", user.id] });
        queryClient.invalidateQueries({ queryKey: ["branch", branch?.id] });
        queryClient.invalidateQueries({ queryKey: ["branchInfo", branch?.id] });
      }
      selectBranch(updatedBranch);
      success("Branch settings updated", "Settings Saved", 4000);
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update settings";
      showError(errorMessage, "Update Failed", 5000);
    },
  });

  const handleSubmit = useCallback(async () => {
    if (!validateAll()) {
      showError(
        "Please fix the validation errors before saving.",
        "Validation Error",
      );
      return;
    }

    const formattedOperatingHours: any = {};
    Object.entries(operatingHours).forEach(([day, hours]: [string, any]) => {
      if (hours.isClosed) {
        formattedOperatingHours[day] = {
          open: hours.open || "00:00",
          close: hours.close || "00:00",
          isClosed: true,
        };
      } else if (hours.open && hours.close) {
        formattedOperatingHours[day] = { open: hours.open, close: hours.close };
      }
    });

    const updateData: any = {
      name: formData.name,
      phoneNumber: formData.phoneNumber || undefined,
      branchEmailAddress: formData.branchEmailAddress || undefined,
      status: formData.status,
      isMainBranch: formData.isMainBranch,
      operatingHours: formattedOperatingHours,
      location: {
        address: locationData.address,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        city: locationData.city,
        state: locationData.state,
        country: locationData.country,
        postalCode: locationData.postalCode,
      },
    };

    updateBranchMutation.mutate(updateData);
  }, [
    validateAll,
    showError,
    operatingHours,
    formData,
    locationData,
    updateBranchMutation,
  ]);

  if (!branch) {
    return (
      <div
        className={`p-8 text-center rounded-xl border-2 border-dashed ${t.border} ${t.textSecondary}`}
      >
        <AlertCircle size={48} className="mx-auto mb-4 opacity-20" />
        <p className="text-lg font-medium">No Branch Selected</p>
        <p className="text-sm">
          Please select a branch to view and edit its information.
        </p>
      </div>
    );
  }

  const SaveButton = () => (
    <Button
      onClick={handleSubmit}
      disabled={updateBranchMutation.isPending}
      loading={updateBranchMutation.isPending}
      icon={updateBranchMutation.isPending ? undefined : Save}
    >
      {updateBranchMutation.isPending ? "Saving..." : "Save Changes"}
    </Button>
  );

  return (
    <SidebarTabLayout
      title="Branch"
      basePath="/app/branch-info"
      tabs={tabs}
      defaultTab="basic"
    >
      {(activeTab) => (
        <>
          {activeTab === "basic" && (
            <Section>
              <PageHeader
                title="Basic Info"
                description={`${branch.name} — name, contact, cover image`}
              />
              <div className="max-w-2xl mt-6">
                <BasicInfoStep
                  formData={formData}
                  errors={errors}
                  imagePreview={imagePreview}
                  onFormDataChange={updateFormData}
                  onImageSelect={handleImageSelect}
                  onRemoveImage={handleRemoveImage}
                />
                <div className="mt-6 flex justify-end">
                  <SaveButton />
                </div>
              </div>
            </Section>
          )}

          {activeTab === "location" && (
            <Section>
              <PageHeader
                title="Location"
                description="Address, map coordinates"
              />
              <div className="max-w-2xl mt-6">
                <LocationStep
                  locationData={locationData}
                  errors={errors}
                  onLocationChange={updateLocationData}
                />
                <div className="mt-6 flex justify-end">
                  <SaveButton />
                </div>
              </div>
            </Section>
          )}

          {activeTab === "hours" && (
            <Section>
              <PageHeader
                title="Operating Hours"
                description="Set your working days and hours"
              />
              <div className="max-w-2xl mt-6">
                <OperatingHoursStep
                  operatingHours={operatingHours}
                  errors={errors}
                  onOperatingHoursChange={updateOperatingHours}
                  onToggleDayClosed={toggleDayClosed}
                />
                <div className="mt-6 flex justify-end">
                  <SaveButton />
                </div>
              </div>
            </Section>
          )}

          {activeTab === "payment" && (
            <Section>
              <PageHeader
                title="Payment & Settlement"
                description="Configure how you receive payments from customers"
              />
              <div className="max-w-2xl mt-6">
                <div
                  className={`p-4 rounded-xl mb-6 ${t.isDark ? "bg-amber-900/20 border border-amber-800/30" : "bg-amber-50 border border-amber-200"}`}
                >
                  <p
                    className={`text-sm ${t.isDark ? "text-amber-300" : "text-amber-800"}`}
                  >
                    Payments are powered by{" "}
                    <span className="font-semibold">Paystack</span>. Settlements
                    are processed and deposited into your bank account on the
                    next business day after each transaction.
                  </p>
                </div>
                <PaymentSettingsSection
                  branchId={branch.id}
                  branchName={branch.name}
                />
              </div>
            </Section>
          )}
        </>
      )}
    </SidebarTabLayout>
  );
}
