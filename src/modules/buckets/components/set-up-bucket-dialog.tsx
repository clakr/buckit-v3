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
import { AppError } from "#/lib/errors";
import { validateBucketName } from "#/modules/buckets/functions";
import { useSetUpBucketMutation } from "#/modules/buckets/mutations";
import { setUpBucketSchema } from "#/modules/buckets/schemas";
import { confirm } from "#/stores/use-confirm";

export const useSetUpBucketDialogStore = create<DialogState>()((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state) => ({ isOpen: !state.isOpen })),
}));

export function SetUpBucketDialog() {
  const { isOpen, closeDialog, toggleDialog } = useSetUpBucketDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,
    })),
  );

  const mutation = useSetUpBucketMutation();

  const defaultValues: z.input<typeof setUpBucketSchema> = {
    name: "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: setUpBucketSchema,
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
          <DialogTitle>Set Up Bucket</DialogTitle>
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
                  onChangeAsync: setUpBucketSchema.shape.name.superRefine(async (data, context) => {
                    if (!data) return;

                    try {
                      const { isValid, message } = await validateBucketName({
                        data: { name: data },
                      });

                      if (!isValid) context.addIssue({ code: "custom", message });
                    } catch (error) {
                      console.error(error);

                      context.addIssue({
                        code: "custom",
                        message:
                          error instanceof AppError
                            ? error.message
                            : "Couldn't check this name. Please try again.",
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
            <form.Button form={form.formId}>Set Up Bucket</form.Button>
          </form.AppForm>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
