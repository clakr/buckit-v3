import { IconBuildingBank, IconCash, IconReceipt } from "@tabler/icons-react";

import type { BankAccount } from "#/db/schema";

import { Badge } from "#/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { currencyCodec } from "#/lib/codecs";
import { formatCurrency, formatDate } from "#/lib/utils";
import { RepaymentActionsDropdownMenu } from "#/modules/repayments/components/repayment-actions-dropdown-menu";
import { getRepaymentAmount, getRepaymentDate } from "#/modules/repayments/utils";

import type { getDebt } from "../functions";

import { getDebtOutstanding, getDebtStatus } from "../utils";
import { DebtOutstandingMeter } from "./debt-outstanding-meter";
import { DebtStatusBadge } from "./debt-status-badge";

type Props = {
  debt: NonNullable<Awaited<ReturnType<typeof getDebt>>>;
};

export function DebtLedgerTable({ debt }: Props) {
  function formatDebtAmount(value: number) {
    return formatCurrency(currencyCodec.encode(value), { currency: debt.currency });
  }

  const outstanding = getDebtOutstanding({ amount: debt.amount, repayments: debt.repayments });
  const repaid = debt.amount - outstanding;
  const progress = debt.amount === 0 ? 0 : (repaid / debt.amount) * 100;

  // `getDebt` returns repayments oldest first, so the running balance reads
  // top-to-bottom like a statement.
  let balance = debt.amount;
  const entries = debt.repayments.map((repayment) => {
    const amount = getRepaymentAmount(repayment);
    balance -= amount;

    return {
      id: repayment.id,
      date: getRepaymentDate(repayment) ?? repayment.createdAt,
      amount,
      note: repayment.transaction?.note ?? repayment.note,
      bankAccount: repayment.transaction?.bankAccount ?? null,
      balance,
    };
  });

  const hasRepayments = entries.length > 0;

  return (
    <div className="flex flex-col gap-y-3">
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <DebtStatusBadge status={getDebtStatus(debt)} />
        <span className="capitalize">{debt.direction}</span>·<span>{debt.currency}</span>·
        <span>Recorded {formatDate(debt.date)}</span>
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Entry</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-end">Change</TableHead>
            <TableHead className="text-end">Outstanding</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="bg-muted/40">
            <TableCell>{formatDate(debt.date)}</TableCell>
            <TableCell className="font-medium">
              {debt.direction === "receivable"
                ? `Lent to ${debt.name}`
                : `Borrowed from ${debt.name}`}
              {debt.note ? (
                <span className="ms-2 font-normal text-muted-foreground">“{debt.note}”</span>
              ) : null}
            </TableCell>
            <TableCell>
              {debt.direction === "receivable" ? (
                <AccountBadge bankAccount={debt.originatingTransaction?.bankAccount ?? null} />
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="text-end tabular-nums">
              +{formatDebtAmount(debt.amount)}
            </TableCell>
            <TableCell className="text-end font-medium tabular-nums">
              {formatDebtAmount(debt.amount)}
            </TableCell>
            <TableCell />
          </TableRow>

          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{formatDate(entry.date)}</TableCell>
              <TableCell>
                Repayment
                {entry.note ? (
                  <span className="ms-2 text-muted-foreground">“{entry.note}”</span>
                ) : null}
              </TableCell>
              <TableCell>
                <AccountBadge bankAccount={entry.bankAccount} />
              </TableCell>
              <TableCell className="text-end text-emerald-600 tabular-nums">
                −{formatDebtAmount(entry.amount)}
              </TableCell>
              {/* Past zero there's nothing outstanding; the footer meter shows the overpayment. */}
              <TableCell className="text-end font-medium tabular-nums">
                {formatDebtAmount(Math.max(entry.balance, 0))}
              </TableCell>
              <TableCell className="text-end">
                <RepaymentActionsDropdownMenu debt={debt} repaymentId={entry.id} />
              </TableCell>
            </TableRow>
          ))}

          {hasRepayments ? null : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="px-0 py-2">
                <Empty className="min-h-[15vh] border border-dashed">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <IconReceipt />
                    </EmptyMedia>
                    <EmptyTitle>No repayments yet.</EmptyTitle>
                    <EmptyDescription>
                      Log a repayment to start paying down this debt.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {hasRepayments ? (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3}>
                Total repaid across {entries.length} repayment{entries.length === 1 ? "" : "s"} (
                {progress.toFixed(0)}%)
              </TableCell>
              <TableCell className="text-end tabular-nums">−{formatDebtAmount(repaid)}</TableCell>
              <TableCell className="text-end font-semibold tabular-nums">
                <DebtOutstandingMeter
                  direction={debt.direction}
                  amount={debt.amount}
                  outstanding={outstanding}
                  repaymentsCount={entries.length}
                  formatDebtAmount={formatDebtAmount}
                />
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
    </div>
  );
}

function AccountBadge({ bankAccount }: { bankAccount: Pick<BankAccount, "name"> | null }) {
  if (!bankAccount) {
    return (
      <Badge variant="ghost" className="text-muted-foreground">
        <IconCash />
        Off-app
      </Badge>
    );
  }

  return (
    <Badge variant="outline">
      <IconBuildingBank />
      {bankAccount.name}
    </Badge>
  );
}
