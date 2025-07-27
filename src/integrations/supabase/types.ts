import type { Tables } from "@/integrations/supabase/database.types";

export type Bucket = Tables<"buckets">;
export type BucketTransaction = Tables<"bucket_transactions">;
