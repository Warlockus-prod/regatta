import type { Lang } from "../lib/languages";
import type { CoachGoalKind } from "../lib/fallback-coach";

/** Seven-language copy of the race menu's "next step" card (M4-6,
 * src/lib/race-next-step.ts) on the website lobby and the app's Race hub.
 * Only what the race measures: the coach's measured mistake of the last race
 * (no-go zone entries, too many tacks, a slow close-hauled beat), a finish
 * time, the days with a solo race on this device. The numbers in the goals are
 * the race coach's own (src/lib/fallback-coach.ts goalFor). Gentle on
 * purpose: a count of days, never a streak, never "you missed". {course} is
 * the level and the wind, {time} a race time like 1:42. Relative imports:
 * the app reads it through Metro. */
export type NextStepText = Record<Lang, string>;
const w = (ru: string, en: string, pl: string, es: string, fr: string, de: string, it: string): NextStepText => ({ ru, en, pl, es, fr, de, it });

export const raceNextStepCopy = {
  eyebrow: w("Следующий шаг", "Next step", "Następny krok", "Siguiente paso", "Prochaine étape", "Nächster Schritt", "Prossimo passo"),
  goal: {
    "no-go": {
      title: w("Держись вне мёртвой зоны", "Stay out of the no-go zone", "Trzymaj się poza kątem martwym", "Mantente fuera de la zona muerta",
        "Reste hors de la zone morte", "Bleib aus dem toten Winkel", "Resta fuori dall'angolo morto"),
      body: w("В прошлой одиночной гонке яхта заходила в мёртвую зону и теряла ход. На лавировке держи не меньше 40° к ветру.",
        "In your last solo race the boat sailed into the no-go zone and lost way. When beating, keep at least 40° to the wind.",
        "W poprzednim wyścigu solo jacht wchodził w kąt martwy i tracił prędkość. Na halsówce trzymaj co najmniej 40° do wiatru.",
        "En tu última regata individual el barco entró en la zona muerta y perdió velocidad. En ceñida, mantén al menos 40° respecto al viento.",
        "Lors de ta dernière course solo, le bateau est entré dans la zone morte et a perdu de la vitesse. Au louvoyage, garde au moins 40° du vent.",
        "In deinem letzten Einzelrennen geriet das Boot in den toten Winkel und verlor Fahrt. Halte beim Kreuzen mindestens 40° zum Wind.",
        "Nell'ultima regata singola la barca è entrata nell'angolo morto e ha perso velocità. Di bolina tieni almeno 40° dal vento."),
    },
    tacks: {
      title: w("Меньше поворотов на лавировке", "Fewer tacks on the beat", "Mniej zwrotów na halsówce", "Menos viradas en la ceñida",
        "Moins de virements au louvoyage", "Weniger Wenden beim Kreuzen", "Meno virate di bolina"),
      body: w("В прошлой одиночной гонке ты поворачивал слишком часто, а каждый поворот оверштаг стоит скорости. До верхнего знака хватит 2-4 галсов.",
        "In your last solo race you tacked too often, and every tack costs speed. 2-4 legs up to the windward mark are enough.",
        "W poprzednim wyścigu solo zbyt często robiłeś zwrot przez sztag, a każdy zwrot kosztuje prędkość. Do znaku nawietrznego wystarczą 2-4 halsy.",
        "En tu última regata individual viraste demasiadas veces, y cada virada por avante cuesta velocidad. Hasta la baliza de barlovento bastan 2-4 bordos.",
        "Lors de ta dernière course solo, tu as viré trop souvent, et chaque virement de bord coûte de la vitesse. Jusqu'à la bouée au vent, 2-4 bords suffisent.",
        "In deinem letzten Einzelrennen hast du zu oft gewendet, und jede Wende kostet Fahrt. Bis zur Luvtonne reichen 2-4 Schläge.",
        "Nell'ultima regata singola hai virato troppo spesso, e ogni virata costa velocità. Fino alla boa di bolina bastano 2-4 bordi."),
    },
    "close-hauled": {
      title: w("Быстрее в бейдевинд", "Faster close-hauled", "Szybciej na bajdewindzie", "Más rápido en ceñida",
        "Plus vite au près", "Schneller am Wind", "Più veloce di bolina"),
      body: w("В прошлой одиночной гонке бейдевинд был медленным. Уваливайся на 5-10°, пока не пойдёшь быстрее 4,5 уз.",
        "In your last solo race the close-hauled legs were slow. Bear away 5-10° until you sail faster than 4.5 kn.",
        "W poprzednim wyścigu solo bajdewind był wolny. Odpadnij o 5-10°, aż popłyniesz szybciej niż 4,5 kn.",
        "En tu última regata individual la ceñida fue lenta. Arriba 5-10° hasta ir a más de 4,5 kn.",
        "Lors de ta dernière course solo, le près était lent. Abats de 5-10° jusqu'à dépasser 4,5 nœuds.",
        "In deinem letzten Einzelrennen warst du am Wind langsam. Fall 5-10° ab, bis du schneller als 4,5 kn segelst.",
        "Nell'ultima regata singola la bolina è stata lenta. Poggia di 5-10° finché non superi i 4,5 nodi."),
    },
  } satisfies Record<CoachGoalKind, { title: NextStepText; body: NextStepText }>,
  /** The daily card's line and the daily entry's caption. */
  dailyToday: w("Сегодня: {course}", "Today: {course}", "Dziś: {course}", "Hoy: {course}", "Aujourd'hui : {course}", "Heute: {course}", "Oggi: {course}"),
  /** The daily card's secondary link. */
  dailyGo: w("К гонке дня", "Go to the daily race", "Przejdź do regat dnia", "Ir a la regata del día", "Aller à la course du jour", "Zum Tagesrennen", "Vai alla regata del giorno"),
  record: w("Рекорд на этой трассе: {time}", "Record on this course: {time}", "Rekord na tej trasie: {time}", "Récord en este recorrido: {time}",
    "Record sur ce parcours : {time}", "Rekord auf dieser Bahn: {time}", "Record su questo percorso: {time}"),
  medals: w("Трасс с медалью: {won} из {total}", "Courses with a medal: {won} of {total}", "Trasy z medalem: {won} z {total}",
    "Recorridos con medalla: {won} de {total}", "Parcours avec médaille : {won} sur {total}", "Bahnen mit Medaille: {won} von {total}",
    "Percorsi con medaglia: {won} su {total}"),
  /** Shown only from one day up: zero is no line, never "you missed". The
   * row counts the solo race only (useRaceLoop writes it, the multiplayer
   * race does not), so the line and the goals say "solo race", the
   * catalog's own name (src/lib/product/catalog.ts). */
  week: w("Дней с одиночной гонкой на этой неделе: {n}", "Days with a solo race this week: {n}", "Dni z wyścigiem solo w tym tygodniu: {n}",
    "Días con regata individual esta semana: {n}", "Jours de course solo cette semaine : {n}", "Tage mit Einzelrennen diese Woche: {n}",
    "Giorni con una regata singola questa settimana: {n}"),
} as const;
