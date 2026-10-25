'use client';

import { useI18n } from "@/lib/i18n";

export function useRaceNavigationCopy() {
  const { tl } = useI18n();
  return {
    map: tl({ ru: "Карта трассы", en: "Course map", pl: "Mapa trasy", es: "Mapa del recorrido", fr: "Carte du parcours", de: "Kurskarte", it: "Mappa del percorso" }),
    north: tl({ ru: "Север", en: "North", pl: "Północ", es: "Norte", fr: "Nord", de: "Nord", it: "Nord" }),
    northShort: tl({ ru: "С", en: "N", pl: "N", es: "N", fr: "N", de: "N", it: "N" }),
    start: tl({ ru: "Старт", en: "Start", pl: "Start", es: "Salida", fr: "Départ", de: "Start", it: "Partenza" }),
    finish: tl({ ru: "Финиш", en: "Finish", pl: "Meta", es: "Llegada", fr: "Arrivée", de: "Ziel", it: "Arrivo" }),
    marks: tl({ ru: "Знак", en: "Mark", pl: "Znak", es: "Baliza", fr: "Marque", de: "Tonne", it: "Boa" }),
    windFrom: tl({ ru: "Откуда ветер", en: "Wind from", pl: "Wiatr z", es: "Viento desde", fr: "Vent venant de", de: "Wind aus", it: "Vento da" }),
    empty: tl({ ru: "Карта появится, когда будут доступны данные трассы.", en: "The map appears when course data is available.", pl: "Mapa pojawi się, gdy będą dostępne dane trasy.", es: "El mapa aparecerá cuando haya datos del recorrido.", fr: "La carte apparaît lorsque les données du parcours sont disponibles.", de: "Die Karte erscheint, sobald Kursdaten vorliegen.", it: "La mappa appare quando i dati del percorso sono disponibili." }),
    wind: tl({ ru: "Ветер", en: "Wind", pl: "Wiatr", es: "Viento", fr: "Vent", de: "Wind", it: "Vento" }),
    trueWind: tl({ ru: "Истинный ветер", en: "True wind", pl: "Wiatr prawdziwy", es: "Viento real", fr: "Vent réel", de: "Wahrer Wind", it: "Vento reale" }),
    apparentWind: tl({ ru: "Вымпельный ветер", en: "Apparent wind", pl: "Wiatr pozorny", es: "Viento aparente", fr: "Vent apparent", de: "Scheinbarer Wind", it: "Vento apparente" }),
    heading: tl({ ru: "Курс лодки", en: "Boat heading", pl: "Kurs jachtu", es: "Rumbo del barco", fr: "Cap du bateau", de: "Bootskurs", it: "Prua della barca" }),
    twa: tl({ ru: "Угол к ветру", en: "Angle to wind", pl: "Kąt do wiatru", es: "Ángulo al viento", fr: "Angle au vent", de: "Winkel zum Wind", it: "Angolo al vento" }),
    windDisplay: tl({ ru: "Отображение ветра", en: "Wind display", pl: "Widok wiatru", es: "Vista del viento", fr: "Affichage du vent", de: "Windanzeige", it: "Vista del vento" }),
    compass: tl({ ru: "Компас", en: "Compass", pl: "Kompas", es: "Brújula", fr: "Compas", de: "Kompass", it: "Bussola" }),
    arrows: tl({ ru: "Стрелки ветра", en: "Wind arrows", pl: "Strzałki wiatru", es: "Flechas del viento", fr: "Flèches du vent", de: "Windpfeile", it: "Frecce del vento" }),
    both: tl({ ru: "Оба вида", en: "Both", pl: "Oba widoki", es: "Ambos", fr: "Les deux", de: "Beides", it: "Entrambi" }),
    off: tl({ ru: "Без подсказки", en: "No visual aid", pl: "Bez wskazówki", es: "Sin ayuda visual", fr: "Sans aide visuelle", de: "Ohne visuelle Hilfe", it: "Senza aiuto visivo" }),
    windNote: tl({ ru: "Компас ориентирован на север и показывает истинный ветер. Стрелки показывают поток воздуха относительно лодки.", en: "The compass is north-up and shows true wind. The arrows show airflow relative to the boat.", pl: "Kompas jest zorientowany na północ i pokazuje wiatr prawdziwy. Strzałki pokazują przepływ powietrza względem jachtu.", es: "La brújula está orientada al norte y muestra el viento real. Las flechas muestran el flujo de aire respecto al barco.", fr: "Le compas est orienté au nord et indique le vent réel. Les flèches montrent le flux d'air par rapport au bateau.", de: "Der Kompass ist nach Norden ausgerichtet und zeigt den wahren Wind. Die Pfeile zeigen den Luftstrom relativ zum Boot.", it: "La bussola è orientata a nord e mostra il vento reale. Le frecce mostrano il flusso d'aria rispetto alla barca." }),
    unknown: tl({ ru: "Нет данных", en: "Unavailable", pl: "Brak danych", es: "Sin datos", fr: "Indisponible", de: "Keine Daten", it: "Non disponibile" }),
    knots: tl({ ru: "уз", en: "kn", pl: "w.", es: "kn", fr: "nd", de: "kn", it: "kn" }),
  };
}
