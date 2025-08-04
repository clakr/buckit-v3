-- Create splits table
CREATE TABLE public.splits (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL DEFAULT auth.uid(),
    name text NOT NULL,
    base_amount numeric(12,2) NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT splits_pkey PRIMARY KEY (id),
    CONSTRAINT splits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT check_split_name_length CHECK ((char_length(name) >= 1) AND (char_length(name) <= 100)),
    CONSTRAINT check_split_description_length CHECK ((description IS NULL) OR (char_length(description) <= 500)),
    CONSTRAINT check_base_amount_positive CHECK (base_amount > 0)
);

-- Create allocation_type enum
CREATE TYPE public.allocation_type AS ENUM ('percentage', 'fixed');

-- Create target_type enum for bucket vs goal
CREATE TYPE public.target_type AS ENUM ('bucket', 'goal');

-- Create split_allocations table
CREATE TABLE public.split_allocations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    split_id uuid NOT NULL,
    user_id uuid NOT NULL DEFAULT auth.uid(),
    target_type public.target_type NOT NULL,
    target_id uuid NOT NULL, -- References either bucket_id or goal_id
    allocation_type public.allocation_type NOT NULL,
    amount numeric(12,2), -- For fixed amounts
    percentage numeric(5,2), -- For percentage (0.00 to 100.00)
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT split_allocations_pkey PRIMARY KEY (id),
    CONSTRAINT split_allocations_split_id_fkey FOREIGN KEY (split_id) REFERENCES splits(id) ON DELETE CASCADE,
    CONSTRAINT split_allocations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT check_allocation_values CHECK (
        (allocation_type = 'fixed' AND amount IS NOT NULL AND amount > 0 AND percentage IS NULL) OR
        (allocation_type = 'percentage' AND percentage IS NOT NULL AND percentage > 0 AND percentage <= 100 AND amount IS NULL)
    ),
    CONSTRAINT check_unique_target_per_split UNIQUE (split_id, target_type, target_id)
);

-- Create indexes
CREATE INDEX idx_splits_user_id ON public.splits(user_id);
CREATE INDEX idx_splits_is_active ON public.splits(is_active);
CREATE INDEX idx_split_allocations_split_id ON public.split_allocations(split_id);
CREATE INDEX idx_split_allocations_user_id ON public.split_allocations(user_id);
CREATE INDEX idx_split_allocations_target ON public.split_allocations(target_type, target_id);

-- Create validation function to ensure allocations don't exceed base amount
CREATE OR REPLACE FUNCTION validate_split_allocations()
RETURNS TRIGGER AS $$
DECLARE
    v_base_amount numeric(12,2);
    v_total_fixed numeric(12,2);
    v_total_percentage numeric(5,2);
    v_calculated_total numeric(12,2);
BEGIN
    -- Get the base amount from the split
    SELECT base_amount INTO v_base_amount
    FROM splits
    WHERE id = NEW.split_id;

    -- Calculate total fixed amounts and percentages
    SELECT 
        COALESCE(SUM(CASE WHEN allocation_type = 'fixed' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN allocation_type = 'percentage' THEN percentage ELSE 0 END), 0)
    INTO v_total_fixed, v_total_percentage
    FROM split_allocations
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
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER validate_allocation_before_insert
BEFORE INSERT ON split_allocations
FOR EACH ROW
EXECUTE FUNCTION validate_split_allocations();

CREATE TRIGGER validate_allocation_before_update
BEFORE UPDATE ON split_allocations
FOR EACH ROW
WHEN (OLD.amount IS DISTINCT FROM NEW.amount OR OLD.percentage IS DISTINCT FROM NEW.percentage OR OLD.allocation_type IS DISTINCT FROM NEW.allocation_type)
EXECUTE FUNCTION validate_split_allocations();

CREATE TRIGGER update_splits_updated_at
BEFORE UPDATE ON splits
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_split_allocations_updated_at
BEFORE UPDATE ON split_allocations
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- Enable RLS
ALTER TABLE public.splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.split_allocations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for splits
CREATE POLICY "Users can view own splits"
ON public.splits
FOR SELECT
TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own splits"
ON public.splits
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own splits"
ON public.splits
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own splits"
ON public.splits
FOR DELETE
TO public
USING (auth.uid() = user_id);

-- Create RLS policies for split_allocations
CREATE POLICY "Users can view own allocations"
ON public.split_allocations
FOR SELECT
TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can create allocations for own splits"
ON public.split_allocations
FOR INSERT
TO public
WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (
        SELECT 1 FROM splits 
        WHERE id = split_allocations.split_id 
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update own allocations"
ON public.split_allocations
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own allocations"
ON public.split_allocations
FOR DELETE
TO public
USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON TABLE public.splits TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.split_allocations TO anon, authenticated, service_role;

-- Function to execute a split
CREATE OR REPLACE FUNCTION execute_split(p_split_id uuid)
RETURNS json AS $$
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
    FROM splits
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
        SELECT * FROM split_allocations 
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
            INSERT INTO bucket_transactions (
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
            INSERT INTO goal_transactions (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;