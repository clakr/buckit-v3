import { IconPlus } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { RouteRetryButton } from "#/components/route-retry-button";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { DataTable } from "#/components/ui/data-table";
import { MODULE_ICONS } from "#/lib/constants";
import { INDEX_COLUMNS } from "#/modules/buckets/columns";
import { useSetUpBucketDialogStore } from "#/modules/buckets/components/set-up-bucket-dialog";
import { bucketsQueryOptions } from "#/modules/buckets/query-options";

export const Route = createFileRoute("/_protected/buckets/")({
  context: () => ({ bucketsQueryOptions }),
  loader: async ({ context: { queryClient, bucketsQueryOptions } }) => {
    return queryClient.query(bucketsQueryOptions);
  },
  pendingComponent: () => (
    <Main>
      <Heading>Buckets</Heading>

      <StateTemplate
        state="loading"
        title="Loading buckets..."
        description="Fetching your buckets..."
      />
    </Main>
  ),
  errorComponent: () => (
    <Main>
      <Heading>Buckets</Heading>

      <StateTemplate
        state="error"
        title="Could not load buckets."
        description="We weren't able to retrieve your buckets. Please try again."
        content={<RouteRetryButton />}
      />
    </Main>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const { bucketsQueryOptions } = Route.useRouteContext();
  const { data: buckets } = useSuspenseQuery(bucketsQueryOptions);

  const isEmpty = buckets.length === 0;

  const openDialog = useSetUpBucketDialogStore((state) => state.open);

  return (
    <Main>
      <div className="flex items-center justify-between">
        <Heading>Buckets</Heading>
        <Button onClick={() => openDialog()}>
          <IconPlus />
          Set Up Bucket
        </Button>
      </div>

      {isEmpty ? (
        <StateTemplate
          state="empty"
          title="No buckets yet."
          description="Create a bucket to start organizing your money."
          icon={<MODULE_ICONS.buckets />}
          content={
            <Button onClick={() => openDialog()}>
              <IconPlus />
              Set Up Bucket
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={INDEX_COLUMNS}
          data={buckets}
          initialSorting={[{ id: "createdAt", desc: true }]}
        />
      )}
    </Main>
  );
}
