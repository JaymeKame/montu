import { NextRequest, NextResponse } from 'next/server';
import { adminCredentialsConfigured, adminDb } from '@/lib/firebase-admin';
import type { CreateSessionBody, Intention, JoinInfo, Night } from '@/lib/protocol';

function noCreds() {
  return NextResponse.json(
    { error: 'Server not configured: FIREBASE_SERVICE_ACCOUNT is missing.' },
    { status: 503 },
  );
}

/** POST /api/sessions — create a session from open intentions OR from a
 *  night's RSVPs.
 *
 *  Intentions path: {intentionIds: string[], scheduledAt: ISO string}.
 *  Denormalizes game + participants from the intentions and flips those
 *  intentions to 'matched'.
 *
 *  Night path: {nightId: string, scheduledAt?: ISO string, joinInfo?}.
 *  Loads the night + its RSVPs, builds participants as
 *  {userId: `phone:<digits>`, name, phone: <digits>}, copies game/hostName/
 *  joinInfo onto the session, and marks the night 'assembling'.
 *
 *  Returns {id}. */
export async function POST(req: NextRequest) {
  if (!adminCredentialsConfigured()) return noCreds();

  let body: CreateSessionBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const db = adminDb();

  if (typeof body.nightId === 'string' && body.nightId.trim()) {
    return createFromNight(db, body);
  }

  return createFromIntentions(db, body);
}

function validScheduledAt(raw: unknown): string | null {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s || Number.isNaN(Date.parse(s))) return null;
  return s;
}

async function createFromNight(
  db: ReturnType<typeof adminDb>,
  body: CreateSessionBody,
) {
  const nightId = (body.nightId as string).trim();
  const nightRef = db.collection('nights').doc(nightId);
  const nightSnap = await nightRef.get();
  if (!nightSnap.exists) {
    return NextResponse.json({ error: 'Night not found.' }, { status: 400 });
  }
  const night = nightSnap.data() as Omit<Night, 'id'>;
  if (night.status === 'done') {
    return NextResponse.json({ error: 'This night is already done.' }, { status: 400 });
  }

  const scheduledAt = validScheduledAt(body.scheduledAt) ?? night.scheduledAt;

  const rsvpSnap = await nightRef.collection('rsvps').orderBy('joinedAt', 'asc').get();
  const rsvps = rsvpSnap.docs.map((d) => d.data() as { name: string; phone: string });
  if (rsvps.length === 0) {
    return NextResponse.json(
      { error: 'No RSVPs on this night yet. Nothing to assemble.' },
      { status: 400 },
    );
  }

  const participants = rsvps.map((r) => ({
    userId: `phone:${r.phone}`,
    name: r.name,
    phone: r.phone,
  }));

  const joinInfo: JoinInfo | undefined = body.joinInfo ?? night.joinInfo;

  const sessionRef = await db.collection('sessions').add({
    intentionIds: [] as string[],
    nightId,
    game: night.game,
    scheduledAt,
    participants,
    hostName: night.hostName,
    ...(joinInfo ? { joinInfo } : {}),
    vibe: night.vibe ?? null,
    status: 'forming' as const,
    createdAt: new Date().toISOString(),
  });

  await nightRef.update({ status: 'assembling' });

  return NextResponse.json({ id: sessionRef.id }, { status: 201 });
}

async function createFromIntentions(
  db: ReturnType<typeof adminDb>,
  body: CreateSessionBody,
) {
  const intentionIds = Array.isArray(body.intentionIds)
    ? [...new Set(body.intentionIds.filter((id) => typeof id === 'string' && id.trim()))]
    : [];
  const scheduledAt = validScheduledAt(body.scheduledAt);
  if (intentionIds.length === 0) {
    return NextResponse.json(
      { error: 'intentionIds must be a non-empty array.' },
      { status: 400 },
    );
  }
  if (!scheduledAt) {
    return NextResponse.json(
      { error: 'scheduledAt must be a valid ISO datetime string.' },
      { status: 400 },
    );
  }

  const intentionsCol = db.collection('intentions');

  // Load every intention; all must exist and be 'open' (no double-matching).
  const intentions: Intention[] = [];
  for (const id of intentionIds) {
    const snap = await intentionsCol.doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: `Intention not found: ${id}.` }, { status: 400 });
    }
    const data = snap.data() as Omit<Intention, 'id'>;
    if (data.status !== 'open') {
      return NextResponse.json(
        { error: `Intention ${id} is already ${data.status}, not open.` },
        { status: 400 },
      );
    }
    intentions.push({ id, ...data });
  }

  // Game: most common across the selected intentions (concierge normally picks same-game).
  const gameCounts = new Map<string, number>();
  for (const i of intentions) {
    gameCounts.set(i.game, (gameCounts.get(i.game) ?? 0) + 1);
  }
  const game = [...gameCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const participants = intentions.map((i) => ({
    userId: i.userId,
    name: i.name,
    ...(i.phone ? { phone: i.phone } : {}),
  }));

  const sessionDoc = {
    intentionIds,
    game,
    scheduledAt,
    participants,
    status: 'forming' as const,
    createdAt: new Date().toISOString(),
  };
  const sessionRef = await db.collection('sessions').add(sessionDoc);

  // Flip intentions to 'matched' in one batch.
  const batch = db.batch();
  for (const i of intentions) {
    batch.update(intentionsCol.doc(i.id), { status: 'matched' });
  }
  await batch.commit();

  return NextResponse.json({ id: sessionRef.id }, { status: 201 });
}
