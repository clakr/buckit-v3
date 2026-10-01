import { IconDots } from "@tabler/icons-react";

import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

import type { getDebts } from "../functions";

type Props = {
  debtId: Awaited<ReturnType<typeof getDebts>>[number]["id"];
};

export function DebtActionsDropdownMenu({ debtId }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
        <IconDots />
        <span className="sr-only">Open Debt Menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup></DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
