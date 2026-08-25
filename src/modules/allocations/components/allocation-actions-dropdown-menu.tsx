import { IconDots, IconEdit, IconTrash } from "@tabler/icons-react";

import type { Allocation } from "#/db/schema";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { useEditAllocationDialogStore } from "#/modules/allocations/components/edit-allocation-dialog";

type Props = {
  allocationId: Allocation["id"];
};

export function AllocationActionsDropdownMenu({ allocationId }: Props) {
  function handleOpenEditAllocationDialog() {
    const state = useEditAllocationDialogStore.getState();

    state.setAllocationId(allocationId);
    state.openDialog();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon">
            <IconDots />
            <span className="sr-only">Open Allocation Action Menu</span>
          </Button>
        }
      />
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Allocation</DropdownMenuLabel>
          <DropdownMenuItem onClick={handleOpenEditAllocationDialog}>
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
