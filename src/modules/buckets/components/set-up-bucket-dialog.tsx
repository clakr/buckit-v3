import z from "zod";

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
import { refineNameAvailability } from "#/lib/name-availability";
import { validateBucketName } from "#/modules/buckets/functions";
import { useSetUpBucketMutation } from "#/modules/buckets/mutations";
import { setUpBucketSchema } from "#/modules/buckets/schemas";
import { createDialogStore } from "#/stores/dialog-store";
import { confirm } from "#/stores/use-confirm";

export const useSetUpBucketDialogStore = createDialogStore();

export function SetUpBucketDialog() {
  const { isOpen, close } = useSetUpBucketDialogStore();

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
      close();
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

    close();
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
                  onChangeAsync: setUpBucketSchema.shape.name.superRefine(
                    refineNameAvailability((name) => validateBucketName({ data: { name } })),
                  ),
                }}
              >
                {(field) => <field.ValidatedInput label="Name" maxLength={100} />}
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
