import { IconMinus, IconPencil } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { RouteRetryButton } from "#/components/route-retry-button";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { DataTable } from "#/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { loadOrThrowRouteNotFound } from "#/lib/errors";
import { formatPageTitle } from "#/lib/utils";
import { getAllocationColumns } from "#/modules/allocations/columns";
import { allocationsQueryOption } from "#/modules/allocations/query-options";
import { useEditBucketDialogStore } from "#/modules/buckets/components/edit-bucket-dialog";
import { bucketQueryOption } from "#/modules/buckets/query-options";
import { WITHDRAWAL_COLUMNS } from "#/modules/withdrawals/columns";
import { useWithdrawDialogStore } from "#/modules/withdrawals/components/withdraw-dialog";
import { withdrawalsQueryOption } from "#/modules/withdrawals/query-options";

export const Route = createFileRoute("/_protected/buckets/$bucketId")({
  context: ({ params }) => ({
    bucketQueryOptions: bucketQueryOption(params.bucketId),
    allocationsQueryOptions: allocationsQueryOption({ bucketId: params.bucketId }),
    withdrawalsQueryOptions: withdrawalsQueryOption(params.bucketId),
  }),
  loader: async ({
    context: { queryClient, bucketQueryOptions, allocationsQueryOptions, withdrawalsQueryOptions },
  }) => {
    const [bucket] = await loadOrThrowRouteNotFound(
      Promise.all([
        queryClient.query(bucketQueryOptions),
        queryClient.query(allocationsQueryOptions),
        queryClient.query(withdrawalsQueryOptions),
      ]),
    );

    return { name: bucket.name };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: formatPageTitle(loaderData?.name ?? "Bucket") }],
  }),
  pendingComponent: () => (
    <Main>
      <Heading className="capitalize">Bucket</Heading>

      <StateTemplate
        state="loading"
        title="Loading bucket..."
        description="Fetching bucket details and history..."
      />
    </Main>
  ),
  notFoundComponent: () => (
    <Main>
      <Heading className="capitalize">Bucket</Heading>
      <StateTemplate
        state="error"
        title="Bucket not found"
        description="This bucket doesn't exist or may have been deleted."
        content={
          <Button variant="secondary" nativeButton={false} render={<Link to="/buckets" />}>
            Go back to buckets
          </Button>
        }
      />
    </Main>
  ),
  errorComponent: () => (
    <Main>
      <Heading className="capitalize">Bucket</Heading>
      <StateTemplate
        state="error"
        title="Could not load bucket"
        description="We weren't able to retrieve this bucket. Please check your connection and try again."
        content={<RouteRetryButton />}
      />
    </Main>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const { bucketId } = Route.useParams();
  const { bucketQueryOptions, allocationsQueryOptions, withdrawalsQueryOptions } =
    Route.useRouteContext();

  const { data: bucket } = useSuspenseQuery(bucketQueryOptions);
  const { data: allocations } = useSuspenseQuery(allocationsQueryOptions);
  const { data: withdrawals } = useSuspenseQuery(withdrawalsQueryOptions);

  function handleOpenWithdrawDialog() {
    useWithdrawDialogStore.getState().open({ bucketId });
  }

  function handleOpenEditBucketDialog() {
    useEditBucketDialogStore.getState().open({ bucketId });
  }

  return (
    <Main>
      <div className="flex items-baseline justify-between">
        <Heading className="capitalize">{bucket.name}</Heading>
        <div className="flex gap-x-2">
          <Button variant="outline" onClick={handleOpenWithdrawDialog}>
            <IconMinus />
            Withdraw
          </Button>
          <Button variant="outline" onClick={handleOpenEditBucketDialog}>
            <IconPencil />
            Edit
          </Button>
        </div>
      </div>

      <Tabs defaultValue="allocations">
        <TabsList>
          <TabsTrigger value="allocations">Allocations</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
        </TabsList>
        <TabsContent value="allocations">
          <DataTable
            columns={getAllocationColumns({ omit: "bucket" })}
            data={allocations}
            initialSorting={[{ id: "date", desc: true }]}
          />
        </TabsContent>
        <TabsContent value="withdrawals">
          <DataTable
            columns={WITHDRAWAL_COLUMNS}
            data={withdrawals}
            initialSorting={[{ id: "date", desc: true }]}
          />
        </TabsContent>
      </Tabs>
    </Main>
  );
}
