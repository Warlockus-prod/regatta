// The race's helm control and the helm assists a result was sailed with
// (package 13, ADR-0022). Pure, shared by the web race, /api/race-result, the
// database and the iOS app's Settings.
//
// Owner decision 2026-11-01 (race game logic, decision 1): new installs steer
// the race with on-screen arrows in both levels; the wheel and the sliders are
// chosen in the race settings. A saved choice is never overwritten: before
// this choice existed the race used the trainers' control mode, so a device
// that saved one keeps it until the player picks a race control.

import type { HelmUsage } from "./helm-assist";

export const RACE_HELM_CONTROLS = ["arrows", "wheels", "sliders"] as const;
export type RaceHelmControl = (typeof RACE_HELM_CONTROLS)[number];

/** Storage row of the race's own choice (web localStorage, the app's race storage). */
export const RACE_HELM_KEY = "regatta.race.helm.v1";

export function isRaceHelmControl(value: unknown): value is RaceHelmControl {
  return typeof value === "string" && (RACE_HELM_CONTROLS as readonly string[]).includes(value);
}

/**
 * The control the race shows. `stored` is the race's own row; `savedTrainerMode`
 * the mode of the trainers' controls record when this device saved one (web:
 * the localStorage row exists; app: the record carries `saved`), else null.
 */
export function resolveRaceHelmControl(stored: unknown, savedTrainerMode: unknown): RaceHelmControl {
  if (isRaceHelmControl(stored)) return stored;
  if (savedTrainerMode === "wheels" || savedTrainerMode === "sliders") return savedTrainerMode;
  return "arrows";
}

/** What a result remembers about the helm: the control and the assists used. */
export interface RaceAssistRecord {
  readonly helm: RaceHelmControl;
  /** Tacks and gybes the button finished. */
  readonly buttonTurns: number;
  /** Whole seconds with BEST VMG on (no gold: owner decision R-8). */
  readonly bestVmgSec: number;
  /** Whole seconds with the angle hold on. */
  readonly angleHoldSec: number;
}

const ASSIST_MAX = { buttonTurns: 1000, seconds: 7200 } as const;
const whole = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(Number.isFinite(v) ? v : 0)));

export function raceAssistRecord(helm: RaceHelmControl, usage: HelmUsage): RaceAssistRecord {
  return { helm, buttonTurns: whole(usage.buttonTurns, ASSIST_MAX.buttonTurns),
    bestVmgSec: whole(usage.bestVmgSec, ASSIST_MAX.seconds), angleHoldSec: whole(usage.angleHoldSec, ASSIST_MAX.seconds) };
}

/** A submitted or stored record, or null (absent or malformed: results saved
 * before package 13 have none and stay valid). */
export function readRaceAssistRecord(raw: unknown): RaceAssistRecord | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const int = (v: unknown, max: number) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;
  if (!isRaceHelmControl(r.helm) || !int(r.buttonTurns, ASSIST_MAX.buttonTurns) || !int(r.bestVmgSec, ASSIST_MAX.seconds)
    || !int(r.angleHoldSec, ASSIST_MAX.seconds)) return null;
  return { helm: r.helm, buttonTurns: r.buttonTurns as number, bestVmgSec: r.bestVmgSec as number, angleHoldSec: r.angleHoldSec as number };
}

/** BEST VMG sailed in this race: it costs gold like the route hints (R-8);
 * the arrows, the tack button and the angle hold do not. */
export function assistCostsGold(usage: Pick<HelmUsage, "bestVmgSec">): boolean {
  return usage.bestVmgSec > 0;
}
