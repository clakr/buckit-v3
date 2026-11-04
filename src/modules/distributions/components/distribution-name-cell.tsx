import { Link } from "@tanstack/react-router";

import type { DistributionRow } from "#/modules/distributions/attention";

import { DistributionAmountFigures } from "#/modules/distributions/components/distribution-amount-figures";
import { DistributionRecipeCell } from "#/modules/distributions/components/distribution-recipe-cell";

export function DistributionNameCell({ distribution }: { distribution: DistributionRow }) {
  const { bankAccount } = distribution;

  return (
    <div className="flex flex-col max-sm:w-[calc(100vw-10.25rem)] sm:max-w-64 sm:min-w-40">
      <span className="font-semibold wrap-break-word whitespace-normal">{distribution.name}</span>
      <span className="flex min-w-0 text-xs text-muted-foreground">
        <span className="sr-only">Into </span>
        <Link
          to="/accounts/$accountId"
          params={{ accountId: bankAccount.id }}
          title={bankAccount.name}
          className="truncate underline decoration-dotted underline-offset-4 hover:text-foreground"
        >
          {bankAccount.name}
        </Link>
      </span>
      <div className="mt-2 flex flex-col gap-y-2 sm:hidden">
        <div className="flex flex-col">
          <DistributionAmountFigures distribution={distribution} />
        </div>
        <DistributionRecipeCell distribution={distribution} />
      </div>
    </div>
  );
}
