import {
  IconArrowBackUp,
  IconCashBanknote,
  IconDots,
  IconHeartHandshake,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";

import { Button } from "#/components/ui/button";
import { ButtonGroup } from "#/components/ui/button-group";
import { DrawerTrigger } from "#/components/ui/drawer";
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

import type { getDebt } from "../functions";

import { useForgiveDebtMutation, useUnforgiveDebtMutation } from "../mutations";
import { deleteDebtDialogHandle } from "./delete-debt-dialog";
import { editDebtDrawerHandle } from "./edit-debt-drawer";

type Props = {
  debt: Awaited<ReturnType<typeof getDebt>>;
};

export function DebtDetailActions({ debt }: Props) {
  const forgiveMutation = useForgiveDebtMutation();
  const unforgiveMutation = useUnforgiveDebtMutation();

  const { status } = debt;

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
    <ButtonGroup>
      <ButtonGroup aria-label="Debt actions">
        {status === "open" ? (
          <Button variant="outline" className="max-md:hidden" onClick={handleForgiveDebt}>
            <IconHeartHandshake />
            Forgive
          </Button>
        ) : null}
        {status === "forgiven" ? (
          <Button variant="outline" className="max-md:hidden" onClick={handleUnforgiveDebt}>
            <IconArrowBackUp />
            Unforgive
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className={status === "settled" ? undefined : "max-md:rounded-md! max-md:border-l!"}
              />
            }
          >
            <IconDots aria-hidden />
            <span className="sr-only">Open Debt Action Menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-fit">
            {status === "open" ? (
              <>
                <DropdownMenuGroup className="md:hidden">
                  <DropdownMenuItem onClick={handleForgiveDebt}>
                    <IconHeartHandshake />
                    Forgive
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="md:hidden" />
              </>
            ) : null}
            {status === "forgiven" ? (
              <>
                <DropdownMenuGroup className="md:hidden">
                  <DropdownMenuItem onClick={handleUnforgiveDebt}>
                    <IconArrowBackUp />
                    Unforgive
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="md:hidden" />
              </>
            ) : null}
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleOpenEditDebtDrawer}>
                <IconPencil />
                Edit
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" onClick={handleOpenDeleteDebtDialog}>
                <IconTrash />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
      <ButtonGroup>
        <DrawerTrigger
          handle={logRepaymentDrawerHandle}
          payload={{ debtId: debt.id }}
          render={<Button />}
        >
          <IconCashBanknote />
          Log Repayment
        </DrawerTrigger>
      </ButtonGroup>
    </ButtonGroup>
  );
}
