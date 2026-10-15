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
import { FieldGroup } from "#/components/ui/field";
import { useAppForm } from "#/integrations/tanstack-form";
import { NotFoundError } from "#/lib/errors";
import { refineNameAvailability } from "#/lib/name-availability";
import { validateBucketName } from "#/modules/buckets/functions";
import { useEditBucketMutation } from "#/modules/buckets/mutations";
import { bucketQueryOption } from "#/modules/buckets/query-options";
import { editBucketSchema } from "#/modules/buckets/schemas";
import { confirm } from "#/stores/use-confirm";

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

  const {
    status,
    error,
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
      onChange: editBucketSchema,
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
          {status === "pending" ? (
            <StateTemplate
              state="loading"
              title="Loading bucket"
              description="Fetching bucket details..."
            />
          ) : null}
          {status === "error" && error instanceof NotFoundError ? (
            <StateTemplate
              state="error"
              title="Bucket not found"
              description={error.message}
              content={
                <Button variant="secondary" onClick={closeDialog}>
                  Close
                </Button>
              }
            />
          ) : null}
          {status === "error" && !(error instanceof NotFoundError) ? (
            <StateTemplate
              state="error"
              title="Could not load bucket"
              description="We weren't able to retrieve this bucket. Please check your connection and try again."
              content={<Button onClick={() => refetch()}>Retry</Button>}
            />
          ) : null}
          {status === "success" ? (
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
                    onChangeAsync: editBucketSchema.shape.name.superRefine(
                      refineNameAvailability((name) =>
                        validateBucketName({ data: { bucketId: bucket.id, name } }),
                      ),
                    ),
                  }}
                >
                  {(field) => <field.ValidatedInput label="Name" maxLength={100} />}
                </form.AppField>
              </FieldGroup>
            </form>
          ) : null}
        </div>
        {status === "success" ? (
          <DialogFooter>
            <form.AppForm>
              <form.Button form={form.formId}>Edit Bucket</form.Button>
            </form.AppForm>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
