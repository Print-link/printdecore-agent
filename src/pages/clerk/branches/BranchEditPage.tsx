import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../stores/authStore';
import { useTheme } from '../../../contexts/ThemeContext';
import { useToast } from '../../../contexts/ToastContext';
import { apiService } from '../../../services/api';
import { useBranchForm } from './hooks/useBranchForm';
import { useBranchImage } from './hooks/useBranchImage';
import {
	BasicInfoStep,
	LocationStep,
	OperatingHoursStep,
} from './components';
import { AlertCircle, Save, Loader2, Info, MapPin, Clock, ArrowLeft } from 'lucide-react';

const SECTIONS = [
	{ id: 'basic', title: 'Basic Identity', icon: Info },
	{ id: 'location', title: 'Location & Address', icon: MapPin },
	{ id: 'hours', title: 'Operating Hours', icon: Clock },
];

export default function BranchEditPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { user } = useAuthStore();
	const { theme } = useTheme();
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

	// Fetch existing branch data
	const { data: branch, isLoading: isFetching } = useQuery({
		queryKey: ["branch", id],
		queryFn: () => apiService.getBranchById(id!),
		enabled: !!id,
	});

	// Populate form with existing data
	useEffect(() => {
		if (branch) {
			setFormData({
				name: branch.name,
				phoneNumber: branch.phoneNumber || '',
				branchEmailAddress: branch.branchEmailAddress || '',
				status: branch.status as any,
				isMainBranch: branch.isMainBranch || false,
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
			return await apiService.updateBranch(
				id!,
				updateData,
				formData.branchCoverImage instanceof File ? formData.branchCoverImage : undefined
			);
		},
		onSuccess: () => {
			if (user?.id) {
				queryClient.invalidateQueries({ queryKey: ["branches", user.id] });
			}
			queryClient.invalidateQueries({ queryKey: ["branch", id] });
			success("Branch updated successfully", "Success", 4000);
			navigate('/clerk/branches');
		},
		onError: (error: unknown) => {
			const errorMessage = error instanceof Error ? error.message : "Failed to update branch";
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

	const scrollToSection = (sectionId: string) => {
		const element = document.getElementById(sectionId);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
			setActiveSection(sectionId);
		}
	};

	if (isFetching) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Loader2 className="animate-spin text-amber-400" size={48} />
			</div>
		);
	}

	if (!branch) {
		return (
			<div className="p-8 text-center bg-red-50 text-red-600 rounded-xl border border-red-200">
				<AlertCircle className="mx-auto mb-4" size={48} />
				<p className="text-lg font-semibold">Branch Not Found</p>
				<button
					onClick={() => navigate('/clerk/branches')}
					className="mt-4 text-amber-600 font-medium hover:underline"
				>
					Return to Branches
				</button>
			</div>
		);
	}

	return (
		<div className="max-w-5xl mx-auto pb-12 pt-4 px-4">
			{/* Sticky Header */}
			<div className={`sticky top-0 z-20 pb-4 mb-8 pt-2 ${theme === 'dark' ? 'bg-gray-900/95' : 'bg-gray-50/95'
				} backdrop-blur-sm border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
				}`}>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<button
							onClick={() => navigate('/clerk/branches')}
							className={`p-2 rounded-full transition-colors border-none cursor-pointer ${theme === 'dark' ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
								}`}
						>
							<ArrowLeft size={20} />
						</button>
						<div>
							<h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
								Edit Branch
							</h1>
							<p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
								{branch.name}
							</p>
						</div>
					</div>
					<button
						onClick={handleSubmit}
						disabled={updateBranchMutation.isPending}
						className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold transition-all shadow-lg active:scale-95 border-none cursor-pointer ${updateBranchMutation.isPending
							? 'bg-gray-400 cursor-not-allowed text-white'
							: 'bg-amber-400 hover:bg-amber-500 text-gray-900'
							}`}
					>
						{updateBranchMutation.isPending ? (
							<Loader2 size={18} className="animate-spin" />
						) : (
							<Save size={18} />
						)}
						{updateBranchMutation.isPending ? 'Updating...' : 'Update Branch'}
					</button>
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
								className={`flex items-center gap-2 pb-2 px-1 whitespace-nowrap border-0 border-b-2 transition-all cursor-pointer bg-transparent ${isActive
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
				<section id="basic" className={`p-8 rounded-2xl border ${theme === 'dark' ? 'bg-gray-800/40 border-gray-700' : 'bg-white border-gray-100'
					} shadow-sm`}>
					<div className="flex items-center gap-3 mb-6">
						<div className="p-2 bg-amber-400/10 text-amber-500 rounded-lg">
							<Info size={20} />
						</div>
						<h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
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
				<section id="location" className={`p-8 rounded-2xl border ${theme === 'dark' ? 'bg-gray-800/40 border-gray-700' : 'bg-white border-gray-100'
					} shadow-sm`}>
					<div className="flex items-center gap-3 mb-6">
						<div className="p-2 bg-blue-400/10 text-blue-500 rounded-lg">
							<MapPin size={20} />
						</div>
						<h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
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
				<section id="hours" className={`p-8 rounded-2xl border ${theme === 'dark' ? 'bg-gray-800/40 border-gray-700' : 'bg-white border-gray-100'
					} shadow-sm`}>
					<div className="flex items-center gap-3 mb-6">
						<div className="p-2 bg-green-400/10 text-green-500 rounded-lg">
							<Clock size={20} />
						</div>
						<h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
							Operating Hours
						</h2>
					</div>
					<OperatingHoursStep
						operatingHours={operatingHours}
						errors={errors}
						onOperatingHoursChange={updateOperatingHours}
					/>
				</section>
			</div>
		</div>
	);
}
