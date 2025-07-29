-- Create goals table (independent table with similar structure to buckets)
CREATE TABLE public.goals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  current_amount numeric(12, 2) NOT NULL DEFAULT 0.00,
  target_amount numeric(12, 2) NOT NULL,
  description text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT goals_pkey PRIMARY KEY (id),
  CONSTRAINT goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT check_goal_description_length CHECK (
    (description IS NULL) OR (char_length(description) <= 500)
  ),
  CONSTRAINT check_goal_name_length CHECK (
    (char_length(name) >= 1) AND (char_length(name) <= 100)
  ),
  CONSTRAINT check_target_amount_positive CHECK (target_amount > 0),
  CONSTRAINT check_target_amount_greater_than_current CHECK (target_amount >= current_amount)
) TABLESPACE pg_default;

-- Create indexes for goals table
CREATE INDEX IF NOT EXISTS idx_goals_created_at ON public.goals USING btree (created_at DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_goals_is_active ON public.goals USING btree (is_active) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals USING btree (user_id) TABLESPACE pg_default;

-- Create trigger for updating goals updated_at
CREATE TRIGGER update_goals_updated_at 
BEFORE UPDATE ON goals 
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- Create goal_transactions table
CREATE TABLE public.goal_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  type public.transaction_type NOT NULL,
  amount numeric(12, 2) NOT NULL,
  balance_after numeric(12, 2) NULL,
  description text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT goal_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT goal_transactions_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES goals (id) ON DELETE CASCADE,
  CONSTRAINT goal_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT check_transaction_amount CHECK (amount > 0::numeric),
  CONSTRAINT check_transaction_description_length CHECK (
    (description IS NULL) OR (char_length(description) <= 500)
  )
) TABLESPACE pg_default;

-- Create indexes for goal_transactions table
CREATE INDEX IF NOT EXISTS idx_goal_transactions_goal_id ON public.goal_transactions USING btree (goal_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_goal_transactions_created_at ON public.goal_transactions USING btree (created_at DESC) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_goal_transactions_type ON public.goal_transactions USING btree (type) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_goal_transactions_user_id ON public.goal_transactions USING btree (user_id) TABLESPACE pg_default;

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
    
    -- Check if outbound transaction would result in negative balance
    IF v_new_amount < 0 THEN
      RAISE EXCEPTION 'Insufficient funds in goal. Current amount: %, Transaction amount: %', 
        v_current_amount, NEW.amount;
    END IF;
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

-- Create trigger for processing goal transactions
CREATE TRIGGER process_transaction_before_insert 
BEFORE INSERT ON goal_transactions 
FOR EACH ROW
EXECUTE FUNCTION process_goal_transaction();

-- Create trigger for updating goal_transactions updated_at
CREATE TRIGGER update_goal_transactions_updated_at 
BEFORE UPDATE ON goal_transactions 
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();