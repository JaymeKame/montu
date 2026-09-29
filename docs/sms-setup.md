# Montu messaging architecture — the rail and the room

Montu's user experience is split into two surfaces, on purpose:

- **The rail: traditional SMS via Twilio.** Reaches every phone on earth,
  zero install, zero account. Copy stays minimal — one warm line plus a link.
  The text never tries to *be* the experience; it points at it.
- **The room: the session web page.** No-install, tap-and-you're-in — the
  scooter model (Lime/Bird: no app store, the web page IS the product).
  Countdown, squad, how-to-join details, "I played". This is where the night
  feels like belonging.

iMessage app extensions are **explicitly deferred**: they need a native iOS
app, are Apple-only, and add nothing to v1. The 10-year leap lives in AI
assembly plus the room feeling like belonging — not in the transport.

**Current status: STUBBED.** `sendSms` console.logs and returns
`{stubbed: true}` until all three Twilio env vars are set. Nothing can send a
real SMS before that. Jayme adds the creds in the Vercel project environment.

## Env vars

| Var | What | Where to get it |
|---|---|---|
| `TWILIO_SID` | Twilio Account SID | Twilio Console → Account Info (console.twilio.com) |
| `TWILIO_TOKEN` | Twilio Auth Token | Twilio Console → Account Info (click "show") |
| `TWILIO_FROM` | Sending phone number, E.164 (`+14155550123`) | Twilio Console → Phone Numbers → Buy a number (SMS-capable, US long code is fine for v1) |

Add all three in **Vercel → Project Settings → Environment Variables**
(Production + Preview). Local dev uses `.env.local` — keep creds out of git.

## Webhook configuration

In Twilio Console → Phone Numbers → [your number] → Messaging:

- **A message comes in**: `Webhook`, method `HTTP POST`
- **URL**: `https://<your-vercel-domain>/api/sms/webhook`

Any non-2xx response makes Twilio retry, so the route always returns 200 —
unknown numbers and unrecognized replies are logged, not errored.

## Firestore wiring

The webhook needs a Firebase Admin credential to read `sessions` and write
`confirmations`:

| Var | What |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Service-account JSON (raw or base64) |
| `FIREBASE_PROJECT_ID` | Firebase project id (optional; falls back to the cert's project) |

Add in Vercel env the same way as the Twilio vars.

**Composite index needed:** the session lookup filters
`participants array-contains <phone>` + `status in [forming, confirmed]` +
`orderBy(updatedAt desc)`. On first webhook hit Firestore will log an index
creation link; create it (or pre-create it in Firebase Console →
Firestore → Indexes).

## Dependencies

Production needs (add to `montu/package.json`):

```
npm i twilio firebase-admin
```

Both are lazy/guarded so the build and local dev work without them while
stubbed.

## Rail copy rules

`lib/sms.ts` owns the rail copy. Rules:

- Minimal copy + the lobby link. The text is a tap, not a paragraph.
- The link goes to the session room (`/session/[id]`) — never a bare prompt.
- Invite: `Your {game} squad is ready — {time}. Your lobby: {link} Reply YES to lock in your spot, or NO if you can't make it.`
- Pre-game nudge: `{game} tonight — still in? {link} Reply YES to keep your spot or NO to free it up.`
- YES/NO replies feed `/api/sms/webhook` → `confirmations`.

## Reply vocabulary

- **YES / YEAH / YUP / CONFIRM** → `showedUp: true`
- **NO / NAH / CANCEL** → `showedUp: false`
- Anything else → ignored (logged), no retry

## Participant phone format

Store participant phones in `sessions[].participants` **digits-only**
(no `+`, no dashes) via `normalizePhone()` from `lib/sms.ts`. The webhook
matches Twilio's `From` the same way — mixed formats won't match.

## Going live checklist

1. Twilio number bought, SMS-capable.
2. All three `TWILIO_*` vars set in Vercel (production).
3. `FIREBASE_SERVICE_ACCOUNT` set in Vercel.
4. Webhook URL configured on the number, POST to `/api/sms/webhook`.
5. Text the number "YES" — confirm a `confirmations` doc appears in Firestore.
6. Send a test invite to yourself; tap the link — the room page should load
   with no install and no sign-in wall.
7. Check Twilio debugger for any delivery errors after first real send.
