import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatCurrency(
	value: number | null,
	opts?: Intl.NumberFormatOptions,
) {
	if (value === null) return "N/A";

	const formatter = Intl.NumberFormat(navigator.language, {
		style: "currency",
		currency: "PHP",
		maximumFractionDigits: 2,
		...opts,
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
		...opts,
	});

	return formatter.format(new Date(value));
}

export function formatTime(
	value: string | null,
	opts?: Intl.DateTimeFormatOptions,
) {
	if (value === null) return "N/A";

	const formatter = new Intl.DateTimeFormat(navigator.language, {
		hour: "numeric",
		minute: "numeric",
		second: "numeric",
		...opts,
	});

	return formatter.format(new Date(value));
}

export function formatDateTime(
	value: string | null,
	opts?: Intl.DateTimeFormatOptions,
) {
	if (value === null) return "N/A";

	const formatter = new Intl.DateTimeFormat(navigator.language, {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
		second: "numeric",
		...opts,
	});

	return formatter.format(new Date(value));
}

export function formatPercentage(
	value: number,
	opts?: Intl.NumberFormatOptions,
) {
	const formatter = new Intl.NumberFormat(navigator.language, {
		style: "percent",
		maximumSignificantDigits: 4,
		...opts,
	});

	return formatter.format(value);
}

export function slugify(str: string) {
	return str
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, "")
		.replace(/[\s_-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function formatDateISO(value: string | null) {
	if (value === null) return null;

	const date = new Date(value);

	const year = date.getFullYear();
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");

	return `${year}-${month}-${day}`;
}

export function getInitialsAvatar(seed: string) {
	return `https://api.dicebear.com/9.x/notionists/svg?seed=${seed}`;
}

export const indexMonthMapping: Record<number, string> = {
	0: "January",
	1: "February",
	2: "March",
	3: "April",
	4: "May",
	5: "June",
	6: "July",
	7: "August",
	8: "September",
	9: "October",
	10: "November",
	11: "December",
};
