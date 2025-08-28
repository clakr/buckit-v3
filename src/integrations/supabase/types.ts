import type { Tables } from "supabase/database.types";

export type Bucket = Tables<"buckets">;
export type BucketTransaction = Tables<"bucket_transactions">;

export type Goal = Tables<"goals">;
export type GoalTransaction = Tables<"goal_transactions">;

export type Split = Tables<"splits">;
export type SplitAllocation = Tables<"split_allocations">;

export type Expense = Tables<"expenses">;
