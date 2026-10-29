import type { DistributionDeletionImpact } from "#/modules/distributions/cleanup.server";

import { MODULE_ICONS } from "#/lib/constants";

type Cause = { via: "bank-account" } | { via: "line"; targetName: string };

type Props = { distributions: DistributionDeletionImpact[] } & Cause;

function describeDistributionOutcome(distribution: DistributionDeletionImpact, props: Cause) {
  if (props.via === "bank-account") return "will also be deleted, because it uses this account";

  return distribution.isDeleted
    ? `will also be deleted, because its only line is ${props.targetName}`
    : `loses its line for ${props.targetName}`;
}

export function DistributionDeletionList({ distributions, ...props }: Props) {
  if (!distributions.length) return null;

  return (
    <div className="flex flex-col gap-y-1.5">
      <p className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
        Distributions
      </p>
      <ul className="flex flex-col gap-y-1.5">
        {distributions.map((distribution) => (
          <li key={distribution.id} className="flex items-start gap-x-1.5">
            <MODULE_ICONS.distributions className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="font-semibold">{distribution.name}</span>{" "}
              {describeDistributionOutcome(distribution, props)}.
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
