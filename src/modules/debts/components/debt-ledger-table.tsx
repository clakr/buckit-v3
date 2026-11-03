import { IconHeartHandshake, IconPlus, IconReceipt } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import type { BankAccount } from "#/db/schema";

import { Button } from "#/components/ui/button";
import { DrawerTrigger } from "#/components/ui/drawer";
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
import { logRepaymentDrawerHandle } from "#/modules/repayments/components/log-repayment-drawer";
import { RepaymentActionsDropdownMenu } from "#/modules/repayments/components/repayment-actions-dropdown-menu";

import type { getDebt } from "../functions";

type Props = {
  debt: NonNullable<Awaited<ReturnType<typeof getDebt>>>;
};

export function DebtLedgerTable({ debt }: Props) {
  function formatDebtAmount(value: number) {
    return formatMoney(value, debt.currency);
  }

  const { outstanding, repaid } = debt;
  const progress = debt.amount === 0 ? 0 : (repaid / debt.amount) * 100;

  let balance = debt.amount;
  const entries = debt.repayments.map((repayment) => {
    balance -= repayment.amount;

    return { ...repayment, balance };
  });

  const hasRepayments = entries.length > 0;

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="border-s font-medium first:border-0">Date</TableHead>
          <TableHead className="border-s font-medium first:border-0">Entry</TableHead>
          <TableHead className="border-s text-end font-medium first:border-0">Change</TableHead>
          <TableHead className="border-s text-end font-medium first:border-0">
            Outstanding
          </TableHead>
          <TableHead className="border-s font-medium first:border-0" />
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow className="bg-muted/40">
          <TableCell>{formatDate(debt.date)}</TableCell>
          <TableCell className="min-w-48 font-medium whitespace-normal">
            {debt.direction === "receivable"
              ? `Lent to ${debt.name}`
              : `Borrowed from ${debt.name}`}
            {debt.direction === "receivable" ? (
              <BankAccountMovement preposition="from" bankAccount={debt.originatingBankAccount} />
            ) : null}
            {debt.note ? <EntryNote note={debt.note} /> : null}
          </TableCell>
          <TableCell className="text-end tabular-nums">+{formatDebtAmount(debt.amount)}</TableCell>
          <TableCell className="text-end font-semibold tabular-nums">
            {formatDebtAmount(debt.amount)}
          </TableCell>
          <TableCell />
        </TableRow>

        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>{formatDate(entry.date)}</TableCell>
            <TableCell className="min-w-48 whitespace-normal">
              {debt.direction === "receivable" ? `${debt.name} paid you` : `You paid ${debt.name}`}
              <BankAccountMovement
                preposition={debt.direction === "receivable" ? "into" : "from"}
                bankAccount={entry.bankAccount}
              />
              {entry.note ? <EntryNote note={entry.note} /> : null}
            </TableCell>
            <TableCell className="text-end text-emerald-600 tabular-nums">
              −{formatDebtAmount(entry.amount)}
            </TableCell>
            <TableCell className="text-end font-semibold tabular-nums">
              {formatDebtAmount(Math.max(entry.balance, 0))}
            </TableCell>
            <TableCell className="text-end">
              <RepaymentActionsDropdownMenu debtId={debt.id} repaymentId={entry.id} />
            </TableCell>
          </TableRow>
        ))}

        {debt.forgivenAt ? (
          <TableRow className="text-muted-foreground">
            <TableCell>{formatDate(debt.forgivenAt)}</TableCell>
            <TableCell className="min-w-48 whitespace-normal">
              <span className="flex items-center gap-x-1.5">
                <IconHeartHandshake aria-hidden className="size-4" />
                {debt.direction === "receivable"
                  ? `You forgave ${debt.name}`
                  : `${debt.name} forgave you`}
              </span>
            </TableCell>
            <TableCell className="text-end tabular-nums">
              {outstanding > 0 ? `−${formatDebtAmount(outstanding)}` : "—"}
            </TableCell>
            <TableCell className="text-end font-semibold tabular-nums">
              {formatDebtAmount(0)}
            </TableCell>
            <TableCell />
          </TableRow>
        ) : null}

        {hasRepayments || debt.forgivenAt ? null : (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={5} className="p-4">
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
                  <DrawerTrigger
                    handle={logRepaymentDrawerHandle}
                    payload={{ debtId: debt.id }}
                    render={<Button />}
                  >
                    <IconPlus />
                    Log Repayment
                  </DrawerTrigger>
                </EmptyContent>
              </Empty>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
      {hasRepayments || debt.forgivenAt ? (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>
              Total repaid across {entries.length} repayment{entries.length === 1 ? "" : "s"} (
              {progress.toFixed(0)}%)
            </TableCell>
            <TableCell className="text-end tabular-nums">−{formatDebtAmount(repaid)}</TableCell>
            <TableCell className="text-end font-semibold tabular-nums">
              {debt.forgivenAt ? (
                <span className="text-muted-foreground">
                  <span className="me-1.5 uppercase">Forgiven</span>
                  <span className="line-through">{formatDebtAmount(Math.max(outstanding, 0))}</span>
                </span>
              ) : outstanding < 0 ? (
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
  return <span className="block text-xs font-normal text-muted-foreground">"{note}"</span>;
}
