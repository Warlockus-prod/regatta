// ============================================================================
// Deep explanations for the 14 lessons of the interactive course.
//
// The course used to say only WHICH button to press plus a one-line reason.
// That is not enough to pass an oral exam and it is not enough to actually
// operate a radio: the learner needs to know WHAT the control is, WHY it exists
// at all (the physical / operational reason, not a restated rule), WHEN it gets
// used on the water, and what the UKE examiner is watching for.
//
// Facts verified against the ICOM IC-M330GE / IC-M323 manuals, ITU-R M.493 /
// M.541, IMO SMCP and the UKE exam materials, then adversarially fact-checked.
// PL is ASCII-only per the repo typography rule; RU is the explanation language
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
    whatPl: 'DIAL to jedno pokretlo z trzema funkcjami: przytrzymanie okolo 1 sekundy wlacza i wylacza radio, krotkie nacisniecia przelaczaja miedzy glosnoscia a blokada szumow, a obrot zmienia wartosc. Osobnego wylacznika to radio nie ma.',
    whatRu: 'DIAL - это одна ручка с тремя функциями: удержание около 1 секунды включает и выключает рацию, короткие нажатия переключают между громкостью и шумоподавителем, поворот меняет значение. Отдельного выключателя у этой рации нет.',
    whyPl: 'Radio jest na stale podpiete do akumulatora i stoi w ciasnej zabudowie obok innych przelacznikow. Gdyby wlaczalo sie jednym dotknieciem, gasilby je przypadkiem rekaw albo szot, a wylaczone VHF to zerowy nasluch - dlatego producent wymaga swiadomego przytrzymania.',
    whyRu: 'Рация постоянно подключена к аккумулятору и стоит в тесной панели рядом с другими тумблерами. Если бы она включалась одним касанием, ее гасили бы рукавом или шкотом, а выключенное VHF - это нулевое наблюдение, поэтому производитель требует осознанного удержания.',
    whenPl: 'Wlaczasz radio przy przygotowaniu lodzi, razem z reszta elektroniki, i zostawiasz wlaczone przez caly rejs. Radio pomaga tylko wtedy, gdy jest wlaczone i nasluchuje.',
    whenRu: 'Включаешь рацию при подготовке лодки, вместе с остальной электроникой, и оставляешь включенной весь выход. Рация помогает только тогда, когда она включена и слушает.',
    examPl: 'Egzaminator patrzy, czy pewnie wlaczasz radio jednym przytrzymaniem. Klasyczny blad: krotkie nacisniecie, ktore otwiera tylko regulacje glosnosci, i zdajacy uznaje, ze urzadzenie jest zepsute.',
    examRu: 'Экзаменатор смотрит, уверенно ли ты включаешь рацию одним удержанием. Классическая ошибка: короткое нажатие открывает лишь регулировку громкости, и сдающий решает, что прибор неисправен.',
  },
  'squelch-open': {
    whatPl: 'Blokada szumow ma pozycje OPEN - calkowicie otwarta - i poziomy od 1 (luzna) do 10 (ciasna). W pozycji OPEN odbiornik nie wycisza niczego: slychac czysty szum eteru, a na ekranie zapala sie BUSY.',
    whatRu: 'У шумоподавителя есть положение OPEN - полностью открыт - и уровни от 1 (слабый) до 10 (тугой). В положении OPEN приёмник не глушит ничего: слышно чистый шум эфира, а на экране загорается BUSY.',
    whyPl: 'To nie jest usterka, tylko punkt odniesienia. Pusty kanal FM nie jest cichy: odbiornik bez sygnalu wzmacnia wlasny szum. Dopiero ten szum daje ci cos, wedlug czego mozna ustawic glosnosc - ciszy wyregulowac sie nie da. Dlatego instrukcja ICOM zaczyna procedure wlasnie tutaj: "najpierw otworz blokade szumow, potem ustaw glosnosc".',
    whyRu: 'Это не поломка, а точка отсчёта. Пустой FM-канал не бывает тихим: без сигнала приёмник усиливает собственный шум. Именно этот шум даёт то, по чему можно выставить громкость, - тишину настроить нельзя. Поэтому инструкция ICOM начинает процедуру именно отсюда: «сначала открой шумоподавитель, потом выставь громкость».',
    whenPl: 'Za kazdym razem, gdy ustawiasz radio od nowa: po wlaczeniu, po tym jak ktos inny grzebal w ustawieniach, po zmianie lodki. To pierwszy krok procedury, nie ciekawostka.',
    whenRu: 'Каждый раз, когда настраиваешь рацию заново: после включения, после того как в настройках копался кто-то другой, при смене лодки. Это первый шаг процедуры, а не любопытный факт.',
    examPl: 'Egzaminator chce zobaczyc cala procedure w tej kolejnosci: OPEN, glosnosc, prog. Klasyczny blad: krecenie glosnoscia przy zamknietej blokadzie i zdziwienie, ze radio milczy.',
    examRu: 'Экзаменатор хочет увидеть всю процедуру именно в этом порядке: OPEN, громкость, порог. Классическая ошибка: крутить громкость при закрытом шумоподавителе и удивляться, что рация молчит.',
  },
  volume: {
    whatPl: 'Glosnosc glosnika, regulowana obrotem DIAL po wejsciu na ekran VOL: od wyciszenia do maksimum. Wplywa wylacznie na to, co slyszysz, i na nic wiecej.',
    whatRu: 'Громкость динамика, регулируется поворотом DIAL на экране VOL: от нуля до максимума. Влияет только на то, что ты слышишь, и ни на что больше.',
    whyPl: 'VHF jest przede wszystkim urzadzeniem do nasluchu: wywolanie dociera do ciebie tylko wtedy, gdy przebije sie przez silnik, wiatr i lopot zagli. Glosnosc nie ma nic wspolnego z moca nadawania - podglosnienie nie zwieksza zasiegu i nie sprawia, ze inni slysza cie lepiej.',
    whyRu: 'VHF - это прежде всего прибор для прослушивания: вызов дойдет до тебя, только если пробьется через двигатель, ветер и хлопанье парусов. Громкость никак не связана с мощностью передачи: прибавить звук не значит увеличить дальность или стать слышнее для других.',
    whenPl: 'Ustawiasz ja przeciwko szumowi z otwartej blokady, zaraz po wlaczeniu, i poprawiasz za kazdym razem, gdy zmieniaja sie warunki: po uruchomieniu silnika, na kursie pod fale, w halasliwej marinie. Jesli nie slyszysz radia przy sterze, praktycznie go nie masz.',
    whenRu: 'Ставишь её по шуму открытого шумоподавителя, сразу после включения, и поправляешь каждый раз, когда меняются условия: завели двигатель, пошли против волны, зашли в шумную марину. Если у руля рации не слышно, её фактически нет.',
    examPl: 'Egzaminator prosi o ustawienie glosnosci i chce zobaczyc, ze robisz to swiadomie, a nie na oslep. Klasyczny blad: mylenie glosnosci z blokada szumow albo twierdzenie, ze glosnosc wplywa na zasieg.',
    examRu: 'Экзаменатор просит выставить громкость и хочет видеть, что ты делаешь это осознанно, а не наугад. Классическая ошибка: путать громкость с шумоподавителем или утверждать, что громкость влияет на дальность.',
  },
  squelch: {
    whatPl: 'Blokada szumow (SQL) to prog czulosci odbiornika: wycisza glosnik, dopoki sygnal jest slabszy niz ustawiony poziom, i otwiera go, gdy pojawi sie sygnal mocniejszy. Poziom ustawiasz obrotem DIAL na ekranie SQL.',
    whatRu: 'Шумоподавитель (SQL) - это порог чувствительности приемника: он глушит динамик, пока сигнал слабее заданного уровня, и открывает его, как только приходит сигнал сильнее. Уровень задается поворотом DIAL на экране SQL.',
    whyPl: 'Pusty kanal nie jest cichy - odbiornik wzmacnia szum i syczy, a kilku godzin takiego syku nikt nie wytrzyma. Prog jest jednak glupi: porownuje wylacznie sile sygnalu, wiec ustawiony za wysoko nie przepusci slabego, dalekiego wywolania (na przyklad kogos nadajacego moca 1 W) i po prostu go nie uslyszysz.',
    whyRu: 'Пустой канал не бывает тихим: приемник усиливает шум и шипит, а слушать это часами невозможно. Но порог туп, он сравнивает только силу сигнала: задранный слишком высоко, он не пропустит слабый далекий вызов (например, от того, кто передает мощностью 1 Вт), и ты его просто не услышишь.',
    whenPl: 'Ustawiasz zaraz po wlaczeniu radia: skrec w dol, az uslyszysz staly szum, potem podnos do momentu, w ktorym szum wlasnie znika, i zatrzymaj sie. Obniz prog, gdy czekasz na slaby albo daleki sygnal, na przyklad szukasz lodzi, ktora przestala odpowiadac.',
    whenRu: 'Настраиваешь сразу после включения: убавляй, пока не появится ровное шипение, потом поднимай ровно до момента, когда шипение исчезло, и остановись. Опусти порог, когда ждешь слабый или далекий сигнал, например ищешь лодку, которая перестала отвечать.',
    examPl: 'Egzaminator kaze ustawic SQL i oczekuje dokladnie tej procedury: otworz do szumu, cofnij tuz za prog. Klasyczny blad: przekrecenie SQL na maksimum dla ciszy - to zabija slabe wywolania i jest odpowiedzia, ktora oblewa.',
    examRu: 'Экзаменатор просит настроить SQL и ждет именно этой процедуры: открыть до шума, вернуть чуть за порог. Классическая ошибка: выкрутить SQL на максимум ради тишины - так глушатся слабые вызовы, и это ответ, который заваливает.',
  },
  channel: {
    whatPl: 'Kanaly to ponumerowane, z gory ustalone czestotliwosci VHF, kazdy z przypisana rola: 16 alarmowy i wywolawczy, 70 wylacznie DSC, 10 / 12 / 14 porty i mariny w Polsce, 06 i 08 miedzy jednostkami. Na M330 kanal wybierasz strzalkami gora/dol, na M323 takze obrotem DIAL.',
    whatRu: 'Каналы - это пронумерованные, заранее заданные частоты VHF, у каждого своя роль: 16 аварийный и вызывной, 70 только DSC, 10 / 12 / 14 порты и марины в Польше, 06 и 08 между судами. На M330 канал выбирается стрелками вверх/вниз, на M323 еще и поворотом DIAL.',
    whyPl: 'Slyszysz wylacznie ten kanal, na ktorym stoisz, a kanal 16 musi zostac wolny dla tych, ktorzy maja klopoty - dlatego rozmowy robocze przenosi sie na kanal roboczy. W Gdyni kanal 12 obsluguje ruch portowy, wiec stacje portowa wolasz tam, a nie na 16; kanal mariny sprawdz wczesniej w locji albo na jej stronie.',
    whyRu: 'Ты слышишь только тот канал, на котором стоишь, а 16 должен оставаться свободным для тех, у кого беда, поэтому рабочие разговоры уводят на рабочий канал. В Гдыне канал 12 обслуживает портовое движение, значит портовую станцию вызывают там, а не на 16; канал марины уточни заранее в лоции или на ее сайте.',
    whenPl: 'Zanim kogokolwiek zawolasz, sprawdz, na ktorym kanale ta stacja nasluchuje: marina, VTS, most, inna lodz. Po wywolaniu na 16 albo po wywolaniu DSC obie strony przechodza na uzgodniony kanal roboczy i rozmawiaja tam.',
    whenRu: 'Перед любым вызовом узнай, на каком канале слушает эта станция: марина, VTS, мост, другая лодка. После вызова на 16 или после вызова DSC обе стороны переходят на согласованный рабочий канал и говорят там.',
    examPl: 'Egzaminator podaje stacje i oczekuje, ze znajdziesz jej kanal (locja, wykaz stacji, informacja mariny) i szybko go ustawisz. Klasyczny blad: zalatwianie spraw roboczych na 16 oraz zgadywanie kanalu zamiast sprawdzenia go - kanaly stacji sa rozne, np. porty Trojmiasta pracuja na 12 i 14, a VTS Zatoka Gdanska na 71.',
    examRu: 'Экзаменатор называет станцию и ждет, что ты найдешь ее канал (лоция, список станций, сайт марины) и быстро его выставишь. Классическая ошибка: рабочие переговоры на 16 и угадывание канала вместо проверки - каналы у станций разные, например порты Труймяста работают на 12 и 14, а VTS Zatoka Gdanska на 71.',
  },
  channel16: {
    whatPl: 'Osobny klawisz 16/C: krotkie nacisniecie z dowolnego zwyklego ekranu natychmiast ustawia kanal 16 (156,800 MHz) - miedzynarodowy kanal niebezpieczenstwa, pilnosci, bezpieczenstwa i wywolawczy.',
    whatRu: 'Отдельная клавиша 16/C: короткое нажатие с любого обычного экрана мгновенно ставит канал 16 (156,800 МГц) - международный канал бедствия, срочности, безопасности и вызова.',
    whyPl: 'W sytuacji zagrozenia nie ma czasu na szukanie kanalu w liscie, dlatego 16 dostal wlasny, sprzetowy klawisz, ktory trafiasz po ciemku w kilka sekund. Na 16 nasluchuja wszyscy: jednostki, stacje brzegowe i sluzby SAR, wiec tylko tam glosowy MAYDAY zostanie uslyszany, i tam radio przechodzi samo po wyslaniu alertu DSC.',
    whyRu: 'В аварии нет времени искать канал в списке, поэтому у 16 есть своя аппаратная клавиша, которую находишь в темноте за секунды. На 16 слушают все: суда, береговые станции и службы SAR, только там будет услышан голосовой MAYDAY, и туда же рация переходит сама после отправки DSC-алерта.',
    whenPl: 'Zawsze w niebezpieczenstwie, pilnosci i bezpieczenstwie, przy pierwszym wywolaniu i przy odpowiedzi na wywolanie, a takze wtedy, gdy po prostu prowadzisz nasluch. W drodze kanal 16 ma byc pod nasluchem caly czas - bezposrednio albo przez nasluch podwojny.',
    whenRu: 'Всегда при бедствии, срочности и безопасности, при первом вызове и ответе на вызов, а также когда ты просто несешь вахту. На ходу канал 16 должен быть под наблюдением постоянно - напрямую или через двойное наблюдение.',
    examPl: 'Wiekszosc zadan zaczyna sie albo konczy na 16 i egzaminator patrzy, czy tam wracasz. Klasyczny blad: przytrzymanie klawisza zamiast krotkiego nacisniecia (dostajesz wtedy kanal wywolawczy) albo test lacznosci i rozmowy robocze prowadzone na 16.',
    examRu: 'Большинство заданий начинается или заканчивается на 16, и экзаменатор смотрит, возвращаешься ли ты туда. Классическая ошибка: удержание клавиши вместо короткого нажатия (получишь вызывной канал) или проверка связи и рабочие разговоры на 16.',
  },
  'call-channel': {
    whatPl: 'Przytrzymanie 16/C przez okolo 1 sekunde przelacza na zaprogramowany kanal wywolawczy (Call Channel) - twoj wlasny skrot do jednego, czesto uzywanego kanalu. W trenazerze jest to kanal 06.',
    whatRu: 'Удержание 16/C около 1 секунды переключает на запрограммированный вызывной канал (Call Channel) - твой личный ярлык на один часто используемый канал. В тренажере это канал 06.',
    whyPl: 'Kazda lodz ma kanal, na ktorym siedzi najczesciej: kanal flotylli, klubu albo kanal miedzy jednostkami. Wyszukiwanie go strzalkami za kazdym razem to sekundy z oczami na wyswietlaczu zamiast na wodzie, wiec producent dal mu drugi skrot obok 16. To wygoda, a nie kategoria z przepisow.',
    whyRu: 'У каждой лодки есть канал, на котором она сидит чаще всего: канал флотилии, клуба или канал между судами. Искать его стрелками каждый раз - это секунды с глазами на дисплее вместо воды, поэтому производитель дал ему второй ярлык рядом с 16. Это удобство, а не категория из правил.',
    whenPl: 'Plyniesz w regatach na kanale flotylli albo klub pracuje na 06 - ustawiasz go jako Call Channel i po kazdym wywolaniu na 16 wracasz tam jednym przytrzymaniem.',
    whenRu: 'Идешь в регате на канале флотилии или клуб работает на 06 - ставишь его как Call Channel и после каждого вызова на 16 возвращаешься туда одним удержанием.',
    examPl: 'Egzaminator lubi pytac, czym rozni sie krotkie nacisniecie 16/C od dlugiego - ta para jest sednem zadania. Klasyczny blad: mylenie kanalu 16 z kanalem wywolawczym, czyli przytrzymanie klawisza wtedy, gdy potrzebna byla szesnastka.',
    examRu: 'Экзаменатор любит спрашивать, чем короткое нажатие 16/C отличается от долгого: именно эта пара и проверяется. Классическая ошибка: путать канал 16 с вызывным каналом, то есть удерживать клавишу тогда, когда нужна была шестнадцатая.',
  },
  'power-level': {
    whatPl: 'Przelacznik mocy nadajnika (klawisz HI/LO): 25 W to moc pelna, 1 W to moc mala, a aktualne ustawienie widac na wyswietlaczu. Na czesci kanalow radio wymusza 1 W samo, niezaleznie od twojego wyboru.',
    whatRu: 'Переключатель мощности передатчика (клавиша HI/LO): 25 Вт - полная мощность, 1 Вт - малая, текущее значение видно на дисплее. На части каналов рация сама принудительно держит 1 Вт, независимо от твоего выбора.',
    whyPl: 'VHF siega tylko do horyzontu radiowego, wiec pelne 25 W jest potrzebne, zeby dosiegnac stacji brzegowej albo odleglej jednostki. Ale w marinie wszyscy stoja kilkadziesiat metrow od siebie: 25 W wali wtedy w kazdy odbiornik w basenie, zajmuje innym kanal, zjada prad z akumulatora i zakloca odleglym stacjom, ktore pracuja na tej samej czestotliwosci. Dlatego przepisy same ograniczaja moc na czesci kanalow: kanaly ochronne 75 i 76, lezace tuz obok 16, maja limit 1 W, zeby chronic kanal 16, a kanaly 15 i 17 (lacznosc wewnatrz jednostki) tez pracuja wylacznie mala moca.',
    whyRu: 'VHF добивает только до радиогоризонта, поэтому полные 25 Вт нужны, чтобы дотянуться до береговой станции или далекого судна. Но в марине все стоят в десятках метров друг от друга: 25 Вт бьют в каждый приемник в бассейне, занимают канал другим, съедают ток аккумулятора и мешают дальним станциям на той же частоте. Поэтому часть каналов ограничена по мощности самими правилами: охранные каналы 75 и 76 рядом с 16 имеют лимит 1 Вт, чтобы защитить канал 16, а каналы 15 и 17 (связь внутри судна) тоже работают только малой мощностью.',
    whenPl: '1 W w marinie, w porcie, przy tescie lacznosci z marina i przy rozmowie z lodzia obok. 25 W przy wywolaniu stacji brzegowej, VTS albo odleglej jednostki, i zawsze w niebezpieczenstwie, pilnosci i bezpieczenstwie - przy MAYDAY nikt nie zmniejsza mocy.',
    whenRu: '1 Вт - в марине, в порту, при проверке связи с мариной и разговоре с соседней лодкой. 25 Вт - при вызове береговой станции, VTS или далекого судна, и всегда при бедствии, срочности и безопасности: при MAYDAY мощность не снижают.',
    examPl: 'Egzaminator chce zobaczyc, ze sam z siebie zmniejszasz moc do ruchu lokalnego i potrafisz powiedziec dlaczego. Klasyczny blad: wszystko nadawane na 25 W, albo odwrotnie - wywolanie alarmowe wyslane mala moca.',
    examRu: 'Экзаменатор хочет увидеть, что ты сам снижаешь мощность для местной связи и можешь объяснить зачем. Классическая ошибка: все подряд на 25 Вт или, наоборот, аварийный вызов на малой мощности.',
  },
  'dual-watch': {
    whatPl: 'Nasluch podwojny (DW) to tryb odbioru: radio na przemian sprawdza twoj kanal roboczy i kanal 16 i zatrzymuje sie na tym, na ktorym pojawi sie ruch. To nie jest skanowanie - skan przebiega cala liste kanalow, DW pilnuje dokladnie dwoch.',
    whatRu: 'Двойное наблюдение (DW) - это режим приема: рация попеременно проверяет твой рабочий канал и канал 16 и останавливается на том, где появился сигнал. Это не сканирование: скан проходит весь список каналов, а DW следит ровно за двумя.',
    whyPl: 'Nasluch na 16 ma trwac caly czas, ale pracowac musisz na kanale roboczym, a jeden odbiornik nie slucha dwoch czestotliwosci naraz - wiec dzieli miedzy nie czas. Bez DW w chwili, gdy zejdziesz na 12 do mariny, jestes gluchy na kazdy MAYDAY nadany na 16.',
    whyRu: 'Вахта на 16 должна идти постоянно, а работать надо на рабочем канале, но один приемник не слушает две частоты сразу, поэтому он делит между ними время. Без DW в тот момент, когда ты ушел на 12 к марине, ты глух к любому MAYDAY на 16.',
    whenPl: 'Wlaczasz zawsze, gdy schodzisz z 16 na kanal roboczy, a chcesz dalej slyszec 16: czekajac na miejsce w marinie na 12 albo rozmawiajac z flotylla na kanale regatowym.',
    whenRu: 'Включаешь всегда, когда уходишь с 16 на рабочий канал, но хочешь продолжать слышать 16: ждешь место в марине на 12 или общаешься с флотилией на регатном канале.',
    examPl: 'Egzaminator moze kazac wlaczyc DW i wytlumaczyc roznice miedzy DW a skanowaniem. Klasyczny blad: nazywanie skanowania nasluchem podwojnym albo twierdzenie, ze DW pozwala nadawac na dwoch kanalach - DW dotyczy wylacznie odbioru.',
    examRu: 'Экзаменатор может попросить включить DW и объяснить разницу между DW и сканированием. Классическая ошибка: называть скан двойным наблюдением или утверждать, что DW позволяет передавать на двух каналах - DW касается только приема.',
  },
  backlight: {
    whatPl: 'Podswietlenie wyswietlacza i klawiszy, regulowane od OFF do 7: na M330 softkeyem [BKLT] pod wyswietlaczem, na M323 takze w cyklu nacisniec DIAL.',
    whatRu: 'Подсветка дисплея и клавиш, регулируется от OFF до 7: на M330 через софт-клавишу [BKLT] под дисплеем, на M323 еще и в цикле нажатий DIAL.',
    whyPl: 'W nocy oko przyzwyczaja sie do ciemnosci kilkanascie minut, a jeden jasny ekran przy zejsciowce niszczy te adaptacje natychmiast - przestajesz widziec swiatla innych jednostek i nieoswietlone znaki nawigacyjne. Dlatego schodzisz do najnizszego poziomu, na ktorym jeszcze czytasz ekran; w dzien odwrotnie, bo przygaszony LCD w slonce jest nieczytelny, a wyswietlacz musisz umiec odczytac w sekunde.',
    whyRu: 'Ночью глаз привыкает к темноте больше десяти минут, а один яркий экран у входа в каюту рушит эту адаптацию мгновенно: перестаешь видеть огни других судов и неосвещенные знаки. Поэтому опускаешь до самого низкого уровня, на котором еще читаешь экран; днем наоборот, потому что тусклый LCD на солнце нечитаем, а дисплей надо уметь прочесть за секунду.',
    whenPl: 'Przyciemniasz o zmierzchu, razem z reszta oswietlenia na lodzi: przed nocna wachta i przed nocnym wejsciem do portu, zawsze zanim zaczniesz wypatrywac swiatel innych jednostek i nabieznikow. Rozjasniasz rano i w pelnym sloncu, gdy odblask w szybie zjada kontrast i nie odczytasz numeru kanalu.',
    whenRu: 'Приглушаешь в сумерках вместе с остальным освещением на лодке: перед ночной вахтой и перед ночным входом в порт, всегда до того, как начнешь высматривать огни других судов и створные знаки. Прибавляешь яркость утром и на ярком солнце, когда блик на стекле съедает контраст и номер канала не прочитать.',
    examPl: 'To zadanie sprawdza po prostu, czy znasz swoje urzadzenie - egzaminator moze poprosic o zmiane podswietlenia. Klasyczny blad: blakanie sie po funkcjach DIAL i przypadkowa zmiana glosnosci albo SQL zamiast podswietlenia.',
    examRu: 'Это задание проверяет просто знание своего аппарата: экзаменатор может попросить изменить подсветку. Классическая ошибка: заблудиться в функциях DIAL и случайно сбить громкость или SQL вместо подсветки.',
  },
  menu: {
    whatPl: 'Klawisz MENU otwiera drzewo funkcji, ktore nie maja wlasnych przyciskow: wywolania DSC, dziennik DSC, pozycja z GPS, ustawienia radia, konfiguracja, dane MMSI. Poruszasz sie strzalkami, wchodzisz klawiszem ENT, cofasz klawiszem CLR (M330) albo CLEAR (M323).',
    whatRu: 'Клавиша MENU открывает дерево функций, у которых нет своих кнопок: вызовы DSC, журнал DSC, позиция от GPS, настройки рации, конфигурация, данные MMSI. Двигаешься стрелками, входишь клавишей ENT, назад - CLR (M330) или CLEAR (M323).',
    whyPl: 'Radio ma wiecej funkcji niz klawiszy, wiec wszystko, co musi byc natychmiastowe (16, DISTRESS, PTT, moc), siedzi na twardych przyciskach, a reszta zyje w menu, gdzie mozesz sobie pozwolic na kilka sekund. Najwazniejsza umiejetnosc to droga powrotna: jesli zgubisz sie w podmenu, w praktyce nie pracujesz na radiu.',
    whyRu: 'Функций у рации больше, чем клавиш, поэтому все, что должно быть мгновенным (16, DISTRESS, PTT, мощность), вынесено на жесткие кнопки, а остальное живет в меню, где можно позволить себе несколько секунд. Главный навык - дорога назад: если ты потерялся в подменю, ты фактически не работаешь на рации.',
    whenPl: 'Do menu wchodzisz, zeby zlozyc wywolanie DSC, przejrzec dziennik wywolan, odczytac MMSI i pozycje albo ustawic radio przed wyjsciem.',
    whenRu: 'В меню заходишь, чтобы составить вызов DSC, посмотреть журнал вызовов, прочитать MMSI и позицию или настроить рацию перед выходом.',
    examPl: 'Egzaminator daje zadanie i patrzy, czy poruszasz sie po menu pewnie; pamietaj, ze M330 i M323 maja rozne drzewa, wiec ucz sie tego, na ktorym zdajesz. Klasyczny blad: brak nawyku cofania sie klawiszem CLR / CLEAR do ekranu STBY.',
    examRu: 'Экзаменатор дает задание и смотрит, уверенно ли ты ходишь по меню; помни, что у M330 и M323 разные деревья, поэтому учи то, на котором сдаешь. Классическая ошибка: нет привычки возвращаться клавишей CLR / CLEAR на экран STBY.',
  },
  'other-dsc': {
    whatPl: 'Tu skladasz cyfrowe wywolanie DSC inne niz alarmowe: wybierasz typ (Individual do jednego MMSI, Group, All Ships, Test) i kategorie (Routine, Safety, Urgency), a radio wysyla krotka paczke danych na kanale 70.',
    whatRu: 'Здесь составляется цифровой вызов DSC, отличный от аварийного: выбираешь тип (Individual на один MMSI, Group, All Ships, Test) и категорию (Routine, Safety, Urgency), и рация отправляет короткий пакет данных на канале 70.',
    whyPl: 'DSC to cyfrowe wywolanie selektywne: zamiast wolac czyjas nazwe na 16 i liczyc, ze ktos akurat sluchal, radio wysyla dane z twoim MMSI (dziewieciocyfrowy numer jednostki), kategoria i proponowanym kanalem roboczym. Odbiornik po drugiej stronie daje alarm i pokazuje, kto wola, nawet jesli nikt nie sluchal glosnika - dlatego nowoczesny nasluch to DSC na 70 plus glos na 16. Kanal 70 jest wylacznie cyfrowy: nigdy sie na nim nie mowi.',
    whyRu: 'DSC - это цифровой избирательный вызов: вместо того чтобы кричать чье-то имя на 16 и надеяться, что кто-то слушал, рация шлет данные с твоим MMSI (девятизначный номер судна), категорией и предлагаемым рабочим каналом. Приемник на той стороне дает тревогу и показывает, кто вызывает, даже если динамик никто не слушал: поэтому современное наблюдение - это DSC на 70 плюс голос на 16. Канал 70 чисто цифровой: голосом на нем не работают никогда.',
    whenPl: 'Individual do konkretnej jednostki albo stacji brzegowej, All Ships / Safety do ostrzezenia wszystkich, All Ships / Urgency przed komunikatem PAN-PAN, Test do sprawdzenia wlasnego DSC. Czerwonego klawisza nie uzywasz do zadnego z nich.',
    whenRu: 'Individual - конкретному судну или береговой станции, All Ships / Safety - предупреждение всем, All Ships / Urgency - перед сообщением PAN-PAN, Test - проверка своего DSC. Красная клавиша ни для одного из них не используется.',
    examPl: 'Polowa zadan praktycznych to DSC: egzaminator sprawdza wybor typu i kategorii oraz to, czy po zapowiedzi cyfrowej przechodzisz do glosu na kanale roboczym. Klasyczny blad: siegniecie po czerwony DISTRESS do sytuacji, ktora nie jest bezposrednim zagrozeniem zycia, albo proba nadawania glosem na kanale 70.',
    examRu: 'Половина практических заданий - это DSC: экзаменатор проверяет выбор типа и категории и то, переходишь ли ты после цифрового объявления к голосу на рабочем канале. Классическая ошибка: хвататься за красный DISTRESS там, где нет прямой угрозы жизни, или пытаться говорить голосом на канале 70.',
  },
  'safety-dsc': {
    whatPl: 'Wywolanie All Ships z kategoria Safety: cyfrowa zapowiedz na kanale 70 do wszystkich stacji DSC w zasiegu, wskazujaca kanal (tutaj 16), na ktorym za chwile nadasz glosem komunikat zaczynajacy sie od slowa SECURITE powtorzonego trzy razy.',
    whatRu: 'Вызов All Ships с категорией Safety: цифровое объявление на канале 70 всем станциям DSC в зоне слышимости с указанием канала (здесь 16), на котором ты сейчас голосом передашь сообщение, начинающееся со слова SECURITE, повторенного трижды.',
    whyPl: 'Kategoria mowi odbiorcy, jak glosno ma krzyknac na zaloge: Distress to bezposrednie zagrozenie zycia lub jednostki (czerwony klawisz), Urgency to PAN-PAN (powaznie, ale bez natychmiastowego zagrozenia zycia: czlowiek za burta, sprawa medyczna, dryf bez napedu), Safety to SECURITE (ostrzezenie nawigacyjne albo meteorologiczne), Routine to cala reszta. Sama paczka DSC mowi tylko tyle, ze masz sluchac - tresc podajesz glosem, bo zdanie o polzatopionym kontenerze i jego pozycji rozumie czlowiek, a nie cyfrowy pakiet.',
    whyRu: 'Категория говорит принимающей рации, как громко кричать на свой экипаж: Distress - прямая угроза жизни или судну (красная клавиша), Urgency - PAN-PAN (серьезно, но без немедленной угрозы жизни: человек за бортом, медицина, дрейф без хода), Safety - SECURITE (навигационное или метеорологическое предупреждение), Routine - все остальное. Сам пакет DSC говорит лишь одно: слушайте. Содержание ты передаешь голосом, потому что фразу про полузатонувший контейнер и его координаты понимает человек, а не цифровой пакет.',
    whenPl: 'Widzisz dryfujacy kontener, klode, nieoswietlony wrak, zgaszone swiatlo nawigacyjne albo szkwal idacy na flote. Nikt nie jest jeszcze w niebezpieczenstwie - ostrzegasz innych, zanim beda.',
    whenRu: 'Видишь дрейфующий контейнер, бревно, неосвещенный затонувший объект, погасший навигационный огонь или шквал, идущий на флот. Никто пока не в опасности - ты предупреждаешь других заранее, чтобы в нее не попали.',
    examPl: 'To jedno z zadan z oficjalnej listy: egzaminator sprawdza kategorie (Safety, nie Urgency), zapowiedz na 70, przejscie na kanal roboczy i komunikat glosowy od SECURITE trzy razy do OUT. Klasyczny blad: wyslanie samego DSC i pominiecie czesci glosowej.',
    examRu: 'Это одно из заданий официального списка: экзаменатор проверяет категорию (Safety, а не Urgency), объявление на 70, переход на рабочий канал и голосовое сообщение от SECURITE трижды до OUT. Классическая ошибка: отправить DSC и забыть про голосовую часть.',
  },
  ptt: {
    whatPl: 'PTT (Push To Talk) to dzwignia na mikrofonie recznym: wcisnieta - radio nadaje, puszczona - odbiera. VHF pracuje simpleksem, wiec nigdy nie robi obu rzeczy naraz.',
    whatRu: 'PTT (Push To Talk) - клавиша на ручном микрофоне: нажата - рация передает, отпущена - принимает. VHF работает в симплексе и никогда не делает обоих действий одновременно.',
    whyPl: 'Kanal jest wspolny dla wszystkich w zasiegu i moze na nim nadawac tylko jedna stacja - dwie naraz to belkot i nikt nikogo nie rozumie. W czasie nadawania jestes gluchy, wiec nie uslyszysz, ze ktos ci przerywa, a zablokowany, wcisniety PTT unieruchamia kanal wszystkim, takze komus, kto probuje nadac MAYDAY. Wcisnij, policz jeden i dopiero mow: pierwszy ulamek sekundy zjada rozruch nadajnika i otwarcie blokady szumow u odbiorcy.',
    whyRu: 'Канал общий для всех в зоне слышимости, и передавать может только одна станция: две сразу - это каша, и не слышно никого. Пока ты передаешь, ты глух и не услышишь, что тебя перебивают, а зажатый PTT блокирует канал всем, в том числе тому, кто пытается дать MAYDAY. Нажми, сосчитай раз и только потом говори: первую долю секунды съедают запуск передатчика и открытие шумоподавителя у принимающего.',
    whenPl: 'Przy kazdym nadawaniu: wcisnij, powiedz krotko, pusc, sluchaj. Przed pierwszym wywolaniem posluchaj kilka sekund, czy kanal jest wolny.',
    whenRu: 'При каждой передаче: нажал, сказал коротко, отпустил, слушаешь. Перед первым вызовом послушай несколько секунд, свободен ли канал.',
    examPl: 'Egzaminator slucha rytmu nadawania i slow OVER / OUT na koncu wypowiedzi. Klasyczny blad: mowienie w momencie puszczania klawisza, czekanie na odpowiedz z wcisnietym PTT albo przygniecenie mikrofonu do kamizelki i zajecie kanalu.',
    examRu: 'Экзаменатор слушает ритм передачи и слова OVER / OUT в конце реплики. Классическая ошибка: говорить в момент отпускания клавиши, ждать ответа с зажатым PTT или придавить микрофон к жилету и занять канал.',
  },
  distress: {
    whatPl: 'Czerwony klawisz DISTRESS pod uchylna oslona: przytrzymany okolo 3 sekund wysyla alert DSC na kanale 70 z twoim MMSI, pozycja i czasem z GPS oraz rodzajem niebezpieczenstwa, powtarza go automatycznie do czasu potwierdzenia i przelacza radio na kanal 16 do glosowego MAYDAY.',
    whatRu: 'Красная клавиша DISTRESS под откидной крышкой: удержание около 3 секунд отправляет DSC-алерт на канале 70 с твоим MMSI, позицией и временем от GPS и характером бедствия, автоматически повторяет его до подтверждения и переводит рацию на канал 16 для голосового MAYDAY.',
    whyPl: 'Oslona i trzysekundowe przytrzymanie istnieja dlatego, ze to wywolanie stawia na nogi sluzby ratownicze i nie moze pojsc od potracenia rekawem. W zamian jednym ruchem wysylasz to, na co glosowy MAYDAY potrzebuje spokojnego glosu i kilkudziesieciu sekund: kim jestes i gdzie jestes, cyfrowo, do kazdej stacji DSC i kazdej stacji brzegowej w zasiegu, nawet takiej, ktora nie sluchala glosnika. Dlatego radio musi miec wpisany MMSI i podlaczony GPS - bez nich alert traci wiekszosc swojej wartosci.',
    whyRu: 'Крышка и трехсекундное удержание существуют потому, что этот вызов поднимает спасательные службы и не должен уходить от задетого рукава. Взамен одним движением ты отправляешь то, на что голосовому MAYDAY нужны спокойный голос и десятки секунд: кто ты и где ты, цифрой, каждой станции DSC и каждой береговой станции в зоне слышимости, даже той, что не слушала динамик. Поэтому в рацию должен быть вписан MMSI и подключен GPS: без них алерт теряет большую часть своей ценности.',
    whenPl: 'Tylko przy bezposrednim, powaznym zagrozeniu jednostki albo zycia: zatoniecie, pozar, wejscie na brzeg z nawietrznej, ciezki wypadek, opuszczanie jachtu. Nacisnij, a potem wez mikrofon i nadaj MAYDAY na 16 - alert oglasza, glos wyjasnia.',
    whenRu: 'Только при прямой серьезной угрозе судну или жизни: затопление, пожар, выброс на подветренный берег, тяжелая травма, оставление яхты. Нажал - и сразу берешь микрофон и даешь MAYDAY на 16: алерт объявляет, голос объясняет.',
    examPl: 'Egzaminator patrzy na cala sekwencje: otwarcie oslony, przytrzymanie do konca odliczania, oczekiwanie na potwierdzenie, potem MAYDAY glosem na 16 wedlug schematu MIPDANIO: Mayday (trzy razy), Identyfikacja (nazwa jachtu i MMSI), Pozycja, Danger (co sie stalo), Assistance (jakiej pomocy potrzebujesz), Number (ilu ludzi na pokladzie), Info (co jeszcze warto wiedziec: tratwa, kolor kadluba), Over. Klasyczny blad: za wczesne puszczenie klawisza (alert w ogole nie poszedl) i, jeszcze gorzej, niewycofanie falszywego alarmu - taki alarm anuluje sie przez DSC i glosem na 16, nigdy przez wylaczenie radia.',
    examRu: 'Экзаменатор смотрит на всю последовательность: открыть крышку, держать до конца отсчета, дождаться подтверждения, затем голосом MAYDAY на 16 по схеме MIPDANIO: Mayday (трижды), Identification (название яхты и MMSI), Position (позиция), Danger (что случилось), Assistance (какая помощь нужна), Number (сколько человек на борту), Info (что еще важно: плот, цвет корпуса), Over. Классическая ошибка: отпустить клавишу раньше времени (алерт вообще не ушел) и, что хуже, не отменить ложный алерт - его отменяют через DSC и голосом на 16, а не выключением рации.',
  },
};
