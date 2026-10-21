import { IconDots, IconEdit } from "@tabler/icons-react";

import type { Withdrawal } from "#/db/schema";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { useEditWithdrawalDialogStore } from "#/modules/withdrawals/components/edit-withdrawal-dialog";
import { useDeleteWithdrawalMutation } from "#/modules/withdrawals/mutations";
import { confirm } from "#/stores/use-confirm";

type Props = {
  withdrawalId: Withdrawal["id"];
};

export function WithdrawalActionsDropdownMenu({ withdrawalId }: Props) {
  function handleOpenEditWithdrawalDialog() {
    useEditWithdrawalDialogStore.getState().open({ withdrawalId });
  }

  const mutation = useDeleteWithdrawalMutation();

  async function handleDeleteWithdrawal() {
    const confirmed = await confirm("Delete Withdrawal?", {
      description:
        "Delete this withdrawal? Its expense transaction will be deleted too, and the money goes back into the bucket.",
      confirmLabel: "Delete Withdrawal",
      cancelLabel: "Cancel",
    });

    if (!confirmed) return;

    try {
      await mutation.mutateAsync({ data: { withdrawalId } });
    } catch (error) {
      console.error(error);

      return;
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
        <IconDots />
        <span className="sr-only">Open Withdrawal Action Menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleOpenEditWithdrawalDialog}>
            <IconEdit />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDeleteWithdrawal}>
            <svg />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
