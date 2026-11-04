import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import type { UserRole } from "../../types";
import { authApi } from "../../services/api/auth";
import logo from "../../assets/images/LogoArt.png";
import AuthLeftPanel from "./components/AuthLeftPanel";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import OtpVerificationForm from "./components/OtpVerificationForm";

type AuthMode = "login" | "register";
type RegisterStep = "form" | "otp";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error: loginError, clearError } = useAuthStore();
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

  // Don't show an error left over from a previous visit
  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleEmailChange = (v: string) => {
    setEmail(v);
    if (loginError) clearError();
  };

  const handlePasswordChange = (v: string) => {
    setPassword(v);
    if (loginError) clearError();
  };

  const handleRoleChange = (v: UserRole) => {
    setUserRole(v);
    if (loginError) clearError();
  };

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
      const trimmedEmail = email.trim();
      setEmail(trimmedEmail);
      await login({ email: trimmedEmail, password, role: userRole });

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
    } catch {
      // The store sets `error`, which LoginForm shows inline
    }
  };

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
      <AuthLeftPanel isRegister={mode === "register"} />

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

            {mode === "login" && (
              <LoginForm
                email={email}
                setEmail={handleEmailChange}
                password={password}
                setPassword={handlePasswordChange}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                userRole={userRole}
                setUserRole={handleRoleChange}
                isSubmitting={isSubmitting}
                isLoading={isLoading}
                error={loginError}
                onSubmit={handleLogin}
                inputClass={inputClass}
                labelClass={labelClass}
              />
            )}

            {mode === "register" && registerStep === "form" && (
              <RegisterForm
                firstName={firstName}
                setFirstName={setFirstName}
                lastName={lastName}
                setLastName={setLastName}
                email={email}
                setEmail={setEmail}
                phoneCode={phoneCode}
                setPhoneCode={setPhoneCode}
                phoneNumber={phoneNumber}
                setPhoneNumber={setPhoneNumber}
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                agreedToTerms={agreedToTerms}
                setAgreedToTerms={setAgreedToTerms}
                isSubmitting={isSubmitting}
                registerLoading={registerLoading}
                onSubmit={handleSendOtp}
                inputClass={inputClass}
                labelClass={labelClass}
              />
            )}

            {mode === "register" && registerStep === "otp" && (
              <OtpVerificationForm
                email={email}
                otpCode={otpCode}
                setOtpCode={setOtpCode}
                isSubmitting={isSubmitting}
                registerLoading={registerLoading}
                resendCooldown={resendCooldown}
                onSubmit={handleVerifyAndRegister}
                onResend={handleResendOtp}
                onBack={handleBackToForm}
                inputClass={inputClass}
                labelClass={labelClass}
              />
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
                    clearError();
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
