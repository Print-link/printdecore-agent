import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "../../../contexts/ThemeContext";
import { Eye, EyeOff, AlertCircle } from "../../../components/icons";
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
  error: string | null;
  onSubmit: (e: FormEvent) => void;
  inputClass: string;
  labelClass: string;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "manager", label: "Manager" },
  { value: "clerk", label: "Clerk" },
];

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
  error,
  onSubmit,
  inputClass,
  labelClass,
}: LoginFormProps) {
  const { theme } = useTheme();
  const [capsLockOn, setCapsLockOn] = useState(false);

  const handlePasswordKey = (e: KeyboardEvent<HTMLInputElement>) => {
    setCapsLockOn(e.getModifierState("CapsLock"));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <span id="login-role-label" className={labelClass}>
          I am a
        </span>
        <div
          role="radiogroup"
          aria-labelledby="login-role-label"
          className={`grid grid-cols-2 gap-1 p-1 rounded-md ${
            theme === "dark" ? "bg-gray-700" : "bg-gray-100"
          }`}
        >
          {ROLE_OPTIONS.map((option) => {
            const selected = userRole === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setUserRole(option.value)}
                className={`py-2 rounded text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                  selected
                    ? theme === "dark"
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-white text-gray-900 shadow-sm"
                    : theme === "dark"
                      ? "text-gray-400 hover:text-gray-200"
                      : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="login-email" className={labelClass}>
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          aria-invalid={!!error}
          className={inputClass}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="login-password" className={`${labelClass} mb-0`}>
            Password
          </label>
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
        <div className="relative">
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handlePasswordKey}
            onKeyUp={handlePasswordKey}
            onBlur={() => setCapsLockOn(false)}
            placeholder="Enter your password"
            required
            aria-invalid={!!error}
            className={`${inputClass} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className={`absolute right-3 top-1/2 -translate-y-1/2 ${
              theme === "dark" ? "text-gray-400" : "text-gray-500"
            }`}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {capsLockOn && (
          <p className="mt-1.5 text-xs text-amber-600">Caps Lock is on</p>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className={`flex items-start gap-2 rounded-md px-3 py-2.5 text-sm ${
            theme === "dark"
              ? "bg-red-900/30 text-red-300 border border-red-800"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md font-semibold text-sm transition-all ${
          isSubmitting
            ? "bg-amber-300 cursor-not-allowed"
            : "bg-amber-400 hover:bg-amber-500 active:bg-amber-600"
        } text-gray-900`}
      >
        {isLoading && (
          <span className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
        )}
        {isLoading ? "Logging in..." : "Log In"}
      </button>
    </form>
  );
}
