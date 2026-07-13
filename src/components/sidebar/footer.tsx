import { IconSelector, IconLogout, IconUserCircle } from "@tabler/icons-react";
import { getRouteApi } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Result } from "better-result";
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

    const networkResult = await Result.tryPromise(
      {
        try: () => {
          controller.signal.throwIfAborted();
          return logoutUserServerFn({ signal: controller.signal });
        },
        catch: (e) => {
          if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
          return e instanceof TypeError || e instanceof Error ? e.message : e;
        },
      },
      {
        retry: {
          times: 5,
          delayMs: 100,
          backoff: "constant",
          shouldRetry: (error) => error !== "cancelled",
        },
      },
    );

    if (controller.signal.aborted) return;

    if (networkResult.status === "error") {
      toast.error("Oops!", {
        description: String(networkResult.error),
        action:
          networkResult.error !== "Unauthorized" ? (
            <Button onClick={handleLogout}>Retry</Button>
          ) : undefined,
      });

      if (networkResult.error === "Unauthorized") {
        navigate({
          to: "/",
          replace: true,
        });
      }

      return;
    }

    const server = Result.deserialize<void, string>(networkResult.value);

    if (server.status === "error") {
      toast.error("Oops!", {
        description: server.error,
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
