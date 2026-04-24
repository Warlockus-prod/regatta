// ============================================================================
// Missions - structured game variants with specific goals.
// Evaluated post-race using the same race log as AI coach.
// ============================================================================

import type { LegacyLocalized } from '@/lib/languages';

export type MissionCheckType =
  | 'finish-under-sec'    // finish time < value seconds
  | 'no-no-go'            // never entered no-go zone
  | 'max-tacks'           // completed with <= N tacks
  | 'min-top-speed';      // reached peak speed >= value kts

export interface MissionConstraint {
  type: MissionCheckType;
  value?: number;
}

// `LegacyLocalized` gives us `titleRu/En/Pl` required + `titleEs/Fr/De/It`
// optional so Claude-API translations can append without breaking the type.
export type Mission =
  & LegacyLocalized<'title'>
  & LegacyLocalized<'desc'>
  & LegacyLocalized<'hint'>
  & {
    id: string;
    emoji: string;
    /** Difficulty preset to force when this mission runs */
    difficulty: 'easy' | 'medium' | 'hard';
    /** Wind strength override */
    windStrength: 'light' | 'medium' | 'heavy';
    constraints: MissionConstraint[];
  };

export const missions: Mission[] = [
  {
    id: 'clean-laps',
    emoji: '🧼',
    titleRu: 'Чистая гонка',
    titleEn: 'Clean lap',
    titlePl: 'Czysta runda',
    titleEs: 'Carrera limpia',
    titleFr: 'Course claire',
    titleDe: 'Saubere Regatta',
    titleIt: 'Una regata pulita',
    descRu: 'Пройди трассу ни разу не попав в неходовую зону.',
    descEn: 'Complete the course without ever entering the no-go zone.',
    descPl: 'Przejdz trase ani razu nie wchodzac w strefe martwa.',
    descEs: 'Completa la regata sin entrar ni una sola vez en la zona muerta.',
    descFr: 'Parcours la course sans jamais entrer dans la zone morte.',
    descDe: 'Absolviere die Strecke, ohne je in die Totzone zu geraten.',
    descIt: 'Completa il percorso senza entrare mai nella zona morta.',
    difficulty: 'easy',
    windStrength: 'medium',
    constraints: [{ type: 'no-no-go' }],
    hintRu: 'Следи за углом к ветру - не меньше 40° при лавировке.',
    hintEn: 'Watch your TWA - at least 40° when beating upwind.',
    hintPl: 'Uwazaj na TWA - nie mniej niz 40° przy halsowaniu.',
    hintEs: 'Mantén el ángulo al viento por encima de 40° cuando ceñas.',
    hintFr: 'Surveille l\'angle vent reel - minimum 40° en louvoyer.',
    hintDe: 'Achte auf den Windwinkel - nicht weniger als 40° beim Kreuzen.',
    hintIt: 'Tieni d\'occhio l\'angolo vento reale - non meno di 40° quando bolinari.',
  },
  {
    id: 'sub-90',
    emoji: '⏱',
    titleRu: 'Под 90 секунд',
    titleEn: 'Sub 90 sec',
    titlePl: 'Ponizej 90 s',
    titleEs: 'Menos de 90 segundos',
    titleFr: 'Moins de 90 secondes',
    titleDe: 'Unter 90 Sekunden',
    titleIt: 'Sotto i 90 secondi',
    descRu: 'Финишируй быстрее чем за 90 секунд.',
    descEn: 'Finish under 90 seconds.',
    descPl: 'Ukoncz poniewaj 90 sekund.',
    descEs: 'Termina en menos de 90 segundos.',
    descFr: 'Franchis en moins de 90 secondes.',
    descDe: 'Finishe schneller als in 90 Sekunden.',
    descIt: 'Termina più velocemente di 90 secondi.',
    difficulty: 'medium',
    windStrength: 'heavy',
    constraints: [{ type: 'finish-under-sec', value: 90 }],
    hintRu: 'Сильный ветер - скорость высокая. Минимизируй повороты.',
    hintEn: 'Strong wind, high speed. Minimize tacks.',
    hintPl: 'Silny wiatr, wysoka predkosc. Minimalizuj zwroty.',
    hintEs: 'Viento fuerte - velocidad alta. Minimiza los viajes.',
    hintFr: 'Vent fort - vitesse élevée. Minimise les virages.',
    hintDe: 'Starker Wind - hohe Geschwindigkeit. Minimiere die Wendemanöver.',
    hintIt: 'Vento forte - velocita alta. Minimizza le virate.',
  },
  {
    id: 'minimal-tacks',
    emoji: '📐',
    titleRu: 'Экономия галсов',
    titleEn: 'Minimal tacks',
    titlePl: 'Minimum halsow',
    titleEs: 'Economía de bordadas',
    titleFr: 'Économie de bordées',
    titleDe: 'Effizienz beim Kreuzen',
    titleIt: 'Risparmio di bordi',
    descRu: 'Дойди до верхнего знака не более чем за 4 поворота.',
    descEn: 'Reach windward mark in 4 tacks or fewer.',
    descPl: 'Dojdz do znaku nawietrznego w 4 zwrotach lub mniej.',
    descEs: 'Llega a la boya de barlovento en no más de 4 viradas.',
    descFr: 'Reach the windward mark in no more than 4 tacks.',
    descDe: 'Erreiche die Luvtonne in maximal 4 Wendungen.',
    descIt: 'Raggiungi la boa di bolina in non più di 4 virate.',
    difficulty: 'medium',
    windStrength: 'medium',
    constraints: [{ type: 'max-tacks', value: 4 }],
    hintRu: 'Лавируй длинными галсами, переходи на другой только на лейлайне.',
    hintEn: 'Sail long tacks, switch only on the layline.',
    hintPl: 'Halsuj dlugimi halsami, zmieniaj tylko na layline.',
    hintEs: 'Ceñir en bordadas largas, cambiar de amura solo en el layline.',
    hintFr: 'Louvre en longs bords, ne change de bord que sur la layline.',
    hintDe: 'Kreuze mit langen Bugs, wechsle nur auf der Layline.',
    hintIt: 'Naviga in bolina con lunghi bordi, cambia mura solo sulla layline.',
  },
  {
    id: 'light-wind-master',
    emoji: '🍃',
    titleRu: 'Слабый ветер',
    titleEn: 'Light wind',
    titlePl: 'Slaby wiatr',
    titleEs: 'Viento débil',
    titleFr: 'vent faible',
    titleDe: 'Schwacher Wind',
    titleIt: 'Vento debole',
    descRu: 'Финишируй на слабом ветре. Любая позиция засчитывается.',
    descEn: 'Finish in light wind. Any position counts.',
    descPl: 'Ukoncz przy slabym wietrze. Kazda pozycja sie liczy.',
    descEs: 'Termina en viento flojo. Se cuenta cualquier posición.',
    descFr: 'Finisse par vent faible. Toute position compte.',
    descDe: 'Ziel im schwachen Wind. Jede Position zählt.',
    descIt: 'Termina con vento leggero. Vale qualsiasi posizione.',
    difficulty: 'easy',
    windStrength: 'light',
    constraints: [],
    hintRu: 'При слабом ветре каждый поворот теряет скорость. Плавность важнее резкости.',
    hintEn: 'In light wind every tack loses speed. Smoothness over aggression.',
    hintPl: 'Przy slabym wietrze kazdy zwrot traci predkosc. Plynnosc wazniejsza od agresji.',
    hintEs: 'Con viento débil, cada virada pierde velocidad. La suavidad es más importante que la brusquedad.',
    hintFr: 'Avec peu de vent, chaque virement perd de la vitesse. La fluidité est plus importante que l\'agressivité.',
    hintDe: 'Bei schwachem Wind verliert jede Wende an Geschwindigkeit. Geschmeidigkeit ist wichtiger als Heftigkeit.',
    hintIt: 'Con vento leggero ogni virata fa perdere velocità. La fluidità è più importante della bruschez­za.',
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

export type MissionLang = 'ru' | 'en' | 'pl';

/** Evaluate whether all mission constraints passed given race metrics. */
export function evaluateMission(mission: Mission, metrics: RaceMetrics, lang: MissionLang = 'ru'): MissionResult {
  const reasons: string[] = [];
  let passed = true;

  const pick = (ru: string, en: string, pl: string) =>
    lang === 'pl' ? pl : lang === 'en' ? en : ru;

  if (metrics.finishTimeSec === null) {
    passed = false;
    reasons.push(pick('Не финишировал', 'Did not finish', 'Nie ukonczono'));
    return { mission, passed, reasons };
  }

  for (const c of mission.constraints) {
    switch (c.type) {
      case 'finish-under-sec':
        if (metrics.finishTimeSec > (c.value ?? Infinity)) {
          passed = false;
          reasons.push(pick(
            `Время ${metrics.finishTimeSec.toFixed(1)}с больше чем ${c.value}с`,
            `Time ${metrics.finishTimeSec.toFixed(1)}s > ${c.value}s`,
            `Czas ${metrics.finishTimeSec.toFixed(1)}s > ${c.value}s`,
          ));
        }
        break;
      case 'no-no-go':
        if (metrics.noGoEntries > 0) {
          passed = false;
          reasons.push(pick(
            `Вошёл в мёртвую зону ${metrics.noGoEntries}×`,
            `Entered no-go zone ${metrics.noGoEntries}×`,
            `Wszedles w strefe martwa ${metrics.noGoEntries}×`,
          ));
        }
        break;
      case 'max-tacks':
        if (metrics.tackCount > (c.value ?? Infinity)) {
          passed = false;
          reasons.push(pick(
            `Поворотов ${metrics.tackCount}, нужно ≤ ${c.value}`,
            `${metrics.tackCount} tacks, need ≤ ${c.value}`,
            `Zwrotow ${metrics.tackCount}, potrzebne ≤ ${c.value}`,
          ));
        }
        break;
      case 'min-top-speed':
        if (metrics.topSpeed < (c.value ?? 0)) {
          passed = false;
          reasons.push(pick(
            `Максимум ${metrics.topSpeed.toFixed(1)}, нужно ≥ ${c.value}`,
            `Peak ${metrics.topSpeed.toFixed(1)} kts, need ≥ ${c.value}`,
            `Max ${metrics.topSpeed.toFixed(1)} kts, potrzebne ≥ ${c.value}`,
          ));
        }
        break;
    }
  }

  if (passed) reasons.push(pick('✓ Все условия выполнены', '✓ All constraints met', '✓ Wszystkie warunki spelnione'));
  return { mission, passed, reasons };
}
