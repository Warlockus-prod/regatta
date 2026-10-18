// ============================================================================
// Deep explanations for the 15 lessons of the interactive course.
//
// The course used to say only WHICH button to press plus a one-line reason.
// That is not enough to pass an oral exam and it is not enough to actually
// operate a radio: the learner needs to know WHAT the control is, WHY it exists
// at all (the physical / operational reason, not a restated rule), WHEN it gets
// used on the water, and what the UKE examiner is watching for.
//
// Facts verified against the ICOM IC-M330GE / IC-M323 manuals, ITU-R M.493 /
// M.541, IMO SMCP and the UKE exam materials, then adversarially fact-checked.
// PL is written with full diacritics (AGENTS.md rule 2); RU is the explanation language
// for the RU site version.
// ============================================================================

export interface LessonText {
  /** what the control / action IS */
  whatPl: string; whatRu: string;
  /** why it exists - the reason, not the rule */
  whyPl: string; whyRu: string;
  /** when you actually reach for it */
  whenPl: string; whenRu: string;
  /** what the examiner watches for, and the classic failure */
  examPl: string; examRu: string;
}

export const LESSON_TEXT: Record<string, LessonText> = {
  power: {
    whatPl: 'DIAL to jedno pokrętło z trzema funkcjami: przytrzymanie około 1 sekundy włącza i wyłącza radio, krótkie naciśnięcia przełączają między głośnością a blokadą szumów, a obrót zmienia wartość. Osobnego wyłącznika to radio nie ma.',
    whatRu: 'DIAL - это одна ручка с тремя функциями: удержание около 1 секунды включает и выключает рацию, короткие нажатия переключают между громкостью и шумоподавителем, поворот меняет значение. Отдельного выключателя у этой рации нет.',
    whyPl: 'Radio jest na stałe podpięte do akumulatora i stoi w ciasnej zabudowie obok innych przełączników. Gdyby włączało się jednym dotknięciem, gasiłby je przypadkiem rękaw albo szot, a wyłączone VHF to zerowy nasłuch - dlatego producent wymaga świadomego przytrzymania.',
    whyRu: 'Рация постоянно подключена к аккумулятору и стоит в тесной панели рядом с другими тумблерами. Если бы она включалась одним касанием, ее гасили бы рукавом или шкотом, а выключенное VHF - это нулевое наблюдение, поэтому производитель требует осознанного удержания.',
    whenPl: 'Włączasz radio przy przygotowaniu łodzi, razem z resztą elektroniki, i zostawiasz włączone przez cały rejs. Radio pomaga tylko wtedy, gdy jest włączone i nasłuchuje.',
    whenRu: 'Включаешь рацию при подготовке лодки, вместе с остальной электроникой, и оставляешь включенной весь выход. Рация помогает только тогда, когда она включена и слушает.',
    examPl: 'Egzaminator patrzy, czy pewnie włączasz radio jednym przytrzymaniem. Klasyczny błąd: krótkie naciśnięcie, które otwiera tylko regulację głośności, i zdający uznaje, że urządzenie jest zepsute.',
    examRu: 'Экзаменатор смотрит, уверенно ли ты включаешь рацию одним удержанием. Классическая ошибка: короткое нажатие открывает лишь регулировку громкости, и сдающий решает, что прибор неисправен.',
  },
  'squelch-open': {
    whatPl: 'Blokada szumów ma pozycję OPEN - całkowicie otwarta - i poziomy od 1 (luźna) do 10 (ciasna). W pozycji OPEN odbiornik nie wycisza niczego: słychać czysty szum eteru, a na ekranie zapala się BUSY.',
    whatRu: 'У шумоподавителя есть положение OPEN - полностью открыт - и уровни от 1 (слабый) до 10 (тугой). В положении OPEN приёмник не глушит ничего: слышно чистый шум эфира, а на экране загорается BUSY.',
    whyPl: 'To nie jest usterka, tylko punkt odniesienia. Pusty kanał FM nie jest cichy: odbiornik bez sygnału wzmacnia własny szum. Dopiero ten szum daje ci coś, według czego można ustawić głośność - ciszy wyregulować się nie da. Dlatego instrukcja ICOM zaczyna procedurę właśnie tutaj: "najpierw otwórz blokadę szumów, potem ustaw głośność".',
    whyRu: 'Это не поломка, а точка отсчёта. Пустой FM-канал не бывает тихим: без сигнала приёмник усиливает собственный шум. Именно этот шум даёт то, по чему можно выставить громкость, - тишину настроить нельзя. Поэтому инструкция ICOM начинает процедуру именно отсюда: «сначала открой шумоподавитель, потом выставь громкость».',
    whenPl: 'Za każdym razem, gdy ustawiasz radio od nowa: po włączeniu, po tym jak ktoś inny grzebał w ustawieniach, po zmianie łódki. To pierwszy krok procedury, nie ciekawostka.',
    whenRu: 'Каждый раз, когда настраиваешь рацию заново: после включения, после того как в настройках копался кто-то другой, при смене лодки. Это первый шаг процедуры, а не любопытный факт.',
    examPl: 'Egzaminator chce zobaczyć całą procedurę w tej kolejności: OPEN, głośność, próg. Klasyczny błąd: kręcenie głośnością przy zamkniętej blokadzie i zdziwienie, że radio milczy.',
    examRu: 'Экзаменатор хочет увидеть всю процедуру именно в этом порядке: OPEN, громкость, порог. Классическая ошибка: крутить громкость при закрытом шумоподавителе и удивляться, что рация молчит.',
  },
  volume: {
    whatPl: 'Głośność głośnika, regulowana obrotem DIAL po wejściu na ekran VOL: od wyciszenia do maksimum. Wpływa wyłącznie na to, co słyszysz, i na nic więcej.',
    whatRu: 'Громкость динамика, регулируется поворотом DIAL на экране VOL: от нуля до максимума. Влияет только на то, что ты слышишь, и ни на что больше.',
    whyPl: 'VHF jest przede wszystkim urządzeniem do nasłuchu: wywołanie dociera do ciebie tylko wtedy, gdy przebije się przez silnik, wiatr i łopot żagli. Głośność nie ma nic wspólnego z mocą nadawania - podgłośnienie nie zwiększa zasięgu i nie sprawia, że inni słyszą cię lepiej.',
    whyRu: 'VHF - это прежде всего прибор для прослушивания: вызов дойдет до тебя, только если пробьется через двигатель, ветер и хлопанье парусов. Громкость никак не связана с мощностью передачи: прибавить звук не значит увеличить дальность или стать слышнее для других.',
    whenPl: 'Ustawiasz ją przeciwko szumowi z otwartej blokady, zaraz po włączeniu, i poprawiasz za każdym razem, gdy zmieniają się warunki: po uruchomieniu silnika, na kursie pod falę, w hałaśliwej marinie. Jeśli nie słyszysz radia przy sterze, praktycznie go nie masz.',
    whenRu: 'Ставишь её по шуму открытого шумоподавителя, сразу после включения, и поправляешь каждый раз, когда меняются условия: завели двигатель, пошли против волны, зашли в шумную марину. Если у руля рации не слышно, её фактически нет.',
    examPl: 'Egzaminator prosi o ustawienie głośności i chce zobaczyć, że robisz to świadomie, a nie na oślep. Klasyczny błąd: mylenie głośności z blokadą szumów albo twierdzenie, że głośność wpływa na zasięg.',
    examRu: 'Экзаменатор просит выставить громкость и хочет видеть, что ты делаешь это осознанно, а не наугад. Классическая ошибка: путать громкость с шумоподавителем или утверждать, что громкость влияет на дальность.',
  },
  squelch: {
    whatPl: 'Blokada szumów (SQL) to próg czułości odbiornika: wycisza głośnik, dopóki sygnał jest słabszy niż ustawiony poziom, i otwiera go, gdy pojawi się sygnał mocniejszy. Poziom ustawiasz obrotem DIAL na ekranie SQL.',
    whatRu: 'Шумоподавитель (SQL) - это порог чувствительности приемника: он глушит динамик, пока сигнал слабее заданного уровня, и открывает его, как только приходит сигнал сильнее. Уровень задается поворотом DIAL на экране SQL.',
    whyPl: 'Pusty kanał nie jest cichy - odbiornik wzmacnia szum i syczy, a kilku godzin takiego syku nikt nie wytrzyma. Próg jest jednak głupi: porównuje wyłącznie siłę sygnału, więc ustawiony za wysoko nie przepuści słabego, dalekiego wywołania (na przykład kogoś nadającego mocą 1 W) i po prostu go nie usłyszysz.',
    whyRu: 'Пустой канал не бывает тихим: приемник усиливает шум и шипит, а слушать это часами невозможно. Но порог туп, он сравнивает только силу сигнала: задранный слишком высоко, он не пропустит слабый далекий вызов (например, от того, кто передает мощностью 1 Вт), и ты его просто не услышишь.',
    whenPl: 'Ustawiasz zaraz po włączeniu radia: skręć w dół, aż usłyszysz stały szum, potem podnoś do momentu, w którym szum właśnie znika, i zatrzymaj się. Obniż próg, gdy czekasz na słaby albo daleki sygnał, na przykład szukasz łodzi, która przestała odpowiadać.',
    whenRu: 'Настраиваешь сразу после включения: убавляй, пока не появится ровное шипение, потом поднимай ровно до момента, когда шипение исчезло, и остановись. Опусти порог, когда ждешь слабый или далекий сигнал, например ищешь лодку, которая перестала отвечать.',
    examPl: 'Egzaminator każe ustawić SQL i oczekuje dokładnie tej procedury: otwórz do szumu, cofnij tuż za próg. Klasyczny błąd: przekręcenie SQL na maksimum dla ciszy - to zabija słabe wywołania i jest odpowiedzią, która oblewa.',
    examRu: 'Экзаменатор просит настроить SQL и ждет именно этой процедуры: открыть до шума, вернуть чуть за порог. Классическая ошибка: выкрутить SQL на максимум ради тишины - так глушатся слабые вызовы, и это ответ, который заваливает.',
  },
  channel: {
    whatPl: 'Kanały to ponumerowane, z góry ustalone częstotliwości VHF, każdy z przypisaną rolą: 16 alarmowy i wywoławczy, 70 wyłącznie DSC, 10 / 12 / 14 porty i mariny w Polsce, 06 i 08 między jednostkami. Na M330 kanał wybierasz strzałkami góra/dół, na M323 także obrotem DIAL.',
    whatRu: 'Каналы - это пронумерованные, заранее заданные частоты VHF, у каждого своя роль: 16 аварийный и вызывной, 70 только DSC, 10 / 12 / 14 порты и марины в Польше, 06 и 08 между судами. На M330 канал выбирается стрелками вверх/вниз, на M323 еще и поворотом DIAL.',
    whyPl: 'Słyszysz wyłącznie ten kanał, na którym stoisz, a kanał 16 musi zostać wolny dla tych, którzy mają kłopoty - dlatego rozmowy robocze przenosi się na kanał roboczy. W Gdyni kanał 12 obsługuje ruch portowy, więc stację portową wołasz tam, a nie na 16; kanał mariny sprawdź wcześniej w locji albo na jej stronie.',
    whyRu: 'Ты слышишь только тот канал, на котором стоишь, а 16 должен оставаться свободным для тех, у кого беда, поэтому рабочие разговоры уводят на рабочий канал. В Гдыне канал 12 обслуживает портовое движение, значит портовую станцию вызывают там, а не на 16; канал марины уточни заранее в лоции или на ее сайте.',
    whenPl: 'Zanim kogokolwiek zawołasz, sprawdź, na którym kanale ta stacja nasłuchuje: marina, VTS, most, inna łódź. Po wywołaniu na 16 albo po wywołaniu DSC obie strony przechodzą na uzgodniony kanał roboczy i rozmawiają tam.',
    whenRu: 'Перед любым вызовом узнай, на каком канале слушает эта станция: марина, VTS, мост, другая лодка. После вызова на 16 или после вызова DSC обе стороны переходят на согласованный рабочий канал и говорят там.',
    examPl: 'Egzaminator podaje stację i oczekuje, że znajdziesz jej kanał (locja, wykaz stacji, informacja mariny) i szybko go ustawisz. Klasyczny błąd: załatwianie spraw roboczych na 16 oraz zgadywanie kanału zamiast sprawdzenia go - kanały stacji są różne, np. porty Trójmiasta pracują na 12 i 14, a VTS Zatoka Gdańska na 71.',
    examRu: 'Экзаменатор называет станцию и ждет, что ты найдешь ее канал (лоция, список станций, сайт марины) и быстро его выставишь. Классическая ошибка: рабочие переговоры на 16 и угадывание канала вместо проверки - каналы у станций разные, например порты Труймяста работают на 12 и 14, а VTS Zatoka Gdanska на 71.',
  },
  channel16: {
    whatPl: 'Osobny klawisz 16/C: krótkie naciśnięcie z dowolnego zwykłego ekranu natychmiast ustawia kanał 16 (156,800 MHz) - międzynarodowy kanał niebezpieczeństwa, pilności, bezpieczeństwa i wywoławczy.',
    whatRu: 'Отдельная клавиша 16/C: короткое нажатие с любого обычного экрана мгновенно ставит канал 16 (156,800 МГц) - международный канал бедствия, срочности, безопасности и вызова.',
    whyPl: 'W sytuacji zagrożenia nie ma czasu na szukanie kanału w liście, dlatego 16 dostał własny, sprzętowy klawisz, który trafiasz po ciemku w kilka sekund. Na 16 nasłuchują wszyscy: jednostki, stacje brzegowe i służby SAR, więc tylko tam głosowy MAYDAY zostanie usłyszany, i tam radio przechodzi samo po wysłaniu alertu DSC.',
    whyRu: 'В аварии нет времени искать канал в списке, поэтому у 16 есть своя аппаратная клавиша, которую находишь в темноте за секунды. На 16 слушают все: суда, береговые станции и службы SAR, только там будет услышан голосовой MAYDAY, и туда же рация переходит сама после отправки DSC-алерта.',
    whenPl: 'Zawsze w niebezpieczeństwie, pilności i bezpieczeństwie, przy pierwszym wywołaniu i przy odpowiedzi na wywołanie, a także wtedy, gdy po prostu prowadzisz nasłuch. W drodze kanał 16 ma być pod nasłuchem cały czas - bezpośrednio albo przez nasłuch podwójny.',
    whenRu: 'Всегда при бедствии, срочности и безопасности, при первом вызове и ответе на вызов, а также когда ты просто несешь вахту. На ходу канал 16 должен быть под наблюдением постоянно - напрямую или через двойное наблюдение.',
    examPl: 'Większość zadań zaczyna się albo kończy na 16 i egzaminator patrzy, czy tam wracasz. Klasyczny błąd: przytrzymanie klawisza zamiast krótkiego naciśnięcia (dostajesz wtedy kanał wywoławczy) albo test łączności i rozmowy robocze prowadzone na 16.',
    examRu: 'Большинство заданий начинается или заканчивается на 16, и экзаменатор смотрит, возвращаешься ли ты туда. Классическая ошибка: удержание клавиши вместо короткого нажатия (получишь вызывной канал) или проверка связи и рабочие разговоры на 16.',
  },
  'call-channel': {
    whatPl: 'Przytrzymanie 16/C przez około 1 sekundę przełącza na zaprogramowany kanał wywoławczy (Call Channel) - twój własny skrót do jednego, często używanego kanału. W trenażerze jest to kanał 06.',
    whatRu: 'Удержание 16/C около 1 секунды переключает на запрограммированный вызывной канал (Call Channel) - твой личный ярлык на один часто используемый канал. В тренажере это канал 06.',
    whyPl: 'Każda łódź ma kanał, na którym siedzi najczęściej: kanał flotylli, klubu albo kanał między jednostkami. Wyszukiwanie go strzałkami za każdym razem to sekundy z oczami na wyświetlaczu zamiast na wodzie, więc producent dał mu drugi skrót obok 16. To wygoda, a nie kategoria z przepisów.',
    whyRu: 'У каждой лодки есть канал, на котором она сидит чаще всего: канал флотилии, клуба или канал между судами. Искать его стрелками каждый раз - это секунды с глазами на дисплее вместо воды, поэтому производитель дал ему второй ярлык рядом с 16. Это удобство, а не категория из правил.',
    whenPl: 'Płyniesz w regatach na kanale flotylli albo klub pracuje na 06 - ustawiasz go jako Call Channel i po każdym wywołaniu na 16 wracasz tam jednym przytrzymaniem.',
    whenRu: 'Идешь в регате на канале флотилии или клуб работает на 06 - ставишь его как Call Channel и после каждого вызова на 16 возвращаешься туда одним удержанием.',
    examPl: 'Egzaminator lubi pytać, czym różni się krótkie naciśnięcie 16/C od długiego - ta para jest sednem zadania. Klasyczny błąd: mylenie kanału 16 z kanałem wywoławczym, czyli przytrzymanie klawisza wtedy, gdy potrzebna była szesnastka.',
    examRu: 'Экзаменатор любит спрашивать, чем короткое нажатие 16/C отличается от долгого: именно эта пара и проверяется. Классическая ошибка: путать канал 16 с вызывным каналом, то есть удерживать клавишу тогда, когда нужна была шестнадцатая.',
  },
  'power-level': {
    whatPl: 'Przełącznik mocy nadajnika (klawisz HI/LO): 25 W to moc pełna, 1 W to moc mała, a aktualne ustawienie widać na wyświetlaczu. Na części kanałów radio wymusza 1 W samo, niezależnie od twojego wyboru.',
    whatRu: 'Переключатель мощности передатчика (клавиша HI/LO): 25 Вт - полная мощность, 1 Вт - малая, текущее значение видно на дисплее. На части каналов рация сама принудительно держит 1 Вт, независимо от твоего выбора.',
    whyPl: 'VHF sięga tylko do horyzontu radiowego, więc pełne 25 W jest potrzebne, żeby dosięgnąć stacji brzegowej albo odległej jednostki. Ale w marinie wszyscy stoją kilkadziesiąt metrów od siebie: 25 W wali wtedy w każdy odbiornik w basenie, zajmuje innym kanał, zjada prąd z akumulatora i zakłóca odległym stacjom, które pracują na tej samej częstotliwości. Dlatego przepisy same ograniczają moc na części kanałów: kanały ochronne 75 i 76, leżące tuż obok 16, mają limit 1 W, żeby chronić kanał 16, a kanały 15 i 17 (łączność wewnątrz jednostki) też pracują wyłącznie małą mocą.',
    whyRu: 'VHF добивает только до радиогоризонта, поэтому полные 25 Вт нужны, чтобы дотянуться до береговой станции или далекого судна. Но в марине все стоят в десятках метров друг от друга: 25 Вт бьют в каждый приемник в бассейне, занимают канал другим, съедают ток аккумулятора и мешают дальним станциям на той же частоте. Поэтому часть каналов ограничена по мощности самими правилами: охранные каналы 75 и 76 рядом с 16 имеют лимит 1 Вт, чтобы защитить канал 16, а каналы 15 и 17 (связь внутри судна) тоже работают только малой мощностью.',
    whenPl: '1 W w marinie, w porcie, przy teście łączności z mariną i przy rozmowie z łodzią obok. 25 W przy wywołaniu stacji brzegowej, VTS albo odległej jednostki, i zawsze w niebezpieczeństwie, pilności i bezpieczeństwie - przy MAYDAY nikt nie zmniejsza mocy.',
    whenRu: '1 Вт - в марине, в порту, при проверке связи с мариной и разговоре с соседней лодкой. 25 Вт - при вызове береговой станции, VTS или далекого судна, и всегда при бедствии, срочности и безопасности: при MAYDAY мощность не снижают.',
    examPl: 'Egzaminator chce zobaczyć, że sam z siebie zmniejszasz moc do ruchu lokalnego i potrafisz powiedzieć dlaczego. Klasyczny błąd: wszystko nadawane na 25 W, albo odwrotnie - wywołanie alarmowe wysłane małą mocą.',
    examRu: 'Экзаменатор хочет увидеть, что ты сам снижаешь мощность для местной связи и можешь объяснить зачем. Классическая ошибка: все подряд на 25 Вт или, наоборот, аварийный вызов на малой мощности.',
  },
  'dual-watch': {
    whatPl: 'Nasłuch podwójny (DW) to tryb odbioru: radio na przemian sprawdza twój kanał roboczy i kanał 16 i zatrzymuje się na tym, na którym pojawi się ruch. To nie jest skanowanie - skan przebiega całą listę kanałów, DW pilnuje dokładnie dwóch.',
    whatRu: 'Двойное наблюдение (DW) - это режим приема: рация попеременно проверяет твой рабочий канал и канал 16 и останавливается на том, где появился сигнал. Это не сканирование: скан проходит весь список каналов, а DW следит ровно за двумя.',
    whyPl: 'Nasłuch na 16 ma trwać cały czas, ale pracować musisz na kanale roboczym, a jeden odbiornik nie słucha dwóch częstotliwości naraz - więc dzieli między nie czas. Bez DW w chwili, gdy zejdziesz na 12 do mariny, jesteś głuchy na każdy MAYDAY nadany na 16.',
    whyRu: 'Вахта на 16 должна идти постоянно, а работать надо на рабочем канале, но один приемник не слушает две частоты сразу, поэтому он делит между ними время. Без DW в тот момент, когда ты ушел на 12 к марине, ты глух к любому MAYDAY на 16.',
    whenPl: 'Włączasz zawsze, gdy schodzisz z 16 na kanał roboczy, a chcesz dalej słyszeć 16: czekając na miejsce w marinie na 12 albo rozmawiając z flotyllą na kanale regatowym.',
    whenRu: 'Включаешь всегда, когда уходишь с 16 на рабочий канал, но хочешь продолжать слышать 16: ждешь место в марине на 12 или общаешься с флотилией на регатном канале.',
    examPl: 'Egzaminator może kazać włączyć DW i wytłumaczyć różnicę między DW a skanowaniem. Klasyczny błąd: nazywanie skanowania nasłuchem podwójnym albo twierdzenie, że DW pozwala nadawać na dwóch kanałach - DW dotyczy wyłącznie odbioru.',
    examRu: 'Экзаменатор может попросить включить DW и объяснить разницу между DW и сканированием. Классическая ошибка: называть скан двойным наблюдением или утверждать, что DW позволяет передавать на двух каналах - DW касается только приема.',
  },
  backlight: {
    whatPl: 'Podświetlenie wyświetlacza i klawiszy, regulowane od OFF do 7: na M330 softkeyem [BKLT] pod wyświetlaczem, na M323 także w cyklu naciśnięć DIAL.',
    whatRu: 'Подсветка дисплея и клавиш, регулируется от OFF до 7: на M330 через софт-клавишу [BKLT] под дисплеем, на M323 еще и в цикле нажатий DIAL.',
    whyPl: 'W nocy oko przyzwyczaja się do ciemności kilkanaście minut, a jeden jasny ekran przy zejściówce niszczy tę adaptację natychmiast - przestajesz widzieć światła innych jednostek i nieoświetlone znaki nawigacyjne. Dlatego schodzisz do najniższego poziomu, na którym jeszcze czytasz ekran; w dzień odwrotnie, bo przygaszony LCD w słońcu jest nieczytelny, a wyświetlacz musisz umieć odczytać w sekundę.',
    whyRu: 'Ночью глаз привыкает к темноте больше десяти минут, а один яркий экран у входа в каюту рушит эту адаптацию мгновенно: перестаешь видеть огни других судов и неосвещенные знаки. Поэтому опускаешь до самого низкого уровня, на котором еще читаешь экран; днем наоборот, потому что тусклый LCD на солнце нечитаем, а дисплей надо уметь прочесть за секунду.',
    whenPl: 'Przyciemniasz o zmierzchu, razem z resztą oświetlenia na łodzi: przed nocną wachtą i przed nocnym wejściem do portu, zawsze zanim zaczniesz wypatrywać świateł innych jednostek i nabieżników. Rozjaśniasz rano i w pełnym słońcu, gdy odblask w szybie zjada kontrast i nie odczytasz numeru kanału.',
    whenRu: 'Приглушаешь в сумерках вместе с остальным освещением на лодке: перед ночной вахтой и перед ночным входом в порт, всегда до того, как начнешь высматривать огни других судов и створные знаки. Прибавляешь яркость утром и на ярком солнце, когда блик на стекле съедает контраст и номер канала не прочитать.',
    examPl: 'To zadanie sprawdza po prostu, czy znasz swoje urządzenie - egzaminator może poprosić o zmianę podświetlenia. Klasyczny błąd: błąkanie się po funkcjach DIAL i przypadkowa zmiana głośności albo SQL zamiast podświetlenia.',
    examRu: 'Это задание проверяет просто знание своего аппарата: экзаменатор может попросить изменить подсветку. Классическая ошибка: заблудиться в функциях DIAL и случайно сбить громкость или SQL вместо подсветки.',
  },
  menu: {
    whatPl: 'Klawisz MENU otwiera drzewo funkcji, które nie mają własnych przycisków: wywołania DSC, dziennik DSC, pozycja z GPS, ustawienia radia, konfiguracja, dane MMSI. Poruszasz się strzałkami, wchodzisz klawiszem ENT, cofasz klawiszem CLR (M330) albo CLEAR (M323).',
    whatRu: 'Клавиша MENU открывает дерево функций, у которых нет своих кнопок: вызовы DSC, журнал DSC, позиция от GPS, настройки рации, конфигурация, данные MMSI. Двигаешься стрелками, входишь клавишей ENT, назад - CLR (M330) или CLEAR (M323).',
    whyPl: 'Radio ma więcej funkcji niż klawiszy, więc wszystko, co musi być natychmiastowe (16, DISTRESS, PTT, moc), siedzi na twardych przyciskach, a reszta żyje w menu, gdzie możesz sobie pozwolić na kilka sekund. Najważniejsza umiejętność to droga powrotna: jeśli zgubisz się w podmenu, w praktyce nie pracujesz na radiu.',
    whyRu: 'Функций у рации больше, чем клавиш, поэтому все, что должно быть мгновенным (16, DISTRESS, PTT, мощность), вынесено на жесткие кнопки, а остальное живет в меню, где можно позволить себе несколько секунд. Главный навык - дорога назад: если ты потерялся в подменю, ты фактически не работаешь на рации.',
    whenPl: 'Do menu wchodzisz, żeby złożyć wywołanie DSC, przejrzeć dziennik wywołań, odczytać MMSI i pozycję albo ustawić radio przed wyjściem.',
    whenRu: 'В меню заходишь, чтобы составить вызов DSC, посмотреть журнал вызовов, прочитать MMSI и позицию или настроить рацию перед выходом.',
    examPl: 'Egzaminator daje zadanie i patrzy, czy poruszasz się po menu pewnie; pamiętaj, że M330 i M323 mają różne drzewa, więc ucz się tego, na którym zdajesz. Klasyczny błąd: brak nawyku cofania się klawiszem CLR / CLEAR do ekranu STBY.',
    examRu: 'Экзаменатор дает задание и смотрит, уверенно ли ты ходишь по меню; помни, что у M330 и M323 разные деревья, поэтому учи то, на котором сдаешь. Классическая ошибка: нет привычки возвращаться клавишей CLR / CLEAR на экран STBY.',
  },
  'other-dsc': {
    whatPl: 'Tu składasz cyfrowe wywołanie DSC inne niż alarmowe: wybierasz typ (Individual do jednego MMSI, Group, All Ships, Test) i kategorię (Routine, Safety, Urgency), a radio wysyła krótką paczkę danych na kanale 70.',
    whatRu: 'Здесь составляется цифровой вызов DSC, отличный от аварийного: выбираешь тип (Individual на один MMSI, Group, All Ships, Test) и категорию (Routine, Safety, Urgency), и рация отправляет короткий пакет данных на канале 70.',
    whyPl: 'DSC to cyfrowe wywołanie selektywne: zamiast wołać czyjąś nazwę na 16 i liczyć, że ktoś akurat słuchał, radio wysyła dane z twoim MMSI (dziewięciocyfrowy numer jednostki), kategorią i proponowanym kanałem roboczym. Odbiornik po drugiej stronie daje alarm i pokazuje, kto woła, nawet jeśli nikt nie słuchał głośnika - dlatego nowoczesny nasłuch to DSC na 70 plus głos na 16. Kanał 70 jest wyłącznie cyfrowy: nigdy się na nim nie mówi.',
    whyRu: 'DSC - это цифровой избирательный вызов: вместо того чтобы кричать чье-то имя на 16 и надеяться, что кто-то слушал, рация шлет данные с твоим MMSI (девятизначный номер судна), категорией и предлагаемым рабочим каналом. Приемник на той стороне дает тревогу и показывает, кто вызывает, даже если динамик никто не слушал: поэтому современное наблюдение - это DSC на 70 плюс голос на 16. Канал 70 чисто цифровой: голосом на нем не работают никогда.',
    whenPl: 'Individual do konkretnej jednostki albo stacji brzegowej, All Ships / Safety do ostrzeżenia wszystkich, All Ships / Urgency przed komunikatem PAN-PAN, Test do sprawdzenia własnego DSC. Czerwonego klawisza nie używasz do żadnego z nich.',
    whenRu: 'Individual - конкретному судну или береговой станции, All Ships / Safety - предупреждение всем, All Ships / Urgency - перед сообщением PAN-PAN, Test - проверка своего DSC. Красная клавиша ни для одного из них не используется.',
    examPl: 'Połowa zadań praktycznych to DSC: egzaminator sprawdza wybór typu i kategorii oraz to, czy po zapowiedzi cyfrowej przechodzisz do głosu na kanale roboczym. Klasyczny błąd: sięgnięcie po czerwony DISTRESS do sytuacji, która nie jest bezpośrednim zagrożeniem życia, albo próba nadawania głosem na kanale 70.',
    examRu: 'Половина практических заданий - это DSC: экзаменатор проверяет выбор типа и категории и то, переходишь ли ты после цифрового объявления к голосу на рабочем канале. Классическая ошибка: хвататься за красный DISTRESS там, где нет прямой угрозы жизни, или пытаться говорить голосом на канале 70.',
  },
  'safety-dsc': {
    whatPl: 'Wywołanie All Ships z kategorią Safety: cyfrowa zapowiedź na kanale 70 do wszystkich stacji DSC w zasięgu, wskazująca kanał (tutaj 16), na którym za chwilę nadasz głosem komunikat zaczynający się od słowa SECURITE powtórzonego trzy razy.',
    whatRu: 'Вызов All Ships с категорией Safety: цифровое объявление на канале 70 всем станциям DSC в зоне слышимости с указанием канала (здесь 16), на котором ты сейчас голосом передашь сообщение, начинающееся со слова SECURITE, повторенного трижды.',
    whyPl: 'Kategoria mówi odbiorcy, jak głośno ma krzyknąć na załogę: Distress to bezpośrednie zagrożenie życia lub jednostki (czerwony klawisz), Urgency to PAN-PAN (poważnie, ale bez natychmiastowego zagrożenia życia: prośba o poradę medyczną lub awaria bez bezpośredniego zagrożenia), Safety to SECURITE (ostrzeżenie nawigacyjne albo meteorologiczne), Routine to cała reszta. Sama paczka DSC mówi tylko tyle, że masz słuchać - treść podajesz głosem, bo zdanie o półzatopionym kontenerze i jego pozycji rozumie człowiek, a nie cyfrowy pakiet.',
    whyRu: 'Категория говорит принимающей рации, как громко кричать на свой экипаж: Distress - прямая угроза жизни или судну (красная клавиша), Urgency - PAN-PAN (серьезно, но без немедленной угрозы жизни: запрос медицинской консультации или поломка без непосредственной опасности), Safety - SECURITE (навигационное или метеорологическое предупреждение), Routine - все остальное. Сам пакет DSC говорит лишь одно: слушайте. Содержание ты передаешь голосом, потому что фразу про полузатонувший контейнер и его координаты понимает человек, а не цифровой пакет.',
    whenPl: 'Widzisz dryfujący kontener, kłodę, nieoświetlony wrak, zgaszone światło nawigacyjne albo szkwał idący na flotę. Nikt nie jest jeszcze w niebezpieczeństwie - ostrzegasz innych, zanim będą.',
    whenRu: 'Видишь дрейфующий контейнер, бревно, неосвещенный затонувший объект, погасший навигационный огонь или шквал, идущий на флот. Никто пока не в опасности - ты предупреждаешь других заранее, чтобы в нее не попали.',
    examPl: 'To jedno z zadań z oficjalnej listy: egzaminator sprawdza kategorię (Safety, nie Urgency), zapowiedź na 70, przejście na kanał roboczy i komunikat głosowy od SECURITE trzy razy do OUT. Klasyczny błąd: wysłanie samego DSC i pominięcie części głosowej.',
    examRu: 'Это одно из заданий официального списка: экзаменатор проверяет категорию (Safety, а не Urgency), объявление на 70, переход на рабочий канал и голосовое сообщение от SECURITE трижды до OUT. Классическая ошибка: отправить DSC и забыть про голосовую часть.',
  },
  ptt: {
    whatPl: 'PTT (Push To Talk) to dźwignia na mikrofonie ręcznym: wciśnięta - radio nadaje, puszczona - odbiera. VHF pracuje simpleksem, więc nigdy nie robi obu rzeczy naraz.',
    whatRu: 'PTT (Push To Talk) - клавиша на ручном микрофоне: нажата - рация передает, отпущена - принимает. VHF работает в симплексе и никогда не делает обоих действий одновременно.',
    whyPl: 'Kanał jest wspólny dla wszystkich w zasięgu i może na nim nadawać tylko jedna stacja - dwie naraz to bełkot i nikt nikogo nie rozumie. W czasie nadawania jesteś głuchy, więc nie usłyszysz, że ktoś ci przerywa, a zablokowany, wciśnięty PTT unieruchamia kanał wszystkim, także komuś, kto próbuje nadać MAYDAY. Wciśnij, policz jeden i dopiero mów: pierwszy ułamek sekundy zjada rozruch nadajnika i otwarcie blokady szumów u odbiorcy.',
    whyRu: 'Канал общий для всех в зоне слышимости, и передавать может только одна станция: две сразу - это каша, и не слышно никого. Пока ты передаешь, ты глух и не услышишь, что тебя перебивают, а зажатый PTT блокирует канал всем, в том числе тому, кто пытается дать MAYDAY. Нажми, сосчитай раз и только потом говори: первую долю секунды съедают запуск передатчика и открытие шумоподавителя у принимающего.',
    whenPl: 'Przy każdym nadawaniu: wciśnij, powiedz krótko, puść, słuchaj. Przed pierwszym wywołaniem posłuchaj kilka sekund, czy kanał jest wolny.',
    whenRu: 'При каждой передаче: нажал, сказал коротко, отпустил, слушаешь. Перед первым вызовом послушай несколько секунд, свободен ли канал.',
    examPl: 'Egzaminator słucha rytmu nadawania i słów OVER / OUT na końcu wypowiedzi. Klasyczny błąd: mówienie w momencie puszczania klawisza, czekanie na odpowiedź z wciśniętym PTT albo przygniecenie mikrofonu do kamizelki i zajęcie kanału.',
    examRu: 'Экзаменатор слушает ритм передачи и слова OVER / OUT в конце реплики. Классическая ошибка: говорить в момент отпускания клавиши, ждать ответа с зажатым PTT или придавить микрофон к жилету и занять канал.',
  },
  distress: {
    whatPl: 'Czerwony klawisz DISTRESS pod uchylną osłoną: przytrzymany około 3 sekund wysyła alert DSC na kanale 70 z twoim MMSI, pozycją i czasem z GPS oraz rodzajem niebezpieczeństwa, powtarza go automatycznie do czasu potwierdzenia i przełącza radio na kanał 16 do głosowego MAYDAY.',
    whatRu: 'Красная клавиша DISTRESS под откидной крышкой: удержание около 3 секунд отправляет DSC-алерт на канале 70 с твоим MMSI, позицией и временем от GPS и характером бедствия, автоматически повторяет его до подтверждения и переводит рацию на канал 16 для голосового MAYDAY.',
    whyPl: 'Osłona i trzysekundowe przytrzymanie istnieją dlatego, że to wywołanie stawia na nogi służby ratownicze i nie może pójść od potrącenia rękawem. W zamian jednym ruchem wysyłasz to, na co głosowy MAYDAY potrzebuje spokojnego głosu i kilkudziesięciu sekund: kim jesteś i gdzie jesteś, cyfrowo, do każdej stacji DSC i każdej stacji brzegowej w zasięgu, nawet takiej, która nie słuchała głośnika. Dlatego radio musi mieć wpisany MMSI i podłączony GPS - bez nich alert traci większość swojej wartości.',
    whyRu: 'Крышка и трехсекундное удержание существуют потому, что этот вызов поднимает спасательные службы и не должен уходить от задетого рукава. Взамен одним движением ты отправляешь то, на что голосовому MAYDAY нужны спокойный голос и десятки секунд: кто ты и где ты, цифрой, каждой станции DSC и каждой береговой станции в зоне слышимости, даже той, что не слушала динамик. Поэтому в рацию должен быть вписан MMSI и подключен GPS: без них алерт теряет большую часть своей ценности.',
    whenPl: 'Tylko przy bezpośrednim, poważnym zagrożeniu jednostki albo życia: zatonięcie, pożar, wejście na brzeg z nawietrznej, ciężki wypadek, opuszczanie jachtu. Naciśnij, a potem weź mikrofon i nadaj MAYDAY na 16 - alert ogłasza, głos wyjaśnia.',
    whenRu: 'Только при прямой серьезной угрозе судну или жизни: затопление, пожар, выброс на подветренный берег, тяжелая травма, оставление яхты. Нажал - и сразу берешь микрофон и даешь MAYDAY на 16: алерт объявляет, голос объясняет.',
    examPl: 'Egzaminator patrzy na całą sekwencję: otwarcie osłony, przytrzymanie do końca odliczania, potem od razu MAYDAY głosem na 16 (ACK przychodzi w trakcie lub po nadaniu głosem) według schematu MIPDANIO: Mayday (trzy razy), Identyfikacja (nazwa jachtu i MMSI), Pozycja, Danger (co się stało), Assistance (jakiej pomocy potrzebujesz), Number (ilu ludzi na pokładzie), Info (co jeszcze warto wiedzieć: tratwa, kolor kadłuba), Over. Klasyczny błąd: za wczesne puszczenie klawisza (alert w ogóle nie poszedł) i, jeszcze gorzej, niewycofanie fałszywego alarmu - taki alarm anuluje się przez DSC i głosem na 16, nigdy przez wyłączenie radia.',
    examRu: 'Экзаменатор смотрит на всю последовательность: открыть крышку, держать до конца отсчета, затем сразу голосом MAYDAY на 16 (ACK приходит во время или после голосовой передачи) по схеме MIPDANIO: Mayday (трижды), Identification (название яхты и MMSI), Position (позиция), Danger (что случилось), Assistance (какая помощь нужна), Number (сколько человек на борту), Info (что еще важно: плот, цвет корпуса), Over. Классическая ошибка: отпустить клавишу раньше времени (алерт вообще не ушел) и, что хуже, не отменить ложный алерт - его отменяют через DSC и голосом на 16, а не выключением рации.',
  },
};
