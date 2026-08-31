import { IconDots, IconEye } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import type { Bucket } from "#/db/schema";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

type Props = {
  bucketId: Bucket["id"];
};

export function BucketActionsDropdownMenu({ bucketId }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
        <IconDots />
        <span className="sr-only">Open Bucket Action Menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link to="/buckets/$bucketId" params={{ bucketId }} />}>
            <IconEye />
            View
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <svg />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <svg />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
