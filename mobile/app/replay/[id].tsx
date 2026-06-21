/**
 * Race replay viewer.
 *
 * Reads a race id from the URL, hydrates the matching `RaceRecord` from
 * `regatta.race-history.v1`, and plays back the boat over a Skia scene
 * with course marks, the sailed track, the wake at the boat, and a
 * playback-clock scrubber.
 *
 * Playback model:
 *  - A monotonic local clock (`clockSec`) ticks while the user is in the
 *    "Play" state. Every animation frame we advance it by the delta
 *    between the previous and current `Date.now()` value, multiplied by
 *    the current speed factor (1x / 2x / 4x).
 *  - At each frame we resolve a `PlaybackFrame` from `playback.frameAt`,
 *    which lerps boat position and slerps heading between the two
 *    nearest sample rows (Sprint 9 wrote ~1Hz samples).
 *  - When the clock passes the last sample, playback pauses and the
 *    "Restart" CTA wraps the scrubber back to t=0.
 *
 * Share affordance:
 *  - Generates a deterministic 4-char code via `shareCode(raceId)`.
 *  - Tries the RN core `Share.share` sheet (native iOS/Android target
 *    picker) with a usable replay link `${API_BASE}/r/{code}`, mirroring
 *    the web ShareCard. The link plus a one-line summary (course, time,
 *    score) goes out, not a bare code.
 *
 * Event markers:
 *  - Tacks, mark roundings and no-go stalls from `race.events` are pinned
 *    to where they happened on the track via `frameAt(event.t)` and drawn
 *    as colour-coded dots, with a small legend under the canvas.
 */
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
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
import {
  EmptyState,
  Screen,
  SkiaYacht,
  Text,
} from '../../src/design-system/components';
import {
  shareCode,
  useRaceHistory,
  type RaceRecord,
} from '../../src/persistence/race-history';
import {
  frameAt,
  summarizeReplay,
  type PlaybackFrame,
} from '../../src/replay/playback';
import { API_BASE, type CoachLogEvent } from '../../src/api/coach';
import type { ReplayPoint } from '../../src/persistence/race-history';
import {
  buildFinishLine,
  findCourse,
  projectCourse,
  scoreCourse,
  type CourseMarkScreen,
} from '../../src/game/course';
import { colors, glow, radii, shadow, spacing } from '../../src/design-system/tokens';

const SPEED_OPTIONS: ReadonlyArray<1 | 2 | 4> = [1, 2, 4];

function formatTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/** Build the cumulative track path from all replay samples up to `idx`. */
function buildTrackPath(samples: ReadonlyArray<{ x: number; y: number }>) {
  const p = Skia.Path.Make();
  if (samples.length === 0) return p;
  p.moveTo(samples[0]!.x, samples[0]!.y);
  for (let i = 1; i < samples.length; i++) {
    p.lineTo(samples[i]!.x, samples[i]!.y);
  }
  return p;
}

/**
 * Wake bezier behind the boat. Mirrors the helper on the Game screen so
 * the visual reads identically; we only show wake when the interpolated
 * speed is above a small threshold.
 */
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

/** A race event resolved to a screen position on the sailed track. */
interface EventMarker {
  key: string;
  x: number;
  y: number;
  t: number;
  /** Marker fill colour, from the dark-ocean token palette. */
  color: string;
}

/**
 * Resolve each race event to an (x, y) on the recorded track by sampling
 * the playback at the event's timestamp. Start / finish carry no useful
 * position context for the player and are skipped so the timeline stays
 * legible; we surface the three "moments that cost time" - tacks, mark
 * roundings, and no-go (head-to-wind stall) entries - colour-coded:
 *   - mark rounding  -> accent cyan (a checkpoint cleared)
 *   - tack           -> teal (a manoeuvre)
 *   - no-go entered  -> overtrim amber (a stall, time lost)
 */
function buildEventMarkers(
  events: ReadonlyArray<CoachLogEvent>,
  replay: ReadonlyArray<ReplayPoint>,
): EventMarker[] {
  if (events.length === 0 || replay.length === 0) return [];
  const out: EventMarker[] = [];
  const mutableReplay = replay as ReplayPoint[];
  events.forEach((ev, idx) => {
    let color: string;
    switch (ev.type) {
      case 'mark-rounded':
        color = colors.accentCyan;
        break;
      case 'tack':
        color = colors.accentTeal;
        break;
      case 'no-go-entered':
        color = colors.overtrim;
        break;
      default:
        // start / finish - no on-track marker.
        return;
    }
    const f = frameAt(mutableReplay, ev.t);
    out.push({ key: `${ev.type}-${idx}-${ev.t}`, x: f.x, y: f.y, t: ev.t, color });
  });
  return out;
}

export default function Replay() {
  const { tp } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const raceId = typeof params.id === 'string' ? params.id : undefined;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const sceneW = Math.min(Math.max(windowWidth - spacing.lg * 2, 320), 440);
  const sceneH = Math.min(Math.max(windowHeight * 0.5, 360), 520);
  const boatLength = sceneW < 360 ? 46 : 54;

  const history = useRaceHistory();
  // Hydrate the race record once history is ready. We deliberately keep
  // a local copy so a Settings-driven `clear()` mid-playback does not
  // yank the scene out from under us.
  const [race, setRace] = useState<RaceRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!history.ready || !raceId) return;
    const rec = history.getRaceById(raceId);
    setRace(rec);
    setHydrated(true);
  }, [history, history.ready, raceId]);

  // Course geometry. We rebuild marks against the current scene size so
  // the replay reads at the size of the user's phone, not whatever
  // device recorded the race. Marks render as cleared by default in the
  // viewer (this race already finished) so the player can read the
  // course shape at a glance.
  const course = useMemo(
    () => findCourse(race?.courseId),
    [race?.courseId],
  );
  const marks = useMemo<CourseMarkScreen[]>(
    () =>
      projectCourse(course, { width: sceneW, height: sceneH }).map((m) => ({
        ...m,
        cleared: true,
        active: false,
      })),
    [course, sceneW, sceneH],
  );
  const finishLine = useMemo(
    () => buildFinishLine(marks, { width: sceneW, height: sceneH }),
    [marks, sceneW, sceneH],
  );

  // Playback engine. `clockSec` is the source of truth for the displayed
  // boat position; everything else (scrubber position, wake density,
  // visible track) is derived from it via the playback helpers.
  const summary = useMemo(
    () => summarizeReplay(race?.replay ?? []),
    [race?.replay],
  );
  const totalSec = summary.totalSec;
  const [clockSec, setClockSec] = useState(0);
  const clockRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);

  // RAF loop. We don't trust `setInterval` to give us smooth motion at
  // arbitrary speeds; an animation frame plus a per-frame delta gives
  // 60 fps on iOS and falls back gracefully under load.
  const rafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const lastTickRef = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) {
      lastTickRef.current = null;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    const tick = () => {
      const now = Date.now();
      const last = lastTickRef.current ?? now;
      const dt = (now - last) / 1000;
      lastTickRef.current = now;
      const next = clockRef.current + dt * speed;
      if (next >= totalSec) {
        clockRef.current = totalSec;
        setClockSec(totalSec);
        setPlaying(false);
        return;
      }
      clockRef.current = next;
      setClockSec(next);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [playing, speed, totalSec]);

  const handlePlayPause = useCallback(() => {
    if (!race) return;
    // If we're at the end, loop back to start when the user hits play.
    if (!playing && clockRef.current >= totalSec) {
      clockRef.current = 0;
      setClockSec(0);
    }
    setPlaying((p) => !p);
  }, [playing, race, totalSec]);

  const handleRestart = useCallback(() => {
    clockRef.current = 0;
    setClockSec(0);
    setPlaying(false);
  }, []);

  const handleSpeed = useCallback(() => {
    setSpeed((s) => {
      const idx = SPEED_OPTIONS.indexOf(s);
      return SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length]!;
    });
  }, []);

  // Scrubber gesture. Dragging seeks the clock; we pause playback while
  // the user is scrubbing so the value doesn't fight the gesture.
  const scrubWidthRef = useRef(0);
  const setClockFromCoord = useCallback(
    (xCoord: number) => {
      const w = scrubWidthRef.current;
      if (w <= 0 || totalSec <= 0) return;
      const ratio = Math.max(0, Math.min(1, xCoord / w));
      const next = ratio * totalSec;
      clockRef.current = next;
      setClockSec(next);
    },
    [totalSec],
  );
  const scrub = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onBegin((e) => {
          setPlaying(false);
          setClockFromCoord(e.x);
        })
        .onChange((e) => setClockFromCoord(e.x)),
    [setClockFromCoord],
  );

  // Current playback frame derived from the clock + replay rows.
  const frame: PlaybackFrame = useMemo(
    () => frameAt(race?.replay ?? [], clockSec),
    [race?.replay, clockSec],
  );

  // Visible track up to the current sample (so the trail "draws itself"
  // as playback advances). We slice down to `frame.j + 1` so the head of
  // the trail meets the current boat position.
  const visibleTrackPath = useMemo(() => {
    const samples = race?.replay ?? [];
    if (samples.length === 0) return Skia.Path.Make();
    const upTo = Math.min(samples.length, frame.j + 1);
    return buildTrackPath(samples.slice(0, upTo));
  }, [race?.replay, frame.j]);

  const wakePath = useMemo(
    () =>
      buildWakePath(
        frame.x,
        frame.y,
        frame.headingRad,
        boatLength,
        frame.speedKn,
      ),
    [frame.x, frame.y, frame.headingRad, frame.speedKn, boatLength],
  );

  // Colour-coded event markers pinned to where they happened on the
  // track: tacks, mark roundings and no-go stalls. We rebuild whenever
  // the record (and therefore the scene-projected track) changes.
  const eventMarkers = useMemo(
    () => buildEventMarkers(race?.events ?? [], race?.replay ?? []),
    [race?.events, race?.replay],
  );

  // Localised chrome.
  const screenTitle = tp('Повтор', 'Replay', 'Powtorka', {
    es: 'Repeticion',
    fr: 'Replay',
    de: 'Wiedergabe',
    it: 'Replay',
  });
  const playLabel = tp('Старт', 'Play', 'Odtwarzaj', {
    es: 'Reproducir',
    fr: 'Lire',
    de: 'Abspielen',
    it: 'Riproduci',
  });
  const pauseLabel = tp('Пауза', 'Pause', 'Pauza', {
    es: 'Pausa',
    fr: 'Pause',
    de: 'Pause',
    it: 'Pausa',
  });
  const restartLabel = tp('Заново', 'Restart', 'Od poczatku', {
    es: 'Reiniciar',
    fr: 'Recommencer',
    de: 'Neu starten',
    it: 'Riavvia',
  });
  const shareLabel = tp('Поделиться', 'Share', 'Udostepnij', {
    es: 'Compartir',
    fr: 'Partager',
    de: 'Teilen',
    it: 'Condividi',
  });
  const speedLabel = tp('Скорость', 'Speed', 'Predkosc', {
    es: 'Velocidad',
    fr: 'Vitesse',
    de: 'Tempo',
    it: 'Velocita',
  });
  const elapsedLabel = tp('Время', 'Time', 'Czas', {
    es: 'Tiempo',
    fr: 'Temps',
    de: 'Zeit',
    it: 'Tempo',
  });
  const scoreLabel = tp('Очки', 'Score', 'Wynik', {
    es: 'Puntos',
    fr: 'Score',
    de: 'Punkte',
    it: 'Punti',
  });
  const notFoundTitle = tp(
    'Гонка не найдена',
    'Race not found',
    'Nie znaleziono wyscigu',
    {
      es: 'Regata no encontrada',
      fr: 'Course introuvable',
      de: 'Rennen nicht gefunden',
      it: 'Gara non trovata',
    },
  );
  const notFoundSubtitle = tp(
    'Возможно, её удалили из истории.',
    'It may have been cleared from history.',
    'Mogl byc usuniety z historii.',
    {
      es: 'Es posible que se haya borrado del historial.',
      fr: 'Elle a peut-etre ete effacee de lhistorique.',
      de: 'Sie wurde moeglicherweise aus dem Verlauf geloescht.',
      it: 'Potrebbe essere stata cancellata dalla cronologia.',
    },
  );
  const backToHistoryLabel = tp(
    'К списку',
    'Back to history',
    'Wroc do historii',
    {
      es: 'Volver al historial',
      fr: 'Retour a lhistorique',
      de: 'Zum Verlauf',
      it: 'Torna alla cronologia',
    },
  );
  const codePrefixLabel = tp('Код', 'Code', 'Kod', {
    es: 'Codigo',
    fr: 'Code',
    de: 'Code',
    it: 'Codice',
  });
  const shareTitleLabel = tp(
    'Моя гонка в Regatta',
    'My race in Regatta',
    'Moj wyscig w Regacie',
    {
      es: 'Mi regata en Regatta',
      fr: 'Ma course dans Regatta',
      de: 'Mein Rennen in Regatta',
      it: 'La mia gara in Regatta',
    },
  );
  const legendMarkLabel = tp('Знак', 'Mark', 'Znak', {
    es: 'Baliza',
    fr: 'Bouee',
    de: 'Tonne',
    it: 'Boa',
  });
  const legendTackLabel = tp('Поворот', 'Tack', 'Zwrot', {
    es: 'Virada',
    fr: 'Virement',
    de: 'Wende',
    it: 'Virata',
  });
  const legendNoGoLabel = tp('В лавировку', 'No-go', 'Martwy kat', {
    es: 'Zona muerta',
    fr: 'Zone morte',
    de: 'Tote Zone',
    it: 'Zona morta',
  });
  const tryItLabel = tp(
    'Попробуй сам',
    'Try it yourself',
    'Sprobuj sam',
    {
      es: 'Pruebalo tu mismo',
      fr: 'Essaie toi-meme',
      de: 'Probier es selbst',
      it: 'Provaci tu',
    },
  );

  const code = useMemo(
    () => (race ? shareCode(race.id) : ''),
    [race?.id],
  );
  const handleShare = useCallback(async () => {
    if (!race) return;
    // Compose a friendly one-liner with a usable replay link. The web
    // serves shared replays at `/r/{code}` (see GameClient ShareCard), so
    // we point the recipient there rather than emitting a bare code.
    const courseTitle = course.title(tp);
    const replayUrl = `${API_BASE}/r/${code}`;
    const message = `${shareTitleLabel}\n${courseTitle}: ${formatTime(race.timeSec)} (${race.score})\n${replayUrl}`;
    try {
      await Share.share({ message, title: shareTitleLabel, url: replayUrl });
    } catch {
      // Share sheet was dismissed or unavailable. We don't surface a
      // toast in v1 - the code and link are also visible inline.
    }
  }, [race, course, tp, code, shareTitleLabel]);

  // Empty / loading states - render before the full Skia scene below so
  // we never flash an empty canvas while history is hydrating.
  if (!raceId || (hydrated && !race)) {
    return (
      <Screen>
        <Stack.Screen options={{ title: screenTitle }} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <EmptyState
            icon="flag"
            title={notFoundTitle}
            subtitle={notFoundSubtitle}
            cta={{
              label: backToHistoryLabel,
              onPress: () => router.replace('/history'),
            }}
          />
        </ScrollView>
      </Screen>
    );
  }
  if (!race) {
    // Hydrating. Render the title + a faint placeholder to avoid layout
    // jump once the record arrives.
    return (
      <Screen>
        <Stack.Screen options={{ title: screenTitle }} />
        <View style={styles.scroll}>
          <View style={[styles.canvasWrap, { width: sceneW, height: sceneH }]} />
        </View>
      </Screen>
    );
  }

  const courseTitle = course.title(tp);
  const liveScore = scoreCourse(race.timeSec, course.parSec) || race.score;
  const scrubFillPct =
    totalSec > 0 ? Math.max(0, Math.min(100, (clockSec / totalSec) * 100)) : 0;

  return (
    <Screen noTopInset>
      <Stack.Screen options={{ title: screenTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.summary}>
          <View style={styles.summaryHeader}>
            <Text variant="subtitle" style={styles.summaryTitle} numberOfLines={2}>
              {courseTitle}
            </Text>
            <Text variant="muted" style={styles.summaryCode}>
              {`${codePrefixLabel}: ${code}`}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatLabel}>{elapsedLabel}</Text>
              <Text style={styles.summaryStatValue}>
                {formatTime(race.timeSec)}
              </Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatLabel}>{scoreLabel}</Text>
              <Text style={styles.summaryStatValue}>{liveScore}</Text>
            </View>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatLabel}>{speedLabel}</Text>
              <Text style={styles.summaryStatValue}>{`${speed}x`}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.canvasWrap, { width: sceneW, height: sceneH }]}>
          <Canvas style={{ width: sceneW, height: sceneH }}>
            <Group>
              {/* Course mark overlay - all rendered as "cleared" since the
                  race is in the past. */}
              {marks.map((m) => (
                <Group key={m.id}>
                  <Circle
                    cx={m.x}
                    cy={m.y}
                    r={m.captureRadius}
                    color="rgba(68, 255, 136, 0.10)"
                    style="stroke"
                    strokeWidth={1}
                  />
                  <Circle
                    cx={m.x}
                    cy={m.y}
                    r={m.radius}
                    color={colors.success}
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

              {/* Track drawn up to the current playhead. */}
              <Path
                path={visibleTrackPath}
                color="rgba(82, 255, 142, 0.70)"
                style="stroke"
                strokeWidth={1.6}
                strokeCap="round"
                strokeJoin="round"
                opacity={0.5}
              />
              {/* Colour-coded event markers along the track: tacks,
                  mark roundings, no-go stalls. A faint halo plus a solid
                  dot reads at small sizes on the dark-ocean base. */}
              {eventMarkers.map((m) => (
                <Group key={m.key}>
                  <Circle cx={m.x} cy={m.y} r={7} color={m.color} opacity={0.18} />
                  <Circle cx={m.x} cy={m.y} r={3.5} color={m.color} />
                </Group>
              ))}

              {/* Wake at the boat. */}
              <Path
                path={wakePath}
                color="rgba(232, 244, 248, 0.42)"
                style="stroke"
                strokeWidth={2}
                strokeCap="round"
                opacity={0.55}
              />

              <SkiaYacht
                centerX={frame.x}
                centerY={frame.y}
                headingRad={frame.headingRad}
                awaDeg={0}
                mainSheet={0.5}
                jibSheet={0.4}
                sailSet="mainJib"
                length={boatLength}
              />
            </Group>
          </Canvas>
        </View>

        {/* Event-marker legend - only shown when the race carries events
            worth pinning to the track. */}
        {eventMarkers.length > 0 ? (
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: colors.accentCyan }]}
              />
              <Text style={styles.legendText}>{legendMarkLabel}</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: colors.accentTeal }]}
              />
              <Text style={styles.legendText}>{legendTackLabel}</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: colors.overtrim }]}
              />
              <Text style={styles.legendText}>{legendNoGoLabel}</Text>
            </View>
          </View>
        ) : null}

        {/* Scrubber + clock readout */}
        <View style={styles.scrubWrap}>
          <Text allowFontScaling={false} style={styles.scrubClock}>
            {`${formatTime(clockSec)} / ${formatTime(totalSec)}`}
          </Text>
          <GestureDetector gesture={scrub}>
            <View
              style={styles.scrubTrack}
              onLayout={(e) => {
                scrubWidthRef.current = e.nativeEvent.layout.width;
              }}
            >
              <View style={styles.scrubBg} />
              <View style={[styles.scrubFill, { width: `${scrubFillPct}%` }]} />
              <View
                pointerEvents="none"
                style={[styles.scrubKnob, { left: `${scrubFillPct}%` }]}
              />
            </View>
          </GestureDetector>
        </View>

        <View style={styles.controlsRow}>
          <Pressable
            onPress={handlePlayPause}
            accessibilityRole="button"
            accessibilityLabel={playing ? pauseLabel : playLabel}
            style={({ pressed }) => [
              styles.controlButton,
              styles.controlButtonPrimary,
              pressed && styles.controlButtonPressed,
            ]}
          >
            <Text style={styles.controlButtonTextPrimary}>
              {playing ? pauseLabel : playLabel}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleRestart}
            accessibilityRole="button"
            accessibilityLabel={restartLabel}
            style={({ pressed }) => [
              styles.controlButton,
              pressed && styles.controlButtonPressed,
            ]}
          >
            <Text style={styles.controlButtonText}>{restartLabel}</Text>
          </Pressable>
          <Pressable
            onPress={handleSpeed}
            accessibilityRole="button"
            accessibilityLabel={`${speedLabel} ${speed}x`}
            style={({ pressed }) => [
              styles.controlButton,
              pressed && styles.controlButtonPressed,
            ]}
          >
            <Text style={styles.controlButtonText}>{`${speed}x`}</Text>
          </Pressable>
        </View>

        <View style={styles.shareRow}>
          <Pressable
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel={shareLabel}
            style={({ pressed }) => [
              styles.shareButton,
              pressed && styles.controlButtonPressed,
            ]}
          >
            <Text style={styles.shareButtonText}>
              {`${shareLabel}: ${code}`}
            </Text>
          </Pressable>
        </View>

        {/* Convert the viewer into a player: jump straight to a new race. */}
        <View style={styles.tryItRow}>
          <Pressable
            onPress={() => router.push('/game')}
            accessibilityRole="button"
            accessibilityLabel={tryItLabel}
            style={({ pressed }) => [
              styles.tryItButton,
              pressed && styles.controlButtonPressed,
            ]}
          >
            <Text style={styles.tryItButtonText}>{`${tryItLabel} ->`}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  summary: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  summaryTitle: {
    fontSize: 18,
    flex: 1,
  },
  summaryCode: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.accentCyan,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'flex-start',
  },
  summaryStatLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  summaryStatValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
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
  scrubWrap: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  scrubClock: {
    color: colors.accentCyan,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.4,
  },
  scrubTrack: {
    height: 32,
    justifyContent: 'center',
  },
  scrubBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 14,
    bottom: 14,
    backgroundColor: 'rgba(232, 244, 248, 0.12)',
    borderRadius: radii.pill,
  },
  scrubFill: {
    position: 'absolute',
    top: 14,
    bottom: 14,
    left: 0,
    backgroundColor: colors.accentCyan,
    borderRadius: radii.pill,
    opacity: 0.85,
  },
  scrubKnob: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.bgPrimary,
    borderColor: colors.accentCyan,
    borderWidth: 2,
    marginLeft: -9,
    top: 7,
    shadowColor: colors.accentCyan,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  controlButton: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderColor: colors.borderCyanSoft,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  controlButtonPrimary: {
    backgroundColor: colors.accentCyan,
    borderColor: colors.accentCyan,
  },
  controlButtonPressed: {
    opacity: 0.84,
  },
  controlButtonText: {
    color: colors.accentCyan,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  controlButtonTextPrimary: {
    color: colors.bgPrimary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  legendText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  shareRow: {
    marginTop: spacing.md,
  },
  shareButton: {
    backgroundColor: colors.bgCard,
    borderColor: colors.borderCyanSoft,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    ...shadow.card,
  },
  shareButtonText: {
    color: colors.accentCyan,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tryItRow: {
    marginTop: spacing.md,
  },
  tryItButton: {
    minHeight: 44,
    backgroundColor: colors.accentCyan,
    borderColor: colors.accentCyan,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...glow.primary,
  },
  tryItButtonText: {
    color: colors.bgPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
