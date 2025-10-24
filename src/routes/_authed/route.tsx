import {
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
	Breadcrumb as UIBreadcrumb,
} from "@/components/ui/breadcrumb";
import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarInset,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarProvider,
	SidebarTrigger,
	Sidebar as UISidebar,
	SidebarContent as UISidebarContent,
	SidebarFooter as UISidebarFooter,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase";
import { BucketDropdownMenu } from "@/modules/buckets/components/bucket-dropdown-menu";
import {
	CreateBucketDialog,
	useCreateBucketDialogStore,
} from "@/modules/buckets/components/create-bucket-dialog";
import { CreateTransactionDialog as CreateBucketTransactionDialog } from "@/modules/buckets/components/create-transaction-dialog";
import { UpdateBucketDialog } from "@/modules/buckets/components/update-bucket-dialog";
import { bucketsQueryOption } from "@/modules/buckets/query-options";
import {
	CreateGoalDialog,
	useCreateGoalDialogStore,
} from "@/modules/goals/component/create-goal-dialog";
import { CreateTransactionDialog as CreateGoalTransactionDialog } from "@/modules/goals/component/create-transaction-dialog";
import { GoalDropdownMenu } from "@/modules/goals/component/goal-dropdown-menu";
import { UpdateGoalDialog } from "@/modules/goals/component/update-goal-dialog";
import { goalsQueryOption } from "@/modules/goals/query-options";
import { UpdateProfileDialog } from "@/modules/profile/components/update-profile-dialog";
import { UserDropdownMenu } from "@/modules/profile/components/user-dropdown-menu";
import { SplitDropdownMenu } from "@/modules/splits/components/split-dropdown-menu";
import { splitsQueryOption } from "@/modules/splits/query-options";
import { Icon } from "@iconify/react";
import { useSuspenseQuery } from "@tanstack/react-query";
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
	loader: async ({ context: { queryClient } }) => {
		await Promise.allSettled([
			queryClient.ensureQueryData(bucketsQueryOption),
			queryClient.ensureQueryData(goalsQueryOption),
			queryClient.ensureQueryData(splitsQueryOption),
		]);
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

			<CreateBucketDialog />
			<UpdateBucketDialog />
			<CreateBucketTransactionDialog />

			<CreateGoalDialog />
			<UpdateGoalDialog />
			<CreateGoalTransactionDialog />
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
	const buckets = useSuspenseQuery(bucketsQueryOption);
	const goals = useSuspenseQuery(goalsQueryOption);
	const splits = useSuspenseQuery(splitsQueryOption);

	// actions
	const handleOpenCreateBucketDialog = useCreateBucketDialogStore(
		(state) => state.handleOpen,
	);

	const handleOpenCreateGoalDialog = useCreateGoalDialogStore(
		(state) => state.handleOpen,
	);

	return (
		<UISidebarContent>
			<SidebarGroup>
				<SidebarGroupContent>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton asChild>
								<Link
									to="/dashboard"
									activeProps={{
										"data-active": true,
									}}
								>
									<Icon
										icon="material-symbols:dashboard-rounded"
										className="hidden [[data-active=true]>&]:block"
									/>
									<Icon
										icon="material-symbols:dashboard-outline-rounded"
										className="hidden [[data-active=false]>&]:block"
									/>
									Dashboard
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<SidebarMenuButton asChild>
								<Link
									to="/buckets"
									activeProps={{
										"data-active": true,
									}}
								>
									<Icon
										icon="mdi:bucket"
										className="hidden [[data-active=true]>&]:block"
									/>
									<Icon
										icon="mdi:bucket-outline"
										className="hidden [[data-active=false]>&]:block"
									/>
									Buckets
								</Link>
							</SidebarMenuButton>
							<SidebarMenuAction onClick={handleOpenCreateBucketDialog}>
								<Icon icon="bx:plus" />
								<span className="sr-only">Add Bucket</span>
							</SidebarMenuAction>
							<SidebarMenuSub>
								{buckets.data.map((bucket) => (
									<SidebarMenuItem key={bucket.id}>
										<SidebarMenuButton asChild>
											<Link
												to="/buckets/$id"
												params={{ id: bucket.id }}
												activeProps={{
													"data-active": true,
												}}
											>
												{bucket.name}
											</Link>
										</SidebarMenuButton>
										<BucketDropdownMenu id={bucket.id}>
											<DropdownMenuTrigger asChild>
												<SidebarMenuAction>
													<Icon icon="mdi:ellipsis-horizontal" />
													<span className="sr-only">Bucket Actions</span>
												</SidebarMenuAction>
											</DropdownMenuTrigger>
										</BucketDropdownMenu>
									</SidebarMenuItem>
								))}
							</SidebarMenuSub>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<SidebarMenuButton asChild>
								<Link
									to="/goals"
									activeProps={{
										"data-active": true,
									}}
								>
									<Icon
										icon="mage:goals-fill"
										className="hidden [[data-active=true]>&]:block"
									/>
									<Icon
										icon="mage:goals"
										className="hidden [[data-active=false]>&]:block"
									/>
									Goals
								</Link>
							</SidebarMenuButton>
							<SidebarMenuAction onClick={handleOpenCreateGoalDialog}>
								<Icon icon="bx:plus" />
								<span className="sr-only">Add Goal</span>
							</SidebarMenuAction>
							<SidebarMenuSub>
								{goals.data.map((goal) => (
									<SidebarMenuItem key={goal.id}>
										<SidebarMenuButton asChild>
											<Link
												to="/goals/$id"
												params={{ id: goal.id }}
												activeProps={{
													"data-active": true,
												}}
											>
												{goal.name}
											</Link>
										</SidebarMenuButton>
										<GoalDropdownMenu id={goal.id}>
											<DropdownMenuTrigger asChild>
												<SidebarMenuAction>
													<Icon icon="mdi:ellipsis-horizontal" />
													<span className="sr-only">Goal Actions</span>
												</SidebarMenuAction>
											</DropdownMenuTrigger>
										</GoalDropdownMenu>
									</SidebarMenuItem>
								))}
							</SidebarMenuSub>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<SidebarMenuButton asChild>
								<Link
									to="/splits"
									activeProps={{
										"data-active": true,
									}}
								>
									<Icon
										icon="icon-park-solid:split-turn-down-right"
										className="hidden [[data-active=true]>&]:block"
									/>
									<Icon
										icon="icon-park-outline:split-turn-down-right"
										className="hidden [[data-active=false]>&]:block"
									/>
									Splits
								</Link>
							</SidebarMenuButton>
							<SidebarMenuAction asChild>
								<Link to="/splits/create">
									<Icon icon="bx:plus" />
									<span className="sr-only">Add Goal</span>
								</Link>
							</SidebarMenuAction>
							<SidebarMenuSub>
								{splits.data.map((split) => (
									<SidebarMenuItem key={split.id}>
										<SidebarMenuButton asChild>
											<Link
												to="/splits/$id"
												params={{ id: split.id }}
												activeProps={{
													"data-active": true,
												}}
											>
												{split.name}
											</Link>
										</SidebarMenuButton>
										<SplitDropdownMenu id={split.id}>
											<DropdownMenuTrigger asChild>
												<SidebarMenuAction>
													<Icon icon="mdi:ellipsis-horizontal" />
													<span className="sr-only">Split Actions</span>
												</SidebarMenuAction>
											</DropdownMenuTrigger>
										</SplitDropdownMenu>
									</SidebarMenuItem>
								))}
							</SidebarMenuSub>
						</SidebarMenuItem>
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
