import { NextRequest, NextResponse } from 'next/server';
import { adminCredentialsConfigured, adminDb } from '@/lib/firebase-admin';
import { normalizePhone } from '@/lib/sms';
import type { CreateRsvpBody, Night } from '@/lib/protocol';

function noCreds() {
  return NextResponse.json(
    { error: 'Server not configured: FIREBASE_SERVICE_ACCOUNT is missing.' },
    { status: 503 },
  );
}

/** POST /api/nights/[code]/rsvp — a fan claims a seat on a game night.
 *  Body: {name, phone}. Idempotent on (night, phone): a repeat RSVP from
 *  the same phone returns ok without taking another seat. 409 when full. */
export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } },
) {
  if (!adminCredentialsConfigured()) return noCreds();

  const code = (params.code ?? '').trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: 'Missing night code.' }, { status: 400 });
  }

  let body: CreateRsvpBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const name = body.name?.trim();
  const phone = normalizePhone(body.phone ?? '');
  if (!name) {
    return NextResponse.json({ error: 'A name or handle is required.' }, { status: 400 });
  }
  if (phone.length < 7) {
    return NextResponse.json(
      { error: 'That phone number does not look right. Check it and try again.' },
      { status: 400 },
    );
  }

  const db = adminDb();
  const nightSnap = await db.collection('nights').where('code', '==', code).limit(1).get();
  if (nightSnap.empty) {
    return NextResponse.json({ error: 'Night not found.' }, { status: 404 });
  }
  const nightDoc = nightSnap.docs[0];
  const night = nightDoc.data() as Omit<Night, 'id'>;
  if (night.status !== 'open') {
    return NextResponse.json(
      { error: 'This game night is already being assembled. Watch for the next one.' },
      { status: 409 },
    );
  }

  const rsvpsRef = nightDoc.ref.collection('rsvps');

  // Idempotent: same phone already on the list.
  const existing = await rsvpsRef.where('phone', '==', phone).limit(1).get();
  if (!existing.empty) {
    return NextResponse.json({ ok: true, already: true });
  }

  const count = (await rsvpsRef.count().get()).data().count;
  if (count >= night.squadSize) {
    return NextResponse.json(
      { error: 'This game night is full. Get on the next one.' },
      { status: 409 },
    );
  }

  await rsvpsRef.add({
    name,
    phone,
    joinedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
