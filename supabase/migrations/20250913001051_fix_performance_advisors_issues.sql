-- Drop and recreate RLS policies for buckets table
DROP POLICY IF EXISTS "Users can create own buckets" ON public.buckets;
DROP POLICY IF EXISTS "Users can delete own buckets" ON public.buckets;
DROP POLICY IF EXISTS "Users can update own buckets" ON public.buckets;
DROP POLICY IF EXISTS "Users can view own buckets" ON public.buckets;

CREATE POLICY "Users can create own buckets"
ON public.buckets
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own buckets"
ON public.buckets
AS PERMISSIVE
FOR DELETE
TO public
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own buckets"
ON public.buckets
AS PERMISSIVE
FOR UPDATE
TO public
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can view own buckets"
ON public.buckets
AS PERMISSIVE
FOR SELECT
TO public
USING ((SELECT auth.uid()) = user_id);

-- Drop and recreate RLS policies for bucket_transactions table
DROP POLICY IF EXISTS "Users can insert transactions for their own buckets" ON public.bucket_transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.bucket_transactions;

CREATE POLICY "Users can insert transactions for their own buckets"
ON public.bucket_transactions
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (((SELECT auth.uid()) = user_id) AND (EXISTS ( SELECT 1
   FROM public.buckets
  WHERE ((buckets.id = bucket_transactions.bucket_id) AND (buckets.user_id = (SELECT auth.uid()))))));

CREATE POLICY "Users can view their own transactions"
ON public.bucket_transactions
AS PERMISSIVE
FOR SELECT
TO public
USING ((SELECT auth.uid()) = user_id);

-- Drop and recreate RLS policies for goals table
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can create own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;

CREATE POLICY "Users can view own goals"
ON public.goals
AS PERMISSIVE
FOR SELECT
TO public
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create own goals"
ON public.goals
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own goals"
ON public.goals
AS PERMISSIVE
FOR UPDATE
TO public
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own goals"
ON public.goals
AS PERMISSIVE
FOR DELETE
TO public
USING ((SELECT auth.uid()) = user_id);

-- Drop and recreate RLS policies for goal_transactions table
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.goal_transactions;
DROP POLICY IF EXISTS "Users can insert transactions for their own goals" ON public.goal_transactions;

CREATE POLICY "Users can view their own transactions"
ON public.goal_transactions
AS PERMISSIVE
FOR SELECT
TO public
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert transactions for their own goals"
ON public.goal_transactions
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (
    ((SELECT auth.uid()) = user_id) 
    AND (EXISTS (
        SELECT 1
        FROM public.goals
        WHERE (goals.id = goal_transactions.goal_id) 
        AND (goals.user_id = (SELECT auth.uid()))
    ))
);

-- Drop and recreate RLS policies for splits table
DROP POLICY IF EXISTS "Users can view own splits" ON public.splits;
DROP POLICY IF EXISTS "Users can create own splits" ON public.splits;
DROP POLICY IF EXISTS "Users can update own splits" ON public.splits;
DROP POLICY IF EXISTS "Users can delete own splits" ON public.splits;

CREATE POLICY "Users can view own splits"
ON public.splits
FOR SELECT
TO public
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create own splits"
ON public.splits
FOR INSERT
TO public
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own splits"
ON public.splits
FOR UPDATE
TO public
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own splits"
ON public.splits
FOR DELETE
TO public
USING ((SELECT auth.uid()) = user_id);

-- Drop and recreate RLS policies for split_allocations table
DROP POLICY IF EXISTS "Users can view own allocations" ON public.split_allocations;
DROP POLICY IF EXISTS "Users can create allocations for own splits" ON public.split_allocations;
DROP POLICY IF EXISTS "Users can update own allocations" ON public.split_allocations;
DROP POLICY IF EXISTS "Users can delete own allocations" ON public.split_allocations;

CREATE POLICY "Users can view own allocations"
ON public.split_allocations
FOR SELECT
TO public
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create allocations for own splits"
ON public.split_allocations
FOR INSERT
TO public
WITH CHECK (
    (SELECT auth.uid()) = user_id AND 
    EXISTS (
        SELECT 1 FROM public.splits 
        WHERE id = split_allocations.split_id 
        AND user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Users can update own allocations"
ON public.split_allocations
FOR UPDATE
TO public
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own allocations"
ON public.split_allocations
FOR DELETE
TO public
USING ((SELECT auth.uid()) = user_id);

-- Drop and recreate RLS policies for profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can search other profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
AS PERMISSIVE
FOR SELECT
TO public
USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
AS PERMISSIVE
FOR UPDATE
TO public
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);