import { IconPlus, IconReceipt } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import type { BankAccount } from "#/db/schema";

import { Button } from "#/components/ui/button";
import {
  Empty,
  EmptyContent,
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
import { formatMoney } from "#/lib/money";
import { cn, formatDate } from "#/lib/utils";
import { RepaymentActionsDropdownMenu } from "#/modules/repayments/components/repayment-actions-dropdown-menu";

import type { getDebt } from "../functions";

import { DebtStatusBadge } from "./debt-status-badge";

type Props = {
  debt: NonNullable<Awaited<ReturnType<typeof getDebt>>>;
  onLogRepayment: () => void;
};

export function DebtLedgerTable({ debt, onLogRepayment }: Props) {
  function formatDebtAmount(value: number) {
    return formatMoney(value, debt.currency);
  }

  const { outstanding, repaid } = debt;
  const progress = debt.amount === 0 ? 0 : (repaid / debt.amount) * 100;

  // `getDebt` returns repayments oldest first, so the running balance reads
  // top-to-bottom like a statement.
  let balance = debt.amount;
  const entries = debt.repayments.map((repayment) => {
    balance -= repayment.amount;

    return { ...repayment, balance };
  });

  const hasRepayments = entries.length > 0;

  return (
    <div className="flex flex-col gap-y-3">
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <DebtStatusBadge status={debt.status} />
        <span className="capitalize">{debt.direction}</span>·<span>{debt.currency}</span>·
        <span>Recorded {formatDate(debt.date)}</span>
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Entry</TableHead>
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
              {/* A payable's creation never touches a Bank Account, so there's nothing to name. */}
              {debt.direction === "receivable" ? (
                <BankAccountMovement preposition="from" bankAccount={debt.originatingBankAccount} />
              ) : null}
              {debt.note ? <EntryNote note={debt.note} /> : null}
            </TableCell>
            <TableCell className="text-end tabular-nums">
              +{formatDebtAmount(debt.amount)}
            </TableCell>
            <TableCell className="text-end font-semibold tabular-nums">
              {formatDebtAmount(debt.amount)}
            </TableCell>
            <TableCell />
          </TableRow>

          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{formatDate(entry.date)}</TableCell>
              <TableCell>
                {debt.direction === "receivable"
                  ? `${debt.name} paid you`
                  : `You paid ${debt.name}`}
                <BankAccountMovement
                  preposition={debt.direction === "receivable" ? "into" : "from"}
                  bankAccount={entry.bankAccount}
                />
                {entry.note ? <EntryNote note={entry.note} /> : null}
              </TableCell>
              <TableCell className="text-end text-emerald-600 tabular-nums">
                −{formatDebtAmount(entry.amount)}
              </TableCell>
              {/* Past zero there's nothing outstanding; the footer shows the overpayment. */}
              <TableCell className="text-end font-semibold tabular-nums">
                {formatDebtAmount(Math.max(entry.balance, 0))}
              </TableCell>
              <TableCell className="text-end">
                <RepaymentActionsDropdownMenu debtId={debt.id} repaymentId={entry.id} />
              </TableCell>
            </TableRow>
          ))}

          {hasRepayments ? null : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="px-0 py-2">
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
                  <EmptyContent>
                    <Button onClick={onLogRepayment}>
                      <IconPlus />
                      Log Repayment
                    </Button>
                  </EmptyContent>
                </Empty>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {hasRepayments ? (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>
                Total repaid across {entries.length} repayment{entries.length === 1 ? "" : "s"} (
                {progress.toFixed(0)}%)
              </TableCell>
              <TableCell className="text-end tabular-nums">−{formatDebtAmount(repaid)}</TableCell>
              <TableCell className="text-end font-semibold tabular-nums">
                {debt.forgivenAt ? (
                  // The ledger is the full record, so the forgiven amount stays visible here
                  // rather than behind the list's show/hide toggle.
                  <span className="text-muted-foreground">
                    <span className="me-1.5 uppercase">Forgiven</span>
                    <span className="line-through">
                      {formatDebtAmount(Math.max(outstanding, 0))}
                    </span>
                  </span>
                ) : outstanding < 0 ? (
                  // Overpaying isn't an error: in the user's favour on a receivable, money to
                  // get back on a payable.
                  <span
                    className={cn(
                      "uppercase",
                      debt.direction === "receivable" ? "text-emerald-600" : "text-amber-600",
                    )}
                  >
                    Overpaid +{formatDebtAmount(-outstanding)}
                  </span>
                ) : (
                  formatDebtAmount(outstanding)
                )}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
    </div>
  );
}

function BankAccountMovement({
  preposition,
  bankAccount,
}: {
  preposition: "from" | "into";
  bankAccount: Pick<BankAccount, "id" | "name"> | null;
}) {
  if (!bankAccount) return <span className="font-normal text-muted-foreground"> · off-app</span>;

  return (
    <span className="font-normal text-muted-foreground">
      {` · ${preposition} `}
      <Link
        to="/accounts/$accountId"
        params={{ accountId: bankAccount.id }}
        className="underline decoration-dotted underline-offset-4 hover:text-foreground"
      >
        {bankAccount.name}
      </Link>
    </span>
  );
}

function EntryNote({ note }: { note: string }) {
  return <span className="block text-xs font-normal text-muted-foreground">“{note}”</span>;
}
