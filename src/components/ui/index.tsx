/**
 * Shared UI primitives — theme-aware, composable, minimal.
 * Import: import { Card, Button, Input, ... } from '@/components/ui';
 */
import {
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type JSX,
  forwardRef,
} from "react";
import { cn } from "../../lib/utils";
import { useThemeClasses } from "../../lib/theme";
import { Spinner, type IconProps } from "../icons";

// ─── Card ────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode;
  className?: string;
  raised?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const CARD_PADDING = { none: "", sm: "p-3", md: "p-5", lg: "p-6" } as const;

export function Card({
  children,
  className,
  raised,
  padding = "md",
}: CardProps) {
  const t = useThemeClasses();
  return (
    <div
      className={cn(
        "rounded-xl",
        raised ? t.surfaceRaised : t.surface,
        CARD_PADDING[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}

// ─── PageHeader ──────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const t = useThemeClasses();
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className={cn("text-2xl font-bold", t.text)}>{title}</h2>
        {description && (
          <p className={cn("text-sm mt-1", t.textSecondary)}>{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

// ─── Button ──────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: (props: IconProps) => JSX.Element;
}

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed";

const BTN_SIZE = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
} as const;

export function Button({
  variant = "primary",
  size = "md",
  loading,
  icon: Icon,
  children,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  const t = useThemeClasses();

  const variantClass = {
    primary: "bg-amber-400 hover:bg-amber-500 text-gray-900",
    secondary: t.isDark
      ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
      : "bg-gray-100 hover:bg-gray-200 text-gray-700",
    ghost: t.isDark
      ? "hover:bg-gray-700 text-gray-400"
      : "hover:bg-gray-100 text-gray-600",
    danger: "bg-red-500 hover:bg-red-600 text-white",
  }[variant];

  return (
    <button
      className={cn(BTN_BASE, BTN_SIZE[size], variantClass, className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <Spinner
          size="xs"
          className={variant === "primary" ? "text-gray-900" : "text-current"}
        />
      ) : (
        Icon && <Icon size={size === "sm" ? 14 : 16} />
      )}
      {children}
    </button>
  );
}

// ─── IconButton ──────────────────────────────────────────────────────

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: (props: IconProps) => JSX.Element;
  size?: number;
  label?: string;
}

export function IconButton({
  icon: Icon,
  size = 20,
  label,
  className,
  ...rest
}: IconButtonProps) {
  const t = useThemeClasses();
  return (
    <button
      className={cn(
        "p-2 rounded-lg transition-colors",
        t.isDark
          ? "hover:bg-gray-700 text-gray-400"
          : "hover:bg-gray-100 text-gray-600",
        className,
      )}
      title={label}
      aria-label={label}
      {...rest}
    >
      <Icon size={size} />
    </button>
  );
}

// ─── Input ───────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...rest }, ref) => {
    const t = useThemeClasses();
    return (
      <div>
        {label && (
          <label
            className={cn("block text-sm font-medium mb-1", t.textSecondary)}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-400",
            t.input,
            error && "border-red-400",
            className,
          )}
          {...rest}
        />
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";

// ─── Select ──────────────────────────────────────────────────────────

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export function Select({
  label,
  options,
  placeholder,
  className,
  children,
  ...rest
}: SelectProps) {
  const t = useThemeClasses();
  return (
    <div>
      {label && (
        <label
          className={cn("block text-sm font-medium mb-1", t.textSecondary)}
        >
          {label}
        </label>
      )}
      <select
        className={cn(
          "w-full px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-amber-400",
          t.input,
          className,
        )}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options
          ? options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          : children}
      </select>
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────

type BadgeColor = "amber" | "green" | "red" | "blue" | "purple" | "gray";

interface BadgeProps {
  children: ReactNode;
  color?: BadgeColor;
  className?: string;
}

const BADGE_COLORS: Record<BadgeColor, string> = {
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  purple:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  gray: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

export function Badge({ children, color = "gray", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        BADGE_COLORS[color],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ─── StatusBadge (order status) ──────────────────────────────────────

const STATUS_COLORS: Record<string, BadgeColor> = {
  PENDING: "amber",
  QUOTED: "blue",
  PAID: "purple",
  RECEIVED: "blue",
  IN_PROGRESS: "blue",
  COMPLETED: "green",
  active: "green",
  inactive: "red",
  temporarily_closed: "amber",
  pending: "amber",
  accepted: "green",
  expired: "gray",
  revoked: "red",
};

export function StatusBadge({
  status,
  className,
}: {
  status?: string | null;
  className?: string;
}) {
  if (!status) return null;
  const color = STATUS_COLORS[status] || "gray";
  const label = status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <Badge color={color} className={className}>
      {label}
    </Badge>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

const MODAL_WIDTH = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
} as const;

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "md",
}: ModalProps) {
  const t = useThemeClasses();
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          "rounded-xl shadow-xl w-full",
          MODAL_WIDTH[maxWidth],
          t.surface,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div
            className={cn(
              "flex items-center justify-between px-6 py-4 border-b",
              t.border,
            )}
          >
            <h3 className={cn("text-lg font-bold", t.text)}>{title}</h3>
            <button
              onClick={onClose}
              className={cn(
                "p-1 rounded-md",
                t.isDark ? "hover:bg-gray-700" : "hover:bg-gray-100",
              )}
            >
              <span className="sr-only">Close</span>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── EmptyState ──────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: (props: IconProps) => JSX.Element;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const t = useThemeClasses();
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className,
      )}
    >
      {Icon && <Icon size={40} className={cn("mb-3", t.textTertiary)} />}
      <p className={cn("text-base font-medium", t.textSecondary)}>{title}</p>
      {description && (
        <p className={cn("text-sm mt-1 max-w-sm", t.textTertiary)}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────

export function Section({
  title,
  children,
  actions,
  className,
}: {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const t = useThemeClasses();
  return (
    <div className={className}>
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className={cn("text-lg font-semibold", t.text)}>{title}</h3>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const AVATAR_SIZE = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
} as const;

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const t = useThemeClasses();
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn(
          "rounded-full object-cover",
          AVATAR_SIZE[size],
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold",
        AVATAR_SIZE[size],
        t.isDark ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-600",
        className,
      )}
    >
      {initials}
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────

interface Tab {
  key: string;
  label: string;
  icon?: (props: IconProps) => JSX.Element;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  const t = useThemeClasses();
  return (
    <div className={cn("flex gap-1 border-b", t.border)}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
            active === tab.key
              ? "border-amber-400 text-amber-500"
              : cn("border-transparent", t.textSecondary, "hover:text-inherit"),
          )}
        >
          {tab.icon && <tab.icon size={16} />}
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-xs",
                active === tab.key
                  ? "bg-amber-400/20 text-amber-500"
                  : t.isDark
                    ? "bg-gray-700"
                    : "bg-gray-100",
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── DataTable row helper ────────────────────────────────────────────

// ─── Skeleton ───────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
  circle?: boolean;
  width?: string;
  height?: string;
}

export function Skeleton({ className, circle, width, height }: SkeletonProps) {
  const t = useThemeClasses();
  return (
    <div
      className={cn(
        "animate-pulse",
        t.isDark ? "bg-gray-700" : "bg-gray-200",
        circle ? "rounded-full" : "rounded-md",
        width,
        height,
        className,
      )}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  const widths = ["w-full", "w-5/6", "w-4/6", "w-3/4", "w-2/3"];
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3", widths[i % widths.length])} />
      ))}
    </div>
  );
}

// ─── DataTable row helper ────────────────────────────────────────

export function TableRow({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const t = useThemeClasses();
  return (
    <div
      className={cn(
        "flex items-center gap-4 px-5 py-4 border-b last:border-b-0 transition-colors",
        t.borderSubtle,
        onClick &&
          (t.isDark
            ? "cursor-pointer hover:bg-gray-700/50"
            : "cursor-pointer hover:bg-gray-50"),
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
