'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useI18n } from "@/lib/i18n";
import { MANOEUVRES, MANOEUVRE_TRACKS, manoeuvreById, type ManoeuvreExercise } from "@/data/manoeuvres";
import { castOff, contactsOf, createRun, scoreRun, stepRun, stepSeconds, targetDistance, windAt, type RunInput, type RunResult, type RunState } from "./runner";
import { isUnlocked, nextExercise, readProgress, recordStars, type Stars } from "./progress";
import { drawScene, frameCamera, type Camera, type Palette } from "./scene";
import Schematic from "./Schematic";
import { copy, fill } from "./copy";
import styles from "./Manoeuvres.module.css";
import { RACE_UNITS, knotsText } from "@/features/race-hud/units";

const IDS = MANOEUVRES.map(e => e.id);
const storage = () => { try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; } };
const starText = (n: number) => "★".repeat(n) + "☆".repeat(3 - n);
const fmt1 = (v: number) => (Math.round(v * 10) / 10).toFixed(1);
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

type View = { kind: "list" } | { kind: "brief"; id: string } | { kind: "play"; id: string };
const LIST: View = { kind: "list" };
const INITIAL_INPUT: RunInput = { helm: 0, throttle: 0, sheets: "trim" };

// False on the server and while hydrating, true on the client afterwards: the
// local progress and the ?ex= deep link are read only then, so the server HTML
// and the first client render match (no hydration mismatch).
const noSubscribe = () => () => {};
const useHydrated = () => useSyncExternalStore(noSubscribe, () => true, () => false);

export default function ManoeuvresApp({ initialSearch }: { initialSearch?: string }) {
  const { tl } = useI18n();
  const loaded = useHydrated();
  // Local progress as stored; a finished attempt replaces it with what it saved.
  const storedStars = useMemo<Stars>(() => loaded ? readProgress(storage(), IDS) : {}, [loaded]);
  const [savedStars, setStars] = useState<Stars | null>(null);
  const stars = savedStars ?? storedStars;
  // A deep link (?ex=<id>) opens that exercise's briefing when it is unlocked.
  const linked = useMemo<View | null>(() => {
    if (!loaded) return null;
    const search = initialSearch ?? window.location.search;
    const id = new URLSearchParams(search).get("ex");
    return id && manoeuvreById(id) && isUnlocked(MANOEUVRES, storedStars, id) ? { kind: "brief", id } : null;
  }, [loaded, initialSearch, storedStars]);
  // The view the learner chose, remembered with the search it was chosen under:
  // a new deep link wins over it, a search without a usable link keeps it.
  const [chosen, setChosen] = useState<{ search: string | undefined; view: View } | null>(null);
  const view = chosen && chosen.search === initialSearch ? chosen.view : linked ?? chosen?.view ?? LIST;

  const open = (kind: View["kind"], id?: string) => {
    setChosen({ search: initialSearch, view: kind === "list" || !id ? LIST : { kind, id } as View });
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  if (view.kind === "list") return <ExerciseList stars={stars} loaded={loaded} onOpen={id => open("brief", id)} />;
  const exercise = manoeuvreById(view.id)!;
  if (view.kind === "brief") return <Briefing exercise={exercise} stars={stars[exercise.id] ?? 0} onBack={() => open("list")} onStart={() => open("play", exercise.id)} />;
  return <Play key={exercise.id} exercise={exercise} stars={stars}
    onStars={setStars} onBack={() => open("list")} onNext={id => open("brief", id)} tl={tl} />;
}

function ExerciseList({ stars, loaded, onOpen }: { stars: Stars; loaded: boolean; onOpen: (id: string) => void }) {
  const { tl } = useI18n();
  return <div className={styles.page}>
    <header className={styles.header}>
      <h1 className={styles.title}>{tl(copy.title)}</h1>
      <p className={styles.intro}>{tl(copy.intro)}</p>
    </header>
    {MANOEUVRE_TRACKS.map(track => <section key={track.id} className={styles.track}>
      <h2 className={styles.trackTitle}>{tl(track.title)}</h2>
      <ol className={styles.list}>
        {MANOEUVRES.filter(e => e.track === track.id).map((e, i) => {
          const unlocked = loaded && isUnlocked(MANOEUVRES, stars, e.id), got = stars[e.id] ?? 0;
          return <li key={e.id}>
            <button type="button" className={styles.row} disabled={!unlocked} onClick={() => onOpen(e.id)} data-testid={`exercise-${e.id}`}>
              <span className={styles.number} aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <span className={styles.rowText}>
                <strong>{tl(e.title)}</strong>
                <span className={styles.meta}>{tl(copy.difficulty[e.difficulty - 1])}, {fill(tl(copy.windKn), { n: e.wind.speed })}</span>
                {loaded && !unlocked && <span className={styles.meta}>{tl(copy.locked)}</span>}
              </span>
              <span className={styles.stars} aria-label={fill(tl(copy.stars), { n: got })}>{starText(got)}</span>
            </button>
          </li>;
        })}
      </ol>
    </section>)}
  </div>;
}

function criteriaLines(exercise: ManoeuvreExercise, tl: (t: typeof copy.title) => string): string[] {
  const g = exercise.target, c = exercise.criteria, out: string[] = [];
  if (g.type === "berth") out.push(fill(tl(copy.criteria.berth), { pos: g.posTol, deg: g.headingTol, v: g.maxSpeedKn, hold: g.hold }));
  if (g.type === "pickup") { out.push(fill(tl(copy.criteria.pickup), { reach: g.reach, v: g.maxSpeedKn })); if (g.neutral) out.push(tl(copy.criteria.neutral)); }
  if (g.type === "leave") out.push(tl(copy.criteria.leave));
  if (g.type === "turn") out.push(fill(tl(copy.criteria.turn), { deg: g.headingTol, v: g.maxSpeedKn, hold: g.hold }));
  if (g.type === "gates") out.push(tl(copy.criteria.gates));
  if (g.type === "station") out.push(fill(tl(copy.criteria.station), { s: g.seconds, r: g.radius }));
  out.push(fill(tl(exercise.track === "sail" ? copy.criteria.starsSail : copy.criteria.stars), { limit: c.timeLimit, par: c.parTime, gentle: c.gentleKn }));
  return out;
}

function Briefing({ exercise, stars, onBack, onStart }: { exercise: ManoeuvreExercise; stars: number; onBack: () => void; onStart: () => void }) {
  const { tl } = useI18n();
  return <div className={styles.page}>
    <button type="button" className={styles.back} onClick={onBack}>{"← "}{tl(copy.back)}</button>
    <header className={styles.header}>
      <h1 className={styles.title}>{tl(exercise.title)}</h1>
      <p className={styles.meta}>{tl(copy.difficulty[exercise.difficulty - 1])}, {fill(tl(copy.windKn), { n: exercise.wind.speed })} <span aria-label={fill(tl(copy.stars), { n: stars })}>{starText(stars)}</span></p>
    </header>
    <div className={styles.briefGrid}>
      <Schematic exercise={exercise} label={tl(copy.schemeLabel)} words={{ wind: tl(copy.scheme.wind), start: tl(copy.scheme.start), target: tl(copy.scheme.target) }} />
      <div>
        <h2 className={styles.subTitle}>{tl(copy.goalLabel)}</h2>
        <p className={styles.text}>{tl(exercise.goal)}</p>
        <h2 className={styles.subTitle}>{tl(copy.howLabel)}</h2>
        <p className={styles.text}>{tl(exercise.explain)}</p>
        <h2 className={styles.subTitle}>{tl(copy.criteriaLabel)}</h2>
        <ul className={styles.criteria}>{criteriaLines(exercise, tl).map(line => <li key={line}>{line}</li>)}</ul>
        <p className={styles.meta}>{tl(copy.keys)}</p>
        <button type="button" className={styles.primary} onClick={onStart} data-testid="start">{tl(copy.start)}</button>
      </div>
    </div>
  </div>;
}

function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement), v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    water: v("--bg-secondary", "#0f2035"), land: v("--border-subtle", "#3a4a60"), landEdge: v("--text-muted", "#7593a6"),
    boat: v("--border-subtle", "#3a4a60"), boatEdge: v("--text-muted", "#7593a6"), ours: v("--bg-card", "#152540"), oursEdge: v("--text-primary", "#e8f4f8"),
    target: v("--success", "#44ff88"), buoy: v("--cat-orange", "#ff8844"), danger: v("--danger", "#ff4444"), line: v("--hl-amber", "#ffce4d"),
    text: v("--text-primary", "#e8f4f8"), muted: v("--text-secondary", "#8ba7b8"),
  };
}

interface Hud { speedKn: number; astern: boolean; throttle: number; distance: { value: number; unit: "m" | "deg" }; t: number; touches: number; wind: number; gate: number; station: number; hasLine: boolean; rudder: number; status: RunState["status"]; x: number; y: number; heading: number }
const hudOf = (exercise: ManoeuvreExercise, run: RunState, input: RunInput): Hud => ({
  speedKn: run.speedKn, throttle: input.throttle,
  // "Astern" only for real sternway, not for a boat drifting sideways.
  astern: !!run.harbour && run.harbour.u < -0.05 && Math.abs(run.harbour.u) >= Math.abs(run.harbour.v), distance: targetDistance(exercise, run), t: run.t, touches: contactsOf(run).length,
  wind: windAt(exercise, run.t).speed, gate: run.progress.gate, station: run.progress.station, hasLine: (run.harbour?.lines.length ?? 0) > 0,
  rudder: input.helm, status: run.status, x: run.pose.x, y: run.pose.y, heading: run.pose.heading,
});

function Play({ exercise, stars, onStars, onBack, onNext, tl }: {
  exercise: ManoeuvreExercise; stars: Stars; onStars: (s: Stars) => void; onBack: () => void; onNext: (id: string) => void; tl: (t: typeof copy.title) => string;
}) {
  const { lang } = useI18n();
  const sail = exercise.track === "sail";
  // The draw loop reads the language through a ref so a language switch does not restart the attempt.
  const langRef = useRef(lang);
  useEffect(() => { langRef.current = lang; }, [lang]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runRef = useRef<RunState>(createRun(exercise));
  const inputRef = useRef<RunInput>(INITIAL_INPUT);
  const steerRef = useRef<-1 | 0 | 1>(0);
  const cameraRef = useRef<Camera | null>(null);
  // The first HUD shows a fresh attempt, the same state the loop starts from.
  const [hud, setHud] = useState<Hud>(() => hudOf(exercise, createRun(exercise), INITIAL_INPUT));
  const [throttle, setThrottle] = useState(0);
  const [sheets, setSheets] = useState<"trim" | "ease">("trim");
  const [hint, setHint] = useState(false);
  const hintRef = useRef(false);
  const [result, setResult] = useState<{ score: RunResult; saved: boolean; stars: Stars } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const starsRef = useRef(stars);
  // The loop reads the latest stars and plan switch through refs, updated after each commit.
  useLayoutEffect(() => { starsRef.current = stars; hintRef.current = hint; }, [stars, hint]);

  // A new attempt starts with the lever in neutral, sheets trimmed and no result;
  // the loop effect below restarts the run itself when `attempt` changes.
  const restart = () => { setThrottle(0); setSheets("trim"); setResult(null); setAttempt(a => a + 1); };
  const setLever = useCallback((value: number) => { inputRef.current = { ...inputRef.current, throttle: value }; setThrottle(value); }, []);
  const setSheet = useCallback((value: "trim" | "ease") => { inputRef.current = { ...inputRef.current, sheets: value }; setSheets(value); }, []);

  // Simulation loop: fixed physics steps on real time, drawing every frame.
  useEffect(() => {
    runRef.current = createRun(exercise);
    inputRef.current = { helm: 0, throttle: 0, sheets: "trim" };
    cameraRef.current = null;
    const canvas = canvasRef.current!, ctx = canvas.getContext("2d");
    let palette = readPalette(), paletteAt = 0, raf = 0, last = performance.now(), acc = 0, hudAt = 0, finished = false;
    const dt = stepSeconds(exercise);
    const frame = (now: number) => {
      const elapsed = Math.min(0.1, (now - last) / 1000);
      last = now;
      const steer = steerRef.current;
      if (steer) inputRef.current = { ...inputRef.current, helm: Math.max(-1, Math.min(1, inputRef.current.helm + steer * 1.5 * elapsed)) };
      acc += elapsed;
      let run = runRef.current;
      while (acc >= dt) { run = stepRun(exercise, run, inputRef.current); acc -= dt; }
      runRef.current = run;
      if (now - paletteAt > 1000) { palette = readPalette(); paletteAt = now; }
      const rect = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(rect.width)), h = Math.max(1, Math.round(rect.height));
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const goal = frameCamera(exercise, run, w / h), cam = cameraRef.current;
        // The camera eases towards its framing so the view does not jump.
        const k = cam ? Math.min(1, elapsed * 2) : 1;
        cameraRef.current = cam ? { cx: cam.cx + (goal.cx - cam.cx) * k, cy: cam.cy + (goal.cy - cam.cy) * k, span: cam.span + (goal.span - cam.span) * k } : goal;
        drawScene(ctx, w, h, exercise, run, cameraRef.current, palette, { plan: hintRef.current, windLabel: knotsText(langRef.current, windAt(exercise, run.t).speed), scaleLabel: `10 ${RACE_UNITS.metres[langRef.current]}` });
      }
      if (now - hudAt > 100 || run.status !== "running") { hudAt = now; setHud(hudOf(exercise, run, inputRef.current)); }
      if (run.status !== "running" && !finished) {
        finished = true;
        const score = scoreRun(exercise, run);
        const next = recordStars(storage(), starsRef.current, exercise.id, score.stars);
        if (next) onStars(next);
        setResult({ score, saved: next !== null, stars: next ?? starsRef.current });
      }
      if (!finished) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [exercise, attempt, onStars]);

  // Keyboard: arrows steer and move the lever, space centres the rudder.
  useEffect(() => {
    const detents = copy.throttle.map(d => d.value);
    const down = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowLeft" || e.key === "a") { steerRef.current = -1; e.preventDefault(); }
      else if (e.key === "ArrowRight" || e.key === "d") { steerRef.current = 1; e.preventDefault(); }
      else if (e.key === " " && !(e.target instanceof HTMLButtonElement)) { inputRef.current = { ...inputRef.current, helm: 0 }; e.preventDefault(); }
      else if ((e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "w" || e.key === "s") && !e.repeat) {
        e.preventDefault();
        if (sail) { setSheet(e.key === "ArrowUp" || e.key === "w" ? "trim" : "ease"); return; }
        const i = detents.indexOf(inputRef.current.throttle), up = e.key === "ArrowUp" || e.key === "w";
        setLever(detents[Math.max(0, Math.min(detents.length - 1, (i < 0 ? 2 : i) + (up ? -1 : 1)))]);
      }
    };
    const up = (e: KeyboardEvent) => {
      if ((e.key === "ArrowLeft" || e.key === "a") && steerRef.current === -1) steerRef.current = 0;
      if ((e.key === "ArrowRight" || e.key === "d") && steerRef.current === 1) steerRef.current = 0;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [sail, setLever, setSheet]);

  const holdSteer = (dir: -1 | 1) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => { e.currentTarget.setPointerCapture?.(e.pointerId); steerRef.current = dir; },
    onPointerUp: () => { steerRef.current = 0; }, onPointerCancel: () => { steerRef.current = 0; }, onLostPointerCapture: () => { steerRef.current = 0; },
    // Keyboard or switch activation: one step of wheel per press.
    onClick: (e: ReactMouseEvent) => { if (e.detail === 0) inputRef.current = { ...inputRef.current, helm: Math.max(-1, Math.min(1, inputRef.current.helm + dir * 0.25)) }; },
    onContextMenu: (e: ReactMouseEvent) => e.preventDefault(),
  });

  const leverPick = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.type === "pointermove" && e.buttons === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.max(0, Math.min(copy.throttle.length - 1, Math.floor((e.clientY - rect.top) / rect.height * copy.throttle.length)));
    setLever(copy.throttle[i].value);
  };

  const rudderDeg = Math.round(hud.rudder * 35);
  const next = nextExercise(MANOEUVRES, exercise.id);
  const nextOpen = next && result && isUnlocked(MANOEUVRES, result.stars, next.id);
  const throttleName = tl(copy.throttle.find(d => d.value === throttle)?.label ?? copy.throttle[2].label);
  const distance = hud.distance.unit === "deg" ? `${Math.round(hud.distance.value)}°` : `${fmt1(hud.distance.value)} ${RACE_UNITS.metres[lang]}`;

  return <div className={styles.playPage}>
    <div className={styles.playHeader}>
      <button type="button" className={styles.back} onClick={onBack}>{"← "}{tl(copy.back)}</button>
      <h1 className={styles.playTitle}>{tl(exercise.title)}</h1>
    </div>
    <div className={styles.playGrid}>
      <div className={styles.sceneWrap} data-testid="scene" data-status={hud.status} data-speed={hud.speedKn.toFixed(3)} data-target={hud.distance.value.toFixed(3)}
        data-x={hud.x.toFixed(2)} data-y={hud.y.toFixed(2)} data-heading={hud.heading.toFixed(1)} data-helm={hud.rudder.toFixed(2)}>
        <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={tl(copy.sceneLabel)} />
      </div>
      <div className={styles.side}>
        <dl className={styles.hud}>
          <div><dt>{tl(copy.hud.speed)}</dt><dd data-testid="hud-speed">{knotsText(lang, Math.abs(hud.speedKn))}{hud.astern ? ` ${tl(copy.hud.astern)}` : ""}</dd></div>
          <div><dt>{sail ? tl(copy.hud.sheets) : tl(copy.hud.throttle)}</dt><dd>{sail ? tl(sheets === "trim" ? copy.sheets.trim : copy.sheets.ease) : throttleName}</dd></div>
          <div><dt>{tl(copy.hud.wind)}</dt><dd>{knotsText(lang, hud.wind)}</dd></div>
          <div><dt>{exercise.target.type === "gates" ? tl(copy.hud.gate) : exercise.target.type === "station" ? tl(copy.hud.inCircle) : tl(copy.hud.target)}</dt>
            <dd data-testid="hud-target">{exercise.target.type === "gates" ? `${Math.min(hud.gate + 1, exercise.target.gates.length)}/${exercise.target.gates.length}, ${distance}`
              : exercise.target.type === "station" ? `${Math.floor(hud.station)}/${exercise.target.seconds} s` : distance}</dd></div>
          <div><dt>{tl(copy.hud.time)}</dt><dd>{clock(hud.t)} / {clock(exercise.criteria.timeLimit)}</dd></div>
          <div><dt>{tl(copy.hud.touches)}</dt><dd>{hud.touches}</dd></div>
        </dl>

        {result ? <ResultPanel exercise={exercise} result={result.score} saved={result.saved} tl={tl}
          onRetry={restart} onNext={nextOpen ? () => onNext(next!.id) : undefined} onBack={onBack} />
          : <div className={styles.dock}>
            <div className={styles.steer}>
              <p className={styles.readout}>{tl(copy.steer.rudder)} {Math.abs(rudderDeg)}°{rudderDeg ? ` ${tl(rudderDeg < 0 ? copy.steer.left : copy.steer.right)}` : ""}</p>
              <div className={styles.rudderBar} aria-hidden="true"><span style={{ left: `${50 + hud.rudder * 50}%` }} /></div>
              <div className={styles.steerRow}>
                <button type="button" className={styles.control} aria-label={tl(copy.steer.port)} data-testid="helm-port" {...holdSteer(-1)}>◀</button>
                <button type="button" className={styles.control} onClick={() => { inputRef.current = { ...inputRef.current, helm: 0 }; }} data-testid="helm-centre">{tl(copy.steer.centre)}</button>
                <button type="button" className={styles.control} aria-label={tl(copy.steer.starboard)} data-testid="helm-starboard" {...holdSteer(1)}>▶</button>
              </div>
              {hud.hasLine && <button type="button" className={styles.control} data-testid="cast-off" onClick={() => { runRef.current = castOff(runRef.current, exercise.lines![0].id); }}>{tl(copy.castOff)}</button>}
            </div>
            {sail
              ? <div className={styles.lever} role="radiogroup" aria-label={tl(copy.hud.sheets)}>
                <p className={styles.readout}>{tl(copy.sheets.auto)}</p>
                {(["trim", "ease"] as const).map(v => <button key={v} type="button" role="radio" aria-checked={sheets === v} className={`${styles.detent} ${sheets === v ? styles.active : ""}`}
                  onClick={() => setSheet(v)}>{tl(v === "trim" ? copy.sheets.trim : copy.sheets.ease)}</button>)}
              </div>
              : <div className={styles.lever} role="radiogroup" aria-label={tl(copy.hud.throttle)} onPointerDown={leverPick} onPointerMove={leverPick}>
                {copy.throttle.map(d => <button key={d.value} type="button" role="radio" aria-checked={throttle === d.value} data-testid={`throttle-${d.value}`}
                  className={`${styles.detent} ${throttle === d.value ? styles.active : ""} ${d.value === 0 ? styles.neutral : ""}`} onClick={() => setLever(d.value)}>{tl(d.label)}</button>)}
              </div>}
          </div>}

        {!result && <div className={styles.toolRow}>
          <button type="button" className={styles.secondary} aria-expanded={hint} onClick={() => setHint(h => !h)}>{tl(hint ? copy.hintHide : copy.hintShow)}</button>
          <button type="button" className={styles.secondary} onClick={restart}>{tl(copy.restart)}</button>
        </div>}
        {hint && !result && <p className={styles.hint}>{tl(exercise.hint)}</p>}
      </div>
    </div>
  </div>;
}

function ResultPanel({ exercise, result, saved, tl, onRetry, onNext, onBack }: {
  exercise: ManoeuvreExercise; result: RunResult; saved: boolean; tl: (t: typeof copy.title) => string; onRetry: () => void; onNext?: () => void; onBack: () => void;
}) {
  const { lang } = useI18n();
  const goal = exercise.target;
  const precision = result.finishError === null ? null : goal.type === "pickup" ? knotsText(lang, result.finishError) : goal.type === "turn" ? `${Math.round(result.finishError)}°` : `${fmt1(result.finishError)} ${RACE_UNITS.metres[lang]}`;
  const missing = useMemo(() => result.missing.filter(m => result.success ? m !== "goal" : m === "goal").slice(0, 2), [result]);
  return <section className={styles.result} data-testid="result" data-stars={result.stars} aria-live="polite">
    <h2 className={styles.subTitle}>{tl(result.success ? copy.result.success : copy.result.timeout)}</h2>
    <p className={styles.bigStars} aria-label={fill(tl(copy.stars), { n: result.stars })}>{starText(result.stars)}</p>
    <dl className={styles.hud}>
      <div><dt>{tl(copy.result.time)}</dt><dd>{clock(result.time)}</dd></div>
      <div><dt>{tl(copy.result.touches)}</dt><dd>{result.touches}</dd></div>
      <div><dt>{tl(copy.result.hits)}</dt><dd>{result.hits}</dd></div>
      <div><dt>{tl(copy.result.hardest)}</dt><dd>{knotsText(lang, result.hardestKn)}</dd></div>
      {precision && <div><dt>{tl(copy.result.precision)}</dt><dd>{precision}</dd></div>}
    </dl>
    {result.stars < 3 && missing.map(m => <p key={m} className={styles.text}>{tl(copy.result.missing[m])}</p>)}
    {!saved && <p className={styles.text} role="alert">{tl(copy.result.saveFailed)}</p>}
    <div className={styles.toolRow}>
      <button type="button" className={styles.primary} onClick={onRetry} data-testid="retry">{tl(copy.retry)}</button>
      {onNext && <button type="button" className={styles.secondary} onClick={onNext}>{tl(copy.next)}</button>}
      <button type="button" className={styles.secondary} onClick={onBack}>{tl(copy.back)}</button>
    </div>
  </section>;
}
