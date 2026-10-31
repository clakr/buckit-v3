import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { PrototypeSwitcher } from "#/components/prototype-switcher";
import { RouteRetryButton } from "#/components/route-retry-button";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { loadOrThrowRouteNotFound } from "#/lib/errors";
import { DEFAULT_LEDGER_PAGE } from "#/lib/ledger-page";
import { formatPageTitle } from "#/lib/utils";
import { BucketDetailActions } from "#/modules/buckets/components/bucket-detail-actions";
import { BucketLedgerTable } from "#/modules/buckets/components/bucket-ledger-table";
import { bucketLedgerQueryOption, bucketQueryOption } from "#/modules/buckets/query-options";
import {
  applyPrototypeMock,
  PROTOTYPE_MOCKS,
  PROTOTYPE_VARIANT_NAMES,
  PROTOTYPE_VARIANTS,
  PrototypeMockBar,
  VariantA,
  VariantB,
  VariantC,
  type PrototypeMock,
  type PrototypeVariant,
} from "#/modules/goals/components/prototype-bucket-goal-variants";
import { bucketGoalQueryOption } from "#/modules/goals/query-options";
import { withdrawalSourcesQueryOption } from "#/modules/withdrawals/query-options";

export const Route = createFileRoute("/_protected/buckets/$bucketId")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { variant?: PrototypeVariant; mock?: PrototypeMock } => ({
    variant: PROTOTYPE_VARIANTS.includes(search.variant as PrototypeVariant)
      ? (search.variant as PrototypeVariant)
      : undefined,
    mock: PROTOTYPE_MOCKS.includes(search.mock as PrototypeMock)
      ? (search.mock as PrototypeMock)
      : undefined,
  }),
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
  const { variant = "A", mock } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { bucketQueryOptions, withdrawalSourcesQueryOptions, goalQueryOptions } =
    Route.useRouteContext();

  const { data: bucket } = useSuspenseQuery(bucketQueryOptions);
  const { data: withdrawalSources } = useSuspenseQuery(withdrawalSourcesQueryOptions);
  const { data: realGoal } = useSuspenseQuery(goalQueryOptions);

  const goal = applyPrototypeMock(realGoal, mock, bucketId);
  const holdsMoney = withdrawalSources.length > 0;

  const variantProps = {
    name: bucket.name,
    bucketId,
    goal,
    // Variants render their own Add Goal affordance, so the overflow menu's copy is hidden.
    bucketActions: <BucketDetailActions bucketId={bucketId} hasGoal holdsMoney={holdsMoney} />,
    ledger: <BucketLedgerTable bucketId={bucketId} />,
  };

  return (
    <>
      {variant === "A" && <VariantA {...variantProps} />}
      {variant === "B" && <VariantB {...variantProps} />}
      {variant === "C" && <VariantC {...variantProps} />}
      <PrototypeSwitcher
        variants={PROTOTYPE_VARIANTS}
        current={variant}
        names={PROTOTYPE_VARIANT_NAMES}
        onChange={(next) =>
          navigate({ search: (previous) => ({ ...previous, variant: next }), replace: true })
        }
      />
      <PrototypeMockBar
        current={mock}
        onChange={(next) =>
          navigate({ search: (previous) => ({ ...previous, mock: next }), replace: true })
        }
      />
    </>
  );
}
