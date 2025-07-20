import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed")({
	component: RouteComponent,
	beforeLoad: async ({ location }) => {
		const session = await supabase.auth.getSession();
		const isAuthenticated = session.data.session;

		if (!isAuthenticated)
			throw redirect({
				to: "/",
				replace: true,
				search: {
					redirectTo: location.href,
				},
			});
	},
});

function RouteComponent() {
	const navigate = Route.useNavigate();

	async function handleLogout() {
		await supabase.auth.signOut();

		navigate({
			to: "/",
			replace: true,
		});
	}

	return (
		<>
			<Outlet />
			<Button onClick={handleLogout}>logout</Button>
		</>
	);
}
