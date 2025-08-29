-- Backfill profiles for existing users and migrate first_name/last_name data
DO $$
DECLARE
    v_user RECORD;
    v_first_name TEXT;
    v_last_name TEXT;
BEGIN
    -- Loop through all existing users in auth.users
    FOR v_user IN 
        SELECT 
            id,
            email,
            raw_user_meta_data
        FROM auth.users
        WHERE id NOT IN (
            -- Skip users who already have profiles
            SELECT id FROM public.profiles
        )
    LOOP
        -- Extract first_name and last_name from raw_user_meta_data
        v_first_name := v_user.raw_user_meta_data->>'first_name';
        v_last_name := v_user.raw_user_meta_data->>'last_name';
        
        -- Insert profile for this user
        INSERT INTO public.profiles (
            id, 
            email, 
            first_name, 
            last_name,
            created_at,
            updated_at
        ) VALUES (
            v_user.id,
            v_user.email,
            v_first_name,
            v_last_name,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO NOTHING; -- Safety check to avoid duplicate key errors
        
    END LOOP;
    
    RAISE NOTICE 'Profiles backfill completed';
END $$;

-- Update existing profiles that might have NULL first_name/last_name 
-- but have data in auth.users.raw_user_meta_data
UPDATE public.profiles p
SET 
    first_name = COALESCE(p.first_name, u.raw_user_meta_data->>'first_name'),
    last_name = COALESCE(p.last_name, u.raw_user_meta_data->>'last_name'),
    updated_at = NOW()
FROM auth.users u
WHERE 
    p.id = u.id
    AND (
        (p.first_name IS NULL AND u.raw_user_meta_data->>'first_name' IS NOT NULL)
        OR 
        (p.last_name IS NULL AND u.raw_user_meta_data->>'last_name' IS NOT NULL)
    );

-- Remove first_name and last_name from auth.users.raw_user_meta_data
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'first_name' - 'last_name'
WHERE 
    raw_user_meta_data ? 'first_name' 
    OR raw_user_meta_data ? 'last_name';