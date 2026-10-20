import { useQuery } from "@tanstack/react-query";
import z from "zod";

import type { Bucket } from "#/db/schema";

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
import { createDialogStore } from "#/stores/dialog-store";
import { confirm } from "#/stores/use-confirm";

export const useEditBucketDialogStore = createDialogStore<{ bucketId: Bucket["id"] | null }>({
  bucketId: null,
});

export function EditBucketDialog() {
  const { isOpen, payload, close } = useEditBucketDialogStore();
  const { bucketId } = payload;

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
      close();
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

    close();
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
                <Button variant="secondary" onClick={close}>
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
                        validateBucketName({ data: { excludeId: bucket.id, name } }),
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
