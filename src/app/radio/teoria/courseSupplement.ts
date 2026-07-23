import type { BiText, TheoryChapter } from "./courseData";

const b = (pl: string, ru: string): BiText => ({ pl, ru });

export const SUPPLEMENTAL_THEORY_CHAPTERS: TheoryChapter[] = [
  {
    id: "power",
    number: 0,
    diagram: "power",
    title: b("Zasilanie i akumulatory bez zgadywania", "Питание и аккумуляторы без догадок"),
    eyebrow: b("Radio dziala tylko tak dlugo jak jego zrodlo energii", "Рация работает лишь пока есть питание"),
    lead: b(
      "Na egzaminie pojawiaja sie akumulatory kwasowe, napiecie, gestosc elektrolitu, temperatura i baterie awaryjne. W praktyce ten sam temat decyduje, czy radio zadziala po awarii instalacji jachtu.",
      "На экзамене встречаются свинцово-кислотные аккумуляторы, напряжение, плотность электролита, температура и аварийные батареи. В море от этого зависит, заработает ли рация после отказа судовой сети.",
    ),
    situation: b(
      "Po zalaniu instalacji radio przechodzi na zrodlo awaryjne. Akumulator ma napiecie, ale pod obciazeniem nadajnika spada ono tak mocno, ze transmisja zanika.",
      "После затопления электросистемы рация переходит на аварийный источник. Напряжение вроде есть, но при передаче оно проседает и сигнал пропадает.",
    ),
    why: b(
      "Odbior wymaga znacznie mniej energii niz nadawanie z moca 25 W. Dlatego stan akumulatora ocenia sie nie tylko po napieciu spoczynkowym, ale takze pod obciazeniem, a zapas liczy sie dla rzeczywistego cyklu nasluchu i nadawania.",
      "Прием требует намного меньше энергии, чем передача мощностью 25 Вт. Поэтому аккумулятор проверяют не только без нагрузки, но и во время потребления, а запас считают по реальному циклу приема и передачи.",
    ),
    concepts: [
      {
        title: b("Napiecie, pojemnosc, prad", "Напряжение, емкость, ток"),
        body: b("Wolty mowia o roznicy potencjalow, amperogodziny o zapasie ladunku, a ampery o chwilowym poborze.", "Вольты показывают напряжение, ампер-часы запас заряда, амперы текущее потребление."),
      },
      {
        title: b("Akumulator kwasowy", "Свинцово-кислотный аккумулятор"),
        body: b("Elektrolitem jest roztwor kwasu siarkowego. Podczas ladowania moze wydzielac sie wybuchowa mieszanina wodoru i tlenu.", "Электролит это раствор серной кислоты. При зарядке может выделяться взрывоопасная смесь водорода и кислорода."),
      },
      {
        title: b("Bateria awaryjna", "Аварийная батарея"),
        body: b("Baterii EPIRB, SART i awaryjnego VHF nie laduje sie ani nie uzywa do zwyklych rozmow. Kontroluje sie termin, plombe i test producenta.", "Батареи EPIRB, SART и аварийной VHF не заряжают и не расходуют на обычную связь. Проверяют срок, пломбу и штатный тест."),
      },
    ],
    steps: [
      b("Sprawdz zaciski, bezpiecznik, korozje i wentylacje komory.", "Проверь клеммы, предохранитель, коррозию и вентиляцию отсека."),
      b("Zmierz napiecie spoczynkowe, potem obserwuj je podczas nadawania.", "Измерь напряжение без нагрузки, затем во время передачи."),
      b("W akumulatorze obslugowym sprawdz poziom i gestosc elektrolitu zgodnie z instrukcja.", "В обслуживаемом аккумуляторе проверь уровень и плотность электролита по инструкции."),
      b("Daty baterii awaryjnych wpisz do listy serwisowej przed rejsem.", "Внеси сроки аварийных батарей в сервисный список до выхода."),
    ],
    allowed: [
      b("Do uzupelniania poziomu w akumulatorze kwasowym uzywaj wody destylowanej.", "Для восполнения уровня в свинцовом аккумуляторе используй дистиллированную воду."),
      b("Laduj w wentylowanym miejscu i chron oczy oraz skore.", "Заряжай при вентиляции и защищай глаза и кожу."),
    ],
    forbidden: [
      b("Nie zblizaj plomienia ani iskry do ladowanego akumulatora.", "Не подноси огонь или искру к заряжающемуся аккумулятору."),
      b("Nie rozladowuj gleboko akumulatora i nie przechowuj go rozladowanego.", "Не допускай глубокого разряда и не храни аккумулятор разряженным."),
    ],
    exam: b(
      "21 V na nominalnym systemie 24 V oznacza silne rozladowanie. Spadek temperatury zmniejsza dostepna pojemnosc. Gestosc okolo 1,28 g/cm3 przy 20 C wskazuje pelne naladowanie typowego akumulatora kwasowego.",
      "21 В в номинальной системе 24 В означает сильный разряд. Понижение температуры уменьшает доступную емкость. Плотность около 1,28 г/см3 при 20 C соответствует полному заряду обычного свинцового аккумулятора.",
    ),
    practice: b(
      "Wynik egzaminacyjny opisuje klasyczny akumulator kwasowy. Na jachcie moze byc AGM, GEL lub LiFePO4, dla ktorych procedury ladowania i oceny sa inne.",
      "Экзаменационные вопросы описывают классический свинцово-кислотный аккумулятор. На яхте могут стоять AGM, GEL или LiFePO4 с другими правилами зарядки и проверки.",
    ),
    world: b(
      "Wymagania dotyczace czasu pracy wyposazenia awaryjnego wynikaja ze standardu urzadzenia i przepisow dla typu statku. Dla jachtu niekonwencyjnego sprawdz instrukcje, wymagania bandery i plan rejsu.",
      "Требуемое время работы аварийного оборудования зависит от его стандарта и типа судна. Для неконвенционной яхты проверяй инструкцию, требования флага и план плавания.",
    ),
    questionTopics: [
      b("akumulatory kwasowe", "свинцово-кислотные аккумуляторы"),
      b("napiecie i gestosc elektrolitu", "напряжение и плотность электролита"),
      b("baterie EPIRB, SART i VHF", "батареи EPIRB, SART и VHF"),
    ],
    sourceIds: ["uke", "cept", "imo1658"],
    practiceHref: "/radio/test?chapter=power",
    practiceLabel: b("Sprawdz pytania o zasilaniu", "Проверить вопросы о питании"),
    minutes: 18,
  },
  {
    id: "smcp",
    number: 0,
    diagram: "smcp",
    title: b("SMCP: angielski, ktory ma nie zawiesc", "SMCP: английский, который не должен подвести"),
    eyebrow: b("Stale konstrukcje zamiast swobodnej rozmowy", "Стандартные конструкции вместо свободной беседы"),
    lead: b(
      "Bank UKE zawiera 60 tlumaczen. Nie warto uczyc sie ich jako oderwanych zdan. Wiekszosc sklada sie z kilku stalych intencji: stan jednostki, prosba, pytanie, polecenie i potwierdzenie.",
      "В банке UKE есть 60 переводов. Их не нужно зубрить как отдельные предложения. Большинство выражает несколько повторяющихся целей: состояние судна, просьба, вопрос, команда и подтверждение.",
    ),
    situation: b(
      "W stresie operator zna sens komunikatu, ale buduje dlugie zdanie i gubi najwazniejsze slowo. Standardowa fraza I REQUIRE ASSISTANCE jest krotsza i latwiejsza do rozpoznania.",
      "В стрессе оператор понимает смысл, но строит длинную фразу и теряет главное слово. Стандартное I REQUIRE ASSISTANCE короче и легче распознается.",
    ),
    why: b(
      "SMCP ogranicza wieloznacznosc pomiedzy zalogami o roznym poziomie angielskiego. Krotka, przewidywalna skladnia daje odbiorcy wiecej czasu na zapisanie pozycji, zagrozenia i polecenia.",
      "SMCP уменьшает неоднозначность между экипажами с разным уровнем английского. Короткая предсказуемая структура оставляет больше времени на запись позиции, угрозы и команды.",
    ),
    concepts: [
      {
        title: b("Stan", "Состояние"),
        body: b("I AM SINKING, I AM ON FIRE, I AM NOT UNDER COMMAND. Najpierw podmiot, potem jednoznaczny stan.", "I AM SINKING, I AM ON FIRE, I AM NOT UNDER COMMAND. Сначала кто, затем однозначное состояние."),
      },
      {
        title: b("Prosba i mozliwosc", "Просьба и возможность"),
        body: b("I REQUIRE..., CAN YOU..., I CANNOT... oddzielaja potrzebe, pytanie i ograniczenie.", "I REQUIRE..., CAN YOU..., I CANNOT... разделяют потребность, вопрос и ограничение."),
      },
      {
        title: b("Kontrola rozmowy", "Управление разговором"),
        body: b("SAY AGAIN, CORRECTION, RECEIVED, STAND BY i KEEP LISTENING steruja wymiana informacji.", "SAY AGAIN, CORRECTION, RECEIVED, STAND BY и KEEP LISTENING управляют обменом."),
      },
    ],
    steps: [
      b("Rozpoznaj intencje: stan, pytanie, prosba, polecenie czy potwierdzenie.", "Определи намерение: состояние, вопрос, просьба, команда или подтверждение."),
      b("Wybierz standardowy poczatek: I AM, I REQUIRE, CAN YOU, ADVISE YOU.", "Выбери стандартное начало: I AM, I REQUIRE, CAN YOU, ADVISE YOU."),
      b("Dodaj jeden konkret: FIRE, FLOODING, TUG, AMBULANCE, CHANNEL.", "Добавь одну конкретику: FIRE, FLOODING, TUG, AMBULANCE, CHANNEL."),
      b("Przeczytaj fraze glosno i zakoncz odpowiednim proword.", "Произнеси фразу вслух и закончи подходящим proword."),
    ],
    allowed: [
      b("Uzywaj prostego czasu terazniejszego i jednego znaczenia na zdanie.", "Используй простое настоящее время и одно значение в одном предложении."),
      b("Pros o powtorzenie, jesli utraciles chocby jedna cyfre pozycji.", "Проси повторить, если потерял хотя бы одну цифру позиции."),
    ],
    forbidden: [
      b("Nie zgaduj niezrozumialego slowa z kontekstu w komunikacie alarmowym.", "Не угадывай непонятное слово по контексту в аварийном сообщении."),
      b("Nie zastepuj standardowej frazy dluga rozmowa potoczna.", "Не заменяй стандартную фразу длинной разговорной речью."),
    ],
    exam: b(
      "Ucz sie rodzinami: awarie, ruch jednostki, widzialnosc, pomoc, rozbitkowie i kontrola lacznosci. Pytanie UKE sprawdza konkretne tlumaczenie, ale rodzina podpowiada konstrukcje.",
      "Учи семействами: аварии, движение судна, видимость, помощь, пострадавшие и управление связью. UKE проверяет конкретный перевод, но семейство подсказывает конструкцию.",
    ),
    practice: b(
      "Najpierw mow wolno i rytmicznie, potem zwieksz tempo. Akcent jest mniej wazny niz czytelne slowa kluczowe, cyfry i pauzy.",
      "Сначала говори медленно и ритмично, затем повышай темп. Акцент менее важен, чем четкие ключевые слова, цифры и паузы.",
    ),
    world: b(
      "SMCP jest wspolnym jezykiem miedzynarodowym. Lokalna stacja moze uzywac zwyklego angielskiego, ale frazy standardowe pozostaja najbezpieczniejszym punktem wyjscia.",
      "SMCP является международным общим языком. Местная станция может говорить обычным английским, но стандартные фразы остаются самым безопасным началом.",
    ),
    questionTopics: [
      b("awarie i stan jednostki", "аварии и состояние судна"),
      b("prosby i polecenia", "просьбы и команды"),
      b("prowords i kontrola rozmowy", "prowords и управление разговором"),
    ],
    sourceIds: ["uke", "smcp", "cept"],
    practiceHref: "/radio/test?chapter=smcp",
    practiceLabel: b("Przecwicz 60 fraz UKE", "Отработать 60 фраз UKE"),
    minutes: 28,
  },
  {
    id: "navtex",
    number: 0,
    diagram: "navtex",
    title: b("NAVTEX: przeczytaj naglowek jak instrukcje", "NAVTEX: читай заголовок как инструкцию"),
    eyebrow: b("MSI przychodzi automatycznie", "MSI приходит автоматически"),
    lead: b(
      "NAVTEX odbiera ostrzezenia nawigacyjne, meteorologiczne i informacje SAR. Kluczem do egzaminu jest naglowek B1B2B3B4, czestotliwosci 518 i 490 kHz oraz swiadome ustawienie odbiornika.",
      "NAVTEX принимает навигационные и метеорологические предупреждения, а также сообщения SAR. Для экзамена нужно понимать заголовок B1B2B3B4, частоты 518 и 490 кГц и настройку приемника.",
    ),
    situation: b(
      "Odbiornik drukuje ZCZC JA23. J wskazuje stacje, A rodzaj informacji, a 23 numer komunikatu. Ten sam numer pozwala odbiornikowi nie drukowac bez potrzeby duplikatu.",
      "Приемник показывает ZCZC JA23. J обозначает станцию, A тип информации, 23 номер сообщения. По номеру приемник не выводит ненужный дубликат.",
    ),
    why: b(
      "Wiele stacji wspoldzieli jedna czestotliwosc i nadaje wedlug harmonogramu. Identyfikator stacji, kategoria i numer pozwalaja malemu odbiornikowi odfiltrowac informacje bez utraty obowiazkowych ostrzezen.",
      "Много станций используют одну частоту и передают по расписанию. Идентификатор станции, категория и номер позволяют приемнику фильтровать сообщения, не теряя обязательные предупреждения.",
    ),
    concepts: [
      {
        title: b("B1 i B2", "B1 и B2"),
        body: b("B1 wybiera stacje nadajaca, B2 kategorie wiadomosci, na przyklad A dla ostrzezen nawigacyjnych.", "B1 выбирает передающую станцию, B2 категорию сообщения, например A для навигационных предупреждений."),
      },
      {
        title: b("B3B4 i numer 00", "B3B4 и номер 00"),
        body: b("B3B4 to numer 01-99. Numer 00 oznacza komunikat specjalny, ktory nie jest odrzucany jako duplikat.", "B3B4 это номер 01-99. Номер 00 означает специальное сообщение, которое не отбрасывается как дубликат."),
      },
      {
        title: b("518 i 490 kHz", "518 и 490 кГц"),
        body: b("518 kHz sluzy do miedzynarodowej transmisji po angielsku, 490 kHz do transmisji krajowej w jezyku administracji.", "518 кГц используется для международной передачи на английском, 490 кГц для национальной передачи на языке администрации."),
      },
    ],
    steps: [
      b("Przed rejsem wybierz stacje pokrywajace planowany obszar.", "Перед рейсом выбери станции, покрывающие маршрут."),
      b("Zostaw wlaczone obowiazkowe kategorie ostrzezen.", "Оставь включенными обязательные категории предупреждений."),
      b("Odczytaj ZCZC, B1B2B3B4, czas i obszar komunikatu.", "Прочитай ZCZC, B1B2B3B4, время и район сообщения."),
      b("NNNN traktuj jako prawidlowe zakonczenie komunikatu.", "Считай NNNN правильным окончанием сообщения."),
    ],
    allowed: [
      b("Sprawdz harmonogram i zasiag stacji w oficjalnej publikacji.", "Проверь расписание и покрытие станции в официальной публикации."),
      b("Zachowaj komunikat dotyczacy trasy, nawet jesli odbiornik zwykle go filtruje.", "Сохрани сообщение по маршруту, даже если приемник обычно его фильтрует."),
    ],
    forbidden: [
      b("Nie wylaczaj kategorii obowiazkowych tylko po to, aby ograniczyc liczbe komunikatow.", "Не отключай обязательные категории только ради уменьшения числа сообщений."),
      b("Nie zakladaj, ze wiekszy nocny zasieg oznacza lepszy odbior bez zaklocen.", "Не считай, что большая ночная дальность всегда означает лучший прием без помех."),
    ],
    exam: b(
      "ZCZC rozpoczyna komunikat, NNNN go konczy. 518 kHz to miedzynarodowy angielski, 490 kHz transmisja krajowa. B1 to stacja, B2 kategoria, B3B4 numer.",
      "ZCZC начинает сообщение, NNNN завершает. 518 кГц это международный английский, 490 кГц национальная передача. B1 это станция, B2 категория, B3B4 номер.",
    ),
    practice: b(
      "NAVTEX jest odbiornikiem, nie urzadzeniem do wzywania pomocy. Jego wartosc powstaje przed awaria: ostrzega o pogodzie, nawigacji i dzialaniach SAR.",
      "NAVTEX это приемник, а не средство вызова помощи. Его ценность появляется до аварии: он предупреждает о погоде, навигационных опасностях и SAR.",
    ),
    world: b(
      "Harmonogram, litera B1 i zasieg sa regionalne. Zasada naglowka oraz miedzynarodowa transmisja 518 kHz sa wspolne.",
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
    title: b("EPIRB i COSPAS-SARSAT: od plawy do RCC", "EPIRB и COSPAS-SARSAT: от буя до RCC"),
    eyebrow: b("Alarm dalekiego zasiegu", "Дальний аварийный сигнал"),
    lead: b(
      "EPIRB 406 MHz identyfikuje jednostke i uruchamia lancuch satelitarny. GNSS moze dolaczyc pozycje, satelity polarne moga wyznaczyc ja z efektu Dopplera, a 121,5 MHz pomaga ratownikom na ostatnim odcinku.",
      "EPIRB 406 МГц идентифицирует судно и запускает спутниковую цепочку. GNSS может добавить позицию, полярные спутники способны определить ее по эффекту Доплера, а 121,5 МГц помогает спасателям на последнем участке.",
    ),
    situation: b(
      "Jacht tonie poza zasiegiem VHF. EPIRB z aktualna rejestracja przekazuje identyfikator i pozycje, dzieki czemu RCC moze sprawdzic dane jednostki i kontakt alarmowy.",
      "Яхта тонет вне зоны VHF. Зарегистрированный EPIRB передает идентификатор и позицию, поэтому RCC может проверить данные судна и аварийный контакт.",
    ),
    why: b(
      "406 MHz zapewnia stabilny cyfrowy alarm i identyfikacje, ale nie sluzy ekipie smiglowca do precyzyjnego podejscia. Dlatego system laczy alarm satelitarny, dane rejestracyjne, lokalizacje GNSS lub Doppler i sygnal naprowadzajacy 121,5 MHz.",
      "406 МГц дает надежный цифровой сигнал и идентификацию, но не служит вертолету для точного захода. Поэтому система объединяет спутниковый сигнал, регистрацию, позицию GNSS или Доплер и приводной сигнал 121,5 МГц.",
    ),
    concepts: [
      {
        title: b("LEOSAR, GEOSAR, MEOSAR", "LEOSAR, GEOSAR, MEOSAR"),
        body: b("Rozne orbity daja rozny czas wykrycia i sposob lokalizacji. GEOSAR widzi duzy obszar stale, LEOSAR wykorzystuje ruch satelity, MEOSAR laczy wiele satelitow na srednich orbitach.", "Разные орбиты дают разное время обнаружения и способ локализации. GEOSAR постоянно видит большой район, LEOSAR использует движение спутника, MEOSAR объединяет спутники средних орбит."),
      },
      {
        title: b("LUT, MCC, RCC", "LUT, MCC, RCC"),
        body: b("LUT odbiera i przetwarza sygnal, MCC dystrybuuje dane, RCC koordynuje ratownictwo.", "LUT принимает и обрабатывает сигнал, MCC распределяет данные, RCC координирует спасение."),
      },
      {
        title: b("Rejestracja", "Регистрация"),
        body: b("Kod radioplaway laczy alarm z jednostka. Nieaktualny wlasciciel lub telefon opoznia weryfikacje.", "Код буя связывает сигнал с судном. Неактуальный владелец или телефон задерживают проверку."),
      },
    ],
    steps: [
      b("Zabierz EPIRB z jednostki lub pozwol mu zwolnic sie automatycznie zgodnie z instrukcja.", "Возьми EPIRB с судна или дай ему освободиться автоматически по инструкции."),
      b("Uruchom i umiesc pionowo z czystym widokiem nieba.", "Включи и установи вертикально с открытым обзором неба."),
      b("Nie trzymaj aktywnej anteny pod metalem ani blisko ciala.", "Не держи активную антенну под металлом или вплотную к телу."),
      b("Po falszywym alarmie wylacz urzadzenie i natychmiast powiadom RCC.", "После ложного сигнала выключи устройство и немедленно сообщи RCC."),
    ],
    allowed: [
      b("Testuj tylko funkcja SELF TEST w terminie i warunkach producenta.", "Проверяй только функцией SELF TEST в разрешенное производителем время."),
      b("Aktualizuj rejestracje po zmianie wlasciciela, nazwy lub kontaktu.", "Обновляй регистрацию после смены владельца, названия или контакта."),
    ],
    forbidden: [
      b("Nie wykonuj testu przez prawdziwa aktywacje alarmu.", "Не проверяй устройство реальным аварийным включением."),
      b("Nie wracaj po EPIRB, jesli zagroziloby to ludziom opuszczajacym jednostke.", "Не возвращайся за EPIRB, если это угрожает покидающим судно людям."),
    ],
    exam: b(
      "406 MHz przenosi zakodowany identyfikator, 121,5 MHz sluzy do naprowadzania. Typowy wymagany czas nadawania EPIRB to co najmniej 48 godzin.",
      "406 МГц передает закодированный идентификатор, 121,5 МГц используется для наведения. Типичное требование к EPIRB: не менее 48 часов передачи.",
    ),
    practice: b(
      "Dokladny sposob aktywacji, testu i mocowania zalezy od modelu. Czytaj oznaczenia na obudowie i instrukcje hydrostatu.",
      "Точный способ включения, теста и крепления зависит от модели. Читай маркировку на корпусе и инструкцию гидростата.",
    ),
    world: b(
      "COSPAS-SARSAT jest globalny, ale rejestr beaconow i kontakt do odwolania falszywego alarmu prowadzi administracja krajowa.",
      "COSPAS-SARSAT глобален, но реестр буев и контакт для отмены ложного сигнала определяет национальная администрация.",
    ),
    questionTopics: [
      b("406 i 121,5 MHz", "406 и 121,5 МГц"),
      b("LEOSAR, GEOSAR, LUT i MCC", "LEOSAR, GEOSAR, LUT и MCC"),
      b("rejestracja, test i falszywy alarm", "регистрация, тест и ложный сигнал"),
    ],
    sourceIds: ["uke", "cospas", "imo1658"],
    practiceHref: "/radio/test?chapter=epirb",
    practiceLabel: b("Sprawdz pytania EPIRB", "Проверить вопросы EPIRB"),
    minutes: 26,
  },
  {
    id: "sart",
    number: 0,
    diagram: "sart",
    title: b("Radar SART: dwanascie sladow do tratwy", "Radar SART: двенадцать отметок к плоту"),
    eyebrow: b("Lokalizacja przez radar X-band", "Поиск радаром X-band"),
    lead: b(
      "Radar SART nie wysyla stale pozycji. Czeka na impuls radaru 9 GHz, odpowiada seria przemiatan i tworzy na ekranie charakterystyczny lancuch 12 znakow.",
      "Radar SART не передает позицию постоянно. Он ждет импульс радара 9 ГГц, отвечает серией перестроек и создает на экране характерную цепочку из 12 отметок.",
    ),
    situation: b(
      "Statek ratowniczy zbliza sie do tratwy. Najpierw widzi 12 kropek, potem kropki przechodza w luki, a bardzo blisko w niemal pelne okregi.",
      "Спасательное судно приближается к плоту. Сначала видны 12 точек, затем они превращаются в дуги, а совсем близко почти в окружности.",
    ),
    why: b(
      "SART przemiata cale pasmo radaru X-band. Kolejne czestotliwosci pojawiaja sie na roznych odleglosciach ekranu, dlatego odpowiedz wyglada jak uporzadkowany szereg, a nie pojedyncze echo.",
      "SART перестраивается по всему диапазону радара X-band. Разные частоты отображаются на разных дальностях, поэтому ответ выглядит как упорядоченный ряд, а не одно эхо.",
    ),
    concepts: [
      {
        title: b("9,2-9,5 GHz", "9,2-9,5 ГГц"),
        body: b("SART wspolpracuje z radarem pasma X, nie z radarem S-band 3 GHz.", "SART работает с радаром X-band, а не с S-band 3 ГГц."),
      },
      {
        title: b("Kropki, luki, okregi", "Точки, дуги, окружности"),
        body: b("Zmiana ksztaltu oznacza rosnaca sile odpowiedzi przy zblizaniu, a nie trzy rozne tryby SART.", "Изменение формы означает усиление ответа при сближении, а не три разных режима SART."),
      },
      {
        title: b("Wysokosc", "Высота"),
        body: b("Tak jak przy VHF, podniesienie anteny poprawia horyzont radiowy i zasieg wykrycia.", "Как и у VHF, поднятие антенны увеличивает радиогоризонт и дальность обнаружения."),
      },
    ],
    steps: [
      b("Po opuszczeniu jednostki wlacz SART zgodnie z instrukcja.", "После оставления судна включи SART по инструкции."),
      b("Umiesc go pionowo i co najmniej metr nad woda, jesli to mozliwe.", "Установи вертикально и по возможности не ниже метра над водой."),
      b("Obserwuj sygnal aktywacji lub pobudzenia przez radar.", "Следи за индикацией включения или облучения радаром."),
      b("Na radarze ratowniczym uzyj X-band i dostroj rain clutter, aby odzyskac czytelne kropki.", "На спасательном радаре используй X-band и настрой rain clutter, чтобы вернуть четкие точки."),
    ],
    allowed: [
      b("Podnies SART na maszcie tratwy lub innym stabilnym wsporniku.", "Подними SART на стойке плота или другом устойчивом креплении."),
      b("Zachowaj baterie na realna sytuacje, wykonuj tylko dopuszczony self test.", "Береги батарею для реальной аварии, выполняй только разрешенный self test."),
    ],
    forbidden: [
      b("Nie kladz SART poziomo na dnie tratwy.", "Не клади SART горизонтально на дно плота."),
      b("Nie szukaj odpowiedzi SART na radarze S-band.", "Не ищи ответ SART на радаре S-band."),
    ],
    exam: b(
      "Radar SART odpowiada w pasmie 9,2-9,5 GHz. Typowy obraz to 12 kropek, przy zblizaniu luki i okregi. Wymaganie baterii: 96 godzin czuwania i 8 godzin odpowiedzi.",
      "Radar SART отвечает в диапазоне 9,2-9,5 ГГц. Типичное изображение: 12 точек, при сближении дуги и окружности. Батарея: 96 часов ожидания и 8 часов ответа.",
    ),
    practice: b(
      "Deklarowany zasieg zalezy od wysokosci SART, anteny radaru, morza i samolotu. Wysokosc jest praktycznym narzedziem, nie detalem egzaminacyjnym.",
      "Дальность зависит от высоты SART, антенны радара, моря и самолета. Высота это практический инструмент, а не только экзаменационная цифра.",
    ),
    world: b(
      "Charakterystyka SART jest miedzynarodowa. Rozmieszczenie na konkretnym statku i obowiazek posiadania wynikaja z przepisow jego bandery i klasy.",
      "Характеристики SART международные. Размещение на судне и обязательность зависят от флага и класса.",
    ),
    questionTopics: [
      b("radar X-band", "радар X-band"),
      b("12 kropek, luki i okregi", "12 точек, дуги и окружности"),
      b("zasieg, wysokosc i bateria", "дальность, высота и батарея"),
    ],
    sourceIds: ["uke", "m628", "cept"],
    practiceHref: "/radio/test?chapter=sart",
    practiceLabel: b("Sprawdz pytania Radar SART", "Проверить вопросы Radar SART"),
    minutes: 22,
  },
  {
    id: "ais-sart",
    number: 0,
    diagram: "ais-sart",
    title: b("AIS-SART: cel ratunkowy na ekranie AIS", "AIS-SART: спасательная цель на экране AIS"),
    eyebrow: b("Nie myl go z echem radarowym", "Не путай с радиолокационной отметкой"),
    lead: b(
      "AIS-SART wykorzystuje kanaly AIS i wlasne zrodlo pozycji. Odbiornik AIS pokazuje specjalny cel ratunkowy, jego identyfikator i pozycje. Radar bez AIS go nie zobaczy.",
      "AIS-SART использует каналы AIS и собственный источник позиции. Приемник AIS показывает специальную спасательную цель, ее идентификатор и координаты. Радар без AIS ее не увидит.",
    ),
    situation: b(
      "Na ploterze pojawia sie okrag z krzyzem i identyfikator zaczynajacy sie od 970. To nie zwykly statek AIS, lecz nadajnik ratunkowy wymagajacy natychmiastowej oceny.",
      "На плоттере появляется круг с крестом и идентификатор, начинающийся с 970. Это не обычное судно AIS, а спасательный передатчик, требующий немедленной оценки.",
    ),
    why: b(
      "Radar SART odpowiada na fale radaru, a AIS-SART sam nadaje cyfrowe raporty VHF z pozycja. Oba prowadza do rozbitkow, ale uzywaja innych odbiornikow i innych symboli.",
      "Radar SART отвечает на импульсы радара, а AIS-SART самостоятельно передает цифровые VHF-отчеты с позицией. Оба ведут к пострадавшим, но используют разные приемники и обозначения.",
    ),
    concepts: [
      {
        title: b("Identyfikator 970", "Идентификатор 970"),
        body: b("Pierwsze trzy cyfry 970 oznaczaja AIS-SART. Kolejne cyfry identyfikuja konkretne urzadzenie.", "Первые три цифры 970 обозначают AIS-SART. Остальные идентифицируют устройство."),
      },
      {
        title: b("Symbol", "Символ"),
        body: b("Nowszy ekran moze pokazac okrag z krzyzem. Starszy moze przedstawic zwykly trojkat celu AIS.", "Новый экран может показать круг с крестом. Старый может отобразить обычный треугольник AIS-цели."),
      },
      {
        title: b("Raport pozycji", "Отчет о позиции"),
        body: b("Wlasny GNSS dostarcza aktualna pozycje. AIS-SART nie przekazuje rozbudowanej historii zdarzenia.", "Собственный GNSS дает текущую позицию. AIS-SART не передает подробную историю происшествия."),
      },
    ],
    steps: [
      b("Wlacz AIS-SART po opuszczeniu jednostki.", "Включи AIS-SART после оставления судна."),
      b("Podnies antene co najmniej metr nad woda, jesli konstrukcja na to pozwala.", "Подними антенну не менее чем на метр над водой, если позволяет конструкция."),
      b("Na jednostce ratowniczej potwierdz symbol, identyfikator 970 i pozycje.", "На спасательном судне проверь символ, идентификатор 970 и позицию."),
      b("Kieruj sie do pozycji, utrzymuj obserwacje wzrokowa i radarowa.", "Иди к позиции, продолжая визуальное и радиолокационное наблюдение."),
    ],
    allowed: [
      b("Traktuj alarm AIS-SART jako cel ratunkowy, nie zwykly ruch AIS.", "Рассматривай AIS-SART как спасательную цель, а не обычный AIS-трафик."),
      b("Sprawdz sposob prezentacji na konkretnym ploterze przed rejsem.", "До рейса проверь, как цель показывается на конкретном плоттере."),
    ],
    forbidden: [
      b("Nie oczekuj 12 kropek na ekranie radaru.", "Не ожидай 12 точек на экране радара."),
      b("Nie zakladaj, ze brak specjalnego symbolu oznacza brak sygnalu na starszym AIS.", "Не считай, что отсутствие специального символа означает отсутствие сигнала на старом AIS."),
    ],
    exam: b(
      "AIS-SART wspolpracuje z AIS, identyfikator zaczyna sie od 970, a uzgodniony symbol to okrag z krzyzem. Nie tworzy echa na radarze.",
      "AIS-SART работает с AIS, идентификатор начинается с 970, согласованный символ это круг с крестом. Радиолокационной отметки он не создает.",
    ),
    practice: b(
      "Minimalny zasieg zalezy od wysokosci anten obu stron. Samolot na 1000 m moze wykryc sygnal znacznie dalej niz antena malej jednostki.",
      "Минимальная дальность зависит от высоты обеих антенн. Самолет на 1000 м может обнаружить сигнал намного дальше, чем малая лодка.",
    ),
    world: b(
      "Standard AIS-SART jest miedzynarodowy, ale sposob alarmowania i wyglad celu zalezy od wersji odbiornika, plotera i jego oprogramowania.",
      "Стандарт AIS-SART международный, но сигнализация и вид цели зависят от приемника, плоттера и его программного обеспечения.",
    ),
    questionTopics: [
      b("identyfikator 970", "идентификатор 970"),
      b("symbol okregu z krzyzem", "символ круга с крестом"),
      b("AIS-SART kontra Radar SART", "AIS-SART против Radar SART"),
    ],
    sourceIds: ["uke", "ais-sart", "cept"],
    practiceHref: "/radio/test?chapter=ais-sart",
    practiceLabel: b("Sprawdz pytania AIS-SART", "Проверить вопросы AIS-SART"),
    minutes: 18,
  },
];
