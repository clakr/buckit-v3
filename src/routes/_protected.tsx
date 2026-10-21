import { createFileRoute, Outlet } from "@tanstack/react-router";

import { SidebarContent } from "#/components/sidebar/content";
import { SidebarFooter } from "#/components/sidebar/footer";
import { Sidebar, SidebarInset, SidebarProvider, SidebarTrigger } from "#/components/ui/sidebar";
import { EditAllocationDialog } from "#/modules/allocations/components/edit-allocation-dialog";
import { LogAllocationDialog } from "#/modules/allocations/components/log-allocation-dialog";
import { requireSignedIn } from "#/modules/authentication/guards";
import { DeleteBankAccountDialog } from "#/modules/bank-accounts/components/delete-bank-account-dialog";
import { EditBankAccountDialog } from "#/modules/bank-accounts/components/edit-bank-account-dialog";
import { RegisterBankAccountDialog } from "#/modules/bank-accounts/components/register-bank-account-dialog";
import { DeleteBucketDialog } from "#/modules/buckets/components/delete-bucket-dialog";
import { EditBucketDialog } from "#/modules/buckets/components/edit-bucket-dialog";
import { SetUpBucketDialog } from "#/modules/buckets/components/set-up-bucket-dialog";
import { DeleteDebtDialog } from "#/modules/debts/components/delete-debt-dialog";
import { EditDebtDialog } from "#/modules/debts/components/edit-debt-dialog";
import { RecordDebtDialog } from "#/modules/debts/components/record-debt-dialog";
import { EditRepaymentDialog } from "#/modules/repayments/components/edit-repayment-dialog";
import { LogRepaymentDialog } from "#/modules/repayments/components/log-repayment-dialog";
import { EditTransactionDialog } from "#/modules/transactions/components/edit-transaction-dialog";
import { LogTransactionDialog } from "#/modules/transactions/components/log-transaction-dialog";
import { WithdrawDialog } from "#/modules/withdrawals/components/withdraw-dialog";

export const Route = createFileRoute("/_protected")({
  ssr: "data-only",
  component: RouteComponent,
  beforeLoad: ({ context }) => requireSignedIn(context),
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

      <RegisterBankAccountDialog />
      <SetUpBucketDialog />
      <LogTransactionDialog />
      <LogAllocationDialog />
      <WithdrawDialog />
      <EditTransactionDialog />
      <EditAllocationDialog />
      <EditBankAccountDialog />
      <EditBucketDialog />
      <DeleteBankAccountDialog />
      <DeleteBucketDialog />
      <RecordDebtDialog />
      <EditDebtDialog />
      <DeleteDebtDialog />
      <LogRepaymentDialog />
      <EditRepaymentDialog />
    </>
  );
}
