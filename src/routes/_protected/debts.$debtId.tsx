import type { ReactNode } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { InsetCard, InsetCardContent, InsetCardTitle } from "#/components/inset-card";
import { Main } from "#/components/main";
import { RouteRetryButton } from "#/components/route-retry-button";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { loadOrThrowRouteNotFound } from "#/lib/errors";
import { formatDate, formatPageTitle } from "#/lib/utils";
import { DebtDetailActions } from "#/modules/debts/components/debt-detail-actions";
import { DebtLedgerTable } from "#/modules/debts/components/debt-ledger-table";
import { DebtPayoff } from "#/modules/debts/components/debt-payoff";
import { DebtStatusBadge } from "#/modules/debts/components/debt-status-badge";
import { debtQueryOption } from "#/modules/debts/query-options";

export const Route = createFileRoute("/_protected/debts/$debtId")({
  context: ({ params }) => ({
    debtQueryOptions: debtQueryOption(params.debtId),
  }),
  loader: async ({ context: { queryClient, debtQueryOptions } }) => {
    const debt = await loadOrThrowRouteNotFound(queryClient.query(debtQueryOptions));

    return { name: debt.name };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: formatPageTitle(loaderData?.name ?? "Debt") }],
  }),
  pendingComponent: () => (
    <DebtStateFrame>
      <StateTemplate
        state="loading"
        title="Loading debt..."
        description="Fetching debt details and history..."
      />
    </DebtStateFrame>
  ),
  notFoundComponent: () => (
    <DebtStateFrame>
      <StateTemplate
        state="error"
        title="Debt not found"
        description="This debt doesn't exist or may have been deleted."
        content={
          <Button variant="secondary" nativeButton={false} render={<Link to="/debts" />}>
            Go back to debts
          </Button>
        }
      />
    </DebtStateFrame>
  ),
  errorComponent: () => (
    <DebtStateFrame>
      <StateTemplate
        state="error"
        title="Could not load debt"
        description="We couldn't load this debt. Check your connection and try again."
        content={<RouteRetryButton />}
      />
    </DebtStateFrame>
  ),
  component: RouteComponent,
});

function DebtStateFrame({ children }: { children: ReactNode }) {
  return (
    <Main>
      <InsetCard>
        <InsetCardTitle as="h1">Debt</InsetCardTitle>
        <InsetCardContent>{children}</InsetCardContent>
      </InsetCard>
    </Main>
  );
}

function RouteComponent() {
  const { debtQueryOptions } = Route.useRouteContext();

  const { data: debt } = useSuspenseQuery(debtQueryOptions);

  return (
    <Main>
      <InsetCard>
        <InsetCardTitle
          as="h1"
          subtitle={
            <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <DebtStatusBadge status={debt.status} />
              {debt.direction === "receivable" ? "Owed to you" : "You owe"} · {debt.currency} ·
              Recorded {formatDate(debt.date)}
            </span>
          }
          action={<DebtDetailActions debt={debt} />}
        >
          {debt.name}
        </InsetCardTitle>

        <InsetCardContent cardClassName="gap-0 py-0" className="gap-y-0 px-0">
          <DebtPayoff debt={debt} />
          <DebtLedgerTable debt={debt} />
        </InsetCardContent>
      </InsetCard>
    </Main>
  );
}
