// ============================================================================
// Official UKE SRC exam question base (324 A/B/C questions) - parsed from
// bip.uke.gov.pl "materialy_do_testu_src.pdf" (the official study material;
// UKE publishes NO answer key).
//
// The answer key below was authored by a multi-agent workflow (2026-07-10):
// 11 answering agents (web-verified against ITU RR / SOLAS / GMDSS sources),
// 11 independent verifiers, 3 conflicts settled by an arbiter pass. Items
// with confidence 'unsure' are flagged in the UI. This is a STUDY AID, not
// an official key - see docs/design/sternik-radio.md.
//
// Content language: POLISH WITH DIACRITICS (exam-content policy, like
// src/data/sternik.ts). No em/en dashes.
// ============================================================================

export interface SrcQuestion {
  id: string;
  /** 1 = Regulaminy i terminy anglojezyczne, 2 = Wiedza GMDSS (obszar A1) */
  part: 1 | 2;
  q: string;
  options: string[];
  correct: number;
  whyPl: string;
  /** multi-agent key confidence; 'unsure' items are flagged in the UI */
  confidence: 'sure' | 'unsure';
}

export const SRC_PARTS = {
  1: 'Regulaminy i podstawowe terminy anglojęzyczne',
  2: 'Ogólna wiedza o podsystemach i urządzeniach GMDSS (obszar A1)',
} as const;

export const SRC_BANK: SrcQuestion[] = [
 {
  "id": "src-1-1",
  "part": 1,
  "q": "Zgodnie z kolejnością pierwszeństwa łączności:",
  "options": [
   "łączność ostrzegawcza ma pierwszeństwo przed łącznością pilną",
   "łączność ostrzegawcza ma pierwszeństwo przed łącznością publiczną",
   "łączność pilna ma pierwszeństwo przed łącznością w niebezpieczeństwie"
  ],
  "correct": 1,
  "whyPl": "Kolejność pierwszeństwa to: niebezpieczeństwo, pilność, ostrzeżenie (bezpieczeństwo), łączność publiczna, więc łączność ostrzegawcza wyprzedza publiczną.",
  "confidence": "sure"
 },
 {
  "id": "src-1-2",
  "part": 1,
  "q": "Łączność publiczna to łączność:",
  "options": [
   "dla uzyskania porady medycznej",
   "pomiędzy stacją statkową i stacją nadbrzeżną",
   "do przekazywania ostrzeżeń"
  ],
  "correct": 1,
  "whyPl": "Łączność publiczna (korespondencja publiczna) to wymiana informacji między stacją statkową a stacją nadbrzeżną, np. rozmowy prywatne kierowane do sieci lądowej.",
  "confidence": "sure"
 },
 {
  "id": "src-1-3",
  "part": 1,
  "q": "Stacja nadbrzeżna to stacja:",
  "options": [
   "w służbie radiokomunikacyjnej lądowej, prowadząca łączność w rejonie wybrzeża morskiego",
   "w służbie radiokomunikacyjnej lotniczej, prowadząca łączność w rejonie wybrzeża morskiego",
   "w służbie radiokomunikacyjnej ruchomej morskiej, prowadząca łączność w relacji statek-brzeg, brzeg-statek"
  ],
  "correct": 2,
  "whyPl": "Stacja nadbrzeżna to stacja lądowa morskiej służby ruchomej prowadząca łączność w relacjach statek-brzeg i brzeg-statek.",
  "confidence": "sure"
 },
 {
  "id": "src-1-4",
  "part": 1,
  "q": "Ratowniczy Ośrodek Koordynacyjny odpowiedzialny jest za:",
  "options": [
   "prowadzenie łączności na miejscu akcji ratowniczej",
   "przygotowanie służb portowych",
   "kierowanie akcją SAR"
  ],
  "correct": 2,
  "whyPl": "RCC (Ratowniczy Ośrodek Koordynacyjny) kieruje i koordynuje całą akcją poszukiwawczo-ratowniczą SAR w swoim rejonie odpowiedzialności.",
  "confidence": "sure"
 },
 {
  "id": "src-1-5",
  "part": 1,
  "q": "Pasmo VHF obejmuje częstotliwości:",
  "options": [
   "3 ÷ 30 MHz",
   "30 ÷ 300 MHz",
   "10 ÷ 100 MHz"
  ],
  "correct": 1,
  "whyPl": "Pasmo VHF to z definicji zakres częstotliwości od 30 do 300 MHz.",
  "confidence": "sure"
 },
 {
  "id": "src-1-6",
  "part": 1,
  "q": "Fale z pasma VHF to inaczej fale:",
  "options": [
   "milimetrowe",
   "centymetrowe",
   "metrowe"
  ],
  "correct": 2,
  "whyPl": "Fale VHF mają długość od 1 do 10 metrów, dlatego nazywa się je falami metrowymi.",
  "confidence": "sure"
 },
 {
  "id": "src-1-7",
  "part": 1,
  "q": "Morski zakres V obejmuje częstotliwości:",
  "options": [
   "10 ÷ 30 MHz",
   "300 ÷ 3000 kHz",
   "156 ÷ 174 MHz"
  ],
  "correct": 2,
  "whyPl": "Morski zakres VHF obejmuje częstotliwości 156-174 MHz zgodnie z Regulaminem Radiokomunikacyjnym ITU.",
  "confidence": "sure"
 },
 {
  "id": "src-1-8",
  "part": 1,
  "q": "Radiotelefoniczna stacja statkowa może być identyfikowana przez:",
  "options": [
   "numer seryjny radiotelefonu VHF",
   "znak wywoławczy lub nazwę stacji",
   "nazwę armatora/właściciela"
  ],
  "correct": 1,
  "whyPl": "W radiotelefonii stacja statkowa identyfikuje się znakiem wywoławczym lub nazwą stacji (nazwą jednostki).",
  "confidence": "sure"
 },
 {
  "id": "src-1-9",
  "part": 1,
  "q": "Simpleks to sposób pracy w kanale radiowym przy którym:",
  "options": [
   "nadawanie jest możliwe jednocześnie w obu kierunkach łączności",
   "obie stacje pracują simpleksem wykorzystując kanał dupleksowy",
   "nadawanie jest możliwe jedynie na zmianę w każdym kierunku łączności"
  ],
  "correct": 2,
  "whyPl": "Simpleks oznacza pracę na zmianę: w danej chwili nadaje tylko jedna strona łączności.",
  "confidence": "sure"
 },
 {
  "id": "src-1-10",
  "part": 1,
  "q": "Semidupleks to sposób pracy w kanale radiowym przy którym:",
  "options": [
   "nadawanie jest możliwe jednocześnie w obu kierunkach łączności",
   "nadawanie jest możliwe jedynie na zmianę w każdym kierunku łączności",
   "jedna stacja pracuje simpleksem a druga dupleksem"
  ],
  "correct": 2,
  "whyPl": "Semidupleks wg ITU to praca, w której jedna stacja pracuje simpleksem, a druga dupleksem.",
  "confidence": "sure"
 },
 {
  "id": "src-1-11",
  "part": 1,
  "q": "Dupleks to sposób pracy w kanale radiowym przy którym:",
  "options": [
   "nadawanie jest możliwe jednocześnie w obu kierunkach łączności",
   "nadawanie jest możliwe jedynie na zmianę w każdym kierunku łączności",
   "jedna stacja pracuje simpleksem a druga dupleksem"
  ],
  "correct": 0,
  "whyPl": "Dupleks umożliwia jednoczesne nadawanie i odbiór w obu kierunkach łączności.",
  "confidence": "sure"
 },
 {
  "id": "src-1-12",
  "part": 1,
  "q": "Kanał simpleksowy to kanał w którym:",
  "options": [
   "nadajemy i odbieramy na tej samej częstotliwości",
   "tylko nadajemy na określonej częstotliwości",
   "tylko odbieramy na określonej częstotliwości"
  ],
  "correct": 0,
  "whyPl": "Kanał simpleksowy wykorzystuje jedną częstotliwość, na której zarówno nadajemy, jak i odbieramy.",
  "confidence": "sure"
 },
 {
  "id": "src-1-13",
  "part": 1,
  "q": "Kanał dupleksowy to kanał w którym:",
  "options": [
   "nadajemy i odbieramy na tej samej częstotliwości",
   "tylko nadajemy na określonej częstotliwości",
   "nadajemy i odbieramy na różnych częstotliwościach"
  ],
  "correct": 2,
  "whyPl": "Kanał dupleksowy składa się z dwóch częstotliwości: innej do nadawania i innej do odbioru.",
  "confidence": "sure"
 },
 {
  "id": "src-1-14",
  "part": 1,
  "q": "Kanał 16 VHF jest kanałem:",
  "options": [
   "dupleksowym",
   "jednoczęstotliwościowym",
   "dwuczęstotliwościowym"
  ],
  "correct": 1,
  "whyPl": "Kanał 16 (156,800 MHz) jest kanałem jednoczęstotliwościowym, simpleksowym, do wywołań i łączności w niebezpieczeństwie.",
  "confidence": "sure"
 },
 {
  "id": "src-1-15",
  "part": 1,
  "q": "Kanał 6 VHF jest kanałem:",
  "options": [
   "dupleksowym",
   "dwuczęstotliwościowym",
   "simpleksowym"
  ],
  "correct": 2,
  "whyPl": "Kanał 6 (156,300 MHz) jest kanałem simpleksowym, przeznaczonym m.in. do łączności międzystatkowej i akcji SAR.",
  "confidence": "sure"
 },
 {
  "id": "src-1-16",
  "part": 1,
  "q": "Kanał 15 VHF jest kanałem:",
  "options": [
   "dupleksowym",
   "jednoczęstotliwościowym",
   "semidupleksowym"
  ],
  "correct": 1,
  "whyPl": "Kanał 15 (156,750 MHz) jest kanałem jednoczęstotliwościowym, czyli simpleksowym.",
  "confidence": "sure"
 },
 {
  "id": "src-1-17",
  "part": 1,
  "q": "Kanał 13 VHF jest kanałem:",
  "options": [
   "dupleksowym",
   "duosimpleksowym",
   "simpleksowym"
  ],
  "correct": 2,
  "whyPl": "Kanał 13 (156,650 MHz) jest kanałem simpleksowym, używanym do łączności mostek-mostek w sprawach bezpieczeństwa żeglugi.",
  "confidence": "sure"
 },
 {
  "id": "src-1-18",
  "part": 1,
  "q": "Kanał 70 VHF jest kanałem:",
  "options": [
   "dupleksowym",
   "jednoczęstotliwościowym",
   "semidupleksowym"
  ],
  "correct": 1,
  "whyPl": "Kanał 70 (156,525 MHz) jest kanałem jednoczęstotliwościowym, zarezerwowanym wyłącznie dla cyfrowego selektywnego wywołania DSC.",
  "confidence": "sure"
 },
 {
  "id": "src-1-19",
  "part": 1,
  "q": "W zakresie VHF, do wywołań ogólnych DSC można stosować kanał:",
  "options": [
   "26",
   "6",
   "70"
  ],
  "correct": 2,
  "whyPl": "Wszystkie wywołania DSC w zakresie VHF, w tym wywołania ogólne, nadaje się wyłącznie na kanale 70.",
  "confidence": "sure"
 },
 {
  "id": "src-1-20",
  "part": 1,
  "q": "W zakresie VHF, do wywołań międzystatkowych DSC można stosować kanał:",
  "options": [
   "15",
   "27",
   "70"
  ],
  "correct": 2,
  "whyPl": "Wywołania międzystatkowe DSC w zakresie VHF również odbywają się wyłącznie na kanale 70.",
  "confidence": "sure"
 },
 {
  "id": "src-1-21",
  "part": 1,
  "q": "Znak wywoławczy stacji statkowej to identyfikacja stosowana w łączności:",
  "options": [
   "jedynie publicznej",
   "radiotelefonicznej",
   "DSC"
  ],
  "correct": 1,
  "whyPl": "Znak wywoławczy służy do identyfikacji stacji w łączności radiotelefonicznej, natomiast w DSC stosuje się numer MMSI.",
  "confidence": "sure"
 },
 {
  "id": "src-1-22",
  "part": 1,
  "q": "MMSI to identyfikacja stosowana w łączności:",
  "options": [
   "międzystatkowej i ze stacją nadbrzeżną",
   "radiotelefonicznej",
   "jedynie międzystatkowej"
  ],
  "correct": 0,
  "whyPl": "MMSI identyfikuje stację w łączności DSC zarówno międzystatkowej, jak i ze stacjami nadbrzeżnymi.",
  "confidence": "sure"
 },
 {
  "id": "src-1-23",
  "part": 1,
  "q": "Znak wywoławczy stacji statkowej to identyfikacja przyznawana:",
  "options": [
   "przez właściciela jednostki",
   "tylko do łączności bezpieczeństwa",
   "przez administrację krajową z międzynarodowej serii znaków wywoławczych"
  ],
  "correct": 2,
  "whyPl": "Znak wywoławczy przyznaje administracja krajowa (w Polsce UKE) z międzynarodowej serii znaków przydzielonej przez ITU.",
  "confidence": "sure"
 },
 {
  "id": "src-1-24",
  "part": 1,
  "q": "Obszar morza w którym zapewniona jest pewna łączność DSC i radiotelefoniczna, przynajmniej z jedną stacją brzegową VHF to obszar:",
  "options": [
   "AOR",
   "A3",
   "A1"
  ],
  "correct": 2,
  "whyPl": "Obszar A1 to akwen w zasięgu przynajmniej jednej brzegowej stacji VHF zapewniającej ciągłą łączność DSC i radiotelefoniczną.",
  "confidence": "sure"
 },
 {
  "id": "src-1-25",
  "part": 1,
  "q": "Ratowniczy Ośrodek Koordynacyjny oznacza się skrótem:",
  "options": [
   "RSC",
   "OSC",
   "RCC"
  ],
  "correct": 2,
  "whyPl": "Ratowniczy Ośrodek Koordynacyjny to RCC (Rescue Coordination Centre).",
  "confidence": "sure"
 },
 {
  "id": "src-1-26",
  "part": 1,
  "q": "Podcentrum Ratownicze oznacza się skrótem:",
  "options": [
   "RSC",
   "OSC",
   "RCC"
  ],
  "correct": 0,
  "whyPl": "Podcentrum Ratownicze to RSC (Rescue Sub-Centre), podległe ośrodkowi RCC.",
  "confidence": "sure"
 },
 {
  "id": "src-1-27",
  "part": 1,
  "q": "Stację nadbrzeżną zaangażowaną w akcję SAR oznacza się skrótem:",
  "options": [
   "RSC",
   "OSC",
   "CRS"
  ],
  "correct": 2,
  "whyPl": "Stacja nadbrzeżna uczestnicząca w akcji SAR to CRS (Coast Radio Station).",
  "confidence": "sure"
 },
 {
  "id": "src-1-28",
  "part": 1,
  "q": "Jednostkę koordynującą poszukiwanie i ratowanie na miejscu akcji oznacza się skrótem:",
  "options": [
   "RSC",
   "OSC",
   "RCC"
  ],
  "correct": 1,
  "whyPl": "Jednostka koordynująca działania na miejscu akcji to OSC (On-Scene Coordinator).",
  "confidence": "sure"
 },
 {
  "id": "src-1-29",
  "part": 1,
  "q": "Zalecanym kanałem VHF do łączności w akcjach SAR jest kanał:",
  "options": [
   "26",
   "69",
   "6"
  ],
  "correct": 2,
  "whyPl": "Do łączności na miejscu akcji SAR zaleca się simpleksowy kanał 6 (156,300 MHz), używany też w relacji statek-statek powietrzny.",
  "confidence": "sure"
 },
 {
  "id": "src-1-30",
  "part": 1,
  "q": "Znak wywoławczy polskiej stacji statkowej może rozpoczynać się od jednego z prefiksów:",
  "options": [
   "GD, SZ, KO, PL, EU",
   "PL1 - PL9",
   "HF, SN, SO, SP, SQ, SR, 3Z"
  ],
  "correct": 2,
  "whyPl": "Polsce przydzielono w ITU prefiksy HF, SN, SO, SP, SQ, SR oraz 3Z, więc znak wywoławczy polskiej stacji statkowej zaczyna się od jednego z nich.",
  "confidence": "sure"
 },
 {
  "id": "src-1-31",
  "part": 1,
  "q": "Alarmowanie w niebezpieczeństwie zawiera:",
  "options": [
   "identyfikację i pozycję jednostki zagrożonej",
   "identyfikację, pozycję jednostki zagrożonej i liczbę osób na pokładzie jednostki",
   "znak wywoławczy, pozycję jednostki zagrożonej i liczbę rannych"
  ],
  "correct": 0,
  "whyPl": "Alarmowanie DSC zawiera identyfikację (MMSI) i pozycję jednostki zagrożonej, a liczba osób na pokładzie podawana jest dopiero w późniejszej korespondencji.",
  "confidence": "sure"
 },
 {
  "id": "src-1-32",
  "part": 1,
  "q": "W zakresie VHF, do radiotelefonicznych wywołań ogólnych można stosować kanał:",
  "options": [
   "6",
   "16",
   "66"
  ],
  "correct": 1,
  "whyPl": "Kanał 16 VHF jest kanałem wywoławczym do radiotelefonicznych wywołań ogólnych oraz łączności w niebezpieczeństwie.",
  "confidence": "sure"
 },
 {
  "id": "src-1-33",
  "part": 1,
  "q": "Alarmowanie w niebezpieczeństwie DSC adresowane jest:",
  "options": [
   "jedynie do najbliższej stacji nadbrzeżnej",
   "do wszystkich stacji",
   "jedynie do najbliższej stacji statkowej"
  ],
  "correct": 1,
  "whyPl": "Alarmowanie w niebezpieczeństwie DSC nadawane jest do wszystkich stacji (All Ships), aby każda mogła je odebrać.",
  "confidence": "sure"
 },
 {
  "id": "src-1-34",
  "part": 1,
  "q": "Operator stacji statkowej po odbiorze pośredniego alarmowania DSC nadanego przez stację nadbrzeżną powinien:",
  "options": [
   "natychmiast potwierdzić odbiór za pomocą DSC",
   "potwierdzić odbiór za pomocą radiotelefonii",
   "tylko dokonać zapisu w dzienniku radiowym"
  ],
  "correct": 1,
  "whyPl": "Pośrednie alarmowanie DSC od stacji nadbrzeżnej statek potwierdza radiotelefonią na kanale 16, bo potwierdzenia DSC są zastrzeżone dla stacji nadbrzeżnych.",
  "confidence": "sure"
 },
 {
  "id": "src-1-35",
  "part": 1,
  "q": "Operator stacji statkowej może nadać pośrednie alarmowanie w niebezpieczeństwie w sytuacji gdy:",
  "options": [
   "jednostka zagrożona sama nie jest w stanie nadać alarmowania",
   "tylko na prośbę stacji zagrożonej",
   "tylko na polecenie RCC"
  ],
  "correct": 0,
  "whyPl": "MAYDAY RELAY nadaje się przede wszystkim wtedy, gdy jednostka zagrożona sama nie jest w stanie nadać alarmowania.",
  "confidence": "sure"
 },
 {
  "id": "src-1-36",
  "part": 1,
  "q": "W zakresie VHF, operator stacji statkowej może nadać pośrednie alarmowanie DSC po odbiorze alarmowania DSC:",
  "options": [
   "nie wolno mu tego uczynić",
   "tylko na prośbę stacji zagrożonej",
   "tylko na prośbę RCC"
  ],
  "correct": 0,
  "whyPl": "Po odebraniu alarmu DSC w paśmie VHF statkowi nie wolno retransmitować go za pomocą DSC, informacje przekazuje się radiotelefonicznie lub do stacji nadbrzeżnej.",
  "confidence": "unsure"
 },
 {
  "id": "src-1-37",
  "part": 1,
  "q": "W zakresie VHF, operator stacji statkowej może nadać potwierdzenie odbioru alarmowania DSC:",
  "options": [
   "po 3 minutach od odebrania alarmowania",
   "po 4 minutach od odebrania alarmowania",
   "po 5 minutach od odebrania alarmowania i powiadomieniu o tym stacji nadbrzeżnej"
  ],
  "correct": 2,
  "whyPl": "Statek może potwierdzić alarm DSC dopiero po około 5 minutach, gdy żadna stacja nadbrzeżna nie potwierdziła, i po powiadomieniu o tym stacji nadbrzeżnej.",
  "confidence": "sure"
 },
 {
  "id": "src-1-38",
  "part": 1,
  "q": "W zakresie VHF, operator stacji statkowej może nadać potwierdzenie odbioru alarmowania DSC za pomocą:",
  "options": [
   "tylko DSC",
   "radiotelefonii lub DSC",
   "tylko radiotelefonii"
  ],
  "correct": 1,
  "whyPl": "Statek potwierdza odbiór alarmu DSC radiotelefonią na kanale 16, a w określonych warunkach także za pomocą DSC, więc obie metody są dopuszczalne.",
  "confidence": "sure"
 },
 {
  "id": "src-1-39",
  "part": 1,
  "q": "Operator stacji nadbrzeżnej może nadać potwierdzenie odbioru alarmowania DSC za pomocą:",
  "options": [
   "radiotelefonii lub DSC",
   "tylko DSC",
   "tylko radiotelefonii"
  ],
  "correct": 1,
  "whyPl": "Stacja nadbrzeżna potwierdza odbiór alarmowania DSC wyłącznie za pomocą DSC, co zatrzymuje automatyczne powtarzanie alarmu, a dalsza korespondencja odbywa się fonią.",
  "confidence": "sure"
 },
 {
  "id": "src-1-40",
  "part": 1,
  "q": "Przed każdym wywołaniem poprzedzającym korespondencję w niebezpieczeństwie należy użyć sygnału niebezpieczeństwa:",
  "options": [
   "PAN PAN",
   "MAYDAY",
   "DISTRESS"
  ],
  "correct": 1,
  "whyPl": "Każde wywołanie poprzedzające korespondencję w niebezpieczeństwie rozpoczyna sygnał MAYDAY.",
  "confidence": "sure"
 },
 {
  "id": "src-1-41",
  "part": 1,
  "q": "Stację zakłócającą korespondencję w niebezpieczeństwie może uciszać:",
  "options": [
   "tylko RCC",
   "każda stacja statkowa i nadbrzeżna",
   "OSC"
  ],
  "correct": 1,
  "whyPl": "Każda stacja statkowa i nadbrzeżna, która słyszy zakłócenia korespondencji w niebezpieczeństwie, ma prawo uciszyć stację zakłócającą.",
  "confidence": "sure"
 },
 {
  "id": "src-1-42",
  "part": 1,
  "q": "Sygnałem uciszania stacji zakłócającej korespondencje w niebezpieczeństwie jest sygnał:",
  "options": [
   "PAN PAN",
   "SEELONCE MAYDAY",
   "MAYDAY"
  ],
  "correct": 1,
  "whyPl": "Sygnałem uciszania stacji zakłócającej korespondencję w niebezpieczeństwie jest SEELONCE MAYDAY.",
  "confidence": "sure"
 },
 {
  "id": "src-1-43",
  "part": 1,
  "q": "Informację o zakończeniu korespondencji w niebezpieczeństwie może nadać:",
  "options": [
   "tylko RCC",
   "każda stacja statkowa i nadbrzeżna",
   "OSC"
  ],
  "correct": 0,
  "whyPl": "Informację o zakończeniu korespondencji w niebezpieczeństwie (SEELONCE FEENEE) nadaje stacja kierująca akcją, czyli RCC.",
  "confidence": "sure"
 },
 {
  "id": "src-1-44",
  "part": 1,
  "q": "Sygnałem zakończenia korespondencji w niebezpieczeństwie jest sygnał:",
  "options": [
   "PAN PAN",
   "SEELONCE MAYDAY",
   "SEELONCE FEENEE"
  ],
  "correct": 2,
  "whyPl": "SEELONCE FEENEE oznacza koniec ciszy radiowej i zakończenie korespondencji w niebezpieczeństwie.",
  "confidence": "sure"
 },
 {
  "id": "src-1-45",
  "part": 1,
  "q": "Korespondencją na miejscu akcji ratunkowej kieruje:",
  "options": [
   "RCC",
   "wyłącznie stacja nadbrzeżna",
   "OSC"
  ],
  "correct": 2,
  "whyPl": "Korespondencją na miejscu akcji ratunkowej kieruje OSC (On-Scene Coordinator), jednostka wyznaczona przez RCC.",
  "confidence": "sure"
 },
 {
  "id": "src-1-46",
  "part": 1,
  "q": "Korespondencją koordynacyjną SAR kieruje:",
  "options": [
   "wyłącznie stacja zagrożona",
   "OSC",
   "wyłącznie stacja nadbrzeżna"
  ],
  "correct": 1,
  "whyPl": "Korespondencją koordynacyjną SAR kieruje OSC, statek wyznaczony do koordynowania działań ratowniczych na miejscu zdarzenia.",
  "confidence": "sure"
 },
 {
  "id": "src-1-47",
  "part": 1,
  "q": "Łączność pilną stosuje się dla uzyskania:",
  "options": [
   "porady i pomocy medycznej",
   "pomocy nawigacyjnej",
   "ostrzeżeń meteorologicznych"
  ],
  "correct": 0,
  "whyPl": "Łączność pilna (PAN PAN) służy między innymi do uzyskania porady i pomocy medycznej.",
  "confidence": "sure"
 },
 {
  "id": "src-1-48",
  "part": 1,
  "q": "W zakresie VHF, wywołanie pilne DSC można nadać na kanale:",
  "options": [
   "26",
   "13",
   "70"
  ],
  "correct": 2,
  "whyPl": "Wszystkie wywołania DSC w paśmie VHF, w tym wywołanie pilne, nadaje się na kanale 70.",
  "confidence": "sure"
 },
 {
  "id": "src-1-49",
  "part": 1,
  "q": "Wywołanie pilne DSC powinno zawierać kategorię:",
  "options": [
   "URGENCY",
   "SAFETY",
   "DISTRESS"
  ],
  "correct": 0,
  "whyPl": "Wywołanie pilne DSC nadaje się z kategorią URGENCY.",
  "confidence": "sure"
 },
 {
  "id": "src-1-50",
  "part": 1,
  "q": "Przy braku potwierdzenia odbioru wywołania pilnego DSC do jednej stacji, może być ono powtórzone po:",
  "options": [
   "3 a następnie 10 minutach",
   "5 a następnie 10 minutach",
   "5 a następnie 15 minutach"
  ],
  "correct": 2,
  "whyPl": "Zgodnie z ITU-R M.541 wywołanie DSC do jednej stacji bez potwierdzenia można powtórzyć po 5 minutach, a kolejne powtórzenia dopiero po 15 minutach.",
  "confidence": "sure"
 },
 {
  "id": "src-1-51",
  "part": 1,
  "q": "Radiotelefonicznym sygnałem pilności jest sygnał:",
  "options": [
   "URGENCY",
   "PAN PAN",
   "DISTRESS"
  ],
  "correct": 1,
  "whyPl": "Radiotelefonicznym sygnałem pilności jest PAN PAN.",
  "confidence": "sure"
 },
 {
  "id": "src-1-52",
  "part": 1,
  "q": "W radiotelefonii sygnał pilności wymawia się:",
  "options": [
   "1 raz",
   "2 razy",
   "3 razy"
  ],
  "correct": 2,
  "whyPl": "Sygnał pilności PAN PAN wymawia się trzykrotnie.",
  "confidence": "sure"
 },
 {
  "id": "src-1-53",
  "part": 1,
  "q": "Łączność ostrzegawczą stosuje się dla:",
  "options": [
   "nadania porady medycznej",
   "odbioru ostrzeżeń pogodowych",
   "nadania alarmowania w niebezpieczeństwie"
  ],
  "correct": 1,
  "whyPl": "Łączność ostrzegawcza (SECURITE) obejmuje między innymi odbiór ostrzeżeń pogodowych i nawigacyjnych.",
  "confidence": "sure"
 },
 {
  "id": "src-1-54",
  "part": 1,
  "q": "W zakresie VHF, wywołanie ostrzegawcze DSC można nadać na kanale:",
  "options": [
   "12",
   "6",
   "70"
  ],
  "correct": 2,
  "whyPl": "Wywołanie ostrzegawcze DSC w paśmie VHF nadaje się, jak każde wywołanie DSC, na kanale 70.",
  "confidence": "sure"
 },
 {
  "id": "src-1-55",
  "part": 1,
  "q": "Wywołanie ostrzegawcze DSC powinno zawierać kategorie:",
  "options": [
   "URGENCY",
   "SAFETY",
   "DISTRESS"
  ],
  "correct": 1,
  "whyPl": "Wywołanie ostrzegawcze DSC nadaje się z kategorią SAFETY.",
  "confidence": "sure"
 },
 {
  "id": "src-1-56",
  "part": 1,
  "q": "Radiotelefonicznym sygnałem ostrzegawczym jest sygnał:",
  "options": [
   "URGENCY",
   "PAN PAN",
   "SECURITE"
  ],
  "correct": 2,
  "whyPl": "Radiotelefonicznym sygnałem ostrzegawczym jest SECURITE.",
  "confidence": "sure"
 },
 {
  "id": "src-1-57",
  "part": 1,
  "q": "W radiotelefonii sygnał ostrzegawczy wymawia się:",
  "options": [
   "1 raz",
   "2 razy",
   "3 razy"
  ],
  "correct": 2,
  "whyPl": "Sygnał ostrzegawczy SECURITE wymawia się trzykrotnie.",
  "confidence": "sure"
 },
 {
  "id": "src-1-58",
  "part": 1,
  "q": "Jeżeli urządzenie DSC nie jest podłączone do urządzeń nawigacyjnych, operator powinien wprowadzać do niego aktualną pozycję statku co najmniej:",
  "options": [
   "co 1 godzinę",
   "2 razy na dobę",
   "co 4 godziny"
  ],
  "correct": 2,
  "whyPl": "Gdy DSC nie jest podłączone do odbiornika nawigacyjnego, pozycję statku należy wprowadzać ręcznie co najmniej co 4 godziny.",
  "confidence": "sure"
 },
 {
  "id": "src-1-59",
  "part": 1,
  "q": "W zakresie VHF, radiotelefoniczne wezwanie w niebezpieczeństwie powinno być nadane na kanale:",
  "options": [
   "13",
   "16",
   "6"
  ],
  "correct": 1,
  "whyPl": "Kanał 16 VHF (156,8 MHz) to międzynarodowy kanał wzywania, bezpieczeństwa i łączności w niebezpieczeństwie, więc wezwanie MAYDAY nadaje się właśnie na nim.",
  "confidence": "sure"
 },
 {
  "id": "src-1-60",
  "part": 1,
  "q": "Wezwanie w niebezpieczeństwie nadane na kanale 16 VHF powinno rozpoczynać się od wywołania zawierającego sygnał niebezpieczeństwa MAYDAY wymówiony:",
  "options": [
   "1 raz",
   "2 razy",
   "3 razy"
  ],
  "correct": 2,
  "whyPl": "Wezwanie w niebezpieczeństwie rozpoczyna się od trzykrotnego wypowiedzenia sygnału: MAYDAY, MAYDAY, MAYDAY, aby zostało jednoznacznie rozpoznane przez wszystkie stacje.",
  "confidence": "sure"
 },
 {
  "id": "src-1-61",
  "part": 1,
  "q": "Korespondencja w niebezpieczeństwie nadana na kanale 16 VHF powinna rozpoczynać się od sygnału niebezpieczeństwa MAYDAY wymówionego:",
  "options": [
   "1 raz",
   "2 razy",
   "3 razy"
  ],
  "correct": 0,
  "whyPl": "Po pierwszym wezwaniu dalsza korespondencja w niebezpieczeństwie poprzedzana jest sygnałem MAYDAY wypowiedzianym tylko jeden raz.",
  "confidence": "sure"
 },
 {
  "id": "src-1-62",
  "part": 1,
  "q": "Potwierdzenie odbioru zawiadomienia w niebezpieczeństwie nadanego na kanale 16 VHF powinno być nadane na kanale:",
  "options": [
   "13",
   "26",
   "16"
  ],
  "correct": 2,
  "whyPl": "Potwierdzenie odbioru nadaje się na tym samym kanale 16, na którym prowadzi się całą korespondencję w niebezpieczeństwie.",
  "confidence": "sure"
 },
 {
  "id": "src-1-63",
  "part": 1,
  "q": "Potwierdzenie odbioru zawiadomienia w niebezpieczeństwie nadane na kanale 16 VHF powinno rozpoczynać się od sygnału niebezpieczeństwa MAYDAY wymówionego:",
  "options": [
   "1 raz",
   "2 razy",
   "3 razy"
  ],
  "correct": 0,
  "whyPl": "Potwierdzenie odbioru (RECEIVED MAYDAY) rozpoczyna się od sygnału MAYDAY wypowiedzianego jeden raz, potrójne MAYDAY dotyczy tylko pierwszego wezwania.",
  "confidence": "sure"
 },
 {
  "id": "src-1-64",
  "part": 1,
  "q": "Nadanie radiotelefonicznego zawiadomienia o niebezpieczeństwie przez stację w nim nie będącą powinno być poprzedzone sygnałem:",
  "options": [
   "MAYDAY",
   "MAYDAY MAYDAY MAYDAY",
   "MAYDAY RELAY MAYDAY RELAY MAYDAY RELAY"
  ],
  "correct": 2,
  "whyPl": "Stacja przekazująca cudze niebezpieczeństwo używa sygnału MAYDAY RELAY powtórzonego trzykrotnie, co odróżnia przekaz od własnego wezwania o pomoc.",
  "confidence": "sure"
 },
 {
  "id": "src-1-65",
  "part": 1,
  "q": "Sygnał pilności PAN PAN należy stosować przed wywołaniem dotyczącym:",
  "options": [
   "wypadnięcia człowieka za burtę",
   "uzyskania porady medycznej",
   "uzyskania ostrzeżenia nawigacyjnego"
  ],
  "correct": 1,
  "whyPl": "Uzyskanie porady medycznej to typowa łączność pilna PAN PAN, natomiast człowiek za burtą to zagrożenie życia (MAYDAY), a ostrzeżenia to SECURITE.",
  "confidence": "sure"
 },
 {
  "id": "src-1-66",
  "part": 1,
  "q": "Jeżeli stacja statkowa VHF nie posiada urządzenia DSC, wywołanie pilne (PAN PAN) powinno być nadane na kanale:",
  "options": [
   "12",
   "6",
   "16"
  ],
  "correct": 2,
  "whyPl": "Bez DSC wywołanie pilne PAN PAN nadaje się bezpośrednio na kanale 16, międzynarodowym kanale wzywania i bezpieczeństwa.",
  "confidence": "sure"
 },
 {
  "id": "src-1-67",
  "part": 1,
  "q": "Sygnał ostrzegawczy SECURITE należy stosować przed wywołaniem dotyczącym:",
  "options": [
   "wypadnięcia człowieka za burtę",
   "uzyskania porady medycznej",
   "nadania ostrzeżenia"
  ],
  "correct": 2,
  "whyPl": "Sygnał SECURITE poprzedza komunikaty ostrzegawcze, np. ostrzeżenia nawigacyjne lub meteorologiczne, a nie wezwania o pomoc.",
  "confidence": "sure"
 },
 {
  "id": "src-1-68",
  "part": 1,
  "q": "Jeżeli stacja statkowa VHF nie posiada urządzenia DSC, wywołanie ostrzegawcze (SECURITE) powinno być nadane na kanale:",
  "options": [
   "12",
   "6",
   "16"
  ],
  "correct": 2,
  "whyPl": "Bez DSC wywołanie ostrzegawcze SECURITE nadaje się na kanale 16, a sama treść ostrzeżenia zwykle na kanale roboczym.",
  "confidence": "sure"
 },
 {
  "id": "src-1-69",
  "part": 1,
  "q": "Kanał 75 VHF jest kanałem:",
  "options": [
   "do łączności w niebezpieczeństwie",
   "zabronionym dla zwykłej łączności publicznej",
   "bezpieczeństwa"
  ],
  "correct": 1,
  "whyPl": "Kanał 75 leży w paśmie ochronnym kanału 16, dlatego jest zabroniony dla zwykłej łączności publicznej.",
  "confidence": "sure"
 },
 {
  "id": "src-1-70",
  "part": 1,
  "q": "Kanał 76 VHF jest kanałem:",
  "options": [
   "do łączności w niebezpieczeństwie",
   "zabronionym dla zwykłej łączności publicznej",
   "bezpieczeństwa"
  ],
  "correct": 1,
  "whyPl": "Kanał 76, podobnie jak 75, stanowi pasmo ochronne kanału 16 i jest zabroniony dla zwykłej łączności publicznej.",
  "confidence": "sure"
 },
 {
  "id": "src-1-71",
  "part": 1,
  "q": "Kanał 15 VHF jest kanałem:",
  "options": [
   "do łączności w niebezpieczeństwie",
   "zabronionym dla łączności publicznej",
   "do łączności wewnątrzstatkowej z mocą zredukowaną do 1 W"
  ],
  "correct": 2,
  "whyPl": "Kanał 15 służy do łączności wewnątrzstatkowej (pokładowej) z mocą nadawania zredukowaną do 1 W.",
  "confidence": "sure"
 },
 {
  "id": "src-1-72",
  "part": 1,
  "q": "Kanał 17 VHF jest kanałem:",
  "options": [
   "do łączności wewnątrzstatkowej z mocą zredukowaną do 1 W",
   "zabronionym dla łączności publicznej",
   "do łączności w niebezpieczeństwie"
  ],
  "correct": 0,
  "whyPl": "Kanał 17, tak jak 15, przeznaczony jest do łączności wewnątrzstatkowej z mocą zredukowaną do 1 W.",
  "confidence": "sure"
 },
 {
  "id": "src-1-73",
  "part": 1,
  "q": "Kanał 13 VHF w pierwszej kolejności jest kanałem:",
  "options": [
   "do łączności związanej z bezpieczeństwem żeglugi",
   "zabronionym dla łączności publicznej",
   "wyłącznie do łączności międzystatkowej z mocą zredukowaną do 1 W"
  ],
  "correct": 0,
  "whyPl": "Kanał 13 to kanał typu mostek-mostek, w pierwszej kolejności przeznaczony do łączności związanej z bezpieczeństwem żeglugi.",
  "confidence": "sure"
 },
 {
  "id": "src-1-74",
  "part": 1,
  "q": "Kanał 6 VHF w pierwszej kolejności jest kanałem:",
  "options": [
   "do łączności związanej z bezpieczeństwem żeglugi",
   "zabronionym dla łączności publicznej",
   "do łączności SAR z samolotami"
  ],
  "correct": 2,
  "whyPl": "Zgodnie z Regulaminem Radiokomunikacyjnym kanał 06 służy w pierwszej kolejności do łączności w skoordynowanych akcjach SAR między statkami a statkami powietrznymi.",
  "confidence": "sure"
 },
 {
  "id": "src-1-75",
  "part": 1,
  "q": "Kanał 16 VHF w pierwszej kolejności jest kanałem:",
  "options": [
   "do łączności w niebezpieczeństwie",
   "zabronionym dla łączności publicznej",
   "do łączności międzystatkowej z mocą zredukowaną do 1 W"
  ],
  "correct": 0,
  "whyPl": "Kanał 16 w pierwszej kolejności służy do łączności w niebezpieczeństwie oraz wzywania i bezpieczeństwa.",
  "confidence": "sure"
 },
 {
  "id": "src-1-76",
  "part": 1,
  "q": "Kanał 70 VHF jest kanałem:",
  "options": [
   "do łączności radiotelefonicznej",
   "zabronionym dla łączności publicznej",
   "do alarmowania w niebezpieczeństwie"
  ],
  "correct": 2,
  "whyPl": "Kanał 70 jest zarezerwowany wyłącznie dla cyfrowego wywołania selektywnego DSC, w tym alarmowania w niebezpieczeństwie, i nie prowadzi się na nim łączności głosowej.",
  "confidence": "sure"
 },
 {
  "id": "src-1-77",
  "part": 1,
  "q": "Kanały „amerykańskie” (US):",
  "options": [
   "można wykorzystywać tylko do łączności związanej z bezpieczeństwem żeglugi",
   "są zabronione na Bałtyku",
   "nie są zabronione na wodach Unii Europejskiej"
  ],
  "correct": 2,
  "whyPl": "Kanały amerykańskie (US) nie są formalnie zabronione na wodach Unii Europejskiej, choć w Europie należy używać układu kanałów międzynarodowych INT.",
  "confidence": "sure"
 },
 {
  "id": "src-1-78",
  "part": 1,
  "q": "Gdy jednostka jest w morzu, testowanie wewnętrzne urządzenia VHF DSC powinno być przeprowadzone:",
  "options": [
   "codziennie",
   "dwa razy w tygodniu",
   "raz w miesiącu"
  ],
  "correct": 0,
  "whyPl": "Test wewnętrzny urządzenia DSC wykonuje się codziennie, bo sprawdza elektronikę bez emisji sygnału w eter.",
  "confidence": "sure"
 },
 {
  "id": "src-1-79",
  "part": 1,
  "q": "W zakresie VHF, testowanie urządzenia DSC polega na przeprowadzeniu testu:",
  "options": [
   "„wewnętrznego i zewnętrznego”",
   "tylko „wewnętrznego”",
   "„wewnętrznego albo zewnętrznego”"
  ],
  "correct": 0,
  "whyPl": "Pełne testowanie DSC w zakresie VHF obejmuje test wewnętrzny (elektronika) oraz zewnętrzny (rzeczywiste nadanie i odbiór sygnału DSC).",
  "confidence": "sure"
 },
 {
  "id": "src-1-80",
  "part": 1,
  "q": "Testowanie „zewnętrzne” urządzenia DSC w zakresie VHF powinno być przeprowadzane:",
  "options": [
   "codziennie",
   "zabronione jest takie testowanie",
   "raz w tygodniu"
  ],
  "correct": 2,
  "whyPl": "Test zewnętrzny DSC, wysyłający sygnał testowy w eter, wykonuje się raz w tygodniu, aby nie zakłócać nadmiernie kanału 70.",
  "confidence": "sure"
 },
 {
  "id": "src-1-81",
  "part": 1,
  "q": "W zakresie VHF, radiotelefoniczne odwołanie fałszywego alarmowania DSC powinno być nadane na kanale:",
  "options": [
   "13",
   "70",
   "16"
  ],
  "correct": 2,
  "whyPl": "Radiotelefoniczne odwołanie fałszywego alarmu nadaje się głosowo na kanale 16, bo kanał 70 służy wyłącznie do transmisji cyfrowych DSC.",
  "confidence": "sure"
 },
 {
  "id": "src-1-82",
  "part": 1,
  "q": "Odwołanie fałszywego alarmowania nadanego za pomocą DSC powinno być skierowane:",
  "options": [
   "do najbliższej stacji nadbrzeżnej",
   "do najbliższej stacji statkowej",
   "do wszystkich stacji"
  ],
  "correct": 2,
  "whyPl": "Fałszywy alarm DSC mógł odebrać każdy w zasięgu, dlatego odwołanie kieruje się do wszystkich stacji (ALL SHIPS).",
  "confidence": "sure"
 },
 {
  "id": "src-1-83",
  "part": 1,
  "q": "Odwołanie fałszywego alarmowania nadanego za pomocą EPIRB powinno być skierowane do:",
  "options": [
   "stacji nadbrzeżnej",
   "najbliższej stacji statkowej",
   "wszystkich stacji"
  ],
  "correct": 0,
  "whyPl": "Fałszywy alarm EPIRB odwołuje się poprzez najbliższą stację nadbrzeżną (ratowniczy ośrodek koordynacyjny), bo to system satelitarny, a nie łączność międzystatkowa.",
  "confidence": "sure"
 },
 {
  "id": "src-1-84",
  "part": 1,
  "q": "Odwołując fałszywe alarmowanie należy podać następujące informacje:",
  "options": [
   "pozycję jednostki, rodzaj odwoływanego alarmowania, godzinę nadania i odwołania fałszywego alarmowania",
   "rodzaj odwoływanego alarmowania, godzinę nadania i ostatni port postoju jednostki",
   "tylko godzinę nadania fałszywego alarmowania i ostatni port postoju jednostki"
  ],
  "correct": 0,
  "whyPl": "W odwołaniu podaje się pozycję jednostki, rodzaj odwoływanego alarmowania oraz godzinę nadania i odwołania fałszywego alarmu.",
  "confidence": "sure"
 },
 {
  "id": "src-1-85",
  "part": 1,
  "q": "Dla radiotelefonów osobistych (przenośnych), wykorzystywanych w służbie radiokomunikacyjnej morskiej, posiadających DSC, nadaje się numer identyfikacyjny:",
  "options": [
   "taki sam jak MMSI jednostki pływającej, na której aktualnie jest wykorzystywany",
   "dziewięciocyfrowy o postaci: 8MIDXXXXX, gdzie MID to trzycyfrowy kod kraju, X to cyfra od 0 do 9",
   "dziewięciocyfrowy, określany przez producenta urządzenia"
  ],
  "correct": 1,
  "whyPl": "Zgodnie z ITU-R M.585 przenośne radiotelefony z DSC otrzymują dziewięciocyfrowy numer w formacie 8MIDXXXXX, gdzie MID to kod kraju.",
  "confidence": "sure"
 },
 {
  "id": "src-1-86",
  "part": 1,
  "q": "Nadając wywołanie publiczne DSC należy wybrać priorytet (kategorie):",
  "options": [
   "DISTRESS",
   "URGENCY",
   "ROUTINE"
  ],
  "correct": 2,
  "whyPl": "Łączność publiczna (rutynowa) ma najniższy priorytet DSC, czyli kategorię ROUTINE.",
  "confidence": "sure"
 },
 {
  "id": "src-1-87",
  "part": 1,
  "q": "Stacja statkowa VHF nadając wywołanie publiczne DSC do innej stacji statkowej powinna użyć kanału:",
  "options": [
   "70",
   "67",
   "26"
  ],
  "correct": 0,
  "whyPl": "Wszystkie wywołania DSC w zakresie VHF, także publiczne, nadaje się na kanale 70, a dopiero rozmowę prowadzi się na kanale roboczym.",
  "confidence": "sure"
 },
 {
  "id": "src-1-88",
  "part": 1,
  "q": "Stacja statkowa nadając wywołanie publiczne DSC do innej stacji statkowej:",
  "options": [
   "może podać kanał roboczy",
   "nie powinna podawać kanału roboczego",
   "musi podać kanał roboczy"
  ],
  "correct": 2,
  "whyPl": "W wywołaniu publicznym DSC do innej stacji statkowej stacja wywołująca musi podać proponowany kanał roboczy, na który obie stacje przejdą po wywołaniu.",
  "confidence": "sure"
 },
 {
  "id": "src-1-89",
  "part": 1,
  "q": "Stacja statkowa nadając wywołanie publiczne DSC do stacji nadbrzeżnej:",
  "options": [
   "powinna podać kanał roboczy",
   "nie powinna podawać kanału roboczego",
   "może podać kanał roboczy"
  ],
  "correct": 1,
  "whyPl": "Przy wywołaniu DSC do stacji nadbrzeżnej to stacja nadbrzeżna wyznacza kanał roboczy, więc statek nie podaje własnej propozycji.",
  "confidence": "sure"
 },
 {
  "id": "src-1-90",
  "part": 1,
  "q": "Po przejściu na kanał roboczy, łączność publiczną inicjuje:",
  "options": [
   "stacja wywołująca za pomocą DSC",
   "zawsze stacja wywoływana za pomocą DSC",
   "stacja wywoływana za pomocą DSC jeżeli tak podano w wywołaniu DSC"
  ],
  "correct": 0,
  "whyPl": "Po przejściu na kanał roboczy rozmowę rozpoczyna stacja, która nadała wywołanie DSC, czyli stacja wywołująca.",
  "confidence": "sure"
 },
 {
  "id": "src-1-91",
  "part": 1,
  "q": "Stacja statkowa VHF nadając wywołanie publiczne do innej stacji statkowej może użyć kanału:",
  "options": [
   "25",
   "16",
   "26"
  ],
  "correct": 1,
  "whyPl": "Kanał 16 służy do wywołania w relacji statek-statek, a kanały 25 i 26 to dupleksowe kanały korespondencji publicznej stacji nadbrzeżnych.",
  "confidence": "sure"
 },
 {
  "id": "src-1-92",
  "part": 1,
  "q": "Stacja statkowa VHF nadając wywołanie publiczne do stacji nadbrzeżnej może użyć kanału:",
  "options": [
   "15",
   "16",
   "6"
  ],
  "correct": 1,
  "whyPl": "Gdy nie jest znany kanał roboczy stacji nadbrzeżnej, wywołanie nadaje się na kanale 16; kanały 15 i 6 mają inne przeznaczenie.",
  "confidence": "sure"
 },
 {
  "id": "src-1-93",
  "part": 1,
  "q": "Radiotelefoniczne wywołanie publiczne w zakresie VHF powinno mieć formę:",
  "options": [
   "nazwa stacji wywoływanej (1x) This is nazwa stacji wywołującej (2x)",
   "nazwa stacji wywoływanej (1x) This is nazwa stacji wywołującej (3x)",
   "nazwa stacji wywoływanej (2x) This is nazwa stacji wywołującej (2x)"
  ],
  "correct": 0,
  "whyPl": "Zgodnie z procedurą wywołanie ma formę: nazwa stacji wywoływanej raz, This is, nazwa stacji wywołującej dwa razy.",
  "confidence": "sure"
 },
 {
  "id": "src-1-94",
  "part": 1,
  "q": "Radiotelefoniczna odpowiedź na wywołanie publiczne w zakresie VHF powinna mieć formę:",
  "options": [
   "nazwa stacji wywołującej (1x) This is nazwa stacji wywoływanej (2x)",
   "nazwa stacji wywoływanej (4x) This is nazwa stacji wywołującej (4x)",
   "nazwa stacji wywołującej (2x) This is nazwa stacji wywoływanej (2x)"
  ],
  "correct": 0,
  "whyPl": "Odpowiedź ma formę: nazwa stacji wywołującej raz, This is, nazwa stacji wywoływanej dwa razy.",
  "confidence": "sure"
 },
 {
  "id": "src-1-95",
  "part": 1,
  "q": "Wywołanie i odpowiedź na wywołanie na kanale 16 VHF nie powinny przekraczać:",
  "options": [
   "1 minuty",
   "2 minut",
   "3 minut"
  ],
  "correct": 0,
  "whyPl": "Kanał 16 to kanał bezpieczeństwa, dlatego wywołanie i odpowiedź nie powinny trwać dłużej niż jedną minutę.",
  "confidence": "sure"
 },
 {
  "id": "src-1-96",
  "part": 1,
  "q": "Stacja statkowa VHF z DSC, gdy znajduje się w morzu, utrzymuje ciągły nasłuch radiowy na kanale:",
  "options": [
   "26",
   "70",
   "6"
  ],
  "correct": 1,
  "whyPl": "Statek z DSC utrzymuje w morzu ciągły nasłuch na kanale 70, przeznaczonym wyłącznie dla cyfrowego selektywnego wywołania.",
  "confidence": "sure"
 },
 {
  "id": "src-1-97",
  "part": 1,
  "q": "W łączności stacji statkowej ze stacją nadbrzeżną, o przebiegu korespondencji decyduje:",
  "options": [
   "stacja statkowa",
   "RCC",
   "stacja nadbrzeżna"
  ],
  "correct": 2,
  "whyPl": "W relacji statek-brzeg o przebiegu korespondencji decyduje stacja nadbrzeżna, która kieruje wymianą.",
  "confidence": "sure"
 },
 {
  "id": "src-1-98",
  "part": 1,
  "q": "Wykaz korespondencji (traffic list) nadawany jest przez:",
  "options": [
   "stację statkową",
   "RCC",
   "stację nadbrzeżną"
  ],
  "correct": 2,
  "whyPl": "Traffic list, czyli wykaz korespondencji oczekującej na statki, nadają stacje nadbrzeżne w ustalonych terminach.",
  "confidence": "sure"
 },
 {
  "id": "src-1-99",
  "part": 1,
  "q": "Jeżeli wywoływana stacja nie odpowiada na wywołanie publiczne DSC, kolejne można powtórzyć po:",
  "options": [
   "3 minutach",
   "5 minutach",
   "8 minutach"
  ],
  "correct": 1,
  "whyPl": "Zgodnie z ITU-R M.541 rutynowe wywołanie DSC bez odpowiedzi można powtórzyć po 5 minutach.",
  "confidence": "sure"
 },
 {
  "id": "src-1-100",
  "part": 1,
  "q": "Jeżeli wywoływana stacja nie odpowiada na radiotelefoniczne wywołanie publiczne, kolejne można powtórzyć po:",
  "options": [
   "4 minutach, a następne po 1 minucie",
   "5 minutach, a następne po 10 minutach",
   "2 minutach, a następne po 3 minutach"
  ],
  "correct": 2,
  "whyPl": "Wywołanie radiotelefoniczne powtarza się po 2 minutach, a kolejne dopiero po 3 minutach.",
  "confidence": "sure"
 },
 {
  "id": "src-1-101",
  "part": 1,
  "q": "Jednostka pływająca może zrealizować radiotelefoniczną łączność publiczną z abonentem telekomunikacyjnej sieci lądowej:",
  "options": [
   "bezpośrednio przez telekomunikacyjną sieć lądową",
   "za pośrednictwem innej, większej stacji statkowej",
   "za pośrednictwem stacji nadbrzeżnej"
  ],
  "correct": 2,
  "whyPl": "Łączność z abonentem sieci lądowej realizuje się za pośrednictwem stacji nadbrzeżnej, która łączy statek z siecią telefoniczną.",
  "confidence": "sure"
 },
 {
  "id": "src-1-102",
  "part": 1,
  "q": "Radiotelefoniczną łączność publiczną z telekomunikacyjną siecią lądową, prowadzi się na kanale:",
  "options": [
   "16",
   "13",
   "wskazanym przez stację nadbrzeżną"
  ],
  "correct": 2,
  "whyPl": "Rozmowę publiczną prowadzi się na kanale roboczym wskazanym przez stację nadbrzeżną, nigdy na kanale 16.",
  "confidence": "sure"
 },
 {
  "id": "src-1-103",
  "part": 1,
  "q": "Prowadząc łączność radiotelefoniczną, sygnałem zakończenia wypowiedzi jest sygnał:",
  "options": [
   "PAN PAN",
   "OVER",
   "STOP"
  ],
  "correct": 1,
  "whyPl": "OVER oznacza koniec wypowiedzi i zaproszenie drugiej stacji do nadawania.",
  "confidence": "sure"
 },
 {
  "id": "src-1-104",
  "part": 1,
  "q": "Prowadząc łączność radiotelefoniczną, sygnałem zakończenia łączności jest sygnał:",
  "options": [
   "OVER AND OUT",
   "OVER",
   "STOP"
  ],
  "correct": 0,
  "whyPl": "Sposrod podanych opcji najlepsza jest OVER AND OUT, ale scisle proceduralnie zakonczenie lacznosci sygnalizuje sie slowem OUT; 'over and out' laczy dwa sprzeczne zwroty.",
  "confidence": "sure"
 },
 {
  "id": "src-1-105",
  "part": 1,
  "q": "Po przejściu na kanał roboczy, radiotelefoniczne wywołanie publiczne powinno mieć formę:",
  "options": [
   "nazwa stacji wywoływanej (4x) This is nazwa stacji wywołującej (4x)",
   "nazwa stacji wywoływanej (1x) This is nazwa stacji wywołującej (1x)",
   "nazwa stacji wywoływanej (2x) This is nazwa stacji wywołującej (2x)"
  ],
  "correct": 1,
  "whyPl": "Po przejściu na kanał roboczy kontakt jest już nawiązany, więc nazwy obu stacji podaje się tylko raz.",
  "confidence": "sure"
 },
 {
  "id": "src-1-106",
  "part": 1,
  "q": "Stacja nadbrzeżna pytając stację statkową o jej położenie może użyć skrótu:",
  "options": [
   "QRJ",
   "AAIC",
   "QTH"
  ],
  "correct": 2,
  "whyPl": "Skrót QTH z kodu Q oznacza pytanie o pozycję stacji; QRJ dotyczy liczby rozmów, a AAIC to podmiot rozliczeniowy.",
  "confidence": "sure"
 },
 {
  "id": "src-1-107",
  "part": 1,
  "q": "Publikacja ITU „Spis stacji nadbrzeżnych” zawiera podstawowe dane o:",
  "options": [
   "stacjach nadbrzeżnych otwartych dla korespondencji publicznej",
   "tylko stacjach nadbrzeżnych nadających MSI",
   "tylko stacjach nadbrzeżnych nadających prognozy pogody"
  ],
  "correct": 0,
  "whyPl": "Spis stacji nadbrzeżnych ITU obejmuje stacje otwarte dla korespondencji publicznej, a nie tylko nadające MSI czy prognozy pogody.",
  "confidence": "sure"
 },
 {
  "id": "src-1-108",
  "part": 1,
  "q": "Publikacja ITU „Spis stacji nadbrzeżnych” zawiera podstawowe dane o:",
  "options": [
   "tylko stacjach nadbrzeżnych otwartych dla korespondencji publicznej",
   "stacjach nadbrzeżnych nadających MSI",
   "RSC"
  ],
  "correct": 1,
  "whyPl": "Połączony spis ITU zawiera także stacje nadbrzeżne nadające MSI, więc wariant ograniczony tylko do korespondencji publicznej jest za wąski.",
  "confidence": "sure"
 },
 {
  "id": "src-1-109",
  "part": 1,
  "q": "W Polsce, dokument „Pozwolenie radiowe na stację statkową” wydaje:",
  "options": [
   "PRS",
   "Urząd Morski (UM)",
   "Urząd Komunikacji Elektronicznej (UKE)"
  ],
  "correct": 2,
  "whyPl": "Pozwolenia radiowe na stacje statkowe wydaje w Polsce Prezes Urzędu Komunikacji Elektronicznej.",
  "confidence": "sure"
 },
 {
  "id": "src-1-110",
  "part": 1,
  "q": "Dokument „Pozwolenie radiowe na stację statkową” poświadcza o zgodności zainstalowanych na jednostce urządzeń radiowych z",
  "options": [
   "przepisami PRS",
   "postanowieniami Regulaminu Radiokomunikacyjnego ITU",
   "prawidłami Konwencji SOLAS"
  ],
  "correct": 1,
  "whyPl": "Pozwolenie radiowe potwierdza zgodność zainstalowanych urządzeń z postanowieniami Regulaminu Radiokomunikacyjnego ITU.",
  "confidence": "sure"
 },
 {
  "id": "src-1-111",
  "part": 1,
  "q": "W Polsce, dokument „Karta bezpieczeństwa” jest przyznawany przez",
  "options": [
   "PRS",
   "Urząd Komunikacji Elektronicznej (UKE)",
   "Urząd Morski (UM)"
  ],
  "correct": 2,
  "whyPl": "Kartę bezpieczeństwa jednostce wydaje dyrektor właściwego Urzędu Morskiego.",
  "confidence": "sure"
 },
 {
  "id": "src-1-112",
  "part": 1,
  "q": "„Świadectwo operatora łączności bliskiego zasięgu (SRC)” upoważnia do obsługi urządzeń radiowych wykorzystujących częstotliwości i techniki stosowane w GMDSS na statkach morskich niepodlegających Konwencji SOLAS:",
  "options": [
   "w pasmach częstotliwości VHF, MF i HF",
   "na obszarze morza A1",
   "tylko w paśmie częstotliwości VHF"
  ],
  "correct": 1,
  "whyPl": "Definicja z rozporzadzenia (Dz.U. 2015 poz. 99, par. 3 pkt 8): swiadectwo SRC uprawnia do obslugi urzadzen radiowych wykorzystujacych czestotliwosci i techniki stosowane w GMDSS na statkach morskich niepodlegajacych Konwencji SOLAS, na obszarze morza A1. Pytanie cytuje definicje doslownie, a konczy ja zwrot 'na obszarze morza A1'. Odpowiedz 'tylko w pasmie VHF' to stara wersja z poprzedniego banku pytan.",
  "confidence": "sure"
 },
 {
  "id": "src-1-113",
  "part": 1,
  "q": "W „Dzienniku radiowym” należy odnotowywać",
  "options": [
   "przynajmniej raz dziennie pozycję jednostki",
   "liczbę członków załogi",
   "pozycję jednostki minimum trzy razy na dobę"
  ],
  "correct": 0,
  "whyPl": "W dzienniku radiowym odnotowuje się pozycję jednostki przynajmniej raz dziennie.",
  "confidence": "sure"
 },
 {
  "id": "src-1-114",
  "part": 1,
  "q": "Zapewnienie tajemnicy korespondencji polega na tym, że:",
  "options": [
   "tylko informacja wychodząca ze stacji nie może trafić do osób trzecich",
   "tylko informacja przychodząca do stacji nie może trafić do osób trzecich",
   "informacja przychodząca i wychodząca ze stacji nie może trafić do osób trzecich"
  ],
  "correct": 2,
  "whyPl": "Tajemnica korespondencji obejmuje zarówno informacje przychodzące do stacji, jak i z niej wychodzące.",
  "confidence": "sure"
 },
 {
  "id": "src-1-115",
  "part": 1,
  "q": "Potrzebuję asysty.",
  "options": [
   "I require assistance.",
   "I require escort.",
   "I need attention."
  ],
  "correct": 1,
  "whyPl": "Asysta to po angielsku escort, więc poprawny zwrot brzmi I require escort; I require assistance znaczy potrzebuję pomocy.",
  "confidence": "sure"
 },
 {
  "id": "src-1-116",
  "part": 1,
  "q": "Pożar w nadbudówce.",
  "options": [
   "Superstructure is fireing.",
   "I am having fire in superstructure.",
   "Superstructure on fire."
  ],
  "correct": 2,
  "whyPl": "Standardowy zwrot morski to Superstructure on fire; pozostałe wersje są językowo błędne.",
  "confidence": "sure"
 },
 {
  "id": "src-1-117",
  "part": 1,
  "q": "Nabieram wody.",
  "options": [
   "I am flooding.",
   "I am making water",
   "I am taking water."
  ],
  "correct": 1,
  "whyPl": "'I am making water' to standardowy morski idiom oznaczajacy 'nabieram wody' (przeciek kadluba). 'I am taking water' i 'I am flooding' sa zrozumiale, ale nie sa standardowymi zwrotami slownika morskiego uzywanego w banku UKE; w starszych wersjach banku wlasnie 'I am making water' bylo opcja kluczowana jako poprawna.",
  "confidence": "sure"
 },
 {
  "id": "src-1-118",
  "part": 1,
  "q": "Czy możecie udzielić pomocy?",
  "options": [
   "Are you helping me?",
   "Can you render assistance?",
   "Do you help me?"
  ],
  "correct": 1,
  "whyPl": "Standardowy zwrot SMCP na prośbę o pomoc to 'Can you render assistance?', pozostałe opcje są kalkami językowymi.",
  "confidence": "sure"
 },
 {
  "id": "src-1-119",
  "part": 1,
  "q": "Czy możesz podjąć rozbitków?",
  "options": [
   "Can you receive survivors?",
   "Can you require survivors?",
   "Can you pick up survivors?"
  ],
  "correct": 2,
  "whyPl": "'Pick up survivors' to standardowe wyrażenie SMCP oznaczające podjęcie rozbitków z wody.",
  "confidence": "sure"
 },
 {
  "id": "src-1-120",
  "part": 1,
  "q": "Widzialność jest zmniejszona z powodu mgły.",
  "options": [
   "Visibility is getting foggy.",
   "Visibility is reduced by fog.",
   "Visibility is reduced by snow."
  ],
  "correct": 1,
  "whyPl": "'Visibility is reduced by fog' dokładnie oddaje zmniejszenie widzialności z powodu mgły, opcja ze śniegiem dotyczy śniegu.",
  "confidence": "sure"
 },
 {
  "id": "src-1-121",
  "part": 1,
  "q": "Podaj liczbę rannych.",
  "options": [
   "Say injured persons.",
   "Inform injured.",
   "Report injured persons."
  ],
  "correct": 2,
  "whyPl": "W SMCP polecenie podania liczby rannych brzmi 'Report injured persons', czasownik 'report' jest standardem meldunkowym.",
  "confidence": "sure"
 },
 {
  "id": "src-1-122",
  "part": 1,
  "q": "Stan rozbitków jest dobry.",
  "options": [
   "Survivors in good condition.",
   "Survivors are good.",
   "Survivors in bad condition."
  ],
  "correct": 0,
  "whyPl": "'Survivors in good condition' to standardowy meldunek o dobrym stanie rozbitków.",
  "confidence": "sure"
 },
 {
  "id": "src-1-123",
  "part": 1,
  "q": "Przechodzę na kanał … UKF.",
  "options": [
   "I am coming to canal ... VHF.",
   "I am going to channel ... UKF.",
   "Changing to channel ... VHF."
  ],
  "correct": 2,
  "whyPl": "'Changing to channel ... VHF' jest poprawne, bo po angielsku pasmo nazywa się VHF, a 'canal' oznacza kanał wodny.",
  "confidence": "sure"
 },
 {
  "id": "src-1-124",
  "part": 1,
  "q": "Śruba statku jest uszkodzona.",
  "options": [
   "Propeller damaged.",
   "Bolt damaged.",
   "Propeller are damaged."
  ],
  "correct": 0,
  "whyPl": "'Propeller damaged' to poprawny zwięzły meldunek, 'bolt' to śruba mechaniczna, a 'propeller are' jest błędem gramatycznym.",
  "confidence": "sure"
 },
 {
  "id": "src-1-125",
  "part": 1,
  "q": "Zalecam ci przejść na kanał UKF",
  "options": [
   "I recommend to come to channel VHF.",
   "I recommend to switch on to UKF channel.",
   "Advise go to VHF channel."
  ],
  "correct": 2,
  "whyPl": "'Advise go to VHF channel' odpowiada konwencji SMCP 'Advise you change to channel', a UKF to skrót wyłącznie polski.",
  "confidence": "sure"
 },
 {
  "id": "src-1-126",
  "part": 1,
  "q": "Dryfuję z prędkością 2 węzłów.",
  "options": [
   "I am adrift.",
   "I am drifting at 2 knots.",
   "I am proceeding with drift."
  ],
  "correct": 1,
  "whyPl": "'I am drifting at 2 knots' precyzyjnie podaje dryfowanie z prędkością 2 węzłów.",
  "confidence": "sure"
 },
 {
  "id": "src-1-127",
  "part": 1,
  "q": "Brak zasilania.",
  "options": [
   "No current.",
   "No feedback.",
   "No power supply."
  ],
  "correct": 2,
  "whyPl": "'No power supply' to standardowe określenie braku zasilania, 'no current' i 'no feedback' znaczą co innego.",
  "confidence": "sure"
 },
 {
  "id": "src-1-128",
  "part": 1,
  "q": "Kiedy nadejdzie pomoc?",
  "options": [
   "When is assistance going?",
   "When help is to come?",
   "When will assistance arrive?"
  ],
  "correct": 2,
  "whyPl": "'When will assistance arrive?' to jedyne poprawne gramatycznie pytanie o czas przybycia pomocy.",
  "confidence": "sure"
 },
 {
  "id": "src-1-129",
  "part": 1,
  "q": "Mam kłopoty z silnikiem głównym.",
  "options": [
   "I do not have main engine.",
   "I have difficulty with main engine",
   "I have problems with main engine."
  ],
  "correct": 2,
  "whyPl": "SMCP używa zwrotu 'I have problems with main engine' do zgłaszania kłopotów z silnikiem głównym.",
  "confidence": "sure"
 },
 {
  "id": "src-1-130",
  "part": 1,
  "q": "Mam niebezpieczny przechył na lewą burtę.",
  "options": [
   "I have dangerous list to port.",
   "I am having a heel to left side.",
   "I am heel dangerously to port."
  ],
  "correct": 0,
  "whyPl": "Zwrot SMCP to 'I have dangerous list to port', gdzie 'list' oznacza przechył, a 'port' lewą burtę.",
  "confidence": "sure"
 },
 {
  "id": "src-1-131",
  "part": 1,
  "q": "Mam problemy z urządzeniem sterowym.",
  "options": [
   "I have problems with steering gear.",
   "I have problems with rudder.",
   "I have problems with steering."
  ],
  "correct": 0,
  "whyPl": "Urządzenie sterowe to po angielsku 'steering gear', stąd 'I have problems with steering gear'.",
  "confidence": "sure"
 },
 {
  "id": "src-1-132",
  "part": 1,
  "q": "I read you (dobrze).",
  "options": [
   "fair",
   "good",
   "very well"
  ],
  "correct": 1,
  "whyPl": "W radiowej skali czytelności 'dobrze' odpowiada słowu 'good' (stopień 4 w skali 1-5).",
  "confidence": "sure"
 },
 {
  "id": "src-1-133",
  "part": 1,
  "q": "Nie odpowiadam za swoje ruchy.",
  "options": [
   "I am not responsible for my movements.",
   "I do not have responsibility for my moving.",
   "I am not under command."
  ],
  "correct": 2,
  "whyPl": "'I am not under command' to morski zwrot z COLREG/SMCP oznaczający statek nieodpowiadający za swoje ruchy.",
  "confidence": "sure"
 },
 {
  "id": "src-1-134",
  "part": 1,
  "q": "How do you (odbierasz mnie)?",
  "options": [
   "listen to me",
   "read me",
   "receive me"
  ],
  "correct": 1,
  "whyPl": "Standardowe pytanie o jakość odbioru brzmi 'How do you read me?'.",
  "confidence": "sure"
 },
 {
  "id": "src-1-135",
  "part": 1,
  "q": "I am sinking (po zalaniu).",
  "options": [
   "after flowing.",
   "before flooding.",
   "after flooding."
  ],
  "correct": 2,
  "whyPl": "'After flooding' znaczy po zalaniu, 'flowing' to płynięcie, a 'before' znaczy przed.",
  "confidence": "sure"
 },
 {
  "id": "src-1-136",
  "part": 1,
  "q": "Odebrałem twój sygnał Mayday.",
  "options": [
   "I can read your Mayday message.",
   "I have copied your Mayday signal.",
   "I have received your Mayday signal."
  ],
  "correct": 2,
  "whyPl": "SMCP potwierdza odbiór słowem 'received', stąd 'I have received your Mayday signal'.",
  "confidence": "sure"
 },
 {
  "id": "src-1-137",
  "part": 1,
  "q": "Muszę opuścić statek po zderzeniu.",
  "options": [
   "I have to leave vessel before collision.",
   "I have to abandon ship after crash.",
   "I must abandon vessel after collision."
  ],
  "correct": 2,
  "whyPl": "'I must abandon vessel after collision' używa poprawnych terminów morskich 'abandon' (opuścić statek) i 'collision' (zderzenie).",
  "confidence": "sure"
 },
 {
  "id": "src-1-138",
  "part": 1,
  "q": "Utrzymuj kontakt radiowy na kanale.",
  "options": [
   "Stay in touch on radio on channel.",
   "Remain contact on radio channel.",
   "Stand by on radio channel."
  ],
  "correct": 2,
  "whyPl": "'Stand by on radio channel' to standardowy zwrot nakazujący pozostanie w gotowości na kanale radiowym.",
  "confidence": "sure"
 },
 {
  "id": "src-1-139",
  "part": 1,
  "q": "Jakie jest wasze obecne maksymalne zanurzenie?",
  "options": [
   "What is your present maximum freeboard?",
   "What is your present air draft?",
   "What is your present maximum draft?"
  ],
  "correct": 2,
  "whyPl": "Zanurzenie to po angielsku 'draft', 'freeboard' to wolna burta, a 'air draft' to wysokość nad linią wody.",
  "confidence": "sure"
 },
 {
  "id": "src-1-140",
  "part": 1,
  "q": "Nie mogę płynąć bez pomocy.",
  "options": [
   "I do not have to sail without assistance.",
   "I cannot proceed without assistance.",
   "I can’t proceeded without assistance."
  ],
  "correct": 1,
  "whyPl": "'I cannot proceed without assistance' jest poprawne gramatycznie i zgodne z SMCP, gdzie 'proceed' znaczy kontynuować żeglugę.",
  "confidence": "sure"
 },
 {
  "id": "src-1-141",
  "part": 1,
  "q": "Załoga opuściła statek.",
  "options": [
   "Crew left ship.",
   "Crew are abandoning vessel.",
   "Crew has abandoned vessel."
  ],
  "correct": 2,
  "whyPl": "'Crew has abandoned vessel' poprawnie oddaje czas dokonany, załoga już opuściła statek.",
  "confidence": "sure"
 },
 {
  "id": "src-1-142",
  "part": 1,
  "q": "Mam poważne uszkodzenia przyrządów nawigacyjnych.",
  "options": [
   "I have major damage to navigational instruments.",
   "I have seriously damaged my navigational instruments.",
   "My navigational instruments have damaged seriously."
  ],
  "correct": 0,
  "whyPl": "SMCP używa formy 'I have major damage to ...', pozostałe opcje są błędne stylistycznie lub gramatycznie.",
  "confidence": "sure"
 },
 {
  "id": "src-1-143",
  "part": 1,
  "q": "Utrzymuj nasłuch na kanale UKF.",
  "options": [
   "Stand by on channel VHF.",
   "Keep listening on channel UKF.",
   "Keep watch on channel UKF."
  ],
  "correct": 0,
  "whyPl": "'Stand by on channel VHF' jest poprawne, bo po angielsku pasmo nazywa się VHF, nie UKF.",
  "confidence": "sure"
 },
 {
  "id": "src-1-144",
  "part": 1,
  "q": "Proszę o holownik i karetkę dla ofiar wypadku",
  "options": [
   "Give me tug and ambulance.",
   "Send tug and ambulance for survivors.",
   "Send tug and ambulance for casualties."
  ],
  "correct": 2,
  "whyPl": "Ofiary wypadku to 'casualties', natomiast 'survivors' oznacza rozbitków, którzy przeżyli.",
  "confidence": "sure"
 },
 {
  "id": "src-1-145",
  "part": 1,
  "q": "Powiedz jeszcze raz proszę.",
  "options": [
   "Tell me once more please.",
   "Say again please.",
   "Repeat please."
  ],
  "correct": 1,
  "whyPl": "W łączności radiowej prośba o powtórzenie to 'Say again', słowa 'repeat' używa się w innym znaczeniu proceduralnym.",
  "confidence": "sure"
 },
 {
  "id": "src-1-146",
  "part": 1,
  "q": "Przewidywane jest pogorszenie widzialności.",
  "options": [
   "Visibility is getting bad.",
   "Visibility is deteriorating.",
   "Visibility is expected to decrease."
  ],
  "correct": 2,
  "whyPl": "'Visibility is expected to decrease' oddaje przewidywane pogorszenie, opcja B opisuje pogarszanie się w tej chwili.",
  "confidence": "sure"
 },
 {
  "id": "src-1-147",
  "part": 1,
  "q": "Stan rozbitków jest zły.",
  "options": [
   "Condition of castaways is not bad.",
   "Survivors in bad condition.",
   "Survivors are bad."
  ],
  "correct": 1,
  "whyPl": "'Survivors in bad condition' to standardowy meldunek o złym stanie rozbitków.",
  "confidence": "sure"
 },
 {
  "id": "src-1-148",
  "part": 1,
  "q": "Mój radar jest uszkodzony.",
  "options": [
   "My radar is damaged..",
   "My radar has damaged.",
   "My radar brake down."
  ],
  "correct": 0,
  "whyPl": "Poprawna forma to \"My radar is damaged\", bo strona bierna wymaga \"is\" plus imiesłów, a pozostałe opcje są gramatycznie błędne.",
  "confidence": "sure"
 },
 {
  "id": "src-1-149",
  "part": 1,
  "q": "Zderzyłem się z nieznanym obiektem.",
  "options": [
   "I have collided with unknown vessel.",
   "I have collided with unknown object.",
   "I have collided with unknown derelict."
  ],
  "correct": 1,
  "whyPl": "Nieznany obiekt to po angielsku \"unknown object\", a nie \"vessel\" (statek) ani \"derelict\" (wrak porzucony).",
  "confidence": "sure"
 },
 {
  "id": "src-1-150",
  "part": 1,
  "q": "Jakie masz problemy?",
  "options": [
   "What problems do you have?",
   "What have you problems?",
   "What problems is been?"
  ],
  "correct": 0,
  "whyPl": "Poprawna konstrukcja pytania to \"What problems do you have?\", pozostałe łamią angielski szyk pytający.",
  "confidence": "sure"
 },
 {
  "id": "src-1-151",
  "part": 1,
  "q": "Widzialność jest zmniejszona z powodu rzadkiej mgły.",
  "options": [
   "Visibility is smaller by hail.",
   "Visibility is reduced by mist.",
   "Visibility is limited by drizzle."
  ],
  "correct": 1,
  "whyPl": "Rzadka mgła to \"mist\", więc poprawnie jest \"Visibility is reduced by mist\"; \"hail\" to grad, a \"drizzle\" to mżawka.",
  "confidence": "sure"
 },
 {
  "id": "src-1-152",
  "part": 1,
  "q": "Muszę zejść z toru wodnego.",
  "options": [
   "I must get rid of fairway.",
   "I must leave fairway.",
   "I have to left fairway."
  ],
  "correct": 1,
  "whyPl": "Standardowa fraza SMCP to \"I must leave fairway\", pozostałe opcje są idiomatycznie lub gramatycznie błędne.",
  "confidence": "sure"
 },
 {
  "id": "src-1-153",
  "part": 1,
  "q": "Koniec przekazu.",
  "options": [
   "Finished.",
   "Over and out.",
   "Out."
  ],
  "correct": 2,
  "whyPl": "W procedurze radiotelefonicznej koniec przekazu to \"Out\"; \"Over and out\" jest błędnym połączeniem dwóch sprzecznych słów proceduralnych.",
  "confidence": "sure"
 },
 {
  "id": "src-1-154",
  "part": 1,
  "q": "Mam przeciek poniżej linii wodnej.",
  "options": [
   "I am leaking above water line.",
   "I have a leak below water line.",
   "I have a leak under water line."
  ],
  "correct": 1,
  "whyPl": "Poniżej linii wodnej to \"below water line\", a przeciek to \"a leak\", stąd \"I have a leak below water line\".",
  "confidence": "sure"
 },
 {
  "id": "src-1-155",
  "part": 1,
  "q": "Pożar opanowany.",
  "options": [
   "Fire been extinguished.",
   "Fire is putted out.",
   "Fire is under control."
  ],
  "correct": 2,
  "whyPl": "Pożar opanowany to w SMCP \"Fire is under control\", pozostałe formy są gramatycznie niepoprawne.",
  "confidence": "sure"
 },
 {
  "id": "src-1-156",
  "part": 1,
  "q": "Kiedy przybędziesz na pozycję statku w niebezpieczeństwie?",
  "options": [
   "When will you run to position in danger?",
   "When will you go to ship in dangerous?",
   "When will you arrive at distress position?"
  ],
  "correct": 2,
  "whyPl": "Pozycja statku w niebezpieczeństwie to \"distress position\", więc poprawnie \"When will you arrive at distress position?\".",
  "confidence": "sure"
 },
 {
  "id": "src-1-157",
  "part": 1,
  "q": "Odbieram ciebie słabo.",
  "options": [
   "I read you bad.",
   "I read you loud and clear.",
   "I read you poor."
  ],
  "correct": 2,
  "whyPl": "W skali czytelności SMCP \"słabo\" odpowiada \"poor\", stąd \"I read you poor\"; \"loud and clear\" znaczy głośno i wyraźnie.",
  "confidence": "sure"
 },
 {
  "id": "src-1-158",
  "part": 1,
  "q": "Osłońcie mnie od wiatru.",
  "options": [
   "Make a lee for me.",
   "Shelter me.",
   "Keep wind away of me."
  ],
  "correct": 0,
  "whyPl": "Standardowa fraza SMCP na osłonięcie od wiatru to \"Make a lee for me\".",
  "confidence": "sure"
 },
 {
  "id": "src-1-159",
  "part": 1,
  "q": "Musicie utrzymywać ciszę radiową na tym obszarze.",
  "options": [
   "Radio must be silent in this area.",
   "You must keep radio silence in this area..",
   "Be quiet in this area."
  ],
  "correct": 1,
  "whyPl": "Cisza radiowa to \"radio silence\", a poprawna konstrukcja to \"You must keep radio silence in this area\".",
  "confidence": "sure"
 },
 {
  "id": "src-1-160",
  "part": 1,
  "q": "Z mego statku wypadł człowiek za burtę.",
  "options": [
   "I have lost person overboard.",
   "A person felt overboard.",
   "My vessel threw person overboard."
  ],
  "correct": 0,
  "whyPl": "Fraza SMCP brzmi \"I have lost person overboard\"; \"felt\" zamiast \"fell\" i \"threw person\" są błędne.",
  "confidence": "sure"
 },
 {
  "id": "src-1-161",
  "part": 1,
  "q": "Manewruję z trudnością.",
  "options": [
   "I am steering with problem.",
   "I am manoeuvring with difficulty.",
   "I was maneuvering with difficulty."
  ],
  "correct": 1,
  "whyPl": "Poprawnie w czasie teraźniejszym: \"I am manoeuvring with difficulty\", zgodnie ze standardem SMCP.",
  "confidence": "sure"
 },
 {
  "id": "src-1-162",
  "part": 1,
  "q": "Błąd, poprawka.",
  "options": [
   "Mistake, advice.",
   "Error, improvement.",
   "Mistake, correction."
  ],
  "correct": 2,
  "whyPl": "Słowo proceduralne na poprawkę błędu to \"correction\", stąd \"Mistake, correction\".",
  "confidence": "sure"
 },
 {
  "id": "src-1-163",
  "part": 1,
  "q": "Stanowicie przeszkodę dla ruchu.",
  "options": [
   "You are obstructing other traffic.",
   "You disturb other vessels.",
   "You hamper other ships."
  ],
  "correct": 0,
  "whyPl": "Fraza SMCP to \"You are obstructing other traffic\"; \"disturb\" i \"hamper\" nie są standardowymi zwrotami.",
  "confidence": "sure"
 },
 {
  "id": "src-1-164",
  "part": 1,
  "q": "Próbuję płynąć bez pomocy.",
  "options": [
   "I try proceed without help.",
   "I try to sail without attendance.",
   "I try to proceed without assistance."
  ],
  "correct": 2,
  "whyPl": "Pomoc w żegludze to \"assistance\", a poprawna gramatyka wymaga \"I try to proceed without assistance\".",
  "confidence": "sure"
 },
 {
  "id": "src-1-165",
  "part": 1,
  "q": "Jaka jest twoja wysokość nadwodna?",
  "options": [
   "What is your height over waterline?",
   "What is your height over water?",
   "What is your air draft?"
  ],
  "correct": 2,
  "whyPl": "Wysokość nadwodna statku to w terminologii morskiej \"air draft\" (air draught).",
  "confidence": "sure"
 },
 {
  "id": "src-1-166",
  "part": 1,
  "q": "Czy możesz zejść z mielizny w czasie przypływu?",
  "options": [
   "Can you refloat in ebb tide?",
   "Can you aground during tide?",
   "Can you refloat when tide rises?"
  ],
  "correct": 2,
  "whyPl": "Zejście z mielizny to \"refloat\", a przypływ to rosnąca woda, stąd \"Can you refloat when tide rises?\".",
  "confidence": "sure"
 },
 {
  "id": "src-1-167",
  "part": 1,
  "q": "Czy jesteś w drodze?",
  "options": [
   "Are you in a way?",
   "Are you under way?",
   "Have you on your way?"
  ],
  "correct": 1,
  "whyPl": "Statek w drodze to \"under way\", więc poprawne pytanie brzmi \"Are you under way?\".",
  "confidence": "sure"
 },
 {
  "id": "src-1-168",
  "part": 1,
  "q": "Pława świetlna nie świeci.",
  "options": [
   "Lightbuoy not illuminated.",
   "Lightbeacon unlighted.",
   "Lightbuoy unlit."
  ],
  "correct": 2,
  "whyPl": "W ostrzeżeniach nawigacyjnych nieświecąca pława świetlna to \"lightbuoy unlit\".",
  "confidence": "sure"
 },
 {
  "id": "src-1-169",
  "part": 1,
  "q": "Na torze wodnym znajdują się sieci rybackie.",
  "options": [
   "Fairway in fishing gear.",
   "Fishing nets fouled fairway.",
   "Fishing nets in fairway."
  ],
  "correct": 2,
  "whyPl": "Najprostsza i poprawna forma komunikatu to \"Fishing nets in fairway\", pozostałe są zniekształcone gramatycznie.",
  "confidence": "sure"
 },
 {
  "id": "src-1-170",
  "part": 1,
  "q": "Ogień rozprzestrzenia się.",
  "options": [
   "Fire is decreasing.",
   "Fire is increasing.",
   "Fire is spreading."
  ],
  "correct": 2,
  "whyPl": "Rozprzestrzenianie się ognia to \"Fire is spreading\"; \"increasing\" znaczy nasila się, a \"decreasing\" słabnie.",
  "confidence": "sure"
 },
 {
  "id": "src-1-171",
  "part": 1,
  "q": "Wasz sygnał zrozumiany, odbiór.",
  "options": [
   "Your signal understand, over.",
   "Your signal understood, over.",
   "I get your message, over."
  ],
  "correct": 1,
  "whyPl": "Poprawny imiesłów to \"understood\", stąd \"Your signal understood, over\".",
  "confidence": "sure"
 },
 {
  "id": "src-1-172",
  "part": 1,
  "q": "Jest odpływ.",
  "options": [
   "Tide falling.",
   "Tide dropping.",
   "Tide reducing."
  ],
  "correct": 0,
  "whyPl": "Odpływ, czyli opadanie wody, to po angielsku \"tide falling\", zgodnie ze standardową frazeologią.",
  "confidence": "sure"
 },
 {
  "id": "src-1-173",
  "part": 1,
  "q": "Proszę o potwierdzenie odbioru wiadomości.",
  "options": [
   "Please acknowledge message.",
   "Message over.",
   "I got your message."
  ],
  "correct": 0,
  "whyPl": "Potwierdzenie odbioru to \"acknowledge\", więc poprawnie \"Please acknowledge message\".",
  "confidence": "sure"
 },
 {
  "id": "src-1-174",
  "part": 1,
  "q": "Mam niebezpieczny przechył na prawą burtę.",
  "options": [
   "I am on starboard.",
   "I have dangerous list to port.",
   "I have dangerous list to starboard."
  ],
  "correct": 2,
  "whyPl": "Prawa burta to \"starboard\", a przechył to \"list\", stąd \"I have dangerous list to starboard\".",
  "confidence": "sure"
 },
 {
  "id": "src-2-1",
  "part": 2,
  "q": "Utworzony system GMDSS pozwala na:",
  "options": [
   "efektywne alarmowanie w relacji statek - brzeg",
   "automatyczne alarmowanie w relacji statek - samolot",
   "automatyczne wykrywanie katastrof"
  ],
  "correct": 0,
  "whyPl": "Celem GMDSS jest skuteczne alarmowanie służb ratowniczych, przede wszystkim w relacji statek do brzegu; system nie wykrywa katastrof automatycznie ani nie alarmuje samolotów.",
  "confidence": "sure"
 },
 {
  "id": "src-2-2",
  "part": 2,
  "q": "System GMDSS do alarmowania stosuje:",
  "options": [
   "radiotelegrafię na kanale 16",
   "radiotelegrafię na kanale 70",
   "cyfrowe selektywne wywołanie"
  ],
  "correct": 2,
  "whyPl": "GMDSS do alarmowania stosuje cyfrowe selektywne wywołanie DSC (m.in. kanał 70 VHF), a nie radiotelegrafię.",
  "confidence": "sure"
 },
 {
  "id": "src-2-3",
  "part": 2,
  "q": "Koncepcja systemu GMDSS pozwala na organizację ratownictwa przez:",
  "options": [
   "statki będące w okolicy katastrofy",
   "centrum poszukiwań SAR",
   "statki w porozumieniu z RCC i SAR"
  ],
  "correct": 2,
  "whyPl": "Koncepcja GMDSS zakłada, że ratownictwo organizują statki współpracujące z ośrodkami RCC i służbami SAR.",
  "confidence": "sure"
 },
 {
  "id": "src-2-4",
  "part": 2,
  "q": "Definicja obszaru morza A1 to:",
  "options": [
   "A1- obszar w promieniu 20 mil morskich od nadbrzeżnej stacji VHF w którym statki mają możliwość pewnej i skutecznej łączności radiowej",
   "Obszar A1 to obszar w otoczeniu radiotelegraficznej stacji VHF pracującej na częstotliwości 156,8 MHz (kanał 16)",
   "Obszar radiotelefonicznego zasięgu co najmniej jednej stacji brzegowej VHF, w którym jest zapewniona ciągła łączność alarmowa za pomocą DSC i który jest określony przez administrację"
  ],
  "correct": 2,
  "whyPl": "Zgodnie z SOLAS obszar A1 to zasięg radiotelefoniczny co najmniej jednej stacji brzegowej VHF z ciągłą łącznością alarmową DSC, określony przez administrację.",
  "confidence": "sure"
 },
 {
  "id": "src-2-5",
  "part": 2,
  "q": "Średni zasięg łączności alarmowej za pomocą DSC w obszarze A1 wynosi około:",
  "options": [
   "5 NM",
   "30 NM",
   "100 NM"
  ],
  "correct": 1,
  "whyPl": "Zasięg alarmowania DSC w obszarze A1 odpowiada zasięgowi VHF, czyli około 30 mil morskich.",
  "confidence": "sure"
 },
 {
  "id": "src-2-6",
  "part": 2,
  "q": "Nadawanie sygnałów alarmowych w GMDSS w obszarze A1 jest możliwe za pomocą:",
  "options": [
   "NAVTEX",
   "DSC",
   "EGC"
  ],
  "correct": 1,
  "whyPl": "W obszarze A1 sygnały alarmowe nadaje się cyfrowym selektywnym wywołaniem DSC; NAVTEX i EGC służą tylko do odbioru informacji.",
  "confidence": "sure"
 },
 {
  "id": "src-2-7",
  "part": 2,
  "q": "Do nadawania sygnałów alarmowych w obszarze A1 stosowane są:",
  "options": [
   "kanał 13",
   "kanał 6",
   "kanał 70"
  ],
  "correct": 2,
  "whyPl": "Do alarmowania DSC w paśmie VHF służy wyłącznie kanał 70 (156,525 MHz).",
  "confidence": "sure"
 },
 {
  "id": "src-2-8",
  "part": 2,
  "q": "Realizacja komunikacji dla celów pilnych jest możliwa z wykorzystaniem systemów:",
  "options": [
   "DSC",
   "MSI",
   "EGC"
  ],
  "correct": 0,
  "whyPl": "Łączność pilną anonsuje się wywołaniem DSC kategorii urgency, a następnie nadaje komunikat PAN PAN fonicznie.",
  "confidence": "sure"
 },
 {
  "id": "src-2-9",
  "part": 2,
  "q": "Realizacja komunikacji dla celów bezpieczeństwa jest możliwa z wykorzystaniem systemów:",
  "options": [
   "DSC",
   "WWNWS",
   "MSI"
  ],
  "correct": 0,
  "whyPl": "Łączność dla celów bezpieczeństwa anonsuje się wywołaniem DSC kategorii safety; WWNWS i MSI to serwisy rozgłoszeniowe, nie systemy łączności dwustronnej.",
  "confidence": "sure"
 },
 {
  "id": "src-2-10",
  "part": 2,
  "q": "Informacje zawarte w sygnale alarmowym to:",
  "options": [
   "długość statku i wyporność",
   "rodzaj zagrożenia i położenie geograficzne",
   "rodzaj przewożonego ładunku"
  ],
  "correct": 1,
  "whyPl": "Sygnał alarmowy zawiera przede wszystkim rodzaj zagrożenia i położenie geograficzne statku.",
  "confidence": "sure"
 },
 {
  "id": "src-2-11",
  "part": 2,
  "q": "Łączność koordynacyjna to łączność do:",
  "options": [
   "zapewnienia koordynacji działań statków i lotnictwa",
   "koordynacji ruchu statku",
   "koordynacji kolejności działań środków radiokomunikacyjnych"
  ],
  "correct": 0,
  "whyPl": "Łączność koordynacyjna SAR zapewnia koordynację działań statków i lotnictwa uczestniczących w akcji ratowniczej.",
  "confidence": "sure"
 },
 {
  "id": "src-2-12",
  "part": 2,
  "q": "Łączność na miejscu akcji jest utrzymywana z wykorzystaniem częstotliwości:",
  "options": [
   "8414 kHz",
   "156,8 MHz",
   "9 GHz"
  ],
  "correct": 1,
  "whyPl": "Łączność na miejscu akcji prowadzi się na częstotliwości 156,8 MHz (kanał 16 VHF) oraz 2182 kHz.",
  "confidence": "sure"
 },
 {
  "id": "src-2-13",
  "part": 2,
  "q": "Lokalizacja rozbitków jest dokonywana za pomocą:",
  "options": [
   "systemów namiarowych",
   "DSC kanał 70",
   "transpondera radarowego"
  ],
  "correct": 2,
  "whyPl": "Do lokalizacji rozbitków służy transponder radarowy SART, widoczny na ekranie radaru jednostek ratowniczych.",
  "confidence": "sure"
 },
 {
  "id": "src-2-14",
  "part": 2,
  "q": "Uzyskanie namiaru na transponder radarowy SART uzyskuje się za pomocą radaru pracującego na częstotliwościach pasma:",
  "options": [
   "9 GHz",
   "3 GHz",
   "12 GHz"
  ],
  "correct": 0,
  "whyPl": "SART odpowiada na impulsy radaru pracującego w paśmie X, czyli 9 GHz.",
  "confidence": "sure"
 },
 {
  "id": "src-2-15",
  "part": 2,
  "q": "Rozpowszechnianie morskich informacji bezpieczeństwa dotyczy:",
  "options": [
   "informacji komercyjnych",
   "pilnych informacji nawigacyjnych i meteorologicznych",
   "prognoz optymalnych częstotliwości propagacyjnych"
  ],
  "correct": 1,
  "whyPl": "Morskie informacje bezpieczeństwa (MSI) to pilne ostrzeżenia nawigacyjne i meteorologiczne, nie informacje komercyjne.",
  "confidence": "sure"
 },
 {
  "id": "src-2-16",
  "part": 2,
  "q": "Realizacja łączności pomiędzy dwoma mostkami statków jest możliwa za pomocą:",
  "options": [
   "radiotelefonii na częstotliwości 2182 kHz",
   "radiotelefonii na kanale 6 i 13",
   "radiotelefonii na kanale 70"
  ],
  "correct": 1,
  "whyPl": "Łączność mostek-mostek prowadzi się radiotelefonicznie na kanałach 6 i 13 VHF; kanał 70 jest zarezerwowany dla DSC.",
  "confidence": "sure"
 },
 {
  "id": "src-2-17",
  "part": 2,
  "q": "W skład wyposażenia statku pływającego w obszarze A1 wchodzi:",
  "options": [
   "urządzenie nadawczo-odbiorcze na kanale 70",
   "urządzenie nadawczo-odbiorcze na częstotliwości 2187,5 kHz",
   "urządzenie nadawczo-odbiorcze na częstotliwości 406 MHz"
  ],
  "correct": 0,
  "whyPl": "Statek w obszarze A1 musi mieć urządzenie nadawczo-odbiorcze VHF z DSC na kanale 70; 2187,5 kHz to MF (obszar A2), a 406 MHz to radiopława EPIRB.",
  "confidence": "sure"
 },
 {
  "id": "src-2-18",
  "part": 2,
  "q": "System cyfrowego selektywnego wywołania to system:",
  "options": [
   "do transmisji ostrzeżeń pogodowych",
   "do transmisji ostrzeżeń nawigacyjnych",
   "do automatycznego ustanawiania połączeń radiowych i alarmowania"
  ],
  "correct": 2,
  "whyPl": "DSC służy do automatycznego ustanawiania połączeń radiowych i alarmowania, a nie do transmisji ostrzeżeń.",
  "confidence": "sure"
 },
 {
  "id": "src-2-19",
  "part": 2,
  "q": "W DSC stosowana jest transmisja:",
  "options": [
   "cyfrowa",
   "analogowa",
   "impulsowa"
  ],
  "correct": 0,
  "whyPl": "W DSC stosowana jest transmisja cyfrowa oparta na kodzie binarnym z detekcją błędów.",
  "confidence": "sure"
 },
 {
  "id": "src-2-20",
  "part": 2,
  "q": "Do transmisji radiowej sygnału DSC w paśmie VHF stosuje się częstotliwość kanału:",
  "options": [
   "16-go",
   "70-go",
   "6-go"
  ],
  "correct": 1,
  "whyPl": "Sygnał DSC w paśmie VHF nadawany jest wyłącznie na kanale 70.",
  "confidence": "sure"
 },
 {
  "id": "src-2-21",
  "part": 2,
  "q": "Do transmisji radiowej sygnału DSC w paśmie VHF stosuje się:",
  "options": [
   "modulację amplitudy",
   "modulację impulsową",
   "modulację fazy"
  ],
  "correct": 2,
  "whyPl": "W VHF DSC stosuje się modulację fazy (klasa emisji G2B) z kluczowaniem FSK podnośnej.",
  "confidence": "sure"
 },
 {
  "id": "src-2-22",
  "part": 2,
  "q": "Czas trwania całkowitego pojedynczego wywołania DSC w paśmie VHF wynosi:",
  "options": [
   "6,2 s - 7,2 s",
   "0,45 s - 0,63 s",
   "3 s - 4 s"
  ],
  "correct": 1,
  "whyPl": "Przy szybkości 1200 bodów pojedyncze wywołanie DSC w paśmie VHF trwa około 0,45-0,63 sekundy.",
  "confidence": "sure"
 },
 {
  "id": "src-2-23",
  "part": 2,
  "q": "Pole „kategorii” definiuje:",
  "options": [
   "priorytet sekwencji wywoławczej",
   "adres sekwencji wywoławczej",
   "zastosowany rodzaj adresu"
  ],
  "correct": 0,
  "whyPl": "Pole kategorii określa priorytet sekwencji wywoławczej: distress, urgency, safety lub routine.",
  "confidence": "sure"
 },
 {
  "id": "src-2-24",
  "part": 2,
  "q": "Wywołania alarmowe DSC nadawane na kanale 70 zawierają następujące dane/informacje:",
  "options": [
   "numer MMSI, pozycja, czas aktualności pozycji",
   "pozycja, czas aktualności pozycji, posiadane środki ratunkowe",
   "rodzaj zagrożenia, pozycja, czas aktualności pozycji, rodzaj oczekiwanej pomocy"
  ],
  "correct": 0,
  "whyPl": "Alarm DSC na kanale 70 zawsze zawiera numer MMSI, pozycję i czas jej aktualności; rodzaj oczekiwanej pomocy nie jest elementem alarmu DSC, lecz komunikatu fonicznego MAYDAY.",
  "confidence": "unsure"
 },
 {
  "id": "src-2-25",
  "part": 2,
  "q": "Nadanie przez statek sygnału alarmowego w paśmie VHF fonicznie lub w DSC może być realizowane na:",
  "options": [
   "jednej częstotliwości",
   "dwóch częstotliwościach",
   "trzech częstotliwościach"
  ],
  "correct": 1,
  "whyPl": "Alarmowanie w paśmie VHF możliwe jest na dwóch częstotliwościach: w DSC na kanale 70 (156,525 MHz) i fonicznie na kanale 16 (156,8 MHz).",
  "confidence": "unsure"
 },
 {
  "id": "src-2-26",
  "part": 2,
  "q": "Zasady potwierdzania odbioru wywołania w niebezpieczeństwie w paśmie VHF przez stację nadbrzeżną to:",
  "options": [
   "potwierdzenie odbioru wywołania w niebezpieczeństwie powinno być zainicjowane ręcznie- na tej samej częstotliwości na której odebrano to wywołanie z opóźnieniem co najmniej jednominutowym",
   "potwierdzenie odbioru wywołania w niebezpieczeństwie powinno być zainicjowane ręcznie na częstotliwości kanału 70",
   "potwierdzenie odbioru wywołania w niebezpieczeństwie powinno być zainicjowane ręcznie- na tej samej częstotliwości na której odebrano to wywołanie z opóźnieniem- nie większym jednak niż 2,75 min"
  ],
  "correct": 2,
  "whyPl": "Stacja nadbrzeżna potwierdza odbiór wywołania ręcznie na tej samej częstotliwości z opóźnieniem nie większym niż 2,75 minuty.",
  "confidence": "sure"
 },
 {
  "id": "src-2-27",
  "part": 2,
  "q": "Nadanie korespondencji typu pośrednictwo w niebezpieczeństwie przez statek w paśmie VHF polega na:",
  "options": [
   "nadaniu typu pośrednictwo w niebezpieczeństwie do wszystkich statków lub wybranej stacji",
   "nadaniu typu pośrednictwo w niebezpieczeństwie do właściwej stacji nadbrzeżnej",
   "nadaniu typu pośrednictwo w niebezpieczeństwie do wszystkich stacji nadbrzeżnych"
  ],
  "correct": 0,
  "whyPl": "Wg ITU-R M.541 (zal. 3, pkt 1.4) statek nadajacy DSC distress relay na MF/VHF adresuje wywolanie do wszystkich statkow (All Ships) albo do wybranej stacji (np. 9-cyfrowy identyfikator wlasciwej stacji nadbrzeznej). Adresowanie wylacznie 'do wlasciwej stacji nadbrzeznej' to odrebna procedura HF, gdy alarm nie zostal potwierdzony w ciagu 5 minut, wiec nie dotyczy pasma VHF.",
  "confidence": "sure"
 },
 {
  "id": "src-2-28",
  "part": 2,
  "q": "Przedstaw możliwości stosowania kanałów DSC w korespondencji publicznej w paśmie VHF.",
  "options": [
   "w paśmie VHF kanał 70 stosowany jest zarówno do wywołań DSC w niebezpieczeństwie jak i do celów zapewnienia bezpieczeństwa. Jest również stosowany do wywołań DSC w celu zrealizowania korespondencji publicznej",
   "w paśmie VHF kanał 70 nie może być stosowany w celu zrealizowania korespondencji publicznej",
   "w paśmie VHF kanał 70 nie może być stosowany do celów zapewnienia bezpieczeństwa"
  ],
  "correct": 0,
  "whyPl": "Kanał 70 służy do wywołań DSC wszystkich kategorii: w niebezpieczeństwie, dla bezpieczeństwa oraz do anonsowania korespondencji publicznej.",
  "confidence": "sure"
 },
 {
  "id": "src-2-29",
  "part": 2,
  "q": "Testowanie zewnętrzne aparatury DSC w paśmie VHF, zgodnie z przepisami ITU oraz Konwencji STCW, ma być realizowane:",
  "options": [
   "tak często jak to jest niezbędne",
   "testowanie jest zabronione",
   "raz na tydzień"
  ],
  "correct": 2,
  "whyPl": "Zgodnie z przepisami ITU i Konwencją STCW test zewnętrzny DSC wykonuje się raz na tydzień, a test wewnętrzny codziennie.",
  "confidence": "sure"
 },
 {
  "id": "src-2-30",
  "part": 2,
  "q": "System NAVTEX służy do:",
  "options": [
   "transmisji map synoptycznych",
   "transmisji ostrzeżeń nawigacyjnych",
   "łączności z publiczną siecią telefoniczną"
  ],
  "correct": 1,
  "whyPl": "NAVTEX służy do transmisji ostrzeżeń nawigacyjnych, meteorologicznych i informacji SAR.",
  "confidence": "sure"
 },
 {
  "id": "src-2-31",
  "part": 2,
  "q": "Stacje systemu NAVTEX pracują na częstotliwości:",
  "options": [
   "2177 kHz",
   "490 kHz",
   "156,8 MHz"
  ],
  "correct": 1,
  "whyPl": "Stacje NAVTEX pracują na 518 kHz, 490 kHz i 4209,5 kHz; z podanych opcji poprawna jest częstotliwość 490 kHz.",
  "confidence": "sure"
 },
 {
  "id": "src-2-32",
  "part": 2,
  "q": "Podstawową częstotliwością transmisji w systemie NAVTEX jest:",
  "options": [
   "518 kHz",
   "4125 kHz",
   "500 kHz"
  ],
  "correct": 0,
  "whyPl": "Podstawową, międzynarodową częstotliwością transmisji NAVTEX jest 518 kHz.",
  "confidence": "sure"
 },
 {
  "id": "src-2-33",
  "part": 2,
  "q": "Zasięg stacji systemu NAVTEX wynosi:",
  "options": [
   "50-100 Mm",
   "350 - 1000 Mm",
   "200 - 400 Mm"
  ],
  "correct": 2,
  "whyPl": "Typowy zasięg stacji NAVTEX wynosi około 200-400 mil morskich, zależnie od mocy nadajnika i warunków propagacji.",
  "confidence": "sure"
 },
 {
  "id": "src-2-34",
  "part": 2,
  "q": "Zasięg stacji systemu NAVTEX jest największy:",
  "options": [
   "w dzień",
   "w nocy",
   "rano"
  ],
  "correct": 1,
  "whyPl": "Na falach średnich fala jonosferyczna nocą niesie sygnał dalej, więc zasięg stacji NAVTEX jest największy w nocy.",
  "confidence": "sure"
 },
 {
  "id": "src-2-35",
  "part": 2,
  "q": "W jaki sposób dokonuje się w odbiorniku NAVTEX ustawienia stacji:",
  "options": [
   "przez wpisanie nazwy stacji",
   "przez podanie pozycji geograficznej odbiornika",
   "przez ustawienie litery odpowiadającej nazwie stacji"
  ],
  "correct": 2,
  "whyPl": "Stację identyfikuje litera B1 nagłówka, więc wyboru stacji dokonuje się przez ustawienie litery odpowiadającej jej nazwie.",
  "confidence": "sure"
 },
 {
  "id": "src-2-36",
  "part": 2,
  "q": "W jaki sposób dokonuje się w odbiorniku NAVTEX ustawienia rodzaju odbieranych informacji:",
  "options": [
   "przez wpisanie numeru informacji",
   "przez ustawienie litery odpowiadającej typowi informacji",
   "w odbiorniku nie ma możliwości wyboru odbieranych informacji"
  ],
  "correct": 1,
  "whyPl": "Rodzaj komunikatu określa litera B2, więc typ odbieranych informacji wybiera się ustawiając odpowiednią literę.",
  "confidence": "sure"
 },
 {
  "id": "src-2-37",
  "part": 2,
  "q": "„ZCZC JA23” w nagłówku komunikatu odebranego ze stacji NAVTEX oznacza że:",
  "options": [
   "komunikat nadany został przez stację „A”",
   "komunikat nadany został przez stację „J”",
   "komunikat dotyczy ostrzeżenia meteorologicznego"
  ],
  "correct": 1,
  "whyPl": "W nagłówku ZCZC JA23 pierwsza litera J oznacza stację nadającą, A to rodzaj komunikatu, a 23 to jego numer kolejny.",
  "confidence": "sure"
 },
 {
  "id": "src-2-38",
  "part": 2,
  "q": "„ZCZC UB66” w nagłówku komunikatu odebranego ze stacji NAVTEX oznacza że:",
  "options": [
   "komunikat nadany został przez stację „U”",
   "komunikat nadany został przez stację „J”",
   "komunikat dotyczy ostrzeżenia nawigacyjnego"
  ],
  "correct": 0,
  "whyPl": "W nagłówku ZCZC UB66 litera U wskazuje stację nadającą, a B oznacza ostrzeżenie meteorologiczne, nie nawigacyjne.",
  "confidence": "sure"
 },
 {
  "id": "src-2-39",
  "part": 2,
  "q": "Jakie komunikaty będą zawsze wyświetlane/drukowane przez odbiornik systemu NAVTEX:",
  "options": [
   "ostrzeżenia meteorologiczne",
   "prognozy pogody",
   "raporty lodowe"
  ],
  "correct": 0,
  "whyPl": "Komunikatów typu A, B i D (ostrzeżenia nawigacyjne, meteorologiczne i informacje SAR) nie można wyłączyć, więc ostrzeżenia meteorologiczne drukowane są zawsze.",
  "confidence": "sure"
 },
 {
  "id": "src-2-40",
  "part": 2,
  "q": "Druga litera B w nagłówku komunikatu stacji NAVTEX (np. LB47) oznacza, że jest to:",
  "options": [
   "ostrzeżenie meteorologiczne",
   "informacja dotycząca ataku piratów",
   "prognoza pogody"
  ],
  "correct": 0,
  "whyPl": "Druga litera nagłówka oznacza rodzaj komunikatu, a litera B to ostrzeżenie meteorologiczne (prognoza pogody ma literę E).",
  "confidence": "sure"
 },
 {
  "id": "src-2-41",
  "part": 2,
  "q": "Stacje systemu NAVTEX nadają komunikaty:",
  "options": [
   "dwa razy na dobę",
   "o godz. 0700 i 2300 UTC",
   "nie częściej niż co cztery godziny"
  ],
  "correct": 2,
  "whyPl": "Każda stacja NAVTEX ma przydzielone 10-minutowe okno nadawania co 4 godziny, więc nadaje nie częściej niż co cztery godziny.",
  "confidence": "sure"
 },
 {
  "id": "src-2-42",
  "part": 2,
  "q": "Sekwencja „NNN” w wydruku komunikatu odbiornika NAVTEX oznacza:",
  "options": [
   "komunikat pilny",
   "komunikat odebrany poprawnie",
   "komunikat odebrany niepoprawnie"
  ],
  "correct": 2,
  "whyPl": "Grupa NNN zamiast pełnej grupy końcowej NNNN oznacza przerwany wydruk i przekroczoną stopę błędów, czyli komunikat odebrany niepoprawnie.",
  "confidence": "sure"
 },
 {
  "id": "src-2-43",
  "part": 2,
  "q": "Sekwencja „NNNN” w wydruku komunikatu odbiornika NAVTEX oznacza:",
  "options": [
   "komunikat pilny",
   "komunikat który odebrany został ze stopą błędu mniejszą od 4%",
   "komunikat odebrany niepoprawnie"
  ],
  "correct": 1,
  "whyPl": "Pełna grupa końcowa NNNN oznacza komunikat odebrany poprawnie, ze stopą błędów mniejszą niż 4%.",
  "confidence": "sure"
 },
 {
  "id": "src-2-44",
  "part": 2,
  "q": "Komunikaty transmitowane na częstotliwości 518 kHz nadawane są w języku:",
  "options": [
   "angielskim",
   "angielskim i francuskim",
   "w języku państwa, z terenu którego nadaje stacja NAVTEX"
  ],
  "correct": 0,
  "whyPl": "Międzynarodowa częstotliwość NAVTEX 518 kHz służy do transmisji wyłącznie w języku angielskim.",
  "confidence": "sure"
 },
 {
  "id": "src-2-45",
  "part": 2,
  "q": "„ZCZC BB01” w nagłówku komunikatu odebranego ze stacji NAVTEX oznacza:",
  "options": [
   "ostrzeżenie nawigacyjne",
   "ostrzeżenie meteorologiczne",
   "komunikat nadany został dla obszaru morza A1"
  ],
  "correct": 1,
  "whyPl": "W nagłówku BB01 pierwsza litera B to identyfikator stacji, a druga litera B oznacza ostrzeżenie meteorologiczne.",
  "confidence": "sure"
 },
 {
  "id": "src-2-46",
  "part": 2,
  "q": "Odbiornik systemu NAVTEX wyświetla/drukuje:",
  "options": [
   "wszystkie komunikaty z zaprogramowanych stacji",
   "wszystkie komunikaty dotyczące ostrzeżeń nawigacyjnych, meteorologicznych i informacji o akcjach SAR z wszystkich stacji w zasięgu odbioru",
   "wszystkie komunikaty dotyczące ostrzeżeń nawigacyjne, meteorologicznych i informacji o akcjach SAR z zaprogramowanych stacji"
  ],
  "correct": 2,
  "whyPl": "Odbiornik zawsze drukuje komunikaty typu A, B i D, których nie da się wyłączyć, ale tylko z zaprogramowanych przez użytkownika stacji.",
  "confidence": "sure"
 },
 {
  "id": "src-2-47",
  "part": 2,
  "q": "Częstotliwość 490 kHz jest stosowana w systemie NAVTEX do:",
  "options": [
   "transmisji komunikatów w obszarach tropikalnych",
   "transmisji komunikatów w rejonach polarnych",
   "transmisji komunikatów w języku lokalnym"
  ],
  "correct": 2,
  "whyPl": "Częstotliwość 490 kHz jest przeznaczona na krajowe transmisje NAVTEX w językach lokalnych.",
  "confidence": "sure"
 },
 {
  "id": "src-2-48",
  "part": 2,
  "q": "W systemie NAVTEX sygnały transmitowane są:",
  "options": [
   "w trybie teleksowym FEC",
   "z zastosowaniem modulacji G2B",
   "głosowo"
  ],
  "correct": 0,
  "whyPl": "NAVTEX to wąskopasmowa telegrafia dalekopisowa (NBDP) pracująca w rozgłoszeniowym trybie FEC z korekcją błędów.",
  "confidence": "sure"
 },
 {
  "id": "src-2-49",
  "part": 2,
  "q": "W nocy zasięg odbioru sygnałów w systemie NAVTEX jest:",
  "options": [
   "większy niż w dzień",
   "taki sam jak w dzień",
   "mniejszy niż w dzień"
  ],
  "correct": 0,
  "whyPl": "Nocą na falach średnich dochodzi fala jonosferyczna, więc zasięg odbioru jest większy niż w dzień.",
  "confidence": "sure"
 },
 {
  "id": "src-2-50",
  "part": 2,
  "q": "W rejonach tropikalnych zasięg odbioru sygnałów transmitowanych na częstotliwości 518 kHz:",
  "options": [
   "zależy od pory doby",
   "wynosi 75 Mm",
   "nie zależy od pory doby"
  ],
  "correct": 0,
  "whyPl": "Również w tropikach propagacja na 518 kHz zmienia się między dniem a nocą, więc zasięg odbioru zależy od pory doby.",
  "confidence": "sure"
 },
 {
  "id": "src-2-51",
  "part": 2,
  "q": "Nadanie komunikatowi NAVTEX numeru 00 (np. JD00) spowoduje:",
  "options": [
   "że komunikat o tym numerze zostanie zignorowany",
   "że wszystkie odbiorniki NAVTEX znajdujące się w zasięgu stacji nadającej wydrukują tak oznaczony komunikat, niezależnie od dokonanego przez użytkownika ustawienia stacji",
   "że komunikat nadany został o godz. 00:00"
  ],
  "correct": 1,
  "whyPl": "Numer 00 jest zarezerwowany dla komunikatów alarmowych, które każdy odbiornik w zasięgu wydrukuje niezależnie od ustawień stacji.",
  "confidence": "sure"
 },
 {
  "id": "src-2-52",
  "part": 2,
  "q": "Stacje NAVTEX powtarzają w kolejnych transmisjach komunikaty:",
  "options": [
   "tak długo, dopóki nie ustanie powód z którego dany komunikat jest nadawany",
   "przez 7 dni",
   "dwa razy"
  ],
  "correct": 0,
  "whyPl": "Komunikat jest powtarzany w kolejnych transmisjach tak długo, aż ustanie przyczyna jego nadawania.",
  "confidence": "sure"
 },
 {
  "id": "src-2-53",
  "part": 2,
  "q": "Informacje o rozmieszczeniu, zasięgach i czasach nadawania stacji NAVTEX można znaleźć w:",
  "options": [
   "List of Coast Stations and Special Service Stations - ITU",
   "Admirality List of Radio Signals Vol. 1",
   "List of Ship Stations - ITU"
  ],
  "correct": 0,
  "whyPl": "Rozmieszczenie, zasięgi i harmonogramy stacji NAVTEX publikuje ITU w wykazie List of Coast Stations and Special Service Stations (List IV).",
  "confidence": "sure"
 },
 {
  "id": "src-2-54",
  "part": 2,
  "q": "Zainstalowanie na statku odbiornika systemu NAVTEX wymaga zgody:",
  "options": [
   "Urzędu Komunikacji Elektronicznej",
   "Urzędu Morskiego",
   "żadnego z powyższych"
  ],
  "correct": 2,
  "whyPl": "NAVTEX to urządzenie wyłącznie odbiorcze, więc jego instalacja nie wymaga zgody żadnego urzędu ani pozwolenia radiowego.",
  "confidence": "sure"
 },
 {
  "id": "src-2-55",
  "part": 2,
  "q": "Koordynatorem odpowiedzialnym za gromadzenie i dystrybucję morskich informacji bezpieczeństwa w obszarze polskiej strefy ekonomicznej jest:",
  "options": [
   "Urząd Morski w Gdyni",
   "Urząd Morski w Szczecinie",
   "Biuro Hydrograficzne Marynarki Wojennej"
  ],
  "correct": 2,
  "whyPl": "Krajowym koordynatorem morskich informacji bezpieczeństwa w polskiej strefie ekonomicznej jest Biuro Hydrograficzne Marynarki Wojennej.",
  "confidence": "sure"
 },
 {
  "id": "src-2-56",
  "part": 2,
  "q": "Informacje o transmisjach morskich informacji bezpieczeństwa za pomocą innych systemów niż NAVTEX znaleźć można w:",
  "options": [
   "List of Cost Stations and Special Service Stations - ITU",
   "Admirality List of Radio Signals Vol. 1",
   "Admirality List of Radio Signals Vol. 5"
  ],
  "correct": 0,
  "whyPl": "Informacje o transmisjach MSI innymi systemami niż NAVTEX również zawiera wykaz ITU List of Coast Stations and Special Service Stations.",
  "confidence": "sure"
 },
 {
  "id": "src-2-57",
  "part": 2,
  "q": "W systemie GMDSS stosuje się radiopławy:",
  "options": [
   "systemu COSPAS-SARSAT nadające sygnały na częstotliwości 406 MHz i 121,5 MHz",
   "systemu INMARSAT-E pracujące w paśmie 1,6 GHz",
   "systemu COSPAS-SARSAT nadające sygnały na częstotliwości 406 MHz i 243 MHz"
  ],
  "correct": 0,
  "whyPl": "W GMDSS stosuje się radiopławy COSPAS-SARSAT nadające na 406 MHz oraz sygnał naprowadzający 121,5 MHz dla jednostek SAR.",
  "confidence": "sure"
 },
 {
  "id": "src-2-58",
  "part": 2,
  "q": "W skład systemu COSPAS-SARSAT wchodzi blok satelitów poruszających się po orbitach polarnych. Które z poniższych stwierdzeń jest prawdziwe:",
  "options": [
   "wysokość orbit polarnych wynosi około 3000 km",
   "wysokość orbit polarnych wynosi 850 - 1000 km",
   "wysokość orbit polarnych wynosi około 240 km"
  ],
  "correct": 1,
  "whyPl": "Satelity LEOSAR krążą po orbitach biegunowych na wysokości około 850-1000 km (SARSAT ok. 850 km, COSPAS ok. 1000 km).",
  "confidence": "sure"
 },
 {
  "id": "src-2-59",
  "part": 2,
  "q": "W skład systemu COSPAS-SARSAT wchodzi blok satelitów poruszających się po orbitach polarnych. Czas obiegu Ziemi przez satelitę poruszającego się po orbicie polarnej wynosi:",
  "options": [
   "około 105 minut",
   "około 12 godzin",
   "około 24 godziny"
  ],
  "correct": 0,
  "whyPl": "Na wysokości 850-1000 km okres obiegu Ziemi przez satelitę wynosi około 100-105 minut.",
  "confidence": "sure"
 },
 {
  "id": "src-2-60",
  "part": 2,
  "q": "W skład systemu COSPAS-SARSAT wchodzi blok satelitów poruszających się po orbitach polarnych. Przelatujący satelita „widzi” z orbity radiopławę przez:",
  "options": [
   "około 12-16 minut",
   "około 3 minuty",
   "około 30 minut"
  ],
  "correct": 0,
  "whyPl": "Okno wzajemnej widoczności radiopławy i satelity LEOSAR podczas jednego przelotu wynosi maksymalnie około 12-16 minut.",
  "confidence": "sure"
 },
 {
  "id": "src-2-61",
  "part": 2,
  "q": "W skład systemu COSPAS-SARSAT wchodzi blok satelitów geostacjonarnych składający się z:",
  "options": [
   "3 satelitów",
   "12 - 15 satelitów",
   "4 - 6 satelitów"
  ],
  "correct": 2,
  "whyPl": "Segment geostacjonarny GEOSAR systemu COSPAS-SARSAT tworzy 4-6 satelitów z transponderami 406 MHz.",
  "confidence": "sure"
 },
 {
  "id": "src-2-62",
  "part": 2,
  "q": "Do określenia położenia radiopławy w systemie COSPAS-SARSAT wykorzystujemy:",
  "options": [
   "pomiar czasu przelotu sygnałów na trasie radiopława - satelita",
   "pomiar czasu przelotu sygnałów na trasie radiopława - satelita - stacja LUT",
   "zjawisko Dopplera"
  ],
  "correct": 2,
  "whyPl": "Pozycję radiopławy w segmencie LEOSAR wyznacza się na podstawie pomiaru przesunięcia dopplerowskiego częstotliwości sygnału odbieranego przez satelitę.",
  "confidence": "sure"
 },
 {
  "id": "src-2-63",
  "part": 2,
  "q": "Bateria litowa zasilająca radiopławę powinna zapewnić:",
  "options": [
   "nieprzerwaną pracę radiopławy przez 96 godzin",
   "nieprzerwaną pracę radiopławy przez 48 godzin",
   "nieprzerwaną pracę radiopławy do momentu odbioru sygnałów przez satelitę"
  ],
  "correct": 1,
  "whyPl": "Zgodnie z wymaganiami IMO (rez. A.810(19)) bateria radiopławy 406 MHz musi zapewnić co najmniej 48 godzin nieprzerwanej pracy.",
  "confidence": "sure"
 },
 {
  "id": "src-2-64",
  "part": 2,
  "q": "Sygnał o częstotliwość 121,5 MHz nadawany przez radiopławę systemu COSPAS- SARSAT służy do:",
  "options": [
   "końcowego naprowadzania jednostek SAR na rozbitków (na radiopławę)",
   "do rozwiązania problemu niejednoznaczności określanej pozycji",
   "do lokalizacji położenia radiopław w obszarze pokrycia satelitów geostacjonarnych"
  ],
  "correct": 0,
  "whyPl": "Sygnał 121,5 MHz służy wyłącznie do końcowego naprowadzania (homing) jednostek SAR na miejsce katastrofy.",
  "confidence": "sure"
 },
 {
  "id": "src-2-65",
  "part": 2,
  "q": "Dokładność lokalizacji radiopławy w systemie COSPAS-SARSAT wynosi:",
  "options": [
   "około 5 km w przypadku wykorzystania sygnałów o częstotliwości 406 MHz",
   "około 1 km w przypadku wykorzystania sygnałów o częstotliwości 406 MHz i 121,5 MHz",
   "około 2 km w przypadku wykorzystania sygnałów o częstotliwości 121,5 MHz"
  ],
  "correct": 0,
  "whyPl": "Dokładność dopplerowskiej lokalizacji na częstotliwości 406 MHz wynosi około 5 km, znacznie lepiej niż dawne 121,5 MHz (około 20 km).",
  "confidence": "sure"
 },
 {
  "id": "src-2-66",
  "part": 2,
  "q": "Które z poniższych zdań jest prawdziwe?",
  "options": [
   "Zasięg wykrywania radiopław 121,5 MHz jest globalny.",
   "Częstotliwość 121,5 MHz nie jest śledzona przez segment satelitarny.",
   "Częstotliwość 121,5 MHz jest śledzona przez satelity geostacjonarne."
  ],
  "correct": 1,
  "whyPl": "Od 1 lutego 2009 r. satelity COSPAS-SARSAT nie przetwarzają sygnałów 121,5 MHz, częstotliwość ta służy tylko do naprowadzania.",
  "confidence": "sure"
 },
 {
  "id": "src-2-67",
  "part": 2,
  "q": "Sygnały nadawane przez radiopławę na częstotliwości 406 MHz:",
  "options": [
   "nadawane są przez około 0,5 sekundy i powtarzane co 2 minuty",
   "nadawane są przez około 0,5 sekundy i powtarzane co 50 +/- 2,5 sekundy",
   "zawierają dane armatora"
  ],
  "correct": 1,
  "whyPl": "Radiopława 406 MHz nadaje impulsy o długości około 0,5 s powtarzane co 50 sekund z tolerancją +/- 2,5 s.",
  "confidence": "sure"
 },
 {
  "id": "src-2-68",
  "part": 2,
  "q": "Sygnały nadawane przez radiopławę na częstotliwości 406 MHz zawierają:",
  "options": [
   "informacje o producencie radioławy",
   "MID (Maritime Identification Digits) kod kraju",
   "datę i czas uruchomienia radiopławy"
  ],
  "correct": 1,
  "whyPl": "W zakodowanej wiadomości radiopławy zawarty jest m.in. kod kraju MID, będący częścią numeru identyfikacyjnego.",
  "confidence": "sure"
 },
 {
  "id": "src-2-69",
  "part": 2,
  "q": "Sygnały nadawane przez radiopławę na częstotliwości 406 MHz pozwalają na identyfikację statku z którego pochodzi radiopława na podstawie zakodowanego:",
  "options": [
   "numeru MMSI",
   "MID (Maritime Identification Digits) - kodu kraju",
   "kodu armatora"
  ],
  "correct": 0,
  "whyPl": "Radiopława zakodowana numerem MMSI pozwala jednoznacznie zidentyfikować statek, z którego pochodzi.",
  "confidence": "sure"
 },
 {
  "id": "src-2-70",
  "part": 2,
  "q": "Radiopława systemu COSPAS-SARSAT ma:",
  "options": [
   "wbudowany sygnalizator dźwiękowy",
   "wbudowane źródło światła ciągłego",
   "wbudowany nadajnik do lokalizacji końcowego miejsca katastrofy (do naprowadzania jednostek SAR)"
  ],
  "correct": 2,
  "whyPl": "Radiopława ma wbudowany nadajnik naprowadzający 121,5 MHz do końcowej lokalizacji miejsca katastrofy przez jednostki SAR.",
  "confidence": "sure"
 },
 {
  "id": "src-2-71",
  "part": 2,
  "q": "Radiopławy systemu COSPAS-SARSAT mogą być uruchomione:",
  "options": [
   "automatycznie za pomocą zwalniaka hydrostatycznego, gdy statek tonie",
   "przez wpisanie właściwego kodu",
   "zdalnie z RCC"
  ],
  "correct": 0,
  "whyPl": "Radiopława uwalnia się i uruchamia automatycznie dzięki zwalniakowi hydrostatycznemu po zatonięciu statku, można ją też włączyć ręcznie.",
  "confidence": "sure"
 },
 {
  "id": "src-2-72",
  "part": 2,
  "q": "W przypadku uruchomienia radiopławy systemu COSPAS-SARSAT, czas jaki upływa od jej uruchomienia do powiadomienia RCC wynosi:",
  "options": [
   "około 5 minut jeżeli radiopława znajduje się w zasięgu satelitów geostacjonarnych",
   "około 15 minut jeżeli radiopława została uruchomiona w dzień",
   "około 25 minut jeżeli radiopława została uruchomiona w nocy"
  ],
  "correct": 0,
  "whyPl": "Satelity geostacjonarne (GEOSAR) odbierają sygnał praktycznie natychmiast, więc powiadomienie RCC następuje w ciągu około 5 minut.",
  "confidence": "sure"
 },
 {
  "id": "src-2-73",
  "part": 2,
  "q": "Obieg informacji o alarmowaniu w systemie COSPAS-SARSAT przebiega wg schematu:",
  "options": [
   "radiopława → satelita biegunowy→LUT→MCC→RCC→jednostki SAR",
   "radiopława → satelita biegunowy→LUT→RCC→jednostki SAR",
   "radiopława→ satelita geostacjonarny→LUT→MCC→RCC→jednostki SAR"
  ],
  "correct": 0,
  "whyPl": "Klasyczny schemat alarmowania to radiopława, satelita biegunowy, stacja LUT, centrum MCC, ratownicze RCC i jednostki SAR.",
  "confidence": "sure"
 },
 {
  "id": "src-2-74",
  "part": 2,
  "q": "W celu dokonania rejestracji radiopławy należy:",
  "options": [
   "zgłosić się do Urzędu Lotnictwa Cywilnego w Warszawie",
   "zgłosić się do Urzędu Komunikacji Elektronicznej",
   "zgłosić się do MRCC Gdynia"
  ],
  "correct": 1,
  "whyPl": "W Polsce rejestracji radiopławy dokonuje się w Urzędzie Komunikacji Elektronicznej przy wydawaniu pozwolenia radiowego.",
  "confidence": "sure"
 },
 {
  "id": "src-2-75",
  "part": 2,
  "q": "Satelita biegunowy po odebraniu sygnałów z radiopławy 121,5 MHz:",
  "options": [
   "określa pozycję radiopławy i przekazuje tę informację do RCC",
   "określa pozycję radiopławy i przekazuje tę informację do stacji LUT",
   "satelita biegunowy nie odbiera sygnału 121,5 MHz"
  ],
  "correct": 2,
  "whyPl": "Od 2009 r. segment satelitarny nie odbiera ani nie przetwarza sygnałów 121,5 MHz.",
  "confidence": "sure"
 },
 {
  "id": "src-2-76",
  "part": 2,
  "q": "Satelita biegunowy po odebraniu sygnałów z radiopławy 406 MHz:",
  "options": [
   "określa pozycję radiopławy i przekazuje tę informację do LUT",
   "retransmituje odebrane z radiopławy sygnały do satelity geostacjonarnego",
   "retransmituje odebrane z radiopławy sygnały do stacji LUT"
  ],
  "correct": 2,
  "whyPl": "Satelita jedynie retransmituje odebrane sygnały 406 MHz do naziemnej stacji LUT, która wykonuje obliczenia.",
  "confidence": "sure"
 },
 {
  "id": "src-2-77",
  "part": 2,
  "q": "Określenie pozycji radiopławy w systemie COSPAS-SARSAT następuje w:",
  "options": [
   "RCC",
   "LUT",
   "na pokładzie satelity biegunowego"
  ],
  "correct": 1,
  "whyPl": "Pozycja radiopławy jest obliczana w stacji odbiorczej LUT na podstawie danych dopplerowskich.",
  "confidence": "sure"
 },
 {
  "id": "src-2-78",
  "part": 2,
  "q": "Określenie pozycji radiopławy w oparciu o sygnały nadawane na częstotliwości 121,5 MHz jest możliwe w systemie COSPAS-SARSAT:",
  "options": [
   "nie jest możliwe",
   "zawsze",
   "tylko w obszarze A1"
  ],
  "correct": 0,
  "whyPl": "Lokalizacja na podstawie 121,5 MHz nie jest już możliwa, bo satelity zaprzestały śledzenia tej częstotliwości w 2009 r.",
  "confidence": "sure"
 },
 {
  "id": "src-2-79",
  "part": 2,
  "q": "Testowanie radiopławy polega na:",
  "options": [
   "wykonaniu raz w miesiącu testu zgodnie z instrukcją na obudowie radiopławy",
   "ręcznym uruchomieniu radiopławy i sprawdzeniu, czy zareagowały RCC",
   "wrzuceniu radiopławy do wody i sprawdzeniu, czy zacznie działać światło błyskowe"
  ],
  "correct": 0,
  "whyPl": "Radiopławę testuje się raz w miesiącu wbudowaną funkcją samotestu zgodnie z instrukcją na obudowie, bez nadawania alarmu.",
  "confidence": "sure"
 },
 {
  "id": "src-2-80",
  "part": 2,
  "q": "Które z poniższych zdań jest prawdziwe?",
  "options": [
   "Na obudowie satelitarnej pławy awaryjnej powinna być umieszczona tabliczka z kodem identyfikacyjnym zaprogramowanym w nadajniku.",
   "Radiopława powinna być wyposażona w lampę o światłości 0,5 cd.",
   "Radiopława powinna mieć wbudowany transponder radarowy."
  ],
  "correct": 0,
  "whyPl": "Na obudowie radiopławy musi być trwale umieszczony zaprogramowany kod identyfikacyjny, lampa błyskowa ma światłość 0,75 cd.",
  "confidence": "sure"
 },
 {
  "id": "src-2-81",
  "part": 2,
  "q": "Które z poniższych zdań jest prawdziwe?",
  "options": [
   "Częstotliwość 121,5 MHz transmitowana przez radiopławę systemu COSPAS - SARSAT może być wykorzystana do namierzania przez jednostki SAR.",
   "Częstotliwość 121,5 MHz transmitowana przez radiopławę systemu COSPAS - SARSAT będzie śledzona przez satelity zainstalowane na orbitach MEO.",
   "Częstotliwość 121,5 MHz transmitowana przez radiopławę systemu COSPAS - SARSAT używana jest do transmisji pozycji radiopławy."
  ],
  "correct": 0,
  "whyPl": "Częstotliwość 121,5 MHz służy do namierzania radiopławy przez jednostki SAR w końcowej fazie akcji.",
  "confidence": "sure"
 },
 {
  "id": "src-2-82",
  "part": 2,
  "q": "Numer identyfikacyjny w postaci 974XXYYYY zarezerwowany jest dla:",
  "options": [
   "przeznaczonego na środki ratunkowe AIS SART.",
   "wbudowanego w radiopławę COSPAS - SARSAT transpondera AIS.",
   "urządzeń AIS przeznaczonych dla lokalizacji człowieka za burtą (MOB)."
  ],
  "correct": 1,
  "whyPl": "Zgodnie z ITU numery 974XXYYYY są zarezerwowane dla nadajników AIS wbudowanych w radiopławy EPIRB-AIS, 970 to AIS-SART, a 972 to MOB.",
  "confidence": "sure"
 },
 {
  "id": "src-2-83",
  "part": 2,
  "q": "W przypadku uruchomienia radiopławy w sytuacji, gdy nie ma zagrożenia, należy:",
  "options": [
   "natychmiast wyłączyć radiopławę",
   "natychmiast wyłączyć radiopławę i powiadomić o zaistniałym fakcie najbliższe RCC",
   "natychmiast wyłączyć radiopławę i powiadomić o zaistniałym fakcie znajdujące się w pobliżu statki"
  ],
  "correct": 1,
  "whyPl": "Fałszywy alarm należy odwołać, czyli wyłączyć radiopławę i niezwłocznie powiadomić najbliższe RCC o nieumyślnym uruchomieniu.",
  "confidence": "sure"
 },
 {
  "id": "src-2-84",
  "part": 2,
  "q": "Transponder radarowy służy do:",
  "options": [
   "lokalizacji rozbitków na miejscu katastrofy",
   "szybkiego powiadamiania RCC o katastrofie",
   "wykrywania jednostek znajdujących się w pobliżu"
  ],
  "correct": 0,
  "whyPl": "Transponder radarowy SART służy do lokalizacji rozbitków na miejscu katastrofy przez radary jednostek ratowniczych.",
  "confidence": "sure"
 },
 {
  "id": "src-2-85",
  "part": 2,
  "q": "Transponder radarowy współpracuje z radarami:",
  "options": [
   "w paśmie S",
   "w paśmie X",
   "pracującymi w paśmie 3 GHz"
  ],
  "correct": 1,
  "whyPl": "SART współpracuje wyłącznie z radarami pasma X pracującymi na częstotliwości 9 GHz.",
  "confidence": "sure"
 },
 {
  "id": "src-2-86",
  "part": 2,
  "q": "Transponder radarowy nadaje swój sygnał:",
  "options": [
   "natychmiast po włączeniu",
   "po włączeniu i pobudzeniu przez radar pracujący w paśmie 9 GHz",
   "po zanurzeniu w wodzie morskiej"
  ],
  "correct": 1,
  "whyPl": "Po włączeniu SART pozostaje w gotowości i nadaje odpowiedź dopiero po pobudzeniu impulsem radaru 9 GHz.",
  "confidence": "sure"
 },
 {
  "id": "src-2-87",
  "part": 2,
  "q": "Zasięg transpondera radarowego zależy:",
  "options": [
   "wysokości umieszczenia transpondera na tratwie ratunkowej",
   "od tego czy nadaje w paśmie X czy S",
   "od temperatury otoczenia"
  ],
  "correct": 0,
  "whyPl": "Zasięg SART zależy od wysokości jego umieszczenia, dlatego należy go montować jak najwyżej na tratwie.",
  "confidence": "sure"
 },
 {
  "id": "src-2-88",
  "part": 2,
  "q": "Przy wysokości umieszczenia transpondera radarowego 1 m i antenie radaru statku wykrywającego na wysokości 10-15 m, zasięg będzie wynosił:",
  "options": [
   "około 12 mil",
   "poniżej 2 mil",
   "5 do 7 mil"
  ],
  "correct": 2,
  "whyPl": "Przy SART na wysokości 1 m i antenie radaru statku na 10-15 m typowy zasięg wykrycia wynosi około 5 do 7 mil morskich.",
  "confidence": "sure"
 },
 {
  "id": "src-2-89",
  "part": 2,
  "q": "Maksymalny zasięg transpondera radarowego przy wykrywaniu z helikoptera wynosi:",
  "options": [
   "15 mil",
   "30-40 mil",
   "60 mil"
  ],
  "correct": 1,
  "whyPl": "Samolot lub helikopter lecący na wysokości około 3000 stóp wykrywa SART z odległości około 30-40 mil morskich.",
  "confidence": "sure"
 },
 {
  "id": "src-2-90",
  "part": 2,
  "q": "Pojemność baterii transpondera radarowego powinna zapewnić pracę:",
  "options": [
   "minimum 96 godz. w stanie gotowości plus 8 godz. nadawania",
   "minimum 48 godz. w stanie gotowości plus 8 godz. nadawania",
   "minimum 24 godz. w stanie gotowości plus 8 godz. nadawania"
  ],
  "correct": 0,
  "whyPl": "Zgodnie z rezolucją IMO A.802(19) bateria SART musi zapewnić 96 godzin gotowości oraz dodatkowo 8 godzin nadawania.",
  "confidence": "sure"
 },
 {
  "id": "src-2-91",
  "part": 2,
  "q": "Sygnał z transpondera radarowego widziany jest na ekranie radaru w postaci:",
  "options": [
   "jasnego kółka w pozycji transpondera",
   "serii równo oddalonych od siebie kropek",
   "jasnego trójkąta w pozycji transpondera"
  ],
  "correct": 1,
  "whyPl": "Odpowiedź SART widoczna jest na ekranie radaru jako seria 12 równo oddalonych kropek rozciągających się od pozycji transpondera.",
  "confidence": "sure"
 },
 {
  "id": "src-2-92",
  "part": 2,
  "q": "Transponder radarowy nadaje po pobudzeniu sygnał:",
  "options": [
   "na stałej częstotliwości 9,5 GHz",
   "w paśmie 9,2 - 9,5 GHz",
   "w paśmie 9,0 - 9,4 GHz"
  ],
  "correct": 1,
  "whyPl": "SART po pobudzeniu nadaje sygnał przemiatany w całym radarowym paśmie X, czyli 9,2-9,5 GHz.",
  "confidence": "sure"
 },
 {
  "id": "src-2-93",
  "part": 2,
  "q": "Sygnał z transpondera radarowego widziany jest na ekranie radaru:",
  "options": [
   "w postaci łuków przy odległości do rozbitków poniżej 1 mili",
   "w postaci łuków przy odległości do rozbitków poniżej 3 mil",
   "w postaci koncentrycznych okręgów przy odległości do rozbitków poniżej 5 mil"
  ],
  "correct": 0,
  "whyPl": "Odpowiedź SART zmienia się z kropek w łuki, gdy odległość do rozbitków spada poniżej około 1 mili morskiej.",
  "confidence": "sure"
 },
 {
  "id": "src-2-94",
  "part": 2,
  "q": "Sygnał z transpondera radarowego widziany jest na ekranie radaru:",
  "options": [
   "w postaci koncentrycznych okręgów przy odległości do rozbitków poniżej 1 mili",
   "w postaci koncentrycznych okręgów przy odległości do rozbitków poniżej 0,1 mili",
   "w postaci koncentrycznych okręgów przy odległości do rozbitków poniżej 2 mil"
  ],
  "correct": 1,
  "whyPl": "Koncentryczne okręgi pojawiają się dopiero bardzo blisko transpondera, przy odległości poniżej około 0,1 mili.",
  "confidence": "sure"
 },
 {
  "id": "src-2-95",
  "part": 2,
  "q": "Pozycję rozbitków na ekranie radaru wyznacza:",
  "options": [
   "najdalsza kropka",
   "najbliższy łuk",
   "najdalszy łuk"
  ],
  "correct": 1,
  "whyPl": "Pozycję SART wyznacza pierwsze echo odpowiedzi, czyli łuk położony najbliżej własnego statku.",
  "confidence": "sure"
 },
 {
  "id": "src-2-96",
  "part": 2,
  "q": "Pozycję rozbitków na ekranie radaru wyznacza:",
  "options": [
   "najdalsza kropka",
   "najdalszy łuk",
   "najbliższa kropka"
  ],
  "correct": 2,
  "whyPl": "Pozycja rozbitków odpowiada pierwszemu echu serii, czyli kropce położonej najbliżej własnego statku.",
  "confidence": "sure"
 },
 {
  "id": "src-2-97",
  "part": 2,
  "q": "Transponder radarowy nadaje swój sygnał w paśmie 9,2 - 9,5 GHz:",
  "options": [
   "aby uzyskać większą odległość wykrywania",
   "ponieważ trudno jest utrzymać stałą częstotliwość",
   "by umożliwić współpracę z wszystkimi radarami w paśmie X"
  ],
  "correct": 2,
  "whyPl": "Przemiatanie całego pasma 9,2-9,5 GHz zapewnia współpracę SART z każdym radarem pracującym w paśmie X.",
  "confidence": "sure"
 },
 {
  "id": "src-2-98",
  "part": 2,
  "q": "Rozbitkowie mogą poznać, że sygnał z transpondera radarowego został wykryty:",
  "options": [
   "przez sygnalizację świetlną lub akustyczną na transponderze",
   "ponieważ zostaną powiadomieni przez przenośny radiotelefon VHF",
   "nie wiedzą czy zostali wykryci"
  ],
  "correct": 0,
  "whyPl": "SART ma wskaźnik świetlny lub akustyczny, który sygnalizuje rozbitkom, że transponder został pobudzony przez radar.",
  "confidence": "sure"
 },
 {
  "id": "src-2-99",
  "part": 2,
  "q": "Rozbitkowie mogą zwiększyć zasięg transpondera radarowego przez:",
  "options": [
   "podgrzanie transpondera własnym ciałem",
   "umieszczenie go jak najwyżej",
   "załączanie transpondera w cyklu: minuta pracy, minuta przerwy"
  ],
  "correct": 1,
  "whyPl": "Zasięg SART zależy od wysokości jego anteny, dlatego należy umieścić go jak najwyżej nad wodą.",
  "confidence": "sure"
 },
 {
  "id": "src-2-100",
  "part": 2,
  "q": "Przy wykrywaniu transpondera można wyeliminować zakłócenia od opadów przez:",
  "options": [
   "zmianę zakresu radaru",
   "zmianę jasności zobrazowania radaru",
   "odstrojenie odbiornika radaru"
  ],
  "correct": 2,
  "whyPl": "Lekkie odstrojenie odbiornika radaru usuwa echa opadów, a szerokopasmowa odpowiedź SART pozostaje widoczna.",
  "confidence": "sure"
 },
 {
  "id": "src-2-101",
  "part": 2,
  "q": "W sytuacji, gdy na ekranie radaru widoczne są łuki, można przywrócić kropki przez:",
  "options": [
   "zmianę jasności zobrazowania",
   "odstrojenie radaru",
   "zmniejszenie wzmocnienia radaru"
  ],
  "correct": 2,
  "whyPl": "Zmniejszenie wzmocnienia odbiornika radaru eliminuje echa listków bocznych anteny i przywraca obraz kropek.",
  "confidence": "sure"
 },
 {
  "id": "src-2-102",
  "part": 2,
  "q": "W radiotelefonii używana jest fala nośna:",
  "options": [
   "prostokątna",
   "trójkątna",
   "sinusoidalna"
  ],
  "correct": 2,
  "whyPl": "W radiotelefonii falą nośną jest fala sinusoidalna, którą moduluje się sygnałem akustycznym.",
  "confidence": "sure"
 },
 {
  "id": "src-2-103",
  "part": 2,
  "q": "Amplituda fali nośnej to:",
  "options": [
   "maksymalna wartość napięcia wyrażona w woltach",
   "skuteczna wartość napięcia wyrażona w woltach",
   "średnia wartość napięcia wyrażona w woltach"
  ],
  "correct": 0,
  "whyPl": "Amplituda to maksymalna, szczytowa wartość napięcia fali nośnej wyrażona w woltach.",
  "confidence": "sure"
 },
 {
  "id": "src-2-104",
  "part": 2,
  "q": "Częstotliwość fali nośnej zależy od jej:",
  "options": [
   "amplitudy",
   "fazy",
   "długości"
  ],
  "correct": 2,
  "whyPl": "Przy stałej prędkości rozchodzenia się fal częstotliwość jest jednoznacznie związana z długością fali.",
  "confidence": "sure"
 },
 {
  "id": "src-2-105",
  "part": 2,
  "q": "Fala radiowa o częstotliwości 156 MHz ma długość:",
  "options": [
   "około 20 metrów",
   "około 15 metrów",
   "około 2 metrów"
  ],
  "correct": 2,
  "whyPl": "Długość fali to 300 podzielone przez 156 MHz, czyli około 1,9 m, w przybliżeniu 2 metry.",
  "confidence": "sure"
 },
 {
  "id": "src-2-106",
  "part": 2,
  "q": "Fala radiowa o długości 2 metrów ma częstotliwość:",
  "options": [
   "150 MHz",
   "1500 MHz",
   "1500 kHz"
  ],
  "correct": 0,
  "whyPl": "Częstotliwość to 300 podzielone przez długość fali w metrach, czyli 300/2 = 150 MHz.",
  "confidence": "sure"
 },
 {
  "id": "src-2-107",
  "part": 2,
  "q": "Prędkość rozchodzenia się fal to:",
  "options": [
   "300 000 km/s",
   "300 000 m/s",
   "300 000 km/godz"
  ],
  "correct": 0,
  "whyPl": "Fale radiowe rozchodzą się z prędkością światła, czyli około 300 000 km/s.",
  "confidence": "sure"
 },
 {
  "id": "src-2-108",
  "part": 2,
  "q": "W nadajnikach VHF radiotelefonów morskich stosowana jest modulacja:",
  "options": [
   "amplitudy",
   "impulsowa",
   "częstotliwości / fazy"
  ],
  "correct": 2,
  "whyPl": "Morskie radiotelefony VHF pracują emisją G3E, czyli z modulacją częstotliwości/fazy, a nie amplitudy.",
  "confidence": "sure"
 },
 {
  "id": "src-2-109",
  "part": 2,
  "q": "Emisja G3E to emisja:",
  "options": [
   "amplitudowa",
   "z modulacją fazy",
   "cyfrowa"
  ],
  "correct": 1,
  "whyPl": "Litera G w oznaczeniu emisji G3E oznacza modulację fazy stosowaną w morskiej radiotelefonii VHF.",
  "confidence": "sure"
 },
 {
  "id": "src-2-110",
  "part": 2,
  "q": "Maksymalna moc statkowych radiotelefonów VHF wynosi:",
  "options": [
   "200 W",
   "5W",
   "25 W"
  ],
  "correct": 2,
  "whyPl": "Maksymalna moc nadajnika statkowego radiotelefonu VHF wynosi 25 W, z możliwością redukcji do 1 W.",
  "confidence": "sure"
 },
 {
  "id": "src-2-111",
  "part": 2,
  "q": "Zmiana mocy radiotelefonu ma wpływ na:",
  "options": [
   "słyszalność dalekich stacji",
   "poziom szumów",
   "jego zasięg"
  ],
  "correct": 2,
  "whyPl": "Moc nadawania decyduje o zasięgu łączności, natomiast nie wpływa na odbiór dalekich stacji.",
  "confidence": "sure"
 },
 {
  "id": "src-2-112",
  "part": 2,
  "q": "Funkcja podwójnego nasłuchu w radiotelefonie VHF pozwala na:",
  "options": [
   "jednoczesny nasłuch dwóch dowolnych kanałów",
   "jednoczesny nasłuch kanału 16 i 70",
   "jednoczesny nasłuch kanału 16 i dowolnego roboczego"
  ],
  "correct": 2,
  "whyPl": "Funkcja dual watch zapewnia jednoczesny nasłuch kanału 16 oraz jednego wybranego kanału roboczego.",
  "confidence": "sure"
 },
 {
  "id": "src-2-113",
  "part": 2,
  "q": "Przełączenie kanałów międzynarodowych na amerykańskie:",
  "options": [
   "zmienia moc nadawania we wszystkich kanałach",
   "zmienia niektóre kanały z simpleksowych na dupleksowe",
   "zmienia niektóre kanały z dupleksowych na simpleksowe"
  ],
  "correct": 2,
  "whyPl": "W trybie amerykańskim część międzynarodowych kanałów dupleksowych pracuje jako simpleksowe, np. kanały z literą A.",
  "confidence": "sure"
 },
 {
  "id": "src-2-114",
  "part": 2,
  "q": "Funkcja blokady szumów odcina szumy i zakłócenia od głośnika poprzez:",
  "options": [
   "blokadę wzmacniacza wysokiej częstotliwości dla słabych sygnałów",
   "blokadę wzmacniacza częstotliwości akustycznej dla słabych sygnałów",
   "blokadę wzmacniacza wysokiej częstotliwości dla silnych sygnałów"
  ],
  "correct": 1,
  "whyPl": "Blokada szumów (squelch) wyłącza wzmacniacz częstotliwości akustycznej, gdy odbierany sygnał jest zbyt słaby.",
  "confidence": "sure"
 },
 {
  "id": "src-2-115",
  "part": 2,
  "q": "Długość anteny prętowej nadajnika jest przede wszystkim uzależniona od:",
  "options": [
   "mocy nadajnika",
   "częstotliwości nadajnika",
   "amplitudy napięcia"
  ],
  "correct": 1,
  "whyPl": "Długość anteny musi być dopasowana do długości fali, a więc zależy od częstotliwości pracy nadajnika.",
  "confidence": "sure"
 },
 {
  "id": "src-2-116",
  "part": 2,
  "q": "Regulacja głośności odbiornika VHF odbywa się przez:",
  "options": [
   "zmianę wzmocnienia wzmacniacza akustycznego",
   "zastosowanie blokady szumów",
   "zmianę wzmocnienia wzmacniacza pośredniej częstotliwości"
  ],
  "correct": 0,
  "whyPl": "Regulator głośności zmienia wzmocnienie wzmacniacza akustycznego (małej częstotliwości) odbiornika.",
  "confidence": "sure"
 },
 {
  "id": "src-2-117",
  "part": 2,
  "q": "W akumulatorach kwasowych elektrolitem jest:",
  "options": [
   "kwas siarkowy",
   "wodny roztwór kwasu siarkowego",
   "wodny roztwór kwasu solnego"
  ],
  "correct": 1,
  "whyPl": "Elektrolitem w akumulatorze kwasowym jest wodny roztwór kwasu siarkowego, a nie czysty kwas.",
  "confidence": "sure"
 },
 {
  "id": "src-2-118",
  "part": 2,
  "q": "W trakcie ładowania akumulatorów kwasowych wydzielane są gazy. Jest to:",
  "options": [
   "wodór",
   "chlor",
   "azot"
  ],
  "correct": 0,
  "whyPl": "Podczas ładowania wydziela się wodór z elektrolizy wody, dlatego pomieszczenie akumulatorów musi być wentylowane.",
  "confidence": "sure"
 },
 {
  "id": "src-2-119",
  "part": 2,
  "q": "Na zaciskach kwasowego akumulatora statkowego o napięciu znamionowym 24 V zmierzone napięcie wynosi 21 V. Oznacza to, że:",
  "options": [
   "akumulator jest całkowicie rozładowany",
   "akumulator jest częściowo rozładowany",
   "akumulator jest naładowany"
  ],
  "correct": 0,
  "whyPl": "21 V przy 12 ogniwach daje 1,75 V na ogniwo, czyli dopuszczalne napięcie końcowe, więc akumulator jest całkowicie rozładowany.",
  "confidence": "sure"
 },
 {
  "id": "src-2-120",
  "part": 2,
  "q": "Akumulatorów kwasowych nie wolno wyładowywać poniżej dopuszczalnego napięcia końcowego które wynosi:",
  "options": [
   "1,75 V/ogniwo",
   "1,95 V/ogniwo",
   "1,6 V/ogniwo"
  ],
  "correct": 0,
  "whyPl": "Dopuszczalne napięcie końcowe rozładowania akumulatora kwasowego wynosi 1,75 V na ogniwo.",
  "confidence": "sure"
 },
 {
  "id": "src-2-121",
  "part": 2,
  "q": "Gęstość elektrolitu w akumulatorach kwasowych jest miarą naładowania akumulatora. Zmierzona gęstość elektrolitu zwykłego akumulatora kwasowego w temperaturze 20º C wynosi 1,28 g/cm³. Oznacza to, że:",
  "options": [
   "akumulator jest całkowicie rozładowany",
   "akumulator jest częściowo rozładowany",
   "akumulator jest całkowicie naładowany"
  ],
  "correct": 2,
  "whyPl": "Gęstość elektrolitu 1,28 g/cm³ przy 20°C odpowiada akumulatorowi kwasowemu całkowicie naładowanemu.",
  "confidence": "sure"
 },
 {
  "id": "src-2-122",
  "part": 2,
  "q": "Gęstość elektrolitu w akumulatorach kwasowych jest miarą naładowania akumulatora. Zmierzona gęstość elektrolitu zwykłego akumulatora kwasowego w temperaturze 20º C wynosi 1,10 g/cm³. Oznacza to, że:",
  "options": [
   "akumulator jest całkowicie rozładowany",
   "akumulator jest częściowo rozładowany",
   "akumulator jest całkowicie naładowany"
  ],
  "correct": 0,
  "whyPl": "Gęstość 1,10 g/cm³ oznacza akumulator całkowicie rozładowany, bo pełne naładowanie to około 1,28 g/cm³.",
  "confidence": "sure"
 },
 {
  "id": "src-2-123",
  "part": 2,
  "q": "Wraz ze spadkiem temperatury pojemność akumulatorów kwasowych:",
  "options": [
   "nie zmienia się",
   "spada o 0,5-1,0 % na stopień C",
   "wzrasta o około 1 % na stopień C"
  ],
  "correct": 1,
  "whyPl": "Pojemność akumulatora kwasowego spada wraz z temperaturą o około 0,5-1 % na każdy stopień Celsjusza.",
  "confidence": "sure"
 },
 {
  "id": "src-2-124",
  "part": 2,
  "q": "Gęstość elektrolitu całkowicie naładowanego akumulatora kwasowego w tropiku jest:",
  "options": [
   "mniejsza niż gęstość elektrolitu w temperaturze 20º C i wynosi 1,23 g/cm³",
   "mniejsza niż gęstość elektrolitu w temperaturze 20º C i wynosi 1,15 g/cm³",
   "taka sama jak w strefie umiarkowanej"
  ],
  "correct": 0,
  "whyPl": "W tropiku stosuje się elektrolit o mniejszej gęstości, około 1,23 g/cm³, aby ograniczyć korozję płyt w wysokiej temperaturze.",
  "confidence": "sure"
 },
 {
  "id": "src-2-125",
  "part": 2,
  "q": "Akumulatory kwasowe w przypadku wyłączenia z eksploatacji powinny być przechowywane w stanie:",
  "options": [
   "naładowanym",
   "całkowicie rozładowanym",
   "naładowanym do 50 % pojemności znamionowej"
  ],
  "correct": 0,
  "whyPl": "Akumulator kwasowy wyłączony z eksploatacji przechowuje się w stanie naładowanym, bo rozładowany ulega zasiarczeniu.",
  "confidence": "sure"
 },
 {
  "id": "src-2-126",
  "part": 2,
  "q": "W trakcie eksploatacji akumulatorów kwasowych zachodzi konieczność uzupełniania elektrolitu. Uzupełnianie elektrolitu polega na dolewaniu do poszczególnych cel akumulatora:",
  "options": [
   "kwasu siarkowego",
   "wody destylowanej",
   "wody"
  ],
  "correct": 1,
  "whyPl": "Podczas eksploatacji odparowuje tylko woda, więc uzupełnia się wyłącznie wodę destylowaną, nigdy kwas.",
  "confidence": "sure"
 },
 {
  "id": "src-2-127",
  "part": 2,
  "q": "W trakcie niewłaściwej eksploatacji akumulatorów kwasowych następuje ich zasiarczenie. Które z poniższych zjawisk świadczą o zasiarczeniu akumulatora:",
  "options": [
   "niski poziom elektrolitu",
   "silne grzanie elektrolitu w trakcie ładowania",
   "nalot na zaciskach akumulatora"
  ],
  "correct": 1,
  "whyPl": "Objawem zasiarczenia jest silne grzanie się elektrolitu i przedwczesne gazowanie podczas ładowania.",
  "confidence": "sure"
 },
 {
  "id": "src-2-128",
  "part": 2,
  "q": "Transponder AIS SART współpracuje z:",
  "options": [
   "wszystkimi radarami pracującymi w paśmie X",
   "transponderami AIS znajdującymi się na statkach",
   "wszystkimi radarami w paśmie S"
  ],
  "correct": 1,
  "whyPl": "AIS SART nadaje komunikaty AIS, więc jest odbierany przez transpondery AIS statków, a nie przez radary.",
  "confidence": "sure"
 },
 {
  "id": "src-2-129",
  "part": 2,
  "q": "Jak jest minimalny zasięg wykrycia transpondera AIS SART?",
  "options": [
   "Minimum 15 NM przez jednostkę w której antena jest zamontowana 15 m npm.",
   "Minimum 5 NM przez jednostkę w której antena jest zamontowana 15 m npm.",
   "Minimum 10 NM przez jednostkę w której antena jest zamontowana 15 m npm."
  ],
  "correct": 1,
  "whyPl": "Wymagany minimalny zasięg wykrycia AIS SART to 5 NM przez statek z anteną na wysokości 15 m.",
  "confidence": "sure"
 },
 {
  "id": "src-2-130",
  "part": 2,
  "q": "Co oznaczają cyfry 09 w numerze identyfikacyjnym transpondera AIS SART 970091129?",
  "options": [
   "Kod identyfikacyjny producenta transpondera.",
   "Przynależność do danego rejonu geograficznego.",
   "Numer identyfikacyjny państwa bandery."
  ],
  "correct": 0,
  "whyPl": "Numer AIS SART ma format 970 YY XXXX, gdzie YY to kod identyfikacyjny producenta transpondera.",
  "confidence": "sure"
 },
 {
  "id": "src-2-131",
  "part": 2,
  "q": "Jak jest minimalny zasięg wykrycia transpondera AIS SART przez samolot na wysokości 1000 m?",
  "options": [
   "50 NM",
   "powyżej 100 NM",
   "30 NM"
  ],
  "correct": 2,
  "whyPl": "Samolot lecący na wysokości 1000 m powinien wykryć AIS SART z odległości co najmniej 30 NM.",
  "confidence": "sure"
 },
 {
  "id": "src-2-132",
  "part": 2,
  "q": "Które z poniższych informacji są zakodowane w transponderze AIS SART?",
  "options": [
   "MMSI statku",
   "CALL SIGN i MMSI statku",
   "9-cio cyfrowy numer identyfikacyjny transpondera"
  ],
  "correct": 2,
  "whyPl": "AIS SART ma zakodowany własny 9-cyfrowy numer identyfikacyjny zaczynający się od 970, a nie MMSI statku.",
  "confidence": "sure"
 },
 {
  "id": "src-2-133",
  "part": 2,
  "q": "Które ze zdań jest prawdziwe?",
  "options": [
   "Transponder AIS SART nie ma nadanego numeru identyfikacyjnego.",
   "Numer identyfikacyjny transpondera jest taki sam jak numer MMSI statku, na którym się znajduje transponder.",
   "Numer identyfikacyjny transpondera AIS SART zawsze rozpoczyna się ciągiem cyfr 970."
  ],
  "correct": 2,
  "whyPl": "Numer identyfikacyjny AIS SART zawsze zaczyna się od cyfr 970 zgodnie z zaleceniem ITU-R M.585.",
  "confidence": "sure"
 },
 {
  "id": "src-2-134",
  "part": 2,
  "q": "Jaki symbol został ustalony przez IMO dla wskazania transpondera AIS SART na mapie elektronicznej?",
  "options": [
   "Migający statek w kolorze czerwonym.",
   "Okrąg ze skrzyżowanymi w środku liniami ciągłymi w kolorze czerwonym.",
   "Kwadrat ze skrzyżowanymi w środku liniami ciągłymi w kolorze czerwonym."
  ],
  "correct": 1,
  "whyPl": "Symbol IMO dla AIS SART na mapie elektronicznej to czerwony okrąg ze skrzyżowanymi liniami w środku.",
  "confidence": "sure"
 },
 {
  "id": "src-2-135",
  "part": 2,
  "q": "Baterie przeznaczone do zasilania przenośnych radiotelefonów awaryjnych VHF:",
  "options": [
   "powinny posiadać pojemność zapewniającą co najmniej 8 godzin pracy radiotelefonu z pełną mocą w cyklu pracy 1:9 (6 sekund nadawanie, 6 sekund odbiór bez blokady szumów, 48 sekund odbiór z blokada szumów)",
   "powinny posiadać pojemność zapewniającą co najmniej 48 godzin pracy radiotelefonu z pełną mocą w cyklu pracy 1:9 (6 sekund nadawanie, 6 sekund odbiór bez blokady szumów, 48 sekund odbiór z blokada szumów)",
   "powinny posiadać pojemność zapewniającą co najmniej 8 godzin pracy radiotelefonu z pełną mocą"
  ],
  "correct": 0,
  "whyPl": "Rezolucja IMO A.809(19) wymaga co najmniej 8 godzin pracy przy pełnej mocy w cyklu 1:9.",
  "confidence": "sure"
 },
 {
  "id": "src-2-136",
  "part": 2,
  "q": "Baterie przeznaczone do zasilania awaryjnych transponderów radarowych (SART):",
  "options": [
   "powinny posiadać pojemność zapewniającą co najmniej 96 godzin pracy w stanie czuwania i następnie umożliwiać nadawanie sygnałów przez 8 godzin",
   "powinny posiadać pojemność zapewniającą co najmniej 96 godzin pracy",
   "powinny posiadać pojemność zapewniającą co najmniej 48 godzin pracy w stanie czuwania i następnie umożliwiać nadawanie sygnałów przez 8 godzin"
  ],
  "correct": 0,
  "whyPl": "Bateria SART musi zapewnić 96 godzin czuwania, a następnie 8 godzin nadawania po pobudzeniu radarem.",
  "confidence": "sure"
 },
 {
  "id": "src-2-137",
  "part": 2,
  "q": "Baterie przeznaczone do zasilania radiopław awaryjnych:",
  "options": [
   "powinny posiadać pojemność zapewniającą co najmniej 48 godzin pracy, w tym nadawania sygnałów do lokalizacji i zasilanie światła błyskowego",
   "powinny posiadać pojemność zapewniającą co najmniej 96 godzin pracy, w tym nadawania sygnałów do lokalizacji i zasilanie światła błyskowego",
   "powinny posiadać pojemność zapewniającą co najmniej 12 godzin pracy, w tym nadawania sygnałów do lokalizacji i zasilanie światła błyskowego"
  ],
  "correct": 0,
  "whyPl": "Bateria radiopławy EPIRB musi zapewnić co najmniej 48 godzin pracy wraz z sygnałami lokalizacyjnymi i światłem błyskowym.",
  "confidence": "sure"
 },
 {
  "id": "src-2-138",
  "part": 2,
  "q": "Który z wymienionych wzorów określa zależność pomiędzy prędkością propagacji fali (c [m/s]), jej częstotliwością (f [Hz]) i długością (λ [m]):",
  "options": [
   "f = c · λ",
   "f = λ / c",
   "f = c / λ"
  ],
  "correct": 2,
  "whyPl": "Częstotliwość fali to prędkość propagacji podzielona przez długość fali, czyli f = c / λ.",
  "confidence": "sure"
 },
 {
  "id": "src-2-139",
  "part": 2,
  "q": "Prędkość rozchodzenia się fali elektromagnetycznej w wolnej przestrzeni wynosi:",
  "options": [
   "340 m/s",
   "300 km/s",
   "300 000 000 m/s"
  ],
  "correct": 2,
  "whyPl": "Fala elektromagnetyczna w wolnej przestrzeni rozchodzi się z prędkością światła, czyli 300 000 000 m/s.",
  "confidence": "sure"
 },
 {
  "id": "src-2-140",
  "part": 2,
  "q": "W czasie 5 µs fala elektromagnetyczna przebywa dystans:",
  "options": [
   "3 km",
   "1,5 km",
   "750 m"
  ],
  "correct": 1,
  "whyPl": "W czasie 5 µs fala przebywa 300 000 000 m/s razy 0,000005 s, czyli 1,5 km.",
  "confidence": "sure"
 },
 {
  "id": "src-2-141",
  "part": 2,
  "q": "Jaka jest długość fali w wolnej przestrzeni, jeżeli jej częstotliwość wynosi 150 MHz:",
  "options": [
   "2 m",
   "20 m",
   "200 m"
  ],
  "correct": 0,
  "whyPl": "Długość fali to 300 000 000 m/s podzielone przez 150 MHz, co daje 2 m.",
  "confidence": "sure"
 },
 {
  "id": "src-2-142",
  "part": 2,
  "q": "Od jakich czynników zależy zasięg łączności na falach VHF:",
  "options": [
   "od wysokości anteny nadawczej i odbiorczej",
   "od pory doby",
   "od szerokości geograficznej"
  ],
  "correct": 0,
  "whyPl": "Zasięg łączności VHF jest quasi-optyczny i zależy od wysokości anten nadawczej i odbiorczej.",
  "confidence": "sure"
 },
 {
  "id": "src-2-143",
  "part": 2,
  "q": "Jeżeli antena nadajnika radiotelefonu VHF znajduje się na maszcie o wysokości 100 metrów to zasięg stacji wynosi:",
  "options": [
   "10 km",
   "40 km",
   "100 km"
  ],
  "correct": 1,
  "whyPl": "Ze wzoru d = 4·√h zasięg dla anteny na wysokości 100 m wynosi około 40 km.",
  "confidence": "sure"
 },
 {
  "id": "src-2-144",
  "part": 2,
  "q": "Jeżeli antena nadajnika radiotelefonu VHF znajduje się na maszcie o wysokości 64 metrów to zasięg stacji wynosi:",
  "options": [
   "16 km",
   "32 km",
   "64 km"
  ],
  "correct": 1,
  "whyPl": "Dla masztu 64 m zasięg to 4·√64, czyli około 32 km.",
  "confidence": "sure"
 },
 {
  "id": "src-2-145",
  "part": 2,
  "q": "Jeżeli antena nadajnika radiotelefonu VHF znajduje się na maszcie o wysokości 100 metrów, zaś antena odbiornika usytuowana jest na wysokości 25 m to zasięg odbioru wynosi:",
  "options": [
   "30 km",
   "60 km",
   "90 km"
  ],
  "correct": 1,
  "whyPl": "Zasięg to 4·(√100 + √25), czyli 4·(10+5) = 60 km.",
  "confidence": "sure"
 },
 {
  "id": "src-2-146",
  "part": 2,
  "q": "W statkowych radiotelefonach VHF stosowane są:",
  "options": [
   "pionowe dipole o długości 0,25λ",
   "anteny w postaci pionowej linki o długości kilku metrów",
   "anteny typu Yagi"
  ],
  "correct": 0,
  "whyPl": "W statkowych radiotelefonach VHF stosuje się pionowe anteny ćwierćfalowe o długości 0,25λ.",
  "confidence": "sure"
 },
 {
  "id": "src-2-147",
  "part": 2,
  "q": "Antenę radiotelefonu VHF należy zamontować:",
  "options": [
   "możliwie najbliżej radiotelefonu",
   "w miejscu osłoniętym od wiatru i wody",
   "możliwie najwyżej z dala od innych anten"
  ],
  "correct": 2,
  "whyPl": "Antenę VHF montuje się możliwie najwyżej i z dala od innych anten, aby maksymalizować zasięg i unikać zakłóceń.",
  "confidence": "sure"
 },
 {
  "id": "src-2-148",
  "part": 2,
  "q": "Zbyt bliskie ustawienie anteny radiotelefonu VHF w pobliżu metalowych konstrukcji może spowodować:",
  "options": [
   "zmianę charakterystyki promieniowania anteny",
   "uszkodzenie anteny",
   "zmianę polaryzacji promieniowanej fali"
  ],
  "correct": 0,
  "whyPl": "Metalowe konstrukcje w pobliżu anteny zniekształcają jej charakterystykę promieniowania i tworzą strefy cienia.",
  "confidence": "sure"
 },
 {
  "id": "src-2-149",
  "part": 2,
  "q": "W odbiornikach NAVTEX są stosowane:",
  "options": [
   "2-4 metrowe anteny prętowe (pionowe)",
   "anteny linkowe typu „Γ” lub „Τ”",
   "anteny w postaci kilku lub kilkunastometrowego masztu"
  ],
  "correct": 0,
  "whyPl": "Odbiorniki NAVTEX wykorzystują pionowe anteny prętowe o długości 2-4 m.",
  "confidence": "sure"
 },
 {
  "id": "src-2-150",
  "part": 2,
  "q": "Dookólną charakterystykę promieniowania (w płaszczyźnie poziomej) mają anteny:",
  "options": [
   "prętowe (pionowe)",
   "linkowe typu „Γ” lub „Τ”",
   "typu Yagi"
  ],
  "correct": 0,
  "whyPl": "Pionowe anteny prętowe promieniują dookólnie w płaszczyźnie poziomej.",
  "confidence": "sure"
 }
];
