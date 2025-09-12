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
import { UpdateProfileDialog } from "@/modules/profile/components/update-profile-dialog";
import { UserDropdownMenu } from "@/modules/profile/components/user-dropdown-menu";
import { Icon } from "@iconify/react";
import {
	Link,
	Outlet,
	createFileRoute,
	redirect,
	useLocation,
} from "@tanstack/react-router";
import { Fragment } from "react/jsx-runtime";

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

			<UpdateProfileDialog />
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

const links = [
	{
		label: "Dashboard",
		href: "/dashboard",
		icon: {
			active: "material-symbols:dashboard-rounded",
			inactive: "material-symbols:dashboard-outline-rounded",
		},
	},
	{
		label: "Buckets",
		href: "/buckets",
		icon: {
			active: "mdi:bucket",
			inactive: "mdi:bucket-outline",
		},
	},
	{
		label: "Goals",
		href: "/goals",
		icon: {
			active: "mage:goals-fill",
			inactive: "mage:goals",
		},
	},
	{
		label: "Splits",
		href: "/splits",
		icon: {
			active: "icon-park-solid:split-turn-down-right",
			inactive: "icon-park-outline:split-turn-down-right",
		},
	},
];

function SidebarContent() {
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
									>
										<Icon
											icon={link.icon.active}
											className="hidden [[data-active=true]>&]:block"
										/>
										<Icon
											icon={link.icon.inactive}
											className="hidden [[data-active=false]>&]:block"
										/>
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
	return (
		<UISidebarFooter {...props}>
			<SidebarMenu>
				<SidebarMenuItem>
					<UserDropdownMenu />
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
			label: segment,
			path,
		};
	});

	if (breadcrumbs.length === 0) return null;

	return (
		<UIBreadcrumb>
			<BreadcrumbList>
				{breadcrumbs.map((breadcrumb, index) => (
					<Fragment key={breadcrumb.path}>
						<BreadcrumbItem className="capitalize">
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
