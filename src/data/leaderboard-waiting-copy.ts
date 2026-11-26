import { LEADERBOARD_MIN_RECORDS } from "../lib/leaderboard-visibility";

type Label = Record<"ru" | "en" | "pl" | "es" | "fr" | "de" | "it", string>;

// What a board with too few results says instead of the table, on the site and in the app.
export const LEADERBOARD_WAITING_COPY: { title: Label; count: Label; yourBest: Label; noBest: Label; ghost: Label; anonymous: Label } = {
  title: {
    ru: `Результаты гонок откроются, когда их наберется ${LEADERBOARD_MIN_RECORDS}`,
    en: `The leaderboard opens at ${LEADERBOARD_MIN_RECORDS} results`,
    pl: `Ranking otworzy się przy ${LEADERBOARD_MIN_RECORDS} wynikach`,
    es: `La clasificación se abre con ${LEADERBOARD_MIN_RECORDS} resultados`,
    fr: `Le classement s'ouvre à ${LEADERBOARD_MIN_RECORDS} résultats`,
    de: `Die Bestenliste öffnet ab ${LEADERBOARD_MIN_RECORDS} Ergebnissen`,
    it: `La classifica si apre con ${LEADERBOARD_MIN_RECORDS} risultati`,
  },
  count: { ru: "Сейчас результатов: {n}", en: "Results so far: {n}", pl: "Wyników do tej pory: {n}", es: "Resultados por ahora: {n}", fr: "Résultats pour l'instant : {n}", de: "Ergebnisse bisher: {n}", it: "Risultati finora: {n}" },
  yourBest: { ru: "Твой лучший результат", en: "Your best result", pl: "Twój najlepszy wynik", es: "Tu mejor resultado", fr: "Ton meilleur résultat", de: "Dein bestes Ergebnis", it: "Il tuo miglior risultato" },
  noBest: { ru: "Твоего результата здесь пока нет.", en: "You have no result here yet.", pl: "Nie masz tu jeszcze wyniku.", es: "Aún no tienes resultado aquí.", fr: "Tu n'as pas encore de résultat ici.", de: "Du hast hier noch kein Ergebnis.", it: "Non hai ancora un risultato qui." },
  ghost: {
    ru: "Твоя лучшая гонка становится призраком: в следующей гонке он идет рядом с тобой.",
    en: "Your best race becomes a ghost: in the next race it sails beside you.",
    pl: "Twój najlepszy wyścig staje się duchem: w następnym płynie obok ciebie.",
    es: "Tu mejor regata se convierte en un fantasma: en la siguiente navega a tu lado.",
    fr: "Ta meilleure course devient un fantôme : à la suivante, il navigue à côté de toi.",
    de: "Dein bestes Rennen wird zum Geist: Im nächsten Rennen segelt er neben dir.",
    it: "La tua miglior regata diventa un fantasma: nella prossima naviga accanto a te.",
  },
  anonymous: { ru: "Моряк", en: "Sailor", pl: "Żeglarz", es: "Marinero", fr: "Marin", de: "Segler", it: "Velista" },
};
