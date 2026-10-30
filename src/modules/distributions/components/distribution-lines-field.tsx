import type { ReactNode, RefObject } from "react";

import { IconChevronDown, IconX } from "@tabler/icons-react";

import type { createDrawerHandle } from "#/components/ui/drawer";
import type { RecordDebtDrawerPayload } from "#/modules/debts/components/record-debt-drawer";

import { Button } from "#/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "#/components/ui/combobox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldError, FieldLabel } from "#/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton } from "#/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";
import { SEGMENT_SHADES } from "#/modules/distributions/components/split-summary";
import {
  computeDistributionPlan,
  draftsToPlanLines,
  getLineTargetId,
  type DistributionLineDraft,
  type DistributionLineTarget,
} from "#/modules/distributions/utils";

type Bucket = { id: string; name: string };
type LineDebt = { id: string; name: string; direction: "receivable" | "payable" };

/** One entry in the picker. Buckets and Debts share it, so the kind tells them apart. */
type LineOption =
  | { kind: "bucket"; id: string; name: string }
  | { kind: "debt"; id: string; name: string; direction: LineDebt["direction"] };

const PRESSED_STYLE =
  "data-pressed:bg-primary data-pressed:text-primary-foreground data-pressed:hover:bg-primary/90";

type Props = {
  lines: DistributionLineDraft[];
  buckets: Bucket[];
  setUpBucketHandle: ReturnType<typeof createDrawerHandle>;
  recordDebtHandle: ReturnType<typeof createDrawerHandle<RecordDebtDrawerPayload>>;
  /** The menu button the nested Drawers return focus to once they close. */
  createTargetButtonRef: RefObject<HTMLButtonElement | null>;
  /** Only Debts in the Bank Account's currency, because a Debt line is paid through that account. */
  debts: LineDebt[];
  /** Why Debts can't be picked or recorded, when there is no account to take their currency from. */
  debtsUnavailableReason: string | null;
  currency: string;
  amountCents: number;
  errors: ({ message?: string } | undefined)[];
  onSelectTargets: (targets: DistributionLineTarget[]) => void;
  onChangeMode: (index: number, mode: DistributionLineDraft["mode"]) => void;
  onRemove: (index: number) => void;
  /** The value input is a form field, so the form renders it. */
  renderValueInput: (index: number) => ReactNode;
};

function toLineTarget(option: LineOption): DistributionLineTarget {
  return option.kind === "bucket"
    ? { kind: "bucket", bucketId: option.id }
    : { kind: "debt", debtId: option.id, direction: option.direction };
}

/**
 * Pick Buckets and Debts in one multiple-select Combobox, grouped by kind. Each pick gets a compact
 * card with its value. The picker's add-on creates a new Bucket or Debt through a nested Drawer.
 */
export function DistributionLinesField({
  lines,
  buckets,
  setUpBucketHandle,
  recordDebtHandle,
  createTargetButtonRef,
  debts,
  debtsUnavailableReason,
  currency,
  amountCents,
  errors,
  onSelectTargets,
  onChangeMode,
  onRemove,
  renderValueInput,
}: Props) {
  const anchor = useComboboxAnchor();
  const plan = computeDistributionPlan(draftsToPlanLines(lines), amountCents);

  const bucketOptions = buckets.map((bucket): LineOption => ({ kind: "bucket", ...bucket }));
  const debtOptions = debts.map((debt): LineOption => ({ kind: "debt", ...debt }));
  const groups = [
    { value: "Buckets", items: bucketOptions },
    { value: "Debts", items: debtOptions },
  ];

  const selectedOptions = lines.flatMap((line) =>
    [...bucketOptions, ...debtOptions].filter(
      (option) => option.kind === line.kind && option.id === getLineTargetId(line),
    ),
  );

  return (
    <Field data-invalid={errors.length > 0}>
      <FieldLabel>Lines</FieldLabel>
      <Combobox
        multiple
        autoHighlight
        items={groups}
        value={selectedOptions}
        onValueChange={(next: LineOption[]) => onSelectTargets(next.map(toLineTarget))}
        isItemEqualToValue={(option: LineOption, selected: LineOption) =>
          option.kind === selected.kind && option.id === selected.id
        }
        itemToStringLabel={(option: LineOption) => option.name}
        itemToStringValue={(option: LineOption) => `${option.kind}:${option.id}`}
      >
        <InputGroup
          ref={anchor}
          className="h-auto min-h-7 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30"
        >
          <ComboboxChips className="min-w-0 flex-1 border-0 bg-transparent focus-within:ring-0 dark:bg-transparent">
            <ComboboxValue>
              {(values: LineOption[]) => (
                <>
                  {values.map((option) => (
                    <ComboboxChip key={`${option.kind}:${option.id}`}>{option.name}</ComboboxChip>
                  ))}
                  <ComboboxChipsInput placeholder={values.length ? "" : "Pick Buckets and Debts"} />
                </>
              )}
            </ComboboxValue>
          </ComboboxChips>
          <InputGroupAddon align="inline-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                ref={createTargetButtonRef}
                render={<InputGroupButton variant="ghost" className="pr-1.5! text-xs" />}
              >
                Create New
                <IconChevronDown />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-fit">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => setUpBucketHandle.open(null)}>
                    New Bucket
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={debtsUnavailableReason !== null}
                    onClick={() => recordDebtHandle.openWithPayload({ currency })}
                  >
                    <span className="flex flex-col">
                      New Debt
                      {debtsUnavailableReason ? (
                        <span className="max-w-48 text-muted-foreground">
                          {debtsUnavailableReason}
                        </span>
                      ) : null}
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </InputGroupAddon>
        </InputGroup>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>No Buckets or Debts found.</ComboboxEmpty>
          <ComboboxList>
            {(group: (typeof groups)[number]) => (
              <ComboboxGroup key={group.value} items={group.items}>
                <ComboboxLabel>{group.value}</ComboboxLabel>
                <ComboboxCollection>
                  {(option: LineOption) => (
                    <ComboboxItem key={`${option.kind}:${option.id}`} value={option}>
                      <span className="min-w-0 flex-1 truncate">{option.name}</span>
                      {option.kind === "debt" ? (
                        <span className="text-muted-foreground capitalize">{option.direction}</span>
                      ) : null}
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {debtsUnavailableReason ? (
        <FieldDescription>{debtsUnavailableReason}</FieldDescription>
      ) : null}

      {plan.plannedLines.map((line, index) => {
        const draft = lines[index];
        const targetName =
          draft.kind === "bucket"
            ? buckets.find((bucket) => bucket.id === draft.bucketId)?.name
            : debts.find((debt) => debt.id === draft.debtId)?.name;

        return (
          <div
            key={getLineTargetId(draft)}
            className="flex flex-col gap-y-1.5 rounded-md border p-2"
          >
            <div className="flex items-center gap-x-2">
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  SEGMENT_SHADES[index % SEGMENT_SHADES.length],
                )}
              />
              <span className="min-w-0 flex-1 truncate font-medium">{targetName}</span>
              {draft.kind === "debt" ? (
                <span className="text-muted-foreground capitalize">{draft.direction}</span>
              ) : null}
              <span className="text-muted-foreground tabular-nums">
                {formatMoney(line.cents, currency)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove ${targetName}`}
                onClick={() => onRemove(index)}
              >
                <IconX />
              </Button>
            </div>
            <div className="flex items-start gap-x-2">
              <ToggleGroup
                variant="outline"
                spacing={0}
                value={[draft.mode]}
                onValueChange={(next) => {
                  const mode = next[0] as DistributionLineDraft["mode"] | undefined;
                  if (mode && mode !== draft.mode) onChangeMode(index, mode);
                }}
                aria-label="Line type"
              >
                <ToggleGroupItem
                  value="percent"
                  aria-label="Percentage of the amount"
                  className={PRESSED_STYLE}
                >
                  %
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="fixed"
                  aria-label={`Fixed ${currency} amount`}
                  className={PRESSED_STYLE}
                >
                  {currency}
                </ToggleGroupItem>
              </ToggleGroup>
              {renderValueInput(index)}
            </div>
          </div>
        );
      })}

      {errors.length > 0 ? <FieldError errors={errors} /> : null}
    </Field>
  );
}
