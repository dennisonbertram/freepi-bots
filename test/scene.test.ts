import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { avoid, mirrorBelow, mountScene, place } from "../src/index.js";
import { TALL_ART, WIDE_ART } from "../src/scene-data.js";

let reduced = false;
let host: HTMLDivElement;

beforeEach(() => {
  window.matchMedia = ((q: string) => ({
    get matches() {
      return reduced && q.includes("reduce");
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  globalThis.ResizeObserver = class {
    constructor(private cb: () => void) {}
    observe() {
      this.cb();
    }
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, value: 1000 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, value: 600 });
  host = document.createElement("div");
  document.body.append(host);
});
afterEach(() => {
  host.remove();
  reduced = false;
  vi.useRealTimers();
});

const count = (art: { pieces: unknown[][] }, kind: string) =>
  art.pieces.filter((p) => p[0] === kind).length;
const root = () => host.querySelector<HTMLElement>("[data-slot=bot-scene]")!;

describe("mountScene", () => {
  it("draws bots and dots, hidden from assistive tech", () => {
    mountScene(host, { variant: "wide" });
    expect(root().getAttribute("aria-hidden")).toBe("true");
    expect(root().querySelectorAll("svg").length).toBeGreaterThan(0);
    expect(root().querySelectorAll("svg").length).toBeLessThanOrEqual(count(WIDE_ART, "bot"));
    expect(root().querySelectorAll(".fpb-scene-bit").length).toBe(count(WIDE_ART, "bit"));
  });

  it("uses the tall layout and drops bots that overlap or are clipped", () => {
    mountScene(host, { variant: "tall" });
    expect(root().dataset.variant).toBe("tall");
    const bots = root().querySelectorAll("svg").length;
    expect(bots).toBeGreaterThan(0);
    expect(bots).toBeLessThan(count(TALL_ART, "bot"));
  });

  it("flows around a keep-out element", () => {
    const card = document.createElement("div");
    card.getBoundingClientRect = () => new DOMRect(300, 200, 400, 200);
    host.append(card);
    mountScene(host, { variant: "wide", keepOut: [card] });
    expect(root().querySelectorAll("svg").length).toBeGreaterThan(0);
  });

  it("adds motion only when motion is allowed", () => {
    mountScene(host, { variant: "wide" });
    expect(root().classList.contains("fpb-scene-live")).toBe(true);
    host.replaceChildren();
    reduced = true;
    mountScene(host, { variant: "wide" });
    expect(root().classList.contains("fpb-scene-live")).toBe(false);
  });

  it("plays idle clips on a timer, and not under reduced motion", () => {
    vi.useFakeTimers();
    const seen = () => {
      let hit = false;
      for (let t = 0; t < 4000; t += 50) {
        vi.advanceTimersByTime(50);
        if (root().querySelector("[class*='fpb-clip-']")) hit = true;
      }
      return hit;
    };
    mountScene(host, { variant: "wide" });
    expect(seen()).toBe(true);
    host.replaceChildren();
    reduced = true;
    mountScene(host, { variant: "wide" });
    expect(seen()).toBe(false);
  });

  it("removes everything on destroy", () => {
    const scene = mountScene(host, { variant: "wide" });
    scene.destroy();
    expect(host.innerHTML).toBe("");
  });
});

const BOX = { x: 400, y: 200, w: 200, h: 100 };
const piece = (key: string, cx: number, cy: number, bot = false) => ({
  key,
  bot,
  cx,
  cy,
  w: 60,
  h: 60,
  color: "#fff",
  angle: 0,
  shape: "hex" as const,
  style: {},
});
const overlaps = (it: { cx: number; cy: number; w: number; h: number }) =>
  Math.abs(it.cx - (BOX.x + BOX.w / 2)) < BOX.w / 2 + it.w / 2 &&
  Math.abs(it.cy - (BOX.y + BOX.h / 2)) < BOX.h / 2 + it.h / 2;

describe("keep-out boxes", () => {
  it("avoid moves every piece off the box and leaves distant pieces alone", () => {
    const items = [
      piece("centre", 500, 250),
      piece("edge", 420, 210),
      piece("below", 500, 330),
      piece("far", 50, 50),
    ];
    const out = avoid(items, BOX, 1000, 600);
    expect(out.length).toBe(4);
    expect(out.filter(overlaps)).toEqual([]);
    expect(out.find((i) => i.key === "far")).toMatchObject({ cx: 50, cy: 50 });
  });

  it("avoid drops pieces pushed off the scene", () => {
    expect(avoid([piece("edge", 500, 250)], { x: 0, y: 0, w: 1000, h: 600 }, 1000, 600)).toEqual(
      [],
    );
  });

  it("mirrorBelow adds a mirrored piece under the box for each piece above it", () => {
    const above = piece("above", 500, 150, true);
    const out = mirrorBelow([above, piece("beside", 50, 150)], BOX);
    const mirrored = out.find((i) => i.key === "above-m")!;
    expect(out.length).toBe(3);
    expect(mirrored.cy).toBe(BOX.y + BOX.h + (BOX.y - above.cy));
    expect(mirrored.cx).toBe(above.cx);
  });
});

describe("place", () => {
  const cases = [
    ["wide", 1440, 900, { x: 420, y: 250, w: 600, h: 320 }],
    ["wide", 1440, 900, undefined],
    ["tall", 390, 740, { x: 20, y: 200, w: 350, h: 300 }],
  ] as const;
  for (const [variant, w, h, box] of cases) {
    it(`leaves no two ${variant} bots overlapping at ${w}x${h}`, () => {
      const items = place(variant, w, h, box ? [box] : []);
      const bots = items.filter((i) => i.bot);
      expect(bots.length).toBeGreaterThan(0);
      for (const [i, a] of bots.entries())
        for (const b of bots.slice(i + 1))
          expect(
            Math.abs(a.cx - b.cx) < (a.w + b.w) / 2 && Math.abs(a.cy - b.cy) < (a.h + b.h) / 2,
            `${a.key} overlaps ${b.key}`,
          ).toBe(false);
      for (const dot of items.filter((i) => !i.bot))
        for (const b of bots)
          expect(
            Math.abs(dot.cx - b.cx) < (dot.w + b.w) / 2 &&
              Math.abs(dot.cy - b.cy) < (dot.h + b.h) / 2,
            `${dot.key} sits under ${b.key}`,
          ).toBe(false);
    });
  }
});
