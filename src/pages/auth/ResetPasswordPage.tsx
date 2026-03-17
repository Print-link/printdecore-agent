import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { apiService } from "../../services/api";
import { Lock, ArrowLeft, Eye, EyeOff } from "../../components/icons";
import { Card, Button, Input } from "../../components/ui";
import { useThemeClasses } from "../../lib/theme";
import { cn } from "../../lib/utils";
import printAgentLogo from "../../assets/images/printAgentLogo.png";

export default function ResetPasswordPage() {
	const t = useThemeClasses();
	const { success, error: showError } = useToast();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const token = searchParams.get("token");

	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [errors, setErrors] = useState<{
		password?: string;
		confirmPassword?: string;
	}>({});

	useEffect(() => {
		if (!token) {
			showError("Invalid or missing reset token", "Error", 5000);
			navigate("/forgot-password");
		}
	}, [token, navigate, showError]);

	const validatePassword = (pwd: string): string | undefined => {
		if (pwd.length < 8) {
			return "Password must be at least 8 characters long";
		}
		if (!/(?=.*[a-z])/.test(pwd)) {
			return "Password must contain at least one lowercase letter";
		}
		if (!/(?=.*[A-Z])/.test(pwd)) {
			return "Password must contain at least one uppercase letter";
		}
		if (!/(?=.*\d)/.test(pwd)) {
			return "Password must contain at least one number";
		}
		return undefined;
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setErrors({});

		// Validate password
		const passwordError = validatePassword(password);
		if (passwordError) {
			setErrors({ password: passwordError });
			return;
		}

		// Validate password match
		if (password !== confirmPassword) {
			setErrors({ confirmPassword: "Passwords do not match" });
			return;
		}

		if (!token) {
			showError("Invalid reset token", "Error", 5000);
			return;
		}

		setIsLoading(true);

		try {
			await apiService.resetPassword(token, password);
			setIsSuccess(true);
			success("Password has been reset successfully", "Success", 5000);
			setTimeout(() => {
				navigate("/login");
			}, 2000);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to reset password";
			showError(errorMessage, "Error", 5000);
		} finally {
			setIsLoading(false);
		}
	};

	if (!token) {
		return null;
	}

	return (
		<div
			className={cn(
				"min-h-screen flex items-center justify-center p-5 bg-gradient-to-br",
				t.isDark ? "from-gray-900 to-gray-800" : "from-white to-gray-50"
			)}
		>
			<div className="w-full max-w-md space-y-8">
				{/* Logo Section */}
				<div className="flex justify-center">
					<div className="w-64 h-auto">
						<img
							src={printAgentLogo}
							alt="Print Agent Logo"
							className="w-full h-auto object-contain"
						/>
					</div>
				</div>

				{/* Form Section */}
				<Card padding="lg" className="rounded-lg">
					{!isSuccess ? (
						<>
							<div className="text-center mb-6">
								<div
									className={cn(
										"inline-flex items-center justify-center w-16 h-16 rounded-full mb-4",
										t.isDark ? "bg-gray-700" : "bg-gray-100"
									)}
								>
									<Lock
										className={cn(
											"w-8 h-8",
											t.isDark ? "text-gray-300" : "text-gray-600"
										)}
									/>
								</div>
								<h2 className={cn("text-2xl font-bold mb-2", t.text)}>
									Reset Your Password
								</h2>
								<p className={cn("text-sm", t.textSecondary)}>
									Enter your new password below
								</p>
							</div>

							<form onSubmit={handleSubmit} className="space-y-6">
								<div>
									<div className="relative">
										<Input
											label="New Password"
											type={showPassword ? "text" : "password"}
											value={password}
											onChange={(e) => {
												setPassword(e.target.value);
												if (errors.password) {
													setErrors({ ...errors, password: undefined });
												}
											}}
											placeholder="Enter new password"
											required
											error={errors.password}
											className="pr-10"
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											className={cn(
												"absolute right-3 top-[38px] transform -translate-y-1/2",
												t.textSecondary,
												t.isDark ? "hover:text-gray-300" : "hover:text-gray-700"
											)}
										>
											{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
										</button>
									</div>
									<p className="mt-1 text-xs text-gray-500">
										Must be at least 8 characters with uppercase, lowercase, and
										number
									</p>
								</div>

								<div className="relative">
									<Input
										label="Confirm Password"
										type={showConfirmPassword ? "text" : "password"}
										value={confirmPassword}
										onChange={(e) => {
											setConfirmPassword(e.target.value);
											if (errors.confirmPassword) {
												setErrors({
													...errors,
													confirmPassword: undefined,
												});
											}
										}}
										placeholder="Confirm new password"
										required
										error={errors.confirmPassword}
										className="pr-10"
									/>
									<button
										type="button"
										onClick={() =>
											setShowConfirmPassword(!showConfirmPassword)
										}
										className={cn(
											"absolute right-3 top-[38px] transform -translate-y-1/2",
											t.textSecondary,
											t.isDark ? "hover:text-gray-300" : "hover:text-gray-700"
										)}
									>
										{showConfirmPassword ? (
											<EyeOff size={18} />
										) : (
											<Eye size={18} />
										)}
									</button>
								</div>

								<Button
									type="submit"
									loading={isLoading}
									className="w-full py-3"
								>
									{isLoading ? "Resetting..." : "Reset Password"}
								</Button>
							</form>
						</>
					) : (
						<div className="text-center">
							<div
								className={cn(
									"inline-flex items-center justify-center w-16 h-16 rounded-full mb-4",
									t.isDark ? "bg-green-900/30" : "bg-green-100"
								)}
							>
								<Lock
									className={cn(
										"w-8 h-8",
										t.isDark ? "text-green-400" : "text-green-600"
									)}
								/>
							</div>
							<h2 className={cn("text-2xl font-bold mb-2", t.text)}>
								Password Reset Successful
							</h2>
							<p className={cn("text-sm mb-6", t.textSecondary)}>
								Your password has been successfully reset. Redirecting to login...
							</p>
						</div>
					)}

					<div className="mt-6 text-center">
						<Link
							to="/login"
							className={cn(
								"inline-flex items-center gap-2 text-sm transition-colors",
								t.isDark
									? "text-gray-400 hover:text-gray-300"
									: "text-gray-600 hover:text-gray-900"
							)}
						>
							<ArrowLeft size={16} />
							Back to Login
						</Link>
					</div>
				</Card>
			</div>
		</div>
	);
}
