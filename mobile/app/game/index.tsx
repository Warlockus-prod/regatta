import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  Path,
  Skia,
  Line as SkiaLine,
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useI18n } from '../../src/i18n/context';
import { Screen, SkiaYacht, Text } from '../../src/design-system/components';
import { useSimLoop } from '../../src/simulator/use-sim-loop';
import type { TrailPoint } from '../../src/simulator/use-sim-loop';
import {
  buildArrowGrid,
  buildWindArrowsPath,
  buildCompassArrowPath,
  buildApparentArrowPath,
} from '../../src/simulator/skia-wind';
import { findCourse, type CourseId, type CourseMarkScreen, projectCourse, scoreCourse, buildFinishLine, crossedFinishLine } from '../../src/game/course';
import { useRaceHistory, type ReplayPoint } from '../../src/persistence/race-history';
import {
  submitRaceResult,
  type CoachLogEvent,
  type CoachLogSample,
} from '../../src/api/coach';
import {
  formatSpeed,
  speedUnitLabel,
  useUnits,
} from '../../src/persistence/units';
import { colors, radii, shadow, spacing } from '../../src/design-system/tokens';

type Phase = 'countdown' | 'racing' | 'finished';

const COMPASS_R = 30;
const COUNTDOWN_SEC = 5;

function formatTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function buildTrailPath(trail: TrailPoint[], width: number, height: number) {
  const p = Skia.Path.Make();
  if (trail.length === 0) return p;
  p.moveTo(trail[0]!.x, trail[0]!.y);
  for (let i = 1; i < trail.length; i++) {
    const prev = trail[i - 1]!;
    const curr = trail[i]!;
    const wrappedX = Math.abs(curr.x - prev.x) > width / 2;
    const wrappedY = Math.abs(curr.y - prev.y) > height / 2;
    if (wrappedX || wrappedY) {
      p.moveTo(curr.x, curr.y);
    } else {
      p.lineTo(curr.x, curr.y);
    }
  }
  return p;
}

function buildWakePath(
  boatX: number,
  boatY: number,
  heading: number,
  boatLength: number,
  speedKn: number,
) {
  const p = Skia.Path.Make();
  if (speedKn < 0.6) return p;
  const c = Math.cos(heading);
  const s = Math.sin(heading);
  const toScreen = (localX: number, localY: number) => ({
    x: boatX + localX * c - localY * s,
    y: boatY + localX * s + localY * c,
  });
  const stern = boatLength * 0.9;
  const len = boatLength * (0.8 + Math.min(1.5, speedKn / 5));
  const spread = boatLength * (0.22 + Math.min(0.22, speedKn / 26));
  const startL = toScreen(-boatLength * 0.18, stern);
  const startR = toScreen(boatLength * 0.18, stern);
  const ctrlL = toScreen(-spread, stern + len * 0.5);
  const ctrlR = toScreen(spread, stern + len * 0.5);
  const endL = toScreen(-spread * 1.35, stern + len);
  const endR = toScreen(spread * 1.35, stern + len);
  p.moveTo(startL.x, startL.y);
  p.quadTo(ctrlL.x, ctrlL.y, endL.x, endL.y);
  p.moveTo(startR.x, startR.y);
  p.quadTo(ctrlR.x, ctrlR.y, endR.x, endR.y);
  return p;
}

function insideCompassAt(
  x: number,
  y: number,
  compassCx: number,
  compassCy: number,
): boolean {
  const dx = x - compassCx;
  const dy = y - compassCy;
  return dx * dx + dy * dy <= (COMPASS_R + 8) * (COMPASS_R + 8);
}

/**
 * Solo race screen. Uses the simulator's `useSimLoop` in 'free' mode for
 * physics + boat rendering, then layers:
 *  - 5-second countdown overlay before the start signal,
 *  - course mark overlay (start / windward / finish) projected from the
 *    selected course,
 *  - cyan finish-line indicator on the canvas,
 *  - sample + event capture so the AI coach has a race log to chew on,
 *  - finish detection that crosses the line on the return leg only,
 *  - result panel with Save / AI coach / Try again / Home actions.
 */
export default function Game() {
  const { tp, lang } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ course?: string }>();
  const { units } = useUnits();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const sceneW = Math.min(Math.max(windowWidth - spacing.lg * 2, 320), 440);
  const sceneH = Math.min(Math.max(windowHeight * 0.55, 380), 560);
  const centerX = sceneW / 2;
  const centerY = sceneH / 2;
  const compassCx = sceneW - COMPASS_R - 16;
  const compassCy = COMPASS_R + 14;
  const boatLength = sceneW < 360 ? 46 : 54;

  const courseId = ((params.course as CourseId | undefined) ?? 'short') as CourseId;
  const course = useMemo(() => findCourse(courseId), [courseId]);
  const initialMarks = useMemo(
    () => projectCourse(course, { width: sceneW, height: sceneH }),
    [course, sceneW, sceneH],
  );

  // Start mark drives the boat's initial position so the player begins
  // on the start line, bow pointing at the windward mark.
  const startMark = initialMarks[0]!;
  const sim = useSimLoop({
    bounds: { width: sceneW, height: sceneH },
    initialX: startMark.x,
    initialY: startMark.y,
  });

  // One-time wind setup from the course definition. Keep idempotent so
  // RN strict-mode re-mounts don't fight a player who tweaks the compass.
  const windInitedRef = useRef(false);
  useEffect(() => {
    if (windInitedRef.current) return;
    sim.setWindDir(course.initialWindDirRad);
    sim.setWindSpeed(course.initialWindKn);
    windInitedRef.current = true;
    // Aim the bow at the windward mark from the start.
    const wm = initialMarks[1]!;
    const dx = wm.x - startMark.x;
    const dy = wm.y - startMark.y;
    sim.setTargetHeading(Math.atan2(dx, -dy));
    // sim is captured by ref, no need to track in deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, initialMarks, startMark]);

  // Phase machine. Countdown ticks in real-time via setInterval so we
  // don't depend on the physics loop's tick counter; finishes flip to
  // racing once the timer hits zero.
  const [phase, setPhase] = useState<Phase>('countdown');
  const [countdownSec, setCountdownSec] = useState(COUNTDOWN_SEC);
  const [raceTimeSec, setRaceTimeSec] = useState(0);
  const startTimestampRef = useRef<number | null>(null);
  const finishTimeRef = useRef<number | null>(null);

  // Live mark tracking. Marks are mutated in-place per tick once the
  // boat enters their capture radius. The Result panel reads the final
  // shape to render Save buttons.
  const [marks, setMarks] = useState<CourseMarkScreen[]>(initialMarks);
  const marksRef = useRef<CourseMarkScreen[]>(initialMarks);
  const finishLine = useMemo(
    () => buildFinishLine(initialMarks, { width: sceneW, height: sceneH }),
    [initialMarks, sceneW, sceneH],
  );

  // Sample buffer for the AI coach. We capture ~1Hz position rows so
  // the coach has enough resolution to spot tactical mistakes.
  const samplesRef = useRef<CoachLogSample[]>([]);
  const replayRef = useRef<ReplayPoint[]>([]);
  const eventsRef = useRef<CoachLogEvent[]>([]);
  const lastSampleSecRef = useRef<number>(-1);

  // Countdown ticker. setInterval at 1Hz; on hit zero we flip phase to
  // racing and stamp the wall-clock start so race time is monotonic.
  useEffect(() => {
    if (phase !== 'countdown') return;
    const id = setInterval(() => {
      setCountdownSec((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setPhase('racing');
          startTimestampRef.current = Date.now();
          eventsRef.current.push({ t: 0, type: 'start' });
          // Mild haptic on the start signal.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Race timer + sample/event capture. Driven off the simulator tick
  // counter so the recorded log lines up with the physics state the
  // coach analyses. We avoid touching marks state on every tick - the
  // expensive update only fires when capture geometry changes.
  useEffect(() => {
    if (phase !== 'racing') return;
    const startedAt = startTimestampRef.current;
    if (startedAt === null) return;
    const elapsedMs = Date.now() - startedAt;
    const elapsedSec = elapsedMs / 1000;
    setRaceTimeSec(elapsedSec);

    // 1Hz sampling for both AI coach (samples) and replay (positions).
    const wholeSec = Math.floor(elapsedSec);
    if (wholeSec !== lastSampleSecRef.current) {
      lastSampleSecRef.current = wholeSec;
      const headingDeg =
        (((sim.boat.heading * 180) / Math.PI) % 360 + 360) % 360;
      samplesRef.current.push({
        t: elapsedSec,
        x: sim.boat.x,
        y: sim.boat.y,
        heading: headingDeg,
        twa: sim.boatExt.twaDeg,
        speed: sim.boatExt.boatSpeedKn,
        lap: 0,
      });
      replayRef.current.push({ x: sim.boat.x, y: sim.boat.y, t: elapsedSec });
    }

    // Mark detection. Walk the marks list looking for the first uncleared
    // mark; if the boat is within capture radius, mark it cleared and
    // advance.
    const next = marksRef.current;
    let activeIdx = next.findIndex((m) => !m.cleared);
    if (activeIdx === -1) return;
    const m = next[activeIdx]!;
    const dxm = sim.boat.x - m.x;
    const dym = sim.boat.y - m.y;
    const dist = Math.sqrt(dxm * dxm + dym * dym);
    if (dist <= m.captureRadius) {
      // Special-case the finish mark: only counts after the windward
      // mark has been cleared AND the boat crosses the actual finish
      // line strip (not just the mark capture radius).
      if (m.finish) {
        const allPriorCleared = next
          .slice(0, activeIdx)
          .every((mm) => mm.cleared);
        if (!allPriorCleared) return;
        if (
          finishLine &&
          !crossedFinishLine(
            { x: sim.boat.x, y: sim.boat.y },
            finishLine,
          )
        ) {
          return;
        }
      } else if (m.id === 'start') {
        // Start mark is auto-cleared the moment the start signal fires
        // (boat already sits on the start line). Don't require the
        // player to leave-and-return.
        if (elapsedSec < 0.5) return;
      }
      const updated = next.map((mm, i) =>
        i === activeIdx
          ? { ...mm, cleared: true, active: false }
          : i === activeIdx + 1
          ? { ...mm, active: true }
          : mm,
      );
      marksRef.current = updated;
      setMarks(updated);
      eventsRef.current.push({
        t: elapsedSec,
        type: m.id === 'finish' ? 'finish' : 'mark-rounded',
        note: m.id,
      });
      Haptics.impactAsync(
        m.id === 'finish'
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Haptics.ImpactFeedbackStyle.Medium,
      ).catch(() => {});
      if (m.id === 'finish') {
        finishTimeRef.current = elapsedSec;
        setPhase('finished');
      }
    }
    // We deliberately depend on the boat position so this fires per tick.
    // sim.tickN is the canonical render trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim.tickN, phase]);

  // Steering: drag anywhere outside the wind compass.
  const steer = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onBegin((e) => {
          if (insideCompassAt(e.x, e.y, compassCx, compassCy)) return;
          if (phase === 'finished') return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
            () => {},
          );
          const dx = e.x - centerX;
          const dy = e.y - centerY;
          if (dx === 0 && dy === 0) return;
          sim.setTargetHeading(Math.atan2(dx, -dy));
        })
        .onChange((e) => {
          if (insideCompassAt(e.x, e.y, compassCx, compassCy)) return;
          if (phase === 'finished') return;
          const dx = e.x - centerX;
          const dy = e.y - centerY;
          if (dx === 0 && dy === 0) return;
          sim.setTargetHeading(Math.atan2(dx, -dy));
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [centerX, centerY, compassCx, compassCy, phase],
  );

  // Pre-baked Skia primitives (recomputed once per tick).
  const arrowGrid = useMemo(
    () => buildArrowGrid(sceneW, sceneH, 56),
    [sceneW, sceneH],
  );
  const windArrowsPath = useMemo(
    () => buildWindArrowsPath(arrowGrid, sim.wind.trueWindDirRad),
    [arrowGrid, sim.wind.trueWindDirRad],
  );
  const trailPath = useMemo(
    () => buildTrailPath(sim.trail, sceneW, sceneH),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sim.trail, sim.tickN, sceneW, sceneH],
  );
  const wakePath = useMemo(
    () =>
      buildWakePath(
        sim.boat.x,
        sim.boat.y,
        sim.boat.heading,
        boatLength,
        sim.boatExt.boatSpeedKn,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sim.boat.x, sim.boat.y, sim.boat.heading, boatLength, sim.boatExt.boatSpeedKn, sim.tickN],
  );
  const apparentArrowPath = useMemo(() => {
    const awaScreenRad =
      sim.boat.heading + (sim.boatExt.awaDeg * Math.PI) / 180;
    const bowX = sim.boat.x + Math.sin(sim.boat.heading) * boatLength * 0.96;
    const bowY = sim.boat.y - Math.cos(sim.boat.heading) * boatLength * 0.96;
    return buildApparentArrowPath(bowX, bowY, awaScreenRad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim.boat.x, sim.boat.y, sim.boat.heading, sim.boatExt.awaDeg, boatLength, sim.tickN]);
  const compassArrowPath = useMemo(() => buildCompassArrowPath(), []);

  // Localised chrome.
  const title = course.title(tp);
  const courseHint = course.hint(tp);
  const headingLabel = tp('КУРС', 'HEADING', 'KURS', {
    es: 'RUMBO', fr: 'CAP', de: 'KURS', it: 'ROTTA',
  });
  // Speed-cell heading reflects the current speed unit so the value
  // beneath reads correctly (kt vs m/s). Sprint 11: was a static
  // "KNOTS" / "NUDOS" label that lied when the user picked m/s.
  const speedUnitWord = speedUnitLabel(units.speed).toUpperCase();
  const speedLabel = speedUnitWord;
  const twaLabel = 'TWA';
  const awaLabel = 'AWA';
  const timeLabel = tp('ВРЕМЯ', 'TIME', 'CZAS', {
    es: 'TIEMPO', fr: 'TEMPS', de: 'ZEIT', it: 'TEMPO',
  });
  const goLabel = tp('СТАРТ!', 'GO!', 'START!', {
    es: 'YA!', fr: 'PARTEZ!', de: 'LOS!', it: 'VIA!',
  });
  const getReadyLabel = tp('Приготовься', 'Get ready', 'Przygotuj sie', {
    es: 'Prepara', fr: 'Prepare-toi', de: 'Mach dich bereit', it: 'Preparati',
  });
  const finishedLabel = tp('Финиш!', 'Finish!', 'Meta!', {
    es: 'Meta!', fr: 'Arrivee!', de: 'Ziel!', it: 'Traguardo!',
  });
  const elapsedLabel = tp('Время', 'Time', 'Czas', {
    es: 'Tiempo', fr: 'Temps', de: 'Zeit', it: 'Tempo',
  });
  const scoreLabel = tp('Очки', 'Score', 'Wynik', {
    es: 'Puntos', fr: 'Score', de: 'Punkte', it: 'Punti',
  });
  const parLabel = tp('Par', 'Par', 'Par', {
    es: 'Par', fr: 'Par', de: 'Par', it: 'Par',
  });
  const saveLabel = tp('Сохранить', 'Save', 'Zapisz', {
    es: 'Guardar', fr: 'Enregistrer', de: 'Speichern', it: 'Salva',
  });
  const coachLabel = tp('AI тренер', 'AI coach', 'Trener AI', {
    es: 'Coach IA', fr: 'Coach IA', de: 'KI-Coach', it: 'Coach IA',
  });
  const tryAgainLabel = tp('Ещё раз', 'Try again', 'Jeszcze raz', {
    es: 'Otra vez', fr: 'Recommencer', de: 'Nochmal', it: 'Ancora',
  });
  const homeLabel = tp('Домой', 'Home', 'Strona glowna', {
    es: 'Inicio', fr: 'Accueil', de: 'Start', it: 'Home',
  });
  const savedLabel = tp('Сохранено', 'Saved', 'Zapisano', {
    es: 'Guardado', fr: 'Enregistre', de: 'Gespeichert', it: 'Salvato',
  });
  const savingLabel = tp('Сохраняем…', 'Saving…', 'Zapisywanie…', {
    es: 'Guardando…', fr: 'Sauvegarde…', de: 'Speichern…', it: 'Salvataggio…',
  });
  const offlineSavedLabel = tp(
    'Сохранили локально, без сети.',
    'Saved on device. Network unavailable.',
    'Zapisano lokalnie, brak sieci.',
    {
      es: 'Guardado en el dispositivo. Sin conexion.',
      fr: 'Sauvegarde sur lappareil. Hors ligne.',
      de: 'Auf Geraet gespeichert. Offline.',
      it: 'Salvato sul dispositivo. Offline.',
    },
  );
  const networkErrorTitle = tp('Сеть недоступна', 'Network unavailable', 'Brak sieci', {
    es: 'Sin conexion', fr: 'Hors ligne', de: 'Keine Verbindung', it: 'Nessuna rete',
  });
  const okLabel = 'OK';
  const goToCoachLabel = tp(
    'Открыть тренера',
    'Open coach',
    'Otworz trenera',
    {
      es: 'Abrir coach',
      fr: 'Ouvrir le coach',
      de: 'Coach oeffnen',
      it: 'Apri coach',
    },
  );

  const headingDeg = Math.round(
    (((sim.boat.heading * 180) / Math.PI) % 360 + 360) % 360,
  );
  const speedDisplay = formatSpeed(sim.boatExt.boatSpeedKn, units.speed);
  const twaDeg = Math.round(sim.boatExt.twaDeg);
  const awaDeg = Math.round(sim.boatExt.awaDeg);
  const score = useMemo(
    () => scoreCourse(finishTimeRef.current ?? 0, course.parSec),
    [course.parSec, phase],
  );

  // Race-history persistence + save state machine.
  const history = useRaceHistory();
  const [savedRaceId, setSavedRaceId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (saving || savedRaceId) return;
    setSaving(true);
    const finishTime = finishTimeRef.current ?? 0;
    const computedScore = scoreCourse(finishTime, course.parSec);
    const record = await history.save({
      courseId: course.id,
      timeSec: finishTime,
      score: computedScore,
      replay: replayRef.current,
      events: eventsRef.current,
      samples: samplesRef.current,
      windDirDeg: Math.round(
        (((sim.wind.trueWindDirRad * 180) / Math.PI) % 360 + 360) % 360,
      ),
      windSpeedKn: sim.wind.trueWindSpeedKts,
      parSec: course.parSec,
      difficulty: course.difficulty,
      windStrength: course.windStrength,
    });
    setSavedRaceId(record.id);
    // Fire-and-forget the network submission. Local persistence is the
    // source of truth on device.
    const result = await submitRaceResult({
      difficulty: course.difficulty,
      windStrength: course.windStrength,
      missionId: course.id,
      finishTimeSec: finishTime,
      score: computedScore,
      nicknameFallback: 'Sailor',
    });
    setSaving(false);
    if (!result.ok) {
      Alert.alert(networkErrorTitle, offlineSavedLabel, [{ text: okLabel }]);
    }
  }, [
    course,
    history,
    saving,
    savedRaceId,
    sim.wind.trueWindDirRad,
    sim.wind.trueWindSpeedKts,
    networkErrorTitle,
    offlineSavedLabel,
  ]);

  const handleCoach = useCallback(async () => {
    let id = savedRaceId;
    if (!id) {
      const finishTime = finishTimeRef.current ?? 0;
      const computedScore = scoreCourse(finishTime, course.parSec);
      const record = await history.save({
        courseId: course.id,
        timeSec: finishTime,
        score: computedScore,
        replay: replayRef.current,
        events: eventsRef.current,
        samples: samplesRef.current,
        parSec: course.parSec,
        windDirDeg: Math.round(
          (((sim.wind.trueWindDirRad * 180) / Math.PI) % 360 + 360) % 360,
        ),
        windSpeedKn: sim.wind.trueWindSpeedKts,
        difficulty: course.difficulty,
        windStrength: course.windStrength,
      });
      id = record.id;
      setSavedRaceId(id);
    }
    router.push(`/coach?raceId=${encodeURIComponent(id)}`);
  }, [
    course,
    history,
    router,
    savedRaceId,
    sim.wind.trueWindDirRad,
    sim.wind.trueWindSpeedKts,
  ]);

  const handleTryAgain = useCallback(() => {
    samplesRef.current = [];
    replayRef.current = [];
    eventsRef.current = [];
    lastSampleSecRef.current = -1;
    finishTimeRef.current = null;
    startTimestampRef.current = null;
    setRaceTimeSec(0);
    setSavedRaceId(null);
    setSaving(false);
    const fresh = projectCourse(course, { width: sceneW, height: sceneH });
    marksRef.current = fresh;
    setMarks(fresh);
    sim.reset();
    sim.setWindDir(course.initialWindDirRad);
    sim.setWindSpeed(course.initialWindKn);
    const wm = fresh[1]!;
    const sm = fresh[0]!;
    sim.setTargetHeading(Math.atan2(wm.x - sm.x, -(wm.y - sm.y)));
    setCountdownSec(COUNTDOWN_SEC);
    setPhase('countdown');
  }, [course, sceneW, sceneH, sim]);

  const handleHome = useCallback(() => router.replace('/'), [router]);

  void lang; // Reserved for the language-aware coach payload (kept warm).

  return (
    <Screen noTopInset>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text variant="subtitle" style={styles.title}>{title}</Text>
          <Text variant="caption" style={styles.subtitle}>
            {courseHint}
          </Text>
        </View>

        <View style={[styles.canvasWrap, { width: sceneW, height: sceneH }]}>
          <GestureDetector gesture={steer}>
            <Canvas style={{ width: sceneW, height: sceneH }}>
              <Group>
                <Path
                  path={windArrowsPath}
                  color={colors.windColor}
                  style="stroke"
                  strokeWidth={1}
                  strokeCap="round"
                  opacity={0.32}
                />

                {/* Mark overlays. Capture radius rendered as a faint ring. */}
                {marks.map((m) => (
                  <Group key={m.id}>
                    <Circle
                      cx={m.x}
                      cy={m.y}
                      r={m.captureRadius}
                      color={
                        m.cleared
                          ? 'rgba(68, 255, 136, 0.10)'
                          : m.active
                          ? 'rgba(0, 212, 255, 0.18)'
                          : 'rgba(255, 170, 0, 0.10)'
                      }
                      style="stroke"
                      strokeWidth={1}
                    />
                    <Circle
                      cx={m.x}
                      cy={m.y}
                      r={m.radius}
                      color={
                        m.cleared
                          ? colors.success
                          : m.active
                          ? colors.accentCyan
                          : colors.warning
                      }
                    />
                  </Group>
                ))}

                {/* Cyan finish-line indicator. */}
                {finishLine ? (
                  <SkiaLine
                    p1={{ x: finishLine.x1, y: finishLine.y1 }}
                    p2={{ x: finishLine.x2, y: finishLine.y2 }}
                    color={colors.accentCyan}
                    strokeWidth={2.5}
                    opacity={0.86}
                  />
                ) : null}

                <Path
                  path={trailPath}
                  color="rgba(82, 255, 142, 0.70)"
                  style="stroke"
                  strokeWidth={1.4}
                  strokeCap="round"
                  strokeJoin="round"
                  opacity={0.34}
                />
                <Path
                  path={wakePath}
                  color="rgba(232, 244, 248, 0.42)"
                  style="stroke"
                  strokeWidth={2}
                  strokeCap="round"
                  opacity={0.55}
                />
                <Path
                  path={apparentArrowPath}
                  color={colors.windColor}
                  style="stroke"
                  strokeWidth={2.4}
                  strokeCap="round"
                  opacity={0.95}
                />

                <SkiaYacht
                  centerX={sim.boat.x}
                  centerY={sim.boat.y}
                  headingRad={sim.boat.heading}
                  awaDeg={sim.boatExt.awaDeg}
                  mainSheet={sim.controls.mainSheet ?? 0.5}
                  jibSheet={sim.controls.jibSheet ?? 0.4}
                  twist={sim.controls.twist ?? 0.15}
                  reef={sim.controls.reef ?? 0}
                  sailSet={sim.boatExt.sailSet}
                  luffMain={sim.sailFeedback.main === 'luff'}
                  luffJib={sim.sailFeedback.jib === 'luff'}
                  length={boatLength}
                  heelOffsetPx={Math.max(-8, Math.min(8, sim.boatExt.heelDeg / 4))}
                  tickN={sim.tickN}
                />

                <Group
                  transform={[
                    { translateX: compassCx },
                    { translateY: compassCy },
                  ]}
                >
                  <Circle cx={0} cy={0} r={COMPASS_R} color="rgba(15, 32, 53, 0.92)" />
                  <Circle
                    cx={0}
                    cy={0}
                    r={COMPASS_R}
                    color={colors.windColor}
                    style="stroke"
                    strokeWidth={1.2}
                    opacity={0.6}
                  />
                  <Group transform={[{ rotate: sim.wind.trueWindDirRad }]}>
                    <Path
                      path={compassArrowPath}
                      color={colors.windColor}
                      style="stroke"
                      strokeWidth={2.5}
                      strokeCap="round"
                    />
                  </Group>
                </Group>
              </Group>
            </Canvas>
          </GestureDetector>

          {/* HUD strip: heading / speed / TWA / AWA / time. */}
          <View pointerEvents="none" style={styles.hud}>
            <HudStat label={headingLabel} value={`${headingDeg}°`} />
            <HudStat label={speedLabel} value={speedDisplay} />
            <HudStat label={twaLabel} value={`${twaDeg}°`} />
            <HudStat label={awaLabel} value={`${awaDeg}°`} />
            <HudStat label={timeLabel} value={formatTime(raceTimeSec)} />
          </View>

          {phase === 'countdown' ? (
            <View pointerEvents="none" style={styles.overlay}>
              <Text style={styles.countdownLabel}>{getReadyLabel}</Text>
              <Text style={styles.countdownNumber}>{countdownSec}</Text>
            </View>
          ) : null}

          {phase === 'racing' && raceTimeSec < 1.2 ? (
            <View pointerEvents="none" style={styles.overlay}>
              <Text style={styles.goLabel}>{goLabel}</Text>
            </View>
          ) : null}

          {phase === 'finished' ? (
            <View style={styles.resultPanel}>
              <Text style={styles.resultKicker}>{finishedLabel}</Text>
              <Text variant="subtitle" style={styles.resultTitle} numberOfLines={2}>
                {title}
              </Text>
              <View style={styles.resultRow}>
                <View style={styles.resultStat}>
                  <Text style={styles.resultStatLabel}>{elapsedLabel}</Text>
                  <Text style={styles.resultStatValue}>
                    {formatTime(finishTimeRef.current ?? 0)}
                  </Text>
                </View>
                <View style={styles.resultStat}>
                  <Text style={styles.resultStatLabel}>{scoreLabel}</Text>
                  <Text style={styles.resultStatValue}>{score}</Text>
                </View>
                <View style={styles.resultStat}>
                  <Text style={styles.resultStatLabel}>{parLabel}</Text>
                  <Text style={styles.resultStatValue}>
                    {formatTime(course.parSec)}
                  </Text>
                </View>
              </View>
              <View style={styles.resultActions}>
                <Pressable
                  onPress={handleSave}
                  accessibilityRole="button"
                  accessibilityLabel={savedRaceId ? savedLabel : saveLabel}
                  accessibilityState={{ disabled: saving || !!savedRaceId }}
                  style={({ pressed }) => [
                    styles.resultButton,
                    pressed && styles.resultButtonPressed,
                  ]}
                >
                  <Text style={styles.resultButtonText}>
                    {saving ? savingLabel : savedRaceId ? savedLabel : saveLabel}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleCoach}
                  accessibilityRole="button"
                  accessibilityLabel={savedRaceId ? goToCoachLabel : coachLabel}
                  style={({ pressed }) => [
                    styles.resultButton,
                    styles.resultButtonPrimary,
                    pressed && styles.resultButtonPressed,
                  ]}
                >
                  <Text style={styles.resultButtonTextPrimary}>{coachLabel}</Text>
                </Pressable>
              </View>
              <View style={styles.resultActions}>
                <Pressable
                  onPress={handleTryAgain}
                  accessibilityRole="button"
                  accessibilityLabel={tryAgainLabel}
                  style={({ pressed }) => [
                    styles.resultButton,
                    pressed && styles.resultButtonPressed,
                  ]}
                >
                  <Text style={styles.resultButtonText}>{tryAgainLabel}</Text>
                </Pressable>
                <Pressable
                  onPress={handleHome}
                  accessibilityRole="button"
                  accessibilityLabel={homeLabel}
                  style={({ pressed }) => [
                    styles.resultButton,
                    pressed && styles.resultButtonPressed,
                  ]}
                >
                  <Text style={styles.resultButtonText}>{homeLabel}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

function HudStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.hudStat}>
      <Text allowFontScaling={false} style={styles.hudLabel}>{label}</Text>
      <Text allowFontScaling={false} style={styles.hudValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  title: {
    fontSize: 22,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  canvasWrap: {
    alignSelf: 'center',
    backgroundColor: colors.bgSecondary,
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  hud: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: 'rgba(10, 22, 40, 0.74)',
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  hudStat: {
    minWidth: 44,
    alignItems: 'center',
  },
  hudLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  hudValue: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 22, 40, 0.45)',
  },
  countdownLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  countdownNumber: {
    color: colors.accentCyan,
    fontSize: 96,
    fontWeight: '800',
    letterSpacing: -2,
    ...shadow.lift,
  },
  goLabel: {
    color: colors.success,
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -1,
  },
  resultPanel: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: 'rgba(10, 22, 40, 0.95)',
    borderColor: colors.borderCyanSoft,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadow.lift,
  },
  resultKicker: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  resultTitle: {
    fontSize: 16,
  },
  resultRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  resultStat: {
    flex: 1,
    alignItems: 'flex-start',
  },
  resultStatLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resultStatValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  resultActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  resultButton: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderColor: colors.borderCyanSoft,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  resultButtonPrimary: {
    backgroundColor: colors.accentCyan,
    borderColor: colors.accentCyan,
  },
  resultButtonPressed: {
    opacity: 0.84,
  },
  resultButtonText: {
    color: colors.accentCyan,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  resultButtonTextPrimary: {
    color: colors.bgPrimary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
