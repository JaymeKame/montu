import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { adminCredentialsConfigured, adminDb } from '@/lib/firebase-admin';
import { normalizePhone } from '@/lib/sms';
import type { CreateIntentionBody, Intention } from '@/lib/protocol';

function noCreds() {
  return NextResponse.json(
    { error: 'Server not configured: FIREBASE_SERVICE_ACCOUNT is missing.' },
    { status: 503 },
  );
}

/** POST /api/intentions — create an intention (status 'open'). Returns {id}. */
export async function POST(req: NextRequest) {
  if (!adminCredentialsConfigured()) return noCreds();

  let body: CreateIntentionBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const name = body.name?.trim();
  const game = body.game?.trim();
  const when = body.when?.trim();
  if (!name || !game || !when) {
    return NextResponse.json(
      { error: 'name, game, and when are required.' },
      { status: 400 },
    );
  }

  const userId = body.userId?.trim() || randomUUID();
  const doc = {
    userId,
    name,
    game,
    when,
    vibe: body.vibe?.trim() || null,
    roles: body.roles?.trim() || null,
    phone: body.phone ? normalizePhone(body.phone) || null : null,
    status: 'open' as const,
    createdAt: new Date().toISOString(),
  };

  const ref = await adminDb().collection('intentions').add(doc);
  return NextResponse.json({ id: ref.id, userId }, { status: 201 });
}

/** GET /api/intentions?status=open — list intentions, newest first.
 *  Defaults to open; pass any status value to filter, or status=all for all.
 *  Sorting happens in code so no composite Firestore index is required. */
export async function GET(req: NextRequest) {
  if (!adminCredentialsConfigured()) return noCreds();

  const rawStatus = req.nextUrl.searchParams.get('status') ?? 'open';
  const db = adminDb();
  const col = db.collection('intentions');
  const snap =
    rawStatus === 'all'
      ? await col.get()
      : await col.where('status', '==', rawStatus).get();

  const intentions: Intention[] = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Intention, 'id'>) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json({ intentions });
}
