#!/usr/bin/env node
/* Export pending InZone creators to CSV.
 *
 * Queries Firestore collection `influencers` (project inzone-f93e4) for docs
 * where `status == 'pending'` — creators who applied via the hub signup flow
 * and were never followed up — and writes email, name/handle, social links,
 * and signup date to ./pending-creators.csv.
 *
 * DO NOT run this where you don't have the credential. This VM has no
 * service account. Run it on a machine where you can paste the
 * FIREBASE_SERVICE_ACCOUNT value from the deployed InZone Vercel
 * environment's env vars, e.g.:
 *
 *   cd ~/workspace/montu/creators
 *   FIREBASE_SERVICE_ACCOUNT='<paste the JSON from the InZone Vercel project env>' node scripts/export-pending-creators.js
 *
 * Needs the firebase-admin package: `npm install firebase-admin`
 */

const fs = require('fs');
const path = require('path');

const ENV_VAR = 'FIREBASE_SERVICE_ACCOUNT';
const PROJECT_ID = 'inzone-f93e4';
const OUT_FILE = path.join(__dirname, '..', 'pending-creators.csv');

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

// ── Fail fast on missing credentials ─────────────────────────────────
const raw = (process.env[ENV_VAR] || '').trim();
if (!raw) {
  fail(
    `ERROR: ${ENV_VAR} is not set.\n` +
      `\n` +
      `This script queries Firestore as a privileged service account, and the\n` +
      `credential lives in the deployed InZone Vercel environment (the\n` +
      `${ENV_VAR} env var on the InZone Vercel project, project inzone-f93e4).\n` +
      `This machine does not have it, and you should never store it anywhere\n` +
      `else. To run:\n` +
      `\n` +
      `  1. Open the InZone Vercel project -> Settings -> Environment Variables\n` +
      `  2. Copy the value of ${ENV_VAR} (raw JSON or base64)\n` +
      `  3. Run from ~/workspace/montu/creators:\n` +
      `\n` +
      `       FIREBASE_SERVICE_ACCOUNT='<paste from Vercel env>' node scripts/export-pending-creators.js\n` +
      `\n` +
      `   (Paste the value between the quotes; no spaces around the = sign.)\n`,
  );
}

let admin;
try {
  admin = require('firebase-admin');
} catch (e) {
  fail(
    `ERROR: the 'firebase-admin' package is not installed.\n` +
      `\n` +
      `Run this once from ~/workspace/montu/creators:\n` +
      `\n` +
      `    npm install firebase-admin\n` +
      `\n` +
      `Then re-run with ${ENV_VAR} set as shown above.`,
  );
}

// Same convention as inzone-games-phase0/lib/firebase-admin.ts:
// raw JSON string, or base64-encoded JSON.
let credentialJson;
try {
  credentialJson = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  const parsed = JSON.parse(credentialJson);
  if (!parsed.client_email || !parsed.private_key) throw new Error('missing client_email/private_key');
} catch (e) {
  fail(
    `ERROR: ${ENV_VAR} is set but does not look like valid service-account JSON (raw or base64).\n` +
      `Re-copy it from the InZone Vercel project env exactly as-is (no added whitespace),\n` +
      `then run again: FIREBASE_SERVICE_ACCOUNT='<paste from Vercel env>' node scripts/export-pending-creators.js`,
  );
}

function toDate(val) {
  if (!val) return null;
  if (typeof val.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function asString(v) {
  return typeof v === 'string' && v.trim() ? v.trim() : '';
}

// Join all plausible social fields into one pipe-separated cell.
// Known from the hub signup/application docs; unknown keys in
// `socials`/`socialLinks` objects are included verbatim.
function collectSocials(d) {
  const out = [];
  const push = (v) => {
    if (typeof v === 'string' && v.trim()) out.push(v.trim());
  };
  [
    'twitch', 'twitch_url', 'twitchUrl',
    'youtube', 'youtube_url', 'youtubeUrl',
    'tiktok', 'tiktok_url', 'tiktokUrl',
    'instagram', 'instagram_url', 'instagramUrl',
    'twitter', 'twitter_url', 'twitterUrl', 'x_url',
    'website', 'website_url', 'websiteUrl',
    'link', 'url',
  ].forEach((k) => push(d[k]));
  ['socials', 'socialLinks', 'links', 'platforms'].forEach((k) => {
    const v = d[k];
    if (Array.isArray(v)) v.forEach(push);
    else if (v && typeof v === 'object') Object.values(v).forEach(push);
  });
  return [...new Set(out)].join(' | ');
}

function csvCell(v) {
  const s = String(v == null ? '' : v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(credentialJson)),
      projectId: PROJECT_ID,
    });
  }
  const db = admin.firestore();

  const snap = await db.collection('influencers').where('status', '==', 'pending').get();

  const rows = [];
  snap.forEach((doc) => {
    const d = doc.data();
    // created/applied dates: the hub seeds applied_at (serverTimestamp),
    // date_created, and createdAt (ISO string) — take the first that parses.
    const created = toDate(d.applied_at) || toDate(d.date_created) || toDate(d.createdAt);
    rows.push({
      docId: doc.id,
      email: asString(d.email),
      name: asString(d.name),
      username: asString(d.username) || asString(d.displayName),
      socials: collectSocials(d),
      appliedAt: created ? created.toISOString() : '',
    });
  });

  // Oldest applications first (the ones waiting longest get reactivated first).
  rows.sort((a, b) => (a.appliedAt || '').localeCompare(b.appliedAt || ''));

  const header = ['doc_id', 'email', 'name', 'username', 'socials', 'applied_at'];
  const lines = [header.join(',')];
  rows.forEach((r) => {
    lines.push([r.docId, r.email, r.name, r.username, r.socials, r.appliedAt].map(csvCell).join(','));
  });
  fs.writeFileSync(OUT_FILE, lines.join('\n') + '\n', 'utf8');

  console.log(`Found ${rows.length} pending creator(s) in influencers (status == 'pending').`);
  console.log(`Wrote ${OUT_FILE}`);
  const withoutEmail = rows.filter((r) => !r.email).length;
  if (withoutEmail > 0) {
    console.log(`Note: ${withoutEmail} row(s) have no email — reactivation by DM via their socials.`);
  }
}

main().catch((e) => fail(`ERROR: export failed: ${e && e.message ? e.message : e}`));
