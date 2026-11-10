/** Renders one flat bot as plain SVG into an element. Ported from the Bots app's BotAvatar. */
import { eyeTone, parseAvatar, resolveColor } from "./colors.js";
import type { BotClip, BotEyeEffect, BotEyeStyle, BotState } from "./motion.js";
import { playBotClip } from "./motion.js";
import type { ShapeKey } from "./shapes.js";
import { CENTER, EYES, gazeTravel, resolveShape, SHAPES, VIEWBOX } from "./shapes.js";

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

const C = CENTER;
const WOW_LINES = `M${C} -40V-18M${C - 56} -28l12 16M${C + 56} -28l-12 16`;
const SPIRAL = (() => {
  let d = "";
  for (let t = 0; t <= 4 * Math.PI; t += 0.3) {
    const r = 1.2 + t * 1.05;
    d += `${d ? "L" : "M"}${(r * Math.cos(t)).toFixed(1)} ${(r * Math.sin(t)).toFixed(1)}`;
  }
  return d;
})();
const PUFF_ANGLES = Array.from({ length: 8 }, (_, k) => (k / 8) * Math.PI * 2);

/** Stable seed from a name: the same name always rests with the same look. */
export function identitySeed(identity: string): number {
  let h = 0;
  for (let i = 0; i < identity.length; i++) {
    h = (h << 5) - h + identity.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function rand(seed: number, slot: number, salt: number): number {
  let h =
    Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(slot | 0, 0x85ebca6b) ^ Math.imul(salt, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** The signature look: the eyes sit up and to one side, chosen per name, and lean that way. */
export function restingLook(seed: number): { x: number; y: number; lean: number } {
  const side = rand(seed, 0, 5) < 0.5 ? -1 : 1;
  return { x: side * 0.6, y: -0.5, lean: side * 17 };
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const r2 = (n: number) => Math.round(n * 100) / 100;

interface Resolved {
  shape: ShapeKey;
  hex: string;
  paint: string;
  seed: number;
  size: number;
  state: BotState;
  eyeStyle: BotEyeStyle;
}

function resolve(o: BotOptions): Resolved {
  const parsed = parseAvatar(o.value ?? "");
  const identity = o.identity ?? (o.value || o.color || "bot");
  const def = resolveColor(identity, o.color ?? (parsed.color || null));
  return {
    shape: resolveShape(o.shape ?? parsed.shapeIndex),
    hex: def.hex,
    // White would vanish on a light page, so it draws as the theme's white-bot fill.
    paint: def.id === "white" ? "var(--fpb-white)" : def.hex,
    seed: identitySeed(identity),
    size: o.size ?? 36,
    state: o.state ?? "idle",
    eyeStyle: o.eyeStyle ?? "bar",
  };
}

function glyph(style: BotEyeStyle | BotEyeEffect): string {
  switch (style) {
    case "dot":
      return `<circle class="fpb-glyph-dot" r="12"/>`;
    case "spiral":
      return `<g class="fpb-glyph-spiral"><path d="${SPIRAL}" class="fpb-stroke" stroke-width="5" stroke-linecap="round"/></g>`;
    case "x":
      return `<path class="fpb-glyph-x fpb-stroke" d="M-11 -11L11 11M11 -11L-11 11" stroke-width="7" stroke-linecap="round"/>`;
    case "big":
      return `<circle class="fpb-glyph-big" r="17"/><circle class="fpb-glint" cx="5" cy="-6" r="5"/>`;
    default:
      return `<rect x="${-EYES.width / 2}" y="${-EYES.height / 2}" width="${EYES.width}" height="${EYES.height}" rx="${EYES.width / 2}"/>`;
  }
}

type Gaze = { x: number; y: number } | undefined;

function eyePlace(r: Resolved, side: -1 | 1, gaze: Gaze): string {
  const rest = restingLook(r.seed);
  const travel = gazeTravel(r.shape);
  const gx = clamp((gaze?.x ?? 0) + rest.x, -1, 1);
  const gy = clamp((gaze?.y ?? 0) + rest.y, -1, 1);
  const cx = side < 0 ? EYES.leftCx : EYES.rightCx;
  return `translate(${r2(cx + gx * travel.x)} ${r2(EYES.cy + gy * travel.y)}) rotate(${r2(clamp(rest.lean, -45, 45))})`;
}

function eyes(r: Resolved, style: BotEyeStyle | BotEyeEffect, gaze: Gaze): string {
  return ([-1, 1] as const)
    .map(
      (side) =>
        `<g class="fpb-eye" style="--sx:${side}"><g transform="${eyePlace(r, side, gaze)}">${glyph(style)}</g></g>`,
    )
    .join("");
}

/** The drawing only motion needs: steam, puffs, loader dots, and each shape's own props. */
function extras(r: Resolved) {
  const { paint, shape } = r;
  const before =
    (shape === "cloud"
      ? `<g class="fpb-rain" fill="none" stroke="${paint}">${[-30, 0, 30]
          .map(
            (dx, k) =>
              `<path d="M${C + dx} ${C + 82}v16" stroke-width="7" stroke-linecap="round" style="animation-delay:${k * 180}ms"/>`,
          )
          .join("")}</g>`
      : "") +
    (shape === "teardrop"
      ? `<circle class="fpb-drop" cx="${C}" cy="${C + 108}" r="11" fill="${paint}"/>`
      : "") +
    `<g class="fpb-puff" fill="${paint}">${PUFF_ANGLES.map(
      (a) =>
        `<circle cx="${C}" cy="${C}" r="9" style="--dx:${Math.cos(a) * 120}px;--dy:${Math.sin(a) * 120}px"/>`,
    ).join("")}</g>` +
    `<g class="fpb-steam" fill="${paint}"><circle cx="${C - 18}" cy="-4" r="11" style="--sx:-14px"/><circle cx="${C + 18}" cy="-4" r="11" style="--sx:14px"/></g>`;
  const after =
    `<g class="fpb-ldots" fill="${paint}">${[0, 1, 2].map((k) => `<g><circle class="l${k}" cx="${C}" cy="${C}" r="15"/></g>`).join("")}</g>` +
    `<path class="fpb-wow" fill="none" d="${WOW_LINES}"/>` +
    (shape === "star"
      ? `<g class="fpb-trail" fill="${paint}">${[16, 13, 10, 8, 6, 4]
          .map(
            (rad, k) =>
              `<circle cx="${C}" cy="${C}" r="${rad}" style="animation-delay:${(k + 1) * 40}ms"/>`,
          )
          .join("")}</g>`
      : "");
  return { before, after };
}

let uid = 0;
const reduced = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Draws a bot into `el` (sized `size` px) and returns a handle. The page needs `freepi-bots/styles.css`.
 * The extra drawing motion needs is only added once the bot is asked to move.
 */
export function mountBot(el: HTMLElement, options: BotOptions = {}): BotHandle {
  const id = `fpb${++uid}`;
  let opts = options;
  let r = resolve(opts);
  let moving = r.state !== "idle";
  let gone = false;
  let gaze: Gaze;
  let stop: (() => void) | undefined;
  let scene!: SVGGElement;
  let ink!: SVGGElement;

  const render = () => {
    stop?.();
    stop = undefined;
    const { before, after } = moving ? extras(r) : { before: "", after: "" };
    const path = SHAPES[r.shape];
    el.classList.add("fpb-bot");
    el.style.width = el.style.height = `${r.size}px`;
    el.innerHTML = `<svg viewBox="${VIEWBOX}" aria-hidden="true" class="fpb-tone-${eyeTone(r.hex)}" style="width:${r.size}px;height:${r.size}px;--fpb-color:${r.paint}">${
      moving ? `<defs><clipPath id="${id}-clip"><path d="${path}"/></clipPath></defs>` : ""
    }<g class="fpb-scene" data-state="${r.state}" data-eyes="${r.eyeStyle}" data-gone="${gone}">${before}<g class="fpb-motion"><g>${
      moving && r.shape === "bell"
        ? `<circle class="fpb-clapper fpb-ink" cx="${C}" cy="${C + 120}" r="13"/>`
        : ""
    }<path class="fpb-shape" d="${path}" fill="${r.paint}"/>${
      moving && r.shape === "diamond"
        ? `<g clip-path="url(#${id}-clip)"><path class="fpb-sheen fpb-ink" d="M-60 -20h34l-60 280h-34z" opacity=".55"/></g>`
        : ""
    }<g class="fpb-eyeclip"><g class="fpb-eyes"><g class="fpb-eyeink fpb-ink">${eyes(r, r.eyeStyle, gaze)}</g></g></g></g></g>${after}</g></svg>`;
    scene = el.querySelector(".fpb-scene") as SVGGElement;
    ink = el.querySelector(".fpb-eyeink") as SVGGElement;
  };

  const setEyeEffect = (next: BotEyeEffect | null) => {
    const style = next ?? r.eyeStyle;
    scene.setAttribute("data-eyes", style);
    ink.innerHTML = eyes(r, style, gaze);
  };
  const setGone = (next: boolean) => {
    gone = next;
    scene.setAttribute("data-gone", String(next));
  };

  render();

  return {
    play(clip) {
      if (reduced()) {
        // Reduced motion skips the movement but still ends where the clip would.
        if (clip === "suckout") setGone(true);
        if (clip === "popin") setGone(false);
        return;
      }
      if (moving) {
        stop?.();
      } else {
        moving = true;
        render();
      }
      const q = (s: string) => el.querySelector(s) as SVGGElement;
      stop = playBotClip(
        {
          scene,
          motion: q(".fpb-motion"),
          shape: el.querySelector(".fpb-shape") as SVGPathElement,
          eyes: q(".fpb-eyes"),
          eyeClip: q(".fpb-eyeclip"),
          ink,
          clipUrl: `url(#${id}-clip)`,
          currentPath: () => SHAPES[r.shape],
          setEyeEffect,
          setGone,
        },
        clip,
        r.shape,
      );
    },
    setState(state) {
      this.update({ ...opts, state });
    },
    setEyeStyle(eyeStyle) {
      this.update({ ...opts, eyeStyle });
    },
    look(x, y) {
      gaze =
        x === undefined || y === undefined ? undefined : { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
      const groups = ink.querySelectorAll(".fpb-eye > g");
      ([-1, 1] as const).forEach((side, i) => {
        groups[i]?.setAttribute("transform", eyePlace(r, side, gaze));
      });
    },
    update(next) {
      opts = next;
      r = resolve(opts);
      if (r.state !== "idle") moving = true;
      render();
    },
    destroy() {
      stop?.();
      stop = undefined;
      el.innerHTML = "";
      el.classList.remove("fpb-bot");
      el.style.width = el.style.height = "";
    },
  };
}
