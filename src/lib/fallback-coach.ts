/**
 * Rule-based coaching - used when the Claude API isn't available.
 * Analyses the race log directly with heuristics.
 * Returns the same shape as the AI coach, so the UI is interchangeable.
 *
 * i18n: accepts a `lang` parameter ('ru' | 'en' | 'pl'). All user-facing
 * strings are picked per-language. JSON field names (titleRu, fixRu,
 * nextGoalRu) are kept for client compatibility - values inside match lang.
 */

import type { Lang } from './languages';
type CoachLang = Lang;

interface LogSample {
  t: number; x: number; y: number; heading: number; twa: number; speed: number; lap: number;
}

interface LogEvent {
  type: 'start' | 'tack' | 'mark-rounded' | 'finish' | 'no-go-entered';
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

export function analyseRaceLocally(log: RaceLog, lang: CoachLang = 'ru'): Coaching {
  // Pick strategy: RU -> ru arg, PL -> pl arg, everything else -> en arg.
  // ES/FR/DE/IT visitors get English rule-based coaching instead of Russian.
  const pick = (ru: string, en: string, pl: string) =>
    lang === 'ru' ? ru : lang === 'pl' ? pl : en;

  const mistakes: Coaching['mistakes'] = [];
  const strengths: string[] = [];
  let score = 70;

  // ----- Count no-go entries (>=2 = problem) -----
  const noGoEntries = log.events.filter((e) => e.type === 'no-go-entered');
  if (noGoEntries.length >= 2) {
    const first = noGoEntries[0];
    mistakes.push({
      timeStart: first.t,
      timeEnd: first.t + 3,
      severity: noGoEntries.length >= 4 ? 'major' : 'minor',
      titleRu: pick(
        `Попадания в мёртвую зону (${noGoEntries.length}×)`,
        `No-go zone entries (${noGoEntries.length}x)`,
        `Wejscia w martwa strefe (${noGoEntries.length}x)`,
      ),
      explanationRu: pick(
        'Нос яхты заходил в сектор ±30° к ветру несколько раз. В этой зоне паруса заполаскивают и яхта теряет скорость.',
        'The bow entered the ±30° sector into wind several times. In this zone sails luff and the boat loses speed.',
        'Dziob wchodzil w sektor ±30° od wiatru kilka razy. W tej strefie zagle lopocza i jacht traci predkosc.',
      ),
      fixRu: pick(
        'Держи угол к ветру минимум 40° при лавировке. Если попал в левентик - сразу увалить на ~50°, чтобы паруса снова потянули.',
        'Keep the angle to wind at 40° minimum when tacking. If you stall - bear off ~50° so the sails fill again.',
        'Trzymaj kat do wiatru minimum 40° przy halsowaniu. Jesli stanales - odpadnij o ~50°, aby zagle znow zadzialaly.',
      ),
    });
    score -= Math.min(20, noGoEntries.length * 4);
  } else if (noGoEntries.length === 0 && log.samples.length > 20) {
    strengths.push(pick(
      'Ни разу не попал в мёртвую зону',
      'Never entered the no-go zone',
      'Ani razu nie wszedles w martwa strefe',
    ));
  }

  // ----- Count tacks -----
  const tackCount = log.events.filter((e) => e.type === 'tack').length;
  if (tackCount > 10) {
    mistakes.push({
      timeStart: 0,
      timeEnd: log.finishTime ?? 120,
      severity: 'minor',
      titleRu: pick(
        `Слишком много поворотов (${tackCount})`,
        `Too many tacks (${tackCount})`,
        `Za duzo zwrotow (${tackCount})`,
      ),
      explanationRu: pick(
        'Каждый поворот оверштаг теряет скорость и время. На стандартной трассе достаточно 2-4 галсов до знака.',
        'Every tack costs speed and time. On a standard course 2-4 tacks to the mark is plenty.',
        'Kazdy zwrot przez sztag traci predkosc i czas. Na standardowej trasie wystarcza 2-4 halsy do znaku.',
      ),
      fixRu: pick(
        'Выбирай длинные галсы, переходи на другой галс только когда лейлайн ясно указывает смену.',
        'Pick long tacks, switch only when the layline clearly calls for it.',
        'Wybieraj dlugie halsy, zmieniaj tylko gdy layline wyraznie tego wymaga.',
      ),
    });
    score -= 8;
  } else if (tackCount <= 4 && log.finishTime) {
    strengths.push(pick(
      `Экономная лавировка: всего ${tackCount} поворотов`,
      `Efficient tacking: only ${tackCount} turns`,
      `Oszczedne halsowanie: tylko ${tackCount} zwrotow`,
    ));
  }

  // ----- Time in no-go from samples -----
  const noGoSamples = log.samples.filter((s) => Math.abs(s.twa) < 30 && s.speed < 2);
  const noGoFraction = log.samples.length ? noGoSamples.length / log.samples.length : 0;
  if (noGoFraction > 0.15) {
    mistakes.push({
      timeStart: 0,
      timeEnd: log.finishTime ?? 120,
      severity: 'major',
      titleRu: pick(
        'Много времени в мёртвой зоне',
        'Too much time in the no-go zone',
        'Duzo czasu w martwej strefie',
      ),
      explanationRu: pick(
        `Около ${Math.round(noGoFraction * 100)}% гонки скорость была ниже 2 узлов с углом к ветру меньше 30°. Это прямые потери времени.`,
        `About ${Math.round(noGoFraction * 100)}% of the race had speed below 2 knots with wind angle under 30°. Direct time loss.`,
        `Okolo ${Math.round(noGoFraction * 100)}% wyscigu predkosc byla ponizej 2 wezlow przy kacie ponizej 30°. Bezposrednia strata czasu.`,
      ),
      fixRu: pick(
        'Следи за углом к ветру на HUD. Как только TWA опускается ниже 35° - сразу увалить.',
        'Watch the wind angle on the HUD. If TWA drops below 35° - bear off immediately.',
        'Patrz na kat do wiatru na HUD. Jak tylko TWA spada ponizej 35° - odpadnij od razu.',
      ),
    });
    score -= 15;
  }

  // ----- Close-hauled speed -----
  const closeHauledSamples = log.samples.filter((s) => Math.abs(s.twa) >= 35 && Math.abs(s.twa) <= 55);
  if (closeHauledSamples.length > 5) {
    const avgSpeed = closeHauledSamples.reduce((sum, s) => sum + s.speed, 0) / closeHauledSamples.length;
    if (avgSpeed >= 4.5) {
      strengths.push(pick(
        `Хорошая скорость в бейдевинде: ${avgSpeed.toFixed(1)} kts средняя`,
        `Good speed close-hauled: ${avgSpeed.toFixed(1)} kts average`,
        `Dobra predkosc na bajdewindzie: ${avgSpeed.toFixed(1)} kts srednio`,
      ));
    } else if (avgSpeed < 3) {
      mistakes.push({
        timeStart: 0,
        timeEnd: log.finishTime ?? 120,
        severity: 'minor',
        titleRu: pick(
          'Медленно в бейдевинде',
          'Slow close-hauled',
          'Wolno na bajdewindzie',
        ),
        explanationRu: pick(
          `Средняя скорость в close-hauled всего ${avgSpeed.toFixed(1)} kts. Вероятно, идёшь слишком близко к ветру - теряешь в скорости больше, чем выигрываешь в угле.`,
          `Average close-hauled speed is only ${avgSpeed.toFixed(1)} kts. Probably pointing too high - losing more in speed than you gain in angle.`,
          `Srednia predkosc na bajdewindzie to tylko ${avgSpeed.toFixed(1)} kts. Prawdopodobnie idziesz za ostro - tracisz wiecej predkosci niz zyskujesz na kacie.`,
        ),
        fixRu: pick(
          'Попробуй увалить на 5-10° от текущего курса. Скорость в бейдевинде важнее узкого угла.',
          'Try bearing off 5-10° from the current heading. Speed matters more than a tight angle close-hauled.',
          'Sprobuj odpasc o 5-10° od biezacego kursu. Predkosc na bajdewindzie jest wazniejsza niz ciasny kat.',
        ),
      });
      score -= 5;
    }
  }

  // ----- Position bonus -----
  const places = log.totalBoats || 3;
  if (log.position === 1) score += 15;
  else if (log.position === places) score -= 10;
  score = Math.max(0, Math.min(100, score));

  // ----- Strengths baseline -----
  if (strengths.length === 0 && log.finishTime) {
    strengths.push(pick(
      'Гонка пройдена до конца',
      'Race finished',
      'Wyscig ukonczony',
    ));
  }

  const topMistakes = mistakes.slice(0, 3);

  // ----- Overall + next goal -----
  let overall: string;
  let nextGoal: string;
  if (!log.finishTime) {
    overall = pick(
      'Не удалось финишировать - вероятно, потерял курс или слишком много времени провёл в мёртвой зоне.',
      'Did not finish - probably lost the course or spent too much time in the no-go zone.',
      'Nie ukonczyles - prawdopodobnie zgubiles trase lub spedziles za duzo czasu w martwej strefie.',
    );
    nextGoal = pick(
      'Пройти трассу полностью за любое время - цель номер один.',
      'Finish the course at any time - that is goal number one.',
      'Ukonczyc trase w dowolnym czasie - to cel numer jeden.',
    );
  } else if (log.position === 1) {
    overall = pick(
      `Победа за ${formatTime(log.finishTime)}! Отличный результат.`,
      `Win in ${formatTime(log.finishTime)}! Great result.`,
      `Zwyciestwo w ${formatTime(log.finishTime)}! Swietny wynik.`,
    );
    nextGoal = pick(
      'Попробуй сложный уровень или улучши время на той же сложности.',
      'Try hard mode or beat your time on the same difficulty.',
      'Sprobuj poziomu trudnego lub popraw czas na tej samej trudnosci.',
    );
  } else if (log.position <= Math.ceil(places / 2)) {
    overall = pick(
      `Финиш на ${log.position} месте из ${places} за ${formatTime(log.finishTime)}. Крепкий результат, есть куда расти.`,
      `Finished ${log.position} of ${places} in ${formatTime(log.finishTime)}. Solid result, room to grow.`,
      `Meta na ${log.position} miejscu z ${places} w ${formatTime(log.finishTime)}. Solidny wynik, jest pole do wzrostu.`,
    );
    nextGoal = pick(
      'Сократи количество поворотов и время в мёртвой зоне - это даст пару секунд.',
      'Cut down on tacks and time in the no-go zone - that will save a couple of seconds.',
      'Zmniejsz liczbe zwrotow i czas w martwej strefie - to da kilka sekund.',
    );
  } else {
    overall = pick(
      `Финиш на ${log.position} из ${places} за ${formatTime(log.finishTime)}. Есть над чем поработать.`,
      `Finished ${log.position} of ${places} in ${formatTime(log.finishTime)}. Room for improvement.`,
      `Meta na ${log.position} z ${places} w ${formatTime(log.finishTime)}. Jest nad czym pracowac.`,
    );
    nextGoal = pick(
      'Сконцентрируйся на контроле угла к ветру - большинство потерь времени оттуда.',
      'Focus on wind-angle control - most time losses come from there.',
      'Skup sie na kontroli kata do wiatru - stamtad pochodzi wiekszosc strat czasu.',
    );
  }

  return mirrorCoachKeys({
    overall,
    score,
    mistakes: topMistakes,
    strengths,
    nextGoalRu: nextGoal,
  });
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

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
