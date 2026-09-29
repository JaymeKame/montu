/* Montu SMS bridge — outbound sends via Twilio.
 *
 * Server-only: never import from a 'use client' module.
 *
 * Env vars (see docs/sms-setup.md):
 *   TWILIO_SID    — Twilio Account SID
 *   TWILIO_TOKEN  — Twilio Auth Token
 *   TWILIO_FROM   — Twilio phone number to send from (E.164, e.g. +14155550123)
 *
 * If any of the three is unset, every send runs in STUB mode: the message is
 * console.logged and {stubbed: true} is returned. Builds and local dev work
 * without credentials; no real SMS ever goes out until the creds exist.
 *
 * The twilio SDK is imported lazily so a missing package does not break the
 * build in stub mode. Production deployments need `npm i twilio`.
 */

export interface SmsResult {
  stubbed: boolean;
  sid?: string;
  to?: string;
}

function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_SID?.trim() &&
      process.env.TWILIO_TOKEN?.trim() &&
      process.env.TWILIO_FROM?.trim(),
  );
}

/** Normalize a phone number to digits-only (E.164 without the plus).
 *  Use this whenever writing participant phones to Firestore so the
 *  inbound webhook can match `From` against them with array-contains. */
export function normalizePhone(raw: string): string {
  return (raw ?? '').replace(/\D/g, '');
}

/** Low-level send. Stubbed unless all three Twilio env vars are set. */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  if (!smsConfigured()) {
    console.log(`[sms:stub] to=${to} body=${body}`);
    return { stubbed: true, to };
  }

  // Lazy import: keeps the build green when the SDK isn't installed (stub mode).
  const { default: twilio } = await import('twilio');
  const client = twilio(process.env.TWILIO_SID!, process.env.TWILIO_TOKEN!);
  const message = await client.messages.create({
    to,
    from: process.env.TWILIO_FROM!,
    body,
  });
  console.log(`[sms] sent sid=${message.sid} to=${to}`);
  return { stubbed: false, sid: message.sid, to };
}

export interface SessionInviteOpts {
  game: string;
  /** Human-readable time, e.g. "Friday 8pm". */
  scheduledAt: string;
  /** Link to the session lobby page — the "room". Optional but preferred:
   *  the text is the rail (minimal copy), the link is where the night lives. */
  link?: string;
}

/** First touch: a matched squad invite for a player who never installed anything.
 *  Rail copy: minimal, warm, one link. The page does the rest. */
export async function sendSessionInvite(
  phone: string,
  { game, scheduledAt, link }: SessionInviteOpts,
): Promise<SmsResult> {
  const body =
    `Your ${game} squad is ready — ${scheduledAt}.` +
    (link ? ` Your lobby: ${link}` : '') +
    ` Reply YES to lock in your spot, or NO if you can't make it.`;
  return sendSms(phone, body);
}

/** Follow-up nudge before the session: are you still in? */
export async function sendConfirmationPrompt(
  phone: string,
  { game, link }: { game: string; link?: string },
): Promise<SmsResult> {
  const body =
    `${game} tonight — still in?` +
    (link ? ` ${link}` : '') +
    ` Reply YES to keep your spot or NO to free it up.`;
  return sendSms(phone, body);
}
