/**
 * Hell Clock — Save file parsing & extraction for The Graveyard (Upload Crypt).
 * Strict validation and career summation from pastRunsData.
 */

import type { PlayerSaveData, PastRunData, ExtractedDeathPayload } from './types';

interface SkillSlot {
  _skillHashId: number;
}

export interface ValidationError {
  code: 'NOT_HARDCORE' | 'NO_DEATH' | 'ALIVE' | 'INVALID_STRUCTURE';
  message: string;
}

/**
 * Validates that the save file represents a valid Hardcore death.
 * Checks for: Object structure, Hardcore mode enabled, and presence of exactly one death.
 */
export function validateSaveFile(data: unknown): ValidationError | null {
  if (!data || typeof data !== 'object') {
    return { code: 'INVALID_STRUCTURE', message: 'Invalid save file: not an object.' };
  }

  const d = data as Record<string, unknown>;

  if (d.hardcoreModeEnabled !== true) {
    return { code: 'NOT_HARDCORE', message: 'Only Hardcore deaths are accepted. hardcoreModeEnabled must be true.' };
  }

  const cumulativeTotalDeaths = d.cumulativeTotalDeaths;
  if (typeof cumulativeTotalDeaths !== 'number' || cumulativeTotalDeaths !== 1) {
    return { code: 'NO_DEATH', message: 'Save file must have cumulativeTotalDeaths === 1 to submit a death.' };
  }

  const pastRuns = d.pastRunsData;
  if (!Array.isArray(pastRuns) || pastRuns.length === 0) {
    return { code: 'INVALID_STRUCTURE', message: 'pastRunsData is missing or empty.' };
  }

  return null;
}

/** 
 * Extracts performance statistics from the final run in the save file. 
 */
function getLastRunStats(data: PlayerSaveData): {
  level: number;
  damageTaken: number;
  lastRunKills: number;
  lastRunSoulstones: number;
  lastRunRegularKills: number;
  lastRunEliteKills: number;
  lastRunBossKills: number;
  lastRunGold: number;
  lastRunDamageDealt: number;
  lastRunDuration: number;
} {
  const pastRuns = data.pastRunsData;
  const lastRun = pastRuns[pastRuns.length - 1]!;

  const cntList = (lastRun._statCounters as { _serializedList?: Array<{ Key: string; Value: number }> })?._serializedList;
  const aggList = (lastRun._statAggregators as { _serializedList?: Array<{ Key: string; Value: number }> })?._serializedList;

  // Strict check: Level must exist
  const level = getRequiredValue(cntList, 'LevelAchieved');

  // Last run specific metrics - ALL STRICTLY REQUIRED
  const lastRunKills = getRequiredValue(cntList, 'EnemiesDefeated');
  const lastRunSoulstones = getRequiredValue(cntList, 'SoulStonesCollected');
  const lastRunRegularKills = getRequiredValue(cntList, 'RegularEnemiesDefeated');
  const lastRunEliteKills = getRequiredValue(cntList, 'EliteEnemiesDefeated');
  const lastRunBossKills = getRequiredValue(cntList, 'BossEnemiesDefeated');
  const lastRunGold = getRequiredValue(aggList, 'GoldGained');
  const lastRunDamageDealt = getRequiredValue(aggList, 'DamageDealt');
  const lastRunDuration = getRequiredValue(aggList, 'RunTime');

  const damageInstances = lastRun._lastDamageInstances;
  if (!Array.isArray(damageInstances) || damageInstances.length === 0) {
    throw new Error('Validation Error: No damage history found. (Did you take damage?)');
  }

  const lastInstance = damageInstances[damageInstances.length - 1];
  if (typeof lastInstance?._totalDamage !== 'number') {
    throw new Error('Validation Error: Missing _totalDamage in last damage instance.');
  }
  const damageTaken = lastInstance._totalDamage;

  return {
    level, damageTaken,
    lastRunKills, lastRunSoulstones, lastRunRegularKills, lastRunEliteKills, lastRunBossKills, lastRunGold,
    lastRunDamageDealt, lastRunDuration
  };
}

/** 
 * retrieval helper for the serialized key-value list format used in the save file. 
 */
function getValueFromSerializedList(
  serializedList: Array<{ Key: string; Value: number }> | undefined,
  key: string
): number {
  if (!Array.isArray(serializedList)) return 0;
  const item = serializedList.find((x) => x.Key === key);
  return typeof item?.Value === 'number' ? item.Value : 0;
}

function getRequiredValue(
  serializedList: Array<{ Key: string; Value: number }> | undefined,
  key: string
): number {
  if (!Array.isArray(serializedList)) {
    throw new Error(`Validation Error: Missing stat block containing ${key}.`);
  }
  const item = serializedList.find((x) => x.Key === key);
  if (typeof item?.Value !== 'number') {
    throw new Error(`Validation Error: Missing required field '${key}'.`);
  }
  return item.Value;
}

/** 
 * Aggregates lifetime statistics across all past runs.
 */
function sumCareerStats(pastRunsData: PastRunData[]): {
  totalGold: number;
  totalSoulstones: number;
  totalKills: number;
  totalEliteKills: number;
  totalBosses: number;
} {
  let totalGold = 0;
  let totalStones = 0;
  let totalKills = 0;
  let totalEliteKills = 0;
  let totalBosses = 0;

  for (const run of pastRunsData) {
    const aggList = (run._statAggregators as { _serializedList?: Array<{ Key: string; Value: number }> })?._serializedList;
    const cntList = (run._statCounters as { _serializedList?: Array<{ Key: string; Value: number }> })?._serializedList;

    totalGold += getValueFromSerializedList(aggList, 'GoldGained');
    totalStones += getValueFromSerializedList(cntList, 'SoulStonesCollected');
    totalKills += getValueFromSerializedList(cntList, 'EnemiesDefeated');
    totalEliteKills += getValueFromSerializedList(cntList, 'EliteEnemiesDefeated');
    totalBosses += getValueFromSerializedList(cntList, 'BossEnemiesDefeated');
  }

  return { totalGold, totalSoulstones: totalStones, totalKills, totalEliteKills, totalBosses };
}

/**
 * Parses the raw save data to produce the finalized payload for database insertion.
 * Assumes data has passed validation.
 */
export function extractDeathPayload(data: PlayerSaveData): ExtractedDeathPayload {
  const {
    level, damageTaken,
    lastRunKills, lastRunSoulstones, lastRunRegularKills, lastRunEliteKills, lastRunBossKills, lastRunGold,
    lastRunDamageDealt, lastRunDuration
  } = getLastRunStats(data);
  const { totalGold, totalSoulstones, totalKills, totalEliteKills, totalBosses } = sumCareerStats(data.pastRunsData);



  if (typeof data.gameplayTime !== 'number') {
    throw new Error('Validation Error: Missing required field path \'gameplayTime\'');
  }
  const gameplayTime = data.gameplayTime;

  if (typeof data.cumulativeTotalRuns !== 'number') {
    throw new Error('Validation Error: Missing required field path \'cumulativeTotalRuns\'');
  }
  const careerRuns = data.cumulativeTotalRuns;

  // FIX: Use skillSlots to get the actual EQUIPPED skills (Loadout), not just unlocked ones (Progression)
  const skillSlots = data.skillSlots;
  const skillIds: number[] = [];

  if (Array.isArray(skillSlots)) {
    // Filter out empty slots (_skillHashId === -1) and map to IDs
    const equippedSkills = (skillSlots as SkillSlot[])
      .filter((slot) => slot._skillHashId !== -1)
      .map((slot) => slot._skillHashId);

    skillIds.push(...equippedSkills);
    console.log('Extracted Skills (Loadout):', skillIds);
  }
  // DO NOT PAD with 0s. The UI will just not render missing slots, or render them as empty if we prefer.
  // The user explicitly asked to "show skills that are equipped", so if it's -1 it shouldn't show.
  // By sending a shorter array, the UI map loop will just run fewer times.

  // Level should be from LevelAchieved of last run, never default to 1 if 0 is valid
  const finalLevel = level > 0 ? level : 1;

  return {
    level: finalLevel,
    damageTaken,
    careerSeconds: gameplayTime,
    careerRuns,
    careerKills: totalKills,
    careerEliteKills: totalEliteKills,
    careerBosses: totalBosses,
    careerGold: totalGold,
    careerSoulstones: totalSoulstones,
    skillIds: skillIds.slice(0, 5),
    lastRunKills,
    lastRunSoulstones,
    lastRunRegularKills,
    lastRunEliteKills,
    lastRunBossKills,
    lastRunGold,
    lastRunDamageDealt,
    lastRunDuration,
  };
}
