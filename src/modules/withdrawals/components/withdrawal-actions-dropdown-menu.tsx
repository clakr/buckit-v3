import { IconDots, IconPencil, IconTrash } from "@tabler/icons-react";

import type { Withdrawal } from "#/db/schema";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { editWithdrawalDrawerHandle } from "#/modules/withdrawals/components/edit-withdrawal-drawer";
import { useDeleteWithdrawalMutation } from "#/modules/withdrawals/mutations";
import { confirm } from "#/stores/use-confirm";

type Props = {
  withdrawalId: Withdrawal["id"];
};

export function WithdrawalActionsDropdownMenu({ withdrawalId }: Props) {
  function handleOpenEditWithdrawalDrawer() {
    editWithdrawalDrawerHandle.openWithPayload({ withdrawalId });
  }

  const mutation = useDeleteWithdrawalMutation();

  async function handleDeleteWithdrawal() {
    const confirmed = await confirm("Delete Withdrawal?", {
      description:
        "Delete this withdrawal? Its expense transaction will be deleted too, and the money goes back into the bucket.",
      confirmLabel: "Delete Withdrawal",
      cancelLabel: "Cancel",
      destructive: true,
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
        <IconDots aria-hidden />
        <span className="sr-only">Open Withdrawal Action Menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleOpenEditWithdrawalDrawer}>
            <IconPencil />
            Edit
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onClick={handleDeleteWithdrawal}>
            <IconTrash />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
