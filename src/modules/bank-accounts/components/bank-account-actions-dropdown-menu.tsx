import {
  IconDots,
  IconEye,
  IconPencil,
  IconPigMoney,
  IconReceipt,
  IconTrash,
} from "@tabler/icons-react";
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
import { logAllocationDrawerHandle } from "#/modules/allocations/components/log-allocation-drawer";
import { logTransactionDrawerHandle } from "#/modules/transactions/components/log-transaction-drawer";

import { deleteBankAccountDialogHandle } from "./delete-bank-account-dialog";
import { editBankAccountDrawerHandle } from "./edit-bank-account-drawer";

type Props = {
  account: Awaited<ReturnType<typeof getBankAccounts>>[number];
};

export function BankAccountActionsDropdownMenu({ account }: Props) {
  function handleOpenLogTransactionDrawer() {
    logTransactionDrawerHandle.openWithPayload({ bankAccountId: account.id });
  }

  function handleOpenLogAllocationDrawer() {
    logAllocationDrawerHandle.openWithPayload({
      start: { from: "bank-account", bankAccountId: account.id },
    });
  }

  function handleOpenEditBankAccountDrawer() {
    editBankAccountDrawerHandle.openWithPayload({ bankAccountId: account.id });
  }

  function handleOpenDeleteBankAccountDialog() {
    deleteBankAccountDialogHandle.openWithPayload({ bankAccountId: account.id });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
        <IconDots aria-hidden />
        <span className="sr-only">Open Bank Account Action Menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleOpenLogTransactionDrawer}>
            <IconReceipt />
            Log Transaction
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenLogAllocationDrawer}>
            <IconPigMoney />
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
          <DropdownMenuItem onClick={handleOpenEditBankAccountDrawer}>
            <IconPencil />
            Edit
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onClick={handleOpenDeleteBankAccountDialog}>
            <IconTrash />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
