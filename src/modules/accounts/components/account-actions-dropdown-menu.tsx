import { IconDots, IconEdit, IconEye, IconFileDiff, IconTrash } from "@tabler/icons-react";

import type { BankAccount } from "#/db/schema";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { useLogTransactionDialogStore } from "#/modules/transactions/components/log-transaction-dialog";

type Props = {
  account: BankAccount;
};

export function AccountActionsDropdownMenu({ account }: Props) {
  function handleOpenLogTransactionDialog() {
    const state = useLogTransactionDialogStore.getState();

    state.setAccount(account);
    state.openDialog();
  }

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
          <DropdownMenuItem onClick={handleOpenLogTransactionDialog}>
            <IconFileDiff />
            New Transaction
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
