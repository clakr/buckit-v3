import type { PropsWithChildren } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { DataTable } from "#/components/ui/data-table";
import { ALLOCATIONS_COLUMNS } from "#/modules/buckets/columns";
import { bucketQueryOption } from "#/modules/buckets/query-options";

class BucketNotFoundError extends Error {
  constructor() {
    super();
  }
}

export const Route = createFileRoute("/_protected/buckets/$bucketId")({
  loader: async ({ context: { queryClient }, params }) => {
    queryClient.query(bucketQueryOption(params.bucketId));
  },
  pendingComponent: () => (
    <Template>
      <StateTemplate
        state="loading"
        title="Loading bucket..."
        description="Fetching bucket details and history..."
      />
    </Template>
  ),
  errorComponent: ({ error, reset }) => {
    if (error instanceof BucketNotFoundError)
      return (
        <Template>
          <StateTemplate
            state="error"
            title="Bucket not found"
            description="This bucket doesn't exist or may have been deleted."
            content={
              <Button variant="secondary" render={<Link to=".." />}>
                Go back to buckets
              </Button>
            }
          />
        </Template>
      );

    return (
      <Template>
        <StateTemplate
          state="error"
          title="Could not load bucket"
          description="We weren't able to retrieve this bucket. Please check your connection and try again."
          content={<Button onClick={reset}>Retry</Button>}
        />
      </Template>
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { bucketId } = Route.useParams();

  const { data: bucket } = useSuspenseQuery(bucketQueryOption(bucketId));
  if (!bucket) throw new BucketNotFoundError();

  return (
    <Template heading={bucket.name}>
      <DataTable
        columns={ALLOCATIONS_COLUMNS}
        data={bucket.allocations}
        initialSorting={[{ id: "date", desc: true }]}
      />
    </Template>
  );
}

function Template({ children, heading = "Bucket" }: PropsWithChildren<{ heading?: string }>) {
  return (
    <Main>
      <Heading className="capitalize">{heading}</Heading>
      {children}
    </Main>
  );
}
