import { IconBolt } from "@tabler/icons-react";

import type { SavedDistribution } from "#/modules/distributions/functions";

import { Button } from "#/components/ui/button";
import { triggerDistributionDrawerHandle } from "#/modules/distributions/components/trigger-distribution-drawer";

/** Trigger is what a routine is for, so it sits one click from the row, beside the menu. */
export function TriggerDistributionButton({ distribution }: { distribution: SavedDistribution }) {
  const label = `Trigger ${distribution.name}`;

  return (
    <Button
      variant="ghost"
      size="icon"
      title={label}
      aria-label={label}
      onClick={() =>
        triggerDistributionDrawerHandle.openWithPayload({ distributionId: distribution.id })
      }
    >
      <IconBolt aria-hidden />
    </Button>
  );
}
