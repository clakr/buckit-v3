import { IconMinus, IconPencil, IconPlus, IconTarget } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { RouteRetryButton } from "#/components/route-retry-button";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { DataTable } from "#/components/ui/data-table";
import { DrawerTrigger } from "#/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { MODULE_ICONS } from "#/lib/constants";
import { loadOrThrowRouteNotFound } from "#/lib/errors";
import { formatPageTitle } from "#/lib/utils";
import { getAllocationColumns } from "#/modules/allocations/columns";
import { logAllocationDrawerHandle } from "#/modules/allocations/components/log-allocation-drawer";
import { allocationsQueryOption } from "#/modules/allocations/query-options";
import { editBucketDrawerHandle } from "#/modules/buckets/components/edit-bucket-drawer";
import { bucketQueryOption } from "#/modules/buckets/query-options";
import { addGoalDrawerHandle } from "#/modules/goals/components/add-goal-drawer";
import { BucketGoalCard } from "#/modules/goals/components/bucket-goal-card";
import { bucketGoalQueryOption } from "#/modules/goals/query-options";
import { WITHDRAWAL_COLUMNS } from "#/modules/withdrawals/columns";
import { withdrawDrawerHandle } from "#/modules/withdrawals/components/withdraw-drawer";
import {
  withdrawalSourcesQueryOption,
  withdrawalsQueryOption,
} from "#/modules/withdrawals/query-options";

export const Route = createFileRoute("/_protected/buckets/$bucketId")({
  context: ({ params }) => ({
    bucketQueryOptions: bucketQueryOption(params.bucketId),
    allocationsQueryOptions: allocationsQueryOption({ bucketId: params.bucketId }),
    withdrawalsQueryOptions: withdrawalsQueryOption(params.bucketId),
    withdrawalSourcesQueryOptions: withdrawalSourcesQueryOption(params.bucketId),
    goalQueryOptions: bucketGoalQueryOption(params.bucketId),
  }),
  loader: async ({
    context: {
      queryClient,
      bucketQueryOptions,
      allocationsQueryOptions,
      withdrawalsQueryOptions,
      withdrawalSourcesQueryOptions,
      goalQueryOptions,
    },
  }) => {
    const [bucket] = await loadOrThrowRouteNotFound(
      Promise.all([
        queryClient.query(bucketQueryOptions),
        queryClient.query(allocationsQueryOptions),
        queryClient.query(withdrawalsQueryOptions),
        queryClient.query(withdrawalSourcesQueryOptions),
        queryClient.query(goalQueryOptions),
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
  const {
    bucketQueryOptions,
    allocationsQueryOptions,
    withdrawalsQueryOptions,
    withdrawalSourcesQueryOptions,
    goalQueryOptions,
  } = Route.useRouteContext();

  const { data: bucket } = useSuspenseQuery(bucketQueryOptions);
  const { data: allocations } = useSuspenseQuery(allocationsQueryOptions);
  const { data: withdrawals } = useSuspenseQuery(withdrawalsQueryOptions);
  const { data: withdrawalSources } = useSuspenseQuery(withdrawalSourcesQueryOptions);
  const { data: goal } = useSuspenseQuery(goalQueryOptions);

  const holdsMoney = withdrawalSources.length > 0;

  return (
    <Main>
      <div className="flex items-baseline justify-between">
        <Heading className="capitalize">{bucket.name}</Heading>
        <div className="flex gap-x-2">
          {goal ? null : (
            <DrawerTrigger
              handle={addGoalDrawerHandle}
              payload={{ bucketId }}
              render={<Button variant="outline" />}
            >
              <IconTarget />
              Add Goal
            </DrawerTrigger>
          )}
          <Tooltip disabled={holdsMoney}>
            <TooltipTrigger
              render={
                <DrawerTrigger
                  handle={withdrawDrawerHandle}
                  payload={{ bucketId }}
                  disabled={!holdsMoney}
                  render={
                    <Button
                      variant="outline"
                      focusableWhenDisabled
                      className="aria-disabled:opacity-50"
                    />
                  }
                />
              }
            >
              <IconMinus />
              Withdraw
            </TooltipTrigger>
            <TooltipContent>Allocate money into this bucket first</TooltipContent>
          </Tooltip>
          <DrawerTrigger
            handle={editBucketDrawerHandle}
            payload={{ bucketId }}
            render={<Button variant="outline" />}
          >
            <IconPencil />
            Edit
          </DrawerTrigger>
        </div>
      </div>

      {goal ? <BucketGoalCard goal={goal} /> : null}

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
            emptyState={
              <StateTemplate
                state="empty"
                title="No allocations yet."
                description="Move money into this bucket from a bank account."
                icon={<MODULE_ICONS.buckets />}
                content={
                  <DrawerTrigger
                    handle={logAllocationDrawerHandle}
                    payload={{ start: { from: "bucket", bucketId } }}
                    render={<Button />}
                  >
                    <IconPlus />
                    Allocate Money
                  </DrawerTrigger>
                }
              />
            }
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
