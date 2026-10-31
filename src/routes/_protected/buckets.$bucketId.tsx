import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { RouteRetryButton } from "#/components/route-retry-button";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { loadOrThrowRouteNotFound } from "#/lib/errors";
import { DEFAULT_LEDGER_PAGE } from "#/lib/ledger-page";
import { formatPageTitle } from "#/lib/utils";
import { BucketDetailActions } from "#/modules/buckets/components/bucket-detail-actions";
import { BucketLedgerTable } from "#/modules/buckets/components/bucket-ledger-table";
import { bucketLedgerQueryOption, bucketQueryOption } from "#/modules/buckets/query-options";
import { BucketGoalCard } from "#/modules/goals/components/bucket-goal-card";
import { bucketGoalQueryOption } from "#/modules/goals/query-options";
import { withdrawalSourcesQueryOption } from "#/modules/withdrawals/query-options";

export const Route = createFileRoute("/_protected/buckets/$bucketId")({
  context: ({ params }) => ({
    bucketQueryOptions: bucketQueryOption(params.bucketId),
    bucketLedgerQueryOptions: bucketLedgerQueryOption(params.bucketId, DEFAULT_LEDGER_PAGE),
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
  const { bucketQueryOptions, withdrawalSourcesQueryOptions, goalQueryOptions } =
    Route.useRouteContext();

  const { data: bucket } = useSuspenseQuery(bucketQueryOptions);
  const { data: withdrawalSources } = useSuspenseQuery(withdrawalSourcesQueryOptions);
  const { data: goal } = useSuspenseQuery(goalQueryOptions);

  const holdsMoney = withdrawalSources.length > 0;

  return (
    <Main>
      <div className="flex items-baseline justify-between">
        <Heading className="capitalize">{bucket.name}</Heading>
        <BucketDetailActions
          bucketId={bucketId}
          goalId={goal?.id ?? null}
          holdsMoney={holdsMoney}
        />
      </div>

      {goal ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <aside className="lg:sticky lg:top-4 lg:order-2">
            <BucketGoalCard goal={goal} />
          </aside>
          <div className="min-w-0 lg:order-1">
            <BucketLedgerTable bucketId={bucketId} goalCurrency={goal.currency} />
          </div>
        </div>
      ) : (
        <BucketLedgerTable bucketId={bucketId} />
      )}
    </Main>
  );
}
