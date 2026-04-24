-- Bug 6: enable Supabase Realtime for session_rolls so every connected client
-- receives INSERT events and sees new dice rolls within 1-2 seconds without
-- having to poll.
--
-- If session_rolls is already in the publication this is a no-op on re-run.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_publication_tables
     WHERE pubname   = 'supabase_realtime'
       AND tablename = 'session_rolls'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE session_rolls;
  END IF;
END $$;
