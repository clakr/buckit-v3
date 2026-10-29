import { IconBolt, IconDots } from "@tabler/icons-react";

import type { Distribution } from "#/db/schema";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { triggerDistributionDrawerHandle } from "#/modules/distributions/components/trigger-distribution-drawer";

type Props = {
  distributionId: Distribution["id"];
};

export function DistributionActionsDropdownMenu({ distributionId }: Props) {
  function handleOpenTriggerDistributionDrawer() {
    triggerDistributionDrawerHandle.openWithPayload({ distributionId });
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
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
