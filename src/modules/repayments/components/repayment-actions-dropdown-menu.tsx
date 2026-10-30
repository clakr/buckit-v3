import { IconDots, IconPencil } from "@tabler/icons-react";

import type { Debt, Repayment } from "#/db/schema";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

import { editRepaymentDrawerHandle } from "./edit-repayment-drawer";

type Props = {
  debtId: Debt["id"];
  repaymentId: Repayment["id"];
};

export function RepaymentActionsDropdownMenu({ debtId, repaymentId }: Props) {
  function handleOpenEditRepaymentDrawer() {
    editRepaymentDrawerHandle.openWithPayload({ debtId, repaymentId });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
        <IconDots />
        <span className="sr-only">Open Repayment Action Menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleOpenEditRepaymentDrawer}>
            <IconPencil />
            Edit
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
