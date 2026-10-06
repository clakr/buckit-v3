import { IconDots, IconEye, IconPlus } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { useLogRepaymentDialogStore } from "#/modules/repayments/components/log-repayment-dialog";

import type { getDebts } from "../functions";

type Props = {
  debt: Awaited<ReturnType<typeof getDebts>>[number];
};

export function DebtActionsDropdownMenu({ debt }: Props) {
  function handleOpenLogRepaymentDialog() {
    const state = useLogRepaymentDialogStore.getState();

    state.setDebt(debt);
    state.openDialog();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
        <IconDots />
        <span className="sr-only">Open Debt Menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleOpenLogRepaymentDialog}>
            <IconPlus />
            Log Repayment
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link to="/debts/$debtId" params={{ debtId: debt.id }} />}>
            <IconEye />
            View
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
