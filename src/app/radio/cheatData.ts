// ============================================================================
// Crib data for the SRC / VHF-DSC exam.
//
// One source of truth for both the on-site reading version (/radio, sections 5
// and 6) and the printable sheet (/radio/sciaga). Facts verified against the
// UKE exam materials (materialy_do_testu_src.pdf), ITU-R M.1371 / IMO SMCP and
// the ICOM IC-M330GE / IC-M323 manuals.
//
// PL is the primary language of this section (the exam is Polish); RU is the
// explanation language for the RU site version. Per the repo typography rule
// the PL text is ASCII-only.
// ============================================================================

export type Pair = readonly [string, string];
export type Row3 = readonly [string, string, string];

/** ICAO / NATO spelling alphabet - spell names, call signs and MMSI with it. */
export const PHONETIC: Pair[] = [
  ['A', 'Alfa'], ['B', 'Bravo'], ['C', 'Charlie'], ['D', 'Delta'], ['E', 'Echo'], ['F', 'Foxtrot'],
  ['G', 'Golf'], ['H', 'Hotel'], ['I', 'India'], ['J', 'Juliett'], ['K', 'Kilo'], ['L', 'Lima'],
  ['M', 'Mike'], ['N', 'November'], ['O', 'Oscar'], ['P', 'Papa'], ['Q', 'Quebec'], ['R', 'Romeo'],
  ['S', 'Sierra'], ['T', 'Tango'], ['U', 'Uniform'], ['V', 'Victor'], ['W', 'Whiskey'], ['X', 'X-ray'],
  ['Y', 'Yankee'], ['Z', 'Zulu'],
];

/** Digits are spoken one by one; the maritime forms come from ITU-R M.1171. */
export const DIGITS: Pair[] = [
  ['0', 'Nadazero'], ['1', 'Unaone'], ['2', 'Bissotwo'], ['3', 'Terrathree'], ['4', 'Kartefour'],
  ['5', 'Pantafive'], ['6', 'Soxisix'], ['7', 'Setteseven'], ['8', 'Oktoeight'], ['9', 'Novenine'],
];

/** [proword, PL meaning, RU meaning] */
export const PROWORDS: Row3[] = [
  ['OVER', 'skonczylem, czekam na odpowiedz', 'приём, жду ответа'],
  ['OUT', 'koniec lacznosci, bez odpowiedzi', 'конец связи, ответа не жду'],
  ['ROGER / RECEIVED', 'zrozumialem', 'принял, понял'],
  ['AFFIRMATIVE / NEGATIVE', 'tak / nie', 'да / нет'],
  ['SAY AGAIN', 'powtorz', 'повторите'],
  ['I SAY AGAIN', 'powtarzam', 'повторяю'],
  ['STATION CALLING', 'stacja wywolujaca, podaj sie', 'вызывающая станция, назовитесь'],
  ['RADIO CHECK', 'prosba o sprawdzenie slyszalnosci', 'проверка связи/слышимости'],
  ['SEELONCE MAYDAY', 'cisza radiowa - nadaje tylko akcja ratownicza', 'радиомолчание, работает только спасательная операция'],
  ['SEELONCE FEENEE', 'koniec ciszy, ruch normalny', 'молчание отменяется, связь свободна'],
];

/** [channel, PL what for, RU what for] */
export const CHANNELS: Row3[] = [
  ['16', 'wywolawczy i alarmowy - ciagly nasluch', 'вызов и бедствие, постоянное прослушивание'],
  ['70', 'DSC - tylko cyfrowo, nigdy glosem', 'DSC, только цифра, голосом нельзя'],
  ['06 / 08 / 72 / 77', 'robocze statek-statek', 'рабочие судно-судно'],
  ['13', 'bezpieczenstwo ruchu (mostek-mostek)', 'безопасность движения, мостик-мостик'],
  ['09 / 12 / 71', 'marina, port, sluza - wg lokalnej informacji', 'марина, порт, шлюз, по местной информации'],
  ['67 / 74', 'wg lokalnych ustalen (np. sluzby brzegowe)', 'по местным правилам (береговые службы)'],
];

/** The MAYDAY voice call, exactly in the order the examiner expects. */
export const MAYDAY_TEMPLATE = `MAYDAY  MAYDAY  MAYDAY
THIS IS  <nazwa x3>  <znak wywolawczy / MMSI>
MAYDAY  <nazwa>
POSITION  <wspolrzedne lub namiar + odleglosc>
<rodzaj niebezpieczenstwa>
<potrzebna pomoc>
<liczba osob na pokladzie, inne info>
OVER`;

export const PANPAN_TEMPLATE = `PAN-PAN  PAN-PAN  PAN-PAN
ALL STATIONS  ALL STATIONS  ALL STATIONS
THIS IS  <nazwa x3>  <MMSI>
POSITION  <wspolrzedne>
<sytuacja i prosba>
OVER`;

export const SECURITE_TEMPLATE = `SECURITE  SECURITE  SECURITE
ALL STATIONS  ALL STATIONS  ALL STATIONS
THIS IS  <nazwa x3>
<ostrzezenie: co, gdzie>
LISTEN CHANNEL <kanal roboczy>
OUT`;

export const CANCEL_TEMPLATE = `ALL STATIONS  ALL STATIONS  ALL STATIONS
THIS IS  <nazwa x3>  <MMSI>
CANCEL MY DISTRESS ALERT OF <data, czas UTC>
OUT`;

/** DSC DISTRESS on the ICOM, step by step (both exam models behave this way). */
export const DSC_STEPS: Row3[] = [
  ['1', 'Podnies oslone [DISTRESS]', 'Подними крышку кнопки DISTRESS'],
  ['2', 'Wybierz rodzaj (nature): Fire, Sinking, MOB...', 'Выбери характер бедствия'],
  ['3', 'Przytrzymaj [DISTRESS] 3-5 s (odliczanie)', 'Держи DISTRESS 3-5 сек, идёт отсчёт'],
  ['4', 'Radio nadaje alert na kanale 70 i przechodzi na 16', 'Рация шлёт алерт на 70 и уходит на 16'],
  ['5', 'Czekaj na potwierdzenie (DSC ACK) i nadaj MAYDAY glosem', 'Жди подтверждения и передай MAYDAY голосом'],
  ['6', '[ALARM OFF] wylacza dzwiek, ale NIE odwoluje alertu', 'ALARM OFF глушит звук, но НЕ отменяет алерт'],
];

/** The mistakes the simulator's detectors watch for - the same ones fail people
 *  at the UKE practical. [PL, RU] */
export const MISTAKES: Pair[] = [
  ['Nadanie glosem MAYDAY bez wczesniejszego alertu DSC', 'Голосовой MAYDAY без цифрового алерта DSC'],
  ['[DISTRESS] uzyty do PAN-PAN lub SECURITE', 'Красная кнопка нажата для PAN-PAN или SECURITE'],
  ['Wywolanie rutynowe na kanale 16', 'Рутинный вызов на 16 канале'],
  ['Falszywy alert bez odwolania (glosem i cyfrowo)', 'Ложный алерт без отмены голосом и цифрой'],
  ['Nature "Undesignated" przy znanej przyczynie', 'Undesignated, когда причина известна'],
  ['Pelna moc 25 W w marinie zamiast 1 W', 'Полная мощность 25 Вт в марине вместо 1 Вт'],
  ['Wylaczenie radia po alercie', 'Выключение рации после алерта'],
];

/** Exam facts (UKE). [PL, RU] */
export const EXAM_FACTS: Pair[] = [
  ['Egzamin w UKE, od 15 lat, swiadectwo bezterminowe, oplata 175 zl', 'Экзамен в UKE, с 15 лет, свидетельство бессрочное, 175 zl'],
  ['Teoria: 3 dzialy, punktacja 0-5 pkt za pytanie, min. 60% w kazdym dziale (kazdy dzial musi byc zaliczony)', 'Теория: 3 раздела, оценка 0-5 баллов за вопрос, минимум 60% в каждом разделе (каждый раздел зачитывается отдельно)'],
  ['Praktyka na radiu ICOM: min. 60% punktow', 'Практика на рации ICOM: минимум 60% баллов'],
  ['Zapis min. 14 dni przed sesja, oplata przed zapisem', 'Запись минимум за 14 дней, оплата до записи'],
];
