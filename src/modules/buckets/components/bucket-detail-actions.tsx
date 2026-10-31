import {
  IconCashMinus,
  IconDots,
  IconPencil,
  IconPigMoney,
  IconTarget,
  IconTargetOff,
  IconTrash,
} from "@tabler/icons-react";

import type { Bucket, Goal } from "#/db/schema";

import { Button } from "#/components/ui/button";
import { ButtonGroup } from "#/components/ui/button-group";
import { DrawerTrigger } from "#/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { logAllocationDrawerHandle } from "#/modules/allocations/components/log-allocation-drawer";
import { addGoalDrawerHandle } from "#/modules/goals/components/add-goal-drawer";
import { editGoalDrawerHandle } from "#/modules/goals/components/edit-goal-drawer";
import { useRemoveGoalMutation } from "#/modules/goals/mutations";
import { withdrawDrawerHandle } from "#/modules/withdrawals/components/withdraw-drawer";
import { confirm } from "#/stores/use-confirm";

import { deleteBucketDialogHandle } from "./delete-bucket-dialog";
import { editBucketDrawerHandle } from "./edit-bucket-drawer";

type Props = {
  bucketId: Bucket["id"];
  goalId: Goal["id"] | null;
  holdsMoney: boolean;
};

export function BucketDetailActions({ bucketId, goalId, holdsMoney }: Props) {
  const removeGoalMutation = useRemoveGoalMutation();

  function handleOpenWithdrawDrawer() {
    withdrawDrawerHandle.openWithPayload({ bucketId });
  }

  function handleOpenAddGoalDrawer() {
    addGoalDrawerHandle.openWithPayload({ bucketId });
  }

  function handleOpenEditGoalDrawer() {
    editGoalDrawerHandle.openWithPayload({ bucketId });
  }

  async function handleRemoveGoal() {
    if (!goalId) return;

    const confirmed = await confirm("Remove Goal?", {
      description:
        "Remove this goal? The bucket, its allocations and its withdrawals stay as they are.",
      confirmLabel: "Remove Goal",
      cancelLabel: "Cancel",
      destructive: true,
    });

    if (!confirmed) return;

    try {
      await removeGoalMutation.mutateAsync({ data: { goalId } });
    } catch (error) {
      console.error(error);

      return;
    }
  }

  function handleOpenEditBucketDrawer() {
    editBucketDrawerHandle.openWithPayload({ bucketId });
  }

  function handleOpenDeleteBucketDialog() {
    deleteBucketDialogHandle.openWithPayload({ bucketId });
  }

  return (
    <ButtonGroup>
      <ButtonGroup aria-label="Bucket actions">
        <Tooltip disabled={holdsMoney}>
          <TooltipTrigger
            render={
              <DrawerTrigger
                handle={withdrawDrawerHandle}
                payload={{ bucketId }}
                disabled={!holdsMoney}
                render={
                  <Button
                    variant="outline"
                    focusableWhenDisabled
                    className="aria-disabled:opacity-50 max-md:hidden"
                  />
                }
              />
            }
          >
            <IconCashMinus />
            Withdraw
          </TooltipTrigger>
          <TooltipContent>Allocate money into this bucket first</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="max-md:rounded-md! max-md:border-l!"
              />
            }
          >
            <IconDots aria-hidden />
            <span className="sr-only">Open Bucket Action Menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-fit">
            <DropdownMenuGroup className="md:hidden">
              <DropdownMenuItem disabled={!holdsMoney} onClick={handleOpenWithdrawDrawer}>
                <IconCashMinus />
                {holdsMoney ? "Withdraw Money" : "Withdraw Money (allocate money first)"}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="md:hidden" />
            <DropdownMenuGroup>
              {goalId ? (
                <DropdownMenuItem onClick={handleOpenEditGoalDrawer}>
                  <IconTarget />
                  Edit Goal
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleOpenAddGoalDrawer}>
                  <IconTarget />
                  Add Goal
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleOpenEditBucketDrawer}>
                <IconPencil />
                Edit Bucket
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {goalId ? (
                <DropdownMenuItem variant="destructive" onClick={handleRemoveGoal}>
                  <IconTargetOff />
                  Remove Goal
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem variant="destructive" onClick={handleOpenDeleteBucketDialog}>
                <IconTrash />
                Delete Bucket
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
      <ButtonGroup>
        <DrawerTrigger
          handle={logAllocationDrawerHandle}
          payload={{ start: { from: "bucket", bucketId } }}
          render={<Button />}
        >
          <IconPigMoney />
          Allocate Money
        </DrawerTrigger>
      </ButtonGroup>
    </ButtonGroup>
  );
}
