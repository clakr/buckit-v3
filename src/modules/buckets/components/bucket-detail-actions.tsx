import {
  IconCashMinus,
  IconDots,
  IconPencil,
  IconPigMoney,
  IconTarget,
  IconTrash,
} from "@tabler/icons-react";

import type { Bucket } from "#/db/schema";

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
import { withdrawDrawerHandle } from "#/modules/withdrawals/components/withdraw-drawer";

import { deleteBucketDialogHandle } from "./delete-bucket-dialog";
import { editBucketDrawerHandle } from "./edit-bucket-drawer";

type Props = {
  bucketId: Bucket["id"];
  hasGoal: boolean;
  holdsMoney: boolean;
};

export function BucketDetailActions({ bucketId, hasGoal, holdsMoney }: Props) {
  function handleOpenWithdrawDrawer() {
    withdrawDrawerHandle.openWithPayload({ bucketId });
  }

  function handleOpenAddGoalDrawer() {
    addGoalDrawerHandle.openWithPayload({ bucketId });
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
              {hasGoal ? null : (
                <DropdownMenuItem onClick={handleOpenAddGoalDrawer}>
                  <IconTarget />
                  Add Goal
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleOpenEditBucketDrawer}>
                <IconPencil />
                Edit
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" onClick={handleOpenDeleteBucketDialog}>
                <IconTrash />
                Delete
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
