# P10: дневная оболочка, брифинг и место лодке

28 октября 2026. Продолжение [полного статуса](completion-status.md), T01/T02/T04,
F06/F12/F15. Основная программаP00-P12 не заменяется этим checkpoint.
TestFlight69/source2ea498b остается неизменным. Candidate1.7.0(70) еще не поставлен.

## Порядок и исходное состояние

- [x]29aa содержит дневные native activity surfaces и наследование web-темы,
  но не принят на установленном новом пакете. Самостоятельного native Dark/Auto нет.
- [x] Новый regression на29aa воспроизводит T04: после прокрученного входа
  Back/верх briefing уходят под sticky site nav. Assertions остаются прежними
  в окончательном тесте; не считаем исправлением простую смену screenshot.
- [x] Предыдущая race scene569x196px при750pxвысоты. Dock требует350px.
  Запас production static chunks составляет83bytes, всего6815661.
- [x] Предварительная проверка Apple GET2026-10-28T12:41:43.898Z: весь iOS1.7.0
  train23builds, максимум69, exact70 отсутствует.70выбран для кандидата, не
  зарезервирован; перед отправкой требуется повтор. Public1.6.4 связан с
  VALID48/READY_FOR_SALE,1.7.0 PREPARE_FOR_SUBMISSION. Удаленных записей0.

## Изменение

1. Menu/briefing/running используют одинаковую высоту доступного viewport.
   Только embedded/native занимает100dvh. Menu и briefing имеют по одной
   внутренней области прокрутки; нижняя кнопка старта остается доступной.
2. На входе в menu/briefing сбрасывается их прокрутка и внешний scroll,
   заголовок получает программный фокус без прокрутки. Эффект зависит только
   от фазы, не от physics tick, языка, mode или размера окна. Сохраненные
   режим/ветер, native escape/lesson bridge и симуляция не меняются.
3. Portrait dock использует предел296px/60%, на коротком экране62%, вместо
   прежнего350pxминимума. Кнопка удержания курса занимает пятое действие
   рядом с вкладками вместо лишней44pxстроки. Все основные wheels/подписи
   должны одновременно оставаться видимыми; второстепенные панели
   прокручиваются. Полный текст advice доступен в64pxscrollable notice
   с клавиатурным фокусом. Та же доступность notice/Map сохранена для MP.
4. Ключ панели меняется только при смене вкладки. Новая Map начинает с начала;
   повторный тап постоянной мини-карты также возвращает к полному overview.
   Повторное нажатие не изображает новый accepted map-open в журнале.
5. Узкие синхронные подписи practice/assessment отделены от полных учебных
   данных. Все54объекта/378значений на7языках и порядок ключей совпали:
   SHA256373ac2b4d74288bc99a43fad83a91337d254d1324ed8a7710e6b34a8eacccb1f.
   Экспорт прежних полных словарей совместим, новые состояния загрузки не добавлены.
6. В app.json подготовлены iOS buildNumber70/android versionCode70.
   Версия1.7.0 сохранена. Старые69архивы, теги и QA containers не заменяются.
7. Release checklist согласован с текущим дневным контрактом. G2 сохраняет
   exact installed Release, cold/first-frame/clock/Back, short/landscape/large
   text и upgrade-preservation. Erase разрешен только для отдельного нового
   disposable clean QA; retained/frozen/upgrade и пользовательский progress
   не стираются. Исключение ручного радио69 не превращается в общий waiver.
8. Полный отчет повторно сверен независимыми readers по native/release,
   движкам/стратегии и65-ID/дизайну. Все65IDs/F01-F15 сохранены. Не закрываем
   исходный F06 одним исправлением Back: повторная настройка режима остается.
   Не приравниваем общий VPP/мир к одинаковым motion/rig. На первом срезе
   splash оставался темным; его последующая правка описана ниже. Full native
   modes и installed day-theme не объявляются принятыми этим source checkpoint.

## Продолжение после первого94gate

Первый94gate ниже сохранен как красное доказательство. Последующая работа
не повышает его статус задним числом.

- Общий WheelDeck резервирует50pxдля трех строк подписи вместо40px. При
  короткой нижней панели центральное колесо может занимать96px, боковые64px,
  все по-прежнему больше44px. Dock гонки учитывает реальную высоту переводных
  вкладок через min-content, сохраняя минимум172pxдля панели во всех вкладках.
- Первый повтор дал9/10: все6языков короткого Pro, Simple/Pro и короткий Trainer
  прошли. Усиленный compact Trainer еще показывал3.4pxобрезания: фиксированные
 187.5pxколес плюс18pxподсказки превышали реальную панель201.6px.
- В нижнем Trainer доке основные колеса теперь подстраиваются под панель,
  помощь и Diagnostics прокручиваются после них. Desktop column сохраняет
  подсказку внутри прежней области. В844x390 был отдельно воспроизведен
  выход подписей за экран: показания получили76pxсобственную прокручиваемую
  область с клавиатурным фокусом; все метрики видны до прокрутки. Сцена остается
  закрепленной, надписей и альтернативных controls не удаляли.
- Splash source теперь#f7f5f0, как дневная оболочка. Фирменная непрозрачная
  иллюстрация сохраняется. Native prebuild и настоящий compiled named color
  будут проверены отдельно: private verifier сохраняет38прежних package checks,
  добавляет5source/generated/compiled splash checks;27unit cases проходят,
  ни один из ожидаемых43package checks еще не объявлен пройденным.
- Реальная [сверка TestFlight](testflight-feedback-review.md) уточнилаTF01:
  прибор должен показывать ветер относительно носа. Теперь главный показатель
  true TWA с бортом, лодка на шкале носом вверх, абсолютный TWD/TWS остаются
  отдельно.3Dстрелки продолжают показывать вымпельный поток. Четыре persisted
  значения не меняются; видимое имя compass стало «Прибор ветра». Семь локалей
  прошли независимую адаптацию, glossary обновлен. Физика не менялась.
- Последующие5targeted cases проходят с первой попытки: wind/actual helm,
  IT/DEshortPro, compact/landscape Trainer и short Trainer. Все старые assertions
  и deadlines сохранены. Последующий полный94gate запускается отдельно.
- До обновления через настоящий UI создан прогресс в двух отдельных public48
  клонах: PL/iOS27 иRU/iOS26.5, quiz3/3, явное завершение и cold Home1/8.
  Все106файлов каждого старого пакета совпали с frozen48. После урока и cold
  launch сохраняются все5/6ключей byte-for-byte. Это готовая база upgrade,
  а не установленная приемка70; оригинальные QA и другой активный device не трогали.

## Сохраненные красные проверки

Первый production regression T04 на29aa отклонен геометрией. После первой
доработки targeted4case дали1pass/3fail: webT04прошел, Simple/Pro выявили
реальную сохраненную прокрутку Map, а embedded helper ошибочно ожидал
несуществующую global nav. Исправлены продуктовая граница панели и helper,
сохранив SVG/caption containment, реальные inputs, deadlines и44pxцели.
Оригинальные JSON/снимки сохранены приватно, их hashes входят в proof.
Следующие4targetedпрошли, но ручной кадр все еще показал подписи шкотов ниже
края. Поэтому проверки усилены: все три колеса и подписи одновременно видны
до фокуса и без индивидуального scroll. Дополнительно исправлены бледный
ярлык сложности и темный ink главной CTA на светлой поверхности.

## Проверки текущего checkpoint

Результаты и точная граница находятся в [proof](checks/cockpit-navigation.json).
Текущий build с caption/wind follow-up:6790155bytes/111files,
запас25589bytes при прежнем cap6815744. Recursive inventory
включает все JS иCSS; это не измерение first-load/FPS. Все54copy objects/
378locale values сохранены точно. Новых переводимых UI строк этот split не создает.

- [x]1827web unit/175files после последнего caption/wind кода проходят.
- [x]10navigation/command и22course/assessment/checkpoint checks проходят.
- [x] Scoped lint/types и точное сравнение7locale copy проходят.
- [x] Усиленные4Start/Resume/Simple/Pro journeys, отдельно2preview/briefing
  и1контраст check; all-primary captions проверяются одновременно.
- [x] Сохранен первый94case production browser по тем же8файлам:91pass/3fail,
  0skips/flaky,721.45s. IT320x568обрезает третью подпись руля при трехстрочной
  вкладке карты. DE preset-selector неоднозначен до старта Pro. Simple844x390
  достиг120sпри Settings -> Helm после Diagnostics, причина не установлена.
  Отчет и3неизмененных failure screens сохранены. Все три исхода остаются
  красными в исходном отчете; никакого автоматического повышения deadline или снятия assertion.
- [x] Полный повтор94case на caption/wind follow-up:94/94с первой попытки,
  0skips/flaky/unexpected,638.47s. Simple75.93s/Pro93.60s; landscape возврат
  Helm700ms/691ms. Причина прежнего timeout не доказана; новый проход и
  timings не переписывают старое свидетельство. Все8файлов/assertions/deadlines сохранены.
- [x]608native/82suites, обе types, native lint и web lint0errors/15baseline
  warnings, socket lifecycle и content sync проходят. Триoffline пакета
  пересобраны: radio636b981087ba/sailing32ee4c0fea92/sternikcdef6534874d.
- [x] Exact source25baff1 freeze, Release Simulator compile,43/43package и121frozen files. Это не полныйG2.
- [ ] Новый clean27, public48->candidate clone и short/landscape/large text.
- [ ] Отдельные metadata/archive/Apple/Self gates до доставки70.

Снимки/измерения относятся только к названной среде. Browser evidence не
сертифицирует UIKit/WKWebView или физический телефон. PTT/Reset/микрофон по
решению владельца остаются его TestFlight проверкой, а не новым требованием
нажать Simulator. Никакой новый upload этим документом не утверждается.

## Что остается после этого шага

P04: единицы движения, одинаковая семантика руля, human Simple/Pro, actual
travel/guidance/recorder/result/server/native gates. Metric fleet по-прежнему
не подключен, emission OFF. Затем P05/P06 трассы/режимы/честный judge,
P02/P07полный учебный цикл, P08outcomes, P09ghost, P11SITE и P12phone/public.
Графика не объявляется достигшей concept. Общее завершение65требований не заявлено.

## Native70: первый установленный проход, первоначальная оценка

28октября, exact25baff1. Source-only generated22 и compiled Simulator43 проходят,
в том числе настоящий named color launch asset. Все121файлов замороженной
копии совпадают в установленном PL27 иRU26 пакетах.

PL27: все5старых ключей сохранены до запуска и после первогоHome. Root
наблюдал1/8, продолжение урока2, сохраненные3/3первого урока, настоящий3Dкадр
с дневными панелями, рабочийMore и nativeBack в тот же3шаг урока. Sternik
открылся локально с дневной оболочкой, Back вернулMenu. ColdHome сохраняет1/8;
последним курсом стал Sternik после намеренного посещения. После маршрутов
9ключей: ничего не пропало,4из5старых побайтно прежние; viewed-key изменился.
Не заявляем неизменность всех старых значений после пользовательских действий.

RU26: перед install6ключей точно совпали с созданным UI48baseline, сразу после
install до явного launch остался только прежнийfirstLaunch. Потеряны5ключей,
включая язык иquiz/progress. Поздний Home показываетPLиStart first lesson.
Root ошибочно выполнил launch после неуспешного comparison из-за shell newline;
снимок отказа до этого launch сохранен отдельно. Системный журнал относит
потерю к installation window до первого наблюдаемого app process, но причина
пока не доказана. Полные rawлоги, data snapshot и изображения приватны.

**G2 RED,70не отправлен.** Успешный27не заменяет отказ26. Создан отдельный
чистыйSE3/iOS26.5 для прямого48->70 без clone; пока установлен и сверены106
файлов48, progress/reproduction еще не выполнены. Исходники runtime не меняем
до доказанной причины. Clean27, short/landscape/large text, Radio entry/Back
и остальные delivery gates остаются следующими. РучнойPTT/Reset/mic по-прежнему
проверяет владелец вTestFlight, это не причина текущего удержания.

## Уточнение принадлежности контейнеров и следующий gate

Первоначальное сравнение RU26 выше оказалось недействительным. Живой
`get_app_container` для нового контрольного клона вернул путь source-original,
а его FrontBoard cache содержит исходные абсолютные App/Bundle/Data URLs.
До установки читались шесть ключей оригинала, после установки один ключ
собственного seed-контейнера клона. Все шесть прежних значений остаются
в оригинале с теми же bytes/SHA. Это не доказанная потеря данных приложением.
Первичные raw-отчеты сохраняются вместе с этой квалификацией.

Root не проверил владельца пути перед UI. Через alias исходный QA получил
тестовый прогресс; прежнее утверждение о неизменных данных оригиналов
нельзя сохранять. Замороженные пакеты и ветки не изменены. Состояние
original26 сохранено отдельно приватно, автоматического восстановления
или удаления не выполняли. Для preinstall PL27 ownership также не записан,
поэтому его installed UI остается наблюдением, а upgrade требует прямого
нового устройства. Старые независимые source/Apple доказательства этим
не переопределяются.

Private guard до чтения проверяет App+Data UUID и исходный/resolved путь,
отвергает чужое устройство, traversal и symlink; 19 fixture cases проходят.
Старые снимки задним числом не подтверждаются. Дальше используем прямые
новые устройства и проверяем ownership перед любым launch/UI и после install.

Прямое новое SE3/iOS26.5:106 файлов48, настоящий RU quiz3/3 и cold Home1/8,
шесть ключей неизменны после cold48 и после install70; все121файл70совпали.
Оба recorded data paths принадлежат этому устройству. Первый Home70 сохраняет
RU/1из8/урок2; все шесть старых ключей прежние, добавлен diagnostics. Это
положительная отдельная проверка, не исправление старого clone-отчета.

Облачный exact25baff1 predeploy40715540679 завершился failure; отдельный
reader разбирает actual report. Локальный94/94 не заменяет этот отказ.
**ПолныйG2 и выпуск70 остаются открытыми**: direct27, clean27, short/landscape/
large text, radio entry/Back, cloud source и Apple gates еще требуются.

## Follow-up после облачного25baff1 отказа

Длинный SVG label переносится по целым словам, использует локальный Source
Sans3 и сохраняет все35locale values/5text nodes/размеры шрифта. Независимые
DOM reads объединены без сокращения assertions, inputs, viewports и deadlines;
новые snapshots отвергают missing/zero-size. Перед каждым wheel input baseline
свежий.500ms observational probes теперь single-flight: skipped-inflight
не выдается за новый captured frame. Два лишних focus перед locator.press
удалены, explicit keyboard notice/readouts проверки сохранены.

Production8NseqWISCbLglpTGyjrZw проходит:111chunks,6790321bytes, прежний
cap6815744, запас25423. Media/fonts вне этого chunks-бюджета считаются отдельно.
1827web/608native/82suites, обеtypes, lint0errors/15webbaseline warnings, sockets,
content sync и generation checks проходят. Sailing HTML662cb2493d8d.
Четыре прежних проблемных cases проходят локально4/4, затем новый полный
94/94с первой попытки, без skipped/flaky/unexpected. Все8файлов и deadlines
сохранены. Это не успешный новый cloud или installed package.

Новый private native-release70-day-followup сохраняет43/22/44/46контракты
и94fixture cases инструментов, отдельно от94реальных browser cases. Старые
25baff1пакет/логи/source-record неизменны. Следующие source-record/G2/build
создаются только для нового фактического commit. В новом прямом27QA через UI
подготовлены EN/quiz3of3/cold Home1of8 и6ключей с проверенным владельцем обоих
контейнеров; candidate там еще не установлен.

## Exact d8: установленная часть повторного аудита

Новыйd8dbca3, не прежний25baff1: Release завершился успешно; generated22 и
Simulator43 проходят. Замороженная копия и все121установленный файл совпадают.
Новый прямой iPhone18Pro/iOS27 QA, не clone: оба App+Data ownership guards
проходят до чтения/UI, после install и перед cold relaunch. Все6старых значений
публичной48сохранились bytes/SHA до первого запуска70. EN/1из8видны сразу и
после cold launch. После Radio главный Continue относится к SRC, а Foundation
1/8остается доступен; не объявляем все значения неизменными после намеренных
переходов и выбора настроек.

Свежие наблюдения: day Home/Trainer/More/Back, Radio entry/Exit, видимые
briefing Back/CTA, настоящие3D Pro кадры/clock/orbit, ручной jib53%->45%,
mini-map->Course map, Settings->Helm, Menu->Back to races->Home. Три повторные
подготовительные поверхности остаются F06. Одна немедленная native AX-выборка
показала старый Simple после Pro; cold restore показал Pro, обратный контроль
Simple->Back совпал. Это не доказывает устойчивую рассинхронизацию или потерю
настройки. Имена сырых файлов не заменяют фактическое содержимое кадров.

Все21сырых JPEG/AX этого ограниченного прохода приватны; семь проверенных
byte-identical копий18-24 показаны в текущем owner report. Новый source package
proof и installed-upgrade-beforelaunch report относятся только кd8. ПолныйG2,
clean70/short/landscape/large-text/physicaloffline и выпуск70не закрыты.
Owner radio/PTT/Reset/mic по-прежнему pending в живомTestFlight. Новых archive,
export/upload/Apple writes и website/public submission нет.

## Exact d8: clean27 и конечный cloud

Следующий новый прямой iPhone18Pro/iOS27 QA впервые запустилD8 после App+Data
ownership и121matching installed files. PL Home0/8 -> урок1/практика -> реальный
3D -> курс90->70 -> возврат к практике. После cold launch восстановился шаг3.
Открытие практики не засчитано навыком. Simple: настоящий первый кадр,
часы0:08.8->0:25.4, руль0->8°, курс45->50°,TWA40->46°, Menu вернул выбор.
Три byte-identical принятых кадра25-27добавлены в owner report; остальные
private JPEG/AX сохранены отдельно. Это ограниченная clean-приемка, не fullG2.

Exact non-main40728700280 завершился FAILURE92/94. Все94case IDs совпали с
локальнымD8.92passed first attempt; Simple/Pro исчерпали120sна retry0/1/2:
98attempts=92passed+6timedOut,0skipped/flaky/top-level errors. Artifact12836202433,
22489004bytes, API/download SHA256совпадает:
`83f0111ab07f4b324587653f15176609f6e691dbd622a431a93dbefe8f0b8fba`.
Run/artifact/embedded Git/CI всеD8. Main-only publication/deploy/prod skipped.
Разбор GET-only, remote writes0; источник/настройки/действия/deadlines не менялись.

Все6timing attachments сохранены в новой приватной папке. Два Simple прошли
первый web journey за91.8/92.8sпосле19-20sstartup и начали embedded около112s.
Остальные попытки остановились в разных поздних точках; успешные clicks4-6s,
DOM reads1-3s. Это подтверждает накопление времени, но не единственный overlay,
сломанныйTWD или известную долю renderer/product/test-protocol задержки.
Следующий ограниченный test-side event/commit/RAF/longtask ring предложен,
еще не реализован; качество/inputs/assertions/viewports/deadlines сохраняются.

FullG2, previous-major/short/landscape/large-text и splash transition остаются
открытыми. Clean27не доказывает physical-phone offline/ASR/performance.70не
архивирован/не загружен; поставленный69не изменен. Текущий owner-report hash
и конечная cloud сводка находятся в `checks/cockpit-navigation.json`;
`checks/completion-status.json` остается неизменной исторической12:19сверкой.

## T05: следующий Back после учебной практики

Продолженный D8 clean27 walkthrough нашел реальный отказ: после sail lesson3
->practice->Return to lesson следующий native Back снова открывает Trainer.
Повторен через AX и координату видимого header. Первый Foundation дает тот же
исход. Кадры29/30/32в private clean27 сохраняют отрицательную проверку; копии
28-30в repository cockpit-screens показаны в owner report. Это не ошибка
ownership и не доказательство потери позиции: шаг3сохраняется, нарушен стек.

Установленный Expo navigate отправляет NAVIGATE, сохраняя практику под новым
уроком. Новый узкий source followup использует dismissTo для известных sail
и Foundation return, выхода к sail outline и validated Foundation race exit.
Global ActivityBack, ordinary exits, replay-history и запуск practice push
не меняются. Настоящий StackRouter regression проверяет удаление practice,
исходные lesson key/params, следующий Back и непустые сохраненные данные.
41targeted/3suites и613full-native/82suites проходят, types/lints чистые.
Новый binary/G2 еще не выполнены; прежний D8 этим source-fix не становится PASS.

Диагностические per-stage layout probes в race browser journeys заменены
Node markers и одним passive ring на документ: classified captures/EventTiming,
semantic commits, RAF gaps/longtasks/lifecycle. Максимум2документа/64KiB в
test-only sessionStorage handoff, один финальный read с прежним500msbudget.
Все173assertions/53actual actions/7test bodies/6deadlines120sи viewports
сверены независимым AST reader. Нет изменения качества, workflow или physics.
Ring не читает layout/content/product storage, не доказывает React handler,
отсутствие overlay, presented FPS или причину задержек.

Узкий новый local2/2 first-attempt проходит за169.111151s: Simple76.795s,
Pro91.382s, оба final observations captured с2documents. Новый production
buildnxugNMA4jmTyt34ewz_yq:111chunks/6790321bytes, прежнийcap6815744,
запас25423. Web1827/175проходит. Новый полныйlocal94/94 first-attempt проходит
за620.658683s,0skipped/flaky/unexpected/errors;8файлов прежние. SHAотчета:
`8c9697a0cb35fff41b024ccad730a1b9c67f8d4c4b1ec267396f4293f26961d6`.
Это не новый успешныйcloud/native. Новый private native-release70-back-followup
содержит только подготовленные helper/fixtures, не выбранный source/G2.

Следующий точный source зафиксирован и pushed:
`acf0415d3687a4d50b5b14bdc4c9dc654970d820`. Новый private source record и
source-freeze созданы отдельно; prebuild и generated22 проходят. Release
Simulator и exact non-main40741168924 еще выполняются. Push/PR CI также
проверяют этотSHA.99private fixtures сохраняют прежние94и усиливают полный
source freeze guard для archive/Apple: e2e/DESIGN/новые исходники не могут
остаться dirty. Ни одного старого D8package/G2proof новый pipeline не принимает.
Новый archive/export/upload/Apple writes отсутствуют.

Последующее состояние18:08UTC: root намеренно остановил native compileacf
черезSIGINT до изменения исходника; terminal75. Это controlled stop ради
пятой известной Foundation footer-правки, не timeout и не ошибка компилятора.
Пятой правке нужен новый source checkpoint; старыйacf не имеет compiled package.
`compile-controlled-stop.json` сохраняет точный источник, причину и отсутствие
source mutations до остановки. Пятая правка/StackRouter targeted10/10 сохранены
в рабочем дереве. Новый private native-release70-outline-followup подготовлен
с99fixtures, без выбранного source, package илиG2proof.

Следующая проверка18:21:09-18:21:35UTC: полный native-набор с пятой правкой
проходит614/614,82/82suites,25.749s; types и штатный lint exit0. SHAобоих
footer-файлов до/после совпадают. Приватные логи/сводный
`native-source-checks-20261028T182108Z.json` находятся в outline-followup.
Это проверка working-tree source, не новый frozen или установленный пакет.

Read-only GET18:17:50UTC все еще показываетacf40741168924 IN_PROGRESS;
push40741090514/PR40741103322 завершилисьSUCCESS. Любой последующийacf
cloud-результат относится только кacf и не принимает новую пятую правку.
Заключительный owner-report добавляет пять fresh production-web кадров изacf,
не новую installed приемку. Полный общий аудит и поставка70 остаются открытыми.

Финальный GET этой сверки18:23:08UTC по-прежнемуIN_PROGRESS, conclusionnull.
Остановлен только локальный watcher18:23:13UTC; удаленный run не отменен,
writes0. Ни артефакт, ни новыйcloudPASS не приняты.
