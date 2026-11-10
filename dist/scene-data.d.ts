/** Confetti and bot placement for the sign-in scene, from the Bots app art. [kind, x, y, w, h, color] in 0..1 of W by H. */
export type ScenePiece = [kind: string, x: number, y: number, w: number, h: number, color: string];
export interface SceneArt {
    W: number;
    H: number;
    pieces: ScenePiece[];
}
export declare const WIDE_ART: SceneArt;
export declare const TALL_ART: SceneArt;
