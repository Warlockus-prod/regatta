# Regatta: повторная сверка утвержденного плана с реализацией

Дата: 2026-10-25, Europe/Warsaw. Проверяемый снимок: `cfc8a54fc273161dc828b4f4ee4baab3d6537378`, ветка `codex/app-1.7.0-completion`.
Это аудит исходников и матрица приемки. Новых проверок UI, физического телефона, серверного runtime или ASC здесь нет. Проверенные ранее публикации обозначены датой и отдельным доказательством.
Реализация исправлений после этого снимка в документе не подразумевается. Для чтения использовалась неизменяемая копия исходников из Git, чтобы параллельные правки камеры, радио и навигации не смешивались с базовым снимком.

## Вывод

Полный утвержденный объем пока не выполнен. Build 60 действительно доставлен в TestFlight, но успешная доставка и большое число модульных тестов не закрывают продуктовую приемку.
Общие physics/3D/offline/persistence и значительная часть адаптации SRC реализованы. Основные оставшиеся разрывы находятся в реальном входе в инструмент, управлении камерой, единообразии управления и навигации, доступности и завершении пользовательского маршрута.

Обратная связь владельца 25 октября согласуется с исходниками:

- SRC существует в каталоге и пакете, однако первый вход открывает текстовый home курса, а не рацию. Наличие маршрута не доказывает, что пользователь нашел и запустил нужную практику.
- Гонка использует настоящие трехмерные модели, но дает только `high`/`stern`. Свободного orbit/zoom, как у Лодки 3D, в этом снимке нет. Техническое слово 3D не закрывает требуемое ощущение управления трехмерным миром.
- Общие компоненты появились, но часть режимов сохраняет исключения: скрытые штурвалы в учебном задании, старые native overlays, разные Back и источники настройки звука, разный размер кнопок.
- Web foundation parity, общий визуальный проход, полная матрица устройств/языков, сайт и публичный выпуск остались открытыми. Их нельзя вывести из завершенного этапа TestFlight.

## Основания и значения статуса

Требования собраны из утвержденного [аудита 24 октября](../2026-10-24/audit.md), [implementation harness](../2026-10-24/implementation-harness.md), [выбранного направления](../2026-10-24/design-proposal.md), [концепции управления](../../design/trainer-controls-concept.md), `DESIGN.md`, `SIMULATORS.md`, учебного roadmap и актуальной обратной связи 25 октября.
Исторический `docs/audits/2026-10-13/visual-plan.md` прочитан из сохраненного root checkout: в tracked-дереве `cfc8a54` этого файла нет. `docs/design/claude-ui-implementation-handoff.md` присутствует в tracked-дереве и также прочитан. Их старый порядок работ не заменяет актуальный backlog, но ограничения честного прогресса, возврата и приемки сохраняются.

В таблицах:

- **Код**: поведение реализовано, найдены исходники и подходящие проверки. Это не утверждение полного touch/UI прохождения.
- **Частично**: есть работающая часть и конкретный оставшийся разрыв.
- **Открыто**: требуемого поведения нет либо нет достаточного доказательства приемки.
- **Доставка**: конкретный канал подтвержден отдельным release evidence; не означает приемку всего плана.

Приоритет P0 здесь блокирует обещание законченного основного сценария или следующий выпуск с таким обещанием. P1 закрывает согласованный пользовательский разрыв. P2 обозначает следующий согласованный backlog. Это не объявляет уже доступный TestFlight недоставленным.
Все ссылки `path:line` ниже относятся к `cfc8a54`, если явно не указана историческая дата.

## 1. Входы, навигация и обнаружимость

| ID | Требование и источник | Состояние и точные точки кода | Что еще должно быть проверено |
| --- | --- | --- | --- |
| N01 | Пять основных разделов, последний Меню; A1/visual-plan | Код: `mobile/src/navigation/tabs.ts:24`, `mobile/src/navigation/AppNavigation.tsx:33`, общий `src/lib/product/catalog.ts:6`. Меню содержит поиск и группы. | Полный touch-путь на коротком экране и с крупным текстом, без обрезания названий. |
| N02 | SRC реально находится и запускается из приложения; A2/A5, замечание 25.10 | Частично, P0: каталог содержит `/kursy/radio` (`src/lib/product/catalog.ts:21`), Learn/Menu выводят его как экзаменационный курс (`mobile/src/navigation/ProductHub.tsx:46-54`). Home ведет общую карточку экзаменов в `/learn` (`mobile/app/index.tsx:106`). В основном Practice отдельного SRC нет. | От чистого Home без поиска и знания URL пользователь доходит до работающей рации; видны выбранный язык, цель и действие старта. |
| N03 | Вход в курс не превращает инструмент в скрытую вложенную функцию | Частично, P0: `mobile/app/kursy/radio.tsx:8` монтирует OfflineRadioCourse; `mobile/scripts/offline-radio/router.tsx` выбирает `/radio`; прибор появляется после сценария либо открытия InteractiveRadioCourse. | Согласовать явный основной вход в инструмент и вторичный вход в учебный курс. Сам deep link не заменяет видимый CTA. |
| N04 | Последний курс продолжается честно, без выдуманного процента; A2 | Код: `mobile/src/home/continue.ts:35`, `src/lib/product/learning.ts`; radio/motor возвращаются в home курса. Тесты `mobile/__tests__/screens/home.test.tsx`, `src/lib/product/learning.test.ts`. | Перезапуск, ошибки чтения и фактическая найденность продолжения во всех семи языках. Не обещать восстановление несохраненного диалога. |
| N05 | Из каждой активности есть предсказуемый выход и единый Back; A1/A4, 25.10 | Частично, P0: native stack header в `mobile/app/_layout.tsx`, `mobile/src/simulator/SimWebView.tsx`, `mobile/src/course/LocalCourseWebView.tsx`; отдельные кнопки в RaceCockpit, GameMenu/finish/replay и RadioWorkspace. `/` из локальной гонки переводится в `/race` (`mobile/src/navigation/race-entry.ts:28`). | Единый визуальный и поведенческий контракт: куда возвращает Back, закрывает ли панель, покидает ли курс, сохраняет ли шаг. Пройти каждую ветвь, а не только menu-return. |
| N06 | Back внутри SRC возвращает по внутреннему маршруту, не теряет контекст | Частично, P1: offline router хранит маршрут в памяти; native header не является его полноценным history stack. `mobile/src/course/OfflineRadioCourse.tsx`, `mobile/scripts/offline-radio/router.tsx:45`. | Theory -> question -> practice -> Back, переходы между внутренними страницами и выход в app. Нужна согласованная модель вложенного Back. |
| N07 | Выход из незавершенного экзамена защищен, повторная попытка выхода работает | Код плюс ограниченное проверки установленного приложения: `mobile/src/course/LocalCourseWebView.tsx`, `mobile/__tests__/local-course-host.test.tsx:109,149`; применяется usePreventRemove и явный выход. В release report зафиксирован реальный Stay/repeated-exit/Exit. | Та же приемка SRC-exam и всех вариантов выхода, iPhone/iPad, аппаратный/системный Back где поддерживается. Это не доказательство всех прочих маршрутов. |
| N08 | Нет тупиков и потерянных публичных функций; A5 | Частично: общий каталог есть; `mobile/__tests__/screens/menu.test.tsx:19` проверяет mock `router.push('/kursy/radio')`, не запуск WebView. | Сквозной проход всех назначений из раздела 8. Отдельно error/retry, новые/старые сохранения, основной и запасной вход. |

## 2. Гонка, мир, Pro и результат

| ID | Требование и источник | Состояние и точные точки кода | Остаток и критерий приемки |
| --- | --- | --- | --- |
| G01 | Один основной Solo/Daily/mission в 3D; audit G1 | Код: `mobile/app/game/index.tsx`, `mobile/app/race-3d/index.tsx` redirect, `mobile/src/navigation/race-entry.ts:5`; GameClient монтирует RaceScene. Старый Skia не является основным solo entry. | Пройти все три видимых входа на установленной сборке и проверить фактические mission/daily условия. |
| G02 | Настоящий трехмерный мир с понятным осмотром, как у понравившегося trainer; 25.10 | Открыто, P0: `src/app/game/RaceCockpit.tsx:35,99` разрешает только high/stern; `src/features/race-scene/RaceScene.tsx:173-193` перезаписывает pose каждый frame. `src/features/simulator-3d/RegattaScene.tsx:150` имеет OrbitControls, RaceScene их не использует. | Жестом осмотреть яхту и окружающий мир, менять масштаб/ракурс и вернуться к игровому виду без сброса гонки и конфликта с рулем. Утверждение «renderer 3D» недостаточно. |
| G03 | Общая лодка, свет/вода/art direction с trainer без потери учебных камер | Код/частично: общие `src/features/race-scene/SailingEnvironment.tsx`, renderer, Yacht; Trainer сохраняет orbit и учебные камеры. Исправлен gelcoat prefix (`src/features/simulator-3d/Yacht.tsx:147`). | Два реальных экрана рядом на устройстве: свет, форма парусов, масштаб, горизонт, читаемость. Общий environment import не доказывает одинаковое впечатление. |
| G04 | Simple автотрим, Pro ручные два шкота, независимо от способа ввода; audit G2 | Код: `src/app/game/RaceCockpit.tsx:73-82`, `src/lib/race-physics.ts`, `src/lib/race-guidance.test.ts:13`. Неверные ручные шкоты влияют на скорость; live recategorization режима исключена. | В установленной сборке выполнить один и тот же участок в Simple и Pro, увидеть зависимость хода от каждого шкота, сохранить mode в результате. |
| G05 | Постановка/уборка грота, стакселя и рифы реально влияют на модель/изображение | Код: `src/app/game/RaceCockpit.tsx:84-88`, общий Controls, pose/replay validators. | Touch-сценарий: оба паруса убрать/вернуть, неверный трим/правильный трим, reef, сохранение и показ этих же состояний в replay. Не называть boolean hoist полноценной процедурой подъема. |
| G06 | Управление отзывчиво и на малой скорости; исходная physics не форкается | Код: race player assistance, общий `sailing-physics`, серверный generated adapter; drift/guidance tests. | От покоя и после разворота реально восстановить ход на устройстве. Unit inputs не измеряют задержку touch/frame. |
| G07 | Маршрутная помощь и подсказки трима независимы, могут выключаться | Код: `src/app/game/race-prefs.ts`, RaceCockpit guidance/trimHints, `src/lib/race-guidance.ts`, `src/lib/race-trim-coach.ts`. | Оба переключателя сохраняются, не меняют ход сами; понятны без подсказки разработчика на семи языках. |
| G08 | Учебные правила и прозрачные тренировочные штрафы | Код: `src/lib/race-rules.ts`, `src/lib/race-rules.test.ts`, mission/best-time учитывают penalty; текст отделяет subset и game substitution от полных RRS. | Реальная встреча/старт/касание знака: одно событие, объяснение, единый итог времени, отсутствие ложного «официального штрафа». |
| G09 | Часы, pause/background/resume не ускоряют и не теряют гонку | Код: fixed clock, `src/app/game/GameClient.tsx:663,970`, тесты clock/completion. | Свернуть установленное приложение во время countdown/race, вернуть, проверить время/позиции/ввод. Низкий sustained FPS отдельно измеряется, не исправляется скрытым множителем физики. |
| G10 | Offline с чистой установки, все ресурсы локальны; audit G3 | Код плюс ограниченное проверки установленного приложения: bundle-first SimWebView, `mobile/scripts/build-sailing-offline.mjs`, пять маршрутов; local GLB/fonts/posters. Remote API в native race пропускаются. | Новый чистый запуск при реально запрещенной сети, включая вход из hub, render error/retry и сохранение результата. Факт наличия HTML не доказывает всю цепочку. |
| G11 | WebGPU и WebGL2 fallback, отсутствие forced FPS/debug flags | Код: `src/features/race-scene/renderer.ts`, query fps только opt-in; native race-entry не добавляет fps. | Проверить оба backend на минимальном устройстве; допустимые FPS/frame time/нагрев/память пока не измерены на физическом iPhone. |
| G12 | Finish не теряется, history durable, старые записи читаются | Код: `src/lib/race-completion.ts`, `src/lib/race-native.ts`, `mobile/src/persistence/race-history.ts:93`; serial/idempotent write, ack после диска, correlated failure/retry, 20 последних записей. | P0 для заявления законченного native flow: вручную доехать от старта до finish, открыть history, перезапустить app и снова найти эту гонку. В release report это прямо остается unproven. |
| G13 | Replay показывает реальные course/rig/time, coach доступен локально | Код и browser evidence: `src/app/game/RaceReplay.tsx`, `src/lib/race-replay.ts`, новый native webRace и локальный coach; старый pixel replay сохранен. | После настоящего native finish открыть replay/coach, менять скорость и вид, вернуться без лишней записи/потери истории; не подменять это синтетическим сообщением race-finished. |
| G14 | Результаты и обещание global leaderboard честны | Частично, P1: leaderboard по умолчанию local; remote запрос только global (`mobile/app/leaderboard/index.tsx:79-99`). Native race не делает `/api/race-result`, но global empty text: «Сыграй гонку - и попадешь сюда» (`:286`). | Объяснить local/global и сетевую публикацию; не обещать автоматическое попадание offline solo в global. |
| G15 | Multiplayer сохраняет общий cockpit/world и корректный socket lifecycle | Код/интеграционные проверки: `src/app/multiplayer/MultiplayerCockpit.tsx`, `src/app/multiplayer/MultiplayerClient.tsx:663`, real WS tests. | Два реальных игровых клиента до finish, reconnect/background/replay и Back; server lifecycle probe не заменяет такой UI-сценарий. Полный manual Pro для multiplayer отдельно не обещан. |

## 3. Штурвалы, панели, фокус и доступность предмета

| ID | Требование и источник | Состояние и точные точки кода | Остаток и критерий приемки |
| --- | --- | --- | --- |
| U01 | Штурвалы по умолчанию, сохраненный slider выбор остается | Код: web `src/features/trainer-controls/prefs.ts:38`, native `mobile/src/persistence/controls.ts:31`, тесты prefs/race-entry. Последнее решение 24.10 заменяет старый default sliders. | Чистая установка и upgrade с sliders, переход между всеми поверхностями без тихой смены выбора. |
| U02 | Одна настройка mapping/sensitivity/jib side/favorites, без вибрации и автоцентровки по умолчанию | Код: общий prefs/mapping/WheelDeck, native pass-through; 90 градусов курса/оборот и 25% шкота/оборот. | Три разных значения, клавиатура и VoiceOver increment; отсутствие скрытого второго руля; touch на реальном устройстве. |
| U03 | В rig-study/assessment штурвалы не исчезают молча; audit U6 | Открыто, P1: `src/features/trainer-controls/ControlDock.tsx:59` содержит `!leadTab`; `src/features/simulator-v3/SimulatorV3Page.tsx:910` передает leadTab. Поэтому даже выбранные wheels заменяются task/sliders. | Короткое задание и основные органы доступны вместе; выбранный способ управления сохраняется либо явно объяснено отдельное ограничение. |
| U04 | Основные шкоты не спрятаны под длинной инструкцией; audit U7 | Частично, P1: `src/features/simulator-v3/ui/pods/MainTrimPod.tsx:14` выводит `taskFirst && children` до controls; `src/features/simulator-v3/SimulatorV3Page.tsx:528` включает taskFirst для study/assessment. | 320/375/390: задача, оба шкота и видимый результат доступны без поиска ниже длинного объяснения. Повторить замер, старый overflow screenshot сам по себе не доказывает текущие координаты. |
| U05 | Native fallback Trainer соблюдает «ничего поверх лодки», нет второго руля; audit U5 | Открыто, P1: `mobile/app/simulator/index.tsx:1636-1674` оставляет SailBadge и безусловные steer Pressable внутри сцены; `:2993` position absolute. Wheels монтируются отдельно ниже. | Запасной путь тоже должен быть честно обозначен и проверен. Не исключать его из no-occlusion контракта только потому, что основной trainer теперь WebView. |
| U06 | Свободный pose/inspect режим 3D Boat не маскируется под общий controls contract; audit U8 | Частично, P1: `src/features/simulator-3d/Simulator3D.tsx:284` compact TrainerWorkspace применяется только к mode=sail. Free mode остается в отдельном layout с угловыми sliders (`:407-415`), без wheel/settings parity. | Явно отличить позирование от управления снастью, не выдавать угол за процент потравленного шкота; проверить phone/landscape и доступ ко всем controls. |
| U07 | Settings/Views занимают reserved bottom/side space, не яхту; audit U2/U3/U4 | Код: ReservedPanelContext, `useReservedPanel`, TrainerWorkspace, portal Settings/SceneDrawer; race grid разделяет scene/dock. | При открытых settings/help/views/fleet/messages измерить фактические bounds предмета и панели, включая длинный DE/RU текст и все камеры. |
| U08 | Фокус не прыгает на каждом physics tick; audit U1 | Код: `src/features/trainer-controls/ControlSettingsSheet.tsx:54-65`, `src/features/trainer-controls/SceneChrome.tsx:67-79` используют callback ref, focus-effect зависит от host/open. | Tab, Escape, возврат фокуса и VoiceOver на установленном WebView; непрерывная симуляция работает. Отдельный UI regression на удержание focus во время тиков нужен для приемки. |
| U09 | Все основные touch controls минимум 44 px; DESIGN | Нарушено в коде, P1: `src/app/game/RaceCockpit.module.css` portrait tabs 38 px, landscape 34 px, controlHeading button 28 px. Slider input 30 px и подписи 10-13 px требуют отдельной проверки hit area/читаемости. | Измерять computed rect каждого используемого control, а не только общей панели. Состояния wheel/slider/settings и все языки. |
| U10 | Лодка и показания приоритетны, controls не обрезаны в portrait/landscape | Частично: layout grid и reserved panels реализованы, сохранены screenshots ограниченных состояний. | Все размеры выбранного направления:320x568, 375x667, 390x844, 844x390, desktop; safe areas, island/home indicator, keyboard, крупный текст. Наличие canvas внутри viewport не доказывает видимость всей лодки. |
| U11 | Звук единообразен, clicks только при включенной общей настройке | Частично, P1: controls.sound=false по умолчанию; race использует другой `regatta.muted.v1`, где пустое значение означает muted=false (`src/lib/sounds.ts:34`). Race Settings меняет оба только при своем клике. | Определить единый contract/migration. Изменить Sound в app Settings, Trainer и Race, перейти между ними и перезапустить. Сейчас совпадение подписи Sound не означает один источник. |

## 4. Радио, язык, учебный сценарий и offline voice

| ID | Требование и источник | Состояние и точные точки кода | Остаток и критерий приемки |
| --- | --- | --- | --- |
| R01 | Прибор и текущая задача видны вместе на коротком экране; audit U3 | Код/ограниченная browser приемка: фиксированный LCD, RadioWorkspace grid, нижние/боковые tabs, `e2e/radio-workspace.spec.ts:119`. | Установленный native, 320x568/375x667/landscape: одновременно DIAL/PTT/DISTRESS и читаемый текущий шаг, в том числе MENU/keyboard/ошибка. |
| R02 | Guided learning и свободное изучение реально запускаются простым путем | Частично, P0: free practice существует, но исходный вход требует выбрать сценарий; `/radio/obsluga` не auto-open без `kurs=1`. `src/app/radio/page.tsx:79,130`, `src/app/radio/obsluga/InteractiveRadioCourse.tsx:102`. | Понятный режим, прибор после старта, короткая цель, завершение/повтор/выход. Нельзя принять только появление списка карточек. |
| R03 | Есть стабильный прямой маршрут к свободной практике | Открыто, P1: URL effect в `src/app/radio/symulator/page.tsx:492-504` ищет только SCENARIOS; FREE_PRACTICE в них не входит. | Обычная видимая ссылка/deep link открывает именно free mode и не засчитывает завершенный сценарий. |
| R04 | Task/Help/Situation/Listen/Log не вытесняют прибор, focus/keyboard работают | Код: `src/app/radio/symulator/RadioWorkspace.tsx:83-115`, один активный panel, Arrow/Home/End handlers. | Полный переход по tabs, длинный log/debrief, Inspect и прием станции в каждом состоянии, без закрытия controls. |
| R05 | Доступный Inspect и честная аппаратная семантика | Частично: Inspect/list/help реализованы, amber/green LCD и red DISTRESS сохранены. | Проверить мелкие INT/BUSY/GPS/WATCH/POWER/BATTERY и RX meter через безопасные hit areas/list; contrast и 44 px, управление без цвета/мыши. Старые 18-26 px находки не закрываются общим translation test. |
| R06 | Теория 18 глав, банк 324, 15 уроков, 26 заданий, шпаргалка, metadata на 7 языках; audit L1/L2 | Код: `RadioLocaleProvider`, explicit rt/radioText, public catalogs; в cfc у каждого языка 3727 keys, sources 3727, aliases 7345. | Это структурное покрытие, не доказательство смысловой и визуальной приемки каждого экрана. Нужен последовательный course flow выбранного языка и проверка ошибок/результатов. |
| R07 | Английские on-air фразы/варианты упражнений и PL UKE original не повреждены | Код: protected English exercises/terms, question IDs и correct остаются стабильными, отдельное раскрытие original. | Не считать English prowords утечкой языка. Проверить конкретные meaning-sensitive задания и неизменность правильного варианта после адаптации. |
| R08 | Предпочтения языка мигрируют, прогресс не теряется | Код: общий language/bootstrap, SRC authoritative native snapshot, stable IDs, `mobile/__tests__/radio-storage.test.ts:28`. | Upgrade со старыми PL/RU pref: выбранный app язык на первом экране и внутри урока, Clear all не воскрешает WebKit сохранения. |
| R09 | Native локальный TTS/strict on-device ASR, typed fallback без скрытого сервера | Код: `mobile/src/radio/local-speech.ts:121-138`, patched SDK54 modules, `localRecognitionSession.ts`, локальный grading/typed input. | Физический микрофон/установленная voice/model и deny/missing-model сценарии остаются не проверены. Моки подтверждают команды и lifecycle, не доступность распознавания на телефоне владельца. |
| R10 | VOL/SQL/channel/power/PTT правильно ограничивают речь станции | Код: RadioAudioEngine channel gate, localSpeech lifecycle/cancel, channel routing regression. | В реальном installed runtime открыть/закрыть SQL, VOL0, другой канал, power/PTT при активной реплике. Не воспроизводить станцию мимо аппаратной модели. |
| R11 | Offline intro/status/errors описывают именно installed режим | Частично, P1: `src/app/radio/obsluga/page.tsx:145-151` содержит browser/HTTPS mic intro, тогда как native OfflineMicCheck работает локально. Семь locale buttons и subnav в `offline-radio/entry.tsx:128-162` добавляют отдельную оболочку. | Исправить несовпадающую copy и убрать конкурирующую навигацию; язык приложения не должен неожиданно заменяться вторым выбором языка курса. |
| R12 | Весь заявленный радиокурс не выдается за полный набор аппаратных симуляций | Открытый P2 backlog: EPIRB/SART23-26 представлены инструкциями (`src/app/radio/zadania/tasks.ts:230-260`), три bank entries имеют confidence=unsure; delayed/random receiving и DSC distress-relay требуют отдельной предметной приемки. | Не записывать эти будущие механики в completed только из-за перевода текста. Спорные src-1-36/src-2-24/src-2-25 остаются предметной, не языковой задачей. |

## 5. Единый визуальный язык и учебная структура

| ID | Требование | Состояние и доказательство | Остаток |
| --- | --- | --- | --- |
| V01 | Ocean Cockpit: темные инструменты, крупные ясные приборы, предмет отдельно | Частично: race grid/environment/fonts реализованы; выбранный рендер не является pixel-perfect implementation. | Сравнить реальный screen с направлением, особенно размер яхты/мира, приоритет управления и отсутствие отдельных визуальных систем Back. |
| V02 | Paper learning + dark instruments с согласованными нейтралями | Частично: native paper `#f7f5f0`, web light `#f4f8fc`, dark tokens сохранены. | Явно принять/согласовать переходы и нейтральную палитру. Выбор dark cockpit не является решением затемнить все учебные страницы. |
| V03 | Один semantic accent для action/selected, не разные цвета категорий | Частично, P1: tokens есть, но `/start` сохраняет legacy категорийные CTA, race result/menu содержит отдельные HEX/RGBA; InspectToggle active amber. | Разделить action, selected, teaching highlight, success/warning/danger и tactical colors. Hardware LCD/DISTRESS сохранить по назначению. |
| V04 | Шрифт поддерживает все 7 языков и доступен offline | Код: local Source Sans3 в globals, native `mobile/src/design-system/fonts.tsx`, bundled400/600/700, OFL. | Довести native raw Text/TextInput и фактические размеры/крупный текст; `DESIGN.md:17` все еще говорит Geist/system и уже устарел. |
| V05 | Читаемые labels, контраст AA, не обрезать смысл | Открыта полная приемка, P1: race labels10-13 px, native tab labels11 px и minimumFontScale0.6 (`mobile/src/navigation/AppNavigation.tsx:39`), часть legacy labels8-10 px. | Семь языков, zoom200%, native Dynamic Type/VoiceOver, обе имеющиеся поверхности, контраст computed colors. Уменьшение текста ради fit не равно приемке. |
| E01 | Foundation web/native parity; audit E1 | Открыто, P1: web `/start` использует manual completed (`src/app/start/page.tsx:7,56`); native имеет understand/check/practice, сохранение позиции и evidence (`mobile/app/bootcamp/[id].tsx`, `mobile/src/bootcamp/status.ts`). | Все 8 уроков: goal/diagram/check/practice/return на обеих платформах. Не переносить manual visited в theory passed. |
| E02 | Эталонный sail lesson: объяснение/схема/check/practice/result/resume | Код и историческая ограниченная приемка: `src/data/sailing-lab`, web/native lessons, study/assessment, checkpoint, stable IDs. | Повторить после новых cockpit/offline изменений путь от урока до результата и того же шага, включая exit/restart/неверный ответ/disk error. |
| E03 | Все существующие sail lessons по честному модульному шаблону | Частично:13 уроков/общий контент, разные mechanisms/availability обозначены в `src/data/sailing-lab/course.ts:32`. | Не обещать симуляцию третьего модуля, которого нет в Trainer. Проверить цель и допустимую практику каждого урока, а не только заголовок списка. |
| E04 | Halyard/support/hoist/lower и реальная механика оборудования; audit C1 | Открытый P2: `src/features/sailing-lab/rig/passport.ts:20` fixed boom support, `mainHoisted?:boolean` в Controls. Winch/clutch bench есть, полного hoist/lower/boom-support loop нет. | Модель состояний и safety/source validation до учебных процедур. Boolean переключатель паруса в Pro не закрывает этот backlog. |
| E05 | Библиотека, Anatomy, Rules, Onboard, Checklist и прочие разделы доступны и согласованы | Код маршрутов есть; Anatomy теперь local shared package, fallback сохранен. | Последовательный QA всех назначений, captions/диаграмм, Back, крупного текста и языков. Полная A5 приемка не выполнялась в 24.10 release smoke. |

## 6. Offline, данные, доставка и ветки

| ID | Требование | Проверенное состояние | Остаток |
| --- | --- | --- | --- |
| D01 | Один источник физики/контента, без native fork | Код: alias/shared source, generated server drift gate, builders импортируют original pages. | Сохранять этот инвариант при новых camera/navigation fixes; наличие двух способов отображения не требует второго движка. |
| D02 | Курсы и инструменты работают локально с первой установки | Код: sailing: 5 маршрутов, SRC и Sternik installed packages; version/hash checks. | Полный blackhole-network пользовательский маршрут, не только fetch блокировка в asset test. Weather, assistant и global board имеют отдельные сетевые функции. Фразу «сеть только multiplayer» нельзя распространять на них без нового решения. |
| D03 | Native Sternik PL-only, локальные theory/test/exam/typed oral | Код плюс установленный screenshot: LocalCourseWebView, offline-sternik: 5 маршрутов, local rubric, no mic. | Пройти локальный экзамен до результата и повтор; typed rubric не называть AI/полноценной проверкой устного ответа. Сайт и старые версии могут иметь online voice. |
| D04 | Progress/clear/retry/upgrade сохраняют реальные данные | Код и реальный ограниченный G2: authoritative native snapshots/ack, first WK migration, serial storage; release report фиксирует 7 byte-identical значений. | Длительная работа, аварийное завершение и все новые ветви сохранения; не называть 7 fixtures доказательством любого пользовательского хранилища. |
| D05 | JS бюджет 6.5MB не повышается ради обхода проверки; audit R1 | Код/CI: final сборка исходников6.38MB, предел сохранен. | Веб не доставлен: `origin/main` остается afe567c, последний успешный известный deploy#79. Нужны hardened CI deploy и реальный production E2E. Source budget fix не равен зеленому production release. |
| D06 | Раздельные app/site ветки, ни одной потерянной dirty работы | Проверен live `git ls-remote --heads`: app/site обе cfc8a54, main afe567c, историческая app ff0b165. 77 локальных веток, 53 удаленные ветки; 54 remote-tracking ссылки включают origin/HEAD. App/site на 18 коммитов впереди main, между собой 0/0. | Это сохранность истории, не факт завершенной web adaptation или публикации. Ничего не merge/reset/clean в данном аудите. Старый CSV 126 refs является датированным снимком, не текущим числом веток. |
| D07 | TestFlight именно доступен Self, не только upload accepted | Доставка: build 60 из 8e39721 VALID/IN_BETA_TESTING, exact Self и 8 notes подтверждены 24.10; cfc меняет только docs/evidence относительно 8e. Build 59 failed 90683 и не распространялся. | На 25.10 ASC повторно не читался. Физическая установка тестировщиком/уведомление не утверждаются. Delivery не закрывает UI scope. |
| D08 | Публичный кандидат проходит G0-G5, чистый запуск/upgrade/metadata/privacy | Частично: G2 simulator и signing/import для 60 пройдены. `docs/design/mobile/testflight60-2026-10-24.md:27-29` явно оставляет manual native finish, physical speech/model и публичный выпуск открытыми. | Website privacy URL, App Store screenshots/metadata, App Review, проверка физического устройства и новые исправления. Не подавать все gate как выполненные из-за Self. |
| D09 | Документация/cleanup отражают финальное поведение; audit O1 | Частично: TestFlight журнал обновлен, исторические карты сохранены, rollback commits есть. | PRODUCT все еще PL-primary/RU-optional; DESIGN font строка устарела; CROSS_PLATFORM_PLAN предлагает уже отвергнутые fork/package/native3D этапы. Dependabot/ops owner-actions и чистка веток не закрыты. |

## 7. Какие формулировки harness требуют исправления

Ниже не новые изменения harness, а конкретное объяснение, почему его [x] не означает «весь аудит реализован».

| Gate | Что допустимо считать выполненным | Что нельзя считать выполненным |
| --- | --- | --- |
|3 Shared race model | Модель/контракты/детерминированные tests, ручной трим и обучающие rules. | Реальная touch управляемость, приемка ощущений камеры, весь native finish. |
|4 One locally bundled 3D solo | Основной offline entry заменен, storage/replay/local coach реализованы. | Наличие требуемого свободного 3D осмотра; полный end-to-end native race после чистой установки. |
|5 Cockpit | Race layout и reserved host внедрены, focus cause исправлен. | Все режимы и fallback единообразны, 44 px везде, U5/U6/U7/U8 закрыты, все panels не закрывают фактический объект. |
|6 Radio | Структурное покрытие 7 локалей, course/typed/voice bridge и free mode есть. | SRC легко найти и сразу получить прибор; native internal Back и copy согласованы; все 7 языков/все lessons/все safety exercises приняты. |
|7 Generated assets | Точные исходники/ресурсы/budget проверены и локальные пакеты собраны. | Любая динамическая route/переход/падение/сохранение уже проверены пользователем offline. |
|8 Automated checks | Указанные наборы тестов исходников/type/lint/build действительно зеленые для release source. | Скриншоты, touch, physical microphone, FPS/нагрев, VO и full user journey автоматически приняты. |
|9 Visual/interaction review | Верно остается [ ]. | Нельзя косвенно закрывать через 5/6/8 или TestFlight. |
|10 Website | Верно остается [ ]. | App/site pointer equality не является deploy или foundation parity. |
|11 Native release | Internal этапа TestFlight выполнен. | Публичная 1.7.0 и App Review, весь аудит или установка на физическом телефоне выполнены. |
|12 Docs/cleanup | Верно остается [ ]. | Обновление BUILDS само по себе закрывает все старые планы и уникальную работу веток. |

Рекомендуемый язык статуса: «реализовано в коде; automated checks PASS; такие-то runtime сценарии подтверждены; перечисленные acceptance gaps открыты». Не использовать общее «радио/управление/полная 3D готовы» без этих границ.

## 8. Покрытие всех публичных назначений каталога

В этой таблице проверено существование реализации/маршрута, а не заново принято содержимое каждого экрана.

| Назначения | Web | Native | Остаток для общей приемки |
| --- | --- | --- | --- |
|Home/Learn/Practice/Race/Menu | `/`, `/learn`, `/practice`, `/race`, `/menu` | `/`, `/learn`, `/simulators`, `/race`, `/menu` | Продолжить, найти SRC, поиск/очистка/empty, все 5 вкладок без прокрутки. |
|Работа с парусами | `/learn/sails` | `/learn/sails` | Возврат шага, evidence vs practice, rig-study/assessment wheels и controls. |
|С нуля | `/start` | `/bootcamp` | Web/native parity пока отсутствует; нельзя считать одним завершенным шаблоном. |
|Повторить, правила, тактика, курсы ветра | `/quick`, `/rules`, `/racing`, `/courses` | те же | Старый/новый визуальный стиль, captions/схемы, 7 языков, Back и offline. |
|SRC | `/radio` и внутренние страницы | `/kursy/radio` и installed router | Видимый вход в прибор, guided/free, внутренний Back, короткий экран, 7 языков, local speech limits. |
|Sternik | `/sternik` и внутренние страницы | `/kursy/motorowodny` | PL-only, offline typed, exam exit, source migration, online website voice отдельно. |
|Основы/Trainer/Лодка 3D | `/simulator`, `/simulator-v3`, `/simulator2` | `/simulator-v1`, `/simulator-v3`, `/simulator2` | Основные и fallback режимы, штурвалы, свободный осмотр, no-occlusion и focus. |
|Solo/Daily/Mission/Multiplayer | `/game`, `/multiplayer` | `/game`, `/multiplayer` | Один доступный 3D путь, управляемая камера, ручной финиш, reconnect и return. |
|Результаты/история/replay/coach | `/leaderboard`, shared replay/API | `/leaderboard`, `/history`, `/replay/[id]`, `/coach` | Local/global честность, restart/diskfail, rig replay, no fake finish. |
|Анатомия/на борту/checklist/glossary | `/anatomy`, `/onboard`, `/checklist`, `/glossary` | те же, bundled Anatomy | Back, 7 языков, крупный текст; Anatomy posters намеренно толькоRU/EN, это надо отличать от перевода интерактивной модели. |
|Spots/weather/gallery | `/spots`, `/gallery` | те же | Weather требует сеть; сохраненные материалы и offline errors не смешивать с live данными. |
|Assistant/settings/support/privacy | `/support`, `/privacy`, web assistant; настройки оболочки | `/ask`, `/settings`, внешние support/privacy из настроек | Honest online status/consent/privacy, один Sound и понятный Back. Не добавлять аккаунт/paywall из старых картинок. |

## 9. Конкретные пробелы проверок

- `mobile/__tests__/race-host.test.tsx:24` заменяет SimWebView на обычный View. Это проверка props/bridge/storage, не проверка появления WebGL, управления лодкой или полного финиша.
- `mobile/__tests__/screens/menu.test.tsx:19` проверяет вызов router.push. Нет доказательства цепочки Home -> видимый вход SRC -> прибор -> завершенное задание -> возврат.
- `e2e/trainer-controls.spec.ts:15-21` измеряет canvas/контейнер во viewport. Проверка «nothing covers the boat» измеряет bar/readouts до открытия drawer; после открытия проверяет visible/hidden, а не пересечение drawer с фактической лодкой. Эти assertions не доказывают весь no-occlusion contract.
- Тест wheels в том же файле открывает свободный Trainer без leadTab. Поэтому он не ловит U03 в rig-study/assessment. Отдельная проверка обоих режимов ввода в задании нужна до закрытия пункта.
- `e2e/radio-workspace.spec.ts:17-23` полезно проверяет LCD/PTT/DISTRESS/DIAL; сценарий MENU проверяет нижний бюджет панели не меньше 90 px. Это не проверка читаемости полного длинного задания во всех языках и native safe area.
- `src/features/race-scene/race-scene.test.ts` проверяет математику тактической камеры. Она может быть полностью корректной при отсутствии orbit/zoom и неудовлетворительном виде мира для владельца. Нужны интерактивная и визуальная проверки новой камеры.
- Тесты local-radio-speech проверяют адаптеры с mock speech/recognition. Нельзя выводить из них установленную модель, качество английского распознавания, громкость устройства или физическую передачу речи.
- Зафиксированные 402 native/972 web checks относятся к прошлому release source. В этом recheck они заново не запускались; изменения после cfc8a54 требуют собственного подходящего набора и новой UI приемки.

## 10. Следующий закрываемый пакет приемки

Сначала P0: видимый SRC -> реальный прибор; свободная управляемая 3D камера в единой гонке; единый выход/Back; вручную пройденный native race -> finish -> history -> replay -> restart. Приемка на фактическом новом binary, с учетом принятого feedback, до утверждения полного закрытия плана.

Затем P1 одной системы управления: U03/U04/U05/U06, 44 px/читаемость, Sound contract, panels/focus и одинаковая семантика действий/цветов. При этом сохраняются настоящие local progress и выбранные sliders/wheels.

Отдельные открытые результаты: полный проход радиокурса на семи языках; web foundation parity и production sync; публичные privacy/store/App Review; physical performance/voice/device gates; учебные механики C1 и исторический docs/dependency/ops backlog. Их не нужно обещать как законченные в текущем UI исправлении.

Минимальный объективный evidence sheet для каждого закрываемого ID:

1. Требование/ID, exact commit и binary, платформа/ОС/язык/viewport/сеть.
2. Реальный вход из Home/Menu, исходные сохранения, действия и наблюдаемый итог.
3. Обычный путь плюс Back/Stay/retry/restart, где применимо.
4. Скриншоты полного рабочего состояния; для occlusion дополнительно bounds предмета и панели, для touch computed target sizes.
5. Подходящий regression на поведенческий контракт, который упадет при возврате дефекта.
6. Что еще не проверялось: не превращать отсутствие наблюдения в зеленый результат.

В этом recheck runtime, releases, ASC и исторические dirty worktrees не изменялись. Добавлен только данный отчет; актуальные maps/harness обновляет владелец интеграции после сопоставления с фактическими исправлениями и новой приемкой.
