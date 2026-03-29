import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format large numbers: 999 → "999", 1000 → "1k", 12500 → "12.5k", 1000000 → "1M" */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const k = n / 1000;
    return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`;
  }
  const m = n / 1_000_000;
  return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
}

/**
 * Format currency values consistently across the app.
 * - Small values: GH₵ 1,234.56 (full precision)
 * - Large values: GH₵ 12.5k, GH₵ 1.2M (abbreviated)
 * @param amount - numeric amount
 * @param opts.compact - use abbreviated format for large values (default: false)
 * @param opts.symbol - currency symbol (default: "GH₵")
 */
export function formatCurrency(
  amount: number,
  opts?: { compact?: boolean; symbol?: string },
): string {
  const symbol = opts?.symbol ?? "GH₵";

  if (opts?.compact) {
    if (amount >= 1_000_000) {
      const m = amount / 1_000_000;
      return `${symbol} ${m % 1 === 0 ? m : m.toFixed(1)}M`;
    }
    if (amount >= 10_000) {
      const k = amount / 1000;
      return `${symbol} ${k % 1 === 0 ? k : k.toFixed(1)}k`;
    }
  }

  return `${symbol} ${amount.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
