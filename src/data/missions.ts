// ============================================================================
// Missions — structured game variants with specific goals.
// Evaluated post-race using the same race log as AI coach.
// ============================================================================

export type MissionCheckType =
  | 'finish-under-sec'    // finish time < value seconds
  | 'no-no-go'            // never entered no-go zone
  | 'max-tacks'           // completed with <= N tacks
  | 'min-top-speed';      // reached peak speed >= value kts

export interface MissionConstraint {
  type: MissionCheckType;
  value?: number;
}

export interface Mission {
  id: string;
  emoji: string;
  titleRu: string;
  titleEn: string;
  descRu: string;
  descEn: string;
  /** Difficulty preset to force when this mission runs */
  difficulty: 'easy' | 'medium' | 'hard';
  /** Wind strength override */
  windStrength: 'light' | 'medium' | 'heavy';
  constraints: MissionConstraint[];
  /** Short hint shown during the race */
  hintRu: string;
  hintEn: string;
}

export const missions: Mission[] = [
  {
    id: 'clean-laps',
    emoji: '🧼',
    titleRu: 'Чистая гонка',
    titleEn: 'Clean lap',
    descRu: 'Пройди трассу ни разу не попав в неходовую зону.',
    descEn: 'Complete the course without ever entering the no-go zone.',
    difficulty: 'easy',
    windStrength: 'medium',
    constraints: [{ type: 'no-no-go' }],
    hintRu: 'Следи за углом к ветру — не меньше 40° при лавировке.',
    hintEn: 'Watch your TWA — at least 40° when beating upwind.',
  },
  {
    id: 'sub-90',
    emoji: '⏱',
    titleRu: 'Под 90 секунд',
    titleEn: 'Sub 90 sec',
    descRu: 'Финишируй быстрее чем за 90 секунд.',
    descEn: 'Finish under 90 seconds.',
    difficulty: 'medium',
    windStrength: 'heavy',
    constraints: [{ type: 'finish-under-sec', value: 90 }],
    hintRu: 'Сильный ветер — скорость высокая. Минимизируй повороты.',
    hintEn: 'Strong wind, high speed. Minimize tacks.',
  },
  {
    id: 'minimal-tacks',
    emoji: '📐',
    titleRu: 'Экономия галсов',
    titleEn: 'Minimal tacks',
    descRu: 'Дойди до верхнего знака не более чем за 4 поворота.',
    descEn: 'Reach windward mark in 4 tacks or fewer.',
    difficulty: 'medium',
    windStrength: 'medium',
    constraints: [{ type: 'max-tacks', value: 4 }],
    hintRu: 'Лавируй длинными галсами, переходи на другой только на лейлайне.',
    hintEn: 'Sail long tacks, switch only on the layline.',
  },
  {
    id: 'light-wind-master',
    emoji: '🍃',
    titleRu: 'Слабый ветер',
    titleEn: 'Light wind',
    descRu: 'Финишируй на слабом ветре. Любая позиция засчитывается.',
    descEn: 'Finish in light wind. Any position counts.',
    difficulty: 'easy',
    windStrength: 'light',
    constraints: [],
    hintRu: 'При слабом ветре каждый поворот теряет скорость. Плавность важнее резкости.',
    hintEn: 'In light wind every tack loses speed. Smoothness over aggression.',
  },
];

export interface MissionResult {
  mission: Mission;
  passed: boolean;
  reasons: string[];
}

export interface RaceMetrics {
  finishTimeSec: number | null;
  tackCount: number;
  noGoEntries: number;
  topSpeed: number;
}

/** Evaluate whether all mission constraints passed given race metrics. */
export function evaluateMission(mission: Mission, metrics: RaceMetrics, lang: 'ru' | 'en' = 'ru'): MissionResult {
  const reasons: string[] = [];
  let passed = true;

  if (metrics.finishTimeSec === null) {
    passed = false;
    reasons.push(lang === 'ru' ? 'Не финишировал' : 'Did not finish');
    return { mission, passed, reasons };
  }

  for (const c of mission.constraints) {
    switch (c.type) {
      case 'finish-under-sec':
        if (metrics.finishTimeSec > (c.value ?? Infinity)) {
          passed = false;
          reasons.push(lang === 'ru'
            ? `Время ${metrics.finishTimeSec.toFixed(1)}с больше чем ${c.value}с`
            : `Time ${metrics.finishTimeSec.toFixed(1)}s > ${c.value}s`);
        }
        break;
      case 'no-no-go':
        if (metrics.noGoEntries > 0) {
          passed = false;
          reasons.push(lang === 'ru'
            ? `Вошёл в мёртвую зону ${metrics.noGoEntries}×`
            : `Entered no-go zone ${metrics.noGoEntries}×`);
        }
        break;
      case 'max-tacks':
        if (metrics.tackCount > (c.value ?? Infinity)) {
          passed = false;
          reasons.push(lang === 'ru'
            ? `Поворотов ${metrics.tackCount}, нужно ≤ ${c.value}`
            : `${metrics.tackCount} tacks, need ≤ ${c.value}`);
        }
        break;
      case 'min-top-speed':
        if (metrics.topSpeed < (c.value ?? 0)) {
          passed = false;
          reasons.push(lang === 'ru'
            ? `Максимум ${metrics.topSpeed.toFixed(1)}, нужно ≥ ${c.value}`
            : `Peak ${metrics.topSpeed.toFixed(1)} kts, need ≥ ${c.value}`);
        }
        break;
    }
  }

  if (passed) reasons.push(lang === 'ru' ? '✓ Все условия выполнены' : '✓ All constraints met');
  return { mission, passed, reasons };
}
