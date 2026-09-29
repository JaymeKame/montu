# Montu v1 — Hexclave Campaign Plan (Stream E)

**Status: PLAN ONLY.** No spend switch, pause, launch, or budget change has been approved.
All budgets below are PLACEHOLDERS for Jayme to set. Nothing in this doc has been executed.

**Last reviewed:** 2026-09-28 (read-only)

---

## 1. What "Hexclave campaign setup" actually is — read-only review

Important correction for the whole stream plan:

**Hexclave is an analytics + session-replay platform, not a programmatic ad network.**
Its API (per `~/workspace/skills/hexclave/SKILL.md`) exposes only:

- `POST /api/v1/analytics/query` — ClickHouse analytics queries over site events
- `GET /api/v1/session-replays` — session replays and rrweb events

There are no campaigns, ad sets, ads, budgets, or spend objects in the Hexclave API,
and the skill's CLI (`~/workspace/skills/hexclave/bin/hx.py`) only wraps the two
endpoints above. **"Switch his Hexclave ad spend to Montu" is not a real action —
there is no Hexclave ad spend to switch.** Actual spend runs on TikTok Ads / Meta
Ads; Hexclave records UTM/campaign attribution for arrivals from those platforms
(prior InZone review: TikTok `tiktok_games_01` drove 2,657 arrival events / 1,597
users in 7 days; Meta `games_02` and `solo_social_01` were small — see memory
2026-09-26).

Skill/tooling health at review time:

- The skill's `hx.py` analytics path returned `401 INVALID_SECRET_SERVER_KEY` for
  the InZone production project (`463bba54-7ccd-4570-acb7-0dc8f5123e7e`).
- Per prior investigation (memory 2026-09-26) and re-verified live 2026-09-28,
  the `npx @hexclave/cli` OAuth login flow works and returns live analytics
  rows against the production project, so Hexclave UTM/campaign attribution
  is readable for measurement. The stored secret-server-key path is not needed.
- Bottom line: the skill **cannot show live campaign/ad-set/spend state** because
  Hexclave does not hold that state. This plan therefore targets the real ad
  platforms (TikTok Ads, Meta Ads) and treats Hexclave as measurement +
  matching-intelligence infrastructure.

### What is currently "running" for ads (verified read-only, 2026-09-28)

- **Montu has no ad campaigns anywhere yet.** Nothing Montu-shaped is driving
  arrivals. This is a greenfield plan.
- The InZone production Hexclave project **is still receiving paid arrivals
  right now** — last 7 days `campaign_arrival` events (live pull 2026-09-28):
  `tiktok_games_01` = 9,076 events; `games_02` = 69; `solo_social_01` = 3.
  These are InZone-era TikTok campaigns still driving traffic. Hexclave records
  **attribution only** — no spend, impressions, CTR, or budget figures exist in
  Hexclave; those live in TikTok Ads / Meta Ads Managers.
- Montu v1 product surface for ads to point at: the intake page at `/`
  (landing + intention form), built 2026-09-28. Fields: name, game, when, vibe
  (chill / casual / competitive), roles, phone number (SMS bridge for
  app-less matching). Preset games: Valorant, League of Legends, Rocket League,
  Apex Legends, Minecraft, Fortnite.

---

## 2. Objective

Drive **declared gaming-session intentions** for the Montu v1 experiment:

> "Say what you want to play. Get matched. Play."

The conversion event is an **intention declared**: a visitor submits the intake
form (name + game + when + vibe + phone). Not installs, not signups, not
pageviews. The funnel after the form is: match proposed → both confirm
(mutual accept) → session happens → would-do-again.

Montu's day-1 metric set (per the product plan): **matches proposed, mutual
accepts, sessions completed, would-do-again.** Confirm rate = mutual accepts /
matches proposed. The ads plan inherits these, not vanity CTR.

---

## 3. Ad-set architecture: gaming LFG intentions + ad-pairing

### 3a. Ad sets (TikTok Ads primary; Meta Ads secondary)

Three base sets, each mapped to a Montu vibe so the match pool segments itself:

| Set | Target intent | Vibe label | Creative angle |
|-----|---------------|------------|----------------|
| **LFG-Chill** | "Looking for group" / casual gaming interests; chill-coop audiences (Minecraft, cozy, couch-coop-adjacent); gaming Discord-adjacent audiences | Chill | "Good vibes only squads, no grind" |
| **LFG-Casual** | Title-specific communities: Valorant, Fortnite, Apex Legends, Rocket League, CoD players; casual/fun-first players | Casual | "Fun first, a little spicy — find your squad tonight" |
| **LFG-Competitive** | Ranked/grind audiences (Valorant ranked, LoL, RL ranked); competitive Discord servers; esports-adjacent | Competitive | "We play to win — matched with players at your level" |

Copy rule: **fun-first language only, no duty talk** (per Montu's voice). Never
promise a category ("commitment network"); promise the session.

### 3b. Ad-pairing (the core move)

Sets are not independent — they feed each other's match pool. Pair every
"seeker" set with a complementary "filler" set so neither side runs dry:

1. **Solo-queue seekers ↔ role fills.** Set A recruits people who want a squad
   (e.g., "need 2 more for Valorant tonight"); Set B recruits people looking to
   fill specific roles (e.g., "duelist/sentinel LFG, any squad"). Together they
   complete squads instead of stacking one side.
2. **Hosts ↔ joiners.** One set recruits natural hosts/shotcallers ("run a game
   night, we fill your lobby"); the other recruits joiners. Hosts seed week-1
   guaranteed crews alongside Jayme's gaming-contacts host crews.
3. **Game-agnostic chill ↔ title-specific spikes.** The Chill set is
   game-agnostic and always on (it absorbs anyone); title-specific sets pulse
   around releases/events. The chill pool is the backstop when a title set
   can't form a full squad — re-route unmatched intentions there before they
   expire.

Pairing rule: **every set launched must have its complement launched.**
A seeker set without its filler set is a matched-nobody factory and must be
paused (see iteration loop).

### 3c. Attribution contract (Hexclave's actual job)

- Every ad gets UTM `utm_source` (tiktok|meta), `utm_campaign` (set slug),
  `utm_content` (creative variant), `utm_medium` (paid-social).
- Hexclave analytics attributes intake submissions back to campaign/set/creative
  so the weekly loop can read what converts. (Same pattern the InZone TikTok
  pull used: Hexclave-side attribution, no spend data in Hexclave itself.)
- Session replays of the intake form feed creative fixes (which fields kill the
  submit?).
- Intention records carry the UTM triple so matching quality can be cut by
  acquisition source later (do cheap-click users actually show up?).

---

## 4. Budgets — PLACEHOLDERS, NOT SET

Jayme sets these. Nothing below has been approved or executed.

| Line | Placeholder | Notes |
|------|-------------|-------|
| Daily cap, v1 test phase | **[DAILY_BUDGET]** | Recommend a tight 7-day test envelope: 3 sets x 2 creatives; enough to learn, small enough to kill. |
| TikTok Ads : Meta Ads split | **[SPLIT]** | TikTok primary per InZone playbook; Meta secondary. |
| Per-set allocation | **[PER_SET]** | Equal splits for week 1 (paired sets need both sides funded); re-weight week 2 by confirm rate. |
| Total v1 test envelope | **[TOTAL_TEST]** | Bounded test budget, not open-ended spend. |

No budgets exist in Hexclave; when approved, budgets are set in TikTok Ads /
Meta Ads Managers, not in any Hexclave surface.

---

## 5. Success metrics + weekly iteration loop

### Primary (the only numbers that matter)

1. **Intentions declared** — intake form submissions (per set, per creative).
2. **Matches proposed** — intentions converted into a squad proposal.
3. **Confirm rate** — mutual accepts / matches proposed.
4. **Sessions completed** — squads that actually played.
5. **Would-do-again** — post-session sentiment (the retention signal).

### Derived (diagnostics, not goals)

- Cost per intention declared (per set).
- Intention → match-proposed rate (match-pool health; low = broken pairing).
- Show-up rate (sessions completed / mutual accepts; low = vibe mismatch).

### Weekly iteration loop (InZone playbook)

1. **Read:** every Monday, cut the 5 primaries by set × creative in Hexclave.
   Read to the *session*, not the click: a creative with cheap intentions and
   zero confirms is a failure, not a bargain.
2. **Kill:** any set under **[CPL_CAP]** intentions-to-confirms threshold for 2
   consecutive weeks gets paused; its budget re-allocates to the best-paired set.
3. **Scale:** the set with the best confirm rate earns the re-allocated budget
   (max **[MAX_SCALE_MULT]** per week — never 10x a winning set overnight).
4. **Fix:** if intention volume is fine but confirms are low, fix pairing
   (launch the missing complement set) or the SMS bridge, not the ads.
5. **Report:** one consolidated message per week — what converted, what got
   killed, what the match pool looks like.

Note: ad-pairing makes a set's health a *joint* property. Never kill one half of
a pair without deciding the fate of the other.

---

## 6. Switchover checklist — for when Jayme approves (DO NOT EXECUTE YET)

No part of this has been done. When Jayme gives the explicit go:

- [ ] **Confirm the spend decision explicitly:** which platforms (TikTok Ads,
  Meta Ads), daily cap, total test envelope, duration. Budgets are his call.
- [ ] **Inventory InZone-era ad state:** list every currently-active TikTok Ads
  / Meta Ads campaign and budget (read-only, via those platforms' surfaces —
  Hexclave cannot do this).
- [ ] **Pause decision:** per campaign, PAUSE (InZone gaming traffic no longer
  relevant) or KEEP (still useful). No campaign gets retargeted to Montu
  without Jayme naming it — creative and audiences are InZone-shaped.
- [ ] **Montu ads manager setup:** new campaign containers per Section 3
  (LFG-Chill, LFG-Casual, LFG-Competitive + complements), fresh creatives in
  Montu voice, fresh landing URL (the intake page).
- [ ] **UTM contract:** every ad tagged per Section 3c before launch; verify one
  test click lands in Hexclave with the right attribution.
- [ ] **SMS bridge check:** intake form's phone capture + SMS delivery working,
  since a large share of matched users never install anything.
- [ ] **Matching capacity check:** the matching pipeline (manual/semi-manual
  for v1) can absorb the first week of intention volume at the approved budget.
  No spend without a human or system ready to match.
- [ ] **Kill switches:** pre-agree the weekly kill thresholds (Section 5) so
  pausing a loser is execution, not a new decision.
- [ ] **Launch:** flip the switch. Report back: live URLs, first Hexclave
  attribution rows, first 48h of intentions.

---

## 7. Open questions for Jayme (batch, per throughput rule — NOT blockers)

1. Daily cap + total v1 test envelope (the **[PLACEHOLDERS]** above).
2. TikTok Ads vs Meta Ads split — TikTok primary is the recommendation; does
   that hold?
3. Which (if any) existing InZone-era campaigns pause vs keep when Montu spend
   starts?
4. Is the intake page's `/api/intentions` + SMS bridge end-to-end working
   enough to take paid traffic? (Stream C/D's domain — confirm before launch.)
