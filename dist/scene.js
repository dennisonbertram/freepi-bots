import { mountBot } from "./bot.js";
import { COLORS } from "./colors.js";
import { TALL_ART, WIDE_ART } from "./scene-data.js";
import { SHAPE_KEYS } from "./shapes.js";
const ART = { wide: WIDE_ART, tall: TALL_ART };
/** Bot shapes, cycled over the art's bot pieces. */
const SCENE_SHAPES = [
    "heart",
    "teardrop",
    "ghost",
    "star",
    "mushroom",
    "cloud",
    "blob",
    "squircle",
];
const IDLE_CLIPS = ["blink", "glance", "signature", "wiggle", "jump", "squish"];
const PALETTE = COLORS.filter((c) => c.id !== "white").map((c) => c.hex);
const rgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
/** The palette color nearest to an art color. */
function snap(hex) {
    const c = rgb(hex);
    let best = PALETTE[0];
    let bestDist = Number.POSITIVE_INFINITY;
    for (const p of PALETTE) {
        const d = rgb(p).reduce((s, v, i) => s + (v - c[i]) ** 2, 0);
        if (d < bestDist)
            [best, bestDist] = [p, d];
    }
    return best;
}
/** Stable pseudo-random number in [0, 1) per piece and purpose, so re-layout never reshuffles. */
const jit = (i, k) => {
    const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return v - Math.floor(v);
};
const span = (i, k, a, b) => a + jit(i, k) * (b - a);
function layout(variant, width, height) {
    const art = ART[variant];
    // object-fit: cover, centered for the wide art and pinned to the top for the tall band.
    const scale = Math.max(width / art.W, height / art.H);
    const w = art.W * scale;
    const h = art.H * scale;
    const ox = (width - w) / 2;
    const oy = variant === "tall" ? 0 : (height - h) / 2;
    const fx = width / 2;
    const fy = variant === "tall" ? height : height / 2;
    let bots = 0;
    const items = art.pieces.map(([kind, px, py, pw, ph, hex], i) => {
        const bot = kind === "bot";
        // The tall art stores confetti as boxes far larger than the dots in the old art; keep them small.
        const dot = variant === "tall" && !bot ? Math.min(pw * w, ph * h, h * 0.022) : 0;
        // Confetti is a dot, or a short rounded streak at an angle (every other one in the tall art,
        // whose boxes are square; in the wide art the box shape says which).
        const streak = !bot && (dot ? i % 2 === 0 : Math.abs(pw * w - ph * h) > Math.max(pw * w, ph * h) * 0.3);
        const bw = dot ? (streak ? dot * 2.6 : dot) : pw * w;
        const bh = dot ? (streak ? dot * 0.5 : dot) : ph * h;
        // The tall band is a smaller, sparser cut of the art, like the old raster.
        const s = bot ? Math.max(bw, bh) * 1.05 * (variant === "tall" ? 0.7 : 1) : 0;
        const cx = ox + px * w + (pw * w) / 2;
        const cy = oy + py * h + (ph * h) / 2;
        const dist = Math.hypot(cx - fx, cy - fy);
        const shape = SCENE_SHAPES[bots++ % SCENE_SHAPES.length];
        const color = snap(hex);
        return {
            key: `${variant}-${i}`,
            bot,
            cx,
            cy,
            w: bot ? s : bw,
            h: bot ? s : bh,
            color,
            angle: streak ? span(i, 7, -55, 55) : 0,
            shape,
            style: {
                "--fx": `${(fx - cx) * 0.85}px`,
                "--fy": `${(fy - cy) * 0.85}px`,
                "--r0": `${span(i, 1, -40, 40)}deg`,
                "--bd": `${span(i, 2, 700, 1000)}ms`,
                "--bdel": `${Math.min(500, dist * 0.5) + span(i, 3, 0, 120)}ms`,
                "--dur": `${span(i, 4, 3.8, 6.5)}s`,
                "--bob": `${span(i, 5, -9, -4)}px`,
                "--tilt": `${span(i, 6, -4, 4)}deg`,
                "--depth": bot ? Math.min(28, 6 + Math.sqrt(bw * bh) / 9) : 4,
            },
        };
    });
    return variant === "tall" ? thin(items, width, height) : items;
}
/** Keeps the larger bots first and drops any bot that overlaps a kept one by over ~10% of its size or is cut by the top or side edges. */
function thin(items, width, height) {
    const kept = [];
    const drop = new Set();
    for (const it of [...items].filter((i) => i.bot).sort((a, b) => b.w - a.w)) {
        const r = it.w / 2;
        const clipped = it.cx - r < 0 || it.cx + r > width || it.cy - r < 0 || it.cy > height;
        const overlaps = kept.some((k) => Math.hypot(it.cx - k.cx, it.cy - k.cy) < (r + k.w / 2) * 0.9);
        if (clipped || overlaps)
            drop.add(it);
        else
            kept.push(it);
    }
    return items.filter((i) => !drop.has(i));
}
/** Pushes pieces out of a keep-out box (e.g. headline and buttons) so the scene flows around it. */
function avoid(items, box, width, height) {
    const pad = 20;
    const bx = box.x + box.w / 2;
    const by = box.y + box.h / 2;
    const moved = items.map((it) => {
        const r = Math.max(it.w, it.h) / 2 + pad;
        const hx = box.w / 2 + r;
        const hy = box.h / 2 + r;
        const dx = it.cx - bx;
        const dy = it.cy - by;
        if (Math.abs(dx) >= hx || Math.abs(dy) >= hy)
            return { it, shifted: false };
        // Slide straight out along the line from the box centre; mostly sideways, since the box is wide.
        const t = Math.min(dx ? hx / Math.abs(dx) : Infinity, dy ? hy / Math.abs(dy) : Infinity);
        const k = Number.isFinite(t) ? t : hx / 1;
        return { it: { ...it, cx: bx + (dx || 1) * k, cy: by + dy * k }, shifted: true };
    });
    const inside = moved.filter(({ it }) => it.cx > -it.w / 2 &&
        it.cx < width + it.w / 2 &&
        it.cy > -it.h / 2 &&
        it.cy < height + it.h / 2);
    // A pushed bot must not land on a bot that stayed put.
    const kept = [];
    for (const { it, shifted } of [...inside].sort((a, b) => Number(a.shifted) - Number(b.shifted))) {
        if (shifted &&
            it.bot &&
            kept.some((k) => k.bot && Math.hypot(it.cx - k.cx, it.cy - k.cy) < ((it.w + k.w) / 2) * 0.95))
            continue;
        kept.push(it);
    }
    return kept;
}
/** Fills the space under a box with mirror images of the pieces above it, so the space around it is even. */
function mirrorBelow(items, box) {
    const top = box.y;
    const bottom = box.y + box.h;
    const extra = items
        .filter((it) => it.cy < top && it.cx > box.x - 160 && it.cx < box.x + box.w + 160)
        .map((it, i) => {
        const index = (SHAPE_KEYS.indexOf(it.shape) + 3 + i) % SHAPE_KEYS.length;
        return {
            ...it,
            key: `${it.key}-m`,
            cy: bottom + (top - it.cy),
            shape: it.bot ? (SHAPE_KEYS[index] ?? it.shape) : it.shape,
        };
    });
    return [...items, ...extra];
}
/** Drops any bot whose box overlaps a bot already kept (earlier, larger, unmoved bots win), and any confetti sitting under a kept bot. */
function dropOverlaps(items) {
    const hit = (a, b) => Math.abs(a.cx - b.cx) < (a.w + b.w) / 2 && Math.abs(a.cy - b.cy) < (a.h + b.h) / 2;
    const kept = [];
    for (const it of items)
        if (it.bot && !kept.some((k) => hit(it, k)))
            kept.push(it);
    return items.filter((it) => (it.bot ? kept.includes(it) : !kept.some((k) => hit(it, k))));
}
/** The full placement: layout, keep-out boxes, the mirrored fill, then a final overlap pass. */
function place(shape, width, height, boxes) {
    const all = layout(shape, width, height);
    const first = boxes[0];
    const filled = first ? mirrorBelow(avoid(all, first, width, height), first) : all;
    return dropOverlaps(boxes.reduce((items, box) => avoid(items, box, width, height), filled));
}
export { avoid, mirrorBelow, place };
const mq = (q) => (typeof matchMedia === "function" ? matchMedia(q) : undefined);
/**
 * Fills `el` with decorative bots that burst out, bob, drift with the pointer and look at it.
 * `el` should be `position: relative`; the scene fills it (a tall band across the top on phones).
 * Under `prefers-reduced-motion` the bots sit still: no burst, bob, drift, gaze or idle clips.
 * One pointer listener and one timer serve the whole scene.
 */
export function mountScene(el, options = {}) {
    const root = document.createElement("div");
    root.setAttribute("aria-hidden", "true");
    root.dataset.slot = "bot-scene";
    root.className = `fpb-scene-root ${options.className ?? ""}`.trim();
    el.append(root);
    const reduced = mq("(prefers-reduced-motion: reduce)");
    const wideQuery = mq("(min-width: 768px)");
    const motion = !reduced?.matches;
    if (motion)
        root.classList.add("fpb-scene-live");
    const variant = () => options.variant ?? (!wideQuery || wideQuery.matches ? "wide" : "tall");
    let bots = [];
    const build = () => {
        for (const b of bots)
            b.handle.destroy();
        bots = [];
        root.replaceChildren();
        const v = variant();
        root.dataset.variant = v;
        const width = root.clientWidth;
        const height = root.clientHeight;
        if (!width || !height)
            return;
        const a = root.getBoundingClientRect();
        const boxes = (options.keepOut ?? []).map((k) => {
            const b = k.getBoundingClientRect();
            return { x: b.left - a.left, y: b.top - a.top, w: b.width, h: b.height };
        });
        for (const item of place(v, width, height, boxes)) {
            const par = document.createElement("div");
            par.className = "fpb-scene-par";
            par.style.setProperty("--depth", String(item.style["--depth"]));
            const piece = document.createElement("div");
            piece.className = `fpb-scene-piece${item.bot ? "" : " fpb-scene-bit"}`;
            Object.assign(piece.style, {
                left: `${item.cx - item.w / 2}px`,
                top: `${item.cy - item.h / 2}px`,
                width: `${item.w}px`,
                height: `${item.h}px`,
            });
            for (const [k, val] of Object.entries(item.style))
                piece.style.setProperty(k, String(val));
            const inner = document.createElement("div");
            inner.className = "fpb-scene-inner";
            if (item.bot) {
                bots.push({
                    item,
                    handle: mountBot(inner, {
                        shape: item.shape,
                        color: item.color,
                        identity: item.key,
                        size: item.w,
                    }),
                });
            }
            else {
                const dot = document.createElement("span");
                dot.style.cssText = `display:block;width:100%;height:100%;background:${item.color};border-radius:9999px;${item.angle ? `transform:rotate(${item.angle}deg)` : ""}`;
                inner.append(dot);
            }
            piece.append(inner);
            par.append(piece);
            root.append(par);
        }
    };
    const ro = new ResizeObserver(build);
    ro.observe(root);
    for (const k of options.keepOut ?? [])
        ro.observe(k);
    wideQuery?.addEventListener("change", build);
    let frame = 0;
    let timer = 0;
    let at = { x: 0, y: 0 };
    const aim = () => {
        frame = 0;
        if (document.hidden)
            return;
        const r = root.getBoundingClientRect();
        root.style.setProperty("--mx", String((at.x / window.innerWidth - 0.5) * 2));
        root.style.setProperty("--my", String((at.y / window.innerHeight - 0.5) * 2));
        const q = (v) => Math.round(v * 8) / 8;
        for (const { item, handle } of bots) {
            const dx = at.x - r.left - item.cx;
            const dy = at.y - r.top - item.cy;
            const d = Math.hypot(dx, dy) || 1;
            const m = Math.min(1, d / 260);
            handle.look(q((dx / d) * m), q((dy / d) * m));
        }
    };
    const onMove = (e) => {
        at = { x: e.clientX, y: e.clientY };
        if (!frame && !document.hidden)
            frame = requestAnimationFrame(aim);
    };
    const onVisibility = () => {
        root.dataset.paused = String(document.hidden);
    };
    const tick = () => {
        timer = window.setTimeout(() => {
            if (!document.hidden && bots.length)
                for (let k = 0; k < 1 + Math.floor(Math.random() * 2); k++)
                    bots[Math.floor(Math.random() * bots.length)].handle.play(IDLE_CLIPS[Math.floor(Math.random() * IDLE_CLIPS.length)]);
            tick();
        }, 900 + Math.random() * 1400);
    };
    if (motion) {
        tick();
        window.addEventListener("pointermove", onMove, { passive: true });
        document.addEventListener("visibilitychange", onVisibility);
    }
    return {
        destroy() {
            ro.disconnect();
            wideQuery?.removeEventListener("change", build);
            window.removeEventListener("pointermove", onMove);
            document.removeEventListener("visibilitychange", onVisibility);
            cancelAnimationFrame(frame);
            clearTimeout(timer);
            for (const b of bots)
                b.handle.destroy();
            root.remove();
        },
    };
}
