/** Palette, legacy aliases, avatar-value parsing and eye ink. Ported from the Bots app; the app wins. */
import { SHAPE_KEYS } from "./shapes.js";

export interface BotColor {
  id: string;
  name: string;
  hex: string;
  /** Values this color was stored as before; bots saved with them still resolve here. */
  previousHexes?: readonly string[];
}

export const COLORS: readonly BotColor[] = [
  { id: "white", name: "Staff White", hex: "#FFFFFF" },
  { id: "violet", name: "Executive Violet", hex: "#A97EFE", previousHexes: ["#8B5CF6"] },
  { id: "green", name: "Emerald", hex: "#00C972", previousHexes: ["#10B981"] },
  { id: "orange", name: "Forge Orange", hex: "#FF781C", previousHexes: ["#F97316"] },
  { id: "cyan", name: "Cyber Cyan", hex: "#1CC3B0", previousHexes: ["#06B6D4"] },
  { id: "blue", name: "Cobalt Blue", hex: "#2A92FE", previousHexes: ["#3B82F6"] },
  { id: "yellow", name: "Amber Gold", hex: "#FFAF38", previousHexes: ["#EAB308"] },
  { id: "brown", name: "Caramel Bronze", hex: "#A27952", previousHexes: ["#8D6E63"] },
  // Deeper and rosier than a typical error red, so a red bot never reads as an error.
  { id: "red", name: "Crimson Red", hex: "#DC3A62", previousHexes: ["#EF4444", "#FF3E51"] },
  { id: "magenta", name: "Neon Pink", hex: "#FF5EB1", previousHexes: ["#EC4899"] },
  { id: "gray", name: "Slate Silver", hex: "#94A3B8", previousHexes: ["#64748B"] },
];

/** Colors handed out automatically; white is a deliberate choice, never assigned. */
export const AUTO_COLORS: readonly string[] = COLORS.filter((c) => c.id !== "white").map(
  (c) => c.hex,
);
export const DEFAULT_COLOR = "#A97EFE";

/** The Bots app's older seven-color list. Not part of the palette; these hexes resolve as custom colors. */
export const LEGACY_BOT_COLORS = [
  "#3EC5A8",
  "#F5A03C",
  "#6A6BF5",
  "#9B5CF6",
  "#3B82F6",
  "#F2622A",
  "#D9508A",
] as const;

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** A hex color as lowercase six digits, so "#fff" and "#FFFFFF" compare equal. */
function normalizeHex(color: string): string {
  const c = color.trim().toLowerCase();
  return /^#[0-9a-f]{3}$/.test(c) ? `#${[...c.slice(1)].map((d) => d + d).join("")}` : c;
}

export function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

function random(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 1831565813) | 0;
    let next = Math.imul(value ^ (value >>> 15), 1 | value);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A palette color by id, name, current hex or earlier hex; any other 3 or 6 digit hex is a custom
 * color. Anything else picks a palette color from `identity`, so the same name always gets the same color.
 */
export function resolveColor(identity: string, explicit?: string | null): BotColor {
  if (explicit) {
    const clean = explicit.toLowerCase();
    const named = COLORS.find((c) => c.id === clean || c.name.toLowerCase() === clean);
    if (named) return named;
    const wanted = normalizeHex(clean);
    const byHex = COLORS.find(
      (c) =>
        c.hex.toLowerCase() === wanted || c.previousHexes?.some((h) => h.toLowerCase() === wanted),
    );
    if (byHex) return byHex;
    if (HEX.test(explicit)) return { id: "custom", name: "Custom", hex: explicit };
  }
  const seed = (hash(identity) ^ Math.imul(1, 2654435769)) >>> 0;
  const index = Math.floor(random((seed ^ 2654435769) >>> 0)() * COLORS.length);
  return COLORS[index % COLORS.length] ?? COLORS[0]!;
}

export interface ParsedAvatar {
  /** The raw color part: a hex, palette id or name. Empty when the value has no color. */
  color: string;
  /** Shape index from a `::shape_N` suffix, wrapped to the shape count; undefined without one. */
  shapeIndex?: number;
  /** `data:image/` values are photos; this package does not draw them. */
  isImage: boolean;
}

/**
 * Parses the Bots app's avatar value: `#2A92FE::shape_3` (color plus shape index), a bare color,
 * or a `data:image/` photo.
 */
export function parseAvatar(raw: string): ParsedAvatar {
  if (!raw) return { color: "", isImage: false };
  if (raw.startsWith("data:image/")) return { color: "", isImage: true };
  if (raw.includes("::shape_")) {
    const [color, suffix = "0"] = raw.split("::shape_");
    const n = /^\d+$/.test(suffix) ? Number(suffix) : 0;
    const index = Number.isSafeInteger(n) ? n : 0;
    return { color: color ?? "", shapeIndex: index % SHAPE_KEYS.length, isImage: false };
  }
  return { color: raw, isImage: false };
}

/** WCAG contrast ratio between two hex colors. */
export function contrastRatio(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05);
}

function luminance(hex: string): number {
  const c = expandHex(hex);
  const [r, g, b] = [0, 2, 4].map((o) => {
    const ch = (Number.parseInt(c.substring(o, o + 2), 16) || 0) / 255;
    return ch <= 0.03928 ? ch / 12.92 : ((ch + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function expandHex(hex: string): string {
  const c = hex.replace("#", "");
  return c.length === 3 ? [...c].map((d) => d + d).join("") : c;
}

/**
 * Which ink a bot's eyes take. They are cut-outs in the page color, unless the body is pale or
 * dark enough that the cut-out would fade in one theme; then they stay the ink that contrasts
 * with the body. Amber, emerald and cyan are pale enough.
 */
export function eyeTone(bodyHex: string): "page" | "dark" | "light" {
  if (contrastRatio(bodyHex, "#FFFFFF") < 2.4) return "dark";
  if (contrastRatio(bodyHex, "#000000") < 2) return "light";
  return "page";
}
