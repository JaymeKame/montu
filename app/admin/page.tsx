/**
 * /admin — concierge matching view.
 *
 * GATE: this page is protected by a shared secret. Set ADMIN_SECRET in the
 * server environment and visit /admin?key=<ADMIN_SECRET>. If the query param
 * is missing or wrong (or ADMIN_SECRET is unset), the page renders
 * "unauthorized" — the secret never reaches the browser. FAIL CLOSED.
 *
 * Utilitarian tool: pick open intentions, choose a game + date/time, hit
 * "Create session" to POST /api/sessions. Interactions run in a small inline
 * script so this page stays a single file (no client-component module).
 */

import { adminCredentialsConfigured, adminDb } from '@/lib/firebase-admin';
import type { Intention, JoinInfo, Night, NightRsvp } from '@/lib/protocol';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

function getKey(sp: SearchParams): string | undefined {
  const k = sp?.key;
  return Array.isArray(k) ? k[0] : k;
}

async function loadOpenIntentions(): Promise<Intention[]> {
  const snap = await adminDb()
    .collection('intentions')
    .where('status', '==', 'open')
    .get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Intention, 'id'>) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

interface NightWithRsvps extends Night {
  rsvps: NightRsvp[];
}

async function loadNights(): Promise<NightWithRsvps[]> {
  const db = adminDb();
  const snap = await db
    .collection('nights')
    .where('status', 'in', ['open', 'assembling'])
    .get();
  const nights: NightWithRsvps[] = [];
  for (const d of snap.docs) {
    const rsvpSnap = await d.ref.collection('rsvps').orderBy('joinedAt', 'asc').get();
    nights.push({
      id: d.id,
      ...(d.data() as Omit<Night, 'id'>),
      rsvps: rsvpSnap.docs.map((r) => ({ id: r.id, ...(r.data() as Omit<NightRsvp, 'id'>) })),
    });
  }
  return nights.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

/** Convert an ISO datetime to the "YYYY-MM-DDTHH:MM" shape datetime-local wants. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* Plain JS (no backticks / ${} inside — it's embedded via dangerouslySetInnerHTML). */
const clientScript = `
(function () {
  var btn = document.getElementById('create-session');
  var result = document.getElementById('result');
  var gameInput = document.getElementById('game');
  var timeInput = document.getElementById('scheduled-at');

  function syncGame() {
    var checked = Array.prototype.slice.call(document.querySelectorAll('.intention-check:checked'));
    var games = {};
    checked.forEach(function (c) { games[c.getAttribute('data-game')] = true; });
    var names = Object.keys(games);
    if (names.length === 1 && !gameInput.value) gameInput.value = names[0];
  }
  document.querySelectorAll('.intention-check').forEach(function (c) {
    c.addEventListener('change', syncGame);
  });

  btn.addEventListener('click', function () {
    var ids = Array.prototype.slice
      .call(document.querySelectorAll('.intention-check:checked'))
      .map(function (c) { return c.getAttribute('data-id'); });
    var scheduledAt = timeInput.value;
    if (ids.length === 0) { result.textContent = 'Pick at least one intention.'; return; }
    if (!scheduledAt) { result.textContent = 'Pick a date and time.'; return; }

    btn.disabled = true;
    result.textContent = 'Creating session…';
    fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intentionIds: ids, scheduledAt: new Date(scheduledAt).toISOString() }),
    })
      .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, body: j }; }); })
      .then(function (r) {
        if (!r.ok) { result.textContent = 'Error: ' + (r.body.error || 'unknown'); btn.disabled = false; return; }
        result.textContent = 'Session created: ' + r.body.id + ' — reloading…';
        setTimeout(function () { window.location.reload(); }, 800);
      })
      .catch(function (e) { result.textContent = 'Error: ' + e.message; btn.disabled = false; });
  });

  // Night assembly: one button per night posts {nightId, scheduledAt, joinInfo}.
  Array.prototype.forEach.call(document.querySelectorAll('.assemble-night'), function (abtn) {
    abtn.addEventListener('click', function () {
      var nightId = abtn.getAttribute('data-night-id');
      var nresult = document.getElementById('night-result-' + nightId);
      var scheduledAt = document.getElementById('ni-time-' + nightId).value;
      var lobbyCode = document.getElementById('ni-lobby-' + nightId).value.trim();
      var partyLink = document.getElementById('ni-party-' + nightId).value.trim();
      var voiceLink = document.getElementById('ni-voice-' + nightId).value.trim();
      var joinInfo = {};
      if (lobbyCode) joinInfo.lobbyCode = lobbyCode;
      if (partyLink) joinInfo.partyLink = partyLink;
      if (voiceLink) joinInfo.voiceLink = voiceLink;
      var payload = { nightId: nightId };
      if (scheduledAt) payload.scheduledAt = new Date(scheduledAt).toISOString();
      if (Object.keys(joinInfo).length > 0) payload.joinInfo = joinInfo;

      abtn.disabled = true;
      nresult.textContent = 'Assembling squad…';
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (res) { return res.json().then(function (j) { return { ok: res.ok, body: j }; }); })
        .then(function (r) {
          if (!r.ok) { nresult.textContent = 'Error: ' + (r.body.error || 'unknown'); abtn.disabled = false; return; }
          nresult.textContent = 'Squad assembled: session ' + r.body.id + ' — reloading…';
          setTimeout(function () { window.location.reload(); }, 800);
        })
        .catch(function (e) { nresult.textContent = 'Error: ' + e.message; abtn.disabled = false; });
    });
  });
})();
`;

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const secret = process.env.ADMIN_SECRET;
  const key = getKey(searchParams);
  if (!secret || key !== secret) {
    return (
      <main className="p-8">
        <p>unauthorized</p>
      </main>
    );
  }

  if (!adminCredentialsConfigured()) {
    return (
      <main className="p-8">
        <h1 className="text-xl font-bold">Montu concierge</h1>
        <p className="mt-4 text-red-600">
          Server not configured: FIREBASE_SERVICE_ACCOUNT is missing.
        </p>
      </main>
    );
  }

  const intentions = await loadOpenIntentions();
  const nights = await loadNights();

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">Montu concierge</h1>

      {/* ── Game nights ── */}
      <section className="mt-8">
        <h2 className="text-lg font-bold">
          Game nights <span className="text-sm font-normal text-gray-500">({nights.length})</span>
        </h2>
        {nights.length === 0 && (
          <p className="mt-2 text-sm text-gray-500">No nights waiting to be assembled.</p>
        )}
        <div className="mt-4 space-y-4">
          {nights.map((n) => (
            <div key={n.id} className="border rounded p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">
                    {n.game} <span className="font-normal text-gray-500">with {n.hostName}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {new Date(n.scheduledAt).toLocaleString()} · {n.rsvps.length}/{n.squadSize} seats
                    {n.vibe ? ` · ${n.vibe}` : ''}
                    {n.notes ? ` · ${n.notes}` : ''}
                  </div>
                  <div className="text-xs text-gray-400">
                    /n/{n.code} · status: {n.status}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                    n.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {n.status}
                </span>
              </div>

              {n.rsvps.length > 0 ? (
                <ul className="mt-3 space-y-1">
                  {n.rsvps.map((r) => (
                    <li key={r.id} className="text-sm">
                      <span className="font-medium">{r.name}</span>{' '}
                      <span className="text-gray-400">{r.phone}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-gray-500">No RSVPs yet.</p>
              )}

              {n.status === 'open' && n.rsvps.length > 0 && (
                <div className="mt-4 border-t pt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium" htmlFor={`ni-time-${n.id}`}>
                        Game time (defaults to the night's time)
                      </label>
                      <input
                        id={`ni-time-${n.id}`}
                        type="datetime-local"
                        defaultValue={toLocalInput(n.scheduledAt)}
                        className="mt-1 border rounded px-3 py-2 w-full text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium" htmlFor={`ni-lobby-${n.id}`}>
                        Lobby code
                      </label>
                      <input
                        id={`ni-lobby-${n.id}`}
                        type="text"
                        defaultValue={n.joinInfo?.lobbyCode ?? ''}
                        placeholder="e.g. MONTU-8PM"
                        className="mt-1 border rounded px-3 py-2 w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium" htmlFor={`ni-party-${n.id}`}>
                        Party invite link
                      </label>
                      <input
                        id={`ni-party-${n.id}`}
                        type="text"
                        defaultValue={n.joinInfo?.partyLink ?? ''}
                        placeholder="https://…"
                        className="mt-1 border rounded px-3 py-2 w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium" htmlFor={`ni-voice-${n.id}`}>
                        Voice / Discord invite
                      </label>
                      <input
                        id={`ni-voice-${n.id}`}
                        type="text"
                        defaultValue={n.joinInfo?.voiceLink ?? ''}
                        placeholder="https://…"
                        className="mt-1 border rounded px-3 py-2 w-full text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="assemble-night bg-black text-white rounded px-5 py-2.5 disabled:opacity-50"
                    data-night-id={n.id}
                  >
                    Assemble squad ({n.rsvps.length} players)
                  </button>
                  <p id={`night-result-${n.id}`} className="text-sm text-gray-700" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Generic intentions ── */}
      <section className="mt-10 border-t pt-8">
      <h2 className="text-lg font-bold">Open intentions</h2>
      <p className="text-sm text-gray-600 mt-1">
        {intentions.length} open {intentions.length === 1 ? 'intention' : 'intentions'}
      </p>

      <div className="mt-6 space-y-2">
        {intentions.length === 0 && (
          <p className="text-gray-500">Nothing waiting to be matched.</p>
        )}
        {intentions.map((i) => (
          <label
            key={i.id}
            className="flex items-start gap-3 border rounded p-3 cursor-pointer hover:bg-gray-50"
          >
            <input
              type="checkbox"
              className="intention-check mt-1"
              data-id={i.id}
              data-game={i.game}
            />
            <div className="text-sm">
              <div className="font-semibold">
                {i.name} <span className="font-normal text-gray-500">wants {i.game}</span>
              </div>
              <div className="text-gray-600">
                {i.when}
                {i.vibe ? ` · ${i.vibe}` : ''}
                {i.roles ? ` · ${i.roles}` : ''}
              </div>
              <div className="text-gray-400 text-xs">
                {i.phone ?? 'no phone'} · {i.createdAt}
              </div>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-6 border-t pt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium" htmlFor="game">
            Game
          </label>
          <input
            id="game"
            type="text"
            placeholder="e.g. Valorant"
            className="mt-1 border rounded px-3 py-2 w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="scheduled-at">
            Date and time
          </label>
          <input
            id="scheduled-at"
            type="datetime-local"
            className="mt-1 border rounded px-3 py-2 w-full"
          />
        </div>
        <button
          id="create-session"
          className="bg-black text-white rounded px-5 py-2.5 disabled:opacity-50"
        >
          Create session
        </button>
        <p id="result" className="text-sm text-gray-700" />
      </div>
      </section>

      <script dangerouslySetInnerHTML={{ __html: clientScript }} />
    </main>
  );
}
