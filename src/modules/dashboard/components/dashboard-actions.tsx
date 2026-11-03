import type { ComponentType } from "react";

import { IconBolt, IconPigMoney, IconReceipt } from "@tabler/icons-react";

import type { BankAccount } from "#/db/schema";

import { Button } from "#/components/ui/button";
import { ButtonGroup } from "#/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { logAllocationDrawerHandle } from "#/modules/allocations/components/log-allocation-drawer";
import { triggerDistributionDrawerHandle } from "#/modules/distributions/components/trigger-distribution-drawer";
import { logTransactionDrawerHandle } from "#/modules/transactions/components/log-transaction-drawer";

import type { CurrencySummary } from "../utils";

type Option = { id: string; name: string };

type PickerActionProps = {
  label: string;
  icon: ComponentType;
  options: Option[];
  disabledReason: string | null;
  onPick: (id: string) => void;
  variant?: "default" | "outline";
};

function PickerAction({
  label,
  icon: Icon,
  options,
  disabledReason,
  onPick,
  variant = "outline",
}: PickerActionProps) {
  if (disabledReason !== null || options.length === 0) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant={variant}
              disabled
              focusableWhenDisabled
              className="aria-disabled:opacity-50"
            />
          }
        >
          <Icon />
          <span className="max-sm:sr-only">{label}</span>
        </TooltipTrigger>
        <TooltipContent>{disabledReason}</TooltipContent>
      </Tooltip>
    );
  }

  if (options.length === 1) {
    return (
      <Button variant={variant} onClick={() => onPick(options[0].id)}>
        <Icon />
        <span className="max-sm:sr-only">{label}</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant={variant} />}>
        <Icon />
        <span className="max-sm:sr-only">{label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-fit">
        {options.map((option) => (
          <DropdownMenuItem key={option.id} onClick={() => onPick(option.id)}>
            {option.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type Props = {
  currency: BankAccount["currency"];
  accounts: CurrencySummary["accounts"];
  distributions: { id: string; name: string; currency: BankAccount["currency"] }[];
  hasBucket: boolean;
};

export function DashboardActions({ currency, accounts, distributions, hasBucket }: Props) {
  const missingAccountReason =
    accounts.length === 0 ? `Register a ${currency} account first` : null;
  const currencyDistributions = distributions.filter(
    (distribution) => distribution.currency === currency,
  );

  return (
    <ButtonGroup aria-label="Dashboard actions">
      <PickerAction
        label="Trigger Distribution"
        icon={IconBolt}
        options={currencyDistributions}
        disabledReason={
          currencyDistributions.length === 0 ? `Save a ${currency} distribution first` : null
        }
        onPick={(distributionId) =>
          triggerDistributionDrawerHandle.openWithPayload({ distributionId })
        }
      />
      <PickerAction
        label="Allocate Money"
        icon={IconPigMoney}
        options={accounts}
        disabledReason={missingAccountReason ?? (hasBucket ? null : "Set up a bucket first")}
        onPick={(bankAccountId) =>
          logAllocationDrawerHandle.openWithPayload({
            start: { from: "bank-account", bankAccountId },
          })
        }
      />
      <PickerAction
        variant="default"
        label="Log Transaction"
        icon={IconReceipt}
        options={accounts}
        disabledReason={missingAccountReason}
        onPick={(bankAccountId) => logTransactionDrawerHandle.openWithPayload({ bankAccountId })}
      />
    </ButtonGroup>
  );
}
