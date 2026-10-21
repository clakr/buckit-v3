import { IconDots, IconEye, IconMinus, IconPlus } from "@tabler/icons-react";
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
import { useLogAllocationDialogStore } from "#/modules/allocations/components/log-allocation-dialog";
import { useWithdrawDialogStore } from "#/modules/withdrawals/components/withdraw-dialog";

import { useDeleteBucketDialogStore } from "./delete-bucket-dialog";
import { useEditBucketDialogStore } from "./edit-bucket-dialog";

type Props = {
  bucket: Awaited<ReturnType<typeof getBuckets>>[number];
};

export function BucketActionsDropdownMenu({ bucket }: Props) {
  const bucketId = bucket.id;

  function handleOpenLogAllocationDialog() {
    useLogAllocationDialogStore.getState().open({ start: { from: "bucket", bucketId } });
  }

  function handleOpenWithdrawDialog() {
    useWithdrawDialogStore.getState().open({ bucketId });
  }

  function handleOpenEditBucketDialog() {
    useEditBucketDialogStore.getState().open({ bucketId });
  }

  function handleOpenDeleteBucketDialog() {
    useDeleteBucketDialogStore.getState().open({ bucketId });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
        <IconDots />
        <span className="sr-only">Open Bucket Action Menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleOpenLogAllocationDialog}>
            <IconPlus />
            Allocate Money
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenWithdrawDialog}>
            <IconMinus />
            Withdraw Money
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link to="/buckets/$bucketId" params={{ bucketId }} />}>
            <IconEye />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleOpenEditBucketDialog}>
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
