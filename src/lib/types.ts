import type { currencies } from "#/lib/constants";

export type Currency = (typeof currencies)[number];

export type DialogState = {
  isOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  toggleDialog: () => void;
};
