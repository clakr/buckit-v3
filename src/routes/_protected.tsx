import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { SidebarContent } from "#/components/sidebar/content";
import { SidebarFooter } from "#/components/sidebar/footer";
import { Sidebar, SidebarInset, SidebarProvider, SidebarTrigger } from "#/components/ui/sidebar";
import { getSession } from "#/modules/authentication/functions";

export const Route = createFileRoute("/_protected")({
  component: RouteComponent,
  beforeLoad: async () => {
    const session = await getSession();
    if (!session)
      throw redirect({
        to: "/",
      });

    return { user: session.user };
  },
});

function RouteComponent() {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarContent />
        <SidebarFooter />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-x-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
