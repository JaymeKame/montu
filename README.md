# Montu web app (v1: gaming sessions)

Next.js App Router + TypeScript + Tailwind. Dark playful UI.

## Pages (Stream A, scaffolded here)

- `/` landing + intake form. POSTs JSON to `/api/intentions`.
- `/session/[id]` session detail. GETs `/api/sessions/[id]`, confirm button POSTs to `/api/sessions/[id]/confirm` with `{ userId, showedUp: true }`.
- `/creator` creator host pitch + interest form writing to Firestore collection `creator_interests` (`{ name, handle, email, audienceSize, game, createdAt }`) via the client SDK.

## Other streams' routes (already in this repo)

- `POST /api/intentions` (`app/api/intentions/route.ts`)
- `GET /api/sessions/[id]` (`app/api/sessions/[id]/route.ts`)
- `POST /api/sessions/[id]/confirm` (`app/api/sessions/[id]/confirm/route.ts`) — expects `{ userId, showedUp }`, idempotent on `(sessionId, userId)`
- `app/api/sessions/route.ts`, `app/api/sms/webhook/route.ts`, `/admin` page

Shared helpers: `lib/firebase-admin.ts`, `lib/protocol.ts` (Session, Intention, Confirmation types).

## Run locally

```bash
cd ~/workspace/montu
cp .env.local.example .env.local   # fill in Firebase web config
npm install
npm run dev                        # http://localhost:3000
npm run build && npm start          # production smoke test
```

Set `NEXT_PUBLIC_FIREBASE_EMULATOR=1` to point auth + Firestore at local emulators (auth on :9099, Firestore on :8080).

## Deploy to Vercel

```bash
cd ~/workspace/montu
vercel                        # or: import the repo in the Vercel dashboard
```

Set these env vars in the Vercel project (Settings > Environment Variables):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `FIREBASE_SERVICE_ACCOUNT` (JSON string for the admin SDK, needed by the API routes)

No custom build settings needed: the framework preset (Next.js) picks up `npm run build`. For the Firebase web config values, use the same InZone Firebase project web app values.

## Copy rule (no em dashes) — all user-facing copy is play-first:
play, squads, game nights. Never "commitment network", "reliability", "accountability", or duty language.
