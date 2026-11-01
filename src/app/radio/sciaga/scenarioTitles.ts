// ============================================================================
// Polish scenario titles for the training certificate on /radio/sciaga.
// Importing SCENARIOS for 19 titles shipped the whole simulator to the crib
// page: scenarios.ts and the radio state machine it imports (about 84 KB of
// chunks), and that state machine was then copied into every radio route's
// chunk. courseIds.test.ts deep-compares this list with SCENARIOS, so adding
// or renaming a scenario fails the test until this file follows.
// ============================================================================

/** Polish title of each simulator scenario, in SCENARIOS order. */
export const SCENARIO_TITLES_PL: Readonly<Record<string, string>> = {
  "fire-mayday": "Pożar na jachcie - MAYDAY",
  "mob-mayday": "Człowiek za burtą - MAYDAY",
  "engine-panpan": "Awaria silnika, dryf - PAN-PAN",
  "securite-hazard": "Kontener na torze - SECURITE",
  "radio-check": "Radio check w marinie",
  "false-cancel": "Fałszywy alert DSC - odwołanie",
  "routine-marina": "Wywołanie mariny - miejsce w porcie",
  "vts-report": "Meldunek do VTS",
  "panpan-medico": "Kontuzja załogi - PAN-PAN medyczny",
  "dsc-test": "Test DSC do stacji brzegowej",
  "routine-ship": "Wywołanie innej jednostki przez DSC",
  "group-call": "Wywołanie grupowe - flota regatowa",
  "mayday-relay": "Retransmisja cudzego MAYDAY",
  "receive-distress": "Odbiór cudzego MAYDAY",
  "receive-call": "Odbiór wywołania indywidualnego DSC",
  "scan-memory": "Pamięć skanowania: sprawdź i dodaj kanały",
  "position-input": "Ręczne wprowadzenie pozycji i czasu",
  "id-add-lyngby": "Dodanie Lyngby do Individual ID",
  "id-delete-lyngby": "Usunięcie Lyngby z Individual ID",
};
