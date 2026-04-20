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

// ============================================================================
// SIMULATOR V3 - cockpit layout on the sailing-physics engine.
//
// See docs/design/simulator-v3/SPEC.md for the full design rationale.
//
// Layout principle: the boat is centered in a big scene, four control pods
// sit at the four scene corners (overlapping on mobile, flanking on desktop),
// four metric chips + a one-line commentary sit under the scene. No scroll
// between controls and scene - every adjustment keeps the visual in view.
//
// Scene is layered (bottom to top):
//   1. Water backdrop + animated wave lines
//   2. Compass ring
//   3. No-go cone (hazard, red)
//   4. Wind arc (cyan)
//   5. Main working sector (green, behind mast)
//   6. Jib working sector (amber, forward of mast)
//   7. Ghost optimal sail outline (dashed green)
//   8. The boat hull + current sails (white)
//   9. Force vectors: TW, AW, drive, side
//
// Alternate scene mode (VIEW pod -> REAR) swaps the top view for a rear-on
// drawing that tilts with actual state.heel so heel reads instantly.
// ============================================================================

type Tack = 'starboard' | 'port';
type ReefLevel = 0 | 1 | 2;
type ViewMode = 'top' | 'rear';
type SailsRaised = 'both' | 'main' | 'jib';
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
  view: ViewMode;
  sailsRaised: SailsRaised;
  showOptimal: boolean;
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
  primaryFeedback: string;
  primaryFeedbackTone: 'good' | 'warn' | 'danger' | 'info';
}

// Default state = properly-trimmed beam reach. The engine can starve into a
// stalled equilibrium if we seed with bad trim (low bs -> AWA stays close to
// TWA -> sail AoA in stall zone -> low drive -> low bs...). Picking sane
// default sail angles avoids that bad-first-impression.
// At TWA=90, TWS=12, a steady-state bs ~6 kn gives AWA ~65. Main at ~52 deg
// and jib at ~54 deg put both AoA in the 12-14 deg sweet spot.
const DEFAULT_UI: UiState = {
  twa: 90,
  tack: 'starboard',
  windSpeed: 12,
  mainAngle: 52,
  jibAngle: 54,
  jibFurlPct: 100,
  reefLevel: 0,
  mainTwistPct: 18,
  jibTwistPct: 14,
  view: 'top',
  sailsRaised: 'both',
  showOptimal: true,
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
  { id: 'run', twa: 170 },
] as const;

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
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

/** Convert (centerX, centerY, radius, angleFromNorthCW) to Cartesian. */
function polarPoint(cx: number, cy: number, radius: number, degFromUp: number) {
  const rad = degToRad(degFromUp);
  return {
    x: cx + Math.sin(rad) * radius,
    y: cy - Math.cos(rad) * radius,
  };
}

/** SVG path for a pie-wedge (sector) between two angles measured from north
 *  clockwise, between inner and outer radii. */
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

// ---------------------------------------------------------------------------
// Optimal trim heuristic - same shape as V1/V2 to keep the delta clean.
// ---------------------------------------------------------------------------

function recommendedTrim(awaAbs: number, windSpeed: number, reefLevel: ReefLevel, params: ReturnType<typeof getBoatParams>): OptimalTrim {
  let mainAngle = awaAbs - 14;
  let jibAngle = awaAbs - 12;

  if (awaAbs < 38) { mainAngle -= 2; jibAngle -= 2; }
  else if (awaAbs > 120) { mainAngle += 4; jibAngle += 3; }
  if (awaAbs > 155) { mainAngle = params.mainMaxOff - 2; jibAngle = params.jibMaxOff; }
  if (windSpeed >= 18) { mainAngle += 2; jibAngle += 1; }

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

// ---------------------------------------------------------------------------
// Commentary picker - one line per tick. Priority order: danger > warn > info > good.
// ---------------------------------------------------------------------------

function pickPrimaryFeedback(args: {
  ui: UiState;
  result: TickResult;
  pos: PointOfSail;
  absTwa: number;
  tp: TpFn;
}): { text: string; tone: SimulationModel['primaryFeedbackTone'] } {
  const { ui, result, absTwa, tp } = args;
  const { diag, state } = result;

  // DANGER band: heel over threshold with no reef in heavy air
  if (Math.abs(state.heel) > 28 && ui.windSpeed >= 16 && ui.reefLevel === 0) {
    return {
      text: tp('Крен очень высокий. Возьми риф, иначе потеряешь контроль.',
              'Heel is critical. Take a reef before you lose control.',
              'Przechyl jest krytyczny. Wez refa.'),
      tone: 'danger',
    };
  }
  if (absTwa < 30) {
    return {
      text: tp('Ты в мёртвой зоне. Поверни дальше от ветра, лодка встала.',
              "You're in the no-go zone. Fall off from the wind - the boat has stopped.",
              'Jestes w strefie martwej. Zejdz od wiatru.'),
      tone: 'danger',
    };
  }
  if (diag.mainStalled && Math.abs(state.heel) > 22) {
    return {
      text: tp('Грот в срыве + большой крен. Ослабь грот и возьми риф.',
              'Main is stalled and heel is high. Ease the main and reef.',
              'Grot zerwany plus przechyl. Uwolnij grota i wez refa.'),
      tone: 'danger',
    };
  }

  // WARN band
  if (diag.mainStalled) {
    return {
      text: tp('Грот перетянут. На нём срыв потока, тяга падает.',
              'Main is overtrimmed. Flow has stalled and drive is dropping.',
              'Grot przebrany. Oderwanie przeplywu.'),
      tone: 'warn',
    };
  }
  if (diag.jibStalled && ui.jibFurlPct > 20) {
    return {
      text: tp('Стаксель перетянут. Он душит грот и сам теряет форму.',
              'Jib is overtrimmed. It chokes the main and loses shape.',
              'Fok zbyt mocno wybrany.'),
      tone: 'warn',
    };
  }
  if (Math.abs(state.heel) > 22 && ui.windSpeed >= 16 && ui.reefLevel === 0) {
    return {
      text: tp('Крен выше 22°. Пора брать первый риф.',
              'Heel above 22 deg. Time for the first reef.',
              'Przechyl powyzej 22. Wez pierwszy ref.'),
      tone: 'warn',
    };
  }
  if (diag.mainAoA < 5 && diag.jibAoA < 5) {
    return {
      text: tp('Паруса полощут. Угол атаки слишком мал - подтяни шкоты.',
              'Sails are luffing. Angle of attack too small - sheet in.',
              'Zagle lopoczaz. Wybierz szoty.'),
      tone: 'warn',
    };
  }
  if (Math.abs(state.leeway) > 7) {
    return {
      text: tp('Лодку сильно сносит вбок. Киль уже не держит.',
              'Boat is slipping hard sideways. The keel is saturated.',
              'Jacht silnie zsuwa sie bokiem.'),
      tone: 'warn',
    };
  }

  // GOOD band
  if (diag.slotHealth > 0.7 && absTwa < 130 && !diag.mainStalled && !diag.jibStalled) {
    return {
      text: tp('Слот здоров - оба паруса тянут вместе.',
              'Slot is healthy - both sails pulling together.',
              'Slot jest zdrowy.'),
      tone: 'good',
    };
  }
  if (state.boatSpeed >= 5 && Math.abs(state.heel) < 20 && !diag.mainStalled && !diag.jibStalled) {
    return {
      text: tp('Настройка близка к оптимальной.',
              'Trim is close to optimal.',
              'Ustawienie bliskie optymalnemu.'),
      tone: 'good',
    };
  }

  return {
    text: tp('Крути контролы и смотри, как меняются скорость и крен.',
            'Turn the controls and watch how speed and heel respond.',
            'Zmieniaj ustawienia i obserwuj.'),
    tone: 'info',
  };
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function SimulatorV3Page() {
  const { lang, tp } = useI18n();
  const params = useMemo(() => getBoatParams(), []);
  const [ui, setUi] = useState<UiState>(DEFAULT_UI);

  const sim = useMemo<SimulationModel>(() => {
    const signedTwa = ui.tack === 'starboard' ? ui.twa : -ui.twa;

    // sailsRaised control maps to jibFurl/reef via area zero-out.
    const jibFurlEff = ui.sailsRaised === 'main' ? 1 : 1 - ui.jibFurlPct / 100;
    const reefEff = ui.sailsRaised === 'jib' ? 1 : REEF_VALUES[ui.reefLevel];

    const controls: Controls = {
      mainSheet: toMainSheet(ui.mainAngle, params.mainMaxOff),
      jibSheet: toJibSheet(ui.jibAngle, params.jibMinOff, params.jibMaxOff),
      mainTwist: ui.mainTwistPct / 100,
      jibTwist: ui.jibTwistPct / 100,
      reef: reefEff,
      jibFurl: jibFurlEff,
      jibSide: 1,
    };

    const initial = createInitialState({
      tws: ui.windSpeed,
      twa: signedTwa,
      // Seed bs with a realistic beam-reach speed so the engine does not
      // settle into a stalled-at-rest equilibrium when trim is sub-optimal.
      boatSpeed: Math.max(3, ui.windSpeed * 0.45),
    });

    const result = settle(initial, controls, params, 45, 0.1);

    const firstOptimal = recommendedTrim(Math.abs(result.diag.awa), ui.windSpeed, ui.reefLevel, params);
    const firstOptCtrls: Controls = {
      ...controls,
      mainSheet: toMainSheet(firstOptimal.mainAngle, params.mainMaxOff),
      jibSheet: toJibSheet(firstOptimal.jibAngle, params.jibMinOff, params.jibMaxOff),
      mainTwist: firstOptimal.mainTwistPct / 100,
      jibTwist: firstOptimal.jibTwistPct / 100,
    };
    const firstOptRes = settle(initial, firstOptCtrls, params, 45, 0.1);

    const optimal = recommendedTrim(Math.abs(firstOptRes.diag.awa), ui.windSpeed, ui.reefLevel, params);
    const optCtrls: Controls = {
      ...controls,
      mainSheet: toMainSheet(optimal.mainAngle, params.mainMaxOff),
      jibSheet: toJibSheet(optimal.jibAngle, params.jibMinOff, params.jibMaxOff),
      mainTwist: optimal.mainTwistPct / 100,
      jibTwist: optimal.jibTwistPct / 100,
    };
    const optimalResult = settle(initial, optCtrls, params, 45, 0.1);

    const absTwa = Math.abs(signedTwa);
    const pos = pointOfSailFor(absTwa);
    const trimScore = clamp(
      Math.round((result.state.boatSpeed / Math.max(0.1, optimalResult.state.boatSpeed)) * 100),
      0,
      100,
    );

    const base: SimulationModel = {
      result, optimalResult, pos, signedTwa, absTwa, trimScore, optimal,
      primaryFeedback: '',
      primaryFeedbackTone: 'info',
    };
    const picked = pickPrimaryFeedback({ ui, result, pos, absTwa, tp });
    return { ...base, primaryFeedback: picked.text, primaryFeedbackTone: picked.tone };
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

  const resetAll = () => setUi(DEFAULT_UI);

  const pointLabel = lang === 'ru' ? sim.pos.nameRu : sim.pos.nameEn;
  const tackLabel = ui.tack === 'starboard'
    ? tp('правый галс', 'starboard tack', 'prawy hals')
    : tp('левый галс', 'port tack', 'lewy hals');

  return (
    <div className="page-enter min-h-[calc(100vh-56px)] flex flex-col" style={{ background: '#050b18' }}>
      {/* ================================================================ */}
      {/* Top bar with V3 badge + A/B cross-links                           */}
      {/* ================================================================ */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 px-3 sm:px-5 py-2 border-b"
           style={{ background: 'rgba(5, 11, 24, 0.92)', borderColor: 'rgba(0, 212, 255, 0.16)', backdropFilter: 'blur(10px)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shrink-0"
                style={{ background: 'rgba(0, 212, 255, 0.16)', color: 'var(--accent-cyan)', border: '1px solid rgba(0, 212, 255, 0.35)' }}>
            V3 · Cockpit
          </span>
          <span className="hidden sm:inline text-xs text-[var(--text-muted)] truncate">
            {tp('VPP engine · обучающий тренажёр', 'VPP engine · teaching trainer', 'VPP · trener')}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <a href="/simulator" className="text-[11px] font-semibold px-2 py-1 rounded-md border transition hover:text-[var(--accent-cyan)]"
             style={{ borderColor: 'rgba(139, 167, 184, 0.22)', color: 'var(--text-secondary)' }}>V1</a>
          <a href="/simulator2" className="text-[11px] font-semibold px-2 py-1 rounded-md border transition hover:text-[var(--accent-cyan)]"
             style={{ borderColor: 'rgba(139, 167, 184, 0.22)', color: 'var(--text-secondary)' }}>V2</a>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Scene + pods layout. Mobile: pods overlap scene corners.          */}
      {/* Desktop >= lg: pods flank the scene in a 3-col grid.              */}
      {/* ================================================================ */}

      {/* Desktop layout */}
      <div className="hidden lg:grid lg:grid-cols-[260px_minmax(0,1fr)_260px] lg:gap-4 lg:px-5 lg:pt-4 flex-1">
        <div className="space-y-3">
          <WindPod ui={ui} setUi={setUi} tp={tp} tackLabel={tackLabel} />
          <ViewPod ui={ui} setUi={setUi} tp={tp} applyOptimal={applyOptimal} resetAll={resetAll} setPreset={setPreset} />
        </div>

        <div className="relative flex flex-col">
          <div className="relative flex-1 min-h-[520px] rounded-2xl overflow-hidden border shadow-[0_12px_60px_rgba(0,0,0,0.5)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.18)', background: 'radial-gradient(ellipse at center 40%, #0c2745 0%, #061020 65%, #040a16 100%)' }}>
            {ui.view === 'top'
              ? <SceneTop ui={ui} sim={sim} lang={lang} />
              : <SceneRear ui={ui} sim={sim} tp={tp} />}
            <SceneOverlayLabels ui={ui} sim={sim} pointLabel={pointLabel} tackLabel={tackLabel} tp={tp} />
          </div>
          <MetricsStrip ui={ui} sim={sim} tp={tp} />
          <CommentaryLine text={sim.primaryFeedback} tone={sim.primaryFeedbackTone} />
        </div>

        <div className="space-y-3">
          <MainPod ui={ui} setUi={setUi} params={params} sim={sim} tp={tp} />
          <JibPod ui={ui} setUi={setUi} params={params} sim={sim} tp={tp} />
        </div>
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden flex-1 flex flex-col">
        <div className="relative mx-2 mt-2 rounded-2xl overflow-hidden border shadow-[0_8px_40px_rgba(0,0,0,0.45)]"
             style={{ borderColor: 'rgba(0, 212, 255, 0.18)', background: 'radial-gradient(ellipse at center 40%, #0c2745 0%, #061020 65%, #040a16 100%)', minHeight: '62vh' }}>
          {ui.view === 'top'
            ? <SceneTop ui={ui} sim={sim} lang={lang} />
            : <SceneRear ui={ui} sim={sim} tp={tp} />}
          <SceneOverlayLabels ui={ui} sim={sim} pointLabel={pointLabel} tackLabel={tackLabel} tp={tp} />

          {/* Pods overlaid at scene corners on mobile */}
          <div className="absolute top-2 left-2 w-[44%] max-w-[180px]">
            <WindPod ui={ui} setUi={setUi} tp={tp} tackLabel={tackLabel} compact />
          </div>
          <div className="absolute top-2 right-2 w-[44%] max-w-[180px]">
            <MainPod ui={ui} setUi={setUi} params={params} sim={sim} tp={tp} compact />
          </div>
          <div className="absolute bottom-2 left-2 w-[44%] max-w-[180px]">
            <ViewPod ui={ui} setUi={setUi} tp={tp} applyOptimal={applyOptimal} resetAll={resetAll} setPreset={setPreset} compact />
          </div>
          <div className="absolute bottom-2 right-2 w-[44%] max-w-[180px]">
            <JibPod ui={ui} setUi={setUi} params={params} sim={sim} tp={tp} compact />
          </div>
        </div>
        <MetricsStrip ui={ui} sim={sim} tp={tp} />
        <CommentaryLine text={sim.primaryFeedback} tone={sim.primaryFeedbackTone} />
      </div>

      <GlossaryFooter tp={tp} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible glossary footer - explains all abbreviations without cluttering
// the main scene. Default collapsed; user taps to open.
// ---------------------------------------------------------------------------

function GlossaryFooter({ tp }: { tp: TpFn }) {
  const [open, setOpen] = useState(false);

  const entries: Array<{ term: string; ru: string; en: string; pl: string }> = [
    { term: 'TWS', ru: 'скорость истинного ветра', en: 'true wind speed', pl: 'predkosc prawdziwego wiatru' },
    { term: 'TWA', ru: 'угол к истинному ветру (0 = в ветер, 90 = галф, 180 = по ветру)', en: 'angle to true wind (0 = upwind, 90 = beam, 180 = downwind)', pl: 'kat do prawdziwego wiatru' },
    { term: 'AWS', ru: 'apparent wind speed - скорость ветра, которую ЧУВСТВУЕТ движущаяся яхта', en: 'apparent wind speed - the wind the moving boat feels', pl: 'predkosc pozornego wiatru' },
    { term: 'AWA', ru: 'apparent wind angle - угол ветра как его чувствует яхта. На галфвинде AWA меньше TWA (ветер приходит вперёд)', en: 'apparent wind angle - wind angle the boat feels. On beam reach AWA is less than TWA (wind comes forward)', pl: 'kat pozornego wiatru' },
    { term: 'VMG', ru: 'velocity made good - скорость в направлении ветра. На галсировании главное число', en: 'velocity made good - speed toward the wind. Key metric upwind', pl: 'predkosc w kierunku wiatru' },
    { term: 'Heel', ru: 'крен, наклон лодки. До 15° нормально, 25° уже много, 30° пора рифиться', en: 'heel angle. Up to 15 deg normal, 25 is a lot, 30 means reef now', pl: 'przechyl' },
    { term: 'Leeway', ru: 'снос лодки вбок. Киль не идеален, лодку всегда сносит под ветер на 3-8°', en: 'sideways drift. The keel is not perfect; boats always slip 3-8 deg to leeward', pl: 'dryf boczny' },
    { term: 'Slot', ru: 'щель между гротом и стакселем. Хороший слот ускоряет поток на гроте и даёт больше тяги. Стаксель перетянут - слот закрыт, грот теряет', en: 'the slot between main and jib. A good slot accelerates flow on the main. Overtrimmed jib closes it and kills the main', pl: 'slot miedzy grotem a fokiem' },
    { term: 'Stall', ru: 'срыв потока. Угол атаки паруса слишком большой, поток отрывается, тяга падает. Признак - флаги на стакселе полощут', en: 'flow separation. Angle of attack too high, flow detaches, drive drops. Sign: telltales flutter on the jib', pl: 'oderwanie przeplywu' },
    { term: 'Drive / Тяга', ru: 'проекция аэродинамической силы паруса в сторону носа лодки. Именно это толкает вперёд', en: 'forward component of sail aero force. This is what pushes you', pl: 'ciag' },
    { term: 'Side / Боковая сила', ru: 'поперечная составляющая силы паруса. Рождает крен и leeway. Полезная работа - только drive', en: 'sideways component of sail force. Creates heel and leeway. The useful work is drive only', pl: 'sila boczna' },
    { term: 'AoA', ru: 'angle of attack - угол атаки паруса к ветру. Оптимум ~ 12-18°. Меньше - парус полощет. Больше - stall', en: 'angle of attack - sail angle to wind. Optimal ~ 12-18 deg. Less: luffing. More: stall', pl: 'kat natarcia' },
    { term: tp('Оптимум / ghost', 'Optimum / ghost', 'Optimum / ghost'), ru: 'пунктирные зелёные силуэты - где грот и стаксель ДОЛЖНЫ стоять при текущем курсе и ветре. Сравни со своей настройкой', en: 'dashed green silhouettes - where main and jib SHOULD sit for the current course and wind. Compare to your trim', pl: 'zielone kontury - gdzie zagle powinny byc' },
    { term: tp('Трим % / trim', 'Trim %', 'Trim %'), ru: 'ваша скорость в % от скорости при идеальном триме для этого курса. 100% = не проигрываете ничего', en: 'your speed as % of the ideal-trim speed for this course. 100% means you lose nothing to trim', pl: 'procent idealnego trymu' },
  ];

  return (
    <div className="border-t mx-2 lg:mx-5 mt-2" style={{ borderColor: 'rgba(0, 212, 255, 0.12)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-[rgba(0,212,255,0.04)]"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--accent-cyan)' }}>
          {open ? '▾' : '▸'} {tp('Что означают все эти сокращения?', 'What do all these abbreviations mean?', 'Co oznaczaja te skroty?')}
        </span>
        <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline">
          {tp('TWA, AWA, AWS, slot, stall, drive, side, heel, leeway и другие', 'TWA, AWA, AWS, slot, stall, drive, side, heel, leeway and more', 'TWA, AWA, AWS, slot, stall itd')}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-4 pt-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          {entries.map((e) => (
            <div key={e.term} className="text-[11px] sm:text-xs leading-relaxed">
              <span className="font-mono font-bold" style={{ color: 'var(--accent-cyan)' }}>{e.term}</span>
              <span className="text-[var(--text-secondary)]"> - {tp(e.ru, e.en, e.pl)}</span>
            </div>
          ))}
          <div className="col-span-full mt-2 pt-2 border-t text-[10px] text-[var(--text-muted)]"
               style={{ borderColor: 'rgba(0, 212, 255, 0.08)' }}>
            {tp(
              'Сцена, метрики и комментарий читают один и тот же state. Движок пересчитывает при каждом изменении контрола.',
              'Scene, metrics, and commentary all read one state. The engine recomputes on every control change.',
              'Jeden stan, silnik przelicza przy kazdej zmianie.',
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scene: top view with all layered overlays
// ---------------------------------------------------------------------------

function SceneTop({ ui, sim, lang }: { ui: UiState; sim: SimulationModel; lang: 'ru' | 'en' | 'pl' }) {
  const width = 760;
  const height = 600;
  const cx = width / 2;
  const cy = height / 2;
  const sceneRadius = Math.min(width, height) * 0.42;
  const boatRotation = -sim.signedTwa;
  const sailSide: 1 | -1 = sim.signedTwa >= 0 ? -1 : 1;

  // Wind direction in scene coords: TW comes from the top in the world frame,
  // which in boat frame rotates by boatRotation. Visually, we KEEP the boat
  // rotating instead of the wind - but we draw the wind FROM north (top) and
  // let the sectors rotate with the boat.
  const awAngleInBoat = sim.result.diag.awa;

  // Drive and side magnitudes scaled to visible arrow length
  const driveScale = clamp(sim.result.diag.drive / 2000, 0.15, 1);
  const sideScale = clamp(Math.abs(sim.result.diag.side) / 2000, 0.1, 1);

  // Points for arrows (in world / scene frame, where top is "true wind comes from")
  const tw = { start: { x: cx, y: cy - sceneRadius * 1.02 }, end: { x: cx, y: cy - sceneRadius * 0.72 } };
  // Apparent wind in scene frame: rotate AWA by boatRotation (boat is rotated)
  const awWorldAngle = boatRotation + awAngleInBoat;
  const awStart = polarPoint(cx, cy, sceneRadius * 0.92, awWorldAngle);
  const awEnd = polarPoint(cx, cy, sceneRadius * 0.48, awWorldAngle);

  // Drive forward (in boat frame is 0 deg; in scene frame is boatRotation)
  const driveEnd = polarPoint(cx, cy, 34 + driveScale * 110, boatRotation);
  const sideSignAngle = sim.result.diag.side >= 0 ? 90 : -90;
  const sideEnd = polarPoint(cx, cy, 26 + sideScale * 70, boatRotation + sideSignAngle);

  // Sector angles in world frame
  // No-go: 60 deg centered on north (wind from direction)
  const noGoPath = sectorPath(cx, cy, sceneRadius * 0.58, sceneRadius * 0.98, -30, 30);
  // Wind from sector 120 deg at top
  const windFromPath = sectorPath(cx, cy, sceneRadius * 0.58, sceneRadius * 0.98, -60, 60);

  // Main working sector in boat frame: behind mast, on leeward side
  // In world frame: rotate by boatRotation
  const mainStart = sailSide < 0 ? 95 : -180;
  const mainEnd = sailSide < 0 ? 180 : -95;
  const mainWorkingPath = sectorPath(cx, cy,
    sceneRadius * 0.30, sceneRadius * 0.68,
    boatRotation + mainStart, boatRotation + mainEnd);

  // Jib working sector: forward of mast on leeward
  const jibStart = sailSide < 0 ? 5 : -55;
  const jibEnd = sailSide < 0 ? 55 : -5;
  const jibWorkingPath = sectorPath(cx, cy,
    sceneRadius * 0.30, sceneRadius * 0.65,
    boatRotation + jibStart, boatRotation + jibEnd);

  const hasMain = ui.sailsRaised !== 'jib';
  const hasJib = ui.sailsRaised !== 'main' && ui.jibFurlPct > 10;
  const mainVisualScale = REEF_VISUAL[ui.reefLevel];
  const jibVisualOpacity = clamp(ui.jibFurlPct / 100, 0.18, 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block w-full h-full">
      <defs>
        <radialGradient id="v3-scene-glow" cx="50%" cy="42%" r="68%">
          <stop offset="0%" stopColor="rgba(0, 212, 255, 0.14)" />
          <stop offset="100%" stopColor="rgba(0, 212, 255, 0)" />
        </radialGradient>
        <radialGradient id="v3-nogo-grad" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="rgba(255, 82, 82, 0.22)" />
          <stop offset="100%" stopColor="rgba(255, 82, 82, 0.05)" />
        </radialGradient>
        <filter id="v3-arrow-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="v3-boat-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" />
          <feOffset dx="0" dy="4" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.5" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Scene glow */}
      <rect x="0" y="0" width={width} height={height} fill="url(#v3-scene-glow)" />

      {/* Water wave bands */}
      <g className="sim-waves" opacity="0.35">
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={i}
                x1="0" x2={width}
                y1={60 + i * 54} y2={60 + i * 54}
                stroke="rgba(0, 212, 255, 0.05)"
                strokeWidth={1} />
        ))}
      </g>

      {/* Layer 2: compass ring */}
      <circle cx={cx} cy={cy} r={sceneRadius * 0.92}
              fill="none"
              stroke="rgba(0, 212, 255, 0.16)"
              strokeWidth={1}
              strokeDasharray="2 6" />
      {['N','E','S','W'].map((label, i) => {
        const p = polarPoint(cx, cy, sceneRadius * 0.96, i * 90);
        return (
          <text key={label}
                x={p.x} y={p.y}
                textAnchor="middle" dominantBaseline="central"
                fill="rgba(139, 167, 184, 0.55)"
                fontSize="10" fontWeight="700"
                style={{ letterSpacing: '0.1em' }}>
            {label}
          </text>
        );
      })}

      {/* Layer 3: no-go cone */}
      <path d={noGoPath}
            fill="url(#v3-nogo-grad)"
            stroke="rgba(255, 82, 82, 0.3)"
            strokeDasharray="4 4"
            strokeWidth={1} />
      <text x={cx} y={cy - sceneRadius * 0.88}
            textAnchor="middle"
            fill="rgba(255, 82, 82, 0.65)"
            fontSize="10" fontWeight="700"
            style={{ letterSpacing: '0.15em' }}>
        NO-GO
      </text>

      {/* Layer 4: wind arc (wider, fainter, includes the no-go - the actual wind
          comes from within these 120 deg at the top) */}
      <path d={windFromPath}
            fill="rgba(0, 212, 255, 0.05)"
            stroke="none" />

      {/* Layer 5: main working sector */}
      {hasMain && (
        <>
          <path d={mainWorkingPath}
                fill="rgba(82, 255, 142, 0.09)"
                stroke="rgba(82, 255, 142, 0.3)"
                strokeDasharray="3 5"
                strokeWidth={1} />
        </>
      )}

      {/* Layer 6: jib working sector */}
      {hasJib && (
        <path d={jibWorkingPath}
              fill="rgba(246, 183, 60, 0.09)"
              stroke="rgba(246, 183, 60, 0.3)"
              strokeDasharray="3 5"
              strokeWidth={1} />
      )}

      {/* Layer 7: ghost optimal */}
      {ui.showOptimal && (
        <g transform={`translate(${cx} ${cy}) rotate(${boatRotation})`} opacity="0.42">
          {hasMain && (
            <g transform={`rotate(${sim.optimal.mainAngle * sailSide}) scale(1 ${mainVisualScale})`}>
              <path d="M 0 -30 Q -32 48 -10 150 L 0 150 Z"
                    fill="none"
                    stroke="#52ff8e"
                    strokeWidth={3}
                    strokeDasharray="6 6"
                    transform={`scale(${sailSide < 0 ? 1 : -1} 1)`} />
            </g>
          )}
          {hasJib && (
            <g transform={`translate(0 -52) rotate(${sim.optimal.jibAngle * sailSide})`}>
              <path d="M 0 0 Q -18 42 -6 96 L 0 96 Z"
                    fill="none"
                    stroke="#52ff8e"
                    strokeWidth={3}
                    strokeDasharray="6 6"
                    transform={`scale(${sailSide < 0 ? 1 : -1} 1)`} />
            </g>
          )}
        </g>
      )}

      {/* Layer 8-9: boat and current sails */}
      <g transform={`translate(${cx} ${cy}) rotate(${boatRotation})`} filter="url(#v3-boat-shadow)">
        <BoatTop
          ui={ui}
          sailSide={sailSide}
          hasMain={hasMain}
          hasJib={hasJib}
          jibOpacity={jibVisualOpacity}
          mainVisualScale={mainVisualScale}
        />
      </g>

      {/* Layer 10: force vectors + wind arrows */}
      <g filter="url(#v3-arrow-glow)">
        <Arrow from={tw.start} to={tw.end}
               color="#00d4ff" width={2.8}
               label={`TW ${ui.windSpeed} kts`}
               labelPos={{ x: cx, y: cy - sceneRadius * 1.06 }}
               labelAnchor="middle" />
        <Arrow from={awStart} to={awEnd}
               color="#6fe4ff" width={2.4}
               label={`AW ${Math.round(Math.abs(sim.result.diag.awa))}°`}
               labelPos={{ x: awStart.x + 8, y: awStart.y - 8 }}
               labelAnchor="start" />
        <Arrow from={{ x: cx, y: cy }} to={driveEnd}
               color="#52ff8e" width={2.8}
               label={lang === 'ru' ? 'тяга' : 'drive'}
               labelPos={{ x: driveEnd.x + 10, y: driveEnd.y - 4 }}
               labelAnchor="start" />
        <Arrow from={{ x: cx, y: cy }} to={sideEnd}
               color="#f6b73c" width={2.2}
               label={lang === 'ru' ? 'бок' : 'side'}
               labelPos={{ x: sideEnd.x + (sim.result.diag.side >= 0 ? 10 : -10), y: sideEnd.y - 4 }}
               labelAnchor={sim.result.diag.side >= 0 ? 'start' : 'end'} />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Boat top-down drawing (bigger than V1/V2, rounder)
// ---------------------------------------------------------------------------

function BoatTop(args: {
  ui: UiState;
  sailSide: 1 | -1;
  hasMain: boolean;
  hasJib: boolean;
  jibOpacity: number;
  mainVisualScale: number;
}) {
  const { ui, sailSide, hasMain, hasJib, jibOpacity, mainVisualScale } = args;

  return (
    <>
      {/* Hull */}
      <ellipse cx="0" cy="60" rx="36" ry="10" fill="rgba(0,0,0,0.22)" />
      <path
        d="M 0 -96 Q 38 -40 28 52 Q 24 116 0 160 Q -24 116 -28 52 Q -38 -40 0 -96 Z"
        fill="#e8f0f6"
        stroke="#6f8ba0"
        strokeWidth={4}
      />
      {/* Cockpit hint */}
      <ellipse cx="0" cy="20" rx="12" ry="26" fill="rgba(0,0,0,0.18)" />

      {/* Mast at 0,0 (which is boat center) */}
      <rect x="-3" y="-56" width="6" height="132" rx="3" fill="#2a4060" />
      <circle cx="0" cy="-6" r="6" fill="#0a1628" stroke="#2a4060" strokeWidth={1.5} />

      {/* Jib (forward of mast, to leeward side).
          Drawn with an inflated belly: two Q curves on the leech that go
          out-and-back, plus a radial gradient that lightens the windward
          belly and darkens the leeward edge - reads as "canvas pillowing
          under wind pressure" not a flat flag. */}
      {hasJib && (
        <g transform={`translate(0 -58) rotate(${ui.jibAngle * sailSide})`} opacity={jibOpacity}>
          <defs>
            <linearGradient id={`v3-jib-grad-${sailSide}`} x1="0" y1="0" x2={sailSide > 0 ? "1" : "0"} y2="0">
              <stop offset="0%" stopColor="#dce7ee" />
              <stop offset="55%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#b9c9d4" />
            </linearGradient>
          </defs>
          <path
            d={`M 0 0 Q ${sailSide * 28} 30 ${sailSide * 34} 60 Q ${sailSide * 30} 90 ${sailSide * 10} 104 L 0 104 Z`}
            fill={`url(#v3-jib-grad-${sailSide})`}
            stroke="#ffffff"
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
          <text x={sailSide * 22} y={60} fill="#0a1628" fontSize="10" fontWeight="800"
                textAnchor="middle" style={{ letterSpacing: '0.1em' }}>JIB</text>
        </g>
      )}

      {/* Main (aft of mast, to leeward side) - same inflated-belly treatment
          as the jib so both sails read as canvas under load, not flat shapes. */}
      {hasMain && (
        <g transform={`rotate(${ui.mainAngle * sailSide}) scale(1 ${mainVisualScale})`}>
          <defs>
            <linearGradient id={`v3-main-grad-${sailSide}`} x1="0" y1="0" x2={sailSide > 0 ? "1" : "0"} y2="0">
              <stop offset="0%" stopColor="#dce7ee" />
              <stop offset="55%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#b9c9d4" />
            </linearGradient>
          </defs>
          <path
            d={`M 0 -30 Q ${sailSide * 38} 30 ${sailSide * 46} 80 Q ${sailSide * 40} 130 ${sailSide * 14} 150 L 0 150 Z`}
            fill={`url(#v3-main-grad-${sailSide})`}
            stroke="#ffffff"
            strokeWidth={2.4}
            strokeLinejoin="round"
          />
          <text x={sailSide * 38} y={90} fill="#0a1628" fontSize="10" fontWeight="800"
                textAnchor="middle" style={{ letterSpacing: '0.1em' }}>MAIN</text>
        </g>
      )}

      {/* Bow indicator triangle */}
      <polygon points="-5,-92 5,-92 0,-100" fill="#00d4ff" />
    </>
  );
}

// ---------------------------------------------------------------------------
// Scene: rear view for heel visualization
// ---------------------------------------------------------------------------

function SceneRear({ ui, sim, tp }: { ui: UiState; sim: SimulationModel; tp: TpFn }) {
  const width = 760;
  const height = 600;
  const cx = width / 2;
  const horizonY = height * 0.6;
  // Heel direction: on starboard tack (signedTwa > 0) boat heels to port =
  // in rear view, top of mast leans LEFT (negative rotation).
  // Displayed heel magnitude is |state.heel|, sign from tack.
  const heelMag = sim.result.state.heel;
  const heelSign = sim.signedTwa > 0 ? -1 : 1;
  const heelVisual = heelMag * heelSign;
  const heelAbs = Math.abs(heelMag);
  const mainScale = REEF_VISUAL[ui.reefLevel];
  const jibOpacity = clamp(ui.jibFurlPct / 100, 0.15, 1);
  const hasMain = ui.sailsRaised !== 'jib';
  const hasJib = ui.sailsRaised !== 'main' && ui.jibFurlPct > 10;

  const heelColor = heelAbs > 28 ? '#ff5252' : heelAbs > 22 ? '#f6b73c' : '#00d4ff';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="block w-full h-full">
      <defs>
        <linearGradient id="v3-rear-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a1b33" />
          <stop offset={`${(horizonY / height) * 100}%`} stopColor="#0c2340" />
          <stop offset={`${(horizonY / height) * 100}%`} stopColor="#09192d" />
          <stop offset="100%" stopColor="#06111f" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} fill="url(#v3-rear-bg)" />

      {/* Horizon */}
      <line x1="0" x2={width} y1={horizonY} y2={horizonY}
            stroke="rgba(0, 212, 255, 0.36)"
            strokeDasharray="8 6" strokeWidth={1.2} />

      {/* Water wave bands */}
      <g className="sim-waves">
        {Array.from({ length: 8 }).map((_, i) => (
          <path key={i}
                d={`M 0 ${horizonY + 18 + i * 16} Q 90 ${horizonY + 10 + i * 16} 180 ${horizonY + 18 + i * 16} T ${width} ${horizonY + 18 + i * 16}`}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={1} />
        ))}
      </g>

      {/* Wind indicator from behind - small arrow at top-right */}
      <g transform={`translate(${width - 110} 80)`}>
        <text x="0" y="-10" fill="rgba(139, 167, 184, 0.65)" fontSize="10" fontWeight="700"
              textAnchor="start" style={{ letterSpacing: '0.1em' }}>TWS {ui.windSpeed} kts</text>
        <path d="M 0 0 L 60 0" stroke="#00d4ff" strokeWidth={2.2} />
        <polygon points="60,-6 70,0 60,6" fill="#00d4ff" />
      </g>

      {/* Boat + rig rotated by heel. Horizon stays level. */}
      <g transform={`translate(${cx} ${horizonY}) rotate(${heelVisual})`}>
        {/* Hull seen from behind: curved bottom, flat top at horizon */}
        <path d="M -110 0 Q -92 -28 -62 -32 L 62 -32 Q 92 -28 110 0 Q 96 14 60 18 L -60 18 Q -96 14 -110 0 Z"
              fill="#e8f0f6"
              stroke="#6f8ba0"
              strokeWidth={2.2} />
        {/* Rudder hint */}
        <path d="M -8 18 L 10 18 L 4 64 L -4 64 Z"
              fill="rgba(10, 22, 40, 0.9)" />

        {/* Mast, vertical within the boat frame (so it tilts with the whole rotation) */}
        <rect x="-3" y="-200" width="6" height="200" rx="3" fill="#d0d8e0" />

        {/* Main (full shape, curved crescent) */}
        {hasMain && (
          <g transform={`scale(1 ${mainScale})`}>
            <path d={`M 0 -200 Q ${heelSign * 48} -100 ${heelSign * 70} -12 L 0 -12 Z`}
                  fill="#f6fbff"
                  stroke="#ffffff"
                  strokeWidth={2.5} />
          </g>
        )}

        {/* Jib (smaller, behind/alongside main) */}
        {hasJib && (
          <g opacity={jibOpacity}>
            <path d={`M 0 -170 Q ${heelSign * 28} -100 ${heelSign * 82} -20 L 0 -20 Z`}
                  fill="#f6fbff"
                  stroke="#ffffff"
                  strokeWidth={2.5} />
          </g>
        )}
      </g>

      {/* Heel angle arc overlay (relative to horizon, in world frame) */}
      {heelAbs > 2 && (
        <g transform={`translate(${cx} ${horizonY})`}>
          {/* Vertical reference line (dashed) */}
          <line x1="0" y1="0" x2="0" y2="-200"
                stroke="rgba(255,255,255,0.25)" strokeWidth={1}
                strokeDasharray="4 4" />
          {/* Arc from vertical to mast */}
          <path d={describeArc(0, 0, 110,
                               -90,
                               -90 + heelVisual)}
                fill="none"
                stroke={heelColor}
                strokeWidth={2}
                strokeDasharray="3 3" />
          <text x={heelVisual * -1.6 - 24}
                y={-118}
                fill={heelColor}
                fontSize="14" fontWeight="800"
                textAnchor="middle">
            {Math.round(heelAbs)}°
          </text>
        </g>
      )}

      {/* Big heel numeral overlay, bottom-right */}
      <g transform={`translate(${width - 40} ${height - 40})`}>
        <text x="0" y="0"
              fill={heelColor}
              fontSize="64" fontWeight="900"
              textAnchor="end"
              style={{ fontFamily: 'ui-monospace, monospace', filter: `drop-shadow(0 0 12px ${heelColor})` }}>
          {Math.round(heelAbs)}°
        </text>
        <text x="0" y="-72"
              fill={heelColor}
              fontSize="10" fontWeight="700"
              textAnchor="end"
              style={{ letterSpacing: '0.2em', opacity: 0.7 }}>
          {tp('КРЕН / HEEL', 'HEEL', 'PRZECHYL')}
        </text>
      </g>

      {/* Top-left label */}
      <g transform="translate(24 36)">
        <text x="0" y="0"
              fill="#e8f4f8" fontSize="16" fontWeight="800"
              style={{ letterSpacing: '0.02em' }}>
          {tp('ВИД СЗАДИ', 'REAR VIEW', 'WIDOK Z TYLU')}
        </text>
        <text x="0" y="18"
              fill="rgba(139, 167, 184, 0.75)" fontSize="11">
          {tp('почему появился крен', 'why the heel happens', 'skad przechyl')}
        </text>
      </g>
    </svg>
  );
}

/** SVG arc helper for heel indicator */
function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polarPointXY(cx, cy, r, startDeg);
  const end = polarPointXY(cx, cy, r, endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg > startDeg ? 1 : 0;
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} A ${r} ${r} 0 ${large} ${sweep} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

/** Standard polar to Cartesian using math convention (angle from +x axis, CCW positive) */
function polarPointXY(cx: number, cy: number, r: number, deg: number) {
  const rad = degToRad(deg);
  return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
}

// ---------------------------------------------------------------------------
// Overlay labels on scene (corner labels - point of sail, TWA, trim score)
// ---------------------------------------------------------------------------

function SceneOverlayLabels(args: {
  ui: UiState;
  sim: SimulationModel;
  pointLabel: string;
  tackLabel: string;
  tp: TpFn;
}) {
  const { ui, sim, pointLabel, tackLabel, tp } = args;
  const trimColor = sim.trimScore > 80 ? 'var(--success)' : sim.trimScore > 55 ? 'var(--accent-cyan)' : 'var(--warning)';

  if (ui.view === 'rear') return null;

  return (
    <>
      {/* Top-left label is NOT shown here - it's obvious from the point of sail chip */}
      {/* Top-center: trim score pill */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="rounded-full px-3 py-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider"
             style={{ background: 'rgba(8, 24, 48, 0.75)', border: '1px solid rgba(0, 212, 255, 0.22)', backdropFilter: 'blur(10px)' }}>
          <span style={{ color: 'var(--text-muted)' }}>{tp('Трим', 'Trim', 'Trim')}</span>
          <span style={{ color: trimColor }}>{sim.trimScore}%</span>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <span style={{ color: 'var(--text-secondary)' }}>{pointLabel}</span>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <span style={{ color: 'var(--text-muted)' }}>{tackLabel}</span>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Control pods
// ---------------------------------------------------------------------------

function PodCard({ children, compact }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div className={`rounded-xl ${compact ? 'p-2' : 'p-3'} space-y-2`}
         style={{ background: 'rgba(8, 24, 48, 0.72)', border: '1px solid rgba(0, 212, 255, 0.22)', backdropFilter: 'blur(12px)' }}>
      {children}
    </div>
  );
}

function PodLabel({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <div className={`${compact ? 'text-[9px]' : 'text-[10px]'} uppercase tracking-wider font-bold`}
         style={{ color: 'var(--accent-cyan)' }}>
      {text}
    </div>
  );
}

function PodSlider(props: {
  label: string;
  value: string;
  min: number; max: number; step: number;
  sliderValue: number;
  onChange: (v: number) => void;
  compact?: boolean;
  tone?: 'cyan' | 'warn' | 'danger' | 'good';
}) {
  const { label, value, min, max, step, sliderValue, onChange, compact, tone = 'cyan' } = props;
  const color = tone === 'danger' ? 'var(--danger)' : tone === 'warn' ? 'var(--warning)' : tone === 'good' ? 'var(--success)' : 'var(--accent-cyan)';
  return (
    <label className="block">
      <div className={`flex items-center justify-between gap-2 ${compact ? 'mb-0.5' : 'mb-1'}`}>
        <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} text-[var(--text-secondary)] truncate`}>{label}</span>
        <span className={`${compact ? 'text-[10px]' : 'text-[11px]'} font-mono font-bold tabular-nums`} style={{ color }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={sliderValue}
             onChange={(e) => onChange(Number(e.target.value))}
             className="w-full"
             style={{ accentColor: color, height: compact ? '14px' : '18px' }} />
    </label>
  );
}

function PodSegmented<T extends string | number>(props: {
  options: { value: T; label: string }[];
  active: T;
  onSelect: (v: T) => void;
  compact?: boolean;
}) {
  const { options, active, onSelect, compact } = props;
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          onClick={() => onSelect(opt.value)}
          className={`${compact ? 'px-1.5 py-1 text-[9px]' : 'px-2 py-1.5 text-[10px]'} rounded-md border font-semibold transition truncate`}
          style={{
            borderColor: active === opt.value ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.22)',
            background: active === opt.value ? 'rgba(0, 212, 255, 0.14)' : 'transparent',
            color: active === opt.value ? 'var(--accent-cyan)' : 'var(--text-secondary)',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function WindPod(props: {
  ui: UiState;
  setUi: React.Dispatch<React.SetStateAction<UiState>>;
  tp: TpFn;
  tackLabel: string;
  compact?: boolean;
}) {
  const { ui, setUi, tp, tackLabel, compact } = props;
  return (
    <PodCard compact={compact}>
      <PodLabel text={tp('ВЕТЕР', 'WIND', 'WIATR')} compact={compact} />
      <PodSlider compact={compact}
                 label={tp('Угол TWA', 'Angle TWA', 'Kat TWA')}
                 value={`${ui.twa}°`}
                 min={30} max={180} step={1}
                 sliderValue={ui.twa}
                 onChange={(v) => setUi((p) => ({ ...p, twa: v }))} />
      <PodSlider compact={compact}
                 label={tp('Сила', 'Speed', 'Sila')}
                 value={`${ui.windSpeed} kts`}
                 min={4} max={25} step={1}
                 sliderValue={ui.windSpeed}
                 onChange={(v) => setUi((p) => ({ ...p, windSpeed: v }))} />
      <button
        onClick={() => setUi((p) => ({ ...p, tack: p.tack === 'starboard' ? 'port' : 'starboard' }))}
        className={`w-full ${compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]'} rounded-md border font-semibold transition uppercase tracking-wider`}
        style={{ borderColor: 'rgba(0, 212, 255, 0.22)', background: 'rgba(0, 212, 255, 0.08)', color: 'var(--accent-cyan)' }}
      >
        {tackLabel}
      </button>
    </PodCard>
  );
}

function MainPod(props: {
  ui: UiState;
  setUi: React.Dispatch<React.SetStateAction<UiState>>;
  params: ReturnType<typeof getBoatParams>;
  sim: SimulationModel;
  tp: TpFn;
  compact?: boolean;
}) {
  const { ui, setUi, params, sim, tp, compact } = props;
  return (
    <PodCard compact={compact}>
      <PodLabel text={tp('ГРОТ', 'MAIN', 'GROT')} compact={compact} />
      <PodSlider compact={compact}
                 label={tp('Угол', 'Angle', 'Kat')}
                 value={`${Math.round(ui.mainAngle)}°`}
                 min={0} max={Math.round(params.mainMaxOff)} step={1}
                 sliderValue={ui.mainAngle}
                 onChange={(v) => setUi((p) => ({ ...p, mainAngle: v }))}
                 tone={sim.result.diag.mainStalled ? 'danger' : 'cyan'} />
      <PodSegmented compact={compact}
                    options={[
                      { value: 0 as const, label: tp('Полный', 'Full', 'Pelny') },
                      { value: 1 as const, label: 'R1' },
                      { value: 2 as const, label: 'R2' },
                    ]}
                    active={ui.reefLevel}
                    onSelect={(v) => setUi((p) => ({ ...p, reefLevel: v as ReefLevel }))} />
      <StatusDot tone={sim.result.diag.mainStalled ? 'danger' : sim.result.diag.mainAoA < 5 ? 'warn' : 'good'}
                 text={sim.result.diag.mainStalled
                       ? tp('СРЫВ', 'STALL', 'STALL')
                       : sim.result.diag.mainAoA < 5
                         ? tp('ПОЛОЩЕТ', 'LUFFING', 'LOPOCZE')
                         : tp('ТЯНЕТ', 'ATTACHED', 'PRACUJE')}
                 compact={compact} />
    </PodCard>
  );
}

function JibPod(props: {
  ui: UiState;
  setUi: React.Dispatch<React.SetStateAction<UiState>>;
  params: ReturnType<typeof getBoatParams>;
  sim: SimulationModel;
  tp: TpFn;
  compact?: boolean;
}) {
  const { ui, setUi, params, sim, tp, compact } = props;
  return (
    <PodCard compact={compact}>
      <PodLabel text={tp('СТАКСЕЛЬ', 'JIB', 'FOK')} compact={compact} />
      <PodSlider compact={compact}
                 label={tp('Угол', 'Angle', 'Kat')}
                 value={`${Math.round(ui.jibAngle)}°`}
                 min={Math.round(params.jibMinOff)} max={Math.round(params.jibMaxOff)} step={1}
                 sliderValue={ui.jibAngle}
                 onChange={(v) => setUi((p) => ({ ...p, jibAngle: v }))}
                 tone={sim.result.diag.jibStalled ? 'danger' : 'cyan'} />
      <PodSlider compact={compact}
                 label={tp('Раскрытие', 'Furl', 'Zwiniecie')}
                 value={`${ui.jibFurlPct}%`}
                 min={0} max={100} step={5}
                 sliderValue={ui.jibFurlPct}
                 onChange={(v) => setUi((p) => ({ ...p, jibFurlPct: v }))} />
      <StatusDot tone={ui.jibFurlPct < 10 ? 'warn' : sim.result.diag.jibStalled ? 'danger' : sim.result.diag.jibAoA < 5 ? 'warn' : 'good'}
                 text={ui.jibFurlPct < 10
                       ? tp('УБРАН', 'FURLED', 'ZWINIETY')
                       : sim.result.diag.jibStalled
                         ? tp('СРЫВ', 'STALL', 'STALL')
                         : sim.result.diag.jibAoA < 5
                           ? tp('ПОЛОЩЕТ', 'LUFFING', 'LOPOCZE')
                           : tp('ТЯНЕТ', 'ATTACHED', 'PRACUJE')}
                 compact={compact} />
    </PodCard>
  );
}

function ViewPod(props: {
  ui: UiState;
  setUi: React.Dispatch<React.SetStateAction<UiState>>;
  tp: TpFn;
  applyOptimal: () => void;
  resetAll: () => void;
  setPreset: (twa: number) => void;
  compact?: boolean;
}) {
  const { ui, setUi, tp, applyOptimal, resetAll, setPreset, compact } = props;
  return (
    <PodCard compact={compact}>
      <PodLabel text={tp('ВИД', 'VIEW', 'WIDOK')} compact={compact} />
      <PodSegmented compact={compact}
                    options={[
                      { value: 'top' as const, label: tp('Сверху', 'Top', 'Gora') },
                      { value: 'rear' as const, label: tp('Сзади', 'Rear', 'Z tylu') },
                    ]}
                    active={ui.view}
                    onSelect={(v) => setUi((p) => ({ ...p, view: v as ViewMode }))} />
      <PodSegmented compact={compact}
                    options={[
                      { value: 'both' as const, label: tp('Оба', 'Both', 'Oba') },
                      { value: 'main' as const, label: tp('Грот', 'Main', 'Grot') },
                      { value: 'jib' as const, label: tp('Стакс.', 'Jib', 'Fok') },
                    ]}
                    active={ui.sailsRaised}
                    onSelect={(v) => setUi((p) => ({ ...p, sailsRaised: v as SailsRaised }))} />
      <div className="grid grid-cols-4 gap-1">
        {COURSE_PRESETS.map((preset) => (
          <button key={preset.id}
                  onClick={() => setPreset(preset.twa)}
                  className={`${compact ? 'px-0.5 py-0.5 text-[8px]' : 'px-1 py-1 text-[9px]'} rounded-md border font-semibold uppercase tracking-wider transition truncate`}
                  style={{
                    borderColor: Math.abs(ui.twa - preset.twa) < 2 ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.22)',
                    background: Math.abs(ui.twa - preset.twa) < 2 ? 'rgba(0, 212, 255, 0.12)' : 'transparent',
                    color: Math.abs(ui.twa - preset.twa) < 2 ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  }}>
            {preset.id === 'close' ? tp('Бей', 'Close', 'Bej')
             : preset.id === 'beam' ? tp('Галф', 'Beam', 'Galf')
             : preset.id === 'broad' ? tp('Бак', 'Broad', 'Bak')
             : tp('Форд', 'Run', 'Ford')}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        <button onClick={applyOptimal}
                className={`${compact ? 'px-1 py-0.5 text-[9px]' : 'px-1.5 py-1 text-[10px]'} rounded-md border font-semibold uppercase tracking-wider transition`}
                style={{ borderColor: 'rgba(82, 255, 142, 0.4)', color: 'var(--success)' }}>
          {tp('Оптим', 'Best', 'Opt')}
        </button>
        <button onClick={resetAll}
                className={`${compact ? 'px-1 py-0.5 text-[9px]' : 'px-1.5 py-1 text-[10px]'} rounded-md border font-semibold uppercase tracking-wider transition`}
                style={{ borderColor: 'rgba(139, 167, 184, 0.22)', color: 'var(--text-muted)' }}>
          {tp('Сброс', 'Reset', 'Reset')}
        </button>
      </div>
      <label className={`flex items-center gap-2 ${compact ? 'text-[9px]' : 'text-[10px]'} text-[var(--text-secondary)] cursor-pointer`}>
        <input type="checkbox" checked={ui.showOptimal}
               onChange={(e) => setUi((p) => ({ ...p, showOptimal: e.target.checked }))} />
        {tp('Призрак оптимума', 'Ghost optimum', 'Duch optimum')}
      </label>
    </PodCard>
  );
}

function StatusDot({ tone, text, compact }: { tone: 'good' | 'warn' | 'danger'; text: string; compact?: boolean }) {
  const color = tone === 'danger' ? 'var(--danger)' : tone === 'warn' ? 'var(--warning)' : 'var(--success)';
  return (
    <div className={`flex items-center gap-1.5 ${compact ? 'text-[9px]' : 'text-[10px]'} font-bold uppercase tracking-wider`}
         style={{ color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {text}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metrics strip (4 chips)
// ---------------------------------------------------------------------------

function MetricsStrip({ ui, sim, tp }: { ui: UiState; sim: SimulationModel; tp: TpFn }) {
  void ui;
  const heelAbs = Math.abs(sim.result.state.heel);
  const trimColor = sim.trimScore > 80 ? 'var(--success)' : sim.trimScore > 55 ? 'var(--accent-cyan)' : 'var(--warning)';
  const heelColor = heelAbs > 28 ? 'var(--danger)' : heelAbs > 22 ? 'var(--warning)' : 'var(--accent-cyan)';

  return (
    <div className="grid grid-cols-4 gap-0 mx-2 lg:mx-0 mt-2 lg:mt-3 rounded-xl overflow-hidden"
         style={{ background: 'rgba(8, 24, 48, 0.6)', border: '1px solid rgba(0, 212, 255, 0.18)' }}>
      <MetricChip label={tp('СКОРОСТЬ', 'SPEED', 'PREDKOSC')}
                  value={sim.result.state.boatSpeed.toFixed(1)}
                  unit="kts"
                  color="var(--accent-cyan)" />
      <MetricChip label={tp('КРЕН', 'HEEL', 'PRZECHYL')}
                  value={Math.round(sim.result.state.heel).toString()}
                  unit="°"
                  color={heelColor}
                  divider />
      <MetricChip label="AWA"
                  value={Math.round(Math.abs(sim.result.diag.awa)).toString()}
                  unit="°"
                  color="var(--accent-cyan)"
                  divider />
      <MetricChip label={tp('ТРИМ', 'TRIM', 'TRIM')}
                  value={sim.trimScore.toString()}
                  unit="%"
                  color={trimColor}
                  divider />
    </div>
  );
}

function MetricChip({ label, value, unit, color, divider }: {
  label: string; value: string; unit: string; color: string; divider?: boolean;
}) {
  return (
    <div className="px-2 py-2 sm:px-3 sm:py-3 relative">
      {divider && (
        <div className="absolute left-0 top-2 bottom-2 w-px"
             style={{ background: 'rgba(139, 167, 184, 0.18)' }} />
      )}
      <div className="text-[8px] sm:text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-xl sm:text-3xl font-black font-mono tabular-nums leading-none" style={{ color }}>
          {value}
        </span>
        <span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-semibold">
          {unit}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single-line commentary (fades on tone change, one sentence only)
// ---------------------------------------------------------------------------

function CommentaryLine({ text, tone }: { text: string; tone: 'good' | 'warn' | 'danger' | 'info' }) {
  const color = tone === 'danger' ? 'var(--danger)'
              : tone === 'warn' ? 'var(--warning)'
              : tone === 'good' ? 'var(--success)'
              : 'var(--accent-cyan)';
  return (
    <div className="mx-2 lg:mx-0 mt-2 mb-2 px-3 py-2.5 rounded-xl flex items-center gap-2 text-[12px] sm:text-[13px]"
         style={{ background: 'rgba(8, 24, 48, 0.5)', border: '1px solid rgba(0, 212, 255, 0.12)' }}>
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-[var(--text-secondary)] leading-snug">{text}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Arrow helper (SVG arrow with optional label)
// ---------------------------------------------------------------------------

function Arrow(props: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  width: number;
  label?: string;
  labelPos?: { x: number; y: number };
  labelAnchor?: 'start' | 'middle' | 'end';
}) {
  const { from, to, color, width, label, labelPos, labelAnchor = 'middle' } = props;
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const headSize = 9;
  const left = {
    x: to.x - Math.cos(angle - Math.PI / 6) * headSize,
    y: to.y - Math.sin(angle - Math.PI / 6) * headSize,
  };
  const right = {
    x: to.x - Math.cos(angle + Math.PI / 6) * headSize,
    y: to.y - Math.sin(angle + Math.PI / 6) * headSize,
  };
  return (
    <g>
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
            stroke={color} strokeWidth={width} strokeLinecap="round" />
      <path d={`M ${left.x.toFixed(1)} ${left.y.toFixed(1)} L ${to.x.toFixed(1)} ${to.y.toFixed(1)} L ${right.x.toFixed(1)} ${right.y.toFixed(1)}`}
            fill="none"
            stroke={color} strokeWidth={width}
            strokeLinecap="round" strokeLinejoin="round" />
      {label && labelPos && (
        <text x={labelPos.x} y={labelPos.y}
              textAnchor={labelAnchor}
              fill={color}
              fontSize="11" fontWeight="800"
              style={{ fontFamily: 'ui-monospace, monospace' }}>
          {label}
        </text>
      )}
    </g>
  );
}
