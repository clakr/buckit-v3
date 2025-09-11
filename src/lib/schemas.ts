import z from "zod";

export const transactionTypeEnum = z.enum(["inbound", "outbound"]);

export const typeOptions = transactionTypeEnum.options.map((option) => ({
	label: option === "inbound" ? "Deposit" : "Withdrawal",
	value: option,
}));

export const splitTargetTypeEnum = z.enum(["bucket", "goal"]);
export const splitAllocationTypeEnum = z.enum(["percentage", "fixed"]);
