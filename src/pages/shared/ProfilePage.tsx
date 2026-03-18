import { useState, useCallback, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../stores/authStore";
import { usePermissions } from "../../hooks/usePermissions";
import { useThemeClasses } from "../../lib/theme";
import { cn } from "../../lib/utils";
import { apiService } from "../../services/api";
import { Card, PageHeader, Button, Input, Section, StatusBadge } from "../../components/ui";
import {
	User,
	Mail,
	MapPin,
	Calendar,
	LogOut,
	Edit,
	Save,
	X,
	Key,
	CheckCircle,
	InfoIcon,
	Store,
	Phone,
	Clock,
	ChevronDown,
	ChevronUp,
	Globe,
} from "../../components/icons";

function ProfileDetailRow({ icon: Icon, label, value }: { icon: (p: { size: number; className?: string }) => JSX.Element; label: string; value: string }) {
	const t = useThemeClasses();
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-3">
				<Icon className={t.textSecondary} size={18} />
				<span className={t.textSecondary}>{label}</span>
			</div>
			<span className={t.text}>{value}</span>
		</div>
	);
}

export default function ProfilePage() {
	const { user, logout, updateUserProfile } = useAuthStore();
	const { isClerk } = usePermissions();
	const t = useThemeClasses();
	const navigate = useNavigate();

	// Fetch branch info for clerks
	const { data: branch } = useQuery({
		queryKey: ["clerkBranch", user?.branch_id],
		queryFn: () => apiService.getBranchById(user!.branch_id!),
		enabled: isClerk && !!user?.branch_id,
		staleTime: 60000,
	});

	const [isEditingProfile, setIsEditingProfile] = useState(false);
	const [isChangingPassword, setIsChangingPassword] = useState(false);
	const [profileData, setProfileData] = useState({
		name: user?.name || user?.firstName || "",
		email: user?.email || "",
	});
	const [passwordData, setPasswordData] = useState({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});
	const [profileError, setProfileError] = useState<string | null>(null);
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const getInitials = (name?: string) => {
		if (!name) return "U";
		return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
	};

	const formatDate = (timestamp: number | Date | undefined) => {
		if (!timestamp) return "N/A";
		const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
		return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
	};


	const handleProfileSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setProfileError(null);
		setIsSubmitting(true);
		try {
			await updateUserProfile({
				name: profileData.name.trim() || undefined,
				email: profileData.email.trim() || undefined,
			});
			setIsEditingProfile(false);
			setSuccessMessage("Profile updated successfully!");
			setTimeout(() => setSuccessMessage(null), 3000);
		} catch (err: unknown) {
			setProfileError(err instanceof Error ? err.message : "Failed to update profile");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handlePasswordSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setPasswordError(null);
		setIsSubmitting(true);

		if (!passwordData.currentPassword) { setPasswordError("Current password is required"); setIsSubmitting(false); return; }
		if (!passwordData.newPassword) { setPasswordError("New password is required"); setIsSubmitting(false); return; }
		if (passwordData.newPassword.length < 6) { setPasswordError("New password must be at least 6 characters"); setIsSubmitting(false); return; }
		if (passwordData.newPassword !== passwordData.confirmPassword) { setPasswordError("Passwords do not match"); setIsSubmitting(false); return; }

		try {
			await apiService.changePassword(passwordData.currentPassword, passwordData.newPassword);
			setIsChangingPassword(false);
			setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
			setSuccessMessage("Password changed successfully!");
			setTimeout(() => setSuccessMessage(null), 3000);
		} catch (err: unknown) {
			setPasswordError(err instanceof Error ? err.message : "Failed to change password");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleLogout = async () => { await logout(); navigate("/login"); };

	const VerifyIcon = user?.verified
		? <CheckCircle className="text-blue-500 fill-blue-500/10" size={20} />
		: <InfoIcon className="text-red-500 fill-red-500/10" size={20} />;

	return (
		<div className="space-y-6">
			<PageHeader title="My Profile" description="Manage your account information and preferences" />

			{successMessage && (
				<div className={cn("p-4 rounded-lg flex items-center gap-3", t.isDark ? "bg-green-900/30 border border-green-800 text-green-400" : "bg-green-50 border border-green-200 text-green-600")}>
					<Save size={20} />
					<span>{successMessage}</span>
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Personal Information Card */}
				<Card padding="lg">
					<Section
						title="Personal Information"
						actions={!isEditingProfile ? <Button variant="secondary" size="sm" icon={Edit} onClick={() => setIsEditingProfile(true)}>Edit</Button> : undefined}
					>
						{isEditingProfile ? (
							<form onSubmit={handleProfileSubmit} className="space-y-4">
								<Input label="Full Name" type="text" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} required />
								<Input label="Email Address" type="email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} required />

								{profileError && (
									<div className={cn("p-3 rounded-md text-sm", t.isDark ? "bg-red-900/30 text-red-400 border border-red-800" : "bg-red-50 text-red-600 border border-red-200")}>
										{profileError}
									</div>
								)}

								<div className="flex gap-3">
									<Button type="submit" loading={isSubmitting} icon={Save} className="flex-1">
										{isSubmitting ? "Saving..." : "Save Changes"}
									</Button>
									<Button type="button" variant="secondary" icon={X} className="flex-1" onClick={() => {
										setIsEditingProfile(false);
										setProfileData({ name: user?.name || user?.firstName || "", email: user?.email || "" });
										setProfileError(null);
									}}>
										Cancel
									</Button>
								</div>
							</form>
						) : (
							<div className="space-y-6">
								{/* Avatar */}
								<div className={cn("flex items-center gap-5 pb-6 border-b", t.border)}>
									<div className="w-20 h-20 rounded-full bg-amber-400 flex items-center justify-center text-2xl font-bold text-gray-900 relative">
										{getInitials(user?.name || user?.firstName)}
										<div className={cn("absolute -bottom-1 -right-1 p-1 rounded-full", t.isDark ? "bg-gray-800" : "bg-white")}>
											{VerifyIcon}
										</div>
									</div>
									<div>
										<div className="flex items-center gap-2 mb-1">
											<h3 className={cn("text-2xl font-bold", t.text)}>{user?.name || user?.firstName || "User"}</h3>
											{VerifyIcon}
										</div>
										<p className={cn("text-sm flex items-center gap-2", t.textSecondary)}>
											<Mail size={14} />
											{user?.email || "No email"}
										</p>
									</div>
								</div>

								{/* Account Details */}
								<div className="space-y-4">
									<ProfileDetailRow icon={Mail} label="Email" value={user?.email || "N/A"} />
									<ProfileDetailRow icon={User} label="Role" value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "N/A"} />
									<ProfileDetailRow icon={Calendar} label="Member Since" value={formatDate(user?.createdAt)} />
								</div>
							</div>
						)}
					</Section>
				</Card>

				{/* Security Card */}
				<Card padding="lg">
					<Section title="Security">
						{isChangingPassword ? (
							<form onSubmit={handlePasswordSubmit} className="space-y-4">
								<Input label="Current Password" type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} required />
								<Input label="New Password" type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} required minLength={6} />
								<Input label="Confirm New Password" type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} required minLength={6} />

								{passwordError && (
									<div className={cn("p-3 rounded-md text-sm", t.isDark ? "bg-red-900/30 text-red-400 border border-red-800" : "bg-red-50 text-red-600 border border-red-200")}>
										{passwordError}
									</div>
								)}

								<div className="flex gap-3">
									<Button type="submit" loading={isSubmitting} icon={Key} className="flex-1">
										{isSubmitting ? "Updating..." : "Update Password"}
									</Button>
									<Button type="button" variant="secondary" icon={X} className="flex-1" onClick={() => {
										setIsChangingPassword(false);
										setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
										setPasswordError(null);
									}}>
										Cancel
									</Button>
								</div>
							</form>
						) : (
							<div className="space-y-4">
								<div className={cn("p-4 rounded-lg", t.isDark ? "bg-gray-700 border border-gray-600" : "bg-gray-50 border border-gray-200")}>
									<p className={cn("text-sm mb-3", t.textSecondary)}>Change your password to keep your account secure</p>
									<Button variant="secondary" icon={Key} className="w-full" onClick={() => setIsChangingPassword(true)}>
										Change Password
									</Button>
								</div>

								<div className={cn("p-4 rounded-lg border", t.isDark ? "bg-red-900/20 border-red-800" : "bg-red-50 border-red-200")}>
									<p className={cn("text-sm mb-3", t.textSecondary)}>Sign out of your account</p>
									<Button variant="danger" icon={LogOut} className="w-full" onClick={handleLogout}>
										Logout
									</Button>
								</div>
							</div>
						)}
					</Section>
				</Card>
			</div>

			{/* My Branch — clerks only */}
			{isClerk && branch && <BranchInfoCard branch={branch} t={t} />}
		</div>
	);
}

// ─── Collapsible disclosure section ────────────────────────────────────

function DisclosureSection({
	icon: Icon,
	title,
	defaultOpen = false,
	children,
}: {
	icon: (p: { size: number; className?: string }) => JSX.Element;
	title: string;
	defaultOpen?: boolean;
	children: React.ReactNode;
}) {
	const [open, setOpen] = useState(defaultOpen);
	const t = useThemeClasses();
	const Chevron = open ? ChevronUp : ChevronDown;

	return (
		<div className={cn("border rounded-xl overflow-hidden transition-colors", t.border)}>
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className={cn(
					"w-full flex items-center justify-between px-5 py-3.5 transition-colors",
					t.isDark ? "hover:bg-gray-700/50" : "hover:bg-gray-50",
				)}
			>
				<div className="flex items-center gap-3">
					<Icon size={18} className={t.textSecondary} />
					<span className={cn("text-sm font-semibold", t.text)}>{title}</span>
				</div>
				<Chevron size={16} className={t.textTertiary} />
			</button>
			{open && (
				<div className={cn("px-5 pb-4 pt-1 border-t", t.borderSubtle)}>
					{children}
				</div>
			)}
		</div>
	);
}

// ─── Branch info card ──────────────────────────────────────────────────

function BranchInfoCard({ branch, t }: { branch: any; t: ReturnType<typeof useThemeClasses> }) {
	const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
	const todayHours = branch.operatingHours?.[todayName] || branch.operatingHours?.[todayName.toLowerCase()];

	const hasContact = branch.branchEmailAddress || branch.phoneNumber;
	const hasLocation = branch.location?.address;
	const hasHours = branch.operatingHours && Object.keys(branch.operatingHours).length > 0;

	return (
		<Card padding="none">
			{/* Header bar */}
			<div className={cn("px-6 py-5 flex items-center justify-between border-b", t.border)}>
				<div className="flex items-center gap-4">
					{branch.branchCoverImage ? (
						<img src={branch.branchCoverImage} alt={branch.name} className="w-12 h-12 rounded-xl object-cover" />
					) : (
						<div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", t.isDark ? "bg-purple-900/30" : "bg-purple-100")}>
							<Store size={22} className="text-purple-500" />
						</div>
					)}
					<div>
						<div className="flex items-center gap-2.5">
							<h3 className={cn("text-lg font-bold", t.text)}>{branch.name}</h3>
							{branch.isMainBranch && (
								<span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-400/15 text-amber-600 dark:text-amber-400">
									Main
								</span>
							)}
						</div>
						<div className="flex items-center gap-3 mt-1">
							<StatusBadge status={branch.status} />
							{todayHours && (
								<span className={cn("text-xs", t.textTertiary)}>
									Today: {todayHours.open} — {todayHours.close}
								</span>
							)}
							{!todayHours && hasHours && (
								<span className="text-xs text-red-400">Closed today</span>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Collapsible sections */}
			<div className="p-4 space-y-3">
				{/* Contact */}
				{hasContact && (
					<DisclosureSection icon={Phone} title="Contact Information" defaultOpen>
						<div className="space-y-3 pt-2">
							{branch.branchEmailAddress && (
								<ProfileDetailRow icon={Mail} label="Email" value={branch.branchEmailAddress} />
							)}
							{branch.phoneNumber && (
								<ProfileDetailRow icon={Phone} label="Phone" value={branch.phoneNumber} />
							)}
						</div>
					</DisclosureSection>
				)}

				{/* Location */}
				{hasLocation && (
					<DisclosureSection icon={MapPin} title="Location">
						<div className="space-y-3 pt-2">
							<ProfileDetailRow icon={MapPin} label="Address" value={branch.location.address} />
							{branch.location.latitude && branch.location.longitude && (
								<ProfileDetailRow icon={Globe} label="Coordinates" value={`${branch.location.latitude.toFixed(4)}, ${branch.location.longitude.toFixed(4)}`} />
							)}
						</div>
					</DisclosureSection>
				)}

				{/* Operating Hours */}
				{hasHours && (
					<DisclosureSection icon={Clock} title="Operating Hours">
						<div className={cn("rounded-lg border overflow-hidden mt-2", t.border)}>
							{['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
								const hours = branch.operatingHours[day] || branch.operatingHours[day.toLowerCase()];
								const isToday = todayName === day;
								return (
									<div
										key={day}
										className={cn(
											"flex items-center justify-between px-4 py-2.5 text-sm border-b last:border-0",
											t.borderSubtle,
											isToday && (t.isDark ? "bg-amber-900/15" : "bg-amber-50"),
										)}
									>
										<div className="flex items-center gap-2">
											{isToday && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
											<span className={cn("font-medium", isToday ? "text-amber-600 dark:text-amber-400" : t.textSecondary)}>
												{day}
											</span>
										</div>
										<span className={cn(
											"font-medium",
											!hours ? "text-red-400" : isToday ? "text-amber-600 dark:text-amber-400" : t.text,
										)}>
											{hours ? `${hours.open} — ${hours.close}` : "Closed"}
										</span>
									</div>
								);
							})}
						</div>
					</DisclosureSection>
				)}
			</div>
		</Card>
	);
}
