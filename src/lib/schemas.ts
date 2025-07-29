import z from "zod";

export const transactionTypeEnum = z.enum(["inbound", "outbound"]);
