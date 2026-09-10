-- 065_telegram_bot_only_cleanup.sql  (OPTIONAL — run once by hand)
--
-- As of the webhook change, /api/telegram/webhook mirrors ONLY the DM Troll
-- bot's posts (TELEGRAM_ALLOWED_SENDER, default @DND721_DM_Troll_bot). Rows
-- already stored from before that change include group members' messages.
--
-- telegram_messages only keeps the sender's DISPLAY name, not their @username,
-- so old bot vs. member rows can't be told apart reliably after the fact.
-- The clean reset is to clear the backlog; the feed repopulates with the bot's
-- posts from here on. Run this in the Supabase SQL editor if you want the
-- community feed to immediately show bot-only history.

TRUNCATE TABLE telegram_messages;

-- If you prefer to keep any rows, delete by the bot's stored display name
-- instead, e.g.:
--   DELETE FROM telegram_messages WHERE sender_name <> 'DND721 DM Troll';
-- (replace with the bot's actual display name as it appears in the feed).
