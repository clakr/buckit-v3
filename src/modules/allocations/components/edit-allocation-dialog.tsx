import { IconAlertCircle, IconFileDescription } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { Allocation } from "#/db/schema";
import type { DialogState } from "#/lib/types";

import { StateTemplate } from "#/components/state-template";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "#/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "#/components/ui/input-group";
import { Spinner } from "#/components/ui/spinner";
import { useAppForm } from "#/integrations/tanstack-form";
import { currencyCodec } from "#/lib/codecs";
import { getCurrency, isCurrencyCode } from "#/lib/utils";
import { BaseAllocationFieldGroup, baseAllocationFields } from "#/modules/allocations/forms";
import { validateEditAllocationAmount } from "#/modules/allocations/functions";
import { useEditAllocationMutation } from "#/modules/allocations/mutations";
import { allocationQueryOption } from "#/modules/allocations/query-options";
import { editAllocationSchema } from "#/modules/allocations/schemas";
import { baseTransactionDefaultValues } from "#/modules/transactions/forms";
import { confirm } from "#/stores/use-confirm";

type StoreState = DialogState & {
  allocationId: Allocation["id"] | null;
  setAllocationId: (allocationId: Allocation["id"]) => void;
};

export const useEditAllocationDialogStore = create<StoreState>()((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state) => ({ isOpen: !state.isOpen })),

  allocationId: null,
  setAllocationId: (allocationId) => set({ allocationId }),
}));

export function EditAllocationDialog() {
  const { isOpen, closeDialog, toggleDialog, allocationId } = useEditAllocationDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,

      allocationId: state.allocationId,
    })),
  );

  const {
    isLoading,
    isError,
    refetch,
    data: allocation,
  } = useQuery({
    ...allocationQueryOption(allocationId ?? ""),
    enabled: isOpen,
  });

  const mutation = useEditAllocationMutation();

  const defaultValues: z.input<typeof editAllocationSchema> = {
    allocationId: allocationId ?? "",
    amount: currencyCodec.encode(allocation?.amount ?? 0),
    date: allocation?.date ?? baseTransactionDefaultValues.date,
    note: allocation?.note ?? baseTransactionDefaultValues.note,
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onBlur: editAllocationSchema,
    },
    onSubmit: async ({ value: data }) => {
      try {
        await mutation.mutateAsync({ data });
      } catch (error) {
        console.error(error);

        return;
      }

      form.reset();
      closeDialog();
    },
  });

  async function handleOnOpenChange(open: boolean) {
    if (!open && form.state.isDirty) {
      const confirmed = await confirm("Discard editing allocation?", {
        description: "The allocation details you entered will be lost.",
        confirmLabel: "Keep Editing",
        cancelLabel: "Discard",
        dismissValue: true,
      });

      if (confirmed) return;
    }

    form.reset();

    toggleDialog();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Allocation</DialogTitle>
        </DialogHeader>
        <div>
          {isLoading ? (
            <StateTemplate
              state="loading"
              title="Loading allocation"
              description="Fetching allocation details..."
            />
          ) : null}
          {isError ? (
            <StateTemplate
              state="error"
              title="Could not load allocation"
              description="We weren't able to retrieve this allocation. Please check your connection and try again."
              content={<Button onClick={() => refetch()}>Retry</Button>}
            />
          ) : null}
          {allocation ? (
            <form
              id={form.formId}
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
              className="flex flex-col gap-y-4"
            >
              <form.AppField
                name="amount"
                validators={{
                  onChangeAsyncDebounceMs: 500,
                  onChangeAsync: z.string().superRefine(async (data, context) => {
                    try {
                      const { isValid, message } = await validateEditAllocationAmount({
                        data: {
                          allocationId: allocation.id,
                          bankAccountId: allocation.bankAccountId,
                          amount: data,
                        },
                      });

                      if (!isValid) throw new Error(message);
                    } catch (error) {
                      context.addIssue({
                        code: "custom",
                        message: error instanceof Error ? error.message : String(error),
                      });
                    }
                  }),
                }}
              >
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                  const id = field.name;
                  const errorId = `${id}-error`;

                  const accountCurrency = allocation.bankAccount?.currency ?? "PHP";

                  const validated = isCurrencyCode(accountCurrency);
                  if (!validated) return null;

                  const currency = getCurrency(accountCurrency);
                  if (!currency) return null;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={id}>Amount</FieldLabel>

                      <InputGroup>
                        <InputGroupAddon>
                          <InputGroupText>{currency.symbol}</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          type="number"
                          id={field.name}
                          placeholder="0.00"
                          min={0}
                          step={0.01}
                          required
                          value={field.state.value as string}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          aria-invalid={isInvalid ? true : undefined}
                          aria-labelledby={isInvalid ? "startingBalance-error" : undefined}
                        />
                        <InputGroupAddon align="inline-end">
                          {field.state.meta.isValidating ? (
                            <Spinner />
                          ) : (
                            <InputGroupText>{currency.code}</InputGroupText>
                          )}
                        </InputGroupAddon>
                      </InputGroup>

                      {isInvalid && <FieldError id={errorId} errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              </form.AppField>
              <BaseAllocationFieldGroup form={form} fields={baseAllocationFields} />
              <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
                {(error) =>
                  error ? (
                    <Alert variant="destructive" className="max-w-md">
                      <IconAlertCircle />
                      <AlertTitle>Edit Allocation failed</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : null
                }
              </form.Subscribe>
            </form>
          ) : (
            <StateTemplate
              state="empty"
              title="Allocation not found"
              description="This allocation doesn't exist or may have been deleted."
              icon={<IconFileDescription />}
            />
          )}
        </div>
        <DialogFooter>
          <form.AppForm>
            <form.Button form={form.formId}>Edit Allocation</form.Button>
          </form.AppForm>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
