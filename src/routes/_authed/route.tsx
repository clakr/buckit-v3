import { supabase } from "@/integrations/supabase";
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed")({
	component: RouteComponent,
	beforeLoad: async ({ location }) => {
		const session = await supabase.auth.getSession();
		const isAuthenticated = session.data.session;

		if (!isAuthenticated) {
			throw redirect({
				to: "/",
				search: {
					redirectTo: location.href,
				},
			});
		}
	},
});

function RouteComponent() {
	return <div>Hello "/_authed/"!</div>;
}
