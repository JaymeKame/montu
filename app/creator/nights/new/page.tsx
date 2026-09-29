'use client';

/**
 * /creator/nights/new — a creator makes a game night and gets a shareable link.
 *
 * Signed-in creator (anonymous auth is fine) picks game, date/time, squad
 * size, vibe, and notes. Optional "how to join" details (lobby code, party
 * invite link, voice chat link) can be set now or left for later. On success
 * the page becomes a share card: /n/[code] plus a copy button.
 *
 * Copy rule: belonging-first, fun-first. No duty/commitment language.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

const VIBES = [
  { value: 'chill', label: 'Chill', blurb: 'Good vibes, low stakes' },
  { value: 'casual', label: 'Casual', blurb: 'Fun first, a little spicy' },
  { value: 'competitive', label: 'Competitive', blurb: 'We play to win' },
];

export default function NewNightPage() {
  const { user, loading: authLoading } = useAuth();

  const [hostName, setHostName] = useState('');
  const [game, setGame] = useState('');
  const [when, setWhen] = useState('');
  const [squadSize, setSquadSize] = useState('8');
  const [vibe, setVibe] = useState('casual');
  const [notes, setNotes] = useState('');
  const [lobbyCode, setLobbyCode] = useState('');
  const [partyLink, setPartyLink] = useState('');
  const [voiceLink, setVoiceLink] = useState('');

  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [nightCode, setNightCode] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setErrorMsg('');
    try {
      const scheduledAt = new Date(when).toISOString();
      const joinInfo: Record<string, string> = {};
      if (lobbyCode.trim()) joinInfo.lobbyCode = lobbyCode.trim();
      if (partyLink.trim()) joinInfo.partyLink = partyLink.trim();
      if (voiceLink.trim()) joinInfo.voiceLink = voiceLink.trim();

      const res = await fetch('/api/nights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: user?.uid ?? 'anon',
          hostName: hostName.trim(),
          game: game.trim(),
          scheduledAt,
          squadSize: Number(squadSize),
          vibe,
          notes: notes.trim() || undefined,
          joinInfo: Object.keys(joinInfo).length > 0 ? joinInfo : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data && (data.error || data.message)) || `Request failed (${res.status})`);
      setNightCode(data.code as string);
      setStatus('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  const canSubmit =
    hostName.trim() && game.trim() && when && Number(squadSize) >= 2 && !authLoading;

  const shareUrl = nightCode ? `${typeof window !== 'undefined' ? window.location.origin : ''}/n/${nightCode}` : '';

  function resetForm() {
    setHostName('');
    setGame('');
    setWhen('');
    setSquadSize('8');
    setVibe('casual');
    setNotes('');
    setLobbyCode('');
    setPartyLink('');
    setVoiceLink('');
    setNightCode('');
    setStatus('idle');
    setErrorMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      const btn = document.getElementById('copy-link-btn');
      if (btn) btn.textContent = 'Copied ✓';
    } catch {
      // clipboard unavailable; the input is selectable
    }
  }

  const inputClass =
    'w-full rounded-button border border-montu-line bg-montu-bg px-4 py-3 text-montu-ink placeholder:text-montu-ink-3 focus:border-montu-pink focus:outline-none';
  const labelClass = 'mb-1.5 block text-sm font-semibold text-montu-ink';

  return (
    <main className="mx-auto max-w-3xl px-5 pb-24">
      <nav className="flex items-center justify-between py-6">
        <Link href="/" className="display text-2xl text-montu-lime">montu</Link>
        <Link href="/creator" className="text-sm font-semibold text-montu-ink-2 hover:text-montu-ink">
          Back to hosting
        </Link>
      </nav>

      {status === 'done' ? (
        /* Share card */
        <section className="pt-6 text-center sm:pt-10">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-montu-line bg-montu-surface px-4 py-1.5 text-xs font-semibold text-montu-ink-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-montu-lime" />
            Your game night is live
          </div>
          <h1 className="display text-5xl text-montu-ink sm:text-6xl">
            The lobby is open.
            <br />
            <span className="text-montu-lime">Bring your people.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-montu-ink-2">
            Share this link anywhere your community hangs out. Every fan who taps it gets a seat — we handle the squads.
          </p>

          <div className="card mx-auto mt-8 max-w-xl rounded-card p-6 shadow-card sm:p-8">
            <div className="text-xs font-bold uppercase tracking-widest text-montu-ink-3">Your game night link</div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.target.select()}
                className={`${inputClass} font-mono text-sm`}
              />
              <button
                id="copy-link-btn"
                type="button"
                onClick={copyLink}
                className="btn-play shrink-0 rounded-button bg-montu-lime px-6 py-3 font-bold text-montu-bg"
              >
                Copy link
              </button>
            </div>
            <p className="mt-4 text-sm text-montu-ink-2">
              Post it in chat, pin it on stream, drop it in Discord. When fans join, they land on your night page — no app, no account, just a name and a phone number.
            </p>
          </div>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={`/n/${nightCode}`}
              className="rounded-button border border-montu-line bg-montu-surface px-6 py-3 font-semibold text-montu-ink hover:border-montu-lime"
            >
              Preview the night page
            </Link>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-button border border-montu-line bg-montu-surface px-6 py-3 font-semibold text-montu-ink hover:border-montu-lime"
            >
              Make another night
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="pt-6 text-center sm:pt-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-montu-line bg-montu-surface px-4 py-1.5 text-xs font-semibold text-montu-ink-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-montu-pink" />
              New game night
            </div>
            <h1 className="display text-5xl text-montu-ink sm:text-6xl">
              Set the night.
              <br />
              <span className="text-montu-pink">We fill the lobby.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-montu-ink-2">
              Pick the game and the time. You get one link to share — your community taps in, and everyone gets a squad that fits your vibe.
            </p>
          </section>

          <section className="card mt-10 rounded-card p-6 shadow-card sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="n-host" className={labelClass}>Your name</label>
                  <input
                    id="n-host"
                    type="text"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="How your community knows you"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="n-game" className={labelClass}>Game</label>
                  <input
                    id="n-game"
                    type="text"
                    value={game}
                    onChange={(e) => setGame(e.target.value)}
                    placeholder="e.g. Call of Duty"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="n-when" className={labelClass}>Date and time</label>
                  <input
                    id="n-when"
                    type="datetime-local"
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="n-size" className={labelClass}>Squad size</label>
                  <input
                    id="n-size"
                    type="number"
                    min={2}
                    max={100}
                    value={squadSize}
                    onChange={(e) => setSquadSize(e.target.value)}
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-montu-ink-3">How many seats are up for grabs.</p>
                </div>
              </div>

              <div>
                <span className={labelClass}>Vibe</span>
                <div className="grid grid-cols-3 gap-2">
                  {VIBES.map((v) => (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => setVibe(v.value)}
                      className={`rounded-button border px-3 py-3 text-left transition ${
                        vibe === v.value
                          ? 'border-montu-pink bg-montu-pink/10'
                          : 'border-montu-line bg-montu-bg hover:border-montu-ink-3'
                      }`}
                    >
                      <div className="font-bold text-montu-ink">{v.label}</div>
                      <div className="text-xs text-montu-ink-2">{v.blurb}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="n-notes" className={labelClass}>
                  Notes <span className="font-normal text-montu-ink-3">(optional)</span>
                </label>
                <textarea
                  id="n-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Bronze to gold lobbies, mic on, bring your worst aim"
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="rounded-button border border-montu-line bg-montu-bg p-4">
                <div className="font-semibold text-montu-ink">How players join the game</div>
                <p className="mt-1 text-xs text-montu-ink-3">
                  Optional now — fill in whatever you know, add the rest later. Players see this on the session page.
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="n-lobby" className="mb-1 block text-xs font-semibold text-montu-ink-2">Lobby code</label>
                    <input
                      id="n-lobby"
                      type="text"
                      value={lobbyCode}
                      onChange={(e) => setLobbyCode(e.target.value)}
                      placeholder="e.g. MONTU-8PM"
                      className={`${inputClass} py-2 text-sm`}
                    />
                  </div>
                  <div>
                    <label htmlFor="n-party" className="mb-1 block text-xs font-semibold text-montu-ink-2">Party invite link</label>
                    <input
                      id="n-party"
                      type="url"
                      value={partyLink}
                      onChange={(e) => setPartyLink(e.target.value)}
                      placeholder="https://…"
                      className={`${inputClass} py-2 text-sm`}
                    />
                  </div>
                  <div>
                    <label htmlFor="n-voice" className="mb-1 block text-xs font-semibold text-montu-ink-2">Voice chat link</label>
                    <input
                      id="n-voice"
                      type="url"
                      value={voiceLink}
                      onChange={(e) => setVoiceLink(e.target.value)}
                      placeholder="https://…"
                      className={`${inputClass} py-2 text-sm`}
                    />
                  </div>
                </div>
              </div>

              {status === 'error' && (
                <div className="rounded-button border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  Could not create that just now: {errorMsg}. Try again in a moment.
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit || status === 'sending'}
                className="btn-play display w-full rounded-button bg-montu-pink px-6 py-4 text-xl text-montu-bg disabled:cursor-not-allowed disabled:opacity-40"
              >
                {status === 'sending' ? 'Opening the lobby...' : 'Create my game night'}
              </button>
              {authLoading && (
                <p className="text-center text-xs text-montu-ink-3">Signing you in...</p>
              )}
            </form>
          </section>
        </>
      )}
    </main>
  );
}
