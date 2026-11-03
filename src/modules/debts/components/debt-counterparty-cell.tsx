import { IconArrowDownLeft, IconArrowUpRight } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import type { Debt } from "#/db/schema";

import { Avatar, AvatarFallback } from "#/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";

type Props = {
  debt: Pick<Debt, "id" | "name" | "note" | "direction">;
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter((word) => /^[\p{L}\p{N}]/u.test(word))
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join("")
    .toUpperCase();
}

export function DebtCounterpartyCell({ debt }: Props) {
  const isReceivable = debt.direction === "receivable";
  const DirectionIcon = isReceivable ? IconArrowDownLeft : IconArrowUpRight;

  return (
    <div className="flex max-w-72 items-center gap-x-3">
      <Avatar aria-hidden>
        <AvatarFallback
          className={cn(
            "font-medium",
            isReceivable
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
          )}
        >
          {getInitials(debt.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-col">
        <Link
          to="/debts/$debtId"
          params={{ debtId: debt.id }}
          className="block max-w-[20ch] font-semibold wrap-break-word whitespace-normal underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
        >
          {debt.name}
        </Link>
        <span className="flex min-w-0 items-center gap-x-1 text-xs text-muted-foreground">
          <span
            className={cn(
              "flex shrink-0 items-center gap-x-0.5 font-medium",
              isReceivable
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400",
            )}
          >
            <DirectionIcon aria-hidden className="size-3.5" />
            {isReceivable ? "Owes you" : "You owe"}
          </span>
          {debt.note ? (
            <>
              <span aria-hidden>·</span>
              <Tooltip>
                <TooltipTrigger render={<span className="truncate text-start" />}>
                  {debt.note}
                </TooltipTrigger>
                <TooltipContent>{debt.note}</TooltipContent>
              </Tooltip>
            </>
          ) : null}
        </span>
      </div>
    </div>
  );
}
