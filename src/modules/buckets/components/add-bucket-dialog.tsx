import { IconCheck, IconExclamationCircle } from "@tabler/icons-react";
import z from "zod";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { DialogState } from "#/lib/types";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "#/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "#/components/ui/input-group";
import { Spinner } from "#/components/ui/spinner";
import { useAppForm } from "#/integrations/tanstack-form";
import { validateBucketName } from "#/modules/buckets/functions";
import { useAddBucketMutation } from "#/modules/buckets/mutations";
import { addBucketSchema } from "#/modules/buckets/schemas";
import { confirm } from "#/stores/use-confirm";

export const useAddBucketDialogStore = create<DialogState>()((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state) => ({ isOpen: !state.isOpen })),
}));

export function AddBucketDialog() {
  const { isOpen, closeDialog, toggleDialog } = useAddBucketDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,
    })),
  );

  const mutation = useAddBucketMutation();

  const defaultValues: z.input<typeof addBucketSchema> = {
    name: "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onBlur: addBucketSchema,
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
      const confirmed = await confirm("Discard new bucket?", {
        description: "The bucket details you entered will be lost.",
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
          <DialogTitle>Add Bucket</DialogTitle>
          <DialogDescription>Create a bucket to organize your money.</DialogDescription>
        </DialogHeader>
        <div>
          <form
            id={form.formId}
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.AppField
                name="name"
                validators={{
                  onChangeAsyncDebounceMs: 500,
                  onChangeAsync: addBucketSchema.shape.name.superRefine(async (data, context) => {
                    if (!data) return;

                    try {
                      const { isValid, message } = await validateBucketName({
                        data,
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

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={id}>Name</FieldLabel>

                      <InputGroup>
                        <InputGroupInput
                          type="text"
                          id={id}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          aria-invalid={isInvalid ? true : undefined}
                          aria-labelledby={isInvalid ? errorId : undefined}
                          maxLength={100}
                        />
                        {field.state.meta.isTouched ? (
                          <InputGroupAddon align="inline-end">
                            {field.state.meta.isValidating ? (
                              <Spinner />
                            ) : field.state.meta.isValid ? (
                              <IconCheck />
                            ) : (
                              <IconExclamationCircle />
                            )}
                          </InputGroupAddon>
                        ) : null}
                      </InputGroup>
                      {isInvalid && <FieldError id={errorId} errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              </form.AppField>
            </FieldGroup>
          </form>
        </div>
        <DialogFooter>
          <form.AppForm>
            <form.Button form={form.formId}>Add Bucket</form.Button>
          </form.AppForm>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
