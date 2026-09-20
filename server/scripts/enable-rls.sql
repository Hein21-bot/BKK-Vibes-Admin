-- Supabase only. Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- Supabase automatically publishes every table in the "public" schema as a web API
-- (PostgREST). This app does not use that API — it talks to the database directly through
-- the server — so switch it off for our tables by enabling Row Level Security with NO policies.
-- Result: the Supabase web API (anon / authenticated keys) can read or write nothing here.
--
-- The app is not affected: the server connects as the table owner (the "postgres" user),
-- and owners are not subject to row level security.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- Check: every row should say rls_enabled = true
SELECT tablename, rowsecurity AS rls_enabled FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
