-- Fix handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- Fix process_bucket_transaction function
CREATE OR REPLACE FUNCTION public.process_bucket_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = ''
AS $function$
DECLARE
  v_current_balance numeric(12, 2);
  v_new_balance numeric(12, 2);
BEGIN
  -- Get the current balance of the bucket
  SELECT current_amount INTO v_current_balance
  FROM public.buckets
  WHERE id = NEW.bucket_id
  FOR UPDATE; -- Lock the row to prevent concurrent updates

  -- Calculate new balance based on transaction type
  IF NEW.type = 'inbound' THEN
    v_new_balance := v_current_balance + NEW.amount;
  ELSIF NEW.type = 'outbound' THEN
    v_new_balance := v_current_balance - NEW.amount;
    -- Ensure balance doesn't go negative
    IF v_new_balance < 0 THEN
      RAISE EXCEPTION 'Insufficient balance. Current balance: %, Transaction amount: %',
        v_current_balance, NEW.amount;
    END IF;
  END IF;

  -- Set the balance_after for this transaction
  NEW.balance_after := v_new_balance;

  -- Update the bucket's current_amount
  UPDATE public.buckets
  SET current_amount = v_new_balance
  WHERE id = NEW.bucket_id;

  RETURN NEW;
END;
$function$;

-- Fix process_goal_transaction function
CREATE OR REPLACE FUNCTION public.process_goal_transaction()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_current_amount numeric(12, 2);
  v_new_amount numeric(12, 2);
  v_target_amount numeric(12, 2);
BEGIN
  -- Get current amount and target amount from the goal
  SELECT current_amount, target_amount 
  INTO v_current_amount, v_target_amount
  FROM public.goals 
  WHERE id = NEW.goal_id
  FOR UPDATE;

  -- Calculate new amount based on transaction type
  IF NEW.type = 'inbound' THEN
    v_new_amount := v_current_amount + NEW.amount;
  ELSIF NEW.type = 'outbound' THEN
    v_new_amount := v_current_amount - NEW.amount;
    
    -- Check if outbound transaction would result in negative balance
    IF v_new_amount < 0 THEN
      RAISE EXCEPTION 'Insufficient funds in goal. Current amount: %, Transaction amount: %', 
        v_current_amount, NEW.amount;
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid transaction type: %', NEW.type;
  END IF;

  -- Update the goal's current amount
  UPDATE public.goals 
  SET current_amount = v_new_amount,
      updated_at = now()
  WHERE id = NEW.goal_id;

  -- Set the balance_after for the transaction
  NEW.balance_after := v_new_amount;

  RETURN NEW;
END;
$$;

-- Fix validate_split_allocations function  
CREATE OR REPLACE FUNCTION public.validate_split_allocations()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_base_amount numeric(12,2);
    v_total_fixed numeric(12,2);
    v_total_percentage numeric(5,2);
    v_calculated_total numeric(12,2);
BEGIN
    -- Get the base amount from the split
    SELECT base_amount INTO v_base_amount
    FROM public.splits
    WHERE id = NEW.split_id;

    -- Calculate total fixed amounts and percentages
    SELECT 
        COALESCE(SUM(CASE WHEN allocation_type = 'fixed' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN allocation_type = 'percentage' THEN percentage ELSE 0 END), 0)
    INTO v_total_fixed, v_total_percentage
    FROM public.split_allocations
    WHERE split_id = NEW.split_id
    AND id != COALESCE(NEW.id, gen_random_uuid()); -- Exclude current row in case of UPDATE

    -- Add the current allocation
    IF NEW.allocation_type = 'fixed' THEN
        v_total_fixed := v_total_fixed + NEW.amount;
    ELSE
        v_total_percentage := v_total_percentage + NEW.percentage;
    END IF;

    -- Calculate total allocated amount
    v_calculated_total := v_total_fixed + (v_base_amount * v_total_percentage / 100);

    -- Check if total exceeds base amount
    IF v_calculated_total > v_base_amount THEN
        RAISE EXCEPTION 'Total allocations (%.2f) exceed base amount (%.2f)', v_calculated_total, v_base_amount;
    END IF;

    -- Check if total percentage exceeds 100
    IF v_total_percentage > 100 THEN
        RAISE EXCEPTION 'Total percentage allocations (%.2f%%) exceed 100%%', v_total_percentage;
    END IF;

    RETURN NEW;
END;
$$;

-- Fix execute_split function
CREATE OR REPLACE FUNCTION public.execute_split(p_split_id uuid)
RETURNS json 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id uuid;
    v_base_amount numeric(12,2);
    v_total_allocated numeric(12,2) := 0;
    v_allocation record;
    v_calculated_amount numeric(12,2);
    v_split_name text;
    v_transaction_count integer := 0;
BEGIN
    -- Get split details
    SELECT user_id, base_amount, name 
    INTO v_user_id, v_base_amount, v_split_name
    FROM public.splits
    WHERE id = p_split_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Split not found or not active';
    END IF;

    -- Verify user owns this split
    IF v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Process each allocation
    FOR v_allocation IN 
        SELECT * FROM public.split_allocations 
        WHERE split_id = p_split_id
    LOOP
        -- Calculate amount based on allocation type
        IF v_allocation.allocation_type = 'fixed' THEN
            v_calculated_amount := v_allocation.amount;
        ELSE
            v_calculated_amount := v_base_amount * v_allocation.percentage / 100;
        END IF;

        -- Create transaction based on target type
        IF v_allocation.target_type = 'bucket' THEN
            INSERT INTO public.bucket_transactions (
                bucket_id, 
                user_id, 
                type, 
                amount, 
                description
            ) VALUES (
                v_allocation.target_id,
                v_user_id,
                'inbound',
                v_calculated_amount,
                'Split: ' || v_split_name
            );
        ELSE -- goal
            INSERT INTO public.goal_transactions (
                goal_id, 
                user_id, 
                type, 
                amount, 
                description
            ) VALUES (
                v_allocation.target_id,
                v_user_id,
                'inbound',
                v_calculated_amount,
                'Split: ' || v_split_name
            );
        END IF;

        v_total_allocated := v_total_allocated + v_calculated_amount;
        v_transaction_count := v_transaction_count + 1;
    END LOOP;

    -- Return summary of the execution
    RETURN json_build_object(
        'success', true,
        'split_id', p_split_id,
        'split_name', v_split_name,
        'base_amount', v_base_amount,
        'total_allocated', v_total_allocated,
        'remaining_amount', v_base_amount - v_total_allocated,
        'transaction_count', v_transaction_count,
        'executed_at', now()
    );
END;
$$;

-- Fix get_users_by_ids function
CREATE OR REPLACE FUNCTION public.get_users_by_ids(user_ids uuid[])
RETURNS TABLE (
    id uuid,
    email text,
    first_name text,
    last_name text,
    avatar_url text,
    username text,
    created_at timestamp with time zone
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.first_name,
        p.last_name,
        p.avatar_url,
        p.username,
        p.created_at
    FROM public.profiles p
    WHERE p.id = ANY(user_ids);
END;
$$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (
        new.id,
        new.email
    );
    RETURN new;
END;
$$;