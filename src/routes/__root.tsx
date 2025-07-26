import { AlertDialog } from "@/components/alert-dialog.tsx";
import { Toaster } from "@/components/ui/sonner.tsx";
import type { QueryClient } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import TanStackQueryLayout from "../integrations/tanstack-query/layout.tsx";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	component: () => (
		<>
			<Outlet />

			<TanStackRouterDevtools position="top-right" />
			<TanStackQueryLayout />

			<Toaster position="top-center" />
			<AlertDialog />
		</>
	),
});
