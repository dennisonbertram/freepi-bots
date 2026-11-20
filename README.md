# freepi-bots

The FreePi flat bot characters as a small, dependency-free package: 23 body shapes with two bar
eyes, 11 colours, 12 motion clips, working and loading states, and the "exploding" sign-in scene.
It ships plain JavaScript (`freepi-bots/vanilla`) and React components (`freepi-bots/react`) built
on the same code.

The package is MIT licensed (see LICENSE). It is not published to npm.

## Install

Install from GitHub:

```sh
pnpm add github:dennisonbertram/freepi-bots
# or: npm install github:dennisonbertram/freepi-bots
```

`dist/` is committed, so installing from git needs no build step. Pin a commit or tag with
`github:dennisonbertram/freepi-bots#<ref>`. React is an optional peer dependency, needed only for
`freepi-bots/react`.

Import the stylesheet once. Bots do not move or show eyes correctly without it:

```js
import "freepi-bots/styles.css";
```

## React

```tsx
import "freepi-bots/styles.css";
import { BotAvatar, BotScene } from "freepi-bots/react";

<BotAvatar shape="heart" color="blue" size={64} />
<BotAvatar value="#2A92FE::shape_8" state="working" />
<BotAvatar shape="bell" color="orange" size={96} clip={{ name: "signature", key: count }} />

// Behind a sign-in card; the parent must be position: relative.
const card = useRef<HTMLDivElement>(null);
<div style={{ position: "relative" }}>
  <BotScene keepOut={[card]} />
  <div ref={card}>...</div>
</div>
```

`BotAvatar` props: `shape` (key or index), `color` (palette id, name or hex), `value` (the Bots app
avatar string, `"#2A92FE::shape_3"`), `identity`, `size`, `state`, `eyeStyle`, `clip`, `lookAt`,
`className`, `style`. It draws in an effect, so the box is empty during server rendering. Pass a
new `clip.key` to replay a clip.

## Vanilla JS

```js
import "freepi-bots/styles.css";
import { mountBot, mountScene } from "freepi-bots/vanilla";

const bot = mountBot(document.querySelector("#bot"), { shape: "heart", color: "blue", size: 64 });
bot.play("squish");        // one-shot clip
bot.setState("working");   // idle | working | loading
bot.setEyeStyle("x");      // bar | dot | spiral | x
bot.look(0.5, -0.2);       // -1..1 on each axis; bot.look() returns to rest
bot.update({ shape: "star", color: "red", size: 96 });
bot.destroy();

// el must be position: relative. Returns { destroy() }.
const scene = mountScene(el, { keepOut: [cardElement] });
```

## Entry points

- `freepi-bots`: `SHAPES`, `SHAPE_KEYS`, `resolveShape`, `VIEWBOX`, `EYES`, `COLORS`, `AUTO_COLORS`,
  `LEGACY_BOT_COLORS`, `resolveColor`, `parseAvatar`, `eyeTone`, `BOT_CLIPS`, `BOT_STATES`,
  `BOT_EYE_STYLES`, `BOT_SIGNATURE_MS`, `playBotClip`, `mountBot`, `mountScene`, and the scene
  placement helpers `place`, `avoid`, `mirrorBelow`, plus all types.
- `freepi-bots/vanilla`: `mountBot`, `mountScene` and their option and handle types.
- `freepi-bots/react`: `BotAvatar`, `BotScene` and the clip, state and eye-style types.
- `freepi-bots/styles.css`: keyframes, state rules and theme variables.

### Shapes (23, in stored-index order)

hex, wedge, squircle, tablet, pebble, blob, teardrop, cloud, heart, starburst, flower, clover, star,
ghost, mushroom, bell, sparkle, jelly, cat, diamond, shield, acorn, egg

### Colours (11)

white `#FFFFFF`, violet `#A97EFE`, green `#00C972`, orange `#FF781C`, cyan `#1CC3B0`, blue
`#2A92FE`, yellow `#FFAF38`, brown `#A27952`, red `#DC3A62` (crimson), magenta `#FF5EB1`, gray
`#94A3B8`. Legacy aliases keep older stored values working (for example `#EF4444` and `#FF3E51`
resolve to red). Other 3 or 6 digit hexes draw as custom colours. White draws with
`--fpb-white`, so it stays visible on a light page.

### Clips (12)

turn, squish, jump, wiggle, wave, shock, surprise, popin, suckout, blink, glance, signature.
`signature` plays the shape's own move (bell, heart, star, ghost, cloud, jelly, egg, sparkle,
diamond, teardrop, flower) and a random clip for other shapes. States: `idle`, `working` (a chugging
loop with steam), `loading` (three bouncing dots). Eye styles: `bar`, `dot`, `spiral`, `x`.

## Theme

Eyes are cut-outs in the page colour. Dark mode follows `prefers-color-scheme`; force it with
`data-theme="dark"` (or `.dark`) on an ancestor, and light with `data-theme="light"`. To match a
page, set `--fpb-page`, `--fpb-fg` and `--fpb-white` (see the top of `styles.css`).

## Flat-bot rules

These hold in every state, and `test/bot.test.ts` checks the CSS for them:

- A bot is only a flat body and its eyes. No rings, glows, rims, drop shadows, halos, or tiles.
- Working and ringing use motion only (the body chugs or swings); nothing is drawn around the bot.
- `prefers-reduced-motion: reduce` turns all bot animation off. Clips that change visibility
  (`suckout`, `popin`) still end where they would have. The scene does not burst, bob, drift, look
  at the pointer or play idle clips.
- No logo bots and no brand marks.

## Differences from the Bots app

The app wins; this package follows it except where noted.

- Left out: photo avatars (`data:image/` values parse as `isImage` but are not drawn), the organic
  (non-shape) avatars, run-status moods, and the continuous idle eye ticker (wandering gaze and
  random blinks). Eyes rest in each name's own look; use `look()` or a `blink`/`glance` clip.
- Left out as brand art, not bots: the FreePi logo, wordmark and logo mark.
- `parseAvatar` has no `shape_N` count from the contracts package; it wraps by the 23 shapes here.
- Compared with the earlier `rakazo-bot-kit`: the kit palette had 7 colours (now the
  `LEGACY_BOT_COLORS` list, which resolve as custom colours), its eyes were fixed ink `#101014`
  while the app cuts eyes in the page colour, its resting gaze came from a per-shape table while the
  app derives it from the bot's name, and its demo needed `motion.js` rather than a build.

## Updating from the Bots app

When the art in the free-rakazo repo changes, copy it over by hand and rebuild:

| Here | Bots app source |
| --- | --- |
| `src/shapes.ts` (`SHAPES`, `SHAPE_KEYS`, eyes, gaze travel) | `packages/core/src/bot-avatar-shapes.ts`, `SHAPE_GAZE_TRAVEL` in `avatar-face.ts` |
| `src/colors.ts` | `packages/core/src/bot-avatar-colors.ts`, `BOT_COLORS` in `packages/contracts/src/ids.ts`, `parseBotAvatarValue` in `contracts/src/bot-avatar.ts` |
| `src/motion.ts` | `packages/ui-web/src/bot-motion.ts` |
| `src/styles.css` | the `rakazo-bot-*` and `rakazo-scene-*` blocks of `packages/ui-web/src/styles.css`, renamed to `fpb-*` |
| `src/bot.ts` (markup, eye glyphs, props) | `packages/ui-web/src/bot-avatar.tsx` (`ShapeAvatar`, `EyeGlyph`) |
| `src/scene.ts`, `src/scene-data.ts` | `packages/ui-web/src/bot-scene.tsx` and `bot-scene-data/*.json` |

Then:

```sh
pnpm install
pnpm check      # biome, tsc, vitest, build
git add -A && git commit   # dist/ is committed on purpose
```

Rename `rakazo-` prefixes to `fpb-`, keep Tailwind colour classes out (use the `--fpb-*` variables),
and port any new or changed tests from the app's `bot-avatar`, `bot-motion`, `bot-scene` and core
colour tests into `test/`.

## Develop

```sh
pnpm check     # lint, typecheck, test, build
pnpm demo      # serves the repo at http://localhost:4799; open /demo/
```

The demo imports `dist/` as ES modules, so it needs a server (browsers block module imports from
`file://`). It shows every shape in every colour, buttons for each clip, state and eye style, and
the scene, with a light/dark toggle.

To try a local copy in another project, install a tarball (`npm pack`, then `pnpm add ./freepi-bots-0.1.0.tgz`).
Linking the folder with `pnpm add ../freepi-bots` makes the package load its own copy of React, and
`BotAvatar` then fails with an invalid hook call.
