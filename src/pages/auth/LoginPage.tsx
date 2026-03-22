import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { Eye, EyeOff } from "../../components/icons";
import type { UserRole } from "../../types";
import { authApi } from "../../services/api/auth";
import logo from "../../assets/images/LogoArt.png";
import bgImage from "../../assets/images/small-business-owner.jpg";

type AuthMode = "login" | "register";
type RegisterStep = "form" | "otp";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const { theme } = useTheme();
  const { success, error: showError } = useToast();

  const [mode, setMode] = useState<AuthMode>("login");
  const [userRole, setUserRole] = useState<UserRole>("manager");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Register-only fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneCode, setPhoneCode] = useState("+233");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  // OTP step state
  const [registerStep, setRegisterStep] = useState<RegisterStep>("form");
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password, role: userRole });

      const { user } = useAuthStore.getState();
      success(
        `Welcome back, ${user?.firstName || user?.name || "User"}!`,
        "Login Successful",
        3000,
      );

      if (user?.isTemporaryPassword === true) {
        navigate("/setup-password");
        return;
      }

      navigate("/");
    } catch (err) {
      const storeError = useAuthStore.getState().error;
      const errorMessage =
        storeError || (err instanceof Error ? err.message : "Login failed");
      showError(errorMessage, "Login Failed", 5000);
    }
  };

  // Step 1: Validate form & send OTP
  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);
    try {
      await authApi.sendManagerOtp(email);
      setRegisterStep("otp");
      startResendCooldown();
      success(`A 6-digit code was sent to ${email}`, "Check your email", 4000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send OTP";
      showError(errorMessage, "Error", 5000);
    } finally {
      setRegisterLoading(false);
    }
  };

  // Step 2: Verify OTP then create account
  const handleVerifyAndRegister = async (e: FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);
    try {
      await authApi.verifyOtp(email, otpCode);
      await authApi.registerManager({
        firstName,
        lastName,
        email,
        password,
        phoneNumber: phoneNumber ? `${phoneCode}${phoneNumber}` : undefined,
      });

      success(
        "Your account has been created. Logging you in...",
        "Registration Successful",
        3000,
      );

      await login({ email, password, role: "manager" });
      navigate("/");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Verification failed";
      showError(errorMessage, "Error", 5000);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      await authApi.resendManagerOtp(email);
      startResendCooldown();
      success(`A new code was sent to ${email}`, "Code resent", 3000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to resend OTP";
      showError(errorMessage, "Error", 5000);
    }
  };

  const handleBackToForm = () => {
    setRegisterStep("form");
    setOtpCode("");
  };

  const isSubmitting = isLoading || registerLoading;

  const inputClass = `w-full px-4 py-2.5 rounded-md border ${
    theme === "dark"
      ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400"
      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
  } focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent`;

  const labelClass = `block text-sm font-medium mb-1.5 ${
    theme === "dark" ? "text-gray-300" : "text-gray-700"
  }`;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Background Image with Branding */}
      <div className="relative w-full lg:w-1/2 min-h-[40vh] lg:min-h-screen bg-gray-900 overflow-hidden hidden sm:block">
        <div className="absolute inset-0">
          <img
            src={bgImage}
            alt="Printing workspace"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70" />

        <div className="relative z-10 h-full flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-12">
          <div className="max-w-lg">
            <img
              src={logo}
              alt="Printdecore Logo"
              className="h-20 w-auto mb-10"
            />
            <h1 className="text-white text-3xl md:text-4xl lg:text-5xl font-black leading-tight mb-4">
              {mode === "register"
                ? "Start growing your print business today"
                : "Welcome back to Printdecore"}
            </h1>
            <p className="text-gray-300 text-lg mb-8">
              {mode === "register"
                ? "Join the leading marketplace for print vendors in Africa. Setup takes less than 5 minutes."
                : "Manage your orders, track revenue, and grow your printing business from your dashboard."}
            </p>

            <div className="flex flex-col sm:flex-row gap-5 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-amber-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Free to join</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-amber-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Secure payouts</span>
              </div>
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-amber-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Full dashboard</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Forms */}
      <div
        className={`w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-8 lg:px-12 py-12 ${
          theme === "dark" ? "bg-gray-900" : "bg-gray-50"
        }`}
      >
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex justify-center mb-6 sm:hidden">
            <img src={logo} alt="Printdecore Logo" className="h-16 w-auto" />
          </div>
          <div
            className={`rounded-xl p-8 ${
              theme === "dark"
                ? "bg-gray-800 border border-gray-700"
                : "bg-white border border-gray-200 shadow-sm"
            }`}
          >
            <h2
              className={`text-2xl font-bold mb-1 ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              {mode === "login"
                ? "Sign in to your account"
                : "Create your account"}
            </h2>
            <p
              className={`text-sm mb-6 ${
                theme === "dark" ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {mode === "login"
                ? "Enter your credentials to access your dashboard"
                : "Register as a print vendor to start receiving orders"}
            </p>

            {/* ===== LOGIN FORM ===== */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                {/* Role Selector */}
                <div>
                  <label className={labelClass}>I am a</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as UserRole)}
                    className={inputClass}
                  >
                    <option value="manager">Manager</option>
                    <option value="clerk">Clerk</option>
                  </select>
                </div>

                {/* Email */}
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className={inputClass}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className={labelClass}>Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3 px-4 rounded-md font-semibold text-sm transition-all ${
                    isSubmitting
                      ? "bg-amber-300 cursor-not-allowed"
                      : "bg-amber-400 hover:bg-amber-500 active:bg-amber-600"
                  } text-gray-900`}
                >
                  {isLoading ? "Logging in..." : "Log In"}
                </button>

                <div className="text-center">
                  <Link
                    to="/forgot-password"
                    className={`text-sm ${
                      theme === "dark"
                        ? "text-amber-400 hover:text-amber-300"
                        : "text-amber-600 hover:text-amber-700"
                    } font-medium transition-colors`}
                  >
                    Forgot password?
                  </Link>
                </div>
              </form>
            )}

            {/* ===== REGISTER FORM — Step 1: Details ===== */}
            {mode === "register" && registerStep === "form" && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                {/* Name Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      required
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      required
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className={inputClass}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <div
                    className={`flex rounded-md border focus-within:ring-2 focus-within:ring-amber-400 focus-within:border-transparent ${
                      theme === "dark"
                        ? "bg-gray-50 border-gray-100"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <select
                      value={phoneCode}
                      onChange={(e) => setPhoneCode(e.target.value)}
                      className={`pl-4 pr-2 py-2.5 border-gray-50 text-sm focus:outline-none bg-transparent flex-shrink-0 ${
                        theme === "dark" ? "text-gray-100" : "text-gray-900"
                      }`}
                    >
                      <option value="+233">🇬🇭 +233</option>
                      <option value="+234">🇳🇬 +234</option>
                      <option value="+254">🇰🇪 +254</option>
                      <option value="+27">🇿🇦 +27</option>
                    </select>
                    <span
                      className={`self-stretch w-px my-2 ${
                        theme === "dark" ? "bg-gray-600" : "bg-gray-200"
                      }`}
                    />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="Mobile number"
                      required
                      className={`flex-1 border border-gray-50 px-4 py-2.5 text-sm focus:outline-none bg-transparent ${
                        theme === "dark"
                          ? "text-gray-100 placeholder-gray-400"
                          : "text-gray-900 placeholder-gray-400"
                      }`}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className={labelClass}>Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Choose a password"
                      required
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    required
                    className="mt-1 w-4 h-4 text-amber-400 border-gray-300 rounded focus:ring-amber-400"
                  />
                  <label
                    htmlFor="terms"
                    className={`text-xs leading-relaxed ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    By registering, you agree to our{" "}
                    <a
                      href="https://printdecore.com/en-gh/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-500 hover:underline"
                    >
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a
                      href="https://printdecore.com/en-gh/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-500 hover:underline"
                    >
                      Privacy Policy
                    </a>
                    .
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3 px-4 rounded-md font-semibold text-sm transition-all ${
                    isSubmitting
                      ? "bg-amber-300 cursor-not-allowed"
                      : "bg-amber-400 hover:bg-amber-500 active:bg-amber-600"
                  } text-gray-900`}
                >
                  {registerLoading ? "Sending code..." : "Continue"}
                </button>
              </form>
            )}

            {/* ===== REGISTER FORM — Step 2: OTP Verification ===== */}
            {mode === "register" && registerStep === "otp" && (
              <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                <div
                  className={`text-sm p-3 rounded-md ${
                    theme === "dark"
                      ? "bg-gray-700 text-gray-300"
                      : "bg-amber-50 text-gray-600"
                  }`}
                >
                  We sent a 6-digit code to{" "}
                  <span className="font-semibold">{email}</span>. Enter it below
                  to verify your email.
                </div>

                <div>
                  <label className={labelClass}>Verification Code</label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="000000"
                    required
                    maxLength={6}
                    className={`${inputClass} text-center text-2xl tracking-widest font-mono`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || otpCode.length !== 6}
                  className={`w-full py-3 px-4 rounded-md font-semibold text-sm transition-all ${
                    isSubmitting || otpCode.length !== 6
                      ? "bg-amber-300 cursor-not-allowed"
                      : "bg-amber-400 hover:bg-amber-500 active:bg-amber-600"
                  } text-gray-900`}
                >
                  {registerLoading ? "Verifying..." : "Verify & Create Account"}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={handleBackToForm}
                    className={`${
                      theme === "dark"
                        ? "text-gray-400 hover:text-gray-200"
                        : "text-gray-500 hover:text-gray-700"
                    } transition-colors`}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0}
                    className={`font-medium transition-colors ${
                      resendCooldown > 0
                        ? theme === "dark"
                          ? "text-gray-500 cursor-not-allowed"
                          : "text-gray-400 cursor-not-allowed"
                        : "text-amber-500 hover:text-amber-600"
                    }`}
                  >
                    {resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend code"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Bottom switch link */}
          <p
            className={`text-center text-sm mt-6 ${
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setRegisterStep("form");
                  }}
                  className="text-amber-500 font-semibold hover:underline"
                >
                  Register here
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setRegisterStep("form");
                    setOtpCode("");
                  }}
                  className="text-amber-500 font-semibold hover:underline"
                >
                  Log in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
