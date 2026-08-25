import { IconDots, IconEdit, IconTrash } from "@tabler/icons-react";

import type { Transaction } from "#/db/schema";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { useEditTransactionDialogStore } from "#/modules/transactions/components/edit-transaction-dialog";

type Props = {
  transactionId: Transaction["id"];
};

export function TransactionActionsDropdownMenu({ transactionId }: Props) {
  function handleOpenEditTransactionDialog() {
    const state = useEditTransactionDialogStore.getState();

    state.setTransactionId(transactionId);
    state.openDialog();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon">
            <IconDots />
            <span className="sr-only">Open Transaction Action Menu</span>
          </Button>
        }
      />
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Transaction</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleOpenEditTransactionDialog}>
            <IconEdit />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <IconTrash />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
