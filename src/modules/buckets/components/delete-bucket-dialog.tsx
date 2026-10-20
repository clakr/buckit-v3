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
import { createDialogStore } from "#/stores/dialog-store";

import { useDeleteBucketMutation } from "../mutations";
import { bucketDeletionImpactQueryOption } from "../query-options";
import { verifyUserBucketMiddlewareSchema } from "../schemas";
import { BucketDeletionSummary, getBucketDeletionDescription } from "./bucket-deletion-summary";

export const useDeleteBucketDialogStore = createDialogStore<{ bucketId: Bucket["id"] | null }>({
  bucketId: null,
});

export function DeleteBucketDialog() {
  const { isOpen, payload, close } = useDeleteBucketDialogStore();
  const { bucketId } = payload;

  const mutation = useDeleteBucketMutation();

  const {
    status,
    error,
    refetch,
    data: impact,
  } = useQuery({
    ...bucketDeletionImpactQueryOption(bucketId ?? ""),
    enabled: isOpen && !mutation.isPending,
  });
  const notFoundError = error instanceof NotFoundError ? error : null;
  const bucket = impact?.bucket;

  const deleteSchema = z.object({
    ...verifyUserBucketMiddlewareSchema.shape,
    name: z.literal(bucket?.name ?? "", {
      error: "Doesn't match the bucket name.",
    }),
  });

  const defaultValues: z.input<typeof deleteSchema> = {
    bucketId: bucket?.id ?? "",
    name: "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: deleteSchema,
    },
    onSubmit: async ({ value: data }) => {
      try {
        await mutation.mutateAsync({ data });

        form.reset();
        close();
      } catch (error) {
        console.error(error);

        return;
      }
    },
  });

  async function handleOnOpenChange() {
    form.reset();
    close();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOnOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Bucket?</DialogTitle>
          <DialogDescription>
            {status === "success"
              ? getBucketDeletionDescription({ impact })
              : "Permanently delete this bucket and its allocations. This cannot be undone."}
          </DialogDescription>
        </DialogHeader>
        <div>
          {status === "pending" ? (
            <StateTemplate
              state="loading"
              title="Loading bucket"
              description="Fetching allocations and accounts to review before deletion..."
            />
          ) : null}
          {status === "error" && notFoundError ? (
            <StateTemplate
              state="error"
              title="Bucket not found"
              description={notFoundError.message}
              content={
                <Button variant="secondary" onClick={close}>
                  Close
                </Button>
              }
            />
          ) : null}
          {status === "error" && !notFoundError ? (
            <StateTemplate
              state="error"
              title="Could not load bucket"
              description="We weren't able to retrieve this bucket's details. Please check your connection and try again."
              content={<Button onClick={() => refetch()}>Retry</Button>}
            />
          ) : null}
          {status === "success" ? (
            <div className="flex flex-col gap-y-4">
              <BucketDeletionSummary impact={impact} />
              <form
                id={form.formId}
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  form.handleSubmit();
                }}
              >
                <FieldGroup>
                  <form.AppField name="name">
                    {(field) => (
                      <field.ValidatedInput
                        label={`Type "${impact.bucket.name}" to confirm`}
                        maxLength={100}
                      />
                    )}
                  </form.AppField>
                </FieldGroup>
              </form>
            </div>
          ) : null}
        </div>
        {status === "success" ? (
          <DialogFooter>
            <form.AppForm>
              <form.Button form={form.formId} variant="destructive">
                Delete Bucket
              </form.Button>
            </form.AppForm>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
