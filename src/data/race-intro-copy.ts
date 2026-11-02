// F5 copy: the race intro (src/features/race-hud/RaceIntro.tsx), four short
// cards shown once before the first solo race and on request ("How to race").
// Terms follow scripts/sailing-glossary.md: windward mark (верхний знак /
// znak nawietrzny / baliza de barlovento / bouée au vent / Luvtonne / boa di
// bolina), leave to port, no-go zone (мертвая зона / kąt martwy / zona muerta
// / zone morte / toter Winkel / angolo morto), tack (поворот оверштаг / zwrot
// przez sztag / virar por avante / virer de bord / wenden / virare), the
// sheets by name and their verbs (trim / ease). The control names match the
// cockpit: the Helm tab (trainer-controls labels), the mode names
// (race-mode-labels.ts), the route hint of the big map (race-map-copy.ts) and
// the hint log (race-hint-log-copy.ts). The rules match the briefing and the
// course: the windward mark is left to port. Package 7: race copy states no
// no-go number (the legacy race sails the classic boat with its own zone,
// src/data/no-go-zone.ts); it points to the suggested course, which beats at
// the race's best VMG angle (race-guidance.ts, upwind-vmg.ts).

import type { Lang } from "@/lib/languages";
import { raceStartCopy } from "./race-start-copy";
import { RACE_INTRO_TITLE } from "./race-intro-title";

type Text = Record<Lang, string>;
const w = (ru: string, en: string, pl: string, es: string, fr: string, de: string, it: string): Text => ({ ru, en, pl, es, fr, de, it });

export const RACE_INTRO_COPY = {
  /** The dialog's name and the "How to race" entry (its own small module, race-intro-title.ts). */
  title: RACE_INTRO_TITLE,
  /** "Step 2 of 4": %n is the card, %t the number of cards. */
  step: w("Шаг %n из %t", "Step %n of %t", "Krok %n z %t", "Paso %n de %t", "Étape %n sur %t", "Schritt %n von %t", "Passo %n di %t"),
  skip: w("Пропустить", "Skip", "Pomiń", "Saltar", "Passer", "Überspringen", "Salta"),
  close: w("Закрыть", "Close", "Zamknij", "Cerrar", "Fermer", "Schließen", "Chiudi"),
  next: w("Дальше", "Next", "Dalej", "Siguiente", "Suivant", "Weiter", "Avanti"),
  back: w("Назад", "Back", "Wstecz", "Atrás", "Retour", "Zurück", "Indietro"),
  /** The last card before the first race: the same words as the lobby's start. */
  start: raceStartCopy.start,
  /** The last card when the intro was opened on request. */
  done: w("Понятно", "Got it", "Rozumiem", "Entendido", "Compris", "Verstanden", "Capito"),
  cards: {
    goal: {
      title: w("Цель: старт, верхний знак, финиш", "The goal: start, windward mark, finish", "Cel: start, znak nawietrzny, meta",
        "El objetivo: salida, baliza de barlovento, llegada", "Le but : départ, bouée au vent, arrivée", "Das Ziel: Start, Luvtonne, Ziel", "L'obiettivo: partenza, boa di bolina, arrivo"),
      body: w(
        "Пересеки стартовую линию после сигнала, не раньше. Поднимись против ветра к верхнему знаку и обогни его, оставив по левому борту. Потом вернись по ветру и пересеки финиш.",
        "Cross the start line after the signal, not before. Work upwind to the windward mark and round it, leaving it to port. Then run back downwind and cross the finish line.",
        "Przetnij linię startu po sygnale, nie wcześniej. Płyń pod wiatr do znaku nawietrznego i opłyń go, zostawiając po lewej burcie. Potem wróć z wiatrem i przetnij linię mety.",
        "Cruza la línea de salida después de la señal, no antes. Sube contra el viento hasta la baliza de barlovento y rodéala dejándola a babor. Luego vuelve a favor del viento y cruza la línea de llegada.",
        "Coupe la ligne de départ après le signal, pas avant. Remonte au vent jusqu'à la bouée au vent et contourne-la en la laissant à bâbord. Puis redescends au portant et coupe la ligne d'arrivée.",
        "Überquere die Startlinie nach dem Signal, nicht vorher. Kreuze gegen den Wind zur Luvtonne, runde sie und lass sie an Backbord. Dann segle mit dem Wind zurück und fahr durchs Ziel.",
        "Taglia la linea di partenza dopo il segnale, non prima. Risali controvento fino alla boa di bolina e girala lasciandola a sinistra. Poi torna con il vento in poppa e taglia il traguardo."),
    },
    steer: {
      title: w("Руль и шкоты", "The helm and the sheets", "Ster i szoty", "El timón y las escotas", "La barre et les écoutes", "Steuer und Schoten", "Il timone e le scotte"),
      /** Multiplayer: the player has only the helm there. */
      titleOnline: w("Руль", "The helm", "Ster", "El timón", "La barre", "Das Steuer", "Il timone"),
      body: w(
        "Управление в панели под сценой (на широком экране справа), вкладка «Руль»: крути штурвал или двигай ползунок, чтобы повернуть лодку. Клавиши ← → делают то же.",
        "The controls are in the panel below the scene (on a wide screen, to the right), Helm tab: turn the wheel or move the slider to steer. The ← → keys do the same.",
        "Sterowanie jest w panelu pod sceną (na szerokim ekranie po prawej), karta Ster: kręć kołem albo przesuń suwak, żeby skręcić. Klawisze ← → robią to samo.",
        "Los controles están en el panel bajo la escena (en pantalla ancha, a la derecha), pestaña Timón: gira la rueda o mueve el deslizador para gobernar. Las teclas ← → hacen lo mismo.",
        "Les commandes sont dans le panneau sous la scène (à droite sur grand écran), onglet Barre : tourne la roue ou déplace le curseur pour barrer. Les touches ← → font de même.",
        "Die Steuerung liegt im Feld unter der Szene (auf breitem Bildschirm rechts), Tab Steuer: Dreh das Rad oder schieb den Regler, um zu steuern. Die Tasten ← → tun dasselbe.",
        "I comandi sono nel pannello sotto la scena (a destra su schermo largo), scheda Timone: gira la ruota o sposta il cursore per governare. I tasti ← → fanno lo stesso."),
      pro: w(
        "В Pro по бокам от руля гика-шкот и стаксель-шкот: выбирай и потравливай их, чтобы паруса тянули. Клавиши Q/A и W/S.",
        "In Pro the mainsheet and the jib sheet sit beside the helm: trim and ease them so the sails pull. Keys Q/A and W/S.",
        "W Pro obok steru są szot grota i szot foka: wybieraj i luzuj je, żeby żagle pracowały. Klawisze Q/A i W/S.",
        "En Pro, junto al timón están la escota de mayor y la escota de foque: cázalas y láscalas para que las velas empujen. Teclas Q/A y W/S.",
        "En Pro, l'écoute de grand-voile et l'écoute de foc sont à côté de la barre : borde-les et choque-les pour que les voiles portent. Touches Q/A et W/S.",
        "In Pro liegen Großschot und Fockschot neben dem Steuer: Hol sie dicht oder fier sie, damit die Segel ziehen. Tasten Q/A und W/S.",
        "In Pro accanto al timone ci sono la scotta della randa e la scotta del fiocco: cazzale e lascale perché le vele spingano. Tasti Q/A e W/S."),
      simple: w(
        "В режиме «Обычный» паруса настраиваются сами. В Pro по бокам от руля будут гика-шкот и стаксель-шкот.",
        "In Simple mode the sails trim themselves. In Pro the mainsheet and the jib sheet sit beside the helm.",
        "W trybie Prosty żagle ustawiają się same. W Pro obok steru są szot grota i szot foka.",
        "En el modo Sencillo las velas se ajustan solas. En Pro, junto al timón están la escota de mayor y la escota de foque.",
        "En mode Simple, les voiles se règlent seules. En Pro, l'écoute de grand-voile et l'écoute de foc sont à côté de la barre.",
        "Im Modus Einfach trimmen sich die Segel selbst. In Pro liegen Großschot und Fockschot neben dem Steuer.",
        "In modalità Semplice le vele si regolano da sole. In Pro accanto al timone ci sono la scotta della randa e la scotta del fiocco."),
      /** Multiplayer: no modes there, the sails always trim themselves (MultiplayerCockpit). */
      online: w(
        "В сетевой гонке паруса настраиваются сами: ты управляешь только рулем.",
        "In an online race the sails trim themselves: you only steer.",
        "W wyścigu online żagle ustawiają się same: ty tylko sterujesz.",
        "En la regata en línea las velas se ajustan solas: tú solo gobiernas.",
        "En course en ligne, les voiles se règlent seules : tu ne fais que barrer.",
        "Im Online-Rennen trimmen sich die Segel selbst: Du steuerst nur.",
        "Nella regata online le vele si regolano da sole: tu governi soltanto."),
    },
    wind: {
      title: w("Ветер относительно носа", "The wind, seen from the bow", "Wiatr względem dziobu", "El viento respecto a la proa", "Le vent par rapport à l'avant", "Der Wind relativ zum Bug", "Il vento rispetto alla prua"),
      body: w(
        "Прибор ветра в углу: нос лодки наверху, стрелка идет с той стороны, откуда дует. Прямо против ветра лежит мёртвая зона, там паруса не тянут. Поэтому к верхнему знаку идут зигзагом, поворотами оверштаг, а лучший угол к ветру показывает рекомендуемый курс.",
        "The wind box in the corner: the bow points up and the arrow comes from where the wind blows. Straight into the wind lies the no-go zone, where the sails do not pull. So you reach the windward mark in a zigzag, tacking, and the suggested course shows the best angle to the wind.",
        "Wskaźnik wiatru w rogu: dziób u góry, strzałka biegnie od strony, z której wieje. Prosto pod wiatr leży kąt martwy, w którym żagle nie pracują. Dlatego do znaku nawietrznego płyniesz zygzakiem, robiąc zwroty przez sztag, a najlepszy kąt do wiatru pokazuje sugerowany kurs.",
        "El indicador de viento en la esquina: la proa apunta arriba y la flecha viene de donde sopla. Justo contra el viento está la zona muerta, donde las velas no empujan. Por eso a la baliza de barlovento se llega en zigzag, virando por avante, y el rumbo recomendado te marca el mejor ángulo al viento.",
        "L'indicateur de vent dans le coin : l'avant pointe vers le haut et la flèche vient d'où souffle le vent. Face au vent se trouve la zone morte, où les voiles ne portent pas. On rejoint donc la bouée au vent en zigzag, en virant de bord, et le cap conseillé indique le meilleur angle au vent.",
        "Die Windanzeige in der Ecke: Der Bug zeigt nach oben, der Pfeil kommt von dort, woher der Wind weht. Direkt gegen den Wind liegt der tote Winkel, dort ziehen die Segel nicht. Darum kreuzt du im Zickzack zur Luvtonne und wendest dabei, und der empfohlene Kurs zeigt dir den besten Winkel zum Wind.",
        "L'indicatore del vento nell'angolo: la prua è in alto e la freccia arriva da dove soffia il vento. Dritto controvento c'è l'angolo morto, dove le vele non spingono. Per questo alla boa di bolina si arriva a zigzag, virando, e la rotta consigliata indica il miglior angolo al vento."),
    },
    hud: {
      title: w("Карта, знак и подсказки", "Map, mark and hints", "Mapa, znak i wskazówki", "Mapa, baliza y consejos", "Carte, bouée et conseils", "Karte, Bahnmarke und Hinweise", "Mappa, boa e consigli"),
      body: w(
        "Карта в углу показывает трассу и флот, коснись ее, и откроется большая карта. Подсказка маршрута рисует путь на воде и дает курс и метры до следующей точки.",
        "The corner map shows the course and the fleet; tap it for the big map. The route hint draws the way on the water and gives the course and the metres to the next point.",
        "Mapa w rogu pokazuje trasę i flotę, dotknij jej, a otworzy się duża mapa. Wskazówka trasy rysuje drogę na wodzie i podaje kurs oraz metry do następnego punktu.",
        "El mapa de la esquina muestra el recorrido y la flota; tócalo para abrir el mapa grande. La ruta sugerida dibuja el camino en el agua y da el rumbo y los metros hasta el siguiente punto.",
        "La carte dans le coin montre le parcours et la flotte ; touche-la pour ouvrir la grande carte. La route conseillée trace le chemin sur l'eau et donne le cap et les mètres jusqu'au point suivant.",
        "Die Karte in der Ecke zeigt den Kurs und die Flotte; tippe darauf für die große Karte. Der Routenhinweis zeichnet den Weg aufs Wasser und nennt Kurs und Meter bis zum nächsten Punkt.",
        "La mappa nell'angolo mostra il percorso e la flotta; toccala per aprire la mappa grande. La rotta suggerita traccia la strada sull'acqua e dà la rotta e i metri fino al punto successivo."),
      /** Solo only: multiplayer has no hint log (MultiplayerCockpit). */
      hintLog: w(
        "Лампочка у строки тренера открывает журнал подсказок гонки.",
        "The bulb by the coach line opens the race's hint log.",
        "Żarówka przy linii trenera otwiera dziennik wskazówek wyścigu.",
        "La bombilla junto a la línea del entrenador abre el registro de consejos.",
        "L'ampoule près de la ligne de l'entraîneur ouvre le journal des conseils.",
        "Die Glühbirne an der Trainerzeile öffnet das Hinweisprotokoll.",
        "La lampadina accanto alla riga dell'allenatore apre il registro dei consigli."),
    },
  },
} as const;

/** "Step 2 of 4" in a language. */
export function raceIntroStepLabel(lang: Lang, card: number, total: number): string {
  return RACE_INTRO_COPY.step[lang].replace("%n", String(card)).replace("%t", String(total));
}
