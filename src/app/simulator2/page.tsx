'use client';

import { useMemo, useState } from 'react';
import { pointsOfSail, type PointOfSail } from '@/data/sailing-data';
import { useI18n } from '@/lib/i18n';
import {
  createInitialState,
  getBoatParams,
  settle,
  type Controls,
  type TickResult,
} from '@/lib/sailing-physics';

type Tack = 'starboard' | 'port';
type ReefLevel = 0 | 1 | 2;
type TpFn = (ru: string, en: string, pl: string) => string;

interface UiState {
  twa: number;
  tack: Tack;
  windSpeed: number;
  mainAngle: number;
  jibAngle: number;
  jibFurlPct: number;
  reefLevel: ReefLevel;
  mainTwistPct: number;
  jibTwistPct: number;
  showOptimal: boolean;
  advanced: boolean;
}

interface OptimalTrim {
  mainAngle: number;
  jibAngle: number;
  mainTwistPct: number;
  jibTwistPct: number;
}

interface SimulationModel {
  result: TickResult;
  optimalResult: TickResult;
  pos: PointOfSail;
  signedTwa: number;
  absTwa: number;
  trimScore: number;
  optimal: OptimalTrim;
  feedback: string[];
}

const DEFAULT_UI: UiState = {
  twa: 90,
  tack: 'starboard',
  windSpeed: 12,
  mainAngle: 60,
  jibAngle: 55,
  jibFurlPct: 100,
  reefLevel: 0,
  mainTwistPct: 20,
  jibTwistPct: 16,
  showOptimal: true,
  advanced: false,
};

const REEF_VALUES: Record<ReefLevel, number> = {
  0: 0,
  1: 0.45,
  2: 0.85,
};

const REEF_VISUAL: Record<ReefLevel, number> = {
  0: 1,
  1: 0.78,
  2: 0.56,
};

const COURSE_PRESETS = [
  { id: 'close', twa: 42 },
  { id: 'beam', twa: 90 },
  { id: 'broad', twa: 135 },
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pointOfSailFor(absTwa: number): PointOfSail {
  for (const pos of pointsOfSail) {
    if (absTwa >= pos.angleMin && absTwa < pos.angleMax) return pos;
  }
  return pointsOfSail[pointsOfSail.length - 1];
}

function toMainSheet(angle: number, maxOff: number): number {
  return clamp(1 - angle / maxOff, 0, 1);
}

function toJibSheet(angle: number, minOff: number, maxOff: number): number {
  const span = maxOff - minOff;
  if (span <= 0) return 0;
  return clamp(1 - (angle - minOff) / span, 0, 1);
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function polarPoint(cx: number, cy: number, radius: number, degFromUp: number) {
  const rad = degToRad(degFromUp);
  return {
    x: cx + Math.sin(rad) * radius,
    y: cy - Math.cos(rad) * radius,
  };
}

function linePath(a: { x: number; y: number }, b: { x: number; y: number }): string {
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} L ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

function sectorPath(cx: number, cy: number, inner: number, outer: number, startDeg: number, endDeg: number): string {
  const outerStart = polarPoint(cx, cy, outer, startDeg);
  const outerEnd = polarPoint(cx, cy, outer, endDeg);
  const innerEnd = polarPoint(cx, cy, inner, endDeg);
  const innerStart = polarPoint(cx, cy, inner, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${outerStart.x.toFixed(1)} ${outerStart.y.toFixed(1)}`,
    `A ${outer} ${outer} 0 ${largeArc} 1 ${outerEnd.x.toFixed(1)} ${outerEnd.y.toFixed(1)}`,
    `L ${innerEnd.x.toFixed(1)} ${innerEnd.y.toFixed(1)}`,
    `A ${inner} ${inner} 0 ${largeArc} 0 ${innerStart.x.toFixed(1)} ${innerStart.y.toFixed(1)}`,
    'Z',
  ].join(' ');
}

function recommendedTrim(awaAbs: number, windSpeed: number, reefLevel: ReefLevel, params: ReturnType<typeof getBoatParams>): OptimalTrim {
  let mainAngle = awaAbs - 14;
  let jibAngle = awaAbs - 12;

  if (awaAbs < 38) {
    mainAngle -= 2;
    jibAngle -= 2;
  } else if (awaAbs > 120) {
    mainAngle += 4;
    jibAngle += 3;
  }

  if (awaAbs > 155) {
    mainAngle = params.mainMaxOff - 2;
    jibAngle = params.jibMaxOff;
  }

  if (windSpeed >= 18) {
    mainAngle += 2;
    jibAngle += 1;
  }

  const reefBias = reefLevel === 2 ? 6 : reefLevel === 1 ? 3 : 0;
  const mainTwistPct = clamp(windSpeed >= 18 ? 34 : windSpeed <= 8 ? 10 : 20, 0, 100);
  const jibTwistPct = clamp(windSpeed >= 18 ? 26 : windSpeed <= 8 ? 8 : 16, 0, 100);

  return {
    mainAngle: clamp(mainAngle + reefBias, 0, params.mainMaxOff),
    jibAngle: clamp(jibAngle + reefBias * 0.5, params.jibMinOff, params.jibMaxOff),
    mainTwistPct,
    jibTwistPct,
  };
}

function buildFeedback(args: {
  ui: UiState;
  sim: SimulationModel;
  tp: TpFn;
}): string[] {
  const { ui, sim, tp } = args;
  const notes: string[] = [];
  const { result, pos, absTwa } = sim;
  const { diag, state } = result;

  if (absTwa < 32) {
    notes.push(tp(
      'Нос слишком близко к ветру. Лодка теряет поток и почти не едет.',
      'Bow is too close to the wind. Flow detaches and the boat nearly stops.',
      'Dziób jest zbyt blisko wiatru. Przeplyw odrywa się i jacht prawie staje.',
    ));
  }

  if (diag.mainStalled) {
    notes.push(tp(
      'Грот перетянут. На гроте срыв потока, тяга упала.',
      'The mainsail is overtrimmed. Flow has stalled and drive dropped.',
      'Grott jest przebrany. Przeplyw oderwał się i ciąg spadł.',
    ));
  } else if (diag.mainAoA < 5) {
    notes.push(tp(
      'Грот слишком открыт. Угол атаки маленький, тяги мало.',
      'The mainsail is too open. Angle of attack is small and drive is low.',
      'Grott jest zbyt otwarty. Kat natarcia jest zbyt maly i ciag jest slaby.',
    ));
  }

  if (diag.jibStalled) {
    notes.push(tp(
      'Стаксель перетянут. Он закрывает поток на грот и сам теряет форму.',
      'The jib is overtrimmed. It chokes the main and loses shape itself.',
      'Fok jest zbyt mocno wybrany. Dusi grota i sam traci ksztalt.',
    ));
  } else if (diag.jibAoA < 5 && ui.jibFurlPct > 20) {
    notes.push(tp(
      'Стаксель слишком открыт. Он плохо ловит apparent wind.',
      'The jib is too open. It is not catching the apparent wind cleanly.',
      'Fok jest zbyt otwarty. Nie lapie dobrze pozornego wiatru.',
    ));
  }

  if (absTwa < 120) {
    if (diag.slotHealth > 0.72) {
      notes.push(tp(
        'Пара main + jib работает вместе. Slot между парусами здоровый.',
        'Main and jib are working together. The slot between sails is healthy.',
        'Grott i fok pracuja razem. Slot miedzy zaglami jest zdrowy.',
      ));
    } else if (diag.slotHealth < 0.35 && ui.jibFurlPct > 30) {
      notes.push(tp(
        'Связка парусов слабая. Подстрой стаксель, чтобы оживить slot.',
        'Sail interaction is weak. Retune the jib to recover the slot.',
        'Wspolpraca zagli jest slaba. Dostroj fok, aby odzyskac slot.',
      ));
    }
  }

  if (Math.abs(state.heel) > 22 && ui.windSpeed >= 16 && ui.reefLevel === 0) {
    notes.push(tp(
      'Крен уже высокий. Возьми 1 риф, чтобы сбросить перегруз.',
      'Heel is already high. Take the first reef to reduce overload.',
      'Przechyl jest juz duzy. Wez pierwszy ref, aby zdjac przeciazenie.',
    ));
  }

  if (Math.abs(state.leeway) > 5) {
    notes.push(tp(
      'Лодку сильно сносит вбок. Боковая сила большая, а киль уже не успевает.',
      'The boat is slipping sideways. Side force is high and the keel is saturated.',
      'Jacht wyraznie zsuwa sie bokiem. Sila boczna jest duza i kil jest nasycony.',
    ));
  }

  if (notes.length === 0) {
    notes.push(tp(
      `Настройка близка к хорошей для курса ${pos.nameRu.toLowerCase()}.`,
      `Trim is close to good for ${pos.nameEn.toLowerCase()}.`,
      `Ustawienie jest bliskie dobremu dla kursu ${pos.nameEn.toLowerCase()}.`,
    ));
  }

  return notes.slice(0, 4);
}

function labelPointOfSail(pos: PointOfSail, lang: 'ru' | 'en' | 'pl'): string {
  if (lang === 'ru') return pos.nameRu;
  return pos.nameEn;
}

export default function SimulatorPage() {
  const { lang, tp } = useI18n();
  const params = useMemo(() => getBoatParams(), []);
  const [ui, setUi] = useState<UiState>(DEFAULT_UI);

  const sim = useMemo<SimulationModel>(() => {
    const signedTwa = ui.tack === 'starboard' ? ui.twa : -ui.twa;
    const controls: Controls = {
      mainSheet: toMainSheet(ui.mainAngle, params.mainMaxOff),
      jibSheet: toJibSheet(ui.jibAngle, params.jibMinOff, params.jibMaxOff),
      mainTwist: ui.mainTwistPct / 100,
      jibTwist: ui.jibTwistPct / 100,
      reef: REEF_VALUES[ui.reefLevel],
      jibFurl: 1 - ui.jibFurlPct / 100,
      jibSide: 1,
    };

    const initial = createInitialState({
      tws: ui.windSpeed,
      twa: signedTwa,
      boatSpeed: Math.max(1.8, ui.windSpeed * 0.28),
    });

    const result = settle(initial, controls, params, 45, 0.1);

    const firstOptimal = recommendedTrim(Math.abs(result.diag.awa), ui.windSpeed, ui.reefLevel, params);
    const firstOptimalControls: Controls = {
      ...controls,
      mainSheet: toMainSheet(firstOptimal.mainAngle, params.mainMaxOff),
      jibSheet: toJibSheet(firstOptimal.jibAngle, params.jibMinOff, params.jibMaxOff),
      mainTwist: firstOptimal.mainTwistPct / 100,
      jibTwist: firstOptimal.jibTwistPct / 100,
    };
    const firstOptimalResult = settle(initial, firstOptimalControls, params, 45, 0.1);

    const optimal = recommendedTrim(Math.abs(firstOptimalResult.diag.awa), ui.windSpeed, ui.reefLevel, params);
    const optimalControls: Controls = {
      ...controls,
      mainSheet: toMainSheet(optimal.mainAngle, params.mainMaxOff),
      jibSheet: toJibSheet(optimal.jibAngle, params.jibMinOff, params.jibMaxOff),
      mainTwist: optimal.mainTwistPct / 100,
      jibTwist: optimal.jibTwistPct / 100,
    };
    const optimalResult = settle(initial, optimalControls, params, 45, 0.1);

    const absTwa = Math.abs(signedTwa);
    const pos = pointOfSailFor(absTwa);
    const trimScore = clamp(
      Math.round((result.state.boatSpeed / Math.max(0.1, optimalResult.state.boatSpeed)) * 100),
      0,
      100,
    );

    const baseModel: SimulationModel = {
      result,
      optimalResult,
      pos,
      signedTwa,
      absTwa,
      trimScore,
      optimal,
      feedback: [],
    };

    return {
      ...baseModel,
      feedback: buildFeedback({ ui, sim: baseModel, tp }),
    };
  }, [params, tp, ui]);

  const setPreset = (twa: number) => {
    const preset = recommendedTrim(Math.max(25, twa - 18), ui.windSpeed, ui.reefLevel, params);
    setUi((prev) => ({
      ...prev,
      twa,
      mainAngle: preset.mainAngle,
      jibAngle: preset.jibAngle,
      mainTwistPct: preset.mainTwistPct,
      jibTwistPct: preset.jibTwistPct,
    }));
  };

  const applyOptimal = () => {
    setUi((prev) => ({
      ...prev,
      mainAngle: sim.optimal.mainAngle,
      jibAngle: sim.optimal.jibAngle,
      mainTwistPct: sim.optimal.mainTwistPct,
      jibTwistPct: sim.optimal.jibTwistPct,
    }));
  };

  const resetAll = () => {
    setUi(DEFAULT_UI);
  };

  const speedDelta = sim.result.state.boatSpeed - sim.optimalResult.state.boatSpeed;
  const heelDelta = sim.result.state.heel - sim.optimalResult.state.heel;
  const leewayDelta = Math.abs(sim.result.state.leeway) - Math.abs(sim.optimalResult.state.leeway);
  const driveDelta = sim.result.diag.drive - sim.optimalResult.diag.drive;
  const pointLabel = labelPointOfSail(sim.pos, lang);
  const tackLabel = ui.tack === 'starboard'
    ? tp('Правый галс', 'Starboard tack', 'Prawy hals')
    : tp('Левый галс', 'Port tack', 'Lewy hals');

  // =====================================================================
  // SIMULATOR V2 - immersive cockpit layout
  // Same physics engine as /simulator (Phase 1). Different aesthetic:
  // edge-to-edge hero scene, big hero numbers in floating glass cards,
  // controls live in a sticky bottom strip.
  // =====================================================================
  const heelAbs = Math.abs(sim.result.state.heel);
  const leewayAbs = Math.abs(sim.result.state.leeway);
  const slotPct = Math.round(sim.result.diag.slotHealth * 100);

  return (
    <div className="page-enter relative min-h-screen" style={{ background: '#050b18' }}>
      {/* Top-bar A/B strip */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-6 py-2 border-b"
           style={{ background: 'rgba(5, 11, 24, 0.88)', borderColor: 'rgba(0, 212, 255, 0.16)', backdropFilter: 'blur(10px)' }}>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase"
                style={{ background: 'rgba(0, 212, 255, 0.16)', color: 'var(--accent-cyan)', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
            V2 · Immersive
          </span>
          <span className="hidden sm:inline text-xs text-[var(--text-muted)]">
            {tp('VPP · одна сцена · все силы на одном экране',
                'VPP · one scene · all forces on one screen',
                'VPP · jedna scena · wszystkie sily')}
          </span>
        </div>
        <div className="flex items-center gap-1">
        <a href="/simulator-v3" className="text-[11px] font-semibold px-2 py-1 rounded-md border transition hover:text-[var(--accent-cyan)]"
           style={{ borderColor: 'rgba(82, 255, 142, 0.4)', color: 'var(--success)' }}>V3 →</a>
        <a href="/simulator" className="text-xs font-semibold px-2.5 py-1 rounded-lg border transition hover:text-[var(--accent-cyan)]"
           style={{ borderColor: 'rgba(139, 167, 184, 0.25)', color: 'var(--text-secondary)' }}>
          {tp('← к V1', '← to V1', '← do V1')}
        </a>
        </div>
      </div>

      {/* HERO SCENE - edge-to-edge, fills most of viewport */}
      <section className="relative overflow-hidden"
               style={{ minHeight: 'min(82vh, 780px)', background: 'radial-gradient(ellipse at center 40%, #0e2749 0%, #061020 65%, #040a16 100%)' }}>
        <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
          <div className="w-full h-full max-w-5xl">
            <TopScene ui={ui} sim={sim} lang={lang} />
          </div>
        </div>

        {/* Overlay: point of sail + trim score (top-left) */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 max-w-[60%]"
             style={{ pointerEvents: 'none' }}>
          <div className="rounded-2xl p-3 sm:p-4"
               style={{ background: 'rgba(8, 24, 48, 0.58)', border: '1px solid rgba(0, 212, 255, 0.18)', backdropFilter: 'blur(14px)' }}>
            <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              {tp('Курс', 'Point of sail', 'Kurs')}
            </div>
            <div className="text-xl sm:text-2xl font-bold mt-0.5" style={{ color: sim.pos.color }}>
              {pointLabel}
            </div>
            <div className="text-[10px] sm:text-xs text-[var(--text-muted)] mt-1">
              {lang === 'ru' ? sim.pos.sailWork : sim.pos.sailWorkEn}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                {tp('Трим', 'Trim', 'Trim')}
              </div>
              <div className="text-sm font-black font-mono"
                   style={{ color: sim.trimScore > 80 ? 'var(--success)' : sim.trimScore > 55 ? 'var(--accent-cyan)' : 'var(--warning)' }}>
                {sim.trimScore}%
              </div>
              <div className="h-1.5 w-24 rounded-full overflow-hidden"
                   style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full transition-all"
                     style={{ width: `${sim.trimScore}%`,
                              background: sim.trimScore > 80 ? 'var(--success)' : sim.trimScore > 55 ? 'var(--accent-cyan)' : 'var(--warning)' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Overlay: hero numbers (top-right) */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 w-[170px] sm:w-[220px]">
          <div className="rounded-2xl p-3 sm:p-4 space-y-3"
               style={{ background: 'rgba(8, 24, 48, 0.62)', border: '1px solid rgba(0, 212, 255, 0.22)', backdropFilter: 'blur(14px)' }}>
            <HeroNumber
              label={tp('Скорость', 'Speed', 'Predkosc')}
              value={sim.result.state.boatSpeed.toFixed(1)}
              unit="kts"
              tone="cyan"
              big
            />
            <HeroNumber
              label={tp('Крен', 'Heel', 'Przechyl')}
              value={Math.round(sim.result.state.heel).toString()}
              unit="°"
              tone={heelAbs > 22 ? 'danger' : heelAbs > 15 ? 'warning' : 'cyan'}
            />
            <div className="grid grid-cols-2 gap-2 pt-1 border-t" style={{ borderColor: 'rgba(0, 212, 255, 0.1)' }}>
              <HeroNumber label="AWA" value={Math.round(Math.abs(sim.result.diag.awa)).toString()} unit="°" tone="cyan" small />
              <HeroNumber label="AWS" value={sim.result.diag.aws.toFixed(1)} unit="kts" tone="cyan" small />
              <HeroNumber
                label={tp('Слот', 'Slot', 'Slot')}
                value={slotPct.toString()}
                unit="%"
                tone={slotPct > 70 ? 'success' : slotPct > 40 ? 'cyan' : 'warning'}
                small
              />
              <HeroNumber
                label={tp('Снос', 'Leeway', 'Dryf')}
                value={leewayAbs.toFixed(1)}
                unit="°"
                tone={leewayAbs > 5 ? 'warning' : 'cyan'}
                small
              />
            </div>
          </div>
        </div>

        {/* Overlay: commentary (bottom-left) */}
        <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 max-w-md">
          <div className="rounded-2xl p-3 sm:p-4"
               style={{ background: 'rgba(8, 24, 48, 0.62)', border: '1px solid rgba(0, 212, 255, 0.18)', backdropFilter: 'blur(14px)' }}>
            <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-2">
              {tp('Разбор', 'Analysis', 'Analiza')}
            </div>
            <ul className="space-y-1.5 text-[11px] sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              {sim.feedback.slice(0, 3).map((message) => (
                <li key={message} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: 'var(--accent-cyan)' }} />
                  <span>{message}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Overlay: side view + diagnostics (bottom-right) */}
        <div className="hidden lg:block absolute bottom-6 right-6 w-[280px]">
          <div className="rounded-2xl overflow-hidden"
               style={{ background: 'rgba(8, 24, 48, 0.62)', border: '1px solid rgba(0, 212, 255, 0.2)', backdropFilter: 'blur(14px)' }}>
            <div className="px-3 pt-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  {tp('Сбоку', 'Side', 'Z boku')}
                </div>
                <div className="text-xs font-mono"
                     style={{ color: heelAbs > 22 ? 'var(--warning)' : 'var(--accent-cyan)' }}>
                  {Math.round(sim.result.state.heel)}°
                </div>
              </div>
            </div>
            <div className="px-1.5 pb-1.5">
              <SideScene ui={ui} sim={sim} />
            </div>
            <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: 'rgba(0, 212, 255, 0.08)' }}>
              <ProgressRow
                label="Main AoA"
                value={`${Math.round(sim.result.diag.mainAoA)}°`}
                fraction={clamp(sim.result.diag.mainAoA / 30, 0, 1)}
                tone={sim.result.diag.mainStalled ? 'danger' : sim.result.diag.mainAoA < 5 ? 'warning' : 'cyan'}
              />
              <ProgressRow
                label="Jib AoA"
                value={`${Math.round(sim.result.diag.jibAoA)}°`}
                fraction={clamp(sim.result.diag.jibAoA / 30, 0, 1)}
                tone={sim.result.diag.jibStalled ? 'danger' : sim.result.diag.jibAoA < 5 ? 'warning' : 'cyan'}
              />
              <ProgressRow
                label={tp('Тяга', 'Drive', 'Ciag')}
                value={`${Math.round(sim.result.diag.drive)} N`}
                fraction={clamp(sim.result.diag.drive / 2200, 0, 1)}
                tone="cyan"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CONTROL STRIP - sticky-ish below hero */}
      <section className="px-3 sm:px-5 py-4 sm:py-5"
               style={{ background: 'linear-gradient(180deg, #050b18 0%, #081326 100%)', borderTop: '1px solid rgba(0, 212, 255, 0.08)' }}>
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Quick preset chips + tack toggle + show-target */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] shrink-0">
              {tp('Пресеты', 'Presets', 'Presety')}
            </div>
            {COURSE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setPreset(preset.twa)}
                className="px-3 py-1.5 rounded-full border text-xs font-semibold transition"
                style={{
                  borderColor: Math.abs(ui.twa - preset.twa) < 1 ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.24)',
                  background: Math.abs(ui.twa - preset.twa) < 1 ? 'rgba(0, 212, 255, 0.15)' : 'rgba(8, 24, 48, 0.4)',
                  color: Math.abs(ui.twa - preset.twa) < 1 ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                }}
              >
                {preset.id === 'close'
                  ? tp('Бейдевинд', 'Close', 'Bajdewind')
                  : preset.id === 'beam'
                    ? tp('Галфвинд', 'Beam', 'Baksztag poprzeczny')
                    : tp('Бакштаг', 'Broad', 'Baksztag')}
              </button>
            ))}

            <div className="mx-1 w-px h-5 bg-[rgba(139,167,184,0.2)] hidden sm:block" />

            <button
              onClick={() => setUi((prev) => ({ ...prev, tack: prev.tack === 'starboard' ? 'port' : 'starboard' }))}
              className="px-3 py-1.5 rounded-full border text-xs font-semibold transition"
              style={{ borderColor: 'rgba(139, 167, 184, 0.24)', color: 'var(--text-secondary)' }}
            >
              {tackLabel}
            </button>

            <div className="ml-auto flex items-center gap-2">
              <label className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={ui.showOptimal}
                  onChange={(event) => setUi((prev) => ({ ...prev, showOptimal: event.target.checked }))}
                />
                {tp('Оптимум', 'Target', 'Optimum')}
              </label>
              <button onClick={applyOptimal}
                      className="px-2.5 py-1 rounded-full border text-[11px] font-semibold transition"
                      style={{ borderColor: 'rgba(68, 255, 136, 0.4)', color: 'var(--success)' }}>
                {tp('Поставить', 'Apply', 'Zastosuj')}
              </button>
              <button onClick={resetAll}
                      className="px-2.5 py-1 rounded-full border text-[11px] font-semibold transition"
                      style={{ borderColor: 'rgba(139, 167, 184, 0.24)', color: 'var(--text-muted)' }}>
                {tp('Сброс', 'Reset', 'Reset')}
              </button>
            </div>
          </div>

          {/* Sliders row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            <InlineSlider
              label={tp('Курс', 'Course', 'Kurs')}
              value={`${ui.twa}°`}
              min={30} max={180} step={1}
              sliderValue={ui.twa}
              onChange={(v) => setUi((p) => ({ ...p, twa: v }))}
            />
            <InlineSlider
              label={tp('Ветер', 'Wind', 'Wiatr')}
              value={`${ui.windSpeed} kts`}
              min={6} max={24} step={1}
              sliderValue={ui.windSpeed}
              onChange={(v) => setUi((p) => ({ ...p, windSpeed: v }))}
            />
            <InlineSlider
              label={tp('Грот', 'Main', 'Grott')}
              value={`${Math.round(ui.mainAngle)}°`}
              min={0} max={Math.round(params.mainMaxOff)} step={1}
              sliderValue={ui.mainAngle}
              onChange={(v) => setUi((p) => ({ ...p, mainAngle: v }))}
            />
            <InlineSlider
              label={tp('Стаксель', 'Jib', 'Fok')}
              value={`${Math.round(ui.jibAngle)}°`}
              min={Math.round(params.jibMinOff)} max={Math.round(params.jibMaxOff)} step={1}
              sliderValue={ui.jibAngle}
              onChange={(v) => setUi((p) => ({ ...p, jibAngle: v }))}
            />
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                {tp('Рифы', 'Reef', 'Refy')}
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[0, 1, 2].map((level) => (
                  <button
                    key={level}
                    onClick={() => setUi((prev) => ({ ...prev, reefLevel: level as ReefLevel }))}
                    className="px-2 py-1.5 rounded-md border text-[10px] font-semibold transition"
                    style={{
                      borderColor: ui.reefLevel === level ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.22)',
                      background: ui.reefLevel === level ? 'rgba(0, 212, 255, 0.12)' : 'transparent',
                      color: ui.reefLevel === level ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    }}
                  >
                    {level === 0 ? tp('Full', 'Full', 'Pelny') : `R${level}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile: inline side + diagnostics (hidden on lg where they're in overlay) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:hidden">
            <div className="card p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  {tp('Сбоку', 'Side view', 'Z boku')}
                </div>
                <div className="text-xs font-mono" style={{ color: heelAbs > 22 ? 'var(--warning)' : 'var(--accent-cyan)' }}>
                  {Math.round(sim.result.state.heel)}°
                </div>
              </div>
              <SideScene ui={ui} sim={sim} />
            </div>
            <div className="card p-3 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                {tp('Диагностика', 'Diagnostics', 'Diagnostyka')}
              </div>
              <ProgressRow
                label="Main AoA" value={`${Math.round(sim.result.diag.mainAoA)}°`}
                fraction={clamp(sim.result.diag.mainAoA / 30, 0, 1)}
                tone={sim.result.diag.mainStalled ? 'danger' : sim.result.diag.mainAoA < 5 ? 'warning' : 'cyan'}
              />
              <ProgressRow
                label="Jib AoA" value={`${Math.round(sim.result.diag.jibAoA)}°`}
                fraction={clamp(sim.result.diag.jibAoA / 30, 0, 1)}
                tone={sim.result.diag.jibStalled ? 'danger' : sim.result.diag.jibAoA < 5 ? 'warning' : 'cyan'}
              />
              <ProgressRow
                label={tp('Тяга', 'Drive', 'Ciag')}
                value={`${Math.round(sim.result.diag.drive)} N`}
                fraction={clamp(sim.result.diag.drive / 2200, 0, 1)}
                tone="cyan"
              />
            </div>
          </div>

          {/* Delta chips row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MiniDelta
              label={tp('Δ скорость', 'Δ speed', 'Δ predkosc')}
              value={`${speedDelta >= 0 ? '+' : ''}${speedDelta.toFixed(1)} kts`}
              good={speedDelta >= -0.15}
            />
            <MiniDelta
              label={tp('Δ крен', 'Δ heel', 'Δ przechyl')}
              value={`${heelDelta >= 0 ? '+' : ''}${heelDelta.toFixed(1)}°`}
              good={heelDelta <= 1.5}
            />
            <MiniDelta
              label={tp('Δ тяга', 'Δ drive', 'Δ ciag')}
              value={`${driveDelta >= 0 ? '+' : ''}${Math.round(driveDelta)} N`}
              good={driveDelta >= -80}
            />
            <MiniDelta
              label={tp('Δ снос', 'Δ leeway', 'Δ dryf')}
              value={`${leewayDelta >= 0 ? '+' : ''}${leewayDelta.toFixed(1)}°`}
              good={leewayDelta <= 0.5}
            />
          </div>

          {/* Footer line */}
          <div className="text-[10px] sm:text-xs text-[var(--text-muted)] leading-relaxed pt-2">
            {tp(
              'Физический движок тот же, что в V1. Отличается только layout. Сравни и выбери - какой читается лучше.',
              'Same physics engine as V1. Only the layout differs. Compare and pick the one that reads better.',
              'Silnik fizyki jest ten sam co w V1. Tylko layout jest inny. Porownaj i wybierz.',
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function TopScene({ ui, sim, lang }: { ui: UiState; sim: SimulationModel; lang: 'ru' | 'en' | 'pl' }) {
  const width = 780;
  const height = 470;
  const cx = width / 2;
  const cy = 272;
  const boatRotation = -sim.signedTwa;
  const apparentAngle = boatRotation + sim.result.diag.awa;
  const driveScale = clamp(sim.result.diag.drive / 1800, 0.15, 1);
  const sideScale = clamp(Math.abs(sim.result.diag.side) / 1800, 0.1, 1);
  const driveEnd = polarPoint(cx, cy, 42 + driveScale * 78, boatRotation);
  const sideAngle = boatRotation + (sim.result.diag.side >= 0 ? 90 : -90);
  const sideEnd = polarPoint(cx, cy, 28 + sideScale * 58, sideAngle);
  const awStart = polarPoint(cx, cy, 165, apparentAngle);
  const awEnd = polarPoint(cx, cy, 72, apparentAngle);
  const noGoPath = sectorPath(cx, cy, 108, 184, -30, 30);

  return (
    <div className="rounded-2xl overflow-hidden border border-[rgba(0,212,255,0.14)] shadow-[0_8px_48px_rgba(0,0,0,0.45)]"
         style={{ background: 'linear-gradient(180deg, #081326 0%, #0b1e38 100%)' }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="block w-full h-auto" style={{ minHeight: '45vh', maxHeight: '70vh' }}>
        <defs>
          <radialGradient id="sceneGlow" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="rgba(0, 212, 255, 0.14)" />
            <stop offset="100%" stopColor="rgba(0, 212, 255, 0)" />
          </radialGradient>
          <linearGradient id="waveFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d2847" />
            <stop offset="100%" stopColor="#081830" />
          </linearGradient>
          <filter id="arrowGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
            <feOffset dx="0" dy="2" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.45" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="noGoGrad" cx="50%" cy="60%" r="60%">
            <stop offset="0%" stopColor="rgba(255, 82, 82, 0.22)" />
            <stop offset="100%" stopColor="rgba(255, 82, 82, 0.06)" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width={width} height={height} fill="url(#waveFade)" />
        <rect x="0" y="0" width={width} height={height} fill="url(#sceneGlow)" />

        {Array.from({ length: 14 }).map((_, row) => (
          <line
            key={`h-${row}`}
            x1="0"
            x2={width}
            y1={46 + row * 28}
            y2={46 + row * 28}
            stroke="rgba(255,255,255,0.035)"
          />
        ))}
        {Array.from({ length: 18 }).map((_, col) => (
          <line
            key={`v-${col}`}
            y1="0"
            y2={height}
            x1={40 + col * 40}
            x2={40 + col * 40}
            stroke="rgba(255,255,255,0.03)"
          />
        ))}

        <path d={noGoPath} fill="url(#noGoGrad)" stroke="rgba(255, 82, 82, 0.3)" strokeDasharray="4 4" />

        <path
          d={sectorPath(cx, cy, 108, 184, 32, 112)}
          fill="rgba(0, 212, 255, 0.07)"
          stroke="rgba(0, 212, 255, 0.12)"
        />
        <path
          d={sectorPath(cx, cy, 108, 184, -112, -32)}
          fill="rgba(0, 212, 255, 0.07)"
          stroke="rgba(0, 212, 255, 0.12)"
        />

        <g filter="url(#arrowGlow)">
          <Arrow
            from={{ x: cx, y: 30 }}
            to={{ x: cx, y: 120 }}
            stroke="#00d4ff"
            label={lang === 'ru' ? 'истинный ветер' : 'true wind'}
            labelX={cx}
            labelY={22}
            width={2.4}
          />

          <Arrow
            from={awStart}
            to={awEnd}
            stroke="#6fe4ff"
            label={`AWA ${Math.round(Math.abs(sim.result.diag.awa))}°`}
            labelX={awStart.x}
            labelY={awStart.y - 10}
            width={2.2}
          />

          <Arrow
            from={{ x: cx, y: cy }}
            to={driveEnd}
            stroke="#52ff8e"
            label={lang === 'ru' ? 'тяга' : 'drive'}
            labelX={driveEnd.x + 8}
            labelY={driveEnd.y - 6}
            width={2.6}
          />

          <Arrow
            from={{ x: cx, y: cy }}
            to={sideEnd}
            stroke="#f6b73c"
            label={lang === 'ru' ? 'боковая сила' : 'side force'}
            labelX={sideEnd.x + (sim.result.diag.side >= 0 ? 8 : -8)}
            labelY={sideEnd.y - 6}
            anchor={sim.result.diag.side >= 0 ? 'start' : 'end'}
            width={2.2}
          />
        </g>

        <g transform={`translate(${cx} ${cy}) rotate(${boatRotation})`} filter="url(#softShadow)">
          <TopBoat
            mainAngle={ui.mainAngle}
            jibAngle={ui.jibAngle}
            jibFurlPct={ui.jibFurlPct}
            reefLevel={ui.reefLevel}
            showOptimal={ui.showOptimal}
            optimal={sim.optimal}
            sailSide={sim.signedTwa > 0 ? -1 : 1}
          />
        </g>

        <text x="28" y="34" fill="rgba(255,255,255,0.68)" fontSize="13" fontWeight="700">
          {labelPointOfSail(sim.pos, lang)}
        </text>
        <text x="28" y="54" fill="rgba(255,255,255,0.46)" fontSize="11">
          {lang === 'ru' ? sim.pos.sailWork : sim.pos.sailWorkEn}
        </text>
        <text x={width - 28} y="34" textAnchor="end" fill="rgba(255,255,255,0.68)" fontSize="13" fontWeight="700">
          TWA {Math.round(sim.absTwa)}°
        </text>
        <text x={width - 28} y="54" textAnchor="end" fill="rgba(255,255,255,0.46)" fontSize="11">
          {ui.tack === 'starboard'
            ? (lang === 'ru' ? 'правый галс' : 'starboard tack')
            : (lang === 'ru' ? 'левый галс' : 'port tack')}
        </text>
      </svg>
    </div>
  );
}

function TopBoat(args: {
  mainAngle: number;
  jibAngle: number;
  jibFurlPct: number;
  reefLevel: ReefLevel;
  showOptimal: boolean;
  optimal: OptimalTrim;
  sailSide: 1 | -1;
}) {
  const { mainAngle, jibAngle, jibFurlPct, reefLevel, showOptimal, optimal, sailSide } = args;
  const mainScaleY = REEF_VISUAL[reefLevel];
  const jibOpacity = clamp(jibFurlPct / 100, 0.18, 1);

  return (
    <>
      <ellipse cx="0" cy="46" rx="28" ry="8" fill="rgba(0,0,0,0.25)" />

      {showOptimal && (
        <>
          <g transform={`translate(0 -48) rotate(${optimal.jibAngle * sailSide})`} opacity="0.32">
            <path
              d="M 0 0 Q -16 38 -4 88 L 0 88 Z"
              fill="none"
              stroke="#44ff88"
              strokeWidth="3"
              strokeDasharray="7 6"
            />
          </g>
          <g transform={`rotate(${optimal.mainAngle * sailSide}) scale(1 ${mainScaleY})`} opacity="0.32">
            <path
              d="M 0 -26 Q -28 46 -8 136 L 0 136 Z"
              fill="none"
              stroke="#44ff88"
              strokeWidth="3"
              strokeDasharray="7 6"
            />
          </g>
        </>
      )}

      <g transform={`translate(0 -48) rotate(${jibAngle * sailSide})`} opacity={jibOpacity}>
        <path
          d="M 0 0 Q -16 38 -4 88 L 0 88 Z"
          fill="#f6fbff"
          stroke="#ffffff"
          strokeWidth="3"
        />
        <text x="-24" y="46" fill="#0a1628" fontSize="12" fontWeight="700">JIB</text>
      </g>

      <g transform={`rotate(${mainAngle * sailSide}) scale(1 ${mainScaleY})`}>
        <path
          d="M 0 -26 Q -28 46 -8 136 L 0 136 Z"
          fill="#f6fbff"
          stroke="#ffffff"
          strokeWidth="3"
        />
        <text x="-36" y="76" fill="#0a1628" fontSize="12" fontWeight="700">MAIN</text>
      </g>

      <path
        d="M 0 -72 Q 30 -28 22 44 Q 18 100 0 138 Q -18 100 -22 44 Q -30 -28 0 -72 Z"
        fill="#e8f0f6"
        stroke="#8fa8bd"
        strokeWidth="4"
      />
      <ellipse cx="0" cy="10" rx="10" ry="22" fill="rgba(0,0,0,0.18)" />
      <rect x="-2.5" y="-44" width="5" height="118" rx="2.5" fill="#314861" />
      <circle cx="0" cy="-4" r="5" fill="#0a1628" />
    </>
  );
}

function SideScene({ ui, sim }: { ui: UiState; sim: SimulationModel }) {
  const width = 340;
  const height = 230;
  const cx = width / 2;
  const cy = 152;
  const heelVisual = sim.signedTwa > 0 ? -sim.result.state.heel : sim.result.state.heel;
  const sailSide = sim.signedTwa > 0 ? -1 : 1;
  const mainScaleY = REEF_VISUAL[ui.reefLevel];
  const jibOpacity = clamp(ui.jibFurlPct / 100, 0.15, 1);
  const windRightToLeft = sim.signedTwa > 0;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block w-full h-auto">
      <defs>
        <linearGradient id="sideBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1b33" />
          <stop offset="58%" stopColor="#0c2340" />
          <stop offset="58%" stopColor="#09192d" />
          <stop offset="100%" stopColor="#06111f" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} rx="16" fill="url(#sideBg)" />

      <line x1="0" x2={width} y1={cy} y2={cy} stroke="rgba(0,212,255,0.28)" strokeDasharray="6 6" />
      <g className="sim-waves">
        {Array.from({ length: 6 }).map((_, index) => (
          <path
            key={index}
            d={`M 0 ${cy + 18 + index * 12} Q 42 ${cy + 12 + index * 12} 84 ${cy + 18 + index * 12} T ${width} ${cy + 18 + index * 12}`}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={1}
          />
        ))}
      </g>

      {Array.from({ length: 3 }).map((_, index) => {
        const startX = windRightToLeft ? width - 28 - index * 32 : 28 + index * 32;
        const endX = windRightToLeft ? startX - 28 : startX + 28;
        return (
          <Arrow
            key={index}
            from={{ x: startX, y: 40 + index * 12 }}
            to={{ x: endX, y: 40 + index * 12 }}
            stroke="#00d4ff"
            width={1.8}
          />
        );
      })}

      <g transform={`translate(${cx} ${cy}) rotate(${heelVisual.toFixed(2)})`}>
        <path
          d="M -112 0 Q -100 -24 -68 -28 L 80 -28 Q 112 -18 112 0 Q 102 12 74 16 L -92 16 Q -114 10 -112 0 Z"
          fill="#d9e8f2"
          stroke="#8fa8bd"
          strokeWidth="2"
        />
        <path d="M -10 16 L 12 16 L 6 60 L -6 60 Z" fill="rgba(7,20,36,0.9)" />
        <rect x="-2.5" y="-126" width="5" height="116" rx="2.5" fill="#d0d8e0" />

        <g transform={`translate(0 -14) rotate(${ui.mainAngle * sailSide * 0.55}) scale(1 ${mainScaleY})`}>
          <path
            d={`M 0 -112 Q ${sailSide * 32} -48 ${sailSide * 54} 0 L 0 0 Z`}
            fill="#f6fbff"
            stroke="#ffffff"
            strokeWidth="2"
          />
        </g>

        <g opacity={jibOpacity}>
          <path
            d={`M 0 -96 Q ${sailSide * 18} -70 ${sailSide * 64} -16 L 0 -16 Z`}
            fill="#f6fbff"
            stroke="#ffffff"
            strokeWidth="2"
          />
        </g>
      </g>

      <text x="16" y="24" fill="rgba(255,255,255,0.65)" fontSize="12" fontWeight="700">
        {Math.round(sim.result.state.heel)}°
      </text>
      <text x={width - 16} y="24" textAnchor="end" fill="rgba(255,255,255,0.46)" fontSize="11">
        {ui.windSpeed} kts
      </text>
    </svg>
  );
}

function Arrow(props: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  stroke: string;
  label?: string;
  labelX?: number;
  labelY?: number;
  anchor?: 'start' | 'middle' | 'end';
  width?: number;
}) {
  const { from, to, stroke, label, labelX, labelY, anchor = 'middle', width = 2 } = props;
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const arrowSize = 8;
  const left = {
    x: to.x - Math.cos(angle - Math.PI / 6) * arrowSize,
    y: to.y - Math.sin(angle - Math.PI / 6) * arrowSize,
  };
  const right = {
    x: to.x - Math.cos(angle + Math.PI / 6) * arrowSize,
    y: to.y - Math.sin(angle + Math.PI / 6) * arrowSize,
  };

  return (
    <g>
      <path d={linePath(from, to)} fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" />
      <path
        d={`M ${left.x.toFixed(1)} ${left.y.toFixed(1)} L ${to.x.toFixed(1)} ${to.y.toFixed(1)} L ${right.x.toFixed(1)} ${right.y.toFixed(1)}`}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {label && typeof labelX === 'number' && typeof labelY === 'number' && (
        <text x={labelX} y={labelY} textAnchor={anchor} fill={stroke} fontSize="12" fontWeight="700">
          {label}
        </text>
      )}
    </g>
  );
}

function HeroNumber(props: {
  label: string;
  value: string;
  unit: string;
  tone: 'cyan' | 'danger' | 'warning' | 'success';
  big?: boolean;
  small?: boolean;
}) {
  const { label, value, unit, tone, big, small } = props;
  const color = tone === 'danger'
    ? 'var(--danger)'
    : tone === 'warning'
      ? 'var(--warning)'
      : tone === 'success'
        ? 'var(--success)'
        : 'var(--accent-cyan)';

  const valueSize = big ? 'text-4xl sm:text-5xl' : small ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl';
  const unitSize = big ? 'text-sm' : small ? 'text-[10px]' : 'text-xs';

  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className={`${valueSize} font-black font-mono tabular-nums leading-none`} style={{ color }}>{value}</span>
        <span className={`${unitSize} text-[var(--text-muted)] font-semibold`}>{unit}</span>
      </div>
    </div>
  );
}

function InlineSlider(props: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  sliderValue: number;
  onChange: (value: number) => void;
}) {
  const { label, value, min, max, step, sliderValue, onChange } = props;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
        <span className="text-[11px] font-mono font-bold text-[var(--accent-cyan)]">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={sliderValue}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
        style={{ accentColor: '#00d4ff' }}
      />
    </div>
  );
}

function ProgressRow(props: {
  label: string;
  value: string;
  fraction: number;
  tone: 'cyan' | 'danger' | 'warning' | 'success';
}) {
  const { label, value, fraction, tone } = props;
  const color = tone === 'danger'
    ? 'var(--danger)'
    : tone === 'warning'
      ? 'var(--warning)'
      : tone === 'success'
        ? 'var(--success)'
        : 'var(--accent-cyan)';

  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] mb-1">
        <span>{label}</span>
        <span className="font-mono" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-[rgba(255,255,255,0.08)]">
        <div className="h-full transition-all" style={{ width: `${clamp(fraction * 100, 0, 100)}%`, background: color }} />
      </div>
    </div>
  );
}

function MiniDelta({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="rounded-xl border border-[rgba(139,167,184,0.14)] bg-[rgba(8,24,48,0.45)] p-2.5">
      <div className="text-[10px] text-[var(--text-muted)]">{label}</div>
      <div className="text-sm font-mono mt-1" style={{ color: good ? 'var(--success)' : 'var(--warning)' }}>
        {value}
      </div>
    </div>
  );
}
