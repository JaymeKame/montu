/* Server-only Firebase Admin init. NEVER import this from a 'use client' module.
 *
 * Copied from ~/workspace/inzone-games-phase0/lib/firebase-admin.ts (credential
 * convention only — the unity-hub storage import/helper is intentionally NOT
 * carried over; Montu does not need the Unity bundles bucket).
 *
 * Credentials: set FIREBASE_SERVICE_ACCOUNT to the service-account JSON (raw or
 * base64) in the server environment (Vercel project env / .env.local — NOT
 * NEXT_PUBLIC_*, so it never reaches the browser). Falls back to Application
 * Default Credentials when unset. Same Firebase Admin service account as the
 * InZone tooling, project inzone-f93e4.
 */

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let cached: App | undefined;

/** True when explicit admin credentials are configured. Routes should
 *  fail FAST (503) when this is false — applicationDefault() on a non-GCP
 *  machine stalls for seconds probing the GCE metadata server before
 *  erroring, which is what makes dependent pages hang. */
export function adminCredentialsConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT?.trim() ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim(),
  );
}

function adminApp(): App {
  if (cached) return cached;
  if (getApps().length) {
    cached = getApps()[0];
    return cached;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  const credential = raw
    ? cert(JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')))
    : applicationDefault();
  cached = initializeApp({ credential, projectId: 'inzone-f93e4' });
  return cached;
}

export function adminAuth(): Auth {
  return getAuth(adminApp());
}

export function adminDb(): Firestore {
  return getFirestore(adminApp());
}
