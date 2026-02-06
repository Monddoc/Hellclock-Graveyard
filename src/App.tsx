// App.tsx
// Main Application Entry Point.
// Handles user authentication, database syncing, and the primary "Graveyard" view.

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Skull, LogIn, LogOut, Search } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import type { DeathRecord } from './types';
import UploadCrypt from './components/UploadCrypt';
import Tombstone from './components/Tombstone';
import FogLayer from './components/FogLayer';
import AtmosphericLighting from './components/AtmosphericLighting';
import { Lightbulb, LightbulbOff } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [deaths, setDeaths] = useState<DeathRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLighting, setShowLighting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sortOption, setSortOption] = useState<'latest' | 'respects' | 'playtime_high' | 'playtime_low' | 'kills'>('latest');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDeaths = deaths.filter((death) => {
    const term = searchTerm.toLowerCase();
    const charName = death.character_name.toLowerCase();
    const mourned = (death.mourned_by || '').toLowerCase();
    return charName.includes(term) || mourned.includes(term);
  });

  const sortedDeaths = [...filteredDeaths].sort((a, b) => {
    switch (sortOption) {
      case 'respects':
        return (b.respects_paid || 0) - (a.respects_paid || 0);
      case 'playtime_high':
        return (b.career_seconds || 0) - (a.career_seconds || 0);
      case 'playtime_low': // Speedruns / Quick deaths
        return (a.career_seconds || 0) - (b.career_seconds || 0);
      case 'kills':
        return (b.career_kills || 0) - (a.career_kills || 0);
      case 'latest':
      default:
        return new Date(b.death_date).getTime() - new Date(a.death_date).getTime();
    }
  });

  async function fetchDeaths() {
    const { data, error: err } = await supabase
      .from('deaths')
      .select('*')
      .order('death_date', { ascending: false });

    if (err) {
      setError(err.message);
      setDeaths([]);
    } else {
      setDeaths((data as DeathRecord[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    // Initial session check
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthLoading(false);
    });

    // Subscribe to auth state changes (login/logout/token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    fetchDeaths();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const [showUpload, setShowUpload] = useState(false);

  /**
   * Determines the OAuth redirect URL based on environment.
   * Dynamically handles localhost operations to support variable Vite ports.
   */
  const getRedirectUrl = () => {
    if (import.meta.env.DEV) {
      return `${window.location.origin}/Hellclock-Graveyard/`;
    }
    return 'https://monddoc.github.io/Hellclock-Graveyard/';
  };

  async function handleDiscordLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: getRedirectUrl(),
      },
    });
    if (error) {
      console.error('Discord login error:', error);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="relative min-h-screen font-sans text-stone-200">
      <div className="noise-overlay" />
      <FogLayer />
      {showLighting && <AtmosphericLighting />}

      <header className="relative z-20 border-b border-stone-800 bg-stone-900/50 backdrop-blur-md">
        <div className="relative mx-auto flex max-w-6xl items-center px-6 py-6">
          {/* Logo Section - Absolute Center */}
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-3">
            <Skull className="h-8 w-8 text-red-600" aria-hidden />
            <h1 className="font-cinzel text-2xl font-bold tracking-wide text-stone-100 md:text-3xl">
              The Graveyard
            </h1>
          </div>

          {/* User Section */}
          <div className="relative z-10 ml-auto flex items-center gap-3">
            {!authLoading && (
              <>
                {user ? (
                  <>
                    <span className="hidden text-sm text-stone-400 sm:inline">
                      {user.user_metadata?.full_name || user.email || 'User'}
                    </span>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-800 px-4 py-2 text-sm font-medium text-stone-300 transition hover:bg-stone-700 hover:text-stone-100"
                    >
                      <LogOut className="h-4 w-4" aria-hidden />
                      <span className="hidden sm:inline">Logout</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleDiscordLogin}
                    className="flex items-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4752C4]"
                  >
                    <LogIn className="h-4 w-4" aria-hidden />
                    <span className="hidden sm:inline">Login</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-20 mx-auto max-w-6xl px-6 py-10">

        {/* CONTROL DECK */}
        <section className="mb-8 flex flex-col items-center justify-center gap-6">

          {/* Main Toggles */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {/* Upload Toggle */}
            <button
              onClick={() => setShowUpload(!showUpload)}
              className={`flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium transition-all
                  ${showUpload
                  ? 'border-red-500/50 bg-red-900/20 text-red-200'
                  : 'border-stone-700 bg-stone-800/50 text-stone-400 hover:border-stone-500 hover:text-stone-200'
                }`}
            >
              <span className="text-xl">⚰️</span>
              <span>{showUpload ? 'Close Crypt' : 'Bury a Hero'}</span>
            </button>

            {/* Lights Toggle */}
            <button
              onClick={() => {
                setShowLighting(!showLighting);
              }}
              className={`flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium transition-all
                ${showLighting
                  ? 'border-amber-500/50 bg-amber-900/20 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'border-stone-700 bg-stone-800/50 text-stone-400 hover:border-stone-500 hover:text-stone-200'
                }`}
            >
              {showLighting ? <Lightbulb className="h-4 w-4 text-amber-400" /> : <LightbulbOff className="h-4 w-4" />}
              <span>{showLighting ? 'Lights On' : 'Lights Off'}</span>
            </button>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { id: 'latest', label: 'Latest Deaths' },
              { id: 'respects', label: 'Most Respects' },
              { id: 'kills', label: 'Most Kills' },
              { id: 'playtime_high', label: 'Longest Life' },
              { id: 'playtime_low', label: 'Shortest Life' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSortOption(opt.id as any)}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all
                  ${sortOption === opt.id
                    ? 'border-red-900 bg-red-900/40 text-red-200'
                    : 'border-stone-800 bg-stone-900/40 text-stone-500 hover:border-stone-600 hover:text-stone-300'
                  }`}
              >
                {opt.label}
              </button>

            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-stone-500" />
            </div>
            <input
              type="text"
              placeholder="Search by Character Name or User..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-full border border-stone-800 bg-stone-900/50 py-2 pl-10 pr-4 text-sm text-stone-200 placeholder-stone-600 focus:border-red-900 focus:ring-1 focus:ring-red-900 focus:outline-none"
            />
          </div>
        </section>

        {/* Collapsible Upload Section */}
        {showUpload && user && (
          <motion.section
            initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-12"
          >
            <UploadCrypt onUploadSuccess={() => { fetchDeaths(); setShowUpload(false); }} />
          </motion.section>
        )}

        {!user && showUpload && (
          <div className="mb-12 rounded-xl border border-stone-800 bg-stone-900/50 p-6 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
              <LogIn className="h-12 w-12 text-stone-600" aria-hidden />
              <p className="text-stone-400">Please log in with Discord to upload a save file.</p>
              <button
                type="button"
                onClick={handleDiscordLogin}
                className="flex items-center gap-2 rounded-lg bg-[#5865F2] px-6 py-3 font-medium text-white transition hover:bg-[#4752C4]"
              >
                <LogIn className="h-5 w-5" aria-hidden />
                Login with Discord
              </button>
            </div>
          </div>
        )}

        <section>
          <h2 className="font-cinzel mb-8 text-center text-xl font-semibold tracking-widest text-stone-300 uppercase decoration-stone-800 underline-offset-8">
            Fallen Heroes
          </h2>

          {loading && (
            <p className="text-zinc-500">Loading the dead…</p>
          )}
          {error && (
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-red-400">
                Failed to load graveyard: {error}. Check connection.
              </p>
              <button
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  fetchDeaths();
                }}
                className="rounded-full border border-red-900 bg-red-950/30 px-6 py-2 text-sm text-red-300 transition hover:bg-red-900/50"
              >
                Try Again
              </button>
            </div>
          )}
          {!loading && !error && deaths.length === 0 && (
            <p className="text-zinc-500">No souls yet. Upload a PlayerSave.json to lay the first to rest.</p>
          )}

          {!loading && deaths.length > 0 && (
            <motion.ul
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
              initial="hidden"
              animate="visible"
              variants={{
                visible: { transition: { staggerChildren: 0.06 } },
                hidden: {},
              }}
            >
              {sortedDeaths.map((death) => (
                <motion.li
                  key={death.id}
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0 },
                  }}
                >
                  <Tombstone death={death} mournedBy={death.mourned_by} onUpdate={fetchDeaths} />
                </motion.li>
              ))}
            </motion.ul>
          )}
        </section>
      </main>
    </div>
  );
}
