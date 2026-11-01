// M1-2 game layer (owner decision C1): during a race countdown, the race and
// its replay the site header steps aside and the race takes the whole
// viewport. The race (src/app/game/GameClient.tsx) claims the layer for those
// phases; Navigation reads it and hides the header. The state is mirrored to
// a `data-game-layer` attribute on <body>, so CSS and browser checks can see
// it too. Native embeds have no site header at all; claiming there is harmless.

import { useSyncExternalStore } from "react";

export const GAME_LAYER_ATTRIBUTE = "data-game-layer";

let claims = 0;
const listeners = new Set<() => void>();

function publish(): void {
  if (typeof document !== "undefined" && document.body) {
    if (claims > 0) document.body.setAttribute(GAME_LAYER_ATTRIBUTE, "");
    else document.body.removeAttribute(GAME_LAYER_ATTRIBUTE);
  }
  for (const listener of listeners) listener();
}

/** Claim the game layer; the returned release is safe to call more than once. */
export function claimGameLayer(): () => void {
  claims += 1;
  publish();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    claims = Math.max(0, claims - 1);
    publish();
  };
}

/** True while any surface holds the game layer. */
export function gameLayerActive(): boolean {
  return claims > 0;
}

export function subscribeGameLayer(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Server render and hydration: the header is always shown. */
const serverSnapshot = () => false;

/** Whether the site header should step aside for a game. */
export function useGameLayer(): boolean {
  return useSyncExternalStore(subscribeGameLayer, gameLayerActive, serverSnapshot);
}

// F2 (TestFlight 74: "the helm is not fixed, easy to scroll and lose it"): a
// race surface that keeps the site header (the multiplayer race) still stops
// the page itself from scrolling while it is on screen. The solo race gets the
// same lock from the game layer; both attributes share one rule in
// src/app/globals.css. Counted like the layer, so overlapping claims are safe.
export const RACE_SCROLL_LOCK_ATTRIBUTE = "data-race-scroll-lock";

let scrollLocks = 0;

function publishScrollLock(): void {
  if (typeof document === "undefined" || !document.body) return;
  if (scrollLocks > 0) document.body.setAttribute(RACE_SCROLL_LOCK_ATTRIBUTE, "");
  else document.body.removeAttribute(RACE_SCROLL_LOCK_ATTRIBUTE);
}

/** Lock page scrolling for a race; the returned release is safe to call more than once. */
export function claimRaceScrollLock(): () => void {
  scrollLocks += 1;
  publishScrollLock();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    scrollLocks = Math.max(0, scrollLocks - 1);
    publishScrollLock();
  };
}
