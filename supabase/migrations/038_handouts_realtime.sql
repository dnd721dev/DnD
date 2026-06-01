-- 038_handouts_realtime.sql
-- session_handouts was never added to the realtime publication, so the
-- HandoutsPanel subscription fired on nothing and players had to refresh
-- manually to see handouts the GM revealed.

ALTER PUBLICATION supabase_realtime ADD TABLE session_handouts;
