import { z } from "zod";

export const logAllocationSchema = z.object({
  bankAccountId: z.string().min(1, "Please select a source account."),
  bucketId: z.string().min(1, "Please select a bucket."),
  amount: z.coerce.number().min(0, "Amount must be greater than 0."), // @todo: implement negative unallocated guard
  date: z.date().min(1, "Date is required."),
  note: z.string(),
});
