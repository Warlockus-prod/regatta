import type { BiText, TheoryChapter } from "./courseData";

const b = (pl: string, ru: string): BiText => ({ pl, ru });

// Owner, 2026-11-01: no country label in radio buttons. All seven values sit in
// one literal so the radio catalog builder pairs them.
const PRACTISE_PHRASES = {
  pl: "Przećwicz 60 fraz egzaminacyjnych",
  ru: "Отработать 60 экзаменационных фраз",
  en: "Practise 60 exam phrases",
  es: "Practica 60 frases de examen",
  fr: "Entraînez-vous aux 60 phrases d'examen",
  de: "Übe 60 Prüfungs-Funkphrasen",
  it: "Esercitati con 60 frasi d'esame",
};

export const SUPPLEMENTAL_THEORY_CHAPTERS: TheoryChapter[] = [
  {
    id: "power",
    number: 0,
    diagram: "power",
    title: b("Zasilanie i akumulatory bez zgadywania", "Питание и аккумуляторы без догадок"),
    eyebrow: b("Radio działa tylko tak długo jak jego źródło energii", "Рация работает лишь пока есть питание"),
    lead: b(
      "Na egzaminie pojawiają się akumulatory kwasowe, napięcie, gęstość elektrolitu, temperatura i baterie awaryjne. W praktyce ten sam temat decyduje, czy radio zadziała po awarii instalacji jachtu.",
      "На экзамене встречаются свинцово-кислотные аккумуляторы, напряжение, плотность электролита, температура и аварийные батареи. В море от этого зависит, заработает ли рация после отказа судовой сети.",
    ),
    situation: b(
      "Po zalaniu instalacji radio przechodzi na źródło awaryjne. Akumulator ma napięcie, ale pod obciążeniem nadajnika spada ono tak mocno, że transmisja zanika.",
      "После затопления электросистемы рация переходит на аварийный источник. Напряжение вроде есть, но при передаче оно проседает и сигнал пропадает.",
    ),
    why: b(
      "Odbiór wymaga znacznie mniej energii niż nadawanie z mocą 25 W. Dlatego stan akumulatora ocenia się nie tylko po napięciu spoczynkowym, ale także pod obciążeniem, a zapas liczy się dla rzeczywistego cyklu nasłuchu i nadawania.",
      "Прием требует намного меньше энергии, чем передача мощностью 25 Вт. Поэтому аккумулятор проверяют не только без нагрузки, но и во время потребления, а запас считают по реальному циклу приема и передачи.",
    ),
    concepts: [
      {
        title: b("Napięcie, pojemność, prąd", "Напряжение, емкость, ток"),
        body: b("Wolty mówią o różnicy potencjałów, amperogodziny o zapasie ładunku, a ampery o chwilowym poborze.", "Вольты показывают напряжение, ампер-часы запас заряда, амперы текущее потребление."),
      },
      {
        title: b("Akumulator kwasowy", "Свинцово-кислотный аккумулятор"),
        body: b("Elektrolitem jest roztwór kwasu siarkowego. Podczas ładowania może wydzielać się wybuchowa mieszanina wodoru i tlenu.", "Электролит это раствор серной кислоты. При зарядке может выделяться взрывоопасная смесь водорода и кислорода."),
      },
      {
        title: b("Bateria awaryjna", "Аварийная батарея"),
        body: b("Baterii EPIRB, SART i awaryjnego VHF nie ładuje się ani nie używa do zwykłych rozmów. Kontroluje się termin, plombę i test producenta.", "Батареи EPIRB, SART и аварийной VHF не заряжают и не расходуют на обычную связь. Проверяют срок, пломбу и штатный тест."),
      },
    ],
    steps: [
      b("Sprawdź zaciski, bezpiecznik, korozję i wentylację komory.", "Проверь клеммы, предохранитель, коррозию и вентиляцию отсека."),
      b("Zmierz napięcie spoczynkowe, potem obserwuj je podczas nadawania.", "Измерь напряжение без нагрузки, затем во время передачи."),
      b("W akumulatorze obsługowym sprawdź poziom i gęstość elektrolitu zgodnie z instrukcją.", "В обслуживаемом аккумуляторе проверь уровень и плотность электролита по инструкции."),
      b("Daty baterii awaryjnych wpisz do listy serwisowej przed rejsem.", "Внеси сроки аварийных батарей в сервисный список до выхода."),
    ],
    allowed: [
      b("Do uzupełniania poziomu w akumulatorze kwasowym używaj wody destylowanej.", "Для восполнения уровня в свинцовом аккумуляторе используй дистиллированную воду."),
      b("Ładuj w wentylowanym miejscu i chroń oczy oraz skórę.", "Заряжай при вентиляции и защищай глаза и кожу."),
    ],
    forbidden: [
      b("Nie zbliżaj płomienia ani iskry do ładowanego akumulatora.", "Не подноси огонь или искру к заряжающемуся аккумулятору."),
      b("Nie rozładowuj głęboko akumulatora i nie przechowuj go rozładowanego.", "Не допускай глубокого разряда и не храни аккумулятор разряженным."),
    ],
    exam: b(
      "21 V na nominalnym systemie 24 V oznacza silne rozładowanie. Spadek temperatury zmniejsza dostępną pojemność. Gęstość około 1,28 g/cm3 przy 20 C wskazuje pełne naładowanie typowego akumulatora kwasowego.",
      "21 В в номинальной системе 24 В означает сильный разряд. Понижение температуры уменьшает доступную емкость. Плотность около 1,28 г/см3 при 20 C соответствует полному заряду обычного свинцового аккумулятора.",
    ),
    practice: b(
      "Wynik egzaminacyjny opisuje klasyczny akumulator kwasowy. Na jachcie może być AGM, GEL lub LiFePO4, dla których procedury ładowania i oceny są inne.",
      "Экзаменационные вопросы описывают классический свинцово-кислотный аккумулятор. На яхте могут стоять AGM, GEL или LiFePO4 с другими правилами зарядки и проверки.",
    ),
    world: b(
      "Wymagania dotyczące czasu pracy wyposażenia awaryjnego wynikają ze standardu urządzenia i przepisów dla typu statku. Dla jachtu niekonwencyjnego sprawdź instrukcję, wymagania bandery i plan rejsu.",
      "Требуемое время работы аварийного оборудования зависит от его стандарта и типа судна. Для неконвенционной яхты проверяй инструкцию, требования флага и план плавания.",
    ),
    questionTopics: [
      b("akumulatory kwasowe", "свинцово-кислотные аккумуляторы"),
      b("napięcie i gęstość elektrolitu", "напряжение и плотность электролита"),
      b("baterie EPIRB, SART i VHF", "батареи EPIRB, SART и VHF"),
    ],
    sourceIds: ["uke", "cept", "imo1658"],
    practiceHref: "/radio/test?chapter=power",
    practiceLabel: b("Sprawdź pytania o zasilaniu", "Проверить вопросы о питании"),
    minutes: 18,
  },
  {
    id: "smcp",
    number: 0,
    diagram: "smcp",
    title: b("SMCP: angielski, który ma nie zawieść", "SMCP: английский, который не должен подвести"),
    eyebrow: b("Stałe konstrukcje zamiast swobodnej rozmowy", "Стандартные конструкции вместо свободной беседы"),
    lead: b(
      "Bank UKE zawiera 60 tłumaczeń. Nie warto uczyć się ich jako oderwanych zdań. Większość składa się z kilku stałych intencji: stan jednostki, prośba, pytanie, polecenie i potwierdzenie.",
      "В банке UKE есть 60 переводов. Их не нужно зубрить как отдельные предложения. Большинство выражает несколько повторяющихся целей: состояние судна, просьба, вопрос, команда и подтверждение.",
    ),
    situation: b(
      "W stresie operator zna sens komunikatu, ale buduje długie zdanie i gubi najważniejsze słowo. Standardowa fraza I REQUIRE ASSISTANCE jest krótsza i łatwiejsza do rozpoznania.",
      "В стрессе оператор понимает смысл, но строит длинную фразу и теряет главное слово. Стандартное I REQUIRE ASSISTANCE короче и легче распознается.",
    ),
    why: b(
      "SMCP ogranicza wieloznaczność pomiędzy załogami o różnym poziomie angielskiego. Krótka, przewidywalna składnia daje odbiorcy więcej czasu na zapisanie pozycji, zagrożenia i polecenia.",
      "SMCP уменьшает неоднозначность между экипажами с разным уровнем английского. Короткая предсказуемая структура оставляет больше времени на запись позиции, угрозы и команды.",
    ),
    concepts: [
      {
        title: b("Stan", "Состояние"),
        body: b("I AM SINKING, I AM ON FIRE, I AM NOT UNDER COMMAND. Najpierw podmiot, potem jednoznaczny stan.", "I AM SINKING, I AM ON FIRE, I AM NOT UNDER COMMAND. Сначала кто, затем однозначное состояние."),
      },
      {
        title: b("Prośba i możliwość", "Просьба и возможность"),
        body: b("I REQUIRE..., CAN YOU..., I CANNOT... oddzielają potrzebę, pytanie i ograniczenie.", "I REQUIRE..., CAN YOU..., I CANNOT... разделяют потребность, вопрос и ограничение."),
      },
      {
        title: b("Kontrola rozmowy", "Управление разговором"),
        body: b("SAY AGAIN, CORRECTION, RECEIVED, STAND BY i KEEP LISTENING sterują wymianą informacji.", "SAY AGAIN, CORRECTION, RECEIVED, STAND BY и KEEP LISTENING управляют обменом."),
      },
    ],
    steps: [
      b("Rozpoznaj intencję: stan, pytanie, prośba, polecenie czy potwierdzenie.", "Определи намерение: состояние, вопрос, просьба, команда или подтверждение."),
      b("Wybierz standardowy początek: I AM, I REQUIRE, CAN YOU, ADVISE YOU.", "Выбери стандартное начало: I AM, I REQUIRE, CAN YOU, ADVISE YOU."),
      b("Dodaj jeden konkret: FIRE, FLOODING, TUG, AMBULANCE, CHANNEL.", "Добавь одну конкретику: FIRE, FLOODING, TUG, AMBULANCE, CHANNEL."),
      b("Przeczytaj frazę głośno i zakończ odpowiednim proword.", "Произнеси фразу вслух и закончи подходящим proword."),
    ],
    allowed: [
      b("Używaj prostego czasu teraźniejszego i jednego znaczenia na zdanie.", "Используй простое настоящее время и одно значение в одном предложении."),
      b("Proś o powtórzenie, jeśli utraciłeś choćby jedną cyfrę pozycji.", "Проси повторить, если потерял хотя бы одну цифру позиции."),
    ],
    forbidden: [
      b("Nie zgaduj niezrozumiałego słowa z kontekstu w komunikacie alarmowym.", "Не угадывай непонятное слово по контексту в аварийном сообщении."),
      b("Nie zastępuj standardowej frazy długą rozmową potoczną.", "Не заменяй стандартную фразу длинной разговорной речью."),
    ],
    exam: b(
      "Ucz się rodzinami: awarie, ruch jednostki, widzialność, pomoc, rozbitkowie i kontrola łączności. Pytanie UKE sprawdza konkretne tłumaczenie, ale rodzina podpowiada konstrukcję.",
      "Учи семействами: аварии, движение судна, видимость, помощь, пострадавшие и управление связью. UKE проверяет конкретный перевод, но семейство подсказывает конструкцию.",
    ),
    practice: b(
      "Najpierw mów wolno i rytmicznie, potem zwiększ tempo. Akcent jest mniej ważny niż czytelne słowa kluczowe, cyfry i pauzy.",
      "Сначала говори медленно и ритмично, затем повышай темп. Акцент менее важен, чем четкие ключевые слова, цифры и паузы.",
    ),
    world: b(
      "SMCP jest wspólnym językiem międzynarodowym. Lokalna stacja może używać zwykłego angielskiego, ale frazy standardowe pozostają najbezpieczniejszym punktem wyjścia.",
      "SMCP является международным общим языком. Местная станция может говорить обычным английским, но стандартные фразы остаются самым безопасным началом.",
    ),
    questionTopics: [
      b("awarie i stan jednostki", "аварии и состояние судна"),
      b("prośby i polecenia", "просьбы и команды"),
      b("prowords i kontrola rozmowy", "prowords и управление разговором"),
    ],
    sourceIds: ["uke", "smcp", "cept"],
    practiceHref: "/radio/test?chapter=smcp",
    practiceLabel: b(PRACTISE_PHRASES.pl, PRACTISE_PHRASES.ru),
    minutes: 28,
  },
  {
    id: "navtex",
    number: 0,
    diagram: "navtex",
    title: b("NAVTEX: przeczytaj nagłówek jak instrukcję", "NAVTEX: читай заголовок как инструкцию"),
    eyebrow: b("MSI przychodzi automatycznie", "MSI приходит автоматически"),
    lead: b(
      "NAVTEX odbiera ostrzeżenia nawigacyjne, meteorologiczne i informacje SAR. Kluczem do egzaminu jest nagłówek B1B2B3B4, częstotliwości 518 i 490 kHz oraz świadome ustawienie odbiornika.",
      "NAVTEX принимает навигационные и метеорологические предупреждения, а также сообщения SAR. Для экзамена нужно понимать заголовок B1B2B3B4, частоты 518 и 490 кГц и настройку приемника.",
    ),
    situation: b(
      "Odbiornik drukuje ZCZC JA23. J wskazuje stację, A rodzaj informacji, a 23 numer komunikatu. Ten sam numer pozwala odbiornikowi nie drukować bez potrzeby duplikatu.",
      "Приемник показывает ZCZC JA23. J обозначает станцию, A тип информации, 23 номер сообщения. По номеру приемник не выводит ненужный дубликат.",
    ),
    why: b(
      "Wiele stacji współdzieli jedną częstotliwość i nadaje według harmonogramu. Identyfikator stacji, kategoria i numer pozwalają małemu odbiornikowi odfiltrować informacje bez utraty obowiązkowych ostrzeżeń.",
      "Много станций используют одну частоту и передают по расписанию. Идентификатор станции, категория и номер позволяют приемнику фильтровать сообщения, не теряя обязательные предупреждения.",
    ),
    concepts: [
      {
        title: b("B1 i B2", "B1 и B2"),
        body: b("B1 wybiera stację nadającą, B2 kategorię wiadomości, na przykład A dla ostrzeżeń nawigacyjnych.", "B1 выбирает передающую станцию, B2 категорию сообщения, например A для навигационных предупреждений."),
      },
      {
        title: b("B3B4 i numer 00", "B3B4 и номер 00"),
        body: b("B3B4 to numer 01-99. Numer 00 oznacza komunikat specjalny, który nie jest odrzucany jako duplikat.", "B3B4 это номер 01-99. Номер 00 означает специальное сообщение, которое не отбрасывается как дубликат."),
      },
      {
        title: b("518 i 490 kHz", "518 и 490 кГц"),
        body: b("518 kHz służy do międzynarodowej transmisji po angielsku, 490 kHz do transmisji krajowej w języku administracji.", "518 кГц используется для международной передачи на английском, 490 кГц для национальной передачи на языке администрации."),
      },
    ],
    steps: [
      b("Przed rejsem wybierz stacje pokrywające planowany obszar.", "Перед рейсом выбери станции, покрывающие маршрут."),
      b("Zostaw włączone obowiązkowe kategorie ostrzeżeń.", "Оставь включенными обязательные категории предупреждений."),
      b("Odczytaj ZCZC, B1B2B3B4, czas i obszar komunikatu.", "Прочитай ZCZC, B1B2B3B4, время и район сообщения."),
      b("NNNN traktuj jako prawidłowe zakończenie komunikatu.", "Считай NNNN правильным окончанием сообщения."),
    ],
    allowed: [
      b("Sprawdź harmonogram i zasięg stacji w oficjalnej publikacji.", "Проверь расписание и покрытие станции в официальной публикации."),
      b("Zachowaj komunikat dotyczący trasy, nawet jeśli odbiornik zwykle go filtruje.", "Сохрани сообщение по маршруту, даже если приемник обычно его фильтрует."),
    ],
    forbidden: [
      b("Nie wyłączaj kategorii obowiązkowych tylko po to, aby ograniczyć liczbę komunikatów.", "Не отключай обязательные категории только ради уменьшения числа сообщений."),
      b("Nie zakładaj, że większy nocny zasięg oznacza lepszy odbiór bez zakłóceń.", "Не считай, что большая ночная дальность всегда означает лучший прием без помех."),
    ],
    exam: b(
      "ZCZC rozpoczyna komunikat, NNNN go kończy. 518 kHz to międzynarodowy angielski, 490 kHz transmisja krajowa. B1 to stacja, B2 kategoria, B3B4 numer.",
      "ZCZC начинает сообщение, NNNN завершает. 518 кГц это международный английский, 490 кГц национальная передача. B1 это станция, B2 категория, B3B4 номер.",
    ),
    practice: b(
      "NAVTEX jest odbiornikiem, nie urządzeniem do wzywania pomocy. Jego wartość powstaje przed awarią: ostrzega o pogodzie, nawigacji i działaniach SAR.",
      "NAVTEX это приемник, а не средство вызова помощи. Его ценность появляется до аварии: он предупреждает о погоде, навигационных опасностях и SAR.",
    ),
    world: b(
      "Harmonogram, litera B1 i zasięg są regionalne. Zasada nagłówka oraz międzynarodowa transmisja 518 kHz są wspólne.",
      "Расписание, буква B1 и покрытие зависят от региона. Структура заголовка и международная передача 518 кГц общие.",
    ),
    questionTopics: [
      b("B1B2B3B4", "B1B2B3B4"),
      b("518 i 490 kHz", "518 и 490 кГц"),
      b("ZCZC, NNNN i kategorie", "ZCZC, NNNN и категории"),
    ],
    sourceIds: ["uke", "navtex", "cept"],
    practiceHref: "/radio/test?chapter=navtex",
    practiceLabel: b("Rozkoduj pytania NAVTEX", "Разобрать вопросы NAVTEX"),
    minutes: 24,
  },
  {
    id: "epirb",
    number: 0,
    diagram: "epirb",
    title: b("EPIRB i COSPAS-SARSAT: od pławy do RCC", "EPIRB и COSPAS-SARSAT: от буя до RCC"),
    eyebrow: b("Alarm dalekiego zasięgu", "Дальний аварийный сигнал"),
    lead: b(
      "EPIRB 406 MHz identyfikuje jednostkę i uruchamia łańcuch satelitarny. GNSS może dołączyć pozycję, satelity polarne mogą wyznaczyć ją z efektu Dopplera, a 121,5 MHz pomaga ratownikom na ostatnim odcinku.",
      "EPIRB 406 МГц идентифицирует судно и запускает спутниковую цепочку. GNSS может добавить позицию, полярные спутники способны определить ее по эффекту Доплера, а 121,5 МГц помогает спасателям на последнем участке.",
    ),
    situation: b(
      "Jacht tonie poza zasięgiem VHF. EPIRB z aktualną rejestracją przekazuje identyfikator i pozycję, dzięki czemu RCC może sprawdzić dane jednostki i kontakt alarmowy.",
      "Яхта тонет вне зоны VHF. Зарегистрированный EPIRB передает идентификатор и позицию, поэтому RCC может проверить данные судна и аварийный контакт.",
    ),
    why: b(
      "406 MHz zapewnia stabilny cyfrowy alarm i identyfikację, ale nie służy ekipie śmigłowca do precyzyjnego podejścia. Dlatego system łączy alarm satelitarny, dane rejestracyjne, lokalizację GNSS lub Doppler i sygnał naprowadzający 121,5 MHz.",
      "406 МГц дает надежный цифровой сигнал и идентификацию, но не служит вертолету для точного захода. Поэтому система объединяет спутниковый сигнал, регистрацию, позицию GNSS или Доплер и приводной сигнал 121,5 МГц.",
    ),
    concepts: [
      {
        title: b("LEOSAR, GEOSAR, MEOSAR", "LEOSAR, GEOSAR, MEOSAR"),
        body: b("Różne orbity dają różny czas wykrycia i sposób lokalizacji. GEOSAR widzi duży obszar stale, LEOSAR wykorzystuje ruch satelity, MEOSAR łączy wiele satelitów na średnich orbitach.", "Разные орбиты дают разное время обнаружения и способ локализации. GEOSAR постоянно видит большой район, LEOSAR использует движение спутника, MEOSAR объединяет спутники средних орбит."),
      },
      {
        title: b("LUT, MCC, RCC", "LUT, MCC, RCC"),
        body: b("LUT odbiera i przetwarza sygnał, MCC dystrybuuje dane, RCC koordynuje ratownictwo.", "LUT принимает и обрабатывает сигнал, MCC распределяет данные, RCC координирует спасение."),
      },
      {
        title: b("Rejestracja", "Регистрация"),
        body: b("Kod radiopławy łączy alarm z jednostką. Nieaktualny właściciel lub telefon opóźnia weryfikację.", "Код буя связывает сигнал с судном. Неактуальный владелец или телефон задерживают проверку."),
      },
    ],
    steps: [
      b("Zabierz EPIRB z jednostki lub pozwól mu zwolnić się automatycznie zgodnie z instrukcją.", "Возьми EPIRB с судна или дай ему освободиться автоматически по инструкции."),
      b("Uruchom i umieść pionowo z czystym widokiem nieba.", "Включи и установи вертикально с открытым обзором неба."),
      b("Nie trzymaj aktywnej anteny pod metalem ani blisko ciała.", "Не держи активную антенну под металлом или вплотную к телу."),
      b("Po fałszywym alarmie wyłącz urządzenie i natychmiast powiadom RCC.", "После ложного сигнала выключи устройство и немедленно сообщи RCC."),
    ],
    allowed: [
      b("Testuj tylko funkcją SELF TEST w terminie i warunkach producenta.", "Проверяй только функцией SELF TEST в разрешенное производителем время."),
      b("Aktualizuj rejestrację po zmianie właściciela, nazwy lub kontaktu.", "Обновляй регистрацию после смены владельца, названия или контакта."),
    ],
    forbidden: [
      b("Nie wykonuj testu przez prawdziwą aktywację alarmu.", "Не проверяй устройство реальным аварийным включением."),
      b("Nie wracaj po EPIRB, jeśli zagroziłoby to ludziom opuszczającym jednostkę.", "Не возвращайся за EPIRB, если это угрожает покидающим судно людям."),
    ],
    exam: b(
      "406 MHz przenosi zakodowany identyfikator, 121,5 MHz służy do naprowadzania. Typowy wymagany czas nadawania EPIRB to co najmniej 48 godzin.",
      "406 МГц передает закодированный идентификатор, 121,5 МГц используется для наведения. Типичное требование к EPIRB: не менее 48 часов передачи.",
    ),
    practice: b(
      "Dokładny sposób aktywacji, testu i mocowania zależy od modelu. Czytaj oznaczenia na obudowie i instrukcję hydrostatu.",
      "Точный способ включения, теста и крепления зависит от модели. Читай маркировку на корпусе и инструкцию гидростата.",
    ),
    world: b(
      "COSPAS-SARSAT jest globalny, ale rejestr beaconów i kontakt do odwołania fałszywego alarmu prowadzi administracja krajowa.",
      "COSPAS-SARSAT глобален, но реестр буев и контакт для отмены ложного сигнала определяет национальная администрация.",
    ),
    questionTopics: [
      b("406 i 121,5 MHz", "406 и 121,5 МГц"),
      b("LEOSAR, GEOSAR, LUT i MCC", "LEOSAR, GEOSAR, LUT и MCC"),
      b("rejestracja, test i fałszywy alarm", "регистрация, тест и ложный сигнал"),
    ],
    sourceIds: ["uke", "cospas", "imo1658"],
    practiceHref: "/radio/test?chapter=epirb",
    practiceLabel: b("Sprawdź pytania EPIRB", "Проверить вопросы EPIRB"),
    minutes: 26,
  },
  {
    id: "sart",
    number: 0,
    diagram: "sart",
    title: b("Radar SART: dwanaście śladów do tratwy", "Radar SART: двенадцать отметок к плоту"),
    eyebrow: b("Lokalizacja przez radar X-band", "Поиск радаром X-band"),
    lead: b(
      "Radar SART nie wysyła stale pozycji. Czeka na impuls radaru 9 GHz, odpowiada serią przemiatań i tworzy na ekranie charakterystyczny łańcuch 12 znaków.",
      "Radar SART не передает позицию постоянно. Он ждет импульс радара 9 ГГц, отвечает серией перестроек и создает на экране характерную цепочку из 12 отметок.",
    ),
    situation: b(
      "Statek ratowniczy zbliża się do tratwy. Najpierw widzi 12 kropek, potem kropki przechodzą w łuki, a bardzo blisko w niemal pełne okręgi.",
      "Спасательное судно приближается к плоту. Сначала видны 12 точек, затем они превращаются в дуги, а совсем близко почти в окружности.",
    ),
    why: b(
      "SART przemiata całe pasmo radaru X-band. Kolejne częstotliwości pojawiają się na różnych odległościach ekranu, dlatego odpowiedź wygląda jak uporządkowany szereg, a nie pojedyncze echo.",
      "SART перестраивается по всему диапазону радара X-band. Разные частоты отображаются на разных дальностях, поэтому ответ выглядит как упорядоченный ряд, а не одно эхо.",
    ),
    concepts: [
      {
        title: b("9,2-9,5 GHz", "9,2-9,5 ГГц"),
        body: b("SART współpracuje z radarem pasma X, nie z radarem S-band 3 GHz.", "SART работает с радаром X-band, а не с S-band 3 ГГц."),
      },
      {
        title: b("Kropki, łuki, okręgi", "Точки, дуги, окружности"),
        body: b("Zmiana kształtu oznacza rosnącą siłę odpowiedzi przy zbliżaniu, a nie trzy różne tryby SART.", "Изменение формы означает усиление ответа при сближении, а не три разных режима SART."),
      },
      {
        title: b("Wysokość", "Высота"),
        body: b("Tak jak przy VHF, podniesienie anteny poprawia horyzont radiowy i zasięg wykrycia.", "Как и у VHF, поднятие антенны увеличивает радиогоризонт и дальность обнаружения."),
      },
    ],
    steps: [
      b("Po opuszczeniu jednostki włącz SART zgodnie z instrukcją.", "После оставления судна включи SART по инструкции."),
      b("Umieść go pionowo i co najmniej metr nad wodą, jeśli to możliwe.", "Установи вертикально и по возможности не ниже метра над водой."),
      b("Obserwuj sygnał aktywacji lub pobudzenia przez radar.", "Следи за индикацией включения или облучения радаром."),
      b("Na radarze ratowniczym użyj X-band i dostrój rain clutter, aby odzyskać czytelne kropki.", "На спасательном радаре используй X-band и настрой rain clutter, чтобы вернуть четкие точки."),
    ],
    allowed: [
      b("Podnieś SART na maszcie tratwy lub innym stabilnym wsporniku.", "Подними SART на стойке плота или другом устойчивом креплении."),
      b("Zachowaj baterię na realną sytuację, wykonuj tylko dopuszczony self test.", "Береги батарею для реальной аварии, выполняй только разрешенный self test."),
    ],
    forbidden: [
      b("Nie kładź SART poziomo na dnie tratwy.", "Не клади SART горизонтально на дно плота."),
      b("Nie szukaj odpowiedzi SART na radarze S-band.", "Не ищи ответ SART на радаре S-band."),
    ],
    exam: b(
      "Radar SART odpowiada w paśmie 9,2-9,5 GHz. Typowy obraz to 12 kropek, przy zbliżaniu łuki i okręgi. Wymaganie baterii: 96 godzin czuwania i 8 godzin odpowiedzi.",
      "Radar SART отвечает в диапазоне 9,2-9,5 ГГц. Типичное изображение: 12 точек, при сближении дуги и окружности. Батарея: 96 часов ожидания и 8 часов ответа.",
    ),
    practice: b(
      "Deklarowany zasięg zależy od wysokości SART, anteny radaru, morza i samolotu. Wysokość jest praktycznym narzędziem, nie detalem egzaminacyjnym.",
      "Дальность зависит от высоты SART, антенны радара, моря и самолета. Высота это практический инструмент, а не только экзаменационная цифра.",
    ),
    world: b(
      "Charakterystyka SART jest międzynarodowa. Rozmieszczenie na konkretnym statku i obowiązek posiadania wynikają z przepisów jego bandery i klasy.",
      "Характеристики SART международные. Размещение на судне и обязательность зависят от флага и класса.",
    ),
    questionTopics: [
      b("radar X-band", "радар X-band"),
      b("12 kropek, łuki i okręgi", "12 точек, дуги и окружности"),
      b("zasięg, wysokość i bateria", "дальность, высота и батарея"),
    ],
    sourceIds: ["uke", "m628", "cept"],
    practiceHref: "/radio/test?chapter=sart",
    practiceLabel: b("Sprawdź pytania Radar SART", "Проверить вопросы Radar SART"),
    minutes: 22,
  },
  {
    id: "ais-sart",
    number: 0,
    diagram: "ais-sart",
    title: b("AIS-SART: cel ratunkowy na ekranie AIS", "AIS-SART: спасательная цель на экране AIS"),
    eyebrow: b("Nie myl go z echem radarowym", "Не путай с радиолокационной отметкой"),
    lead: b(
      "AIS-SART wykorzystuje kanały AIS i własne źródło pozycji. Odbiornik AIS pokazuje specjalny cel ratunkowy, jego identyfikator i pozycję. Radar bez AIS go nie zobaczy.",
      "AIS-SART использует каналы AIS и собственный источник позиции. Приемник AIS показывает специальную спасательную цель, ее идентификатор и координаты. Радар без AIS ее не увидит.",
    ),
    situation: b(
      "Na ploterze pojawia się okrąg z krzyżem i identyfikator zaczynający się od 970. To nie zwykły statek AIS, lecz nadajnik ratunkowy wymagający natychmiastowej oceny.",
      "На плоттере появляется круг с крестом и идентификатор, начинающийся с 970. Это не обычное судно AIS, а спасательный передатчик, требующий немедленной оценки.",
    ),
    why: b(
      "Radar SART odpowiada na fale radaru, a AIS-SART sam nadaje cyfrowe raporty VHF z pozycją. Oba prowadzą do rozbitków, ale używają innych odbiorników i innych symboli.",
      "Radar SART отвечает на импульсы радара, а AIS-SART самостоятельно передает цифровые VHF-отчеты с позицией. Оба ведут к пострадавшим, но используют разные приемники и обозначения.",
    ),
    concepts: [
      {
        title: b("Identyfikator 970", "Идентификатор 970"),
        body: b("Pierwsze trzy cyfry 970 oznaczają AIS-SART. Kolejne cyfry identyfikują konkretne urządzenie.", "Первые три цифры 970 обозначают AIS-SART. Остальные идентифицируют устройство."),
      },
      {
        title: b("Symbol", "Символ"),
        body: b("Nowszy ekran może pokazać okrąg z krzyżem. Starszy może przedstawić zwykły trójkąt celu AIS.", "Новый экран может показать круг с крестом. Старый может отобразить обычный треугольник AIS-цели."),
      },
      {
        title: b("Raport pozycji", "Отчет о позиции"),
        body: b("Własny GNSS dostarcza aktualną pozycję. AIS-SART nie przekazuje rozbudowanej historii zdarzenia.", "Собственный GNSS дает текущую позицию. AIS-SART не передает подробную историю происшествия."),
      },
    ],
    steps: [
      b("Włącz AIS-SART po opuszczeniu jednostki.", "Включи AIS-SART после оставления судна."),
      b("Podnieś antenę co najmniej metr nad wodą, jeśli konstrukcja na to pozwala.", "Подними антенну не менее чем на метр над водой, если позволяет конструкция."),
      b("Na jednostce ratowniczej potwierdź symbol, identyfikator 970 i pozycję.", "На спасательном судне проверь символ, идентификатор 970 и позицию."),
      b("Kieruj się do pozycji, utrzymuj obserwację wzrokową i radarową.", "Иди к позиции, продолжая визуальное и радиолокационное наблюдение."),
    ],
    allowed: [
      b("Traktuj alarm AIS-SART jako cel ratunkowy, nie zwykły ruch AIS.", "Рассматривай AIS-SART как спасательную цель, а не обычный AIS-трафик."),
      b("Sprawdź sposób prezentacji na konkretnym ploterze przed rejsem.", "До рейса проверь, как цель показывается на конкретном плоттере."),
    ],
    forbidden: [
      b("Nie oczekuj 12 kropek na ekranie radaru.", "Не ожидай 12 точек на экране радара."),
      b("Nie zakładaj, że brak specjalnego symbolu oznacza brak sygnału na starszym AIS.", "Не считай, что отсутствие специального символа означает отсутствие сигнала на старом AIS."),
    ],
    exam: b(
      "AIS-SART współpracuje z AIS, identyfikator zaczyna się od 970, a uzgodniony symbol to okrąg z krzyżem. Nie tworzy echa na radarze.",
      "AIS-SART работает с AIS, идентификатор начинается с 970, согласованный символ это круг с крестом. Радиолокационной отметки он не создает.",
    ),
    practice: b(
      "Minimalny zasięg zależy od wysokości anten obu stron. Samolot na 1000 m może wykryć sygnał znacznie dalej niż antena małej jednostki.",
      "Минимальная дальность зависит от высоты обеих антенн. Самолет на 1000 м может обнаружить сигнал намного дальше, чем малая лодка.",
    ),
    world: b(
      "Standard AIS-SART jest międzynarodowy, ale sposób alarmowania i wygląd celu zależy od wersji odbiornika, plotera i jego oprogramowania.",
      "Стандарт AIS-SART международный, но сигнализация и вид цели зависят от приемника, плоттера и его программного обеспечения.",
    ),
    questionTopics: [
      b("identyfikator 970", "идентификатор 970"),
      b("symbol okręgu z krzyżem", "символ круга с крестом"),
      b("AIS-SART kontra Radar SART", "AIS-SART против Radar SART"),
    ],
    sourceIds: ["uke", "ais-sart", "cept"],
    practiceHref: "/radio/test?chapter=ais-sart",
    practiceLabel: b("Sprawdź pytania AIS-SART", "Проверить вопросы AIS-SART"),
    minutes: 18,
  },
];
