/**
 * Rule-based coaching - used when the Claude API isn't available.
 * Analyses the race log directly with heuristics.
 * Returns the same shape as the AI coach, so the UI is interchangeable.
 *
 * i18n: accepts a `lang` parameter (any of the 7 site languages). All
 * user-facing strings are picked per-language. JSON field names (titleRu,
 * fixRu, nextGoalRu) are kept for client compatibility - values inside match
 * lang.
 */

import type { Lang } from './languages';
import { inNoGoZone } from './race-manoeuvres';
type CoachLang = Lang;

interface LogSample {
  t: number; x: number; y: number; heading: number; twa: number; speed: number; lap: number;
}

interface LogEvent {
  type: 'start' | 'tack' | 'gybe' | 'mark-rounded' | 'finish' | 'no-go-entered';
  t: number;
  note?: string;
}

interface RaceLog {
  difficulty: string;
  courseInfo: { windDirection: number; windwardMark: { x: number; y: number }; startY: number };
  finishTime: number | null;
  position: number;
  totalBoats: number;
  samples: LogSample[];
  events: LogEvent[];
  /** Package 7: the race's best course to windward at its wind (raceUpwind,
   * the solver the route hint sails, src/lib/upwind-vmg.ts). With it the
   * close-hauled grade is the VMG against that optimum, the same grade the
   * skill bars give; older logs and the server without it keep the fixed
   * 4.5 kn reference. */
  upwindTarget?: { twa: number; speedKn: number; vmgKn: number };
}

/**
 * Coaching response shape.
 *
 * The legacy `*Ru` field names are kept as REQUIRED for backward
 * compatibility - older replays and cached responses still use them. The
 * non-suffixed aliases (`title`, `explanation`, `fix`, `nextGoal`) are
 * NEW (2026-04-26) and OPTIONAL: every fresh response from /api/coach
 * fills BOTH sets of names with the same content, but anything stored
 * before the rename only has the `*Ru` versions.
 *
 * Consumers should prefer the non-suffixed name and fall back to `*Ru`,
 * via the `pickCoachField` helper below. This lets us rename the
 * confusing "RU" suffix without breaking a single downstream use.
 */
export interface Coaching {
  overall: string;
  score: number;
  mistakes: Array<{
    timeStart: number;
    timeEnd: number;
    severity: 'minor' | 'major';
    titleRu: string;
    explanationRu: string;
    fixRu: string;
    title?: string;
    explanation?: string;
    fix?: string;
    /** What the mistake is about (M4-2): picks its practice on the finish
     * screen (src/data/race-practice.ts). The local coach always sets it; the
     * AI coach is asked for it; older replays and caches have none. */
    kind?: CoachGoalKind;
  }>;
  strengths: string[];
  nextGoalRu: string;
  nextGoal?: string;
}

/** Read either the new (`title`) or legacy (`titleRu`) field. */
export function coachTitle(m: Coaching['mistakes'][number]): string {
  return m.title ?? m.titleRu;
}
export function coachExplanation(m: Coaching['mistakes'][number]): string {
  return m.explanation ?? m.explanationRu;
}
export function coachFix(m: Coaching['mistakes'][number]): string {
  return m.fix ?? m.fixRu;
}
export function coachNextGoal(c: Coaching): string {
  return c.nextGoal ?? c.nextGoalRu;
}

/** Seconds each sample stands for: the gap to the next sample (the race log
 * samples every 0.5 s), capped so a hole in the log does not count as time. */
function sampleWeights(samples: readonly LogSample[]): number[] {
  return samples.map((s, i) => {
    const next = samples[i + 1];
    const dt = next ? next.t - s.t : 0.5;
    return Number.isFinite(dt) && dt > 0 ? Math.min(dt, 2) : 0;
  });
}

/** What the log measures, with one no-go definition (inNoGoZone) for the
 * entries, the time in the zone and the praise (M0-4). Losses are seconds of
 * sailing at the reference speed given away; null when the log cannot tell. */
export interface RaceLogMeasures {
  noGoEntries: number;
  noGoSeconds: number;
  noGoShare: number;
  noGoLossSec: number | null;
  tacks: number;
  /** Loss of the tacks beyond the 4 a standard beat needs. */
  extraTackLossSec: number | null;
  closeHauledSamples: number;
  closeHauledAvgKn: number | null;
  /** Close-hauled VMG over the race's best upwind VMG (upwindTarget); null
   * without a target or close-hauled samples. */
  closeHauledVmgRatio: number | null;
  /** Loss against the race's best upwind VMG (upwindTarget), else against the
   * 4.5 kn the coach calls good close-hauled speed. */
  slowCloseHauledLossSec: number | null;
}

/** Close-hauled speed the coach praises, knots. */
const GOOD_CLOSE_HAULED_KN = 4.5;
/** Tacks a standard beat needs; more are criticised above TOO_MANY_TACKS. */
const ENOUGH_TACKS = 4;
const TOO_MANY_TACKS = 10;

/** A usable upwind target, else null. */
function upwindOf(log: Pick<RaceLog, 'upwindTarget'>): { twa: number; speedKn: number; vmgKn: number } | null {
  const t = log.upwindTarget;
  return t && [t.twa, t.speedKn, t.vmgKn].every(Number.isFinite) && t.vmgKn > 0 && t.twa > 0 && t.twa < 90 ? t : null;
}

/** Close-hauled VMG ratio the coach praises, and below which it criticises. */
const GOOD_UPWIND_RATIO = 0.9;
const SLOW_UPWIND_RATIO = 0.75;

export function measureRaceLog(log: Pick<RaceLog, 'samples' | 'events' | 'upwindTarget'>): RaceLogMeasures {
  const samples = log.samples, w = sampleWeights(samples);
  const duration = w.reduce((sum, x) => sum + x, 0);
  // No-go: entries are rising edges of the predicate. The live log catches
  // every entry at 30 Hz; the 2 Hz samples are the fallback for other logs.
  let sampleEntries = 0, noGoSeconds = 0, noGoLoss = 0, was = false;
  const free = samples.filter((s) => !inNoGoZone(s.twa, s.speed));
  const refKn = free.length ? free.reduce((sum, s) => sum + s.speed, 0) / free.length : 0;
  samples.forEach((s, i) => {
    const inside = inNoGoZone(s.twa, s.speed);
    if (inside && !was) sampleEntries++;
    if (inside) {
      noGoSeconds += w[i];
      if (refKn > 0) noGoLoss += w[i] * Math.max(0, 1 - s.speed / refKn);
    }
    was = inside;
  });
  const noGoEntries = Math.max(sampleEntries, log.events.filter((e) => e.type === 'no-go-entered').length);
  // Tacks: the speed given away in the 6 s after each, against the best of the 3 s before.
  const tackTimes = log.events.filter((e) => e.type === 'tack').map((e) => e.t);
  let tackLoss = 0, measuredTacks = 0;
  for (const t of tackTimes) {
    const before = samples.filter((s) => s.t >= t - 3 && s.t <= t).reduce((mx, s) => Math.max(mx, s.speed), 0);
    if (!(before > 0)) continue;
    measuredTacks++;
    samples.forEach((s, i) => { if (s.t > t && s.t <= t + 6) tackLoss += w[i] * Math.max(0, 1 - s.speed / before); });
  }
  const extra = Math.max(0, tackTimes.length - ENOUGH_TACKS);
  const extraTackLossSec = measuredTacks && extra ? (tackLoss / measuredTacks) * extra : null;
  // Close-hauled: 35..55 degrees to the wind, or around the race's best VMG
  // angle when the log has it (10 higher, 15 freer). With the target the loss
  // is VMG given away against the optimum the route hint sails.
  const upwind = upwindOf(log);
  const [chLo, chHi] = upwind ? [Math.max(20, upwind.twa - 10), Math.min(75, upwind.twa + 15)] : [35, 55];
  let chLoss = 0, chSum = 0, chCount = 0, chVmg = 0, chWeight = 0;
  samples.forEach((s, i) => {
    if (Math.abs(s.twa) < chLo || Math.abs(s.twa) > chHi) return;
    chCount++; chSum += s.speed;
    if (upwind) {
      const vmg = Math.max(0, s.speed) * Math.cos(Math.abs(s.twa) * Math.PI / 180);
      chVmg += w[i] * vmg; chWeight += w[i];
      chLoss += w[i] * Math.max(0, 1 - vmg / upwind.vmgKn);
    } else chLoss += w[i] * Math.max(0, 1 - s.speed / GOOD_CLOSE_HAULED_KN);
  });
  return {
    noGoEntries,
    noGoSeconds,
    noGoShare: duration > 0 ? noGoSeconds / duration : 0,
    noGoLossSec: refKn > 0 ? noGoLoss : null,
    tacks: tackTimes.length,
    extraTackLossSec,
    closeHauledSamples: chCount,
    closeHauledAvgKn: chCount ? chSum / chCount : null,
    closeHauledVmgRatio: upwind && chWeight > 0 ? chVmg / chWeight / upwind.vmgKn : null,
    slowCloseHauledLossSec: chCount ? chLoss : null,
  };
}

/** What a coach mistake is about; the next goal is aimed at one of these. */
export type CoachGoalKind = 'no-go' | 'tacks' | 'close-hauled';
export const COACH_GOAL_KINDS: readonly CoachGoalKind[] = ['no-go', 'tacks', 'close-hauled'];

/** A mistake's kind when it is one the race knows, else null (an AI answer
 * may say "other" or anything else). */
export function coachMistakeKind(m: { kind?: unknown }): CoachGoalKind | null {
  return COACH_GOAL_KINDS.find((kind) => kind === m.kind) ?? null;
}
type GoalKind = CoachGoalKind;
type RankedMistake = Coaching['mistakes'][number] & { lossSec: number | null; goal: GoalKind };

export function analyseRaceLocally(log: RaceLog, lang: CoachLang = 'ru'): Coaching {
  return analyseRaceLocallyWithFocus(log, lang).coaching;
}

/** The same analysis plus the kind of the mistake ranked first (the one the
 * results screen lists first), or null when the coach found none. */
export function analyseRaceLocallyWithFocus(log: RaceLog, lang: CoachLang = 'ru'): { coaching: Coaching; mainMistake: CoachGoalKind | null } {
  // Pick strategy: RU / EN / PL positional, ES / FR / DE / IT from the 4th
  // argument, so every site language gets its own rule-based coaching.
  const pick = (ru: string, en: string, pl: string, x: { es: string; fr: string; de: string; it: string }) => {
    if (lang === 'ru') return ru;
    if (lang === 'pl') return pl;
    if (lang === 'es' || lang === 'fr' || lang === 'de' || lang === 'it') return x[lang];
    return en;
  };
  // Decimal comma for every language except English.
  const dec = (n: number) => n.toFixed(1).replace('.', ',');

  const mistakes: RankedMistake[] = [];
  const strengths: string[] = [];
  // Areas a strength praises; the next goal never contradicts one of them.
  const praised = new Set<GoalKind>();
  let score = 70;
  const m = measureRaceLog(log);
  const finished = Boolean(log.finishTime);
  // Whole-race mistakes span the race actually sailed: a race that ran to the
  // time limit is not cut at 2:00 (TestFlight 72 showed 0:00-2:00 after 5:00).
  const raceEnd = log.finishTime ?? log.samples[log.samples.length - 1]?.t ?? 120;

  // ----- No-go entries (>=2 = problem); one definition, see measureRaceLog -----
  const noGoCount = m.noGoEntries;
  if (noGoCount >= 2) {
    const firstEvent = log.events.find((e) => e.type === 'no-go-entered');
    const firstSample = log.samples.find((s) => inNoGoZone(s.twa, s.speed));
    const firstT = firstEvent?.t ?? firstSample?.t ?? 0;
    mistakes.push({
      lossSec: m.noGoLossSec,
      goal: 'no-go',
      timeStart: firstT,
      timeEnd: firstT + 3,
      severity: noGoCount >= 4 ? 'major' : 'minor',
      titleRu: pick(
        `Попадания в мёртвую зону (${noGoCount}×)`,
        `No-go zone entries (${noGoCount}x)`,
        `Wejścia w kąt martwy (${noGoCount}×)`,
        {
          es: `Entradas en la zona muerta (${noGoCount}×)`,
          fr: `Entrées dans la zone morte (${noGoCount}×)`,
          de: `Im toten Winkel (${noGoCount}×)`,
          it: `Ingressi nell'angolo morto (${noGoCount}×)`,
        },
      ),
      explanationRu: pick(
        'Несколько раз нос яхты уходил в мёртвую зону, а скорость падала ниже 2 узлов. Там паруса полощут, и яхта теряет ход.',
        'Several times the bow went into the no-go zone and the speed fell below 2 knots. There the sails luff and the boat loses way.',
        'Kilka razy dziób wszedł w kąt martwy, a prędkość spadła poniżej 2 węzłów. Tam żagle łopoczą, a jacht traci prędkość.',
        {
          es: 'Varias veces la proa entró en la zona muerta y la velocidad bajó de 2 nudos. Allí las velas flamean y el barco pierde velocidad.',
          fr: 'Plusieurs fois, l\'étrave est entrée dans la zone morte et la vitesse est tombée sous 2 nœuds. Là, les voiles faseyent et le bateau perd de la vitesse.',
          de: 'Mehrmals geriet der Bug in den toten Winkel und die Fahrt fiel unter 2 Knoten. Dort killen die Segel und das Boot verliert Fahrt.',
          it: 'Più volte la prua è entrata nell\'angolo morto e la velocità è scesa sotto i 2 nodi. Lì le vele fileggiano e la barca perde velocità.',
        },
      ),
      fixRu: pick(
        'На лавировке держи рекомендуемый курс: он идет у самой границы мёртвой зоны. Если яхта встала носом к ветру, уваливайся, пока паруса не наполнятся.',
        'On the beat follow the suggested course: it runs right at the edge of the no-go zone. If the boat stops head to wind, bear away until the sails fill.',
        'Na halsówce trzymaj się sugerowanego kursu: prowadzi tuż przy granicy kąta martwego. Jeśli jacht stanie dziobem do wiatru, odpadaj, aż żagle się wypełnią.',
        {
          es: 'En la ceñida sigue el rumbo recomendado: va justo por el borde de la zona muerta. Si el barco se para proa al viento, arriba hasta que las velas se llenen.',
          fr: 'Au louvoyage, suis le cap conseillé : il longe le bord de la zone morte. Si le bateau s\'arrête vent debout, abats jusqu\'à ce que les voiles se gonflent.',
          de: 'Folge an der Kreuz dem empfohlenen Kurs: Er führt direkt am Rand des toten Winkels entlang. Bleibt das Boot im Wind stehen, fall ab, bis die Segel sich füllen.',
          it: 'Di bolina segui la rotta consigliata: corre proprio al bordo dell\'angolo morto. Se la barca si ferma prua al vento, poggia finché le vele si riempiono.',
        },
      ),
    });
    score -= Math.min(20, noGoCount * 4);
  } else if (finished && noGoCount === 0 && log.samples.length > 20) {
    praised.add('no-go');
    strengths.push(pick(
      'Ни разу не попал в мёртвую зону',
      'Never entered the no-go zone',
      'Ani jednego wejścia w kąt martwy',
      {
        es: 'Ni una sola entrada en la zona muerta',
        fr: 'Aucune entrée dans la zone morte',
        de: 'Kein einziges Mal im toten Winkel',
        it: 'Nessun ingresso nell\'angolo morto',
      },
    ));
  }

  // ----- Count tacks (gybes and flips that are not manoeuvres are not tacks) -----
  const tackCount = m.tacks;
  if (tackCount > TOO_MANY_TACKS) {
    mistakes.push({
      lossSec: m.extraTackLossSec,
      goal: 'tacks',
      timeStart: 0,
      timeEnd: raceEnd,
      severity: 'minor',
      titleRu: pick(
        `Слишком много поворотов (${tackCount})`,
        `Too many tacks (${tackCount})`,
        `Za dużo zwrotów (${tackCount})`,
        {
          es: `Demasiadas viradas (${tackCount})`,
          fr: `Trop de virements (${tackCount})`,
          de: `Zu viele Wenden (${tackCount})`,
          it: `Troppe virate (${tackCount})`,
        },
      ),
      explanationRu: pick(
        'Каждый поворот оверштаг теряет скорость и время. На стандартной трассе достаточно 2-4 галсов до знака.',
        'Every tack costs speed and time. On a standard course 2-4 tacks to the mark is plenty.',
        'Każdy zwrot przez sztag kosztuje prędkość i czas. Na standardowej trasie do znaku wystarczą 2-4 halsy.',
        {
          es: 'Cada virada por avante cuesta velocidad y tiempo. En un recorrido estándar bastan 2-4 bordos hasta la baliza.',
          fr: 'Chaque virement de bord coûte de la vitesse et du temps. Sur un parcours standard, 2-4 bords suffisent jusqu\'à la bouée.',
          de: 'Jede Wende kostet Fahrt und Zeit. Auf einer Standardbahn reichen 2-4 Schläge bis zur Bahnmarke.',
          it: 'Ogni virata costa velocità e tempo. Su un percorso standard bastano 2-4 bordi fino alla boa.',
        },
      ),
      fixRu: pick(
        'Выбирай длинные галсы, переходи на другой галс только когда лейлайн ясно указывает смену.',
        'Sail long legs and tack only when the layline clearly calls for it.',
        'Wybieraj długie halsy i zmieniaj hals dopiero wtedy, gdy layline wyraźnie na to wskazuje.',
        {
          es: 'Haz bordos largos y vira solo cuando la layline lo pida claramente.',
          fr: 'Tire de longs bords et ne vire que lorsque la layline l\'impose clairement.',
          de: 'Segle lange Schläge und wende erst, wenn die Layline es klar verlangt.',
          it: 'Fai bordi lunghi e vira solo quando la layline lo richiede chiaramente.',
        },
      ),
    });
    score -= 8;
  } else if (finished && tackCount >= 1 && tackCount <= ENOUGH_TACKS) {
    praised.add('tacks');
    strengths.push(pick(
      `Экономная лавировка: поворотов всего ${tackCount}`,
      `Efficient beat: only ${tackCount} tacks`,
      `Oszczędne halsowanie (zwroty: ${tackCount})`,
      {
        es: `Ceñida eficiente (viradas: ${tackCount})`,
        fr: `Louvoyage économe (virements : ${tackCount})`,
        de: `Sparsames Kreuzen (Wenden: ${tackCount})`,
        it: `Bolina efficiente (virate: ${tackCount})`,
      },
    ));
  }

  // ----- Time in no-go from samples -----
  const noGoFraction = m.noGoShare;
  if (noGoFraction > 0.15) {
    mistakes.push({
      lossSec: m.noGoLossSec,
      goal: 'no-go',
      timeStart: 0,
      timeEnd: raceEnd,
      severity: 'major',
      titleRu: pick(
        'Много времени в мёртвой зоне',
        'Too much time in the no-go zone',
        'Dużo czasu w kącie martwym',
        {
          es: 'Mucho tiempo en la zona muerta',
          fr: 'Trop de temps dans la zone morte',
          de: 'Zu lange im toten Winkel',
          it: 'Troppo tempo nell\'angolo morto',
        },
      ),
      explanationRu: pick(
        `Около ${Math.round(noGoFraction * 100)}% гонки яхта стояла в мёртвой зоне на скорости ниже 2 узлов. Это прямые потери времени.`,
        `For about ${Math.round(noGoFraction * 100)}% of the race the boat was stuck in the no-go zone below 2 knots. That is pure time lost.`,
        `Przez około ${Math.round(noGoFraction * 100)}% wyścigu jacht tkwił w kącie martwym poniżej 2 węzłów. To czysta strata czasu.`,
        {
          es: `Durante cerca del ${Math.round(noGoFraction * 100)}% de la regata el barco estuvo parado en la zona muerta a menos de 2 nudos. Es tiempo perdido sin más.`,
          fr: `Pendant environ ${Math.round(noGoFraction * 100)} % de la course, le bateau est resté bloqué dans la zone morte sous 2 nœuds. C'est du temps perdu, tout simplement.`,
          de: `Etwa ${Math.round(noGoFraction * 100)} % des Rennens steckte das Boot unter 2 Knoten im toten Winkel fest. Das ist reiner Zeitverlust.`,
          it: `Per circa il ${Math.round(noGoFraction * 100)}% della regata la barca è rimasta bloccata nell'angolo morto sotto i 2 nodi. È tempo perso e basta.`,
        },
      ),
      fixRu: pick(
        'Следи за ветром на HUD и держи рекомендуемый курс. Как только яхта тормозит носом к ветру, сразу уваливайся.',
        'Watch the wind on the HUD and follow the suggested course. As soon as the boat slows pointing into the wind, bear away.',
        'Pilnuj wiatru na HUD i trzymaj się sugerowanego kursu. Gdy tylko jacht zwalnia dziobem do wiatru, od razu odpadnij.',
        {
          es: 'Vigila el viento en el HUD y sigue el rumbo recomendado. En cuanto el barco frene con la proa al viento, arriba enseguida.',
          fr: 'Surveille le vent sur le HUD et suis le cap conseillé. Dès que le bateau ralentit face au vent, abats tout de suite.',
          de: 'Behalte den Wind im HUD im Blick und folge dem empfohlenen Kurs. Sobald das Boot mit dem Bug im Wind langsamer wird, sofort abfallen.',
          it: 'Tieni d\'occhio il vento sull\'HUD e segui la rotta consigliata. Appena la barca rallenta con la prua al vento, poggia subito.',
        },
      ),
    });
    score -= 15;
  }

  // ----- Close-hauled speed -----
  if (m.closeHauledSamples > 5 && m.closeHauledAvgKn !== null) {
    const avgSpeed = m.closeHauledAvgKn;
    // With the race's upwind target the grade is the VMG ratio (the skill
    // bars' grade); the fixed speeds are the fallback for older logs.
    const ratio = m.closeHauledVmgRatio;
    const good = ratio !== null ? ratio >= GOOD_UPWIND_RATIO : avgSpeed >= GOOD_CLOSE_HAULED_KN;
    const slow = ratio !== null ? ratio < SLOW_UPWIND_RATIO : avgSpeed < 3;
    if (good) {
      if (finished) praised.add('close-hauled');
      if (finished) strengths.push(pick(
        `Хорошая скорость в бейдевинде: в среднем ${dec(avgSpeed)} уз`,
        `Good speed close-hauled: ${avgSpeed.toFixed(1)} kts average`,
        `Dobra prędkość na bajdewindzie: średnio ${dec(avgSpeed)} kn`,
        {
          es: `Buena velocidad en ceñida: ${dec(avgSpeed)} kn de media`,
          fr: `Bonne vitesse au près : ${dec(avgSpeed)} kn de moyenne`,
          de: `Gute Fahrt hoch am Wind: im Schnitt ${dec(avgSpeed)} kn`,
          it: `Buona velocità di bolina: ${dec(avgSpeed)} kn di media`,
        },
      ));
    } else if (slow) {
      mistakes.push({
        lossSec: m.slowCloseHauledLossSec,
        goal: 'close-hauled',
        timeStart: 0,
        timeEnd: raceEnd,
        severity: 'minor',
        titleRu: pick(
          'Медленно в бейдевинде',
          'Slow close-hauled',
          'Wolno na bajdewindzie',
          {
            es: 'Lento en ceñida',
            fr: 'Lent au près',
            de: 'Langsam hoch am Wind',
            it: 'Lento di bolina',
          },
        ),
        explanationRu: pick(
          `Средняя скорость в бейдевинде всего ${dec(avgSpeed)} уз. Вероятно, идёшь слишком близко к ветру - теряешь в скорости больше, чем выигрываешь в угле.`,
          `Average close-hauled speed is only ${avgSpeed.toFixed(1)} kts. Probably pointing too high - losing more in speed than you gain in angle.`,
          `Średnia prędkość na bajdewindzie to tylko ${dec(avgSpeed)} kn. Pewnie płyniesz za ostro - tracisz więcej na prędkości, niż zyskujesz na kącie.`,
          {
            es: `La velocidad media en ceñida es de solo ${dec(avgSpeed)} kn. Seguramente vas demasiado orzado - pierdes más en velocidad de lo que ganas en ángulo.`,
            fr: `Ta vitesse moyenne au près n'est que de ${dec(avgSpeed)} kn. Tu serres sans doute trop le vent - tu perds plus en vitesse que tu ne gagnes en cap.`,
            de: `Deine Durchschnittsfahrt hoch am Wind liegt bei nur ${dec(avgSpeed)} kn. Wahrscheinlich kneifst du zu hoch - du verlierst mehr Fahrt, als du an Höhe gewinnst.`,
            it: `La velocità media di bolina è solo ${dec(avgSpeed)} kn. Probabilmente stringi troppo il vento - perdi più in velocità di quanto guadagni in angolo.`,
          },
        ),
        fixRu: pick(
          'Держи рекомендуемый курс: это лучший угол к ветру для этой лодки. Острее него она теряет больше скорости, чем выигрывает в угле.',
          'Follow the suggested course: it is this boat\'s best angle to the wind. Pointing higher costs more speed than it gains in angle.',
          'Trzymaj się sugerowanego kursu: to najlepszy kąt do wiatru dla tej łodzi. Ostrzej traci więcej prędkości, niż zyskuje na kącie.',
          {
            es: 'Sigue el rumbo recomendado: es el mejor ángulo al viento de este barco. Más orzado pierdes más velocidad de la que ganas en ángulo.',
            fr: 'Suis le cap conseillé : c\'est le meilleur angle au vent de ce bateau. Plus haut, tu perds plus de vitesse que tu ne gagnes en cap.',
            de: 'Folge dem empfohlenen Kurs: Er ist der beste Winkel zum Wind für dieses Boot. Höher verlierst du mehr Fahrt, als du an Höhe gewinnst.',
            it: 'Segui la rotta consigliata: è il miglior angolo al vento di questa barca. Più stretto perdi più velocità di quanto guadagni in angolo.',
          },
        ),
      });
      score -= 5;
    }
  }

  // ----- Position bonus -----
  const places = log.totalBoats || 3;
  if (finished && log.position === 1) score += 15;
  else if (finished && log.position === places) score -= 10;
  // A race that did not finish never reads as a good one (M0-4).
  if (!finished) score = Math.min(score, 30);
  score = Math.max(0, Math.min(100, score));

  // ----- Strengths baseline -----
  if (strengths.length === 0 && finished) {
    strengths.push(pick(
      'Гонка пройдена до конца',
      'Race completed',
      'Wyścig ukończony',
      {
        es: 'Regata completada',
        fr: 'Course bouclée',
        de: 'Rennen beendet',
        it: 'Regata completata',
      },
    ));
  }

  // The largest measured loss first; unmeasured ones after, major before minor.
  const ranked = mistakes
    .map((mistake, i) => ({ mistake, i }))
    .sort((a, b) => (b.mistake.lossSec ?? -1) - (a.mistake.lossSec ?? -1)
      || Number(b.mistake.severity === 'major') - Number(a.mistake.severity === 'major') || a.i - b.i)
    .map(({ mistake }) => mistake);
  const topMistakes: Coaching['mistakes'] = ranked.slice(0, 3)
    .map(({ timeStart, timeEnd, severity, titleRu, explanationRu, fixRu, goal }) => ({ timeStart, timeEnd, severity, titleRu, explanationRu, fixRu, kind: goal }));
  const focus = ranked[0];

  // ----- Overall + next goal -----
  let overall: string;
  let nextGoal: string;
  if (!log.finishTime) {
    overall = pick(
      'Не удалось финишировать - вероятно, потерял курс или слишком много времени провёл в мёртвой зоне.',
      'Did not finish - you probably lost the course or spent too much time in the no-go zone.',
      'Nie udało się dopłynąć do mety - pewnie zgubiłeś trasę albo spędziłeś za dużo czasu w kącie martwym.',
      {
        es: 'No terminaste la regata - seguramente te desviaste del recorrido o pasaste demasiado tiempo en la zona muerta.',
        fr: 'Pas d\'arrivée - tu as sans doute perdu le parcours ou passé trop de temps dans la zone morte.',
        de: 'Nicht ins Ziel gekommen - wahrscheinlich hast du die Bahn verloren oder zu lange im toten Winkel gesteckt.',
        it: 'Regata non conclusa - probabilmente hai perso il percorso o hai passato troppo tempo nell\'angolo morto.',
      },
    );
    nextGoal = pick(
      'Пройти трассу полностью за любое время - цель номер один.',
      'Finish the course, whatever the time - that is goal number one.',
      'Ukończyć trasę w dowolnym czasie - to cel numer jeden.',
      {
        es: 'Completar el recorrido, con el tiempo que sea - ese es el objetivo número uno.',
        fr: 'Boucler le parcours, peu importe le temps - c\'est l\'objectif numéro un.',
        de: 'Die Bahn komplett segeln, egal in welcher Zeit - das ist Ziel Nummer eins.',
        it: 'Completare il percorso, in qualsiasi tempo - è l\'obiettivo numero uno.',
      },
    );
  } else if (log.position === 1) {
    overall = pick(
      `Победа за ${formatTime(log.finishTime)}! Отличный результат.`,
      `Won in ${formatTime(log.finishTime)}! Great result.`,
      `Zwycięstwo z czasem ${formatTime(log.finishTime)}! Świetny wynik.`,
      {
        es: `¡Victoria en ${formatTime(log.finishTime)}! Gran resultado.`,
        fr: `Victoire en ${formatTime(log.finishTime)} ! Excellent résultat.`,
        de: `Sieg in ${formatTime(log.finishTime)}! Starkes Ergebnis.`,
        it: `Vittoria in ${formatTime(log.finishTime)}! Ottimo risultato.`,
      },
    );
    nextGoal = pick(
      'Попробуй сложный уровень или улучши время на той же сложности.',
      'Try hard mode or beat your time on the same difficulty.',
      'Spróbuj poziomu trudnego albo popraw czas na tym samym poziomie.',
      {
        es: 'Prueba el nivel difícil o mejora tu tiempo en la misma dificultad.',
        fr: 'Essaie le niveau difficile ou bats ton temps au même niveau.',
        de: 'Probier die schwere Stufe oder verbessere deine Zeit auf derselben Stufe.',
        it: 'Prova il livello difficile o migliora il tuo tempo allo stesso livello.',
      },
    );
  } else if (log.position <= Math.ceil(places / 2)) {
    overall = pick(
      `Финиш на ${log.position} месте из ${places} за ${formatTime(log.finishTime)}. Крепкий результат, есть куда расти.`,
      `Finished ${log.position} of ${places} in ${formatTime(log.finishTime)}. Solid result, room to grow.`,
      `Meta na ${log.position}. miejscu z ${places}, czas ${formatTime(log.finishTime)}. Solidny wynik, ale jest jeszcze pole do poprawy.`,
      {
        es: `Terminaste en el puesto ${log.position} de ${places} en ${formatTime(log.finishTime)}. Buen resultado, con margen de mejora.`,
        fr: `Arrivée à la ${log.position}e place sur ${places} en ${formatTime(log.finishTime)}. Résultat solide, tu peux encore progresser.`,
        de: `Platz ${log.position} von ${places} in ${formatTime(log.finishTime)}. Solides Ergebnis, da ist noch Luft nach oben.`,
        it: `Arrivo al ${log.position}º posto su ${places} in ${formatTime(log.finishTime)}. Risultato solido, c'è margine per crescere.`,
      },
    );
    nextGoal = pick(
      'Повтори гонку и улучши своё время на той же сложности.',
      'Sail it again and beat your time on the same difficulty.',
      'Popłyń jeszcze raz i popraw swój czas na tym samym poziomie.',
      {
        es: 'Vuelve a navegarla y mejora tu tiempo en la misma dificultad.',
        fr: 'Refais la course et bats ton temps au même niveau.',
        de: 'Segle noch einmal und verbessere deine Zeit auf derselben Stufe.',
        it: 'Rifalla e migliora il tuo tempo allo stesso livello.',
      },
    );
  } else {
    overall = pick(
      `Финиш на ${log.position} из ${places} за ${formatTime(log.finishTime)}. Есть над чем поработать.`,
      `Finished ${log.position} of ${places} in ${formatTime(log.finishTime)}. Room for improvement.`,
      `Meta na ${log.position}. miejscu z ${places}, czas ${formatTime(log.finishTime)}. Jest nad czym pracować.`,
      {
        es: `Terminaste en el puesto ${log.position} de ${places} en ${formatTime(log.finishTime)}. Hay cosas que mejorar.`,
        fr: `Arrivée à la ${log.position}e place sur ${places} en ${formatTime(log.finishTime)}. Il y a du travail.`,
        de: `Platz ${log.position} von ${places} in ${formatTime(log.finishTime)}. Da gibt es noch einiges zu tun.`,
        it: `Arrivo al ${log.position}º posto su ${places} in ${formatTime(log.finishTime)}. C'è da lavorare.`,
      },
    );
    nextGoal = pick(
      'Повтори гонку и улучши своё время на той же сложности.',
      'Sail it again and beat your time on the same difficulty.',
      'Popłyń jeszcze raz i popraw swój czas na tym samym poziomie.',
      {
        es: 'Vuelve a navegarla y mejora tu tiempo en la misma dificultad.',
        fr: 'Refais la course et bats ton temps au même niveau.',
        de: 'Segle noch einmal und verbessere deine Zeit auf derselben Stufe.',
        it: 'Rifalla e migliora il tuo tempo allo stesso livello.',
      },
    );
  }

  // Next goal (M0-4): aimed at the largest measured loss, not a fixed order.
  // A finished race without a criticised mistake still aims at what the log
  // measured as the largest loss of a second or more, but never at an area a
  // strength above praises (a fast beat still loses seconds right after each
  // tack). Not finishing comes first.
  if (finished && focus) nextGoal = goalFor(focus.goal, focus.lossSec, pick);
  else if (finished) {
    const measured = ([['no-go', m.noGoLossSec], ['tacks', m.extraTackLossSec], ['close-hauled', m.slowCloseHauledLossSec]] as [GoalKind, number | null][])
      .filter(([kind]) => !praised.has(kind));
    const [kind, loss] = measured.reduce<[GoalKind | null, number | null]>((best, c) => ((c[1] ?? 0) > (best[1] ?? 0) ? c : best), [null, null]);
    if (kind && loss !== null && loss >= 1) nextGoal = goalFor(kind, loss, pick);
  }

  const coaching = mirrorCoachKeys({
    overall,
    score,
    mistakes: topMistakes,
    strengths,
    nextGoalRu: nextGoal,
  });
  return { coaching, mainMistake: focus?.goal ?? null };
}

/**
 * Copy each legacy `*Ru` field into its non-suffixed alias so a freshly
 * produced response satisfies BOTH the old and new readers. Cheap, runs
 * on every analyse call. The `*Ru` fields stay required for backward
 * compat; the aliases are populated on first emit and persist into any
 * future cache.
 */
export function mirrorCoachKeys(c: Coaching): Coaching {
  return {
    ...c,
    nextGoal: c.nextGoal ?? c.nextGoalRu,
    mistakes: c.mistakes.map((m) => {
      const { kind: rawKind, ...rest } = m;
      const kind = coachMistakeKind({ kind: rawKind });
      return {
        ...rest,
        title: m.title ?? m.titleRu,
        explanation: m.explanation ?? m.explanationRu,
        fix: m.fix ?? m.fixRu,
        ...(kind ? { kind } : {}),
      };
    }),
  };
}

type PickFn = (ru: string, en: string, pl: string, x: { es: string; fr: string; de: string; it: string }) => string;

/** The next goal aimed at the mistake that cost the most, with its measured
 * cost when the log could measure it (a second or more). */
function goalFor(kind: GoalKind, lossSec: number | null, pick: PickFn): string {
  const s = lossSec !== null && lossSec >= 1 ? Math.round(lossSec) : null;
  if (kind === 'no-go') {
    const goal = pick(
      'Держись вне мёртвой зоны: на лавировке держи рекомендуемый курс.',
      'Stay out of the no-go zone: on the beat follow the suggested course.',
      'Trzymaj się poza kątem martwym: na halsówce trzymaj się sugerowanego kursu.',
      {
        es: 'Mantente fuera de la zona muerta: en la ceñida sigue el rumbo recomendado.',
        fr: 'Reste hors de la zone morte : au louvoyage, suis le cap conseillé.',
        de: 'Bleib aus dem toten Winkel: Folge an der Kreuz dem empfohlenen Kurs.',
        it: 'Resta fuori dall\'angolo morto: di bolina segui la rotta consigliata.',
      },
    );
    return s === null ? goal : `${goal} ${pick(
      `В этой гонке она стоила около ${s} с.`,
      `This race it cost about ${s} s.`,
      `W tym wyścigu kosztował cię około ${s} s.`,
      {
        es: `En esta regata te costó unos ${s} s.`,
        fr: `Dans cette course, elle t'a coûté environ ${s} s.`,
        de: `In diesem Rennen hat er dich etwa ${s} s gekostet.`,
        it: `In questa regata ti è costato circa ${s} s.`,
      },
    )}`;
  }
  if (kind === 'tacks') {
    const goal = pick(
      'Меньше поворотов: 2-4 галса до верхнего знака.',
      'Fewer tacks: 2-4 legs up to the windward mark.',
      'Mniej zwrotów: 2-4 halsy do znaku nawietrznego.',
      {
        es: 'Menos viradas: 2-4 bordos hasta la baliza de barlovento.',
        fr: 'Moins de virements : 2-4 bords jusqu\'à la bouée au vent.',
        de: 'Weniger Wenden: 2-4 Schläge bis zur Luvtonne.',
        it: 'Meno virate: 2-4 bordi fino alla boa di bolina.',
      },
    );
    return s === null ? goal : `${goal} ${pick(
      `Лишние повороты стоили около ${s} с.`,
      `The extra tacks cost about ${s} s.`,
      `Dodatkowe zwroty kosztowały około ${s} s.`,
      {
        es: `Las viradas de más costaron unos ${s} s.`,
        fr: `Les virements en trop ont coûté environ ${s} s.`,
        de: `Die zusätzlichen Wenden haben etwa ${s} s gekostet.`,
        it: `Le virate in più sono costate circa ${s} s.`,
      },
    )}`;
  }
  const goal = pick(
    'Скорость в бейдевинде: держи рекомендуемый курс, это лучший угол к ветру для этой лодки.',
    'Close-hauled speed: follow the suggested course, the best angle to the wind for this boat.',
    'Prędkość na bajdewindzie: trzymaj się sugerowanego kursu, to najlepszy kąt do wiatru dla tej łodzi.',
    {
      es: 'Velocidad en ceñida: sigue el rumbo recomendado, el mejor ángulo al viento de este barco.',
      fr: 'Vitesse au près : suis le cap conseillé, le meilleur angle au vent de ce bateau.',
      de: 'Fahrt hoch am Wind: Folge dem empfohlenen Kurs, dem besten Winkel zum Wind für dieses Boot.',
      it: 'Velocità di bolina: segui la rotta consigliata, il miglior angolo al vento di questa barca.',
    },
  );
  return s === null ? goal : `${goal} ${pick(
    `Медленный бейдевинд стоил около ${s} с.`,
    `The slow beat cost about ${s} s.`,
    `Wolny bajdewind kosztował około ${s} s.`,
    {
      es: `La ceñida lenta costó unos ${s} s.`,
      fr: `Le près trop lent a coûté environ ${s} s.`,
      de: `Das langsame Kreuzen hat etwa ${s} s gekostet.`,
      it: `La bolina lenta è costata circa ${s} s.`,
    },
  )}`;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
