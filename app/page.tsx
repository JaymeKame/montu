'use client';

/**
 * Montu landing + intake.
 *
 * Hero in Montu's play-first voice. The intake form posts JSON to
 * /api/intentions (built by another stream) and renders a confirmation
 * state on success. Copy rule: fun-first language only, no duty talk.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

type Vibe = 'chill' | 'casual' | 'competitive';

const VIBES: { value: Vibe; label: string; blurb: string }[] = [
  { value: 'chill', label: 'Chill', blurb: 'Good vibes, low stakes' },
  { value: 'casual', label: 'Casual', blurb: 'Fun first, a little spicy' },
  { value: 'competitive', label: 'Competitive', blurb: 'We play to win' },
];

const POPULAR_GAMES = ['Valorant', 'League of Legends', 'Rocket League', 'Apex Legends', 'Minecraft', 'Fortnite'];

export default function HomePage() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [game, setGame] = useState('');
  const [when, setWhen] = useState('');
  const [vibe, setVibe] = useState<Vibe>('casual');
  const [roles, setRoles] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setErrorMsg('');
    try {
      const res = await fetch('/api/intentions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.uid ?? null, name, game, when, vibe, roles, phone }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data && (data.error || data.message)) || `Request failed (${res.status})`);
      }
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  const canSubmit = name.trim() && game.trim() && when.trim() && phone.trim();

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24">
      {/* Nav */}
      <nav className="flex items-center justify-between py-6">
        <span className="display text-2xl text-montu-lime">montu</span>
        <Link href="/creator" className="text-sm font-semibold text-montu-ink-2 hover:text-montu-ink">
          Host game nights
        </Link>
      </nav>

      {/* Hero */}
      <section className="pt-6 text-center sm:pt-12">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-montu-line bg-montu-surface px-4 py-1.5 text-xs font-semibold text-montu-ink-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-montu-lime" />
          Nobody plays alone here
        </div>
        <h1 className="display text-5xl text-montu-ink sm:text-7xl">
          You matter.
          <br />
          <span className="text-montu-lime">Come play.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-montu-ink-2">
          The world tries to tell you you are nothing. We believe you are family. Montu is AI that finds your people and gets you into the game together, exceptionally well, every time.
        </p>
      </section>

      {/* How it works */}
      <section className="mt-12 grid gap-3 sm:grid-cols-3">
        {[
          { step: '1', title: 'Say the word', text: 'Drop your game, your vibe, and when you are free.' },
          { step: '2', title: 'Meet your people', text: 'We find the humans you will love playing with.' },
          { step: '3', title: 'Play', text: 'Get the text, jump in, have a great night.' },
        ].map((s) => (
          <div key={s.step} className="card rounded-card p-5 shadow-card">
            <div className="display mb-2 text-2xl text-montu-violet">{s.step}</div>
            <div className="font-bold text-montu-ink">{s.title}</div>
            <div className="mt-1 text-sm text-montu-ink-2">{s.text}</div>
          </div>
        ))}
      </section>

      {/* Intake form */}
      <section className="card mt-10 rounded-card p-6 shadow-card sm:p-8" id="intake">
        {status === 'done' ? (
          <div className="py-10 text-center">
            <div className="display mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-montu-lime text-3xl text-montu-bg">
              ✓
            </div>
            <h2 className="display text-3xl text-montu-ink">You are in!</h2>
            <p className="mx-auto mt-3 max-w-sm text-montu-ink-2">
              Your people are being found. We will text you the moment your squad is ready.
            </p>
            <button
              type="button"
              onClick={() => setStatus('idle')}
              className="mt-6 text-sm font-semibold text-montu-lime hover:underline"
            >
              Add another game night
            </button>
          </div>
        ) : (
          <>
            <h2 className="display text-3xl text-montu-ink">Find my squad</h2>
            <p className="mt-2 text-sm text-montu-ink-2">
              Takes 30 seconds. We do the matchmaking, you just play.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-montu-ink">
                  Name or handle
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. jayme or clutchqueen"
                  className="w-full rounded-button border border-montu-line bg-montu-bg px-4 py-3 text-montu-ink placeholder:text-montu-ink-3 focus:border-montu-lime focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="game" className="mb-1.5 block text-sm font-semibold text-montu-ink">
                  Game
                </label>
                <input
                  id="game"
                  type="text"
                  value={game}
                  onChange={(e) => setGame(e.target.value)}
                  placeholder="What do you want to play?"
                  className="w-full rounded-button border border-montu-line bg-montu-bg px-4 py-3 text-montu-ink placeholder:text-montu-ink-3 focus:border-montu-lime focus:outline-none"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {POPULAR_GAMES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGame(g)}
                      className="rounded-full border border-montu-line bg-montu-surface-2 px-3 py-1 text-xs font-semibold text-montu-ink-2 hover:border-montu-violet hover:text-montu-ink"
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="when" className="mb-1.5 block text-sm font-semibold text-montu-ink">
                  When
                </label>
                <input
                  id="when"
                  type="text"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                  placeholder="e.g. Friday night, after 8pm"
                  className="w-full rounded-button border border-montu-line bg-montu-bg px-4 py-3 text-montu-ink placeholder:text-montu-ink-3 focus:border-montu-lime focus:outline-none"
                />
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-semibold text-montu-ink">Vibe</span>
                <div className="grid grid-cols-3 gap-2">
                  {VIBES.map((v) => (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => setVibe(v.value)}
                      className={`rounded-button border px-3 py-3 text-left transition ${
                        vibe === v.value
                          ? 'border-montu-lime bg-montu-lime/10 shadow-glow'
                          : 'border-montu-line bg-montu-bg hover:border-montu-violet'
                      }`}
                    >
                      <div className="text-sm font-bold text-montu-ink">{v.label}</div>
                      <div className="mt-0.5 text-[11px] leading-tight text-montu-ink-2">{v.blurb}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="roles" className="mb-1.5 block text-sm font-semibold text-montu-ink">
                  Roles <span className="font-normal text-montu-ink-3">(optional)</span>
                </label>
                <input
                  id="roles"
                  type="text"
                  value={roles}
                  onChange={(e) => setRoles(e.target.value)}
                  placeholder="e.g. I main support, happy to fill"
                  className="w-full rounded-button border border-montu-line bg-montu-bg px-4 py-3 text-montu-ink placeholder:text-montu-ink-3 focus:border-montu-lime focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold text-montu-ink">
                  Phone number
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="For SMS updates when your squad is ready"
                  className="w-full rounded-button border border-montu-line bg-montu-bg px-4 py-3 text-montu-ink placeholder:text-montu-ink-3 focus:border-montu-lime focus:outline-none"
                />
                <p className="mt-1.5 text-xs text-montu-ink-3">
                  One text when your squad is ready, one before game night. No spam, ever.
                </p>
              </div>

              {status === 'error' && (
                <div className="rounded-button border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  Could not send that just now: {errorMsg}. Try again in a moment.
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit || status === 'sending'}
                className="btn-play display w-full rounded-button bg-montu-lime px-6 py-4 text-xl text-montu-bg disabled:cursor-not-allowed disabled:opacity-40"
              >
                {status === 'sending' ? 'Finding players...' : 'Find my squad'}
              </button>
              <p className="text-center text-xs text-montu-ink-3">
                Free while we are in beta. No app to install.
              </p>
            </form>
          </>
        )}
      </section>

      <footer className="mt-16 text-center text-xs text-montu-ink-3">
        <span className="display text-lg text-montu-lime">montu</span>
        <p className="mt-2">Play together, more often.</p>
      </footer>
    </main>
  );
}
