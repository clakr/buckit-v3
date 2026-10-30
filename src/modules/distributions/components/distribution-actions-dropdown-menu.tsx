import { IconBolt, IconCopy, IconDots, IconEdit, IconTrash } from "@tabler/icons-react";

import type { SavedDistribution } from "#/modules/distributions/functions";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { createDistributionDrawerHandle } from "#/modules/distributions/components/create-distribution-drawer";
import { editDistributionDrawerHandle } from "#/modules/distributions/components/edit-distribution-drawer";
import { triggerDistributionDrawerHandle } from "#/modules/distributions/components/trigger-distribution-drawer";
import { useDeleteDistributionMutation } from "#/modules/distributions/mutations";
import { confirm } from "#/stores/use-confirm";

type Props = {
  distribution: SavedDistribution;
};

export function DistributionActionsDropdownMenu({ distribution }: Props) {
  const distributionId = distribution.id;

  function handleOpenTriggerDistributionDrawer() {
    triggerDistributionDrawerHandle.openWithPayload({ distributionId });
  }

  function handleOpenEditDistributionDrawer() {
    editDistributionDrawerHandle.openWithPayload({ distributionId });
  }

  function handleOpenDuplicateDistributionDrawer() {
    createDistributionDrawerHandle.openWithPayload({ duplicateOf: distribution });
  }

  const mutation = useDeleteDistributionMutation();

  async function handleDeleteDistribution() {
    const confirmed = await confirm("Delete Distribution?", {
      description:
        "Delete this distribution? Every record it wrote earlier stays. Only the saved routine is removed.",
      confirmLabel: "Delete Distribution",
      cancelLabel: "Cancel",
      destructive: true,
    });

    if (!confirmed) return;

    try {
      await mutation.mutateAsync({ data: { distributionId } });
    } catch (error) {
      console.error(error);

      return;
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
        <IconDots />
        <span className="sr-only">Open Distribution Action Menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleOpenTriggerDistributionDrawer}>
            <IconBolt />
            Trigger
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenEditDistributionDrawer}>
            <IconEdit />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenDuplicateDistributionDrawer}>
            <IconCopy />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleDeleteDistribution}>
            <IconTrash />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
