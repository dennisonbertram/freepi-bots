export type { BotHandle, BotOptions } from "./bot.js";
export { identitySeed, mountBot, restingLook } from "./bot.js";
export type { BotColor, ParsedAvatar } from "./colors.js";
export {
  AUTO_COLORS,
  COLORS,
  contrastRatio,
  DEFAULT_COLOR,
  eyeTone,
  LEGACY_BOT_COLORS,
  parseAvatar,
  resolveColor,
} from "./colors.js";
export type { BotClip, BotClipRequest, BotEyeEffect, BotEyeStyle, BotState } from "./motion.js";
export {
  BOT_CLIPS,
  BOT_EYE_STYLES,
  BOT_SIGNATURE_MS,
  BOT_STATES,
  playBotClip,
} from "./motion.js";
export type { Box, SceneHandle, SceneOptions, SceneVariant } from "./scene.js";
export { avoid, mirrorBelow, mountScene, place } from "./scene.js";
export type { ShapeKey } from "./shapes.js";
export { CENTER, EYES, gazeTravel, resolveShape, SHAPE_KEYS, SHAPES, VIEWBOX } from "./shapes.js";
