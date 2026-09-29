import { NextRequest, NextResponse } from 'next/server';
import { adminCredentialsConfigured, adminDb } from '@/lib/firebase-admin';
import type { ConfirmBody } from '@/lib/protocol';

function noCreds() {
  return NextResponse.json(
    { error: 'Server not configured: FIREBASE_SERVICE_ACCOUNT is missing.' },
    { status: 503 },
  );
}

/** Doc-ID convention: `${sessionId}_${userId}`. Upserts are idempotent on
 *  (sessionId, userId) — the /api/sms/webhook writer MUST use the same IDs. */
function confirmationDocId(sessionId: string, userId: string) {
  return `${sessionId}_${userId}`;
}

/** POST /api/sessions/[id]/confirm — upsert one participant's confirmation.
 *  Body: {userId: string, showedUp: boolean}. When every participant has a
 *  confirmation, the session flips to 'done'. Idempotent: repeat calls for
 *  the same (sessionId, userId) overwrite. */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!adminCredentialsConfigured()) return noCreds();

  const sessionId = params.id;
  let body: ConfirmBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const userId = body.userId?.trim();
  if (!userId || typeof body.showedUp !== 'boolean') {
    return NextResponse.json(
      { error: 'userId (string) and showedUp (boolean) are required.' },
      { status: 400 },
    );
  }

  const db = adminDb();
  const sessionRef = db.collection('sessions').doc(sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }
  const participants: Array<{ userId: string }> =
    (sessionSnap.data()?.participants as Array<{ userId: string }>) ?? [];

  // Idempotent upsert on (sessionId, userId).
  await db
    .collection('confirmations')
    .doc(confirmationDocId(sessionId, userId))
    .set(
      {
        sessionId,
        userId,
        showedUp: body.showedUp,
        createdAt: new Date().toISOString(),
      },
      { merge: true },
    );

  // If every participant has a confirmation, mark the session done.
  const confSnap = await db.collection('confirmations').where('sessionId', '==', sessionId).get();
  const confirmedUserIds = new Set(confSnap.docs.map((d) => d.data()?.userId as string));
  const everyoneConfirmed =
    participants.length > 0 && participants.every((p) => confirmedUserIds.has(p.userId));

  let status = sessionSnap.data()?.status as string | undefined;
  if (everyoneConfirmed && status !== 'done') {
    await sessionRef.update({ status: 'done' });
    status = 'done';
  }

  return NextResponse.json({ ok: true, status });
}
