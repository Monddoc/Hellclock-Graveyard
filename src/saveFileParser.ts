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
  classId: number;
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

  const level = getValueFromSerializedList(cntList, 'LevelAchieved');

  // Last run specific metrics
  const lastRunKills = getValueFromSerializedList(cntList, 'EnemiesDefeated');
  const lastRunSoulstones = getValueFromSerializedList(cntList, 'SoulStonesCollected');
  const lastRunRegularKills = getValueFromSerializedList(cntList, 'RegularEnemiesDefeated');
  const lastRunEliteKills = getValueFromSerializedList(cntList, 'EliteEnemiesDefeated');
  const lastRunBossKills = getValueFromSerializedList(cntList, 'BossEnemiesDefeated');
  const lastRunGold = getValueFromSerializedList(aggList, 'GoldGained');
  const lastRunDamageDealt = getValueFromSerializedList(aggList, 'DamageDealt');
  const lastRunDuration = getValueFromSerializedList(aggList, 'RunTime');

  const damageInstances = lastRun._lastDamageInstances;
  const damageTaken = Array.isArray(damageInstances) && damageInstances.length > 0
    ? (damageInstances[damageInstances.length - 1]!._totalDamage ?? 0)
    : 0;

  const skillAndLevels = data._skillAndLevels;
  const classId = Array.isArray(skillAndLevels) && skillAndLevels.length > 0
    ? (skillAndLevels[0]!._skill ?? 0)
    : 0;

  return {
    level, damageTaken, classId,
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
    level, damageTaken, classId,
    lastRunKills, lastRunSoulstones, lastRunRegularKills, lastRunEliteKills, lastRunBossKills, lastRunGold,
    lastRunDamageDealt, lastRunDuration
  } = getLastRunStats(data);
  const { totalGold, totalSoulstones, totalKills, totalEliteKills, totalBosses } = sumCareerStats(data.pastRunsData);

  const gameplayTime = typeof data.gameplayTime === 'number' ? data.gameplayTime : 0;
  const careerRuns = typeof data.cumulativeTotalRuns === 'number' ? data.cumulativeTotalRuns : 0;

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
  // Pad to 5 if needed
  while (skillIds.length < 5) {
    skillIds.push(0);
  }

  // Level should be from LevelAchieved of last run, never default to 1 if 0 is valid
  const finalLevel = level > 0 ? level : 1;

  return {
    classId,
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
