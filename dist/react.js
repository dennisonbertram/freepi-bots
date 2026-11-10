import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { mountBot } from "./bot.js";
import { mountScene } from "./scene.js";
/**
 * One flat bot. Draws on the client (the box is empty during server rendering).
 * Import `freepi-bots/styles.css` once.
 */
export function BotAvatar({ className, style, clip, lookAt, ...options }) {
    const ref = useRef(null);
    const handle = useRef(null);
    const { shape, color, value, identity, size, state, eyeStyle } = options;
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
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
        if (clip)
            handle.current?.play(clip.name);
    }, [clip?.name, clip?.key]);
    useEffect(() => {
        if (lookAt)
            handle.current?.look(lookAt.x, lookAt.y);
        else
            handle.current?.look();
    }, [lookAt?.x, lookAt?.y]);
    const px = size ?? 36;
    return _jsx("div", { ref: ref, className: className, style: { width: px, height: px, ...style } });
}
/** The sign-in scene. Place it in a `position: relative` box, behind your card. */
export function BotScene({ variant, className, keepOut, style }) {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el)
            return;
        const scene = mountScene(el, {
            variant,
            className,
            keepOut: (keepOut ?? []).flatMap((r) => (r.current ? [r.current] : [])),
        });
        return () => scene.destroy();
    }, [variant, className]);
    return (_jsx("div", { ref: ref, "aria-hidden": "true", style: { position: "absolute", inset: 0, pointerEvents: "none", ...style } }));
}
