import {
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
	Breadcrumb as UIBreadcrumb,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
	Sidebar as UISidebar,
	SidebarContent as UISidebarContent,
	SidebarFooter as UISidebarFooter,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase";
import { getErrorMessage } from "@/integrations/supabase/utils";
import { getSegmentLabel } from "@/lib/utils";
import { Icon } from "@iconify/react";
import {
	Link,
	Outlet,
	createFileRoute,
	redirect,
	useLocation,
} from "@tanstack/react-router";
import { Fragment } from "react/jsx-runtime";
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
				<Header />
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

function Header() {
	return (
		<header className="px-6 py-4 border-b flex items-center gap-x-4">
			<SidebarTrigger />
			<Separator orientation="vertical" />
			<Breadcrumbs />
		</header>
	);
}

function Breadcrumbs() {
	const location = useLocation();

	const pathSegments = location.pathname.split("/").filter(Boolean);

	const breadcrumbs = pathSegments.map((segment, index) => {
		const path = `/${pathSegments.slice(0, index + 1).join("/")}`;

		return {
			label: getSegmentLabel(segment),
			path,
		};
	});

	if (breadcrumbs.length === 0) return null;

	return (
		<UIBreadcrumb>
			<BreadcrumbList>
				{breadcrumbs.map((breadcrumb, index) => (
					<Fragment key={breadcrumb.path}>
						<BreadcrumbItem>
							{index === breadcrumbs.length - 1 ? (
								<BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
							) : (
								<BreadcrumbLink asChild>
									<Link to={breadcrumb.path}>{breadcrumb.label}</Link>
								</BreadcrumbLink>
							)}
						</BreadcrumbItem>
						{index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
					</Fragment>
				))}
			</BreadcrumbList>
		</UIBreadcrumb>
	);
}
