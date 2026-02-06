// Tombstone.tsx
// Displays a single death record as an interactive, expandable card.
// Features: Dynamic SVG noise, equip-based skill rendering, and HTML-to-Image export.

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import {
  Skull,
  User,
  Download,
  Flame,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Filter } from 'bad-words';
const filter = new Filter();
import type { DeathRecord } from '../types';
import skillsData from '../assets/Skills.json';
import defaultClassIcon from '../assets/icons/default_icon.png';

/** 
 * Pre-compute skill icon paths from JSON resource.
 * Optimization: Loading imports eagerly avoids async flickering during render.
 */
const skillIconMap = new Map<number, string>();
skillsData.Skills.forEach((skill) => {
  skillIconMap.set(skill.id, skill.icon);
});

const iconImages = import.meta.glob('../assets/icons/*.png', { eager: true, as: 'url' });

function getSkillIconSrc(skillId: number): string | undefined {
  const iconName = skillIconMap.get(skillId);
  return iconName ? iconImages[`../assets/icons/${iconName}.png`] : undefined;
}

/** Formats seconds into h/m string (e.g., "1h 30m"). */
function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return '0h';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Formats large numbers with suffixes (1.2k, 1.5M). */
function formatNumber(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '0';
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}

interface TombstoneProps {
  death: DeathRecord;
  mournedBy?: string | null;
  onUpdate?: () => void;
}

export default function Tombstone({ death, mournedBy, onUpdate }: TombstoneProps) {
  const tombstoneRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [respects, setRespects] = useState(death.respects_paid);
  const [respectLoading, setRespectLoading] = useState(false);
  const [hasPaidRespects, setHasPaidRespects] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRespects(death.respects_paid);
    checkRespectsStatus();
  }, [death.respects_paid, death.id]);

  // Scroll into view on expansion
  useEffect(() => {
    if (expanded && actionsRef.current) {
      const timer = setTimeout(() => {
        actionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [expanded]);


  async function checkRespectsStatus() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('death_respects')
      .select('id')
      .eq('death_id', death.id)
      .eq('user_id', user.id)
      .single();
    setHasPaidRespects(!!data);
  }

  const ClassIconSrc = defaultClassIcon;
  const damage = death.damage_taken != null ? Math.round(Number(death.damage_taken)) : 0;
  const careerSeconds = death.career_seconds != null ? Number(death.career_seconds) : 0;
  const careerRuns = death.career_runs ?? 0;
  const careerKills = death.career_kills ?? 0;
  const careerEliteKills = death.career_elite_kills ?? 0;
  const careerBosses = death.career_bosses ?? 0;
  const careerGold = death.career_gold != null ? Number(death.career_gold) : 0;
  const careerSoulstones = death.career_soulstones ?? 0;

  // Last Run Stats
  const lastRunKills = death.last_run_kills ?? 0;
  const lastRunDamageDealt = death.last_run_damage_dealt != null ? Math.round(Number(death.last_run_damage_dealt)) : 0;
  const lastRunEliteKills = death.last_run_elite_kills ?? 0;
  const lastRunBossKills = death.last_run_boss_kills ?? 0;
  const skillIds = death.skill_ids || [0, 0, 0];

  /** Resolves damage type ID to color class. */
  function getDamageColor(typeId: number | null | undefined): string {
    switch (typeId) {
      case 1: return 'text-orange-500'; // Fire
      case 2: return 'text-emerald-500'; // Plague
      case 3: return 'text-cyan-400';   // Lightning
      case 0:
      default: return 'text-red-500';   // Physical
    }
  }

  /** Resolves damage type ID to display label. */
  function getDamageLabel(typeId: number | null | undefined): string {
    switch (typeId) {
      case 1: return 'Fire';
      case 2: return 'Plague';
      case 3: return 'Lightning';
      case 0:
      default: return 'Physical';
    }
  }

  /** Handles the "Pay Respects" (Like) action. */
  async function handlePayRespects() {
    if (hasPaidRespects) return;
    setRespectLoading(true);
    const { error } = await supabase.rpc('pay_respects', { row_id: death.id });
    setRespectLoading(false);
    if (!error) {
      setHasPaidRespects(true);
      setRespects((n) => n + 1);
      onUpdate?.();
    }
  }

  /** Generates and downloads a high-res PNG of the card. */
  async function handleExport() {
    if (!tombstoneRef.current || exportLoading) return;
    setExportLoading(true);

    try {
      // Temporarily expand to show all details for the snapshot
      const wasExpanded = expanded;
      if (!wasExpanded) {
        setExpanded(true);
        await new Promise((resolve) => setTimeout(resolve, 800)); // Wait for animation
      }

      // Generate PNG with generous margins and explicit styling to avoid clipping
      const dataUrl = await toPng(tombstoneRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        style: {
          margin: '60px',
          padding: '0',
          borderColor: '#7f1d1d',
          borderWidth: '4px',
          borderStyle: 'solid',
          transform: 'scale(1)',
          height: 'auto',
          overflow: 'visible',
        },
        width: tombstoneRef.current.offsetWidth + 120,
        height: tombstoneRef.current.scrollHeight + 120
      });

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${death.character_name.replace(/[^a-z0-9]/gi, '_')}-tombstone.png`;
      a.click();

      setExportLoading(false);

      if (!wasExpanded) {
        setExpanded(false);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to generate image. Please try again.');
      setExportLoading(false);
    }
  }

  return (
    <div ref={containerRef} className="group relative flex flex-col items-center gap-4">
      <motion.article
        layout
        ref={tombstoneRef}
        className="relative w-full max-w-[300px] overflow-hidden rounded-2xl border-2 border-stone-800 bg-stone-900 shadow-2xl transition-all duration-500 will-change-transform bg-card-texture"
        onHoverStart={() => setExpanded(true)}
        onHoverEnd={() => setExpanded(false)}
        onClick={() => setExpanded(!expanded)}
        onLayoutAnimationComplete={() => {
          // Scroll handled by useEffect to avoid race conditions
        }}
        initial={false}
        animate={{
          height: expanded ? 'auto' : '480px',
          borderColor: expanded ? '#7f1d1d' : '#292524',
          boxShadow: expanded ? '0 0 40px rgba(185, 28, 28, 0.4)' : '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          y: expanded ? -8 : 0
        }}
        style={{
          backgroundAttachment: 'local',
        }}
      >
        <div className="flex flex-col items-center p-6 text-center">

          {/* Animated Skull Header */}
          <div className="mb-4">
            <div className="relative">
              {/* Glow Effect (Radial Gradient) */}
              <div
                className="absolute inset-0 rounded-full transition-opacity duration-500"
                style={{
                  background: 'radial-gradient(circle, rgba(220, 38, 38, 0.6) 0%, transparent 70%)',
                  opacity: expanded ? 0.6 : 0.2,
                  transform: 'scale(1.5)',
                }}
              />
              <Skull
                className="relative h-16 w-16 transition-colors duration-300"
                style={{ color: '#ef4444' }}
                aria-hidden
              />
            </div>
          </div>

          <div className="mb-6">
            <h3 className={`font-cinzel font-bold tracking-wider text-stone-100} whitespace-nowrap overflow-hidden text-ellipsis px-1`}>
              {death.character_name}
            </h3>
            <p className="font-cinzel font-bold uppercase tracking-[0.2em] text-red-700/80">
              R.I.P
            </p>
          </div>

          {/* Static Class Icon */}
          <div className="mb-6 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-stone-700 bg-stone-800/50 text-red-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] overflow-hidden">
              <img src={ClassIconSrc} alt="Class Icon" className="h-full w-full object-cover" />
            </div>
          </div>

          <div className="mb-4 space-y-1 text-sm font-medium text-stone-400">
            <p className="text-stone-500">
              Lvl <span className="text-stone-200">{death.level}</span>
            </p>
            <p className="text-sm font-semibold text-stone-400 pb-0.5">
              Slain by <span className={`${getDamageColor(death.last_run_damage_type)} text-sm`}>
                {formatNumber(damage)} {getDamageLabel(death.last_run_damage_type)}
              </span> Dmg
            </p>
            {/* Damage Dealt - Conditional Display */}
            {lastRunDamageDealt > 0 && (
              <p className="text-xs text-stone-500 pb-1">
                Dealt <span className="text-stone-400">{formatNumber(lastRunDamageDealt)}</span> Dmg
              </p>
            )}
            <div className={`flex justify-center gap-2 text-xs text-stone-500 ${lastRunDamageDealt === 0 ? 'pt-1' : ''}`}>
              <span><span className="text-stone-300">{formatNumber(lastRunKills)}</span> Kills</span>
              <span>·</span>
              <span><span className="text-orange-600">{formatNumber(lastRunEliteKills)}</span> Elites</span>
              <span>·</span>
              <span><span className="text-amber-600">{formatNumber(lastRunBossKills)}</span> Bosses</span>
            </div>
            <p className="text-xs text-stone-500 pt-1">
              {formatDuration(death.last_run_duration)}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-stone-400 pt-2 font-semibold">
              {respects} Respects Paid
            </p>
          </div>

          {/* Equipped Skills */}
          <div className="mb-2 flex justify-center gap-2 border-t border-stone-500/50 pt-3 w-full min-h-[50px]">
            {skillIds.length === 0 && <span className="text-[10px] text-stone-600 italic py-2">No skills equipped</span>}
            {skillIds.map((skillId, idx) => {
              const iconSrc = getSkillIconSrc(skillId);
              return (
                <div
                  key={idx}
                  className="flex h-10 w-10 items-center justify-center rounded border border-stone-700 bg-stone-800 text-xs font-bold text-stone-500 shadow-sm overflow-hidden"
                  title={`Skill ${skillId || 'Empty'}`}
                >
                  {iconSrc ? (
                    <img src={iconSrc} alt={`Skill ${skillId}`} className="h-full w-full object-cover" />
                  ) : (
                    <span className="opacity-20 text-[10px]">{skillId > 0 ? '?' : '—'}</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Expanded Career Stats (Hidden unless expanded) */}
          <motion.div
            className="w-full overflow-hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: expanded ? 1 : 0, height: expanded ? 'auto' : 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mt-2 border-t border-stone-500/50 pt-2 text-left text-xs space-y-2 text-stone-400">
              <p className="text-[10px] text-center uppercase tracking-widest text-stone-400 pt-2 font-semibold">Career Totals</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <span>Soulstones:</span> <span className="text-right text-fuchsia-500/90">{formatNumber(careerSoulstones)}</span>
                <span>Gold:</span> <span className="text-right text-amber-500/90">{formatNumber(careerGold)}</span>
                <span>Kills:</span> <span className="text-right text-rose-500/90">{formatNumber(careerKills)}</span>
                <span>Elites:</span> <span className="text-right text-orange-600/90">{formatNumber(careerEliteKills)}</span>
                <span>Bosses:</span> <span className="text-right text-amber-600/90">{formatNumber(careerBosses)}</span>
                <span>Runs:</span> <span className="text-right text-stone-300">{careerRuns}</span>
                <span>Playtime:</span> <span className="text-right text-emerald-600/90">{formatDuration(careerSeconds)}</span>
              </div>

              {mournedBy != null && mournedBy !== '' && (
                <div className="flex items-center justify-center gap-1.5 pt-4 text-stone-400">
                  <User className="h-3 w-3" aria-hidden />
                  <span>Mourned by <span className="text-stone-300">{filter.clean(mournedBy)}</span></span>
                </div>
              )}
            </div>
          </motion.div>

        </div>
      </motion.article>

      {/* External Actions (Candle & Download) */}
      <div ref={actionsRef} className="flex items-center gap-4">
        {/* Candle (Pay Respects) */}
        <button
          onClick={handlePayRespects}
          disabled={respectLoading || hasPaidRespects}
          className="group/candle relative flex flex-col items-center gap-1 disabled:opacity-80 disabled:cursor-not-allowed"
          title="Light a candle to pay respects"
        >
          <div className={`relative flex h-10 w-10 items-center justify-center rounded-full border bg-stone-950 shadow-lg ring-1 ring-stone-900 transition-all duration-500 ${hasPaidRespects ? 'border-orange-900/50 bg-orange-950/20 shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'border-stone-700 hover:border-stone-500 hover:bg-stone-900'}`}>
            <Flame
              className={`h-5 w-5 transition-all duration-500 ${hasPaidRespects ? 'fill-orange-500 text-orange-500 animate-pulse' : 'text-stone-600 group-hover/candle:text-stone-400'}`}
            />
          </div>
        </button>

        {/* Download */}
        <button
          onClick={handleExport}
          disabled={exportLoading}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 bg-stone-950 shadow-md transition-colors hover:border-stone-500 hover:text-stone-300 disabled:opacity-50"
          title="Download Epitaph"
        >
          <Download className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
