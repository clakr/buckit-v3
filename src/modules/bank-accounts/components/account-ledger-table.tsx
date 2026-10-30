import { IconArrowsExchange, IconCircleDottedLetterH, IconPlus } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState, useTransition } from "react";

import type { getBankAccount } from "#/modules/bank-accounts/functions";
import type { AccountLedgerEntry } from "#/modules/bank-accounts/ledger.server";

import { LedgerPager } from "#/components/ledger-pager";
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
import { DEFAULT_LEDGER_PAGE, type LedgerPageRequest } from "#/lib/ledger-page";
import { formatMoney } from "#/lib/money";
import { cn, formatDateTime, formatToRelative } from "#/lib/utils";
import { AllocationActionsDropdownMenu } from "#/modules/allocations/components/allocation-actions-dropdown-menu";
import { logAllocationDrawerHandle } from "#/modules/allocations/components/log-allocation-drawer";
import { bankAccountLedgerQueryOption } from "#/modules/bank-accounts/query-options";
import { logTransactionDrawerHandle } from "#/modules/transactions/components/log-transaction-drawer";
import { TransactionActionsDropdownMenu } from "#/modules/transactions/components/transaction-actions-dropdown-menu";

type Props = {
  bankAccount: Awaited<ReturnType<typeof getBankAccount>>;
};

export function AccountLedgerTable({ bankAccount }: Props) {
  function formatAccountAmount(value: number) {
    return formatMoney(value, bankAccount.currency);
  }

  const { startingBalance } = bankAccount;

  const [page, setPage] = useState<LedgerPageRequest>(DEFAULT_LEDGER_PAGE);
  const [isPending, startTransition] = useTransition();
  const { data: ledgerPage } = useSuspenseQuery(bankAccountLedgerQueryOption(bankAccount.id, page));
  const { entries, opening, isOldestPage, ...paging } = ledgerPage;
  const hasEntries = paging.total > 0;

  return (
    <div className="flex flex-col gap-y-3">
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary">{bankAccount.currency}</Badge>
        <span>
          Balance{" "}
          <strong className="font-semibold text-foreground tabular-nums">
            {formatAccountAmount(bankAccount.balance)}
          </strong>
        </span>
        ·
        <span>
          Unallocated{" "}
          <strong className="font-semibold text-foreground tabular-nums">
            {formatAccountAmount(bankAccount.unallocated)}
          </strong>
        </span>
        ·
        <span>
          Earmarked{" "}
          <strong className="font-semibold text-foreground tabular-nums">
            {formatAccountAmount(bankAccount.totalEarmarked)}
          </strong>
        </span>
      </p>

      <Table aria-busy={isPending} className={cn(isPending && "opacity-60 transition-opacity")}>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Entry</TableHead>
            <TableHead className="text-end">Balance</TableHead>
            <TableHead className="text-end">Unallocated</TableHead>
            <TableHead />
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
              <TableCell colSpan={5} className="px-0 py-2">
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

      <LedgerPager
        paging={paging}
        onPageChange={(pageIndex) =>
          startTransition(() => setPage({ pageIndex, pageSize: paging.pageSize }))
        }
        onPageSizeChange={(pageSize) => startTransition(() => setPage({ pageIndex: 0, pageSize }))}
      />
    </div>
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
