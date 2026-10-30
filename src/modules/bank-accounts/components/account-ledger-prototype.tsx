/**
 * PROTOTYPE, wipe me. Question for #68: how should the Account ledger paginate?
 * Three variants on the existing /accounts/$accountId route, switched via `?variant=`:
 *   A  Numbered pages   (classic footer pager, rows per page)
 *   B  Show earlier     (newest N rows, grow on demand)
 *   C  Month window     (one calendar month at a time, with opening/closing figures)
 *
 * All data is client-side. Real entries are padded with synthetic ones so there is something to page.
 * Opening figures per page come from replaying the full list; the real version would get them from the server.
 */
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from "@tabler/icons-react";
import { useMemo, useState, type ReactNode } from "react";

import type { getBankAccount } from "#/modules/bank-accounts/functions";
import type { AccountLedgerEntry } from "#/modules/bank-accounts/ledger.server";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";
import { AllocationActionsDropdownMenu } from "#/modules/allocations/components/allocation-actions-dropdown-menu";
import {
  DateBadge,
  EntryLabel,
  EntryNote,
  FigureCell,
} from "#/modules/bank-accounts/components/account-ledger-table";
import { replayLedger, type LedgerStep } from "#/modules/bank-accounts/ledger";
import { TransactionActionsDropdownMenu } from "#/modules/transactions/components/transaction-actions-dropdown-menu";

type BankAccount = Awaited<ReturnType<typeof getBankAccount>>;
type Step = LedgerStep<AccountLedgerEntry>;
type Figures = { balance: number; unallocated: number };

type Props = { bankAccount: BankAccount; variant: "A" | "B" | "C" };

const SYNTHETIC_COUNT = 160;
const DAY_MS = 86_400_000;

function createRandom(seed: number) {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function padWithSyntheticEntries(real: AccountLedgerEntry[]): AccountLedgerEntry[] {
  if (real.length >= SYNTHETIC_COUNT) return real;

  const random = createRandom(68);
  const between = (min: number, max: number) => Math.round(min + random() * (max - min));
  const now = Date.now();
  const buckets = ["Vacation", "Emergency fund", "Laptop"];
  const expenseNotes = ["Groceries", "Rent", "Coffee", "Transit", "Dinner out", null, null];

  const synthetic = Array.from({ length: SYNTHETIC_COUNT }, (_, index): AccountLedgerEntry => {
    const date = new Date(now - (SYNTHETIC_COUNT - index) * 1.7 * DAY_MS);
    const base = { id: `proto-${index}`, date, createdAt: date, debt: null };

    if (index === 0)
      return {
        ...base,
        kind: "income",
        amount: 2_000_000,
        source: "transaction",
        note: "Salary",
        bucket: null,
      };

    if (index % 6 === 0)
      return {
        ...base,
        kind: "income",
        amount: between(120_000, 260_000),
        source: "transaction",
        note: "Salary",
        bucket: null,
      };

    const bucketIndex = index % buckets.length;
    const bucket = { id: "proto-bucket", name: buckets[bucketIndex] };

    if (index % 7 === 3)
      return {
        ...base,
        kind: "allocation",
        amount: between(5_000, 40_000),
        source: "allocation",
        note: null,
        bucket,
      };

    if (index % 11 === 5)
      return {
        ...base,
        kind: "withdrawal",
        amount: between(3_000, 20_000),
        source: "transaction",
        note: null,
        bucket,
      };

    return {
      ...base,
      kind: "expense",
      amount: between(500, 9_000),
      source: "transaction",
      note: expenseNotes[index % expenseNotes.length],
      bucket: null,
    };
  });

  return [...synthetic, ...real];
}

type LedgerContext = {
  steps: Step[];
  startingBalance: number;
  openedAt: Date;
  format: (value: number) => string;
  figuresBefore: (index: number) => Figures;
};

function useLedgerContext(bankAccount: BankAccount): LedgerContext {
  const { startingBalance, ledger, currency, createdAt } = bankAccount;

  return useMemo(() => {
    const steps = replayLedger(startingBalance, padWithSyntheticEntries(ledger)).reverse();
    const oldest = steps.at(-1)?.date;
    const openedAt = oldest && oldest < createdAt ? new Date(oldest.getTime() - DAY_MS) : createdAt;

    return {
      steps,
      startingBalance,
      openedAt,
      format: (value: number) => formatMoney(value, currency),
      figuresBefore: (index: number): Figures => {
        const previous = steps[index + 1];

        return previous
          ? { balance: previous.balance, unallocated: previous.unallocated }
          : { balance: startingBalance, unallocated: startingBalance };
      },
    };
  }, [startingBalance, ledger, currency, createdAt]);
}

export function AccountLedgerPrototype({ bankAccount, variant }: Props) {
  const context = useLedgerContext(bankAccount);
  const latest = context.steps[0] ?? {
    balance: context.startingBalance,
    unallocated: context.startingBalance,
  };

  return (
    <div className="flex flex-col gap-y-3">
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="secondary">{bankAccount.currency}</Badge>
        <span>
          Balance{" "}
          <strong className="font-semibold text-foreground tabular-nums">
            {context.format(latest.balance)}
          </strong>
        </span>
        ·
        <span>
          Unallocated{" "}
          <strong className="font-semibold text-foreground tabular-nums">
            {context.format(latest.unallocated)}
          </strong>
        </span>
        ·<span>{context.steps.length} entries (prototype data)</span>
      </p>

      {variant === "A" ? <NumberedPages {...context} /> : null}
      {variant === "B" ? <ShowEarlier {...context} /> : null}
      {variant === "C" ? <MonthWindow {...context} /> : null}
    </div>
  );
}

function LedgerTable({ children }: { children: ReactNode }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Entry</TableHead>
          <TableHead className="text-end">Balance</TableHead>
          <TableHead className="text-end">Unallocated</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}

function StepRow({ step, format }: { step: Step; format: LedgerContext["format"] }) {
  const isReal = !step.id.startsWith("proto-");

  return (
    <TableRow>
      <TableCell>
        <DateBadge date={step.date} />
      </TableCell>
      <TableCell className="max-w-72 whitespace-normal">
        <EntryLabel entry={step} />
        {step.note ? <EntryNote note={step.note} /> : null}
      </TableCell>
      <TableCell className="text-end">
        <FigureCell value={step.balance} change={step.change.balance} format={format} />
      </TableCell>
      <TableCell className="text-end">
        <FigureCell value={step.unallocated} change={step.change.unallocated} format={format} />
      </TableCell>
      <TableCell className="text-end">
        {isReal ? (
          step.source === "allocation" ? (
            <AllocationActionsDropdownMenu allocationId={step.id} />
          ) : (
            <TransactionActionsDropdownMenu transactionId={step.id} />
          )
        ) : null}
      </TableCell>
    </TableRow>
  );
}

function FiguresRow({
  label,
  hint,
  date,
  figures,
  format,
}: {
  label: string;
  hint?: string;
  date?: Date;
  figures: Figures;
  format: LedgerContext["format"];
}) {
  return (
    <TableRow className="bg-muted/40">
      <TableCell>{date ? <DateBadge date={date} /> : null}</TableCell>
      <TableCell className="whitespace-normal">
        <span className="font-medium">{label}</span>
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </TableCell>
      <TableCell className="text-end font-semibold tabular-nums">
        {format(figures.balance)}
      </TableCell>
      <TableCell className="text-end font-semibold tabular-nums">
        {format(figures.unallocated)}
      </TableCell>
      <TableCell />
    </TableRow>
  );
}

// --- Variant A: numbered pages -------------------------------------------------------------

const PAGE_SIZES = [10, 25, 50];

function getPageNumbers(current: number, count: number): (number | "gap")[] {
  const wanted = new Set([0, count - 1, current - 1, current, current + 1]);
  const pages = [...wanted].filter((page) => page >= 0 && page < count).sort((a, b) => a - b);

  return pages.flatMap((page, index) =>
    index > 0 && page - pages[index - 1] > 1 ? (["gap", page] as const) : [page],
  );
}

function NumberedPages({ steps, openedAt, format, figuresBefore }: LedgerContext) {
  const [pageSize, setPageSize] = useState(25);
  const [pageIndex, setPageIndex] = useState(0);

  const pageCount = Math.ceil(steps.length / pageSize);
  const start = pageIndex * pageSize;
  const pageSteps = steps.slice(start, start + pageSize);
  const end = start + pageSteps.length;
  const isOldestPage = end >= steps.length;

  function goTo(next: number) {
    setPageIndex(Math.min(Math.max(next, 0), pageCount - 1));
  }

  return (
    <>
      <LedgerTable>
        {pageSteps.map((step) => (
          <StepRow key={step.id} step={step} format={format} />
        ))}
        <FiguresRow
          label={isOldestPage ? "Opening balance" : "Brought forward"}
          hint={isOldestPage ? undefined : "Figures before this page's oldest entry"}
          date={isOldestPage ? openedAt : undefined}
          figures={figuresBefore(end - 1)}
          format={format}
        />
      </LedgerTable>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <label className="flex items-center gap-2">
          Rows per page
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPageIndex(0);
            }}
            className="h-7 rounded-md border bg-background px-1.5 text-foreground"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <span className="tabular-nums">
          {start + 1}–{end} of {steps.length}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="First page"
            disabled={pageIndex === 0}
            onClick={() => goTo(0)}
          >
            <IconChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous page"
            disabled={pageIndex === 0}
            onClick={() => goTo(pageIndex - 1)}
          >
            <IconChevronLeft />
          </Button>
          {getPageNumbers(pageIndex, pageCount).map((page, index) =>
            page === "gap" ? (
              <span key={`gap-${index}`} className="px-1">
                …
              </span>
            ) : (
              <Button
                key={page}
                variant={page === pageIndex ? "default" : "outline"}
                size="icon"
                aria-current={page === pageIndex ? "page" : undefined}
                onClick={() => goTo(page)}
              >
                {page + 1}
              </Button>
            ),
          )}
          <Button
            variant="outline"
            size="icon"
            aria-label="Next page"
            disabled={pageIndex === pageCount - 1}
            onClick={() => goTo(pageIndex + 1)}
          >
            <IconChevronRight />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Last page"
            disabled={pageIndex === pageCount - 1}
            onClick={() => goTo(pageCount - 1)}
          >
            <IconChevronsRight />
          </Button>
        </div>
      </div>
    </>
  );
}

// --- Variant B: show earlier ---------------------------------------------------------------

const INITIAL_VISIBLE = 20;
const STEP_VISIBLE = 20;

function ShowEarlier({ steps, openedAt, format, startingBalance }: LedgerContext) {
  const [visible, setVisible] = useState(INITIAL_VISIBLE);

  const shownSteps = steps.slice(0, visible);
  const hiddenCount = Math.max(steps.length - visible, 0);

  return (
    <LedgerTable>
      {shownSteps.map((step) => (
        <StepRow key={step.id} step={step} format={format} />
      ))}

      {hiddenCount > 0 ? (
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableCell colSpan={5} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground tabular-nums">
                Showing latest {shownSteps.length} of {steps.length} · {hiddenCount} earlier{" "}
                {hiddenCount === 1 ? "entry" : "entries"}
              </span>
              <span className="flex gap-2">
                <Button variant="outline" onClick={() => setVisible(visible + STEP_VISIBLE)}>
                  <IconChevronDown />
                  Show {Math.min(STEP_VISIBLE, hiddenCount)} earlier
                </Button>
                <Button variant="ghost" onClick={() => setVisible(steps.length)}>
                  Show all
                </Button>
              </span>
            </div>
          </TableCell>
        </TableRow>
      ) : (
        <>
          <FiguresRow
            label="Opening balance"
            date={openedAt}
            figures={{ balance: startingBalance, unallocated: startingBalance }}
            format={format}
          />
          {steps.length > INITIAL_VISIBLE ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="py-2 text-center">
                <Button variant="ghost" onClick={() => setVisible(INITIAL_VISIBLE)}>
                  Collapse to latest {INITIAL_VISIBLE}
                </Button>
              </TableCell>
            </TableRow>
          ) : null}
        </>
      )}
    </LedgerTable>
  );
}

// --- Variant C: month window ---------------------------------------------------------------

type MonthGroup = { key: string; label: string; start: number; count: number };

function groupByMonth(steps: Step[]): MonthGroup[] {
  const groups: MonthGroup[] = [];

  steps.forEach((step, index) => {
    const key = step.date.toISOString().slice(0, 7);
    const last = groups.at(-1);

    if (last?.key === key) {
      last.count += 1;

      return;
    }

    groups.push({
      key,
      label: step.date.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
      start: index,
      count: 1,
    });
  });

  return groups;
}

function MonthWindow({ steps, openedAt, format, startingBalance, figuresBefore }: LedgerContext) {
  const months = useMemo(() => groupByMonth(steps), [steps]);
  const [monthIndex, setMonthIndex] = useState(0);

  const month = months[monthIndex];
  const monthSteps = steps.slice(month.start, month.start + month.count);
  const closing: Figures = {
    balance: monthSteps[0].balance,
    unallocated: monthSteps[0].unallocated,
  };
  const opening = figuresBefore(month.start + month.count - 1);
  const isOldestMonth = monthIndex === months.length - 1;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="Earlier month"
            disabled={isOldestMonth}
            onClick={() => setMonthIndex(monthIndex + 1)}
          >
            <IconChevronLeft />
          </Button>
          <select
            value={monthIndex}
            onChange={(event) => setMonthIndex(Number(event.target.value))}
            aria-label="Month"
            className="h-7 rounded-md border bg-background px-2 text-xs font-medium"
          >
            {months.map((entry, index) => (
              <option key={entry.key} value={index}>
                {entry.label} ({entry.count})
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="icon"
            aria-label="Later month"
            disabled={monthIndex === 0}
            onClick={() => setMonthIndex(monthIndex - 1)}
          >
            <IconChevronRight />
          </Button>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground tabular-nums">
          <PeriodFigure
            label="Balance"
            from={opening.balance}
            to={closing.balance}
            format={format}
          />
          <PeriodFigure
            label="Unallocated"
            from={opening.unallocated}
            to={closing.unallocated}
            format={format}
          />
        </div>
      </div>

      <LedgerTable>
        {monthSteps.map((step) => (
          <StepRow key={step.id} step={step} format={format} />
        ))}
        <FiguresRow
          label={isOldestMonth ? "Opening balance" : `Opening ${month.label}`}
          hint={isOldestMonth ? undefined : "Figures before this month's first entry"}
          date={isOldestMonth ? openedAt : undefined}
          figures={
            isOldestMonth ? { balance: startingBalance, unallocated: startingBalance } : opening
          }
          format={format}
        />
      </LedgerTable>

      <p className="text-xs text-muted-foreground tabular-nums">
        {month.count} {month.count === 1 ? "entry" : "entries"} in {month.label} · month{" "}
        {months.length - monthIndex} of {months.length}
      </p>
    </>
  );
}

function PeriodFigure({
  label,
  from,
  to,
  format,
}: {
  label: string;
  from: number;
  to: number;
  format: (value: number) => string;
}) {
  const delta = to - from;

  return (
    <span>
      {label} {format(from)} →{" "}
      <strong className="font-semibold text-foreground">{format(to)}</strong>{" "}
      <span className={cn(delta > 0 ? "text-emerald-600" : "text-muted-foreground")}>
        ({delta > 0 ? "+" : delta < 0 ? "−" : ""}
        {format(Math.abs(delta))})
      </span>
    </span>
  );
}
