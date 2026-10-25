import { IconDots, IconEye, IconPlus, IconTarget } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import type { getBuckets } from "#/modules/buckets/functions";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { logAllocationDrawerHandle } from "#/modules/allocations/components/log-allocation-drawer";
import { addGoalDrawerHandle } from "#/modules/goals/components/add-goal-drawer";
import { withdrawDrawerHandle } from "#/modules/withdrawals/components/withdraw-drawer";

import { deleteBucketDialogHandle } from "./delete-bucket-dialog";
import { editBucketDrawerHandle } from "./edit-bucket-drawer";

type Props = {
  bucket: Awaited<ReturnType<typeof getBuckets>>[number];
};

export function BucketActionsDropdownMenu({ bucket }: Props) {
  const bucketId = bucket.id;

  function handleOpenLogAllocationDrawer() {
    logAllocationDrawerHandle.openWithPayload({ start: { from: "bucket", bucketId } });
  }

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
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
        <IconDots />
        <span className="sr-only">Open Bucket Action Menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleOpenLogAllocationDrawer}>
            <IconPlus />
            Allocate Money
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenWithdrawDrawer}>
            <svg />
            Withdraw Money
          </DropdownMenuItem>
          {bucket.goal ? null : (
            <DropdownMenuItem onClick={handleOpenAddGoalDrawer}>
              <svg />
              Add Goal
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link to="/buckets/$bucketId" params={{ bucketId }} />}>
            <IconEye />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenEditBucketDrawer}>
            <svg />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenDeleteBucketDialog}>
            <svg />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
