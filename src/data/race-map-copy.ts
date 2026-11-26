// The big race map (F3): the overlay over the race scene and the replay.
// Terms: scripts/sailing-glossary.md ("north-up compass", port / starboard
// side); "bow up" matches the wind instrument's note ("Нос наверху").

export const RACE_MAP_COPY = {
  close: { ru: "Закрыть карту", en: "Close map", pl: "Zamknij mapę", es: "Cerrar el mapa", fr: "Fermer la carte", de: "Karte schließen", it: "Chiudi la mappa" },
  orientation: { ru: "Ориентация карты", en: "Map orientation", pl: "Orientacja mapy", es: "Orientación del mapa", fr: "Orientation de la carte", de: "Kartenausrichtung", it: "Orientamento della mappa" },
  northUp: { ru: "Север наверху", en: "North up", pl: "Północ u góry", es: "Norte arriba", fr: "Nord en haut", de: "Norden oben", it: "Nord in alto" },
  headingUp: { ru: "Нос наверху", en: "Bow up", pl: "Dziób u góry", es: "Proa arriba", fr: "Avant en haut", de: "Bug oben", it: "Prua in alto" },
  zoom: { ru: "Масштаб карты", en: "Map zoom", pl: "Skala mapy", es: "Zoom del mapa", fr: "Zoom de la carte", de: "Kartenzoom", it: "Zoom della mappa" },
  zoomIn: { ru: "Приблизить", en: "Zoom in", pl: "Przybliż", es: "Acercar", fr: "Zoomer", de: "Vergrößern", it: "Ingrandisci" },
  zoomOut: { ru: "Отдалить", en: "Zoom out", pl: "Oddal", es: "Alejar", fr: "Dézoomer", de: "Verkleinern", it: "Riduci" },
  fit: { ru: "Вся трасса", en: "Whole course", pl: "Cała trasa", es: "Todo el recorrido", fr: "Tout le parcours", de: "Ganzer Kurs", it: "Tutto il percorso" },
  track: { ru: "Твой след", en: "Your track", pl: "Twój ślad", es: "Tu rastro", fr: "Ta trace", de: "Deine Spur", it: "La tua scia" },
  route: { ru: "Подсказка маршрута", en: "Route hint", pl: "Wskazówka trasy", es: "Ruta sugerida", fr: "Route conseillée", de: "Routenhinweis", it: "Rotta suggerita" },
  roundPort: { ru: "Оставить знак слева (левым бортом)", en: "Leave the mark to port", pl: "Zostaw znak z lewej burty", es: "Deja la baliza por babor", fr: "Laisse la bouée à bâbord", de: "Bahnmarke an Backbord lassen", it: "Lascia la boa a sinistra" },
  roundStarboard: { ru: "Оставить знак справа (правым бортом)", en: "Leave the mark to starboard", pl: "Zostaw znak z prawej burty", es: "Deja la baliza por estribor", fr: "Laisse la bouée à tribord", de: "Bahnmarke an Steuerbord lassen", it: "Lascia la boa a dritta" },
  raceRunning: { ru: "Гонка идет: лодкой можно управлять и с открытой картой.", en: "The race keeps going: you can steer with the map open.", pl: "Wyścig trwa: możesz sterować przy otwartej mapie.", es: "La regata sigue: puedes gobernar con el mapa abierto.", fr: "La course continue : tu peux barrer avec la carte ouverte.", de: "Das Rennen läuft weiter: Du kannst bei offener Karte steuern.", it: "La regata continua: puoi timonare con la mappa aperta." },
  // The same words as the race cockpit (app/game/race-copy.ts), for the replay's map.
  you: { ru: "Ты", en: "You", pl: "Ty", es: "Tú", fr: "Toi", de: "Du", it: "Tu" },
  fleet: { ru: "Флот", en: "Fleet", pl: "Flota", es: "Flota", fr: "Flotte", de: "Flotte", it: "Flotta" },
} as const;
