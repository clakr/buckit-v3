import { IconDots, IconEye, IconPlus } from "@tabler/icons-react";
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

import { useDeleteBucketDialogStore } from "./delete-bucket-dialog";
import { useEditBucketDialogStore } from "./edit-bucket-dialog";

type Props = {
  bucket: Awaited<ReturnType<typeof getBuckets>>[number];
};

export function BucketActionsDropdownMenu({ bucket }: Props) {
  const bucketId = bucket.id;

  function handleOpenLogAllocationDialog() {
    const state = useLogAllocationDialogStore.getState();

    state.setStart({ from: "bucket", bucketId });
    state.openDialog();
  }

  function handleOpenEditBucketDialog() {
    const state = useEditBucketDialogStore.getState();

    state.setBucketId(bucketId);
    state.openDialog();
  }

  function handleOpenDeleteBucketDialog() {
    const state = useDeleteBucketDialogStore.getState();

    state.setBucketId(bucketId);
    state.openDialog();
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
