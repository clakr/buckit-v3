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
import { logRepaymentDrawerHandle } from "#/modules/repayments/components/log-repayment-drawer";
import { confirm } from "#/stores/use-confirm";

import type { getDebts } from "../functions";

import { useForgiveDebtMutation, useUnforgiveDebtMutation } from "../mutations";
import { deleteDebtDialogHandle } from "./delete-debt-dialog";
import { editDebtDrawerHandle } from "./edit-debt-drawer";

type Props = {
  debt: Awaited<ReturnType<typeof getDebts>>[number];
};

export function DebtActionsDropdownMenu({ debt }: Props) {
  const forgiveMutation = useForgiveDebtMutation();
  const unforgiveMutation = useUnforgiveDebtMutation();

  const { status } = debt;

  function handleOpenLogRepaymentDrawer() {
    logRepaymentDrawerHandle.openWithPayload({ debtId: debt.id });
  }

  function handleOpenEditDebtDrawer() {
    editDebtDrawerHandle.openWithPayload({ debtId: debt.id });
  }

  function handleOpenDeleteDebtDialog() {
    deleteDebtDialogHandle.openWithPayload({ debtId: debt.id });
  }

  async function handleForgiveDebt() {
    const confirmed = await confirm(`Forgive "${debt.name}"?`, {
      description:
        "Whatever is still outstanding will be written off. No transactions or balances change, and you can undo this anytime.",
      confirmLabel: "Forgive",
      cancelLabel: "Cancel",
    });

    if (!confirmed) return;

    forgiveMutation.mutate({ data: { debtId: debt.id } });
  }

  async function handleUnforgiveDebt() {
    const confirmed = await confirm(`Unforgive "${debt.name}"?`, {
      description: "The debt will reopen with whatever is still outstanding.",
      confirmLabel: "Unforgive",
      cancelLabel: "Cancel",
    });

    if (!confirmed) return;

    unforgiveMutation.mutate({ data: { debtId: debt.id } });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
        <IconDots />
        <span className="sr-only">Open Debt Menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleOpenLogRepaymentDrawer}>
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
          <DropdownMenuItem onClick={handleOpenEditDebtDrawer}>
            <svg />
            Edit
          </DropdownMenuItem>
          {status === "open" ? (
            <DropdownMenuItem onClick={handleForgiveDebt}>
              <svg />
              Forgive
            </DropdownMenuItem>
          ) : null}
          {status === "forgiven" ? (
            <DropdownMenuItem onClick={handleUnforgiveDebt}>
              <svg />
              Unforgive
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem variant="destructive" onClick={handleOpenDeleteDebtDialog}>
            <svg />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
