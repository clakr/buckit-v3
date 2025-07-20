import { supabase } from "@/integrations/supabase";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_guest")({
	component: RouteComponent,
	beforeLoad: async () => {
		const session = await supabase.auth.getSession();
		const isAuthenticated = session.data.session;

		if (isAuthenticated)
			throw redirect({
				to: "/dashboard",
				replace: true,
			});
	},
});

function RouteComponent() {
	return <Outlet />;
}
