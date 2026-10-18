-- Additive preparation: safe to run before the frontend rollout.
BEGIN;
ALTER TABLE public.wordyssey_v2_profiles ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS wordyssey_v2_profiles_user_id_key ON public.wordyssey_v2_profiles(user_id) WHERE user_id IS NOT NULL;
ALTER TABLE public.wordyssey_v2_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.wordyssey_v2_profiles TO authenticated;
CREATE POLICY wordyssey_owner_select ON public.wordyssey_v2_profiles FOR SELECT TO authenticated USING ((select auth.uid())=user_id);
CREATE POLICY wordyssey_owner_insert ON public.wordyssey_v2_profiles FOR INSERT TO authenticated WITH CHECK ((select auth.uid())=user_id AND profile_key=user_id::text);
CREATE POLICY wordyssey_owner_update ON public.wordyssey_v2_profiles FOR UPDATE TO authenticated USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id AND profile_key=user_id::text);
COMMIT;
