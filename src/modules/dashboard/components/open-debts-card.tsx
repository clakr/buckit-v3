import { Link } from "@tanstack/react-router";

import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { MODULE_ICONS } from "#/lib/constants";
import { formatMoney } from "#/lib/money";
import { DebtDirectionBadge } from "#/modules/debts/components/debt-direction-badge";
import { DebtProgressRing } from "#/modules/debts/components/debt-progress-ring";

import type { CurrencySummary } from "../utils";

type Props = {
  summary: CurrencySummary;
};

const VISIBLE_DEBTS = 4;

export function OpenDebtsCard({ summary }: Props) {
  const { currency, openDebts } = summary;
  const visibleDebts = openDebts.slice(0, VISIBLE_DEBTS);

  function formatDebtAmount(value: number) {
    return formatMoney(value, currency);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Debts</CardTitle>
        <CardDescription>Open {currency} Debts, largest Outstanding first</CardDescription>
      </CardHeader>
      <CardContent>
        {visibleDebts.length > 0 ? (
          <ul className="divide-y">
            {visibleDebts.map((debt) => (
              <li key={debt.id}>
                <Link
                  to="/debts/$debtId"
                  params={{ debtId: debt.id }}
                  className="flex items-center justify-between gap-x-3 py-3 hover:bg-muted/50"
                >
                  <div className="flex min-w-0 flex-col items-start gap-y-1">
                    <span className="max-w-full truncate font-semibold">{debt.name}</span>
                    <DebtDirectionBadge direction={debt.direction} />
                  </div>
                  <DebtProgressRing
                    direction={debt.direction}
                    amount={debt.amount}
                    outstanding={debt.outstanding}
                    repaid={debt.repaid}
                    formatDebtAmount={formatDebtAmount}
                  />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <StateTemplate
            state="empty"
            icon={<MODULE_ICONS.debts />}
            title={`No open ${currency} Debts`}
            description={`Record a Debt in ${currency} to track what you owe or are owed.`}
            content={
              <Button nativeButton={false} render={<Link to="/debts" />}>
                Go to Debts
              </Button>
            }
          />
        )}
      </CardContent>
      {openDebts.length > VISIBLE_DEBTS ? (
        <CardFooter>
          <Button variant="link" nativeButton={false} render={<Link to="/debts" />}>
            View all {openDebts.length} open Debts
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
