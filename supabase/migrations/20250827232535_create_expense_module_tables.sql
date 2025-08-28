-- ========================================
-- Migration: Create Expenses Table
-- ========================================

-- Create status enum for expenses
CREATE TYPE public.expense_status AS ENUM ('draft', 'active', 'settled');

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