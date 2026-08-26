import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { Currency } from "#/lib/types";

import { currencies } from "#/lib/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, opts?: Intl.NumberFormatOptions) {
  return Intl.NumberFormat(undefined, {
    style: "currency",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...opts,
  }).format(value);
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const relativeUnits = [
  { unit: "year" as const, ms: 31_536_000_000 },
  { unit: "month" as const, ms: 2_592_000_000 },
  { unit: "week" as const, ms: 604_800_000 },
  { unit: "day" as const, ms: 86_400_000 },
  { unit: "hour" as const, ms: 3_600_000 },
  { unit: "minute" as const, ms: 60_000 },
  { unit: "second" as const, ms: 1_000 },
];

export function formatToRelative(
  date: Date,
  options?: { locale?: string; style?: "long" | "short" | "narrow" },
) {
  const diffMs = date.getTime() - Date.now();
  const absDiffMs = Math.abs(diffMs);

  const rtf = new Intl.RelativeTimeFormat(options?.locale, {
    style: options?.style ?? "long",
    numeric: "auto",
  });

  for (const { unit, ms } of relativeUnits) {
    if (absDiffMs >= ms) {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }

  return rtf.format(0, "second");
}

export function isCurrencyCode(code: string): code is Currency["code"] {
  return currencies.some((currency) => currency.code === code);
}

export function getCurrency(code: Currency["code"]) {
  return currencies.find((currency) => currency.code === code);
}

export function formatDateTime(value: Date, opts?: Intl.DateTimeFormat) {
  return Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...opts,
  }).format(value);
}

export function formatDate(value: Date, opts?: Intl.DateTimeFormat) {
  return Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "2-digit",
    year: "numeric",
    ...opts,
  }).format(value);
}
