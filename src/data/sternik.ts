// ============================================================================
// Sternik motorowodny (PL) - exam prep data: question bank + categories.
//
// Content language policy (deliberate, differs from UI copy):
// - Questions and options are in POLISH WITH DIACRITICS - this is study
//   material for a Polish state exam and must read exactly like the real
//   test. The ASCII-only rule in CLAUDE.md applies to UI chrome strings,
//   which live in the pages and go through tp() as usual.
// - Explanations (whyRu) are in Russian - the learning aid for RU speakers.
// - No em/en dashes anywhere (project-wide rule) - plain hyphens only.
//
// Sources: PZMWiNW question base topics for sternik motorowodny,
// rozporzadzenie MSiT z 9.04.2013 w sprawie uprawiania turystyki wodnej,
// ustawa o rejestracji jachtow (2020), przepisy zeglugowe na srodladowych
// drogach wodnych, COLREG/IALA region A.
// ============================================================================

export type SternikCatId =
  | 'przepisy'
  | 'sygnaly'
  | 'znaki'
  | 'budowa'
  | 'silniki'
  | 'manewry'
  | 'locja'
  | 'meteo'
  | 'ratownictwo'
  | 'srodowisko'
  | 'prawo';

export interface SternikCategory {
  id: SternikCatId;
  /** Polish name - shown as the primary label (exam language). */
  pl: string;
  /** Russian name - shown as the secondary label. */
  ru: string;
  /** CSS color var name from globals.css, e.g. 'var(--cat-cyan)'. */
  color: string;
  /** Emoji icon for cards/lists. */
  icon: string;
}

export const STERNIK_CATEGORIES: SternikCategory[] = [
  { id: 'przepisy', pl: 'Przepisy i prawo drogi', ru: 'Правила расхождения', color: 'var(--cat-cyan)', icon: '🚦' },
  { id: 'sygnaly', pl: 'Sygnały dźwiękowe i światła', ru: 'Сигналы и огни', color: 'var(--cat-amber)', icon: '📢' },
  { id: 'znaki', pl: 'Znaki nawigacyjne', ru: 'Навигационные знаки', color: 'var(--cat-green)', icon: '🚩' },
  { id: 'budowa', pl: 'Budowa jachtu', ru: 'Устройство лодки', color: 'var(--cat-blue)', icon: '🛥️' },
  { id: 'silniki', pl: 'Silniki', ru: 'Двигатели', color: 'var(--cat-orange)', icon: '⚙️' },
  { id: 'manewry', pl: 'Manewrowanie i cumowanie', ru: 'Манёвры и швартовка', color: 'var(--cat-teal)', icon: '🧭' },
  { id: 'locja', pl: 'Locja i nawigacja', ru: 'Лоция и навигация', color: 'var(--cat-purple)', icon: '🗺️' },
  { id: 'meteo', pl: 'Meteorologia', ru: 'Метеорология', color: 'var(--cat-cyan)', icon: '🌤️' },
  { id: 'ratownictwo', pl: 'Ratownictwo i pierwsza pomoc', ru: 'Спасание и первая помощь', color: 'var(--cat-red)', icon: '🛟' },
  { id: 'srodowisko', pl: 'Ochrona środowiska', ru: 'Экология', color: 'var(--cat-green)', icon: '🌿' },
  { id: 'prawo', pl: 'Patent i przepisy prawne', ru: 'Патент и закон', color: 'var(--cat-amber)', icon: '📜' },
];

export const STERNIK_CATEGORY_BY_ID: Record<SternikCatId, SternikCategory> = Object.fromEntries(
  STERNIK_CATEGORIES.map((c) => [c.id, c]),
) as Record<SternikCatId, SternikCategory>;

/** Ids of small figures rendered above a question (see QuestionFigure.tsx). */
export type SternikFigureId =
  | 'cardinal-n' | 'cardinal-e' | 'cardinal-s' | 'cardinal-w'
  | 'lateral-red' | 'lateral-green'
  | 'isolated-danger' | 'safe-water'
  | 'flag-a';

export interface SternikQuestion {
  /** Stable id - localStorage stats key. Never renumber existing ids. */
  id: string;
  cat: SternikCatId;
  /** Question text, Polish (exam language). */
  q: string;
  /**
   * 3 or 4 options. The circulating PZMWiNW-derived base (337 questions) is
   * a/b/c/d; freshly authored questions are A/B/C. The engine handles both.
   */
  options: string[];
  /** Index of the correct option BEFORE shuffling. */
  correct: number;
  /** Russian explanation shown after answering. */
  whyRu: string;
  /** Polish explanation shown after answering (exam language), above whyRu. */
  whyPl?: string;
  /** Provenance, e.g. 'baza CZ #12' for questions from the open bank PDF. */
  source?: string;
  /** Optional figure shown above the question (znaki recognition etc). */
  figure?: SternikFigureId;
}

/** Real exam format: rozporzadzenie MSiT z 9.04.2013 (Dz.U. 2013 poz. 460). */
export const STERNIK_EXAM = {
  questions: 75,
  minutes: 90,
  passCorrect: 65,
  passPct: Math.round((65 / 75) * 100), // 87
};

// ---------------------------------------------------------------------------
// Question bank. Prefix per category, two-digit counter, ids are stable.
// ---------------------------------------------------------------------------

export const STERNIK_BANK: SternikQuestion[] = [
  // ===== PRZEPISY I PRAWO DROGI ============================================
  {
    id: 'przepisy-01', cat: 'przepisy',
    q: 'Za bezpieczeństwo żeglugi i osób na pokładzie odpowiada:',
    options: ['Armator', 'Kapitan lub kierownik statku', 'Bosman portu'],
    correct: 1,
    whyRu: 'За безопасность плавания и людей на борту отвечает капитан (кировник судна), а не судовладелец и не портовые службы.',
    whyPl: "Za bezpieczeństwo żeglugi i osób na pokładzie odpowiada kapitan (kierownik statku), a nie armator ani służby portowe.",
  },
  {
    id: 'przepisy-02', cat: 'przepisy',
    q: 'Kto ma pierwszeństwo przy wejściu i wyjściu z portu?',
    options: ['Jednostka wchodząca do portu', 'Jednostka wychodząca z portu', 'Jednostka szybsza'],
    correct: 1,
    whyRu: 'Выходящий из порта имеет приоритет над входящим. Входящий ждет на подходе, не блокируя выход.',
    whyPl: "Pierwszeństwo ma jednostka wychodząca z portu. Wchodząca czeka na podejściu i nie blokuje wyjścia.",
  },
  {
    id: 'przepisy-03', cat: 'przepisy',
    q: 'Który jacht ma pierwszeństwo podczas wyprzedzania?',
    options: ['Wyprzedzany', 'Większy', 'Wyprzedzający'],
    correct: 0,
    whyRu: 'Приоритет у обгоняемого. Обгоняющий обязан держаться в стороне до полного завершения обгона.',
    whyPl: "Pierwszeństwo ma jednostka wyprzedzana. Wyprzedzający musi trzymać się z dala aż do pełnego zakończenia manewru.",
  },
  {
    id: 'przepisy-04', cat: 'przepisy',
    q: 'Dwa jachty motorowe na kursach przecinających się - pierwszeństwo ma:',
    options: ['Większy', 'Ten, który ma drugą jednostkę po lewej burcie', 'Szybszy'],
    correct: 1,
    whyRu: 'Уступает тот, у кого встречный СПРАВА («правило правой руки»). Значит приоритет у того, кто видит другого слева.',
    whyPl: "Ustępuje ten, kto widzi drugą jednostkę z PRAWEJ burty (zasada prawej ręki). Pierwszeństwo ma więc ten, który ma drugą jednostkę po lewej burcie.",
  },
  {
    id: 'przepisy-05', cat: 'przepisy',
    q: 'Małe statki o napędzie mechanicznym ustępują:',
    options: ['Statkom żaglowym, wiosłowym i nieodpowiadającym za swoje ruchy', 'Nikomu', 'Tylko większym statkom motorowym'],
    correct: 0,
    whyRu: 'Моторная лодка уступает парусным, вёсельным, рыболовным за ловом и неманевроспособным судам. Кто маневреннее, тот уступает.',
    whyPl: "Motorówka ustępuje statkom żaglowym, wiosłowym, zajętym połowem i nieodpowiadającym za swoje ruchy. Kto bardziej zwrotny, ten ustępuje.",
  },
  {
    id: 'przepisy-06', cat: 'przepisy',
    q: 'Windsurfing i motorówka na kursach kolizyjnych - pierwszeństwo ma:',
    options: ['Szybszy', 'Motorówka', 'Windsurfing'],
    correct: 2,
    whyRu: 'Виндсёрфер юридически - парусное судно, поэтому моторная лодка уступает ему.',
    whyPl: "Windsurfing jest w świetle przepisów statkiem żaglowym, dlatego motorówka musi mu ustąpić.",
  },
  {
    id: 'przepisy-07', cat: 'przepisy',
    q: 'Jacht płynący jednocześnie na żaglach i na silniku jest traktowany jako:',
    options: ['Statek żaglowy', 'Statek o napędzie mechanicznym', 'Statek uprzywilejowany'],
    correct: 1,
    whyRu: 'Если работает мотор - судно считается моторным, даже с поднятыми парусами.',
    whyPl: "Jeżeli pracuje silnik, jednostkę traktuje się jak statek o napędzie mechanicznym, nawet z postawionymi żaglami.",
  },
  {
    id: 'przepisy-08', cat: 'przepisy',
    q: 'Dwa statki motorowe idą wprost na siebie (kurs kolizyjny). Powinny:',
    options: ['Zmienić kurs w prawo i minąć się lewymi burtami', 'Zmienić kurs w lewo i minąć się prawymi burtami', 'Zatrzymać się i czekać'],
    correct: 0,
    whyRu: 'На встречных курсах оба судна отворачивают вправо и расходятся левыми бортами.',
    whyPl: "Na kursach przeciwnych oba statki zmieniają kurs w prawo i mijają się lewymi burtami.",
  },
  {
    id: 'przepisy-09', cat: 'przepisy',
    q: 'Jacht żaglowy i jacht motorowy - kto ustępuje?',
    options: ['Motorowy ma pierwszeństwo', 'Żaglowy ma pierwszeństwo', 'Są równorzędne'],
    correct: 1,
    whyRu: 'Парусник имеет приоритет над моторным судном (кроме случаев обгона: обгоняющий парусник уступает).',
    whyPl: "Jacht żaglowy ma pierwszeństwo przed motorowym (wyjątek: wyprzedzanie, wtedy wyprzedzający żaglowy ustępuje).",
  },
  {
    id: 'przepisy-10', cat: 'przepisy',
    q: 'Na rzece pierwszeństwo ma jednostka:',
    options: ['Płynąca z prądem (w dół rzeki)', 'Płynąca pod prąd', 'Większa'],
    correct: 0,
    whyRu: 'Идущему вниз по течению труднее тормозить и маневрировать - у него приоритет.',
    whyPl: "Jednostce płynącej z prądem trudniej hamować i manewrować, dlatego to ona ma pierwszeństwo.",
  },
  {
    id: 'przepisy-11', cat: 'przepisy',
    q: 'Mały jacht motorowy spotyka na szlaku żeglownym duży statek towarowy (barkę). Kto ustępuje?',
    options: ['Barka - jest wolniejsza', 'Jacht motorowy - małe statki ustępują dużym', 'Ten, kto ma drugiego z prawej'],
    correct: 1,
    whyRu: 'На внутренних водах малые суда (до 20 м) уступают большим судам коммерческого флота - барже трудно маневрировать на фарватере.',
    whyPl: "Na wodach śródlądowych małe statki (do 20 m) ustępują dużym jednostkom zawodowym, barce trudno manewrować na szlaku żeglownym.",
  },
  {
    id: 'przepisy-12', cat: 'przepisy',
    q: 'Zbliżasz się do promu linowego przecinającego rzekę. Co robisz?',
    options: ['Przecinasz trasę promu przed jego dziobem', 'Zwalniasz i przepuszczasz prom, uważając na linę', 'Dajesz sygnał i płyniesz bez zmian'],
    correct: 1,
    whyRu: 'Канатный паром связан тросом, который может быть под поверхностью воды. Снижай скорость, пропусти паром и никогда не проходи над его тросом.',
    whyPl: "Prom linowy jest połączony liną, która może biec tuż pod powierzchnią wody. Zwolnij, przepuść prom i nigdy nie przechodź nad jego liną.",
  },
  {
    id: 'przepisy-13', cat: 'przepisy',
    q: 'Wyprzedzanie innej jednostki na szlaku żeglownym jest dozwolone:',
    options: ['Tylko gdy szlak jest wystarczająco szeroki i manewr jest bezpieczny', 'Zawsze z lewej strony', 'Wyłącznie za zgodą kapitanatu'],
    correct: 0,
    whyRu: 'Обгон разрешен, только если фарватер достаточно широк и манёвр безопасен. Обгоняющий не имеет приоритета.',
    whyPl: "Wyprzedzać wolno tylko wtedy, gdy szlak jest wystarczająco szeroki i manewr jest bezpieczny. Wyprzedzający nie ma pierwszeństwa.",
  },
  {
    id: 'przepisy-14', cat: 'przepisy',
    q: 'Statek oznaczony flagą A (Alfa) kodu MKS sygnalizuje:',
    options: ['Prace podwodne / nurka pod wodą - trzymaj się z dala i płyń wolno', 'Awarie silnika', 'Transport materiałów niebezpiecznych'],
    correct: 0,
    whyRu: 'Флаг «А» (Альфа, бело-синий с вырезом) = под водой водолаз. Обходи широко и на малой скорости.',
    whyPl: "Flaga A (Alfa, biało-niebieska z wcięciem) oznacza nurka pod wodą. Omijaj szerokim łukiem i z małą prędkością.",
  },

  {
    id: 'przepisy-15', cat: 'przepisy',
    q: 'Statek "w drodze" to statek, ktory:',
    options: ['Nie stoi na kotwicy, nie jest przycumowany do brzegu i nie stoi na mieliznie', 'Plynie z predkoscia powyzej 4 wezlow', 'Ma wlaczony silnik'],
    correct: 0,
    whyRu: '«В пути» (w drodze) = не на якоре, не пришвартован, не на мели. Судно может стоять без хода и всё равно быть «в пути».',
    whyPl: "Statek w drodze to taki, który nie stoi na kotwicy, nie jest przycumowany i nie stoi na mieliźnie. Może stać bez ruchu i nadal być w drodze.",
  },

  // ===== SYGNALY DZWIEKOWE I SWIATLA =======================================
  {
    id: 'sygnaly-01', cat: 'sygnaly',
    q: 'Kiedy światła nawigacyjne powinny być zapalone?',
    options: ['Od zachodu do wschodu słońca oraz przy ograniczonej widzialności', 'Tylko od zachodu do wschodu słońca', 'Od godziny 18:00 do 6:00'],
    correct: 0,
    whyRu: 'Огни несут от заката до рассвета И при ограниченной видимости (туман, ливень) - в любое время суток.',
    whyPl: "Światła nawigacyjne nosi się od zachodu do wschodu słońca ORAZ przy ograniczonej widzialności (mgła, ulewa), o każdej porze doby.",
  },
  {
    id: 'sygnaly-02', cat: 'sygnaly',
    q: 'Długi dźwięk trwa:',
    options: ['4-6 sekund', '1-2 sekundy', '10-12 sekund'],
    correct: 0,
    whyRu: 'В тесте верный ответ 4-6 секунд (морское правило COLREG). На внутренних водах длинный сигнал - около 4 секунд.',
    whyPl: "W teście poprawna odpowiedź to 4-6 sekund (reguła morska COLREG). Na wodach śródlądowych długi dźwięk trwa około 4 sekund.",
  },
  {
    id: 'sygnaly-03', cat: 'sygnaly',
    q: 'Krótki dźwięk trwa:',
    options: ['10-12 sekund', 'około 1 sekundy', '4-6 sekund'],
    correct: 1,
    whyRu: 'Короткий сигнал - около 1 секунды.',
    whyPl: "Krótki dźwięk trwa około 1 sekundy.",
  },
  {
    id: 'sygnaly-04', cat: 'sygnaly',
    q: 'Sygnał "niebezpieczeństwo zderzenia / nie rozumiem twoich zamiarów" to:',
    options: ['Seria (co najmniej 5) krótkich dźwięków', 'Seria długich dźwięków', 'Dwa krótkie dźwięki'],
    correct: 0,
    whyRu: 'Серия из 5 и более коротких сигналов = «опасность столкновения / не понимаю твоих намерений». На внутренних водах формально это серия очень коротких звуков (минимум 6).',
    whyPl: "Seria co najmniej 5 krótkich dźwięków oznacza niebezpieczeństwo zderzenia lub brak zrozumienia zamiarów. Na śródlądziu formalnie jest to seria bardzo krótkich dźwięków (minimum 6).",
  },
  {
    id: 'sygnaly-05', cat: 'sygnaly',
    q: 'Jeden krótki dźwięk oznacza:',
    options: ['Zmieniam kurs w prawo', 'Zmieniam kurs w lewo', 'Zatrzymuję się'],
    correct: 0,
    whyRu: '1 короткий = поворачиваю вправо, 2 коротких = влево, 3 коротких = задний ход.',
    whyPl: "1 krótki = zmieniam kurs w prawo, 2 krótkie = w lewo, 3 krótkie = wstecz.",
  },
  {
    id: 'sygnaly-06', cat: 'sygnaly',
    q: 'Dwa krótkie dźwięki oznaczają:',
    options: ['Zmieniam kurs w prawo', 'Zmieniam kurs w lewo', 'Pracuję maszyną wstecz'],
    correct: 1,
    whyRu: '2 коротких = поворачиваю влево. Запомни: 1 - вправо, 2 - влево, 3 - задний ход.',
    whyPl: "2 krótkie = zmieniam kurs w lewo. Zapamiętaj: 1 - w prawo, 2 - w lewo, 3 - wstecz.",
  },
  {
    id: 'sygnaly-07', cat: 'sygnaly',
    q: 'Trzy krótkie dźwięki oznaczają:',
    options: ['Wzywam pomocy', 'Moje urządzenie napędowe pracuje wstecz', 'Zmieniam kurs w lewo'],
    correct: 1,
    whyRu: '3 коротких = «мои машины работают на задний ход».',
    whyPl: "3 krótkie dźwięki = moje urządzenie napędowe pracuje wstecz.",
  },
  {
    id: 'sygnaly-08', cat: 'sygnaly',
    q: 'Sektor świecenia światła burtowego wynosi:',
    options: ['112,5 stopnia', '90 stopni', '135 stopni'],
    correct: 0,
    whyRu: 'Каждый бортовой огонь светит в секторе 112,5 градуса (от направления прямо по носу до 22,5 градуса позади траверза).',
    whyPl: "Każde światło burtowe świeci w sektorze 112,5 stopnia (od kierunku prosto w dziób do 22,5 stopnia za trawers).",
  },
  {
    id: 'sygnaly-09', cat: 'sygnaly',
    q: 'Sektor świecenia światła masztowego (topowego) wynosi:',
    options: ['225 stopni', '215 stopni', '235 stopni'],
    correct: 0,
    whyRu: 'Мачтовый (топовый) огонь - 225 градусов = сумма секторов двух бортовых (2 x 112,5).',
    whyPl: "Światło masztowe (topowe) ma sektor 225 stopni, czyli sumę sektorów obu świateł burtowych (2 x 112,5).",
  },
  {
    id: 'sygnaly-10', cat: 'sygnaly',
    q: 'Sektor świecenia światła rufowego wynosi:',
    options: ['145 stopni', '135 stopni', '180 stopni'],
    correct: 1,
    whyRu: 'Кормовой огонь - 135 градусов. Проверка: 112,5 + 112,5 + 135 = 360.',
    whyPl: "Światło rufowe ma sektor 135 stopni. Sprawdzenie: 112,5 + 112,5 + 135 = 360.",
  },
  {
    id: 'sygnaly-11', cat: 'sygnaly',
    q: 'Jakiego koloru jest prawe światło burtowe (sterburta)?',
    options: ['Czerwone', 'Zielone', 'Białe'],
    correct: 1,
    whyRu: 'Правый борт - зелёный огонь, левый борт - красный.',
    whyPl: "Prawa burta to światło zielone, lewa burta - czerwone.",
  },
  {
    id: 'sygnaly-12', cat: 'sygnaly',
    q: 'Jakiego koloru jest lewe światło burtowe (bakburta)?',
    options: ['Czerwone', 'Zielone', 'Białe'],
    correct: 0,
    whyRu: 'Левый борт - красный огонь. Мнемоника: «красное портвейн-левое» (port = левый борт).',
    whyPl: "Lewa burta (bakburta) to światło czerwone. Skojarzenie: port (ang. lewa burta) i czerwone wino porto.",
  },
  {
    id: 'sygnaly-13', cat: 'sygnaly',
    q: 'Statek na kotwicy w nocy pokazuje:',
    options: ['Białe światło widoczne dookoła widnokręgu', 'Czerwone światło na rufie', 'Światła burtowe'],
    correct: 0,
    whyRu: 'На якоре ночью - белый круговой (якорный) огонь 360 градусов. Ходовые огни на якоре не несут.',
    whyPl: "Statek na kotwicy pokazuje w nocy białe światło widoczne dookoła widnokręgu (360 stopni). Świateł drogi na kotwicy się nie nosi.",
  },
  {
    id: 'sygnaly-14', cat: 'sygnaly',
    q: 'Mały statek o napędzie mechanicznym (do 7 m) płynący wolno może pokazywać:',
    options: ['Jedno białe światło widoczne dookoła widnokręgu', 'Tylko światła burtowe', 'Dwa czerwone światła'],
    correct: 0,
    whyRu: 'Маленькое судно до 7 м с небольшой скоростью может нести один белый круговой огонь (если нет возможности нести полный комплект).',
    whyPl: "Mały statek do 7 m płynący wolno może pokazywać jedno białe światło widoczne dookoła widnokręgu, jeśli nie może nieść pełnego zestawu świateł.",
  },
  {
    id: 'sygnaly-15', cat: 'sygnaly',
    q: 'Dźwiękowy sygnał wzywania pomocy to:',
    options: ['Powtarzające się długie dźwięki lub sygnał SOS', 'Dwa krótkie dźwięki co minutę', 'Jeden krótki dźwięk'],
    correct: 0,
    whyRu: 'Сигнал бедствия: повторяющиеся длинные гудки, непрерывный звук или SOS (три коротких, три длинных, три коротких).',
    whyPl: "Sygnał wzywania pomocy to powtarzające się długie dźwięki, dźwięk ciągły lub SOS (trzy krótkie, trzy długie, trzy krótkie).",
  },

  {
    id: 'sygnaly-16', cat: 'sygnaly',
    q: 'Cztery krótkie dźwięki na śródlądowych drogach wodnych oznaczają:',
    options: ['Nie mogę manewrować', 'Zmieniam kurs w prawo', 'Wzywam pomocy'],
    correct: 0,
    whyRu: '4 коротких = «не могу маневрировать» (внутренние воды). Держись от такого судна подальше.',
    whyPl: "4 krótkie dźwięki na śródlądziu oznaczają: nie mogę manewrować. Trzymaj się od takiej jednostki z daleka.",
  },
  {
    id: 'sygnaly-17', cat: 'sygnaly',
    q: 'Dwa długie i jeden krótki dźwięk oznaczają:',
    options: ['Zamierzam wyprzedzić po twojej prawej burcie', 'Zamierzam wyprzedzić po twojej lewej burcie', 'Zakaz wyprzedzania'],
    correct: 0,
    whyRu: 'Сигналы обгона: 2 длинных + 1 короткий = обгоняю по твоему ПРАВОМУ борту; 2 длинных + 2 коротких = по левому.',
    whyPl: "Sygnały wyprzedzania: 2 długie + 1 krótki = wyprzedzam po twojej PRAWEJ burcie, 2 długie + 2 krótkie = po lewej.",
  },
  {
    id: 'sygnaly-18', cat: 'sygnaly',
    q: 'Sygnał "zawracam w prawo" to:',
    options: ['Jeden długi i jeden krótki dźwięk', 'Jeden długi i dwa krótkie dźwięki', 'Trzy krótkie dźwięki'],
    correct: 0,
    whyRu: 'Разворот: 1 длинный + 1 короткий = разворачиваюсь вправо; 1 длинный + 2 коротких = влево.',
    whyPl: "Zawracanie: 1 długi + 1 krótki = zawracam w prawo, 1 długi + 2 krótkie = w lewo.",
  },
  {
    id: 'sygnaly-19', cat: 'sygnaly',
    q: 'Seria podwójnych krótkich dźwięków na śródlądziu oznacza:',
    options: ['Człowiek za burtą', 'Zmiana kursu', 'Wchodzę do portu'],
    correct: 0,
    whyRu: 'Серия сдвоенных коротких сигналов = «человек за бортом». Вызов помощи - повторяющиеся длинные или удары в колокол.',
    whyPl: "Seria podwójnych krótkich dźwięków = człowiek za burtą. Wzywanie pomocy to powtarzające się długie dźwięki lub uderzenia w dzwon.",
  },

  // ===== ZNAKI NAWIGACYJNE =================================================
  {
    id: 'znaki-01', cat: 'znaki',
    q: 'IALA to:',
    options: ['Międzynarodowy system oznakowania nawigacyjnego', 'System ratownictwa morskiego', 'System łączności portowej'],
    correct: 0,
    whyRu: 'IALA - международная система навигационного ограждения (буи, знаки). Польша - регион A.',
    whyPl: "IALA to międzynarodowy system oznakowania nawigacyjnego (pławy, znaki). Polska leży w regionie A.",
  },
  {
    id: 'znaki-02', cat: 'znaki',
    q: 'W systemie IALA region A znak lewej strony toru wodnego (wchodząc od morza) to:',
    options: ['Czerwony znak w kształcie walca', 'Zielony znak w kształcie stożka', 'Żółty znak kulisty'],
    correct: 0,
    whyRu: 'Регион A (Европа): при входе с моря красный цилиндр («банка») - левая кромка, зелёный конус - правая.',
    whyPl: "Region A (Europa): wchodząc od morza, czerwony walec oznacza lewą stronę toru wodnego, a zielony stożek prawą.",
  },
  {
    id: 'znaki-03', cat: 'znaki',
    q: 'W systemie IALA region A znak prawej strony toru wodnego (wchodząc od morza) to:',
    options: ['Czerwony walec', 'Zielony stożek', 'Czarno-żółty drążek'],
    correct: 1,
    whyRu: 'Зелёный конус - правая сторона фарватера при входе с моря (регион A). В США (регион B) - наоборот.',
    whyPl: "Zielony stożek to prawa strona toru wodnego przy wejściu od morza (region A). W USA (region B) jest odwrotnie.",
  },
  {
    id: 'znaki-04', cat: 'znaki',
    q: 'Znaki kardynalne mają kolory:',
    options: ['Czarno-żółte', 'Czerwono-białe', 'Zielono-czerwone'],
    correct: 0,
    whyRu: 'Кардинальные знаки - чёрно-жёлтые, с двумя чёрными конусами наверху (топовая фигура).',
    whyPl: "Znaki kardynalne są czarno-żółte, z topmarkiem z dwóch czarnych stożków.",
  },
  {
    id: 'znaki-05', cat: 'znaki',
    q: 'Znak kardynalny północny (N) ma topmark:',
    options: ['Dwa stożki wierzchołkami do góry', 'Dwa stożki wierzchołkami do dołu', 'Dwa stożki podstawami razem'],
    correct: 0,
    whyRu: 'N - оба конуса вершинами ВВЕРХ (север - «вверх» на карте). Обходить знак с северной стороны.',
    whyPl: "Znak północny (N) ma oba stożki wierzchołkami do góry (północ jest u góry mapy). Mijamy go od strony północnej.",
  },
  {
    id: 'znaki-06', cat: 'znaki',
    q: 'Znak kardynalny południowy (S) ma topmark:',
    options: ['Dwa stożki wierzchołkami do góry', 'Dwa stożki wierzchołkami do dołu', 'Dwa stożki wierzchołkami razem'],
    correct: 1,
    whyRu: 'S - оба конуса вершинами ВНИЗ. Обходить с южной стороны.',
    whyPl: "Znak południowy (S) ma oba stożki wierzchołkami do dołu. Mijamy go od strony południowej.",
  },
  {
    id: 'znaki-07', cat: 'znaki',
    q: 'Znak kardynalny wschodni (E) ma topmark:',
    options: ['Stożki podstawami razem ("jajko")', 'Stożki wierzchołkami razem ("kieliszek")', 'Oba stożki w dół'],
    correct: 0,
    whyRu: 'E - конусы основаниями вместе (силуэт «яйцо»). W - вершинами вместе («бокал», wine = W).',
    whyPl: "E: stożki podstawami razem, sylwetka przypomina jajko. W: wierzchołkami razem, kształt kieliszka (wine = W).",
  },
  {
    id: 'znaki-08', cat: 'znaki',
    q: 'Z której strony należy minąć znak kardynalny zachodni (W)?',
    options: ['Od strony wschodniej', 'Od strony zachodniej', 'Obojętnie'],
    correct: 1,
    whyRu: 'Кардинальный знак обходят со стороны его названия: W - с запада, N - с севера, и т.д. Безопасная вода со стороны названия.',
    whyPl: "Znak kardynalny mijamy od strony jego nazwy: W od zachodu, N od północy itd. Bezpieczna woda jest po stronie nazwy znaku.",
  },
  {
    id: 'znaki-09', cat: 'znaki',
    q: 'Światło znaku kardynalnego wschodniego (E) to:',
    options: ['3 błyski w grupie', '6 błysków + 1 długi', 'Błyski ciągłe'],
    correct: 0,
    whyRu: 'Мнемоника «часы»: E = 3 часа = 3 вспышки, S = 6 (+1 длинная), W = 9, N = 12 = непрерывные. Все белые.',
    whyPl: "Mnemonik zegarowy: E = godzina 3 = 3 błyski, S = 6 (+1 długi), W = 9, N = 12 = błyski ciągłe. Wszystkie światła są białe.",
  },
  {
    id: 'znaki-10', cat: 'znaki',
    q: 'Światło znaku kardynalnego północnego (N) to:',
    options: ['Ciągłe szybkie błyski (Q lub VQ)', '9 błysków w grupie', '2 błyski w grupie'],
    correct: 0,
    whyRu: 'N (12:00) - непрерывные быстрые белые проблески без пауз.',
    whyPl: "Znak północny (N, godzina 12) świeci ciągłymi szybkimi białymi błyskami bez przerw (Q lub VQ).",
  },
  {
    id: 'znaki-11', cat: 'znaki',
    q: 'Światło znaku kardynalnego południowego (S) to:',
    options: ['6 błysków + 1 długi błysk', '3 błyski', 'Światło stałe czerwone'],
    correct: 0,
    whyRu: 'S (6:00) - 6 вспышек + 1 длинная. Длинная добавлена, чтобы в тумане не спутать с W (9 вспышек).',
    whyPl: "Znak południowy (S, godzina 6) to 6 błysków + 1 długi błysk. Długi błysk dodano, by we mgle nie pomylić go z W (9 błysków).",
  },
  {
    id: 'znaki-12', cat: 'znaki',
    q: 'Znak odosobnionego niebezpieczeństwa (mielizna, wrak) to:',
    options: ['Czarno-czerwony słup z dwiema czarnymi kulami', 'Zielony stożek', 'Żółty krzyż'],
    correct: 0,
    whyRu: 'Знак отдельной опасности: чёрно-красные горизонтальные полосы, топовая фигура - две чёрные шары. Свет: белый Fl(2).',
    whyPl: "Znak odosobnionego niebezpieczeństwa: czarno-czerwone pasy poziome, topmark to dwie czarne kule. Światło: białe Fl(2).",
  },
  {
    id: 'znaki-13', cat: 'znaki',
    q: 'Znak bezpiecznej wody (środek toru) to:',
    options: ['Czerwono-białe pionowe pasy, topmark: czerwona kula', 'Czarno-żółty słup', 'Zielona tyczka ze stożkiem'],
    correct: 0,
    whyRu: 'Знак чистой воды: красно-белые вертикальные полосы, красный шар наверху. Вода безопасна со всех сторон (осевой знак).',
    whyPl: "Znak bezpiecznej wody: czerwono-białe pasy pionowe i czerwona kula na topie. Woda jest bezpieczna ze wszystkich stron (znak osiowy).",
  },
  {
    id: 'znaki-14', cat: 'znaki',
    q: 'Tablice zakazu na śródlądowych drogach wodnych mają:',
    options: ['Czerwoną obwódkę (często z przekreśleniem)', 'Niebieskie tło', 'Zielone tło'],
    correct: 0,
    whyRu: 'Запрещающие знаки - красный кант и перечёркивание; синие прямоугольные - указания/информация.',
    whyPl: "Znaki zakazu mają czerwoną obwódkę, często z przekreśleniem. Niebieskie prostokątne tablice to wskazania i informacje.",
  },
  {
    id: 'znaki-15', cat: 'znaki',
    q: 'Znak z przekreśloną kotwicą oznacza:',
    options: ['Zakaz kotwiczenia', 'Port jachtowy w pobliżu', 'Zakaz postoju przy kei'],
    correct: 0,
    whyRu: 'Перечёркнутый якорь = якорная стоянка запрещена (часто из-за кабелей или трубопроводов на дне).',
    whyPl: "Przekreślona kotwica = zakaz kotwiczenia, często z powodu kabli lub rurociągów na dnie.",
  },
  {
    id: 'znaki-16', cat: 'znaki',
    q: 'Znak "zakaz wytwarzania fali" zobowiązuje do:',
    options: ['Zmniejszenia prędkości tak, by nie wytwarzać falowania', 'Zatrzymania się', 'Płynięcia środkiem szlaku'],
    correct: 0,
    whyRu: 'Знак «не создавать волну»: сбрось скорость до такой, при которой лодка не даёт волны (у причалов, пляжей, работ).',
    whyPl: "Znak zakazu wytwarzania fali nakazuje zmniejszyć prędkość tak, by jednostka nie wytwarzała falowania (przy nabrzeżach, plażach, robotach na wodzie).",
  },
  {
    id: 'znaki-17', cat: 'znaki',
    q: 'Aby płynąć w osi nabieżnika (znaków prowadzących), należy:',
    options: ['Trzymać znak wyższy dokładnie nad niższym', 'Płynąć pomiędzy znakami', 'Trzymać oba znaki po lewej burcie'],
    correct: 0,
    whyRu: 'Створ: держи верхний (дальний) знак точно над нижним (ближним) - ты на оси фарватера. Разъехались - подверни к верхнему.',
    whyPl: "Nabieżnik: trzymaj znak wyższy (dalszy) dokładnie nad niższym (bliższym), wtedy płyniesz w osi toru. Gdy znaki się rozjeżdżają, podskręć w stronę znaku wyższego.",
  },
  {
    id: 'znaki-18', cat: 'znaki',
    q: 'Wpłynięcie do śluzy jest dozwolone, gdy sygnalizacja pokazuje:',
    options: ['Światło zielone', 'Światło czerwone', 'Dwa światła żółte'],
    correct: 0,
    whyRu: 'В шлюз входят только на зелёный сигнал. Красный = стой и жди перед шлюзом.',
    whyPl: "Do śluzy wpływamy tylko na światło zielone. Czerwone = stój i czekaj przed śluzą.",
  },

  {
    id: 'znaki-19', cat: 'znaki',
    q: 'Znaki żeglugowe grupy A na śródlądowych drogach wodnych to znaki:',
    options: ['Zakazu', 'Nakazu', 'Informacyjne'],
    correct: 0,
    whyRu: 'Группы знаков: A - запрет, B - предписание, C - ограничение, D - рекомендация, E - информация.',
    whyPl: "Grupy znaków: A - zakaz, B - nakaz, C - ograniczenie, D - zalecenie, E - informacja.",
  },
  {
    id: 'znaki-20', cat: 'znaki',
    q: 'Podczas śluzowania jednostka powinna być:',
    options: ['Przycumowana, z wyłączonym napędem', 'Utrzymywana na silniku na środku komory', 'Zakotwiczona w komorze śluzy'],
    correct: 0,
    whyRu: 'В камере шлюза: пришвартоваться, выключить двигатель, следить за концами при изменении уровня. Якорь в шлюзе запрещён.',
    whyPl: "W komorze śluzy: przycumuj, wyłącz napęd i pilnuj cum przy zmianie poziomu wody. Kotwiczenie w śluzie jest zabronione.",
  },

  // ===== BUDOWA JACHTU =====================================================
  {
    id: 'budowa-01', cat: 'budowa',
    q: 'Miejsce do spania na jachcie to:',
    options: ['Koja', 'Keja', 'Kingston'],
    correct: 0,
    whyRu: 'Koja = койка (спальное место). Keja = причал. Классическая ловушка экзамена!',
    whyPl: "Koja to miejsce do spania, a keja to nabrzeże do cumowania. Klasyczna pułapka egzaminacyjna!",
  },
  {
    id: 'budowa-02', cat: 'budowa',
    q: 'Jacht składający się z dwóch kadłubów to:',
    options: ['Katamaran', 'Trimaran', 'Skuter wodny'],
    correct: 0,
    whyRu: 'Катамаран - два корпуса, тримаран - три.',
    whyPl: "Katamaran ma dwa kadłuby, trimaran trzy.",
  },
  {
    id: 'budowa-03', cat: 'budowa',
    q: 'Handreling to:',
    options: ['Pokładniki', 'Listwy odbojowe', 'Uchwyty ułatwiające poruszanie się po jachcie'],
    correct: 2,
    whyRu: 'Handreling - поручни, за которые держатся при движении по палубе на волне.',
    whyPl: "Handreling to uchwyty (poręcze), których trzymamy się, poruszając się po pokładzie na fali.",
  },
  {
    id: 'budowa-04', cat: 'budowa',
    q: 'Kluza to:',
    options: ['Element do mocowania flagsztoku', 'Osprzęt do zwijania lin', 'Otwór w burcie do przeprowadzenia cumy lub łańcucha kotwicznego'],
    correct: 2,
    whyRu: 'Клюз - отверстие (обычно с обоймой) в борту или палубе для швартова либо якорной цепи.',
    whyPl: "Kluza to otwór (zwykle okuty) w burcie lub pokładzie do przeprowadzenia cumy albo łańcucha kotwicznego.",
  },
  {
    id: 'budowa-05', cat: 'budowa',
    q: 'Denniki to elementy konstrukcji łączące:',
    options: ['Pokład z wręgami', 'Stępkę (kil) z wręgami', 'Elementy ozdobne kadłuba'],
    correct: 1,
    whyRu: 'Флоры (denniki) связывают киль со шпангоутами (wręgi). Бимсы (pokładniki) - палубу со шпангоутами.',
    whyPl: "Denniki łączą stępkę (kil) z wręgami. Pokładniki łączą pokład z wręgami.",
  },
  {
    id: 'budowa-06', cat: 'budowa',
    q: 'Pokładniki to elementy konstrukcji łączące:',
    options: ['Pokład z wręgami', 'Stępkę z wręgami', 'Ster z kadłubem'],
    correct: 0,
    whyRu: 'Бимсы (pokładniki) поддерживают палубу и связывают её со шпангоутами.',
    whyPl: "Pokładniki podpierają pokład i łączą go z wręgami.",
  },
  {
    id: 'budowa-07', cat: 'budowa',
    q: 'Achterpik to:',
    options: ['Drewniana podłoga kokpitu', 'Przestrzeń dziobowa', 'Przestrzeń w rufowej części kadłuba'],
    correct: 2,
    whyRu: 'Ахтерпик - кормовой отсек. Форпик - носовой (там часто якорь и цепь).',
    whyPl: "Achterpik to przestrzeń w rufowej części kadłuba. Forpik jest na dziobie (tam często kotwica i łańcuch).",
  },
  {
    id: 'budowa-08', cat: 'budowa',
    q: 'Forpik to:',
    options: ['Drewniana podłoga', 'Przestrzeń w dziobowej części kadłuba', 'Przestrzeń rufowa'],
    correct: 1,
    whyRu: 'Форпик - носовой отсек корпуса.',
    whyPl: "Forpik to przestrzeń w dziobowej części kadłuba.",
  },
  {
    id: 'budowa-09', cat: 'budowa',
    q: 'Najniższa przestrzeń w kadłubie, gdzie zbiera się woda, to:',
    options: ['Dennik', 'Stewa', 'Zęza'],
    correct: 2,
    whyRu: 'Зэза (льяло) - самое низкое место трюма, куда стекает вода. Перед рейсом её откачивают.',
    whyPl: "Zęza to najniższa przestrzeń kadłuba, do której spływa woda. Przed rejsem należy ją odpompować.",
  },
  {
    id: 'budowa-10', cat: 'budowa',
    q: 'Kambuz to:',
    options: ['Pomieszczenie WC', 'Przestrzeń dziobowa', 'Kuchnia na jachcie'],
    correct: 2,
    whyRu: 'Камбуз - кухня. Mesa - кают-компания, где едят.',
    whyPl: "Kambuz to kuchnia na jachcie. Mesa to pomieszczenie, w którym się jada.",
  },
  {
    id: 'budowa-11', cat: 'budowa',
    q: 'Najczęstsze zakończenie rufy łodzi motorowej, na którym wisi silnik zaburtowy, to:',
    options: ['Półpokład', 'Pawęż', 'Dziobnica'],
    correct: 1,
    whyRu: 'Pawęż = транец, плоская кормовая стенка. На него навешивают подвесной мотор.',
    whyPl: "Pawęż to płaskie zakończenie rufy. To na niej wiesza się silnik zaburtowy.",
  },
  {
    id: 'budowa-12', cat: 'budowa',
    q: 'Wolna burta to:',
    options: ['Wysokość burty od linii wody do pokładu', 'Odległość od dziobu do rufy', 'Głębokość kadłuba pod wodą'],
    correct: 0,
    whyRu: 'Надводный борт (wolna burta) - высота борта от ватерлинии до палубы.',
    whyPl: "Wolna burta to wysokość burty od linii wody do pokładu.",
  },
  {
    id: 'budowa-13', cat: 'budowa',
    q: 'Zanurzenie jachtu to:',
    options: ['Odległość od linii wody do najniższego punktu kadłuba', 'Wysokość fali, jaką wytrzymuje kadłub', 'Głębokość akwenu'],
    correct: 0,
    whyRu: 'Осадка - расстояние от ватерлинии до самой нижней точки корпуса (киля, винта).',
    whyPl: "Zanurzenie to odległość od linii wody do najniższego punktu kadłuba (kila, śruby).",
  },
  {
    id: 'budowa-14', cat: 'budowa',
    q: 'Liny służące do przywiązania jachtu do nabrzeża to:',
    options: ['Cumy', 'Fały', 'Szoty'],
    correct: 0,
    whyRu: 'Швартовы (cumy) крепят лодку к причалу. Фалы и шкоты - такелаж парусов.',
    whyPl: "Cumy mocują jacht do nabrzeża. Fały i szoty to liny do obsługi żagli.",
  },

  // ===== SILNIKI ===========================================================
  {
    id: 'silniki-01', cat: 'silniki',
    q: 'Ile koni mechanicznych (KM) ma w przybliżeniu 1 kW?',
    options: ['1,85 KM', '1,56 KM', '1,36 KM'],
    correct: 2,
    whyRu: '1 кВт = 1,36 л.с. Обратно: 1 л.с. = 0,735 кВт. Пример: 60 кВт = около 82 л.с.',
    whyPl: "1 kW = 1,36 KM. Odwrotnie: 1 KM = 0,735 kW. Przykład: 60 kW to około 82 KM.",
  },
  {
    id: 'silniki-02', cat: 'silniki',
    q: 'Czy silnik dwusuwowy jest wyposażony w miskę olejową?',
    options: ['Nie', 'Tak', 'Zależnie od modelu'],
    correct: 0,
    whyRu: 'У двухтактного мотора нет масляного картера - масло добавляется в топливную смесь.',
    whyPl: "Silnik dwusuwowy nie ma miski olejowej, olej dodaje się do mieszanki paliwowej.",
  },
  {
    id: 'silniki-03', cat: 'silniki',
    q: 'Napis "four stroke" na silniku oznacza, że silnik jest:',
    options: ['O mocy 4 KM', 'Dwusuwowy', 'Czterosuwowy'],
    correct: 2,
    whyRu: 'Four stroke = четырёхтактный (заливается чистый бензин). Two stroke = двухтактный (смесь).',
    whyPl: "Four stroke = czterosuwowy (tankuje się czystą benzynę). Two stroke = dwusuwowy (mieszanka).",
  },
  {
    id: 'silniki-04', cat: 'silniki',
    q: 'Paliwo do silnika zaburtowego to:',
    options: ['Zawsze czysta benzyna', 'Zawsze mieszanka benzyny z olejem', 'Czysta benzyna lub mieszanka - zależnie od typu silnika'],
    correct: 2,
    whyRu: '4-тактный - чистый бензин; 2-тактный - смесь бензина с маслом. Смотри тип мотора.',
    whyPl: "Czterosuw tankuje czystą benzynę, dwusuw mieszankę benzyny z olejem. Sprawdź typ silnika.",
  },
  {
    id: 'silniki-05', cat: 'silniki',
    q: 'Podczas pracy typowego silnika zaburtowego z otworu kontrolnego:',
    options: ['Powinna delikatnie sikać ciepła woda', 'Powinien lać się mocny strumień oleju', 'Nic nie powinno wypływać'],
    correct: 0,
    whyRu: 'Струйка тёплой воды из контрольного отверстия = охлаждение работает. Нет струйки - глуши мотор!',
    whyPl: "Strumyk ciepłej wody z otworu kontrolnego oznacza, że chłodzenie działa. Brak strumienia - natychmiast wyłącz silnik!",
  },
  {
    id: 'silniki-06', cat: 'silniki',
    q: 'Przełączenie biegu od razu z "naprzód" na "wstecz" jest:',
    options: ['Dozwolone', 'Zabronione - uszkadza przekładnię', 'Zalecane przy hamowaniu'],
    correct: 1,
    whyRu: 'Резко «вперёд-назад» нельзя - сломаешь редуктор. Сначала нейтраль, пауза, потом задний ход.',
    whyPl: "Nagłe przełączenie z biegu naprzód na wsteczny niszczy przekładnię. Najpierw luz, chwila przerwy, dopiero potem wstecz.",
  },
  {
    id: 'silniki-07', cat: 'silniki',
    q: 'Przed wyłączeniem (odstawieniem) silnika należy:',
    options: ['Zakręcić dopływ paliwa i czekać', 'Przegazować na wysokich obrotach', 'Zredukować obroty do minimum i ustawić bieg jałowy'],
    correct: 2,
    whyRu: 'Перед выключением: сбросить обороты до минимума и включить нейтраль.',
    whyPl: "Przed wyłączeniem silnika zredukuj obroty do minimum i włącz bieg jałowy.",
  },
  {
    id: 'silniki-08', cat: 'silniki',
    q: 'Trymowanie silnika zaburtowego to:',
    options: ['Konserwacja i czyszczenie', 'Ustawienie kąta silnika względem pawęży', 'Wymiana oleju w przekładni'],
    correct: 1,
    whyRu: 'Трим - угол наклона мотора к транцу. Влияет на дифферент, скорость и расход топлива.',
    whyPl: "Trym to kąt ustawienia silnika względem pawęży. Wpływa na przegłębienie, prędkość i zużycie paliwa.",
  },
  {
    id: 'silniki-09', cat: 'silniki',
    q: 'Układ chłodzenia większości silników zaburtowych działa:',
    options: ['Powietrzem', 'Płynem chłodniczym w obiegu zamkniętym', 'Wodą zaburtową, po której płynie jednostka'],
    correct: 2,
    whyRu: 'Подвесные моторы охлаждаются забортной водой, которую качает помпа (крыльчатка).',
    whyPl: "Silniki zaburtowe chłodzone są wodą zaburtową, którą tłoczy pompa (impeler).",
  },
  {
    id: 'silniki-10', cat: 'silniki',
    q: 'Zerwanie linki bezpieczeństwa (kill switch) z wyłącznika powoduje:',
    options: ['Natychmiastowe zatrzymanie silnika', 'Zwiększenie obrotów', 'Zablokowanie steru'],
    correct: 0,
    whyRu: 'Kill switch (аварийный шнур на запястье рулевого) глушит мотор, если рулевой упал или вылетел за борт.',
    whyPl: "Kill switch (linka na nadgarstku sternika) natychmiast zatrzymuje silnik, gdy sternik upadnie lub wypadnie za burtę.",
  },
  {
    id: 'silniki-11', cat: 'silniki',
    q: 'Przed uruchomieniem silnika zaburtowego z przenośnym zbiornikiem paliwa należy:',
    options: ['Otworzyć odpowietrznik zbiornika i podpompować paliwo', 'Zdjąć pokrywę silnika', 'Przechylić zbiornik na bok'],
    correct: 0,
    whyRu: 'Перед пуском: открыть сапун (воздушный клапан) бака и подкачать топливо грушей. Мотор опущен, винт в воде, нейтраль.',
    whyPl: "Przed uruchomieniem: otwórz odpowietrznik zbiornika i podpompuj paliwo gruszką. Silnik opuszczony, śruba w wodzie, bieg jałowy.",
  },
  {
    id: 'silniki-12', cat: 'silniki',
    q: 'Silnik przegrzewa się podczas pływania. Co robisz najpierw?',
    options: ['Zwiększam obroty, żeby lepiej chłodził', 'Redukuję obroty / wyłączam silnik i sprawdzam układ chłodzenia', 'Dolewam paliwa'],
    correct: 1,
    whyRu: 'При перегреве: сбросить обороты или заглушить, проверить забор воды (часто забит водорослями/пакетом).',
    whyPl: "Przy przegrzaniu: zredukuj obroty lub wyłącz silnik i sprawdź pobór wody chłodzącej (często zatkany wodorostami lub folią).",
  },
  {
    id: 'silniki-13', cat: 'silniki',
    q: 'Świece zapłonowe występują w silniku:',
    options: ['Benzynowym', 'Diesla', 'Każdym spalinowym'],
    correct: 0,
    whyRu: 'Свечи зажигания - у бензиновых моторов. У дизеля воспламенение от сжатия (есть только свечи накала).',
    whyPl: "Świece zapłonowe ma silnik benzynowy. W dieslu zapłon następuje od sprężania (są tam tylko świece żarowe).",
  },

  // ===== MANEWRY ===========================================================
  {
    id: 'manewry-01', cat: 'manewry',
    q: 'Manewry portowe należy wykonywać z prędkością:',
    options: ['Minimalną, zapewniającą jeszcze sterowność', 'Większą niż 5 węzłów', 'Dowolną, byle sprawnie'],
    correct: 0,
    whyRu: 'В порту - минимальная скорость, при которой лодка ещё слушается руля.',
    whyPl: "W porcie manewrujemy z prędkością minimalną, przy której jacht jeszcze reaguje na ster.",
  },
  {
    id: 'manewry-02', cat: 'manewry',
    q: 'Przy silnym wietrze manewry portowe wykonujemy:',
    options: ['Bardzo powoli', 'Zdecydowanie, nieco szybciej - wraz ze wzrostem prędkości maleje dryf', 'Tylko na biegu wstecznym'],
    correct: 1,
    whyRu: 'При сильном ветре манёвр делают решительнее: чем выше скорость, тем меньше ветровой снос (dryf).',
    whyPl: "Przy silnym wietrze manewrujemy zdecydowanie i nieco szybciej: im większa prędkość, tym mniejszy dryf.",
  },
  {
    id: 'manewry-03', cat: 'manewry',
    q: 'Śruba prawoskrętna na biegu wstecznym zarzuca rufę:',
    options: ['W lewo', 'W prawo', 'Nie zarzuca wcale'],
    correct: 0,
    whyRu: 'Правый винт на заднем ходу уводит корму ВЛЕВО (боковой упор винта). Это используют при швартовке.',
    whyPl: "Śruba prawoskrętna na biegu wstecznym zarzuca rufę W LEWO (boczny napór śruby). Wykorzystuje się to przy cumowaniu.",
  },
  {
    id: 'manewry-04', cat: 'manewry',
    q: 'Sztrandowanie to:',
    options: ['Sztormowanie na kotwicy', 'Wyciąganie łodzi na slipie', 'Celowe, kontrolowane osadzenie jachtu na mieliźnie'],
    correct: 2,
    whyRu: 'Штрандование - намеренная посадка на мель (например, при аварии, чтобы не затонуть).',
    whyPl: "Sztrandowanie to celowe, kontrolowane osadzenie jachtu na mieliźnie (np. przy awarii, żeby nie zatonąć).",
  },
  {
    id: 'manewry-05', cat: 'manewry',
    q: 'O prędkości zestawu holowniczego decyduje:',
    options: ['Kapitan jednostki holującej', 'Kapitan jednostki holowanej', 'Przepisy lokalne'],
    correct: 0,
    whyRu: 'Скорость буксировки задаёт капитан буксирующего судна (он ведёт весь караван).',
    whyPl: "O prędkości zestawu decyduje kapitan jednostki holującej, bo to on prowadzi cały zestaw.",
  },
  {
    id: 'manewry-06', cat: 'manewry',
    q: 'Jaką długość łańcucha kotwicznego należy wydać przy głębokości 3 m?',
    options: ['Około 3 m', 'Około 4-5 m', 'Około 9-15 m'],
    correct: 2,
    whyRu: 'Длина якорной цепи = 3-5 глубин. При 3 м глубины - 9-15 м цепи. Больше цепи - якорь держит лучше.',
    whyPl: "Długość łańcucha kotwicznego to 3-5 głębokości. Przy głębokości 3 m wydajemy 9-15 m łańcucha. Więcej łańcucha - kotwica trzyma lepiej.",
  },
  {
    id: 'manewry-07', cat: 'manewry',
    q: 'Ster strumieniowy (bow thruster) to:',
    options: ['Pędnik poprzeczny na dziobie, pomagający w manewrach portowych', 'Rodzaj napędu strugowodnego', 'Awaryjny ster płetwowy'],
    correct: 0,
    whyRu: 'Носовое подруливающее устройство - поперечный винт в носу, помогает разворачиваться в порту.',
    whyPl: "Ster strumieniowy to poprzeczny pędnik na dziobie, ułatwiający obracanie jachtu w porcie.",
  },
  {
    id: 'manewry-08', cat: 'manewry',
    q: 'Lina biegnąca z dziobu prostopadle do nabrzeża, dociskająca burtę, to:',
    options: ['Cuma dziobowa', 'Szpring dziobowy', 'Brest dziobowy'],
    correct: 2,
    whyRu: 'Brest - прижимной конец, идёт перпендикулярно борту. Szpring - вдоль борта, держит от продольного смещения.',
    whyPl: "Brest biegnie prostopadle do nabrzeża i dociska burtę. Szpring biegnie wzdłuż burty i trzyma jacht przed przesuwaniem wzdłuż kei.",
  },
  {
    id: 'manewry-09', cat: 'manewry',
    q: 'Szpring to lina cumownicza, która:',
    options: ['Biegnie wzdłuż burty i zapobiega przesuwaniu się jachtu wzdłuż kei', 'Dociska jacht do kei prostopadle', 'Służy do holowania'],
    correct: 0,
    whyRu: 'Шпринг идёт вдоль борта (нос-назад / корма-вперёд) и не даёт лодке смещаться вдоль причала.',
    whyPl: "Szpring biegnie wzdłuż burty (z dziobu do tyłu lub z rufy do przodu) i zapobiega przesuwaniu się jachtu wzdłuż kei.",
  },
  {
    id: 'manewry-10', cat: 'manewry',
    q: 'Podczas podejmowania człowieka z wody silnik powinien być:',
    options: ['Na biegu wstecznym', 'Wyłączony lub na biegu jałowym', 'Na małych obrotach naprzód'],
    correct: 1,
    whyRu: 'У борта человека мотор - нейтраль или стоп: вращающийся винт смертельно опасен для человека в воде.',
    whyPl: "Przy podejmowaniu człowieka z wody silnik ma być na biegu jałowym lub wyłączony: obracająca się śruba jest śmiertelnie niebezpieczna dla osoby w wodzie.",
  },
  {
    id: 'manewry-11', cat: 'manewry',
    q: 'Kotwiczenie jest zabronione:',
    options: ['Na szlaku żeglownym (torze wodnym)', 'W zatokach i przy plażach', 'Wszędzie poza portami'],
    correct: 0,
    whyRu: 'Нельзя якориться на фарватере/судовом ходу, у подводных кабелей (знак с якорем перечёркнутым), в шлюзах и под мостами.',
    whyPl: "Nie wolno kotwiczyć na szlaku żeglownym (torze wodnym), przy podwodnych kablach (znak z przekreśloną kotwicą), w śluzach ani pod mostami.",
  },
  {
    id: 'manewry-12', cat: 'manewry',
    q: 'Podchodzenie do boi cumowniczej wykonujemy:',
    options: ['Pod wiatr lub pod prąd (ten czynnik, który silniejszy)', 'Z wiatrem, żeby szybciej dopłynąć', 'Zawsze od strony południowej'],
    correct: 0,
    whyRu: 'К бую (и к причалу) подходят против ветра или против течения - что сильнее. Так лодка легко тормозит и слушается.',
    whyPl: "Do boi (i do nabrzeża) podchodzimy pod wiatr lub pod prąd, zależnie od tego, który czynnik jest silniejszy. Jacht wtedy łatwo hamuje i słucha steru.",
  },

  // ===== LOCJA I NAWIGACJA =================================================
  {
    id: 'locja-01', cat: 'locja',
    q: 'Mila morska to:',
    options: ['1752 m', '1852 m', '2052 m'],
    correct: 1,
    whyRu: '1 морская миля = 1852 м = 1 минута дуги меридиана (широты).',
    whyPl: "1 mila morska = 1852 m = 1 minuta łuku południka (szerokości geograficznej).",
  },
  {
    id: 'locja-02', cat: 'locja',
    q: 'Węzeł to jednostka prędkości równa:',
    options: ['1 mili morskiej na godzinę', '1 kilometrowi na godzinę', '10 milom morskim na dobę'],
    correct: 0,
    whyRu: '1 узел = 1 морская миля в час = 1,852 км/ч.',
    whyPl: "1 węzeł = 1 mila morska na godzinę = 1,852 km/h.",
  },
  {
    id: 'locja-03', cat: 'locja',
    q: 'Do pomiaru głębokości służy:',
    options: ['Echosonda', 'Namiernik', 'Log'],
    correct: 0,
    whyRu: 'Эхолот измеряет глубину, лаг - скорость/пройденный путь, пеленгатор - направления на объекты.',
    whyPl: "Echosonda mierzy głębokość, log prędkość i przebytą drogę, a namiernik kierunki na obiekty.",
  },
  {
    id: 'locja-04', cat: 'locja',
    q: 'Ile minut ma jeden stopień?',
    options: ['100 minut', '90 minut', '60 minut'],
    correct: 2,
    whyRu: '1 градус = 60 минут. 1 минута широты = 1 морская миля.',
    whyPl: "1 stopień = 60 minut. 1 minuta szerokości geograficznej = 1 mila morska.",
  },
  {
    id: 'locja-05', cat: 'locja',
    q: 'Z typowego odbiornika GPS odczytasz:',
    options: ['Współrzędne, kąt drogi nad dnem (COG) i prędkość nad dnem (SOG)', 'Współrzędne i prędkość po wodzie', 'Współrzędne i kurs kompasowy'],
    correct: 0,
    whyRu: 'GPS даёт координаты, путевой угол и скорость ОТНОСИТЕЛЬНО ДНА (COG/SOG), а не по воде и не по компасу.',
    whyPl: "GPS podaje współrzędne oraz kąt drogi i prędkość WZGLĘDEM DNA (COG/SOG), a nie po wodzie ani według kompasu.",
  },
  {
    id: 'locja-06', cat: 'locja',
    q: 'Czy nawigację można oprzeć wyłącznie na GPS?',
    options: ['Tak, GPS jest bezbłędny', 'Nie - pozycja może być obarczona błędem, trzeba kontrolować otoczenie i mapę', 'Tak, jeśli odbiornik jest nowy'],
    correct: 1,
    whyRu: 'Только на GPS полагаться нельзя: возможны ошибки и сбои. Дублируй визуально и по карте.',
    whyPl: "Nie wolno polegać wyłącznie na GPS: pozycja może być obarczona błędem. Kontroluj otoczenie wzrokowo i na mapie.",
  },
  {
    id: 'locja-07', cat: 'locja',
    q: 'Śluza jest budowlą służącą do:',
    options: ['Regulacji ruchu na szlaku', 'Pokonywania różnicy poziomów wody między akwenami', 'Spiętrzania wody na potrzeby elektrowni'],
    correct: 1,
    whyRu: 'Шлюз переводит суда между бьефами с разным уровнем воды.',
    whyPl: "Śluza służy do pokonywania różnicy poziomów wody między akwenami.",
  },
  {
    id: 'locja-08', cat: 'locja',
    q: 'Kierunki kardynalne róży kompasowej to:',
    options: ['N, E, S, W', 'NE, SE, SW, NW', 'N, S i dwa bieguny'],
    correct: 0,
    whyRu: 'Главные румбы: N (север), E (восток), S (юг), W (запад).',
    whyPl: "Kierunki kardynalne to N (północ), E (wschód), S (południe), W (zachód).",
  },
  {
    id: 'locja-09', cat: 'locja',
    q: 'Locja to:',
    options: ['Dział wiedzy o oznakowaniu i opisie dróg wodnych', 'Urządzenie do pomiaru prędkości', 'Rodzaj mapy pogodowej'],
    correct: 0,
    whyRu: 'Лоция - раздел судовождения: описание вод, знаков, фарватеров и опасностей.',
    whyPl: "Locja to dział wiedzy o drogach wodnych: opis akwenów, oznakowania, torów wodnych i niebezpieczeństw.",
  },
  {
    id: 'locja-10', cat: 'locja',
    q: 'Namiar to:',
    options: ['Kierunek od obserwatora do obiektu', 'Kierunek ruchu statku', 'Odległość do obiektu'],
    correct: 0,
    whyRu: 'Пеленг - направление от наблюдателя на объект. Курс - направление движения судна.',
    whyPl: "Namiar to kierunek od obserwatora do obiektu. Kurs to kierunek, w którym płynie jednostka.",
  },

  {
    id: 'locja-11', cat: 'locja',
    q: 'Światło nawigacyjne o charakterystyce Fl(2) 10s to światło:',
    options: ['Blaskowe, grupa 2 błysków, okres 10 sekund', 'Stałe, widoczne z 10 mil', 'Izofazowe, 2 sekundy światła i 10 przerwy'],
    correct: 0,
    whyRu: 'Fl = проблесковый, (2) = группа из 2 вспышек, 10s = период. Oc = затмевающийся, Iso = изофазный, Q = частый.',
    whyPl: "Fl = światło blaskowe, (2) = grupa 2 błysków, 10s = okres. Oc = przesłonowe, Iso = izofazowe, Q = migające.",
  },

  // ===== METEOROLOGIA ======================================================
  {
    id: 'meteo-01', cat: 'meteo',
    q: 'Ciśnienie atmosferyczne mierzy:',
    options: ['Anemometr', 'Barometr', 'Higrometr'],
    correct: 1,
    whyRu: 'Барометр - давление, анемометр - скорость ветра, гигрометр - влажность.',
    whyPl: "Barometr mierzy ciśnienie, anemometr prędkość wiatru, higrometr wilgotność.",
  },
  {
    id: 'meteo-02', cat: 'meteo',
    q: 'Nagły, stały spadek ciśnienia zapowiada:',
    options: ['Poprawę pogody', 'Ryzyko nadejścia sztormu / pogorszenie pogody', 'Ciszę i upał'],
    correct: 1,
    whyRu: 'Резкое устойчивое падение давления - признак приближения шторма.',
    whyPl: "Nagły, stały spadek ciśnienia to oznaka zbliżającego się sztormu.",
  },
  {
    id: 'meteo-03', cat: 'meteo',
    q: 'Flauta (sztil) oznacza:',
    options: ['Falę posztormową', 'Zupełny brak wiatru', 'Zbliżający się front'],
    correct: 1,
    whyRu: 'Штиль - полное безветрие (0 баллов Бофорта).',
    whyPl: "Flauta (sztil) to zupełny brak wiatru (0 w skali Beauforta).",
  },
  {
    id: 'meteo-04', cat: 'meteo',
    q: 'Wiatr o sile 6 stopni Beauforta wieje z prędkością około:',
    options: ['7-10 węzłów', '22-27 węzłów', '34-40 węzłów'],
    correct: 1,
    whyRu: '6 баллов Бофорта = 22-27 узлов (сильный ветер, для малых лодок уже много).',
    whyPl: "6 stopni Beauforta = 22-27 węzłów (silny wiatr, dla małych łodzi to już dużo).",
  },
  {
    id: 'meteo-05', cat: 'meteo',
    q: 'Skala Beauforta służy do określania:',
    options: ['Stanu morza', 'Siły wiatru', 'Wysokości pływów'],
    correct: 1,
    whyRu: 'Шкала Бофорта (0-12) описывает силу ветра.',
    whyPl: "Skala Beauforta (0-12) opisuje siłę wiatru.",
  },
  {
    id: 'meteo-06', cat: 'meteo',
    q: 'Podczas bryzy nocnej wiatr wieje:',
    options: ['Od akwenu w kierunku lądu', 'Od lądu w kierunku wody', 'Wzdłuż linii brzegowej'],
    correct: 1,
    whyRu: 'Ночной бриз - с суши на воду (суша остывает быстрее). Дневной - с воды на сушу.',
    whyPl: "Bryza nocna wieje od lądu w kierunku wody (ląd stygnie szybciej). Dzienna odwrotnie, od wody na ląd.",
  },
  {
    id: 'meteo-07', cat: 'meteo',
    q: 'Chmura Cumulonimbus (Cb) zapowiada:',
    options: ['Stabilną, ładną pogodę', 'Silny wiatr, szkwały, burzę', 'Długotrwałą mżawkę'],
    correct: 1,
    whyRu: 'Кучево-дождевое облако (Cb) - шквалы, гроза, ливень. Увидел «наковальню» - уходи к берегу.',
    whyPl: "Cumulonimbus (Cb) to chmura burzowa: szkwały, burza, ulewa. Widzisz kowadło - wracaj do brzegu.",
  },
  {
    id: 'meteo-08', cat: 'meteo',
    q: 'Wiatr wieje:',
    options: ['Od wyżu do niżu', 'Od niżu do wyżu', 'Zawsze z zachodu'],
    correct: 0,
    whyRu: 'Ветер дует из области высокого давления в область низкого.',
    whyPl: "Wiatr wieje od wyżu do niżu.",
  },
  {
    id: 'meteo-09', cat: 'meteo',
    q: 'Szkwał to:',
    options: ['Nagły, silny wzrost prędkości wiatru', 'Rodzaj mgły', 'Prąd morski'],
    correct: 0,
    whyRu: 'Шквал - резкое кратковременное усиление ветра (часто перед грозой). Опасен для малых лодок.',
    whyPl: "Szkwał to nagły, krótkotrwały wzrost prędkości wiatru (często przed burzą). Groźny dla małych łodzi.",
  },

  // ===== RATOWNICTWO =======================================================
  {
    id: 'ratownictwo-01', cat: 'ratownictwo',
    q: 'Co zrobić natychmiast po wypadnięciu człowieka za burtę?',
    options: ['Ogłosić alarm, rzucić koło ratunkowe i wykonać manewr powrotu', 'Skoczyć za nim do wody', 'Płynąć dalej i wezwać pomoc telefonicznie'],
    correct: 0,
    whyRu: 'Крик «человек за бортом!», бросить круг, НЕ терять из виду (наблюдатель), манёвр возврата. Прыгать за ним - крайняя мера.',
    whyPl: "Ogłoś alarm (człowiek za burtą!), rzuć koło ratunkowe, nie trać osoby z oczu (wyznacz obserwatora) i wykonaj manewr powrotu. Skakanie do wody to ostateczność.",
  },
  {
    id: 'ratownictwo-02', cat: 'ratownictwo',
    q: 'Jeden cykl resuscytacji krążeniowo-oddechowej (RKO) to:',
    options: ['10 uciśnięć + 3 wdechy', '30 uciśnięć (tempo ok. 100-120/min) + 2 wdechy', '20 uciśnięć + 5 wdechów'],
    correct: 1,
    whyRu: 'СЛР: 30 нажатий на грудину (100-120 в минуту) + 2 вдоха. Повторять до приезда помощи.',
    whyPl: "RKO: 30 uciśnięć mostka (tempo ok. 100-120/min) + 2 wdechy. Powtarzaj do przybycia pomocy.",
  },
  {
    id: 'ratownictwo-03', cat: 'ratownictwo',
    q: 'Mając osobę nieprzytomną, w pierwszej kolejności należy:',
    options: ['Sprawdzić oddech i drożność dróg oddechowych', 'Rozpocząć uciskanie klatki piersiowej', 'Podać wodę do picia'],
    correct: 0,
    whyRu: 'Сначала проверить дыхание (запрокинуть голову, поднять подбородок). Дышит - боковое положение; не дышит - СЛР.',
    whyPl: "Najpierw sprawdź oddech (odchyl głowę, unieś brodę). Oddycha - pozycja boczna; nie oddycha - RKO.",
  },
  {
    id: 'ratownictwo-04', cat: 'ratownictwo',
    q: 'Rana z tkwiącym przedmiotem (np. nożem) - należy:',
    options: ['Nie usuwać przedmiotu, ustabilizować go opatrunkiem i wieźć do lekarza', 'Usunąć przedmiot i opatrzyć ranę', 'Usunąć przedmiot i podać leki przeciwbólowe'],
    correct: 0,
    whyRu: 'Инородный предмет из раны НЕ вынимать - зафиксировать повязкой и к врачу. Предмет может «затыкать» повреждённый сосуд.',
    whyPl: "Przedmiotu tkwiącego w ranie NIE usuwamy: stabilizujemy go opatrunkiem i wieziemy poszkodowanego do lekarza. Przedmiot może zatykać uszkodzone naczynie.",
  },
  {
    id: 'ratownictwo-05', cat: 'ratownictwo',
    q: 'Krwotok tętniczy charakteryzuje się:',
    options: ['Intensywnym, pulsującym wypływem jasnoczerwonej krwi', 'Powolnym wypływem ciemnej krwi', 'Wyłącznie krwawieniem wewnętrznym'],
    correct: 0,
    whyRu: 'Артериальное кровотечение - яркая пульсирующая кровь. Сильный прямой прижим раны, давящая повязка.',
    whyPl: "Krwotok tętniczy to jasnoczerwona, pulsująca krew. Mocny, bezpośredni ucisk rany i opatrunek uciskowy.",
  },
  {
    id: 'ratownictwo-06', cat: 'ratownictwo',
    q: 'Ratownictwem na polskich wodach morskich zajmuje się:',
    options: ['SAR (Morska Służba Poszukiwania i Ratownictwa)', 'WOPR', 'Straż graniczna'],
    correct: 0,
    whyRu: 'На море - служба SAR. На внутренних водах - WOPR (польский ОСВОД).',
    whyPl: "Na morzu ratownictwem zajmuje się SAR. Na wodach śródlądowych WOPR.",
  },
  {
    id: 'ratownictwo-07', cat: 'ratownictwo',
    q: 'Głównym przeznaczeniem kanału 16 VHF jest:',
    options: ['Rozmowy między jachtami', 'Wzywanie pomocy i nawiązywanie łączności (kanał wywoławczy)', 'Prognozy pogody'],
    correct: 1,
    whyRu: 'Канал 16 УКВ - международный канал вызова и БЕДСТВИЯ. Болтать на нём нельзя.',
    whyPl: "Kanał 16 VHF to międzynarodowy kanał wywoławczy i kanał wzywania POMOCY. Nie wolno prowadzić na nim pogawędek.",
  },
  {
    id: 'ratownictwo-08', cat: 'ratownictwo',
    q: 'Numer ratunkowy nad wodą w Polsce (WOPR) to:',
    options: ['601 100 100', '997', '986'],
    correct: 0,
    whyRu: 'Номер спасения на воде: 601 100 100 (WOPR/MOPR), также действует 984; общий - 112. Запомни перед сезоном!',
    whyPl: "Numer ratunkowy nad wodą: 601 100 100 (WOPR/MOPR), działa też 984; numer ogólny to 112. Zapamiętaj przed sezonem!",
  },
  {
    id: 'ratownictwo-09', cat: 'ratownictwo',
    q: 'Po podjęciu wychłodzonego człowieka z wody:',
    options: ['Podać mu 20-50 g alkoholu na rozgrzewkę', 'Nie podawać alkoholu - suche ubranie, ciepły napój, stopniowe ogrzewanie', 'Natychmiast wykonać gorącą kąpiel'],
    correct: 1,
    whyRu: 'Алкоголь при переохлаждении запрещён (расширяет сосуды, усиливает потерю тепла). Сухая одежда, тёплое питьё, постепенный обогрев.',
    whyPl: "Wychłodzonemu nie podajemy alkoholu (rozszerza naczynia i zwiększa utratę ciepła). Suche ubranie, ciepły napój, stopniowe ogrzewanie.",
  },
  {
    id: 'ratownictwo-10', cat: 'ratownictwo',
    q: 'W przypadku oparzenia skóry należy:',
    options: ['Zdezynfekować spirytusem', 'Schładzać wodą i przykryć jałowym opatrunkiem', 'Posmarować tłuszczem'],
    correct: 1,
    whyRu: 'Ожог: охлаждать чистой водой (10-20 мин), стерильная повязка, к врачу. Спирт и жир - нельзя.',
    whyPl: "Oparzenie: chłodzić czystą wodą (10-20 min), przykryć jałowym opatrunkiem, do lekarza. Spirytusu i tłuszczu nie wolno stosować.",
  },
  {
    id: 'ratownictwo-11', cat: 'ratownictwo',
    q: 'Koło ratunkowe podane osobie w wodzie należy założyć:',
    options: ['Przez głowę, pod ramiona', 'Na nogi', 'Trzymać w dłoniach'],
    correct: 0,
    whyRu: 'Круг надевают через голову под мышки - так он держит даже обессилевшего.',
    whyPl: "Koło ratunkowe zakładamy przez głowę, pod ramiona, tak utrzyma nawet osobę zupełnie wyczerpaną.",
  },
  {
    id: 'ratownictwo-12', cat: 'ratownictwo',
    q: 'Osobę nieprzytomną, ale oddychającą, układamy:',
    options: ['W pozycji bocznej ustalonej', 'Na plecach z uniesionymi nogami', 'Na brzuchu'],
    correct: 0,
    whyRu: 'Без сознания, но дышит - устойчивое боковое положение (защита дыхательных путей от западания языка и рвоты).',
    whyPl: "Nieprzytomny, ale oddychający - pozycja boczna ustalona (chroni drogi oddechowe przed zapadaniem języka i zachłyśnięciem).",
  },
  {
    id: 'ratownictwo-13', cat: 'ratownictwo',
    q: 'Wywołanie MAYDAY nadajemy, gdy:',
    options: ['Istnieje bezpośrednie zagrożenie życia lub statku', 'Skończyło się paliwo blisko brzegu', 'Chcemy zapytać o pogodę'],
    correct: 0,
    whyRu: 'MAYDAY - только прямая угроза жизни или судну. Передаётся на 16 канале УКВ трижды.',
    whyPl: "MAYDAY nadajemy tylko przy bezpośrednim zagrożeniu życia lub statku. Nadaje się go trzykrotnie na kanale 16 VHF.",
  },

  // ===== OCHRONA SRODOWISKA ================================================
  {
    id: 'srodowisko-01', cat: 'srodowisko',
    q: 'Uzupełnianie paliwa przy pracującym silniku jest:',
    options: ['Dozwolone przy małych obrotach', 'Zabronione', 'Dozwolone na wodach otwartych'],
    correct: 1,
    whyRu: 'Заправка при работающем моторе запрещена - риск пожара и взрыва паров.',
    whyPl: "Tankowanie przy pracującym silniku jest zabronione, grozi pożarem i wybuchem oparów.",
  },
  {
    id: 'srodowisko-02', cat: 'srodowisko',
    q: 'Odpompowanie zęzy silnikowej za burtę w porcie jest:',
    options: ['Zalecane przed wyjściem', 'Niedozwolone', 'Dozwolone nocą'],
    correct: 1,
    whyRu: 'Льяльные воды из моторного отсека могут содержать нефтепродукты - за борт в порту сливать нельзя.',
    whyPl: "Woda z zęzy silnikowej może zawierać produkty ropopochodne, w porcie nie wolno jej odpompowywać za burtę.",
  },
  {
    id: 'srodowisko-03', cat: 'srodowisko',
    q: 'Zawartość WC chemicznego można opróżnić:',
    options: ['Za burtę min. 50 m od brzegu', 'Do dowolnej toalety publicznej', 'Tylko w wyznaczonych punktach w portach'],
    correct: 2,
    whyRu: 'Химтуалет сливают только в специальные точки в портах - не за борт и не в обычную канализацию.',
    whyPl: "WC chemiczne opróżniamy tylko w wyznaczonych punktach w portach, nie za burtę i nie do zwykłej kanalizacji.",
  },
  {
    id: 'srodowisko-04', cat: 'srodowisko',
    q: 'Odpadki powstające na jachcie podczas rejsu należy:',
    options: ['Wyrzucić za burtę powyżej 200 m od brzegu', 'Oddać do selektywnej zbiórki na lądzie', 'Zatopić w głębokim miejscu'],
    correct: 1,
    whyRu: 'Мусор - на берег, в раздельный сбор. За борт не летит ничего.',
    whyPl: "Odpadki oddajemy na lądzie do selektywnej zbiórki. Za burtę nie leci nic.",
  },
  {
    id: 'srodowisko-05', cat: 'srodowisko',
    q: 'Środki czystości używane na jachcie powinny być:',
    options: ['Silnie pieniące', 'Biodegradowalne', 'Na bazie rozpuszczalników'],
    correct: 1,
    whyRu: 'Использовать биоразлагаемые средства - обычная химия попадает прямо в воду.',
    whyPl: "Używaj środków biodegradowalnych, zwykła chemia trafia prosto do wody.",
  },
  {
    id: 'srodowisko-06', cat: 'srodowisko',
    q: 'Strefa ciszy na akwenie oznacza:',
    options: ['Zakaz używania silników spalinowych', 'Zakaz rozmów na pokładzie', 'Zakaz kotwiczenia'],
    correct: 0,
    whyRu: 'Зона тишины: запрет ДВС (обычно у заповедников). Ходить можно на вёслах или электромоторе - проверяй местные правила.',
    whyPl: "Strefa ciszy to zakaz używania silników spalinowych (zwykle przy rezerwatach). Można płynąć na wiosłach lub silniku elektrycznym, sprawdzaj przepisy lokalne.",
  },
  {
    id: 'srodowisko-07', cat: 'srodowisko',
    q: 'Rozlanie paliwa do wody podczas tankowania:',
    options: ['Jest dopuszczalne w małych ilościach', 'Jest zabronione - należy tankować ostrożnie, z lejkiem/pompką', 'Nie ma znaczenia dla środowiska'],
    correct: 1,
    whyRu: 'Даже капля топлива образует плёнку на большой площади воды. Заправляйся аккуратно, с воронкой или помпой.',
    whyPl: "Nawet kropla paliwa tworzy film na dużej powierzchni wody. Tankuj ostrożnie, z lejkiem lub pompką.",
  },

  // ===== PATENT I PRZEPISY PRAWNE ==========================================
  {
    id: 'prawo-01', cat: 'prawo',
    q: 'Patent sternika motorowodnego uprawnia do prowadzenia jachtów motorowych po wodach śródlądowych:',
    options: ['Bez ograniczenia mocy silnika', 'Tylko do 60 kW', 'Tylko do 100 kW'],
    correct: 0,
    whyRu: 'На внутренних водах - без ограничения мощности. Ограничение 60 кВт касается только лиц младше 16 лет.',
    whyPl: "Na wodach śródlądowych patent uprawnia do prowadzenia jachtów motorowych bez ograniczenia mocy silnika. Limit 60 kW dotyczy tylko osób poniżej 16 lat.",
  },
  {
    id: 'prawo-02', cat: 'prawo',
    q: 'Patent sternika motorowodnego na wodach morskich uprawnia do prowadzenia jachtów motorowych:',
    options: ['O długości kadłuba do 12 m, w strefie do 2 Mm od brzegu, w porze dziennej', 'Bez ograniczeń', 'O długości do 24 m, całą dobę'],
    correct: 0,
    whyRu: 'Море: корпус до 12 м, внутренние морские воды + до 2 морских миль от берега, только днём.',
    whyPl: "Na morzu: kadłub do 12 m, morskie wody wewnętrzne i strefa do 2 Mm od brzegu, tylko w porze dziennej.",
  },
  {
    id: 'prawo-03', cat: 'prawo',
    q: 'Osoba, która nie ukończyła 16 lat, może realizować uprawnienia sternika motorowodnego:',
    options: ['Na jachtach o mocy silnika do 60 kW', 'Bez ograniczeń', 'Wyłącznie pod nadzorem na jachtach do 10 kW'],
    correct: 0,
    whyRu: 'До 16 лет - моторы до 60 кВт (около 82 л.с.).',
    whyPl: "Osoba poniżej 16 lat może prowadzić jachty o mocy silnika do 60 kW (około 82 KM).",
  },
  {
    id: 'prawo-04', cat: 'prawo',
    q: 'Prowadzenie jachtu motorowego o mocy silnika do 10 kW (13,6 KM):',
    options: ['Nie wymaga patentu', 'Wymaga patentu sternika motorowodnego', 'Wymaga licencji'],
    correct: 0,
    whyRu: 'До 10 кВт патент не нужен. Отсюда популярность «безправных» лодок с моторами до 13,6 л.с.',
    whyPl: "Do 10 kW patent nie jest wymagany. Stąd popularność łodzi z silnikami do 13,6 KM.",
  },
  {
    id: 'prawo-05', cat: 'prawo',
    q: 'Bez patentu można prowadzić po śródlądziu także jacht motorowy o mocy do 75 kW, jeżeli:',
    options: ['Długość kadłuba do 13 m, a prędkość ograniczona konstrukcyjnie do 15 km/h', 'Płynie się tylko w dzień', 'Ma się ukończone 21 lat'],
    correct: 0,
    whyRu: 'Исключение для хаусботов: до 75 кВт, корпус до 13 м, конструктивная скорость до 15 км/ч - патент не нужен.',
    whyPl: "Wyjątek dla houseboatów: do 75 kW, kadłub do 13 m, prędkość ograniczona konstrukcyjnie do 15 km/h - patent nie jest wymagany.",
  },
  {
    id: 'prawo-06', cat: 'prawo',
    q: 'Minimalny wiek do uzyskania patentu sternika motorowodnego to:',
    options: ['14 lat', '16 lat', '18 lat'],
    correct: 0,
    whyRu: 'С 14 лет (до 18 - письменное согласие родителей/опекунов).',
    whyPl: "Patent można uzyskać od 14 lat (do 18 lat wymagana pisemna zgoda rodziców lub opiekunów).",
  },
  {
    id: 'prawo-07', cat: 'prawo',
    q: 'Egzamin teoretyczny na patent sternika motorowodnego to:',
    options: ['75 pytań, 90 minut, próg 65 poprawnych', '100 pytań, 60 minut, próg 80', '50 pytań, 45 minut, próg 40'],
    correct: 0,
    whyRu: 'Тест: 75 вопросов (A/B/C), 90 минут, минимум 65 правильных (макс. 10 ошибок).',
    whyPl: "Egzamin: 75 pytań (A/B/C), 90 minut, próg 65 poprawnych odpowiedzi (maksymalnie 10 błędów).",
  },
  {
    id: 'prawo-08', cat: 'prawo',
    q: 'Do prowadzenia skutera wodnego wymagany jest:',
    options: ['Patent motorowodny (co najmniej sternik motorowodny)', 'Sam dowód osobisty', 'Kurs bez egzaminu'],
    correct: 0,
    whyRu: 'Гидроцикл - моторное судно: нужен патент (мощность гидроциклов много выше 10 кВт).',
    whyPl: "Skuter wodny to jednostka motorowa: wymagany jest patent (moc skuterów znacznie przekracza 10 kW).",
  },
  {
    id: 'prawo-09', cat: 'prawo',
    q: 'Holowanie narciarza wodnego lub obiektów pływających (np. banana) wymaga:',
    options: ['Licencji do holowania narciarza wodnego', 'Tylko patentu sternika motorowodnego', 'Zgody kapitanatu portu'],
    correct: 0,
    whyRu: 'Буксировка лыжника/«банана» - отдельная лицензия (от 18 лет), патент сам по себе не даёт этого права.',
    whyPl: "Holowanie narciarza wodnego lub banana wymaga osobnej licencji (od 18 lat), sam patent tego uprawnienia nie daje.",
  },
  {
    id: 'prawo-10', cat: 'prawo',
    q: 'Obowiązkowej rejestracji podlega jacht motorowy:',
    options: ['O długości powyżej 7,5 m lub o mocy napędu większej niż 15 kW', 'Każdy z silnikiem', 'Tylko morski'],
    correct: 0,
    whyRu: 'Регистрация (REJA24) обязательна: корпус длиннее 7,5 м ИЛИ мощность двигателя больше 15 кВт (закон о регистрации яхт, действует с 1.08.2020).',
    whyPl: "Rejestracja (REJA24) jest obowiązkowa, gdy kadłub jest dłuższy niż 7,5 m LUB moc napędu przekracza 15 kW (ustawa o rejestracji jachtów, obowiązuje od 1.08.2020).",
  },
  {
    id: 'prawo-11', cat: 'prawo',
    q: 'Prowadzenie jachtu motorowego po spożyciu alkoholu jest:',
    options: ['Zabronione i karalne', 'Dozwolone do 0,5 promila', 'Dozwolone na wodach prywatnych'],
    correct: 0,
    whyRu: 'Управление судном после алкоголя запрещено и наказуемо (штраф, а свыше 0,5 промилле - уголовная ответственность).',
    whyPl: "Prowadzenie jachtu po alkoholu jest zabronione i karalne (grzywna, a powyżej 0,5 promila odpowiedzialność karna).",
  },
  {
    id: 'prawo-12', cat: 'prawo',
    q: 'Ile środków ratunkowych (kamizelek) powinno znajdować się na jachcie?',
    options: ['Co najmniej tyle, ile osób na pokładzie', 'Połowa liczby osób', 'Dwie na jacht'],
    correct: 0,
    whyRu: 'Спасжилет - для каждого человека на борту. На практике экзаменатор проверяет это перед выходом.',
    whyPl: "Kamizelka ratunkowa dla każdej osoby na pokładzie. W praktyce egzaminator sprawdza to przed wyjściem na wodę.",
  },
  {
    id: 'prawo-13', cat: 'prawo',
    q: 'Opłata za egzamin na patent sternika motorowodnego wynosi:',
    options: ['250 zł (uczniowie i studenci do 26 lat płacą 50%)', '500 zł bez zniżek', '100 zł'],
    correct: 0,
    whyRu: 'Экзамен - 250 злотых, выдача патента - 50 злотых. Ученики и студенты до 26 лет платят половину (125 + 25).',
    whyPl: "Egzamin kosztuje 250 zł, wydanie patentu 50 zł. Uczniowie i studenci do 26 lat płacą połowę (125 + 25).",
  },
  {
    id: 'prawo-14', cat: 'prawo',
    q: '"Stan po użyciu alkoholu" to stężenie we krwi:',
    options: ['Od 0,2 do 0,5 promila', 'Od 0,5 do 1,0 promila', 'Powyżej 1,0 promila'],
    correct: 0,
    whyRu: '0,2-0,5 промилле = «состояние после употребления» (правонарушение); свыше 0,5 = опьянение, для моторного судна - уголовная статья.',
    whyPl: "0,2-0,5 promila to stan po użyciu alkoholu (wykroczenie); powyżej 0,5 promila to stan nietrzeźwości, na jachcie motorowym odpowiedzialność karna.",
  },
  {
    id: 'prawo-15', cat: 'prawo',
    q: 'Jacht motorowy z silnikiem spalinowym powinien mieć na wyposażeniu:',
    options: ['Gaśnicę', 'Radar', 'Tratwę ratunkową'],
    correct: 0,
    whyRu: 'Огнетушитель обязателен на судне с ДВС (бензин + пары = риск пожара). Плюс спассредства для каждого и аптечка.',
    whyPl: "Gaśnica jest obowiązkowa na jednostce z silnikiem spalinowym (benzyna i opary to ryzyko pożaru). Do tego środki ratunkowe dla każdej osoby i apteczka.",
  },

  // ===== PYTANIA OBRAZKOWE (rozpoznawanie znakow) ==========================
  {
    id: 'fig-01', cat: 'znaki', figure: 'cardinal-n',
    q: 'Widzisz ten znak. Z której strony należy go minąć?',
    options: ['Od północy', 'Od południa', 'Od wschodu'],
    correct: 0,
    whyRu: 'Оба конуса вершинами вверх, чёрное над жёлтым = северный (N). Обходи с севера - безопасная вода со стороны названия.',
    whyPl: "Oba stożki wierzchołkami do góry, czarne nad żółtym = znak północny (N). Mijaj go od północy, bezpieczna woda jest po stronie nazwy znaku.",
  },
  {
    id: 'fig-02', cat: 'znaki', figure: 'cardinal-e',
    q: 'Co to za znak?',
    options: ['Kardynalny wschodni (E)', 'Kardynalny zachodni (W)', 'Znak bezpiecznej wody'],
    correct: 0,
    whyRu: 'Конусы основаниями вместе («яйцо»), чёрный-жёлтый-чёрный = восточный (E). Обходить с востока, свет VQ(3).',
    whyPl: "Stożki podstawami razem (jajko), kolory czarny-żółty-czarny = znak wschodni (E). Mijamy od wschodu, światło VQ(3).",
  },
  {
    id: 'fig-03', cat: 'znaki', figure: 'cardinal-s',
    q: 'Widzisz ten znak. Jak się zachowasz?',
    options: ['Minę go od strony południowej', 'Minę go od strony północnej', 'Przepłynę tuż przy nim z dowolnej strony'],
    correct: 0,
    whyRu: 'Оба конуса вниз, жёлтое над чёрным = южный (S). Опасность к северу от знака - обходи с юга.',
    whyPl: "Oba stożki wierzchołkami w dół, żółte nad czarnym = znak południowy (S). Niebezpieczeństwo jest na północ od znaku, mijaj go od południa.",
  },
  {
    id: 'fig-04', cat: 'znaki', figure: 'cardinal-w',
    q: 'Widzisz ten znak. Z której strony go ominąć?',
    options: ['Od zachodu', 'Od wschodu', 'Obojętnie, byle daleko'],
    correct: 0,
    whyRu: 'Конусы вершинами вместе («бокал», W = wine), жёлтый-чёрный-жёлтый = западный (W). Обходи с запада, свет VQ(9).',
    whyPl: "Stożki wierzchołkami razem (kieliszek, wine = W), kolory żółty-czarny-żółty = znak zachodni (W). Mijaj od zachodu, światło VQ(9).",
  },
  {
    id: 'fig-05', cat: 'znaki', figure: 'lateral-red',
    q: 'Wchodzisz do portu od strony morza (region A). Po której burcie zostawiasz ten znak?',
    options: ['Po lewej burcie', 'Po prawej burcie', 'Przechodzę dokładnie nad nim'],
    correct: 0,
    whyRu: 'Красный цилиндр = левая кромка фарватера (регион A, вход с моря). Оставляй его слева по борту.',
    whyPl: "Czerwony walec = lewa strona toru wodnego (region A, wejście od morza). Zostaw go po lewej burcie.",
  },
  {
    id: 'fig-06', cat: 'znaki', figure: 'lateral-green',
    q: 'Wchodzisz od morza (region A). Co oznacza ten znak?',
    options: ['Prawą stronę toru wodnego - zostaw go po prawej burcie', 'Lewą stronę toru wodnego', 'Środek toru wodnego'],
    correct: 0,
    whyRu: 'Зелёный конус = правая кромка фарватера при входе с моря. Оставляй справа.',
    whyPl: "Zielony stożek = prawa strona toru wodnego przy wejściu od morza. Zostaw go po prawej burcie.",
  },
  {
    id: 'fig-07', cat: 'znaki', figure: 'isolated-danger',
    q: 'Co to za znak?',
    options: ['Znak odosobnionego niebezpieczeństwa - przejdź w bezpiecznej odległości', 'Znak bezpiecznej wody - można podpłynąć', 'Znak kardynalny północny'],
    correct: 0,
    whyRu: 'Чёрный с красной полосой, две чёрные шары = отдельная опасность (рэк, камень). Вода вокруг чистая - обходи на дистанции с любой стороны. Свет Fl(2).',
    whyPl: "Czarny znak z czerwonym pasem i dwiema czarnymi kulami = odosobnione niebezpieczeństwo (wrak, skała). Woda wokół jest czysta, przejdź w bezpiecznej odległości z dowolnej strony. Światło Fl(2).",
  },
  {
    id: 'fig-08', cat: 'znaki', figure: 'safe-water',
    q: 'Co oznacza ten znak?',
    options: ['Bezpieczną wodę (oś toru) - można przechodzić z każdej strony', 'Odosobnione niebezpieczeństwo', 'Zakaz wejścia'],
    correct: 0,
    whyRu: 'Красно-белые вертикальные полосы, красный шар = знак чистой воды (осевой). Часто первый буй при подходе с моря.',
    whyPl: "Czerwono-białe pasy pionowe i czerwona kula = znak bezpiecznej wody (osiowy). Często pierwsza pława przy podejściu od morza.",
  },
  {
    id: 'fig-09', cat: 'przepisy', figure: 'flag-a',
    q: 'Jednostka obok pokazuje tę flagę. Co robisz?',
    options: ['Trzymam się z dala i płynę z minimalną prędkością - nurek pod wodą', 'Podpływam pomóc', 'Nic - to bandera klubowa'],
    correct: 0,
    whyRu: 'Флаг «A» (Alfa): под водой водолаз. Обходи широко, малым ходом, следи за пузырями.',
    whyPl: "Flaga A (Alfa) oznacza nurka pod wodą. Omijaj szerokim łukiem, z minimalną prędkością, uważaj na pęcherze powietrza.",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function sternikQuestionsByCat(cat: SternikCatId): SternikQuestion[] {
  return STERNIK_BANK.filter((q) => q.cat === cat);
}

export const STERNIK_BANK_BY_ID: Record<string, SternikQuestion> = Object.fromEntries(
  STERNIK_BANK.map((q) => [q.id, q]),
);
