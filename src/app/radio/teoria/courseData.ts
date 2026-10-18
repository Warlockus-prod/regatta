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
    label: "Świadectwa morskie, zasady egzaminu i materiały SRC",
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
    title: b("Jak działa cały system", "Как устроена вся система"),
    eyebrow: b("Najpierw mapa, potem przyciski", "Сначала карта, потом кнопки"),
    lead: b(
      "Radio jachtu nie łączy się z abstrakcyjnym eterem. Łączy ludzi na jednostkach, stacje brzegowe i służby ratownicze w jeden łańcuch.",
      "Рация яхты связывает не с абстрактным эфиром, а объединяет суда, береговые станции и спасательные службы в одну цепочку.",
    ),
    situation: b(
      "Na jachcie jest pożar. Alarm cyfrowy trafia przez kanał 70 do statków i stacji brzegowej. Głosowy MAYDAY na 16 wyjaśnia sytuację. Stacja brzegowa przekazuje dane do RCC, które koordynuje SAR.",
      "На яхте пожар. Цифровой сигнал по каналу 70 получают суда и берег. Голосовой MAYDAY на 16 объясняет ситуацию. Берег передаёт данные в RCC, которое координирует SAR.",
    ),
    why: b(
      "Jeden kanał i jeden operator nie wystarczą. System rozdziela szybkie alarmowanie, rozmowę i koordynację, aby informacja nie zginęła, gdy załoga jest pod presją.",
      "Одного канала и одного оператора недостаточно. Система разделяет быстрый сигнал, разговор и координацию, чтобы информация не потерялась под давлением.",
    ),
    concepts: [
      {
        title: b("VHF", "VHF"),
        body: b("Krótkozasięgowa łączność głosowa i cyfrowa w morskim paśmie 156-174 MHz.", "Связь голосом и цифровыми сообщениями на морских частотах 156-174 МГц."),
      },
      {
        title: b("GMDSS", "GMDSS"),
        body: b("Globalny zestaw procedur, urządzeń i służb, a nie pojedyncze radio.", "Глобальный набор процедур, оборудования и служб, а не одна рация."),
      },
      {
        title: b("RCC i SAR", "RCC и SAR"),
        body: b("RCC koordynuje akcje, a jednostki SAR wykonują poszukiwanie i ratowanie.", "RCC координирует операцию, а силы SAR выполняют поиск и спасение."),
      },
    ],
    steps: [
      b("Alarm cyfrowy przekazuje tożsamość i pozycję.", "Цифровой сигнал передаёт идентификатор и позицию."),
      b("Łączność głosowa opisuje zagrożenie i potrzebną pomoc.", "Голосом сообщают угрозу и требуемую помощь."),
      b("RCC zbiera informacje, ustala plan i kieruje siły SAR.", "RCC собирает данные, строит план и направляет силы SAR."),
    ],
    allowed: [
      b("Traktuj radio, DSC, EPIRB i SAR jako jeden system.", "Рассматривай рацию, DSC, EPIRB и SAR как единую систему."),
      b("Po alarmie pozostań na nasłuchu i wykonuj polecenia koordynatora.", "После сигнала оставайся на приёме и выполняй указания координатора."),
    ],
    forbidden: [
      b("Nie zakładaj, że samo naciśnięcie DISTRESS przekazało pełny obraz sytuacji.", "Не считай, что кнопка DISTRESS передала полную картину."),
      b("Nie wyłączaj radia po wysłaniu alarmu.", "Не выключай рацию после отправки сигнала."),
    ],
    exam: b(
      "Zapamiętaj role: kanał 70 to DSC, kanał 16 to fonia alarmowa, RCC koordynuje akcje SAR.",
      "Запомни роли: канал 70 для DSC, канал 16 для аварийной голосовой связи, RCC координирует SAR.",
    ),
    practice: b(
      "Na prawdziwym jachcie przed wyjściem sprawdź, czy DSC ma poprawny MMSI i aktualną pozycję z GPS.",
      "На настоящей яхте до выхода проверь MMSI в DSC и актуальную позицию от GPS.",
    ),
    world: b(
      "Rdzeń GMDSS jest międzynarodowy. Numery służb, nazwy stacji brzegowych i pokrycie radiowe są lokalne.",
      "Основа GMDSS международная. Номера служб, названия береговых станций и покрытие зависят от страны.",
    ),
    questionTopics: [
      b("GMDSS i SAR", "GMDSS и SAR"),
      b("kanały 70 i 16", "каналы 70 и 16"),
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
    eyebrow: b("Fizyka zasięgu", "Физика дальности"),
    lead: b(
      "Morski VHF rozchodzi się prawie jak światło. Wysokość anteny zwykle daje więcej niż dodatkowe waty.",
      "Морской VHF распространяется почти как свет. Высота антенны обычно даёт больше, чем дополнительные ватты.",
    ),
    situation: b(
      "Ręczne radio z kokpitu nie słyszy mariny, ale radio stacjonarne z anteną na topie masztu łączy się bez problemu.",
      "Портативная рация из кокпита не слышит марину, а стационарная с антенной на мачте связывается без проблем.",
    ),
    why: b(
      "Krzywizna Ziemi zasłania niskie anteny. Przybliżenie dla dwóch anten to d[km] = 4,12 x (pierwiastek h1 + pierwiastek h2), gdzie wysokości są w metrach.",
      "Кривизна Земли скрывает низкие антенны. Приближённо d[км] = 4,12 x (корень h1 + корень h2), высоты в метрах.",
    ),
    concepts: [
      {
        title: b("Częstotliwość i fala", "Частота и волна"),
        body: b("VHF to 30-300 MHz. Przy 156 MHz długość fali wynosi około 1,9 m: lambda = 300 / f.", "VHF это 30-300 МГц. На 156 МГц длина волны около 1,9 м: lambda = 300 / f."),
      },
      {
        title: b("Wysokość anteny", "Высота антенны"),
        body: b("Podniesienie anteny odsłania większy fragment powierzchni morza.", "Поднятая антенна видит большую часть поверхности моря."),
      },
      {
        title: b("Moc", "Мощность"),
        body: b("25 W wzmacnia sygnał w obrębie widoczności radiowej, ale zwykle nie przeskoczy horyzontu.", "25 Вт усиливают сигнал в пределах радиовидимости, но обычно не перепрыгивают горизонт."),
      },
    ],
    steps: [
      b("Najpierw wybierz najwyższą sprawną antenę.", "Сначала выбери самую высокую исправную антенну."),
      b("Użyj 1 W na małej odległości, jeżeli kanał i sytuacja na to pozwalają.", "На малой дистанции используй 1 Вт, если канал и ситуация позволяют."),
      b("Przejdź na 25 W, gdy sygnał jest za słaby lub sytuacja jest alarmowa.", "Перейди на 25 Вт при слабом сигнале или аварии."),
      b("Jeśli nadal brak łączności, zmień pozycję, podnieś antenę lub użyj przekazu.", "Если связи нет, измени позицию, подними антенну или попроси ретрансляцию."),
    ],
    allowed: [
      b("Trzymaj radio ręczne pionowo i możliwie wysoko.", "Держи портативную рацию вертикально и как можно выше."),
      b("Sprawdź kabel, złącza i strefy cienia od masztu lub nadbudówki.", "Проверь кабель, разъёмы и тени от мачты или надстройки."),
    ],
    forbidden: [
      b("Nie oczekuj, że 25 W naprawi uszkodzoną antenę.", "Не ожидай, что 25 Вт исправят повреждённую антенну."),
      b("Nie montuj anteny nisko obok dużych elementów metalowych.", "Не ставь антенну низко рядом с крупными металлическими деталями."),
    ],
    exam: b(
      "Zasięg VHF zależy przede wszystkim od wysokości anten. Maksymalna moc typowego radia statkowego to 25 W, z redukcją do 1 W.",
      "Дальность VHF прежде всего зависит от высоты антенн. Типичная судовая рация имеет максимум 25 Вт и режим 1 Вт.",
    ),
    practice: b(
      "Kanał i lokalne przepisy decydują o mocy. Zasada nie brzmi po prostu «port 1 W, morze 25 W». Użyj najmniejszej skutecznej mocy.",
      "Мощность определяется каналом и местными правилами. Правило не сводится к «в порту 1 Вт, в море 25 Вт». Используй минимальную эффективную мощность.",
    ),
    world: b(
      "Fizyka jest wszędzie taka sama, ale administracje mogą ograniczać moc na konkretnych kanałach.",
      "Физика одинакова везде, но страны могут ограничивать мощность на отдельных каналах.",
    ),
    questionTopics: [
      b("pasmo i długość fali", "диапазон и длина волны"),
      b("zasięg radiowy", "дальность связи"),
      b("moc i antena", "мощность и антенна"),
    ],
    sourceIds: ["uke", "cept", "appendix18"],
    practiceHref: "/radio/obsluga",
    practiceLabel: b("Przećwicz ustawienie radia", "Отработать настройку рации"),
    minutes: 12,
  },
  {
    id: "controls",
    number: 3,
    diagram: "controls",
    title: b("Radio bez magii: elementy sterowania", "Рация без магии: органы управления"),
    eyebrow: b("Co zmienia każde pokrętło", "Что меняет каждая ручка"),
    lead: b(
      "Operator nie powinien szukać przycisków w chwili alarmu. Najpierw rozumie funkcje, potem uczy się układu konkretnego modelu.",
      "Оператор не должен искать кнопки во время аварии. Сначала нужно понять функции, затем расположение на конкретной модели.",
    ),
    situation: b(
      "Słyszysz tylko szum. Zbyt nisko ustawiony squelch otwiera głośnik, a zbyt wysoko ustawiony może ukryć słaby MAYDAY.",
      "Слышен только шум. Слишком низкий squelch открывает динамик, а слишком высокий может скрыть слабый MAYDAY.",
    ),
    why: b(
      "Volume steruje głośnością po odebraniu sygnału. Squelch ustala próg, od którego radio otwiera tor audio. To dwa różne zadania.",
      "Volume задаёт громкость принятого сигнала. Squelch задаёт порог открытия звука. Это разные функции.",
    ),
    concepts: [
      {
        title: b("PTT", "PTT"),
        body: b("Push To Talk: naciśnij, odczekaj chwilę, mów, zwolnij, aby słuchać.", "Push To Talk: нажми, выдержи паузу, говори, отпусти для приёма."),
      },
      {
        title: b("16/C i HI/LO", "16/C и HI/LO"),
        body: b("16/C szybko wraca na kanał 16. HI/LO wybiera moc wysoką lub niską, jeśli kanał pozwala.", "16/C быстро возвращает на канал 16. HI/LO выбирает высокую или низкую мощность, если канал позволяет."),
      },
      {
        title: b("Dual Watch i Scan", "Dual Watch и Scan"),
        body: b("Dual Watch kontroluje 16 i jeden kanał roboczy. Scan przegląda zaprogramowaną listę.", "Dual Watch слушает 16 и один рабочий канал. Scan перебирает список каналов."),
      },
    ],
    steps: [
      b("Włącz radio i ustaw czytelną głośność.", "Включи рацию и поставь понятную громкость."),
      b("Otwórz squelch do szumu, potem podnoś próg tylko do chwili wyciszenia.", "Открой squelch до шума, затем подними лишь до исчезновения шума."),
      b("Sprawdź INT, kanał, moc i pozycję GPS.", "Проверь INT, канал, мощность и позицию GPS."),
      b("Przed nadaniem nasłuchuj, potem użyj PTT.", "Перед передачей послушай эфир, затем нажми PTT."),
    ],
    allowed: [
      b("Po zmianie modelu radia znajdź DISTRESS, 16/C, PTT, HI/LO i menu DSC.", "На новой модели найди DISTRESS, 16/C, PTT, HI/LO и меню DSC."),
      b("Przed rejsem wykonaj test bez generowania fałszywego alarmu.", "До рейса проведи проверку без ложного сигнала бедствия."),
    ],
    forbidden: [
      b("Nie testuj DISTRESS przez prawdziwe wysłanie alarmu.", "Не проверяй DISTRESS реальной отправкой сигнала."),
      b("Nie ustawiaj squelch tak wysoko, aby znikały słabe stacje.", "Не ставь squelch настолько высоко, что исчезают слабые станции."),
    ],
    exam: b(
      "Rozróżniaj volume, squelch, dual watch, scan, PTT, 16/C oraz HI/LO. Egzamin praktyczny może używać różnych modeli radia.",
      "Различай volume, squelch, dual watch, scan, PTT, 16/C и HI/LO. На практике могут быть разные модели.",
    ),
    practice: b(
      "Kolejność menu jest cechą modelu, a nie przepisem radiowym. Naucz się celu operacji, potem ścieżki w IC-M330 i IC-M323.",
      "Порядок меню зависит от модели, а не от правил связи. Сначала пойми цель, потом путь в IC-M330 и IC-M323.",
    ),
    world: b(
      "Nazwy funkcji są podobne, ale skróty i układ klawiszy różnią się między producentami.",
      "Названия функций похожи, но сокращения и кнопки различаются у производителей.",
    ),
    questionTopics: [
      b("squelch i głośność", "squelch и громкость"),
      b("dual watch", "dual watch"),
      b("moc i PTT", "мощность и PTT"),
    ],
    sourceIds: ["uke", "cept", "m493"],
    practiceHref: "/radio/obsluga",
    practiceLabel: b("Otwórz kurs obsługi", "Открыть курс управления"),
    minutes: 11,
  },
  {
    id: "channels",
    number: 4,
    diagram: "channels",
    title: b("Kanały to role, nie numery", "Каналы это роли, а не номера"),
    eyebrow: b("Simplex, duplex i dyscyplina", "Симплекс, дуплекс и дисциплина"),
    lead: b(
      "Numer kanału oznacza uzgodnioną parę częstotliwości i przeznaczenie. Nie każdy kanał jest wspólnym pokojem do dowolnej rozmowy.",
      "Номер канала означает согласованные частоты и назначение. Не каждый канал подходит для любого разговора.",
    ),
    situation: b(
      "Wywołujesz marinę na 16, po odpowiedzi obie strony przechodzą na wskazany kanał roboczy. Kanał 16 pozostaje wolny dla alarmów.",
      "Ты вызываешь марину на 16, после ответа обе стороны переходят на рабочий канал. Канал 16 остаётся свободным для аварий.",
    ),
    why: b(
      "Wspólne kanały wywoławcze działają tylko wtedy, gdy rozmowy są krótkie. Dłuższą korespondencję przenosi się na kanał roboczy.",
      "Общие вызывные каналы работают, только если разговоры короткие. Длинную связь переносят на рабочий канал.",
    ),
    concepts: [
      {
        title: b("Simplex", "Симплекс"),
        body: b("Ta sama częstotliwość w obie strony. Mówi jedna stacja, druga słucha.", "Одна частота в обе стороны. Одна станция говорит, другая слушает."),
      },
      {
        title: b("Duplex", "Дуплекс"),
        body: b("Różne częstotliwości nadawania i odbioru, typowo w łączności ze stacją brzegową.", "Разные частоты передачи и приёма, обычно при связи с береговой станцией."),
      },
      {
        title: b("Najważniejsze role", "Главные роли"),
        body: b("70 DSC, 16 distress i wywołanie, 13 bezpieczeństwo mostek-mostek, 6 statek-statek i SAR.", "70 DSC, 16 бедствие и вызов, 13 безопасность мостик-мостик, 6 судно-судно и SAR."),
      },
    ],
    steps: [
      b("Sprawdź lokalny plan kanałów i rodzaj stacji.", "Проверь местный план каналов и тип станции."),
      b("Nasłuchuj przed nadaniem.", "Послушай перед передачей."),
      b("Wywołaj krótko na kanale wywoławczym.", "Коротко вызови на вызывном канале."),
      b("Uzgodnij kanał roboczy i zwolnij kanał wywoławczy.", "Согласуй рабочий канал и освободи вызывной."),
    ],
    allowed: [
      b("Na kanale 70 wysyłaj tylko komunikaty DSC.", "На канале 70 передавай только DSC."),
      b("Kanały 75 i 76 traktuj jako ochronne dla 16, z zastosowaniami i mocą ustalonymi przez administrację.", "Каналы 75 и 76 защищают 16, их применение и мощность определяет администрация."),
    ],
    forbidden: [
      b("Nie prowadź fonii na 70.", "Не говори голосом на 70."),
      b("Nie blokuj 16 rozmową, która może przejść na kanał roboczy.", "Не занимай 16 разговором, который можно перенести."),
    ],
    exam: b(
      "Kanał 17 ma częstotliwość 156,850 MHz, a kanał 15 ma 156,750 MHz. Kanały 75 i 76 nie są zwykłymi kanałami korespondencji publicznej.",
      "Канал 17 имеет 156,850 МГц, а канал 15 156,750 МГц. Каналы 75 и 76 не являются обычными каналами публичной связи.",
    ),
    practice: b(
      "Nie ucz się listy bez kontekstu. Zawsze pytaj: kogo wołam, po co, czy kanał jest simplex, i jaka moc jest dozwolona.",
      "Не учи список без контекста. Всегда спрашивай: кого вызываю, зачем, simplex ли канал и какая мощность разрешена.",
    ),
    world: b(
      "INT, USA i Canada mogą inaczej wykorzystywać ten sam numer. W Europie wybieraj INT, a lokalny plan portu lub VTS ma pierwszeństwo praktyczne.",
      "INT, USA и Canada могут по-разному использовать один номер. В Европе выбирай INT, а местный план порта или VTS определяет практику.",
    ),
    questionTopics: [
      b("kanały 6, 13, 16, 70", "каналы 6, 13, 16, 70"),
      b("simplex i duplex", "simplex и duplex"),
      b("plan INT", "план INT"),
    ],
    sourceIds: ["uke", "appendix18", "cept"],
    practiceHref: "/radio/symulator",
    practiceLabel: b("Zmień kanał w symulatorze", "Сменить канал в симуляторе"),
    minutes: 15,
  },
  {
    id: "identity",
    number: 5,
    diagram: "identity",
    title: b("Kto nadaje: nazwa, call sign i MMSI", "Кто передаёт: имя, позывной и MMSI"),
    eyebrow: b("Trzy identyfikatory, trzy zadania", "Три идентификатора, три задачи"),
    lead: b(
      "Człowiek rozpoznaje nazwę jednostki, służby pracują ze znakiem wywoławczym, a DSC adresuje dziewięciocyfrowy MMSI.",
      "Человек узнаёт имя судна, службы работают с позывным, а DSC адресует девятизначный MMSI.",
    ),
    situation: b(
      "Dwa jachty mają podobną nazwę. MMSI jednoznacznie wskazuje stację w alarmie DSC i łączy ją z danymi rejestracyjnymi.",
      "У двух яхт похожие имена. MMSI однозначно определяет станцию в DSC и связывает её с регистрационными данными.",
    ),
    why: b(
      "Głos bywa zniekształcony i nazwy się powtarzają. Cyfrowy identyfikator zmniejsza niejednoznaczność, ale działa tylko wtedy, gdy jest poprawnie zarejestrowany.",
      "Голос искажается, а названия повторяются. Цифровой идентификатор снижает неоднозначность, но только при правильной регистрации.",
    ),
    concepts: [
      {
        title: b("Nazwa jednostki", "Название судна"),
        body: b("Najłatwiejsza do rozpoznania w zwykłej łączności głosowej.", "Проще всего распознать в обычной голосовой связи."),
      },
      {
        title: b("Call sign", "Позывной"),
        body: b("Znak wywoławczy przydzielony stacji przez administrację.", "Позывной, назначенный станции администрацией."),
      },
      {
        title: b("MMSI", "MMSI"),
        body: b("9 cyfr używanych przez DSC i AIS. Pierwsze cyfry mogą zawierać MID związany z administracją.", "9 цифр для DSC и AIS. Начальные цифры могут содержать MID страны."),
      },
    ],
    steps: [
      b("W fonii podaj nazwę lub call sign zgodnie z procedurą.", "Голосом назови судно или позывной по процедуре."),
      b("W DSC wybierz poprawny MMSI odbiorcy albo typ All Ships.", "В DSC выбери правильный MMSI адресата или All Ships."),
      b("Literuj trudną nazwę alfabetem fonetycznym.", "Передай сложное имя фонетическим алфавитом."),
    ],
    allowed: [
      b("Miej nazwę, call sign i MMSI zapisane obok radia.", "Держи название, позывной и MMSI рядом с рацией."),
      b("Aktualizuj dane rejestracyjne po zmianie jednostki lub właściciela.", "Обновляй регистрацию при смене судна или владельца."),
    ],
    forbidden: [
      b("Nie programuj cudzego MMSI.", "Не программируй чужой MMSI."),
      b("Nie przenoś MMSI razem z radiem na inną jednostkę bez formalnej zmiany.", "Не переноси MMSI с рацией на другое судно без оформления."),
    ],
    exam: b(
      "MMSI ma 9 cyfr. Fonia używa nazwy lub znaku wywoławczego, a DSC używa MMSI.",
      "MMSI состоит из 9 цифр. Голос использует имя или позывной, DSC использует MMSI.",
    ),
    practice: b(
      "SRC uprawnia operatora. Pozwolenie radiowe dotyczy stacji i przydziela jej identyfikatory. To dwa osobne dokumenty.",
      "SRC относится к оператору. Разрешение на радиостанцию относится к судну и его идентификаторам. Это разные документы.",
    ),
    world: b(
      "Format MMSI jest międzynarodowy, ale rejestracje prowadzi administracja krajowa.",
      "Формат MMSI международный, но регистрацию ведёт национальная администрация.",
    ),
    questionTopics: [
      b("MMSI i MID", "MMSI и MID"),
      b("call sign", "позывной"),
      b("SRC i pozwolenie", "SRC и разрешение"),
    ],
    sourceIds: ["uke", "m493", "cept"],
    practiceHref: "/radio/zadania",
    practiceLabel: b("Przećwicz identyfikację", "Отработать идентификацию"),
    minutes: 10,
  },
  {
    id: "routine",
    number: 6,
    diagram: "routine",
    title: b("Zwykłe wywołanie krok po kroku", "Обычный вызов по шагам"),
    eyebrow: b("Krótko, jasno, na zmianę", "Коротко, ясно, по очереди"),
    lead: b(
      "Dobra procedura zmniejsza czas zajęcia kanału i liczbę pytań powtórnych. To nie ceremoniał, lecz kompresja informacji.",
      "Хорошая процедура сокращает время канала и число повторов. Это не церемония, а сжатие информации.",
    ),
    situation: b(
      "Chcesz poprosić marinę o miejsce. Najpierw wywołujesz ją krótko, po odpowiedzi przechodzisz na kanał roboczy i dopiero tam przekazujesz szczegóły.",
      "Нужно запросить место в марине. Сначала короткий вызов, после ответа переход на рабочий канал, детали сообщаются там.",
    ),
    why: b(
      "Na simplexie tylko jedna strona nadaje naraz. Prowords mówią, czy czekasz na odpowiedź, kończysz łączność, poprawiasz błąd lub prosisz o powtórzenie.",
      "На simplex только одна сторона говорит одновременно. Prowords показывают, ждёшь ли ответ, завершаешь связь, исправляешься или просишь повторить.",
    ),
    concepts: [
      {
        title: b("THIS IS", "THIS IS"),
        body: b("Oddziela stację wywoływaną od stacji, która nadaje.", "Отделяет вызываемую станцию от вызывающей."),
      },
      {
        title: b("OVER i OUT", "OVER и OUT"),
        body: b("OVER: skończyłem i czekam. OUT: łączność zakończona. Nie łącz ich.", "OVER: закончил и жду. OUT: связь закончена. Не соединяй их."),
      },
      {
        title: b("SAY AGAIN i CORRECTION", "SAY AGAIN и CORRECTION"),
        body: b("SAY AGAIN prosi o powtórzenie. CORRECTION poprawia własny błąd.", "SAY AGAIN просит повторить. CORRECTION исправляет свою ошибку."),
      },
    ],
    steps: [
      b("Nasłuchuj, czy kanał jest wolny.", "Убедись, что канал свободен."),
      b("Powiedz nazwę odbiorcy, THIS IS, swoją nazwę i OVER.", "Скажи имя адресата, THIS IS, своё имя и OVER."),
      b("Po odpowiedzi uzgodnij kanał roboczy.", "После ответа согласуй рабочий канал."),
      b("Przekaż cel, pozycję lub prośbę w krótkich blokach.", "Передай цель, позицию или просьбу короткими блоками."),
      b("Zakończenie potwierdź słowem OUT.", "Заверши словом OUT."),
    ],
    allowed: [
      b("Mów wolno, naturalnie, z mikrofonem kilka centymetrów od ust.", "Говори медленно и естественно, микрофон в нескольких сантиметрах от рта."),
      b("Cyfry, litery i pozycje podawaj zgodnie ze standardem.", "Цифры, буквы и координаты передавай по стандарту."),
    ],
    forbidden: [
      b("Nie mów «over and out».", "Не говори «over and out»."),
      b("Nie używaj REPEAT jako zwykłej prośby o powtórzenie.", "Не используй REPEAT как обычную просьбу повторить."),
    ],
    exam: b(
      "Znaj kolejność wywołania, alfabet fonetyczny, cyfry oraz znaczenie najczęstszych prowords.",
      "Знай порядок вызова, фонетический алфавит, цифры и значение основных prowords.",
    ),
    practice: b(
      "Procedura ma pomagać, nie brzmieć robotycznie. Jeśli warunki są trudne, dziel komunikat na mniejsze części i potwierdzaj dane krytyczne.",
      "Процедура должна помогать, а не звучать роботизированно. В сложных условиях дели сообщение и подтверждай критичные данные.",
    ),
    world: b(
      "SMCP daje wspólny angielski rdzeń. Lokalne porty mogą mieć własne kanały i formularze zgłoszeń.",
      "SMCP даёт общий английский. Порты могут иметь свои каналы и форму доклада.",
    ),
    questionTopics: [
      b("wywołanie i odpowiedź", "вызов и ответ"),
      b("prowords", "prowords"),
      b("alfabet fonetyczny", "фонетический алфавит"),
    ],
    sourceIds: ["uke", "smcp", "cept"],
    practiceHref: "/radio/rozmowa",
    practiceLabel: b("Przeprowadź rozmowę", "Провести разговор"),
    minutes: 14,
  },
  {
    id: "dsc",
    number: 7,
    diagram: "dsc",
    title: b("DSC: cyfrowy dzwonek do drzwi", "DSC: цифровой дверной звонок"),
    eyebrow: b("Alarm nie zastępuje rozmowy", "Сигнал не заменяет разговор"),
    lead: b(
      "DSC szybko wybiera adresata, kategorię i kanał. Po zestawieniu kontaktu szczegóły zwykle przekazuje się fonią.",
      "DSC быстро выбирает адресата, категорию и канал. После установления контакта детали обычно передают голосом.",
    ),
    situation: b(
      "Zamiast wielokrotnie wołać statek po nazwie, wysyłasz Individual Call na jego MMSI. Oba radia przechodzą na uzgodniony kanał roboczy.",
      "Вместо многократного голосового вызова отправляется Individual Call на MMSI судна. Обе рации переходят на рабочий канал.",
    ),
    why: b(
      "Kanał 70 jest przeznaczony dla krótkich wiadomości maszynowych. Oddzielenie go od fonii pozwala odbiornikom stale wykrywać alarmy.",
      "Канал 70 предназначен для коротких машинных сообщений. Отделение от голоса позволяет приёмникам постоянно обнаруживать сигналы.",
    ),
    concepts: [
      {
        title: b("Adres", "Адрес"),
        body: b("Individual, Group, All Ships albo distress do wszystkich w zasięgu.", "Individual, Group, All Ships или distress всем в зоне."),
      },
      {
        title: b("Kategoria", "Категория"),
        body: b("Distress, urgency, safety albo routine określa pierwszeństwo.", "Distress, urgency, safety или routine задаёт приоритет."),
      },
      {
        title: b("Dane pozycji", "Данные позиции"),
        body: b("GPS powinien automatycznie dostarczać pozycję i czas. Bez GPS dane trzeba aktualizować ręcznie.", "GPS должен автоматически давать позицию и время. Без GPS данные обновляют вручную."),
      },
    ],
    steps: [
      b("Wybierz rodzaj wywołania i adresata.", "Выбери тип вызова и адресата."),
      b("Wybierz kategorię oraz kanał dalszej fonii, jeżeli menu tego wymaga.", "Выбери категорию и канал дальнейшей голосовой связи, если требуется."),
      b("Sprawdź dane przed SEND.", "Проверь данные до SEND."),
      b("Po ACK przejdź do fonii i zidentyfikuj stacje.", "После ACK перейди к голосу и идентифицируй станции."),
    ],
    allowed: [
      b("Testuj DSC funkcją TEST do odpowiedniej stacji lub zgodnie z instrukcją lokalną.", "Проверяй DSC функцией TEST на подходящую станцию или по местной инструкции."),
      b("Bez GPS wprowadzaj pozycję ręcznie co najmniej co 4 godziny i po istotnej zmianie.", "Без GPS вводи позицию вручную минимум раз в 4 часа и после существенного изменения."),
    ],
    forbidden: [
      b("Nie nadaj głosu na kanale 70.", "Не передавай голос на канале 70."),
      b("Nie używaj distress do testu.", "Не используй distress для проверки."),
    ],
    exam: b(
      "Alarm distress DSC zawiera MMSI, pozycję, czas i naturę distress, jeśli została wybrana. Dalszy MAYDAY idzie fonią na 16.",
      "DSC distress содержит MMSI, позицию, время и характер бедствия, если выбран. Далее MAYDAY передают голосом на 16.",
    ),
    practice: b(
      "Gdy menu pozwala wysłać nieokreślony distress szybciej niż wybrać naturę, w bezpośrednim zagrożeniu nie opóźniaj alarmu.",
      "Если неопределённый distress можно отправить быстрее, чем выбирать характер аварии, при непосредственной угрозе не задерживай сигнал.",
    ),
    world: b(
      "W USA dostępny jest test DSC przez sieć Rescue 21, a zwykle voice radio check wykonuje się według lokalnej instrukcji, nie na 16.",
      "В США DSC можно проверять через Rescue 21, а обычный radio check делают по местным правилам, не на 16.",
    ),
    questionTopics: [
      b("kanał 70", "канал 70"),
      b("typy wywołań DSC", "типы вызовов DSC"),
      b("pozycja i ACK", "позиция и ACK"),
    ],
    sourceIds: ["uke", "m493", "m541", "uscg"],
    practiceHref: "/radio/symulator",
    practiceLabel: b("Wyślij wywołanie DSC", "Отправить вызов DSC"),
    minutes: 16,
  },
  {
    id: "priority",
    number: 8,
    diagram: "priority",
    title: b("MAYDAY, PAN PAN czy SECURITE", "MAYDAY, PAN PAN или SECURITE"),
    eyebrow: b("Najpierw skutek, potem etykieta", "Сначала последствия, потом метка"),
    lead: b(
      "Priorytet wybiera się według zagrożenia, nie według tego, jak dramatycznie brzmi zdarzenie.",
      "Приоритет выбирают по угрозе, а не по тому, насколько драматично звучит событие.",
    ),
    situation: b(
      "Silnik nie działa. Na otwartym morzu przy dobrej pogodzie może to być PAN PAN. Ten sam defekt przy skalistym brzegu i dryfie na skały staje się MAYDAY.",
      "Двигатель не работает. В море при хорошей погоде это может быть PAN PAN. У скалистого берега при дрейфе на камни та же поломка становится MAYDAY.",
    ),
    why: b(
      "Służby i inne statki muszą natychmiast wiedzieć, czy istnieje poważne i bezpośrednie zagrożenie, pilna potrzeba pomocy, czy tylko ważne ostrzeżenie.",
      "Службы и суда должны сразу понимать: есть ли серьёзная непосредственная угроза, срочная нужда в помощи или лишь важное предупреждение.",
    ),
    concepts: [
      {
        title: b("MAYDAY", "MAYDAY"),
        body: b("Poważne i bezpośrednie zagrożenie dla osoby, statku lub samolotu oraz potrzeba natychmiastowej pomocy.", "Серьёзная непосредственная угроза человеку, судну или самолёту и необходимость немедленной помощи."),
      },
      {
        title: b("PAN PAN", "PAN PAN"),
        body: b("Pilna wiadomość dotycząca bezpieczeństwa, lecz bez spełnienia progu distress.", "Срочное сообщение о безопасности, но без порога distress."),
      },
      {
        title: b("SECURITE", "SECURITE"),
        body: b("Ważne ostrzeżenie nawigacyjne lub meteorologiczne.", "Важное навигационное или метеорологическое предупреждение."),
      },
    ],
    steps: [
      b("Zapytaj: czy życie lub jednostka są w poważnym i bezpośrednim zagrożeniu?", "Спроси: есть серьёзная непосредственная угроза жизни или судну?"),
      b("Jeśli tak i potrzebna jest natychmiastowa pomoc, wybierz MAYDAY.", "Если да и нужна немедленная помощь, выбирай MAYDAY."),
      b("Jeśli sprawa jest pilna, ale próg distress nie jest spełniony, wybierz PAN PAN.", "Если срочно, но порог distress не достигнут, выбирай PAN PAN."),
      b("Jeśli przekazujesz ostrzeżenie dla innych, wybierz SECURITE.", "Если передаёшь предупреждение другим, выбирай SECURITE."),
    ],
    allowed: [
      b("Podnieś priorytet, gdy sytuacja się pogarsza.", "Повышай приоритет при ухудшении."),
      b("Człowiek za burtą zwykle uzasadnia MAYDAY ze względu na bezpośrednie zagrożenie życia.", "Человек за бортом обычно требует MAYDAY из-за прямой угрозы жизни."),
    ],
    forbidden: [
      b("Nie wybieraj PAN PAN tylko dlatego, że MAYDAY brzmi zbyt poważnie.", "Не выбирай PAN PAN только потому, что MAYDAY кажется слишком серьёзным."),
      b("Nie używaj SECURITE do prywatnej informacji.", "Не используй SECURITE для частной информации."),
    ],
    exam: b(
      "Kolejność pierwszeństwa: distress, urgency, safety, routine. Naucz się definicji, ale rozwiązuj pytania przez ocenę zagrożenia.",
      "Приоритет: distress, urgency, safety, routine. Знай определения, но решай через оценку угрозы.",
    ),
    practice: b(
      "Kontekst zmienia kategorię. Brak napędu, przeciek lub uraz nie mają jednej stałej etykiety bez informacji o skutkach.",
      "Контекст меняет категорию. Потеря хода, течь или травма не имеют одной метки без оценки последствий.",
    ),
    world: b(
      "Znaczenie trzech sygnałów jest globalne. Australia dopuszcza lokalne kanały alarmowe, ale kategorie pozostają te same.",
      "Значение трёх сигналов глобально. Австралия допускает местные аварийные каналы, но категории те же.",
    ),
    questionTopics: [
      b("definicje priorytetów", "определения приоритетов"),
      b("człowiek za burtą", "человек за бортом"),
      b("ostrzeżenia", "предупреждения"),
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
    title: b("Jak nadać skuteczny MAYDAY", "Как передать эффективный MAYDAY"),
    eyebrow: b("Każda linia ma cel", "У каждой строки есть цель"),
    lead: b(
      "Dobry MAYDAY odpowiada ratownikowi na pięć pytań: kto, gdzie, co się stało, jakiej pomocy trzeba i ilu ludzi jest zagrożonych.",
      "Хороший MAYDAY отвечает спасателю: кто, где, что произошло, какая помощь нужна и сколько людей под угрозой.",
    ),
    situation: b(
      "Po kolizji jacht szybko nabiera wody. Załoga ma mało czasu, dlatego najpierw alarm DSC, potem zwięzły komunikat głosowy.",
      "После столкновения яхта быстро набирает воду. Времени мало, поэтому сначала DSC, затем короткое голосовое сообщение.",
    ),
    why: b(
      "Stała kolejność chroni przed pominięciem pozycji lub rodzaju pomocy. Powtórzenia na początku pomagają rozpoznać sygnał w szumie.",
      "Постоянный порядок защищает от пропуска позиции или вида помощи. Повтор в начале помогает распознать сигнал в шуме.",
    ),
    concepts: [
      {
        title: b("Alarm DSC", "Сигнал DSC"),
        body: b("Jeśli radio jest dostępne i czas pozwala, wyślij distress na 70 przed fonią.", "Если рация доступна и есть время, отправь distress на 70 до голосового сообщения."),
      },
      {
        title: b("Pozycja", "Позиция"),
        body: b("Podaj szerokość i długość albo jednoznaczny namiar i odległość od znanego punktu.", "Передай широту и долготу либо однозначный пеленг и расстояние от известной точки."),
      },
      {
        title: b("Natura i pomoc", "Характер и помощь"),
        body: b("FIRE, FLOODING, COLLISION, MAN OVERBOARD oraz konkretna potrzebna pomoc.", "FIRE, FLOODING, COLLISION, MAN OVERBOARD и конкретная нужная помощь."),
      },
    ],
    steps: [
      b("MAYDAY x3, THIS IS, nazwa jednostki x3, call sign i MMSI.", "MAYDAY x3, THIS IS, имя судна x3, позывной и MMSI."),
      b("MAYDAY, nazwa jednostki.", "MAYDAY, имя судна."),
      b("MY POSITION IS, pozycja i czas, jeżeli potrzebny.", "MY POSITION IS, позиция и при необходимости время."),
      b("Natura zagrożenia i I REQUIRE IMMEDIATE ASSISTANCE.", "Характер аварии и I REQUIRE IMMEDIATE ASSISTANCE."),
      b("Liczba osób, informacje pomocne, OVER.", "Число людей, полезные сведения, OVER."),
    ],
    allowed: [
      b("Nadaj głosowy MAYDAY bez DSC, gdy DSC nie działa albo nie ma czasu na jego obsługę.", "Передай голосовой MAYDAY без DSC, если DSC не работает или времени нет."),
      b("Powtórz komunikat, gdy nie ma odpowiedzi.", "Повтори сообщение, если нет ответа."),
    ],
    forbidden: [
      b("Nie opóźniaj alarmu, aby ułożyć idealne zdanie.", "Не задерживай сигнал ради идеальной фразы."),
      b("Nie podawaj samej nazwy miejsca, jeśli odbiorca może jej nie znać.", "Не называй только местное место, которое адресат может не знать."),
    ],
    exam: b(
      "Na egzaminie zachowaj pełną kolejność i standardowe frazy. Po DSC distress przejdź na kanał 16 i nadaj MAYDAY.",
      "На экзамене сохраняй полный порядок и стандартные фразы. После DSC distress перейди на 16 и передай MAYDAY.",
    ),
    practice: b(
      "W realnym bezpośrednim zagrożeniu priorytetem jest skuteczne wezwanie. Nieudane DSC nie unieważnia poprawnego wezwania głosowego.",
      "В реальной непосредственной угрозе главное эффективно вызвать помощь. Неудача DSC не отменяет правильный голосовой вызов.",
    ),
    world: b(
      "Struktura MAYDAY i angielskie frazy są międzynarodowe. Lokalne RCC może poprosić o dodatkowe dane.",
      "Структура MAYDAY и английские фразы международные. Местное RCC может запросить дополнительные данные.",
    ),
    questionTopics: [
      b("kolejność MAYDAY", "порядок MAYDAY"),
      b("pozycja i natura", "позиция и характер аварии"),
      b("DSC przed fonią", "DSC до голоса"),
    ],
    sourceIds: ["uke", "imo1658", "m541", "smcp"],
    practiceHref: "/radio/rozmowa",
    practiceLabel: b("Nadaj MAYDAY na głos", "Передать MAYDAY голосом"),
    minutes: 17,
  },
  {
    id: "receive",
    number: 10,
    diagram: "receive",
    title: b("Co robić po odebraniu distress", "Что делать после приёма distress"),
    eyebrow: b("Słuchaj, oceniaj, nie przeszkadzaj", "Слушай, оценивай, не мешай"),
    lead: b(
      "Odbiorca nie powinien automatycznie naciskać ACK. Najpierw sprawdza, czy stacja brzegowa lub RCC przejęły alarm i czy może realnie pomóc.",
      "Получатель не должен автоматически нажимать ACK. Сначала проверяют, принял ли сигнал берег или RCC и может ли судно помочь.",
    ),
    situation: b(
      "Radio odbiera DSC distress. Przez pięć minut słuchasz 16, widzisz ACK stacji brzegowej i korespondencję MAYDAY. Nie dokładasz kolejnego DSC ACK.",
      "Рация принимает DSC distress. Пять минут слушаешь 16, видишь ACK берега и слышишь MAYDAY. Дополнительный DSC ACK не отправляешь.",
    ),
    why: b(
      "Wiele jednoczesnych potwierdzeń może zatkać kanał i stworzyć chaos. Koordynację powinien przejąć RCC lub stacja brzegowa, jeśli są dostępne.",
      "Много одновременных подтверждений загружают канал и создают хаос. Координацию должен принять RCC или берег, если они доступны.",
    ),
    concepts: [
      {
        title: b("ACK fonią", "ACK голосом"),
        body: b("Statek zwykle potwierdza na kanale 16 słowami RECEIVED MAYDAY, gdy brak potwierdzenia brzegu i może pomóc.", "Судно обычно подтверждает голосом на 16 словами RECEIVED MAYDAY, если берег не ответил и помощь возможна."),
      },
      {
        title: b("MAYDAY RELAY", "MAYDAY RELAY"),
        body: b("Przekaz wezwania, gdy zagrożona stacja nie może skutecznie alarmować albo potrzebna jest dalsza retransmisja.", "Ретрансляция, когда судно в бедствии не может эффективно вызвать помощь или нужна передача дальше."),
      },
      {
        title: b("Cisza radiowa", "Радиомолчание"),
        body: b("SEELONCE MAYDAY chroni korespondencję distress. SEELONCE FEENEE kończy ograniczenie.", "SEELONCE MAYDAY защищает аварийный обмен. SEELONCE FEENEE завершает ограничение."),
      },
    ],
    steps: [
      b("Przerwij nadawanie, zanotuj MMSI, pozycję, czas i naturę distress.", "Прекрати передачу, запиши MMSI, позицию, время и характер бедствия."),
      b("Ustaw kanał 16 i słuchaj przez 5 minut.", "Перейди на 16 и слушай 5 минут."),
      b("Sprawdź, czy stacja brzegowa lub RCC potwierdziły alarm i prowadzą ruch.", "Проверь, подтвердили ли берег или RCC сигнал и ведут ли обмен."),
      b("Jeśli nie, potwierdź fonią, poinformuj brzeg lub RCC i oceń zdolność pomocy.", "Если нет, подтверди голосом, сообщи берегу или RCC и оцени возможность помочь."),
      b("DSC ACK ze statku wysyłaj tylko po konsultacji, gdy alarm nadal się powtarza.", "DSC ACK с судна отправляй только после консультации, если сигнал продолжает повторяться."),
    ],
    allowed: [
      b("Przygotuj się do pomocy, ale nie narażaj bez potrzeby swojej załogi.", "Готовься помочь, но не подвергай свою команду ненужному риску."),
      b("Prowadź dokładne notatki z czasem.", "Веди точные записи с временем."),
    ],
    forbidden: [
      b("Nie wysyłaj odruchowo DSC ACK z jednostki.", "Не отправляй DSC ACK автоматически."),
      b("Nie kontynuuj zwykłej rozmowy na kanale zajętym przez distress.", "Не продолжай обычный разговор на канале аварийного обмена."),
    ],
    exam: b(
      "Starsze skróty bywają uproszczone. Aktualna procedura IMO: 5 minut nasłuchu na 16, ocena ACK brzegu, potem potwierdzenie fonią i kontakt z brzegiem lub RCC.",
      "Старые конспекты упрощают. Текущая процедура IMO: 5 минут слушать 16, проверить ACK берега, затем голосовое подтверждение и связь с берегом или RCC.",
    ),
    practice: b(
      "Twoja odpowiedź zależy od odległości, możliwości jednostki, pogody i tego, czy koordynator już prowadzi akcję.",
      "Твой ответ зависит от расстояния, возможностей судна, погоды и того, ведёт ли уже операцию координатор.",
    ),
    world: b(
      "Procedura IMO jest wspólnym standardem morskim. Lokalna stacja może wydać dodatkowe polecenia.",
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
    eyebrow: b("Urządzenia nie robią tego samego", "Устройства делают разное"),
    lead: b(
      "EPIRB, NAVTEX, radar SART i AIS-SART należą do jednego systemu, ale odpowiadają na różne pytania.",
      "EPIRB, NAVTEX, radar SART и AIS-SART входят в одну систему, но отвечают на разные вопросы.",
    ),
    situation: b(
      "Po opuszczeniu jachtu EPIRB alarmuje przez satelitę, a SART lub AIS-SART pomaga jednostce ratowniczej znaleźć tratwę na ostatnich milach.",
      "После оставления яхты EPIRB подаёт сигнал через спутник, а SART или AIS-SART помогает спасателям найти плот на последних милях.",
    ),
    why: b(
      "Daleki alarm satelitarny i precyzyjne naprowadzanie w pobliżu wymagają innych technologii. Redundancja chroni, gdy jeden tor zawiedzie.",
      "Дальний спутниковый сигнал и точное наведение рядом требуют разных технологий. Резервирование защищает при отказе одного канала.",
    ),
    concepts: [
      {
        title: b("EPIRB 406 MHz", "EPIRB 406 МГц"),
        body: b("Nadaje identyfikator do COSPAS-SARSAT, często także pozycję GNSS. Sygnał 121,5 MHz pomaga w namierzaniu.", "Передаёт идентификатор в COSPAS-SARSAT, часто и позицию GNSS. 121,5 МГц помогает пеленгованию."),
      },
      {
        title: b("Radar SART i AIS-SART", "Radar SART и AIS-SART"),
        body: b("Radar SART odpowiada radarowi 9 GHz i tworzy charakterystyczne echa. AIS-SART wysyła komunikaty widoczne w AIS, nie na radarze.", "Radar SART отвечает радару 9 ГГц и создаёт характерные отметки. AIS-SART передаёт в AIS, не на радар."),
      },
      {
        title: b("NAVTEX", "NAVTEX"),
        body: b("Automatycznie odbiera Maritime Safety Information: ostrzeżenia, prognozy i komunikaty SAR.", "Автоматически принимает Maritime Safety Information: предупреждения, прогнозы и сообщения SAR."),
      },
    ],
    steps: [
      b("EPIRB uruchom zgodnie z instrukcją i umieść z czystym widokiem nieba.", "Включи EPIRB по инструкции и размести с открытым небом."),
      b("SART lub AIS-SART włącz po opuszczeniu jednostki i umieść możliwie wysoko.", "SART или AIS-SART включи после оставления судна и установи как можно выше."),
      b("NAVTEX zaprogramuj dla obszaru i typów komunikatów przed rejsem.", "NAVTEX настрой на район и типы сообщений до рейса."),
      b("Po przypadkowym uruchomieniu natychmiast odwołaj fałszywy alarm przez służby.", "После случайного включения немедленно отмени ложный сигнал через службы."),
    ],
    allowed: [
      b("Rejestruj EPIRB i aktualizuj dane kontaktowe.", "Регистрируй EPIRB и обновляй контакты."),
      b("Kontroluj baterie, daty serwisowe i mocowanie zwalniaka hydrostatycznego.", "Проверяй батареи, сервисные даты и гидростатическое крепление."),
    ],
    forbidden: [
      b("Nie zakładaj, że AIS-SART zobaczysz jako echo radarowe.", "Не ожидай увидеть AIS-SART как радарную отметку."),
      b("Nie chowaj aktywnego EPIRB pod metalowym pokładem.", "Не прячь активный EPIRB под металлической палубой."),
    ],
    exam: b(
      "Rozróżniaj tor detekcji: EPIRB przez satelitę, radar SART przez radar pasma X, AIS-SART przez odbiornik AIS, NAVTEX jako odbiornik informacji.",
      "Различай путь: EPIRB через спутник, radar SART через X-band radar, AIS-SART через AIS, NAVTEX как приёмник информации.",
    ),
    practice: b(
      "Uruchomienie, test i serwis zależą od konkretnego modelu. Czytaj instrukcję na obudowie, nie improwizuj z magnesem lub zwalniakiem.",
      "Включение, тест и сервис зависят от модели. Читай инструкцию на корпусе, не импровизируй с магнитом или креплением.",
    ),
    world: b(
      "Obszary A1-A4 opisują dostęp do środków alarmowania, nie odległość od Polski. Wyposażenie wymagane prawem zależy od typu i rejonu eksploatacji statku.",
      "Районы A1-A4 описывают доступ к средствам связи, а не расстояние от Польши. Обязательное оснащение зависит от типа судна и района эксплуатации.",
    ),
    questionTopics: [
      b("EPIRB i COSPAS-SARSAT", "EPIRB и COSPAS-SARSAT"),
      b("SART oraz AIS-SART", "SART и AIS-SART"),
      b("NAVTEX i obszary A1-A4", "NAVTEX и районы A1-A4"),
    ],
    sourceIds: ["uke", "cept", "m541"],
    practiceHref: "/radio/zadania",
    practiceLabel: b("Rozpoznaj urządzenia", "Распознать устройства"),
    minutes: 18,
  },
  {
    id: "world",
    number: 12,
    diagram: "world",
    title: b("Europa i świat: rdzeń plus nakładka", "Европа и мир: основа плюс местный слой"),
    eyebrow: b("Nie zabieraj lokalnych nawyków za granicę", "Не переноси местные привычки за границу"),
    lead: b(
      "MAYDAY, DSC i SMCP tworzą wspólny rdzeń. Plan kanałów, moc, inland ATIS i praktyka radio check są lokalną nakładką.",
      "MAYDAY, DSC и SMCP образуют общий фундамент. Каналы, мощность, inland ATIS и radio check зависят от региона.",
    ),
    situation: b(
      "Radio ustawione na europejski INT trafia do USA. Ten sam numer kanału może mieć inny tryb. Na europejskiej drodze śródlądowej włącza się ATIS, a DSC może być niedozwolone.",
      "Рация в режиме INT прибывает в США. Тот же номер может иметь другой режим. На европейских внутренних водах включают ATIS, а DSC может быть запрещено.",
    ),
    why: b(
      "ITU ustala wspólne ramy, lecz administracje zarządzają wykorzystaniem widma i służbami na swoim obszarze.",
      "ITU задаёт общую рамку, но страны управляют использованием частот и службами на своей территории.",
    ),
    concepts: [
      {
        title: b("Morze w Europie", "Море в Европе"),
        body: b("Zwykle plan INT, DSC na 70, obowiązek nasłuchu i lokalne kanały portu lub VTS.", "Обычно план INT, DSC на 70, дежурный приём и местные каналы порта или VTS."),
      },
      {
        title: b("Europejskie inland", "Внутренние воды Европы"),
        body: b("RAINWAT stosuje ATIS. Na wielu drogach DSC i dual watch nie są dozwolone, a moc bywa ograniczona.", "RAINWAT использует ATIS. На многих внутренних путях DSC и dual watch запрещены, мощность ограничена."),
      },
      {
        title: b("Poza Europą", "Вне Европы"),
        body: b("USA i Kanada mają własne warianty kanałów. Australia publikuje lokalne kanały i procedury, w tym kanał 67 w niektórych sytuacjach distress.", "США и Канада имеют свои варианты каналов. Австралия публикует местные каналы и процедуры, включая канал 67 в некоторых аварийных ситуациях."),
      },
    ],
    steps: [
      b("Przed rejsem pobierz aktualny plan kanałów administracji i portów.", "До рейса скачай актуальный план каналов страны и портов."),
      b("Ustaw poprawny region radia: INT, USA lub CAN.", "Выбери правильный регион рации: INT, USA или CAN."),
      b("Sprawdź wymagania operatora, pozwolenia radiowego, MMSI i ATIS.", "Проверь требования к оператору, разрешению, MMSI и ATIS."),
      b("W portach słuchaj instrukcji VTS, harbourmaster i almanachu.", "В портах следуй VTS, harbourmaster и альманаху."),
    ],
    allowed: [
      b("Traktuj lokalny plan jako nakładkę na międzynarodową procedurę.", "Рассматривай местный план как слой поверх международной процедуры."),
      b("W razie wątpliwości użyj oficjalnego źródła administracji, nie starej tabeli z internetu.", "При сомнении используй официальный источник, а не старую таблицу."),
    ],
    forbidden: [
      b("Nie zakładaj, że kanał roboczy mariny jest taki sam w każdym kraju.", "Не считай, что рабочий канал марины одинаков везде."),
      b("Nie wykonuj radio check na kanale 16, jeśli lokalna procedura wskazuje inny kanał lub test DSC.", "Не делай radio check на 16, если местные правила указывают другой канал или DSC test."),
    ],
    exam: b(
      "Egzamin UKE sprawdza program SRC i praktykę stosowaną w Polsce. Odpowiadaj według oficjalnego materiału, ale oznaczaj w pamięci, co jest regułą globalną, a co regionalną.",
      "Экзамен UKE проверяет программу SRC и польскую практику. Отвечай по официальному материалу, но различай глобальные и региональные правила.",
    ),
    practice: b(
      "Na rejsie sprawdzaj Notices to Mariners, almanach, informacje portowe i strony administracji. Kurs nie może zastąpić aktualnego planu lokalnego.",
      "В рейсе проверяй Notices to Mariners, альманах, портовые данные и сайты администрации. Курс не заменяет актуальный местный план.",
    ),
    world: b(
      "Najbezpieczniejszy model: globalny rdzeń ITU, IMO i SMCP plus krajowa nakładka kanałów, uprawnień i praktyki.",
      "Безопасная модель: глобальная основа ITU, IMO и SMCP плюс национальный слой каналов, документов и практики.",
    ),
    questionTopics: [
      b("INT, USA i CAN", "INT, USA и CAN"),
      b("ATIS i inland", "ATIS и внутренние воды"),
      b("praktyka lokalna", "местная практика"),
    ],
    sourceIds: ["uke", "appendix18", "rainwat", "uscg", "acma"],
    practiceHref: "/radio/test",
    practiceLabel: b("Sprawdź całą bazę UKE", "Проверить всю базу UKE"),
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
