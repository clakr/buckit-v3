import type { ReactNode } from "react";

import { IconCircle, IconCircleCheck, IconPlus } from "@tabler/icons-react";

import type { DashboardBankAccount } from "#/modules/dashboard/utils";

import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { DrawerTrigger } from "#/components/ui/drawer";
import { cn } from "#/lib/utils";
import { logAllocationDrawerHandle } from "#/modules/allocations/components/log-allocation-drawer";
import { registerBankAccountDrawerHandle } from "#/modules/bank-accounts/components/register-bank-account-drawer";
import { setUpBucketDrawerHandle } from "#/modules/buckets/components/set-up-bucket-drawer";

type Props = {
  bankAccounts: DashboardBankAccount[];
  bucketCount: number;
};

type Step = {
  title: string;
  description: string;
  isDone: boolean;
  action: ReactNode;
};

export function GettingStartedChecklist({ bankAccounts, bucketCount }: Props) {
  const hasBankAccounts = bankAccounts.length > 0;
  const hasBuckets = bucketCount > 0;
  const hasAllocations = bankAccounts.some((bankAccount) => bankAccount.totalEarmarked > 0);

  const allocationSource = bankAccounts.find((bankAccount) => bankAccount.unallocated > 0);
  const allocationSourceId = (allocationSource ?? bankAccounts[0])?.id;

  const steps: Step[] = [
    {
      title: "Register an account",
      description: "Add a bank account to hold your money.",
      isDone: hasBankAccounts,
      action: (
        <DrawerTrigger
          handle={registerBankAccountDrawerHandle}
          payload={{ currency: "PHP" }}
          render={<Button />}
        >
          <IconPlus />
          Register Account
        </DrawerTrigger>
      ),
    },
    {
      title: "Set up a bucket",
      description: "Create a bucket for something you're saving toward.",
      isDone: hasBuckets,
      action: (
        <DrawerTrigger handle={setUpBucketDrawerHandle} render={<Button />}>
          <IconPlus />
          Set Up Bucket
        </DrawerTrigger>
      ),
    },
    {
      title: "Allocate money",
      description: "Earmark money from an account into a bucket.",
      isDone: hasAllocations,
      action: (
        <Button
          disabled={!hasBankAccounts || !hasBuckets}
          onClick={() =>
            logAllocationDrawerHandle.openWithPayload({
              start: { from: "bank-account", bankAccountId: allocationSourceId },
            })
          }
        >
          <IconPlus />
          Allocate Money
        </Button>
      ),
    },
  ];

  const nextStepIndex = steps.findIndex((step) => !step.isDone);

  if (nextStepIndex === -1) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Get started</CardTitle>
        <CardDescription>
          Set up your first account and bucket, then earmark some money.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-y-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex items-center justify-between gap-x-4">
              <div className="flex items-start gap-x-3">
                {step.isDone ? (
                  <IconCircleCheck className="mt-0.5 size-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <IconCircle className="mt-0.5 size-5 text-muted-foreground" />
                )}
                <div className="flex flex-col">
                  <span className={cn("font-medium", step.isDone && "text-muted-foreground")}>
                    {step.title}
                  </span>
                  <span className="text-muted-foreground">{step.description}</span>
                </div>
              </div>
              {index === nextStepIndex ? step.action : null}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
