import { IconDots, IconEdit, IconEye, IconTrash } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import type { Bucket } from "#/db/schema";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

type Props = {
  bucketId: Bucket["id"];
};

export function BucketActionsDropdownMenu({ bucketId }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon">
            <IconDots />
            <span className="sr-only">Open Bucket Action Menu</span>
          </Button>
        }
      />
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Buckets</DropdownMenuLabel>
          <DropdownMenuItem render={<Link to="/buckets/$bucketId" params={{ bucketId }} />}>
            <IconEye />
            View Detail
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
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
