import { useRef } from "react";

import type { SavedDistribution } from "#/modules/distributions/functions";

import {
  createDrawerHandle,
  DrawerContent,
  ResponsiveDrawer,
  type DrawerChangeEventDetails,
} from "#/components/ui/drawer";
import {
  DistributionForm,
  type DistributionFormControls,
} from "#/modules/distributions/components/distribution-form";
import { confirm } from "#/stores/use-confirm";

export const createDistributionDrawerHandle = createDrawerHandle<{
  duplicateOf?: SavedDistribution;
}>();

export function CreateDistributionDrawer() {
  const formControlsRef = useRef<DistributionFormControls>(null);

  async function handleOnOpenChange(open: boolean, eventDetails: DrawerChangeEventDetails) {
    if (open || !formControlsRef.current?.isDirty()) return;

    eventDetails.cancel();

    const confirmed = await confirm("Discard new distribution?", {
      description: "The distribution details you entered will be lost.",
      confirmLabel: "Keep Editing",
      cancelLabel: "Discard",
      dismissValue: true,
    });

    if (confirmed) return;

    formControlsRef.current.reset();
    createDistributionDrawerHandle.close();
  }

  return (
    <ResponsiveDrawer handle={createDistributionDrawerHandle} onOpenChange={handleOnOpenChange}>
      {({ payload }) => (
        <DrawerContent>
          <DistributionForm
            // Keyed by the original, so duplicating another Distribution starts from its values.
            key={payload?.duplicateOf?.id}
            duplicateOf={payload?.duplicateOf}
            onSaved={() => createDistributionDrawerHandle.close()}
            ref={formControlsRef}
          />
        </DrawerContent>
      )}
    </ResponsiveDrawer>
  );
}
