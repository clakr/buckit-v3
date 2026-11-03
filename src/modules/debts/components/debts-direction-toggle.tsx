import type { Debt } from "#/db/schema";

import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";

const ALL_DIRECTIONS = "all";

type Props = {
  debts: Pick<Debt, "direction">[];
  selectedDirection: Debt["direction"] | undefined;
  onSelectedDirectionChange: (direction: Debt["direction"] | undefined) => void;
};

export function DebtsDirectionToggle({
  debts,
  selectedDirection,
  onSelectedDirectionChange,
}: Props) {
  const receivableCount = debts.filter(({ direction }) => direction === "receivable").length;

  const options = [
    { value: ALL_DIRECTIONS, label: "All", count: debts.length },
    { value: "receivable", label: "Owed to You", count: receivableCount },
    { value: "payable", label: "You Owe", count: debts.length - receivableCount },
  ] as const;

  return (
    <ToggleGroup
      aria-label="Direction"
      variant="outline"
      spacing={0}
      value={[selectedDirection ?? ALL_DIRECTIONS]}
      onValueChange={([value]) => {
        if (!value) return;
        onSelectedDirectionChange(
          value === "receivable" || value === "payable" ? value : undefined,
        );
      }}
    >
      {options.map(({ value, label, count }) => (
        <ToggleGroupItem key={value} value={value}>
          {label}
          <span className="text-muted-foreground tabular-nums">{count}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
