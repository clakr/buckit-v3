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
	"/buckets/$id": "View Bucket",
	"/buckets/$id/edit": "Edit Bucket",
	"/buckets/$id/create-transaction": "Create Transaction",
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

function matchRoute(
	actualRoute: string,
): keyof typeof routesHeadingMapping | null {
	// First check for exact matches (routes without dynamic segments)
	if (actualRoute in routesHeadingMapping)
		return actualRoute as keyof typeof routesHeadingMapping;

	// Then check for pattern matches (routes with dynamic segments)
	for (const [pattern, _] of Object.entries(routesHeadingMapping)) {
		// Convert route pattern to regex
		// Replace $id with a pattern that matches UUIDs or any non-slash characters
		const regexPattern = pattern.replace(
			/\$id/g,
			"[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|[^/]+",
		);

		// Create regex with exact match (^ and $)
		const regex = new RegExp(`^${regexPattern}$`);

		if (regex.test(actualRoute)) {
			return pattern as keyof typeof routesHeadingMapping;
		}
	}

	return null;
}

export function getRoutesHeading(route: string) {
	const matchedRoute = matchRoute(route);

	if (matchedRoute) return routesHeadingMapping[matchedRoute];
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
