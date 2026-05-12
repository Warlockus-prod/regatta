import type { TpExtras } from '../i18n/context';

export type SimMode = 'free' | 'drill' | 'mission';

type Tp = (ru: string, en: string, pl: string, extras?: TpExtras) => string;

export interface DrillContext {
  twaDeg: number;
  boatSpeedKn: number;
  trimScore: number;
  elapsedSec: number;
}

export interface DrillTickResult {
  /** Seconds spent satisfying the objective so far. */
  progressSec: number;
  /** Whether the current tick satisfies the objective. */
  active: boolean;
  /** Whether the drill is finished (progressSec >= targetSec). */
  done: boolean;
}

export interface DrillDef {
  id: 'twa45' | 'noGo' | 'reach90';
  title: (tp: Tp) => string;
  hint: (tp: Tp) => string;
  /** Target seconds spent in the success window. */
  targetSec: number;
  /** Per-tick predicate. Returns true when the current state satisfies the
   *  objective and the timer should advance. */
  check: (ctx: DrillContext) => boolean;
  /** Live progress label, e.g. "TWA held: 22 / 30 sec". */
  progressLabel: (progressSec: number, targetSec: number, tp: Tp) => string;
}

const DRILL_TWA45: DrillDef = {
  id: 'twa45',
  targetSec: 30,
  title: (tp) =>
    tp('Удерживай TWA 45 град', 'Hold TWA 45 deg', 'Utrzymaj TWA 45 st.', {
      es: 'Manten TWA 45 deg',
      fr: 'Tiens un TWA 45 deg',
      de: 'Halte TWA 45 Grad',
      it: 'Tieni TWA 45 deg',
    }),
  hint: (tp) =>
    tp(
      'Курс крутой бейдевинд: TWA в коридоре 40-50 град.',
      'Close-hauled: keep TWA in the 40-50 deg window.',
      'Bejdewind: TWA w przedziale 40-50 st.',
      {
        es: 'Cenida: TWA entre 40 y 50 grados.',
        fr: 'Pres bon plein: TWA entre 40 et 50 deg.',
        de: 'Am Wind: TWA zwischen 40 und 50 Grad.',
        it: 'Bolina stretta: TWA tra 40 e 50 deg.',
      },
    ),
  check: (ctx) => {
    const a = Math.abs(ctx.twaDeg);
    return a >= 40 && a <= 50;
  },
  progressLabel: (p, t, tp) =>
    tp(
      `TWA удержан: ${Math.floor(p)} / ${t} сек`,
      `TWA held: ${Math.floor(p)} / ${t} sec`,
      `TWA utrzymany: ${Math.floor(p)} / ${t} sek`,
      {
        es: `TWA mantenido: ${Math.floor(p)} / ${t} seg`,
        fr: `TWA tenu: ${Math.floor(p)} / ${t} sec`,
        de: `TWA gehalten: ${Math.floor(p)} / ${t} Sek.`,
        it: `TWA tenuto: ${Math.floor(p)} / ${t} sec`,
      },
    ),
};

const DRILL_NO_GO: DrillDef = {
  id: 'noGo',
  targetSec: 60,
  title: (tp) =>
    tp(
      'Избегай no-go зону',
      'Avoid the no-go zone',
      'Unikaj strefy no-go',
      {
        es: 'Evita la zona no-go',
        fr: 'Evite la zone no-go',
        de: 'Meide die No-go-Zone',
        it: 'Evita la zona no-go',
      },
    ),
  hint: (tp) =>
    tp(
      'Не подходи ближе 30 град к ветру 60 секунд.',
      'Stay outside 30 deg from the wind for 60 seconds.',
      'Trzymaj sie ponad 30 st. od wiatru przez 60 sek.',
      {
        es: 'Mantente a mas de 30 grados del viento durante 60 seg.',
        fr: 'Reste a plus de 30 deg du vent pendant 60 sec.',
        de: 'Bleib mehr als 30 Grad vom Wind weg, 60 Sekunden.',
        it: 'Resta oltre 30 gradi dal vento per 60 sec.',
      },
    ),
  check: (ctx) => Math.abs(ctx.twaDeg) >= 30,
  progressLabel: (p, t, tp) =>
    tp(
      `Чисто: ${Math.floor(p)} / ${t} сек`,
      `Clear: ${Math.floor(p)} / ${t} sec`,
      `Czysto: ${Math.floor(p)} / ${t} sek`,
      {
        es: `Despejado: ${Math.floor(p)} / ${t} seg`,
        fr: `Degage: ${Math.floor(p)} / ${t} sec`,
        de: `Frei: ${Math.floor(p)} / ${t} Sek.`,
        it: `Libero: ${Math.floor(p)} / ${t} sec`,
      },
    ),
};

const DRILL_REACH90: DrillDef = {
  id: 'reach90',
  targetSec: 30,
  title: (tp) =>
    tp(
      'Галфвинд 90 град на скорость',
      'Beam reach 90 deg for max speed',
      'Polwiatr 90 st. na predkosc',
      {
        es: 'Traves 90 deg para velocidad maxima',
        fr: 'Largue 90 deg pour vitesse max',
        de: 'Halbwindkurs 90 Grad fuer Topspeed',
        it: 'Traverso 90 deg per max velocita',
      },
    ),
  hint: (tp) =>
    tp(
      'Держи TWA около 90 град и подбирай шкоты до высокого TRIM.',
      'Keep TWA near 90 deg and trim sheets for high TRIM.',
      'Trzymaj TWA blisko 90 st. i wybierz szoty na wysoki TRIM.',
      {
        es: 'Manten TWA cerca de 90 deg y ajusta velas para TRIM alto.',
        fr: 'Tiens un TWA proche de 90 deg et regle pour un TRIM eleve.',
        de: 'Halte TWA nahe 90 Grad und trimme auf hohen TRIM.',
        it: 'Tieni TWA vicino a 90 deg e regola per TRIM alto.',
      },
    ),
  check: (ctx) => {
    const a = Math.abs(ctx.twaDeg);
    return a >= 80 && a <= 100 && ctx.trimScore >= 70;
  },
  progressLabel: (p, t, tp) =>
    tp(
      `Время на курсе: ${Math.floor(p)} / ${t} сек`,
      `On target: ${Math.floor(p)} / ${t} sec`,
      `Na kursie: ${Math.floor(p)} / ${t} sek`,
      {
        es: `En objetivo: ${Math.floor(p)} / ${t} seg`,
        fr: `Sur objectif: ${Math.floor(p)} / ${t} sec`,
        de: `Auf Ziel: ${Math.floor(p)} / ${t} Sek.`,
        it: `In rotta: ${Math.floor(p)} / ${t} sec`,
      },
    ),
};

export const DRILLS: ReadonlyArray<DrillDef> = [
  DRILL_TWA45,
  DRILL_NO_GO,
  DRILL_REACH90,
];

/** Mission marks expressed as fractions of the canvas (0..1) so they scale
 *  with the playfield. Origin is top-left. */
export interface MarkPlan {
  id: string;
  /** X as fraction of bounds.width. */
  fx: number;
  /** Y as fraction of bounds.height. */
  fy: number;
  /** Visual radius hint in px (used by the renderer). */
  radius: number;
  /** Capture radius in px - boat must come within this distance. */
  captureRadius: number;
}

export interface MissionDef {
  id: 'windwardReturn' | 'beamRun' | 'tackTwice';
  title: (tp: Tp) => string;
  hint: (tp: Tp) => string;
  /** Soft time budget in seconds for scoring. Below this = full score. */
  parSec: number;
  /** Marks in order. Final entry is treated as the finish line. */
  marks: ReadonlyArray<MarkPlan>;
}

const MISSION_WINDWARD: MissionDef = {
  id: 'windwardReturn',
  parSec: 90,
  title: (tp) =>
    tp(
      'Обогни верхний знак',
      'Round the windward mark',
      'Okraz znak nawietrzny',
      {
        es: 'Redondea la baliza de barlovento',
        fr: 'Contourne la bouee au vent',
        de: 'Umrunde die Luvtonne',
        it: 'Gira la boa di bolina',
      },
    ),
  hint: (tp) =>
    tp(
      'Старт - верхний знак - финиш. Лавируй до знака.',
      'Start, windward mark, finish. Tack up to the mark.',
      'Start, znak nawietrzny, meta. Halsuj do znaku.',
      {
        es: 'Salida, baliza barlovento, meta. Vira hasta la baliza.',
        fr: 'Depart, bouee au vent, arrivee. Louvoie jusqu a la bouee.',
        de: 'Start, Luvtonne, Ziel. Kreuze zur Tonne hoch.',
        it: 'Partenza, boa al vento, arrivo. Bordeggia fino alla boa.',
      },
    ),
  marks: [
    { id: 'mark1', fx: 0.5, fy: 0.18, radius: 8, captureRadius: 32 },
    { id: 'finish', fx: 0.5, fy: 0.88, radius: 7, captureRadius: 36 },
  ],
};

const MISSION_BEAM: MissionDef = {
  id: 'beamRun',
  parSec: 60,
  title: (tp) =>
    tp(
      'Галфвинд через канал',
      'Beam reach across the channel',
      'Trasa polwiatrem',
      {
        es: 'Cruce a traves',
        fr: 'Traversee au largue',
        de: 'Halbwind quer',
        it: 'Attraversata al traverso',
      },
    ),
  hint: (tp) =>
    tp(
      'Старт слева, знак справа - один галс на галфвинде.',
      'Start left, mark right. One leg on a beam reach.',
      'Start z lewej, znak z prawej. Jeden hals polwiatrem.',
      {
        es: 'Salida izquierda, baliza derecha. Una pierna al traves.',
        fr: 'Depart a gauche, bouee a droite. Une bordee au largue.',
        de: 'Start links, Tonne rechts. Ein Schenkel auf Halbwind.',
        it: 'Partenza a sinistra, boa a destra. Un lato al traverso.',
      },
    ),
  marks: [
    { id: 'mark1', fx: 0.85, fy: 0.50, radius: 8, captureRadius: 32 },
    { id: 'finish', fx: 0.15, fy: 0.50, radius: 7, captureRadius: 36 },
  ],
};

const MISSION_TACK_TWICE: MissionDef = {
  id: 'tackTwice',
  parSec: 110,
  title: (tp) =>
    tp(
      'Лавировка до знака',
      'Tack twice to the mark',
      'Dwa zwroty do znaku',
      {
        es: 'Dos viradas hasta la baliza',
        fr: 'Deux virements vers la bouee',
        de: 'Zweimal wenden zur Tonne',
        it: 'Due virate fino alla boa',
      },
    ),
  hint: (tp) =>
    tp(
      'Лево, право, верх - три ноги до финиша.',
      'Port, starboard, top. Three legs to the finish.',
      'Lewy, prawy, gora. Trzy odcinki do mety.',
      {
        es: 'Babor, estribor, arriba. Tres piernas hasta la meta.',
        fr: 'Babord, tribord, haut. Trois bords jusqu a l arrivee.',
        de: 'Backbord, Steuerbord, oben. Drei Schenkel bis ins Ziel.',
        it: 'Babordo, tribordo, alto. Tre lati fino al traguardo.',
      },
    ),
  marks: [
    { id: 'mark1', fx: 0.20, fy: 0.55, radius: 7, captureRadius: 30 },
    { id: 'mark2', fx: 0.80, fy: 0.45, radius: 7, captureRadius: 30 },
    { id: 'finish', fx: 0.50, fy: 0.18, radius: 7, captureRadius: 34 },
  ],
};

export const MISSIONS: ReadonlyArray<MissionDef> = [
  MISSION_WINDWARD,
  MISSION_BEAM,
  MISSION_TACK_TWICE,
];

export function findDrill(id: string | null | undefined): DrillDef | undefined {
  if (!id) return undefined;
  return DRILLS.find((d) => d.id === id);
}

export function findMission(
  id: string | null | undefined,
): MissionDef | undefined {
  if (!id) return undefined;
  return MISSIONS.find((m) => m.id === id);
}

export function scoreMission(elapsedSec: number, parSec: number): number {
  if (elapsedSec <= parSec) return 100;
  const over = elapsedSec - parSec;
  return Math.max(40, Math.round(100 - over * 1.2));
}
