-- Create a function to search users by email
CREATE OR REPLACE FUNCTION public.search_users_by_email(query text)
RETURNS TABLE (
    user_id uuid,
    email text,
    first_name text,
    last_name text,
    display_name text
) 
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email::text,
        u.raw_user_meta_data->>'first_name' as first_name,
        u.raw_user_meta_data->>'last_name' as last_name,
        COALESCE(
            CONCAT(
                u.raw_user_meta_data->>'first_name', 
                ' ', 
                u.raw_user_meta_data->>'last_name'
            ),
            u.email::text
        ) as display_name
    FROM auth.users u
    WHERE u.email = query
    AND u.email_confirmed_at IS NOT NULL; -- Only confirmed users
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.search_users_by_email(text) TO authenticated;

-- ========================================
-- Migration: Create Expenses Table
-- ========================================

-- Create status enum for expenses
CREATE TYPE public.expense_status AS ENUM ('draft', 'active', 'settled', 'archived');

-- Create main expenses table
CREATE TABLE public.expenses (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL DEFAULT auth.uid(),
    name text NOT NULL,
    description text,
    total_amount numeric(12,2) NOT NULL DEFAULT 0.00,
    status public.expense_status NOT NULL DEFAULT 'draft',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT expenses_pkey PRIMARY KEY (id),
    CONSTRAINT expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT check_expense_name_length CHECK ((char_length(name) >= 1) AND (char_length(name) <= 100)),
    CONSTRAINT check_expense_description_length CHECK ((description IS NULL) OR (char_length(description) <= 500)),
    CONSTRAINT check_total_amount_non_negative CHECK (total_amount >= 0)
);

-- Create indexes for better query performance
CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX idx_expenses_status ON public.expenses(status);
CREATE INDEX idx_expenses_created_at ON public.expenses(created_at DESC);

-- Create or use existing handle_updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- Create trigger for updating timestamp
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- Enable RLS on expenses table
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expenses table
CREATE POLICY "Users can view own expenses"
ON public.expenses
FOR SELECT
TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own expenses"
ON public.expenses
FOR INSERT
TO public
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
ON public.expenses
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
ON public.expenses
FOR DELETE
TO public
USING (auth.uid() = user_id);

-- Grant permissions to roles
GRANT ALL ON TABLE public.expenses TO anon, authenticated, service_role;

-- ========================================
-- Migration: Create Expense Participants Table
-- ========================================

-- Create expense participants table (supports both system users and external participants)
CREATE TABLE public.expense_participants (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    expense_id uuid NOT NULL,
    user_id uuid,
    external_name text,
    external_identifier text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT expense_participants_pkey PRIMARY KEY (id),
    CONSTRAINT expense_participants_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
    CONSTRAINT expense_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT participant_type_check CHECK (
        (user_id IS NOT NULL AND external_name IS NULL AND external_identifier IS NULL) OR
        (user_id IS NULL AND external_name IS NOT NULL)
    ),
    CONSTRAINT check_external_name_length CHECK ((external_name IS NULL) OR (char_length(external_name) <= 100)),
    CONSTRAINT check_external_identifier_length CHECK ((external_identifier IS NULL) OR (char_length(external_identifier) <= 255)),
    CONSTRAINT unique_expense_user_participant UNIQUE (expense_id, user_id),
    CONSTRAINT unique_expense_external_participant UNIQUE (expense_id, external_identifier)
);

-- Create indexes for better query performance
CREATE INDEX idx_expense_participants_expense_id ON public.expense_participants(expense_id);
CREATE INDEX idx_expense_participants_user_id ON public.expense_participants(user_id);

-- Create trigger for updating timestamp
CREATE TRIGGER update_expense_participants_updated_at
BEFORE UPDATE ON expense_participants
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- Enable RLS on expense_participants table
ALTER TABLE public.expense_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expense_participants table
CREATE POLICY "Users can view participants of own expenses"
ON public.expense_participants
FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM expenses
        WHERE id = expense_participants.expense_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can add participants to own expenses"
ON public.expense_participants
FOR INSERT
TO public
WITH CHECK (
    EXISTS (
        SELECT 1 FROM expenses
        WHERE id = expense_participants.expense_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update participants of own expenses"
ON public.expense_participants
FOR UPDATE
TO public
USING (
    EXISTS (
        SELECT 1 FROM expenses
        WHERE id = expense_participants.expense_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete participants from own expenses"
ON public.expense_participants
FOR DELETE
TO public
USING (
    EXISTS (
        SELECT 1 FROM expenses
        WHERE id = expense_participants.expense_id
        AND user_id = auth.uid()
    )
);

-- Grant permissions to roles
GRANT ALL ON TABLE public.expense_participants TO anon, authenticated, service_role;