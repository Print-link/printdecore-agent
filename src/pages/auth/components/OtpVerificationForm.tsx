import type { FormEvent } from "react";
import { useTheme } from "../../../contexts/ThemeContext";

interface OtpVerificationFormProps {
  email: string;
  otpCode: string;
  setOtpCode: (v: string) => void;
  isSubmitting: boolean;
  registerLoading: boolean;
  resendCooldown: number;
  onSubmit: (e: FormEvent) => void;
  onResend: () => void;
  onBack: () => void;
  inputClass: string;
  labelClass: string;
}

export default function OtpVerificationForm({
  email,
  otpCode,
  setOtpCode,
  isSubmitting,
  registerLoading,
  resendCooldown,
  onSubmit,
  onResend,
  onBack,
  inputClass,
  labelClass,
}: OtpVerificationFormProps) {
  const { theme } = useTheme();

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div
        className={`text-sm p-3 rounded-md ${
          theme === "dark"
            ? "bg-gray-700 text-gray-300"
            : "bg-amber-50 text-gray-600"
        }`}
      >
        We sent a 6-digit code to{" "}
        <span className="font-semibold">{email}</span>. Enter it below to
        verify your email.
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
          onClick={onBack}
          className={`${
            theme === "dark"
              ? "text-gray-400 hover:text-gray-200"
              : "text-gray-500 hover:text-gray-700"
          } transition-colors`}
        >
          &larr; Back
        </button>
        <button
          type="button"
          onClick={onResend}
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
  );
}
