CREATE OR REPLACE FUNCTION public.process_bucket_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_current_balance numeric(12, 2);
  v_new_balance numeric(12, 2);
BEGIN
  -- Get the current balance of the bucket
  SELECT current_amount INTO v_current_balance
  FROM buckets
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
  UPDATE buckets
  SET current_amount = v_new_balance
  WHERE id = NEW.bucket_id;

  RETURN NEW;
END;
$function$
;


-- Create function to process goal transactions
CREATE OR REPLACE FUNCTION process_goal_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_current_amount numeric(12, 2);
  v_new_amount numeric(12, 2);
  v_target_amount numeric(12, 2);
BEGIN
  -- Get current amount and target amount from the goal
  SELECT current_amount, target_amount 
  INTO v_current_amount, v_target_amount
  FROM goals 
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
  UPDATE goals 
  SET current_amount = v_new_amount,
      updated_at = now()
  WHERE id = NEW.goal_id;

  -- Set the balance_after for the transaction
  NEW.balance_after := v_new_amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;