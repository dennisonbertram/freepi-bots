/** One-shot motion clips for the shaped bot avatars. CSS keyframes live in styles.css (`fpb-*`). */
export const BOT_CLIPS = [
    "turn",
    "squish",
    "jump",
    "wiggle",
    "wave",
    "shock",
    "surprise",
    "popin",
    "suckout",
    "blink",
    "glance",
    "signature",
];
export const BOT_EYE_STYLES = ["bar", "dot", "spiral", "x"];
export const BOT_STATES = ["idle", "working", "loading"];
const CSS_CLIP_MS = {
    squish: 700,
    jump: 820,
    wiggle: 760,
    blink: 220,
    glance: 1400,
    popin: 650,
    suckout: 700,
    surprise: 1300,
};
/** Shapes with their own move, by shape key, with its duration. Other shapes play a random clip. */
export const BOT_SIGNATURE_MS = {
    bell: 1300,
    heart: 1400,
    star: 1500,
    ghost: 1600,
    cloud: 1800,
    jelly: 1400,
    egg: 1200,
    sparkle: 900,
    diamond: 1000,
    teardrop: 1200,
    flower: 1100,
};
const RANDOM_CLIPS = ["turn", "squish", "jump", "wiggle", "wave", "shock"];
const CLIP_CLASS = "fpb-clip-";
function outline(shape, count) {
    const length = shape.getTotalLength();
    const points = [];
    for (let i = 0; i < count; i++) {
        const s = (length * i) / count;
        const a = shape.getPointAtLength(s);
        const b = shape.getPointAtLength((s + 1) % length);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        points.push([a.x, a.y, dy / len, -dx / len]);
    }
    return points;
}
const f1 = (n) => n.toFixed(1);
/** Smooth closed curve through the points. */
function smoothPath(q) {
    const n = q.length;
    let d = `M${f1(q[0][0])} ${f1(q[0][1])}`;
    for (let i = 0; i < n; i++) {
        const p0 = q[(i - 1 + n) % n];
        const p1 = q[i];
        const p2 = q[(i + 1) % n];
        const p3 = q[(i + 2) % n];
        d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return `${d}Z`;
}
/** Plays `name` on the avatar and returns a function that stops it and restores the resting look. */
export function playBotClip(t, name, shapeKey, random = Math.random) {
    const timers = [];
    const undo = [];
    let raf = 0;
    const later = (fn, ms) => {
        timers.push(setTimeout(fn, ms));
    };
    const frames = (ms, step) => {
        const start = performance.now();
        const tick = (now) => {
            const u = Math.min((now - start) / ms, 1);
            step(u, now - start);
            if (u < 1)
                raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
    };
    const clearClips = () => {
        for (const c of [...t.scene.classList])
            if (c.startsWith(CLIP_CLASS))
                t.scene.classList.remove(c);
    };
    const css = (cls, ms) => {
        clearClips();
        // Reading layout makes the browser restart the animation when the same class comes back.
        t.scene.getBoundingClientRect();
        t.scene.classList.add(CLIP_CLASS + cls);
        undo.push(clearClips);
        later(clearClips, ms);
    };
    const eyeEffect = (effect, from, ms) => {
        later(() => t.setEyeEffect(effect), from);
        later(() => t.setEyeEffect(null), from + ms);
        undo.push(() => t.setEyeEffect(null));
    };
    const canMeasure = typeof t.shape.getTotalLength === "function";
    let clip = name;
    if (clip === "signature") {
        clip = BOT_SIGNATURE_MS[shapeKey]
            ? "signature"
            : (RANDOM_CLIPS[Math.floor(random() * RANDOM_CLIPS.length)] ?? "squish");
    }
    if (clip === "signature")
        css(`sig-${shapeKey}`, BOT_SIGNATURE_MS[shapeKey] ?? 1000);
    else if (clip === "popin") {
        t.setGone(false);
        css("popin", CSS_CLIP_MS.popin);
    }
    else if (clip === "suckout") {
        css("suckout", CSS_CLIP_MS.suckout + 100);
        // The class is kept a moment longer than the animation so the bot never flashes back.
        later(() => t.setGone(true), CSS_CLIP_MS.suckout);
    }
    else if (clip === "surprise") {
        css("surprise", CSS_CLIP_MS.surprise);
        eyeEffect("big", 0, CSS_CLIP_MS.surprise);
    }
    else if (clip === "wave" && canMeasure) {
        const points = outline(t.shape, 140);
        undo.push(() => t.shape.setAttribute("d", t.currentPath()));
        frames(1200, (u) => {
            const amp = 5.5 * Math.sin(Math.PI * u);
            const phase = 26 * u;
            const q = points.map(([x, y, nx, ny], i) => {
                const o = amp * Math.sin((2 * Math.PI * 7 * i) / points.length - phase);
                return [x + nx * o, y + ny * o];
            });
            t.shape.setAttribute("d", u >= 1 ? t.currentPath() : smoothPath(q));
        });
    }
    else if (clip === "shock" && canMeasure) {
        const points = outline(t.shape, 90);
        const ink = getComputedStyle(t.ink).fill;
        let last = -1;
        t.eyes.style.transform = "scaleY(.25)";
        const restore = () => {
            t.motion.style.transform = "";
            t.shape.setAttribute("d", t.currentPath());
            t.shape.style.fill = "";
            t.scene.removeAttribute("data-xray");
            t.eyes.style.transform = "";
        };
        undo.push(restore);
        frames(800, (u, elapsed) => {
            const step = Math.floor(elapsed / 55);
            if (u >= 1 || step === last)
                return;
            last = step;
            const k = 1 - u;
            const j = () => Math.random() - 0.5;
            t.motion.style.transform = `translate(${f1(j() * 14 * k)}px,${f1(j() * 10 * k)}px) rotate(${f1(j() * 8 * k)}deg) scale(${1 + j() * 0.06 * k})`;
            const amp = 10 * k;
            let d = "";
            points.forEach(([x, y, nx, ny], i) => {
                const o = (i % 2 ? 1 : -1) * amp * (0.4 + Math.random() * 0.6);
                d += `${i ? "L" : "M"}${f1(x + nx * o)} ${f1(y + ny * o)}`;
            });
            t.shape.setAttribute("d", `${d}Z`);
            // X-ray flicker: the body takes the eye ink and the eyes go white.
            const xray = step % 2 === 0;
            if (xray)
                t.scene.setAttribute("data-xray", "");
            else
                t.scene.removeAttribute("data-xray");
            t.shape.style.fill = xray ? ink : "";
        });
        later(restore, 800);
        eyeEffect("spiral", 760, 1600);
    }
    else if (clip === "turn") {
        t.eyeClip.style.clipPath = t.clipUrl;
        t.motion.style.transformOrigin = "50% 50%";
        t.eyes.style.transition = "none";
        const restore = () => {
            t.eyeClip.style.clipPath = "";
            t.motion.style.transform = "";
            t.motion.style.transformOrigin = "";
            t.shape.style.filter = "";
            t.eyes.style.transform = "";
            t.eyes.style.opacity = "";
            t.eyes.style.transition = "";
        };
        undo.push(restore);
        frames(1100, (u) => {
            // Ease in and out, then one full turn: eyes slide off one side and return from the other.
            const k = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
            const theta = k * 2 * Math.PI;
            const c = Math.cos(theta);
            const s = Math.sin(theta);
            t.motion.style.transform = `translateY(${f1(-Math.sin(Math.PI * u) * 10)}px) scaleX(${(0.78 + 0.22 * Math.abs(c)).toFixed(3)}) rotate(${f1(s * 4)}deg)`;
            t.shape.style.filter = c < 0 ? `brightness(${(1 + 0.18 * c).toFixed(2)})` : "";
            t.eyes.style.opacity = c > 0 ? "1" : "0";
            t.eyes.style.transform = `translateX(${f1(s * 70)}px) scaleX(${Math.max(c, 0.05).toFixed(3)})`;
        });
        later(restore, 1100);
        eyeEffect("spiral", 1150, 1300);
    }
    else if (clip in CSS_CLIP_MS) {
        css(clip, CSS_CLIP_MS[clip]);
    }
    return () => {
        for (const id of timers)
            clearTimeout(id);
        cancelAnimationFrame(raf);
        for (const fn of undo.reverse())
            fn();
    };
}
