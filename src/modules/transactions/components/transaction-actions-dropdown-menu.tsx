import { IconDots, IconEdit } from "@tabler/icons-react";

import type { Transaction } from "#/db/schema";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { AppError, SessionExpiredError } from "#/lib/errors";
import { useEditTransactionDialogStore } from "#/modules/transactions/components/edit-transaction-dialog";
import { validateDeleteTransaction } from "#/modules/transactions/functions";
import { useDeleteTransactionMutation } from "#/modules/transactions/mutations";
import { confirm } from "#/stores/use-confirm";

type Props = {
  transactionId: Transaction["id"];
};

export function TransactionActionsDropdownMenu({ transactionId }: Props) {
  function handleOpenEditTransactionDialog() {
    useEditTransactionDialogStore.getState().open({ transactionId });
  }

  const mutation = useDeleteTransactionMutation();

  async function handleDeleteTransaction() {
    let check: Awaited<ReturnType<typeof validateDeleteTransaction>>;
    try {
      check = await validateDeleteTransaction({ data: { transactionId } });
    } catch (error) {
      if (error instanceof SessionExpiredError) return;

      console.error(error);

      await confirm("Can't Delete This Transaction", {
        description:
          error instanceof AppError
            ? error.message
            : "We couldn't check this transaction. Please try again.",
        confirmLabel: "Got it",
      });

      return;
    }

    const { isValid, message } = check;

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
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
        <IconDots />
        <span className="sr-only">Open Transaction Action Menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleOpenEditTransactionDialog}>
            <IconEdit />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDeleteTransaction}>
            <svg />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
