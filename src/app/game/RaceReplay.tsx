'use client';

// The race replay (solo results, native history, shared /r/[code]): recorded
// positions in the original course, rendered by the same local scene. M4-3
// makes it teach: it can start playing on open (from the results) and at a
// moment (a judge item or a coach mistake, 5 s before it), it has the speeds
// 0.5x-4x, the race cameras (picker, switch button, a tap on the scene) and
// an event ribbon (start, tacks with the speed they cost, the windward mark,
// the judge's items) where a tap jumps to 5 s before the event. The clock
// waits for the 3D scene's first frame, so the 5 s lead is never spent behind
// the loading screen. The pure parts live in src/lib/race-replay-teaching.ts.
// F3: the corner map opens the big race map with the boat and its track at
// the replay's time (the same panel as in the race).

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { NativeRaceSnapshot } from "@/lib/race-native";
import type { Race3DBoat, RaceCamera } from "@/features/race-3d/pose";
import { useVenue } from "@/features/venues/useVenue";
import { useRaceView } from "@/features/race-3d/useRaceView";
import { replayFrame } from "@/lib/race-replay-frame";
import { useI18n, type Lang } from "@/lib/i18n";
import { useReplayCopy } from "./replay-copy";
import { PLAYER_COLOR } from "./race-model";
import { readRacePrefs } from "./race-prefs";
import styles from "./RaceCockpit.module.css";
import { recordControlChange, recordDiagnostic } from "@/lib/diagnostics-controls";
import { initializeDiagnosticBridge } from "@/lib/diagnostics-bridge";
import type { RaceJudgeItem } from "@/lib/race-judge";
import type { SkillEvent } from "@/lib/race-tack-metrics";
import { REPLAY_SPEEDS, replayClockStep, replayRibbon, replayRibbonCurrent, replaySeekTarget, type ReplayRibbonItem, type ReplaySpeed } from "@/lib/race-replay-teaching";
import { replayTeachingCopy } from "@/data/replay-teaching-copy";
import { raceJudgeJostleLabel, raceJudgeKindLabels } from "@/data/race-judge-labels";
import { RACE_UNITS } from "@/features/race-hud/units";
import { createTapTracker, nextRaceCamera, type TapTracker } from "@/features/race-scene/camera";
import { RACE_CAMERA_SWITCH, sceneTapHandlers } from "@/features/race-scene/camera-tap";
import { CameraIcon } from "@/features/race-hud/RaceIcons";
import { createRaceNavigationSnapshot } from "@/features/race-hud/navigation-model";
import { RaceMiniMapButton } from "@/features/race-hud/RaceCornerInstruments";
import { RaceBigMap } from "@/features/race-hud/RaceBigMap";
import { RACE_MAP_COPY } from "@/data/race-map-copy";
import corner from "@/features/race-hud/RaceCornerInstruments.module.css";

const RaceScene = dynamic(() => import("@/features/race-scene/RaceScene").then(m => m.RaceScene), { ssr: false });

const NO_EVENTS: readonly SkillEvent[] = [];

/** Race time as m:ss (negative before the start signal), as the judge shows it. */
function clock(seconds: number): string {
  const sign = seconds < 0 ? "-" : "";
  const total = Math.floor(Math.abs(seconds));
  return `${sign}${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** What one ribbon item says: the moment, the event and, for a tack, the speed it cost. */
export function ribbonItemText(item: ReplayRibbonItem, lang: Lang): string {
  const at = clock(item.t);
  if (item.kind === "start") return `${at} ${replayTeachingCopy.start[lang]}`;
  if (item.kind === "mark") return `${at} ${replayTeachingCopy.mark[lang]}`;
  if (item.kind === "judge") return `${at} ${item.jostle ? raceJudgeJostleLabel[lang] : raceJudgeKindLabels[item.judgeKind][lang]}`;
  const tack = `${at} ${replayTeachingCopy.tack[lang]}`;
  if (item.lossKn === null) return tack;
  const kn = new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Math.round(item.lossKn * 10) / 10);
  return `${tack}, ${replayTeachingCopy.tackLoss[lang].replace("{n}", `${kn} ${RACE_UNITS.knots[lang]}`)}`;
}

/** A speed button's label: the step with the language's decimal mark ("0,5×"
 * next to the ribbon's "0,6 уз"; whole steps read "2×" in every language). */
export function replaySpeedLabel(step: ReplaySpeed, lang: Lang): string {
  return `${new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(step)}×`;
}

/** The replay's bottom controls: play, the timeline, the speeds and the
 * event ribbon. Presentational: RaceReplay owns the clock. Cyan only for the
 * speed that is on and the ribbon event the replay is at (both "selected");
 * `pinned` is the event the player jumped to (replayRibbonCurrent). */
export function ReplayControls({ playing, time, first, total, rate, ribbon, pinned = null, onPlay, onSeek, onRate, onJump }: {
  playing: boolean; time: number; first: number; total: number; rate: ReplaySpeed; ribbon: readonly ReplayRibbonItem[]; pinned?: string | null;
  onPlay: () => void; onSeek: (t: number) => void; onRate: (rate: ReplaySpeed) => void; onJump: (item: ReplayRibbonItem) => void;
}) {
  const { tl, lang } = useI18n();
  const c = useReplayCopy();
  const current = replayRibbonCurrent(ribbon, time, pinned);
  return <>
    <div className="px-4 py-3 flex items-center gap-4">
      <button type="button" onClick={onPlay} data-testid="replay-play">{playing ? c.pause : c.resume}</button>
      <input type="range" className="flex-1 min-w-0 min-h-11" aria-label={c.raceReplay} min={first} max={total} step="any" value={time}
        onChange={e => onSeek(Number(e.target.value))}
        onKeyDown={e => { if (e.key === "Home" || e.key === "End") { e.preventDefault(); onSeek(e.key === "Home" ? first : total); } }} />
      <output>{Math.floor(time / 60)}:{String(Math.floor(time % 60)).padStart(2, "0")}</output>
    </div>
    <div className="flex items-center gap-1 px-4 pb-2" role="group" aria-label={tl(replayTeachingCopy.speed)} data-testid="replay-speed">
      {REPLAY_SPEEDS.map(step => <button type="button" key={step} aria-pressed={rate === step} onClick={() => onRate(step)}
        className="min-h-11 min-w-11 rounded-md border px-2 tabular-nums"
        style={rate === step ? { color: "var(--accent-cyan)", borderColor: "var(--accent-cyan)" } : { borderColor: "var(--border-subtle)" }}>{replaySpeedLabel(step, lang)}</button>)}
    </div>
    {ribbon.length > 0 && <ol className="flex shrink-0 gap-2 overflow-x-auto overscroll-x-contain px-4 pb-3" aria-label={tl(replayTeachingCopy.ribbon)} data-testid="replay-ribbon">
      {ribbon.map(item => <li key={item.id} className="shrink-0">
        <button type="button" onClick={() => onJump(item)} aria-current={current === item.id ? "true" : undefined}
          data-kind={item.kind} data-seek={item.seekT}
          className="min-h-11 whitespace-nowrap rounded-md border px-3 text-sm tabular-nums text-[var(--text-primary)]"
          style={current === item.id ? { color: "var(--accent-cyan)", borderColor: "var(--accent-cyan)" } : { borderColor: "var(--border-subtle)" }}>
          {ribbonItemText(item, lang)}
        </button>
      </li>)}
    </ol>}
  </>;
}

export function RaceReplay({ samples, course, onClose, autoplay = false, startAt = null, events = NO_EVENTS, judgeItems }: {
  samples: NativeRaceSnapshot["samples"]; course: NativeRaceSnapshot["course"]; onClose: () => void;
  /** M4-3: start playing on open (from the results screen). */
  autoplay?: boolean;
  /** M4-3: the race moment to open at (a judge item, a coach mistake); the replay starts 5 s before it. */
  startAt?: number | null;
  /** The race log's events for the ribbon (start, tacks, the mark rounding). */
  events?: readonly SkillEvent[];
  /** The training judge's items of this race, for the ribbon. */
  judgeItems?: readonly RaceJudgeItem[];
}) {
  const { tl, lang } = useI18n();
  const c = useReplayCopy();
  const { venue } = useVenue();
  const { camera, setCamera } = useRaceView();
  const [cameraRevision, setCameraRevision] = useState(0);
  // F4: the race's "Softer light, clearer marks" holds in the replay too (read
  // once when it opens; it only reaches the client-only scene, never the markup).
  const [softLight] = useState(() => readRacePrefs().softLight === true);
  const first = samples[0]?.t ?? 0;
  const total = samples.at(-1)?.t ?? 0;
  const ribbon = useMemo(() => replayRibbon({ samples, events, judgeItems }), [samples, events, judgeItems]);
  const [playing, setPlaying] = useState(autoplay && total > first);
  const [time, setTime] = useState(() => startAt === null ? first : replaySeekTarget(startAt, first, total));
  const [rate, setRate] = useState<ReplaySpeed>(1);
  // The clock waits for the scene's first frame (replayClockStep): until then
  // a replay that plays on open, or after a jump, holds at its target.
  const [sceneReady, setSceneReady] = useState(false);
  const [onSceneReady] = useState(() => () => setSceneReady(true));
  // The event the player jumped to: opened at a debrief moment, the ribbon
  // item of that moment; a ribbon tap pins its item; a timeline seek clears it.
  const [pinned, setPinned] = useState<string | null>(() => startAt === null ? null : ribbon.find(item => item.t === startAt)?.id ?? null);
  const cursor = useRef(time);
  // The ribbon scrolls sideways on a phone: keep the event the replay is at in
  // view (an instant scroll of the ribbon only, never the page, no animation).
  const rootRef = useRef<HTMLDivElement>(null);
  const currentEvent = replayRibbonCurrent(ribbon, time, pinned);
  useEffect(() => {
    const list = rootRef.current?.querySelector<HTMLElement>('[data-testid="replay-ribbon"]');
    const item = list?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!list || !item) return;
    const box = list.getBoundingClientRect(), at = item.getBoundingClientRect();
    if (at.left < box.left || at.right > box.right) list.scrollLeft += at.left - box.left - 16;
  }, [currentEvent]);
  const seekTo = (next: number) => {
    const previous = cursor.current;
    cursor.current = next; setTime(next);
    recordDiagnostic({ type: "race.replay", surface: "replay", outcome: next === previous ? "noop" : "accepted", action: "seek", timeSeconds: next });
  };
  const seek = (next: number) => { setPinned(null); seekTo(next); };
  const close = () => { recordDiagnostic({ type: "race.replay", surface: "replay", outcome: "accepted", action: "close" }); onClose(); };
  useEffect(() => { initializeDiagnosticBridge(); recordDiagnostic({ type: "race.replay", surface: "replay", outcome: "accepted", action: "open" }); }, []);
  const changeRate = (next: ReplaySpeed) => {
    if (next !== rate) recordDiagnostic({ type: "race.replay", surface: "replay", outcome: "accepted", action: "rate", rate: next });
    setRate(next);
  };
  const play = () => {
    if (cursor.current >= total) cursor.current = first;
    setPlaying(p => !p);
    recordDiagnostic({ type: "race.replay", surface: "replay", outcome: "accepted", action: playing ? "pause" : "play" });
  };
  // A ribbon tap jumps to 5 s before the event and plays it.
  const jump = (item: ReplayRibbonItem) => {
    setPinned(item.id);
    seekTo(item.seekT);
    if (!playing && item.seekT < total) {
      setPlaying(true);
      recordDiagnostic({ type: "race.replay", surface: "replay", outcome: "accepted", action: "play" });
    }
  };
  const pickCamera = (next: RaceCamera) => { setCamera(next); recordControlChange("replay", "camera", next, camera); };
  const tapRef = useRef<TapTracker | null>(null);
  const sceneTap = sceneTapHandlers(() => (tapRef.current ??= createTapTracker()), () => pickCamera(nextRaceCamera(camera)));
  const courseRef = useRef(course);
  const windDirRef = useRef(0);
  const boatsRef = useRef<Race3DBoat[]>([]);
  // M1-7: one wording for the replay title and the results button.
  const title = c.raceReplay;
  const labels = useMemo(() => ({ metres: lang === "ru" ? "м" : "m", scene: title,
    loading: tl({ ru: "Загружаем яхту", en: "Loading the yacht", pl: "Ładujemy jacht", es: "Cargando el velero", fr: "Chargement du voilier", de: "Yacht wird geladen", it: "Caricamento della barca" }),
    error: tl({ ru: "Не удалось открыть 3D. Повтори загрузку.", en: "Could not open 3D. Retry loading.", pl: "Nie udało się otworzyć 3D. Ponów ładowanie.", es: "No se pudo abrir el 3D. Reintenta la carga.", fr: "Impossible d'ouvrir la 3D. Relance le chargement.", de: "3D konnte nicht geöffnet werden. Erneut laden.", it: "Impossibile aprire il 3D. Riprova il caricamento." }), retry: c.retry }), [tl, lang, title, c.retry]);

  useEffect(() => {
    const at = (t: number) => {
      const frame = replayFrame(samples, t); if (!frame) return;
      windDirRef.current = frame.windDir;
      boatsRef.current = [{ id: "player", name: title, color: PLAYER_COLOR, isPlayer: true, ...frame }];
    };
    at(cursor.current);
    let id = 0, last = 0, lastUi = 0;
    const frame = (now: number) => {
      if (last) cursor.current = replayClockStep(cursor.current, (now - last) / 1000, { rate, total, playing, sceneReady, hidden: document.hidden });
      last = now; at(cursor.current);
      if (now - lastUi > 100) { lastUi = now; setTime(cursor.current); }
      if (playing && cursor.current >= total) setPlaying(false);
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [playing, samples, total, title, rate, sceneReady]);

  // F3: the map at the replay's time (the HUD's 10 Hz clock): the course, the
  // boat and its track so far. Old shared replays without a course have none.
  const [bigMap, setBigMap] = useState(false);
  const mapFrame = useMemo(() => replayFrame(samples, time), [samples, time]);
  const navigation = useMemo(() => mapFrame && course ? createRaceNavigationSnapshot({ course,
    boats: [{ id: "player", pos: mapFrame.pos, heading: mapFrame.heading, isPlayer: true, color: PLAYER_COLOR }], windFrom: mapFrame.windDir }) : null, [course, mapFrame]);
  // The track only while the big map is open (the corner map draws none).
  const track = useMemo(() => {
    if (!bigMap) return null;
    const sailed: { x: number; y: number }[] = samples.filter(sample => sample.t <= time);
    if (mapFrame) sailed.push(mapFrame.pos);
    return sailed;
  }, [bigMap, samples, time, mapFrame]);
  const you = tl(RACE_MAP_COPY.you), fleet = tl(RACE_MAP_COPY.fleet);
  const switchName = `${tl(RACE_CAMERA_SWITCH)}: ${c[camera]}`;
  return <div ref={rootRef} className={`${styles.cockpit} absolute inset-0`} data-testid="race-replay-3d">
    <header className={styles.toolbar}><button type="button" onClick={close}>{c.back}</button><strong>{title}</strong></header>
    <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 py-2">
      <select className="min-h-11 min-w-0 flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-2 text-sm text-[var(--text-primary)]" aria-label={c.view} value={camera} onChange={event => pickCamera(event.target.value as RaceCamera)}>{(["orbit", "stern", "high"] as const).map(view => <option key={view} value={view}>{c[view]}</option>)}</select>
      {/* M4-3: the race's camera switch (orbit -> behind -> above); a tap on the scene does the same. */}
      <button type="button" onClick={() => pickCamera(nextRaceCamera(camera))} data-testid="replay-camera-cycle" aria-label={switchName} title={switchName}
        className="inline-flex min-h-11 min-w-11 items-center justify-center"><CameraIcon size={22} /></button>
      <button type="button" onClick={() => { setCameraRevision(value => value + 1); recordControlChange("replay", "camera", camera); }}>{c.resetCamera}</button>
    </div>
    <div className={styles.scene} style={{ flex: 1 }} data-testid="replay-scene" {...sceneTap}><RaceScene boatsRef={boatsRef} courseRef={courseRef} windDirRef={windDirRef} venue={venue} camera={camera} cameraRevision={cameraRevision} labels={labels} onReady={onSceneReady} softLight={softLight} />
      {navigation && <div className={corner.instruments}><RaceMiniMapButton navigation={navigation} onOpenMap={() => setBigMap(true)} you={you} fleet={fleet} /></div>}
      {bigMap && <RaceBigMap snapshot={navigation} track={track} you={you} fleet={fleet} onClose={() => setBigMap(false)} />}
    </div>
    <ReplayControls playing={playing} time={time} first={first} total={total} rate={rate} ribbon={ribbon} pinned={pinned}
      onPlay={play} onSeek={seek} onRate={changeRate} onJump={jump} />
  </div>;
}
