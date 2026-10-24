'use client';

import { useCallback, useSyncExternalStore } from "react";
import { readRaceSearch } from "@/lib/race-native";
import type { RaceCamera } from "./pose";

// How the solo race is shown, shared by the race menu and the race screen
// (localStorage "regatta.race.view.v1" = "2d" | "3d", "regatta.race.camera.v1"
// = "stern" | "high"). A link with ?view=3d (the app opens the race that way)
// switches to 3D and remembers it. ?camera=high|stern picks the camera the
// same way, and ?scene=next draws the race with the next renderer
// (src/features/race-scene, ADR-0008) with ?fps=1 showing its frame rate.
export const RACE_VIEW_STORAGE_KEY = "regatta.race.view.v1";
export const RACE_CAMERA_STORAGE_KEY = "regatta.race.camera.v1";
const EVENT = "regatta:race-view";

function read3d(): boolean { return true; }

// A camera picked on this page wins over ?camera=: the Next router can put the
// address it loaded with back after a replaceState, which reverted the toggle.
let pickedCamera: RaceCamera | null = null;

function readCamera(): RaceCamera {
  if (pickedCamera) return pickedCamera;
  try {
    const fromUrl = readRaceSearch().get("camera");
    if (fromUrl === "high" || fromUrl === "stern") return fromUrl;
    return localStorage.getItem(RACE_CAMERA_STORAGE_KEY) === "stern" ? "stern" : "high";
  } catch {
    return "high";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* private mode: keep for this page only */ }
  // A ?view= or ?camera= in the address would override the choice on the next read.
  try {
    const url = new URL(window.location.href);
    const param = key === RACE_VIEW_STORAGE_KEY ? "view" : key === RACE_CAMERA_STORAGE_KEY ? "camera" : null;
    if (param && url.searchParams.has(param)) {
      url.searchParams.set(param, value);
      window.history.replaceState(window.history.state, "", url);
    }
  } catch { /* no history API: the stored value still applies after a reload without ?view */ }
  window.dispatchEvent(new Event(EVENT));
}

export interface RaceViewState {
  view3d: boolean;
  camera: RaceCamera;
  setView3d: (on: boolean) => void;
  setCamera: (camera: RaceCamera) => void;
}

export function useRaceView(): RaceViewState {
  const view3d = useSyncExternalStore(subscribe, read3d, () => true);
  const camera = useSyncExternalStore(subscribe, readCamera, () => "high" as const);
  const setView3d = useCallback((on: boolean) => write(RACE_VIEW_STORAGE_KEY, on ? "3d" : "2d"), []);
  const setCamera = useCallback((next: RaceCamera) => {
    pickedCamera = next;
    write(RACE_CAMERA_STORAGE_KEY, next);
  }, []);
  return { view3d, camera, setView3d, setCamera };
}

const noSubscribe = () => () => {};
const flag = (name: string, value: string) => {
  try { return readRaceSearch().get(name) === value; } catch { return false; }
};

/** Address flags of the next race renderer: ?scene=next, and ?fps=1 for its frame-rate readout. */
export function useRaceSceneFlags(): { next: boolean; fps: boolean } {
  const next = true;
  const fps = useSyncExternalStore(noSubscribe, () => flag("fps", "1"), () => false);
  return { next, fps };
}
