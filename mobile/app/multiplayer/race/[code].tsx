import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { useI18n } from '../../../src/i18n/context';
import { Screen, SkiaYacht, Text } from '../../../src/design-system/components';
import { useSimLoop } from '../../../src/simulator/use-sim-loop';
import {
  buildArrowGrid,
  buildWindArrowsPath,
  buildCompassArrowPath,
  buildApparentArrowPath,
} from '../../../src/simulator/skia-wind';
import {
  buildFinishLine,
  crossedFinishLine,
  findCourse,
  projectCourse,
  type CourseMarkScreen,
} from '../../../src/game/course';
import { useRaceHistory, type ReplayPoint } from '../../../src/persistence/race-history';
import { useRecentRooms } from '../../../src/persistence/recent-rooms';
import { useMockRoom, type GhostBoat } from '../../../src/multiplayer/mock-client';
import { isValidRoomCode } from '../../../src/multiplayer/room-code';
import { colors, radii, shadow, spacing } from '../../../src/design-system/tokens';

type Phase = 'countdown' | 'racing' | 'finished';

const COMPASS_R = 30;
const COUNTDOWN_SEC = 5;

function formatTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
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
  const toScreen = (lx: number, ly: number) => ({
    x: boatX + lx * c - ly * s,
    y: boatY + lx * s + ly * c,
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
  cx: number,
  cy: number,
): boolean {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= (COMPASS_R + 8) * (COMPASS_R + 8);
}

interface ParticipantProgress {
  /** Stable id ('me' for the player, 'ghost-1' / 'ghost-2'). */
  id: string;
  /** Number of marks already cleared. Higher = further along. */
  marksCleared: number;
  /** Distance (canvas px) to the current target. Lower = ahead. */
  distanceToTargetPx: number;
  /** Seconds since start at finish, or null if still racing. */
  finishTimeSec: number | null;
}

/**
 * Rank participants by overall race progress. Used to drive the "1/3"
 * label in the HUD. Order is: finished participants by finish time
 * (ascending), then in-progress by marksCleared desc, then distance to
 * current target asc.
 */
function rankProgress(progress: ParticipantProgress[]): ParticipantProgress[] {
  return [...progress].sort((a, b) => {
    const aDone = a.finishTimeSec !== null;
    const bDone = b.finishTimeSec !== null;
    if (aDone && bDone) return (a.finishTimeSec ?? 0) - (b.finishTimeSec ?? 0);
    if (aDone !== bDone) return aDone ? -1 : 1;
    if (a.marksCleared !== b.marksCleared) return b.marksCleared - a.marksCleared;
    return a.distanceToTargetPx - b.distanceToTargetPx;
  });
}

/**
 * Multiplayer race screen.
 *
 * Phase-3 skeleton: the player's boat runs the real `useSimLoop`
 * physics; the 2 opposing ghost boats are driven by `useMockRoom`,
 * which is seeded deterministically from the room code so a given
 * room produces the same opposition on every retry. When the real
 * Phase-4 WebSocket sync lands, the `useMockRoom` import gets
 * replaced with a server-driven equivalent that returns the same
 * `{ ghosts, tickN }` shape.
 *
 * Visible affordances:
 *   - Code printed top-right so the user knows which room they are in
 *   - Position pill (1/3, 2/3, 3/3) updates live
 *   - Distance to next mark + elapsed time
 *   - Result panel on finish: place + time + Save / Try again / Leave
 */
export default function MultiplayerRace() {
  const { tp } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const rawCode = (params.code ?? '').toString().toUpperCase();
  const validCode = isValidRoomCode(rawCode);
  const code = validCode ? rawCode : 'EMPT';

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const sceneW = Math.min(Math.max(windowWidth - spacing.lg * 2, 320), 440);
  const sceneH = Math.min(Math.max(windowHeight * 0.55, 380), 560);
  const centerX = sceneW / 2;
  const centerY = sceneH / 2;
  const compassCx = sceneW - COMPASS_R - 16;
  const compassCy = COMPASS_R + 14;
  const boatLength = sceneW < 360 ? 46 : 54;

  // Multiplayer always uses the SHORT course in v1 - keeps races snappy
  // (a long ghost race would feel like a chore). When the backend
  // ships, the host's chosen course will be a room-level setting.
  const course = useMemo(() => findCourse('short'), []);
  const initialMarks = useMemo(
    () => projectCourse(course, { width: sceneW, height: sceneH }),
    [course, sceneW, sceneH],
  );
  const startMark = initialMarks[0]!;

  // Player loop. Mirrors the solo Game screen's setup so the boat
  // starts on the start line aimed at the windward mark.
  const sim = useSimLoop({
    bounds: { width: sceneW, height: sceneH },
    initialX: startMark.x,
    initialY: startMark.y,
  });
  const windInitedRef = useRef(false);
  useEffect(() => {
    if (windInitedRef.current) return;
    sim.setWindDir(course.initialWindDirRad);
    sim.setWindSpeed(course.initialWindKn);
    windInitedRef.current = true;
    const wm = initialMarks[1]!;
    const dx = wm.x - startMark.x;
    const dy = wm.y - startMark.y;
    sim.setTargetHeading(Math.atan2(dx, -dy));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, initialMarks, startMark]);

  // Phase machine.
  const [phase, setPhase] = useState<Phase>('countdown');
  const [countdownSec, setCountdownSec] = useState(COUNTDOWN_SEC);
  const [raceTimeSec, setRaceTimeSec] = useState(0);
  const startTimestampRef = useRef<number | null>(null);
  const finishTimeRef = useRef<number | null>(null);
  const [finishPlace, setFinishPlace] = useState<number | null>(null);

  // Mark tracking (player). Same pattern as Game / solo.
  const [marks, setMarks] = useState<CourseMarkScreen[]>(initialMarks);
  const marksRef = useRef<CourseMarkScreen[]>(initialMarks);
  const finishLine = useMemo(
    () => buildFinishLine(initialMarks, { width: sceneW, height: sceneH }),
    [initialMarks, sceneW, sceneH],
  );

  // Replay buffer for the local race-history entry. Saving is opt-in
  // via the result panel - same Save flow Game / solo uses.
  const replayRef = useRef<ReplayPoint[]>([]);
  const lastSampleSecRef = useRef<number>(-1);

  // Mock room - 2 deterministic ghosts seeded by the room code.
  const { ghosts } = useMockRoom(code, {
    bounds: { width: sceneW, height: sceneH },
    marks,
    phase,
  });

  // Persist the room code on mount so a deep-link visit (e.g. paste)
  // also lands in the recent-rooms list.
  const { push } = useRecentRooms();
  const persistedRef = useRef(false);
  useEffect(() => {
    if (persistedRef.current || !validCode) return;
    persistedRef.current = true;
    void push({ code, role: 'join' });
  }, [code, push, validCode]);

  // Countdown ticker.
  useEffect(() => {
    if (phase !== 'countdown') return;
    const id = setInterval(() => {
      setCountdownSec((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setPhase('racing');
          startTimestampRef.current = Date.now();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Race tick: advance the timer, sample replay points, detect mark /
  // finish-line capture for the player. Same shape as game/index.tsx.
  useEffect(() => {
    if (phase !== 'racing') return;
    const startedAt = startTimestampRef.current;
    if (startedAt === null) return;
    const elapsedSec = (Date.now() - startedAt) / 1000;
    setRaceTimeSec(elapsedSec);

    const wholeSec = Math.floor(elapsedSec);
    if (wholeSec !== lastSampleSecRef.current) {
      lastSampleSecRef.current = wholeSec;
      replayRef.current.push({ x: sim.boat.x, y: sim.boat.y, t: elapsedSec });
    }

    const next = marksRef.current;
    const activeIdx = next.findIndex((m) => !m.cleared);
    if (activeIdx === -1) return;
    const m = next[activeIdx]!;
    const dxm = sim.boat.x - m.x;
    const dym = sim.boat.y - m.y;
    const dist = Math.sqrt(dxm * dxm + dym * dym);
    if (dist <= m.captureRadius) {
      if (m.finish) {
        const allPriorCleared = next
          .slice(0, activeIdx)
          .every((mm) => mm.cleared);
        if (!allPriorCleared) return;
        if (
          finishLine &&
          !crossedFinishLine({ x: sim.boat.x, y: sim.boat.y }, finishLine)
        ) {
          return;
        }
      } else if (m.id === 'start') {
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
      Haptics.impactAsync(
        m.id === 'finish'
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Haptics.ImpactFeedbackStyle.Medium,
      ).catch(() => {});
      if (m.id === 'finish') {
        finishTimeRef.current = elapsedSec;
        // Compute final place against the ghosts. We snapshot ghost
        // finish times here; ghosts that have not finished yet rank
        // strictly behind the player.
        const ghostTimes = ghosts.map((g) => g.finishTimeSec);
        let place = 1;
        for (const t of ghostTimes) {
          if (t !== null && t < elapsedSec) place += 1;
        }
        setFinishPlace(place);
        setPhase('finished');
      }
    }
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
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
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

  const arrowGrid = useMemo(
    () => buildArrowGrid(sceneW, sceneH, 56),
    [sceneW, sceneH],
  );
  const windArrowsPath = useMemo(
    () => buildWindArrowsPath(arrowGrid, sim.wind.trueWindDirRad),
    [arrowGrid, sim.wind.trueWindDirRad],
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

  // Live position computation. Player + ghosts all reference the same
  // mark list so progress maps consistently.
  const liveProgress: ParticipantProgress[] = useMemo(() => {
    const playerMarksCleared = marksRef.current.filter((mm) => mm.cleared).length;
    const playerActiveIdx = marksRef.current.findIndex((mm) => !mm.cleared);
    let playerDist = Number.MAX_SAFE_INTEGER;
    if (playerActiveIdx !== -1) {
      const m = marksRef.current[playerActiveIdx]!;
      playerDist = Math.sqrt((sim.boat.x - m.x) ** 2 + (sim.boat.y - m.y) ** 2);
    } else {
      playerDist = 0;
    }
    const me: ParticipantProgress = {
      id: 'me',
      marksCleared: playerMarksCleared,
      distanceToTargetPx: playerDist,
      finishTimeSec: finishTimeRef.current,
    };
    const ghostProgress: ParticipantProgress[] = ghosts.map((g) =>
      ghostProgressFor(g, marksRef.current),
    );
    return [me, ...ghostProgress];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghosts, sim.tickN, marks, phase]);

  const ranked = useMemo(() => rankProgress(liveProgress), [liveProgress]);
  const myRank = useMemo(() => ranked.findIndex((p) => p.id === 'me') + 1, [ranked]);
  const totalRacers = ranked.length;

  // Distance to next mark, for the HUD.
  const distanceToNextPx = useMemo(() => {
    const me = liveProgress.find((p) => p.id === 'me');
    return me ? Math.round(me.distanceToTargetPx) : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveProgress]);

  // Localised chrome.
  const courseTitle = course.title(tp);
  const ghostsLabel = tp(
    'Тренировочные призраки',
    'Practice ghosts',
    'Treningowe duchy',
    {
      es: 'Fantasmas de practica',
      fr: 'Fantomes d entrainement',
      de: 'Trainings-Geister',
      it: 'Fantasmi di pratica',
    },
  );
  const placeLabel = tp('МЕСТО', 'PLACE', 'MIEJSCE', {
    es: 'PUESTO', fr: 'PLACE', de: 'PLATZ', it: 'POSTO',
  });
  const distLabel = tp('ДО ЗНАКА', 'TO MARK', 'DO ZNAKU', {
    es: 'AL MARCA', fr: 'AU MARQUE', de: 'ZUR TONNE', it: 'AL SEGNALE',
  });
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
  const placeFmt = (place: number, total: number) =>
    tp(
      `${place} место из ${total}`,
      `${ordinal(place)} place of ${total}`,
      `${place} miejsce z ${total}`,
      {
        es: `${place} puesto de ${total}`,
        fr: `${place}e place sur ${total}`,
        de: `${place}. Platz von ${total}`,
        it: `${place} posto su ${total}`,
      },
    );
  const elapsedLabel = tp('Время', 'Time', 'Czas', {
    es: 'Tiempo', fr: 'Temps', de: 'Zeit', it: 'Tempo',
  });
  const tryAgainLabel = tp('Ещё раз', 'Try again', 'Jeszcze raz', {
    es: 'Otra vez', fr: 'Recommencer', de: 'Nochmal', it: 'Ancora',
  });
  const leaveLabel = tp('Покинуть комнату', 'Leave room', 'Opusc pokoj', {
    es: 'Salir de la sala',
    fr: 'Quitter la salle',
    de: 'Raum verlassen',
    it: 'Lascia stanza',
  });
  const saveLabel = tp('Сохранить', 'Save', 'Zapisz', {
    es: 'Guardar', fr: 'Enregistrer', de: 'Speichern', it: 'Salva',
  });
  const savedLabel = tp('Сохранено', 'Saved', 'Zapisano', {
    es: 'Guardado', fr: 'Enregistre', de: 'Gespeichert', it: 'Salvato',
  });
  const codeLabel = tp('Комната', 'Room', 'Pokoj', {
    es: 'Sala', fr: 'Salle', de: 'Raum', it: 'Stanza',
  });

  // Race-history persistence. Same Save flow as solo.
  const history = useRaceHistory();
  const [savedRaceId, setSavedRaceId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (saving || savedRaceId) return;
    setSaving(true);
    const finishTime = finishTimeRef.current ?? 0;
    const record = await history.save({
      courseId: course.id,
      timeSec: finishTime,
      score: 0,
      replay: replayRef.current,
      windDirDeg: Math.round(
        (((sim.wind.trueWindDirRad * 180) / Math.PI) % 360 + 360) % 360,
      ),
      windSpeedKn: sim.wind.trueWindSpeedKts,
      parSec: course.parSec,
      difficulty: course.difficulty,
      windStrength: course.windStrength,
    });
    setSavedRaceId(record.id);
    setSaving(false);
  }, [
    course,
    history,
    saving,
    savedRaceId,
    sim.wind.trueWindDirRad,
    sim.wind.trueWindSpeedKts,
  ]);

  const handleTryAgain = useCallback(() => {
    replayRef.current = [];
    lastSampleSecRef.current = -1;
    finishTimeRef.current = null;
    startTimestampRef.current = null;
    setRaceTimeSec(0);
    setSavedRaceId(null);
    setSaving(false);
    setFinishPlace(null);
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

  const handleLeave = useCallback(() => {
    router.replace('/multiplayer');
  }, [router]);

  return (
    <Screen noTopInset>
      <Stack.Screen options={{ title: courseTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text variant="subtitle" style={styles.title}>{courseTitle}</Text>
            <Text variant="caption" style={styles.subtitle}>
              {ghostsLabel}
            </Text>
          </View>
          <View style={styles.codePill} accessibilityLabel={`${codeLabel} ${code}`}>
            <Text style={styles.codePillKicker}>{codeLabel.toUpperCase()}</Text>
            <Text style={styles.codePillValue}>{code}</Text>
          </View>
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

                {finishLine ? (
                  <SkiaLine
                    p1={{ x: finishLine.x1, y: finishLine.y1 }}
                    p2={{ x: finishLine.x2, y: finishLine.y2 }}
                    color={colors.accentCyan}
                    strokeWidth={2.5}
                    opacity={0.86}
                  />
                ) : null}

                {/* Ghost boats. Rendered BEFORE the player so the
                    player's wake / sails sit on top when crossing. */}
                {ghosts.map((g) => (
                  <Group key={g.id}>
                    <Circle
                      cx={g.x}
                      cy={g.y}
                      r={boatLength * 0.34}
                      color={
                        g.color === 'warning'
                          ? 'rgba(255, 170, 0, 0.20)'
                          : 'rgba(255, 68, 68, 0.20)'
                      }
                    />
                    <SkiaYacht
                      centerX={g.x}
                      centerY={g.y}
                      headingRad={g.headingRad}
                      awaDeg={0}
                      mainSheet={0.5}
                      jibSheet={0.4}
                      twist={0.15}
                      reef={0}
                      sailSet="mainJib"
                      length={boatLength * 0.78}
                    />
                  </Group>
                ))}

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

          <View pointerEvents="none" style={styles.hud}>
            <HudStat label={placeLabel} value={`${myRank}/${totalRacers}`} />
            <HudStat label={distLabel} value={`${distanceToNextPx}`} />
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
                {placeFmt(finishPlace ?? myRank, totalRacers)}
              </Text>
              <View style={styles.resultRow}>
                <View style={styles.resultStat}>
                  <Text style={styles.resultStatLabel}>{elapsedLabel}</Text>
                  <Text style={styles.resultStatValue}>
                    {formatTime(finishTimeRef.current ?? 0)}
                  </Text>
                </View>
                <View style={styles.resultStat}>
                  <Text style={styles.resultStatLabel}>{codeLabel}</Text>
                  <Text style={styles.resultStatValue}>{code}</Text>
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
                    {savedRaceId ? savedLabel : saveLabel}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleTryAgain}
                  accessibilityRole="button"
                  accessibilityLabel={tryAgainLabel}
                  style={({ pressed }) => [
                    styles.resultButton,
                    styles.resultButtonPrimary,
                    pressed && styles.resultButtonPressed,
                  ]}
                >
                  <Text style={styles.resultButtonTextPrimary}>{tryAgainLabel}</Text>
                </Pressable>
              </View>
              <View style={styles.resultActions}>
                <Pressable
                  onPress={handleLeave}
                  accessibilityRole="button"
                  accessibilityLabel={leaveLabel}
                  style={({ pressed }) => [
                    styles.resultButton,
                    pressed && styles.resultButtonPressed,
                  ]}
                >
                  <Text style={styles.resultButtonText}>{leaveLabel}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

/**
 * English-only ordinal helper. Russian / Polish / etc. use a numeric
 * "N place of M" template instead, so the ordinal is only consumed by
 * the EN string.
 */
function ordinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

function ghostProgressFor(
  g: GhostBoat,
  marks: ReadonlyArray<CourseMarkScreen>,
): ParticipantProgress {
  // The mock client owns ghost finish timing. We approximate a
  // "marks cleared" count from the ghost's spatial proximity: a ghost
  // beyond the windward mark on the way down counts as 2 cleared
  // (start, windward). Once finishTimeSec is set, all marks are
  // considered cleared so the rank stays stable.
  if (g.finishTimeSec !== null) {
    return {
      id: g.id,
      marksCleared: marks.length,
      distanceToTargetPx: 0,
      finishTimeSec: g.finishTimeSec,
    };
  }
  const windward = marks[1];
  let marksCleared = 0;
  let target = marks[0];
  if (windward) {
    // If the ghost has descended below the windward mark by more than
    // its capture radius, treat the windward mark as rounded.
    if (g.y > windward.y + windward.captureRadius) {
      marksCleared = 2;
      target = marks[2] ?? marks[1];
    } else {
      marksCleared = 1;
      target = windward;
    }
  }
  const dist = target
    ? Math.sqrt((g.x - target.x) ** 2 + (g.y - target.y) ** 2)
    : 0;
  return {
    id: g.id,
    marksCleared,
    distanceToTargetPx: dist,
    finishTimeSec: null,
  };
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerLeft: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: 22,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  codePill: {
    backgroundColor: colors.bgCard,
    borderColor: colors.borderCyanSoft,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'flex-end',
    minWidth: 86,
  },
  codePillKicker: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  codePillValue: {
    color: colors.accentCyan,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
    fontVariant: ['tabular-nums'],
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
    minWidth: 56,
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
