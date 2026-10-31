import { IconPlus } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { InsetCard, InsetCardContent, InsetCardFooter } from "#/components/inset-card";
import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { CardDescription, CardTitle } from "#/components/ui/card";
import { DrawerTrigger } from "#/components/ui/drawer";
import { MODULE_ICONS } from "#/lib/constants";
import { formatMoney } from "#/lib/money";
import { DebtDirectionBadge } from "#/modules/debts/components/debt-direction-badge";
import { DebtProgressRing } from "#/modules/debts/components/debt-progress-ring";
import { recordDebtDrawerHandle } from "#/modules/debts/components/record-debt-drawer";

import type { CurrencySummary } from "../utils";

type Props = {
  summary: CurrencySummary;
};

const VISIBLE_DEBTS = 5;

export function OpenDebtsCard({ summary }: Props) {
  const { currency, openDebts } = summary;
  const visibleDebts = openDebts.slice(0, VISIBLE_DEBTS);

  function formatDebtAmount(value: number) {
    return formatMoney(value, currency);
  }

  return (
    <InsetCard>
      <InsetCardContent>
        <div className="flex flex-col gap-y-1">
          <CardTitle>Debts</CardTitle>
          <CardDescription>Open {currency} Debts, largest Outstanding first</CardDescription>
        </div>

        {visibleDebts.length > 0 ? (
          <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
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
          />
        )}
        {openDebts.length > VISIBLE_DEBTS ? (
          <p className="shrink-0 text-center text-muted-foreground">
            Showing {VISIBLE_DEBTS} of {openDebts.length} open Debts
          </p>
        ) : null}
      </InsetCardContent>
      <InsetCardFooter>
        <DrawerTrigger
          handle={recordDebtDrawerHandle}
          payload={{ currency }}
          render={<Button variant="outline" />}
        >
          <IconPlus />
          Record Debt
        </DrawerTrigger>
        <Button nativeButton={false} render={<Link to="/debts" />}>
          <MODULE_ICONS.debts />
          View All
        </Button>
      </InsetCardFooter>
    </InsetCard>
  );
}
