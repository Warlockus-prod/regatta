// ============================================================================
// Trainer catalog - the single source of truth for drill / scenario / mission
// METADATA across platforms (docs/design/SIMULATORS.md roadmap #5).
//
// One entry per exercise: stable id, kind, which platforms ship it, and the
// localized title + goal in all 7 languages. Check/scoring LOGIC stays
// platform-local, keyed by these ids:
//   - web Trainer (V3): src/features/simulator-v3/runtime/scenario-presets.ts
//     imports this file directly and attaches UiState templates + evaluate().
//   - native Trainer: mobile/scripts/sync-content.ts emits this catalog as
//     mobile/src/data/drills.json; mobile/src/simulator/missions.ts reads the
//     synced copy for title/goal text and keeps check()/marks/scoring local.
//
// `params` are the pure-data numbers each exercise is built around (target
// angles, hold seconds, par times). They MIRROR the platform runtime values
// for reference and future logic unification; the runtimes keep their own
// literals until the shared-package extraction (ADR-0003) lands.
//
// This file must stay import-free (or type-only imports) so Node can run it
// under --experimental-strip-types from mobile/scripts/sync-content.ts.
// ============================================================================

/** All 7 languages required - the catalog is the one place text must be
 *  complete (enforced by src/features/simulator-v3/runtime/trainer-catalog.test.ts). */
export interface TrainerText {
  ru: string;
  en: string;
  pl: string;
  es: string;
  fr: string;
  de: string;
  it: string;
}

export type TrainerEntryKind = 'drill' | 'scenario' | 'mission';

export type TrainerPlatform = 'web' | 'mobile';

export interface TrainerCatalogEntry {
  id: string;
  kind: TrainerEntryKind;
  platforms: TrainerPlatform[];
  title: TrainerText;
  /** For scenarios this is the one-line summary; for drills/missions the goal/hint. */
  goal: TrainerText;
  params?: Record<string, number>;
}

export const trainerCatalog: TrainerCatalogEntry[] = [
  // --------------------------------------------------------------------------
  // Web Trainer (V3) scenarios - named starting conditions, no win/fail logic.
  // --------------------------------------------------------------------------
  {
    id: 'beam-healthy',
    kind: 'scenario',
    platforms: ['web'],
    title: {
      ru: 'Галф, спокойно',
      en: 'Beam reach, clean',
      pl: 'Polwiatr, spokojnie',
      es: 'Través, tranquilo',
      fr: 'Travers, tranquille',
      de: 'Halbwind, ruhig',
      it: 'Traverso, tranquillo',
    },
    goal: {
      ru: '12 узлов, оптимум. Почувствуй, как должно быть.',
      en: '12 kt beam reach, optimum trim. Feel the baseline.',
      pl: '12 wezlow, optymalny trym. Wyczuj baze.',
      es: '12 nudos de través, trimado optimo. Siente la referencia.',
      fr: '12 noeuds au travers, réglage optimal. Sens la référence.',
      de: '12 kn Halbwind, optimaler Trimm. Spuere die Basis.',
      it: '12 nodi al traverso, trim ottimale. Senti la base.',
    },
  },
  {
    id: 'overpowered',
    kind: 'scenario',
    platforms: ['web'],
    title: {
      ru: 'Перегруз',
      en: 'Overpowered',
      pl: 'Za duzo mocy',
      es: 'Sobrecargado',
      fr: 'Surpuissance',
      de: 'Ueberpowert',
      it: 'Sovrapotenza',
    },
    goal: {
      ru: '20 узлов, острый курс, риф не взят. Что будешь делать?',
      en: '20 kt close-hauled, no reef. Too much sail up - your move.',
      pl: '20 wezlow na orce, bez refa. Co zrobisz?',
      es: '20 nudos en ceñida, sin rizo. Demasiada vela arriba: tu decides.',
      fr: '20 noeuds au près, pas de ris. Trop de toile: à toi de jouer.',
      de: '20 kn am Wind, kein Reff. Zu viel Segel oben: dein Zug.',
      it: '20 nodi di bolina, senza terzaroli. Troppa tela a riva: tocca a te.',
    },
  },
  {
    id: 'main-overtrim',
    kind: 'scenario',
    platforms: ['web'],
    title: {
      ru: 'Грот перебран',
      en: 'Main overtrimmed',
      pl: 'Grot przebrany',
      es: 'Mayor sobretrimada',
      fr: 'GV surbordée',
      de: 'Gross zu dicht',
      it: 'Randa sovratesata',
    },
    goal: {
      ru: '12 узлов галф. Грот выбран слишком сильно, поток сорвётся.',
      en: '12 kt beam reach. Main sheeted hard - flow is about to stall.',
      pl: '12 wezlow polwiatr. Grot za mocno przyciagniety.',
      es: '12 nudos de través. Mayor cazada a tope: el flujo va a desprenderse.',
      fr: "12 noeuds au travers. GV bordée à bloc: l'écoulement va décrocher.",
      de: '12 kn Halbwind. Gross zu dicht geholt: die Stroemung reisst gleich ab.',
      it: '12 nodi al traverso. Randa cazzata a ferro: il flusso sta per staccarsi.',
    },
  },
  {
    id: 'bad-slot',
    kind: 'scenario',
    platforms: ['web'],
    title: {
      ru: 'Плохой слот',
      en: 'Bad slot',
      pl: 'Zly slot',
      es: 'Mal slot',
      fr: 'Mauvais slot',
      de: 'Schlechter Slot',
      it: 'Slot sbagliato',
    },
    goal: {
      ru: '14 узлов, стаксель душит грот. Открой слот.',
      en: '14 kt, jib is choking the main. Open the slot.',
      pl: '14 wezlow, fok dusi grota. Otworz slot.',
      es: '14 nudos, el foque ahoga la mayor. Abre el slot.',
      fr: '14 noeuds, le foc étouffe la GV. Ouvre le slot.',
      de: '14 kn, die Fock erstickt das Gross. Oeffne den Slot.',
      it: '14 nodi, il fiocco soffoca la randa. Apri lo slot.',
    },
  },

  // --------------------------------------------------------------------------
  // Web Trainer (V3) drills - goal-driven exercises with win/fail evaluation.
  // --------------------------------------------------------------------------
  {
    id: 'hold-trim',
    kind: 'drill',
    platforms: ['web'],
    title: {
      ru: 'Держи трим',
      en: 'Hold trim',
      pl: 'Utrzymaj trym',
      es: 'Mantén el trim',
      fr: 'Maintiens le trim',
      de: 'Halte den Trimm',
      it: 'Tieni il trim',
    },
    goal: {
      ru: 'Держи трим не ниже 85% десять секунд подряд.',
      en: 'Keep trim at 85% or above for ten straight seconds.',
      pl: 'Utrzymaj trym 85% lub wyzej przez 10 sekund.',
      es: 'Mantén el trim al 85% o más durante diez segundos seguidos.',
      fr: 'Garde le trim à 85% ou plus pendant dix secondes de suite.',
      de: 'Halte den Trimm zehn Sekunden am Stueck bei 85% oder mehr.',
      it: "Tieni il trim all'85% o più per dieci secondi di fila.",
    },
    params: { timeLimitSec: 40, holdSec: 10, trimTargetPct: 85 },
  },
  {
    id: 'recover-stall',
    kind: 'drill',
    platforms: ['web'],
    title: {
      ru: 'Выход из срыва',
      en: 'Recover from stall',
      pl: 'Wyjscie ze zerwania',
      es: 'Sal del stall',
      fr: 'Sors du décrochage',
      de: 'Raus aus dem Stall',
      it: 'Esci dallo stallo',
    },
    goal: {
      ru: 'Выведи грот из срыва и удерживай трим 70%+ пять секунд.',
      en: 'Recover the main from stall and hold trim 70%+ for 5 seconds.',
      pl: 'Wyprowadz grota ze zerwania, trzymaj 70%+ przez 5 s.',
      es: 'Saca la mayor del stall y mantén el trim en 70%+ durante 5 segundos.',
      fr: 'Sors la GV du décrochage et maintiens le trim à 70%+ pendant 5 secondes.',
      de: 'Hol das Gross aus dem Stall und halte den Trimm 5 Sekunden bei 70%+.',
      it: 'Riporta la randa fuori dallo stallo e tieni il trim al 70%+ per 5 secondi.',
    },
    params: { timeLimitSec: 30, holdSec: 5, trimTargetPct: 70 },
  },
  {
    id: 'reduce-heel',
    kind: 'drill',
    platforms: ['web'],
    title: {
      ru: 'Убери крен',
      en: 'Reduce heel',
      pl: 'Zmniejsz przechyl',
      es: 'Reduce la escora',
      fr: 'Réduis la gîte',
      de: 'Kraengung senken',
      it: 'Riduci lo sbandamento',
    },
    goal: {
      ru: 'Удержи крен меньше 20° пять секунд. Риф или ослабление?',
      en: 'Hold heel under 20° for 5 seconds. Reef or ease?',
      pl: 'Przechyl ponizej 20° przez 5 s. Ref czy luzowanie?',
      es: 'Mantén la escora bajo 20° durante 5 segundos. Rizar o lascar?',
      fr: 'Garde la gîte sous 20° pendant 5 secondes. Ris ou choquer?',
      de: 'Halte die Kraengung 5 Sekunden unter 20°. Reffen oder fieren?',
      it: 'Tieni lo sbandamento sotto i 20° per 5 secondi. Terzarolare o lascare?',
    },
    params: { timeLimitSec: 35, holdSec: 5, maxHeelDeg: 20 },
  },

  // --------------------------------------------------------------------------
  // Native Trainer drills (mobile/src/simulator/missions.ts keeps check()).
  // --------------------------------------------------------------------------
  {
    id: 'twa45',
    kind: 'drill',
    platforms: ['mobile'],
    title: {
      ru: 'Удерживай TWA 45 град',
      en: 'Hold TWA 45 deg',
      pl: 'Utrzymaj TWA 45 st.',
      es: 'Manten TWA 45 deg',
      fr: 'Tiens un TWA 45 deg',
      de: 'Halte TWA 45 Grad',
      it: 'Tieni TWA 45 deg',
    },
    goal: {
      ru: 'Курс крутой бейдевинд: TWA в коридоре 40-50 град.',
      en: 'Close-hauled: keep TWA in the 40-50 deg window.',
      pl: 'Bejdewind: TWA w przedziale 40-50 st.',
      es: 'Cenida: TWA entre 40 y 50 grados.',
      fr: 'Pres bon plein: TWA entre 40 et 50 deg.',
      de: 'Am Wind: TWA zwischen 40 und 50 Grad.',
      it: 'Bolina stretta: TWA tra 40 e 50 deg.',
    },
    params: { targetSec: 30, twaMinDeg: 40, twaMaxDeg: 50 },
  },
  {
    id: 'noGo',
    kind: 'drill',
    platforms: ['mobile'],
    title: {
      ru: 'Избегай no-go зону',
      en: 'Avoid the no-go zone',
      pl: 'Unikaj strefy no-go',
      es: 'Evita la zona no-go',
      fr: 'Evite la zone no-go',
      de: 'Meide die No-go-Zone',
      it: 'Evita la zona no-go',
    },
    goal: {
      ru: 'Не подходи ближе 30 град к ветру 60 секунд.',
      en: 'Stay outside 30 deg from the wind for 60 seconds.',
      pl: 'Trzymaj sie ponad 30 st. od wiatru przez 60 sek.',
      es: 'Mantente a mas de 30 grados del viento durante 60 seg.',
      fr: 'Reste a plus de 30 deg du vent pendant 60 sec.',
      de: 'Bleib mehr als 30 Grad vom Wind weg, 60 Sekunden.',
      it: 'Resta oltre 30 gradi dal vento per 60 sec.',
    },
    params: { targetSec: 60, minTwaDeg: 30 },
  },
  {
    id: 'reach90',
    kind: 'drill',
    platforms: ['mobile'],
    title: {
      ru: 'Галфвинд 90 град на скорость',
      en: 'Beam reach 90 deg for max speed',
      pl: 'Polwiatr 90 st. na predkosc',
      es: 'Traves 90 deg para velocidad maxima',
      fr: 'Largue 90 deg pour vitesse max',
      de: 'Halbwindkurs 90 Grad fuer Topspeed',
      it: 'Traverso 90 deg per max velocita',
    },
    goal: {
      ru: 'Держи TWA около 90 град и подбирай шкоты до высокого TRIM.',
      en: 'Keep TWA near 90 deg and trim sheets for high TRIM.',
      pl: 'Trzymaj TWA blisko 90 st. i wybierz szoty na wysoki TRIM.',
      es: 'Manten TWA cerca de 90 deg y ajusta velas para TRIM alto.',
      fr: 'Tiens un TWA proche de 90 deg et regle pour un TRIM eleve.',
      de: 'Halte TWA nahe 90 Grad und trimme auf hohen TRIM.',
      it: 'Tieni TWA vicino a 90 deg e regola per TRIM alto.',
    },
    params: { targetSec: 30, twaMinDeg: 80, twaMaxDeg: 100, trimTargetPct: 70 },
  },
  {
    id: 'shiftReact',
    kind: 'drill',
    platforms: ['mobile'],
    title: {
      ru: 'Реагируй на заход',
      en: 'React to the shift',
      pl: 'Reaguj na zmiane wiatru',
      es: 'Reacciona al role',
      fr: 'Reagis a la bascule',
      de: 'Reagiere auf den Dreher',
      it: 'Reagisci al salto',
    },
    goal: {
      ru: 'Ветер ходит каждые 10 сек. Держи TWA 40-50 на новом галсе.',
      en: 'Wind shifts every 10 sec. Hold TWA 40-50 on the new tack.',
      pl: 'Wiatr zmienia sie co 10 sek. Trzymaj TWA 40-50 na nowym halsie.',
      es: 'El viento cambia cada 10 seg. Manten TWA 40-50 en la nueva amura.',
      fr: 'Le vent bascule toutes les 10 sec. Tiens TWA 40-50 sur la nouvelle amure.',
      de: 'Der Wind dreht alle 10 Sek. Halte TWA 40-50 auf dem neuen Bug.',
      it: 'Il vento ruota ogni 10 sec. Tieni TWA 40-50 sulla nuova mura.',
    },
    params: { targetSec: 60, twaMinDeg: 40, twaMaxDeg: 50 },
  },
  {
    id: 'gustTrim',
    kind: 'drill',
    platforms: ['mobile'],
    title: {
      ru: 'Триммингуй порывы',
      en: 'Trim through the gusts',
      pl: 'Reguluj w podmuchach',
      es: 'Ajusta en las rachas',
      fr: 'Regle dans les rafales',
      de: 'Trimme durch die Boen',
      it: 'Regola nelle raffiche',
    },
    goal: {
      ru: 'Авто-trim выключен. В порыв отдай шкот, удержи TRIM выше 75.',
      en: 'Auto-trim off. Ease the sheet in the gust, keep TRIM above 75.',
      pl: 'Auto-trim wylaczony. W podmuchu poluzuj szot, trzymaj TRIM ponad 75.',
      es: 'Auto-trim apagado. En la racha suelta escota, manten TRIM sobre 75.',
      fr: 'Auto-trim coupe. Dans la rafale choque, garde TRIM au-dessus de 75.',
      de: 'Auto-Trim aus. In der Boe Schot fieren, TRIM ueber 75 halten.',
      it: 'Auto-trim spento. Nella raffica lasca, tieni TRIM sopra 75.',
    },
    params: { targetSec: 60, trimTargetPct: 75 },
  },
  {
    id: 'noGoRecovery',
    kind: 'drill',
    platforms: ['mobile'],
    title: {
      ru: 'Выход из no-go',
      en: 'Recover from no-go',
      pl: 'Wyjscie z no-go',
      es: 'Salida de no-go',
      fr: 'Sortie de no-go',
      de: 'Aus dem No-go heraus',
      it: 'Uscita dal no-go',
    },
    goal: {
      ru: 'Нос в ветер. Увались и разгонись до 4 узлов за 30 сек.',
      en: 'Bow into the wind. Bear away and accelerate to 4 kt in 30 sec.',
      pl: 'Dziob w wiatr. Odpadnij i rozpedz do 4 wezlow w 30 sek.',
      es: 'Proa al viento. Arriba y acelera a 4 nudos en 30 seg.',
      fr: 'Etrave dans le vent. Abats et acceleres a 4 nd en 30 sec.',
      de: 'Bug in den Wind. Falle ab und beschleunige in 30 Sek auf 4 kt.',
      it: 'Prua al vento. Poggia e accelera a 4 nd in 30 sec.',
    },
    params: { targetSec: 30, speedTargetKn: 4 },
  },

  // --------------------------------------------------------------------------
  // Native Trainer missions (mark courses; marks + scoring stay in
  // mobile/src/simulator/missions.ts).
  // --------------------------------------------------------------------------
  {
    id: 'windwardReturn',
    kind: 'mission',
    platforms: ['mobile'],
    title: {
      ru: 'Обогни верхний знак',
      en: 'Round the windward mark',
      pl: 'Okraz znak nawietrzny',
      es: 'Redondea la baliza de barlovento',
      fr: 'Contourne la bouee au vent',
      de: 'Umrunde die Luvtonne',
      it: 'Gira la boa di bolina',
    },
    goal: {
      ru: 'Старт - верхний знак - финиш. Лавируй до знака.',
      en: 'Start, windward mark, finish. Tack up to the mark.',
      pl: 'Start, znak nawietrzny, meta. Halsuj do znaku.',
      es: 'Salida, baliza barlovento, meta. Vira hasta la baliza.',
      fr: 'Depart, bouee au vent, arrivee. Louvoie jusqu a la bouee.',
      de: 'Start, Luvtonne, Ziel. Kreuze zur Tonne hoch.',
      it: 'Partenza, boa al vento, arrivo. Bordeggia fino alla boa.',
    },
    params: { parSec: 90 },
  },
  {
    id: 'beamRun',
    kind: 'mission',
    platforms: ['mobile'],
    title: {
      ru: 'Галфвинд через канал',
      en: 'Beam reach across the channel',
      pl: 'Trasa polwiatrem',
      es: 'Cruce a traves',
      fr: 'Traversee au largue',
      de: 'Halbwind quer',
      it: 'Attraversata al traverso',
    },
    goal: {
      ru: 'Старт слева, знак справа - один галс на галфвинде.',
      en: 'Start left, mark right. One leg on a beam reach.',
      pl: 'Start z lewej, znak z prawej. Jeden hals polwiatrem.',
      es: 'Salida izquierda, baliza derecha. Una pierna al traves.',
      fr: 'Depart a gauche, bouee a droite. Une bordee au largue.',
      de: 'Start links, Tonne rechts. Ein Schenkel auf Halbwind.',
      it: 'Partenza a sinistra, boa a destra. Un lato al traverso.',
    },
    params: { parSec: 60 },
  },
  {
    id: 'tackTwice',
    kind: 'mission',
    platforms: ['mobile'],
    title: {
      ru: 'Лавировка до знака',
      en: 'Tack twice to the mark',
      pl: 'Dwa zwroty do znaku',
      es: 'Dos viradas hasta la baliza',
      fr: 'Deux virements vers la bouee',
      de: 'Zweimal wenden zur Tonne',
      it: 'Due virate fino alla boa',
    },
    goal: {
      ru: 'Лево, право, верх - три ноги до финиша.',
      en: 'Port, starboard, top. Three legs to the finish.',
      pl: 'Lewy, prawy, gora. Trzy odcinki do mety.',
      es: 'Babor, estribor, arriba. Tres piernas hasta la meta.',
      fr: 'Babord, tribord, haut. Trois bords jusqu a l arrivee.',
      de: 'Backbord, Steuerbord, oben. Drei Schenkel bis ins Ziel.',
      it: 'Babordo, tribordo, alto. Tre lati fino al traguardo.',
    },
    params: { parSec: 110 },
  },
];
