'use client';

/**
 * /n/[code] — public game night page. This is where a creator's link lands.
 *
 * Shows the game, time, host, spots left, vibe, and notes. Join form takes
 * a name/handle + phone and writes an RSVP. No app, no account — the phone
 * number is the identity (normalized digits-only server-side).
 *
 * Copy rule: belonging-first, fun-first. The promise must be legible here:
 * you matter, come play.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import GameArt from '@/components/GameArt';

interface RsvpName {
  id: string;
  name: string;
}

interface HostStats {
  nightsHosted: number;
  playersBroughtTogether: number;
  foundingHost: boolean;
}

interface NightData {
  night: {
    id: string;
    hostName: string;
    game: string;
    scheduledAt: string;
    squadSize: number;
    vibe?: string;
    notes?: string;
    code: string;
    status: string;
  };
  rsvpCount: number;
  spotsLeft: number;
  rsvps: RsvpName[];
  hostStats?: HostStats;
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function NightPage() {
  const params = useParams();
  const code = typeof params.code === 'string' ? params.code : '';

  const [data, setData] = useState<NightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [joinState, setJoinState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    if (!code) {
      setLoading(false);
      setLoadError('No night code in the URL.');
      return;
    }
    fetch(`/api/nights/${encodeURIComponent(code)}`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error((json && (json.error || json.message)) || 'Night not found');
        setData(json);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Could not load this game night');
      })
      .finally(() => setLoading(false));
  }, [code]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (joinState === 'sending') return;
    setJoinState('sending');
    setJoinError('');
    try {
      const res = await fetch(`/api/nights/${encodeURIComponent(code)}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error((json && (json.error || json.message)) || `Request failed (${res.status})`);
      setJoinState('done');
      // Refresh the seat count behind the confirmation.
      setData((d) =>
        d ? { ...d, rsvpCount: d.rsvpCount + (json.already ? 0 : 1), spotsLeft: Math.max(0, d.spotsLeft - (json.already ? 0 : 1)) } : d,
      );
    } catch (err) {
      setJoinState('error');
      setJoinError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  const canJoin = name.trim() && phone.trim() && joinState !== 'sending';

  return (
    <main className="mx-auto max-w-2xl px-5 pb-24">
      <nav className="flex items-center justify-between py-6">
        <Link href="/" className="display text-2xl text-montu-lime">montu</Link>
        <Link href="/" className="text-sm font-semibold text-montu-ink-2 hover:text-montu-ink">
          Find my squad
        </Link>
      </nav>

      {loading ? (
        <div className="card rounded-card p-10 text-center shadow-card">
          <div className="display mb-3 animate-pulse text-4xl">🌙</div>
          <p className="text-montu-ink-2">Finding your game night...</p>
        </div>
      ) : loadError || !data ? (
        <div className="card rounded-card p-10 text-center shadow-card">
          <div className="display mb-3 text-4xl">🕹️</div>
          <h1 className="display text-3xl text-montu-ink">No night here</h1>
          <p className="mx-auto mt-3 max-w-sm text-montu-ink-2">
            {loadError ?? 'This link does not point to a game night.'} Check the link and try again.
          </p>
          <Link
            href="/"
            className="btn-play mt-6 inline-block rounded-button bg-montu-lime px-6 py-3 font-bold text-montu-bg"
          >
            Find a squad instead
          </Link>
        </div>
      ) : (
        <>
          {/* Night header */}
          <section className="card overflow-hidden rounded-card shadow-card">
            <GameArt game={data.night.game} className="h-48 w-full sm:h-64" />
            <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-montu-line bg-montu-surface-2 px-3 py-1 text-xs font-bold uppercase tracking-wider text-montu-ink-2">
                Game night
              </span>
              {data.night.vibe && (
                <span className="rounded-full border border-montu-line bg-montu-surface-2 px-3 py-1 text-xs font-bold uppercase tracking-wider text-montu-ink-2">
                  {data.night.vibe}
                </span>
              )}
              {data.hostStats?.foundingHost && (
                <span className="rounded-full bg-montu-pink px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                  Founding host
                </span>
              )}
            </div>
            <h1 className="display mt-3 text-4xl text-montu-ink sm:text-5xl">
              {data.night.game}
              <br />
              <span className="text-montu-lime">with {data.night.hostName}</span>
            </h1>
            {data.hostStats && data.hostStats.nightsHosted > 0 && (
              <p className="mt-2 text-sm text-montu-ink-2">
                {data.hostStats.nightsHosted} {data.hostStats.nightsHosted === 1 ? 'night' : 'nights'} hosted
                {' · '}
                {data.hostStats.playersBroughtTogether} {data.hostStats.playersBroughtTogether === 1 ? 'player' : 'players'} brought together
              </p>
            )}
            <p className="mt-3 text-lg font-semibold text-montu-ink">{formatWhen(data.night.scheduledAt)}</p>
            {data.night.notes && <p className="mt-2 text-montu-ink-2">{data.night.notes}</p>}

            <div className="mt-5 flex items-center gap-3">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-montu-surface-2">
                <div
                  className="h-full rounded-full bg-montu-lime transition-all"
                  style={{ width: `${Math.min(100, (data.rsvpCount / data.night.squadSize) * 100)}%` }}
                />
              </div>
              <span className="text-sm font-bold text-montu-ink">
                {data.spotsLeft > 0 ? `${data.spotsLeft} ${data.spotsLeft === 1 ? 'spot' : 'spots'} left` : 'Full house'}
              </span>
            </div>
            </div>
          </section>

          {/* Who is in */}
          {data.rsvps.length > 0 && (
            <section className="card mt-4 rounded-card p-6 shadow-card sm:p-8">
              <h2 className="display text-2xl text-montu-ink">Already in</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.rsvps.map((r) => (
                  <span
                    key={r.id}
                    className="flex items-center gap-2 rounded-full border border-montu-line bg-montu-bg px-4 py-2 text-sm font-semibold text-montu-ink"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-montu-violet text-xs font-bold text-white">
                      {r.name.charAt(0).toUpperCase()}
                    </span>
                    {r.name}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm text-montu-ink-2">
                These are your people for the night. There is a seat with your name on it.
              </p>
            </section>
          )}

          {/* Join */}
          <section className="card mt-4 rounded-card p-6 shadow-card sm:p-8">
            {joinState === 'done' ? (
              <div className="py-6 text-center">
                <div className="display mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-montu-lime text-3xl text-montu-bg">
                  ✓
                </div>
                <h2 className="display text-3xl text-montu-ink">You are on the list.</h2>
                <p className="mx-auto mt-3 max-w-sm text-montu-ink-2">
                  We will text you your squad. When game time hits, show up and play — your seat is saved.
                </p>
              </div>
            ) : (
              <>
                <h2 className="display text-3xl text-montu-ink">Claim your seat</h2>
                <p className="mt-2 text-sm text-montu-ink-2">
                  Takes 30 seconds. No app, no account, no begging in the group chat. Just a name and a number, and we text you when your squad is ready.
                </p>
                <form onSubmit={handleJoin} className="mt-6 space-y-4">
                  <div>
                    <label htmlFor="j-name" className="mb-1.5 block text-sm font-semibold text-montu-ink">
                      Name or handle
                    </label>
                    <input
                      id="j-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="What should the squad call you?"
                      className="w-full rounded-button border border-montu-line bg-montu-bg px-4 py-3 text-montu-ink placeholder:text-montu-ink-3 focus:border-montu-lime focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="j-phone" className="mb-1.5 block text-sm font-semibold text-montu-ink">
                      Phone number
                    </label>
                    <input
                      id="j-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Where we text your squad"
                      className="w-full rounded-button border border-montu-line bg-montu-bg px-4 py-3 text-montu-ink placeholder:text-montu-ink-3 focus:border-montu-lime focus:outline-none"
                    />
                  </div>
                  {joinState === 'error' && (
                    <div className="rounded-button border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {joinError}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={!canJoin}
                    className="btn-play display w-full rounded-button bg-montu-lime px-6 py-4 text-xl text-montu-bg disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {joinState === 'sending' ? 'Saving your seat...' : 'I want in'}
                  </button>
                </form>
              </>
            )}
          </section>
        </>
      )}
    </main>
  );
}
