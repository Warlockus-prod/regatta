// The 26 official UKE SRC practical exam tasks (zadania praktyczne),
// verbatim from materialy_do_testu_src.pdf (bip.uke.gov.pl). The published
// materials give A/B/C options but NO answer key, so this file records the
// correct GMDSS/ICOM procedure for each task (not a graded multiple choice),
// with a link to the simulator scenario or guide lesson that trains it.
// PL text is ASCII (project typography rule); RU is an opt-in aid.

export type TaskGroup = 'device' | 'voice' | 'dsc' | 'epirb-sart';

export interface PracticalTask {
  n: number;
  group: TaskGroup;
  /** the official task, verbatim (Polish). */
  task: string;
  /** the correct procedure to perform it. */
  how: { pl: string; ru: string };
  /** simulator scenario id that lets you demonstrate it, if any. */
  scenario?: string;
  /** guide anchor / interactive course, if the practice lives there. */
  guide?: string;
}

export const GROUP_LABEL: Record<TaskGroup, { pl: string; ru: string }> = {
  device: { pl: 'Obsluga radiotelefonu', ru: 'Работа с рацией' },
  voice: { pl: 'Lacznosc glosowa', ru: 'Голосовая связь' },
  dsc: { pl: 'Cyfrowe selektywne wywolanie (DSC)', ru: 'Цифровой избирательный вызов (DSC)' },
  'epirb-sart': { pl: 'EPIRB i transponder radarowy (SART)', ru: 'EPIRB и радарный ответчик (SART)' },
};

export const PRACTICAL_TASKS: PracticalTask[] = [
  {
    n: 1, group: 'device',
    task: 'Wlacz i przygotuj do pracy radiotelefon VHF dla lacznosci pokladowej.',
    how: {
      pl: 'Przytrzymaj PWR (wlaczenie), ustaw kanal pokladowy o malej mocy, przelacz moc na 1 W ([HI/LO]), ustaw glosnosc (VOL) i prog blokady szumow (SQL).',
      ru: 'Удержи PWR (включение), выставь бортовой канал малой мощности, переключи мощность на 1 Вт ([HI/LO]), настрой громкость (VOL) и порог шумоподавителя (SQL).',
    },
    guide: 'interaktywny-kurs',
  },
  {
    n: 2, group: 'device',
    task: 'Wlacz i przygotuj do pracy radiotelefon VHF dla lacznosci alarmowej.',
    how: {
      pl: 'Przytrzymaj PWR, wcisnij [16/C] (kanal 16), ustaw pelna moc 25 W ([HI/LO]), podnies glosnosc i otworz blokade szumow, aby nie przegapic slabego wywolania.',
      ru: 'Удержи PWR, нажми [16/C] (канал 16), выставь полную мощность 25 Вт ([HI/LO]), подними громкость и открой шумоподавитель, чтобы не пропустить слабый вызов.',
    },
    guide: 'interaktywny-kurs',
  },
  {
    n: 3, group: 'device',
    task: 'Dokonaj redukcji mocy radiotelefonu VHF.',
    how: {
      pl: 'Przyciskiem funkcyjnym [HI/LO] zmien moc wyjsciowa z 25 W na 1 W. Pokretla VOL/SQL nie zmieniaja mocy.',
      ru: 'Софтклавишей [HI/LO] смени мощность с 25 Вт на 1 Вт. Ручки VOL/SQL мощность не меняют.',
    },
    scenario: 'radio-check', guide: 'interaktywny-kurs',
  },
  {
    n: 4, group: 'device',
    task: 'Ustaw podwojny nasluch w radiotelefonie VHF na kanalach 14 i 16.',
    how: {
      pl: 'Ustaw kanal 14 (przyciski CH), nacisnij softkey [DW]. Dual Watch naprzemiennie slucha kanalu roboczego 14 i kanalu 16.',
      ru: 'Выставь канал 14 (клавиши CH), нажми софтклавишу [DW]. Dual Watch попеременно слушает рабочий 14 и канал 16.',
    },
    guide: 'interaktywny-kurs',
  },
  {
    n: 5, group: 'device',
    task: 'Ustaw intensywnosc podswietlenia wyswietlacza i przyciskow w radiotelefonie VHF.',
    how: {
      pl: 'Strzalkami przydziel funkcje [BKLT] do softkeya, nacisnij [BKLT], a nastepnie pokretlem VOL/SQL (DIAL) ustaw jasnosc podswietlenia.',
      ru: 'Стрелками назначь функцию [BKLT] на софтклавишу, нажми [BKLT], затем ручкой VOL/SQL (DIAL) выставь яркость подсветки.',
    },
    guide: 'interaktywny-kurs',
  },
  {
    n: 6, group: 'device',
    task: 'Sprawdz, ktore kanaly sa wpisane do pamieci skanowania radiotelefonu.',
    how: {
      pl: 'Kanaly nalezace do listy skaningowej maja na wyswietlaczu znacznik (TAG). Przewijaj kanaly przyciskami CH i zobacz, ktore sa oznaczone tym symbolem.',
      ru: 'Каналы из списка сканирования помечены на дисплее меткой (TAG). Пролистай каналы клавишами CH и посмотри, какие отмечены этим символом.',
    },
  },
  {
    n: 7, group: 'device',
    task: 'Dodaj kanaly 6, 13 i 16 do listy skaningowej w radiotelefonie VHF.',
    how: {
      pl: 'Ustaw kanal 6, nacisnij softkey dodawania do skanu (TAG/FAV), powtorz dla kanalu 13 i 16. Kazdy dostaje znacznik listy skaningowej.',
      ru: 'Выставь канал 6, нажми софтклавишу добавления в скан (TAG/FAV), повтори для 13 и 16. Каждый получает метку списка сканирования.',
    },
  },
  {
    n: 8, group: 'voice',
    task: 'Nadaj ostrzezenie nawigacyjne przy uzyciu radiotelefonu VHF.',
    how: {
      pl: 'Na kanale 16 nadaj zapowiedz SECURITE ze wskazaniem kanalu roboczego, przejdz na kanal roboczy i tam podaj tresc ostrzezenia. Zakoncz OUT.',
      ru: 'На канале 16 передай объявление SECURITE с указанием рабочего канала, перейди на рабочий канал и там передай текст предупреждения. Заверши OUT.',
    },
    scenario: 'securite-hazard',
  },
  {
    n: 9, group: 'voice',
    task: 'Nadaj komunikat alarmowy przy uzyciu radiotelefonu VHF.',
    how: {
      pl: 'Ustaw kanal 16, nadaj wywolanie alarmowe (MAYDAY x3, THIS IS + nazwa x3), po krotkiej przerwie nadaj tresc: pozycja, rodzaj zagrozenia, potrzebna pomoc, liczba osob, OVER.',
      ru: 'Выставь канал 16, передай аварийный вызов (MAYDAY x3, THIS IS + название x3), после короткой паузы передай текст: позиция, род бедствия, нужная помощь, число людей, OVER.',
    },
    scenario: 'fire-mayday',
  },
  {
    n: 10, group: 'voice',
    task: 'Nadaj komunikat w sytuacji wypadniecia czlowieka za burte przy uzyciu radiotelefonu VHF.',
    how: {
      pl: 'Wg UKE czlowiek za burta to zagrozenie zycia: na kanale 16 nadaj MAYDAY x3, THIS IS znak wlasnej stacji x3, potem MAYDAY + nazwa, POSITION..., MAN OVERBOARD, REQUIRE IMMEDIATE ASSISTANCE, liczba osob, OVER. Uwaga: w wywolaniu MAYDAY nie ma ALL STATIONS - samo slowo MAYDAY jest sygnalem do wszystkich. W symulatorze widoczny MOB cwiczymy jako PAN-PAN (ocena sytuacji).',
      ru: 'По UKE человек за бортом - угроза жизни: на канале 16 передай MAYDAY x3, THIS IS свой позывной x3, затем MAYDAY + название, POSITION..., MAN OVERBOARD, REQUIRE IMMEDIATE ASSISTANCE, число людей, OVER. Важно: в вызове MAYDAY нет ALL STATIONS - само слово MAYDAY уже сигнал всем. В симуляторе видимого MOB отрабатываем как PAN-PAN (оценка ситуации).',
    },
    scenario: 'mob-panpan',
  },
  {
    n: 11, group: 'voice',
    task: 'Potwierdz odbior alarmu przy uzyciu radiotelefonu VHF.',
    how: {
      pl: 'Wcisnij [16/C], sprawdz moc, nadaj: MAYDAY, znak stacji zagrozonej x3, THIS IS znak wlasnej stacji x3, RECEIVED MAYDAY. Rob to glosem, gdy stacja brzegowa nie potwierdza.',
      ru: 'Нажми [16/C], проверь мощность, передай: MAYDAY, позывной судна в беде x3, THIS IS свой позывной x3, RECEIVED MAYDAY. Делай это голосом, когда береговая станция не подтверждает.',
    },
    scenario: 'receive-distress',
  },
  {
    n: 12, group: 'voice',
    task: 'Wywolaj inny statek przy uzyciu radiotelefonu VHF i przeprowadz z nim zwykla korespondencje publiczna.',
    how: {
      pl: 'Wcisnij [16/C], nadaj: znak wywolywanej stacji, znak wlasnej stacji x2. Po zgloszeniu uzgodnij kanal roboczy, ustaw go i prowadz rozmowe. Kanal 16 zostaje wolny.',
      ru: 'Нажми [16/C], передай: позывной вызываемой станции, свой позывной x2. После ответа согласуй рабочий канал, выставь его и веди разговор. Канал 16 остаётся свободным.',
    },
    scenario: 'routine-marina',
  },
  {
    n: 13, group: 'voice',
    task: 'Nadaj posrednie alarmowanie za inny statek bedacy w niebezpieczenstwie.',
    how: {
      pl: 'Wcisnij [16/C], nadaj: MAYDAY RELAY x3, nazwa wywolywanej stacji x3, THIS IS znak wlasnej stacji x3, tresc (nazwa, pozycja, rodzaj zagrozenia jednostki w niebezpieczenstwie), OVER. Nie uzywasz czerwonego DISTRESS.',
      ru: 'Нажми [16/C], передай: MAYDAY RELAY x3, название вызываемой станции x3, THIS IS свой позывной x3, текст (название, позиция, род бедствия судна в беде), OVER. Красную DISTRESS не используешь.',
    },
    scenario: 'mayday-relay',
  },
  {
    n: 14, group: 'device',
    task: 'Wprowadz pozycje geograficzna oraz aktualny czas.',
    how: {
      pl: 'MENU -> DSC Settings -> Position Input. Strzalkami i [ENT] wprowadz szerokosc, dlugosc geograficzna oraz czas UTC, zatwierdz. Wazna pozycja jest kluczowa dla alarmu DSC.',
      ru: 'MENU -> DSC Settings -> Position Input. Стрелками и [ENT] введи широту, долготу и время UTC, подтверди. Актуальная позиция критична для DSC-алерта.',
    },
  },
  {
    n: 15, group: 'device',
    task: 'Wprowadz do rejestru radiotelefonu numer MMSI dunskiej stacji brzegowej Lyngby.',
    how: {
      pl: 'MENU -> DSC Settings -> Individual ID -> softkey [ADD]. Wprowadz ID stacji 002191000 i nazwe LYNGBY, zatwierdz. Zapisany adres przyspiesza pozniejsze wywolania.',
      ru: 'MENU -> DSC Settings -> Individual ID -> софтклавиша [ADD]. Введи ID станции 002191000 и имя LYNGBY, подтверди. Сохранённый адрес ускоряет последующие вызовы.',
    },
  },
  {
    n: 16, group: 'device',
    task: 'Usun z rejestru radiotelefonu numer MMSI stacji brzegowej Lyngby.',
    how: {
      pl: 'MENU -> DSC Settings -> Individual ID -> zaznacz LYNGBY -> softkey [DEL] -> potwierdz [OK].',
      ru: 'MENU -> DSC Settings -> Individual ID -> выбери LYNGBY -> софтклавиша [DEL] -> подтверди [OK].',
    },
  },
  {
    n: 17, group: 'dsc',
    task: 'Nadaj wywolanie testujace DSC.',
    how: {
      pl: 'MENU -> DSC Calls -> Test Call. Wybierz stacje brzegowa z rejestru (lub wprowadz recznie), nacisnij [CALL] i oczekuj automatycznego potwierdzenia (ACK). Bez czesci glosowej.',
      ru: 'MENU -> DSC Calls -> Test Call. Выбери береговую станцию из реестра (или введи вручную), нажми [CALL] и жди автоматического подтверждения (ACK). Без голосовой части.',
    },
    scenario: 'dsc-test',
  },
  {
    n: 18, group: 'dsc',
    task: 'Nadaj regularne wywolanie alarmowe DSC.',
    how: {
      pl: 'MENU -> DSC Calls -> Distress Call. Wybierz rodzaj zagrozenia z listy, nacisnij [ENT] dwukrotnie, przytrzymaj czerwony DISTRESS przez 3 sekundy. Gdy alert pojdzie, radio przechodzi na kanal 16 - od razu nadaj MAYDAY glosem, nie czekajac na ACK. Radio samo powtarza alert DSC az do nadejscia potwierdzenia.',
      ru: 'MENU -> DSC Calls -> Distress Call. Выбери род бедствия из списка, нажми [ENT] дважды, удержи красную DISTRESS 3 секунды. Когда алерт уйдет, рация переходит на канал 16 - сразу передавай MAYDAY голосом, не дожидаясь ACK. Рация сама повторяет DSC-алерт до прихода подтверждения.',
    },
    scenario: 'fire-mayday',
  },
  {
    n: 19, group: 'dsc',
    task: 'Nadaj wywolanie alarmowe DSC o zalaniu jednostki woda.',
    how: {
      pl: 'MENU -> DSC Calls -> Distress Call -> wybierz rodzaj zagrozenia Flooding (zalanie), [ENT] dwukrotnie, przytrzymaj DISTRESS 3 sekundy. Rodzaj zagrozenia trafia do cyfrowego alertu. Gdy alert pojdzie, radio przechodzi na kanal 16 - od razu nadaj MAYDAY glosem, nie czekajac na ACK. Radio samo powtarza alert DSC az do nadejscia potwierdzenia.',
      ru: 'MENU -> DSC Calls -> Distress Call -> выбери род бедствия Flooding (затопление), [ENT] дважды, удержи DISTRESS 3 секунды. Род бедствия уходит в цифровой алерт. Когда алерт уйдет, рация переходит на канал 16 - сразу передавай MAYDAY голосом, не дожидаясь ACK. Рация сама повторяет DSC-алерт до прихода подтверждения.',
    },
    scenario: 'fire-mayday',
  },
  {
    n: 20, group: 'dsc',
    task: 'Nadaj w DSC zapowiedz prosby o pomoc medyczna do innych statkow.',
    how: {
      pl: 'MENU -> DSC Calls -> All Ships Call -> wybierz kategorie Urgency, [ENT], wskaz kanal do korespondencji glosowej, [ENT]. Nastepnie na 16 nadaj PAN-PAN z prosba o porade medyczna.',
      ru: 'MENU -> DSC Calls -> All Ships Call -> выбери категорию Urgency, [ENT], укажи канал для голосовой связи, [ENT]. Затем на 16 передай PAN-PAN с просьбой о медконсультации.',
    },
    scenario: 'panpan-medico',
  },
  {
    n: 21, group: 'dsc',
    task: 'Nadaj w DSC wywolanie zwykle w korespondencji publicznej do innego statku.',
    how: {
      pl: 'MENU -> DSC Calls -> Individual Call -> wybierz stacje statkowa z rejestru (lub recznie), [ENT], wskaz kanal do korespondencji glosowej, [ENT]. Po ACK przejdz na kanal i rozmawiaj.',
      ru: 'MENU -> DSC Calls -> Individual Call -> выбери судовую станцию из реестра (или вручную), [ENT], укажи канал для голосовой связи, [ENT]. После ACK перейди на канал и говори.',
    },
    scenario: 'routine-ship',
  },
  {
    n: 22, group: 'dsc',
    task: 'Nadaj w DSC wywolanie do stacji brzegowej w celu przeprowadzenia rozmowy z operatorem.',
    how: {
      pl: 'MENU -> DSC Calls -> Individual Call -> wybierz stacje brzegowa z rejestru (lub recznie), [ENT], nacisnij [CALL] i oczekuj wskazania kanalu do korespondencji glosowej przez stacje brzegowa.',
      ru: 'MENU -> DSC Calls -> Individual Call -> выбери береговую станцию из реестра (или вручную), [ENT], нажми [CALL] и жди, пока береговая станция укажет канал для голосовой связи.',
    },
    scenario: 'routine-ship',
  },
  {
    n: 23, group: 'epirb-sart',
    task: 'Sposob postepowania z radioplawa EPIRB, bedac na tratwie ratunkowej.',
    how: {
      pl: 'Wcisnij przycisk ON na zabranej ze statku radioplawie, przywiaz ja linka (lanyard) do tratwy i pozwol jej plywac w wodzie obok tratwy - jest tak zaprojektowana, ze utrzymuje sie antena do gory. Ewentualnie trzymaj ja w rece, antena pionowo i z otwartym widokiem na niebo.',
      ru: 'Нажми кнопку ON на снятом с судна EPIRB, привяжи его линем (lanyard) к плоту и дай ему плавать в воде рядом с плотом - он сконструирован так, что держится антенной вверх. Либо держи его в руке, антенной вертикально и с открытым видом на небо.',
    },
  },
  {
    n: 24, group: 'epirb-sart',
    task: 'Przetestuj radioplawe EPIRB.',
    how: {
      pl: 'Zdejmij radioplawe z obudowy, przesun dzwignie w polozenie TEST i obserwuj jej zachowanie - powinno byc zgodne z opisem na obudowie. Testuj krotko i rzadko (bateria).',
      ru: 'Сними EPIRB с кронштейна, переведи рычаг в положение TEST и наблюдай поведение - оно должно соответствовать описанию на корпусе. Тестируй коротко и редко (батарея).',
    },
  },
  {
    n: 25, group: 'epirb-sart',
    task: 'Uruchom transponder radarowy (SART), bedac na tratwie ratunkowej.',
    how: {
      pl: 'Przywiaz zabrany ze statku transponder radarowy do tratwy, wcisnij przycisk uruchomienia i umiesc go mozliwie wysoko - im wyzej, tym wiekszy zasieg wykrycia przez radar.',
      ru: 'Привяжи снятый с судна SART к плоту, нажми кнопку включения и размести его как можно выше - чем выше, тем больше дальность обнаружения радаром.',
    },
  },
  {
    n: 26, group: 'epirb-sart',
    task: 'Przetestuj transponder radarowy (SART).',
    how: {
      pl: 'Wcisnij przycisk uruchomienia na okolo 5 sekund i obserwuj zachowanie zgodne z opisem na transponderze, po czym wylacz. Test krotki, aby nie wywolac falszywego sygnalu na radarach.',
      ru: 'Нажми кнопку включения примерно на 5 секунд и наблюдай поведение по описанию на корпусе, затем выключи. Тест короткий, чтобы не дать ложный сигнал на радарах.',
    },
  },
];
