import { Link } from "@tanstack/react-router";

import { InsetCard, InsetCardContent } from "#/components/inset-card";
import { StateTemplate } from "#/components/state-template";
import { CardDescription, CardTitle } from "#/components/ui/card";
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
    <InsetCard>
      <InsetCardContent>
        <div className="flex flex-col gap-y-1">
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest {currency} Transactions, Allocations and Repayments
          </CardDescription>
        </div>

        {recentMovements.length > 0 ? (
          <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
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
            description={`Transactions, Allocations and Repayments in ${currency} will show up here.`}
          />
        )}
      </InsetCardContent>
    </InsetCard>
  );
}
