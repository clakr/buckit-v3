import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase";
import { getErrorMessage } from "@/integrations/supabase/utils";
import { getInitialsAvatar } from "@/lib/utils";
import { useUpdateProfileDialogStore } from "@/modules/profile/components/update-profile-dialog";
import { profileQueryOption } from "@/modules/profile/query-options";
import { Icon } from "@iconify/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

export function UserDropdownMenu() {
	const { isMobile } = useSidebar();

	/**
	 * fetch profile
	 */
	const { isLoading, data: user } = useQuery(profileQueryOption);

	/**
	 * logout
	 */
	const navigate = useNavigate();
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

	/**
	 *
	 */
	const updateProfileDialogStore = useUpdateProfileDialogStore(
		useShallow((state) => ({
			handleOpen: state.handleOpen,
		})),
	);

	function handleOpenUpdateProfileDialog() {
		updateProfileDialogStore.handleOpen();
	}

	function UserInfo() {
		if (!user) return null;

		const displayName = useMemo(() => {
			if (user.username) return user.username;

			if (user.first_name && user.last_name)
				return `${user.first_name} ${user.last_name}`;

			return user.email;
		}, []);

		return (
			<>
				<Avatar className="size-8 rounded-lg">
					<AvatarImage src={getInitialsAvatar(displayName)} alt="" />
					<AvatarFallback className="rounded-lg">CN</AvatarFallback>
				</Avatar>
				<div className="grid flex-1 text-left text-sm leading-tight">
					<span className="truncate font-medium">{displayName}</span>
					{displayName !== user.email ? (
						<span className="truncate text-xs">{user.email}</span>
					) : null}
				</div>
			</>
		);
	}

	return (
		<DropdownMenu>
			{isLoading ? (
				<button type="button" className="flex gap-x-2">
					<Skeleton className="size-8 rounded-lg" />
					<div className="grid gap-y-1 ">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-4 w-32" />
					</div>
				</button>
			) : (
				<DropdownMenuTrigger asChild>
					<SidebarMenuButton
						size="lg"
						className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
					>
						<UserInfo />
						<Icon icon="bxs:chevron-down" className="ml-auto" />
					</SidebarMenuButton>
				</DropdownMenuTrigger>
			)}

			<DropdownMenuContent
				className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
				side={isMobile ? "bottom" : "right"}
				align="end"
				sideOffset={4}
			>
				<DropdownMenuLabel className="p-0 font-normal">
					<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
						<UserInfo />
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem onClick={handleOpenUpdateProfileDialog}>
						<Icon icon="bx:user" />
						Profile
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem onClick={handleLogout}>
						<Icon icon="bx:log-out" />
						Logout
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
