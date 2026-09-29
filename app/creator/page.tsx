'use client';

/**
 * Creator host page.
 *
 * Pitch for gaming creators to host game nights on Montu, plus an interest
 * form that writes to the Firestore collection `creator_interests` via the
 * client SDK: {name, handle, email, audienceSize, game, createdAt}.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';

interface HostStats {
  nightsHosted: number;
  playersBroughtTogether: number;
  foundingHost: boolean;
}

export default function CreatorPage() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [audienceSize, setAudienceSize] = useState('');
  const [game, setGame] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [hostStats, setHostStats] = useState<HostStats | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    fetch(`/api/nights?hostId=${encodeURIComponent(user.uid)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.stats) setHostStats(data.stats as HostStats);
      })
      .catch(() => {});
  }, [user?.uid]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setErrorMsg('');
    try {
      const db = getDb();
      await addDoc(collection(db, 'creator_interests'), {
        name: name.trim(),
        handle: handle.trim(),
        email: email.trim(),
        audienceSize: audienceSize.trim(),
        game: game.trim(),
        createdAt: serverTimestamp(),
      });
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  const canSubmit = name.trim() && handle.trim() && email.trim();

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24">
      <nav className="flex items-center justify-between py-6">
        <Link href="/" className="display text-2xl text-montu-lime">montu</Link>
        <Link href="/" className="text-sm font-semibold text-montu-ink-2 hover:text-montu-ink">
          For players
        </Link>
      </nav>

      {/* Pitch */}
      <section className="pt-6 text-center sm:pt-10">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-montu-line bg-montu-surface px-4 py-1.5 text-xs font-semibold text-montu-ink-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-montu-pink" />
          Creator game nights, powered by Montu
        </div>
        <h1 className="display text-5xl text-montu-ink sm:text-6xl">
          Host the game night.
          <br />
          <span className="text-montu-pink">Your fans play with you.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-montu-ink-2">
          Stop shouting into a chat full of lurkers. You set the game and the night, we match your community into real squads and fill every lobby.
        </p>
        <p className="mx-auto mt-3 max-w-xl text-base font-semibold text-montu-pink">
          You bring the game. We bring the players.
        </p>
      </section>

      {/* Signed-in host's own stats */}
      {hostStats && hostStats.nightsHosted > 0 && (
        <section className="card mt-8 rounded-card border-montu-pink/40 p-6 text-center shadow-card">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {hostStats.foundingHost && (
              <span className="rounded-full bg-montu-pink px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                Founding host
              </span>
            )}
            <span className="text-sm font-semibold text-montu-ink-2">
              {hostStats.nightsHosted} {hostStats.nightsHosted === 1 ? 'night' : 'nights'} hosted
              {' · '}
              {hostStats.playersBroughtTogether} {hostStats.playersBroughtTogether === 1 ? 'player' : 'players'} brought together
            </span>
          </div>
          <Link href="/creator/nights/new" className="mt-4 inline-block text-sm font-bold text-montu-pink hover:underline">
            Host another night →
          </Link>
        </section>
      )}

      <section className="mt-12 grid gap-3 sm:grid-cols-3">
        {[
          { title: 'You host', text: 'Pick your game, your night, your rules. It is your lobby.' },
          { title: 'We fill it', text: 'Montu matches your fans into squads that fit your vibe.' },
          { title: 'Everyone plays', text: 'No dead lobbies, no begging in chat. Just game night.' },
        ].map((s) => (
          <div key={s.title} className="card rounded-card p-5 shadow-card">
            <div className="font-bold text-montu-ink">{s.title}</div>
            <div className="mt-1 text-sm text-montu-ink-2">{s.text}</div>
          </div>
        ))}
      </section>

      {/* Founding hosts */}
      <section className="card mt-6 rounded-card border-montu-pink/40 p-6 shadow-card sm:p-8">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-montu-pink px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
            Founding host
          </span>
          <h2 className="display text-2xl text-montu-ink">First 25 hosts, forever</h2>
        </div>
        <p className="mx-auto mt-3 max-w-md text-montu-ink-2">
          The first 25 hosts get a permanent Founding host badge on every game night, and first dibs when paid nights turn on. No money to promise yet — we promise players instead.
        </p>
      </section>

      <section className="card mt-6 rounded-card p-6 text-center shadow-card sm:p-8">
        <h2 className="display text-3xl text-montu-ink">Make tonight&apos;s game night</h2>
        <p className="mx-auto mt-2 max-w-md text-montu-ink-2">
          Pick your game and time, get one link to share. Your community taps in — no app, no account.
        </p>
        <Link
          href="/creator/nights/new"
          className="btn-play display mt-5 inline-block rounded-button bg-montu-pink px-8 py-4 text-xl text-montu-bg"
        >
          Create a game night
        </Link>
      </section>

      {/* Interest form */}
      <section className="card mt-10 rounded-card p-6 shadow-card sm:p-8">
        {status === 'done' ? (
          <div className="py-10 text-center">
            <div className="display mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-montu-pink text-3xl text-montu-bg">
              ✓
            </div>
            <h2 className="display text-3xl text-montu-ink">We will be in touch</h2>
            <p className="mx-auto mt-3 max-w-sm text-montu-ink-2">
              Your host spot is on our radar. Watch your inbox for the game plan.
            </p>
          </div>
        ) : (
          <>
            <h2 className="display text-3xl text-montu-ink">Become a host</h2>
            <p className="mt-2 text-sm text-montu-ink-2">
              Tell us where you stream and we will reach out with the details.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="c-name" className="mb-1.5 block text-sm font-semibold text-montu-ink">
                  Name
                </label>
                <input
                  id="c-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-button border border-montu-line bg-montu-bg px-4 py-3 text-montu-ink placeholder:text-montu-ink-3 focus:border-montu-pink focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="c-handle" className="mb-1.5 block text-sm font-semibold text-montu-ink">
                  Handle
                </label>
                <input
                  id="c-handle"
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@yourhandle (Twitch, YouTube, TikTok...)"
                  className="w-full rounded-button border border-montu-line bg-montu-bg px-4 py-3 text-montu-ink placeholder:text-montu-ink-3 focus:border-montu-pink focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="c-email" className="mb-1.5 block text-sm font-semibold text-montu-ink">
                  Email
                </label>
                <input
                  id="c-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-button border border-montu-line bg-montu-bg px-4 py-3 text-montu-ink placeholder:text-montu-ink-3 focus:border-montu-pink focus:outline-none"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="c-audience" className="mb-1.5 block text-sm font-semibold text-montu-ink">
                    Audience size <span className="font-normal text-montu-ink-3">(optional)</span>
                  </label>
                  <input
                    id="c-audience"
                    type="text"
                    value={audienceSize}
                    onChange={(e) => setAudienceSize(e.target.value)}
                    placeholder="e.g. 50K followers"
                    className="w-full rounded-button border border-montu-line bg-montu-bg px-4 py-3 text-montu-ink placeholder:text-montu-ink-3 focus:border-montu-pink focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="c-game" className="mb-1.5 block text-sm font-semibold text-montu-ink">
                    Your game <span className="font-normal text-montu-ink-3">(optional)</span>
                  </label>
                  <input
                    id="c-game"
                    type="text"
                    value={game}
                    onChange={(e) => setGame(e.target.value)}
                    placeholder="e.g. Valorant"
                    className="w-full rounded-button border border-montu-line bg-montu-bg px-4 py-3 text-montu-ink placeholder:text-montu-ink-3 focus:border-montu-pink focus:outline-none"
                  />
                </div>
              </div>

              {status === 'error' && (
                <div className="rounded-button border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  Could not send that just now: {errorMsg}. Try again in a moment.
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit || status === 'sending'}
                className="btn-play display w-full rounded-button bg-montu-pink px-6 py-4 text-xl text-montu-bg disabled:cursor-not-allowed disabled:opacity-40"
              >
                {status === 'sending' ? 'Saving your spot...' : 'I want to host'}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
