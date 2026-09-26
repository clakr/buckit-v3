import { IconPlus } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useShallow } from "zustand/react/shallow";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { DataTable } from "#/components/ui/data-table";
import { MODULE_ICONS } from "#/lib/constants";
import { INDEX_COLUMNS } from "#/modules/buckets/columns";
import { useAddBucketDialogStore } from "#/modules/buckets/components/add-bucket-dialog";
import { bucketsQueryOptions } from "#/modules/buckets/query-options";

export const Route = createFileRoute("/_protected/buckets/")({
  loader: async ({ context: { queryClient } }) => {
    queryClient.query(bucketsQueryOptions);
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
  errorComponent: ({ reset }) => (
    <Main>
      <Heading>Buckets</Heading>

      <StateTemplate
        state="error"
        title="Could not load buckets."
        description="We weren't able to retrieve your buckets. Please try again."
        content={<Button onClick={reset}>Retry</Button>}
      />
    </Main>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const { data: buckets } = useSuspenseQuery(bucketsQueryOptions);

  const isEmpty = buckets.length === 0;

  const openDialog = useAddBucketDialogStore(useShallow((state) => state.openDialog));

  return (
    <Main>
      <div className="flex items-center justify-between">
        <Heading>Buckets</Heading>
        <Button onClick={openDialog}>
          <IconPlus />
          Add Bucket
        </Button>
      </div>

      {isEmpty ? (
        <StateTemplate
          state="empty"
          title="No buckets yet."
          description="Create a bucket to start organizing your money."
          icon={<MODULE_ICONS.buckets />}
          content={
            <Button onClick={openDialog}>
              <IconPlus />
              Add Bucket
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
