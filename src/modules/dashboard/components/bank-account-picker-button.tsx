import { IconPlus } from "@tabler/icons-react";

import type { DashboardBankAccount } from "#/modules/dashboard/utils";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

type Props = {
  label: string;
  bankAccounts: DashboardBankAccount[];
  variant?: "default" | "outline";
  onSelect: (bankAccountId: DashboardBankAccount["id"]) => void;
};

export function BankAccountPickerButton({ label, bankAccounts, variant, onSelect }: Props) {
  const [onlyBankAccount] = bankAccounts;

  if (bankAccounts.length === 1)
    return (
      <Button variant={variant} onClick={() => onSelect(onlyBankAccount.id)}>
        <IconPlus />
        {label}
      </Button>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant={variant} />}>
        <IconPlus />
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          {bankAccounts.map((bankAccount) => (
            <DropdownMenuItem key={bankAccount.id} onClick={() => onSelect(bankAccount.id)}>
              {bankAccount.name} ({bankAccount.currency})
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
