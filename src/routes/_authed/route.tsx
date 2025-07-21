import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	Sidebar as UISidebar,
	SidebarContent as UISidebarContent,
	SidebarFooter as UISidebarFooter,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase";
import { getErrorMessage } from "@/integrations/supabase/utils";
import { Icon } from "@iconify/react/dist/iconify.js";
import {
	Link,
	Outlet,
	createFileRoute,
	redirect,
} from "@tanstack/react-router";
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
	return (
		<SidebarProvider>
			<Sidebar />
			<SidebarInset>
				<Outlet />
			</SidebarInset>
		</SidebarProvider>
	);
}

function Sidebar({ ...props }: React.ComponentProps<typeof UISidebar>) {
	return (
		<UISidebar variant="inset" {...props}>
			<SidebarContent />
			<SidebarFooter />
		</UISidebar>
	);
}

function SidebarContent() {
	const links = [
		{
			label: "Dashboard",
			href: "/dashboard",
			icon: "bx:grid-alt",
		},
		{
			label: "Buckets",
			href: "/buckets",
			icon: "tabler:bucket",
		},
		{
			label: "Goals",
			href: "/goals",
			icon: "lucide:goal",
			isDisabled: true,
		},
		{
			label: "Distributions",
			href: "/distributions",
			icon: "fluent-mdl2:distribute-down",
			isDisabled: true,
		},
		{
			label: "Expenses",
			href: "/expenses",
			icon: "bx:receipt",
			isDisabled: true,
		},
	];

	return (
		<UISidebarContent>
			<SidebarGroup>
				<SidebarGroupContent>
					<SidebarMenu>
						{links.map((link) => (
							<SidebarMenuItem key={link.href}>
								<SidebarMenuButton asChild>
									<Link
										to={link.href}
										activeProps={{
											"data-active": true,
										}}
										disabled={link.isDisabled}
									>
										<Icon icon={link.icon} />
										{link.label}
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						))}
					</SidebarMenu>
				</SidebarGroupContent>
			</SidebarGroup>
		</UISidebarContent>
	);
}

function SidebarFooter({
	...props
}: React.ComponentProps<typeof UISidebarFooter>) {
	const navigate = Route.useNavigate();

	async function handleLogout() {
		const { error } = await supabase.auth.signOut();

		if (error) {
			toast.error(getErrorMessage(error.code));
			return;
		}

		navigate({
			to: "/",
			replace: true,
		});
	}

	return (
		<UISidebarFooter {...props}>
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton onClick={handleLogout}>
						<Icon icon="bx:log-out" />
						Logout
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		</UISidebarFooter>
	);
}
