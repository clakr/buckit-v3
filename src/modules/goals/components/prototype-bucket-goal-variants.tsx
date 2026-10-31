import type { ReactNode } from "react";

// PROTOTYPE for #88 — throwaway. Three variants of how the Goal shows on `/buckets/$bucketId`,
// switchable via `?variant=A|B|C`. `?mock=` swaps in fake Goal data to see every status/edge case.
// Delete this file once a variant wins; fold the winner into `bucket-goal-card.tsx`.
import {
  IconAlertTriangle,
  IconCalendar,
  IconChevronDown,
  IconPencil,
  IconTarget,
  IconTrash,
} from "@tabler/icons-react";
import { format } from "date-fns";

import { Heading } from "#/components/heading";
import { Main } from "#/components/main";
import { ProgressRing } from "#/components/progress-ring";
import { Button } from "#/components/ui/button";
import { DrawerTrigger } from "#/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";
import { registerBankAccountDrawerHandle } from "#/modules/bank-accounts/components/register-bank-account-drawer";
import { confirm } from "#/stores/use-confirm";

import type { getBucketGoal } from "../functions";

import { useRemoveGoalMutation } from "../mutations";
import {
  getGoalMonthlyAmount,
  getGoalMonthsLeft,
  getGoalPercent,
  getGoalStatus,
  type GoalStatus,
} from "../utils";
import { addGoalDrawerHandle } from "./add-goal-drawer";
import { editGoalDrawerHandle } from "./edit-goal-drawer";
import { GoalActionsDropdownMenu } from "./goal-actions-dropdown-menu";
import { GoalStatusBadge } from "./goal-status-badge";

export const PROTOTYPE_VARIANTS = ["A", "B", "C"] as const;
export type PrototypeVariant = (typeof PROTOTYPE_VARIANTS)[number];

export const PROTOTYPE_VARIANT_NAMES = {
  A: "Slim strip",
  B: "Header line",
  C: "Side panel",
} satisfies Record<PrototypeVariant, string>;

export const PROTOTYPE_MOCKS = [
  "progress",
  "reached",
  "overdue",
  "nodate",
  "nofunding",
  "none",
] as const;
export type PrototypeMock = (typeof PROTOTYPE_MOCKS)[number];

type Goal = NonNullable<Awaited<ReturnType<typeof getBucketGoal>>>;

export function applyPrototypeMock(
  realGoal: Goal | null,
  mock: PrototypeMock | undefined,
  bucketId: string,
): Goal | null {
  if (!mock) return realGoal;
  if (mock === "none") return null;

  const monthsFromNow = (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);

    return date;
  };

  return {
    id: "prototype-goal",
    bucketId,
    currency: "PHP",
    createdAt: new Date(),
    targetAmount: 15_000_000,
    progress: mock === "reached" ? 16_500_000 : mock === "overdue" ? 4_200_000 : 4_500_000,
    targetDate: mock === "nodate" ? null : monthsFromNow(mock === "overdue" ? -2 : 5),
    hasFundingBankAccount: mock !== "nofunding",
  } as Goal;
}

const STATUS_TONES = {
  reached: "text-emerald-600 dark:text-emerald-400",
  overdue: "text-destructive",
  "in progress": "text-foreground/60",
} satisfies Record<GoalStatus, string>;

const STATUS_BAR_TONES = {
  reached: "bg-emerald-600 dark:bg-emerald-400",
  overdue: "bg-destructive",
  "in progress": "bg-foreground/60",
} satisfies Record<GoalStatus, string>;

type VariantProps = {
  name: string;
  bucketId: string;
  goal: Goal | null;
  /** `BucketDetailActions`. Add Goal is up to the variant, so it arrives with `hasGoal` set. */
  bucketActions: ReactNode;
  ledger: ReactNode;
};

function useGoalFigures(goal: Goal) {
  const status = getGoalStatus(goal);
  const percent = getGoalPercent(goal);
  const remaining = Math.max(goal.targetAmount - goal.progress, 0);
  const monthlyAmount = getGoalMonthlyAmount(goal);
  const money = (value: number) => formatMoney(value, goal.currency);

  let dateLabel = "No target date";
  let dateDetail: string | null = null;

  if (goal.targetDate) {
    dateLabel = format(goal.targetDate, "MMM yyyy");
    const monthsLeft = getGoalMonthsLeft(goal.targetDate);

    if (status === "overdue") dateDetail = "overdue";
    else if (status === "in progress") dateDetail = `${monthsLeft} mo left`;
  }

  return { status, percent, remaining, monthlyAmount, money, dateLabel, dateDetail };
}

function AddGoalButton({ bucketId, className }: { bucketId: string; className?: string }) {
  return (
    <DrawerTrigger
      handle={addGoalDrawerHandle}
      payload={{ bucketId }}
      render={<Button variant="outline" className={className} />}
    >
      <IconTarget />
      Add Goal
    </DrawerTrigger>
  );
}

function RegisterAccountButton({ currency }: { currency: string }) {
  return (
    <DrawerTrigger
      handle={registerBankAccountDrawerHandle}
      payload={{ currency: currency as never }}
      render={<Button variant="outline" size="sm" className="w-fit" />}
    >
      Register a/an {currency} account
    </DrawerTrigger>
  );
}

/* ------------------------------------------------------------------ */
/* A — Slim strip: one row under the header, ring + one headline +      */
/* status & date as chips. No card, no 4-cell grid.                     */
/* ------------------------------------------------------------------ */

export function VariantA({ name, bucketId, goal, bucketActions, ledger }: VariantProps) {
  return (
    <Main>
      <div className="flex items-baseline justify-between">
        <Heading className="capitalize">{name}</Heading>
        {bucketActions}
      </div>

      {goal ? <StripGoal goal={goal} /> : <StripEmpty bucketId={bucketId} />}

      {ledger}
    </Main>
  );
}

function StripEmpty({ bucketId }: { bucketId: string }) {
  return (
    <div className="flex items-center gap-x-3 rounded-lg border border-dashed px-4 py-2.5">
      <IconTarget className="size-5 text-muted-foreground" aria-hidden />
      <p className="flex-1 text-muted-foreground">No goal yet. Set a target to track progress.</p>
      <AddGoalButton bucketId={bucketId} />
    </div>
  );
}

function StripGoal({ goal }: { goal: Goal }) {
  const { status, percent, remaining, monthlyAmount, money, dateLabel, dateDetail } =
    useGoalFigures(goal);

  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-4 py-2.5">
        <ProgressRing
          percent={percent}
          label={`${percent}% of goal saved`}
          className={STATUS_TONES[status]}
        />
        <div className="flex min-w-48 flex-1 flex-col">
          <div className="flex flex-wrap items-baseline gap-x-2 tabular-nums">
            <span className="text-lg font-semibold">{money(goal.progress)}</span>
            <span className="text-muted-foreground">of {money(goal.targetAmount)}</span>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {status === "reached"
              ? `${money(goal.progress - goal.targetAmount)} over target`
              : `${money(remaining)} to go`}
            {monthlyAmount !== null ? ` · ${money(monthlyAmount)}/mo` : null}
          </span>
        </div>
        <div className="flex items-center gap-x-2">
          <GoalStatusBadge status={status} />
          <span
            className={cn(
              "inline-flex items-center gap-x-1 rounded-full border px-2 py-0.5 text-xs font-medium",
              status === "overdue" ? "border-destructive/40 text-destructive" : "text-foreground",
              !goal.targetDate && "text-muted-foreground",
            )}
          >
            <IconCalendar className="size-3" aria-hidden />
            {dateLabel}
            {dateDetail ? <span className="text-muted-foreground"> · {dateDetail}</span> : null}
          </span>
          <GoalActionsDropdownMenu goalId={goal.id} bucketId={goal.bucketId} />
        </div>
      </div>
      {goal.hasFundingBankAccount ? null : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-muted px-4 py-2">
          <IconAlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden />
          <p className="flex-1 text-xs">No {goal.currency} account can fund this Goal.</p>
          <RegisterAccountButton currency={goal.currency} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* B — Header line: no card at all. Status sits beside the title, one   */
/* sentence + a hairline bar under it, Goal actions fold into a "Goal"  */
/* menu beside the Bucket's buttons.                                    */
/* ------------------------------------------------------------------ */

export function VariantB({ name, bucketId, goal, bucketActions, ledger }: VariantProps) {
  return (
    <Main>
      <div className="flex flex-col gap-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <div className="flex items-baseline gap-x-3">
            <Heading className="capitalize">{name}</Heading>
            {goal ? <GoalStatusBadge status={getGoalStatus(goal)} /> : null}
          </div>
          <div className="flex gap-x-2">
            {goal ? <HeaderGoalMenu goal={goal} /> : <AddGoalButton bucketId={bucketId} />}
            {bucketActions}
          </div>
        </div>

        {goal ? <HeaderLineGoal goal={goal} /> : null}
      </div>

      {ledger}
    </Main>
  );
}

function HeaderGoalMenu({ goal }: { goal: Goal }) {
  const mutation = useRemoveGoalMutation();

  async function handleRemoveGoal() {
    const confirmed = await confirm("Remove Goal?", {
      description:
        "Remove this goal? The bucket, its allocations and its withdrawals stay as they are.",
      confirmLabel: "Remove Goal",
      cancelLabel: "Cancel",
      destructive: true,
    });

    if (!confirmed) return;

    await mutation.mutateAsync({ data: { goalId: goal.id } });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <IconTarget />
        Goal
        <IconChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit" align="end">
        <DropdownMenuItem
          onClick={() => editGoalDrawerHandle.openWithPayload({ bucketId: goal.bucketId })}
        >
          <IconPencil />
          Edit Goal
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleRemoveGoal}>
          <IconTrash />
          Remove Goal
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HeaderLineGoal({ goal }: { goal: Goal }) {
  const { status, percent, remaining, monthlyAmount, money, dateLabel, dateDetail } =
    useGoalFigures(goal);
  const barPercent = Math.min(percent, 100);

  return (
    <div className="flex flex-col gap-y-2">
      <p className="tabular-nums">
        <span className="font-semibold">{money(goal.progress)}</span>{" "}
        <span className="text-muted-foreground">
          of {money(goal.targetAmount)} · {percent}%
        </span>
        <span className="text-muted-foreground"> · </span>
        <span className={cn("font-medium", status === "overdue" && "text-destructive")}>
          {goal.targetDate ? `by ${dateLabel}` : "no target date"}
          {dateDetail ? ` (${dateDetail})` : null}
        </span>
      </p>
      <div
        role="progressbar"
        aria-label="Goal progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={barPercent}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full", STATUS_BAR_TONES[status])}
          style={{ width: `${barPercent}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {status === "reached" ? "Goal met" : `${money(remaining)} remaining`}
        {monthlyAmount !== null ? ` · set aside ${money(monthlyAmount)}/month to make it` : null}
      </p>
      {goal.hasFundingBankAccount ? null : (
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-destructive">
          <IconAlertTriangle className="size-3.5" aria-hidden />
          No {goal.currency} account can fund this Goal.
          <DrawerTrigger
            handle={registerBankAccountDrawerHandle}
            payload={{ currency: goal.currency }}
            render={<Button variant="link" size="xs" className="h-auto p-0 text-xs" />}
          >
            Register a/an {goal.currency} account
          </DrawerTrigger>
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* C — Side panel: ledger and Goal side by side on desktop. The panel   */
/* is a vertical summary with a big ring and status; the ledger keeps   */
/* the full height. Stacks (compact) on mobile.                         */
/* ------------------------------------------------------------------ */

export function VariantC({ name, bucketId, goal, bucketActions, ledger }: VariantProps) {
  return (
    <Main>
      <div className="flex items-baseline justify-between">
        <Heading className="capitalize">{name}</Heading>
        {bucketActions}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <aside className="lg:sticky lg:top-4 lg:order-2">
          {goal ? <PanelGoal goal={goal} /> : <PanelEmpty bucketId={bucketId} />}
        </aside>
        <div className="min-w-0 lg:order-1">{ledger}</div>
      </div>
    </Main>
  );
}

function PanelEmpty({ bucketId }: { bucketId: string }) {
  return (
    <div className="flex flex-col items-start gap-y-2 rounded-lg border border-dashed p-4">
      <IconTarget className="size-5 text-muted-foreground" aria-hidden />
      <p className="text-muted-foreground">No goal yet. Set a target to track progress.</p>
      <AddGoalButton bucketId={bucketId} />
    </div>
  );
}

function PanelGoal({ goal }: { goal: Goal }) {
  const { status, percent, remaining, monthlyAmount, money, dateLabel, dateDetail } =
    useGoalFigures(goal);

  return (
    <div className="flex flex-col gap-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <GoalStatusBadge status={status} />
        <GoalActionsDropdownMenu goalId={goal.id} bucketId={goal.bucketId} />
      </div>

      <div className="flex items-center gap-x-4 lg:flex-col lg:items-start lg:gap-y-3">
        <ProgressRing
          percent={percent}
          label={`${percent}% of goal saved`}
          className={cn(
            STATUS_TONES[status],
            "size-16 lg:size-28 [&>span]:text-sm lg:[&>span]:text-xl",
          )}
        />
        <div className="flex flex-col tabular-nums">
          <span className="text-xl font-semibold">{money(goal.progress)}</span>
          <span className="text-muted-foreground">of {money(goal.targetAmount)}</span>
        </div>
      </div>

      <dl className="flex flex-col gap-y-2 border-t pt-3">
        <div className="flex items-baseline justify-between gap-x-2">
          <dt className="text-muted-foreground">{status === "reached" ? "Over" : "Remaining"}</dt>
          <dd className="font-medium tabular-nums">
            {status === "reached" ? money(goal.progress - goal.targetAmount) : money(remaining)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-x-2">
          <dt className="text-muted-foreground">Target date</dt>
          <dd className={cn("text-right font-medium", status === "overdue" && "text-destructive")}>
            {goal.targetDate ? `${dateLabel}${dateDetail ? ` · ${dateDetail}` : ""}` : "None"}
          </dd>
        </div>
      </dl>

      {monthlyAmount !== null ? (
        <div className="rounded-md bg-muted px-3 py-2">
          <span className="font-semibold tabular-nums">{money(monthlyAmount)}</span>
          <span className="text-muted-foreground"> / month to make it</span>
        </div>
      ) : null}

      {goal.hasFundingBankAccount ? null : (
        <div className="flex flex-col items-start gap-y-2 rounded-md border border-destructive/40 p-3">
          <p className="flex gap-x-2 text-xs">
            <IconAlertTriangle className="size-4 shrink-0 text-destructive" aria-hidden />
            No {goal.currency} account can fund this Goal.
          </p>
          <RegisterAccountButton currency={goal.currency} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mock-state bar (bottom-left): force a status/edge case on demand.    */
/* ------------------------------------------------------------------ */

export function PrototypeMockBar({
  current,
  onChange,
}: {
  current: PrototypeMock | undefined;
  onChange: (mock: PrototypeMock | undefined) => void;
}) {
  if (import.meta.env.PROD) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-wrap gap-1 rounded-lg bg-foreground p-1 text-xs shadow-lg">
      {([undefined, ...PROTOTYPE_MOCKS] as const).map((mock) => (
        <button
          key={mock ?? "real"}
          type="button"
          onClick={() => onChange(mock)}
          aria-pressed={mock === current}
          className={cn(
            "rounded-md px-2 py-1 font-medium",
            mock === current ? "bg-background text-foreground" : "text-background/70",
          )}
        >
          {mock ?? "real"}
        </button>
      ))}
    </div>
  );
}
