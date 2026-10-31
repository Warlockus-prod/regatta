'use client';

import { useI18n } from "@/lib/i18n";
import { RACE_MODE_LABELS } from "@/app/game/race-mode-labels";

export function useLeaderboardCopy() {
  const { tl } = useI18n();
  const place = tl({ ru: "{n} место", en: "Place {n}", pl: "Miejsce {n}", es: "Puesto {n}", fr: "Place {n}", de: "Platz {n}", it: "Posizione {n}" });
  return {
    title: tl({ ru: "Таблица лучших", en: "Leaderboard", pl: "Ranking", es: "Clasificación", fr: "Classement", de: "Bestenliste", it: "Classifica" }),
    intro: tl({ ru: "Лучшее время каждой сессии. Обычный и Pro в отдельных таблицах.", en: "Best time per session. Simple and Pro have separate tables.", pl: "Najlepszy czas z każdej sesji. Prosty i Pro mają osobne tabele.", es: "El mejor tiempo de cada sesión. Sencillo y Pro tienen tablas separadas.", fr: "Meilleur temps par session. Simple et Pro ont des tableaux séparés.", de: "Beste Zeit pro Sitzung. Einfach und Pro haben getrennte Tabellen.", it: "Miglior tempo per sessione. Semplice e Pro hanno tabelle separate." }),
    raceType: tl({ ru: "Тип гонки", en: "Race type", pl: "Rodzaj wyścigu", es: "Tipo de regata", fr: "Type de course", de: "Rennart", it: "Tipo di regata" }),
    free: tl({ ru: "Свободная гонка", en: "Free race", pl: "Wolny wyścig", es: "Regata libre", fr: "Course libre", de: "Freies Rennen", it: "Regata libera" }),
    missions: tl({ ru: "Миссии", en: "Missions", pl: "Misje", es: "Misiones", fr: "Missions", de: "Missionen", it: "Missioni" }),
    controlMode: tl({ ru: "Режим управления", en: "Control mode", pl: "Tryb sterowania", es: "Modo de control", fr: "Mode de pilotage", de: "Steuermodus", it: "Modalità di controllo" }),
    simple: tl(RACE_MODE_LABELS.simple),
    pro: tl(RACE_MODE_LABELS.pro),
    difficulty: tl({ ru: "Сложность", en: "Difficulty", pl: "Poziom", es: "Dificultad", fr: "Difficulté", de: "Schwierigkeit", it: "Difficoltà" }),
    easy: tl({ ru: "Лёгкий", en: "Easy", pl: "Łatwy", es: "Fácil", fr: "Facile", de: "Leicht", it: "Facile" }),
    medium: tl({ ru: "Средний", en: "Medium", pl: "Średni", es: "Medio", fr: "Moyen", de: "Mittel", it: "Medio" }),
    hard: tl({ ru: "Сложный", en: "Hard", pl: "Trudny", es: "Difícil", fr: "Difficile", de: "Schwer", it: "Difficile" }),
    wind: tl({ ru: "Ветер", en: "Wind", pl: "Wiatr", es: "Viento", fr: "Vent", de: "Wind", it: "Vento" }),
    light: tl({ ru: "Слабый", en: "Light", pl: "Słaby", es: "Flojo", fr: "Faible", de: "Schwach", it: "Leggero" }),
    windMedium: tl({ ru: "Средний", en: "Medium", pl: "Średni", es: "Medio", fr: "Moyen", de: "Mittel", it: "Medio" }),
    heavy: tl({ ru: "Сильный", en: "Heavy", pl: "Silny", es: "Fuerte", fr: "Fort", de: "Stark", it: "Forte" }),
    mission: tl({ ru: "Миссия", en: "Mission", pl: "Misja", es: "Misión", fr: "Mission", de: "Mission", it: "Missione" }),
    missionNote: tl({ ru: "Миссии пока не записывают режим, поэтому Обычный и Pro здесь вместе.", en: "Missions do not record the mode yet, so Simple and Pro are together here.", pl: "Misje nie zapisują jeszcze trybu, więc Prosty i Pro są tu razem.", es: "Las misiones aún no registran el modo, así que Sencillo y Pro van juntos.", fr: "Les missions n'enregistrent pas encore le mode : Simple et Pro sont donc ensemble ici.", de: "Missionen erfassen den Modus noch nicht, daher stehen Einfach und Pro hier zusammen.", it: "Le missioni non registrano ancora la modalità, quindi Semplice e Pro sono insieme." }),
    unrecordedTitle: tl({ ru: "Результаты без записанного режима", en: "Results without a recorded mode", pl: "Wyniki bez zapisanego trybu", es: "Resultados sin modo registrado", fr: "Résultats sans mode enregistré", de: "Ergebnisse ohne erfassten Modus", it: "Risultati senza modalità registrata" }),
    unrecordedNote: tl({ ru: "Для этих гонок режим не записан, поэтому Обычный и Pro здесь вместе.", en: "These races have no recorded mode, so Simple and Pro are together here.", pl: "Te wyścigi nie mają zapisanego trybu, więc Prosty i Pro są tu razem.", es: "Estas regatas no tienen modo registrado, así que Sencillo y Pro van juntos.", fr: "Ces courses n'ont pas de mode enregistré : Simple et Pro sont donc ensemble ici.", de: "Für diese Rennen ist kein Modus erfasst, daher stehen Einfach und Pro hier zusammen.", it: "Per queste regate la modalità non è registrata, quindi Semplice e Pro sono insieme." }),
    loading: tl({ ru: "Загружаю...", en: "Loading...", pl: "Ładowanie...", es: "Cargando...", fr: "Chargement...", de: "Wird geladen...", it: "Caricamento..." }),
    empty: tl({ ru: "Пока никто не финишировал. Стань первым!", en: "No results yet. Be the first!", pl: "Nikt jeszcze nie dopłynął do mety. Bądź pierwszy!", es: "Aún no hay resultados. ¡Sé el primero!", fr: "Pas encore de résultats. Sois le premier !", de: "Noch keine Ergebnisse. Sei der Erste!", it: "Ancora nessun risultato. Sii il primo!" }),
    toRace: tl({ ru: "К гонке", en: "To the race", pl: "Do regat", es: "A la regata", fr: "Vers la course", de: "Zum Rennen", it: "Alla regata" }),
    back: tl({ ru: "Назад к гонке", en: "Back to race", pl: "Powrót do wyścigu", es: "Volver a la regata", fr: "Retour à la course", de: "Zurück zum Rennen", it: "Torna alla regata" }),
    you: tl({ ru: "ты", en: "you", pl: "ty", es: "tú", fr: "toi", de: "du", it: "tu" }),
    score: tl({ ru: "оценка", en: "score", pl: "ocena", es: "puntuación", fr: "note", de: "Bewertung", it: "punteggio" }),
    penalties: tl({ ru: "штрафы", en: "penalties", pl: "kary", es: "penalizaciones", fr: "pénalités", de: "Strafen", it: "penalità" }),
    place: (n: number) => place.replace("{n}", String(n)),
  };
}
export type LeaderboardCopy = ReturnType<typeof useLeaderboardCopy>;
