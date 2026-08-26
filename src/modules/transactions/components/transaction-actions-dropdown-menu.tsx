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
import { confirm } from "#/stores/use-confirm";

import { validateDeleteTransaction } from "../functions";
import { useDeleteTransactionMutation } from "../mutations";

type Props = {
  transactionId: Transaction["id"];
};

export function TransactionActionsDropdownMenu({ transactionId }: Props) {
  function handleOpenEditTransactionDialog() {
    const state = useEditTransactionDialogStore.getState();

    state.setTransactionId(transactionId);
    state.openDialog();
  }

  const mutation = useDeleteTransactionMutation();

  async function handleDeleteTransaction() {
    const { isValid, message } = await validateDeleteTransaction({
      data: {
        transactionId,
      },
    });

    if (!isValid) {
      await confirm("Can't Delete This Transaction", {
        description: message,
        confirmLabel: "Got it",
      });

      return;
    }

    const confirmed = await confirm("Delete Transaction?", {
      description: message,
      confirmLabel: "Delete Transaction",
      cancelLabel: "Cancel",
    });

    if (!confirmed) return;

    try {
      await mutation.mutateAsync({ data: { transactionId } });
    } catch (error) {
      console.error(error);

      return;
    }
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
          <DropdownMenuItem onClick={handleDeleteTransaction}>
            <IconTrash />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
