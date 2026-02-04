-- =============================================================================
-- THE GRAVEYARD — Consolidated Schema
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- TABLE: deaths
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deaths (
    id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    character_name  text NOT NULL,
    class_id        int NOT NULL,
    level           int NOT NULL,
    damage_taken    numeric,
    career_seconds  numeric,
    career_runs     int,
    career_kills    int,
    career_elite_kills int,
    career_bosses   int,
    career_gold     bigint,
    career_soulstones int,
    mourned_by      text,
    skill_ids       integer[] DEFAULT ARRAY[0,0,0,0,0]::integer[],
    
    -- Last Run Stats
    last_run_kills          int,
    last_run_soulstones     int,
    last_run_regular_kills  int,
    last_run_elite_kills    int,
    last_run_boss_kills     int,
    last_run_gold           bigint,
    last_run_damage_dealt   numeric,
    last_run_duration       numeric,

    is_hardcore     boolean NOT NULL DEFAULT true,
    death_date      timestamptz NOT NULL DEFAULT now(),
    unique_hash TEXT NOT NULL UNIQUE,
    respects_paid   int NOT NULL DEFAULT 0,
    report_count    int NOT NULL DEFAULT 0,

    CONSTRAINT deaths_hardcore_only CHECK (is_hardcore = true),
    CONSTRAINT deaths_level_positive CHECK (level >= 0),
    CONSTRAINT deaths_name_length CHECK (length(character_name) <= 50)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deaths_user_id ON public.deaths(user_id);
CREATE INDEX IF NOT EXISTS idx_deaths_death_date ON public.deaths(death_date DESC);
CREATE INDEX IF NOT EXISTS idx_deaths_unique_hash ON public.deaths(unique_hash);

-- RLS
ALTER TABLE public.deaths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deaths_public_select" ON public.deaths FOR SELECT USING (true);
CREATE POLICY "deaths_auth_insert" ON public.deaths FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "deaths_auth_update" ON public.deaths FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "deaths_owner_delete" ON public.deaths FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- TABLE: death_respects
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.death_respects (
    id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    death_id        uuid NOT NULL REFERENCES public.deaths(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE(death_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_death_respects_death_id ON public.death_respects(death_id);
CREATE INDEX IF NOT EXISTS idx_death_respects_user_id ON public.death_respects(user_id);

ALTER TABLE public.death_respects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "death_respects_public_select" ON public.death_respects FOR SELECT USING (true);
CREATE POLICY "death_respects_auth_insert" ON public.death_respects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
