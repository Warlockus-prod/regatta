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
    titleEn: 'Clean race',
    titlePl: 'Czysty wyścig',
    titleEs: 'Regata limpia',
    titleFr: 'Course propre',
    titleDe: 'Sauberes Rennen',
    titleIt: 'Regata pulita',
    descRu: 'Пройди трассу ни разу не попав в неходовую зону.',
    descEn: 'Complete the course without ever entering the no-go zone.',
    descPl: 'Pokonaj trasę, ani razu nie wchodząc w kąt martwy.',
    descEs: 'Completa el recorrido sin entrar ni una sola vez en la zona muerta.',
    descFr: 'Boucle le parcours sans jamais entrer dans la zone morte.',
    descDe: 'Segle die Bahn, ohne ein einziges Mal in den toten Winkel zu geraten.',
    descIt: 'Completa il percorso senza mai entrare nell\'angolo morto.',
    difficulty: 'easy',
    windStrength: 'medium',
    constraints: [{ type: 'no-no-go' }],
    hintRu: 'Следи за углом к ветру - не меньше 40° при лавировке.',
    hintEn: 'Watch your TWA - at least 40° when beating upwind.',
    hintPl: 'Pilnuj kąta do wiatru - na halsówce nie mniej niż 40°.',
    hintEs: 'Vigila el ángulo al viento - al menos 40° cuando ciñas.',
    hintFr: 'Surveille ton angle au vent - au moins 40° au louvoyage.',
    hintDe: 'Achte auf den Windwinkel - beim Kreuzen nicht unter 40°.',
    hintIt: 'Tieni d\'occhio l\'angolo al vento - non meno di 40° quando bordeggi.',
  },
  {
    id: 'sub-90',
    emoji: '⏱',
    titleRu: 'Под 90 секунд',
    titleEn: 'Sub 90 sec',
    titlePl: 'Poniżej 90 s',
    titleEs: 'Menos de 90 s',
    titleFr: 'Moins de 90 s',
    titleDe: 'Unter 90 s',
    titleIt: 'Sotto i 90 s',
    descRu: 'Финишируй быстрее чем за 90 секунд.',
    descEn: 'Finish under 90 seconds.',
    descPl: 'Dopłyń do mety w mniej niż 90 sekund.',
    descEs: 'Cruza la llegada en menos de 90 segundos.',
    descFr: 'Franchis la ligne d\'arrivée en moins de 90 secondes.',
    descDe: 'Komm in weniger als 90 Sekunden ins Ziel.',
    descIt: 'Taglia il traguardo in meno di 90 secondi.',
    difficulty: 'medium',
    windStrength: 'heavy',
    constraints: [{ type: 'finish-under-sec', value: 90 }],
    hintRu: 'Сильный ветер - скорость высокая. Минимизируй повороты.',
    hintEn: 'Strong wind, high speed. Minimize tacks.',
    hintPl: 'Silny wiatr, duża prędkość. Rób jak najmniej zwrotów.',
    hintEs: 'Viento fuerte, mucha velocidad. Vira lo menos posible.',
    hintFr: 'Vent fort, vitesse élevée. Vire le moins possible.',
    hintDe: 'Starker Wind, viel Fahrt. Wende so selten wie möglich.',
    hintIt: 'Vento forte, velocità alta. Vira il meno possibile.',
  },
  {
    id: 'minimal-tacks',
    emoji: '📐',
    titleRu: 'Экономия галсов',
    titleEn: 'Minimal tacks',
    titlePl: 'Minimum zwrotów',
    titleEs: 'Pocas viradas',
    titleFr: 'Peu de virements',
    titleDe: 'Sparsam wenden',
    titleIt: 'Poche virate',
    descRu: 'Пройди всю гонку не более чем за 4 поворота.',
    descEn: 'Finish the race with 4 tacks or fewer.',
    descPl: 'Ukończ wyścig w najwyżej 4 zwrotach.',
    descEs: 'Termina la regata con 4 viradas como máximo.',
    descFr: 'Termine la course en 4 virements de bord au maximum.',
    descDe: 'Beende die Wettfahrt mit höchstens 4 Wenden.',
    descIt: 'Completa la regata con non più di 4 virate.',
    difficulty: 'medium',
    windStrength: 'medium',
    constraints: [{ type: 'max-tacks', value: 4 }],
    hintRu: 'Лавируй длинными галсами, переходи на другой только на лейлайне.',
    hintEn: 'Beat in long legs and tack only on the layline.',
    hintPl: 'Halsuj długimi halsami, zmieniaj hals dopiero na layline.',
    hintEs: 'Da bordos largos y vira solo en la layline.',
    hintFr: 'Louvoie en longs bords et ne vire que sur la layline.',
    hintDe: 'Kreuze in langen Schlägen und wende erst auf der Layline.',
    hintIt: 'Bordeggia con bordi lunghi e vira solo sulla layline.',
  },
  {
    id: 'light-wind-master',
    emoji: '🍃',
    titleRu: 'Слабый ветер',
    titleEn: 'Light wind',
    titlePl: 'Słaby wiatr',
    titleEs: 'Viento flojo',
    titleFr: 'Vent faible',
    titleDe: 'Leichtwind',
    titleIt: 'Vento leggero',
    descRu: 'Финишируй на слабом ветре. Любая позиция засчитывается.',
    descEn: 'Finish in light wind. Any position counts.',
    descPl: 'Dopłyń do mety przy słabym wietrze. Każde miejsce jest zaliczane.',
    descEs: 'Cruza la llegada con viento flojo. Vale cualquier puesto.',
    descFr: 'Termine la course par vent faible. Toutes les places sont valables.',
    descDe: 'Komm bei Leichtwind ins Ziel. Jeder Platz wird gewertet.',
    descIt: 'Taglia il traguardo con vento leggero. Vale qualsiasi posizione.',
    difficulty: 'easy',
    windStrength: 'light',
    constraints: [],
    hintRu: 'При слабом ветре каждый поворот теряет скорость. Плавность важнее резкости.',
    hintEn: 'In light wind every tack loses speed. Smoothness over aggression.',
    hintPl: 'Przy słabym wietrze każdy zwrot kosztuje prędkość. Płynność jest ważniejsza niż gwałtowność.',
    hintEs: 'Con viento flojo cada virada cuesta velocidad. Mejor suave que brusco.',
    hintFr: 'Par vent faible, chaque virement coûte de la vitesse. Mieux vaut la douceur que la brusquerie.',
    hintDe: 'Bei Leichtwind kostet jede Wende Fahrt. Gefühlvoll statt ruppig.',
    hintIt: 'Con vento leggero ogni virata fa perdere velocità. Meglio movimenti fluidi che bruschi.',
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

// MissionLang accepts any enabled language; `pick()` returns the string for
// that language (RU, EN, PL positional, ES/FR/DE/IT from the 4th argument).
import type { Lang } from '@/lib/languages';
export type MissionLang = Lang;

/** Evaluate whether all mission constraints passed given race metrics. */
export function evaluateMission(mission: Mission, metrics: RaceMetrics, lang: MissionLang = 'ru'): MissionResult {
  const reasons: string[] = [];
  let passed = true;

  // These evaluation strings are hardcoded (not mission rows), so each call
  // carries all seven languages: RU / EN / PL positional plus ES / FR / DE / IT.
  const pick = (ru: string, en: string, pl: string, x: { es: string; fr: string; de: string; it: string }) => {
    if (lang === 'ru') return ru;
    if (lang === 'pl') return pl;
    if (lang === 'es' || lang === 'fr' || lang === 'de' || lang === 'it') return x[lang];
    return en;
  };
  // Decimal comma for every language except English.
  const dec = (n: number) => n.toFixed(1).replace('.', ',');

  if (metrics.finishTimeSec === null) {
    passed = false;
    reasons.push(pick('Не финишировал', 'Did not finish', 'Nie ukończono', {
      es: 'No has terminado',
      fr: 'Course non terminée',
      de: 'Nicht im Ziel',
      it: 'Regata non conclusa',
    }));
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
            `Czas ${dec(metrics.finishTimeSec)} s > ${c.value} s`,
            {
              es: `Tiempo ${dec(metrics.finishTimeSec)} s > ${c.value} s`,
              fr: `Temps ${dec(metrics.finishTimeSec)} s > ${c.value} s`,
              de: `Zeit ${dec(metrics.finishTimeSec)} s > ${c.value} s`,
              it: `Tempo ${dec(metrics.finishTimeSec)} s > ${c.value} s`,
            },
          ));
        }
        break;
      case 'no-no-go':
        if (metrics.noGoEntries > 0) {
          passed = false;
          reasons.push(pick(
            `Вошёл в мёртвую зону ${metrics.noGoEntries}×`,
            `Entered no-go zone ${metrics.noGoEntries}×`,
            `Wejścia w kąt martwy: ${metrics.noGoEntries}×`,
            {
              es: `Entradas en la zona muerta: ${metrics.noGoEntries}×`,
              fr: `Entrées dans la zone morte : ${metrics.noGoEntries}×`,
              de: `Im toten Winkel: ${metrics.noGoEntries}×`,
              it: `Ingressi nell'angolo morto: ${metrics.noGoEntries}×`,
            },
          ));
        }
        break;
      case 'max-tacks':
        if (metrics.tackCount > (c.value ?? Infinity)) {
          passed = false;
          reasons.push(pick(
            `Поворотов ${metrics.tackCount}, нужно ≤ ${c.value}`,
            `${metrics.tackCount} tacks, need ≤ ${c.value}`,
            `Zwrotów: ${metrics.tackCount}, dozwolone ≤ ${c.value}`,
            {
              es: `Viradas: ${metrics.tackCount}, máximo ${c.value}`,
              fr: `Virements : ${metrics.tackCount}, maximum ${c.value}`,
              de: `Wenden: ${metrics.tackCount}, erlaubt ≤ ${c.value}`,
              it: `Virate: ${metrics.tackCount}, massimo ${c.value}`,
            },
          ));
        }
        break;
      case 'min-top-speed':
        if (metrics.topSpeed < (c.value ?? 0)) {
          passed = false;
          reasons.push(pick(
            `Максимум ${metrics.topSpeed.toFixed(1)}, нужно ≥ ${c.value}`,
            `Peak ${metrics.topSpeed.toFixed(1)} kts, need ≥ ${c.value}`,
            `Maks. ${dec(metrics.topSpeed)} kn, potrzeba ≥ ${c.value}`,
            {
              es: `Máxima ${dec(metrics.topSpeed)} kn, se necesita ≥ ${c.value}`,
              fr: `Pointe à ${dec(metrics.topSpeed)} kn, il faut ≥ ${c.value}`,
              de: `Spitze ${dec(metrics.topSpeed)} kn, nötig ≥ ${c.value}`,
              it: `Massima ${dec(metrics.topSpeed)} kn, servono ≥ ${c.value}`,
            },
          ));
        }
        break;
    }
  }

  if (passed) reasons.push(pick('✓ Все условия выполнены', '✓ All constraints met', '✓ Wszystkie warunki spełnione', {
    es: '✓ Cumpliste todas las condiciones',
    fr: '✓ Toutes les conditions sont remplies',
    de: '✓ Alle Bedingungen erfüllt',
    it: '✓ Tutte le condizioni soddisfatte',
  }));
  return { mission, passed, reasons };
}
