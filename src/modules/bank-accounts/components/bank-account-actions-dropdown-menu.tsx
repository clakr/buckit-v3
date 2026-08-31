import { IconDots, IconEye, IconPlus } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import type { getBankAccounts } from "#/modules/bank-accounts/functions";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { useLogAllocationDialogStore } from "#/modules/allocations/components/log-allocation-dialog";
import { useLogTransactionDialogStore } from "#/modules/transactions/components/log-transaction-dialog";

type Props = {
  account: Awaited<ReturnType<typeof getBankAccounts>>[number];
};

export function BankAccountActionsDropdownMenu({ account }: Props) {
  function handleOpenLogTransactionDialog() {
    const state = useLogTransactionDialogStore.getState();

    state.setAccount(account);
    state.openDialog();
  }

  function handleOpenLogAllocationDialog() {
    const state = useLogAllocationDialogStore.getState();

    state.setAccount(account);
    state.openDialog();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
        <IconDots />
        <span className="sr-only">Open Bank Account Action Menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleOpenLogTransactionDialog}>
            <IconPlus />
            Transaction
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenLogAllocationDialog}>
            <svg />
            Allocation
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            render={<Link to="/accounts/$accountId" params={{ accountId: account.id }} />}
          >
            <IconEye />
            View
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <svg />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <svg />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
