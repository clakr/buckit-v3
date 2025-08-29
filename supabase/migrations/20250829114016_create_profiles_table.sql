-- Create profiles table with email for searching
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text UNIQUE NOT NULL,
    first_name text,
    last_name text,
    avatar_url text,
    username text UNIQUE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_username ON public.profiles(username) WHERE username IS NOT NULL;

-- Add validation constraints
ALTER TABLE public.profiles 
ADD CONSTRAINT check_first_name_length 
CHECK ((first_name IS NULL) OR (char_length(first_name) >= 1 AND char_length(first_name) <= 50));

ALTER TABLE public.profiles 
ADD CONSTRAINT check_last_name_length 
CHECK ((last_name IS NULL) OR (char_length(last_name) >= 1 AND char_length(last_name) <= 50));

ALTER TABLE public.profiles 
ADD CONSTRAINT check_username_format 
CHECK ((username IS NULL) OR (username ~ '^[a-zA-Z0-9_-]+$'));

ALTER TABLE public.profiles 
ADD CONSTRAINT check_username_length 
CHECK ((username IS NULL) OR (char_length(username) >= 3 AND char_length(username) <= 30));

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy for users to view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
AS PERMISSIVE
FOR SELECT
TO public
USING (auth.uid() = id);

-- Policy for authenticated users to search other profiles (for your future module)
CREATE POLICY "Authenticated users can search other profiles"
ON public.profiles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() != id);

-- Policy for users to update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
AS PERMISSIVE
FOR UPDATE
TO public
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup (simplified - only id and email)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (
        new.id,
        new.email
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bulk fetch users by IDs
CREATE OR REPLACE FUNCTION public.get_users_by_ids(user_ids uuid[])
RETURNS TABLE (
    id uuid,
    email text,
    first_name text,
    last_name text,
    avatar_url text,
    username text,
    created_at timestamp with time zone
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create triggers
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Grant permissions to roles
GRANT DELETE ON TABLE public.profiles TO anon;
GRANT INSERT ON TABLE public.profiles TO anon;
GRANT REFERENCES ON TABLE public.profiles TO anon;
GRANT SELECT ON TABLE public.profiles TO anon;
GRANT TRIGGER ON TABLE public.profiles TO anon;
GRANT TRUNCATE ON TABLE public.profiles TO anon;
GRANT UPDATE ON TABLE public.profiles TO anon;

GRANT DELETE ON TABLE public.profiles TO authenticated;
GRANT INSERT ON TABLE public.profiles TO authenticated;
GRANT REFERENCES ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT TRIGGER ON TABLE public.profiles TO authenticated;
GRANT TRUNCATE ON TABLE public.profiles TO authenticated;
GRANT UPDATE ON TABLE public.profiles TO authenticated;

GRANT DELETE ON TABLE public.profiles TO service_role;
GRANT INSERT ON TABLE public.profiles TO service_role;
GRANT REFERENCES ON TABLE public.profiles TO service_role;
GRANT SELECT ON TABLE public.profiles TO service_role;
GRANT TRIGGER ON TABLE public.profiles TO service_role;
GRANT TRUNCATE ON TABLE public.profiles TO service_role;
GRANT UPDATE ON TABLE public.profiles TO service_role;

-- Grant execute permission on RPC function
GRANT EXECUTE ON FUNCTION public.get_users_by_ids(uuid[]) TO authenticated;