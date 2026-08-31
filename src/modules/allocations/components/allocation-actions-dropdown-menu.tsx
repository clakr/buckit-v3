import { IconDots, IconEdit } from "@tabler/icons-react";

import type { Allocation } from "#/db/schema";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { useEditAllocationDialogStore } from "#/modules/allocations/components/edit-allocation-dialog";
import { useDeleteAllocationMutation } from "#/modules/allocations/mutations";
import { confirm } from "#/stores/use-confirm";

type Props = {
  allocationId: Allocation["id"];
};

export function AllocationActionsDropdownMenu({ allocationId }: Props) {
  function handleOpenEditAllocationDialog() {
    const state = useEditAllocationDialogStore.getState();

    state.setAllocationId(allocationId);
    state.openDialog();
  }

  const mutation = useDeleteAllocationMutation();

  async function handleDeleteAllocation() {
    const confirmed = await confirm("Delete Allocation?", {
      description:
        "Delete this allocation? The money will return to the account's unallocated pool.",
      confirmLabel: "Delete Allocation",
      cancelLabel: "Cancel",
    });

    if (!confirmed) return;

    try {
      await mutation.mutateAsync({ data: { allocationId } });
    } catch (error) {
      console.error(error);

      return;
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
        <IconDots />
        <span className="sr-only">Open Allocation Action Menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleOpenEditAllocationDialog}>
            <IconEdit />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDeleteAllocation}>
            <svg />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
