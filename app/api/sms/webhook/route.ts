/* POST /api/sms/webhook — Twilio inbound SMS webhook.
 *
 * Twilio POSTs form-encoded fields including `Body` and `From`.
 * We normalize the reply and record it in Firestore `confirmations`
 * against the sender's most recent forming/confirmed session.
 *
 * ALWAYS returns 200 on success or unknown-sender paths: Twilio retries
 * on non-2xx, and a stray text must never trigger a retry storm.
 *
 * Firebase Admin is initialized self-contained in this file (same pattern
 * as the shared helper). Production needs `npm i firebase-admin` and
 * FIREBASE_SERVICE_ACCOUNT (raw or base64 JSON) or ADC in the environment.
 */

import { NextResponse } from 'next/server';
import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from 'firebase-admin/app';
import { FieldValue, getFirestore, type Firestore } from 'firebase-admin/firestore';

import { normalizePhone } from '@/lib/sms';

let cachedApp: App | undefined;

function adminApp(): App {
  if (cachedApp) return cachedApp;
  if (getApps().length) {
    cachedApp = getApps()[0];
    return cachedApp;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  const credential = raw
    ? cert(JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')))
    : applicationDefault();
  cachedApp = initializeApp(
    { credential, projectId: process.env.FIREBASE_PROJECT_ID || undefined },
  );
  return cachedApp;
}

function adminDb(): Firestore {
  return getFirestore(adminApp());
}

type ReplyIntent = 'confirmed' | 'declined' | 'unknown';

function normalizeReply(body: string): ReplyIntent {
  const text = (body ?? '').trim().toLowerCase();
  if (['yes', 'yeah', 'yup', 'confirm'].includes(text)) return 'confirmed';
  if (['no', 'nah', 'cancel'].includes(text)) return 'declined';
  return 'unknown';
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch (err) {
    // Malformed payload: log and ack so Twilio doesn't retry.
    console.warn('[sms:webhook] could not parse form data', err);
    return NextResponse.json({ ok: true });
  }

  const rawBody = String(form.get('Body') ?? '');
  const from = String(form.get('From') ?? '');
  const phone = normalizePhone(from);
  const intent = normalizeReply(rawBody);

  if (!phone) {
    console.log(`[sms:webhook] missing From (body=${rawBody})`);
    return NextResponse.json({ ok: true });
  }

  if (intent === 'unknown') {
    console.log(`[sms:webhook] unrecognized reply from=${phone} body=${rawBody}`);
    return NextResponse.json({ ok: true });
  }

  // Find the most recent session this phone is part of that is still
  // forming or already confirmed. Participant phones are stored
  // digits-only (see normalizePhone in lib/sms.ts).
  let sessionId: string | null = null;
  try {
    const snap = await adminDb()
      .collection('sessions')
      .where('participants', 'array-contains', phone)
      .where('status', 'in', ['forming', 'confirmed'])
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();
    if (!snap.empty) sessionId = snap.docs[0].id;
  } catch (err) {
    console.error('[sms:webhook] session lookup failed', err);
    return NextResponse.json({ ok: true });
  }

  if (!sessionId) {
    console.log(
      `[sms:webhook] no forming/confirmed session for phone=${phone} (reply=${rawBody})`,
    );
    return NextResponse.json({ ok: true });
  }

  try {
    await adminDb().collection('confirmations').add({
      sessionId,
      userId: phone,
      showedUp: intent === 'confirmed',
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(
      `[sms:webhook] recorded sessionId=${sessionId} phone=${phone} showedUp=${intent === 'confirmed'}`,
    );
  } catch (err) {
    console.error('[sms:webhook] confirmation write failed', err);
  }

  return NextResponse.json({ ok: true });
}
