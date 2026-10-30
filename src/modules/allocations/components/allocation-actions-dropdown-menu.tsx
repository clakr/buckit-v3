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
import { editAllocationDrawerHandle } from "#/modules/allocations/components/edit-allocation-drawer";
import { useDeleteAllocationMutation } from "#/modules/allocations/mutations";
import { confirm } from "#/stores/use-confirm";

type Props = {
  allocationId: Allocation["id"];
};

export function AllocationActionsDropdownMenu({ allocationId }: Props) {
  function handleOpenEditAllocationDrawer() {
    editAllocationDrawerHandle.openWithPayload({ allocationId });
  }

  const mutation = useDeleteAllocationMutation();

  async function handleDeleteAllocation() {
    const confirmed = await confirm("Delete Allocation?", {
      description:
        "Delete this allocation? Whatever its bucket still holds of it returns to the account's unallocated pool. If some has already been withdrawn, it can't be deleted.",
      confirmLabel: "Delete Allocation",
      cancelLabel: "Cancel",
      destructive: true,
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
          <DropdownMenuItem onClick={handleOpenEditAllocationDrawer}>
            <IconEdit />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleDeleteAllocation}>
            <svg />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
