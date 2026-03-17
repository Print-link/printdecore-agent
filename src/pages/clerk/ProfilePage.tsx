import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useThemeClasses } from "../../lib/theme";
import { cn } from "../../lib/utils";
import { apiService } from "../../services/api";
import { Card, PageHeader, Button, Input, Section } from "../../components/ui";
import {
	User,
	Mail,
	Lock,
	MapPin,
	Calendar,
	LogOut,
	Edit,
	Save,
	X,
	Key,
	CheckCircle,
	InfoIcon,
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
	const t = useThemeClasses();
	const navigate = useNavigate();

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

	const formatLocation = (location?: { latitude: number; longitude: number; address: string }) => {
		if (!location?.address) return "N/A";
		const parts = location.address.split(",").map((p) => p.trim());
		if (parts.length > 2) return parts.slice(-2).join(", ");
		if (location.address.length > 50) return location.address.substring(0, 47) + "...";
		return location.address;
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
									<ProfileDetailRow icon={MapPin} label="Location" value={formatLocation(user?.branch_id as unknown as { latitude: number; longitude: number; address: string })} />
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
		</div>
	);
}
