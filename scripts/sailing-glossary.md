# Sailing terminology glossary

This file is the **system prompt context** for the Claude API translation
pipeline (`scripts/translate-data.mjs`). It keeps the model from doing
dictionary-style mechanical translation of sailing jargon.

Every entry is normative: the translator MUST use the listed term. No
synonyms unless explicitly flagged.

Typography: no em-dash / en-dash anywhere (project-wide rule). Polish
strings must not use diacritics (ą ę ż ł ó ć ń ś ź - drop them).

---

## Points of sail

| English | Russian | Polish | Italian | Spanish | French | German |
|---|---|---|---|---|---|---|
| in irons / head to wind | левентик | lewentyk | in panna | en facha | vent debout | im Wind |
| close-hauled | бейдевинд | bajdewind | bolina | cenida | au pres | Am Wind |
| close reach | острый галфвинд | ostry polwiatr | lasco di bolina | ceñida abierta | petit largue | Halbwind-Amwind |
| beam reach | галфвинд | polwiatr | traverso | a un largo | vent de travers | Halbwind |
| broad reach | бакштаг | baksztag | lasco | largo | grand largue | Raumwind |
| running / dead run | фордевинд | fordewind | fil di ruota | popa / a favor | vent arriere | vor dem Wind |

## Tacks and gybes (maneuvers)

| English | Russian | Polish | Italian | Spanish | French | German |
|---|---|---|---|---|---|---|
| tack (verb, upwind turn) | сделать поворот оверштаг | zwrot przez sztag | virare (di bordo) | virar por avante | virer (de bord) | wenden |
| gybe / jibe (verb, downwind turn) | сделать поворот фордевинд | zwrot przez rufe | strambare | trasluchar | empanner | halsen |
| tacking (working upwind in zigzag) | лавировка | halsowanie | bolinare | ceñir | louvoyer | kreuzen |
| port tack (wind on port side) | левый галс | lewy hals | mure a sinistra | amura a babor | babord amures | Backbordbug |
| starboard tack | правый галс | prawy hals | mure a dritta | amura a estribor | tribord amures | Steuerbordbug |

## Parts of the boat

| English | Russian | Polish | Italian | Spanish | French | German |
|---|---|---|---|---|---|---|
| mast | мачта | maszt | albero | mastil | mat | Mast |
| boom | гик | bom | boma | boton | bome | Baum |
| mainsail | грот | grot | randa | mayor | grand-voile | Grossegel |
| jib | стаксель | fok | fiocco | foque | foc | Fock |
| genoa | генуя | genua | genoa | genova | genois | Genua |
| spinnaker | спинакер | spinaker | spinnaker | spinnaker | spi / spinnaker | Spinnaker |
| halyard | фал | fal | drizza | driza | drisse | Fall |
| sheet (line controlling sail) | шкот | szot | scotta | escota | ecoute | Schot |
| winch | лебёдка | winch / kabestan | verricello | winche | winch | Winsch |
| cleat | утка | knaga | galloccia | cornamusa | taquet | Klampe |
| clutch / jammer | стопор | stoper | stopper | mordaza | coinceur | Fallenstopper |
| hull | корпус | kadlub | scafo | casco | coque | Rumpf |
| bow | нос | dziob | prua | proa | etrave / avant | Bug |
| stern | корма | rufa | poppa | popa | poupe / arriere | Heck |
| port (left side) | левый борт | lewa burta | sinistra / babordo | babor | babord | Backbord |
| starboard (right side) | правый борт | prawa burta | dritta / tribordo | estribor | tribord | Steuerbord |
| windward | наветренный | nawietrzny | sopravvento | barlovento | au vent | luv |
| leeward | подветренный | zawietrzny | sottovento | sotavento | sous le vent | lee |
| rudder | руль | ster | timone | timon | gouvernail | Ruder |
| keel | киль | kil | chiglia | quilla | quille | Kiel |

## Race-specific (RRS + tactics)

| English | Russian | Polish | Italian | Spanish | French | German |
|---|---|---|---|---|---|---|
| layline | лейлайн | lejlina | layline | layline | layline | Layline |
| mark (course buoy) | знак | znak | boa | boya | bouee | Bahnmarke |
| windward mark | верхний знак | znak nawietrzny | boa di bolina | boya de barlovento | bouee au vent | Luvtonne |
| leeward mark | нижний знак | znak zawietrzny | boa di poppa | boya de sotavento | bouee sous le vent | Leetonne |
| mark-room | место у знака | miejsce przy znaku | spazio alla boa | espacio en la boya | place a la marque | Platz an der Tonne |
| no-go zone / dead zone | мёртвая зона | martwa strefa | zona morta | zona muerta | zone morte | Totzone |
| start line | стартовая линия | linia startu | linea di partenza | linea de salida | ligne de depart | Startlinie |
| finish line | финишная линия | linia mety | linea di arrivo | linea de llegada | ligne d'arrivee | Ziellinie |
| right of way | право прохода | prawo drogi | diritto di rotta | derecho de paso | priorite | Wegerecht |
| give way | уступить | ustapic | dare precedenza | ceder paso | ceder la priorite | ausweichen |
| stand on | держать курс | utrzymac kurs | mantenere la rotta | mantener el rumbo | tenir sa route | Kurs halten |

## Instruments and angles

| English | Russian | Polish | Italian | Spanish | French | German |
|---|---|---|---|---|---|---|
| true wind angle (TWA) | истинный угол к ветру (TWA) | kat prawdziwego wiatru (TWA) | angolo vento reale (TWA) | angulo viento real (TWA) | angle vent reel (TWA) | wahrer Windwinkel (TWA) |
| apparent wind angle (AWA) | вымпельный угол (AWA) | kat pozornego wiatru (AWA) | angolo vento apparente (AWA) | angulo viento aparente (AWA) | angle vent apparent (AWA) | scheinbarer Windwinkel (AWA) |
| true wind speed (TWS) | истинная скорость ветра (TWS) | predkosc prawdziwego wiatru (TWS) | velocita vento reale (TWS) | velocidad viento real (TWS) | vitesse vent reel (TWS) | wahre Windgeschwindigkeit (TWS) |
| apparent wind speed (AWS) | вымпельная скорость (AWS) | predkosc pozornego wiatru (AWS) | velocita vento apparente (AWS) | velocidad viento aparente (AWS) | vitesse vent apparent (AWS) | scheinbare Windgeschwindigkeit (AWS) |
| VMG (velocity made good) | VMG | VMG | VMG | VMG | VMG | VMG |
| heel (boat tilt) | крен | przechyl | sbandamento | escora | gite | Krängung |
| leeway (sideways drift) | дрейф | dryf | scarroccio | abatimiento | derive | Abdrift |
| boat speed (bs) | скорость лодки (bs) | predkosc lodzi (bs) | velocita (bs) | velocidad (bs) | vitesse (bs) | Bootsgeschwindigkeit (bs) |

## Sail trim

| English | Russian | Polish | Italian | Spanish | French | German |
|---|---|---|---|---|---|---|
| trim (verb: adjust sail) | настроить парус | wybrac zagiel | cazzare | cazar | border | trimmen |
| ease (verb: let sheet out) | отпустить шкот | wyluzowac szot | lascare | lascar | choquer | fieren |
| luff (verb: sail flutters) | полоскать | lopotac | sventare | flamear | faseyer | killen |
| luffing | полоскание | lopotanie | sventamento | flameo | faseyage | Killen |
| stall (flow separation) | срыв потока | oderwanie przeplywu | stallo | desprendimiento | decrochage | Stromungsabriss |
| slot effect (jib-main interaction) | эффект щели | efekt szczeliny | effetto fessura | efecto ranura | effet de fente | Slot-Effekt |
| reef (reduce sail area) | риф / рифить | ryfowac | terzarolare | rizar | prendre un ris | reffen |

## COLREGS / navigation

| English | Russian | Polish | Italian | Spanish | French | German |
|---|---|---|---|---|---|---|
| COLREGS / IRPCS | МППСС-72 | MPZZM (COLREGS) | RIPAM (COLREG) | RIPA (COLREGS) | RIPAM (COLREG) | KVR (COLREG) |
| masthead light | топовый огонь | swiatlo topowe | fanale di testa d'albero | luz de tope | feu de tete de mat | Topplicht |
| port sidelight (red) | левый бортовой огонь (красный) | swiatlo burtowe lewe (czerwone) | fanale laterale sinistro (rosso) | luz de babor (rojo) | feu lateral babord (rouge) | Backbord-Seitenlicht (rot) |
| starboard sidelight (green) | правый бортовой огонь (зелёный) | swiatlo burtowe prawe (zielone) | fanale laterale destro (verde) | luz de estribor (verde) | feu lateral tribord (vert) | Steuerbord-Seitenlicht (grun) |
| sternlight (white) | кормовой огонь (белый) | swiatlo rufowe (biale) | fanale di poppa (bianco) | luz de popa (blanca) | feu de poupe (blanc) | Hecklicht (weiss) |

## Crew commands (don't translate if short - keep readable)

- "Ready about" / "готовимся к повороту" / "gotow do zwrotu" - stays native per-lang
- "Tacking" / "поворот" / "zwrot" - native
- "Boom!" (warning) - stays "Boom!" in all languages
- "Man overboard (MOB)" / "человек за бортом" / "czlowiek za burta" - use "MOB" as visible abbreviation with full phrase on first reference

## General style rules for translation

1. **UI labels** (buttons, menu items, HUD): keep SHORT. Match the English
   label length as much as the target language allows. "Start" in Spanish
   stays "Iniciar" not "Comenzar la carrera".
2. **Long-form content** (bootcamp lessons, rule explanations): prefer
   friendly-professional tone. Use the glossary terms exactly; introduce
   English acronyms once, then use them (TWA, AWA, VMG, RRS).
3. **No Polish diacritics**, ever. "swiatlo", not "światło". "zeglarstwo",
   not "żeglarstwo".
4. **No em-dash / en-dash**. Use hyphen `-`, comma, or colon.
5. **Keep proper nouns** unchanged: "Bavaria 46", "Regatta", "World Sailing",
   "Claude", "AI coach".
6. **Imperial/metric**: keep units as in source. Knots "kts" is universal.
7. **Quotes**: double quotes for EN/DE/IT/ES/FR, elochki `«»` only for RU
   and only where the original uses them.
