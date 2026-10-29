import { useRef, useState, type RefObject } from "react";

import type { DistributionFormControls } from "#/modules/distributions/components/distribution-form";

import { createDrawerHandle } from "#/components/ui/drawer";
import {
  NestedRegisterBankAccountDrawer,
  type RegisterBankAccountDrawerPayload,
} from "#/modules/bank-accounts/components/register-bank-account-drawer";
import { NestedSetUpBucketDrawer } from "#/modules/buckets/components/set-up-bucket-drawer";

export type DistributionNestedDrawers = {
  popupRef: RefObject<HTMLDivElement | null>;
  setUpBucketHandle: ReturnType<typeof createDrawerHandle>;
  setUpBucketButtonRef: RefObject<HTMLButtonElement | null>;
  registerBankAccountHandle: ReturnType<
    typeof createDrawerHandle<RegisterBankAccountDrawerPayload>
  >;
  registerBankAccountButtonRef: RefObject<HTMLButtonElement | null>;
};

/** Handles are per Distribution Drawer, because Create and Edit are both mounted on the page. */
export function useDistributionNestedDrawers(): DistributionNestedDrawers {
  const popupRef = useRef<HTMLDivElement>(null);
  const setUpBucketButtonRef = useRef<HTMLButtonElement>(null);
  const registerBankAccountButtonRef = useRef<HTMLButtonElement>(null);
  const [setUpBucketHandle] = useState(() => createDrawerHandle());
  const [registerBankAccountHandle] = useState(() =>
    createDrawerHandle<RegisterBankAccountDrawerPayload>(),
  );

  return {
    popupRef,
    setUpBucketHandle,
    setUpBucketButtonRef,
    registerBankAccountHandle,
    registerBankAccountButtonRef,
  };
}

type Props = {
  nestedDrawers: DistributionNestedDrawers;
  formControlsRef: RefObject<DistributionFormControls | null>;
};

/**
 * Render beside the Distribution Drawer's `DrawerContent`, inside its Root, so the Drawers nest.
 * A saved record is picked on the form, which stays mounted underneath with its input intact.
 */
export function DistributionNestedDrawerRoots({ nestedDrawers, formControlsRef }: Props) {
  return (
    <>
      <NestedSetUpBucketDrawer
        handle={nestedDrawers.setUpBucketHandle}
        finalFocus={() =>
          nestedDrawers.setUpBucketButtonRef.current ?? nestedDrawers.popupRef.current
        }
        onSetUp={(bucket) => formControlsRef.current?.selectBucket(bucket.id)}
      />
      <NestedRegisterBankAccountDrawer
        handle={nestedDrawers.registerBankAccountHandle}
        finalFocus={() =>
          nestedDrawers.registerBankAccountButtonRef.current ?? nestedDrawers.popupRef.current
        }
        onRegistered={(bankAccount) => formControlsRef.current?.selectBankAccount(bankAccount.id)}
      />
    </>
  );
}
