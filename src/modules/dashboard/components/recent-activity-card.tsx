import { Link } from "@tanstack/react-router";

import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { MODULE_ICONS } from "#/lib/constants";
import { formatMoney } from "#/lib/money";
import { formatDate } from "#/lib/utils";

import type { CurrencySummary, RecentMovement } from "../utils";

type Props = {
  summary: CurrencySummary;
};

const MOVEMENT_LABELS = {
  income: "Income",
  expense: "Expense",
  allocation: "Allocation",
  repayment: "Repayment",
} satisfies Record<RecentMovement["kind"], string>;

const FLOW_SIGNS = { in: "+", out: "−" } as const;

function MovementOwnerLink({ owner }: Pick<RecentMovement, "owner">) {
  switch (owner.kind) {
    case "bankAccount":
      return (
        <Link
          to="/accounts/$accountId"
          params={{ accountId: owner.id }}
          className="hover:underline"
        >
          {owner.name}
        </Link>
      );
    case "bucket":
      return (
        <Link to="/buckets/$bucketId" params={{ bucketId: owner.id }} className="hover:underline">
          {owner.name}
        </Link>
      );
    case "debt":
      return (
        <Link to="/debts/$debtId" params={{ debtId: owner.id }} className="hover:underline">
          {owner.name}
        </Link>
      );
  }
}

export function RecentActivityCard({ summary }: Props) {
  const { currency, recentMovements } = summary;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>
          Latest {currency} Transactions, Allocations and Repayments
        </CardDescription>
      </CardHeader>
      <CardContent>
        {recentMovements.length > 0 ? (
          <ul className="divide-y">
            {recentMovements.map((movement) => (
              <li key={movement.key} className="flex items-center justify-between gap-x-3 py-3">
                <div className="flex min-w-0 flex-col gap-y-1">
                  <span className="truncate font-semibold">
                    {MOVEMENT_LABELS[movement.kind]} ·{" "}
                    <span className="font-normal">
                      <MovementOwnerLink owner={movement.owner} />
                    </span>
                  </span>
                  <span className="text-sm text-muted-foreground">{formatDate(movement.date)}</span>
                </div>
                <span className="shrink-0 font-semibold tabular-nums">
                  {movement.flow ? FLOW_SIGNS[movement.flow] : null}
                  {formatMoney(movement.amount, currency)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <StateTemplate
            state="empty"
            icon={<MODULE_ICONS.accounts />}
            title={`No ${currency} activity yet`}
            description={`Log a Transaction on a ${currency} Account to see it here.`}
            content={
              <Button nativeButton={false} render={<Link to="/accounts" />}>
                Go to Accounts
              </Button>
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
