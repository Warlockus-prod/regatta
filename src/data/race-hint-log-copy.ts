// F4 copy: the race hint log (src/features/race-hud/hint-log.ts), the Hints
// and Graphics groups of the race Settings, and the softer light setting.
// Terms follow scripts/sailing-glossary.md (mark: знак / znak / baliza /
// bouée / Bahnmarke / boa; trim: трим / trym / trimado / réglage / Trimm).
// The gold note repeats the medal rule of src/lib/race-medals.ts
// (raceUsesHints): only the route and trim hints cost gold.

import type { HintLogKind } from "@/features/race-hud/hint-log";

type Text = { ru: string; en: string; pl: string; es: string; fr: string; de: string; it: string };

export const RACE_HINT_LOG_COPY = {
  title: { ru: "Подсказки гонки", en: "Race hints", pl: "Wskazówki wyścigu", es: "Consejos de la regata", fr: "Conseils de la course", de: "Hinweise im Rennen", it: "Consigli della regata" },
  open: { ru: "Журнал подсказок", en: "Hint log", pl: "Dziennik wskazówek", es: "Registro de consejos", fr: "Journal des conseils", de: "Hinweisprotokoll", it: "Registro dei consigli" },
  close: { ru: "Закрыть подсказки", en: "Close hints", pl: "Zamknij wskazówki", es: "Cerrar los consejos", fr: "Fermer les conseils", de: "Hinweise schließen", it: "Chiudi i consigli" },
  empty: {
    ru: "Пока подсказок не было. Здесь появится все, что тренер и судья скажут в этой гонке.",
    en: "No hints yet. Everything the coach and the judge say in this race will appear here.",
    pl: "Na razie nie było wskazówek. Tu pojawi się wszystko, co trener i sędzia powiedzą w tym wyścigu.",
    es: "Aún no hay consejos. Aquí aparecerá todo lo que digan el entrenador y el juez en esta regata.",
    fr: "Pas encore de conseils. Tout ce que diront l'entraîneur et le juge pendant cette course apparaîtra ici.",
    de: "Noch keine Hinweise. Hier erscheint alles, was Trainer und Schiedsrichter in diesem Rennen sagen.",
    it: "Ancora nessun consiglio. Qui comparirà tutto ciò che allenatore e giudice diranno in questa regata.",
  },
  newestFirst: { ru: "Новые сверху, последние 20.", en: "Newest first, the last 20.", pl: "Najnowsze na górze, ostatnie 20.", es: "Lo más reciente arriba, los últimos 20.", fr: "Les plus récents en haut, les 20 derniers.", de: "Neueste oben, die letzten 20.", it: "I più recenti in alto, gli ultimi 20." },
  raceRunning: { ru: "Гонка идет: лодкой можно управлять.", en: "The race keeps going: you can steer.", pl: "Wyścig trwa: możesz sterować.", es: "La regata sigue: puedes gobernar.", fr: "La course continue : tu peux barrer.", de: "Das Rennen läuft weiter: Du kannst steuern.", it: "La regata continua: puoi timonare." },
  time: { ru: "Время гонки", en: "Race time", pl: "Czas wyścigu", es: "Tiempo de regata", fr: "Temps de course", de: "Rennzeit", it: "Tempo di regata" },
  kinds: {
    rule: { ru: "Правила", en: "Rules", pl: "Przepisy", es: "Reglas", fr: "Règles", de: "Regeln", it: "Regole" },
    hint: { ru: "Подсказка", en: "Hint", pl: "Wskazówka", es: "Consejo", fr: "Conseil", de: "Hinweis", it: "Consiglio" },
    route: { ru: "Маршрут", en: "Route", pl: "Trasa", es: "Ruta", fr: "Parcours", de: "Route", it: "Rotta" },
    trim: { ru: "Трим", en: "Trim", pl: "Trym", es: "Trimado", fr: "Réglage", de: "Trimm", it: "Trim" },
    race: { ru: "Гонка", en: "Race", pl: "Wyścig", es: "Regata", fr: "Course", de: "Rennen", it: "Regata" },
  } satisfies Record<HintLogKind, Text>,
} as const;

export const RACE_HINT_SETTINGS_COPY = {
  hintsGroup: { ru: "Подсказки", en: "Hints", pl: "Wskazówki", es: "Consejos", fr: "Conseils", de: "Hinweise", it: "Consigli" },
  coachStrip: { ru: "Строка тренера", en: "Coach line", pl: "Linia trenera", es: "Línea del entrenador", fr: "Ligne de l'entraîneur", de: "Trainerzeile", it: "Riga dell'allenatore" },
  coachStripNote: {
    ru: "Одна строка с советом на сейчас, например «Держи курс». Без нее у сцены больше места. Команды маршрута на поворот и обход знака остаются, все сказанное есть в журнале.",
    en: "One line of advice for now, such as \"Hold this heading\". Without it the scene gets more room. The route hint's calls to tack, gybe or round a mark stay; everything said is in the log.",
    pl: "Jedna linia z radą na teraz, na przykład \"Trzymaj ten kurs\". Bez niej scena ma więcej miejsca. Polecenia trasy do zwrotu i okrążenia znaku zostają, wszystko jest w dzienniku.",
    es: "Una línea con el consejo del momento, como \"Mantén este rumbo\". Sin ella la escena gana espacio. Las órdenes de la ruta para virar, trasluchar o rodear la baliza se quedan; todo lo dicho está en el registro.",
    fr: "Une ligne de conseil pour l'instant, par exemple \"Garde ce cap\". Sans elle, la scène a plus de place. Les ordres du parcours pour virer, empanner ou contourner la bouée restent ; tout est dans le journal.",
    de: "Eine Zeile mit dem Rat für jetzt, etwa \"Kurs halten\". Ohne sie hat die Szene mehr Platz. Die Ansagen der Route zu Wende, Halse und Bahnmarke bleiben; alles Gesagte steht im Protokoll.",
    it: "Una riga con il consiglio del momento, come \"Mantieni questa rotta\". Senza, la scena ha più spazio. Gli ordini della rotta per virare, abbattere o girare la boa restano; tutto è nel registro.",
  },
  firstRaceHints: { ru: "Подсказки первой гонки", en: "First race hints", pl: "Wskazówki pierwszego wyścigu", es: "Consejos de la primera regata", fr: "Conseils de la première course", de: "Hinweise fürs erste Rennen", it: "Consigli della prima regata" },
  goldNote: {
    ru: "Золото дают только без подсказок маршрута и трима. Строка тренера, журнал и подсказки первой гонки на медаль не влияют.",
    en: "Gold needs a race without route and trim hints. The coach line, the hint log and the first race hints never cost a medal.",
    pl: "Złoto tylko bez wskazówek trasy i trymu. Linia trenera, dziennik i wskazówki pierwszego wyścigu nie wpływają na medal.",
    es: "El oro exige una regata sin consejos de ruta ni de trimado. La línea del entrenador, el registro y los consejos de la primera regata no afectan a la medalla.",
    fr: "L'or exige une course sans conseils de parcours ni de réglage. La ligne de l'entraîneur, le journal et les conseils de la première course ne coûtent jamais de médaille.",
    de: "Gold gibt es nur ohne Routen- und Trimmhinweise. Trainerzeile, Hinweisprotokoll und die Hinweise fürs erste Rennen kosten keine Medaille.",
    it: "L'oro richiede una regata senza consigli di rotta e di trim. La riga dell'allenatore, il registro e i consigli della prima regata non costano mai una medaglia.",
  },
  graphicsGroup: { ru: "Графика", en: "Graphics", pl: "Grafika", es: "Gráficos", fr: "Graphismes", de: "Grafik", it: "Grafica" },
  softLight: { ru: "Мягкий свет, заметные знаки", en: "Softer light, clearer marks", pl: "Łagodne światło, wyraźne znaki", es: "Luz suave, balizas visibles", fr: "Lumière douce, bouées visibles", de: "Weiches Licht, klare Bahnmarken", it: "Luce morbida, boe visibili" },
  softLightNote: {
    ru: "Меньше бликов солнца на воде, сцена чуть темнее; знаки крупнее и ярче. Далекий знак и без этой настройки обведен кольцом.",
    en: "Less sun glare on the water and a slightly darker scene; marks are larger and brighter. A distant mark has a ring round it either way.",
    pl: "Mniej odblasków słońca na wodzie i nieco ciemniejsza scena; znaki są większe i jaśniejsze. Odległy znak i tak ma wokół siebie pierścień.",
    es: "Menos reflejos del sol en el agua y una escena algo más oscura; las balizas son más grandes y brillantes. Una baliza lejana lleva un anillo de todos modos.",
    fr: "Moins de reflets du soleil sur l'eau et une scène un peu plus sombre ; les bouées sont plus grandes et plus vives. Une bouée lointaine a un anneau dans tous les cas.",
    de: "Weniger Sonnenreflexe auf dem Wasser und eine etwas dunklere Szene; die Bahnmarken sind größer und heller. Eine ferne Bahnmarke hat ohnehin einen Ring.",
    it: "Meno riflessi del sole sull'acqua e una scena un po' più scura; le boe sono più grandi e luminose. Una boa lontana ha comunque un anello intorno.",
  },
} as const;
