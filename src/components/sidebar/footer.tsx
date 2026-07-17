import { IconSelector, IconLogout, IconUserCircle } from "@tabler/icons-react";
import { getRouteApi } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef } from "react";
import { toast } from "sonner";

import { Avatar, AvatarImage, AvatarFallback } from "#/components/ui/avatar";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "#/components/ui/dropdown-menu";
import {
  SidebarFooter as UISidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
  SidebarMenuButton,
} from "#/components/ui/sidebar";
import { signOutUser } from "#/modules/authentication/functions";

export function SidebarFooter() {
  const Route = getRouteApi("/_protected");
  const { user, queryClient } = Route.useRouteContext();

  const navigate = Route.useNavigate();

  const { isMobile } = useSidebar();

  const logoutUserServerFn = useServerFn(signOutUser);

  const abortControllerRef = useRef<AbortController | null>(null);

  async function handleLogout() {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await logoutUserServerFn({ signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted) return;

      toast.error("Oops", {
        description: error instanceof Error ? error.message : String(error),
        action:
          error instanceof TypeError ? <Button onClick={handleLogout}>Retry</Button> : undefined,
      });

      return;
    }

    queryClient.clear();

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
            <DropdownMenuTrigger
              render={
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
              }
            />
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
