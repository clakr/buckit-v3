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

export const routesHeadingMapping = {
	"/dashboard": "Dashboard",
	"/buckets": "Buckets",
	"/buckets/create": "Create Bucket",
} as const satisfies Record<
	Exclude<
		keyof FileRoutesByFullPath,
		| "/"
		| "/register"
		| "/demo/form/simple"
		| "/demo/form/address"
		| "/demo/table"
		| "/demo/tanstack-query"
	>,
	string
>;

function isValidRoute(
	route: string,
): route is keyof typeof routesHeadingMapping {
	return route in routesHeadingMapping;
}

export function getRoutesHeading(route: string) {
	if (isValidRoute(route)) return routesHeadingMapping[route];

	return route;
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

export function formatDate(value: string | null) {
	if (value === null) return "N/A";

	const formatter = new Intl.DateTimeFormat(navigator.language, {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	return formatter.format(new Date(value));
}
