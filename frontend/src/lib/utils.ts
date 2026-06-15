import { type ClassValue, clsx } from "clsx";
import { format, isValid, parseISO } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getInitials = (str: string): string => {
  if (typeof str !== "string" || !str.trim()) return "?";

  return (
    str
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "?"
  );
};

export function formatCurrency(
  amount: number,
  opts?: {
    currency?: string;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    noDecimals?: boolean;
  },
) {
  const { currency = "USD", locale = "en-US", minimumFractionDigits, maximumFractionDigits, noDecimals } = opts ?? {};

  const formatOptions: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
    minimumFractionDigits: noDecimals ? 0 : minimumFractionDigits,
    maximumFractionDigits: noDecimals ? 0 : maximumFractionDigits,
  };

  return new Intl.NumberFormat(locale, formatOptions).format(amount);
}

export function formatDate(date: string) {
  return new Date(date).toLocaleString();
}

/** Format ISO or parseable date strings; return pre-formatted strings as-is. */
export function formatDisplayTimestamp(
  value?: string,
  pattern = 'MMM d, yyyy · h:mm a'
): string {
  if (!value) return 'Recently'

  const isoParsed = parseISO(value)
  if (isValid(isoParsed)) return format(isoParsed, pattern)

  const fallback = new Date(value)
  if (isValid(fallback)) return format(fallback, pattern)

  return value
}

export function formatCost(usd: number) {
  return `$${usd.toFixed(4)}`;
}
