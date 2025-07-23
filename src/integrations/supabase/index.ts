import type { Database } from "@/integrations/supabase/database.types";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
if (!supabaseUrl) throw new Error("`supabaseUrl` not found");

const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseKey) throw new Error("`supabaseKey` not found");

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
