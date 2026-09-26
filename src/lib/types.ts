import type { CURRENCIES } from "#/lib/constants";

export type Currency = (typeof CURRENCIES)[number];

export type DialogState = {
  isOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  toggleDialog: () => void;
};
