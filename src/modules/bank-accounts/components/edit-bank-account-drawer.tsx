import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useImperativeHandle, useRef, type Ref } from "react";
import z from "zod";

import type { BankAccount } from "#/db/schema";

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
import { validateBankAccountName } from "#/modules/bank-accounts/functions";
import { useEditBankAccountMutation } from "#/modules/bank-accounts/mutations";
import { bankAccountQueryOption } from "#/modules/bank-accounts/query-options";
import { editBankAccountSchema } from "#/modules/bank-accounts/schemas";
import { confirm } from "#/stores/use-confirm";

export const editBankAccountDrawerHandle = createDrawerHandle<{
  bankAccountId: BankAccount["id"];
}>();

type EditBankAccountFormControls = {
  isDirty: () => boolean;
  reset: () => void;
};

export function EditBankAccountDrawer() {
  const formControlsRef = useRef<EditBankAccountFormControls>(null);

  async function handleOnOpenChange(open: boolean, eventDetails: DrawerChangeEventDetails) {
    if (open || !formControlsRef.current?.isDirty()) return;

    eventDetails.cancel();

    const confirmed = await confirm("Discard editing account?", {
      description: "The account details you entered will be lost.",
      confirmLabel: "Keep Editing",
      cancelLabel: "Discard",
      dismissValue: true,
    });

    if (confirmed) return;

    formControlsRef.current.reset();
    editBankAccountDrawerHandle.close();
  }

  return (
    <ResponsiveDrawer handle={editBankAccountDrawerHandle} onOpenChange={handleOnOpenChange}>
      {({ payload }) => (
        <DrawerContent>
          {payload ? (
            <EditBankAccountForm bankAccountId={payload.bankAccountId} ref={formControlsRef} />
          ) : null}
        </DrawerContent>
      )}
    </ResponsiveDrawer>
  );
}

type EditBankAccountFormProps = {
  bankAccountId: BankAccount["id"];
  ref: Ref<EditBankAccountFormControls>;
};

function EditBankAccountForm({ bankAccountId, ref }: EditBankAccountFormProps) {
  const router = useRouter();

  const {
    status,
    error,
    refetch,
    data: bankAccount,
  } = useQuery(bankAccountQueryOption(bankAccountId));

  const mutation = useEditBankAccountMutation();

  const defaultValues: z.input<typeof editBankAccountSchema> = {
    bankAccountId,
    name: bankAccount?.name ?? "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: editBankAccountSchema,
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
      editBankAccountDrawerHandle.close();
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
        <DrawerTitle>Edit Account</DrawerTitle>
        <DrawerDescription>Update your bank account's name.</DrawerDescription>
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {status === "pending" ? (
          <StateTemplate
            state="loading"
            title="Loading account"
            description="Fetching account details..."
          />
        ) : null}
        {status === "error" && error instanceof NotFoundError ? (
          <StateTemplate
            state="error"
            title="Account not found"
            description={error.message}
            content={<DrawerClose render={<Button variant="secondary" />}>Close</DrawerClose>}
          />
        ) : null}
        {status === "error" && !(error instanceof NotFoundError) ? (
          <StateTemplate
            state="error"
            title="Could not load account"
            description="We weren't able to retrieve this account. Please check your connection and try again."
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
                  onChangeAsync: editBankAccountSchema.shape.name.superRefine(
                    refineNameAvailability((name) =>
                      validateBankAccountName({ data: { excludeId: bankAccount.id, name } }),
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
            <form.Button form={form.formId}>Edit Account</form.Button>
          </form.AppForm>
          <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
        </DrawerFooter>
      ) : null}
    </>
  );
}
