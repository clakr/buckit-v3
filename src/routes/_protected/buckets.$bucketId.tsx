import { IconMinus, IconPencil, IconPlus, IconTarget } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { RouteRetryButton } from "#/components/route-retry-button";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { DrawerTrigger } from "#/components/ui/drawer";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { loadOrThrowRouteNotFound } from "#/lib/errors";
import { formatPageTitle } from "#/lib/utils";
import { logAllocationDrawerHandle } from "#/modules/allocations/components/log-allocation-drawer";
import { BucketLedgerTable } from "#/modules/buckets/components/bucket-ledger-table";
import { editBucketDrawerHandle } from "#/modules/buckets/components/edit-bucket-drawer";
import { bucketLedgerQueryOption, bucketQueryOption } from "#/modules/buckets/query-options";
import { addGoalDrawerHandle } from "#/modules/goals/components/add-goal-drawer";
import { BucketGoalCard } from "#/modules/goals/components/bucket-goal-card";
import { bucketGoalQueryOption } from "#/modules/goals/query-options";
import { withdrawDrawerHandle } from "#/modules/withdrawals/components/withdraw-drawer";
import { withdrawalSourcesQueryOption } from "#/modules/withdrawals/query-options";

export const Route = createFileRoute("/_protected/buckets/$bucketId")({
  context: ({ params }) => ({
    bucketQueryOptions: bucketQueryOption(params.bucketId),
    bucketLedgerQueryOptions: bucketLedgerQueryOption(params.bucketId),
    withdrawalSourcesQueryOptions: withdrawalSourcesQueryOption(params.bucketId),
    goalQueryOptions: bucketGoalQueryOption(params.bucketId),
  }),
  loader: async ({
    context: {
      queryClient,
      bucketQueryOptions,
      bucketLedgerQueryOptions,
      withdrawalSourcesQueryOptions,
      goalQueryOptions,
    },
  }) => {
    const [bucket] = await loadOrThrowRouteNotFound(
      Promise.all([
        queryClient.query(bucketQueryOptions),
        queryClient.query(bucketLedgerQueryOptions),
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
    bucketLedgerQueryOptions,
    withdrawalSourcesQueryOptions,
    goalQueryOptions,
  } = Route.useRouteContext();

  const { data: bucket } = useSuspenseQuery(bucketQueryOptions);
  const { data: bucketLedger } = useSuspenseQuery(bucketLedgerQueryOptions);
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
          <DrawerTrigger
            handle={logAllocationDrawerHandle}
            payload={{ start: { from: "bucket", bucketId } }}
            render={<Button />}
          >
            <IconPlus />
            Allocate Money
          </DrawerTrigger>
        </div>
      </div>

      {goal ? <BucketGoalCard goal={goal} /> : null}

      <BucketLedgerTable bucketId={bucketId} bucketLedger={bucketLedger} />
    </Main>
  );
}
