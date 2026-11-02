'use client';

import { useI18n, type Lang } from "@/lib/i18n";
import type { RaceGuidanceAction } from "@/lib/race-guidance";
import type { RaceRuleEvent } from "@/lib/race-rules";
import { REPLAY_COPY_RESOURCES } from "./replay-copy";
import { RACE_UNITS } from "@/features/race-hud/units";
import { RACE_MODE_LABELS } from "./race-mode-labels";

/** M0-5: said when the boat crosses the finish line before rounding the
 * windward mark (src/lib/race-missed-mark.ts). A module resource rather than a
 * useRaceCopy field, so the pinned useRaceCopy field contract stays as it is;
 * the race loop picks it with pickLocalized(lang, ...). */
export const MISSED_MARK_NOTICE = { ru: "Финиш не засчитан: сначала обогни верхний знак, оставив его по левому борту.", en: "Finish not counted: round the windward mark first, leaving it to port.", pl: "Meta niezaliczona: najpierw opłyń znak nawietrzny, zostawiając go po lewej burcie.", es: "Llegada no válida: primero rodea la baliza de barlovento dejándola a babor.", fr: "Arrivée non comptée : contourne d'abord la bouée au vent en la laissant à bâbord.", de: "Zieldurchgang zählt nicht: Runde zuerst die Luvtonne und lass sie an Backbord.", it: "Arrivo non valido: prima gira la boa di bolina lasciandola a sinistra." } as const satisfies Record<Lang, string>;

/** M5: said when the player's boat is pinned against another hull or the
 * water bound and has hardly moved for 6 s (src/lib/race-stuck-watch.ts),
 * metric race only. Picked like MISSED_MARK_NOTICE. Bear away: glossary
 * "увалиться / odpaść / poggiare / arribar / abattre / abfallen". */
export const STUCK_NOTICE = { ru: "Ты уперся, отверни под ветер.", en: "You're stuck: bear away to get going again.", pl: "Łódź utknęła: odpadnij, żeby ruszyć.", es: "El barco se ha atascado: arriba para volver a navegar.", fr: "Le bateau est bloqué : abats pour repartir.", de: "Das Boot hängt fest: fall ab, um wieder Fahrt aufzunehmen.", it: "La barca è bloccata: poggia per ripartire." } as const satisfies Record<Lang, string>;

/** M5 (ADR-0015 point 8): the metric fleet after the player's finish. Rows of
 * bots the fleet resolver is still sailing home, their count on the finish
 * plate and the results, and the note under an estimated time ("~"), given
 * when the player left before the bots finished. Module resources, picked
 * with tl() by RaceResults.tsx and RaceFinishPlate.tsx. */
export const FLEET_RESOLUTION_COPY = {
  stillRacing: { ru: "Еще на дистанции", en: "Still racing", pl: "Jeszcze na trasie", es: "Aún en regata", fr: "Encore en course", de: "Noch im Rennen", it: "Ancora in regata" },
  stillRacingCount: { ru: "Еще на дистанции: {n}", en: "Still racing: {n}", pl: "Jeszcze na trasie: {n}", es: "Aún en regata: {n}", fr: "Encore en course : {n}", de: "Noch im Rennen: {n}", it: "Ancora in regata: {n}" },
  estimated: { ru: "~ примерное время по среднему VMG: гонку закрыли раньше, чем лодка финишировала.", en: "~ estimated from the boat's average VMG: the race was closed before it finished.", pl: "~ czas szacowany na podstawie średniego VMG łodzi: wyścig zamknięto przed jej metą.", es: "~ tiempo estimado según el VMG medio del barco: la regata se cerró antes de su llegada.", fr: "~ temps estimé d'après la VMG moyenne du bateau : la course a été fermée avant son arrivée.", de: "~ geschätzt aus der mittleren VMG des Boots: Das Rennen wurde vor seinem Zieldurchgang beendet.", it: "~ tempo stimato dalla VMG media della barca: la regata è stata chiusa prima del suo arrivo." },
} as const satisfies Record<string, Record<Lang, string>>;

/** The two control modes live in race-mode-labels.ts so the leaderboard can
 * use them without bundling this whole copy module. */
export { RACE_MODE_LABELS };

export function useRaceCopy() {
  const { tl } = useI18n();
  // M1-7: unit signs from one resource (src/features/race-hud/units.ts), so
  // the race never writes " m", "+N s" or "kn" by hand in Russian.
  const metresUnit = tl(RACE_UNITS.metres);
  const secondsUnit = tl(RACE_UNITS.seconds);
  const penalty = (seconds: number) => `+${seconds} ${secondsUnit}`;
  return {
    you: tl({ ru: "Ты", en: "You", pl: "Ty", es: "Tú", fr: "Toi", de: "Du", it: "Tu" }),
    simple: tl(RACE_MODE_LABELS.simple),
    pro: "Pro",
    simpleNote: tl({ ru: "Ты рулишь, паруса настраиваются автоматически.", en: "You steer; the sails trim automatically.", pl: "Ty sterujesz, żagle trymują się automatycznie.", es: "Tú gobiernas; las velas se ajustan solas.", fr: "Tu barres, les voiles se règlent seules.", de: "Du steuerst, die Segel trimmen sich automatisch.", it: "Tu governi, le vele si regolano da sole." }),
    proNote: tl({ ru: "Ты управляешь рулем и обоими шкотами. Трим влияет на тягу и скорость.", en: "You control the helm and both sheets. Trim changes drive and speed.", pl: "Sterujesz i obsługujesz oba szoty. Trym wpływa na siłę napędową i prędkość.", es: "Controlas el timón y ambas escotas. El trimado cambia el empuje y la velocidad.", fr: "Tu contrôles la barre et les deux écoutes. Le réglage agit sur la propulsion et la vitesse.", de: "Du bedienst Steuer und beide Schoten. Der Trimm beeinflusst Vortrieb und Tempo.", it: "Controlli il timone e le due scotte. Il trim modifica spinta e velocità." }),
    guidance: tl({ ru: "Путь и подсказки", en: "Route and hints", pl: "Trasa i wskazówki", es: "Ruta y consejos", fr: "Parcours et conseils", de: "Route und Hinweise", it: "Rotta e consigli" }),
    routeHeading: tl({ ru: "Рекомендуемый курс", en: "Suggested course", pl: "Sugerowany kurs", es: "Rumbo recomendado", fr: "Cap conseillé", de: "Empfohlener Kurs", it: "Rotta consigliata" }),
    rules: tl({ ru: "Учебные правила", en: "Training rules", pl: "Przepisy treningowe", es: "Reglas de práctica", fr: "Règles d'entraînement", de: "Trainingsregeln", it: "Regole di allenamento" }),
    trimHints: tl({ ru: "Подсказки трима Pro", en: "Pro trim hints", pl: "Wskazówki trymu Pro", es: "Consejos de trimado Pro", fr: "Conseils de réglage Pro", de: "Pro-Trimmhinweise", it: "Consigli di trim Pro" }),
    history: tl({ ru: "История гонок", en: "Race history", pl: "Historia regat", es: "Historial de regatas", fr: "Historique des courses", de: "Rennverlauf", it: "Cronologia regate" }),
    penalties: tl({ ru: "Учебные штрафы", en: "Training penalties", pl: "Kary treningowe", es: "Penalizaciones de práctica", fr: "Pénalités d'entraînement", de: "Trainingsstrafen", it: "Penalità di allenamento" }),
    rulesNote: tl({ ru: "Учебная часть правил RRS: право дороги, контакт, ранний старт и знаки. Контакт +5 с, касание знака +3 с. Это игровые штрафы; спорные ситуации не судятся.", en: "An educational RRS subset: right of way, contact, early starts and marks. Contact +5 s, mark touch +3 s. These are game penalties; disputed situations are not umpired.", pl: "Część przepisów RRS do nauki: prawo drogi, kontakt, falstart i znaki. Kontakt +5 s, dotknięcie znaku +3 s. To kary w grze; sytuacje sporne nie są sędziowane.", es: "Parte educativa de las RRS: derecho de paso, contacto, salida anticipada y balizas. Contacto +5 s, tocar baliza +3 s. Son penalizaciones del juego; no se arbitran casos dudosos.", fr: "Un sous-ensemble pédagogique des RCV : priorités, contact, départ prématuré et bouées. Contact +5 s, bouée touchée +3 s. Pénalités de jeu ; les cas litigieux ne sont pas arbitrés.", de: "Ein RRS-Lernausschnitt: Wegerecht, Kontakt, Frühstart und Bahnmarken. Kontakt +5 s, Bahnmarkenberührung +3 s. Das sind Spielstrafen; strittige Fälle werden nicht entschieden.", it: "Una parte didattica delle RRS: diritto di rotta, contatto, partenza anticipata e boe. Contatto +5 s, boa toccata +3 s. Sono penalità di gioco; i casi incerti non vengono arbitrati." }),
    sails: tl({ ru: "Паруса", en: "Sails", pl: "Żagle", es: "Velas", fr: "Voiles", de: "Segel", it: "Vele" }),
    main: tl({ ru: "Грот поднят", en: "Mainsail hoisted", pl: "Grot postawiony", es: "Mayor izada", fr: "Grand-voile hissée", de: "Großsegel gesetzt", it: "Randa issata" }),
    jib: tl({ ru: "Стаксель развернут", en: "Jib unfurled", pl: "Fok rozwinięty", es: "Foque desplegado", fr: "Foc déroulé", de: "Fock ausgerollt", it: "Fiocco aperto" }),
    reef: tl({ ru: "Рифление грота", en: "Mainsail reef", pl: "Refowanie grota", es: "Rizo de la mayor", fr: "Ris de grand-voile", de: "Großsegel reffen", it: "Terzaroli randa" }),
    view: tl(REPLAY_COPY_RESOURCES.view),
    orbit: tl(REPLAY_COPY_RESOURCES.orbit),
    resetCamera: tl(REPLAY_COPY_RESOURCES.resetCamera),
    cameraGesture: tl({ ru: "Вращай сцену пальцем или мышью. Масштаб: двумя пальцами или колесом мыши.", en: "Drag the scene to look around. Pinch or scroll to zoom.", pl: "Przeciągnij po scenie, żeby się rozejrzeć. Zbliżaj dwoma palcami lub kółkiem myszy.", es: "Arrastra la escena para mirar alrededor. Usa dos dedos o la rueda para acercar y alejar.", fr: "Fais glisser la scène pour regarder autour. Pince ou utilise la molette pour zoomer.", de: "Ziehe in der Szene, um dich umzusehen. Zoome mit zwei Fingern oder dem Mausrad.", it: "Trascina la scena per guardarti intorno. Usa due dita o la rotella per lo zoom." }),
    high: tl(REPLAY_COPY_RESOURCES.high),
    stern: tl(REPLAY_COPY_RESOURCES.stern),
    speed: tl({ ru: "Скорость", en: "Speed", pl: "Prędkość", es: "Velocidad", fr: "Vitesse", de: "Tempo", it: "Velocità" }),
    knots: tl(RACE_UNITS.knots),
    time: tl({ ru: "Время", en: "Time", pl: "Czas", es: "Tiempo", fr: "Temps", de: "Zeit", it: "Tempo" }),
    wind: tl({ ru: "К ветру", en: "To wind", pl: "Do wiatru", es: "Al viento", fr: "Au vent", de: "Zum Wind", it: "Al vento" }),
    position: tl({ ru: "Позиция", en: "Position", pl: "Pozycja", es: "Posición", fr: "Position", de: "Platz", it: "Posizione" }),
    pause: tl(REPLAY_COPY_RESOURCES.pause),
    resume: tl(REPLAY_COPY_RESOURCES.resume),
    back: tl(REPLAY_COPY_RESOURCES.back),
    menu: tl({ ru: "Меню", en: "Menu", pl: "Menu", es: "Menú", fr: "Menu", de: "Menü", it: "Menu" }),
    settings: tl({ ru: "Настройки", en: "Settings", pl: "Ustawienia", es: "Ajustes", fr: "Réglages", de: "Einstellungen", it: "Impostazioni" }),
    fleet: tl({ ru: "Флот", en: "Fleet", pl: "Flota", es: "Flota", fr: "Flotte", de: "Flotte", it: "Flotta" }),
    sound: tl({ ru: "Звук", en: "Sound", pl: "Dźwięk", es: "Sonido", fr: "Son", de: "Ton", it: "Audio" }),
    auto: tl({ ru: "Держать курс", en: "Hold heading", pl: "Trzymaj kurs", es: "Mantener rumbo", fr: "Garder le cap", de: "Kurs halten", it: "Mantieni rotta" }),
    debrief: tl({ ru: "Разбор гонки", en: "Race debrief", pl: "Omówienie wyścigu", es: "Análisis de la regata", fr: "Bilan de la course", de: "Rennauswertung", it: "Analisi della regata" }),
    saved: tl({ ru: "Гонка сохранена на устройстве", en: "Race saved on this device", pl: "Wyścig zapisany na urządzeniu", es: "Regata guardada en el dispositivo", fr: "Course enregistrée sur cet appareil", de: "Rennen auf dem Gerät gespeichert", it: "Regata salvata sul dispositivo" }),
    saving: tl({ ru: "Сохраняем гонку", en: "Saving race", pl: "Zapisujemy wyścig", es: "Guardando regata", fr: "Enregistrement de la course", de: "Rennen wird gespeichert", it: "Salvataggio regata" }),
    saveError: tl({ ru: "Не удалось сохранить. Повтори, пока гонка открыта.", en: "Could not save. Retry while the race is open.", pl: "Nie udało się zapisać. Spróbuj ponownie przed zamknięciem wyścigu.", es: "No se pudo guardar. Reintenta antes de cerrar la regata.", fr: "Échec de l'enregistrement. Réessaie avant de fermer la course.", de: "Speichern fehlgeschlagen. Vor dem Schließen erneut versuchen.", it: "Salvataggio non riuscito. Riprova prima di chiudere la regata." }),
    retry: tl(REPLAY_COPY_RESOURCES.retry),
    personalBestSaving: tl({ ru: "Проверяем личный рекорд", en: "Checking personal best", pl: "Sprawdzamy rekord osobisty", es: "Comprobando tu récord", fr: "Vérification du record personnel", de: "Persönliche Bestzeit wird geprüft", it: "Verifica del record personale" }),
    personalBestChecked: tl({ ru: "Личный рекорд проверен", en: "Personal best checked", pl: "Rekord osobisty sprawdzony", es: "Récord personal comprobado", fr: "Record personnel vérifié", de: "Persönliche Bestzeit geprüft", it: "Record personale verificato" }),
    personalBestError: tl({ ru: "Сохранение личного рекорда не подтверждено. Повтори попытку.", en: "Personal best save is unconfirmed. Try again.", pl: "Zapis rekordu osobistego nie został potwierdzony. Spróbuj ponownie.", es: "No se ha confirmado el guardado del récord. Reinténtalo.", fr: "L'enregistrement du record n'est pas confirmé. Réessaie.", de: "Das Speichern der Bestzeit wurde nicht bestätigt. Erneut versuchen.", it: "Il salvataggio del record non è confermato. Riprova." }),
    retryPersonalBest: tl({ ru: "Повторить сохранение рекорда", en: "Retry saving personal best", pl: "Ponów zapis rekordu", es: "Reintentar guardar el récord", fr: "Réessayer l'enregistrement du record", de: "Speichern der Bestzeit wiederholen", it: "Riprova a salvare il record" }),
    trimHint: tl({ ru: "Лишний крен или малая тяга? Меняй шкот небольшими шагами и сравнивай скорость. При повороте настрой оба паруса заново.", en: "Too much heel or little drive? Adjust a sheet in small steps and compare speed. Retrim both sails after turning.", pl: "Duży przechył lub mały ciąg? Zmieniaj szot małymi krokami i porównuj prędkość. Po zwrocie ustaw oba żagle ponownie.", es: "¿Mucha escora o poco empuje? Ajusta la escota poco a poco y compara la velocidad. Reajusta ambas velas después de virar.", fr: "Trop de gîte ou peu de propulsion ? Règle l'écoute par petits pas et compare la vitesse. Règle les deux voiles après un virement.", de: "Zu viel Krängung oder wenig Vortrieb? Ändere die Schot schrittweise und vergleiche das Tempo. Trimme beide Segel nach der Wende neu.", it: "Troppo sbandamento o poca spinta? Regola la scotta a piccoli passi e confronta la velocità. Regola entrambe le vele dopo la virata." }),
    actions: {
      hold: tl({ ru: "Держи курс", en: "Hold this heading", pl: "Trzymaj ten kurs", es: "Mantén este rumbo", fr: "Garde ce cap", de: "Kurs halten", it: "Mantieni questa rotta" }),
      "steer-port": tl({ ru: "Плавно поверни влево", en: "Steer gently to port", pl: "Skręć łagodnie w lewo", es: "Cae suavemente a babor", fr: "Viens doucement sur bâbord", de: "Leicht nach Backbord steuern", it: "Accosta dolcemente a sinistra" }),
      "steer-starboard": tl({ ru: "Плавно поверни вправо", en: "Steer gently to starboard", pl: "Skręć łagodnie w prawo", es: "Cae suavemente a estribor", fr: "Viens doucement sur tribord", de: "Leicht nach Steuerbord steuern", it: "Accosta dolcemente a dritta" }),
      tack: tl({ ru: "Подготовь поворот оверштаг", en: "Prepare to tack", pl: "Przygotuj zwrot przez sztag", es: "Prepara la virada por avante", fr: "Prépare le virement de bord", de: "Wende vorbereiten", it: "Preparati alla virata" }),
      gybe: tl({ ru: "Подготовь поворот фордевинд", en: "Prepare to gybe", pl: "Przygotuj zwrot przez rufę", es: "Prepara la trasluchada", fr: "Prépare l'empannage", de: "Halse vorbereiten", it: "Preparati all'abbattuta" }),
      "return-start": tl({ ru: "Вернись за стартовую линию", en: "Return behind the start line", pl: "Wróć za linię startu", es: "Vuelve detrás de la línea de salida", fr: "Reviens derrière la ligne de départ", de: "Hinter die Startlinie zurückkehren", it: "Torna dietro la linea di partenza" }),
      "round-port": tl({ ru: "Оставь знак по левому борту", en: "Leave the mark to port", pl: "Zostaw znak po lewej burcie", es: "Deja la baliza a babor", fr: "Laisse la bouée à bâbord", de: "Bahnmarke an Backbord lassen", it: "Lascia la boa a sinistra" }),
    } satisfies Record<RaceGuidanceAction, string>,
    ruleMessage(event: RaceRuleEvent) {
      const kind = event.kind;
      const text = kind === "early-start" ? tl({ ru: "Ранний старт: вернись целиком за линию и стартуй снова.", en: "Early start: return fully behind the line and start again.", pl: "Falstart: wróć całkowicie za linię i wystartuj ponownie.", es: "Salida anticipada: vuelve por completo detrás de la línea y sal de nuevo.", fr: "Départ prématuré : repasse entièrement derrière la ligne et repars.", de: "Frühstart: vollständig hinter die Linie zurück und neu starten.", it: "Partenza anticipata: torna completamente dietro la linea e riparti." })
      : kind === "contact" || kind === "avoid-contact" ? tl({ ru: "Избегай столкновения, даже когда имеешь право дороги. Заранее измени курс.", en: "Avoid contact even with right of way. Alter course early.", pl: "Unikaj kontaktu nawet z prawem drogi. Zmień kurs odpowiednio wcześnie.", es: "Evita el contacto aunque tengas derecho de paso. Cambia el rumbo con tiempo.", fr: "Évite le contact même si tu es prioritaire. Change de cap à temps.", de: "Auch mit Wegerecht Kontakt vermeiden. Rechtzeitig den Kurs ändern.", it: "Evita il contatto anche se hai diritto di rotta. Cambia rotta in anticipo." })
      : kind === "mark-touch" ? tl({ ru: "Касание знака: оставляй место для корпуса и дрейфа.", en: "Mark touched: allow room for the hull and leeway.", pl: "Dotknięcie znaku: zostaw miejsce na kadłub i dryf.", es: "Baliza tocada: deja espacio para el casco y el abatimiento.", fr: "Bouée touchée : garde de la place pour la coque et la dérive.", de: "Bahnmarke berührt: Platz für Rumpf und Abdrift lassen.", it: "Boa toccata: lascia spazio per lo scafo e lo scarroccio." })
      : kind === "wrong-rounding" ? tl({ ru: "Знак пройден неверно: обогни его, оставив по левому борту.", en: "Wrong rounding: round again, leaving the mark to port.", pl: "Błędne okrążenie: opłyń znak ponownie, zostawiając go po lewej burcie.", es: "Paso incorrecto: rodea de nuevo dejando la baliza a babor.", fr: "Contournement incorrect : recommence en laissant la bouée à bâbord.", de: "Falsch gerundet: erneut runden und die Bahnmarke an Backbord lassen.", it: "Giro errato: ripassa lasciando la boa a sinistra." })
      : kind === "give-way" && event.rule === "10" ? tl({ ru: "Левый галс уступает правому. Пройди за кормой другой лодки.", en: "Port tack gives way to starboard. Pass astern of the other boat.", pl: "Lewy hals ustępuje prawemu. Przejdź za rufą drugiej łodzi.", es: "Amurado a babor, cedes el paso al barco amurado a estribor. Pasa por su popa.", fr: "Bâbord amures s'écarte de tribord amures. Passe derrière l'autre bateau.", de: "Backbordbug weicht Steuerbordbug. Hinter dem anderen Boot passieren.", it: "Mure a sinistra lascia spazio a mure a dritta. Passa dietro l'altra barca." })
      : kind === "give-way" ? tl({ ru: "Уступи дорогу: на одном галсе наветренная или идущая позади лодка держится в стороне.", en: "Keep clear: on the same tack, the windward or clear-astern boat gives way.", pl: "Ustąp drogi: na tym samym halsie ustępuje łódź nawietrzna lub swobodna z tyłu.", es: "Mantente separado: en la misma amura cede el barco de barlovento o el que va claramente a popa.", fr: "Écarte-toi : sur la même amure, le bateau au vent ou en route libre derrière s'écarte.", de: "Freihalten: auf gleichem Bug weicht das Luvboot oder das klar achteraus liegende Boot.", it: "Tieniti discosto: sulle stesse mure cede la barca sopravvento o libera dalla poppa." })
      : tl({ ru: "Участок пройден правильно", en: "Section completed correctly", pl: "Odcinek wykonany poprawnie", es: "Tramo completado correctamente", fr: "Étape effectuée correctement", de: "Abschnitt korrekt absolviert", it: "Tratto completato correttamente" });
      return `${text}${event.penaltySeconds ? ` ${penalty(event.penaltySeconds)}` : ""}`;
    },
    // M1-7 additions (replay-copy.test.ts pins the field count).
    /** "+5 с" / "+5 s": a time penalty next to the race clock. */
    penalty,
    /** "120 м" / "120 m": a distance on the route hint. */
    metres: (value: number) => `${Math.round(value)} ${metresUnit}`,
    raceReplay: tl(REPLAY_COPY_RESOURCES.raceReplay),
    /** Accessible name of the Simple / Pro choice (was the generic "Settings"). */
    controlMode: tl({ ru: "Режим управления", en: "Control mode", pl: "Tryb sterowania", es: "Modo de control", fr: "Mode de pilotage", de: "Steuermodus", it: "Modalità di controllo" }),
    /** The start signal at the end of the countdown (was the English "START"). */
    startSignal: tl({ ru: "Старт", en: "Start", pl: "Start", es: "Salida", fr: "Départ", de: "Start", it: "Via" }),
  };
}
export type RaceCopy = ReturnType<typeof useRaceCopy>;
