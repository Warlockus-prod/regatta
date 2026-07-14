// ============================================================================
// Inspect ("Rozbior" / "Разбор") data for the radio panel.
//
// From the 2026-07 `vhf-trainer` design handoff: in inspect mode every control
// AND every display indicator is tappable and explains itself. The design used
// 19 generic keys; these are the same idea mapped onto the controls our real
// ICOM IC-M330GE / IC-M323 faceplate actually has.
//
// Text is PL (the exam language) + RU (opt-in aid on the RU site), matching the
// section language policy - no EN, the section only exists in PL and RU.
// ============================================================================

export interface InspectItem {
  /** what it is */
  titlePl: string;
  titleRu: string;
  /** what it does and, crucially, WHY it matters on the exam / at sea */
  pl: string;
  ru: string;
}

/** Keys are the `data-ik` values placed on the panel. */
export const INSPECT: Record<string, InspectItem> = {
  lcd: {
    titlePl: 'Wyswietlacz',
    titleRu: 'Дисплей',
    pl: 'Caly stan radia naraz: kanal, pozycja z GPS, tryb nasluchu, moc, stan baterii i to, czy wlasnie nadajesz. Na egzaminie egzaminator patrzy wlasnie tu - z ekranu widac, czy zrobiles wszystko poprawnie.',
    ru: 'Всё состояние рации сразу: канал, позиция с GPS, режим вахты, мощность, батарея и передаёшь ли ты сейчас. На экзамене экзаменатор смотрит именно сюда - по экрану видно, всё ли сделано верно.',
  },
  'status-band': {
    titlePl: 'INT - grupa kanalow',
    titleRu: 'INT - группа каналов',
    pl: 'Miedzynarodowa grupa kanalow (INT). Sa tez grupy USA i CAN - maja inne czestotliwosci na tych samych numerach. W Europie zawsze pracujesz na INT.',
    ru: 'Международная группа каналов (INT). Есть ещё USA и CAN - у них другие частоты на тех же номерах. В Европе всегда работаешь на INT.',
  },
  'status-gps': {
    titlePl: 'GPS',
    titleRu: 'GPS',
    pl: 'Radio ma wazna pozycje z GPS. To krytyczne: alarm DISTRESS wysyla twoja pozycje automatycznie. Bez GPS ratownicy nie wiedza, gdzie jestes, i pozycje trzeba wpisac recznie.',
    ru: 'У рации есть валидная позиция от GPS. Это критично: сигнал DISTRESS отправляет твою позицию автоматически. Без GPS спасатели не знают, где ты, и позицию придётся вводить вручную.',
  },
  'status-watch': {
    titlePl: 'Tryb nasluchu (DW / SCAN)',
    titleRu: 'Режим вахты (DW / SCAN)',
    pl: 'DW (Dual Watch) - radio slucha twojego kanalu roboczego I kanalu 16 naraz. SCAN - przeszukuje liste kanalow. Puste = zwykly nasluch jednego kanalu.',
    ru: 'DW (Dual Watch) - рация слушает твой рабочий канал И 16-й одновременно. SCAN - сканирует список каналов. Пусто = обычная вахта на одном канале.',
  },
  'status-power': {
    titlePl: 'Moc nadawania (25W / 1W)',
    titleRu: 'Мощность передачи (25 Вт / 1 Вт)',
    pl: '25W na otwartej wodzie, 1W w porcie i na krotkim dystansie - zeby nie zasmiecac eteru w promieniu 20 mil. Kanaly 15 i 17 sa TYLKO 1W. Zla moc to typowy blad na egzaminie.',
    ru: '25 Вт на открытой воде, 1 Вт в порту и на короткой дистанции - чтобы не забивать эфир в радиусе 20 миль. Каналы 15 и 17 - ТОЛЬКО 1 Вт. Неверная мощность - типичная ошибка на экзамене.',
  },
  'status-batt': {
    titlePl: 'Zasilanie',
    titleRu: 'Питание',
    pl: 'Stan zasilania. Radio bez pradu to brak nasluchu i brak mozliwosci nadania alarmu - dlatego przed rejsem sprawdza sie zasilanie i bezpiecznik.',
    ru: 'Состояние питания. Рация без питания - это ни вахты, ни возможности подать сигнал бедствия, поэтому перед выходом проверяют питание и предохранитель.',
  },
  'tx-meter': {
    titlePl: 'TX / RX + wskaznik',
    titleRu: 'TX / RX + индикатор',
    pl: 'TX = nadajesz (trzymasz PTT), RX = sluchasz. Radio jest simpleksowe: trzymajac PTT NIE slyszysz nikogo. Dlatego mowisz krotko i konczysz "OVER".',
    ru: 'TX = передаёшь (держишь PTT), RX = слушаешь. Рация симплексная: держа PTT, ты НЕ слышишь никого. Поэтому говоришь коротко и заканчиваешь «OVER».',
  },
  softkeys: {
    titlePl: 'Klawisze funkcyjne (softkeys)',
    titleRu: 'Функциональные клавиши (софткеи)',
    pl: 'Cztery klawisze pod ekranem - ich funkcja zmienia sie zaleznie od ekranu; aktualne napisy widac na dole wyswietlacza. Strzalki [<]/[>] przewijaja kolejne strony funkcji (SCAN, DW, HI/LO, DISTRESS, OTHER DSC...).',
    ru: 'Четыре клавиши под экраном - их функция меняется в зависимости от экрана; текущие подписи видно внизу дисплея. Стрелки [<]/[>] листают страницы функций (SCAN, DW, HI/LO, DISTRESS, OTHER DSC...).',
  },
  dial: {
    titlePl: 'Pokretlo PWR / VOL / SQL',
    titleRu: 'Ручка PWR / VOL / SQL',
    pl: 'Przytrzymaj ~1 s = wlacz/wylacz radio. Krotkie nacisniecie przechodzi przez glosnosc i squelch, obrot je reguluje. Squelch ustawia sie tak: zejdz az uslyszysz szum, potem podnies dokladnie do momentu, gdy szum ZNIKA - to najczulszy prog.',
    ru: 'Удержи ~1 с = включить/выключить рацию. Короткое нажатие переключает громкость и squelch, поворот их регулирует. Squelch настраивают так: опусти, пока не появится шум, затем подними ровно до момента, когда шум ПРОПАДАЕТ - это самый чувствительный порог.',
  },
  sixteen: {
    titlePl: 'Klawisz 16 / C',
    titleRu: 'Клавиша 16 / C',
    pl: 'Krotkie nacisniecie = natychmiast kanal 16 (alarmowy i wywolawczy) z kazdego miejsca w menu. Przytrzymanie ~1 s = kanal wywolawczy (Call Channel). Kanal 16 musi byc zawsze pod reka - stad osobny, czerwony klawisz.',
    ru: 'Короткое нажатие = мгновенно канал 16 (аварийный и вызывной) из любого места меню. Удержание ~1 с = вызывной канал (Call Channel). Канал 16 должен быть всегда под рукой - поэтому отдельная красная клавиша.',
  },
  keypad: {
    titlePl: 'Nawigacja: strzalki, CLR, MENU, ENT',
    titleRu: 'Навигация: стрелки, CLR, MENU, ENT',
    pl: 'Strzalki gora/dol zmieniaja kanal (a w menu - pozycje na liscie). [MENU] otwiera menu, [ENT] zatwierdza, [CLR] cofa. Tedy skladasz wywolania DSC. Uwaga: IC-M323 ma napis CLEAR zamiast CLR i inne drzewo menu.',
    ru: 'Стрелки вверх/вниз меняют канал (а в меню - позицию в списке). [MENU] открывает меню, [ENT] подтверждает, [CLR] возвращает. Через них собираются DSC-вызовы. Внимание: у IC-M323 надпись CLEAR вместо CLR и другое дерево меню.',
  },
  distress: {
    titlePl: 'DISTRESS pod oslona',
    titleRu: 'DISTRESS под крышкой',
    pl: 'Czerwony klawisz alarmu. Oslona i wymog przytrzymania 3 sekund chronia przed przypadkowym alarmem (falszywe alerty to realny problem GMDSS). Nadaje na kanale 70: twoj MMSI + pozycje z GPS + rodzaj zagrozenia - zanim w ogole wezmiesz mikrofon. Uzywasz go TYLKO przy bezposrednim zagrozeniu zycia.',
    ru: 'Красная кнопка тревоги. Крышка и удержание 3 секунды защищают от случайного алерта (ложные тревоги - реальная проблема GMDSS). Передаёт на 70 канале: твой MMSI + позицию с GPS + род бедствия - ещё до того, как возьмёшь микрофон. Жмёшь ТОЛЬКО при прямой угрозе жизни.',
  },
  ptt: {
    titlePl: 'PTT na mikrofonie',
    titleRu: 'PTT на микрофоне',
    pl: 'Push To Talk: trzymasz = nadajesz, puszczasz = sluchasz. Nigdy nie nadawaj bez podlaczonej anteny - odbita moc moze spalic stopien koncowy. Na kanale 70 glos jest zablokowany: to kanal wylacznie cyfrowy (DSC).',
    ru: 'Push To Talk: держишь = передаёшь, отпустил = слушаешь. Никогда не передавай без подключённой антенны - отражённая мощность может сжечь выходной каскад. На 70 канале голос заблокирован: это чисто цифровой канал (DSC).',
  },
};

export type InspectKey = keyof typeof INSPECT;
