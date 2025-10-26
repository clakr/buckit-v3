import { AlertDialog } from "@/components/alert-dialog.tsx";
import { Toaster } from "@/components/ui/sonner.tsx";
import type { QueryClient } from "@tanstack/react-query";
import {
	HeadContent,
	Outlet,
	createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import TanStackQueryLayout from "../integrations/tanstack-query/layout.tsx";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				title: "Buckit - Personal Finance Management",
			},
			{
				name: "description",
				content:
					"Manage your finances with Buckit - create buckets, set financial goals, and split money efficiently across your savings targets.",
			},
			{
				name: "keywords",
				content:
					"finance, budget, savings, goals, money management, personal finance, budgeting app, financial planning, buckets, splits",
			},
			{
				name: "author",
				content: "Clark Tolosa",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1.0",
			},
			{
				name: "theme-color",
				content: "#000000",
			},
			{
				name: "robots",
				content: "index, follow",
			},
			{
				name: "language",
				content: "en",
			},
			{
				httpEquiv: "content-language",
				content: "en",
			},
			{
				name: "format-detection",
				content: "telephone=no",
			},
			{
				name: "apple-mobile-web-app-capable",
				content: "yes",
			},
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "black",
			},
			{
				property: "og:title",
				content: "Buckit - Personal Finance Management",
			},
			{
				property: "og:description",
				content:
					"Manage your finances with Buckit - create buckets, set financial goals, and split money efficiently across your savings targets.",
			},
			{
				property: "og:type",
				content: "website",
			},
			{
				name: "twitter:card",
				content: "summary_large_image",
			},
			{
				name: "twitter:title",
				content: "Buckit - Personal Finance Management",
			},
			{
				name: "twitter:description",
				content:
					"Manage your finances with Buckit - create buckets, set financial goals, and split money efficiently across your savings targets.",
			},
		],
	}),
	component: () => (
		<>
			<HeadContent />
			<Outlet />

			<TanStackRouterDevtools position="top-right" />
			<TanStackQueryLayout />

			<Toaster position="top-center" />
			<AlertDialog />
		</>
	),
});
