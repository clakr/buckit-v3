import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";

import type { Distribution } from "#/db/schema";

import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import {
  createDrawerHandle,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  ResponsiveDrawer,
  type DrawerChangeEventDetails,
} from "#/components/ui/drawer";
import {
  DistributionForm,
  type DistributionFormControls,
} from "#/modules/distributions/components/distribution-form";
import { distributionsQueryOptions } from "#/modules/distributions/query-options";
import { confirm } from "#/stores/use-confirm";

export const editDistributionDrawerHandle = createDrawerHandle<{
  distributionId: Distribution["id"];
}>();

export function EditDistributionDrawer() {
  const formControlsRef = useRef<DistributionFormControls>(null);

  async function handleOnOpenChange(open: boolean, eventDetails: DrawerChangeEventDetails) {
    if (open || !formControlsRef.current?.isDirty()) return;

    eventDetails.cancel();

    const confirmed = await confirm("Discard editing distribution?", {
      description: "The distribution details you entered will be lost.",
      confirmLabel: "Keep Editing",
      cancelLabel: "Discard",
      dismissValue: true,
    });

    if (confirmed) return;

    formControlsRef.current.reset();
    editDistributionDrawerHandle.close();
  }

  return (
    <ResponsiveDrawer handle={editDistributionDrawerHandle} onOpenChange={handleOnOpenChange}>
      {({ payload }) => (
        <DrawerContent>
          {payload ? (
            <EditDistributionContent
              distributionId={payload.distributionId}
              ref={formControlsRef}
            />
          ) : null}
        </DrawerContent>
      )}
    </ResponsiveDrawer>
  );
}

function EditDistributionContent({
  distributionId,
  ref,
}: {
  distributionId: Distribution["id"];
  ref: React.Ref<DistributionFormControls>;
}) {
  const {
    status,
    refetch,
    data: distribution,
  } = useQuery({
    ...distributionsQueryOptions,
    select: (distributions) =>
      distributions.find((distribution) => distribution.id === distributionId),
  });

  if (distribution) {
    // Keyed by id, so opening another Distribution starts the form from its saved values.
    return (
      <DistributionForm
        key={distribution.id}
        distribution={distribution}
        onSaved={() => editDistributionDrawerHandle.close()}
        ref={ref}
      />
    );
  }

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Edit Distribution</DrawerTitle>
        <DrawerDescription>Update the name, default amount or lines.</DrawerDescription>
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {status === "pending" ? (
          <StateTemplate
            state="loading"
            title="Loading distribution"
            description="Fetching distribution details..."
          />
        ) : null}
        {status === "error" ? (
          <StateTemplate
            state="error"
            title="Could not load distribution"
            description="We weren't able to retrieve this distribution. Please check your connection and try again."
            content={<Button onClick={() => refetch()}>Retry</Button>}
          />
        ) : null}
        {status === "success" ? (
          <StateTemplate
            state="error"
            title="Distribution not found"
            description="This distribution doesn't exist or may have been deleted."
            content={<DrawerClose render={<Button variant="secondary" />}>Close</DrawerClose>}
          />
        ) : null}
      </div>
    </>
  );
}
