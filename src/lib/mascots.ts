// Mascots that react to the tightest remaining limit.
// Frames are pre-rendered from voxel models by `pnpm mascots:render` (scripts/render-mascots.mjs).

export type MascotId = "match" | "dev" | "wallet";
export type MascotMood = "plenty" | "low" | "out";
export type MascotStyle = "voxel" | "pixel";

export const MASCOT_IDS: readonly MascotId[] = ["match", "dev", "wallet"];
export const MASCOT_STYLES: readonly MascotStyle[] = ["voxel", "pixel"];
export const MASCOT_MOODS: readonly MascotMood[] = ["plenty", "low", "out"];
export const MASCOT_FRAME_COUNT = 2;
export const DEFAULT_MASCOT: MascotId = "dev";
export const DEFAULT_MASCOT_STYLE: MascotStyle = "voxel";

/** Below this much left the mascot starts to panic. */
export const LOW_THRESHOLD_PCT = 30;

const NAMES: Record<MascotId, string> = {
  match: "Matchstick",
  dev: "Burnout dev",
  wallet: "Wallet",
};

const STYLE_NAMES: Record<MascotStyle, string> = {
  voxel: "Voxel",
  pixel: "8-bit",
};

const QUIPS: Record<MascotId, Record<MascotMood, string>> = {
  match: {
    plenty: "Striking distance.",
    low: "Lit. Literally.",
    out: "Burnt out. Classic match.",
  },
  dev: {
    plenty: "Shipping. Hydrated. Smug.",
    low: "Hair on fire. Standup in 5.",
    out: "Died doing what they loved.",
  },
  wallet: {
    plenty: "Fat stacks. For now.",
    low: "Money go brrr (on fire).",
    out: "Only moths left.",
  },
};

const FRAMES = import.meta.glob<string>("../assets/mascots/*.png", {
  eager: true,
  import: "default",
  query: "?url",
});

export function mascotName(id: MascotId): string {
  return NAMES[id];
}

export function mascotStyleName(style: MascotStyle): string {
  return STYLE_NAMES[style];
}

export function mascotQuip(id: MascotId, mood: MascotMood): string {
  return QUIPS[id][mood];
}

export function mascotFrame(style: MascotStyle, id: MascotId, mood: MascotMood, frame: number): string {
  const url = FRAMES[`../assets/mascots/${style}-${id}-${mood}-${frame % MASCOT_FRAME_COUNT}.png`];
  if (!url) throw new Error(`Missing mascot frame ${style}/${id}/${mood}/${frame}`);
  return url;
}

export function isMascotId(value: unknown): value is MascotId {
  return typeof value === "string" && (MASCOT_IDS as readonly string[]).includes(value);
}

export function isMascotStyle(value: unknown): value is MascotStyle {
  return typeof value === "string" && (MASCOT_STYLES as readonly string[]).includes(value);
}

export function moodFor(remainingPct: number | null): MascotMood {
  if (remainingPct === null) return "plenty";
  if (remainingPct <= 0) return "out";
  return remainingPct < LOW_THRESHOLD_PCT ? "low" : "plenty";
}
