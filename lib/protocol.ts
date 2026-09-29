/**
 * Montu v1 session protocol — shared types + API contract documentation.
 *
 * Flow: visitor declares what they want to play and when (an "intention") →
 * concierge (or a future matcher) groups compatible intentions into a
 * "session" → participants confirm → they play → everyone confirms it
 * happened → a record accrues.
 *
 * COPY RULE: the mutual opt-in / confirmation mechanics below are the
 * underlying protocol, never the promise. User-facing copy must never use
 * "commitment network", "reliability", "accountability", or duty language.
 *
 * Firestore conventions (project inzone-f93e4):
 * - intentions:  {userId, name, game, when, vibe?, roles?, phone?,
 *                 status: 'open'|'matched'|'done', createdAt: ISO string}
 * - sessions:    {intentionIds: string[], game, scheduledAt: ISO string,
 *                 participants: [{userId, name, phone?}],
 *                 status: 'forming'|'confirmed'|'done', createdAt: ISO string,
 *                 nightId?, hostName?, joinInfo?: {lobbyCode?, partyLink?, voiceLink?}}
 * - confirmations: {sessionId, userId, showedUp: boolean, createdAt: ISO string}
 *   Confirmation docs use the deterministic ID `${sessionId}_${userId}` so
 *   writes from the API route AND from /api/sms/webhook are idempotent
 *   upserts on (sessionId, userId). Any new writer of confirmations MUST
 *   follow this doc-ID convention.
 * - nights:      {hostId, hostName, game, scheduledAt: ISO string,
 *                 squadSize: number, vibe?, notes?, code: string (unique,
 *                 human-shareable, e.g. "KQ7D2M"),
 *                 joinInfo?: {lobbyCode?, partyLink?, voiceLink?},
 *                 status: 'open'|'assembling'|'done', createdAt: ISO string}
 * - nights/{nightId}/rsvps: {name, phone (digits-only), joinedAt: ISO string}
 *   RSVPs are idempotent on (nightId, phone): one phone = one seat.
 */

/** An open declaration of what someone wants to play and when. */
export type IntentionStatus = 'open' | 'matched' | 'done';

export interface Intention {
  id: string;
  userId: string;
  name: string;
  game: string;
  when: string; // free text, e.g. "Friday evening" or "2026-10-03 19:00"
  vibe?: string;
  roles?: string;
  phone?: string;
  status: IntentionStatus;
  createdAt: string; // ISO string
}

/** A person placed into a session. */
export interface SessionParticipant {
  userId: string;
  name: string;
  phone?: string;
}

/** A structured gaming session: game, time, people. */
export type SessionStatus = 'forming' | 'confirmed' | 'done';

export interface Session {
  id: string;
  intentionIds: string[];
  game: string;
  scheduledAt: string; // ISO string
  participants: SessionParticipant[];
  status: SessionStatus;
  createdAt: string; // ISO string
  /** Set when the session was assembled from a creator's night. */
  nightId?: string;
  hostName?: string;
  /** How players get into the game: set by the host per night. */
  joinInfo?: JoinInfo;
}

/** One participant's report that a session happened (or not). */
export interface Confirmation {
  sessionId: string;
  userId: string;
  showedUp: boolean;
  createdAt: string; // ISO string
}

/** POST /api/intentions body. `name`, `game`, `when` are required. */
export interface CreateIntentionBody {
  name: string;
  game: string;
  when: string;
  userId?: string;
  vibe?: string;
  roles?: string;
  phone?: string;
}

/** How players actually get into the game: set by the host per night. */
export interface JoinInfo {
  lobbyCode?: string;
  partyLink?: string;
  voiceLink?: string;
}

/** A creator-hosted game night. Lives publicly at /n/[code]. */
export type NightStatus = 'open' | 'assembling' | 'done';

export interface Night {
  id: string;
  hostId: string;
  hostName: string;
  game: string;
  scheduledAt: string; // ISO string
  squadSize: number;
  vibe?: string;
  notes?: string;
  code: string; // unique, human-shareable
  joinInfo?: JoinInfo;
  status: NightStatus;
  createdAt: string; // ISO string
}

/** One fan's seat on a night. */
export interface NightRsvp {
  id: string;
  name: string;
  phone: string; // digits-only
  joinedAt: string; // ISO string
}

/** POST /api/nights body. */
export interface CreateNightBody {
  hostId: string;
  hostName: string;
  game: string;
  scheduledAt: string; // ISO string
  squadSize: number;
  vibe?: string;
  notes?: string;
  joinInfo?: JoinInfo;
}

/** POST /api/nights/[code]/rsvp body. */
export interface CreateRsvpBody {
  name: string;
  phone: string;
}

/** POST /api/sessions body. */
export interface CreateSessionBody {
  intentionIds?: string[];
  /** Assemble a session from a night's RSVPs instead of intentions. */
  nightId?: string;
  /** Override for the night path; required for the intentions path. */
  scheduledAt?: string; // ISO string
  /** Override the night's join info at assembly time. */
  joinInfo?: JoinInfo;
}

/** POST /api/sessions/[id]/confirm body. */
export interface ConfirmBody {
  userId: string;
  showedUp: boolean;
}
