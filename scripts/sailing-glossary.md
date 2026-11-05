# Sailing terminology glossary

This file is the **system prompt context** for the Claude API translation
pipeline (`scripts/translate-data.mjs`) and the reference for anyone who
writes or reviews translations by hand. It keeps sailing jargon from being
translated word by word.

Every entry is normative: use the listed term. No synonyms unless flagged.

Typography: no em-dash / en-dash anywhere (project-wide rule). Every language
uses its full native spelling, Polish included (ą ć ę ł ń ó ś ź ż). The
Sternik motorowodny stays in Polish and keeps official wording. SRC radio
uses seven adapted UI/study languages; standard radio phrases stay in English
and the original Polish exam wording remains available separately.

---

## Points of sail

| English | Russian | Polish | Italian | Spanish | French | German |
|---|---|---|---|---|---|---|
| in irons / head to wind | левентик | łopot | prua al vento | proa al viento | vent debout | im Wind |
| close-hauled | бейдевинд | bajdewind | bolina | ceñida | près | am Wind (hoch am Wind) |
| close reach | острый галфвинд | pełny bajdewind | bolina larga | descuartelar | bon plein | raumer Amwindkurs |
| beam reach | галфвинд | półwiatr | traverso | través | travers | Halbwind (halber Wind) |
| broad reach | бакштаг | baksztag | lasco | largo | grand largue | Raumschots (raumer Wind) |
| running / dead run | фордевинд | fordewind | poppa | popa | vent arrière | vor dem Wind |

German: both forms are correct ("Am Wind" / "Hoch am Wind" at about 45°, "Halbwind" /
"Halber Wind" at 90°, "Raumschots" / "Raumer Wind" at about 135°). As of 2026-10-22 the sail
course and trainers use the first form, the Points of sail screen and the foundation lessons the
bracketed one; pick one with a German instructor and align them (open question).

## Tacks and gybes (maneuvers)

| English | Russian | Polish | Italian | Spanish | French | German |
|---|---|---|---|---|---|---|
| tack (verb, upwind turn) | сделать поворот оверштаг | zrobić zwrot przez sztag | virare (di bordo) | virar por avante | virer de bord | wenden |
| gybe / jibe (verb, downwind turn) | сделать поворот фордевинд | zrobić zwrot przez rufę | strambare | trasluchar | empanner | halsen |
| tacking (working upwind in zigzag) | лавировка | halsowanie | bordeggiare | barloventear (dar bordos) | louvoyer | kreuzen |
| port tack (wind on port side) | левый галс | lewy hals | mure a sinistra | amurado a babor | bâbord amures | Backbordbug |
| starboard tack | правый галс | prawy hals | mure a dritta | amurado a estribor | tribord amures | Steuerbordbug |
| luff up / head up (course change toward the wind, SAME tack) | привестись / приведение | ostrzyć / ostrzenie | orzare | orzar | lofer | anluven |
| bear away / bear off (course change away from the wind, SAME tack) | увалиться / уваливание | odpaść / odpadanie | poggiare | arribar | abattre | abfallen |
| heave to (stop: jib backed, tiller to leeward) | лечь в дрейф | stanąć w dryfie | mettersi alla cappa | ponerse al pairo | se mettre en panne | beidrehen |

Do not confuse the rows above:
- luff up and bear away change the COURSE and keep the tack. They are never a tack or a gybe.
  Wrong translations seen in this repo: bear away as trasluche / empannage / halsen / strambare
  (those mean gybe), luff up as ceñida / portanza (close-hauled / aerodynamic lift).
- German "Halse" is a gybe. Russian "галс" and Polish "hals" (a tack, a leg of a beat) are
  false friends: a beat in German goes "in Kreuzschlägen", never "in Halsen".
- heave to is a deliberate stop. It is not leeway: never abatimiento / dérive / Abdrift / scarroccio.
- "in panna" and "en facha" mean heave to, so they must never be used for in irons.
- Russian "дрейф" alone means leeway; the maneuver is always "лечь в дрейф".

## Parts of the boat

| English | Russian | Polish | Italian | Spanish | French | German |
|---|---|---|---|---|---|---|
| mast | мачта | maszt | albero | mástil | mât | Mast |
| boom | гик | bom | boma | botavara | bôme | Baum |
| mainsail | грот | grot | randa | mayor | grand-voile | Großsegel |
| jib | стаксель | fok | fiocco | foque | foc | Fock |
| genoa | генуя | genua | genoa | génova | génois | Genua |
| spinnaker | спинакер | spinaker | spinnaker | spinnaker | spi | Spinnaker |
| halyard | фал | fał | drizza | driza | drisse | Fall |
| sheet (line controlling sail) | шкот | szot | scotta | escota | écoute | Schot |
| mainsheet (UI label: always name the sheet) | гика-шкот | szot grota | scotta della randa | escota de mayor | écoute de grand-voile | Großschot |
| jib sheet | стаксель-шкот | szot foka | scotta del fiocco | escota de foque | écoute de foc | Fockschot |
| mainsheet traveler | каретка гика-шкота | wózek szotu grota | carrello della randa | carro de mayor | chariot de grand-voile | Großschot-Traveller |
| jib lead car | каретка стаксель-шкота | wózek szotu foka | carrello del fiocco | carro de foque | chariot de foc | Fockholepunkt |
| winch | лебёдка | kabestan | winch | winch (plural: winches) | winch | Winsch |
| cleat | утка | knaga | galloccia | cornamusa | taquet | Klampe |
| clutch / jammer | стопор | stoper | stopper | stopper (mordaza) | bloqueur | Fallenstopper |
| hull | корпус | kadłub | scafo | casco | coque | Rumpf |
| bow | нос | dziób | prua | proa | étrave / avant | Bug |
| stern | корма | rufa | poppa | popa | poupe / arrière | Heck |
| port (left side) | левый борт | lewa burta | sinistra | babor | bâbord | Backbord |
| starboard (right side) | правый борт | prawa burta | dritta | estribor | tribord | Steuerbord |
| windward | наветренный | nawietrzny | sopravvento | barlovento | au vent | Luv |
| leeward | подветренный | zawietrzny | sottovento | sotavento | sous le vent | Lee |
| rudder | руль | ster | timone | timón | gouvernail | Ruder |
| tiller (the handle, not the rudder) | румпель | rumpel | barra | caña | barre | Pinne |
| luff (front edge of a sail) | передняя шкаторина | lik przedni | inferitura | grátil | guindant | Vorliek |
| leech (back edge of a sail) | задняя шкаторина | lik tylny | balumina | baluma | chute | Achterliek |
| keel | киль | kil | chiglia | quilla | quille | Kiel |

Sheet labels in trainers and coach hints always name the sheet ("ease the mainsheet",
never a bare "ease the sheet"); the learner must know which line to touch. Russian uses
"гика-шкот" only (not "гротшкот" or "грота-шкот"). Sheet values read 0% sheeted in,
100% eased out, with the sail angle in brackets: "Гика-шкот 61% (52°)".

Spanish: the clutch is "el stopper" (masculine) in text and labels; "mordaza de levas" is
only the cam cleat, which the winch lesson contrasts with the clutch. The winch is "el winch",
plural "los winches".

## Race-specific (RRS + tactics)

| English | Russian | Polish | Italian | Spanish | French | German |
|---|---|---|---|---|---|---|
| layline | лейлайн | layline | layline | layline | layline | Layline |
| mark (course buoy) | знак | znak | boa | baliza | bouée | Bahnmarke |
| windward mark | верхний знак | znak nawietrzny | boa di bolina | baliza de barlovento | bouée au vent | Luvtonne |
| leeward mark | нижний знак | znak zawietrzny | boa di poppa | baliza de sotavento | bouée sous le vent | Leetonne |
| mark-room | место у знака | miejsce przy znaku | spazio alla boa | espacio en baliza | place à la marque | Bahnmarkenraum |
| no-go zone / dead zone | мёртвая зона | kąt martwy | angolo morto | zona muerta | zone morte | toter Winkel |
| start line | стартовая линия | linia startu | linea di partenza | línea de salida | ligne de départ | Startlinie |
| finish line | финишная линия | linia mety | linea di arrivo | línea de llegada | ligne d'arrivée | Ziellinie |
| right of way (RRS only, see below) | право дороги | prawo drogi | diritto di rotta | derecho de paso | priorité | Wegerecht |
| keep clear (RRS) | уступить | ustąpić drogi | tenersi discosto | mantenerse separado | se maintenir à l'écart | sich freihalten |
| overlap / overlapped (RRS) | перекрытие / в перекрытии | zachodzenie / zachodzą | ingaggio / ingaggiate | compenetración / compenetrados | engagement / engagés | Überlappung / überlappen |
| clear ahead / clear astern (RRS) | чисто впереди / чисто позади | czysto z przodu / czysto z tyłu | libera avanti / libera dietro | claramente a proa / claramente a popa | en route libre devant / derrière | klar voraus / klar achteraus |
| committee boat (start line end with the orange flag) | судно комиссии | statek komisji regatowej | battello del comitato | barco del comité | bateau comité | Startschiff |
| pin end (start mark at the other end) | стартовый знак (пин) | znak startowy (pin) | boa di partenza (pin) | baliza de salida (pin) | bouée de départ | Starttonne (Pin) |

## Rules terms and crew roles (package 12, expert review C1-C6)

| English | Russian | Polish | Italian | Spanish | French | German |
|---|---|---|---|---|---|---|
| give way (COLREGS, the give-way vessel) | уступить дорогу (уступающее судно) | ustąpić z drogi (statek ustępujący) | lasciare libera la rotta | apartarse (buque que cede el paso) | s'écarter de la route | ausweichen (Ausweichpflichtiger) |
| stand on (COLREGS, the stand-on vessel) | сохранять курс и скорость | utrzymać kurs i prędkość | mantenere rotta e velocità | mantener rumbo y velocidad (buque que sigue a rumbo) | maintenir son cap et sa vitesse | Kurs und Geschwindigkeit beibehalten (Kurshalter) |
| skipper (in charge of the yacht and the crew) | шкипер | skiper | skipper (comandante) | patrón | chef de bord (skipper) | Skipper (Schiffsführer) |
| helmsman (the one at the helm) | рулевой | sternik | timoniere | timonel | barreur | Rudergänger |
| crew weight to windward (keelboat) | сидеть на наветренном борту | balastowanie (siedzieć na nawietrznej burcie) | contrappeso (sedersi sopravvento) | hacer banda (sentarse a barlovento) | rappel (s'asseoir au vent) | auf der Luvkante sitzen |
| VMG: speed made good toward the wind (upwind) or away from it (downwind) | VMG, продвижение к ветру | VMG, postęp pod wiatr | VMG, guadagno al vento | VMG, avance al viento | VMG, gain au vent | VMG, Höhengewinn |
| VMC: speed made good toward a mark or a destination | VMC, продвижение к знаку | VMC, postęp do znaku | VMC, guadagno verso la boa | VMC, avance hacia la baliza | VMC, gain vers la bouée | VMC, Fahrt zur Bahnmarke |

- "Right of way" belongs to the racing rules only (RRS, RU "ППГ"). COLREGS text never
  gives a vessel right of way or "priority": one vessel gives way ("уступает дорогу"),
  the other stands on ("сохраняет курс и скорость"). Same split in every language
  (EN give way / stand on, PL ustępuje z drogi / utrzymuje kurs i prędkość).
- Russian racing text says "перекрытие", never "связка" or a Latin "overlap"; "место у
  знака", never "mark-room"; "поворот оверштаг", never "tack" in Latin letters.
- Skipper and helmsman are two people or two roles: never "Шкипер (рулевой)" or
  "Skipper / Helmsman" as one term.
- VMG is measured against the wind, VMC against the mark. They are equal only when the
  mark lies dead upwind or dead downwind. Never define VMG as "speed toward the goal".
- The start line runs between the committee boat (the mast with the orange flag) and
  the pin end mark, not "between two buoys".
- On a cruiser the crew "сидит на наветренном борту"; "откренивание" (hiking out) is a
  dinghy word and stays out of beginner text.

## Beginner wind words (package 12, audit B3)

The Simple race (`RaceWindInstrument` with `words`, `src/features/race-hud/navigation-copy.ts`)
reads the wind in words first; TWA stays in Pro and in the trim trainer, TWD small on
the second line.

| English | Russian | Polish | Italian | Spanish | French | German |
|---|---|---|---|---|---|---|
| off the bow (after the angle: "80° off the bow") | от носа | od dziobu | dalla prua | de la proa | de l'avant | vom Bug |
| wind from the left / right | ветер слева / справа | wiatr z lewej / z prawej | vento da sinistra / da destra | viento por la izquierda / por la derecha | vent à gauche / à droite | Wind von links / von rechts |
| wind on the nose / from behind | ветер в нос / в корму | wiatr w dziób / w rufę | vento in prua / in poppa | viento de proa / de popa | vent de face / vent arrière | Wind von vorn / von hinten |
| "sails are working well" (the trainer's healthy line, never "slot") | паруса работают хорошо | żagle pracują dobrze | le vele lavorano bene | las velas trabajan bien | les voiles travaillent bien | die Segel arbeiten gut |

The first lesson's check asks about the wind in words; abbreviations (TWA, VMG) come in
later lessons, after the lesson has introduced them. Wrong answers are plausible
mistakes, never jokes. `src/data/beginner-terms.test.ts` pins all of this.

## Instruments and angles

| English | Russian | Polish | Italian | Spanish | French | German |
|---|---|---|---|---|---|---|
| true wind direction (TWD, from) | направление истинного ветра (откуда) | kierunek wiatru prawdziwego (skąd wieje) | direzione del vento reale (provenienza) | dirección del viento real (procedencia) | direction du vent réel (provenance) | wahre Windrichtung (Herkunft) |
| north-up compass | компас с севером наверху | kompas z północą u góry | bussola orientata a nord | brújula con el norte arriba | compas orienté au nord | Kompass mit Norden oben |
| wind arrows (apparent airflow) | стрелки вымпельного ветра | strzałki wiatru pozornego | frecce del vento apparente | flechas del viento aparente | flèches du vent apparent | Pfeile des scheinbaren Windes |
| true wind angle (TWA) | истинный угол к ветру (TWA) | kąt wiatru prawdziwego (TWA) | angolo del vento reale (TWA) | ángulo del viento real (TWA) | angle du vent réel (TWA) | wahrer Windwinkel (TWA) |
| apparent wind angle (AWA) | вымпельный угол (AWA) | kąt wiatru pozornego (AWA) | angolo del vento apparente (AWA) | ángulo del viento aparente (AWA) | angle du vent apparent (AWA) | scheinbarer Windwinkel (AWA) |
| true wind speed (TWS) | истинная скорость ветра (TWS) | prędkość wiatru prawdziwego (TWS) | velocità del vento reale (TWS) | velocidad del viento real (TWS) | vitesse du vent réel (TWS) | wahre Windgeschwindigkeit (TWS) |
| apparent wind speed (AWS) | вымпельная скорость (AWS) | prędkość wiatru pozornego (AWS) | velocità del vento apparente (AWS) | velocidad del viento aparente (AWS) | vitesse du vent apparent (AWS) | scheinbare Windgeschwindigkeit (AWS) |
| VMG (velocity made good) | VMG | VMG | VMG | VMG | VMG | VMG |
| heel (boat tilt) | крен | przechył | sbandamento | escora | gîte | Krängung |
| leeway (sideways drift) | дрейф | dryf | scarroccio | abatimiento | dérive | Abdrift |
| boat speed (bs) | скорость лодки (bs) | prędkość jachtu (bs) | velocità della barca (bs) | velocidad del barco (bs) | vitesse du bateau (bs) | Bootsgeschwindigkeit (bs) |

TWD identifies where true wind comes from, clockwise from north: 0 degrees is
north, 90 degrees is east. The race wind instrument keeps the boat's bow at the
top and shows signed true wind angle (TWA) relative to that bow: positive from
starboard, negative from port. Rounded 0/180 degree readings identify bow/stern
without assigning a port/starboard side. TWD remains a separate absolute reading.
The persisted display value `compass` is retained for compatibility; its visible
label now names a wind instrument. The 3D arrows show incoming apparent airflow
relative to the moving boat, not true TWA or a cloth-flow simulation. Turning the
visual aid off hides the instrument dial and arrows while retaining numeric wind readings.
Unknown wind speed keeps its localized unavailable label, never an assumed
12 kn. The course map is a local race overview, not a geographic navigation chart.
The seven-language map, instrument and style labels live in
`src/features/race-hud/navigation-copy.ts`.

## Sail trim

| English | Russian | Polish | Italian | Spanish | French | German |
|---|---|---|---|---|---|---|
| trim / sheet in (verb) | выбрать шкот | wybrać szot | cazzare | cazar | border | dichtholen |
| ease (verb: let sheet out) | потравить шкот | poluzować szot | lascare | lascar | choquer | fieren |
| luff (verb: sail flutters) | полоскать | łopotać | fileggiare | flamear | faseyer | killen |
| luffing (the sail fluttering, NOT luffing up) | полоскание | łopot | fileggiamento | flameo | faseyement | Killen |
| stall (flow separation) | срыв потока | oderwanie przepływu | stallo | desprendimiento del flujo | décrochage | Strömungsabriss |
| slot effect (jib-main interaction; trim trainer only, beginner text says it in words) | эффект щели | efekt szczeliny | effetto fessura | efecto ranura | effet de fente | Spalteffekt |
| reef (reduce sail area) | риф / рифить | ref / refować | mano di terzaroli / terzarolare | rizo / tomar rizos | ris / prendre un ris | Reff / reffen |
| telltale | колдунчик | włóczka | filetto | catavientos | penon | Windfaden (Telltale) |

## COLREGS / navigation

| English | Russian | Polish | Italian | Spanish | French | German |
|---|---|---|---|---|---|---|
| COLREGS / IRPCS | МППСС-72 | MPZZM (COLREG) | COLREG | RIPA (COLREG) | RIPAM (COLREG) | KVR (COLREG) |
| masthead light | топовый огонь | światło masztowe | fanale di testa d'albero | luz de tope | feu de tête de mât | Topplicht |
| port sidelight (red) | левый бортовой огонь (красный) | światło burtowe lewe (czerwone) | fanale laterale di sinistra (rosso) | luz de costado de babor (roja) | feu de côté bâbord (rouge) | Backbord-Seitenlicht (rot) |
| starboard sidelight (green) | правый бортовой огонь (зелёный) | światło burtowe prawe (zielone) | fanale laterale di dritta (verde) | luz de costado de estribor (verde) | feu de côté tribord (vert) | Steuerbord-Seitenlicht (grün) |
| sternlight (white) | кормовой огонь (белый) | światło rufowe (białe) | fanale di poppa (bianco) | luz de alcance (blanca) | feu de poupe (blanc) | Hecklicht (weiß) |

## Crew commands (native in each language, short)

- Ready about: "Приготовиться к повороту!" / "Klar do zwrotu!" / "Pronti a virare!" /
  "¡Listos para virar!" / "Paré à virer !" / "Klar zur Wende!"
- Tacking: "Поворот!" / "Zwrot przez sztag!" / "Viro!" / "¡Viramos!" / "Envoyez !" / "Ree!"
- Ready to gybe: "Приготовиться к повороту фордевинд!" / "Klar do zwrotu przez rufę!" /
  "Pronti a strambare!" / "¡Listos para trasluchar!" / "Paré à empanner !" / "Klar zur Halse!"
- Gybe: "Поворот фордевинд!" / "Zwrot przez rufę!" / "Strambo!" / "¡Trasluchamos!" /
  "Empannez !" / "Rund achtern!"
- "Boom!" (warning) stays "Boom!" in all languages.
- Man overboard: "человек за бортом" / "człowiek za burtą" / "uomo a mare" / "hombre al agua" /
  "homme à la mer" / "Mensch über Bord". Use "MOB" as the visible abbreviation after the first
  full mention.

## Race UI terms (language pass 2026-10-31)

Decisions for the race (`/game`, `/multiplayer`, the app's Race hub). One name
per thing across the toast, the HUD, the map, the result screen and the judge
debrief. `src/app/game/race-terms.test.ts` pins the mark terms.

- Mark, French: "bouée" everywhere ("Bouée touchée", "Laisse la bouée à
  bâbord", map legend "Bouée"). The RCV word "marque" stays only in the
  official term "place à la marque".
- Mark, German: "Bahnmarke" for a mark in general ("Bahnmarke berührt",
  "Bahnmarke an Backbord lassen", map legend and event chip "Bahnmarke");
  "Luvtonne", "Leetonne", "Starttonne" for the named marks. Never a bare
  "Tonne".
- Finish line, German: "die Ziellinie überqueren" or "durchs Ziel", never
  "kreuzen" (kreuzen is beating upwind).
- Touched mark: the in-race toast starts with the judge's incident name in
  every language (RU "Касание знака", EN "Mark touched", PL "Dotknięcie znaku",
  ES "Baliza tocada", FR "Bouée touchée", DE "Bahnmarke berührt", IT "Boa
  toccata").
- Polish race words: one race is "wyścig" ("Omówienie wyścigu", "Dźwięk
  wyścigu", "Ustawienia wyścigu"); the section and the saved list keep
  "Regaty" ("zakładka Regaty", "Historia regat", "Do regat"). Free race is
  "Wyścig swobodny" (short "Swobodny"), never "Wolny wyścig", which reads as
  "slow race". The training toggles are "Przepisy treningowe", "Kary
  treningowe", "Sędzia treningowy".
- Multiplayer (M5 step 8, ADR-0015): "Быстрая онлайн-гонка" / "Quick online
  race" / "Szybki wyścig online" (one race: "wyścig") / "Regata rápida en
  línea" / "Course rapide en ligne" / "Schnelles Online-Rennen" / "Regata
  veloce online", one term in `QUICK_ONLINE_RACE` (`src/data/quick-online-race.ts`). The legacy course of
  the leaderboard is "Классическая трасса" / "Classic course" / "Klasyczna
  trasa" / "Recorrido clásico" / "Parcours classique" / "Klassischer Kurs" /
  "Percorso classico"; course lengths agree with the noun (PL "Krótka", ES
  "Corto", FR "Court", DE "Kurz", IT "Corto").
- Keep clear, Polish: "Ustąp drogi" (glossary "ustąpić drogi"), not "utrzymuje
  się z dala".
- Wind levels: EN "Light / Medium / Strong" in the lobby, the app hub and the
  leaderboard filter (not "Heavy").
- Start button of the lobby ("Start · Easy"): ES "Empezar", IT "Inizia" (a
  verb; "Salida" on a button reads as "Exit"), FR "Départ", PL / DE "Start",
  RU "Старт". The start signal itself stays a noun (ES "Salida", IT "Via").
- Race settings: RU "Настройки гонки" (pause sheet, multiplayer) and "Настройка
  гонки" (the app hub heading), never "Заезд" or "Условия гонки"; ES "Ajustes
  de la regata", DE "Renneinstellungen", IT "Impostazioni della regata".
- Replay: RU "Повтор гонки", PL "Powtórka wyścigu", ES "Repetición de la
  regata", DE "Rennwiederholung" / "Wiederholung teilen", IT "Replay della
  regata"; FR keeps the title "Revoir la course" and the noun "replay" ("Partager
  le replay"). Russian never writes "replay" in Latin letters.
- Russian "ё": optional in Russian. The race dictionaries do not write it
  ("пересек", "развернут"). Exception since package 10: the repeat button is
  "Ещё раз" everywhere, site and app (`UI_TERMS.again` in
  `src/lib/product/ui-terms.ts`, most of the RU UI already wrote it so; a test
  rejects "Еще раз"). Fixed names keep it ("Тренажёр трима", the difficulty
  "Лёгкий"), and so does the briefing, which was written with it ("мёртвая
  зона", "Идёшь", "ведёт"). Inside one string use one spelling only.
- One UI dictionary (package 10): race modes "Простой" / "Pro" in every
  language (ES "Sencillo"), never "Обычный", RU "Про" or DE "Profi"; RU
  "ИИ-тренер", never "AI-тренер"; the product name in copy is "Week to
  Regatta", "Regatta" only as the short header logo, never "REGATTA" in
  capitals (the radio call "REGATTA FLEET" is a radio phrase). Units come from
  `UI_TERMS`: Russian "уз", "м", "мин", never "kn", "m", "min".
- Sheets in key hints always named in full (FR "Q/A écoute de grand-voile, W/S
  écoute de foc"), per the sheet rule above.

## In-lesson tasks and the leaderboard name (language pass of build 81, 2026-11-05)

`src/data/foundation-mini-tasks.test.ts` pins these decisions.

The three trainer pages are named by their task (owner decision R-13, one dictionary:
`src/lib/product/trainer-names.ts`):

| Page | Russian | English | Polish | Spanish | French | German | Italian |
|---|---|---|---|---|---|---|---|
| `/simulator` | Научиться рулить | Learn to steer | Naucz się sterować | Aprende a timonear | Apprendre à barrer | Steuern lernen | Impara a timonare |
| `/simulator-v3` | Настроить паруса | Trim the sails | Ustaw żagle | Ajusta las velas | Régler les voiles | Segel trimmen | Regola le vele |
| `/simulator2` | Рассмотреть парус | Inspect the sail | Obejrzyj żagiel | Observa la vela | Observer la voile | Segel ansehen | Osserva la vela |

- The screen-reader name of the switcher is "Simulatoren" in German: "KI-Trainer" in
  `UI_TERMS` is the AI coach, so a bare "Trainer" reads as a person.
- The leaderboard has one name, the page heading, in the menu, the message under 10 results
  and the nickname prompt: Leaderboard / Ranking / Clasificación / Classement / Bestenliste /
  Classifica. Not "table", "tabela", "tabla", "tableau", "Tabelle", "tabella" or "Rangliste".
  The word stays "table" only where the text really speaks of several tables.
- A task inside a lesson is an exercise: ES "ejercicio", FR "exercice", IT "esercizio". ES
  "tarea" and IT "compito" read as homework. PL "zadanie" and DE "Aufgabe" stay.
- The slider is held at an angle ("Hold the boat at this angle"), never on a "mark", "znak",
  "Marke", "marca" or "segno": in this product those mean a race mark or read like it.
- Spanish imperatives: "Arriba" alone reads as "up", so the task says "Arriba hasta poner la
  popa al viento". Past tense follows Spain: "¡Lo has logrado!", not "¡Lo lograste!".
- Italian "until" needs the negative: "finché il vento non arriva"; without "non" it means "as
  long as".
- French buttons do not start with "Plus de...", which also reads as "no more...".

Open for the owner: RU menu "Результаты гонок" against the page heading "Таблица лучших";
PL "trenażer" against "symulator" in one product; DE "Am Wind" against "Hoch am Wind" (above).

## General style rules for translation

1. **Adapt, do not transliterate.** Write what a native sailing instructor would say to a
   beginner. Keep the meaning and every number; drop Russian word order and idioms.
2. **UI labels** (buttons, menu items, HUD): keep SHORT, close to the English length.
   "Start" in Spanish stays "Empezar", not "Comenzar la regata".
3. **Long-form content** (lessons, rule explanations): friendly and professional, informal
   address (ty / tu / du / tú, as the rest of the product). Use the glossary terms exactly;
   introduce English acronyms once, then use them (TWA, AWA, VMG, RRS).
4. **Full native spelling in every language.** Polish keeps its letters: "światło",
   "żeglarstwo", "zwrot przez rufę". Spanish, French, German and Italian keep accents and ß.
5. **No em-dash / en-dash.** Use hyphen `-`, comma or colon.
6. **Punctuation.** Straight double quotes `"..."` in EN, PL, ES, FR, DE, IT; «ёлочки» only in
   Russian. Three dots, not the ellipsis character. No curly apostrophes.
7. **Numbers.** Keep every number and unit of the source. Decimal point in English, decimal
   comma in the other languages ("0,5 kn"). Knots are "kn" (kts in English is fine).
   Instrument notation is an exception: live instrument readouts, including race
   speed and wind speed, keep a fixed decimal point in all seven languages.
   Prose still follows the locale's decimal convention. Wind units remain "уз"
   in RU, "w." in PL, "nd" in FR and "kn" in EN / ES / DE / IT.
8. **Keep proper nouns** unchanged: "Bavaria 46", "Regatta", "World Sailing", "Claude".
