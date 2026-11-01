'use client';

import { useI18n } from "@/lib/i18n";
import { RACE_UNITS } from "./units";

export function useRaceNavigationCopy() {
  const { tl } = useI18n();
  return {
    miniMapSetting: tl({ ru: "Мини-карта в углу", en: "Mini-map in the corner", pl: "Minimapa w rogu", es: "Minimapa en la esquina", fr: "Mini-carte dans le coin", de: "Minikarte in der Ecke", it: "Minimappa nell'angolo" }),
    openMap: tl({ ru: "Открыть карту трассы", en: "Open course map", pl: "Otwórz mapę trasy", es: "Abrir el mapa del recorrido", fr: "Ouvrir la carte du parcours", de: "Kurskarte öffnen", it: "Apri la mappa del percorso" }),
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
    relativeWind: tl({ ru: "Истинный угол к ветру (TWA) относительно носа", en: "True wind angle (TWA) relative to the bow", pl: "Kąt wiatru prawdziwego (TWA) względem dziobu", es: "Ángulo del viento real (TWA) respecto a la proa", fr: "Angle du vent réel (TWA) par rapport à l'avant", de: "Wahrer Windwinkel (TWA) relativ zum Bug", it: "Angolo del vento reale (TWA) rispetto alla prua" }),
    fromPort: tl({ ru: "С левого борта", en: "From port", pl: "Z lewej burty", es: "Por babor", fr: "De bâbord", de: "Von Backbord", it: "Da sinistra" }),
    fromStarboard: tl({ ru: "С правого борта", en: "From starboard", pl: "Z prawej burty", es: "Por estribor", fr: "De tribord", de: "Von Steuerbord", it: "Da dritta" }),
    fromBow: tl({ ru: "С носа", en: "From ahead", pl: "Od dziobu", es: "De proa", fr: "De l'avant", de: "Von vorn", it: "Da prua" }),
    fromStern: tl({ ru: "С кормы", en: "From astern", pl: "Od rufy", es: "De popa", fr: "De l'arrière", de: "Von achtern", it: "Da poppa" }),
    portShort: tl({ ru: "Л", en: "P", pl: "L", es: "B", fr: "B", de: "Bb", it: "S" }),
    starboardShort: tl({ ru: "П", en: "S", pl: "P", es: "E", fr: "T", de: "Stb", it: "D" }),
    heading: tl({ ru: "Курс лодки", en: "Boat heading", pl: "Kurs jachtu", es: "Rumbo del barco", fr: "Cap du bateau", de: "Bootskurs", it: "Prua della barca" }),
    twa: tl({ ru: "Угол к ветру", en: "Angle to wind", pl: "Kąt do wiatru", es: "Ángulo al viento", fr: "Angle au vent", de: "Winkel zum Wind", it: "Angolo al vento" }),
    windDisplay: tl({ ru: "Отображение ветра", en: "Wind display", pl: "Widok wiatru", es: "Vista del viento", fr: "Affichage du vent", de: "Windanzeige", it: "Vista del vento" }),
    compass: tl({ ru: "Прибор ветра", en: "Wind instrument", pl: "Wskaźnik wiatru", es: "Indicador de viento", fr: "Indicateur de vent", de: "Windanzeige", it: "Indicatore del vento" }),
    arrows: tl({ ru: "Стрелки ветра", en: "Wind arrows", pl: "Strzałki wiatru", es: "Flechas del viento", fr: "Flèches du vent", de: "Windpfeile", it: "Frecce del vento" }),
    both: tl({ ru: "Оба вида", en: "Both", pl: "Oba widoki", es: "Ambos", fr: "Les deux", de: "Beides", it: "Entrambi" }),
    off: tl({ ru: "Без подсказки", en: "No visual aid", pl: "Bez wskazówki", es: "Sin ayuda visual", fr: "Sans aide visuelle", de: "Ohne visuelle Hilfe", it: "Senza aiuto visivo" }),
    windNote: tl({ ru: "Нос наверху. TWA - угол истинного ветра относительно носа; TWD - направление ветра, отсчитанное от севера. Стрелки в 3D показывают вымпельный ветер.", en: "Bow up. TWA is the true wind angle from the bow; TWD is the wind direction measured from north. The 3D arrows show apparent wind.", pl: "Dziób u góry. TWA to kąt wiatru prawdziwego względem dziobu; TWD to kierunek wiatru liczony od północy. Strzałki w 3D pokazują wiatr pozorny.", es: "Proa arriba. TWA es el ángulo del viento real respecto a la proa; TWD es su dirección medida desde el norte. Las flechas 3D muestran el viento aparente.", fr: "Avant en haut. TWA est l'angle du vent réel par rapport à l'avant ; TWD est sa direction mesurée depuis le nord. Les flèches 3D montrent le vent apparent.", de: "Bug oben. TWA ist der wahre Windwinkel zum Bug; TWD ist die von Norden aus gemessene Windrichtung. Die 3D-Pfeile zeigen den scheinbaren Wind.", it: "Prua in alto. TWA è l'angolo del vento reale rispetto alla prua; TWD è la sua direzione misurata da nord. Le frecce 3D mostrano il vento apparente." }),
    unknown: tl({ ru: "Нет данных", en: "Unavailable", pl: "Brak danych", es: "Sin datos", fr: "Indisponible", de: "Keine Daten", it: "Non disponibile" }),
    knots: tl(RACE_UNITS.knots),
  };
}
