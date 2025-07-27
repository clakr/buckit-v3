import type { FileRoutesByFullPath } from "@/routeTree.gen";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const segmentLabelMapping: Record<string, string> = {
	dashboard: "Dashboard",
	buckets: "Buckets",
	create: "Create",
	edit: "Edit",
};

export function getSegmentLabel(segment: string) {
	if (segment in segmentLabelMapping) return segmentLabelMapping[segment];

	return segment;
}

export function formatCurrency(value: number | null) {
	if (value === null) return "N/A";

	const formatter = Intl.NumberFormat(navigator.language, {
		style: "currency",
		currency: "PHP",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

	return formatter.format(value);
}

export function formatDate(
	value: string | null,
	opts?: Intl.DateTimeFormatOptions,
) {
	if (value === null) return "N/A";

	const formatter = new Intl.DateTimeFormat(navigator.language, {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		...opts,
	});

	return formatter.format(new Date(value));
}
