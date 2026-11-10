import type { CSSProperties, RefObject } from "react";
import type { BotOptions } from "./bot.js";
import type { BotClipRequest } from "./motion.js";
import type { SceneOptions } from "./scene.js";
export type { BotOptions as BotAvatarOptions } from "./bot.js";
export type { BotClip, BotClipRequest, BotEyeStyle, BotState } from "./motion.js";
export interface BotAvatarProps extends BotOptions {
    className?: string;
    style?: CSSProperties;
    /** Plays a one-shot clip; pass a new `key` to play it again. */
    clip?: BotClipRequest;
    /** Looks toward -1..1 on each axis. */
    lookAt?: {
        x: number;
        y: number;
    };
}
/**
 * One flat bot. Draws on the client (the box is empty during server rendering).
 * Import `freepi-bots/styles.css` once.
 */
export declare function BotAvatar({ className, style, clip, lookAt, ...options }: BotAvatarProps): import("react").JSX.Element;
export interface BotSceneProps extends Omit<SceneOptions, "keepOut"> {
    /** Pieces that would sit on one of these elements are pushed out around it. */
    keepOut?: readonly RefObject<HTMLElement | null>[];
    style?: CSSProperties;
}
/** The sign-in scene. Place it in a `position: relative` box, behind your card. */
export declare function BotScene({ variant, className, keepOut, style }: BotSceneProps): import("react").JSX.Element;
