-- ============================================================================
-- TRIGGER FUNCTION: process_bucket_transaction
-- Description: Processes bucket transactions and updates bucket balance
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_bucket_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
    v_current_balance numeric(12, 2);
    v_new_balance numeric(12, 2);
BEGIN
    -- Get the current balance of the bucket
    SELECT current_amount 
    INTO v_current_balance
    FROM public.buckets
    WHERE id = NEW.bucket_id
    FOR UPDATE; -- Lock the row to prevent concurrent updates

    -- Calculate new balance based on transaction type
    IF NEW.type = 'inbound' THEN
        v_new_balance := v_current_balance + NEW.amount;
    ELSIF NEW.type = 'outbound' THEN
        v_new_balance := v_current_balance - NEW.amount;
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


-- ============================================================================
-- TRIGGER FUNCTION: process_goal_transaction
-- Description: Processes goal transactions and updates goal amount
-- ============================================================================
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
    SELECT 
        current_amount, 
        target_amount 
    INTO 
        v_current_amount, 
        v_target_amount
    FROM public.goals 
    WHERE id = NEW.goal_id
    FOR UPDATE;

    -- Calculate new amount based on transaction type
    IF NEW.type = 'inbound' THEN
        v_new_amount := v_current_amount + NEW.amount;
    ELSIF NEW.type = 'outbound' THEN
        v_new_amount := v_current_amount - NEW.amount;
    ELSE
        RAISE EXCEPTION 'Invalid transaction type: %', NEW.type;
    END IF;

    -- Update the goal's current amount
    UPDATE public.goals 
    SET 
        current_amount = v_new_amount,
        updated_at = NOW()
    WHERE id = NEW.goal_id;

    -- Set the balance_after for the transaction
    NEW.balance_after := v_new_amount;

    RETURN NEW;
END;
$$;