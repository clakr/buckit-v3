-- Enable RLS on goals table
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Enable RLS on goal_transactions table
ALTER TABLE public.goal_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for goals table
CREATE POLICY "Users can view own goals"
ON public.goals
AS PERMISSIVE
FOR SELECT
TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals"
ON public.goals
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
ON public.goals
AS PERMISSIVE
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
ON public.goals
AS PERMISSIVE
FOR DELETE
TO public
USING (auth.uid() = user_id);

-- Policies for goal_transactions table
CREATE POLICY "Users can view their own transactions"
ON public.goal_transactions
AS PERMISSIVE
FOR SELECT
TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert transactions for their own goals"
ON public.goal_transactions
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (
    (auth.uid() = user_id) 
    AND (EXISTS (
        SELECT 1
        FROM goals
        WHERE (goals.id = goal_transactions.goal_id) 
        AND (goals.user_id = auth.uid())
    ))
);

-- Grant permissions to roles (following the same pattern as buckets)
-- For goals table
GRANT DELETE ON TABLE public.goals TO anon;
GRANT INSERT ON TABLE public.goals TO anon;
GRANT REFERENCES ON TABLE public.goals TO anon;
GRANT SELECT ON TABLE public.goals TO anon;
GRANT TRIGGER ON TABLE public.goals TO anon;
GRANT TRUNCATE ON TABLE public.goals TO anon;
GRANT UPDATE ON TABLE public.goals TO anon;

GRANT DELETE ON TABLE public.goals TO authenticated;
GRANT INSERT ON TABLE public.goals TO authenticated;
GRANT REFERENCES ON TABLE public.goals TO authenticated;
GRANT SELECT ON TABLE public.goals TO authenticated;
GRANT TRIGGER ON TABLE public.goals TO authenticated;
GRANT TRUNCATE ON TABLE public.goals TO authenticated;
GRANT UPDATE ON TABLE public.goals TO authenticated;

GRANT DELETE ON TABLE public.goals TO service_role;
GRANT INSERT ON TABLE public.goals TO service_role;
GRANT REFERENCES ON TABLE public.goals TO service_role;
GRANT SELECT ON TABLE public.goals TO service_role;
GRANT TRIGGER ON TABLE public.goals TO service_role;
GRANT TRUNCATE ON TABLE public.goals TO service_role;
GRANT UPDATE ON TABLE public.goals TO service_role;

-- For goal_transactions table
GRANT DELETE ON TABLE public.goal_transactions TO anon;
GRANT INSERT ON TABLE public.goal_transactions TO anon;
GRANT REFERENCES ON TABLE public.goal_transactions TO anon;
GRANT SELECT ON TABLE public.goal_transactions TO anon;
GRANT TRIGGER ON TABLE public.goal_transactions TO anon;
GRANT TRUNCATE ON TABLE public.goal_transactions TO anon;
GRANT UPDATE ON TABLE public.goal_transactions TO anon;

GRANT DELETE ON TABLE public.goal_transactions TO authenticated;
GRANT INSERT ON TABLE public.goal_transactions TO authenticated;
GRANT REFERENCES ON TABLE public.goal_transactions TO authenticated;
GRANT SELECT ON TABLE public.goal_transactions TO authenticated;
GRANT TRIGGER ON TABLE public.goal_transactions TO authenticated;
GRANT TRUNCATE ON TABLE public.goal_transactions TO authenticated;
GRANT UPDATE ON TABLE public.goal_transactions TO authenticated;

GRANT DELETE ON TABLE public.goal_transactions TO service_role;
GRANT INSERT ON TABLE public.goal_transactions TO service_role;
GRANT REFERENCES ON TABLE public.goal_transactions TO service_role;
GRANT SELECT ON TABLE public.goal_transactions TO service_role;
GRANT TRIGGER ON TABLE public.goal_transactions TO service_role;
GRANT TRUNCATE ON TABLE public.goal_transactions TO service_role;
GRANT UPDATE ON TABLE public.goal_transactions TO service_role;