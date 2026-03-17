import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { apiService } from "../../services/api";
import { Mail, ArrowLeft } from "../../components/icons";
import { Card, Button, Input } from "../../components/ui";
import { useThemeClasses } from "../../lib/theme";
import { cn } from "../../lib/utils";
import printAgentLogo from "../../assets/images/printAgentLogo.png";

export default function ForgotPasswordPage() {
	const t = useThemeClasses();
	const { success, error: showError } = useToast();
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			await apiService.forgotPassword(email);
			setIsSubmitted(true);
			success(
				"Password reset link has been sent to your email",
				"Email Sent",
				5000
			);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Failed to send reset email";
			showError(errorMessage, "Error", 5000);
		} finally {
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
					{!isSubmitted ? (
						<>
							<div className="text-center mb-6">
								<div
									className={cn(
										"inline-flex items-center justify-center w-16 h-16 rounded-full mb-4",
										t.isDark ? "bg-gray-700" : "bg-gray-100"
									)}
								>
									<Mail
										className={cn(
											"w-8 h-8",
											t.isDark ? "text-gray-300" : "text-gray-600"
										)}
									/>
								</div>
								<h2 className={cn("text-2xl font-bold mb-2", t.text)}>
									Forgot Password?
								</h2>
								<p className={cn("text-sm", t.textSecondary)}>
									Enter your email address and we'll send you a link to reset
									your password.
								</p>
							</div>

							<form onSubmit={handleSubmit} className="space-y-6">
								<Input
									label="Email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="Enter your email"
									required
								/>

								<Button
									type="submit"
									loading={isLoading}
									className="w-full py-3"
								>
									{isLoading ? "Sending..." : "Send Reset Link"}
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
								<Mail
									className={cn(
										"w-8 h-8",
										t.isDark ? "text-green-400" : "text-green-600"
									)}
								/>
							</div>
							<h2 className={cn("text-2xl font-bold mb-2", t.text)}>
								Check Your Email
							</h2>
							<p className={cn("text-sm mb-6", t.textSecondary)}>
								We've sent a password reset link to <strong>{email}</strong>.
								Please check your inbox and follow the instructions to reset your
								password.
							</p>
							<button
								onClick={() => {
									setIsSubmitted(false);
									setEmail("");
								}}
								className={cn(
									"text-sm font-medium",
									t.isDark
										? "text-amber-400 hover:text-amber-300"
										: "text-amber-600 hover:text-amber-700"
								)}
							>
								Send to a different email
							</button>
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
