import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { SidebarContent } from "#/components/sidebar/content";
import { SidebarFooter } from "#/components/sidebar/footer";
import { Sidebar, SidebarInset, SidebarProvider, SidebarTrigger } from "#/components/ui/sidebar";
import { EditAllocationDialog } from "#/modules/allocations/components/edit-allocation-dialog";
import { LogAllocationDialog } from "#/modules/allocations/components/log-allocation-dialog";
import { getSession } from "#/modules/authentication/functions";
import { AddBankAccountDialog } from "#/modules/bank-accounts/components/add-bank-account-dialog";
import { AddBucketDialog } from "#/modules/buckets/components/add-bucket-dialog";
import { EditTransactionDialog } from "#/modules/transactions/components/edit-transaction-dialog";
import { LogTransactionDialog } from "#/modules/transactions/components/log-transaction-dialog";

export const Route = createFileRoute("/_protected")({
  ssr: "data-only",
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
    <>
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

      <AddBankAccountDialog />
      <AddBucketDialog />
      <LogTransactionDialog />
      <LogAllocationDialog />
      <EditTransactionDialog />
      <EditAllocationDialog />
    </>
  );
}
