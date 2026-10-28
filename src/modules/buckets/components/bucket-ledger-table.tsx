import { IconCircleDottedLetterH, IconPlus } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import type { Bucket } from "#/db/schema";
import type { getBucketLedger } from "#/modules/buckets/functions";
import type { BucketLedgerEntry } from "#/modules/buckets/ledger.server";

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
import { MODULE_ICONS } from "#/lib/constants";
import { formatMoney } from "#/lib/money";
import { cn, formatDateTime, formatToRelative } from "#/lib/utils";
import { AllocationActionsDropdownMenu } from "#/modules/allocations/components/allocation-actions-dropdown-menu";
import { logAllocationDrawerHandle } from "#/modules/allocations/components/log-allocation-drawer";
import { replayHeld } from "#/modules/buckets/ledger";
import { WithdrawalActionsDropdownMenu } from "#/modules/withdrawals/components/withdrawal-actions-dropdown-menu";

type Props = {
  bucketId: Bucket["id"];
  bucketLedger: Awaited<ReturnType<typeof getBucketLedger>>;
};

export function BucketLedgerTable({ bucketId, bucketLedger }: Props) {
  const { subtotals, holdings, ledger } = bucketLedger;
  const steps = replayHeld(ledger, (entry) => entry.bankAccount.currency).reverse();

  return (
    <div className="flex flex-col gap-y-3">
      <div className="flex flex-col gap-y-1 text-sm text-muted-foreground">
        <p className="flex flex-wrap items-center gap-x-2">
          Holds
          {subtotals.length ? (
            subtotals.map(({ currency, amount }, index) => (
              <span key={currency} className="flex items-center gap-x-2">
                {index > 0 ? "·" : null}
                <strong className="font-semibold text-foreground tabular-nums">
                  {formatMoney(amount, currency)}
                </strong>
              </span>
            ))
          ) : (
            <strong className="font-semibold text-foreground">nothing yet</strong>
          )}
        </p>
        {holdings.length > 1 ? (
          <p className="flex flex-wrap items-center gap-x-2">
            From
            {holdings.map(({ bankAccountId, name, currency, amount }, index) => (
              <span key={bankAccountId} className="flex items-center gap-x-2">
                {index > 0 ? "·" : null}
                <span>
                  {name}{" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatMoney(amount, currency)}
                  </span>
                </span>
              </span>
            ))}
          </p>
        ) : null}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Entry</TableHead>
            <TableHead className="text-end">Held</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {steps.map((step) => (
            <TableRow key={step.id}>
              <TableCell>
                <DateBadge date={step.date} />
              </TableCell>
              <TableCell className="max-w-72 whitespace-normal">
                <EntryLabel entry={step} />
                {step.note ? <EntryNote note={step.note} /> : null}
              </TableCell>
              <TableCell className="text-end">
                <HeldCell
                  value={step.held}
                  change={step.change}
                  currency={step.bankAccount.currency}
                />
              </TableCell>
              <TableCell className="text-end">
                {step.kind === "allocation" ? (
                  <AllocationActionsDropdownMenu allocationId={step.recordId} />
                ) : (
                  <WithdrawalActionsDropdownMenu withdrawalId={step.recordId} />
                )}
              </TableCell>
            </TableRow>
          ))}

          {steps.length ? null : (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={4} className="px-0 py-2">
                <Empty className="min-h-[15vh] border border-dashed">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <MODULE_ICONS.buckets />
                    </EmptyMedia>
                    <EmptyTitle>Nothing in this bucket yet.</EmptyTitle>
                    <EmptyDescription>
                      Move money into this bucket from a bank account to start its history.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <DrawerTrigger
                      handle={logAllocationDrawerHandle}
                      payload={{ start: { from: "bucket", bucketId } }}
                      render={<Button />}
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

function HeldCell({
  value,
  change,
  currency,
}: {
  value: number;
  change: number;
  currency: string;
}) {
  return (
    <span className="block tabular-nums">
      <span className={cn("block font-semibold", value < 0 && "text-destructive")}>
        {formatMoney(value, currency)}
      </span>
      <span
        className={cn("block text-xs", change > 0 ? "text-emerald-600" : "text-muted-foreground")}
      >
        {change > 0 ? "+" : "−"}
        {formatMoney(Math.abs(change), currency)}
      </span>
    </span>
  );
}

function EntryLabel({ entry }: { entry: BucketLedgerEntry }) {
  const { bankAccount } = entry;

  const accountLink = (
    <Link
      to="/accounts/$accountId"
      params={{ accountId: bankAccount.id }}
      className="underline decoration-dotted underline-offset-4"
    >
      {bankAccount.name}
    </Link>
  );

  return entry.kind === "allocation" ? (
    <>Allocated from {accountLink}</>
  ) : (
    <>Withdrew via {accountLink}</>
  );
}

function EntryNote({ note }: { note: string }) {
  return <span className="block text-xs font-normal text-muted-foreground">"{note}"</span>;
}
