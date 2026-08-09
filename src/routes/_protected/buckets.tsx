import type { PropsWithChildren } from "react";

import { IconBucket, IconPlus } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useShallow } from "zustand/react/shallow";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { DataTable } from "#/components/ui/data-table";
import { columns } from "#/modules/buckets/columns";
import { useAddBucketDialogStore } from "#/modules/buckets/components/add-bucket-dialog";
import { bucketsQueryOptions } from "#/modules/buckets/query-options";

export const Route = createFileRoute("/_protected/buckets")({
  loader: async ({ context: { queryClient } }) => {
    queryClient.prefetchQuery(bucketsQueryOptions);
  },
  pendingComponent: () => (
    <Template>
      <StateTemplate
        state="loading"
        title="Loading buckets..."
        description="Fetching your buckets..."
      />
    </Template>
  ),
  errorComponent: ({ reset }) => (
    <Template>
      <StateTemplate
        state="error"
        title="Could not load buckets."
        description="We weren't able to retrieve your buckets. Please try again."
        buttonText="Retry"
        handleButtonClick={reset}
      />
    </Template>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const { data: buckets } = useSuspenseQuery(bucketsQueryOptions);

  const isEmpty = buckets.length === 0;

  const openDialog = useAddBucketDialogStore(useShallow((state) => state.openDialog));

  return (
    <Template>
      {isEmpty ? (
        <StateTemplate
          state="empty"
          title="No buckets yet."
          description="Create a bucket to start organizing your money."
          icon={<IconBucket />}
          buttonText="Add Bucket"
          handleButtonClick={openDialog}
        />
      ) : (
        <DataTable columns={columns} data={buckets} />
      )}
    </Template>
  );
}

function Template({ children }: PropsWithChildren) {
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
      {children}
    </Main>
  );
}
