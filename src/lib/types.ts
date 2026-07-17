import type { currencies } from "./constants";

export type Currency = (typeof currencies)[number];
