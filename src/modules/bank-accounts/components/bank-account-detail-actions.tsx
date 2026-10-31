import { IconDots, IconPencil, IconPigMoney, IconReceipt, IconTrash } from "@tabler/icons-react";

import type { BankAccount } from "#/db/schema";

import { Button } from "#/components/ui/button";
import { ButtonGroup } from "#/components/ui/button-group";
import { DrawerTrigger } from "#/components/ui/drawer";
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
  bankAccountId: BankAccount["id"];
};

export function BankAccountDetailActions({ bankAccountId }: Props) {
  const allocationPayload = { start: { from: "bank-account", bankAccountId } } as const;

  function handleOpenLogAllocationDrawer() {
    logAllocationDrawerHandle.openWithPayload(allocationPayload);
  }

  function handleOpenEditBankAccountDrawer() {
    editBankAccountDrawerHandle.openWithPayload({ bankAccountId });
  }

  function handleOpenDeleteBankAccountDialog() {
    deleteBankAccountDialogHandle.openWithPayload({ bankAccountId });
  }

  return (
    <ButtonGroup>
      <ButtonGroup aria-label="Bank account actions">
        <DrawerTrigger
          handle={logAllocationDrawerHandle}
          payload={allocationPayload}
          render={<Button variant="outline" className="max-md:hidden" />}
        >
          <IconPigMoney />
          Allocate Money
        </DrawerTrigger>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="max-md:rounded-md! max-md:border-l!"
              />
            }
          >
            <IconDots aria-hidden />
            <span className="sr-only">Open Bank Account Action Menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-fit">
            <DropdownMenuGroup className="md:hidden">
              <DropdownMenuItem onClick={handleOpenLogAllocationDrawer}>
                <IconPigMoney />
                Allocate Money
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="md:hidden" />
            <DropdownMenuGroup>
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
      </ButtonGroup>
      <ButtonGroup>
        <DrawerTrigger
          handle={logTransactionDrawerHandle}
          payload={{ bankAccountId }}
          render={<Button />}
        >
          <IconReceipt />
          Log Transaction
        </DrawerTrigger>
      </ButtonGroup>
    </ButtonGroup>
  );
}
