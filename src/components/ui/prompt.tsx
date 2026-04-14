import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "../../lib/utils";
import { useThemeClasses } from "../../lib/theme";
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "../icons";
import { Button } from ".";
import type { IconProps } from "../icons";

export type PopupVariant = "info" | "success" | "error" | "warning";

export interface AnimatedPopupProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  description: string;
  /** Single-button label (alert mode). Ignored when onConfirm is provided. */
  buttonLabel?: string;
  /** If provided, switches to confirm mode with two buttons. */
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Visual variant — controls the icon displayed above the title. */
  variant?: PopupVariant;
  /** When true, clicking the backdrop will NOT dismiss the popup. */
  persistent?: boolean;
}

const VARIANT_CONFIG: Record<
  PopupVariant,
  {
    icon: (props: IconProps) => ReactNode;
    color: string;
    bg: string;
    darkBg: string;
  }
> = {
  info: {
    icon: Info,
    color: "text-blue-500",
    bg: "bg-blue-50",
    darkBg: "bg-blue-500/10",
  },
  success: {
    icon: CheckCircle,
    color: "text-green-500",
    bg: "bg-green-50",
    darkBg: "bg-green-500/10",
  },
  error: {
    icon: AlertCircle,
    color: "text-red-500",
    bg: "bg-red-50",
    darkBg: "bg-red-500/10",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-50",
    darkBg: "bg-amber-500/10",
  },
};

export function AnimatedPopup({
  visible,
  onDismiss,
  title,
  description,
  buttonLabel = "OK",
  onConfirm,
  confirmLabel = "Yes",
  cancelLabel = "Cancel",
  variant,
  persistent = false,
}: AnimatedPopupProps) {
  const t = useThemeClasses();
  const [show, setShow] = useState(false);
  const [animating, setAnimating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (visible) {
      setShow(true);
      requestAnimationFrame(() => setAnimating(true));
    }
  }, [visible]);

  const animateOut = useCallback(
    (cb?: () => void) => {
      setAnimating(false);
      timeoutRef.current = setTimeout(() => {
        setShow(false);
        onDismiss();
        cb?.();
      }, 150);
    },
    [onDismiss],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!show) return null;

  const isConfirmMode = !!onConfirm;
  const variantConfig = variant ? VARIANT_CONFIG[variant] : null;
  const Icon = variantConfig?.icon;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-8 transition-colors duration-150",
        animating ? "bg-black/50" : "bg-black/0",
      )}
      onClick={() => {
        if (!persistent) animateOut();
      }}
    >
      <div
        className={cn(
          "w-full max-w-sm rounded-xl p-7 shadow-xl transition-all duration-150 ease-out",
          animating ? "scale-100 opacity-100" : "scale-95 opacity-0",
          t.surface,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {Icon && (
          <div
            className={cn(
              "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full",
              t.isDark ? variantConfig.darkBg : variantConfig.bg,
            )}
          >
            <Icon size={32} className={variantConfig.color} />
          </div>
        )}

        <h3 className={cn("mb-3 text-center text-lg font-semibold", t.text)}>
          {title}
        </h3>
        <p
          className={cn(
            "mb-6 text-center text-sm leading-relaxed",
            t.textSecondary,
          )}
        >
          {description}
        </p>

        {isConfirmMode ? (
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => animateOut()}
            >
              {cancelLabel}
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => animateOut(onConfirm)}
            >
              {confirmLabel}
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            className="w-full"
            onClick={() => animateOut()}
          >
            {buttonLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
