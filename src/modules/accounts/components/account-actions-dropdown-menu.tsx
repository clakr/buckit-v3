import { IconDots, IconEdit, IconEye, IconPlus, IconTrash } from "@tabler/icons-react";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { useLogAllocationDialogStore } from "#/modules/allocations/components/log-allocation-dialog";
import { useLogTransactionDialogStore } from "#/modules/transactions/components/log-transaction-dialog";

import type { getBankAccounts } from "../functions";

import { getAccountUnallocatedBalance } from "../utils";

type Props = {
  account: Awaited<ReturnType<typeof getBankAccounts>>[number];
};

export function AccountActionsDropdownMenu({ account }: Props) {
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

  const { unallocated } = getAccountUnallocatedBalance({
    startingBalance: account.startingBalance,
    transactions: account.transactions,
    allocations: account.allocations,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon">
            <IconDots />
            <span className="sr-only">Open Bank Account Action Menu</span>
          </Button>
        }
      />
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Accounts</DropdownMenuLabel>
          <DropdownMenuItem disabled>
            <IconEye />
            View Detail
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <IconEdit />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <IconTrash />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Others</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleOpenLogTransactionDialog}>
            <IconPlus />
            New Transaction
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenLogAllocationDialog} disabled={unallocated <= 0}>
            <IconPlus />
            Allocate
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
