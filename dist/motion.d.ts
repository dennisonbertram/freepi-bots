/** One-shot motion clips for the shaped bot avatars. CSS keyframes live in styles.css (`fpb-*`). */
export declare const BOT_CLIPS: readonly ["turn", "squish", "jump", "wiggle", "wave", "shock", "surprise", "popin", "suckout", "blink", "glance", "signature"];
export type BotClip = (typeof BOT_CLIPS)[number];
/** Play a clip by passing a new object: a changed `key` replays, even with the same `name`. */
export interface BotClipRequest {
    name: BotClip;
    key: string | number;
}
export declare const BOT_EYE_STYLES: readonly ["bar", "dot", "spiral", "x"];
export type BotEyeStyle = (typeof BOT_EYE_STYLES)[number];
/** Eye styles the motion code sets itself: dizzy after a turn or shock, wide for surprise. */
export type BotEyeEffect = "spiral" | "big";
export declare const BOT_STATES: readonly ["idle", "working", "loading"];
export type BotState = (typeof BOT_STATES)[number];
/** Shapes with their own move, by shape key, with its duration. Other shapes play a random clip. */
export declare const BOT_SIGNATURE_MS: Readonly<Record<string, number>>;
export interface BotMotionTarget {
    scene: SVGGElement;
    motion: SVGGElement;
    shape: SVGPathElement;
    eyes: SVGGElement;
    /** Holds the eyes; given a clip-path to the body while they slide off the side in a turn. */
    eyeClip: SVGGElement;
    /** Carries the eye ink color. */
    ink: SVGGElement;
    clipUrl: string;
    /** The body path for the current shape, read when a clip ends so a shape change mid-clip is not undone. */
    currentPath(): string;
    setEyeEffect(effect: BotEyeEffect | null): void;
    setGone(gone: boolean): void;
}
/** Plays `name` on the avatar and returns a function that stops it and restores the resting look. */
export declare function playBotClip(t: BotMotionTarget, name: BotClip, shapeKey: string, random?: () => number): () => void;
