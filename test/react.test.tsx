import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BotAvatar, BotScene } from "../src/react.js";

let host: HTMLDivElement;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  window.matchMedia = (() => ({
    matches: false,
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
  host = document.createElement("div");
  document.body.append(host);
});
afterEach(() => {
  host.remove();
  vi.useRealTimers();
});

it("BotAvatar draws a bot, redraws on prop change and replays a clip on a new key", () => {
  const root = createRoot(host);
  const render = (props: Parameters<typeof BotAvatar>[0]) =>
    act(() => root.render(<BotAvatar {...props} />));
  render({ shape: "heart", color: "blue", size: 48 });
  const path = () => host.querySelector(".fpb-shape")?.getAttribute("d");
  const heart = path();
  expect(heart).toBeTruthy();
  expect(host.firstElementChild?.getAttribute("style")).toContain("48px");

  render({ shape: "hex", color: "blue", size: 48 });
  expect(path()).not.toBe(heart);

  const scene = () => host.querySelector(".fpb-scene")!;
  render({ shape: "hex", color: "blue", clip: { name: "squish", key: 1 } });
  expect(scene().classList.contains("fpb-clip-squish")).toBe(true);
  act(() => vi.advanceTimersByTime(800));
  expect(scene().classList.contains("fpb-clip-squish")).toBe(false);
  render({ shape: "hex", color: "blue", clip: { name: "squish", key: 2 } });
  expect(scene().classList.contains("fpb-clip-squish")).toBe(true);
  act(() => root.unmount());
});

it("BotAvatar shows the working state", () => {
  const root = createRoot(host);
  act(() => root.render(<BotAvatar shape="cloud" color="red" state="working" />));
  expect(host.querySelector(".fpb-scene")?.getAttribute("data-state")).toBe("working");
  act(() => root.unmount());
});

it("BotScene mounts a scene and removes it on unmount", () => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, value: 1000 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, value: 600 });
  const root = createRoot(host);
  act(() => root.render(<BotScene variant="wide" />));
  expect(host.querySelectorAll("svg").length).toBeGreaterThan(0);
  act(() => root.unmount());
  expect(host.querySelector("svg")).toBeNull();
});
