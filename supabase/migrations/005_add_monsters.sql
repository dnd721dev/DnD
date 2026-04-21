-- 005_add_monsters.sql
-- SRD + custom monsters table.

CREATE TABLE IF NOT EXISTS public.monsters (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT        NOT NULL,
  type                 TEXT,
  size                 TEXT,
  alignment            TEXT,
  ac                   INT,
  hp                   INT,
  speed                TEXT,
  str                  INT,
  dex                  INT,
  con                  INT,
  int_score            INT,
  wis                  INT,
  cha                  INT,
  saving_throws        JSONB       DEFAULT '{}',
  skills               JSONB       DEFAULT '{}',
  damage_resistances   TEXT,
  damage_immunities    TEXT,
  condition_immunities TEXT,
  senses               TEXT,
  languages            TEXT,
  challenge_rating     TEXT,
  xp                   INT,
  traits               JSONB       DEFAULT '[]',
  actions              JSONB       DEFAULT '[]',
  legendary_actions    JSONB       DEFAULT '[]',
  source               TEXT        DEFAULT 'srd',
  is_custom            BOOLEAN     DEFAULT false,
  created_by           UUID        REFERENCES auth.users(id),
  created_at           TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.monsters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read monsters"
  ON public.monsters FOR SELECT USING (true);

CREATE POLICY "Users can create custom monsters"
  ON public.monsters FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own custom monsters"
  ON public.monsters FOR UPDATE
  USING (auth.uid() = created_by);
