import { IconSelector, IconLogout, IconUserCircle } from "@tabler/icons-react";
import { getRouteApi, useRouter } from "@tanstack/react-router";

import { Avatar, AvatarImage, AvatarFallback } from "#/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "#/components/ui/dropdown-menu";
import {
  SidebarFooter as UISidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
  SidebarMenuButton,
} from "#/components/ui/sidebar";
import { signOut } from "#/modules/authentication/session";

export function SidebarFooter() {
  const Route = getRouteApi("/_protected");
  const { user } = Route.useRouteContext();

  const { isMobile } = useSidebar();

  const router = useRouter();

  return (
    <UISidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
              <Avatar className="size-8 rounded-lg">
                <AvatarImage src="https://placehold.co/1" alt="" className="rounded-lg" />
                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <IconSelector />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={isMobile ? "bottom" : "right"}
              align="end"
              className="min-w-56"
            >
              <DropdownMenuGroup>
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
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem disabled>
                  <IconUserCircle />
                  Account
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => signOut(router)}>
                  <IconLogout />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </UISidebarFooter>
  );
}
