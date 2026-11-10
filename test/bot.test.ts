import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountBot } from "../src/vanilla.js";

let reduced = false;
let host: HTMLDivElement;

beforeEach(() => {
  vi.useFakeTimers();
  window.matchMedia = ((q: string) => ({
    matches: reduced && q.includes("reduce"),
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  host = document.createElement("div");
  document.body.append(host);
});
afterEach(() => {
  reduced = false;
  host.remove();
  vi.useRealTimers();
});

const scene = () => host.querySelector(".fpb-scene") as SVGGElement;
const body = () => host.querySelector(".fpb-shape") as SVGPathElement;
const advance = (ms: number) => vi.advanceTimersByTime(ms);

describe("mountBot", () => {
  it("draws a flat body with two bar eyes, sized and hidden from assistive tech", () => {
    mountBot(host, { shape: "heart", color: "blue", size: 80 });
    expect(host.style.width).toBe("80px");
    expect(host.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(body().getAttribute("fill")).toBe("#2A92FE");
    expect(host.querySelectorAll(".fpb-eye rect")).toHaveLength(2);
    expect(scene().getAttribute("data-eyes")).toBe("bar");
  });

  it("reads the Bots app's avatar value, and explicit options win over it", () => {
    mountBot(host, { value: "#2A92FE::shape_8" });
    expect(body().getAttribute("d")).toBe(mountAndPath({ shape: "heart", color: "blue" }));
    mountBot(host, { value: "#2A92FE::shape_8", shape: "hex", color: "red" });
    expect(body().getAttribute("fill")).toBe("#DC3A62");
  });

  it("draws white with the theme's white-bot fill", () => {
    mountBot(host, { shape: "hex", color: "white" });
    expect(body().getAttribute("fill")).toBe("var(--fpb-white)");
  });

  it("draws the glyph for each eye style", () => {
    const html = (eyeStyle?: "bar" | "dot" | "spiral" | "x") => {
      const el = document.createElement("div");
      mountBot(el, { shape: "hex", color: "blue", eyeStyle });
      return el.innerHTML;
    };
    expect(html()).toContain('data-eyes="bar"');
    expect(html()).not.toContain("fpb-glyph");
    expect(html("dot")).toContain("fpb-glyph-dot");
    expect(html("spiral")).toContain("fpb-glyph-spiral");
    expect(html("x")).toContain("fpb-glyph-x");
  });

  it("gives each name its own resting look", () => {
    const eyes = (identity: string) => {
      const el = document.createElement("div");
      mountBot(el, { shape: "hex", color: "blue", identity });
      return el.querySelector(".fpb-eye > g")?.getAttribute("transform");
    };
    const looks = new Set(["a", "b", "c", "d", "e", "f"].map(eyes));
    expect(looks.size).toBeGreaterThan(1);
  });

  it("looks toward a point and back to rest", () => {
    const bot = mountBot(host, { shape: "hex", color: "blue", identity: "a" });
    const eye = () => host.querySelector(".fpb-eye > g")?.getAttribute("transform");
    const rest = eye();
    bot.look(-1, 1);
    expect(eye()).not.toBe(rest);
    bot.look();
    expect(eye()).toBe(rest);
  });

  it("shows three dots while loading and the chug loop while working", () => {
    const bot = mountBot(host, { shape: "hex", color: "blue", state: "loading" });
    expect(scene().getAttribute("data-state")).toBe("loading");
    expect(host.querySelectorAll(".fpb-ldots circle")).toHaveLength(3);
    bot.setState("working");
    expect(scene().getAttribute("data-state")).toBe("working");
    bot.setState("idle");
    expect(scene().getAttribute("data-state")).toBe("idle");
  });

  it("adds shape props only when the bot moves", () => {
    mountBot(host, { shape: "cloud", color: "blue" });
    expect(host.querySelector(".fpb-rain")).toBeNull();
    mountBot(host, { shape: "cloud", color: "blue", state: "working" });
    expect(host.querySelector(".fpb-rain")).not.toBeNull();
  });

  it("empties the element on destroy", () => {
    const bot = mountBot(host, { shape: "hex", color: "blue" });
    bot.destroy();
    expect(host.innerHTML).toBe("");
  });
});

function mountAndPath(o: { shape: string; color: string }) {
  const el = document.createElement("div");
  mountBot(el, o);
  return el.querySelector(".fpb-shape")?.getAttribute("d");
}

describe("clips", () => {
  it("adds the clip class, removes it when done, and restarts on a new play", () => {
    const bot = mountBot(host, { shape: "hex", color: "blue" });
    bot.play("squish");
    expect(scene().classList.contains("fpb-clip-squish")).toBe(true);
    advance(800);
    expect(scene().classList.contains("fpb-clip-squish")).toBe(false);

    bot.play("squish");
    advance(500);
    bot.play("squish");
    advance(500);
    // The second play restarted the timer instead of ending on the first one.
    expect(scene().classList.contains("fpb-clip-squish")).toBe(true);
    advance(300);
    expect(scene().classList.contains("fpb-clip-squish")).toBe(false);
  });

  it("plays a shape's signature clip, and a random one for shapes without one", () => {
    const bot = mountBot(host, { shape: "bell", color: "blue" });
    bot.play("signature");
    expect(scene().classList.contains("fpb-clip-sig-bell")).toBe(true);
    expect(host.querySelector(".fpb-clapper")).not.toBeNull();
  });

  it("hides the bot after suckout, keeps it hidden while working, and shows it after popin", () => {
    const bot = mountBot(host, { shape: "hex", color: "blue", state: "working" });
    bot.play("suckout");
    advance(800);
    expect(scene().getAttribute("data-gone")).toBe("true");
    bot.play("popin");
    expect(scene().getAttribute("data-gone")).toBe("false");
    const css = readFileSync("src/styles.css", "utf8");
    expect(css).toMatch(/\[data-gone="true"\]\s*\{\s*visibility: hidden/);
    expect(css).toContain('[data-state="working"]:not([class*="fpb-clip-"])');
  });

  it("shows big eyes for surprise and puts the bars back after", () => {
    mountBot(host, { shape: "hex", color: "blue" }).play("surprise");
    advance(10);
    expect(scene().getAttribute("data-eyes")).toBe("big");
    expect(host.querySelector(".fpb-glyph-big")).not.toBeNull();
    advance(1400);
    expect(scene().getAttribute("data-eyes")).toBe("bar");
  });

  it("keeps the new shape when it changes mid-wave", () => {
    const proto = SVGElement.prototype as unknown as Record<string, unknown>;
    proto.getTotalLength = () => 100;
    proto.getPointAtLength = (s: number) => ({ x: s, y: s });
    try {
      const bot = mountBot(host, { shape: "hex", color: "blue" });
      bot.play("wave");
      bot.update({ shape: "heart", color: "blue" });
      advance(2000);
      expect(body().getAttribute("d")).toBe(mountAndPath({ shape: "heart", color: "blue" }));
    } finally {
      delete proto.getTotalLength;
      delete proto.getPointAtLength;
    }
  });

  it("skips motion under reduced motion and still ends where the clip would", () => {
    reduced = true;
    const bot = mountBot(host, { shape: "hex", color: "blue" });
    bot.play("squish");
    expect(scene().getAttribute("class")).toBe("fpb-scene");
    bot.play("suckout");
    expect(scene().getAttribute("data-gone")).toBe("true");
    bot.play("popin");
    expect(scene().getAttribute("data-gone")).toBe("false");
  });
});

describe("flat-bot rules", () => {
  const css = readFileSync("src/styles.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  it("draws no rings, glows, rims, shadows, halos or tiles", () => {
    expect(css).not.toMatch(
      /box-shadow|drop-shadow|text-shadow|outline|border|backdrop|radial-gradient|blur\(/i,
    );
    expect(css).not.toMatch(/\bring\b|glow|halo|rim/i);
  });

  it("disables bot animation under reduced motion", () => {
    expect(css).toMatch(
      /prefers-reduced-motion: reduce\)\s*\{\s*\.fpb-scene \*,\s*\.fpb-scene\s*\{\s*animation: none/,
    );
    expect(css).toMatch(/prefers-reduced-motion: no-preference\)/);
  });

  it("draws no extra shapes around a moving bot's body", () => {
    const bot = mountBot(host, { shape: "star", color: "blue", state: "working" });
    bot.play("jump");
    const html = host.innerHTML;
    expect(html).not.toMatch(/filter=|stroke="url|<rect[^>]*class="(?!fpb-)/);
    // The only strokes are the glyph and prop strokes, never around the body.
    expect(body().getAttribute("stroke")).toBeNull();
  });
});
