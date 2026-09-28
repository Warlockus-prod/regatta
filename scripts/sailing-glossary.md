# Sailing terminology glossary

This file is the **system prompt context** for the Claude API translation
pipeline (`scripts/translate-data.mjs`) and the reference for anyone who
writes or reviews translations by hand. It keeps sailing jargon from being
translated word by word.

Every entry is normative: use the listed term. No synonyms unless flagged.

Typography: no em-dash / en-dash anywhere (project-wide rule). Every language
uses its full native spelling, Polish included (ą ć ę ł ń ó ś ź ż). The
Polish-only exam courses (sternik motorowodny, SRC radio) keep the wording of
the official materials and are not adapted.

---

## Points of sail

| English | Russian | Polish | Italian | Spanish | French | German |
|---|---|---|---|---|---|---|
| in irons / head to wind | левентик | łopot | prua al vento | proa al viento | vent debout | im Wind |
| close-hauled | бейдевинд | bajdewind | bolina | ceñida | près | hoch am Wind |
| close reach | острый галфвинд | pełny bajdewind | bolina larga | descuartelar | bon plein | am Wind |
| beam reach | галфвинд | półwiatr | traverso | través | travers | halber Wind |
| broad reach | бакштаг | baksztag | lasco | largo | grand largue | raumer Wind |
| running / dead run | фордевинд | fordewind | poppa | popa | vent arrière | vor dem Wind |

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
| winch | лебёдка | kabestan | winch | winche | winch | Winsch |
| cleat | утка | knaga | galloccia | cornamusa | taquet | Klampe |
| clutch / jammer | стопор | stoper | stopper | mordaza | bloqueur | Fallenstopper |
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
| right of way | право прохода | prawo drogi | diritto di rotta | derecho de paso | priorité | Wegerecht |
| give way / keep clear | уступить | ustąpić drogi | tenersi discosto | mantenerse separado | se maintenir à l'écart | sich freihalten |
| stand on | держать курс | utrzymać kurs | mantenere la rotta | mantener el rumbo | garder son cap | Kurs halten |

## Instruments and angles

| English | Russian | Polish | Italian | Spanish | French | German |
|---|---|---|---|---|---|---|
| true wind angle (TWA) | истинный угол к ветру (TWA) | kąt wiatru prawdziwego (TWA) | angolo del vento reale (TWA) | ángulo del viento real (TWA) | angle du vent réel (TWA) | wahrer Windwinkel (TWA) |
| apparent wind angle (AWA) | вымпельный угол (AWA) | kąt wiatru pozornego (AWA) | angolo del vento apparente (AWA) | ángulo del viento aparente (AWA) | angle du vent apparent (AWA) | scheinbarer Windwinkel (AWA) |
| true wind speed (TWS) | истинная скорость ветра (TWS) | prędkość wiatru prawdziwego (TWS) | velocità del vento reale (TWS) | velocidad del viento real (TWS) | vitesse du vent réel (TWS) | wahre Windgeschwindigkeit (TWS) |
| apparent wind speed (AWS) | вымпельная скорость (AWS) | prędkość wiatru pozornego (AWS) | velocità del vento apparente (AWS) | velocidad del viento aparente (AWS) | vitesse du vent apparent (AWS) | scheinbare Windgeschwindigkeit (AWS) |
| VMG (velocity made good) | VMG | VMG | VMG | VMG | VMG | VMG |
| heel (boat tilt) | крен | przechył | sbandamento | escora | gîte | Krängung |
| leeway (sideways drift) | дрейф | dryf | scarroccio | abatimiento | dérive | Abdrift |
| boat speed (bs) | скорость лодки (bs) | prędkość jachtu (bs) | velocità della barca (bs) | velocidad del barco (bs) | vitesse du bateau (bs) | Bootsgeschwindigkeit (bs) |

## Sail trim

| English | Russian | Polish | Italian | Spanish | French | German |
|---|---|---|---|---|---|---|
| trim / sheet in (verb) | выбрать шкот | wybrać szot | cazzare | cazar | border | dichtholen |
| ease (verb: let sheet out) | потравить шкот | poluzować szot | lascare | lascar | choquer | fieren |
| luff (verb: sail flutters) | полоскать | łopotać | fileggiare | flamear | faseyer | killen |
| luffing (the sail fluttering, NOT luffing up) | полоскание | łopot | fileggiamento | flameo | faseyement | Killen |
| stall (flow separation) | срыв потока | oderwanie przepływu | stallo | desprendimiento del flujo | décrochage | Strömungsabriss |
| slot effect (jib-main interaction) | эффект щели | efekt szczeliny | effetto fessura | efecto ranura | effet de fente | Spalteffekt |
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
8. **Keep proper nouns** unchanged: "Bavaria 46", "Regatta", "World Sailing", "Claude".
