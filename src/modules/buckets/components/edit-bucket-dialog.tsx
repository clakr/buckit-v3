import { IconCheck, IconExclamationCircle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import z from "zod";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import type { Bucket } from "#/db/schema";
import type { DialogState } from "#/lib/types";

import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
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
import { validateEditBucketName } from "#/modules/buckets/functions";
import { useEditBucketMutation } from "#/modules/buckets/mutations";
import { editBucketSchema } from "#/modules/buckets/schemas";
import { confirm } from "#/stores/use-confirm";

import { bucketQueryOption } from "../query-options";

type StoreState = DialogState & {
  bucketId: Bucket["id"] | null;
  setBucketId: (bucketId: Bucket["id"]) => void;
};

export const useEditBucketDialogStore = create<StoreState>()((set) => ({
  isOpen: false,
  openDialog: () => set({ isOpen: true }),
  closeDialog: () => set({ isOpen: false }),
  toggleDialog: () => set((state) => ({ isOpen: !state.isOpen })),

  bucketId: null,
  setBucketId: (bucketId) => set({ bucketId }),
}));

export function EditBucketDialog() {
  const { isOpen, closeDialog, toggleDialog, bucketId } = useEditBucketDialogStore(
    useShallow((state) => ({
      isOpen: state.isOpen,
      closeDialog: state.closeDialog,
      toggleDialog: state.toggleDialog,

      bucketId: state.bucketId,
    })),
  );

  // @todo: should distinguish if network error or data not found
  const {
    isLoading,
    isError,
    refetch,
    data: bucket,
  } = useQuery({
    ...bucketQueryOption(bucketId ?? ""),
    enabled: isOpen,
  });

  const mutation = useEditBucketMutation();

  const defaultValues: z.input<typeof editBucketSchema> = {
    bucketId: bucketId ?? "",
    name: bucket?.name ?? "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onBlur: editBucketSchema,
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
      const confirmed = await confirm("Discard editing bucket?", {
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
          <DialogTitle>Edit Bucket</DialogTitle>
          <DialogDescription>Update your bucket's name.</DialogDescription>
        </DialogHeader>
        <div>
          {isLoading ? (
            <StateTemplate
              state="loading"
              title="Loading bucket"
              description="Fetching bucket details..."
            />
          ) : null}
          {isError ? (
            <StateTemplate
              state="error"
              title="Could not load bucket"
              description="We weren't able to retrieve this bucket. Please check your connection and try again."
              content={<Button onClick={() => refetch()}>Retry</Button>}
            />
          ) : null}
          {bucket ? (
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
                    onChangeAsync: z.string().superRefine(async (data, context) => {
                      if (!data) return;

                      try {
                        const { isValid, message } = await validateEditBucketName({
                          data: {
                            bucketId: bucketId ?? "",
                            name: data,
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
          ) : null}
        </div>
        <DialogFooter>
          <form.AppForm>
            <form.Button form={form.formId}>Edit Bucket</form.Button>
          </form.AppForm>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
