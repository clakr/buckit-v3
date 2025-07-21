import { useAppForm } from "@/hooks/form";
import { supabase } from "@/integrations/supabase";
import { getErrorMessage } from "@/integrations/supabase/utils";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { toast } from "sonner";

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

	const form = useAppForm({
		onSubmit: async () => {
			const { error } = await supabase.auth.signOut();

			if (error) {
				toast.error(getErrorMessage(error.code));
				return;
			}

			navigate({
				to: "/",
				replace: true,
			});
		},
	});

	return (
		<>
			<Outlet />
			<form
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					form.handleSubmit();
				}}
			>
				<form.AppForm>
					<form.Button>Logout</form.Button>
				</form.AppForm>
			</form>
		</>
	);
}
