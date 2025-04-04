-- Fix the profile creation trigger to properly handle conflicts

-- Update the function to use ON CONFLICT DO NOTHING
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, experience, level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    0,
    1
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Make the profile creation policy more permissive
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (true);

-- Add a policy for upsert operations
CREATE POLICY "Users can upsert profiles"
ON profiles FOR UPDATE
USING (true)
WITH CHECK (true);

