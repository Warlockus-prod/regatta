// M1-4 finish and result: the pure numbers and the 7-language copy of the
// solo race result screen (RaceResults.tsx) and the finish place plate
// (RaceFinishPlate.tsx). Pure: no React, so the order of facts and the wording
// are unit-tested without a renderer.

import type { Lang } from "@/lib/languages";
import type { BestRecord } from "@/lib/best-times";
import { formatTime, type RaceResultRow } from "./race-model";

type Copy = Record<Lang, string>;

export interface FinishSummary {
  finished: boolean;
  /** 1-based place among all boats; 0 when the player is not in the results. */
  place: number;
  total: number;
  /** Penalty-adjusted finish time (the same number the fleet table shows). */
  time: number | null;
  /** Seconds behind the winner when the player is not first. */
  behindWinner: number | null;
  winnerName: string | null;
  /** Seconds ahead of the second finisher when the player won. */
  aheadOfSecond: number | null;
  /** Time minus the stored record (positive: slower). Null on a new record,
   * without a record, or without a finish. */
  recordDelta: number | null;
  recordTime: number | null;
  newRecord: boolean;
}

/** The facts of the result screen, in its order: place and time, gap to the
 * winner, difference to the player's record. */
export function summariseFinish(results: readonly RaceResultRow[], bestRecord: BestRecord | null, isNewRecord: boolean): FinishSummary {
  const index = results.findIndex((r) => r.isPlayer);
  const player = index >= 0 ? results[index] : undefined;
  const finished = player !== undefined && Number.isFinite(player.time);
  const place = index + 1;
  const time = finished ? player!.time : null;
  const winner = results[0];
  const second = results[1];
  const won = finished && place === 1;
  // M5: an estimated time ("~") places a boat but never makes a gap line.
  const behindWinner = finished && !won && winner && Number.isFinite(winner.time) && !winner.estimated ? Math.max(0, time! - winner.time) : null;
  const aheadOfSecond = won && second && Number.isFinite(second.time) && !second.estimated ? Math.max(0, second.time - time!) : null;
  const newRecord = finished && isNewRecord;
  const recordDelta = finished && !newRecord && bestRecord ? time! - bestRecord.timeSec : null;
  return {
    finished, place: Math.max(0, place), total: results.length, time,
    behindWinner, winnerName: behindWinner === null ? null : winner.name,
    aheadOfSecond, recordDelta, recordTime: recordDelta === null ? null : bestRecord!.timeSec, newRecord,
  };
}

const SECONDS_UNIT: Copy = { ru: "с", en: "s", pl: "s", es: "s", fr: "s", de: "s", it: "s" };

/** A gap in seconds with the language's decimal mark ("3.5 s", "3,5 с"); a gap
 * of a minute or more reads as race time (1:12.4). */
export function formatGapSeconds(seconds: number, lang: Lang): string {
  const abs = Math.abs(seconds);
  if (abs >= 60) return formatTime(abs);
  const number = new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Math.round(abs * 10) / 10);
  return `${number} ${SECONDS_UNIT[lang]}`;
}

function englishOrdinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th"}`;
}

/** The place as a race result reads in each language: "2nd", "2. miejsce". */
export function placeOrdinal(place: number, lang: Lang): string {
  switch (lang) {
    case "ru": return `${place} место`;
    case "en": return englishOrdinal(place);
    case "pl": return `${place}. miejsce`;
    case "es": return `Puesto ${place}`;
    case "fr": return `${place}${place === 1 ? "re" : "e"} place`;
    case "de": return `Platz ${place}`;
    case "it": return `${place}° posto`;
  }
}

/** Replaces {name} placeholders. */
export function fillFinish(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (all, key: string) => values[key] ?? all);
}

export const FINISH_COPY = {
  finish: { ru: "Финиш", en: "Finish", pl: "Meta", es: "Llegada", fr: "Arrivée", de: "Ziel", it: "Arrivo" },
  of: { ru: "из {n}", en: "of {n}", pl: "z {n}", es: "de {n}", fr: "sur {n}", de: "von {n}", it: "su {n}" },
  won: { ru: "Победа", en: "You won", pl: "Wygrana", es: "Has ganado", fr: "Victoire", de: "Gewonnen", it: "Hai vinto" },
  aheadOfSecond: {
    ru: "Победа, отрыв от второго места {gap}", en: "You won, {gap} ahead of second place", pl: "Wygrana, {gap} przewagi nad drugim miejscem",
    es: "Has ganado, {gap} por delante del segundo", fr: "Victoire, {gap} d'avance sur le deuxième", de: "Gewonnen, {gap} vor dem Zweiten",
    it: "Hai vinto, {gap} di vantaggio sul secondo",
  },
  behindWinner: {
    ru: "+{gap} от победителя ({name})", en: "+{gap} behind the winner ({name})", pl: "+{gap} straty do zwycięzcy ({name})",
    es: "+{gap} respecto al ganador ({name})", fr: "+{gap} sur le vainqueur ({name})", de: "+{gap} hinter dem Sieger ({name})",
    it: "+{gap} dal vincitore ({name})",
  },
  newRecord: { ru: "Новый рекорд", en: "New record", pl: "Nowy rekord", es: "Nuevo récord", fr: "Nouveau record", de: "Neuer Rekord", it: "Nuovo record" },
  slowerThanRecord: {
    ru: "+{gap} к твоему рекорду ({record})", en: "+{gap} off your record ({record})", pl: "+{gap} do twojego rekordu ({record})",
    es: "+{gap} respecto a tu récord ({record})", fr: "+{gap} sur ton record ({record})", de: "+{gap} über deinem Rekord ({record})",
    it: "+{gap} dal tuo record ({record})",
  },
  fasterThanRecord: {
    ru: "На {gap} быстрее твоего рекорда ({record})", en: "{gap} faster than your record ({record})", pl: "{gap} szybciej niż twój rekord ({record})",
    es: "{gap} más rápido que tu récord ({record})", fr: "{gap} plus rapide que ton record ({record})", de: "{gap} schneller als dein Rekord ({record})",
    it: "{gap} più veloce del tuo record ({record})",
  },
  equalRecord: {
    ru: "Ровно твой рекорд ({record})", en: "Exactly your record ({record})", pl: "Dokładnie twój rekord ({record})",
    es: "Igual que tu récord ({record})", fr: "Pile ton record ({record})", de: "Genau dein Rekord ({record})", it: "Esattamente il tuo record ({record})",
  },
  mainMistake: {
    ru: "Главное, что исправить", en: "The one thing to fix", pl: "Najważniejsze do poprawy", es: "Lo principal que corregir",
    fr: "Le point à corriger", de: "Das Wichtigste zum Verbessern", it: "La cosa principale da correggere",
  },
  aiCaption: {
    ru: "Совет ИИ-тренера, может ошибаться", en: "From the AI coach, can be wrong", pl: "Od trenera AI, może się mylić",
    es: "Del entrenador IA, puede equivocarse", fr: "Du coach IA, peut se tromper", de: "Vom KI-Trainer, kann sich irren", it: "Dal coach IA, può sbagliare",
  },
  nextGoal: { ru: "Следующая цель", en: "Next goal", pl: "Następny cel", es: "Próximo objetivo", fr: "Prochain objectif", de: "Nächstes Ziel", it: "Prossimo obiettivo" },
  again: { ru: "Еще раз", en: "Again", pl: "Jeszcze raz", es: "Otra vez", fr: "Rejouer", de: "Noch mal", it: "Di nuovo" },
  judge: { ru: "Судья", en: "Judge", pl: "Sędzia", es: "Juez", fr: "Juge", de: "Schiedsrichter", it: "Giudice" },
  fleet: { ru: "Результаты флота", en: "Fleet results", pl: "Wyniki floty", es: "Resultados de la flota", fr: "Résultats de la flotte", de: "Ergebnisse der Flotte", it: "Risultati della flotta" },
  share: { ru: "Поделиться повтором", en: "Share the replay", pl: "Udostępnij powtórkę", es: "Compartir la repetición", fr: "Partager le replay", de: "Wiederholung teilen", it: "Condividi il replay" },
  // Did not finish: what happened and one thing to try, without blame.
  dnfTitle: { ru: "Время вышло", en: "Time ran out", pl: "Czas minął", es: "Se acabó el tiempo", fr: "Temps écoulé", de: "Zeit abgelaufen", it: "Tempo scaduto" },
  dnfBeforeMark: {
    ru: "Гонка закрылась до того, как ты обогнул верхний знак.", en: "The race closed before you rounded the windward mark.",
    pl: "Wyścig zamknięto przed opłynięciem znaku nawietrznego.", es: "La regata se cerró antes de que rodearas la baliza de barlovento.",
    fr: "La course s'est terminée avant que tu contournes la bouée au vent.", de: "Das Rennen wurde beendet, bevor du die Luvtonne gerundet hattest.",
    it: "La regata si è chiusa prima che girassi la boa di bolina.",
  },
  dnfAfterMark: {
    ru: "Ты уже обогнул верхний знак, но гонка закрылась до финиша.", en: "You had rounded the windward mark, but the race closed before your finish.",
    pl: "Znak nawietrzny był już opłynięty, ale wyścig zamknięto przed twoją metą.", es: "Ya habías rodeado la baliza de barlovento, pero la regata se cerró antes de tu llegada.",
    fr: "Tu avais contourné la bouée au vent, mais la course s'est terminée avant ton arrivée.", de: "Du hattest die Luvtonne schon gerundet, aber das Rennen endete vor deinem Zieldurchgang.",
    it: "Avevi già girato la boa di bolina, ma la regata si è chiusa prima del tuo arrivo.",
  },
  dnfGeneric: {
    ru: "Гонка закрылась до того, как ты пересек финиш.", en: "The race closed before you crossed the finish line.",
    pl: "Wyścig zamknięto przed przekroczeniem linii mety.", es: "La regata se cerró antes de que cruzaras la línea de llegada.",
    fr: "La course s'est terminée avant que tu franchisses la ligne d'arrivée.", de: "Das Rennen wurde beendet, bevor du die Ziellinie überquert hattest.",
    it: "La regata si è chiusa prima che tagliassi il traguardo.",
  },
  dnfEncourage: {
    ru: "Так заканчиваются многие первые гонки. Для следующей попытки хватит одной поправки.",
    en: "Many first races end this way. One change is enough for the next try.",
    pl: "Tak kończy się wiele pierwszych wyścigów. Na następną próbę wystarczy jedna poprawka.",
    es: "Así terminan muchas primeras regatas. Para el próximo intento basta con un cambio.",
    fr: "Beaucoup de premières courses finissent ainsi. Pour le prochain essai, un seul changement suffit.",
    de: "So enden viele erste Rennen. Für den nächsten Versuch reicht eine Änderung.",
    it: "Molte prime regate finiscono così. Per il prossimo tentativo basta una modifica.",
  },
  dnfTry: { ru: "Попробуй в следующий раз", en: "One thing to try", pl: "Spróbuj następnym razem", es: "Una cosa que probar", fr: "Une chose à essayer", de: "Probier beim nächsten Mal", it: "Una cosa da provare" },
  dnfTipBeforeMark: {
    ru: "Иди в бейдевинд, примерно 45 градусов к ветру, и делай поворот оверштаг, когда знак окажется на траверзе.",
    en: "Sail close-hauled, about 45 degrees off the wind, and tack when the mark is abeam.",
    pl: "Płyń bajdewindem, około 45 stopni do wiatru, i zrób zwrot przez sztag, gdy znak będzie na trawersie.",
    es: "Navega en ceñida, a unos 45 grados del viento, y vira por avante cuando la baliza esté por el través.",
    fr: "Navigue au près, à environ 45 degrés du vent, et vire de bord quand la bouée est par le travers.",
    de: "Segle hoch am Wind, etwa 45 Grad zum Wind, und wende, wenn die Bahnmarke querab ist.",
    it: "Naviga di bolina, a circa 45 gradi dal vento, e vira quando la boa è al traverso.",
  },
  dnfTipAfterMark: {
    ru: "После знака уваливайся до бакштага и держи нос на финишную линию.",
    en: "After the mark, bear away to a broad reach and point the bow at the finish line.",
    pl: "Po znaku odpadnij do baksztagu i trzymaj dziób na linię mety.",
    es: "Después de la baliza, arriba hasta un largo y apunta la proa a la línea de llegada.",
    fr: "Après la bouée, abats jusqu'au grand largue et pointe l'étrave vers la ligne d'arrivée.",
    de: "Fall nach der Bahnmarke auf Raumschotskurs ab und halte den Bug auf die Ziellinie.",
    it: "Dopo la boa, poggia fino al lasco e punta la prua verso il traguardo.",
  },
  dnfTipGeneric: {
    ru: "Держи паруса наполненными: если лодка тормозит, уваливайся, пока она не разгонится, и только потом иди к следующему знаку.",
    en: "Keep the sails full: if the boat slows, bear away until it picks up speed, then head for the next mark.",
    pl: "Trzymaj żagle pełne: gdy łódź zwalnia, odpadnij, aż nabierze prędkości, i dopiero wtedy płyń do następnego znaku.",
    es: "Mantén las velas llenas: si el barco frena, arriba hasta que coja velocidad y luego ve a la siguiente baliza.",
    fr: "Garde les voiles pleines : si le bateau ralentit, abats jusqu'à ce qu'il reprenne de la vitesse, puis va vers la bouée suivante.",
    de: "Halte die Segel voll: Wird das Boot langsamer, fall ab, bis es wieder Fahrt aufnimmt, und steuere dann die nächste Bahnmarke an.",
    it: "Tieni le vele piene: se la barca rallenta, poggia finché riprende velocità, poi dirigi verso la boa successiva.",
  },
} as const satisfies Record<string, Copy>;

/** Where the player was when a timeout closed the race: 0 before the
 * windward mark, 1 after it, null when unknown. */
export function dnfStage(lapDone: number | undefined): 0 | 1 | null {
  if (lapDone === undefined) return null;
  return lapDone >= 1 ? 1 : 0;
}
