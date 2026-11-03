import type { ReactNode } from "react";

type Props = {
  label: ReactNode;
  value: ReactNode;
  children?: ReactNode;
};

export function Stat({ label, value, children }: Props) {
  return (
    <div className="flex flex-col gap-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
      {children}
    </div>
  );
}
