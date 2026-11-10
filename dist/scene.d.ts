import type { ShapeKey } from "./shapes.js";
export type SceneVariant = "wide" | "tall";
type Variant = SceneVariant;
export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}
interface Item {
    key: string;
    bot: boolean;
    /** Box center, in px inside the scene. */
    cx: number;
    cy: number;
    w: number;
    h: number;
    color: string;
    /** Streak rotation in degrees; 0 for dots and bots. */
    angle: number;
    shape: ShapeKey;
    style: Record<string, string | number>;
}
/** Pushes pieces out of a keep-out box (e.g. headline and buttons) so the scene flows around it. */
declare function avoid(items: Item[], box: Box, width: number, height: number): Item[];
/** Fills the space under a box with mirror images of the pieces above it, so the space around it is even. */
declare function mirrorBelow(items: Item[], box: Box): Item[];
/** The full placement: layout, keep-out boxes, the mirrored fill, then a final overlap pass. */
declare function place(shape: Variant, width: number, height: number, boxes: Box[]): Item[];
export { avoid, mirrorBelow, place };
export interface SceneOptions {
    /** Forces a layout. By default `wide` from 768px up and a `tall` band on phones. */
    variant?: SceneVariant;
    /** Pieces that would sit on one of these elements are pushed out around it. */
    keepOut?: readonly HTMLElement[];
    className?: string;
}
export interface SceneHandle {
    destroy(): void;
}
/**
 * Fills `el` with decorative bots that burst out, bob, drift with the pointer and look at it.
 * `el` should be `position: relative`; the scene fills it (a tall band across the top on phones).
 * Under `prefers-reduced-motion` the bots sit still: no burst, bob, drift, gaze or idle clips.
 * One pointer listener and one timer serve the whole scene.
 */
export declare function mountScene(el: HTMLElement, options?: SceneOptions): SceneHandle;
