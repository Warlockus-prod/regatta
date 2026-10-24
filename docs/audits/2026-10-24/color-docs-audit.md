# Цвет, управление, свободная сцена и чистка старого backlog

Дата: 2026-10-24. База: `origin/main` afe567c. Это source audit, без визуальных утверждений о конкретном скриншоте. Root часть аудита отдельно проверяет живую верстку на телефоне и desktop. Ничего в проекте не менялось.

## Итог

Большая часть общей системы управления уже существует: единые controls preferences, sliders/wheels, отдельный dock, SceneBar, view drawers, темные instrument surfaces. Не нужно планировать ее создание заново. Основной оставшийся разрыв: «не перекрывать лодку/рацию» пока не является общим строгим контрактом всех открытых состояний. Drawers тренажера рисуются внутри сцены, гонка держит HUD/кнопки/подсказки поверх воды, native online radio добавляет плавающую кнопку Offline. Цветовая система в основном согласована, но старый `/start`, часть радио-типографики и несколько direct literals обходят семантические роли.

## Уже сделано, не возвращать в открытую очередь

| Старое замечание | Текущее состояние кода |
| --- | --- |
| «У игры розовая шапка и зеленая основная кнопка» | `src/app/game/GameMenu.tsx:95` neutral heading; выбранные варианты в `:245`, `:268` используют accent-cyan. В текущих game/radio/simulator UI не найдены старые Tailwind purple/pink/violet/fuchsia или green CTA classes |
| «Лодка уезжает при прокрутке управления» | `TrainerWorkspace.tsx:25` отделяет scene от dock; `TrainerControls.module.css:6` фиксирует высоту, `:177` прокручивает panel. Остается визуальная проверка коротких экранов, но реализация существует |
| «Штурвалов нет/они только макет» | `Wheel.tsx`, `WheelDeck.tsx`, `mapping.ts`, общие prefs и native WheelDeck уже реализованы; `e2e/trainer-controls.spec.ts:39` проверяет keyboard helm+2sheets |
| «Ползунки/штурвалы надо синхронизировать между web и app» | `prefs.ts:36` и `mobile/src/persistence/controls.ts:19` используют regatta.controls.v1, native bridge передает __REGATTA_CONTROLS__ и принимает controls-prefs |
| «Добавить вибрацию штурвала» | Решение отменено владельцем: звуковые clicks по выбору, no vibration, `docs/design/trainer-controls-concept.md:30` и native WheelDeck:7 |
| «Прокрутка задания уводит рацию» | `RadioWorkspace.tsx:98` и CSS:85/:91 выделяют радио и отдельный scrolling dock, desktop две колонки, portrait сверху/снизу; это уже #79 |
| «У радио слишком много вкладок» | Четыре вкладки и единый practice list уже в #79, см. `src/app/radio/symulator/page.tsx:658` |
| «Вернуть старый Auto/Light/Dark native switcher» | Native 1.7.0 сознательно light paper + dark instruments. Историческая feature/mobile-light-theme не является незавершенной текущей задачей |

## Остается: ничего не закрывает объект

### U1. Выдвижные панели тренажера накрывают сцену при открытии

Источник: `src/features/trainer-controls/SceneChrome.tsx:55` прямо описывает drawer внутри scene box. CSS `TrainerControls.module.css:79` задает backdrop на весь scene, `:80` drawer position:absolute, top/right/bottom 0, width min(236px,72%), z-index6. Включение `data-open=true` в `:100` лишь меняет transform, место в grid/flex не резервирует.

Места использования: `src/features/simulator-v3/SimulatorV3Page.tsx:876`, `src/features/simulator-3d/Simulator3D.tsx:334` (виды) и `:355` (guide). В закрытом состоянии ничего не накрыто; в открытом панель неизбежно занимает часть viewport сцены. Попадает ли под нее именно яхта при каждой камере, определяется текущим кадром и требует снимка.

Следующий срез: bottom dock или отдельная боковая область должна сжимать доступную сцене область, а camera/framing адаптироваться к оставшемуся прямоугольнику. Одной смены стороны overlay недостаточно.

### U2. Настройки управления тоже модальное перекрытие

`TrainerControls.module.css:235` sheetBackdrop position:fixed inset0 и затемнение всего экрана, `.sheet:247` max-height88dvh. `ControlSettingsSheet.tsx:67` вставляет модальный sheet поверх workspace. Это рабочая реализация прежней концепции, но она не соответствует новому более строгому пожеланию «вся дополнительная информация в нижнем/боковом пространстве без перекрытия объекта».

Следующий срез: сделать настройки частью зарезервированного dock; верхняя сцена остается видимой. Если глобальный modal допустим только при остановленной практике, это должно быть явным исключением нового контракта, а не случайным поведением.

### U3. Гонка сохраняет значительный слой поверх воды

`src/app/game/GameClient.tsx:1352` speed, `:1356` mark, `:1359` standings, `:1363` race toast, `:1370` course/status, `:1379` first-race hint, `:1392` sound, `:1400` menu, `:1435` camera/view button, `:1442` controls row и `:1473` steering buttons расположены absolute поверх сцены. Вынос части native HUD под поле уже сделан, это не решает online web 3D layout.

Следующий срез: единый workspace гонки с scene, компактной полосой показаний и управляющим dock. Тактические объекты мира (буи, дистанция до знака, start line) остаются в мире; UI-карточки/таблица/помощь/параметры получают отдельное место. Это источниковый факт о DOM/CSS, не доказательство перекрытия яхты в каждом кадре.

### U4. Native online radio добавляет плавающую Offline поверх всего

`mobile/src/course/OfflineRadioCourse.tsx:38` ONLINE_AFTER_LOAD вставляет кнопку в body, `:57` position:fixed, right12/bottom12, `:60` z-index2147483647. Она может накрыть нижний task dock и всегда располагается поверх рабочего экрана. Нужна кнопка в общей native/workspace полосе, не отдельная плавающая сущность. Проверить в online mode на реальном native screen.

### U5. Onboarding и help остаются отдельными покрывающими слоями

`src/app/radio/symulator/page.tsx:1115` onboarding fixed inset0. Источниковый аудит не считает сам учебный вход ошибкой, но новый контракт должен определить, можно ли открывать такую помощь во время работы с рацией, или она переезжает в dock с сохранением видимости устройства.

### U6. Существующие E2E не доказывают отсутствие перекрытия в открытых состояниях

`e2e/trainer-controls.spec.ts:68` называется "nothing covers the boat", но геометрия `:74-78` проверяет только bar над сценой и readouts под сценой. После открытия drawer тест `:82` проверяет visible, затем закрытие по выбору. Нет проверки пересечения panel/scene, видимости яхты/области управления при открытых settings/help. Нужен геометрический контракт и снимки всех expanded states на 320/390px, короткой высоте и landscape. Unit-тесты mapping это другой вид проверки.

## Цветовая модель: что сейчас фактически есть

| Контекст | Фон/акцент | Источник |
| --- | --- | --- |
| Web dark | bg #0a1628, secondary #0f2035, action #00d4ff | `src/app/globals.css:45` и далее |
| Web light | bg #f4f8fc, secondary #e9f1f8, action #0072a3 | globals.css:112 |
| Native paper | bg #f7f5f0, secondary #efebe3, action #006ea6 | `mobile/src/design-system/tokens.ts:65` |
| Native instruments | Темные ocean tokens, darkColors | tokens.ts:17, `mobile/src/simulator/WheelDeck.tsx:19` |
| Web immersive | game/multiplayer/3simulator принудительно dark | `src/lib/theme.ts:17`, `:43` |
| Web radio | Не входит в IMMERSIVE_PREFIXES, следует общей web theme | theme.ts:17-23 |
| App WebView | Любой embed=1 принудительно dark | theme.ts:34/:44, `src/app/layout.tsx:199` |
| Рация как предмет | Green/amber LCD, graphite hardware, red DISTRESS | `src/app/radio/symulator/RadioFront.tsx:49` и далее |

Светлый сайт сейчас холодный голубовато-белый, native paper теплый. Это реальное различие токенов, не автоматически баг: прежняя модель допускает различную платформенную подачу. Для нового требования согласованности нужно выбрать один нейтральный фон и одинаковые semantic roles, затем проверить web/native navigation transitions. Нельзя просто скопировать светлый HEX на dark instrument.

Amber LCD и красный DISTRESS относятся к устройству. Зеленый/amber экран рации не следует перекрашивать в action cyan ради однообразия: цвет hardware отличается по смыслу от цвета интерфейсных действий.

## Конкретные оставшиеся нарушения ролей цвета

### C1. Старый `/start` продолжает раскрашивать контент по категориям

`src/app/start/page.tsx:154-172`: Refresh использует success/green как обычный заголовок карточки, On board warning/amber, без статуса успеха/предупреждения. Аналогично multiplayer title `:339` warning. Это старый visual language, в отличие от новых flat neutral hubs. Правка входит в foundation web parity, не в переписывание физики.

### C2. Cyan используется для статического текста, а не только действий

`src/components/product/Product.module.css:6` kicker, `src/app/radio/page.tsx:158` overline, `:192` процент общего прогресса, `:214` номера этапов. Это расходится с буквальным правилом DESIGN.md «cyan indicates an action, selected section or active control». Статические подписи/номера можно сделать secondary/primary; заполнение progress и статус результата должны иметь отдельную роль. Цвет ссылки или selected tab при этом корректен.

### C3. Inspect active выделен отдельным ярким amber вместо action role

`src/app/radio/symulator/RadioWorkspace.tsx:116` hardcoded #ffce4d/#3a2a00 для active Inspect. Старая концепция специально ввела amber для учебной подсветки, поэтому это не случайный желтый. В новом color contract надо разделить «выбран режим Inspect» (action/active) и «подсвеченная деталь/подсказка» (teaching amber). Иначе один активный режим выглядит как warning.

### C4. Локальные RGB/HEX обходят общие semantic tokens

Race HUD `src/features/race-hud/RaceHud.tsx:22` смешивает success token с direct #ff6677; `:107` race events используют direct #3ddc84/#ff8899 вместо общих success/danger. `:11` card palette hardcoded ocean, но это ожидаемо dark-only route. В radio trainer `page.tsx:851/:904/:1024` alpha cyan задается literal rgba, поэтому в web light theme фон продолжает наследовать dark cyan hue. Priority ниже поведения/перекрытий, но migration к semantic surface tokens снизит разъезд цвета.

### C5. Значения акцента на учебных схемах имеют иной смысл

В canvas/3D используется cyan для ветра, пути игрока и выделения паруса, например GameClient:1094/:2173. Это информационная семантика схемы, а не CTA. Нужен отдельный diagram/wind/player token и короткая легенда. Запрещать любой cyan во всей геометрии по правилу UI action было бы неверно.

## Настройки управления: уже существует больше, чем видно в native Settings

Web `src/features/trainer-controls/prefs.ts:20` хранит mode, helmMapping по поверхности, returnToCenter, sensitivity, jibSheetSide, sound, favorites. Defaults `:36`: sliders, no auto-center, sensitivity1, jib left, sound off. Native `mobile/src/persistence/controls.ts:23` показывает mode/sound и пропускает остальную запись через bridge без изменения.

`ControlSettingsSheet.tsx:73` меняет sliders/wheels, `:80` course/rudder, `:83` return-to-center, `:90` sensitivity, `:94` сторону стакселя и `:101` favorites/order. Это реальные controls, не будущая концепция. Следующий аудит должен проверить, что одинаковая запись доходит до игры и 3D-гонки, а не планировать новый объект preferences параллельно существующему.

## Как почистить старые документы без потери истории

| Документ/пункт | Рекомендация для следующего отдельного docs change |
| --- | --- |
| trainer-controls-concept:1-108 | Оставить наверху актуальные defaults и что уже сделано. Новое правило владельца 24.10 должно расширить no-occlusion на открытые drawer/settings, гонку и радио |
| trainer-controls-concept:110 и старый раздел «Что сейчас» | Перенести под явный Historical before 19.10 или свернуть: там отсутствующий руль, весь scroll, portrait-only, vibration и carousel, уже противоречащие реализации |
| trainer-controls-concept:107 | Уточнить задачу light theme: сейчас native paper уже есть, гонка намеренно dark. Нельзя оставлять старое «не сделано» как глобальный план осветлить гонку |
| DESIGN.md:43-44 | Исправить фразу «native Home without claiming new global light theme»: 1.7.0 уже light paper default, tokens это подтверждают |
| src/lib/theme.ts:29 и layout.tsx:195 | Комментарии называют app dark-only; актуальная правда: native content paper, instruments/embedded pages dark |
| mobile/ROADMAP, CROSS_PLATFORM_PLAN | Пометить historical/superseded и связать с действующими ADR0009/0011, offline bundles и актуальным backlog. Не исполнять незакрытые галочки rewrite/packages как новые задачи |
| PRODUCT.md / AGENTS library | PRODUCT.md существует в main и остается radio-only brief. Политика PL primary / RU optional устарела после решения SRC на семи языках; AGENTS ошибочно пишет, что файл отсутствует |
| BUILD journal/AGENTS | Записать фактический build58, следующий59, public1.6.4, 1.7.0 prepared, #80 deploy blocked; сохранять историю строк45-58 |
| Старый game audit | Пометить закрытыми easy/hard bots, pink/green menu, short label clipping, first HUD, venue/3D entry. Оставить текущие mode propagation, default3D, reserved dock и next scene performance/QA |

## Критерий следующего законченного среза

Один и тот же принцип на обеих платформах: предмет остается видимым и управляемым; основные действия доступны снаружи сцены; вспомогательная информация занимает заранее выделенное нижнее/боковое пространство и свернута по умолчанию; колеса и ползунки используют единую запись настроек; action/selected/status/hardware/data имеют разные четкие роли цвета. Проверять обычный экран, открытый drawer, help, settings, running race и debrief отдельно.
