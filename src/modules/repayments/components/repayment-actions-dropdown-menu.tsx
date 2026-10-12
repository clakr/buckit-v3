import { IconDots, IconEdit } from "@tabler/icons-react";

import type { Repayment } from "#/db/schema";
import type { getDebt } from "#/modules/debts/functions";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

import { useEditRepaymentDialogStore } from "./edit-repayment-dialog";

type Props = {
  debt: NonNullable<Awaited<ReturnType<typeof getDebt>>>;
  repaymentId: Repayment["id"];
};

export function RepaymentActionsDropdownMenu({ debt, repaymentId }: Props) {
  function handleOpenEditRepaymentDialog() {
    const state = useEditRepaymentDialogStore.getState();

    state.setRepayment(debt, repaymentId);
    state.openDialog();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
        <IconDots />
        <span className="sr-only">Open Repayment Action Menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleOpenEditRepaymentDialog}>
            <IconEdit />
            Edit
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
