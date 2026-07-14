import type { SerializedErr, SerializedOk } from "better-result";

import type { currencies } from "./constants";

export type Currency = (typeof currencies)[number];

export type ExtractSerializedOk<T> = T extends SerializedOk<infer V> ? V : never;
export type ExtractSerializedErr<T> = T extends SerializedErr<infer E> ? E : never;
