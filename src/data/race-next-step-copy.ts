import type { Lang } from "../lib/languages";
import type { CoachGoalKind } from "../lib/fallback-coach";

/** Seven-language copy of the race menu's "next step" card (M4-6,
 * src/lib/race-next-step.ts) on the website lobby and the app's Race hub.
 * Only what the race measures: the coach's measured mistake of the last race
 * (no-go zone entries, too many tacks, a slow close-hauled beat), a finish
 * time, the days with a solo race on this device. The goals match the race
 * coach's own (src/lib/fallback-coach.ts goalFor) and, like all race copy,
 * state no no-go number: they point to the suggested course, which beats at
 * the race's best VMG angle (src/data/no-go-zone.ts, package 7). Gentle on
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
      body: w("В прошлой одиночной гонке яхта заходила в мёртвую зону и теряла ход. На лавировке держи рекомендуемый курс: он идет у самой ее границы.",
        "In your last solo race the boat sailed into the no-go zone and lost way. On the beat follow the suggested course: it runs right at its edge.",
        "W poprzednim wyścigu solo jacht wchodził w kąt martwy i tracił prędkość. Na halsówce trzymaj się sugerowanego kursu: prowadzi tuż przy jego granicy.",
        "En tu última regata individual el barco entró en la zona muerta y perdió velocidad. En la ceñida sigue el rumbo recomendado: va justo por su borde.",
        "Lors de ta dernière course solo, le bateau est entré dans la zone morte et a perdu de la vitesse. Au louvoyage, suis le cap conseillé : il longe son bord.",
        "In deinem letzten Einzelrennen geriet das Boot in den toten Winkel und verlor Fahrt. Folge an der Kreuz dem empfohlenen Kurs: Er führt direkt an seinem Rand entlang.",
        "Nell'ultima regata singola la barca è entrata nell'angolo morto e ha perso velocità. Di bolina segui la rotta consigliata: corre proprio al suo bordo."),
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
      body: w("В прошлой одиночной гонке бейдевинд был медленным. Держи рекомендуемый курс: это лучший угол к ветру для этой лодки, острее него она теряет скорость.",
        "In your last solo race the close-hauled legs were slow. Follow the suggested course: it is this boat's best angle to the wind, and higher than that she loses speed.",
        "W poprzednim wyścigu solo bajdewind był wolny. Trzymaj się sugerowanego kursu: to najlepszy kąt do wiatru dla tej łodzi, ostrzej traci ona prędkość.",
        "En tu última regata individual la ceñida fue lenta. Sigue el rumbo recomendado: es el mejor ángulo al viento de este barco, y más orzado pierde velocidad.",
        "Lors de ta dernière course solo, le près était lent. Suis le cap conseillé : c'est le meilleur angle au vent de ce bateau, et plus haut il perd de la vitesse.",
        "In deinem letzten Einzelrennen warst du am Wind langsam. Folge dem empfohlenen Kurs: Er ist der beste Winkel zum Wind für dieses Boot, höher verliert es Fahrt.",
        "Nell'ultima regata singola la bolina è stata lenta. Segui la rotta consigliata: è il miglior angolo al vento di questa barca, più stretta perde velocità."),
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
