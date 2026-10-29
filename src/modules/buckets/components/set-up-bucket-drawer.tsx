import { useSelector } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import {
  useImperativeHandle,
  useRef,
  useState,
  type ComponentProps,
  type Ref,
  type RefObject,
} from "react";
import z from "zod";

import type { Bucket } from "#/db/schema";

import { Button } from "#/components/ui/button";
import {
  createDrawerHandle,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  ResponsiveDrawer,
  type DrawerChangeEventDetails,
} from "#/components/ui/drawer";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "#/components/ui/field";
import { Switch } from "#/components/ui/switch";
import { useAppForm } from "#/integrations/tanstack-form";
import { refineNameAvailability } from "#/lib/name-availability";
import {
  NestedRegisterBankAccountDrawer,
  type RegisterBankAccountDrawerPayload,
} from "#/modules/bank-accounts/components/register-bank-account-drawer";
import { validateBucketName } from "#/modules/buckets/functions";
import { useSetUpBucketMutation } from "#/modules/buckets/mutations";
import { setUpBucketSchema } from "#/modules/buckets/schemas";
import { GoalTargetFields } from "#/modules/goals/components/goal-target-fields";
import { goalCurrenciesQueryOptions } from "#/modules/goals/query-options";
import { setUpBucketWithGoalSchema } from "#/modules/goals/schemas";
import { confirm } from "#/stores/use-confirm";

type SetUpBucketDrawerHandle = ReturnType<typeof createDrawerHandle>;

type NestedRegisterBankAccountDrawerHandle = ReturnType<
  typeof createDrawerHandle<RegisterBankAccountDrawerPayload>
>;

export const setUpBucketDrawerHandle = createDrawerHandle();

type SetUpBucketFormControls = {
  isDirty: () => boolean;
  reset: () => void;
};

export function SetUpBucketDrawer() {
  return <SetUpBucketDrawerRoot handle={setUpBucketDrawerHandle} />;
}

type SetUpBucketDrawerRootProps = {
  handle: SetUpBucketDrawerHandle;
  finalFocus?: ComponentProps<typeof DrawerContent>["finalFocus"];
  onSetUp?: (bucket: Bucket) => void;
};

/**
 * Render beside a parent's `DrawerContent`, inside its Root, so Base UI nests it and the
 * parent's `Suspense` can't unmount it. Open it from a `DrawerTrigger` bound to the same
 * `handle`.
 */
export function NestedSetUpBucketDrawer({
  handle,
  finalFocus,
  onSetUp,
}: SetUpBucketDrawerRootProps) {
  return <SetUpBucketDrawerRoot handle={handle} finalFocus={finalFocus} onSetUp={onSetUp} />;
}

function SetUpBucketDrawerRoot({ handle, finalFocus, onSetUp }: SetUpBucketDrawerRootProps) {
  const formControlsRef = useRef<SetUpBucketFormControls>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const registerButtonRef = useRef<HTMLButtonElement>(null);

  // Per Root: the global and the Log Allocation-nested Set Up Bucket each nest their own Register.
  const [nestedRegisterBankAccountDrawerHandle] = useState(() =>
    createDrawerHandle<RegisterBankAccountDrawerPayload>(),
  );

  async function handleOnOpenChange(open: boolean, eventDetails: DrawerChangeEventDetails) {
    if (open || !formControlsRef.current?.isDirty()) return;

    eventDetails.cancel();

    const confirmed = await confirm("Discard new bucket?", {
      description: "The bucket details you entered will be lost.",
      confirmLabel: "Keep Editing",
      cancelLabel: "Discard",
      dismissValue: true,
    });

    if (confirmed) return;

    formControlsRef.current.reset();
    handle.close();
  }

  return (
    <ResponsiveDrawer handle={handle} onOpenChange={handleOnOpenChange}>
      <DrawerContent ref={popupRef} finalFocus={finalFocus}>
        <SetUpBucketForm
          onSetUp={(bucket) => {
            handle.close();
            onSetUp?.(bucket);
          }}
          nestedRegisterBankAccountDrawerHandle={nestedRegisterBankAccountDrawerHandle}
          registerButtonRef={registerButtonRef}
          ref={formControlsRef}
        />
      </DrawerContent>
      <NestedRegisterBankAccountDrawer
        handle={nestedRegisterBankAccountDrawerHandle}
        finalFocus={() => registerButtonRef.current ?? popupRef.current}
      />
    </ResponsiveDrawer>
  );
}

type SetUpBucketFormProps = {
  onSetUp: (bucket: Bucket) => void;
  nestedRegisterBankAccountDrawerHandle: NestedRegisterBankAccountDrawerHandle;
  registerButtonRef: RefObject<HTMLButtonElement | null>;
  ref: Ref<SetUpBucketFormControls>;
};

function SetUpBucketForm({
  onSetUp,
  nestedRegisterBankAccountDrawerHandle,
  registerButtonRef,
  ref,
}: SetUpBucketFormProps) {
  const mutation = useSetUpBucketMutation();

  const {
    status: currenciesStatus,
    refetch: refetchCurrencies,
    data: currencies,
  } = useQuery(goalCurrenciesQueryOptions);

  const defaultValues: z.input<typeof setUpBucketWithGoalSchema> = {
    name: "",
    goal: null,
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: setUpBucketWithGoalSchema,
    },
    onSubmit: async ({ value: data }) => {
      let bucket: Bucket;

      try {
        [bucket] = await mutation.mutateAsync({ data });
      } catch (error) {
        console.error(error);

        return;
      }

      form.reset();
      onSetUp(bucket);
    },
  });

  useImperativeHandle(
    ref,
    () => ({ isDirty: () => form.state.isDirty, reset: () => form.reset() }),
    [form],
  );

  const hasGoal = useSelector(form.store, (state) => state.values.goal !== null);

  function handleGoalToggle(checked: boolean) {
    form.setFieldValue(
      "goal",
      checked && currencies?.[0]
        ? { targetAmount: 0, currency: currencies[0], targetDate: null }
        : null,
    );
  }

  const goalToggleHint =
    currenciesStatus === "pending"
      ? "Fetching your bank account currencies..."
      : currenciesStatus === "error"
        ? "We couldn't load your bank account currencies."
        : currencies.length === 0
          ? "Register a bank account first. A goal's currency must be one your accounts use."
          : "Track saving toward a target amount, optionally by a date.";

  const goalSwitchId = `${form.formId}-has-goal`;

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>Set Up Bucket</DrawerTitle>
        <DrawerDescription>Create a bucket to organize your money.</DrawerDescription>
      </DrawerHeader>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor={goalSwitchId}>Set a Goal</FieldLabel>
                <FieldDescription>{goalToggleHint}</FieldDescription>
                {currenciesStatus === "error" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => refetchCurrencies()}
                  >
                    Retry
                  </Button>
                ) : null}
                {currenciesStatus === "success" && currencies.length === 0 ? (
                  <DrawerTrigger
                    ref={registerButtonRef}
                    handle={nestedRegisterBankAccountDrawerHandle}
                    payload={{ currency: "PHP" }}
                    render={<Button type="button" variant="outline" size="sm" className="w-fit" />}
                  >
                    Register Bank Account
                  </DrawerTrigger>
                ) : null}
              </FieldContent>
              <Switch
                id={goalSwitchId}
                checked={hasGoal}
                disabled={!currencies?.length}
                onCheckedChange={handleGoalToggle}
              />
            </Field>
            {hasGoal ? (
              <GoalTargetFields form={form} fields="goal" currencies={currencies ?? []} />
            ) : null}
          </FieldGroup>
        </form>
      </div>
      <DrawerFooter className="border-t pt-4">
        <form.AppForm>
          <form.Button form={form.formId}>Set Up Bucket</form.Button>
        </form.AppForm>
        <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
      </DrawerFooter>
    </>
  );
}
