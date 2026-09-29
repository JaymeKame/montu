import { NextRequest, NextResponse } from 'next/server';
import { adminCredentialsConfigured, adminDb } from '@/lib/firebase-admin';
import type { Session } from '@/lib/protocol';

function noCreds() {
  return NextResponse.json(
    { error: 'Server not configured: FIREBASE_SERVICE_ACCOUNT is missing.' },
    { status: 503 },
  );
}

/** GET /api/sessions/[id] — return one session doc. Used by the session page. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!adminCredentialsConfigured()) return noCreds();

  const snap = await adminDb().collection('sessions').doc(params.id).get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
  }

  const session: Session = { id: snap.id, ...(snap.data() as Omit<Session, 'id'>) };
  return NextResponse.json(session);
}
