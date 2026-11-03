import { IconArrowsExchange, IconCircleDottedLetterH, IconPlus } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import type { getBankAccount } from "#/modules/bank-accounts/functions";
import type { AccountLedgerEntry, AccountLedgerPage } from "#/modules/bank-accounts/ledger.server";

import { Badge } from "#/components/ui/badge";
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
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { formatMoney } from "#/lib/money";
import { cn, formatDateTime, formatToRelative } from "#/lib/utils";
import { AllocationActionsDropdownMenu } from "#/modules/allocations/components/allocation-actions-dropdown-menu";
import { logAllocationDrawerHandle } from "#/modules/allocations/components/log-allocation-drawer";
import { logTransactionDrawerHandle } from "#/modules/transactions/components/log-transaction-drawer";
import { TransactionActionsDropdownMenu } from "#/modules/transactions/components/transaction-actions-dropdown-menu";

type Props = {
  bankAccount: Awaited<ReturnType<typeof getBankAccount>>;
  ledgerPage: AccountLedgerPage;
  isPending: boolean;
};

export function AccountLedgerTable({ bankAccount, ledgerPage, isPending }: Props) {
  function formatAccountAmount(value: number) {
    return formatMoney(value, bankAccount.currency);
  }

  const { startingBalance } = bankAccount;
  const { entries, opening, isOldestPage, total } = ledgerPage;
  const hasEntries = total > 0;

  return (
    <Table aria-busy={isPending} className={cn(isPending && "opacity-60 transition-opacity")}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="border-s font-medium first:border-0">Date</TableHead>
          <TableHead className="border-s font-medium first:border-0">Entry</TableHead>
          <TableHead className="border-s text-end font-medium first:border-0">Balance</TableHead>
          <TableHead className="border-s text-end font-medium first:border-0">
            Unallocated
          </TableHead>
          <TableHead className="border-s font-medium first:border-0" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((step) => (
          <TableRow key={step.id}>
            <TableCell>
              <DateBadge date={step.date} />
            </TableCell>
            <TableCell className="max-w-72 whitespace-normal">
              <EntryLabel entry={step} />
              {step.note ? <EntryNote note={step.note} /> : null}
            </TableCell>
            <TableCell className="text-end">
              <FigureCell
                value={step.balance}
                change={step.change.balance}
                format={formatAccountAmount}
              />
            </TableCell>
            <TableCell className="text-end">
              <FigureCell
                value={step.unallocated}
                change={step.change.unallocated}
                format={formatAccountAmount}
              />
            </TableCell>
            <TableCell className="text-end">
              {step.source === "allocation" ? (
                <AllocationActionsDropdownMenu allocationId={step.id} />
              ) : (
                <TransactionActionsDropdownMenu transactionId={step.id} />
              )}
            </TableCell>
          </TableRow>
        ))}

        {isOldestPage ? (
          <TableRow className="bg-muted/40">
            <TableCell>
              <DateBadge date={bankAccount.createdAt} />
            </TableCell>
            <TableCell className="font-medium">Opening balance</TableCell>
            <TableCell className="text-end font-semibold tabular-nums">
              {formatAccountAmount(startingBalance)}
            </TableCell>
            <TableCell className="text-end font-semibold tabular-nums">
              {formatAccountAmount(startingBalance)}
            </TableCell>
            <TableCell />
          </TableRow>
        ) : (
          <TableRow className="bg-muted/40">
            <TableCell />
            <TableCell className="whitespace-normal">
              <span className="font-medium">Brought forward</span>
              <span className="block text-xs text-muted-foreground">
                Figures before this page's oldest entry
              </span>
            </TableCell>
            <TableCell className="text-end font-semibold tabular-nums">
              {formatAccountAmount(opening.balance)}
            </TableCell>
            <TableCell className="text-end font-semibold tabular-nums">
              {formatAccountAmount(opening.unallocated)}
            </TableCell>
            <TableCell />
          </TableRow>
        )}

        {hasEntries ? null : (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={5}>
              <Empty className="min-h-[15vh] border border-dashed">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <IconArrowsExchange />
                  </EmptyMedia>
                  <EmptyTitle>Nothing logged yet.</EmptyTitle>
                  <EmptyDescription>
                    Log income or an expense, or move money into a bucket, to build this account's
                    history.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent className="flex-row justify-center">
                  <DrawerTrigger
                    handle={logTransactionDrawerHandle}
                    payload={{ bankAccountId: bankAccount.id }}
                    render={<Button />}
                  >
                    <IconPlus />
                    Log Transaction
                  </DrawerTrigger>
                  <DrawerTrigger
                    handle={logAllocationDrawerHandle}
                    payload={{ start: { from: "bank-account", bankAccountId: bankAccount.id } }}
                    render={<Button variant="outline" />}
                  >
                    <IconPlus />
                    Allocate Money
                  </DrawerTrigger>
                </EmptyContent>
              </Empty>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function DateBadge({ date }: { date: Date }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Badge variant="secondary" className="capitalize" />}>
        <IconCircleDottedLetterH />
        {formatToRelative(date)}
      </TooltipTrigger>
      <TooltipContent>{formatDateTime(date)}</TooltipContent>
    </Tooltip>
  );
}

function FigureCell({
  value,
  change,
  format,
}: {
  value: number;
  change: number;
  format: (value: number) => string;
}) {
  return (
    <span className="block tabular-nums">
      <span className={cn("block font-semibold", value < 0 && "text-destructive")}>
        {format(value)}
      </span>
      <span
        className={cn("block text-xs", change > 0 ? "text-emerald-600" : "text-muted-foreground")}
      >
        {change === 0 ? "—" : `${change > 0 ? "+" : "−"}${format(Math.abs(change))}`}
      </span>
    </span>
  );
}

function EntryLabel({ entry }: { entry: AccountLedgerEntry }) {
  const { bucket, debt } = entry;

  if (entry.kind === "allocation" && bucket)
    return (
      <>
        Allocated to <BucketLink bucket={bucket} />
      </>
    );

  if (entry.kind === "withdrawal" && bucket)
    return (
      <>
        Withdrew from <BucketLink bucket={bucket} />
      </>
    );

  if (debt) {
    const debtLink = (
      <Link
        to="/debts/$debtId"
        params={{ debtId: debt.id }}
        className="underline decoration-dotted underline-offset-4"
      >
        {debt.name}
      </Link>
    );

    if (debt.role === "origination")
      return debt.direction === "receivable" ? (
        <>Lent to {debtLink}</>
      ) : (
        <>Borrowed from {debtLink}</>
      );

    return debt.direction === "receivable" ? <>{debtLink} paid you</> : <>You paid {debtLink}</>;
  }

  return <span className="capitalize">{entry.kind}</span>;
}

function BucketLink({ bucket }: { bucket: NonNullable<AccountLedgerEntry["bucket"]> }) {
  return (
    <Link
      to="/buckets/$bucketId"
      params={{ bucketId: bucket.id }}
      className="underline decoration-dotted underline-offset-4"
    >
      {bucket.name}
    </Link>
  );
}

function EntryNote({ note }: { note: string }) {
  return <span className="block text-xs font-normal text-muted-foreground">"{note}"</span>;
}
