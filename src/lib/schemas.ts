import z from "zod";

export const transactionTypeEnum = z.enum(["inbound", "outbound"]);

export const splitTargetTypeEnum = z.enum(["bucket", "goal"]);
export const splitAllocationTypeEnum = z.enum(["percentage", "fixed"]);

export const expenseStatusEnum = z.enum(["draft", "active", "settled"]);
