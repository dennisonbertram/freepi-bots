import { describe, expect, it } from "vitest";
import {
  AUTO_COLORS,
  COLORS,
  eyeTone,
  LEGACY_BOT_COLORS,
  parseAvatar,
  resolveColor,
  resolveShape,
  SHAPE_KEYS,
  SHAPES,
} from "../src/index.js";

describe("shapes", () => {
  it("has 23 shapes, each a plain path", () => {
    expect(SHAPE_KEYS).toHaveLength(23);
    for (const key of SHAPE_KEYS) {
      expect(SHAPES[key]).toMatch(/^M/);
      expect(SHAPES[key]).not.toMatch(/<|>|javascript:|url\(/i);
    }
  });

  it("keeps the original eight first, because stored values point at indexes", () => {
    expect(SHAPE_KEYS.slice(0, 8)).toEqual([
      "hex",
      "wedge",
      "squircle",
      "tablet",
      "pebble",
      "blob",
      "teardrop",
      "cloud",
    ]);
  });

  it("resolves keys and wrapping indexes, and falls back to hex", () => {
    expect(resolveShape("heart")).toBe("heart");
    expect(resolveShape(8)).toBe("heart");
    expect(resolveShape(31)).toBe("heart");
    expect(resolveShape(-15)).toBe("heart");
    expect(resolveShape("nope")).toBe("hex");
    expect(resolveShape(Number.NaN)).toBe("hex");
  });
});

describe("colors", () => {
  it("has the 11 palette colors including crimson red, and never auto-assigns white", () => {
    expect(COLORS).toHaveLength(11);
    expect(COLORS.find((c) => c.id === "red")?.hex).toBe("#DC3A62");
    expect(AUTO_COLORS).toHaveLength(10);
    expect(AUTO_COLORS).not.toContain("#FFFFFF");
  });

  it("resolves bots saved with an earlier hex, both earlier reds included", () => {
    expect(resolveColor("b", "#FF3E51").id).toBe("red");
    expect(resolveColor("b", "#ef4444").id).toBe("red");
    expect(resolveColor("b", "#8B5CF6").hex).toBe("#A97EFE");
    expect(resolveColor("b", "violet").hex).toBe("#A97EFE");
    expect(resolveColor("b", "#fff").id).toBe("white");
  });

  it("keeps other hexes as custom colors and picks a stable color for a name", () => {
    expect(resolveColor("b", "#123456")).toMatchObject({ id: "custom", hex: "#123456" });
    expect(resolveColor("ada")).toEqual(resolveColor("ada"));
    expect(resolveColor("ada", "not a color")).toEqual(resolveColor("ada"));
  });

  it("treats the older seven-color list as plain hexes, aliased only where the palette moved", () => {
    expect(resolveColor("b", LEGACY_BOT_COLORS[0]).id).toBe("custom");
    expect(resolveColor("b", "#3B82F6").id).toBe("blue");
  });

  it("parses the avatar value format", () => {
    expect(parseAvatar("#2A92FE::shape_3")).toEqual({
      color: "#2A92FE",
      shapeIndex: 3,
      isImage: false,
    });
    expect(parseAvatar("#2A92FE::shape_26").shapeIndex).toBe(3);
    expect(parseAvatar("#2A92FE::shape_x").shapeIndex).toBe(0);
    expect(parseAvatar("#2A92FE")).toEqual({ color: "#2A92FE", isImage: false });
    expect(parseAvatar("data:image/png;base64,AAAA").isImage).toBe(true);
    expect(parseAvatar("")).toEqual({ color: "", isImage: false });
  });

  it("cuts eyes in the page color unless the body is nearly white or black", () => {
    expect(eyeTone("#FF5EB1")).toBe("page");
    expect(eyeTone("#FFAF38")).toBe("dark");
    expect(eyeTone("#FFFFFF")).toBe("dark");
    expect(eyeTone("#111111")).toBe("light");
  });
});
