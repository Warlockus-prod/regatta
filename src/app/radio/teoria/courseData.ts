import { CHAPTER_QUESTION_IDS, THEORY_ORDER, type TheoryChapterId } from "./courseMap";
import { SUPPLEMENTAL_THEORY_CHAPTERS } from "./courseSupplement";

export interface BiText {
  pl: string;
  ru: string;
}

export type DiagramId =
  | "system"
  | "horizon"
  | "controls"
  | "channels"
  | "identity"
  | "routine"
  | "dsc"
  | "priority"
  | "mayday"
  | "receive"
  | "power"
  | "smcp"
  | "navtex"
  | "epirb"
  | "sart"
  | "ais-sart"
  | "gmdss"
  | "world";

export interface TheoryConcept {
  title: BiText;
  body: BiText;
}

export interface TheoryChapter {
  id: string;
  number: number;
  diagram: DiagramId;
  title: BiText;
  eyebrow: BiText;
  lead: BiText;
  situation: BiText;
  why: BiText;
  concepts: TheoryConcept[];
  steps: BiText[];
  allowed: BiText[];
  forbidden: BiText[];
  exam: BiText;
  practice: BiText;
  world: BiText;
  questionTopics: BiText[];
  sourceIds: string[];
  practiceHref: string;
  practiceLabel: BiText;
  minutes: number;
  questionIds?: string[];
}

export interface TheorySource {
  id: string;
  label: string;
  owner: string;
  href: string;
}

const b = (pl: string, ru: string): BiText => ({ pl, ru });

export const THEORY_SOURCES: TheorySource[] = [
  {
    id: "uke",
    owner: "UKE",
    label: "Swiadectwa morskie, zasady egzaminu i materialy SRC",
    href: "https://bip.uke.gov.pl/swiadectwa-operatora-urzadzen-radiowych-tresci/swiadectwa-morskie-i-zeglugi-srodladowej%2C4.html",
  },
  {
    id: "cept",
    owner: "CEPT",
    label: "ERC Decision (99)01, harmonised SRC syllabus",
    href: "https://docdb.cept.org/download/3975",
  },
  {
    id: "m541",
    owner: "ITU",
    label: "ITU-R M.541, operational procedures for DSC",
    href: "https://www.itu.int/rec/R-REC-M.541/en",
  },
  {
    id: "m493",
    owner: "ITU",
    label: "ITU-R M.493, DSC system characteristics",
    href: "https://www.itu.int/rec/R-REC-M.493-16-202312-I/_page.print",
  },
  {
    id: "imo1657",
    owner: "IMO",
    label: "MSC.1/Circ.1657, procedure after receiving a VHF DSC distress alert",
    href: "https://wwwcdn.imo.org/localresources/en/OurWork/Safety/Documents/Documents%20relevant%20to%20GMDSS/MSC.1-Circ.1657.pdf",
  },
  {
    id: "imo1658",
    owner: "IMO",
    label: "MSC.1/Circ.1658, distress alert operating guidance",
    href: "https://wwwcdn.imo.org/localresources/en/OurWork/Safety/Documents/Documents%20relevant%20to%20GMDSS/MSC.1-Circ.1658.pdf",
  },
  {
    id: "smcp",
    owner: "IMO",
    label: "Standard Marine Communication Phrases",
    href: "https://www.imo.org/en/ourwork/safety/pages/standardmarinecommunicationphrases.aspx",
  },
  {
    id: "appendix18",
    owner: "ITU",
    label: "Radio Regulations Appendix 18, maritime VHF channels",
    href: "https://www.itu.int/en/ITU-R/conferences/wrc/2019/Documents/PFA-WRC19-E.pdf",
  },
  {
    id: "rainwat",
    owner: "CEPT",
    label: "RAINWAT regional arrangement for inland waterways",
    href: "https://docdb.cept.org/download/3742",
  },
  {
    id: "uscg",
    owner: "USCG",
    label: "VHF radio checks and DSC test calls in the United States",
    href: "https://navcen.uscg.gov/performing-vhf-marine-radio-check",
  },
  {
    id: "acma",
    owner: "ACMA",
    label: "Australian marine radio protocols and procedures",
    href: "https://www.acma.gov.au/marine-radio-protocols-and-procedures",
  },
  {
    id: "navtex",
    owner: "IMO",
    label: "MSC.1/Circ.1403/Rev.2, NAVTEX Manual",
    href: "https://www.imo.org/en/ourwork/safety/pages/imo-circulars-related-to-the-gmdss.aspx",
  },
  {
    id: "cospas",
    owner: "COSPAS-SARSAT",
    label: "406 MHz beacon system and operational documentation",
    href: "https://www.cospas-sarsat.int/en/system-overview/cospas-sarsat-system",
  },
  {
    id: "m628",
    owner: "ITU",
    label: "ITU-R M.628, technical characteristics for radar SART",
    href: "https://www.itu.int/rec/R-REC-M.628-5-201203-I/en",
  },
  {
    id: "ais-sart",
    owner: "IMO",
    label: "MSC.246(83) and SN.1/Circ.322, AIS-SART performance and display",
    href: "https://wwwcdn.imo.org/localresources/en/OurWork/Safety/Documents/IMO%20Documents%20related%20to/SN.1-Circ.322.pdf",
  },
];

const CORE_THEORY_CHAPTERS: TheoryChapter[] = [
  {
    id: "system",
    number: 1,
    diagram: "system",
    title: b("Jak dziala caly system", "Как устроена вся система"),
    eyebrow: b("Najpierw mapa, potem przyciski", "Сначала карта, потом кнопки"),
    lead: b(
      "Radio jachtu nie laczy sie z abstrakcyjnym eterem. Laczy ludzi na jednostkach, stacje brzegowe i sluzby ratownicze w jeden lancuch.",
      "Рация яхты связывает не с абстрактным эфиром, а объединяет суда, береговые станции и спасательные службы в одну цепочку.",
    ),
    situation: b(
      "Na jachcie jest pozar. Alarm cyfrowy trafia przez kanal 70 do statkow i stacji brzegowej. Glosowy MAYDAY na 16 wyjasnia sytuacje. Stacja brzegowa przekazuje dane do RCC, ktore koordynuje SAR.",
      "На яхте пожар. Цифровой сигнал по каналу 70 получают суда и берег. Голосовой MAYDAY на 16 объясняет ситуацию. Берег передаёт данные в RCC, которое координирует SAR.",
    ),
    why: b(
      "Jeden kanal i jeden operator nie wystarcza. System rozdziela szybkie alarmowanie, rozmowe i koordynacje, aby informacja nie zginela, gdy zaloga jest pod presja.",
      "Одного канала и одного оператора недостаточно. Система разделяет быстрый сигнал, разговор и координацию, чтобы информация не потерялась под давлением.",
    ),
    concepts: [
      {
        title: b("VHF", "VHF"),
        body: b("Krotkozasiagowa lacznosc glosowa i cyfrowa w morskim pasmie 156-174 MHz.", "Связь голосом и цифровыми сообщениями на морских частотах 156-174 МГц."),
      },
      {
        title: b("GMDSS", "GMDSS"),
        body: b("Globalny zestaw procedur, urzadzen i sluzb, a nie pojedyncze radio.", "Глобальный набор процедур, оборудования и служб, а не одна рация."),
      },
      {
        title: b("RCC i SAR", "RCC и SAR"),
        body: b("RCC koordynuje akcje, a jednostki SAR wykonuja poszukiwanie i ratowanie.", "RCC координирует операцию, а силы SAR выполняют поиск и спасение."),
      },
    ],
    steps: [
      b("Alarm cyfrowy przekazuje tozsamosc i pozycje.", "Цифровой сигнал передаёт идентификатор и позицию."),
      b("Lacznosc glosowa opisuje zagrozenie i potrzebna pomoc.", "Голосом сообщают угрозу и требуемую помощь."),
      b("RCC zbiera informacje, ustala plan i kieruje sily SAR.", "RCC собирает данные, строит план и направляет силы SAR."),
    ],
    allowed: [
      b("Traktuj radio, DSC, EPIRB i SAR jako jeden system.", "Рассматривай рацию, DSC, EPIRB и SAR как единую систему."),
      b("Po alarmie pozostan na nasluchu i wykonuj polecenia koordynatora.", "После сигнала оставайся на приёме и выполняй указания координатора."),
    ],
    forbidden: [
      b("Nie zakladaj, ze samo nacisniecie DISTRESS przekazalo pelny obraz sytuacji.", "Не считай, что кнопка DISTRESS передала полную картину."),
      b("Nie wylaczaj radia po wyslaniu alarmu.", "Не выключай рацию после отправки сигнала."),
    ],
    exam: b(
      "Zapamietaj role: kanal 70 to DSC, kanal 16 to fonia alarmowa, RCC koordynuje akcje SAR.",
      "Запомни роли: канал 70 для DSC, канал 16 для аварийной голосовой связи, RCC координирует SAR.",
    ),
    practice: b(
      "Na prawdziwym jachcie przed wyjsciem sprawdz, czy DSC ma poprawny MMSI i aktualna pozycje z GPS.",
      "На настоящей яхте до выхода проверь MMSI в DSC и актуальную позицию от GPS.",
    ),
    world: b(
      "Rdzen GMDSS jest miedzynarodowy. Numery sluzb, nazwy stacji brzegowych i pokrycie radiowe sa lokalne.",
      "Основа GMDSS международная. Номера служб, названия береговых станций и покрытие зависят от страны.",
    ),
    questionTopics: [
      b("GMDSS i SAR", "GMDSS и SAR"),
      b("kanaly 70 i 16", "каналы 70 и 16"),
      b("stacje brzegowe", "береговые станции"),
    ],
    sourceIds: ["uke", "cept", "m541"],
    practiceHref: "/radio/symulator",
    practiceLabel: b("Zobacz alarm w symulatorze", "Посмотреть сигнал в симуляторе"),
    minutes: 9,
  },
  {
    id: "horizon",
    number: 2,
    diagram: "horizon",
    title: b("Dlaczego VHF ma horyzont", "Почему у VHF есть горизонт"),
    eyebrow: b("Fizyka zasiegu", "Физика дальности"),
    lead: b(
      "Morski VHF rozchodzi sie prawie jak swiatlo. Wysokosc anteny zwykle daje wiecej niz dodatkowe waty.",
      "Морской VHF распространяется почти как свет. Высота антенны обычно даёт больше, чем дополнительные ватты.",
    ),
    situation: b(
      "Reczne radio z kokpitu nie slyszy mariny, ale radio stacjonarne z antena na topie masztu laczy sie bez problemu.",
      "Портативная рация из кокпита не слышит марину, а стационарная с антенной на мачте связывается без проблем.",
    ),
    why: b(
      "Krzywizna Ziemi zaslania niskie anteny. Przyblizenie dla dwoch anten to d[km] = 4,12 x (pierwiastek h1 + pierwiastek h2), gdzie wysokosci sa w metrach.",
      "Кривизна Земли скрывает низкие антенны. Приближённо d[км] = 4,12 x (корень h1 + корень h2), высоты в метрах.",
    ),
    concepts: [
      {
        title: b("Czestotliwosc i fala", "Частота и волна"),
        body: b("VHF to 30-300 MHz. Przy 156 MHz dlugosc fali wynosi okolo 1,9 m: lambda = 300 / f.", "VHF это 30-300 МГц. На 156 МГц длина волны около 1,9 м: lambda = 300 / f."),
      },
      {
        title: b("Wysokosc anteny", "Высота антенны"),
        body: b("Podniesienie anteny odslania wiekszy fragment powierzchni morza.", "Поднятая антенна видит большую часть поверхности моря."),
      },
      {
        title: b("Moc", "Мощность"),
        body: b("25 W wzmacnia sygnal w obrebie widocznosci radiowej, ale zwykle nie przeskoczy horyzontu.", "25 Вт усиливают сигнал в пределах радиовидимости, но обычно не перепрыгивают горизонт."),
      },
    ],
    steps: [
      b("Najpierw wybierz najwyzsza sprawna antene.", "Сначала выбери самую высокую исправную антенну."),
      b("Uzyj 1 W na malej odleglosci, jezeli kanal i sytuacja na to pozwalaja.", "На малой дистанции используй 1 Вт, если канал и ситуация позволяют."),
      b("Przejdz na 25 W, gdy sygnal jest za slaby lub sytuacja jest alarmowa.", "Перейди на 25 Вт при слабом сигнале или аварии."),
      b("Jesli nadal brak lacznosci, zmien pozycje, podnies antene lub uzyj przekazu.", "Если связи нет, измени позицию, подними антенну или попроси ретрансляцию."),
    ],
    allowed: [
      b("Trzymaj radio reczne pionowo i mozliwie wysoko.", "Держи портативную рацию вертикально и как можно выше."),
      b("Sprawdz kabel, zlacza i strefy cienia od masztu lub nadbudowki.", "Проверь кабель, разъёмы и тени от мачты или надстройки."),
    ],
    forbidden: [
      b("Nie oczekuj, ze 25 W naprawi uszkodzona antene.", "Не ожидай, что 25 Вт исправят повреждённую антенну."),
      b("Nie montuj anteny nisko obok duzych elementow metalowych.", "Не ставь антенну низко рядом с крупными металлическими деталями."),
    ],
    exam: b(
      "Zasieg VHF zalezy przede wszystkim od wysokosci anten. Maksymalna moc typowego radia statkowego to 25 W, z redukcja do 1 W.",
      "Дальность VHF прежде всего зависит от высоты антенн. Типичная судовая рация имеет максимум 25 Вт и режим 1 Вт.",
    ),
    practice: b(
      "Kanal i lokalne przepisy decyduja o mocy. Zasada nie brzmi po prostu «port 1 W, morze 25 W». Uzyj najmniejszej skutecznej mocy.",
      "Мощность определяется каналом и местными правилами. Правило не сводится к «в порту 1 Вт, в море 25 Вт». Используй минимальную эффективную мощность.",
    ),
    world: b(
      "Fizyka jest wszedzie taka sama, ale administracje moga ograniczac moc na konkretnych kanalach.",
      "Физика одинакова везде, но страны могут ограничивать мощность на отдельных каналах.",
    ),
    questionTopics: [
      b("pasmo i dlugosc fali", "диапазон и длина волны"),
      b("zasieg radiowy", "дальность связи"),
      b("moc i antena", "мощность и антенна"),
    ],
    sourceIds: ["uke", "cept", "appendix18"],
    practiceHref: "/radio/obsluga",
    practiceLabel: b("Przecwicz ustawienie radia", "Отработать настройку рации"),
    minutes: 12,
  },
  {
    id: "controls",
    number: 3,
    diagram: "controls",
    title: b("Radio bez magii: elementy sterowania", "Рация без магии: органы управления"),
    eyebrow: b("Co zmienia kazde pokretlo", "Что меняет каждая ручка"),
    lead: b(
      "Operator nie powinien szukac przyciskow w chwili alarmu. Najpierw rozumie funkcje, potem uczy sie ukladu konkretnego modelu.",
      "Оператор не должен искать кнопки во время аварии. Сначала нужно понять функции, затем расположение на конкретной модели.",
    ),
    situation: b(
      "Slyszysz tylko szum. Zbyt nisko ustawiony squelch otwiera glosnik, a zbyt wysoko ustawiony moze ukryc slaby MAYDAY.",
      "Слышен только шум. Слишком низкий squelch открывает динамик, а слишком высокий может скрыть слабый MAYDAY.",
    ),
    why: b(
      "Volume steruje glosnoscia po odebraniu sygnalu. Squelch ustala prog, od ktorego radio otwiera tor audio. To dwa rozne zadania.",
      "Volume задаёт громкость принятого сигнала. Squelch задаёт порог открытия звука. Это разные функции.",
    ),
    concepts: [
      {
        title: b("PTT", "PTT"),
        body: b("Push To Talk: nacisnij, odczekaj chwile, mow, zwolnij, aby sluchac.", "Push To Talk: нажми, выдержи паузу, говори, отпусти для приёма."),
      },
      {
        title: b("16/C i HI/LO", "16/C и HI/LO"),
        body: b("16/C szybko wraca na kanal 16. HI/LO wybiera moc wysoka lub niska, jesli kanal pozwala.", "16/C быстро возвращает на канал 16. HI/LO выбирает высокую или низкую мощность, если канал позволяет."),
      },
      {
        title: b("Dual Watch i Scan", "Dual Watch и Scan"),
        body: b("Dual Watch kontroluje 16 i jeden kanal roboczy. Scan przeglada zaprogramowana liste.", "Dual Watch слушает 16 и один рабочий канал. Scan перебирает список каналов."),
      },
    ],
    steps: [
      b("Wlacz radio i ustaw czytelna glosnosc.", "Включи рацию и поставь понятную громкость."),
      b("Otworz squelch do szumu, potem podnos prog tylko do chwili wyciszenia.", "Открой squelch до шума, затем подними лишь до исчезновения шума."),
      b("Sprawdz INT, kanal, moc i pozycje GPS.", "Проверь INT, канал, мощность и позицию GPS."),
      b("Przed nadaniem nasluchuj, potem uzyj PTT.", "Перед передачей послушай эфир, затем нажми PTT."),
    ],
    allowed: [
      b("Po zmianie modelu radia znajdz DISTRESS, 16/C, PTT, HI/LO i menu DSC.", "На новой модели найди DISTRESS, 16/C, PTT, HI/LO и меню DSC."),
      b("Przed rejsem wykonaj test bez generowania falszywego alarmu.", "До рейса проведи проверку без ложного сигнала бедствия."),
    ],
    forbidden: [
      b("Nie testuj DISTRESS przez prawdziwe wyslanie alarmu.", "Не проверяй DISTRESS реальной отправкой сигнала."),
      b("Nie ustawiaj squelch tak wysoko, aby znikaly slabe stacje.", "Не ставь squelch настолько высоко, что исчезают слабые станции."),
    ],
    exam: b(
      "Rozrozniaj volume, squelch, dual watch, scan, PTT, 16/C oraz HI/LO. Egzamin praktyczny moze uzywac roznych modeli radia.",
      "Различай volume, squelch, dual watch, scan, PTT, 16/C и HI/LO. На практике могут быть разные модели.",
    ),
    practice: b(
      "Kolejnosc menu jest cecha modelu, a nie przepisem radiowym. Naucz sie celu operacji, potem sciezki w IC-M330 i IC-M323.",
      "Порядок меню зависит от модели, а не от правил связи. Сначала пойми цель, потом путь в IC-M330 и IC-M323.",
    ),
    world: b(
      "Nazwy funkcji sa podobne, ale skroty i uklad klawiszy roznia sie miedzy producentami.",
      "Названия функций похожи, но сокращения и кнопки различаются у производителей.",
    ),
    questionTopics: [
      b("squelch i glosnosc", "squelch и громкость"),
      b("dual watch", "dual watch"),
      b("moc i PTT", "мощность и PTT"),
    ],
    sourceIds: ["uke", "cept", "m493"],
    practiceHref: "/radio/obsluga",
    practiceLabel: b("Otworz kurs obslugi", "Открыть курс управления"),
    minutes: 11,
  },
  {
    id: "channels",
    number: 4,
    diagram: "channels",
    title: b("Kanaly to role, nie numery", "Каналы это роли, а не номера"),
    eyebrow: b("Simplex, duplex i dyscyplina", "Симплекс, дуплекс и дисциплина"),
    lead: b(
      "Numer kanalu oznacza uzgodniona pare czestotliwosci i przeznaczenie. Nie kazdy kanal jest wspolnym pokojem do dowolnej rozmowy.",
      "Номер канала означает согласованные частоты и назначение. Не каждый канал подходит для любого разговора.",
    ),
    situation: b(
      "Wywolujesz marine na 16, po odpowiedzi obie strony przechodza na wskazany kanal roboczy. Kanal 16 pozostaje wolny dla alarmow.",
      "Ты вызываешь марину на 16, после ответа обе стороны переходят на рабочий канал. Канал 16 остаётся свободным для аварий.",
    ),
    why: b(
      "Wspolne kanaly wywolawcze dzialaja tylko wtedy, gdy rozmowy sa krotkie. Dluzsza korespondencje przenosi sie na kanal roboczy.",
      "Общие вызывные каналы работают, только если разговоры короткие. Длинную связь переносят на рабочий канал.",
    ),
    concepts: [
      {
        title: b("Simplex", "Симплекс"),
        body: b("Ta sama czestotliwosc w obie strony. Mowi jedna stacja, druga slucha.", "Одна частота в обе стороны. Одна станция говорит, другая слушает."),
      },
      {
        title: b("Duplex", "Дуплекс"),
        body: b("Rozne czestotliwosci nadawania i odbioru, typowo w lacznosci ze stacja brzegowa.", "Разные частоты передачи и приёма, обычно при связи с береговой станцией."),
      },
      {
        title: b("Najwazniejsze role", "Главные роли"),
        body: b("70 DSC, 16 distress i wywolanie, 13 bezpieczenstwo mostek-mostek, 6 statek-statek i SAR.", "70 DSC, 16 бедствие и вызов, 13 безопасность мостик-мостик, 6 судно-судно и SAR."),
      },
    ],
    steps: [
      b("Sprawdz lokalny plan kanalow i rodzaj stacji.", "Проверь местный план каналов и тип станции."),
      b("Nasluchuj przed nadaniem.", "Послушай перед передачей."),
      b("Wywolaj krotko na kanale wywolawczym.", "Коротко вызови на вызывном канале."),
      b("Uzgodnij kanal roboczy i zwolnij kanal wywolawczy.", "Согласуй рабочий канал и освободи вызывной."),
    ],
    allowed: [
      b("Na kanale 70 wysylaj tylko komunikaty DSC.", "На канале 70 передавай только DSC."),
      b("Kanaly 75 i 76 traktuj jako ochronne dla 16, z zastosowaniami i moca ustalonymi przez administracje.", "Каналы 75 и 76 защищают 16, их применение и мощность определяет администрация."),
    ],
    forbidden: [
      b("Nie prowadz fonii na 70.", "Не говори голосом на 70."),
      b("Nie blokuj 16 rozmowa, ktora moze przejsc na kanal roboczy.", "Не занимай 16 разговором, который можно перенести."),
    ],
    exam: b(
      "Kanal 17 ma czestotliwosc 156,850 MHz, a kanal 15 ma 156,750 MHz. Kanaly 75 i 76 nie sa zwyklymi kanalami korespondencji publicznej.",
      "Канал 17 имеет 156,850 МГц, а канал 15 156,750 МГц. Каналы 75 и 76 не являются обычными каналами публичной связи.",
    ),
    practice: b(
      "Nie ucz sie listy bez kontekstu. Zawsze pytaj: kogo wolam, po co, czy kanal jest simplex, i jaka moc jest dozwolona.",
      "Не учи список без контекста. Всегда спрашивай: кого вызываю, зачем, simplex ли канал и какая мощность разрешена.",
    ),
    world: b(
      "INT, USA i Canada moga inaczej wykorzystywac ten sam numer. W Europie wybieraj INT, a lokalny plan portu lub VTS ma pierwszenstwo praktyczne.",
      "INT, USA и Canada могут по-разному использовать один номер. В Европе выбирай INT, а местный план порта или VTS определяет практику.",
    ),
    questionTopics: [
      b("kanaly 6, 13, 16, 70", "каналы 6, 13, 16, 70"),
      b("simplex i duplex", "simplex и duplex"),
      b("plan INT", "план INT"),
    ],
    sourceIds: ["uke", "appendix18", "cept"],
    practiceHref: "/radio/symulator",
    practiceLabel: b("Zmien kanal w symulatorze", "Сменить канал в симуляторе"),
    minutes: 15,
  },
  {
    id: "identity",
    number: 5,
    diagram: "identity",
    title: b("Kto nadaje: nazwa, call sign i MMSI", "Кто передаёт: имя, позывной и MMSI"),
    eyebrow: b("Trzy identyfikatory, trzy zadania", "Три идентификатора, три задачи"),
    lead: b(
      "Czlowiek rozpoznaje nazwe jednostki, sluzby pracuja ze znakiem wywolawczym, a DSC adresuje dziewieciocyfrowy MMSI.",
      "Человек узнаёт имя судна, службы работают с позывным, а DSC адресует девятизначный MMSI.",
    ),
    situation: b(
      "Dwa jachty maja podobna nazwe. MMSI jednoznacznie wskazuje stacje w alarmie DSC i laczy ja z danymi rejestracyjnymi.",
      "У двух яхт похожие имена. MMSI однозначно определяет станцию в DSC и связывает её с регистрационными данными.",
    ),
    why: b(
      "Glos bywa znieksztalcony i nazwy sie powtarzaja. Cyfrowy identyfikator zmniejsza niejednoznacznosc, ale dziala tylko wtedy, gdy jest poprawnie zarejestrowany.",
      "Голос искажается, а названия повторяются. Цифровой идентификатор снижает неоднозначность, но только при правильной регистрации.",
    ),
    concepts: [
      {
        title: b("Nazwa jednostki", "Название судна"),
        body: b("Najlatwiejsza do rozpoznania w zwyklej lacznosci glosowej.", "Проще всего распознать в обычной голосовой связи."),
      },
      {
        title: b("Call sign", "Позывной"),
        body: b("Znak wywolawczy przydzielony stacji przez administracje.", "Позывной, назначенный станции администрацией."),
      },
      {
        title: b("MMSI", "MMSI"),
        body: b("9 cyfr uzywanych przez DSC i AIS. Pierwsze cyfry moga zawierac MID zwiazany z administracja.", "9 цифр для DSC и AIS. Начальные цифры могут содержать MID страны."),
      },
    ],
    steps: [
      b("W fonii podaj nazwe lub call sign zgodnie z procedura.", "Голосом назови судно или позывной по процедуре."),
      b("W DSC wybierz poprawny MMSI odbiorcy albo typ All Ships.", "В DSC выбери правильный MMSI адресата или All Ships."),
      b("Literuj trudna nazwe alfabetem fonetycznym.", "Передай сложное имя фонетическим алфавитом."),
    ],
    allowed: [
      b("Miej nazwe, call sign i MMSI zapisane obok radia.", "Держи название, позывной и MMSI рядом с рацией."),
      b("Aktualizuj dane rejestracyjne po zmianie jednostki lub wlasciciela.", "Обновляй регистрацию при смене судна или владельца."),
    ],
    forbidden: [
      b("Nie programuj cudzego MMSI.", "Не программируй чужой MMSI."),
      b("Nie przenos MMSI razem z radiem na inna jednostke bez formalnej zmiany.", "Не переноси MMSI с рацией на другое судно без оформления."),
    ],
    exam: b(
      "MMSI ma 9 cyfr. Fonia uzywa nazwy lub znaku wywolawczego, a DSC uzywa MMSI.",
      "MMSI состоит из 9 цифр. Голос использует имя или позывной, DSC использует MMSI.",
    ),
    practice: b(
      "SRC uprawnia operatora. Pozwolenie radiowe dotyczy stacji i przydziela jej identyfikatory. To dwa osobne dokumenty.",
      "SRC относится к оператору. Разрешение на радиостанцию относится к судну и его идентификаторам. Это разные документы.",
    ),
    world: b(
      "Format MMSI jest miedzynarodowy, ale rejestracje prowadzi administracja krajowa.",
      "Формат MMSI международный, но регистрацию ведёт национальная администрация.",
    ),
    questionTopics: [
      b("MMSI i MID", "MMSI и MID"),
      b("call sign", "позывной"),
      b("SRC i pozwolenie", "SRC и разрешение"),
    ],
    sourceIds: ["uke", "m493", "cept"],
    practiceHref: "/radio/zadania",
    practiceLabel: b("Przecwicz identyfikacje", "Отработать идентификацию"),
    minutes: 10,
  },
  {
    id: "routine",
    number: 6,
    diagram: "routine",
    title: b("Zwykle wywolanie krok po kroku", "Обычный вызов по шагам"),
    eyebrow: b("Krotko, jasno, na zmiane", "Коротко, ясно, по очереди"),
    lead: b(
      "Dobra procedura zmniejsza czas zajecia kanalu i liczbe pytan powtornych. To nie ceremonial, lecz kompresja informacji.",
      "Хорошая процедура сокращает время канала и число повторов. Это не церемония, а сжатие информации.",
    ),
    situation: b(
      "Chcesz poprosic marine o miejsce. Najpierw wywolujesz ja krotko, po odpowiedzi przechodzisz na kanal roboczy i dopiero tam przekazujesz szczegoly.",
      "Нужно запросить место в марине. Сначала короткий вызов, после ответа переход на рабочий канал, детали сообщаются там.",
    ),
    why: b(
      "Na simplexie tylko jedna strona nadaje naraz. Prowords mowia, czy czekasz na odpowiedz, konczysz lacznosc, poprawiasz blad lub prosisz o powtorzenie.",
      "На simplex только одна сторона говорит одновременно. Prowords показывают, ждёшь ли ответ, завершаешь связь, исправляешься или просишь повторить.",
    ),
    concepts: [
      {
        title: b("THIS IS", "THIS IS"),
        body: b("Oddziela stacje wywolywana od stacji, ktora nadaje.", "Отделяет вызываемую станцию от вызывающей."),
      },
      {
        title: b("OVER i OUT", "OVER и OUT"),
        body: b("OVER: skonczylem i czekam. OUT: lacznosc zakonczona. Nie lacz ich.", "OVER: закончил и жду. OUT: связь закончена. Не соединяй их."),
      },
      {
        title: b("SAY AGAIN i CORRECTION", "SAY AGAIN и CORRECTION"),
        body: b("SAY AGAIN prosi o powtorzenie. CORRECTION poprawia wlasny blad.", "SAY AGAIN просит повторить. CORRECTION исправляет свою ошибку."),
      },
    ],
    steps: [
      b("Nasluchuj, czy kanal jest wolny.", "Убедись, что канал свободен."),
      b("Powiedz nazwe odbiorcy, THIS IS, swoja nazwe i OVER.", "Скажи имя адресата, THIS IS, своё имя и OVER."),
      b("Po odpowiedzi uzgodnij kanal roboczy.", "После ответа согласуй рабочий канал."),
      b("Przekaz cel, pozycje lub prosbe w krotkich blokach.", "Передай цель, позицию или просьбу короткими блоками."),
      b("Zakonczenie potwierdz slowem OUT.", "Заверши словом OUT."),
    ],
    allowed: [
      b("Mow wolno, naturalnie, z mikrofonem kilka centymetrow od ust.", "Говори медленно и естественно, микрофон в нескольких сантиметрах от рта."),
      b("Cyfry, litery i pozycje podawaj zgodnie ze standardem.", "Цифры, буквы и координаты передавай по стандарту."),
    ],
    forbidden: [
      b("Nie mow «over and out».", "Не говори «over and out»."),
      b("Nie uzywaj REPEAT jako zwyklej prosby o powtorzenie.", "Не используй REPEAT как обычную просьбу повторить."),
    ],
    exam: b(
      "Znaj kolejnosc wywolania, alfabet fonetyczny, cyfry oraz znaczenie najczestszych prowords.",
      "Знай порядок вызова, фонетический алфавит, цифры и значение основных prowords.",
    ),
    practice: b(
      "Procedura ma pomagac, nie brzmiec robotycznie. Jesli warunki sa trudne, dziel komunikat na mniejsze czesci i potwierdzaj dane krytyczne.",
      "Процедура должна помогать, а не звучать роботизированно. В сложных условиях дели сообщение и подтверждай критичные данные.",
    ),
    world: b(
      "SMCP daje wspolny angielski rdzen. Lokalne porty moga miec wlasne kanaly i formularze zgloszen.",
      "SMCP даёт общий английский. Порты могут иметь свои каналы и форму доклада.",
    ),
    questionTopics: [
      b("wywolanie i odpowiedz", "вызов и ответ"),
      b("prowords", "prowords"),
      b("alfabet fonetyczny", "фонетический алфавит"),
    ],
    sourceIds: ["uke", "smcp", "cept"],
    practiceHref: "/radio/rozmowa",
    practiceLabel: b("Przeprowadz rozmowe", "Провести разговор"),
    minutes: 14,
  },
  {
    id: "dsc",
    number: 7,
    diagram: "dsc",
    title: b("DSC: cyfrowy dzwonek do drzwi", "DSC: цифровой дверной звонок"),
    eyebrow: b("Alarm nie zastepuje rozmowy", "Сигнал не заменяет разговор"),
    lead: b(
      "DSC szybko wybiera adresata, kategorie i kanal. Po zestawieniu kontaktu szczegoly zwykle przekazuje sie fonia.",
      "DSC быстро выбирает адресата, категорию и канал. После установления контакта детали обычно передают голосом.",
    ),
    situation: b(
      "Zamiast wielokrotnie wolac statek po nazwie, wysylasz Individual Call na jego MMSI. Oba radia przechodza na uzgodniony kanal roboczy.",
      "Вместо многократного голосового вызова отправляется Individual Call на MMSI судна. Обе рации переходят на рабочий канал.",
    ),
    why: b(
      "Kanal 70 jest przeznaczony dla krotkich wiadomosci maszynowych. Oddzielenie go od fonii pozwala odbiornikom stale wykrywac alarmy.",
      "Канал 70 предназначен для коротких машинных сообщений. Отделение от голоса позволяет приёмникам постоянно обнаруживать сигналы.",
    ),
    concepts: [
      {
        title: b("Adres", "Адрес"),
        body: b("Individual, Group, All Ships albo distress do wszystkich w zasiegu.", "Individual, Group, All Ships или distress всем в зоне."),
      },
      {
        title: b("Kategoria", "Категория"),
        body: b("Distress, urgency, safety albo routine okresla pierwszenstwo.", "Distress, urgency, safety или routine задаёт приоритет."),
      },
      {
        title: b("Dane pozycji", "Данные позиции"),
        body: b("GPS powinien automatycznie dostarczac pozycje i czas. Bez GPS dane trzeba aktualizowac recznie.", "GPS должен автоматически давать позицию и время. Без GPS данные обновляют вручную."),
      },
    ],
    steps: [
      b("Wybierz rodzaj wywolania i adresata.", "Выбери тип вызова и адресата."),
      b("Wybierz kategorie oraz kanal dalszej fonii, jezeli menu tego wymaga.", "Выбери категорию и канал дальнейшей голосовой связи, если требуется."),
      b("Sprawdz dane przed SEND.", "Проверь данные до SEND."),
      b("Po ACK przejdz do fonii i zidentyfikuj stacje.", "После ACK перейди к голосу и идентифицируй станции."),
    ],
    allowed: [
      b("Testuj DSC funkcja TEST do odpowiedniej stacji lub zgodnie z instrukcja lokalna.", "Проверяй DSC функцией TEST на подходящую станцию или по местной инструкции."),
      b("Bez GPS wprowadzaj pozycje recznie co najmniej co 4 godziny i po istotnej zmianie.", "Без GPS вводи позицию вручную минимум раз в 4 часа и после существенного изменения."),
    ],
    forbidden: [
      b("Nie nadaj glosu na kanale 70.", "Не передавай голос на канале 70."),
      b("Nie uzywaj distress do testu.", "Не используй distress для проверки."),
    ],
    exam: b(
      "Alarm distress DSC zawiera MMSI, pozycje, czas i nature distress, jesli zostala wybrana. Dalszy MAYDAY idzie fonia na 16.",
      "DSC distress содержит MMSI, позицию, время и характер бедствия, если выбран. Далее MAYDAY передают голосом на 16.",
    ),
    practice: b(
      "Gdy menu pozwala wyslac nieokreslony distress szybciej niz wybrac nature, w bezposrednim zagrozeniu nie opozniaj alarmu.",
      "Если неопределённый distress можно отправить быстрее, чем выбирать характер аварии, при непосредственной угрозе не задерживай сигнал.",
    ),
    world: b(
      "W USA dostepny jest test DSC przez siec Rescue 21, a zwykle voice radio check wykonuje sie wedlug lokalnej instrukcji, nie na 16.",
      "В США DSC можно проверять через Rescue 21, а обычный radio check делают по местным правилам, не на 16.",
    ),
    questionTopics: [
      b("kanal 70", "канал 70"),
      b("typy wywolan DSC", "типы вызовов DSC"),
      b("pozycja i ACK", "позиция и ACK"),
    ],
    sourceIds: ["uke", "m493", "m541", "uscg"],
    practiceHref: "/radio/symulator",
    practiceLabel: b("Wyslij wywolanie DSC", "Отправить вызов DSC"),
    minutes: 16,
  },
  {
    id: "priority",
    number: 8,
    diagram: "priority",
    title: b("MAYDAY, PAN PAN czy SECURITE", "MAYDAY, PAN PAN или SECURITE"),
    eyebrow: b("Najpierw skutek, potem etykieta", "Сначала последствия, потом метка"),
    lead: b(
      "Priorytet wybiera sie wedlug zagrozenia, nie wedlug tego, jak dramatycznie brzmi zdarzenie.",
      "Приоритет выбирают по угрозе, а не по тому, насколько драматично звучит событие.",
    ),
    situation: b(
      "Silnik nie dziala. Na otwartym morzu przy dobrej pogodzie moze to byc PAN PAN. Ten sam defekt przy skalistym brzegu i dryfie na skaly staje sie MAYDAY.",
      "Двигатель не работает. В море при хорошей погоде это может быть PAN PAN. У скалистого берега при дрейфе на камни та же поломка становится MAYDAY.",
    ),
    why: b(
      "Sluzby i inne statki musza natychmiast wiedziec, czy istnieje powazne i bezposrednie zagrozenie, pilna potrzeba pomocy, czy tylko wazne ostrzezenie.",
      "Службы и суда должны сразу понимать: есть ли серьёзная непосредственная угроза, срочная нужда в помощи или лишь важное предупреждение.",
    ),
    concepts: [
      {
        title: b("MAYDAY", "MAYDAY"),
        body: b("Powazne i bezposrednie zagrozenie dla osoby, statku lub samolotu oraz potrzeba natychmiastowej pomocy.", "Серьёзная непосредственная угроза человеку, судну или самолёту и необходимость немедленной помощи."),
      },
      {
        title: b("PAN PAN", "PAN PAN"),
        body: b("Pilna wiadomosc dotyczaca bezpieczenstwa, lecz bez spelnienia progu distress.", "Срочное сообщение о безопасности, но без порога distress."),
      },
      {
        title: b("SECURITE", "SECURITE"),
        body: b("Wazne ostrzezenie nawigacyjne lub meteorologiczne.", "Важное навигационное или метеорологическое предупреждение."),
      },
    ],
    steps: [
      b("Zapytaj: czy zycie lub jednostka sa w powaznym i bezposrednim zagrozeniu?", "Спроси: есть серьёзная непосредственная угроза жизни или судну?"),
      b("Jesli tak i potrzebna jest natychmiastowa pomoc, wybierz MAYDAY.", "Если да и нужна немедленная помощь, выбирай MAYDAY."),
      b("Jesli sprawa jest pilna, ale prog distress nie jest spelniony, wybierz PAN PAN.", "Если срочно, но порог distress не достигнут, выбирай PAN PAN."),
      b("Jesli przekazujesz ostrzezenie dla innych, wybierz SECURITE.", "Если передаёшь предупреждение другим, выбирай SECURITE."),
    ],
    allowed: [
      b("Podnies priorytet, gdy sytuacja sie pogarsza.", "Повышай приоритет при ухудшении."),
      b("Czlowiek za burta zwykle uzasadnia MAYDAY ze wzgledu na bezposrednie zagrozenie zycia.", "Человек за бортом обычно требует MAYDAY из-за прямой угрозы жизни."),
    ],
    forbidden: [
      b("Nie wybieraj PAN PAN tylko dlatego, ze MAYDAY brzmi zbyt powaznie.", "Не выбирай PAN PAN только потому, что MAYDAY кажется слишком серьёзным."),
      b("Nie uzywaj SECURITE do prywatnej informacji.", "Не используй SECURITE для частной информации."),
    ],
    exam: b(
      "Kolejnosc pierwszenstwa: distress, urgency, safety, routine. Naucz sie definicji, ale rozwiazuj pytania przez ocene zagrozenia.",
      "Приоритет: distress, urgency, safety, routine. Знай определения, но решай через оценку угрозы.",
    ),
    practice: b(
      "Kontekst zmienia kategorie. Brak napedu, przeciek lub uraz nie maja jednej stalej etykiety bez informacji o skutkach.",
      "Контекст меняет категорию. Потеря хода, течь или травма не имеют одной метки без оценки последствий.",
    ),
    world: b(
      "Znaczenie trzech sygnalow jest globalne. Australia dopuszcza lokalne kanaly alarmowe, ale kategorie pozostaja te same.",
      "Значение трёх сигналов глобально. Австралия допускает местные аварийные каналы, но категории те же.",
    ),
    questionTopics: [
      b("definicje priorytetow", "определения приоритетов"),
      b("czlowiek za burta", "человек за бортом"),
      b("ostrzezenia", "предупреждения"),
    ],
    sourceIds: ["uke", "m541", "smcp", "acma"],
    practiceHref: "/radio/zadania",
    practiceLabel: b("Wybierz priorytet w zadaniach", "Выбрать приоритет в заданиях"),
    minutes: 13,
  },
  {
    id: "mayday",
    number: 9,
    diagram: "mayday",
    title: b("Jak nadac skuteczny MAYDAY", "Как передать эффективный MAYDAY"),
    eyebrow: b("Kazda linia ma cel", "У каждой строки есть цель"),
    lead: b(
      "Dobry MAYDAY odpowiada ratownikowi na piec pytan: kto, gdzie, co sie stalo, jakiej pomocy trzeba i ilu ludzi jest zagrozonych.",
      "Хороший MAYDAY отвечает спасателю: кто, где, что произошло, какая помощь нужна и сколько людей под угрозой.",
    ),
    situation: b(
      "Po kolizji jacht szybko nabiera wody. Zaloga ma malo czasu, dlatego najpierw alarm DSC, potem zwiezly komunikat glosowy.",
      "После столкновения яхта быстро набирает воду. Времени мало, поэтому сначала DSC, затем короткое голосовое сообщение.",
    ),
    why: b(
      "Stala kolejnosc chroni przed pominieciem pozycji lub rodzaju pomocy. Powtorzenia na poczatku pomagaja rozpoznac sygnal w szumie.",
      "Постоянный порядок защищает от пропуска позиции или вида помощи. Повтор в начале помогает распознать сигнал в шуме.",
    ),
    concepts: [
      {
        title: b("Alarm DSC", "Сигнал DSC"),
        body: b("Jesli radio jest dostepne i czas pozwala, wyslij distress na 70 przed fonia.", "Если рация доступна и есть время, отправь distress на 70 до голосового сообщения."),
      },
      {
        title: b("Pozycja", "Позиция"),
        body: b("Podaj szerokosc i dlugosc albo jednoznaczny namiar i odleglosc od znanego punktu.", "Передай широту и долготу либо однозначный пеленг и расстояние от известной точки."),
      },
      {
        title: b("Natura i pomoc", "Характер и помощь"),
        body: b("FIRE, FLOODING, COLLISION, MAN OVERBOARD oraz konkretna potrzebna pomoc.", "FIRE, FLOODING, COLLISION, MAN OVERBOARD и конкретная нужная помощь."),
      },
    ],
    steps: [
      b("MAYDAY x3, THIS IS, nazwa jednostki x3, call sign i MMSI.", "MAYDAY x3, THIS IS, имя судна x3, позывной и MMSI."),
      b("MAYDAY, nazwa jednostki.", "MAYDAY, имя судна."),
      b("MY POSITION IS, pozycja i czas, jezeli potrzebny.", "MY POSITION IS, позиция и при необходимости время."),
      b("Natura zagrozenia i I REQUIRE IMMEDIATE ASSISTANCE.", "Характер аварии и I REQUIRE IMMEDIATE ASSISTANCE."),
      b("Liczba osob, informacje pomocne, OVER.", "Число людей, полезные сведения, OVER."),
    ],
    allowed: [
      b("Nadaj glosowy MAYDAY bez DSC, gdy DSC nie dziala albo nie ma czasu na jego obsluge.", "Передай голосовой MAYDAY без DSC, если DSC не работает или времени нет."),
      b("Powtorz komunikat, gdy nie ma odpowiedzi.", "Повтори сообщение, если нет ответа."),
    ],
    forbidden: [
      b("Nie opozniaj alarmu, aby ulozyc idealne zdanie.", "Не задерживай сигнал ради идеальной фразы."),
      b("Nie podawaj samej nazwy miejsca, jesli odbiorca moze jej nie znac.", "Не называй только местное место, которое адресат может не знать."),
    ],
    exam: b(
      "Na egzaminie zachowaj pelna kolejnosc i standardowe frazy. Po DSC distress przejdz na kanal 16 i nadaj MAYDAY.",
      "На экзамене сохраняй полный порядок и стандартные фразы. После DSC distress перейди на 16 и передай MAYDAY.",
    ),
    practice: b(
      "W realnym bezposrednim zagrozeniu priorytetem jest skuteczne wezwanie. Nieudane DSC nie uniewaznia poprawnego wezwania glosowego.",
      "В реальной непосредственной угрозе главное эффективно вызвать помощь. Неудача DSC не отменяет правильный голосовой вызов.",
    ),
    world: b(
      "Struktura MAYDAY i angielskie frazy sa miedzynarodowe. Lokalne RCC moze poprosic o dodatkowe dane.",
      "Структура MAYDAY и английские фразы международные. Местное RCC может запросить дополнительные данные.",
    ),
    questionTopics: [
      b("kolejnosc MAYDAY", "порядок MAYDAY"),
      b("pozycja i natura", "позиция и характер аварии"),
      b("DSC przed fonia", "DSC до голоса"),
    ],
    sourceIds: ["uke", "imo1658", "m541", "smcp"],
    practiceHref: "/radio/rozmowa",
    practiceLabel: b("Nadaj MAYDAY na glos", "Передать MAYDAY голосом"),
    minutes: 17,
  },
  {
    id: "receive",
    number: 10,
    diagram: "receive",
    title: b("Co robic po odebraniu distress", "Что делать после приёма distress"),
    eyebrow: b("Sluchaj, oceniaj, nie przeszkadzaj", "Слушай, оценивай, не мешай"),
    lead: b(
      "Odbiorca nie powinien automatycznie naciskac ACK. Najpierw sprawdza, czy stacja brzegowa lub RCC przejely alarm i czy moze realnie pomoc.",
      "Получатель не должен автоматически нажимать ACK. Сначала проверяют, принял ли сигнал берег или RCC и может ли судно помочь.",
    ),
    situation: b(
      "Radio odbiera DSC distress. Przez piec minut sluchasz 16, widzisz ACK stacji brzegowej i korespondencje MAYDAY. Nie dokladasz kolejnego DSC ACK.",
      "Рация принимает DSC distress. Пять минут слушаешь 16, видишь ACK берега и слышишь MAYDAY. Дополнительный DSC ACK не отправляешь.",
    ),
    why: b(
      "Wiele jednoczesnych potwierdzen moze zatkac kanal i stworzyc chaos. Koordynacje powinien przejac RCC lub stacja brzegowa, jesli sa dostepne.",
      "Много одновременных подтверждений загружают канал и создают хаос. Координацию должен принять RCC или берег, если они доступны.",
    ),
    concepts: [
      {
        title: b("ACK fonia", "ACK голосом"),
        body: b("Statek zwykle potwierdza na kanale 16 slowami RECEIVED MAYDAY, gdy brak potwierdzenia brzegu i moze pomoc.", "Судно обычно подтверждает голосом на 16 словами RECEIVED MAYDAY, если берег не ответил и помощь возможна."),
      },
      {
        title: b("MAYDAY RELAY", "MAYDAY RELAY"),
        body: b("Przekaz wezwania, gdy zagrozona stacja nie moze skutecznie alarmowac albo potrzebna jest dalsza retransmisja.", "Ретрансляция, когда судно в бедствии не может эффективно вызвать помощь или нужна передача дальше."),
      },
      {
        title: b("Cisza radiowa", "Радиомолчание"),
        body: b("SEELONCE MAYDAY chroni korespondencje distress. SEELONCE FEENEE konczy ograniczenie.", "SEELONCE MAYDAY защищает аварийный обмен. SEELONCE FEENEE завершает ограничение."),
      },
    ],
    steps: [
      b("Przerwij nadawanie, zanotuj MMSI, pozycje, czas i nature distress.", "Прекрати передачу, запиши MMSI, позицию, время и характер бедствия."),
      b("Ustaw kanal 16 i sluchaj przez 5 minut.", "Перейди на 16 и слушай 5 минут."),
      b("Sprawdz, czy stacja brzegowa lub RCC potwierdzily alarm i prowadza ruch.", "Проверь, подтвердили ли берег или RCC сигнал и ведут ли обмен."),
      b("Jesli nie, potwierdz fonia, poinformuj brzeg lub RCC i ocen zdolnosc pomocy.", "Если нет, подтверди голосом, сообщи берегу или RCC и оцени возможность помочь."),
      b("DSC ACK ze statku wysylaj tylko po konsultacji, gdy alarm nadal sie powtarza.", "DSC ACK с судна отправляй только после консультации, если сигнал продолжает повторяться."),
    ],
    allowed: [
      b("Przygotuj sie do pomocy, ale nie narazaj bez potrzeby swojej zalogi.", "Готовься помочь, но не подвергай свою команду ненужному риску."),
      b("Prowadz dokladne notatki z czasem.", "Веди точные записи с временем."),
    ],
    forbidden: [
      b("Nie wysylaj odruchowo DSC ACK z jednostki.", "Не отправляй DSC ACK автоматически."),
      b("Nie kontynuuj zwyklej rozmowy na kanale zajetym przez distress.", "Не продолжай обычный разговор на канале аварийного обмена."),
    ],
    exam: b(
      "Starsze skroty bywaja uproszczone. Aktualna procedura IMO: 5 minut nasluchu na 16, ocena ACK brzegu, potem potwierdzenie fonia i kontakt z brzegiem lub RCC.",
      "Старые конспекты упрощают. Текущая процедура IMO: 5 минут слушать 16, проверить ACK берега, затем голосовое подтверждение и связь с берегом или RCC.",
    ),
    practice: b(
      "Twoja odpowiedz zalezy od odleglosci, mozliwosci jednostki, pogody i tego, czy koordynator juz prowadzi akcje.",
      "Твой ответ зависит от расстояния, возможностей судна, погоды и того, ведёт ли уже операцию координатор.",
    ),
    world: b(
      "Procedura IMO jest wspolnym standardem morskim. Lokalna stacja moze wydac dodatkowe polecenia.",
      "Процедура IMO является общим морским стандартом. Местная станция может дать дополнительные указания.",
    ),
    questionTopics: [
      b("RECEIVED MAYDAY", "RECEIVED MAYDAY"),
      b("MAYDAY RELAY", "MAYDAY RELAY"),
      b("cisza radiowa", "радиомолчание"),
    ],
    sourceIds: ["uke", "imo1657", "m541"],
    practiceHref: "/radio/symulator",
    practiceLabel: b("Odbierz alarm w symulatorze", "Принять сигнал в симуляторе"),
    minutes: 18,
  },
  {
    id: "gmdss",
    number: 11,
    diagram: "gmdss",
    title: b("GMDSS: alarm, informacja i lokalizacja", "GMDSS: сигнал, информация и поиск"),
    eyebrow: b("Urzadzenia nie robia tego samego", "Устройства делают разное"),
    lead: b(
      "EPIRB, NAVTEX, radar SART i AIS-SART naleza do jednego systemu, ale odpowiadaja na rozne pytania.",
      "EPIRB, NAVTEX, radar SART и AIS-SART входят в одну систему, но отвечают на разные вопросы.",
    ),
    situation: b(
      "Po opuszczeniu jachtu EPIRB alarmuje przez satelite, a SART lub AIS-SART pomaga jednostce ratowniczej znalezc tratwe na ostatnich milach.",
      "После оставления яхты EPIRB подаёт сигнал через спутник, а SART или AIS-SART помогает спасателям найти плот на последних милях.",
    ),
    why: b(
      "Daleki alarm satelitarny i precyzyjne naprowadzanie w poblizu wymagaja innych technologii. Redundancja chroni, gdy jeden tor zawiedzie.",
      "Дальний спутниковый сигнал и точное наведение рядом требуют разных технологий. Резервирование защищает при отказе одного канала.",
    ),
    concepts: [
      {
        title: b("EPIRB 406 MHz", "EPIRB 406 МГц"),
        body: b("Nadaje identyfikator do COSPAS-SARSAT, czesto takze pozycje GNSS. Sygnal 121,5 MHz pomaga w namierzaniu.", "Передаёт идентификатор в COSPAS-SARSAT, часто и позицию GNSS. 121,5 МГц помогает пеленгованию."),
      },
      {
        title: b("Radar SART i AIS-SART", "Radar SART и AIS-SART"),
        body: b("Radar SART odpowiada radarowi 9 GHz i tworzy charakterystyczne echa. AIS-SART wysyla komunikaty widoczne w AIS, nie na radarze.", "Radar SART отвечает радару 9 ГГц и создаёт характерные отметки. AIS-SART передаёт в AIS, не на радар."),
      },
      {
        title: b("NAVTEX", "NAVTEX"),
        body: b("Automatycznie odbiera Maritime Safety Information: ostrzezenia, prognozy i komunikaty SAR.", "Автоматически принимает Maritime Safety Information: предупреждения, прогнозы и сообщения SAR."),
      },
    ],
    steps: [
      b("EPIRB uruchom zgodnie z instrukcja i umiesc z czystym widokiem nieba.", "Включи EPIRB по инструкции и размести с открытым небом."),
      b("SART lub AIS-SART wlacz po opuszczeniu jednostki i umiesc mozliwie wysoko.", "SART или AIS-SART включи после оставления судна и установи как можно выше."),
      b("NAVTEX zaprogramuj dla obszaru i typow komunikatow przed rejsem.", "NAVTEX настрой на район и типы сообщений до рейса."),
      b("Po przypadkowym uruchomieniu natychmiast odwolaj falszywy alarm przez sluzby.", "После случайного включения немедленно отмени ложный сигнал через службы."),
    ],
    allowed: [
      b("Rejestruj EPIRB i aktualizuj dane kontaktowe.", "Регистрируй EPIRB и обновляй контакты."),
      b("Kontroluj baterie, daty serwisowe i mocowanie zwalniaka hydrostatycznego.", "Проверяй батареи, сервисные даты и гидростатическое крепление."),
    ],
    forbidden: [
      b("Nie zakladaj, ze AIS-SART zobaczysz jako echo radarowe.", "Не ожидай увидеть AIS-SART как радарную отметку."),
      b("Nie chowaj aktywnego EPIRB pod metalowym pokladem.", "Не прячь активный EPIRB под металлической палубой."),
    ],
    exam: b(
      "Rozrozniaj tor detekcji: EPIRB przez satelite, radar SART przez radar pasma X, AIS-SART przez odbiornik AIS, NAVTEX jako odbiornik informacji.",
      "Различай путь: EPIRB через спутник, radar SART через X-band radar, AIS-SART через AIS, NAVTEX как приёмник информации.",
    ),
    practice: b(
      "Uruchomienie, test i serwis zaleza od konkretnego modelu. Czytaj instrukcje na obudowie, nie improwizuj z magnesem lub zwalniakiem.",
      "Включение, тест и сервис зависят от модели. Читай инструкцию на корпусе, не импровизируй с магнитом или креплением.",
    ),
    world: b(
      "Obszary A1-A4 opisuja dostep do srodkow alarmowania, nie odleglosc od Polski. Wyposazenie wymagane prawem zalezy od typu i rejonu eksploatacji statku.",
      "Районы A1-A4 описывают доступ к средствам связи, а не расстояние от Польши. Обязательное оснащение зависит от типа судна и района эксплуатации.",
    ),
    questionTopics: [
      b("EPIRB i COSPAS-SARSAT", "EPIRB и COSPAS-SARSAT"),
      b("SART oraz AIS-SART", "SART и AIS-SART"),
      b("NAVTEX i obszary A1-A4", "NAVTEX и районы A1-A4"),
    ],
    sourceIds: ["uke", "cept", "m541"],
    practiceHref: "/radio/zadania",
    practiceLabel: b("Rozpoznaj urzadzenia", "Распознать устройства"),
    minutes: 18,
  },
  {
    id: "world",
    number: 12,
    diagram: "world",
    title: b("Europa i swiat: rdzen plus nakladka", "Европа и мир: основа плюс местный слой"),
    eyebrow: b("Nie zabieraj lokalnych nawykow za granice", "Не переноси местные привычки за границу"),
    lead: b(
      "MAYDAY, DSC i SMCP tworza wspolny rdzen. Plan kanalow, moc, inland ATIS i praktyka radio check sa lokalna nakladka.",
      "MAYDAY, DSC и SMCP образуют общий фундамент. Каналы, мощность, inland ATIS и radio check зависят от региона.",
    ),
    situation: b(
      "Radio ustawione na europejski INT trafia do USA. Ten sam numer kanalu moze miec inny tryb. Na europejskiej drodze srodladowej wlacza sie ATIS, a DSC moze byc niedozwolone.",
      "Рация в режиме INT прибывает в США. Тот же номер может иметь другой режим. На европейских внутренних водах включают ATIS, а DSC может быть запрещено.",
    ),
    why: b(
      "ITU ustala wspolne ramy, lecz administracje zarzadzaja wykorzystaniem widma i sluzbami na swoim obszarze.",
      "ITU задаёт общую рамку, но страны управляют использованием частот и службами на своей территории.",
    ),
    concepts: [
      {
        title: b("Morze w Europie", "Море в Европе"),
        body: b("Zwykle plan INT, DSC na 70, obowiazek nasluchu i lokalne kanaly portu lub VTS.", "Обычно план INT, DSC на 70, дежурный приём и местные каналы порта или VTS."),
      },
      {
        title: b("Europejskie inland", "Внутренние воды Европы"),
        body: b("RAINWAT stosuje ATIS. Na wielu drogach DSC i dual watch nie sa dozwolone, a moc bywa ograniczona.", "RAINWAT использует ATIS. На многих внутренних путях DSC и dual watch запрещены, мощность ограничена."),
      },
      {
        title: b("Poza Europa", "Вне Европы"),
        body: b("USA i Kanada maja wlasne warianty kanalow. Australia publikuje lokalne kanaly i procedury, w tym kanal 67 w niektorych sytuacjach distress.", "США и Канада имеют свои варианты каналов. Австралия публикует местные каналы и процедуры, включая канал 67 в некоторых аварийных ситуациях."),
      },
    ],
    steps: [
      b("Przed rejsem pobierz aktualny plan kanalow administracji i portow.", "До рейса скачай актуальный план каналов страны и портов."),
      b("Ustaw poprawny region radia: INT, USA lub CAN.", "Выбери правильный регион рации: INT, USA или CAN."),
      b("Sprawdz wymagania operatora, pozwolenia radiowego, MMSI i ATIS.", "Проверь требования к оператору, разрешению, MMSI и ATIS."),
      b("W portach sluchaj instrukcji VTS, harbourmaster i almanachu.", "В портах следуй VTS, harbourmaster и альманаху."),
    ],
    allowed: [
      b("Traktuj lokalny plan jako nakladke na miedzynarodowa procedure.", "Рассматривай местный план как слой поверх международной процедуры."),
      b("W razie watpliwosci uzyj oficjalnego zrodla administracji, nie starej tabeli z internetu.", "При сомнении используй официальный источник, а не старую таблицу."),
    ],
    forbidden: [
      b("Nie zakladaj, ze kanal roboczy mariny jest taki sam w kazdym kraju.", "Не считай, что рабочий канал марины одинаков везде."),
      b("Nie wykonuj radio check na kanale 16, jesli lokalna procedura wskazuje inny kanal lub test DSC.", "Не делай radio check на 16, если местные правила указывают другой канал или DSC test."),
    ],
    exam: b(
      "Egzamin UKE sprawdza program SRC i praktyke stosowana w Polsce. Odpowiadaj wedlug oficjalnego materialu, ale oznaczaj w pamieci, co jest regula globalna, a co regionalna.",
      "Экзамен UKE проверяет программу SRC и польскую практику. Отвечай по официальному материалу, но различай глобальные и региональные правила.",
    ),
    practice: b(
      "Na rejsie sprawdzaj Notices to Mariners, almanach, informacje portowe i strony administracji. Kurs nie moze zastapic aktualnego planu lokalnego.",
      "В рейсе проверяй Notices to Mariners, альманах, портовые данные и сайты администрации. Курс не заменяет актуальный местный план.",
    ),
    world: b(
      "Najbezpieczniejszy model: globalny rdzen ITU, IMO i SMCP plus krajowa nakladka kanalow, uprawnien i praktyki.",
      "Безопасная модель: глобальная основа ITU, IMO и SMCP плюс национальный слой каналов, документов и практики.",
    ),
    questionTopics: [
      b("INT, USA i CAN", "INT, USA и CAN"),
      b("ATIS i inland", "ATIS и внутренние воды"),
      b("praktyka lokalna", "местная практика"),
    ],
    sourceIds: ["uke", "appendix18", "rainwat", "uscg", "acma"],
    practiceHref: "/radio/test",
    practiceLabel: b("Sprawdz cala baze UKE", "Проверить всю базу UKE"),
    minutes: 16,
  },
];

const orderIndex = new Map<string, number>(
  THEORY_ORDER.map((chapterId, index) => [chapterId, index]),
);

export const THEORY_CHAPTERS: TheoryChapter[] = [
  ...CORE_THEORY_CHAPTERS,
  ...SUPPLEMENTAL_THEORY_CHAPTERS,
]
  .sort((a, b) => (orderIndex.get(a.id) ?? 999) - (orderIndex.get(b.id) ?? 999))
  .map((chapter, index) => ({
    ...chapter,
    number: index + 1,
    questionIds: CHAPTER_QUESTION_IDS[chapter.id as TheoryChapterId] ?? [],
  }));

export const TOTAL_THEORY_MINUTES = THEORY_CHAPTERS.reduce(
  (sum, chapter) => sum + chapter.minutes,
  0,
);
