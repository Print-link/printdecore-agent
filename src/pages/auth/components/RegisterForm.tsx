import type { FormEvent } from "react";
import { useTheme } from "../../../contexts/ThemeContext";
import { Eye, EyeOff } from "../../../components/icons";
import PhoneInput from "./PhoneInput";

interface RegisterFormProps {
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phoneCode: string;
  setPhoneCode: (v: string) => void;
  phoneNumber: string;
  setPhoneNumber: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  agreedToTerms: boolean;
  setAgreedToTerms: (v: boolean) => void;
  isSubmitting: boolean;
  registerLoading: boolean;
  onSubmit: (e: FormEvent) => void;
  inputClass: string;
  labelClass: string;
}

export default function RegisterForm({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  email,
  setEmail,
  phoneCode,
  setPhoneCode,
  phoneNumber,
  setPhoneNumber,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  agreedToTerms,
  setAgreedToTerms,
  isSubmitting,
  registerLoading,
  onSubmit,
  inputClass,
  labelClass,
}: RegisterFormProps) {
  const { theme } = useTheme();

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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

      <div>
        <label className={labelClass}>Phone Number</label>
        <PhoneInput
          phoneCode={phoneCode}
          onPhoneCodeChange={setPhoneCode}
          phoneNumber={phoneNumber}
          onPhoneNumberChange={setPhoneNumber}
        />
      </div>

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
  );
}
