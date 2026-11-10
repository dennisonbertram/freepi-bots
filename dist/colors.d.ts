export interface BotColor {
    id: string;
    name: string;
    hex: string;
    /** Values this color was stored as before; bots saved with them still resolve here. */
    previousHexes?: readonly string[];
}
export declare const COLORS: readonly BotColor[];
/** Colors handed out automatically; white is a deliberate choice, never assigned. */
export declare const AUTO_COLORS: readonly string[];
export declare const DEFAULT_COLOR = "#A97EFE";
/** The Bots app's older seven-color list. Not part of the palette; these hexes resolve as custom colors. */
export declare const LEGACY_BOT_COLORS: readonly ["#3EC5A8", "#F5A03C", "#6A6BF5", "#9B5CF6", "#3B82F6", "#F2622A", "#D9508A"];
export declare function hash(value: string): number;
/**
 * A palette color by id, name, current hex or earlier hex; any other 3 or 6 digit hex is a custom
 * color. Anything else picks a palette color from `identity`, so the same name always gets the same color.
 */
export declare function resolveColor(identity: string, explicit?: string | null): BotColor;
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
export declare function parseAvatar(raw: string): ParsedAvatar;
/** WCAG contrast ratio between two hex colors. */
export declare function contrastRatio(a: string, b: string): number;
/**
 * Which ink a bot's eyes take. They are cut-outs in the page color, unless the body is pale or
 * dark enough that the cut-out would fade in one theme; then they stay the ink that contrasts
 * with the body. Amber, emerald and cyan are pale enough.
 */
export declare function eyeTone(bodyHex: string): "page" | "dark" | "light";
