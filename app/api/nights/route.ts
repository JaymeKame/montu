import { NextRequest, NextResponse } from 'next/server';
import { adminCredentialsConfigured, adminDb } from '@/lib/firebase-admin';
import type { CreateNightBody, Night } from '@/lib/protocol';
import { getHostStats } from '@/lib/host-stats';

function noCreds() {
  return NextResponse.json(
    { error: 'Server not configured: FIREBASE_SERVICE_ACCOUNT is missing.' },
    { status: 503 },
  );
}

/** Short, human-shareable codes. No 0/O, 1/I — safe to read off a stream. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

function randomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

async function uniqueCode(): Promise<string> {
  const db = adminDb();
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    const snap = await db.collection('nights').where('code', '==', code).limit(1).get();
    if (snap.empty) return code;
  }
  throw new Error('Could not generate a unique night code.');
}

/** GET /api/nights?hostId=... — host stats for /creator.
 *  Returns {stats: {nightsHosted, playersBroughtTogether, foundingHost}}.
 *  No hostId → 400. */
export async function GET(req: NextRequest) {
  if (!adminCredentialsConfigured()) return noCreds();
  const hostId = req.nextUrl.searchParams.get('hostId')?.trim();
  if (!hostId) {
    return NextResponse.json({ error: 'hostId query param is required.' }, { status: 400 });
  }
  const db = adminDb();
  const stats = await getHostStats(db, hostId);
  return NextResponse.json({ stats });
}

/** POST /api/nights — a creator makes a game night.
 *  Body: {hostId, hostName, game, scheduledAt (ISO), squadSize,
 *         vibe?, notes?, joinInfo?}.
 *  Returns {id, code} — the night lives at /n/[code]. */
export async function POST(req: NextRequest) {
  if (!adminCredentialsConfigured()) return noCreds();

  let body: CreateNightBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const hostId = body.hostId?.trim();
  const hostName = body.hostName?.trim();
  const game = body.game?.trim();
  const scheduledAt = body.scheduledAt?.trim();
  const squadSize = Number(body.squadSize);
  const vibe = body.vibe?.trim() || undefined;
  const notes = body.notes?.trim() || undefined;
  const joinInfo = body.joinInfo ?? undefined;

  if (!hostId || !hostName || !game) {
    return NextResponse.json(
      { error: 'hostId, hostName, and game are required.' },
      { status: 400 },
    );
  }
  if (!scheduledAt || Number.isNaN(Date.parse(scheduledAt))) {
    return NextResponse.json(
      { error: 'scheduledAt must be a valid ISO datetime string.' },
      { status: 400 },
    );
  }
  if (!Number.isInteger(squadSize) || squadSize < 2 || squadSize > 100) {
    return NextResponse.json(
      { error: 'squadSize must be an integer between 2 and 100.' },
      { status: 400 },
    );
  }

  const db = adminDb();
  const code = await uniqueCode();
  const nightDoc = {
    hostId,
    hostName,
    game,
    scheduledAt,
    squadSize,
    ...(vibe ? { vibe } : {}),
    ...(notes ? { notes } : {}),
    ...(joinInfo ? { joinInfo } : {}),
    code,
    status: 'open' as const,
    createdAt: new Date().toISOString(),
  };
  const nightRef = await db.collection('nights').add(nightDoc);

  const night: Night = { id: nightRef.id, ...(nightDoc as Omit<Night, 'id'>) };
  return NextResponse.json({ id: night.id, code: night.code }, { status: 201 });
}
