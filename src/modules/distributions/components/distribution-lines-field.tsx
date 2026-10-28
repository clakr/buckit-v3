import type { ReactNode } from "react";

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
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { formatMoney } from "#/lib/money";
import { cn } from "#/lib/utils";
import { SEGMENT_SHADES } from "#/modules/distributions/components/split-summary";
import {
  computeDistributionPlan,
  draftsToPlanLines,
  type DistributionLineDraft,
} from "#/modules/distributions/utils";

type Bucket = { id: string; name: string };

const PRESSED_STYLE =
  "data-pressed:bg-primary data-pressed:text-primary-foreground data-pressed:hover:bg-primary/90";

type Props = {
  lines: DistributionLineDraft[];
  buckets: Bucket[];
  currency: string;
  amountCents: number;
  errors: ({ message?: string } | undefined)[];
  onSelectBuckets: (bucketIds: string[]) => void;
  onChangeMode: (index: number, mode: DistributionLineDraft["mode"]) => void;
  onRemove: (index: number) => void;
  /** The value input is a form field, so the form renders it. */
  renderValueInput: (index: number) => ReactNode;
};

/** Pick Buckets in a multiple-select Combobox. Each gets a compact card with its value. */
export function DistributionLinesField({
  lines,
  buckets,
  currency,
  amountCents,
  errors,
  onSelectBuckets,
  onChangeMode,
  onRemove,
  renderValueInput,
}: Props) {
  const anchor = useComboboxAnchor();
  const plan = computeDistributionPlan(draftsToPlanLines(lines), amountCents);

  const selected = lines.flatMap(
    (line) => buckets.find((bucket) => bucket.id === line.bucketId) ?? [],
  );

  return (
    <Field data-invalid={errors.length > 0}>
      <FieldLabel>Lines</FieldLabel>
      <Combobox
        multiple
        autoHighlight
        items={buckets}
        value={selected}
        onValueChange={(next: Bucket[]) => onSelectBuckets(next.map((bucket) => bucket.id))}
        itemToStringLabel={(bucket: Bucket) => bucket.name}
        itemToStringValue={(bucket: Bucket) => bucket.id}
      >
        <ComboboxChips ref={anchor}>
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
        <ComboboxContent anchor={anchor}>
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

      {plan.plannedLines.map((line, index) => {
        const bucket = buckets.find((other) => other.id === line.id);
        const draft = lines[index];

        return (
          <div key={line.id} className="flex flex-col gap-y-1.5 rounded-md border p-2">
            <div className="flex items-center gap-x-2">
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  SEGMENT_SHADES[index % SEGMENT_SHADES.length],
                )}
              />
              <span className="min-w-0 flex-1 truncate font-medium">{bucket?.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {formatMoney(line.cents, currency)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove ${bucket?.name}`}
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
