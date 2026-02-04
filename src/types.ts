/**
 * Hell Clock — PlayerSave.json interface (The Graveyard / Upload Crypt)
 */

export interface StatCounters {
  [key: string]: number;
}

export interface StatAggregators {
  [key: string]: number;
}

export interface LastDamageInstance {
  _totalDamage: number;
  [key: string]: unknown;
}

export interface SkillAndLevel {
  _skill: number;
  [key: string]: unknown;
}

export interface PastRunData {
  _statCounters: StatCounters;
  _statAggregators?: StatAggregators;
  _lastDamageInstances?: LastDamageInstance[];
  [key: string]: unknown;
}

export interface PlayerSaveData {
  hardcoreModeEnabled: boolean;
  gameplayTime: number;
  cumulativeTotalRuns: number;
  cumulativeTotalDeaths: number;
  pastRunsData: PastRunData[];
  _skillAndLevels?: SkillAndLevel[];
  [key: string]: unknown;
}

/** Parsed result ready for DB insert (after validation + extraction) */
export interface ExtractedDeathPayload {
  classId: number;
  level: number;
  damageTaken: number;
  careerSeconds: number;
  careerRuns: number;
  careerKills: number;
  careerEliteKills: number;
  careerBosses: number;
  careerGold: number;
  careerSoulstones: number;
  skillIds: number[]; // Top 3 skills by level
  // NEW: Last run stats
  lastRunKills: number;
  lastRunSoulstones: number;
  lastRunRegularKills: number;
  lastRunEliteKills: number;
  lastRunBossKills: number;
  lastRunGold: number;
  lastRunDamageDealt: number;
  lastRunDuration: number;
}

/** Death record as stored in Supabase / displayed in graveyard */
export interface DeathRecord {
  id: string;
  user_id: string;
  character_name: string;
  mourned_by?: string | null;
  class_id: number;
  level: number;
  damage_taken: number | null;
  career_seconds: number | null;
  career_runs: number | null;
  career_kills: number | null;
  career_elite_kills: number | null;
  career_bosses: number | null;
  career_gold: number | null;
  career_soulstones: number | null;
  is_hardcore: boolean;
  death_date: string;
  unique_hash: string;
  respects_paid: number;
  report_count: number;
  skill_ids: number[] | null; // Top 3 skills
  // NEW: Last run columns
  last_run_kills: number | null;
  last_run_soulstones: number | null;
  last_run_regular_kills: number | null;
  last_run_elite_kills: number | null;
  last_run_boss_kills: number | null;
  last_run_gold: number | null;
  last_run_damage_dealt: number | null;
  last_run_duration: number | null;
}
