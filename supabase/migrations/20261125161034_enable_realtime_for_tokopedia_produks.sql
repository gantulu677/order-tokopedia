-- Keep the public product catalog in the Supabase Realtime publication.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'produks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.produks;
  END IF;
END
$$;
