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
  /** Loss against the 4.5 kn the coach calls good close-hauled speed. */
  slowCloseHauledLossSec: number | null;
}

/** Close-hauled speed the coach praises, knots. */
const GOOD_CLOSE_HAULED_KN = 4.5;
/** Tacks a standard beat needs; more are criticised above TOO_MANY_TACKS. */
const ENOUGH_TACKS = 4;
const TOO_MANY_TACKS = 10;

export function measureRaceLog(log: Pick<RaceLog, 'samples' | 'events'>): RaceLogMeasures {
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
  // Close-hauled: 35..55 degrees to the wind.
  let chLoss = 0, chSum = 0, chCount = 0;
  samples.forEach((s, i) => {
    if (Math.abs(s.twa) < 35 || Math.abs(s.twa) > 55) return;
    chCount++; chSum += s.speed;
    chLoss += w[i] * Math.max(0, 1 - s.speed / GOOD_CLOSE_HAULED_KN);
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
    slowCloseHauledLossSec: chCount ? chLoss : null,
  };
}

/** What a coach mistake is about; the next goal is aimed at one of these. */
export type CoachGoalKind = 'no-go' | 'tacks' | 'close-hauled';
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
        'Несколько раз нос яхты оказывался ближе 30° к ветру, а скорость падала ниже 2 узлов. В этой зоне паруса заполаскивают и яхта теряет ход.',
        'Several times the bow was within 30° of the wind and the speed fell below 2 knots. In this zone the sails luff and the boat loses way.',
        'Kilka razy dziób znalazł się bliżej niż 30° od wiatru, a prędkość spadła poniżej 2 węzłów. W tej strefie żagle łopoczą, a jacht traci prędkość.',
        {
          es: 'Varias veces la proa quedó a menos de 30° del viento y la velocidad bajó de 2 nudos. En esa zona las velas flamean y el barco pierde velocidad.',
          fr: 'Plusieurs fois, l\'étrave était à moins de 30° du vent et la vitesse est tombée sous 2 nœuds. Dans cette zone, les voiles faseyent et le bateau perd de la vitesse.',
          de: 'Mehrmals stand der Bug weniger als 30° zum Wind und die Fahrt fiel unter 2 Knoten. Dort killen die Segel und das Boot verliert Fahrt.',
          it: 'Più volte la prua è arrivata a meno di 30° dal vento e la velocità è scesa sotto i 2 nodi. In quella zona le vele fileggiano e la barca perde velocità.',
        },
      ),
      fixRu: pick(
        'Держи угол к ветру минимум 40° при лавировке. Если попал в левентик - сразу увалить на ~50°, чтобы паруса снова потянули.',
        'Keep at least 40° to the wind when beating upwind. If you end up head to wind, bear away ~50° right away so the sails fill again.',
        'Na halsówce trzymaj co najmniej 40° do wiatru. Jeśli wpadniesz w łopot, od razu odpadnij o ~50°, żeby żagle znów zaczęły pracować.',
        {
          es: 'En ceñida mantén al menos 40° respecto al viento. Si te quedas proa al viento, arriba enseguida unos 50° para que las velas vuelvan a portar.',
          fr: 'Au louvoyage, garde au moins 40° par rapport au vent. Si tu te retrouves vent debout, abats tout de suite d\'environ 50° pour que les voiles portent à nouveau.',
          de: 'Halte beim Kreuzen mindestens 40° zum Wind. Stehst du im Wind, fall sofort etwa 50° ab, damit die Segel wieder ziehen.',
          it: 'Di bolina tieni almeno 40° dal vento. Se finisci prua al vento, poggia subito di circa 50° perché le vele tornino a portare.',
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
        `Около ${Math.round(noGoFraction * 100)}% гонки скорость была ниже 2 узлов с углом к ветру меньше 30°. Это прямые потери времени.`,
        `For about ${Math.round(noGoFraction * 100)}% of the race you were below 2 knots at under 30° to the wind. That is pure time lost.`,
        `Przez około ${Math.round(noGoFraction * 100)}% wyścigu prędkość była poniżej 2 węzłów przy kącie do wiatru poniżej 30°. To czysta strata czasu.`,
        {
          es: `Durante cerca del ${Math.round(noGoFraction * 100)}% de la regata fuiste a menos de 2 nudos y a menos de 30° del viento. Es tiempo perdido sin más.`,
          fr: `Pendant environ ${Math.round(noGoFraction * 100)} % de la course, tu étais sous 2 nœuds à moins de 30° du vent. C'est du temps perdu, tout simplement.`,
          de: `Etwa ${Math.round(noGoFraction * 100)} % des Rennens warst du unter 2 Knoten bei weniger als 30° zum Wind. Das ist reiner Zeitverlust.`,
          it: `Per circa il ${Math.round(noGoFraction * 100)}% della regata la velocità è rimasta sotto i 2 nodi con meno di 30° dal vento. È tempo perso e basta.`,
        },
      ),
      fixRu: pick(
        'Следи за углом к ветру на HUD. Как только TWA опускается ниже 35° - сразу увалить.',
        'Watch the wind angle on the HUD. As soon as TWA drops below 35°, bear away.',
        'Pilnuj kąta do wiatru na HUD. Gdy tylko TWA spadnie poniżej 35°, od razu odpadnij.',
        {
          es: 'Vigila el ángulo al viento en el HUD. En cuanto el TWA baje de 35°, arriba enseguida.',
          fr: 'Surveille l\'angle au vent sur le HUD. Dès que le TWA passe sous 35°, abats tout de suite.',
          de: 'Behalte den Windwinkel im HUD im Blick. Sobald der TWA unter 35° fällt, sofort abfallen.',
          it: 'Tieni d\'occhio l\'angolo al vento sull\'HUD. Appena il TWA scende sotto i 35°, poggia subito.',
        },
      ),
    });
    score -= 15;
  }

  // ----- Close-hauled speed -----
  if (m.closeHauledSamples > 5 && m.closeHauledAvgKn !== null) {
    const avgSpeed = m.closeHauledAvgKn;
    if (avgSpeed >= GOOD_CLOSE_HAULED_KN) {
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
    } else if (avgSpeed < 3) {
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
          'Попробуй увалить на 5-10° от текущего курса. Скорость в бейдевинде важнее узкого угла.',
          'Try bearing away 5-10° from your current heading. Close-hauled, speed matters more than a tight angle.',
          'Spróbuj odpaść o 5-10° od obecnego kursu. Na bajdewindzie prędkość jest ważniejsza niż ostry kąt.',
          {
            es: 'Prueba a arribar 5-10° respecto al rumbo actual. En ceñida, la velocidad importa más que un ángulo cerrado.',
            fr: 'Essaie d\'abattre de 5-10° par rapport à ton cap actuel. Au près, la vitesse compte plus qu\'un angle serré.',
            de: 'Versuch, 5-10° vom aktuellen Kurs abzufallen. Hoch am Wind ist Fahrt wichtiger als ein enger Winkel.',
            it: 'Prova a poggiare di 5-10° rispetto alla rotta attuale. Di bolina la velocità conta più di un angolo stretto.',
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
    .map(({ timeStart, timeEnd, severity, titleRu, explanationRu, fixRu }) => ({ timeStart, timeEnd, severity, titleRu, explanationRu, fixRu }));
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
    mistakes: c.mistakes.map((m) => ({
      ...m,
      title: m.title ?? m.titleRu,
      explanation: m.explanation ?? m.explanationRu,
      fix: m.fix ?? m.fixRu,
    })),
  };
}

type PickFn = (ru: string, en: string, pl: string, x: { es: string; fr: string; de: string; it: string }) => string;

/** The next goal aimed at the mistake that cost the most, with its measured
 * cost when the log could measure it (a second or more). */
function goalFor(kind: GoalKind, lossSec: number | null, pick: PickFn): string {
  const s = lossSec !== null && lossSec >= 1 ? Math.round(lossSec) : null;
  if (kind === 'no-go') {
    const goal = pick(
      'Держись вне мёртвой зоны: на лавировке не меньше 40° к ветру.',
      'Stay out of the no-go zone: at least 40° to the wind when beating.',
      'Trzymaj się poza kątem martwym: na halsówce co najmniej 40° do wiatru.',
      {
        es: 'Mantente fuera de la zona muerta: en ceñida, al menos 40° respecto al viento.',
        fr: 'Reste hors de la zone morte : au louvoyage, au moins 40° du vent.',
        de: 'Bleib aus dem toten Winkel: beim Kreuzen mindestens 40° zum Wind.',
        it: 'Resta fuori dall\'angolo morto: di bolina almeno 40° dal vento.',
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
    'Скорость в бейдевинде: уваливайся на 5-10°, пока не пойдёшь быстрее 4,5 уз.',
    'Close-hauled speed: bear away 5-10° until you sail faster than 4.5 kn.',
    'Prędkość na bajdewindzie: odpadnij o 5-10°, aż popłyniesz szybciej niż 4,5 kn.',
    {
      es: 'Velocidad en ceñida: arriba 5-10° hasta ir a más de 4,5 kn.',
      fr: 'Vitesse au près : abats de 5-10° jusqu\'à dépasser 4,5 kn.',
      de: 'Fahrt hoch am Wind: fall 5-10° ab, bis du schneller als 4,5 kn segelst.',
      it: 'Velocità di bolina: poggia di 5-10° finché non superi i 4,5 kn.',
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
