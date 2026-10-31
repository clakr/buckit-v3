import type { ReactNode } from "react";

import { IconCircle, IconCircleCheckFilled } from "@tabler/icons-react";

import type { BankAccount } from "#/db/schema";

import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { DrawerTrigger } from "#/components/ui/drawer";
import { logAllocationDrawerHandle } from "#/modules/allocations/components/log-allocation-drawer";
import { registerBankAccountDrawerHandle } from "#/modules/bank-accounts/components/register-bank-account-drawer";
import { setUpBucketDrawerHandle } from "#/modules/buckets/components/set-up-bucket-drawer";

type Props = {
  currency: BankAccount["currency"];
  fundingBankAccountId: BankAccount["id"] | null;
  hasBucket: boolean;
  hasAllocation: boolean;
};

type Step = {
  title: string;
  description: string;
  isDone: boolean;
  action: ReactNode;
};

export function GettingStartedCard({
  currency,
  fundingBankAccountId,
  hasBucket,
  hasAllocation,
}: Props) {
  const hasBankAccount = fundingBankAccountId !== null;

  if (hasBankAccount && hasBucket && hasAllocation) return null;

  const steps: Step[] = [
    {
      title: "Register an Account",
      description: "Add the bank account, wallet or cash you keep money in.",
      isDone: hasBankAccount,
      action: (
        <Button
          size="sm"
          onClick={() => registerBankAccountDrawerHandle.openWithPayload({ currency })}
        >
          Register Account
        </Button>
      ),
    },
    {
      title: "Set up a Bucket",
      description: "Create a savings category, such as Emergency Fund or Tithe.",
      isDone: hasBucket,
      action: (
        <DrawerTrigger handle={setUpBucketDrawerHandle} render={<Button size="sm" />}>
          Set Up Bucket
        </DrawerTrigger>
      ),
    },
    {
      title: "Allocate Money",
      description:
        hasBankAccount && hasBucket
          ? "Earmark some of your Account's money for a Bucket."
          : "Register an Account and set up a Bucket first.",
      isDone: hasAllocation,
      action: (
        <Button
          size="sm"
          disabled={!hasBankAccount || !hasBucket}
          onClick={() => {
            if (fundingBankAccountId === null) return;

            logAllocationDrawerHandle.openWithPayload({
              start: { from: "bank-account", bankAccountId: fundingBankAccountId },
            });
          }}
        >
          Allocate Money
        </Button>
      ),
    },
  ];

  const doneCount = steps.filter((step) => step.isDone).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Getting started</CardTitle>
        <CardDescription>
          {doneCount} of {steps.length} steps done
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="divide-y">
          {steps.map((step) => (
            <li key={step.title} className="flex items-center gap-x-3 py-3">
              {step.isDone ? (
                <IconCircleCheckFilled className="size-5 shrink-0 text-primary" aria-hidden />
              ) : (
                <IconCircle className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">
                  {step.title}
                  {step.isDone ? <span className="sr-only"> (done)</span> : null}
                </span>
                <span className="text-sm text-muted-foreground">{step.description}</span>
              </div>
              {step.isDone ? null : step.action}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
