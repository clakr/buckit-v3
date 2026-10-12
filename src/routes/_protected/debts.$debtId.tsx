import { IconPencil, IconPlus } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { DebtLedgerTable } from "#/modules/debts/components/debt-ledger-table";
import { useEditDebtDialogStore } from "#/modules/debts/components/edit-debt-dialog";
import { debtQueryOption } from "#/modules/debts/query-options";
import { useLogRepaymentDialogStore } from "#/modules/repayments/components/log-repayment-dialog";

class DebtNotFoundError extends Error {
  constructor() {
    super();
  }
}

export const Route = createFileRoute("/_protected/debts/$debtId")({
  context: ({ params }) => ({
    debtQueryOptions: debtQueryOption(params.debtId),
  }),
  loader: async ({ context: { queryClient, debtQueryOptions } }) => {
    return queryClient.query(debtQueryOptions);
  },
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
  errorComponent: ({ error, reset }) => {
    if (error instanceof DebtNotFoundError)
      return (
        <Main>
          <Heading className="capitalize">Debt</Heading>
          <StateTemplate
            state="error"
            title="Debt not found"
            description="This debt doesn't exist or may have been deleted."
            content={
              <Button variant="secondary" render={<Link to=".." />}>
                Go back to debts
              </Button>
            }
          />
        </Main>
      );

    return (
      <Main>
        <Heading className="capitalize">Debt</Heading>
        <StateTemplate
          state="error"
          title="Could not load debt"
          description="We weren't able to retrieve this debt. Please check your connection and try again."
          content={<Button onClick={reset}>Retry</Button>}
        />
      </Main>
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { debtQueryOptions } = Route.useRouteContext();

  const { data: debt } = useSuspenseQuery(debtQueryOptions);
  if (!debt) throw new DebtNotFoundError();

  function handleOpenLogRepaymentDialog() {
    const state = useLogRepaymentDialogStore.getState();

    state.setDebt(debt!);
    state.openDialog();
  }

  function handleOpenEditDebtDialog() {
    const state = useEditDebtDialogStore.getState();

    state.setDebtId(debt!.id);
    state.openDialog();
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

      {debt.note ? <p className="whitespace-pre-wrap text-muted-foreground">{debt.note}</p> : null}

      <DebtLedgerTable debt={debt} />
    </Main>
  );
}
