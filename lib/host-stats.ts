/**
 * Host stats + founding-host computation (server-side, firebase-admin).
 *
 * Distribution is the host pitch: "we bring you players." These numbers back
 * it up on night pages and /creator. Founding-host status goes to the first
 * FOUNDING_CUTOFF distinct hosts ever — a permanent badge, and first dibs
 * when paid nights turn on.
 */

import type { Firestore } from 'firebase-admin/firestore';

export interface HostStats {
  nightsHosted: number;
  playersBroughtTogether: number;
  foundingHost: boolean;
}

/** First N distinct hosts (by earliest night createdAt) are founding hosts. */
export const FOUNDING_CUTOFF = 25;

export async function getHostStats(db: Firestore, hostId: string): Promise<HostStats> {
  const snap = await db.collection('nights').orderBy('createdAt', 'asc').limit(400).get();

  const seen: string[] = [];
  const hostNightIds: string[] = [];
  for (const d of snap.docs) {
    const hid = (d.data() as { hostId?: string }).hostId;
    if (typeof hid !== 'string' || !hid) continue;
    if (!seen.includes(hid)) seen.push(hid);
    if (hid === hostId) hostNightIds.push(d.id);
  }

  let players = 0;
  for (const id of hostNightIds.slice(0, 60)) {
    const countSnap = await db.collection('nights').doc(id).collection('rsvps').count().get();
    players += countSnap.data().count;
  }

  const firstIndex = seen.indexOf(hostId);
  return {
    nightsHosted: hostNightIds.length,
    playersBroughtTogether: players,
    foundingHost: firstIndex !== -1 && firstIndex < FOUNDING_CUTOFF,
  };
}
