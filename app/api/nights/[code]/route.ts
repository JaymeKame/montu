import { NextRequest, NextResponse } from 'next/server';
import { adminCredentialsConfigured, adminDb } from '@/lib/firebase-admin';
import type { Night, NightRsvp } from '@/lib/protocol';

function noCreds() {
  return NextResponse.json(
    { error: 'Server not configured: FIREBASE_SERVICE_ACCOUNT is missing.' },
    { status: 503 },
  );
}

/** GET /api/nights/[code] — public night page data.
 *  Returns the night, RSVP names (no phones — this is public), and spots left.
 *  The concierge gets RSVPs + phones from the /admin server render instead. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } },
) {
  if (!adminCredentialsConfigured()) return noCreds();

  const code = (params.code ?? '').trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: 'Missing night code.' }, { status: 400 });
  }

  const db = adminDb();
  const snap = await db.collection('nights').where('code', '==', code).limit(1).get();
  if (snap.empty) {
    return NextResponse.json({ error: 'Night not found.' }, { status: 404 });
  }
  const doc = snap.docs[0];
  const night: Night = { id: doc.id, ...(doc.data() as Omit<Night, 'id'>) };

  const rsvpSnap = await db
    .collection('nights')
    .doc(night.id)
    .collection('rsvps')
    .orderBy('joinedAt', 'asc')
    .get();
  const rsvps: Pick<NightRsvp, 'id' | 'name'>[] = rsvpSnap.docs.map((d) => ({
    id: d.id,
    name: (d.data() as NightRsvp).name,
  }));

  return NextResponse.json({
    night,
    rsvpCount: rsvps.length,
    spotsLeft: Math.max(0, night.squadSize - rsvps.length),
    rsvps,
  });
}
