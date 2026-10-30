import { IconBolt } from "@tabler/icons-react";

import type { SavedDistribution } from "#/modules/distributions/functions";

import { Button } from "#/components/ui/button";
import { triggerDistributionDrawerHandle } from "#/modules/distributions/components/trigger-distribution-drawer";

/** Trigger is what a routine is for, so it sits one click from the row, beside the menu. */
export function TriggerDistributionButton({ distribution }: { distribution: SavedDistribution }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        triggerDistributionDrawerHandle.openWithPayload({ distributionId: distribution.id })
      }
    >
      <IconBolt />
      Trigger
    </Button>
  );
}
