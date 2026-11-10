import type { CSSProperties, RefObject } from "react";
import { useEffect, useRef } from "react";
import type { BotHandle, BotOptions } from "./bot.js";
import { mountBot } from "./bot.js";
import type { BotClipRequest } from "./motion.js";
import type { SceneOptions } from "./scene.js";
import { mountScene } from "./scene.js";

export type { BotOptions as BotAvatarOptions } from "./bot.js";
export type { BotClip, BotClipRequest, BotEyeStyle, BotState } from "./motion.js";

export interface BotAvatarProps extends BotOptions {
  className?: string;
  style?: CSSProperties;
  /** Plays a one-shot clip; pass a new `key` to play it again. */
  clip?: BotClipRequest;
  /** Looks toward -1..1 on each axis. */
  lookAt?: { x: number; y: number };
}

/**
 * One flat bot. Draws on the client (the box is empty during server rendering).
 * Import `freepi-bots/styles.css` once.
 */
export function BotAvatar({ className, style, clip, lookAt, ...options }: BotAvatarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const handle = useRef<BotHandle | null>(null);
  const { shape, color, value, identity, size, state, eyeStyle } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const h = mountBot(el, { shape, color, value, identity, size, state, eyeStyle });
    handle.current = h;
    return () => {
      h.destroy();
      handle.current = null;
    };
  }, []);
  // Later option changes redraw in place; the first run above already drew them.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    handle.current?.update({ shape, color, value, identity, size, state, eyeStyle });
  }, [shape, color, value, identity, size, state, eyeStyle]);

  useEffect(() => {
    if (clip) handle.current?.play(clip.name);
  }, [clip?.name, clip?.key]);
  useEffect(() => {
    if (lookAt) handle.current?.look(lookAt.x, lookAt.y);
    else handle.current?.look();
  }, [lookAt?.x, lookAt?.y]);

  const px = size ?? 36;
  return <div ref={ref} className={className} style={{ width: px, height: px, ...style }} />;
}

export interface BotSceneProps extends Omit<SceneOptions, "keepOut"> {
  /** Pieces that would sit on one of these elements are pushed out around it. */
  keepOut?: readonly RefObject<HTMLElement | null>[];
  style?: CSSProperties;
}

/** The sign-in scene. Place it in a `position: relative` box, behind your card. */
export function BotScene({ variant, className, keepOut, style }: BotSceneProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const scene = mountScene(el, {
      variant,
      className,
      keepOut: (keepOut ?? []).flatMap((r) => (r.current ? [r.current] : [])),
    });
    return () => scene.destroy();
  }, [variant, className]);
  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", ...style }}
    />
  );
}
