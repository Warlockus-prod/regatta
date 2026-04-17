/**
 * Rule-based coaching - used when the Claude API isn't available.
 * Analyses the race log directly with heuristics.
 * Returns the same shape as the AI coach, so the UI is interchangeable.
 */

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
  }>;
  strengths: string[];
  nextGoalRu: string;
}

export function analyseRaceLocally(log: RaceLog): Coaching {
  const mistakes: Coaching['mistakes'] = [];
  const strengths: string[] = [];
  let score = 70;

  // ----- Count no-go entries (≥2 = problem) -----
  const noGoEntries = log.events.filter((e) => e.type === 'no-go-entered');
  if (noGoEntries.length >= 2) {
    const first = noGoEntries[0];
    mistakes.push({
      timeStart: first.t,
      timeEnd: first.t + 3,
      severity: noGoEntries.length >= 4 ? 'major' : 'minor',
      titleRu: `Попадания в мёртвую зону (${noGoEntries.length}×)`,
      explanationRu: 'Нос яхты заходил в сектор ±30° к ветру несколько раз. В этой зоне паруса заполаскивают и яхта теряет скорость.',
      fixRu: 'Держи угол к ветру минимум 40° при лавировке. Если попал в левентик - сразу увалить на ~50°, чтобы паруса снова потянули.',
    });
    score -= Math.min(20, noGoEntries.length * 4);
  } else if (noGoEntries.length === 0 && log.samples.length > 20) {
    strengths.push('Ни разу не попал в мёртвую зону');
  }

  // ----- Count tacks (too many = zigzagging poorly) -----
  const tackCount = log.events.filter((e) => e.type === 'tack').length;
  if (tackCount > 10) {
    mistakes.push({
      timeStart: 0,
      timeEnd: log.finishTime ?? 120,
      severity: 'minor',
      titleRu: `Слишком много поворотов (${tackCount})`,
      explanationRu: 'Каждый поворот оверштаг теряет скорость и время. На стандартной трассе достаточно 2-4 галсов до знака.',
      fixRu: 'Выбирай длинные галсы, переходи на другой галс только когда лейлайн ясно указывает смену.',
    });
    score -= 8;
  } else if (tackCount <= 4 && log.finishTime) {
    strengths.push(`Экономная лавировка: всего ${tackCount} поворотов`);
  }

  // ----- Time in no-go from samples -----
  const noGoSamples = log.samples.filter((s) => Math.abs(s.twa) < 30 && s.speed < 2);
  const noGoFraction = log.samples.length ? noGoSamples.length / log.samples.length : 0;
  if (noGoFraction > 0.15) {
    mistakes.push({
      timeStart: 0,
      timeEnd: log.finishTime ?? 120,
      severity: 'major',
      titleRu: 'Много времени в мёртвой зоне',
      explanationRu: `Около ${Math.round(noGoFraction * 100)}% гонки скорость была ниже 2 узлов с углом к ветру меньше 30°. Это прямые потери времени.`,
      fixRu: 'Следи за углом к ветру на HUD. Как только TWA опускается ниже 35° - сразу увалить.',
    });
    score -= 15;
  }

  // ----- Average speed at close-hauled -----
  const closeHauledSamples = log.samples.filter((s) => Math.abs(s.twa) >= 35 && Math.abs(s.twa) <= 55);
  if (closeHauledSamples.length > 5) {
    const avgSpeed = closeHauledSamples.reduce((sum, s) => sum + s.speed, 0) / closeHauledSamples.length;
    if (avgSpeed >= 4.5) {
      strengths.push(`Хорошая скорость в бейдевинде: ${avgSpeed.toFixed(1)} kts средняя`);
    } else if (avgSpeed < 3) {
      mistakes.push({
        timeStart: 0,
        timeEnd: log.finishTime ?? 120,
        severity: 'minor',
        titleRu: 'Медленно в бейдевинде',
        explanationRu: `Средняя скорость в close-hauled всего ${avgSpeed.toFixed(1)} kts. Вероятно, идёшь слишком близко к ветру - теряешь в скорости больше, чем выигрываешь в угле.`,
        fixRu: 'Попробуй увалить на 5-10° от текущего курса. Скорость в бейдевинде важнее узкого угла.',
      });
      score -= 5;
    }
  }

  // ----- Position bonus/penalty -----
  const places = log.totalBoats || 3;
  if (log.position === 1) score += 15;
  else if (log.position === places) score -= 10;
  score = Math.max(0, Math.min(100, score));

  // ----- Strengths baseline -----
  if (strengths.length === 0 && log.finishTime) {
    strengths.push('Гонка пройдена до конца');
  }

  // ----- Keep max 3 mistakes -----
  const topMistakes = mistakes.slice(0, 3);

  // ----- Overall + next goal -----
  let overall: string;
  let nextGoal: string;
  if (!log.finishTime) {
    overall = 'Не удалось финишировать - вероятно, потерял курс или слишком много времени провёл в мёртвой зоне.';
    nextGoal = 'Пройти трассу полностью за любое время - цель номер один.';
  } else if (log.position === 1) {
    overall = `Победа за ${formatTime(log.finishTime)}! Отличный результат.`;
    nextGoal = 'Попробуй сложный уровень или улучши время на той же сложности.';
  } else if (log.position <= Math.ceil(places / 2)) {
    overall = `Финиш на ${log.position} месте из ${places} за ${formatTime(log.finishTime)}. Крепкий результат, есть куда расти.`;
    nextGoal = 'Сократи количество поворотов и время в мёртвой зоне - это даст пару секунд.';
  } else {
    overall = `Финиш на ${log.position} из ${places} за ${formatTime(log.finishTime)}. Есть над чем поработать.`;
    nextGoal = 'Сконцентрируйся на контроле угла к ветру - большинство потерь времени оттуда.';
  }

  return {
    overall,
    score,
    mistakes: topMistakes,
    strengths,
    nextGoalRu: nextGoal,
  };
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
