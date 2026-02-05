import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileJson, Skull, AlertCircle, Copy } from 'lucide-react';
import { Filter } from 'bad-words';
import { validateSaveFile, extractDeathPayload } from '../saveFileParser';
import type { PlayerSaveData, ExtractedDeathPayload } from '../types';
import { generateUniqueHash } from '../lib/hash';
import { supabase } from '../lib/supabase';

const filter = new Filter();

const MAX_NAME_LENGTH = 20;

function sanitizeCharacterName(input: string): string {
  const trimmed = input.trim().slice(0, MAX_NAME_LENGTH);
  return filter.clean(trimmed) || 'Fallen Hero';
}

interface UploadCryptProps {
  onUploadSuccess?: () => void;
}

export default function UploadCrypt({ onUploadSuccess }: UploadCryptProps) {
  const [fileError, setFileError] = useState<string | null>(null);
  const [payload, setPayload] = useState<ExtractedDeathPayload | null>(null);
  const [rawJson, setRawJson] = useState<string>('');
  const [heroName, setHeroName] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);
    setPayload(null);
    setRawJson('');
    setHeroName('');
    setSubmitStatus('idle');
    setSubmitMessage('');

    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      let data: unknown;
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        setFileError('Invalid JSON.');
        return;
      }

      const validationError = validateSaveFile(data);
      if (validationError) {
        setFileError(validationError.message);
        return;
      }

      const extracted = extractDeathPayload(data as PlayerSaveData);
      console.log('Extracted payload:', extracted);
      setPayload(extracted);
      setRawJson(text);
      setHeroName('');
    };
    reader.readAsText(file);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!payload || !rawJson) return;

    const sanitizedName = sanitizeCharacterName(heroName || 'Fallen Hero');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitStatus('error');
      setSubmitMessage('You must be signed in to submit a death.');
      return;
    }

    setSubmitStatus('loading');
    setSubmitMessage('');


    let uniqueHash: string;
    try {
      uniqueHash = await generateUniqueHash({
        userId: user.id,
        rawSnapshot: rawJson,
      });
    } catch {
      setSubmitStatus('error');
      setSubmitMessage('Failed to generate submission hash.');
      return;
    }

    const insertData = {
      user_id: user.id,
      mourned_by: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown Soul',
      character_name: sanitizedName,
      level: payload.level,
      damage_taken: payload.damageTaken,
      career_seconds: payload.careerSeconds,
      career_runs: payload.careerRuns,
      career_kills: payload.careerKills,
      career_elite_kills: payload.careerEliteKills,
      career_bosses: payload.careerBosses,
      career_gold: payload.careerGold,
      career_soulstones: payload.careerSoulstones,
      skill_ids: payload.skillIds,
      // Last run
      last_run_kills: payload.lastRunKills,
      last_run_soulstones: payload.lastRunSoulstones,
      last_run_regular_kills: payload.lastRunRegularKills,
      last_run_elite_kills: payload.lastRunEliteKills,
      last_run_boss_kills: payload.lastRunBossKills,
      last_run_gold: payload.lastRunGold,
      last_run_damage_dealt: payload.lastRunDamageDealt,
      last_run_duration: payload.lastRunDuration,
      unique_hash: uniqueHash,
    };
    console.log('Inserting data:', insertData);
    const { error, data: insertedData } = await supabase.from('deaths').insert(insertData).select();
    console.log('Insert result:', { error, insertedData });

    if (error) {
      setSubmitStatus('error');
      setSubmitMessage(error.code === '23505' ? 'This death was already submitted.' : error.message);
      return;
    }

    setSubmitStatus('success');
    setSubmitMessage('Your fallen hero has been laid to rest in The Graveyard.');
    onUploadSuccess?.();
  }, [payload, rawJson, heroName, onUploadSuccess]);

  return (
    <motion.section
      className="rounded-xl border border-stone-800 bg-stone-900/80 p-6 shadow-xl backdrop-blur-sm"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-4 flex items-center gap-2 text-stone-300">
        <Skull className="h-5 w-5 text-red-600" aria-hidden />
        <h2 className="font-cinzel text-lg font-semibold tracking-wide text-stone-200">
          Upload Crypt
        </h2>
      </div>

      <div
        className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-stone-700 bg-stone-800/50 px-6 py-8 transition hover:border-red-900/50 hover:bg-stone-800/80"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const file = e.dataTransfer.files?.[0];
          if (file) {
            // Reset state before processing new file
            setFileError(null);
            setPayload(null);
            setRawJson('');
            setHeroName('');
            setSubmitStatus('idle');
            setSubmitMessage('');

            const reader = new FileReader();
            reader.onload = () => {
              const text = reader.result as string;
              let data: unknown;
              try {
                // Pre-check for scientific notation in raw text BEFORE parsing
                // Regex looks for Pattern: Digit + [eE] + optional Plus/Minus + Digit. e.g. 1e5, 1.2E-3
                if (/[0-9][eE][+-]?[0-9]/.test(text)) {
                  setFileError('Scientific notation is not allowed. Please use standard numbers.');
                  return;
                }

                data = JSON.parse(text) as unknown;
              } catch {
                setFileError('Invalid JSON.');
                return;
              }

              const validationError = validateSaveFile(data);
              if (validationError) {
                setFileError(validationError.message);
                return;
              }

              const extracted = extractDeathPayload(data as PlayerSaveData);

              // Post-Extraction Validation
              if (extracted.level > 50) {
                setFileError('Validation Error: Level cannot exceed 50.');
                return;
              }
              if (extracted.damageTaken <= 0) {
                setFileError('Validation Error: Damage taken must be greater than 0.');
                return;
              }

              // Recursive check for negative numbers in top-level fields
              const hasNegative = Object.values(extracted).some(val => typeof val === 'number' && val < 0);
              if (hasNegative) {
                setFileError('Validation Error: Save file contains negative values.');
                return;
              }

              console.log('Extracted payload:', extracted);
              setRawJson(text);
              setHeroName('');
            };
            reader.readAsText(file);
          }
        }}
        onClick={() => {
          // We use a div instead of a label to avoid event propagation issues with nested interactive elements (like the copy button).
          // Manually triggering the hidden input maintains the standard file-picker UX.
          const input = document.getElementById('save-file-input') as HTMLInputElement;
          if (input) input.click();
        }}
      >
        <FileJson className="h-10 w-10 text-stone-500" aria-hidden />
        <span className="text-sm font-medium text-stone-300">Drop PlayerSave.json here or click to browse</span>

        {/* Path Helper */}
        <div className="mt-6 flex w-full max-w-sm flex-col items-center gap-2">
          <p className="text-[10px] font-medium uppercase tracking-widest text-stone-500">Save File Location</p>

          <div
            className="flex w-full items-center gap-2 rounded bg-stone-900/50 px-3 py-2 font-mono text-xs text-stone-400 ring-1 ring-stone-800 transition hover:bg-stone-900 hover:ring-stone-700"
            onClick={(e) => {
              // Prevent bubbling: clicking the path box should select text, not open the file picker.
              e.stopPropagation();
            }}
          >
            <span className="truncate flex-1 text-center select-all">%USERPROFILE%\AppData\LocalLow\Rogue Snail\Hell Clock</span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigator.clipboard.writeText('%USERPROFILE%\\AppData\\LocalLow\\Rogue Snail\\Hell Clock');
                const btn = document.getElementById('copy-feedback');
                if (btn) btn.innerText = 'Copied!';
                setTimeout(() => { if (btn) btn.innerText = ''; }, 2000);
              }}
              className="group relative flex items-center justify-center rounded p-1.5 hover:bg-stone-800 hover:text-white"
              title="Copy Path"
            >
              <Copy className="h-3.5 w-3.5" />
              <span id="copy-feedback" className="absolute -top-8 right-0 rounded bg-stone-800 px-2 py-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100"></span>
            </button>
          </div>
        </div>

        <input
          id="save-file-input"
          type="file"
          accept=".json,application/json"
          className="hidden"
          onClick={(e) => e.stopPropagation()} // Stop bubbling to parent div
          onChange={handleFileChange}
        />
      </div>

      <AnimatePresence mode="wait">
        {fileError && (
          <motion.div
            key="error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-red-300"
          >
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
            <span className="text-sm">{fileError}</span>
          </motion.div>
        )}

        {payload && !fileError && (
          <motion.div
            key="name-step"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0 }}
            className="mt-6 space-y-4"
          >
            <label className="block text-sm font-medium text-stone-300">
              Name your Fallen Hero
            </label>
            <input
              type="text"
              maxLength={MAX_NAME_LENGTH}
              placeholder="Fallen Hero"
              value={heroName}
              onChange={(e) => setHeroName(e.target.value)}
              className="w-full rounded-lg border border-stone-600 bg-stone-800 px-4 py-2 font-cinzel text-stone-100 placeholder:text-stone-500 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600/50"
            />
            <p className="text-xs text-stone-500">
              Max {MAX_NAME_LENGTH} characters. Profanity is filtered.
            </p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitStatus === 'loading'}
              className="w-full rounded-lg bg-red-800 px-4 py-2.5 font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {submitStatus === 'loading' ? 'Submitting…' : 'Lay to Rest'}
            </button>
            <AnimatePresence>
              {submitStatus === 'success' && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-sm text-emerald-400"
                >
                  {submitMessage}
                </motion.p>
              )}
              {submitStatus === 'error' && submitMessage && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-sm text-red-400"
                >
                  {submitMessage}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
