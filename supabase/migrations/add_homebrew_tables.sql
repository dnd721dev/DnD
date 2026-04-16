-- Homebrew content tables
-- All entries are publicly visible (community library)

create table if not exists homebrew_weapons (
  id uuid primary key default gen_random_uuid(),
  creator_wallet text not null,
  name text not null,
  category text,           -- 'simple' | 'martial'
  weapon_group text,       -- 'melee' | 'ranged'
  damage_dice text,        -- e.g. '1d8'
  damage_type text,        -- 'bludgeoning' | 'piercing' | 'slashing' | 'magical' etc.
  properties text[],       -- finesse, reach, thrown, etc.
  notes text,
  created_at timestamptz default now()
);

create table if not exists homebrew_armor (
  id uuid primary key default gen_random_uuid(),
  creator_wallet text not null,
  name text not null,
  category text,           -- 'light' | 'medium' | 'heavy' | 'shield'
  base_ac int,
  dex_cap int,             -- null = no cap
  str_requirement int,
  stealth_disadvantage boolean default false,
  notes text,
  created_at timestamptz default now()
);

create table if not exists homebrew_items (
  id uuid primary key default gen_random_uuid(),
  creator_wallet text not null,
  name text not null,
  category text,           -- 'consumable' | 'gear' | 'treasure' | 'misc' | 'magic'
  rarity text,             -- 'common' | 'uncommon' | 'rare' | 'very rare' | 'legendary'
  description text,
  weight numeric,
  cost_gp text,
  created_at timestamptz default now()
);

create table if not exists homebrew_subclasses (
  id uuid primary key default gen_random_uuid(),
  creator_wallet text not null,
  name text not null,
  parent_class text not null,  -- 'Fighter' | 'Wizard' etc.
  subclass_type text,          -- 'archetype' | 'tradition' | 'domain' etc.
  description text,
  features jsonb,              -- array of { level: number, name: string, description: string }
  created_at timestamptz default now()
);
