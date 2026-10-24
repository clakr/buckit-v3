import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useImperativeHandle, useRef, type Ref } from "react";
import z from "zod";

import type { Bucket } from "#/db/schema";

import { StateTemplate } from "#/components/state-template";
import { Button } from "#/components/ui/button";
import {
  createDrawerHandle,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  ResponsiveDrawer,
  type DrawerChangeEventDetails,
} from "#/components/ui/drawer";
import { FieldGroup } from "#/components/ui/field";
import { useAppForm } from "#/integrations/tanstack-form";
import { NotFoundError } from "#/lib/errors";
import { refineNameAvailability } from "#/lib/name-availability";
import { validateBucketName } from "#/modules/buckets/functions";
import { useEditBucketMutation } from "#/modules/buckets/mutations";
import { bucketQueryOption } from "#/modules/buckets/query-options";
import { editBucketSchema } from "#/modules/buckets/schemas";
import { confirm } from "#/stores/use-confirm";

export const editBucketDrawerHandle = createDrawerHandle<{ bucketId: Bucket["id"] }>();

type EditBucketFormControls = {
  isDirty: () => boolean;
  reset: () => void;
};

export function EditBucketDrawer() {
  const formControlsRef = useRef<EditBucketFormControls>(null);

  async function handleOnOpenChange(open: boolean, eventDetails: DrawerChangeEventDetails) {
    if (open || !formControlsRef.current?.isDirty()) return;

    eventDetails.cancel();

    const confirmed = await confirm("Discard editing bucket?", {
      description: "The bucket details you entered will be lost.",
      confirmLabel: "Keep Editing",
      cancelLabel: "Discard",
      dismissValue: true,
    });

    if (confirmed) return;

    formControlsRef.current.reset();
    editBucketDrawerHandle.close();
  }

  return (
    <ResponsiveDrawer handle={editBucketDrawerHandle} onOpenChange={handleOnOpenChange}>
      {({ payload }) => (
        <DrawerContent>
          {payload ? <EditBucketForm bucketId={payload.bucketId} ref={formControlsRef} /> : null}
        </DrawerContent>
      )}
    </ResponsiveDrawer>
  );
}

type EditBucketFormProps = {
  bucketId: Bucket["id"];
  ref: Ref<EditBucketFormControls>;
};

function EditBucketForm({ bucketId, ref }: EditBucketFormProps) {
  const router = useRouter();

  const { status, error, refetch, data: bucket } = useQuery(bucketQueryOption(bucketId));

  const mutation = useEditBucketMutation();

  const defaultValues: z.input<typeof editBucketSchema> = {
    bucketId,
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

      router.invalidate();
      form.reset();
      editBucketDrawerHandle.close();
    },
  });

  useImperativeHandle(
    ref,
    () => ({ isDirty: () => form.state.isDirty, reset: () => form.reset() }),
    [form],
  );

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Edit Bucket</DrawerTitle>
        <DrawerDescription>Update your bucket's name.</DrawerDescription>
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
            content={<DrawerClose render={<Button variant="secondary" />}>Close</DrawerClose>}
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
        <DrawerFooter className="border-t pt-4">
          <form.AppForm>
            <form.Button form={form.formId}>Edit Bucket</form.Button>
          </form.AppForm>
          <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
        </DrawerFooter>
      ) : null}
    </>
  );
}
