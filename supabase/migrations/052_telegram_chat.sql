-- 052: live read-only mirror of the DND721 Telegram group chat.
--
-- A Telegram bot (privacy mode OFF) in the group calls /api/telegram/webhook on
-- each message; the webhook (service role) inserts here, and the Community page
-- streams rows in real time via Supabase Realtime. The feed is read-only on the
-- site — to comment, users join the group on Telegram.

CREATE TABLE IF NOT EXISTS telegram_messages (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id       TEXT        NOT NULL,
  tg_message_id BIGINT,
  sender_name   TEXT        NOT NULL DEFAULT 'Member',
  text          TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS telegram_messages_created_idx ON telegram_messages(created_at DESC);
-- Dedupe webhook retries / duplicate deliveries.
CREATE UNIQUE INDEX IF NOT EXISTS telegram_messages_chat_msg_uniq
  ON telegram_messages(chat_id, tg_message_id) WHERE tg_message_id IS NOT NULL;

ALTER TABLE telegram_messages ENABLE ROW LEVEL SECURITY;
-- Public read (it's the public community chat). No INSERT/UPDATE/DELETE policy →
-- only the service-role webhook can write.
DROP POLICY IF EXISTS "telegram_messages_select" ON telegram_messages;
CREATE POLICY "telegram_messages_select" ON telegram_messages FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE telegram_messages;
