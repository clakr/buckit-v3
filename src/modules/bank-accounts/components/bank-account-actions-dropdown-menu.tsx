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

import { deleteBankAccountDialogHandle } from "./delete-bank-account-dialog";
import { useEditBankAccountDialogStore } from "./edit-bank-account-dialog";

type Props = {
  account: Awaited<ReturnType<typeof getBankAccounts>>[number];
};

export function BankAccountActionsDropdownMenu({ account }: Props) {
  function handleOpenLogTransactionDialog() {
    useLogTransactionDialogStore.getState().open({ bankAccountId: account.id });
  }

  function handleOpenLogAllocationDialog() {
    useLogAllocationDialogStore
      .getState()
      .open({ start: { from: "bank-account", bankAccountId: account.id } });
  }

  function handleOpenEditBankAccountDialog() {
    useEditBankAccountDialogStore.getState().open({ bankAccountId: account.id });
  }

  function handleOpenDeleteBankAccountDialog() {
    deleteBankAccountDialogHandle.openWithPayload({ bankAccountId: account.id });
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
            Log Transaction
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenLogAllocationDialog}>
            <svg />
            Allocate Money
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
          <DropdownMenuItem onClick={handleOpenEditBankAccountDialog}>
            <svg />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenDeleteBankAccountDialog}>
            <svg />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
