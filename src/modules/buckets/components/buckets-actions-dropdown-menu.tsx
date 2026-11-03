import {
  IconCashMinus,
  IconDots,
  IconPencil,
  IconPigMoney,
  IconTarget,
  IconTrash,
} from "@tabler/icons-react";

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
  const holdsMoney = bucket.subtotals.some(({ amount }) => amount > 0);

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
        <IconDots aria-hidden />
        <span className="sr-only">Open Bucket Action Menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleOpenLogAllocationDrawer}>
            <IconPigMoney />
            Allocate Money
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!holdsMoney} onClick={handleOpenWithdrawDrawer}>
            <IconCashMinus />
            Withdraw Money
          </DropdownMenuItem>
          {bucket.goal ? null : (
            <DropdownMenuItem onClick={handleOpenAddGoalDrawer}>
              <IconTarget />
              Add Goal
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
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
  );
}
