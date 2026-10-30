import { IconDots, IconEdit } from "@tabler/icons-react";

import type { Bucket, Goal } from "#/db/schema";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { editGoalDrawerHandle } from "#/modules/goals/components/edit-goal-drawer";
import { useRemoveGoalMutation } from "#/modules/goals/mutations";
import { confirm } from "#/stores/use-confirm";

type Props = {
  goalId: Goal["id"];
  bucketId: Bucket["id"];
};

export function GoalActionsDropdownMenu({ goalId, bucketId }: Props) {
  function handleOpenEditGoalDrawer() {
    editGoalDrawerHandle.openWithPayload({ bucketId });
  }

  const mutation = useRemoveGoalMutation();

  async function handleRemoveGoal() {
    const confirmed = await confirm("Remove Goal?", {
      description:
        "Remove this goal? The bucket, its allocations and its withdrawals stay as they are.",
      confirmLabel: "Remove Goal",
      cancelLabel: "Cancel",
      destructive: true,
    });

    if (!confirmed) return;

    try {
      await mutation.mutateAsync({ data: { goalId } });
    } catch (error) {
      console.error(error);

      return;
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
        <IconDots />
        <span className="sr-only">Open Goal Action Menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleOpenEditGoalDrawer}>
            <IconEdit />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleRemoveGoal}>
            <svg />
            Remove
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
