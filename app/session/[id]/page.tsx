'use client';

/**
 * Session detail page — the pre-game lobby.
 *
 * This page is the ROOM: it must feel like the place the night happens
 * around, not a form. Live countdown to game time, the squad, and the
 * host's "how to join" details (lobby code, party link, voice link).
 *
 * Before game time: countdown + how to join + squad. The pre-game
 * "Count me in" writes a confirmation for intention-based sessions.
 * After game time: "Did you play?" — the "I played" button writes the
 * confirmation that turns the night into a record.
 *
 * Identity: signed-in users match by uid. Night-RSVP players joined by
 * phone, so the page offers a lightweight claim flow: pick your name from
 * the squad and enter the phone you RSVP'd with. Verified client-side
 * against the squad list, remembered in localStorage for this session.
 *
 * Copy rule: belonging-first, fun-first. No duty/commitment language.
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

interface Participant {
  userId?: string;
  name?: string;
  handle?: string;
  phone?: string;
}

interface JoinInfo {
  lobbyCode?: string;
  partyLink?: string;
  voiceLink?: string;
}

interface SessionData {
  id: string;
  game?: string;
  scheduledAt?: string;
  timeLabel?: string;
  vibe?: string;
  roles?: string;
  hostName?: string;
  joinInfo?: JoinInfo;
  participants?: Participant[];
  status?: string;
}

function normalizePhone(raw: string): string {
  return (raw ?? '').replace(/\D/g, '');
}

function useCountdown(targetIso?: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return useMemo(() => {
    if (!targetIso) return null;
    const diff = new Date(targetIso).getTime() - now;
    if (Number.isNaN(diff)) return null;
    return diff;
  }, [targetIso, now]);
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'It is game time';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
  parts.push(`${sec}s`);
  return parts.join(' ');
}

function formatWhen(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
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

export default function SessionPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { user } = useAuth();

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [confirmState, setConfirmState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [confirmError, setConfirmError] = useState('');

  // Claim flow for phone-RSVP players (no matching auth uid).
  const [claimName, setClaimName] = useState('');
  const [claimPhone, setClaimPhone] = useState('');
  const [claimError, setClaimError] = useState('');
  const [claimedUserId, setClaimedUserId] = useState<string | null>(null);

  const countdownMs = useCountdown(session?.scheduledAt);
  const gameStarted = countdownMs !== null && countdownMs <= 0;

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setLoadError('No session id in the URL.');
      return;
    }
    try {
      const stored = window.localStorage.getItem(`montu-identity:${id}`);
      if (stored) setClaimedUserId(stored);
    } catch {
      // private mode etc. — claim flow still works for this visit
    }
    fetch(`/api/sessions/${encodeURIComponent(id)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Session not found yet (${res.status})`);
        const data = await res.json();
        setSession({ id, ...data });
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Could not load session');
      })
      .finally(() => setLoading(false));
  }, [id]);

  /** Resolve who is confirming: auth uid, then claimed phone identity. */
  function resolveUserId(): string | null {
    const participants = session?.participants ?? [];
    if (user?.uid && participants.some((p) => p.userId === user.uid)) return user.uid;
    if (claimedUserId && participants.some((p) => p.userId === claimedUserId)) return claimedUserId;
    return null;
  }

  const activeUserId = resolveUserId();
  const needsClaim =
    !loading && !loadError && session && !activeUserId && (session.participants?.length ?? 0) > 0;

  function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    setClaimError('');
    const phone = normalizePhone(claimPhone);
    const match = (session?.participants ?? []).find(
      (p) => (p.name ?? '').trim().toLowerCase() === claimName.trim().toLowerCase(),
    );
    if (!match) {
      setClaimError('Pick your name from the squad list.');
      return;
    }
    if (!match.phone || normalizePhone(match.phone) !== phone) {
      setClaimError('That phone does not match the one you RSVP\'d with. Try again.');
      return;
    }
    const uid = match.userId ?? `phone:${phone}`;
    try {
      window.localStorage.setItem(`montu-identity:${id}`, uid);
    } catch {
      // ignore
    }
    setClaimedUserId(uid);
  }

  async function postConfirm() {
    const userId = resolveUserId();
    if (!userId) {
      setConfirmState('error');
      setConfirmError('Tell us who you are first so we can count your night.');
      return;
    }
    setConfirmState('sending');
    setConfirmError('');
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(id)}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, showedUp: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error((data && (data.error || data.message)) || `Request failed (${res.status})`);
      }
      const data = await res.json().catch(() => null);
      setSession((s) => (s ? { ...s, ...(data ?? {}) } : s));
      setConfirmState('done');
    } catch (err) {
      setConfirmState('error');
      setConfirmError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  const joinInfo = session?.joinInfo;
  const hasJoinInfo = Boolean(joinInfo && (joinInfo.lobbyCode || joinInfo.partyLink || joinInfo.voiceLink));

  async function copyLobby() {
    try {
      await navigator.clipboard.writeText(joinInfo?.lobbyCode ?? '');
      const el = document.getElementById('copy-lobby-btn');
      if (el) el.textContent = 'Copied ✓';
    } catch {
      // ignore
    }
  }

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
          <div className="display mb-3 animate-pulse text-4xl">🎮</div>
          <p className="text-montu-ink-2">Opening the lobby...</p>
        </div>
      ) : loadError || !session ? (
        <div className="card rounded-card p-10 text-center shadow-card">
          <div className="display mb-3 text-4xl">🕹️</div>
          <h1 className="display text-3xl text-montu-ink">The lobby is warming up</h1>
          <p className="mx-auto mt-3 max-w-sm text-montu-ink-2">
            {loadError ?? 'We could not find this session yet.'} If you just got the text, give it a minute and refresh.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-play mt-6 rounded-button bg-montu-lime px-6 py-3 font-bold text-montu-bg"
          >
            Refresh
          </button>
        </div>
      ) : (
        <>
          {/* The room: countdown hero */}
          <section className="card overflow-hidden rounded-card shadow-card">
            <div className="bg-gradient-to-br from-montu-violet/30 via-montu-surface to-montu-bg p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-montu-line bg-montu-bg/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-montu-ink-2">
                  Game night
                </span>
                {session.hostName && (
                  <span className="rounded-full border border-montu-line bg-montu-bg/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-montu-pink">
                    Hosted by {session.hostName}
                  </span>
                )}
                {session.vibe && (
                  <span className="rounded-full border border-montu-line bg-montu-bg/60 px-3 py-1 text-xs font-bold uppercase tracking-wider text-montu-ink-2">
                    {session.vibe}
                  </span>
                )}
              </div>
              <h1 className="display mt-3 text-4xl text-montu-ink sm:text-5xl">{session.game ?? 'Your game'}</h1>
              <p className="mt-2 font-semibold text-montu-ink-2">
                {session.timeLabel ?? formatWhen(session.scheduledAt)}
              </p>
              {session.roles && <p className="mt-1 text-sm text-montu-ink-2">{session.roles}</p>}

              <div className="mt-6 rounded-button border border-montu-line bg-montu-bg/70 p-5 text-center">
                {countdownMs === null ? (
                  <p className="text-montu-ink-2">Game time is set — see you there.</p>
                ) : gameStarted ? (
                  <>
                    <div className="display text-4xl text-montu-lime">It is game time</div>
                    <p className="mt-2 text-sm text-montu-ink-2">Get in the lobby. Your squad is waiting.</p>
                  </>
                ) : (
                  <>
                    <div className="text-xs font-bold uppercase tracking-widest text-montu-ink-3">
                      The night begins in
                    </div>
                    <div className="display mt-1 text-5xl tabular-nums text-montu-ink">
                      {formatCountdown(countdownMs)}
                    </div>
                    <p className="mt-2 text-sm text-montu-ink-2">Your seat is saved. We will see you there.</p>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* How to join */}
          <section className="card mt-4 rounded-card p-6 shadow-card sm:p-8">
            <h2 className="display text-2xl text-montu-ink">How to get in the game</h2>
            {hasJoinInfo ? (
              <div className="mt-4 space-y-3">
                {joinInfo?.lobbyCode && (
                  <div className="flex items-center justify-between gap-3 rounded-button border border-montu-line bg-montu-bg px-4 py-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-montu-ink-3">Lobby code</div>
                      <div className="font-mono text-lg font-bold text-montu-ink">{joinInfo.lobbyCode}</div>
                    </div>
                    <button
                      id="copy-lobby-btn"
                      type="button"
                      onClick={copyLobby}
                      className="shrink-0 rounded-button border border-montu-line bg-montu-surface px-4 py-2 text-sm font-semibold text-montu-ink hover:border-montu-lime"
                    >
                      Copy
                    </button>
                  </div>
                )}
                {joinInfo?.partyLink && (
                  <a
                    href={joinInfo.partyLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-button border border-montu-line bg-montu-bg px-4 py-3 hover:border-montu-lime"
                  >
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-montu-ink-3">Party invite</div>
                      <div className="font-semibold text-montu-lime">Tap to join the party →</div>
                    </div>
                  </a>
                )}
                {joinInfo?.voiceLink && (
                  <a
                    href={joinInfo.voiceLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-button border border-montu-line bg-montu-bg px-4 py-3 hover:border-montu-lime"
                  >
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-montu-ink-3">Voice chat</div>
                      <div className="font-semibold text-montu-lime">Tap to join voice →</div>
                    </div>
                  </a>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-montu-ink-2">
                The host drops the lobby details here before game time. Keep this page open.
              </p>
            )}
          </section>

          {/* The squad */}
          <section className="card mt-4 rounded-card p-6 shadow-card sm:p-8">
            <h2 className="display text-2xl text-montu-ink">Your squad</h2>
            {session.participants && session.participants.length > 0 ? (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {session.participants.map((p, i) => {
                  const label = p.name ?? p.handle ?? `Player ${i + 1}`;
                  const isYou = activeUserId && p.userId === activeUserId;
                  return (
                    <li
                      key={i}
                      className={`flex items-center gap-3 rounded-button border px-4 py-3 ${
                        isYou ? 'border-montu-lime bg-montu-lime/10' : 'border-montu-line bg-montu-bg'
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          isYou ? 'bg-montu-lime text-montu-bg' : 'bg-montu-violet text-white'
                        }`}
                      >
                        {label.charAt(0).toUpperCase()}
                      </span>
                      <span className="font-semibold text-montu-ink">{label}</span>
                      {isYou ? (
                        <span className="ml-auto text-xs font-bold text-montu-lime">YOU</span>
                      ) : (
                        <span className="ml-auto text-xs font-bold text-montu-ink-3">IN</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-montu-ink-2">
                Your squad is still forming. We will text you as soon as everyone is in.
              </p>
            )}
            <p className="mt-4 text-sm text-montu-ink-2">
              These are your people for the night. You belong here.
            </p>
          </section>

          {/* Confirm: pre-game "Count me in" / post-game "I played" */}
          <section className="mt-6">
            {confirmState === 'done' ? (
              <div className="card rounded-card p-8 text-center shadow-card">
                <div className="display mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-montu-lime text-2xl text-montu-bg">
                  ✓
                </div>
                <h2 className="display text-2xl text-montu-ink">
                  {gameStarted ? 'Night in the books.' : 'You are in!'}
                </h2>
                <p className="mt-2 text-sm text-montu-ink-2">
                  {gameStarted
                    ? 'That is how memories get made. See you at the next one.'
                    : 'See you at game night. Bring your A game.'}
                </p>
              </div>
            ) : (
              <>
                {needsClaim && (
                  <form
                    onSubmit={handleClaim}
                    className="card mb-4 rounded-card p-6 shadow-card"
                  >
                    <h3 className="font-bold text-montu-ink">Which player are you?</h3>
                    <p className="mt-1 text-sm text-montu-ink-2">
                      Pick your name and enter the phone you RSVP'd with so we can count your night.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <select
                        value={claimName}
                        onChange={(e) => setClaimName(e.target.value)}
                        className="rounded-button border border-montu-line bg-montu-bg px-4 py-3 text-montu-ink focus:border-montu-lime focus:outline-none"
                      >
                        <option value="">Your name...</option>
                        {(session?.participants ?? []).map((p, i) => (
                          <option key={i} value={p.name ?? ''}>
                            {p.name ?? `Player ${i + 1}`}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        value={claimPhone}
                        onChange={(e) => setClaimPhone(e.target.value)}
                        placeholder="Your phone number"
                        className="rounded-button border border-montu-line bg-montu-bg px-4 py-3 text-montu-ink placeholder:text-montu-ink-3 focus:border-montu-lime focus:outline-none"
                      />
                    </div>
                    {claimError && <p className="mt-2 text-sm text-red-300">{claimError}</p>}
                    <button
                      type="submit"
                      className="mt-3 rounded-button border border-montu-line bg-montu-surface px-5 py-2.5 font-semibold text-montu-ink hover:border-montu-lime"
                    >
                      That is me
                    </button>
                  </form>
                )}

                <button
                  type="button"
                  onClick={postConfirm}
                  disabled={confirmState === 'sending' || (!!needsClaim && !activeUserId)}
                  className="btn-play display w-full rounded-button bg-montu-lime px-6 py-4 text-xl text-montu-bg disabled:opacity-50"
                >
                  {confirmState === 'sending'
                    ? 'Saving...'
                    : gameStarted
                      ? 'I played'
                      : 'Count me in'}
                </button>
                {gameStarted && !needsClaim && (
                  <p className="mt-3 text-center text-sm text-montu-ink-2">
                    Did you play? Tap it — that is how the night becomes a memory.
                  </p>
                )}
                {confirmState === 'error' && (
                  <div className="mt-3 rounded-button border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    Could not save that just now: {confirmError}. Try again in a moment.
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}
    </main>
  );
}
