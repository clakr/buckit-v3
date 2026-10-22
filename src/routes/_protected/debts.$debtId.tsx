import { IconPencil, IconPlus } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { RouteRetryButton } from "#/components/route-retry-button";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { loadOrThrowRouteNotFound } from "#/lib/errors";
import { formatPageTitle } from "#/lib/utils";
import { DebtLedgerTable } from "#/modules/debts/components/debt-ledger-table";
import { useEditDebtDialogStore } from "#/modules/debts/components/edit-debt-dialog";
import { debtQueryOption } from "#/modules/debts/query-options";
import { useLogRepaymentDialogStore } from "#/modules/repayments/components/log-repayment-dialog";

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
    <Main>
      <Heading className="capitalize">Debt</Heading>

      <StateTemplate
        state="loading"
        title="Loading debt..."
        description="Fetching debt details and history..."
      />
    </Main>
  ),
  notFoundComponent: () => (
    <Main>
      <Heading className="capitalize">Debt</Heading>
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
    </Main>
  ),
  errorComponent: () => (
    <Main>
      <Heading className="capitalize">Debt</Heading>
      <StateTemplate
        state="error"
        title="Could not load debt"
        description="We weren't able to retrieve this debt. Please check your connection and try again."
        content={<RouteRetryButton />}
      />
    </Main>
  ),
  component: RouteComponent,
});

function RouteComponent() {
  const { debtQueryOptions } = Route.useRouteContext();

  const { data: debt } = useSuspenseQuery(debtQueryOptions);

  function handleOpenLogRepaymentDialog() {
    useLogRepaymentDialogStore.getState().open({ debtId: debt.id });
  }

  function handleOpenEditDebtDialog() {
    useEditDebtDialogStore.getState().open({ debtId: debt.id });
  }

  return (
    <Main>
      <div className="flex items-baseline justify-between">
        <Heading className="capitalize">{debt.name}</Heading>
        <div className="flex gap-x-2">
          <Button variant="outline" onClick={handleOpenEditDebtDialog}>
            <IconPencil />
            Edit
          </Button>
          <Button onClick={handleOpenLogRepaymentDialog}>
            <IconPlus />
            Log Repayment
          </Button>
        </div>
      </div>

      <DebtLedgerTable debt={debt} onLogRepayment={handleOpenLogRepaymentDialog} />
    </Main>
  );
}
