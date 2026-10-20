import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";

type BankAccountFiguresProps = {
  balance: number;
  unallocated: number;
  currency: string;
  className?: string;
};

export function BankAccountFigures({
  balance,
  unallocated,
  currency,
  className,
}: BankAccountFiguresProps) {
  const wrapperClassName = cn(
    "flex items-center gap-1.5 text-muted-foreground tabular-nums",
    className,
  );

  if (balance === unallocated) {
    return <span className={wrapperClassName}>{formatMoney(balance, currency)}</span>;
  }

  return (
    <span className={wrapperClassName}>
      <span>{formatMoney(balance, currency)} bal</span>
      <span className="text-foreground/30">·</span>
      <span>{formatMoney(unallocated, currency)} free</span>
    </span>
  );
}
