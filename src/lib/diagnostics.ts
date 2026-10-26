import { WIND_DISPLAYS, type WindDisplay } from "./race-visual-prefs";

/** Local diagnostics only. This module has no platform, storage or clock globals. */
export const DIAGNOSTIC_STORAGE_KEY = "regatta.diagnostics.v1";
export const DIAGNOSTIC_MAX_ENTRIES = 200;
export const DIAGNOSTIC_MAX_BYTES = 64 * 1024;
export const DIAGNOSTIC_ENTRY_MAX_BYTES = 512;
export const DIAGNOSTIC_BATCH_MAX_EVENTS = 16;
export const DIAGNOSTIC_BATCH_MAX_BYTES = 8 * 1024;
export const DIAGNOSTIC_TTL_MS = 48 * 60 * 60 * 1000;
const SNAPSHOT_BYTES = DIAGNOSTIC_MAX_BYTES - 128;
const MAX_COUNTER = Number.MAX_SAFE_INTEGER;
const MAX_ELAPSED = DIAGNOSTIC_TTL_MS;
const COALESCE_MS = 250;

export const DIAGNOSTIC_SURFACES = ["app", "radio", "race", "multiplayer", "replay", "basics", "trainer", "boat", "anatomy", "sternik", "learn", "menu", "diagnostics"] as const;
export const DIAGNOSTIC_OUTCOMES = ["accepted", "noop", "rejected", "failed"] as const;
export const DIAGNOSTIC_REASONS = ["unchanged", "limit", "disabled", "invalid-input", "invalid-message", "unsupported", "power-off", "tx-inhibit", "inspect", "cancelled", "pointer-cancel", "lost-capture", "blur", "hidden", "unmount", "secondary-pointer", "wrong-key", "duplicate", "stale-attempt", "timeout", "storage-invalid", "storage-read", "storage-write", "storage-unavailable", "webview-load", "webview-process", "scene-load", "not-ready", "not-found", "connection", "permission", "model-unavailable", "unknown"] as const;
export const RADIO_DIAGNOSTIC_ACTIONS = ["dial-hold", "dial-push", "dial-rotate", "key-16c", "key-16c-hold", "soft", "soft-page", "up", "down", "ent", "clr", "menu", "distress-down", "distress-up", "distress-held", "distress-txdone", "cancel-txdone", "auto-retx", "coast-ack", "otherdsc-ack", "scan-tick", "dw-tick", "alarm-off", "aqua-down", "aqua-up", "ptt-down", "ptt-up"] as const;
export const RADIO_DIAGNOSTIC_SCREENS = ["off", "standby", "volume", "squelch", "channel-select", "backlight", "menu", "m323-dsc-calls", "gps-info", "radio-info", "dsc-log", "stub-view", "config", "dsc-settings", "position-input", "individual-id-list", "individual-id-add-mmsi", "individual-id-add-name", "individual-id-delete", "distress-compose", "distress-nature", "distress-hold", "distress-tx", "distress-wait", "distress-ack", "distress-ack-done", "cancel-confirm", "cancel-tx", "cancel-voice", "cancel-done", "otherdsc-compose", "otherdsc-field", "otherdsc-sent", "otherdsc-ack", "rx-distress-alert", "rx-individual-call"] as const;
export const DIAGNOSTIC_DESTINATIONS = ["home", "learn", "practice", "race", "library", "menu", "sails", "course", "quick", "rules", "tactics", "points", "radio", "radio-practice", "motor", "basics", "trainer", "boat", "solo", "multiplayer", "leaderboard", "history", "replay", "coach", "anatomy", "onboard", "checklist", "glossary", "spots", "gallery", "ask", "settings", "diagnostics", "support", "privacy", "unknown"] as const;
const SOURCES = ["pointer", "keyboard", "arrow", "slider", "system", "native", "assistive"] as const;
const CAMERAS = ["orbit", "stern", "high", "whole", "sails", "main", "jib", "deck", "mainsheet", "top", "side", "rear", "3d"] as const;
type Member<T extends readonly string[]> = T[number];
export type DiagnosticSurface = Member<typeof DIAGNOSTIC_SURFACES>;
export type DiagnosticOutcome = Member<typeof DIAGNOSTIC_OUTCOMES>;
export type DiagnosticReason = Member<typeof DIAGNOSTIC_REASONS>;
export type DiagnosticSource = Member<typeof SOURCES>;
type RadioScreen = Member<typeof RADIO_DIAGNOSTIC_SCREENS>;
type Common = { surface: DiagnosticSurface; outcome: DiagnosticOutcome; reason?: DiagnosticReason; source?: DiagnosticSource };
type ControlValues = {
  rudder: number; course: number; mainsheet: number; jibsheet: number; reef: number;
  twa: number; "jib-furl": number; outhaul: number; "show-optimal": boolean; "course-assist": boolean; "vang-span": number; "light-renderer": boolean; shore: boolean; venue: "gocek" | "split" | "mazury" | "solent" | "open";
  "main-working-length": number; traveler: number; "wind-speed": number; "wind-direction": number;
  "main-angle": number; "jib-angle": number; "main-twist": number; "jib-twist": number;
  camber: number; heel: number; luff: number;
  "main-hoisted": boolean; "jib-open": boolean; "sails-raised": boolean; airflow: boolean;
  "wind-mode": "steady" | "shift" | "gust"; tack: "port" | "starboard";
  camera: Member<typeof CAMERAS>; view: Member<typeof CAMERAS>; "race-map": boolean;
};
type PreferenceValues = {
  mode: "sliders" | "wheels"; "helm-mapping": "course" | "rudder";
  "return-center": boolean; sensitivity: 0.5 | 1 | 2; "jib-side": "left" | "right";
  sound: boolean; guidance: boolean; "trim-hints": boolean; rules: boolean; penalties: boolean; "favorites-count": number; "wind-display": WindDisplay; "mini-map": boolean;
};
type Changes<T, K extends string> = { [P in keyof T]: { [Q in K]: P } & { value: T[P]; previous?: T[P] } }[keyof T];
export type DiagnosticInput = Common & (
  | { type: "radio.command"; action: Member<typeof RADIO_DIAGNOSTIC_ACTIONS>; model?: "M330" | "M323"; screenFrom?: RadioScreen; screenTo?: RadioScreen; direction?: 1 | -1; index?: number; volume?: number; squelch?: number; channel?: number; power?: boolean }
  | { type: "radio.gesture"; action: "start" | "rotate" | "tap" | "hold" | "cancel" | "ignored"; control: "dial" | "16c" | "ptt" | "distress" | "aqua"; steps?: number }
  | { type: "radio.startup"; action: "begin" | "storage-read" | "bootstrap" | "load" | "ready" | "retry" | "error" | "process-terminated"; supportCode?: "SRC-S01" | "SRC-S02" | "SRC-S03" | "SRC-B01" | "SRC-W01" | "SRC-W02" | "SRC-W03"; attempt?: number; wkDomain?: "WKErrorDomain" | "WebKitErrorDomain" | "NSURLErrorDomain" | "NSCocoaErrorDomain" | "other"; wkCode?: number }
  | { type: "navigation"; action: "request" | "confirmed" | "cancelled" | "back"; from?: Member<typeof DIAGNOSTIC_DESTINATIONS>; to?: Member<typeof DIAGNOSTIC_DESTINATIONS> }
  | { type: "embedded.lifecycle"; action: "begin" | "ready" | "retry" | "error" | "process-terminated" | "background" | "foreground"; attempt?: number }
  | ({ type: "control.change" } & Changes<ControlValues, "control">)
  | ({ type: "control.preferences" } & Changes<PreferenceValues, "preference">)
  | { type: "race.lifecycle"; action: "briefing" | "init" | "scene-ready" | "countdown" | "start" | "pause" | "resume" | "exit" | "finish" | "timeout"; mode?: "simple" | "pro"; phase?: "menu" | "briefing" | "countdown" | "racing" | "finished" | "replay"; elapsedSeconds?: number }
  | { type: "race.save"; action: "request" | "ack" | "retry" | "error"; target: "local" | "share" | "leaderboard" | "coach"; attempt?: number }
  | { type: "race.replay"; action: "open" | "play" | "pause" | "seek" | "rate" | "close" | "error"; timeSeconds?: number; rate?: 0.25 | 0.5 | 1 | 2 | 4 }
  | { type: "trainer.lifecycle"; action: "reset" | "restore" | "pause" | "resume" | "preset" | "ready" | "error" | "assessment"; mode?: "free" | "sail" | "drill" | "scenario" | "lesson"; attempt?: number }
  | { type: "trainer.checkpoint"; action: "save" | "restore" | "clear" | "error"; attempt?: number }
  | { type: "storage.operation"; action: "read" | "write" | "clear" | "restore"; target: "course" | "progress" | "checkpoint" | "preferences" | "diagnostics" | "personal-best" | "history" }
  | { type: "learning.command"; action: "start" | "answer" | "check" | "next" | "back" | "complete" | "retry"; course: "foundation" | "sails" | "radio" | "sternik"; step?: number }
);
export interface DiagnosticEntry {
  readonly seq: number;
  readonly session: number;
  readonly elapsedMs: number;
  readonly lastElapsedMs: number;
  readonly count: number;
  readonly event: Readonly<DiagnosticInput>;
}
export interface DiagnosticSnapshot {
  readonly version: 1;
  readonly session: number;
  /** Omitted inputs, including evicted coalesced commands, not just rows. */
  readonly dropped: number;
  readonly entries: readonly DiagnosticEntry[];
}
export interface DiagnosticJournal {
  record(input: DiagnosticInput): DiagnosticEntry | null;
  snapshot(): DiagnosticSnapshot;
  subscribe(listener: () => void): () => void;
  clear(): void;
  /** Merge previous-session history with any already recorded current events. */
  restore(rawSnapshot: unknown): boolean;
}
export interface DiagnosticBatch { readonly version: 1; readonly events: readonly Readonly<DiagnosticInput>[] }
export const EMPTY_DIAGNOSTIC_SNAPSHOT: DiagnosticSnapshot = Object.freeze({ version: 1, session: 1, dropped: 0, entries: Object.freeze([]) });

type Check = (value: unknown) => boolean;
const enumeration = (values: readonly (string | number)[]): Check => value => values.includes(value as string | number);
const numeric = (min: number, max: number, integer = false): Check => v => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max && (!integer || Number.isInteger(v));
const boolean: Check = v => typeof v === "boolean";
const controlChecks: Record<keyof ControlValues, Check> = {
  twa: numeric(-180, 180), "jib-furl": numeric(0, 1), outhaul: numeric(0, 1), "show-optimal": boolean, "course-assist": boolean, "vang-span": numeric(0, 4), "light-renderer": boolean, shore: boolean, venue: enumeration(["gocek", "split", "mazury", "solent", "open"]),
  rudder: numeric(-1, 1), course: numeric(0, 360), mainsheet: numeric(0, 1), jibsheet: numeric(0, 1), reef: numeric(0, 1),
  "main-working-length": numeric(6.4, 32), traveler: numeric(-.8, .8), "wind-speed": numeric(0, 60), "wind-direction": numeric(0, 360),
  "main-angle": numeric(-180, 180), "jib-angle": numeric(-180, 180), "main-twist": numeric(0, 1), "jib-twist": numeric(0, 1),
  camber: numeric(0, 1), heel: numeric(-90, 90), luff: numeric(0, 1), "main-hoisted": boolean, "jib-open": boolean, "sails-raised": boolean, airflow: boolean,
  "wind-mode": enumeration(["steady", "shift", "gust"]), tack: enumeration(["port", "starboard"]), camera: enumeration(CAMERAS), view: enumeration(CAMERAS), "race-map": boolean,
};
const preferenceChecks: Record<keyof PreferenceValues, Check> = {
  mode: enumeration(["sliders", "wheels"]), "helm-mapping": enumeration(["course", "rudder"]), "return-center": boolean,
  "favorites-count": numeric(0, 12, true), sensitivity: enumeration([.5, 1, 2]), "jib-side": enumeration(["left", "right"]), sound: boolean, guidance: boolean, "trim-hints": boolean, rules: boolean, penalties: boolean, "wind-display": enumeration(WIND_DISPLAYS), "mini-map": boolean,
};
const commonChecks: Record<string, Check> = { surface: enumeration(DIAGNOSTIC_SURFACES), outcome: enumeration(DIAGNOSTIC_OUTCOMES), reason: enumeration(DIAGNOSTIC_REASONS), source: enumeration(SOURCES) };
const attempt = numeric(0, 100000, true);
const schemas: Record<DiagnosticInput["type"], { required: string[]; fields: Record<string, Check> }> = {
  "radio.command": { required: ["action"], fields: { action: enumeration(RADIO_DIAGNOSTIC_ACTIONS), model: enumeration(["M330", "M323"]), screenFrom: enumeration(RADIO_DIAGNOSTIC_SCREENS), screenTo: enumeration(RADIO_DIAGNOSTIC_SCREENS), direction: enumeration([-1, 1]), index: numeric(0, 3, true), volume: numeric(0, 20, true), squelch: numeric(0, 10, true), channel: numeric(1, 88, true), power: boolean } },
  "radio.gesture": { required: ["action", "control"], fields: { action: enumeration(["start", "rotate", "tap", "hold", "cancel", "ignored"]), control: enumeration(["dial", "16c", "ptt", "distress", "aqua"]), steps: numeric(-1000, 1000, true) } },
  "radio.startup": { required: ["action"], fields: { action: enumeration(["begin", "storage-read", "bootstrap", "load", "ready", "retry", "error", "process-terminated"]), supportCode: enumeration(["SRC-S01", "SRC-S02", "SRC-S03", "SRC-B01", "SRC-W01", "SRC-W02", "SRC-W03"]), attempt, wkDomain: enumeration(["WKErrorDomain", "WebKitErrorDomain", "NSURLErrorDomain", "NSCocoaErrorDomain", "other"]), wkCode: numeric(-100000, 100000, true) } },
  navigation: { required: ["action"], fields: { action: enumeration(["request", "confirmed", "cancelled", "back"]), from: enumeration(DIAGNOSTIC_DESTINATIONS), to: enumeration(DIAGNOSTIC_DESTINATIONS) } },
  "embedded.lifecycle": { required: ["action"], fields: { action: enumeration(["begin", "ready", "retry", "error", "process-terminated", "background", "foreground"]), attempt } },
  "control.change": { required: ["control", "value"], fields: { control: enumeration(Object.keys(controlChecks)), value: () => true, previous: () => true } },
  "control.preferences": { required: ["preference", "value"], fields: { preference: enumeration(Object.keys(preferenceChecks)), value: () => true, previous: () => true } },
  "race.lifecycle": { required: ["action"], fields: { action: enumeration(["briefing", "init", "scene-ready", "countdown", "start", "pause", "resume", "exit", "finish", "timeout"]), mode: enumeration(["simple", "pro"]), phase: enumeration(["menu", "briefing", "countdown", "racing", "finished", "replay"]), elapsedSeconds: numeric(0, 7200) } },
  "race.save": { required: ["action", "target"], fields: { action: enumeration(["request", "ack", "retry", "error"]), target: enumeration(["local", "share", "leaderboard", "coach"]), attempt } },
  "race.replay": { required: ["action"], fields: { action: enumeration(["open", "play", "pause", "seek", "rate", "close", "error"]), timeSeconds: numeric(0, 86400), rate: enumeration([.25, .5, 1, 2, 4]) } },
  "trainer.lifecycle": { required: ["action"], fields: { action: enumeration(["reset", "restore", "pause", "resume", "preset", "ready", "error", "assessment"]), mode: enumeration(["free", "sail", "drill", "scenario", "lesson"]), attempt } },
  "trainer.checkpoint": { required: ["action"], fields: { action: enumeration(["save", "restore", "clear", "error"]), attempt } },
  "storage.operation": { required: ["action", "target"], fields: { action: enumeration(["read", "write", "clear", "restore"]), target: enumeration(["course", "progress", "checkpoint", "preferences", "diagnostics", "personal-best", "history"]) } },
  "learning.command": { required: ["action", "course"], fields: { action: enumeration(["start", "answer", "check", "next", "back", "complete", "retry"]), course: enumeration(["foundation", "sails", "radio", "sternik"]), step: numeric(0, 10000, true) } },
};
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const owns = (o: object, key: string) => Object.prototype.hasOwnProperty.call(o, key);
function utf8Bytes(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 128) n++; else if (c < 2048) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff && text.charCodeAt(i + 1) >= 0xdc00 && text.charCodeAt(i + 1) <= 0xdfff) { n += 4; i++; }
    else n += 3;
  }
  return n;
}
function encoded(v: unknown, max: number): string | null {
  try { const text = JSON.stringify(v); return typeof text === "string" && utf8Bytes(text) <= max ? text : null; } catch { return null; }
}
function decode(v: unknown, max: number): unknown {
  if (typeof v !== "string") return encoded(v, max) === null ? undefined : v;
  if (utf8Bytes(v) > max) return undefined;
  try { return JSON.parse(v); } catch { return undefined; }
}
function exactKeys(o: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(o).every(key => keys.includes(key));
}
function readInput(raw: unknown): Readonly<DiagnosticInput> | null {
  try {
    if (!object(raw) || typeof raw.type !== "string" || !owns(schemas, raw.type)) return null;
    const schema = schemas[raw.type as DiagnosticInput["type"]];
    const checks = { ...commonChecks, ...schema.fields };
    if (!exactKeys(raw, ["type", ...Object.keys(checks)]) || !["surface", "outcome", ...schema.required].every(key => owns(raw, key))) return null;
    const out: Record<string, unknown> = { type: raw.type };
    for (const [key, value] of Object.entries(raw)) {
      if (key === "type" || value === undefined) continue;
      if (!checks[key]?.(value)) return null;
      out[key] = value;
    }
    if (!["surface", "outcome", ...schema.required].every(key => owns(out, key)) || !commonChecks.surface(out.surface) || !commonChecks.outcome(out.outcome)) return null;
    if (raw.type === "control.change" || raw.type === "control.preferences") {
      const control = raw.type === "control.change" ? controlChecks[out.control as keyof ControlValues] : preferenceChecks[out.preference as keyof PreferenceValues];
      if (!control(out.value) || (owns(out, "previous") && !control(out.previous))) return null;
    }
    if (encoded(out, DIAGNOSTIC_ENTRY_MAX_BYTES - 100) === null) return null;
    return Object.freeze(out) as Readonly<DiagnosticInput>;
  } catch { return null; }
}
function readSnapshot(raw: unknown): DiagnosticSnapshot | null {
  try {
    const a = decode(raw, SNAPSHOT_BYTES);
    if (!object(a) || !exactKeys(a, ["version", "session", "dropped", "entries"]) || a.version !== 1 || !numeric(1, MAX_COUNTER, true)(a.session) || !numeric(0, MAX_COUNTER, true)(a.dropped) || !Array.isArray(a.entries) || a.entries.length > DIAGNOSTIC_MAX_ENTRIES) return null;
    const entries: DiagnosticEntry[] = [];
    let seq = 0, session = 0, lastElapsed = 0;
    for (const rawEntry of a.entries) {
      if (!object(rawEntry) || !exactKeys(rawEntry, ["seq", "session", "elapsedMs", "lastElapsedMs", "count", "event"]) || !numeric(seq + 1, MAX_COUNTER, true)(rawEntry.seq)
        || !numeric(Math.max(1, session), a.session as number, true)(rawEntry.session) || !numeric(0, MAX_ELAPSED, true)(rawEntry.elapsedMs)
        || !numeric(rawEntry.elapsedMs as number, MAX_ELAPSED, true)(rawEntry.lastElapsedMs) || !numeric(1, 10000, true)(rawEntry.count)) return null;
      if (rawEntry.session === session && (rawEntry.elapsedMs as number) < lastElapsed) return null;
      const event = readInput(rawEntry.event);
      if (!event) return null;
      const entry = Object.freeze({ seq: rawEntry.seq as number, session: rawEntry.session as number, elapsedMs: rawEntry.elapsedMs as number,
        lastElapsedMs: rawEntry.lastElapsedMs as number, count: rawEntry.count as number, event });
      if (encoded(entry, DIAGNOSTIC_ENTRY_MAX_BYTES) === null) return null;
      entries.push(entry); seq = entry.seq; session = entry.session; lastElapsed = entry.lastElapsedMs;
    }
    return Object.freeze({ version: 1, session: a.session as number, dropped: a.dropped as number, entries: Object.freeze(entries) });
  } catch { return null; }
}
function coalesces(a: DiagnosticEntry, b: Readonly<DiagnosticInput>, now: number): boolean {
  if (now - a.lastElapsedMs > COALESCE_MS || a.count >= 10000 || a.event.type !== b.type || a.event.outcome === "failed" || a.event.outcome === "rejected") return false;
  if (!(b.type === "control.change" || (b.type === "radio.command" && b.action === "dial-rotate") || (b.type === "radio.gesture" && b.action === "rotate"))) return false;
  if (b.type === "radio.gesture" && a.event.type === "radio.gesture") {
    const previous = a.event.steps ?? 0, next = b.steps ?? 0;
    if ((previous && next && Math.sign(previous) !== Math.sign(next)) || Math.abs(previous + next) > 1000) return false;
  }
  const identity = (v: Readonly<DiagnosticInput>) => Object.fromEntries(Object.entries(v).filter(([k]) => !["value", "previous", "volume", "squelch", "channel", "steps"].includes(k)));
  return JSON.stringify(identity(a.event)) === JSON.stringify(identity(b));
}

export function createDiagnosticJournal({ now, capacity = DIAGNOSTIC_MAX_ENTRIES }: { now: () => number; capacity?: number }): DiagnosticJournal {
  const limit = Number.isFinite(capacity) ? Math.max(1, Math.min(DIAGNOSTIC_MAX_ENTRIES, Math.floor(capacity))) : DIAGNOSTIC_MAX_ENTRIES;
  let view = EMPTY_DIAGNOSTIC_SNAPSHOT, seq = 0, elapsed = 0, restored = false;
  let epoch: number | null = null;
  const listeners = new Set<() => void>();
  const time = () => {
    try {
      const n = now();
      if (Number.isFinite(n)) {
        if (epoch === null) epoch = n;
        elapsed = Math.max(elapsed, Math.min(MAX_ELAPSED, Math.max(0, Math.floor(n - epoch))));
      }
    } catch { /* A diagnostic clock cannot break a command. */ }
    return elapsed;
  };
  time();
  const publish = (entries: DiagnosticEntry[], session: number, dropped: number) => {
    while (entries.length > limit) dropped = Math.min(MAX_COUNTER, dropped + entries.shift()!.count);
    while (encoded({ version: 1, session, dropped, entries }, SNAPSHOT_BYTES) === null && entries.length) dropped = Math.min(MAX_COUNTER, dropped + entries.shift()!.count);
    view = Object.freeze({ version: 1, session, dropped, entries: Object.freeze(entries) });
    for (const listener of listeners) { try { listener(); } catch { /* Isolate panel/persistence subscribers. */ } }
  };
  return {
    record(raw) {
      const input = readInput(raw);
      if (!input || seq >= MAX_COUNTER) { publish([...view.entries], view.session, Math.min(MAX_COUNTER, view.dropped + 1)); return null; }
      const at = time(), entries = [...view.entries], previous = entries.at(-1);
      let entry: DiagnosticEntry;
      if (previous?.session === view.session && coalesces(previous, input, at)) {
        let event = input;
        if (input.type === "control.change" && previous.event.type === "control.change" && previous.event.previous !== undefined) event = Object.freeze({ ...input, previous: previous.event.previous }) as Readonly<DiagnosticInput>;
        if (input.type === "radio.gesture" && previous.event.type === "radio.gesture") {
          const steps = (previous.event.steps ?? 0) + (input.steps ?? 0);
          if (Math.abs(steps) <= 1000) event = Object.freeze({ ...input, steps });
        }
        entry = Object.freeze({ ...previous, lastElapsedMs: at, count: previous.count + 1, event });
        if (encoded(entry, DIAGNOSTIC_ENTRY_MAX_BYTES) !== null) entries.pop();
        else entry = Object.freeze({ seq: ++seq, session: view.session, elapsedMs: at, lastElapsedMs: at, count: 1, event: input });
      } else entry = Object.freeze({ seq: ++seq, session: view.session, elapsedMs: at, lastElapsedMs: at, count: 1, event: input });
      if (encoded(entry, DIAGNOSTIC_ENTRY_MAX_BYTES) === null) { publish([...view.entries], view.session, Math.min(MAX_COUNTER, view.dropped + 1)); return null; }
      entries.push(entry); publish(entries, view.session, view.dropped); return entry;
    },
    snapshot: () => view,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    clear() { if (view.entries.length || view.dropped) publish([], view.session, 0); },
    restore(raw) {
      const saved = readSnapshot(raw);
      if (!saved || restored || Math.max(saved.session, view.session) >= MAX_COUNTER) return false;
      const session = Math.max(saved.session, view.session) + 1;
      let nextSeq = Math.max(0, ...saved.entries.map(e => e.seq));
      if (nextSeq + view.entries.length >= MAX_COUNTER) return false;
      const current = view.entries.map(e => Object.freeze({ ...e, seq: ++nextSeq, session }));
      seq = nextSeq;
      restored = true;
      publish([...saved.entries, ...current], session, Math.min(MAX_COUNTER, saved.dropped + view.dropped));
      return true;
    },
  };
}

/** Batch carries inputs only. Native assigns its own sequence/session/time. */
export function parseDiagnosticBatch(raw: unknown): DiagnosticBatch | null {
  try {
    const a = decode(raw, DIAGNOSTIC_BATCH_MAX_BYTES);
    if (!object(a) || !exactKeys(a, ["version", "events"]) || a.version !== 1 || !Array.isArray(a.events) || a.events.length > DIAGNOSTIC_BATCH_MAX_EVENTS) return null;
    const events = a.events.map(readInput);
    if (events.some(e => !e)) return null;
    return Object.freeze({ version: 1, events: Object.freeze(events as Readonly<DiagnosticInput>[]) });
  } catch { return null; }
}
export function serializeDiagnosticBatch(events: readonly DiagnosticInput[]): string | null {
  const batch = parseDiagnosticBatch({ version: 1, events });
  return batch ? encoded(batch, DIAGNOSTIC_BATCH_MAX_BYTES) : null;
}

/** TTL is 48 hours since the last persisted snapshot. Wall time exists only in
 * this envelope, never an entry, and is supplied by the platform adapter. */
export function serializeDiagnosticPersistence(snapshot: DiagnosticSnapshot, nowMs: number): string | null {
  const safe = readSnapshot(snapshot);
  return safe && numeric(0, MAX_COUNTER, true)(nowMs) ? encoded({ version: 1, savedAtMs: nowMs, snapshot: safe }, DIAGNOSTIC_MAX_BYTES) : null;
}
export function parseDiagnosticPersistence(raw: unknown, nowMs: number): DiagnosticSnapshot | null {
  try {
    const a = decode(raw, DIAGNOSTIC_MAX_BYTES);
    if (!object(a) || !exactKeys(a, ["version", "savedAtMs", "snapshot"]) || a.version !== 1 || !numeric(0, MAX_COUNTER, true)(a.savedAtMs) || !numeric(0, MAX_COUNTER, true)(nowMs)) return null;
    const age = nowMs - (a.savedAtMs as number);
    return age >= 0 && age < DIAGNOSTIC_TTL_MS ? readSnapshot(a.snapshot) : null;
  } catch { return null; }
}
