/**
 * Game key art: Steam CDN header images for known titles, with a graceful
 * stylized fallback for everything else (deterministic gradient + initial).
 *
 * Every night/lobby page must LOOK like the game being offered — this is
 * what makes a shared link feel like an event, not a form.
 */

const STEAM_CDN = 'https://cdn.akamai.steamstatic.com/steam/apps';
/** hero_capsule.jpg = 616x353, the right shape for a page banner. */
const HERO_CAPSULE = 'hero_capsule.jpg';

/** Normalized title -> Steam app ID. Normalized = lowercase, alphanumerics only. */
const APP_IDS: Record<string, number> = {
  callofduty: 1938090, // Call of Duty HQ launcher
  warzone: 1938090,
  modernwarfare: 1938090,
  counterstrike2: 730,
  cs2: 730,
  counterstrike: 730,
  dota2: 570,
  dota: 570,
  apexlegends: 1172470,
  apex: 1172470,
  overwatch2: 2357570,
  overwatch: 2357570,
  rainbowsixsiege: 359550,
  r6: 359550,
  rainbowsix: 359550,
  deadbydaylight: 381210,
  dbd: 381210,
  gtav: 271590,
  gta5: 271590,
  grandtheftauto5: 271590,
  grandtheftautoonline: 271590,
  eldenring: 1245620,
  helldivers2: 553850,
  helldivers: 553850,
  destiny2: 1085660,
  destiny: 1085660,
  warframe: 230410,
  valheim: 892970,
  rust: 252490,
  deeprockgalactic: 548430,
  drg: 548430,
  phasmophobia: 739630,
  lethalcompany: 1966720,
  stardewvalley: 413150,
  stardew: 413150,
  terraria: 105600,
  baldursgate3: 1086940,
  bg3: 1086940,
  pubg: 578080,
  playerunknownsbattlegrounds: 578080,
  teamfortress2: 440,
  tf2: 440,
  pathofexile: 238960,
  poe: 238960,
  pathofexile2: 2694490,
  newworld: 1062090,
  lostark: 1599340,
  rocketleague: 252950,
  rl: 252950,
  amongus: 945360,
  fallguys: 1097150,
  rivals: 2767030, // Marvel Rivals
  marvelrivals: 2767030,
  thefinals: 2073850,
  fragpunk: 2943650,
  deltaforce: 2507950,
  oncehuman: 2139460,
  throneandliberty: 2429640,
};

/** Short-hands and common spellings -> canonical normalized key. */
const ALIASES: Record<string, string> = {
  cod: 'callofduty',
  wz: 'warzone',
  lol: 'leagueoflegends',
  tft: 'teamfighttactics',
  r6siege: 'rainbowsixsiege',
  gta: 'gtav',
  ow2: 'overwatch2',
  ow: 'overwatch2',
  mc: 'minecraft',
  fortniteog: 'fortnite',
};

export function normalizeGame(name: string): string {
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ALIASES[n] ?? n;
}

/** Resolve a Steam app ID for a free-text title. Exact/alias match first,
 *  then longest-substring match so "Call of Duty: Warzone" still lands on
 *  the Call of Duty HQ art. Short keys (<4 chars) only match exactly. */
export function resolveAppId(game: string): number | undefined {
  const norm = normalizeGame(game);
  if (APP_IDS[norm] !== undefined) return APP_IDS[norm];
  const keys = Object.keys(APP_IDS).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (k.length >= 4 && norm.includes(k)) return APP_IDS[k];
  }
  return undefined;
}

export interface GameArt {
  /** Steam CDN URL when the title is known; undefined otherwise. */
  src?: string;
  /** Deterministic fallback hue (0-359) derived from the title. */
  hue: number;
  /** Fallback initial for the stylized tile. */
  initial: string;
  /** The original title, trimmed. */
  label: string;
}

export function gameArt(game: string): GameArt {
  const label = game.trim() || 'Game night';
  const norm = normalizeGame(label);
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = (hash * 31 + norm.charCodeAt(i)) % 360;
  }
  const art: GameArt = {
    hue: hash,
    initial: (label[0] ?? 'M').toUpperCase(),
    label,
  };
  const appId = resolveAppId(label);
  if (appId !== undefined) {
    art.src = `${STEAM_CDN}/${appId}/${HERO_CAPSULE}`;
  }
  return art;
}
