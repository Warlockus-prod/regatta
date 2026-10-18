// The 26 official UKE SRC practical exam tasks (zadania praktyczne),
// verbatim from materialy_do_testu_src.pdf (bip.uke.gov.pl). The published
// materials give A/B/C options but NO answer key, so this file records the
// correct GMDSS/ICOM procedure for each task (not a graded multiple choice),
// with a link to the simulator scenario or guide lesson that trains it.
// PL text uses full diacritics (AGENTS.md rule 2); RU is an opt-in aid.

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
  device: { pl: 'Obsługa radiotelefonu', ru: 'Работа с рацией' },
  voice: { pl: 'Łączność głosowa', ru: 'Голосовая связь' },
  dsc: { pl: 'Cyfrowe selektywne wywołanie (DSC)', ru: 'Цифровой избирательный вызов (DSC)' },
  'epirb-sart': { pl: 'EPIRB i transponder radarowy (SART)', ru: 'EPIRB и радарный ответчик (SART)' },
};

export const PRACTICAL_TASKS: PracticalTask[] = [
  {
    n: 1, group: 'device',
    task: 'Włącz i przygotuj do pracy radiotelefon VHF dla łączności pokładowej.',
    how: {
      pl: 'Przytrzymaj PWR (włączenie), ustaw kanał pokładowy o małej mocy, przełącz moc na 1 W ([HI/LO]), ustaw głośność (VOL) i próg blokady szumów (SQL).',
      ru: 'Удержи PWR (включение), выставь бортовой канал малой мощности, переключи мощность на 1 Вт ([HI/LO]), настрой громкость (VOL) и порог шумоподавителя (SQL).',
    },
    guide: 'interaktywny-kurs',
  },
  {
    n: 2, group: 'device',
    task: 'Włącz i przygotuj do pracy radiotelefon VHF dla łączności alarmowej.',
    how: {
      pl: 'Przytrzymaj PWR, wciśnij [16/C] (kanał 16), ustaw pełną moc 25 W ([HI/LO]), podnieś głośność i otwórz blokadę szumów, aby nie przegapić słabego wywołania.',
      ru: 'Удержи PWR, нажми [16/C] (канал 16), выставь полную мощность 25 Вт ([HI/LO]), подними громкость и открой шумоподавитель, чтобы не пропустить слабый вызов.',
    },
    guide: 'interaktywny-kurs',
  },
  {
    n: 3, group: 'device',
    task: 'Dokonaj redukcji mocy radiotelefonu VHF.',
    how: {
      pl: 'Przyciskiem funkcyjnym [HI/LO] zmień moc wyjściową z 25 W na 1 W. Pokrętła VOL/SQL nie zmieniają mocy.',
      ru: 'Софтклавишей [HI/LO] смени мощность с 25 Вт на 1 Вт. Ручки VOL/SQL мощность не меняют.',
    },
    scenario: 'radio-check', guide: 'interaktywny-kurs',
  },
  {
    n: 4, group: 'device',
    task: 'Ustaw podwójny nasłuch w radiotelefonie VHF na kanałach 14 i 16.',
    how: {
      pl: 'Ustaw kanał 14 (przyciski CH), naciśnij softkey [DW]. Dual Watch naprzemiennie słucha kanału roboczego 14 i kanału 16.',
      ru: 'Выставь канал 14 (клавиши CH), нажми софтклавишу [DW]. Dual Watch попеременно слушает рабочий 14 и канал 16.',
    },
    guide: 'interaktywny-kurs',
  },
  {
    n: 5, group: 'device',
    task: 'Ustaw intensywność podświetlenia wyświetlacza i przycisków w radiotelefonie VHF.',
    how: {
      pl: 'Strzałkami przydziel funkcję [BKLT] do softkeya, naciśnij [BKLT], a następnie pokrętłem VOL/SQL (DIAL) ustaw jasność podświetlenia.',
      ru: 'Стрелками назначь функцию [BKLT] на софтклавишу, нажми [BKLT], затем ручкой VOL/SQL (DIAL) выставь яркость подсветки.',
    },
    guide: 'interaktywny-kurs',
  },
  {
    n: 6, group: 'device',
    task: 'Sprawdź, które kanały są wpisane do pamięci skanowania radiotelefonu.',
    how: {
      pl: 'Kanały należące do listy skaningowej mają na wyświetlaczu znacznik (TAG). Przewijaj kanały przyciskami CH i zobacz, które są oznaczone tym symbolem.',
      ru: 'Каналы из списка сканирования помечены на дисплее меткой (TAG). Пролистай каналы клавишами CH и посмотри, какие отмечены этим символом.',
    },
    scenario: 'scan-memory',
  },
  {
    n: 7, group: 'device',
    task: 'Dodaj kanały 6, 13 i 16 do listy skaningowej w radiotelefonie VHF.',
    how: {
      pl: 'Ustaw kanał 6, naciśnij softkey dodawania do skanu (TAG/FAV), powtórz dla kanału 13 i 16. Każdy dostaje znacznik listy skaningowej.',
      ru: 'Выставь канал 6, нажми софтклавишу добавления в скан (TAG/FAV), повтори для 13 и 16. Каждый получает метку списка сканирования.',
    },
    scenario: 'scan-memory',
  },
  {
    n: 8, group: 'voice',
    task: 'Nadaj ostrzeżenie nawigacyjne przy użyciu radiotelefonu VHF.',
    how: {
      pl: 'Na kanale 16 nadaj zapowiedź SECURITE ze wskazaniem kanału roboczego, przejdź na kanał roboczy i tam podaj treść ostrzeżenia. Zakończ OUT.',
      ru: 'На канале 16 передай объявление SECURITE с указанием рабочего канала, перейди на рабочий канал и там передай текст предупреждения. Заверши OUT.',
    },
    scenario: 'securite-hazard',
  },
  {
    n: 9, group: 'voice',
    task: 'Nadaj komunikat alarmowy przy użyciu radiotelefonu VHF.',
    how: {
      pl: 'Ustaw kanał 16, nadaj wywołanie alarmowe (MAYDAY x3, THIS IS + nazwa x3), po krótkiej przerwie nadaj treść: pozycja, rodzaj zagrożenia, potrzebna pomoc, liczba osób, OVER.',
      ru: 'Выставь канал 16, передай аварийный вызов (MAYDAY x3, THIS IS + название x3), после короткой паузы передай текст: позиция, род бедствия, нужная помощь, число людей, OVER.',
    },
    scenario: 'fire-mayday',
  },
  {
    n: 10, group: 'voice',
    task: 'Nadaj komunikat w sytuacji wypadnięcia człowieka za burtę przy użyciu radiotelefonu VHF.',
    how: {
      pl: 'Wg UKE człowiek za burtą to zagrożenie życia: na kanale 16 nadaj MAYDAY x3, THIS IS znak własnej stacji x3, potem MAYDAY + nazwa, POSITION..., MAN OVERBOARD, REQUIRE IMMEDIATE ASSISTANCE, liczba osób, OVER. Uwaga: w wywołaniu MAYDAY nie ma ALL STATIONS - samo słowo MAYDAY jest sygnałem do wszystkich. Symulator ćwiczy tę samą procedurę MAYDAY.',
      ru: 'По UKE человек за бортом - угроза жизни: на канале 16 передай MAYDAY x3, THIS IS свой позывной x3, затем MAYDAY + название, POSITION..., MAN OVERBOARD, REQUIRE IMMEDIATE ASSISTANCE, число людей, OVER. Важно: в вызове MAYDAY нет ALL STATIONS - само слово MAYDAY уже сигнал всем. Симулятор отрабатывает ту же процедуру MAYDAY.',
    },
    scenario: "mob-mayday",
  },
  {
    n: 11, group: 'voice',
    task: 'Potwierdź odbiór alarmu przy użyciu radiotelefonu VHF.',
    how: {
      pl: 'Wycisz alarm, przejdź na 16 i słuchaj przez 5 minut. Sprawdź, czy stacja brzegowa lub RCC potwierdziły alarm i prowadzą ruch. Gdy nie, nadaj głosem: MAYDAY, znak stacji zagrożonej x3, THIS IS znak własnej stacji x3, RECEIVED MAYDAY. Poinformuj brzeg lub RCC i oceń możliwość pomocy. DSC ACK ze statku jest wyjątkiem dopiero po konsultacji, gdy alarm nadal się powtarza.',
      ru: 'Заглуши сигнал, перейди на 16 и слушай 5 минут. Проверь, подтвердили ли берег или RCC сигнал и ведут ли обмен. Если нет, передай голосом: MAYDAY, позывной судна в беде x3, THIS IS свой позывной x3, RECEIVED MAYDAY. Сообщи берегу или RCC и оцени возможность помочь. DSC ACK с судна является исключением только после консультации, если сигнал продолжает повторяться.',
    },
    scenario: 'receive-distress',
  },
  {
    n: 12, group: 'voice',
    task: 'Wywołaj inny statek przy użyciu radiotelefonu VHF i przeprowadź z nim zwykłą korespondencję publiczną.',
    how: {
      pl: 'Wciśnij [16/C], nadaj: znak wywoływanej stacji, znak własnej stacji x2. Po zgłoszeniu uzgodnij kanał roboczy, ustaw go i prowadź rozmowę. Kanał 16 zostaje wolny.',
      ru: 'Нажми [16/C], передай: позывной вызываемой станции, свой позывной x2. После ответа согласуй рабочий канал, выставь его и веди разговор. Канал 16 остаётся свободным.',
    },
    scenario: 'routine-marina',
  },
  {
    n: 13, group: 'voice',
    task: 'Nadaj pośrednie alarmowanie za inny statek będący w niebezpieczeństwie.',
    how: {
      pl: 'Wciśnij [16/C], nadaj: MAYDAY RELAY x3, nazwa wywoływanej stacji x3, THIS IS znak własnej stacji x3, treść (nazwa, pozycja, rodzaj zagrożenia jednostki w niebezpieczeństwie), OVER. Nie używasz czerwonego DISTRESS.',
      ru: 'Нажми [16/C], передай: MAYDAY RELAY x3, название вызываемой станции x3, THIS IS свой позывной x3, текст (название, позиция, род бедствия судна в беде), OVER. Красную DISTRESS не используешь.',
    },
    scenario: 'mayday-relay',
  },
  {
    n: 14, group: 'device',
    task: 'Wprowadź pozycję geograficzną oraz aktualny czas.',
    how: {
      pl: 'MENU -> DSC Settings -> Position Input. Strzałkami i [ENT] wprowadź szerokość, długość geograficzną oraz czas UTC, zatwierdź. Ważna pozycja jest kluczowa dla alarmu DSC.',
      ru: 'MENU -> DSC Settings -> Position Input. Стрелками и [ENT] введи широту, долготу и время UTC, подтверди. Актуальная позиция критична для DSC-алерта.',
    },
    scenario: 'position-input',
  },
  {
    n: 15, group: 'device',
    task: 'Wprowadź do rejestru radiotelefonu numer MMSI duńskiej stacji brzegowej Lyngby.',
    how: {
      pl: 'MENU -> DSC Settings -> Individual ID -> softkey [ADD]. Wprowadź ID stacji 002191000 i nazwę LYNGBY, zatwierdź. Zapisany adres przyspiesza późniejsze wywołania.',
      ru: 'MENU -> DSC Settings -> Individual ID -> софтклавиша [ADD]. Введи ID станции 002191000 и имя LYNGBY, подтверди. Сохранённый адрес ускоряет последующие вызовы.',
    },
    scenario: 'id-add-lyngby',
  },
  {
    n: 16, group: 'device',
    task: 'Usuń z rejestru radiotelefonu numer MMSI stacji brzegowej Lyngby.',
    how: {
      pl: 'MENU -> DSC Settings -> Individual ID -> zaznacz LYNGBY -> softkey [DEL] -> potwierdź [OK].',
      ru: 'MENU -> DSC Settings -> Individual ID -> выбери LYNGBY -> софтклавиша [DEL] -> подтверди [OK].',
    },
    scenario: 'id-delete-lyngby',
  },
  {
    n: 17, group: 'dsc',
    task: 'Nadaj wywołanie testujące DSC.',
    how: {
      pl: 'MENU -> DSC Calls -> Test Call. Wybierz stację brzegową z rejestru (lub wprowadź ręcznie), naciśnij [CALL] i oczekuj automatycznego potwierdzenia (ACK). Bez części głosowej.',
      ru: 'MENU -> DSC Calls -> Test Call. Выбери береговую станцию из реестра (или введи вручную), нажми [CALL] и жди автоматического подтверждения (ACK). Без голосовой части.',
    },
    scenario: 'dsc-test',
  },
  {
    n: 18, group: 'dsc',
    task: 'Nadaj regularne wywołanie alarmowe DSC.',
    how: {
      pl: 'MENU -> DSC Calls -> Distress Call. Wybierz rodzaj zagrożenia, zatwierdź i przytrzymaj czerwony DISTRESS przez 3 sekundy. Czekaj na DSC ACK. Po ACK wycisz alarm - radio wybierze kanał 16 - i nadaj MAYDAY głosem. Jeżeli ACK nie przychodzi, po ok. 15 sekundach wybierz 16/C i nadaj MAYDAY; powtórki DSC pozostają aktywne.',
      ru: 'MENU -> DSC Calls -> Distress Call. Выбери род бедствия, подтверди и удержи красную DISTRESS 3 секунды. Жди DSC ACK. После ACK заглуши сигнал - рация выберет канал 16 - и передай MAYDAY голосом. Если ACK не приходит, примерно через 15 секунд выбери 16/C и передай MAYDAY; повторы DSC продолжаются.',
    },
    scenario: 'fire-mayday',
  },
  {
    n: 19, group: 'dsc',
    task: 'Nadaj wywołanie alarmowe DSC o zalaniu jednostki wodą.',
    how: {
      pl: 'MENU -> DSC Calls -> Distress Call -> wybierz Flooding, zatwierdź i przytrzymaj DISTRESS 3 sekundy. Po DSC ACK wycisz alarm, a na automatycznie wybranym kanale 16 nadaj MAYDAY głosem. Jeżeli ACK nie przychodzi, po ok. 15 sekundach wybierz 16/C i nadaj MAYDAY; radio nadal powtarza alert DSC.',
      ru: 'MENU -> DSC Calls -> Distress Call -> выбери Flooding, подтверди и удержи DISTRESS 3 секунды. После DSC ACK заглуши сигнал и на автоматически выбранном канале 16 передай MAYDAY голосом. Если ACK не приходит, примерно через 15 секунд выбери 16/C и передай MAYDAY; рация продолжает повторять DSC-алерт.',
    },
    scenario: 'fire-mayday',
  },
  {
    n: 20, group: 'dsc',
    task: 'Nadaj w DSC zapowiedź prośby o pomoc medyczną do innych statków.',
    how: {
      pl: 'MENU -> DSC Calls -> All Ships Call -> wybierz kategorię Urgency, [ENT], wskaż kanał do korespondencji głosowej, [ENT]. Następnie na 16 nadaj PAN-PAN z prośbą o poradę medyczną.',
      ru: 'MENU -> DSC Calls -> All Ships Call -> выбери категорию Urgency, [ENT], укажи канал для голосовой связи, [ENT]. Затем на 16 передай PAN-PAN с просьбой о медконсультации.',
    },
    scenario: 'panpan-medico',
  },
  {
    n: 21, group: 'dsc',
    task: 'Nadaj w DSC wywołanie zwykłe w korespondencji publicznej do innego statku.',
    how: {
      pl: 'MENU -> DSC Calls -> Individual Call -> wybierz stację statkową z rejestru (lub ręcznie), [ENT], wskaż kanał do korespondencji głosowej, [ENT]. Po ACK przejdź na kanał i rozmawiaj.',
      ru: 'MENU -> DSC Calls -> Individual Call -> выбери судовую станцию из реестра (или вручную), [ENT], укажи канал для голосовой связи, [ENT]. После ACK перейди на канал и говори.',
    },
    scenario: 'routine-ship',
  },
  {
    n: 22, group: 'dsc',
    task: 'Nadaj w DSC wywołanie do stacji brzegowej w celu przeprowadzenia rozmowy z operatorem.',
    how: {
      pl: 'MENU -> DSC Calls -> Individual Call -> wybierz stację brzegową z rejestru (lub ręcznie), [ENT], naciśnij [CALL] i oczekuj wskazania kanału do korespondencji głosowej przez stację brzegową.',
      ru: 'MENU -> DSC Calls -> Individual Call -> выбери береговую станцию из реестра (или вручную), [ENT], нажми [CALL] и жди, пока береговая станция укажет канал для голосовой связи.',
    },
    scenario: 'routine-ship',
  },
  {
    n: 23, group: 'epirb-sart',
    task: 'Sposób postępowania z radiopławą EPIRB, będąc na tratwie ratunkowej.',
    how: {
      pl: 'Wciśnij przycisk ON na zabranej ze statku radiopławie, przywiąż ją linką (lanyard) do tratwy i pozwól jej pływać w wodzie obok tratwy - jest tak zaprojektowana, że utrzymuje się anteną do góry. Ewentualnie trzymaj ją w ręce, anteną pionowo i z otwartym widokiem na niebo.',
      ru: 'Нажми кнопку ON на снятом с судна EPIRB, привяжи его линем (lanyard) к плоту и дай ему плавать в воде рядом с плотом - он сконструирован так, что держится антенной вверх. Либо держи его в руке, антенной вертикально и с открытым видом на небо.',
    },
  },
  {
    n: 24, group: 'epirb-sart',
    task: 'Przetestuj radiopławę EPIRB.',
    how: {
      pl: 'Zdejmij radiopławę z obudowy, przesuń dźwignię w położenie TEST i obserwuj jej zachowanie - powinno być zgodne z opisem na obudowie. Testuj krótko i rzadko (bateria).',
      ru: 'Сними EPIRB с кронштейна, переведи рычаг в положение TEST и наблюдай поведение - оно должно соответствовать описанию на корпусе. Тестируй коротко и редко (батарея).',
    },
  },
  {
    n: 25, group: 'epirb-sart',
    task: 'Uruchom transponder radarowy (SART), będąc na tratwie ratunkowej.',
    how: {
      pl: 'Przywiąż zabrany ze statku transponder radarowy do tratwy, wciśnij przycisk uruchomienia i umieść go możliwie wysoko - im wyżej, tym większy zasięg wykrycia przez radar.',
      ru: 'Привяжи снятый с судна SART к плоту, нажми кнопку включения и размести его как можно выше - чем выше, тем больше дальность обнаружения радаром.',
    },
  },
  {
    n: 26, group: 'epirb-sart',
    task: 'Przetestuj transponder radarowy (SART).',
    how: {
      pl: 'Wciśnij przycisk uruchomienia na około 5 sekund i obserwuj zachowanie zgodne z opisem na transponderze, po czym wyłącz. Test krótki, aby nie wywołać fałszywego sygnału na radarach.',
      ru: 'Нажми кнопку включения примерно на 5 секунд и наблюдай поведение по описанию на корпусе, затем выключи. Тест короткий, чтобы не дать ложный сигнал на радарах.',
    },
  },
];
