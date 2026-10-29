import { createFileRoute, Outlet } from "@tanstack/react-router";

import { SidebarContent } from "#/components/sidebar/content";
import { SidebarFooter } from "#/components/sidebar/footer";
import { Sidebar, SidebarInset, SidebarProvider, SidebarTrigger } from "#/components/ui/sidebar";
import { EditAllocationDrawer } from "#/modules/allocations/components/edit-allocation-drawer";
import { LogAllocationDrawer } from "#/modules/allocations/components/log-allocation-drawer";
import { requireSignedIn } from "#/modules/authentication/guards";
import { DeleteBankAccountDialog } from "#/modules/bank-accounts/components/delete-bank-account-dialog";
import { EditBankAccountDrawer } from "#/modules/bank-accounts/components/edit-bank-account-drawer";
import { RegisterBankAccountDrawer } from "#/modules/bank-accounts/components/register-bank-account-drawer";
import { DeleteBucketDialog } from "#/modules/buckets/components/delete-bucket-dialog";
import { EditBucketDrawer } from "#/modules/buckets/components/edit-bucket-drawer";
import { SetUpBucketDrawer } from "#/modules/buckets/components/set-up-bucket-drawer";
import { DeleteDebtDialog } from "#/modules/debts/components/delete-debt-dialog";
import { EditDebtDrawer } from "#/modules/debts/components/edit-debt-drawer";
import { RecordDebtDrawer } from "#/modules/debts/components/record-debt-drawer";
import { CreateDistributionDrawer } from "#/modules/distributions/components/create-distribution-drawer";
import { EditDistributionDrawer } from "#/modules/distributions/components/edit-distribution-drawer";
import { TriggerDistributionDrawer } from "#/modules/distributions/components/trigger-distribution-drawer";
import { AddGoalDrawer } from "#/modules/goals/components/add-goal-drawer";
import { EditGoalDrawer } from "#/modules/goals/components/edit-goal-drawer";
import { EditRepaymentDrawer } from "#/modules/repayments/components/edit-repayment-drawer";
import { LogRepaymentDrawer } from "#/modules/repayments/components/log-repayment-drawer";
import { EditTransactionDrawer } from "#/modules/transactions/components/edit-transaction-drawer";
import { LogTransactionDrawer } from "#/modules/transactions/components/log-transaction-drawer";
import { EditWithdrawalDrawer } from "#/modules/withdrawals/components/edit-withdrawal-drawer";
import { WithdrawDrawer } from "#/modules/withdrawals/components/withdraw-drawer";

export const Route = createFileRoute("/_protected")({
  ssr: "data-only",
  beforeLoad: ({ context, location }) => requireSignedIn(context, location),
  component: RouteComponent,
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

      <RegisterBankAccountDrawer />
      <SetUpBucketDrawer />
      <LogTransactionDrawer />
      <LogAllocationDrawer />
      <WithdrawDrawer />
      <AddGoalDrawer />
      <EditGoalDrawer />
      <EditWithdrawalDrawer />
      <EditTransactionDrawer />
      <EditAllocationDrawer />
      <EditBankAccountDrawer />
      <EditBucketDrawer />
      <DeleteBankAccountDialog />
      <DeleteBucketDialog />
      <RecordDebtDrawer />
      <CreateDistributionDrawer />
      <EditDistributionDrawer />
      <TriggerDistributionDrawer />
      <EditDebtDrawer />
      <DeleteDebtDialog />
      <LogRepaymentDrawer />
      <EditRepaymentDrawer />
    </>
  );
}
