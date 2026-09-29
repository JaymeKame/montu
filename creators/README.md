# Montu creator reactivation

Creator outreach for Montu v1 lives here. Creators are the growth engine:
they host game nights and bring their audiences. The warmest list is the
InZone `influencers` Firestore collection - creators who applied via the
hub signup flow and were never followed up ("you applied, we finally
built the thing").

## Export the pending list

`scripts/export-pending-creators.js` queries the `influencers` collection
(project `inzone-f93e4`) for every doc with `status == 'pending'` and
writes a CSV with one row per creator.

Field shapes come from the read-only reference
`~/workspace/inzone-games-phase0/lib/creators.ts` (the hub seeds the
application docs with `status: 'pending'`, `applicationStatus: 'pending'`,
`applied_at`, `date_created`, `createdAt`, plus `email`, `name`,
`username`, and social fields).

### Credential - `FIREBASE_SERVICE_ACCOUNT`

The script authenticates as the InZone Firebase Admin service account.
The value is set on the deployed **InZone Vercel project** as the
`FIREBASE_SERVICE_ACCOUNT` env var (raw JSON or base64 - same convention
as `inzone-games-phase0/lib/firebase-admin.ts`). The dev VM does not have
it. Do not store it in a file or commit it anywhere.

### How to run (on any machine where you can paste the value)

```sh
cd ~/workspace/montu/creators
npm install firebase-admin   # once
FIREBASE_SERVICE_ACCOUNT='<paste the value from the InZone Vercel project env>' node scripts/export-pending-creators.js
```

The script refuses to start without the env var and prints these same
instructions. It also fails fast if `firebase-admin` is not installed.

### Output

`./pending-creators.csv` (next to this README), columns:

| column     | source |
|------------|--------|
| `doc_id`   | Firestore doc id |
| `email`    | `email` field (may be empty on some docs) |
| `name`     | `name` field |
| `username` | `username` (fallback `displayName`) |
| `socials`  | all social handles/URLs found on the doc, joined with ` \| ` |
| `applied_at` | earliest of `applied_at`, `date_created`, `createdAt`, ISO |

Rows are sorted oldest-first (longest-waiting first). Rows with no email
are flagged on stdout - reach those creators via their socials.

## Reactivation email

`reactivation-email-draft.md` is the first-touch draft for pending
creators. **DRAFT ONLY - NEVER SEND without Jayme's exact-text approval.**
