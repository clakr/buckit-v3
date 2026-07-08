import { IconSelector, IconLogout, IconUserCircle } from "@tabler/icons-react";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { signOutUser } from "#/modules/authentication/functions";

import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../ui/dropdown-menu";
import {
  SidebarFooter as UISidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
  SidebarMenuButton,
} from "../ui/sidebar";

export function SidebarFooter() {
  const Route = getRouteApi("/_protected");
  const { user } = Route.useRouteContext();

  const navigate = Route.useNavigate();

  const { isMobile } = useSidebar();

  const logoutUserServerFn = useServerFn(signOutUser);

  async function handleLogout() {
    await logoutUserServerFn();

    navigate({
      to: "/",
      replace: true,
    });
  }

  return (
    <UISidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg">
                <Avatar className="size-8 rounded-lg">
                  <AvatarImage src="https://placehold.co/1" alt="" className="rounded-lg" />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <IconSelector />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={isMobile ? "bottom" : "right"}
              align="end"
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-x-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage src="https://placehold.co/1" alt="" className="rounded-lg" />
                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <IconUserCircle />
                Account
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <IconLogout />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </UISidebarFooter>
  );
}
