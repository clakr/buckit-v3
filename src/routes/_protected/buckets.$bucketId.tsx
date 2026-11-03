import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTransition, type ReactNode } from "react";

import { Heading } from "#/components/heading";
import {
  InsetCard,
  InsetCardContent,
  InsetCardFooter,
  InsetCardTitle,
} from "#/components/inset-card";
import { Main } from "#/components/main";
import { Pager } from "#/components/pager";
import { RouteRetryButton } from "#/components/route-retry-button";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { loadOrThrowRouteNotFound } from "#/lib/errors";
import { ledgerPageSearchSchema } from "#/lib/ledger-page";
import { PAGE_SIZES } from "#/lib/paging";
import { cn, formatPageTitle } from "#/lib/utils";
import { BucketDetailActions } from "#/modules/buckets/components/bucket-detail-actions";
import { BucketHoldings } from "#/modules/buckets/components/bucket-holdings";
import { BucketLedgerTable } from "#/modules/buckets/components/bucket-ledger-table";
import { bucketLedgerQueryOption, bucketQueryOption } from "#/modules/buckets/query-options";
import { BucketGoalCard } from "#/modules/goals/components/bucket-goal-card";
import { bucketGoalQueryOption } from "#/modules/goals/query-options";

export const Route = createFileRoute("/_protected/buckets/$bucketId")({
  validateSearch: ledgerPageSearchSchema,
  loaderDeps: ({ search: { pageIndex, pageSize } }) => ({ pageIndex, pageSize }),
  context: ({ params, deps }) => ({
    bucketQueryOptions: bucketQueryOption(params.bucketId),
    bucketLedgerQueryOptions: bucketLedgerQueryOption(params.bucketId, deps),
    goalQueryOptions: bucketGoalQueryOption(params.bucketId),
  }),
  loader: async ({
    context: { queryClient, bucketQueryOptions, bucketLedgerQueryOptions, goalQueryOptions },
  }) => {
    const [bucket] = await loadOrThrowRouteNotFound(
      Promise.all([
        queryClient.query(bucketQueryOptions),
        queryClient.query(bucketLedgerQueryOptions),
        queryClient.query(goalQueryOptions),
      ]),
    );

    return { name: bucket.name };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: formatPageTitle(loaderData?.name ?? "Bucket") }],
  }),
  pendingComponent: () => (
    <BucketStateFrame>
      <StateTemplate
        state="loading"
        title="Loading bucket..."
        description="Fetching bucket details and history..."
      />
    </BucketStateFrame>
  ),
  notFoundComponent: () => (
    <BucketStateFrame>
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
    </BucketStateFrame>
  ),
  errorComponent: () => (
    <BucketStateFrame>
      <StateTemplate
        state="error"
        title="Could not load bucket"
        description="We weren't able to retrieve this bucket. Please check your connection and try again."
        content={<RouteRetryButton />}
      />
    </BucketStateFrame>
  ),
  component: RouteComponent,
});

function BucketStateFrame({ children }: { children: ReactNode }) {
  return (
    <Main>
      <Heading>Bucket</Heading>
      <InsetCard>
        <InsetCardTitle>History</InsetCardTitle>
        <InsetCardContent>{children}</InsetCardContent>
      </InsetCard>
    </Main>
  );
}

function RouteComponent() {
  const { bucketId } = Route.useParams();
  const { bucketQueryOptions, goalQueryOptions } = Route.useRouteContext();
  const page = Route.useSearch();
  const navigate = Route.useNavigate();
  const [isPending, startTransition] = useTransition();

  const { data: bucket } = useSuspenseQuery(bucketQueryOptions);
  const { data: goal } = useSuspenseQuery(goalQueryOptions);
  const { data: ledgerPage } = useSuspenseQuery(bucketLedgerQueryOption(bucketId, page));
  const { pageIndex, pageSize, pageCount, total } = ledgerPage;

  return (
    <Main>
      <div className="flex items-baseline justify-between">
        <Heading>{bucket.name}</Heading>
        <BucketDetailActions
          bucketId={bucketId}
          goalId={goal?.id ?? null}
          holdsMoney={bucket.holdings.some(({ amount }) => amount > 0)}
        />
      </div>

      <div
        className={cn("grid gap-4", goal && "lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start")}
      >
        {goal ? (
          <aside className="lg:sticky lg:top-4 lg:order-2">
            <BucketGoalCard goal={goal} />
          </aside>
        ) : null}

        <InsetCard className="min-w-0 lg:order-1">
          <InsetCardTitle subtitle={`${total} ${total === 1 ? "entry" : "entries"}`}>
            History
          </InsetCardTitle>

          <InsetCardContent cardClassName="gap-0 py-0" className="gap-y-0 px-0">
            <BucketHoldings bucket={bucket} goalCurrency={goal?.currency} />
            <BucketLedgerTable bucketId={bucketId} ledgerPage={ledgerPage} isPending={isPending} />
          </InsetCardContent>

          {total > PAGE_SIZES[0] ? (
            <InsetCardFooter>
              <Pager
                paging={{ pageIndex, pageSize, pageCount, total }}
                onPageChange={(nextPageIndex) =>
                  startTransition(async () => {
                    await navigate({ search: { pageIndex: nextPageIndex, pageSize } });
                  })
                }
                onPageSizeChange={(nextPageSize) =>
                  startTransition(async () => {
                    await navigate({ search: { pageIndex: 0, pageSize: nextPageSize } });
                  })
                }
              />
            </InsetCardFooter>
          ) : null}
        </InsetCard>
      </div>
    </Main>
  );
}
