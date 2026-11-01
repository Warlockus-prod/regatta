// M1-2 game layer of the solo race (/game): which phases take the whole
// viewport (the site header steps aside, src/components/game-layer.ts) and
// which keys toggle the pause on a desktop keyboard. Pure, so the rules are
// unit tested without a browser.

import type { GameState } from "./race-model";

/** Countdown, race and replay are the game; menu, briefing and results are pages. */
export function raceUsesGameLayer(state: GameState): boolean {
  return state === "countdown" || state === "racing" || state === "replay";
}

/** Fields where a typed P must stay a letter. Range sliders, switches and
 * radios are controls, not text, so Esc and P still pause from them. */
export const TEXT_ENTRY_SELECTOR =
  'input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=button]),textarea,select,[contenteditable=true]';

export interface PauseKeyInput {
  key: string;
  repeat?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
}

/** Esc and P toggle the pause; a held key, a shortcut chord or typing in a
 * text field never does. */
export function isRacePauseKey(event: PauseKeyInput, inTextEntry: boolean): boolean {
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || inTextEntry) return false;
  const key = event.key.toLowerCase();
  return key === "escape" || key === "esc" || key === "p";
}
