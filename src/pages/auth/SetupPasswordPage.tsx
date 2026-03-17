import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { apiService } from "../../services/api";
import { Lock, Eye, EyeOff } from "../../components/icons";
import { Card, Button, Input } from "../../components/ui";
import { useThemeClasses } from "../../lib/theme";
import { cn } from "../../lib/utils";

export default function SetupPasswordPage() {
	const navigate = useNavigate();
	const { user } = useAuthStore();
	const t = useThemeClasses();
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	if (!user || user.isTemporaryPassword !== true) {
		navigate("/login");
		return null;
	}

	const validatePassword = (password: string): string | null => {
		if (password.length < 8) {
			return "Password must be at least 8 characters long";
		}
		if (!/(?=.*[a-z])/.test(password)) {
			return "Password must contain at least one lowercase letter";
		}
		if (!/(?=.*[A-Z])/.test(password)) {
			return "Password must contain at least one uppercase letter";
		}
		if (!/(?=.*\d)/.test(password)) {
			return "Password must contain at least one number";
		}
		return null;
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!newPassword || !confirmPassword) {
			setError("Please fill in all fields");
			return;
		}

		const passwordError = validatePassword(newPassword);
		if (passwordError) {
			setError(passwordError);
			return;
		}

		if (newPassword !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		setIsLoading(true);

		try {
			await apiService.changeClerkPassword(user.id, newPassword);

			useAuthStore.setState({
				user: {
					...user,
					isTemporaryPassword: false,
				},
				isAuthenticated: true,
			});

			if (
				(user as unknown as { location?: { address: string } }).location
					?.address
			) {
				navigate("/");
			} else {
				navigate("/setup-location");
			}
		} catch (err: unknown) {
			const errorMessage =
				err instanceof Error
					? err.message
					: "Failed to change password. Please try again.";
			setError(errorMessage);
			setIsLoading(false);
		}
	};

	return (
		<div
			className={cn(
				"min-h-screen flex items-center justify-center p-5 bg-gradient-to-br",
				t.isDark ? "from-gray-900 to-gray-800" : "from-white to-gray-50"
			)}
		>
			<Card raised padding="lg" className="w-full max-w-md rounded-lg">
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-400 mb-4">
						<Lock className="w-8 h-8 text-gray-900" />
					</div>
					<h2 className={cn("text-2xl font-bold mb-2", t.text)}>
						Set Up Your Password
					</h2>
					<p className={cn("text-sm", t.textSecondary)}>
						Please create a secure password for your account
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-6">
					<div className="relative">
						<Input
							label="New Password"
							type={showPassword ? "text" : "password"}
							value={newPassword}
							onChange={(e) => setNewPassword(e.target.value)}
							placeholder="Enter new password"
							required
							className="pr-10"
						/>
						<button
							type="button"
							onClick={() => setShowPassword(!showPassword)}
							className={cn(
								"absolute right-3 top-[38px] -translate-y-1/2",
								t.textSecondary
							)}
						>
							{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
						</button>
					</div>

					<div className="relative">
						<Input
							label="Confirm Password"
							type={showConfirmPassword ? "text" : "password"}
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							placeholder="Confirm new password"
							required
							className="pr-10"
						/>
						<button
							type="button"
							onClick={() => setShowConfirmPassword(!showConfirmPassword)}
							className={cn(
								"absolute right-3 top-[38px] -translate-y-1/2",
								t.textSecondary
							)}
						>
							{showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
						</button>
					</div>

					{error && (
						<div
							className={cn(
								"p-3 rounded-md text-sm text-center border",
								t.isDark
									? "bg-red-900/30 text-red-400 border-red-800"
									: "bg-red-50 text-red-600 border-red-200"
							)}
						>
							{error}
						</div>
					)}

					<Button
						type="submit"
						loading={isLoading}
						className="w-full py-3 shadow-md hover:shadow-lg"
					>
						{isLoading ? "Setting up password..." : "Continue"}
					</Button>
				</form>
			</Card>
		</div>
	);
}
