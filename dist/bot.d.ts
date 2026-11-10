import type { BotClip, BotEyeStyle, BotState } from "./motion.js";
export interface BotOptions {
    /** Shape key (`"heart"`) or index. Defaults to the shape in `value`, else `"hex"`. */
    shape?: string | number;
    /** Palette id, name, hex, or an earlier hex. Defaults to the color in `value`, else picked from `identity`. */
    color?: string;
    /** The Bots app's avatar value, `"#2A92FE::shape_3"`. `shape` and `color` override it. */
    value?: string;
    /** Names the bot: it sets the resting look direction, and the color when none is given. */
    identity?: string;
    /** Width and height in px. Default 36. */
    size?: number;
    /** `idle` (default), `working` (chugging with steam) or `loading` (three bouncing dots). */
    state?: BotState;
    /** `bar` (default), `dot`, `spiral` or `x`. */
    eyeStyle?: BotEyeStyle;
}
export interface BotHandle {
    /** Plays a one-shot clip; a new call cancels the running one. */
    play(clip: BotClip): void;
    setState(state: BotState): void;
    setEyeStyle(style: BotEyeStyle): void;
    /** Looks toward -1..1 on each axis, or back to the resting look with no arguments. */
    look(x?: number, y?: number): void;
    /** Replaces the options: shape, color, size and so on. */
    update(options: BotOptions): void;
    /** Stops motion and empties the element. */
    destroy(): void;
}
/** Stable seed from a name: the same name always rests with the same look. */
export declare function identitySeed(identity: string): number;
/** The signature look: the eyes sit up and to one side, chosen per name, and lean that way. */
export declare function restingLook(seed: number): {
    x: number;
    y: number;
    lean: number;
};
/**
 * Draws a bot into `el` (sized `size` px) and returns a handle. The page needs `freepi-bots/styles.css`.
 * The extra drawing motion needs is only added once the bot is asked to move.
 */
export declare function mountBot(el: HTMLElement, options?: BotOptions): BotHandle;
