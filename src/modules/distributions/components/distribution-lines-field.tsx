import type { ReactNode, RefObject } from "react";

import { IconX } from "@tabler/icons-react";

import { Button } from "#/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "#/components/ui/combobox";
import { createDrawerHandle, DrawerTrigger } from "#/components/ui/drawer";
import { Field, FieldDescription, FieldError, FieldLabel } from "#/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";
import { SEGMENT_SHADES } from "#/modules/distributions/components/split-summary";
import {
  computeDistributionPlan,
  draftsToPlanLines,
  getLineTargetId,
  type DistributionLineDraft,
} from "#/modules/distributions/utils";

type Bucket = { id: string; name: string };
type LineDebt = { id: string; name: string; direction: "receivable" | "payable" };

const PRESSED_STYLE =
  "data-pressed:bg-primary data-pressed:text-primary-foreground data-pressed:hover:bg-primary/90";

type Props = {
  lines: DistributionLineDraft[];
  buckets: Bucket[];
  setUpBucketHandle: ReturnType<typeof createDrawerHandle>;
  setUpBucketButtonRef: RefObject<HTMLButtonElement | null>;
  /** Only Debts in the Bank Account's currency, because a Debt line is paid through that account. */
  debts: LineDebt[];
  /** Why the Debt picker is off, when there is no account to take its currency from. */
  debtsUnavailableReason: string | null;
  currency: string;
  amountCents: number;
  errors: ({ message?: string } | undefined)[];
  onSelectBuckets: (bucketIds: string[]) => void;
  onSelectDebts: (debtIds: string[]) => void;
  onChangeMode: (index: number, mode: DistributionLineDraft["mode"]) => void;
  onRemove: (index: number) => void;
  /** The value input is a form field, so the form renders it. */
  renderValueInput: (index: number) => ReactNode;
};

/** Pick Buckets and Debts in multiple-select Comboboxes. Each gets a compact card with its value. */
export function DistributionLinesField({
  lines,
  buckets,
  setUpBucketHandle,
  setUpBucketButtonRef,
  debts,
  debtsUnavailableReason,
  currency,
  amountCents,
  errors,
  onSelectBuckets,
  onSelectDebts,
  onChangeMode,
  onRemove,
  renderValueInput,
}: Props) {
  const bucketAnchor = useComboboxAnchor();
  const debtAnchor = useComboboxAnchor();
  const plan = computeDistributionPlan(draftsToPlanLines(lines), amountCents);

  const selectedBuckets = lines.flatMap((line) =>
    line.kind === "bucket" ? (buckets.find((bucket) => bucket.id === line.bucketId) ?? []) : [],
  );
  const selectedDebts = lines.flatMap((line) =>
    line.kind === "debt" ? (debts.find((debt) => debt.id === line.debtId) ?? []) : [],
  );

  return (
    <Field data-invalid={errors.length > 0}>
      <FieldLabel>Lines</FieldLabel>
      <Combobox
        multiple
        autoHighlight
        items={buckets}
        value={selectedBuckets}
        onValueChange={(next: Bucket[]) => onSelectBuckets(next.map((bucket) => bucket.id))}
        itemToStringLabel={(bucket: Bucket) => bucket.name}
        itemToStringValue={(bucket: Bucket) => bucket.id}
      >
        <ComboboxChips ref={bucketAnchor}>
          <ComboboxValue>
            {(values: Bucket[]) => (
              <>
                {values.map((bucket) => (
                  <ComboboxChip key={bucket.id}>{bucket.name}</ComboboxChip>
                ))}
                <ComboboxChipsInput placeholder={values.length ? "" : "Pick Buckets"} />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={bucketAnchor}>
          <ComboboxEmpty>No Buckets found.</ComboboxEmpty>
          <ComboboxList>
            {(bucket: Bucket) => (
              <ComboboxItem key={bucket.id} value={bucket}>
                {bucket.name}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <DrawerTrigger
        ref={setUpBucketButtonRef}
        handle={setUpBucketHandle}
        render={<Button type="button" variant="outline" size="sm" className="w-fit" />}
      >
        Set up a new Bucket
      </DrawerTrigger>

      <Combobox
        multiple
        autoHighlight
        disabled={debtsUnavailableReason !== null}
        items={debts}
        value={selectedDebts}
        onValueChange={(next: LineDebt[]) => onSelectDebts(next.map((debt) => debt.id))}
        itemToStringLabel={(debt: LineDebt) => debt.name}
        itemToStringValue={(debt: LineDebt) => debt.id}
      >
        <ComboboxChips ref={debtAnchor}>
          <ComboboxValue>
            {(values: LineDebt[]) => (
              <>
                {values.map((debt) => (
                  <ComboboxChip key={debt.id}>{debt.name}</ComboboxChip>
                ))}
                <ComboboxChipsInput placeholder={values.length ? "" : "Pick Debts"} />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={debtAnchor}>
          <ComboboxEmpty>No Debts in {currency}.</ComboboxEmpty>
          <ComboboxList>
            {(debt: LineDebt) => (
              <ComboboxItem key={debt.id} value={debt}>
                <span className="min-w-0 flex-1 truncate">{debt.name}</span>
                <span className="text-muted-foreground capitalize">{debt.direction}</span>
              </ComboboxItem>
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
