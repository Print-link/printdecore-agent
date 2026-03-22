import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../../contexts/ThemeContext";
import { Eye, EyeOff } from "../../../components/icons";
import type { UserRole } from "../../../types";

interface LoginFormProps {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  userRole: UserRole;
  setUserRole: (v: UserRole) => void;
  isSubmitting: boolean;
  isLoading: boolean;
  onSubmit: (e: FormEvent) => void;
  inputClass: string;
  labelClass: string;
}

export default function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  userRole,
  setUserRole,
  isSubmitting,
  isLoading,
  onSubmit,
  inputClass,
  labelClass,
}: LoginFormProps) {
  const { theme } = useTheme();

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
  );
}
