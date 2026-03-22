import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../stores/authStore';
import { useBranchStore } from '../../../stores/branchStore';
import { useThemeClasses } from '../../../lib/theme';
import { useToast } from '../../../contexts/ToastContext';
import { apiService } from '../../../services/api';
import { useBranchForm } from '../../manager/branches/hooks/useBranchForm';
import { useBranchImage } from '../../manager/branches/hooks/useBranchImage';
import {
	BasicInfoStep,
	LocationStep,
	OperatingHoursStep,
} from '../../manager/branches/components';
import { Button } from '../../../components/ui';
import { AlertCircle, Save, Info, MapPin, Clock, CreditCard } from '../../../components/icons';
import PaymentSettingsSection from './PaymentSettingsSection';

const SECTIONS = [
	{ id: 'basic', title: 'Basic Identity', icon: Info },
	{ id: 'location', title: 'Location & Address', icon: MapPin },
	{ id: 'hours', title: 'Operating Hours', icon: Clock },
	{ id: 'payment', title: 'Payment & Settlement', icon: CreditCard },
];

export default function BranchInfoSettings() {
	const { user } = useAuthStore();
	const { selectedBranch: branch, selectBranch } = useBranchStore();
	const t = useThemeClasses();
	const { success, error: showError } = useToast();
	const queryClient = useQueryClient();
    const [activeSection, setActiveSection] = useState('basic');

	// Form state management
	const {
		formData,
		locationData,
		operatingHours,
		errors,
		updateFormData,
		updateLocationData,
		updateOperatingHours,
		validateAll,
        setFormData,
        setLocationData,
        setOperatingHours
	} = useBranchForm();

	// Image handling
	const {
		imagePreview,
        setImagePreview,
		handleImageSelect: handleImageSelectBase,
		handleRemoveImage: handleRemoveImageBase,
	} = useBranchImage();

    // Populate form with existing data
    useEffect(() => {
        if (branch) {
            setFormData({
                name: branch.name,
                phoneNumber: branch.phoneNumber || '',
                branchEmailAddress: branch.branchEmailAddress || '',
                status: branch.status,
                isMainBranch: branch.isMainBranch,
                branchCoverImage: branch.branchCoverImage || null
            });

            if (branch.location) {
                setLocationData({
                    address: branch.location.address,
                    latitude: branch.location.latitude,
                    longitude: branch.location.longitude,
                    city: (branch.location as any).city || '',
                    state: (branch.location as any).state || '',
                    country: (branch.location as any).country || '',
                    postalCode: (branch.location as any).postalCode || '',
                });
            }

            if (branch.operatingHours) {
                setOperatingHours(branch.operatingHours);
            }

            if (branch.branchCoverImage) {
                setImagePreview(branch.branchCoverImage);
            }
        }
    }, [branch, setFormData, setLocationData, setOperatingHours, setImagePreview]);

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
                formData.branchCoverImage instanceof File ? formData.branchCoverImage : undefined
            );
		},
		onSuccess: (updatedBranch) => {
			if (user?.id) {
				queryClient.invalidateQueries({ queryKey: ["branches", user.id] });
                queryClient.invalidateQueries({ queryKey: ["branch", branch?.id] });
			}
            selectBranch(updatedBranch);
			success("Branch settings updated", "Settings Saved", 4000);
		},
		onError: (error: unknown) => {
			const errorMessage = error instanceof Error ? error.message : "Failed to update settings";
			showError(errorMessage, "Update Failed", 5000);
		},
	});

	const handleSubmit = async () => {
		if (!validateAll()) {
            showError("Please fix the validation errors before saving.", "Validation Error");
            return;
        }

		const formattedOperatingHours: any = {};
		Object.entries(operatingHours).forEach(([day, hours]: [string, any]) => {
			if (hours.open && hours.close) {
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
                postalCode: locationData.postalCode
            }
		};

		updateBranchMutation.mutate(updateData);
	};

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveSection(id);
        }
    };

    if (!branch) {
        return (
            <div className={`p-8 text-center rounded-xl border-2 border-dashed ${t.border} ${t.textSecondary}`}>
                <AlertCircle size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">No Branch Selected</p>
                <p className="text-sm">Please select a branch to view and edit its information.</p>
            </div>
        );
    }

	return (
		<div className="max-w-5xl mx-auto pb-12">
            {/* Sticky Header */}
            <div className={`sticky top-0 z-20 pb-4 mb-8 pt-2 ${t.surfaceInset}/95 backdrop-blur-sm border-b ${t.border}`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className={`text-2xl font-bold ${t.text}`}>
                            Branch Management
                        </h1>
                        <p className={`text-sm ${t.textSecondary}`}>
                            {branch.name} &bull; Operational Settings
                        </p>
                    </div>
                    <Button
                        onClick={handleSubmit}
                        disabled={updateBranchMutation.isPending}
                        loading={updateBranchMutation.isPending}
                        icon={updateBranchMutation.isPending ? undefined : Save}
                        size="lg"
                        className="shadow-lg active:scale-95"
                    >
                        {updateBranchMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>

                {/* Horizontal Navigation */}
                <div className="flex gap-6 mt-6 overflow-x-auto no-scrollbar">
                    {SECTIONS.map((section) => {
                        const Icon = section.icon;
                        const isActive = activeSection === section.id;
                        return (
                            <button
                                key={section.id}
                                onClick={() => scrollToSection(section.id)}
                                className={`flex items-center gap-2 pb-2 px-1 whitespace-nowrap border-0 border-b-2 transition-all cursor-pointer bg-transparent ${
                                    isActive
                                        ? 'border-amber-400 text-amber-500 font-semibold'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <Icon size={16} />
                                <span className="text-sm">{section.title}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-8">
                {/* Basic Info Section */}
                <section id="basic" className={`p-8 rounded-2xl border ${t.isDark ? 'bg-gray-800/40 border-gray-700' : 'bg-white border-gray-100'} shadow-sm`}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-amber-400/10 text-amber-500 rounded-lg">
                            <Info size={20} />
                        </div>
                        <h2 className={`text-xl font-bold ${t.text}`}>
                            Basic Identity
                        </h2>
                    </div>
                    <BasicInfoStep
                        formData={formData}
                        errors={errors}
                        imagePreview={imagePreview}
                        onFormDataChange={updateFormData}
                        onImageSelect={handleImageSelect}
                        onRemoveImage={handleRemoveImage}
                    />
                </section>

                {/* Location Section */}
                <section id="location" className={`p-8 rounded-2xl border ${t.isDark ? 'bg-gray-800/40 border-gray-700' : 'bg-white border-gray-100'} shadow-sm`}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-400/10 text-blue-500 rounded-lg">
                            <MapPin size={20} />
                        </div>
                        <h2 className={`text-xl font-bold ${t.text}`}>
                            Location & Address
                        </h2>
                    </div>
                    <LocationStep
                        locationData={locationData}
                        errors={errors}
                        onLocationChange={updateLocationData}
                    />
                </section>

                {/* Hours Section */}
                <section id="hours" className={`p-8 rounded-2xl border ${t.isDark ? 'bg-gray-800/40 border-gray-700' : 'bg-white border-gray-100'} shadow-sm`}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-green-400/10 text-green-500 rounded-lg">
                            <Clock size={20} />
                        </div>
                        <h2 className={`text-xl font-bold ${t.text}`}>
                            Operating Hours
                        </h2>
                    </div>
                    <OperatingHoursStep
                        operatingHours={operatingHours}
                        errors={errors}
                        onOperatingHoursChange={updateOperatingHours}
                    />
                </section>

                {/* Payment & Settlement Section */}
                <section id="payment" className={`p-8 rounded-2xl border ${t.isDark ? 'bg-gray-800/40 border-gray-700' : 'bg-white border-gray-100'} shadow-sm`}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-400/10 text-purple-500 rounded-lg">
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <h2 className={`text-xl font-bold ${t.text}`}>
                                Payment & Settlement
                            </h2>
                            <p className={`text-sm ${t.textSecondary}`}>
                                Configure how you receive payments from customers
                            </p>
                        </div>
                    </div>
                    <div className={`p-4 rounded-xl mb-6 ${t.isDark ? 'bg-amber-900/20 border border-amber-800/30' : 'bg-amber-50 border border-amber-200'}`}>
                        <p className={`text-sm ${t.isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                            Payments are powered by <span className="font-semibold">Paystack</span>. Settlements are processed and deposited into your bank account on the next business day after each transaction.
                        </p>
                    </div>
                    <PaymentSettingsSection
                        branchId={branch.id}
                        branchName={branch.name}
                    />
                </section>
            </div>
		</div>
	);
}
