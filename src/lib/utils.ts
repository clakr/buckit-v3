import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
