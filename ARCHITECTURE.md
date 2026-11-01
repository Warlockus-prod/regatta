# ARCHITECTURE - карта кода Regatta

Карта кода и потоков. Точка входа для агента - `AGENTS.md`, история изменений -
`CHANGELOG.md`. Этот файл держится в синхроне с деревом: `npm run check:map`
падает, если появился файл без строки в разделе 4 или путь в карте больше не
существует.

Историческая полная карта: 2026-09-26. Актуальные изменения и статус приемки: разделы completion map и 2026-10-25 corrections ниже.

---

## Мобильные учебные модули (2026-10-15)

- `mobile/src/bootcamp/learning-guide.ts` - цели, три модуля, состояния схем и задания курса из восьми уроков, семь языков.
- `mobile/src/bootcamp/FoundationScene.tsx` - нативная интерактивная схема выбранного урока.
- `mobile/src/bootcamp/lesson-position.ts` - отдельная закладка шага и схемы, проверка ID и адрес возврата.
- `mobile/src/bootcamp/ReturnToLesson.tsx` - доступная кнопка возврата из практики через dismissTo известного урока; следующий Back не должен снова открывать практику. Цвет наследуется от заголовка.
- `mobile/__tests__/foundation-learning.test.tsx` - покрытие уроков, языков, сохранения места, ошибок записи и отсутствия ложных оценок.
- `docs/design/mobile/foundation-release47-2026-10-15.md` - объем, визуальная проверка и статус TestFlight 47.

## 1. Что это и где работает

Regatta (в UI "Week to Regatta") - учебное приложение по парусному спорту:
теория, три тренажерные поверхности на одном физическом движке, гонка с ботами
и мультиплеер, плюс два экзаменационных курса под польские сертификаты (SRC
радиосвязь и sternik motorowodny).

- Веб: Next.js 16 (App Router, Turbopack) + React 19, TypeScript strict,
  Tailwind v4. Прод: https://weektoregatta.com, vps2, два контейнера
  (`regatta`, `regatta-ws`) за общим контейнером nginx.
- Мобильное: Expo / React Native в `mobile/`. Подтвержденная поставка69/source2ea498b и текущий кандидат70 описаны в `docs/audits/2026-10-28/completion-status.md`; native/manual-radio/physical65/public gates остаются отдельными. Свой CI-джоб и гейт релиза.
  Карточка App Store: `mobile/asc-metadata/` (8 локалей, включая `mobile/asc-metadata/en-GB`),
  "Что нового": `mobile/releases/` (`mobile/releases/1.6.4.json`), языки Info.plist и переводы запроса
  микрофона: `mobile/app.json` (`CFBundleLocalizations`) и `mobile/locales/` (`mobile/locales/pl.json` и еще 6).
  Своя карта: `docs/design/mobile/ARCHITECTURE.md`.
- Данные: SQLite (better-sqlite3) в томе `/data` контейнера `regatta`.
- ИИ: OpenAI (`OPENAI_API_KEY`, модель `OPENAI_MODEL`, по умолчанию
  `gpt-5-mini`) для коуча, чатов и STT/TTS радиокурса. Claude
  (`@anthropic-ai/sdk`, dev-зависимость) используют только скрипты перевода
  `scripts/translate-data.mjs` и `scripts/translate-data-flat.mjs`.

---

## 2. Верхний уровень

| Дерево | Что внутри |
|---|---|
| `src/app` | маршруты App Router, API-роуты, корневой layout |
| `src/components` | общие клиентские компоненты (навигация, тема, аналитика) |
| `src/data` | контент: глоссарий, правила, анатомия, буткемп, банки вопросов |
| `src/features` | крупные фичи: `sailing-lab`, `simulator-3d`, `simulator-v3` |
| `src/lib` | движок физики, i18n, БД, погода, каталог продукта, утилиты |
| `src/proxy.ts` | middleware Next: язык + basic-auth на `/stats` |
| `ws-server` | отдельный Node-процесс мультиплеера, вне сборки Next |
| `scripts` | кодмоды, переводы, сканеры, сборка серверной физики, гейты |
| `ops` | эксплуатация: уведомления о статусе релиза в Telegram |
| `e2e` | Playwright: smoke по прод-маршрутам и мультиплеер |
| `mobile` | приложение Expo (не покрывается этой картой) |
| `docs` | библиотека документации, см. таблицу в `AGENTS.md` |

---

## 3. Ключевые потоки

### 3.1 Язык и SSR

7 языков: RU (источник), EN, PL, ES, FR, DE, IT.

1. `src/proxy.ts` перехватывает запрос: короткие ссылки `/pl`, `/en`, `/ru`,
   `/es`, `/fr`, `/de`, `/it` (список строится в `src/lib/languages.ts`,
   `LANG_SHORTCUT_PATHS`) редиректят на `/` и пишут cookie `regatta_lang`.
2. `src/app/layout.tsx` читает cookie для `<html lang>` и `generateMetadata`.
   Ломать эту цепочку нельзя: иначе первый рендер уходит не на том языке.
3. `src/lib/i18n.tsx` (клиент) выбирает язык по приоритету: `?lang=` в URL >
   localStorage (`regatta.lang.v1`) > `initialLang` из SSR (cookie) >
   `navigator.language` > RU.
4. Хелперы: `tl({ru, en, pl, ...})` для нового кода, `tp(ru, en, pl, {es, fr,
   de, it})` для существующих вызовов, `t(ru, en)` - legacy, новых вызовов не
   добавлять.
5. Контент в `src/data/*` хранится в плоской форме `fieldRu/En/Pl` плюс
   опциональные `fieldEs/Fr/De/It` (тип `LegacyLocalized`), читается через
   `legacyPick(obj, 'field', lang)`.

### 3.2 Аналитика и приватность

`src/components/ClientErrorReporter.tsx` и `src/lib/client-log.ts` отправляют
события в `src/app/api/log/route.ts`; все записи идут через `insertEvent()` в
`src/lib/db.ts`; дашборд `src/app/stats/StatsDashboard.tsx` читает агрегаты.
На входе `/api/log` усекает IP (`src/lib/net.ts`), сохраняет только allow-list
полей `meta` с лимитом 4 КБ и определяет страну по заголовкам `cf-ipcountry`,
`x-vercel-ip-country`, `x-country-code`. Серверные события: `race.finish`
(`/api/race-result`), `coach.requested` (`/api/coach`). Клиентские:
`page.view`, `page.engaged`, `js.uncaught`, `js.rejection` и воронка
(`src/lib/funnel.ts`): `exam.start`, `exam.finish` (base `sternik` или `src`,
балл, сдан), `lesson.complete` (курс `bootcamp`, `sails`, `radio-theory`),
`radio.task.complete`, `app_store.click` (токен `ct` места ссылки) и воронка гонки:
`race.countdown`, `race.first_tack`, `race.first_mark`, `race.end` (finished, место,
число поворотов) и `race.replay` (source result, saved или shared); каждый шаг не
чаще раза за гонку, поле `raceNo` - номер гонки на устройстве (1 = первая).
Серверный `race.finish` - только сохраненное в лидерборд время, в воронку гонки
не входит.
Список имен и полей - `src/lib/analytics-events.ts`: `/api/log` молча
отбрасывает любое другое имя и любое поле, не прошедшее проверку. У
`page.view` есть `embed` (страница открыта с `?embed=1` в приложении,
флаг живет в sessionStorage до конца сессии WebView) и `client` (`app` или
`web`). В приложении результат экзамена дополнительно уходит в нативную
оболочку через `postMessage` (`{ type: 'exam-finished' }`), она шлет
`exam_finished` в PostHog (`mobile/src/analytics/web-bridge.ts`); на офлайн-
бандле радиокурса (file://) `/api/log` не вызывается. `/stats` показывает
воронку панелями (`getMetricsRange().funnel`), окно `/api/admin/stats-range`
ограничено 90 днями. Сырые `events` и `sessions` старше 180 дней удаляет
`scripts/prune-events.mjs` (сначала `--dry-run`, расписание в `docs/OPS.md`).

### 3.3 Физика

Один движок: `src/lib/sailing-physics/*` (чистый TypeScript, без React, DOM и
I/O). Его используют Основы (`/simulator`), Тренажер (`/simulator-v3`), Лодка
3D (`/simulator2`), общая сессия `src/features/sailing-lab/runtime/session.ts`
и мобильное приложение через алиас `@regatta/physics`. Обоснование и константы
зафиксированы в `DECISIONS.md` ADR-0001: менять коэффициенты движка можно
только новым ADR. `ws-server/race-physics.js` генерируется из TS-исходников
скриптом `scripts/build-race-server.mjs`, руками его не правят.

### 3.4 Гонка и мультиплеер

Одиночная гонка `/game` считается в `src/lib/race-physics.ts`, но скорость и
дрейф лодки там дает общий движок: `stepBoat` зовет `tick()` и `trimForDrive()`
из `sailing-physics` (с 2026-09-07, `32b63d7`). Свое у гонки только гоночное:
поворот руля с авторитетом по скорости, перевод узлов в единицы мира, ворота
огибания, автопилот ботов и столкновения.
Мультиплеер: `src/lib/mp-client.ts` -> `wss://weektoregatta.com/ws` -> nginx ->
`ws-server/server.js` (авторитетный тик 20 Гц). На финише ws-server постит
результат в `/api/race-result`, оттуда он попадает в лидерборд и реплей.
Боты на сервере, в `/game` и в мобильном приложении рулят одним
`raceAutopilotTurn`: состояние бота живет на объекте лодки, поэтому к новой
гонке сервер создает ботам свежие объекты. Устройство и замеры - ADR-0003.
Столкновения (`resolveCollisions`) общие для сервера и `/game`: скорость теряют
только сближающиеся лодки, финишировавшие из столкновений выбывают (ADR-0004).

### 3.5 Живая погода

Провайдер Open-Meteo, без ключа: `src/lib/weather/open-meteo.ts` за контрактом
`src/lib/weather/types.ts`, роут `src/app/api/weather/route.ts` нормализует
ветер, волну и течение, переводит в узлы и кэширует в памяти. Потребители:
`/spots`, кнопка живого ветра в Тренажере и карточка ветра в мобильном приложении.

### 3.6 Офлайн-контент для мобильного

`mobile/scripts/build-sailing-offline.mjs` и
`mobile/scripts/build-radio-offline.mjs` собирают
веб-контент в нативный ассет; `npm run build:sailing-offline:check` в CI падает,
если бандл разошелся с исходниками сайта. CSS-модули, импортированные радиокурсом
(рабочий экран рации), esbuild выдает вторым выводом, и сборщик встраивает его в
тот же HTML. Мост между WebView и RN описан в
`src/features/sailing-lab/runtime/storage-protocol.ts` (произвольные ключи,
URL и удаление со страницы не принимаются).

### 3.7 Тема

`src/lib/theme.ts` - общий web resolver для light/dark; его читают
`src/components/ThemeManager.tsx`, `src/components/ThemeToggle.tsx` и
inline-скрипт без мигания в `src/app/layout.tsx`. Текущий исходник наследует
выбранную web-тему и в тренажерах/embed. Валидный native override задает только
поверхность, без изменения сохраненной web-настройки или освещения3D. Native
`mobile/src/design-system/embedded-theme.ts` передает дневной AppSurface до
загрузки и повторно после нее; глобальные native Dark/Auto пока не реализованы.

### 3.8 Управление тренажерами

На телефоне все три тренажера устроены одинаково: шапка, закрепленная сцена,
показания, док управления (`src/features/trainer-controls`). Док: вкладка
«Избранное» (состав и порядок выбирает пользователь) или «Штурвалы», затем
«Паруса», «Руль», «Ветер», «Ещё». Настройки (`regatta.controls.v1`) общие для
всех тренажеров; приложение передает их в WebView и получает обратно
сообщением `controls-prefs`. Штурвал Основ и Тренажера трима задает курс,
Лодки 3D перо руля (у обоих есть опция другого режима). Щелчки только звуком
и только при включенном звуке; вибрации нет.

---

## 4. Карта кода

Одна строка на файл. Разделы 4.1-4.12 покрывают деревья `src`, `scripts`,
`ws-server`, `ops`, `e2e` и корневые конфиги - ровно то, что проверяет
`scripts/check-project-map.mjs`.

### 4.1 Каркас приложения и страницы

- `src/app/layout.tsx` - корневой layout: язык из cookie, метаданные, провайдеры, тема без мигания.
- `src/app/globals.css` - токены темной океанской темы и светлой темы, базовые стили.
- `src/app/page.tsx` - Home: одно основное действие (начать или продолжить урок).
- `src/app/error.tsx` - граница ошибки уровня сегмента, рендерится внутри layout.
- `src/app/global-error.tsx` - граница ошибки самого layout, со своим `<html>`.
- `src/app/icon.tsx` - генерация favicon приложения.
- `src/app/apple-icon.tsx` - генерация иконки для iOS.
- `src/app/favicon.ico` - статический favicon для старых клиентов.
- `src/app/robots.ts` - robots.txt.
- `src/app/sitemap.ts` - sitemap.xml по контентным маршрутам.
- `src/app/offline/page.tsx` - страница офлайн-фолбэка сервис-воркера.
- `src/app/privacy/page.tsx` - политика приватности (требование App Store).
- `src/app/support/page.tsx` - страница поддержки, форма уходит в `/api/support`.
- `src/app/menu/page.tsx` - Меню сайта: адресуемый каталог всех разделов с поиском (`ProductMenu`), `/library` ведет сюда.
- `src/app/design-v3/page.tsx` - архивный review entry возвращает404; внутренний прототип не попадает в release JS. Исходник DesignStudio и Git history сохранены.

### 4.2 Пять разделов оболочки и контент

- `src/app/learn/page.tsx` - хаб Learn: уроки, курсы, сертификаты.
- `src/app/learn/sails/page.tsx` - курс "работа с парусами": список уроков.
- `src/app/learn/sails/[lesson]/page.tsx` - один урок курса парусов (статические параметры).
- `src/app/practice/page.tsx` - хаб Practice: три тренажерные поверхности.
- `src/app/race/page.tsx` - хаб Race: одиночная гонка, мультиплеер, лидерборд.
- `src/app/library/page.tsx` - хаб Library с поиском по всем разделам.
- `src/app/start/page.tsx` - буткемп из 8 уроков "с нуля".
- `src/app/quick/page.tsx` - повторение за 15 минут.
- `src/app/courses/page.tsx` - курсы относительно ветра (подписи по-русски намеренно) и раздел `#turns`: оверштаг и фордевинд как процедуры (команды, шаги с числами, ошибки) из `maneuvers`, врезка про румпель и штурвал, ссылка на хореографию экипажа в `/checklist#maneuvers`.
- `src/app/rules/page.tsx` - правила гонок и расхождения, 21 сценарий; `?rule=<id>` из разбора гонки открывает карточку и прокручивает к ней, сверху «Вернуться к гонке».
- `src/app/rules/rule-from-search.ts` - какую карточку правила просит ссылка `?rule=<id>` (только существующую).
- `src/app/rules/rule-from-search.test.tsx` - ссылка открывает каждую карточку, на которую ведет гонка, и ничего больше; отрисованная страница открывает только эту карточку, прокручивает к ней и дает внутри нее «Вернуться к гонке» с той же гонкой, при неизвестной карточке остается как была.
- `src/app/rules/CoursesSection.tsx` - блок курсов внутри страницы правил.
- `src/app/racing/page.tsx` - тактика гонки.
- `src/app/glossary/page.tsx` - глоссарий, 51 термин с категориями.
- `src/app/anatomy/page.tsx` - устройство яхты: 3D-модель плюс постеры.
- `src/app/onboard/page.tsx` - первая неделя на борту.
- `src/app/checklist/page.tsx` - чек-лист перед выходом. У каждого раздела якорь по его `id` (`/checklist#maneuvers`), из раздела про повороты ссылка на `/courses#turns`.
- `src/app/spots/page.tsx` - места и живая погода.
- `src/app/gallery/page.tsx` - галерея фото и видео прошлых регат.

### 4.3 Тренажеры, гонка, реплей, статистика

- `src/app/simulator/layout.tsx`, `src/app/simulator-v3/layout.tsx`, `src/app/simulator2/layout.tsx` - описания тренажеров; viewport наследует корневую тему без fixed-dark переопределения.
- `src/app/simulator/page.tsx` - Основы (внутреннее имя V1), canvas, прод-поверхность; на телефоне холст закреплен, управление в общем доке (раскладка изменена с согласия владельца 2026-10-19, логика холста прежняя).
- `src/app/simulator2/page.tsx` - Лодка 3D (V2), обертка над `src/features/simulator-3d`.
- `src/app/simulator-v3/page.tsx` - Тренажер трима (V3), обертка над `src/features/simulator-v3`.
- `src/app/game/page.tsx` - серверная обертка одиночной гонки.
- `src/app/game/GameClient.tsx` - единая 3D-гонка, оркестратор (M0-1): состояние, refs, подготовка заезда, отсчет, ввод, меню; экраны брифинга и финиша лежат в `src/app/game/RaceBriefing.tsx` и `src/app/game/RaceResults.tsx`, цикл гонки в `src/app/game/useRaceLoop.ts`. Брифинг, старт, знаки, боты, Simple/Pro, локальный финиш и коуч. Сцена и штурвалы общие с тренажером; SVG брифинга использует локальный Source Sans 3 и переносит длинные подписи без изменения переводов. Нативное меню содержит явную ссылку возврата к выбору гонок через существующий проверенный bridge. M4-7: подключает `useFirstRaceHints` (шина отзывов, `paused`), перечитывает запись показанных подсказок при подготовке каждой гонки и передает «Показать подсказки снова» в настройки кабины (`src/app/game/GameClient.hints.test.tsx`).
- `src/app/game/useRaceLoop.ts` - цикл одиночной гонки 30 Гц и пересинхронизация часов: шаг лодок, правила, круги и финиш, журнал гонки, тосты поворотов, HUD, конец гонки с коучем, миссиями и событиями воронки; вызывается из GameClient с его refs и сеттерами (тот же порядок эффектов). На частоте HUD (не чаще 10 раз в секунду) кормит звуковой фон гонки (M3-2, ADR-0019) вымпельным ветром, скоростью, креном, мертвой зоной и заполаскиванием в Pro; контакт дает глухой удар. Сообщает странице ранний старт игрока и его исправление по событиям `src/lib/race-rules.ts` (M3-3: флаг X и сигнал отзыва). M4-5: на каждом кадре отсчета и гонки, в том числе на паузе, отмечает, были ли включены подсказки маршрута или трима, и на финише пишет медаль трассы (`src/lib/race-medals.ts`), кроме пробной гонки; если устройство не сохранило ряд, отдает награду с `saved: false`. M4-6: в конце каждой гонки (финиш или лимит времени), кроме пробной, пишет ряд главного экрана гонки `regatta.race.home.v1` (`src/lib/race-next-step.ts`): день, главную ошибку как цель, законченную гонку дня (`dailyDay` из GameClient). M4-7: только в одиночной гонке, не в пробной, на каждом тике гонки спрашивает `nextFirstRaceHint` (`src/features/race-hud/first-race-hints.ts`) и отдает подсказку в `showHint`; память подсказок своя на гонку и сбрасывается, когда «Показать подсказки снова» поднимает ревизию (`src/app/game/useRaceLoop.hints.test.ts`).
- `src/app/game/race-model.ts` - типы и чистые помощники одиночной гонки (лодка, трасса, журнал, разбор, строка результата), подписи знаков, `soloRaceWind`, `sortRaceResults`, `raceLogTally`, `formatTime`, `localStore`.
- `src/app/game/race-model.test.ts` - фиксирует формулу ветра, порядок таблицы финиша со штрафами, подсчет журнала, подписи знаков и формат времени.
- `src/app/game/RaceBriefing.tsx` - экран брифинга `/game`: схема трассы, правила, выбор Simple/Pro, выбор трассы пробной гонки и `PhysicalTrialNote`.
- `src/app/game/RaceResults.tsx` - экран финиша `/game`: место и время, медаль трассы (M4-5), полосы навыков (M4-1), разбор судьи, таблица флота, миссия, коуч, сохранение в лидерборд, ссылка на повтор.
- `src/app/game/RaceGhostSplits.tsx` - сплиты против твоего лучшего на экране финиша (M4-4), под полосами навыков: строка на каждый пройденный знак и на финиш, твое время и разница, впереди зеленым, позади красным, всегда со знаком и словом, без cyan; без призрака ничего не рисует.
- `src/app/game/RaceGhostSplits.render.test.tsx` - на экране финиша знак зеленый «-2.4 s, ahead», финиш красный «+1.1 s, behind», без призрака секции нет; плашка HUD со своим источником и теми же словами.
- `src/app/game/GameClient.ghost.test.tsx` - настоящий GameClient на старте отсчета ищет призрака класса и в приложении, и на сайте (M4-4).
- `src/app/game/RaceMedal.tsx` - медали трасс (M4-5): на экране финиша медаль этой гонки («Новая медаль» только при повышении и успешной записи, иначе «Медаль за эту гонку» и что она не сохранилась), трасса (уровень и ветер) и следующая медаль одной фразой, у золота названы выключаемые переключатели («Путь и подсказки», в Pro и «Подсказки трима Pro»); в меню гонки медаль выбранной трассы и следующая цель. Диск медали декоративный, не cyan, без анимации; для пробной гонки и схода ничего.
- `src/app/game/RaceMedal.render.test.tsx` - экран финиша: новое золото, серебро с целью на золото (в Pro оба переключателя, в Simple только путь), время на золото с подсказками (проплыть еще раз без них), несохраненная медаль без «Новая», «Медаль трассы» без «Новая» у прежней медали, ничего при сходе и в пробной гонке; меню: «пока нет», сохраненная медаль с целью, другая трасса отдельно, ничего для пробной гонки.
- `src/app/game/RaceNextStep.tsx` - главный экран гонки на сайте (M4-6): одна карточка «Следующий шаг» сверху лобби `/game` (цель из прошлой гонки со ссылкой на ее урок или карточку правила и возвратом к этой гонке, строка медали трассы M4-5 со следующей медалью или гонка дня со ссылкой), под ней рекорд трассы в выбранном режиме, «Трасс с медалью: N из 9» и «Дней с гонкой на этой неделе» (без строки при нуле, без серий); `RaceDailyEntry` - вход в гонку дня на сайте, если карточка не она; ссылки на гонку дня полной загрузкой `/game?daily=`. Одна вторичная ссылка максимум, главное действие лобби остается одно.
- `src/app/game/RaceNextStep.render.test.tsx` - лобби сайта: цель первой со ссылкой на урок и `fromRace`, строка медали в карточке и не второй раз, гонка дня в карточке после золота без второго входа, без шага прогресс остается, рекорд по режиму и счет медалей, без строки дней при нуле, лобби сегодняшней гонки дня не шлет в гонку дня, а лобби старой ссылки на гонку дня все равно предлагает сегодняшнюю, цель называет одиночную гонку, миссия возвращает практику к миссии, ничего в приложении и в пробной гонке, ровно одно главное действие.
- `src/app/game/useRaceLoop.medals.test.ts` - настоящий цикл гонки (M4-5): быстрый финиш без подсказок дает золото в хранилище и на экран результатов, подсказки маршрута на одно мгновение гонки, включенные и выключенные на паузе или показанные на отсчете, или подсказки трима в Pro снимают золото, отказ хранилища дает `saved: false`, переключатель трима в Simple нет, таймаут и финиш пробной гонки ничего не пишут.
  M4-6 в том же файле: финиш пишет день и законченную гонку дня, лимит времени пишет день и главную ошибку (мертвая зона), но не гонку дня, пробная гонка ничего не пишет.
- `src/app/game/useRaceLoop.ghost.test.ts` - настоящий цикл гонки на огибании знака с призраком показывает один сплит: красный с плюсом, если призрак был раньше, зеленый с минусом, если ты раньше; без призрака сплита нет; на финише отдает экрану результатов сплиты знака и финиша и пишет новый ряд призрака и в приложении (M4-4).
- `src/app/game/RaceSkillBars.tsx` - полосы навыков на экране финиша (M4-1): заголовок, по каждой полосе одна подпись и одно число, сама полоса скрыта от чтения с экрана, у всех полос один нейтральный цвет, хорошее число отмечено галочкой и словами «хороший результат» для чтения с экрана, без cyan; без полос не рисует ничего (пробная гонка, пустой журнал).
- `src/app/game/RacePracticeLink.tsx` - ссылки экрана финиша (M4-2): практика ошибки судьи или тренера с гонкой для возврата, кнопка «Потренировать», возврат гонки из урока («Вернуться к уроку» и следующий урок или курс парусов); в приложении клик просит у приложения свой экран (`navigateNativeRaceFinish`).
- `src/app/game/RacePractice.render.test.tsx` - у каждого пункта судьи (кроме толкотни на старте) и у каждой ошибки тренера с видом своя ссылка с нужным href и гонкой возврата, на сайте практика открывается в новой вкладке (возврат к уроку нет), «Потренировать» ведет в практику главной ошибки и пишется с одним двоеточием, «Еще раз» остается единственной главной кнопкой, гонка урока 8 дает возврат к уроку и курс парусов, в приложении клик уходит в мост, «Вернуться к гонке» собирает ту же гонку с уроком и молчит без гонки, при подделке и в приложении.
- `src/app/game/RaceSkillBars.test.tsx` - полосы стоят под местом и временем и над главной ошибкой, тексты и десятичная запятая по языку, без cyan и без оценки одним цветом (галочка и скрытый текст только у хороших), доля VMG выше цели показана как 100%, тексты на 7 языках без тире и без слова «лейлайн», единицы как в HUD.
- `src/app/game/GameClient.practice.test.tsx` - настоящий GameClient отдает экрану финиша гонку возврата для практики: уровень и ветер, миссию, день ежедневной гонки и урок 8, из которого открыта гонка; у пробной метрической гонки возврата нет (и ссылок на практику тоже).
- `src/app/game/GameClient.replay.test.tsx` - настоящий GameClient открывает повтор с экрана финиша сразу с проигрыванием с начала, а из пункта разбора на его моменте; повтору уходят события журнала и пункты судьи для ленты; без повтора (меньше пяти сэмплов) кнопок «Посмотреть» нет; по умолчанию (история в приложении) повтор открывается на паузе с начала.
- `src/app/game/GameClient.skills.test.tsx` - настоящий GameClient на финише меряет журнал гонки против той же поляры, что цель скорости в HUD, и отдает полосы экрану финиша; передает время пересечения старта из цикла, в слабый ветер меряет по поляре слабого ветра, в пробной метрической гонке полос нет и ничего не меряется; во время гонки ничего не меряет.
- `src/app/game/GameClient.medals.test.tsx` - настоящий GameClient на финише (M4-5) отдает экрану результатов трассу этой гонки и флаг подсказок из того же ref, что пишет цикл; у пробной гонки медали нет; «Еще раз» сбрасывает флаг подсказок, так что подсказки прошлой гонки не снимают золото со следующей.
- `src/app/game/GameClient.home.test.tsx` - настоящий GameClient (M4-6) отдает циклу гонки день гонки дня из ссылки `?daily=`, а вне гонки дня никакого дня, поэтому законченная гонка дня отмечается в `regatta.race.home.v1` и лобби больше ее не предлагает.
- `src/app/game/RaceScreens.test.tsx` - статический рендер брифинга и финиша (testid, тексты, выбор трассы пробной гонки, сход, статус нативного сохранения).
- `src/app/game/GameClient.loop.test.tsx` - GameClient вызывает `useRaceLoop` один раз за рендер с состоянием гонки и теми же refs, которые пишут команды кабины (руль, курс и автопилот, трим, пауза); передает циклу и фазам звукового фона тот же объект, движение шкота дает трещотку лебедки, а переход в Pro с тримом экипажа нет.
- `src/app/game/RaceCockpit.camera.test.tsx` - кокпит гонки: касание холста сцены меняет камеру по кругу, касание HUD и жесты нет, кнопка камеры в строке состояния с локализованным названием.
- `src/app/game/RaceCockpit.tabs.test.ts` - race dock tabs: labels never break inside a word (flex row, automatic min-content minimum, no overflow-wrap:anywhere), 44 px targets for text and icon tabs.
- `src/app/game/RaceCockpit.dock.test.tsx` - F2: панель «Руль» закреплена (класс pinned только на вкладке «Руль»; CSS: overflow hidden, touch-action none, перекрывает старый overflow-y:auto), кокпит разрешает только вертикальную прокрутку (без щипка и двойного касания), остальные вкладки прокручиваются в своей панели, страница во время гонки не прокручивается (`body[data-game-layer]` и `body[data-race-scroll-lock]` в `src/app/globals.css`), ползунки Pro раскладываются под закрепленную панель, кнопки выбора в настройках переносятся целиком, текст дока 16 px, второстепенный 14 px (подписи штурвалов, подпись карты, единицы строки состояния, показатели мультиплеера), подписи штурвалов укладываются в 50 px резерва колоды, плавающая подсказка тренера на телефоне не выше 80 px, шестеренка 22 px.
- `src/app/game/RaceScreens.cyan.test.tsx` - cyan only on actions: briefing course chart inks (COURSE_PREVIEW_INK), nickname prompt and replay share card as neutral panels.
- `src/app/game/race-start-trim.ts` - стартовый трим Pro, если игрок не трогает шкоты: тот же поиск trimForDrive на курсе бейдевинд при скорости в четверть истинного ветра; паруса не заполаскивают и не срываются, тренер трима говорит "хороший трим" (вызывается из initRace).
- `src/app/game/GameClient.startTrim.test.tsx` - каждая новая гонка на странице начинается со шкотов из `raceStartTrim` для ветра гонки и курса старта; возврат к старому расчету для лодки на месте ломает тест.
- `src/app/game/race-terms.test.ts` - race mark terms per language (FR bouée, DE Bahnmarke) and the touched-mark toast named as in the judge debrief, across race-copy, finish summary, pause, judge, map and event texts
- `src/app/multiplayer/MultiplayerLobby.test.tsx` - static render of the lobby screens: back link to /race in 7 languages, Create never disabled with its status line, no text under 14 px, share versus copy label, neutral room code, badge and inputs.
- `src/app/multiplayer/MultiplayerLobby.tsx` - the two /multiplayer lobby screens (MultiplayerMenu before a room, MultiplayerRoom inside one), split from MultiplayerClient (M2-8). Back link to the Race section, a Create button that is never disabled with the missing piece named under it, text at least 14 px, share-code button, cyan only on actions and the selected setting. F5: the menu has a secondary "How to race" button that opens the race intro on request; multiplayer never opens it by itself.
- `src/app/multiplayer/lobby.test.ts` - lobby rules: blockers, default name valid in all 7 languages and stable per session, share sheet / cancel / copy fallback / failure outcomes.
- `src/app/multiplayer/lobby.ts` - pure lobby rules (M2-8): createLobbyBlocker (what still stops Create), defaultSailorName (localized default nickname from the session id, passes sanitizeNickname), shareRoomInvite/canShareNatively (navigator.share, else copy to the clipboard, cancel is not a failure).
- `src/components/HelpOverlay.test.ts` - help overlay keys: capture-phase listener; Escape closes an open overlay and stops there (the race pause never sees it); closed overlay leaves Escape to the page.
- `src/features/race-3d/rival-lod.test.ts` - число draw calls ближнего соперника по GLB (50 -> 22), треугольники дальней лодки (66), размеры по узлам GLB, грани наружу, слияние и откат на живых объектах three.
- `src/features/race-3d/rival-lod.ts` - дешевые соперники (M2-6): слияние статичных мешей соперника по материалу (общая геометрия на весь флот) и дальняя лодка: корпус в цвете соперника, киль, рубка, мачта, два плоских паруса.
- `src/features/race-hud/radar.test.ts` - radar zoom tests
- `src/features/race-hud/radar.ts` - radar zoom of the corner mini-map: centred on the player, north up, holds the next mark and the two nearest rivals, minimum 5 hull lengths, whole zoom steps (M2-4)
- `src/features/race-scene/TacticalOverlay.tsx` - in-scene no-go wedge, mark-zone ring, course boundary line with band, and the DOM edge arrow and boundary hint over the canvas
- `src/features/race-scene/camera-switch.test.ts` - контракты M2-1: порядок смены камер, касание против перетаскивания, щипка и долгого нажатия, следование курсу и возврат камеры «За кормой», один переход при «Уменьшить движение».
- `src/features/race-scene/edge-arrow.test.ts` - arrow math and the M2 done-criterion (mark in frame or arrowed after a 90-degree turn, all camera presets, 390x844 and 844x390)
- `src/features/race-scene/edge-arrow.ts` - screen math of the 44 px arrow to an off-screen next mark: HUD insets, behind-camera mirroring, ray to the clear band
- `src/features/race-scene/quality.test.ts` - лестница качества, память на устройстве, губернатор времени кадра, частота отрисовки на паузе, порог дальнего соперника, на low нет брызг и тряски, и подключение в RaceScene (dpr числом, отрисовка через ворота, прогрев шейдеров, тряска через `createSceneShake` с пропсами `contactId` и `started`).
- `src/features/race-scene/tactical-overlay.test.ts` - static checks of the overlay wiring: model passed, no per-frame allocations, geometry once per model, no cyan, 44 px arrow, 7-language hint
- `src/features/race-scene/tactics.test.ts` - model, sizes, wedge angles, zone and boundary distance tests, including the actual stepBoat clamp
- `src/features/race-scene/tactics.ts` - one helper from the active race model (legacy or physical trial) to tactical sizes in metres, no-go wedge angles, mark zone, course boundary (the stepBoat or physicalCourseWaterBounds clamp) and the early boundary hint (M2-2, M2-3)
- `src/features/simulator-3d/model-optimize.test.ts` - отгруженная модель уже оптимизирована (повторный прогон не меняет байты), координаты остались только у паруса, остальные атрибуты, индексы, morph-цели и картинка совпадают байт в байт.
- `src/features/simulator-3d/model-optimize.ts` - уменьшение GLB без декодера (M2-7): убирает текстурные координаты у поверхностей без текстуры и переупаковывает байты; запускать после экспорта из Blender: `node --experimental-strip-types src/features/simulator-3d/model-optimize.ts public/models/regatta_sloop_sailing.glb`.
- `src/app/game/race-diagnostic-summary.ts` - race.summary для журнала диагностики: `raceSummaryDiagnostics()` превращает конец гонки в две ограниченные строки (result: источник настройки, режим, уровень, ветер, место, финишировавшие боты, время, штрафы, удержание финиша, звук, ориентация; debrief: повороты, фордевинды, мертвая зона, пропущенный знак, контакты, толкотня, нарушения по судье, оценка и главная ошибка тренера), `withJudgeIncidents()` берет число пунктов разбора судьи; без имен и свободного текста.
- `src/app/game/race-diagnostic-summary.test.ts` - строки race.summary: счет по настоящему журналу и событиям правил, число судьи с ограничением, пробная гонка без контактов и пропущенного знака, принимаются строгим кодеком.
- `src/app/game/useRaceSoundscape.ts` - фазы звукового фона одиночной гонки (M3-2): звучит только в отсчете и гонке без паузы и при включенном звуке, на результатах, в повторе, меню, брифинге, на паузе и без звука молчит; при размонтировании гонки останавливается.
- `src/app/game/useRaceSoundscape.test.ts` - фазы гонки, пауза и звук включают и выключают фон, повторный рендер ничего не шлет, размонтирование останавливает его ровно один раз.
- `src/app/game/useRaceLoop.soundscape.test.ts` - настоящий цикл гонки кормит звуковой фон не чаще 10 раз в секунду одним переиспользуемым объектом, паруса хлопают в мертвой зоне в обоих режимах и при заполаскивании только в Pro, тишина при выключенном звуке и на паузе, удар при контакте.
- `src/app/game/useRaceLoop.recall.test.ts` - настоящий цикл гонки сообщает ранний старт игрока ровно один раз и его исправление после возврата за линию; чистый старт и гонка без правил не сообщают ничего (M3-3).
- `src/app/game/useRaceLoop.haptics.test.ts` - настоящий цикл гонки просит вибрацию при контакте, огибании знака игроком и его финише, ровно по одной на событие; руль, клавиши, поворот, шкоты и пауза не вибрируют (M3-4).
- `src/app/game/useRaceLoop.hints.test.ts` - M4-7: настоящий цикл гонки показывает подсказку мертвой зоны лодке, простоявшей против ветра 3 с, один раз за гонку, молчит для уже показанной на устройстве и в пробной гонке, после «Показать подсказки снова» показывает ее снова в той же гонке
- `src/app/game/useRaceLoop.summary.test.ts` - конец гонки (лимит и финиш) пишет race.lifecycle timeout или finish, finish-hold и обе строки race.summary, результаты, тренер и экран результата не меняются.
- `src/app/game/GameClient.diagnostics.test.tsx` - страница гонки: пауза и «Продолжить» с источником и фазой, вопрос о выходе, «Остаться» и подтвержденный выход, «Заново» с источником настройки.
- `src/app/game/race-mode-labels.ts` - подписи Обычный / Pro на 7 языках, отдельным модулем, чтобы таблица лучших не тянула все тексты гонки; `src/app/game/race-copy.ts` реэкспортирует их.
- `src/components/bundle-dedupe.test.ts` - стережет дедупликацию клиентского бандла: рантайм next/dynamic остается в корневом layout через `src/components/ClientErrorReporter.tsx`, таблица лучших не импортирует `src/app/game/race-copy.ts`.
- `src/app/game/GameClient.feedback.test.tsx` - GameClient sends loop events, rule and missed-mark notices and contacts into the bus and the bus into the cockpit
- `src/app/game/GameClient.layer.test.tsx` - the actual GameClient: 100dvh in countdown/race/replay, header-height layout elsewhere, Restart wired to a new countdown
- `src/app/game/GameClient.haptics.test.tsx` - настоящий GameClient дает кокпиту переключатель «Вибрация» только там, где вибрация возможна (сенсорный браузер с `navigator.vibrate` или WebView приложения с флагом `__REGATTA_RACE_HAPTICS__`), с сохраненным выбором; на компьютере и в старой сборке приложения его нет (M3-4).
- `src/app/game/GameClient.hints.test.tsx` - M4-7: настоящий GameClient отдает циклу запись подсказок первой гонки и showHint, который кладет текст подсказки в шину отзывов (источник `hint` с id), а кокпиту «Показать подсказки снова», которое очищает запись
- `src/app/game/GameClient.startSignals.test.tsx` - настоящий GameClient отдает свой отсчет общим стартовым сигналам (ничего до первого кадра сцены, секунды 3-2-1 нарисованного отсчета, ноль в гонке, новый ключ при рестарте), играет отзыв через тот же playStartSignal только при раннем старте и не показывает флаг X при выключенных правилах (M3-3).
- `src/app/game/GameClient.sceneEffects.test.tsx` - настоящий GameClient сообщает 3D-сцене выстрел старта (`started`: false в отсчете, true в гонке) и номер текущего касания с шины обратной связи (`contactId`), из них сцена делает короткую тряску камеры (M3-5).
- `src/app/game/GameClient.setup.test.tsx` - actual race page wiring: lobby start, "i", briefing start marking the course seen, "Again" straight to the countdown
- `src/app/game/GameMenu.test.tsx` - lobby static render on the site and in the app: one primary start, "i" button, no duplicate mode/venue in the app; M4-2: ссылка с уровнем и ветром открывает «Свободную гонку» на каждом монтировании и не сбрасывает их на значения «Первой гонки»
- `src/app/game/LobbyVenues.tsx` - race lobby venue cards (shore palette strip, name, place) and shore switch on the site, same storage as useVenue
- `src/app/game/RaceCockpit.feedback.test.tsx` - cockpit: countdown over the scene and not in the dock notice, start flags with the countdown and flag X on recall (M3-3), bus in the scene, speed against target in 3 languages, CSS motion and colour rules
- `src/app/game/RaceFinishPlate.tsx` - the small place plate over the 3D scene during the finish hold (RaceFinishHoldPlate is mounted by GameClient)
- `src/app/game/RaceFinishSlots.tsx` - слоты экрана результата для M4: «Посмотреть ошибку» (M4-3) открывает повтор за 5 с до главной ошибки тренера, если она один момент и повтор есть; «Потренировать» (M4-2) открывает практику главной ошибки тренера, без нее ничего не рисует (слот полос навыков стал `src/app/game/RaceSkillBars.tsx` в M4-1)
- `src/app/game/WatchMomentButton.tsx` - кнопка «Посмотреть момент» под пунктом судьи и ошибкой тренера и «Посмотреть ошибку» на финише (M4-3): отдает странице время момента, повтор открывается за 5 с до него.
- `src/app/game/RaceWatch.render.test.tsx` - «Посмотреть момент» у каждого пункта судьи (и у толкотни на старте) и у ошибки тренера, которая один момент, «Посмотреть ошибку» у главной ошибки, без cyan и при одной главной кнопке «Еще раз»; у ошибки на всю гонку, без повтора и без обработчика кнопки нет; нажатие отдает время момента.
- `src/app/game/RacePauseSheet.tsx` - pause sheet over the dimmed scene: Continue, Restart, Race settings, Full screen, Exit with confirmation
- `src/app/game/race-finish-hold.test.ts` - tests of the finish hold: the scene holds after a finish, no hold after a timeout, an exit or a new race is never undone
- `src/app/game/race-finish-hold.ts` - M1-4 finish hold: FINISH_HOLD_MS (2.5 s), the plate store and scheduleFinishedScreen(), which the race loop calls instead of setGameState('finished') (a timeout shows the results at once)
- `src/app/game/race-finish-summary.test.ts` - tests of the result numbers, gap and place formatting, and that every text exists in 7 languages
- `src/app/game/race-finish-summary.ts` - result screen numbers and 7-language texts: place, gap to the winner, difference to the record, place ordinals, DNF texts and tips
- `src/app/game/race-fullscreen.test.ts` - full-screen support detection and the offered-once flag
- `src/app/game/race-fullscreen.ts` - desktop full-screen offer: support check, click-only request, offered-once flag `regatta.race.fullscreen-offer.v1`
- `src/app/game/race-layer.test.ts` - game-layer phases and pause keys
- `src/app/game/race-layer.ts` - which race phases use the game layer (countdown, racing, replay) and the desktop Esc/P pause-key rule
- `src/app/game/race-pause-copy.ts` - 7-language texts of the race status row and the pause sheet (kept outside the pinned useRaceCopy)
- `src/app/game/race-prefs.ts` - Simple/Pro and assistance preferences of the race, plus the `useRaceSound()` hook for race sound (M1-5).
- `src/app/game/race-setup-flow.test.ts` - routing table for start/info/again/restart/resume, per-course seen storage, malformed and throwing storage, hand-off rule
- `src/app/game/race-setup-flow.ts` - one race setup (M1-1): where a start request goes (briefing or countdown), the per-device seen-briefing record (`regatta.race.briefing-seen.v1`, try/catch plus session memory) and the app hub hand-off rule
- `src/app/leaderboard/LeaderboardTable.tsx` - один список мест: медали вместо эмодзи, переносимые ники, своя строка без циана, штраф в единицах языка.
- `src/app/leaderboard/leaderboard-copy.ts` - тексты таблицы лучших на 7 языках (tl).
- `src/app/leaderboard/leaderboard-model.ts` - запросы таблицы лучших (классифицированный режим, результаты без режима, миссия) и формат времени.
- `src/app/leaderboard/leaderboard.test.tsx` - режимы не смешиваются в одной таблице, 7 языков, цели 44 px, без обрезки, эмодзи и циана.
- `src/components/game-layer.test.tsx` - game layer claim/release and the header hidden only while claimed; F2: блокировка прокрутки страницы для гонки (claimRaceScrollLock) держится, пока есть хоть одна, и не прячет шапку
- `src/components/game-layer.ts` - M1-2 game-layer store: the race claims the viewport (claimGameLayer), Navigation hides the site header (useGameLayer), mirrored as `data-game-layer` on <body>; F2: claimRaceScrollLock (`data-race-scroll-lock` на <body>) запрещает прокрутку страницы во время мультиплеерной гонки, шапка сайта остается
- `src/features/race-hud/RaceFeedbackLayer.module.css` - feedback layer styles: toast stack position and tones, big start countdown, start flags (under the status row, at the bottom in a short landscape scene, no animation), contact frame (flash only with prefers-reduced-motion: no-preference), speed against target colours
- `src/features/race-hud/RaceFeedbackLayer.tsx` - layer over the race scene: toasts near the boat (live region) and the red contact frame; no hooks, no taps
- `src/features/race-hud/RaceHud.test.tsx` - SpeedCard пишет знак узлов на языке игрока (уз, w., nd, kn).
- `src/features/race-hud/RaceIcons.test.tsx` - иконки локальные, в currentColor, скрыты от экранного диктора; медаль с локализованным названием места.
- `src/features/race-hud/RaceIcons.tsx` - line SVG icons for the race screens instead of emoji (trophy, check, alert, hint, compass, share, replay, camera, flag, target, plus, minus, close, expand, numbered medal), aria-hidden, currentColor; now used by RaceResults, RaceBriefing and GameMenu
- `src/features/race-hud/RaceSoundToggle.test.tsx` - static render test of the race sound toggle: languages, aria-pressed, 44 px, cyan only while on.
- `src/features/race-hud/RaceSoundToggle.tsx` - race sound toggle: 44 px button with a speaker icon, name in 7 languages, aria-pressed, cyan only while on; icon-only for the status row, a row with text for the pause sheet.
- `src/features/race-hud/RaceHapticsToggle.tsx` - переключатель «Вибрация» (M3-4) рядом со звуком гонки: строка 44 px в меню паузы, хук `useRaceHaptics()` с выбором и доступностью (показывается только в WebView приложения, объявившего обработчик, или в сенсорном браузере с `navigator.vibrate`; переоценивается по `regatta-embed`), название на 7 языках, циан только во включенном состоянии.
- `src/app/game/RaceCockpit.haptics.test.tsx` - переключатель «Вибрация» стоит сразу после звука гонки в меню паузы и в настройках гонки, привязан к выбору и не показывается без вибрации на устройстве (M3-4).
- `src/app/game/RaceCockpit.hints.test.tsx` - M4-7: в настройках гонки кнопка «Показать подсказки снова» (44 px) с пояснением, что медаль за подсказки не снижается; нажатие вызывает сброс страницы и подтверждает его; без сброса страницы кнопки нет
- `src/features/race-hud/RaceHapticsToggle.test.tsx` - языки, aria-pressed, 44 px, циан только при включении, доступность по устройству, включено по умолчанию и сохранение выбора для своей поверхности.
- `src/features/race-hud/RaceStartFlags.tsx` - стартовые флаги над сценой (M3-3): флаг класса и флаг P с отсчетом в порядке RRS 26, флаг X при раннем старте игрока; маленький встроенный SVG, одно имя (aria-label) на 7 языках, цвета сигнальных флагов (без циана), без анимации и без нажатий.
- `src/features/race-hud/RaceStartFlags.test.tsx` - имена флагов на 7 языках ровно по одному разу (без SVG title), пустой рендер без флагов, без внешних файлов, циана и анимации.
- `src/features/race-hud/useStartSignals.ts` - хук стартовых сигналов экрана гонки (M3-3): секунда отсчета -> гудок, короткие сигналы, выстрел через общий `playStartSignal`; пауза и повторный рендер ничего не повторяют, новый ключ заезда начинает с гудка.
- `src/features/race-hud/useStartSignals.test.ts` - 3-2-1-0 дает гудок, два коротких и выстрел, пауза ничего не повторяет, новый заезд снова с гудком.
- `src/features/race-hud/useStartSignals.haptics.test.ts` - на экране одиночной гонки вибрирует только выстрел, один раз; гудок и короткие сигналы нет (M3-4).
- `src/features/race-hud/boat-colors.test.ts` - проверка цветов лодок по токенам globals.css: не акцент, контраст 3:1, различимость игрока при протанопии, дейтеранопии и тританопии.
- `src/features/race-hud/boat-colors.ts` - цвета лодок гонки: фиолетовый игрока PLAYER_COLOR и шесть цветов флота FLEET_COLORS; не циан, контраст 3:1 на темной и светлой теме, игрок отличим от флота и при дальтонизме (M1-7).
- `src/features/race-hud/feedback.test.ts` - bus contract: ordering, priorities, queue and expiry, same-source replacement, reduced motion; M4-7: the hint is shown alone, the tack cost and race events it holds back come right after it, a hint waits behind a rule notice for as long as it is up and is never shown next to another toast
- `src/features/race-hud/feedback.ts` - race feedback bus (M1-3): toasts with source, priority, tone and duration; up to 2 on screen in priority order, a short queue, the contact frame (flash or still under reduced motion); pure. M4-7: a first race hint (source `hint`, 6 s) is shown alone: it waits behind a rule notice and sends the race events on screen back to the queue; a queued message held back by what is on screen (race events behind a hint, a hint behind a rule notice) does not age, its 2 s wait counts from when the holder leaves
- `src/features/race-hud/race-cues.test.ts` - tack cost reported at the minimum in a real stepBoat tack; contact once per contact, not in the start jostle
- `src/features/race-hud/race-cues.ts` - when the solo race raises a cue: the cost of a tack at the speed minimum (watchTurn), the contact frame (playerTouching, contactCue with cooldown and start jostle silence)
- `src/features/race-hud/first-race-hints.ts` - M4-7: подсказки первой гонки в момент (мертвая зона: стоит в ней 3 с, переход ветра с ходом сбрасывает отсчет; первый поворот оверштаг, подход к верхнему знаку, расхождение с лодкой другого галса по правилу 10): чистые триггеры (каждая один раз за гонку, не чаще раза в 9 с, только в идущей одиночной гонке), запись показанных на устройстве `regatta.race.hints-seen.v1` и сброс; для золота не считаются (решение 8)
- `src/features/race-hud/first-race-hints.test.ts` - M4-7: каждый триггер срабатывает один раз в своей ситуации, молчит на отсчете и для показанных, пауза между подсказками длиннее тоста; запись на устройстве, порченая строка, запрет хранилища, сброс; ключ в списке моста приложения; тексты на 7 языках без тире и без лейлайна
- `src/features/race-hud/useFirstRaceHints.ts` - M4-7: React-обвязка подсказок первой гонки: запись для цикла (ref с ревизией), showHint в шину отзывов, отметка «показана» только когда тост пробыл на экране 2 с без паузы (`paused` из GameClient), «Показать подсказки снова»
- `src/features/race-hud/useFirstRaceHints.test.ts` - M4-7: подсказка уходит в шину тостом `info` с id; ожидающая в очереди не считается показанной, на экране записывается через 2 с чтения; истекшая за паузой не записывается, чтение до паузы засчитывается; сброс очищает строку и поднимает ревизию
- `src/features/race-hud/speed-target.ts` - speed against the polar target (on, near, below, none) and the translated target speed label
- `src/features/race-hud/units.ts` - знаки единиц гонки на 7 языках (уз / w. / nd / kn, с / s, м / m) и форматтеры скорости, дистанции, штрафа и отрыва; единый источник для race-copy, navigation-copy и текстов событий (M1-7).
- `src/features/race-hud/useRaceFeedback.ts` - React hook for the bus: state, post, contact, clear, one timer to the next change
- `src/app/game/GameClient.navigation.test.tsx` - реальное меню на семи языках, отсутствие native-only ссылки на сайте и переход через offline Link bridge в нативный раздел гонок.
- `src/app/game/GameMenu.tsx` - race lobby (M1-6): race frame image (site), presets, free/mission choices, mode picker (site) or read-only mode (app), venue cards, one sticky primary start plus an "i" briefing button; a link with its own level and wind (the way back from a debrief practice, M4-2) opens on "Free race" with them; M4-6 (site only): the next-step card on top (`src/app/game/RaceNextStep.tsx`), the daily race entry under the presets, the separate medal line only when the card is not the medal step; F1: the easy preset and the start say "First race" / "Start your first race" only until this browser has raced (`readRacedBefore` in `src/app/game/RaceNextStep.tsx`), then "Easy race" / "Start the race" (`src/data/race-start-copy.ts`); F5: a secondary "How to race" button under the heading reopens the race intro (`src/features/race-hud/RaceIntro.tsx`)
- `src/app/game/config.ts` - реэкспорт уровней сложности из `src/data/race-difficulty.ts` для старых импортов веба.
- `src/data/race-difficulty.ts` - уровни сложности гонки (число соперников, `aiSpeedMul` по ADR-0007, подписи на 7 языках), общие для веба и раздела Гонка в приложении; лежит в `src/data`, потому что Metro не видит `src/app`.
- `src/app/multiplayer/page.tsx` - серверная обертка мультиплеера.
- `src/app/multiplayer/MultiplayerClient.tsx` - лобби, код комнаты, гонка по WebSocket; каждое сообщение сервера идет и в стартовые сигналы (M3-3), свои знак, финиш и вход в мертвую зону из событий `state` звучат теми же звуками, что в одиночной гонке (M3-3), а свои знак и финиш вызывают вибрацию (M3-4); звуковой фон своей лодки (ветер, вода, шлепки, хлопанье) идет через `useMultiplayerSoundscape` (хвост M3-2); F3: пишет след своей лодки для большой карты (`recordTrackPoint`, раз в секунду, новый на каждом отсчете).
- `src/app/multiplayer/start-signals.ts` - стартовые сигналы мультиплеера из событий отсчета сервера (M3-3) через тот же cue и тот же `playStartSignal`, что и одиночная гонка; несколько сообщений в секунду дают каждую секунду один раз, вошедший после старта выстрела не слышит, возобновление сессии (`joined` и текущая фаза) не повторяет ни выстрел, ни гудок, выход из комнаты сбрасывает отсчет.
- `src/app/multiplayer/start-signals.test.ts` - 5-секундный отсчет сервера дает гудок, четыре коротких и выстрел, выстрел по фазе racing без нулевого сообщения, тишина для вошедшего в идущую гонку, возобновление сессии после старта без выстрела и во время отсчета без повторного гудка, новый отсчет снова с гудком.
- `src/app/multiplayer/haptics.ts` - события вибрации и звука мультиплеера: для вибрации (M3-4) из событий `state` сервера берет только огибание знака и финиш своей лодки; для звука (M3-3, `playerSoundEvents`) еще и вход своей лодки в мертвую зону (`no-go-entered`); контакта сервер не сообщает, поэтому ни вибрации, ни звука контакта в мультиплеере нет.
- `src/app/multiplayer/haptics.test.ts` - только свои знак и финиш, ничего до получения id; звук только на свои знак, мертвую зону и финиш; выстрел серверного отсчета вибрирует один раз, гудок, короткие сигналы и возобновление в идущей гонке нет.
- `src/app/multiplayer/MultiplayerClient.haptics.test.tsx` - настоящая страница мультиплеера вибрирует только на свои знак и финиш из событий `state`, играет звуки знака, мертвой зоны и финиша только своей лодки (M3-3), ничего до сообщения `joined`, и отдает стартовые сигналы серверного отсчета в вибрацию выстрела (M3-4).
- `src/app/multiplayer/MultiplayerCockpit.dock.test.tsx` - F2: в мультиплеере панель «Руль» закреплена на отсчете и в гонке (вкладки «Карта», «Настройки» и результаты после финиша прокручиваются в своей панели), шестеренка 22 px, пока кокпит на экране страница не прокручивается и стоит в начале, после ухода блокировка снимается.
- `src/app/multiplayer/MultiplayerCockpit.haptics.test.tsx` - в настройках мультиплеера «Вибрация» стоит сразу после звука гонки, привязана к сохраненному выбору, скрыта на компьютере и в сборке приложения без флага, переключение сохраняется для поверхности multiplayer (M3-4).
- `src/app/multiplayer/MultiplayerClient.startSignals.test.tsx` - настоящая страница мультиплеера передает сообщения сервера стартовым сигналам: отсчет звучит через тот же playStartSignal (M3-3).
- `src/app/multiplayer/useMultiplayerSoundscape.ts` - звуковой фон мультиплеера (хвост M3-2, ADR-0019): то же отображение `src/lib/race-soundscape.ts` и тот же рантайм, что в одиночной гонке, на каждый кадр HUD (не чаще 10 раз в секунду) для своей лодки: вымпельный ветер из показания ветра HUD, скорость сервера, левентик внутри угла мертвой зоны; крен 0 и режим Simple, потому что сервер крен не сообщает и сам триммит паруса. Звучит только в отсчете и гонке со звуком и без переподключения, пока своя лодка не финишировала (сервер замораживает финишировавшую лодку, а комната ждет остальных); после своего финиша, на итогах, в лобби, меню и при переподключении молчит, при размонтировании останавливается.
- `src/app/multiplayer/useMultiplayerSoundscape.test.ts` - на поддельном рантайме: включение до первого обновления, одно обновление на кадр HUD, один объект целей, ветер и вода слышны, ветер громче и ярче в бейдевинд, чем на фордевинд при том же истинном ветре (вымпельный ветер HUD), истинный ветер без показания HUD, хлопанье в левентике и нет на полном курсе, вода громче на скорости, тишина после своего финиша при идущей гонке, тишина на итогах, в лобби и меню, при переподключении и выключенном звуке, ничего без кадра или своей лодки, остановка ровно один раз при размонтировании.
- `src/app/multiplayer/MultiplayerClient.soundscape.test.tsx` - настоящая страница мультиплеера отдает звуковому фону те же фазу, переподключение, кадр и показание ветра, что и кабине (кадр и показание засеяны объектами-метками, статический рендер их сам не заполняет), и переключатель «Звук гонки», во всех фазах, включая меню и лобби.
- `src/app/multiplayer/MultiplayerClient.sceneEffects.test.tsx` - настоящая страница мультиплеера передает 3D-сцене `started` false во время серверного отсчета и на итогах и true в гонке, так что тряска камеры от выстрела бывает один раз (M3-5).
- `src/app/leaderboard/page.tsx` - таблица лучших: Обычный и Pro в отдельных таблицах свободной гонки, результаты без записанного режима отдельным свернутым списком, миссии с пометкой; раскладка на 390 px.
- `src/app/r/[code]/page.tsx` - страница реплея по 6-символьному коду.
- `src/app/r/[code]/ReplayViewer.tsx` - проигрыватель реплея по ссылке: шапка с кодом и результатом, сам повтор (скорости и лента событий из сохраненного журнала) в `src/app/game/RaceReplay.tsx`.
- `src/app/stats/page.tsx` - вход в админку, за basic-auth из `src/proxy.ts` и повторной проверкой `checkAdminAuth()` в самой странице (без нее 404).
- `src/app/stats/StatsDashboard.tsx` - панели: страны, устройства, источники, время на странице, воронка гонки (отсчет, первый поворот, первый знак, конец, финиш, повтор).
- `src/app/stats/FeedbackAdmin.tsx` - разбор обратной связи со статусами.

### 4.4 API `src/app/api`

- `src/app/api/health/route.ts` - liveness для healthcheck Docker и nginx, без рендера и БД.
- `src/app/api/log/route.ts` - прием клиентских событий: усечение IP, allow-list `meta`, страна из заголовков.
- `src/app/api/log/route.test.ts` - контракт: всегда 204, даже на мусорном теле; неизвестные и серверные имена событий не пишутся, поля воронки проверяются.
- `src/app/api/race-result/route.ts` - запись результата гонки, лимит 60/час на сессию и 180/час на IP, правдоподобное время 20 с - 2 ч, ник через общий санитайзер.
- `src/app/api/race-result/route.test.ts` - контракт валидации входа без реальной SQLite.
- `src/app/api/leaderboard/route.ts` - выдача лучших времен по бакетам.
- `src/app/api/leaderboard/route.test.ts` - контракт: в строках нет `sid`, `isMe` только для своей cookie, плохие mission / difficulty / wind дают 400 без запроса к базе.
- `src/app/api/daily/route.ts` - миссия дня (одна на UTC-сутки).
- `src/app/api/daily/route.test.ts` - контракт: в строках нет `sid`, `isMe` только для своей cookie, строка создается только на реальную дату сегодня плюс-минус день, неверная дата дает 400, остальные даты 404.
- `src/app/api/player/route.ts` - ник игрока и его идентификатор.
- `src/app/api/player/route.test.ts` - контракт: ник пишется только для сессии с UUID, не больше 20 в час на сессию и втрое больше на IP, ник проходит через общий санитайзер.
- `src/app/api/replay/route.ts` - сохранение реплея, выдача кода; потолки размера `samples`, `events`, `course`, `missionId` только короткий слаг.
- `src/app/api/replay/route.test.ts` - контракт: потолки размера, слаг миссии, санитайзер ника, ротация cookie не снимает лимит.
- `src/app/api/replay/[code]/route.ts` - чтение реплея по коду.
- `src/app/api/coach/route.ts` - ИИ-коуч на финише, событие `coach.requested`; каждая ошибка называет вид (`no-go`, `tacks`, `close-hauled` или `other`), чтобы экран финиша дал ей практику (M4-2).
- `src/app/api/coach/sanitize.ts` - `sanitizeRaceLog()`: каждое поле лога гонки до промпта приводится к конечному числу, enum или обрезанной строке.
- `src/app/api/coach/route.test.ts` - контракт: враждебное тело дает 4xx или чистый промпт, а не исключение.
- `src/app/api/ai-chat/route.ts` - общий ИИ-чат по учебным темам.
- `src/app/api/sternik-chat/route.ts` - ИИ-разбор вопросов экзамена sternik.
- `src/app/api/feedback/route.ts` - прием обратной связи из виджета.
- `src/app/api/feedback/route.test.ts` - контракт: не строка в необязательном поле отбрасывается (без 500), длины обрезаются, категория из списка, иначе `other`; fs замокан.
- `src/app/api/support/route.ts` - заявка со страницы поддержки, уходит в Telegram.
- `src/app/api/support/route.test.ts` - контракт: обращение сохраняется в базе до Telegram и не теряется при его сбое или без настроек, IPv4 и IPv6 усекаются, текст и контакт не попадают в лог, шестое за час дает 429.
- `src/app/api/admin/feedback/route.ts` - смена статусов фидбэка для `/stats`.
- `src/app/api/admin/stats-range/route.ts` - агрегаты за период для дашборда, окно не шире 90 дней.
- `src/app/api/admin/require-admin.test.ts` - контракт: каждый админ-хендлер сам отвечает 401/403/503 без прокси.
- `src/app/api/admin/stats-range/route.test.ts` - контракт: окно шире 90 дней обрезается, плохой диапазон дает 400.
- `src/app/api/weather/route.ts` - прокси Open-Meteo: ветер, волна, течение, кэш в памяти.
- `src/app/api/weather/route.test.ts` - контракт роута погоды без сети.
- `src/app/api/gallery/like/route.ts` - лайк фото галереи.
- `src/app/api/gallery/likes/route.ts` - счетчики лайков.
- `src/app/api/og/route.tsx` - генерация OG-картинки для страниц.
- `src/app/api/og/result/route.tsx` - OG-картинка результата гонки.
- `src/app/api/radio-tts/route.ts` - синтез радиофраз (fallback, когда нет статического mp3).
- `src/app/api/radio-transcribe/route.ts` - распознавание речи для голосовых упражнений.
- `src/app/api/radio-voice/route.ts` - прием записи, транскрипция и оценка передачи; поле `venue` выбирает акваторию (позиции, марина, VTS, береговая станция в подсказке распознаванию), без него Гданьский залив.
- `src/app/api/radio-voice/voiceGrading.ts` - compatibility export of the shared pure local/API checker in `src/app/radio/voiceGrading.ts`; handler and grading contracts unchanged.
- `src/app/api/radio-voice/voiceGrading.test.ts` - тесты грейдера: обратный порядок слов не должен проходить.
- `src/app/api/ai-routes.limits.test.ts` - контракт шести ИИ-роутов (coach, ai-chat, sternik-chat, radio-tts, radio-voice, radio-transcribe): ротация cookie на одном IP пропускает ровно лимит x3, отказ не вызывает OpenAI, часовой отказ не тратит дневной бюджет, исчерпанный дневной бюджет дает дневной ответ.

### 4.5 Радиокурс SRC `src/app/radio`

Radio pages, theory, lessons, all question presentation and practice use seven public catalogs in `public/radio-locales/`. Native embeds the same catalogs. Official English protocol utterances and the exact English language-exercise answer options remain unchanged. Original Polish UKE wording is available on request. See `docs/radio-i18n.md`.

- `src/app/radio/LocalTranscriptEntry.tsx` - English transmission entry: native on-device PTT and separately labelled typed checking, with model-unavailable fallback.
- `src/app/radio/FreeSpeechPractice.tsx` - Free-practice dock: provisional on-device draft, eight session-only rows, typed fallback,45second hold, Clear and actual PTT release/cancel ownership.
- Free radio session ownership: `src/app/radio/symulator/page.tsx` increments a generation on every scenario start/reset. That generation plus the model remounts private speech state and returns the independent dock to its top; wall-clock timestamps are only elapsed-time data. The actual PTT journey in `e2e/offline.spec.ts` fixes Date while resetting and rejects old native results.
- `src/app/radio/FreeSpeechPractice.test.tsx` - Actual rendered dock/handle regressions for off/DSC gating, no model, hold limit, genuine release versus cancellation, Clear and seven-language labels.
- `src/data/radio/free-speech-copy.ts` - Seven explicit interface adaptations for free radio speech practice; English radio transmissions stay separate.
- `src/data/radio/free-speech-labels.ts` - Generated minimal source-label map; the existing radio catalogs carry all seven reviewed adaptations without shipping their full matrix in route chunks.
- `src/data/radio/free-speech-copy.test.ts` - Resolves every real generated label through the actual aliases/catalog in each of seven languages and checks exact reviewed text.
- `src/app/radio/audio/freeSpeechSession.ts` - Pure immutable eight-row/1000character in-memory transmission boundary, with no grading or persistence.
- `src/app/radio/audio/freeSpeechSession.test.ts` - Bounded Unicode/session history and immutable empty-input regressions.
- `src/app/radio/audio/speech-diagnostics.ts` - Closed speech lifecycle/outcome journal adapter; copies no transcript, audio or raw native errors.
- `src/app/radio/audio/speech-diagnostics.test.ts` - Actual canonical journal validation, private-field rejection and fail-open logging regressions.
- `src/app/radio/OriginalPolish.tsx` - Optional exact Polish UKE wording disclosure, outside localization reads.
- `src/app/radio/audio/localRecognitionSession.test.ts` - ASR regressions: segmented final results, accumulated end, PTT release and stale/cancelled sessions.
- `src/app/radio/audio/localRecognitionSession.ts` - Pure local ASR session transitions; submit only after end plus release.
- `src/app/radio/audio/localSpeech.test.ts` - Offline speech regressions: no server requests, English voice, gain, completion and cancellation.
- `src/app/radio/audio/localSpeech.ts` - Native/local English synthesis, speech token type, offline detection and cancellation.
- `src/app/radio/audio/useLocalRecognition.ts` - Radio WebView on-device ASR bridge lifecycle and capability probe, permission only on user start.
- `src/app/radio/localization/build-catalog.mjs` - Local source enumeration, stable hashed aliases, reviewed seed preservation, pruning and check/stats modes; no API calls.
- `src/app/radio/localization/context.tsx` - Radio-only seven-language provider and explicit rt/tp/tl reads; web JSON loading and native bundled catalogs.
- `src/app/radio/localization/englishExercises.ts` - Protected English explanation examples and reviewed seven-language nautical question meanings.
- `src/app/radio/localization/examText.ts` - Question presentation rules: exact English choices, preserved cloze stems and protected explanations.
- `src/app/radio/localization/protocolTerms.ts` - Protect/restore spoken English position tokens and canonicalize old bilingual source labels.
- `src/app/radio/localization/server.ts` - Server-side selected radio catalog and localized page metadata.
- `src/app/radio/localization/sources.json` - Generated enumeration of 3726 radio resources and reviewed language seeds, used by coverage checks.
- `src/app/radio/localization/text.ts` - Primitive text lookup, numeric template interpolation and cached public catalog/alias loading.
- `src/app/radio/prefs.tsx` - SRC preferences separate from sternik: selected app language, default Russian help, model and realism controls.
- `src/app/radio/symulator/audio/RadioAudioEngine.test.ts` - Station channel routing regression: wrong-channel SQL-open silence, retuning and disposal.
- `src/app/radio/voiceGrading.ts` - Pure shared scenario transmission checker used by API, web typed practice and offline voice/typed practice.

- `src/app/radio/page.tsx` - вход в курс: разделы, прогресс, слабые места.
- `src/app/radio/layout.tsx` - layout курса, скрывает лишний хром в embed-режиме.
- `src/app/radio/RadioSubnav.tsx` - навигация курса: четыре вкладки Курс, Теория, Практика (Trening), Экзамен; Obsługa, Rozmowa, Pozycja и 26 заданий подсвечивают Практику, Ściąga подсвечивает Теорию (решение владельца 2026-10-24).
- `src/app/radio/MicCheck.tsx` - проверка микрофона перед голосовыми упражнениями.
- `src/app/radio/WeakSpotsPanel.tsx` - панель "что ты стабильно путаешь".
- `src/app/radio/weakSpots.ts` - сбор слабых мест из ответов всех тренажеров.
- `src/app/radio/courseProgress.ts` - прогресс по главам курса в localStorage.
- `src/app/radio/questionProgress.ts` - прогресс по отдельным вопросам.
- `src/app/radio/runtimeSearch.ts` - строка запроса страницы: на сайте `location.search`, в офлайн-бандле приложения адрес встроенного роутера (`?scenario=`, `?kurs=1`).
- `src/app/radio/plainVoice.ts` - проигрывание реплики без радиотракта (WebAudio).
- `src/app/radio/usePushToTalk.ts` - хук push-to-talk для голосовых упражнений.
- `src/app/radio/cheatData.ts` - шпаргалка SRC/VHF-DSC, один источник для страницы и печати.
- `src/app/radio/sw.test.ts` - контракт сервис-воркера офлайн-курса.
- `src/app/radio/audio/SpeakButton.tsx` - кнопка "прослушать" фразу.
- `src/app/radio/audio/radioPlayback.ts` - двухуровневое воспроизведение: статический mp3, иначе TTS.
- `src/app/radio/audio/pregenManifest.json` - манифест предгенерированных клипов в `public/radio-audio`.
- `src/app/radio/sciaga/page.tsx` - страница шпаргалки.
- `src/app/radio/sciaga/CheatSheet.tsx` - рендер шпаргалки с озвучкой фраз.
- `src/app/radio/sciaga/scenarioTitles.ts` - польские названия сценариев для сертификата шпаргалки без импорта `src/app/radio/symulator/scenarios.ts` и модели рации; сверяет `src/app/radio/courseIds.test.ts`.
- `src/app/radio/teoria/page.tsx` - конспект теории по всем 324 вопросам UKE.
- `src/app/radio/teoria/courseData.ts` - данные теории: главы и параграфы.
- `src/app/radio/teoria/courseData.test.ts` - проверка целостности данных теории.
- `src/app/radio/teoria/courseMap.ts` - карта главы к вопросам экзамена.
- `src/app/radio/teoria/courseSupplement.ts` - дополнения, закрывающие пробелы в материалах.
- `src/app/radio/teoria/ChapterCheck.tsx` - проверка после главы.
- `src/app/radio/teoria/diagrams.tsx` - схемы теории (диапазоны, каналы, дальность).
- `src/app/radio/obsluga/page.tsx` - интерактивный курс обслуживания радиостанции.
- `src/app/radio/obsluga/InteractiveRadioCourse.tsx` - пошаговый тренажер по 15 урокам: карточка запуска на странице руководства, сами уроки на рабочем экране с закрепленной рацией (`?kurs=1` открывает его сразу, туда ведет список Практики).
- `src/app/radio/obsluga/lessonData.ts` - объяснения "почему", а не только "какую кнопку".
- `src/app/radio/symulator/page.tsx` - практика на рации ICOM (M330GE / M323), два экрана: список Практики (уроки управления, 19 сценариев по группам с номерами заданий UKE, голосовые упражнения, один переключатель Nauka / Egzamin, выбор рации в свернутом чипе) и рабочий экран сценария (закрепленная рация, под ней задание, голос, ситуация, журнал).
- `src/app/radio/symulator/RadioWorkspace.tsx` - общий рабочий экран рации для симулятора, уроков Obsługa и живого разговора: рация закреплена и ничем не закрыта, панель под ней (на десктопе рядом) прокручивается сама; хук раскладки (stacked, compact), блокировка прокрутки страницы, сообщение `radio-workspace` приложению.
- `src/app/radio/symulator/RadioWorkspace.module.css` - раскладка рабочего экрана: фиксированный экран под навигацией сайта (на телефоне поверх нее), колонки на десктопе, телефон в горизонтали.
- `src/app/radio/symulator/practiceMenu.ts` - группы списка Практики и номера заданий UKE для каждого сценария (таблица номеров, без импорта текстов `src/app/radio/zadania/tasks.ts`).
- `src/app/radio/symulator/practiceMenu.test.ts` - каждый сценарий в списке ровно один раз, ни одно задание UKE со сценарием не потеряно, таблица номеров совпадает с `src/app/radio/zadania/tasks.ts`.
- `src/app/radio/symulator/RadioFront.tsx` - передняя панель станции; `compact` укладывает те же органы управления примерно в 450px высоты (три ряда клавиш, DISTRESS и PTT рядом), чтобы рация помещалась над панелью задания на телефоне.
- `src/app/radio/symulator/radioModel.ts` - чистый конечный автомат станции по мануалам ICOM; береговая станция (`coast`) и подписи рабочих каналов (`channelLabels`) лежат в состоянии, по умолчанию Гданьский залив.
- `src/app/radio/symulator/radioModel.test.ts` - тесты автомата станции.
- `src/app/radio/symulator/scenarios.ts` - сценарии тренировки: что нажать и что сказать; `needs` (береговая станция, марина, VTS) выбирает подходящие акватории, тексты несут подстановки `{marina}`, `{marinaCh}`, `{marinaNote}`, `{vts}`, `{vtsCh}`, `{coast}`, `{area}`, проверки шагов получают акваторию.
- `src/app/radio/symulator/venues.ts` - акватории прогона (решение владельца 2026-10-24): Гданьский залив, Солент, бухта Пальма, Бодрум; только проверенные станции, MMSI и каналы, источники в шапке файла; Бодрум без береговой станции. `placeRadio`, `fillPlace`, `venuesFor`.
- `src/app/radio/symulator/venues.test.ts` - эталонная передача каждого сценария проходит грейдер в каждой своей акватории, чужая марина и неверное полушарие не проходят, данные и подстановки.
- `src/app/radio/symulator/trainerText.ts` - compatibility text/format helpers over the public seven-language catalogs; no static catalog payload in web JavaScript chunks.
- `src/app/radio/symulator/trainerText.test.ts` - каждый текст сценариев, Rozbiór и грейдера и каждая строка интерфейса переведены на все языки, подстановки, клавиши и радиофразы целы, нет запрещенной типографики.
- `src/app/radio/symulator/i18n/en.json`, `src/app/radio/symulator/i18n/es.json`, `src/app/radio/symulator/i18n/fr.json`, `src/app/radio/symulator/i18n/de.json`, `src/app/radio/symulator/i18n/it.json` - переводы текстов тренажера (сценарии, Rozbiór, пункты грейдера), ключ - польский исходник.
- `src/app/radio/symulator/i18n/ui.es.json`, `src/app/radio/symulator/i18n/ui.fr.json`, `src/app/radio/symulator/i18n/ui.de.json`, `src/app/radio/symulator/i18n/ui.it.json` - строки интерфейса тренажера на ES / FR / DE / IT, ключ - английская строка.
- `src/app/radio/symulator/scenarios.test.ts` - тесты сценариев.
- `src/app/radio/symulator/radioTraffic.ts` - кто в эфире, на каком канале и с какой силой.
- `src/app/radio/symulator/stationReply.ts` - правильный ответ станции акватории (береговая, марина, VTS) и ее рабочий канал.
- `src/app/radio/symulator/stationReaction.ts` - реакция на неверную или неразборчивую передачу.
- `src/app/radio/symulator/stationReaction.test.ts` - тесты реакций станции.
- `src/app/radio/symulator/progressStore.ts` - прогресс сценариев (`sternik.radio.progress.v1`, формат прежний): запись с проверкой чтением обратно, итог saved / failed для разбора и повтора.
- `src/app/radio/symulator/progressStore.test.ts` - ключ и формат не меняются, ошибка записи видна, повтор сохраняет попытку один раз.
- `src/app/radio/symulator/hints.ts` - подсказки по шагам сценария.
- `src/app/radio/symulator/inspectData.ts` - режим разбора: любой элемент панели объясняет себя.
- `src/app/radio/symulator/InspectPanel.tsx` - UI режима разбора.
- `src/app/radio/symulator/VoicePtt.tsx` - запись голоса по PTT и отправка на оценку.
- `src/app/radio/symulator/audio/RadioAudioEngine.ts` - синтез звука станции на WebAudio, без файлов.
- `src/app/radio/symulator/audio/radioSounds.ts` - чистая функция "событие -> звук".
- `src/app/radio/symulator/audio/radioSounds.test.ts` - тесты маппинга звуков.
- `src/app/radio/symulator/audio/stationVoice.ts` - получение речи станции, проигрывает движок.
- `src/app/radio/symulator/audio/useRadioAudio.ts` - хук подключения аудиодвижка к странице.
- `src/app/radio/rozmowa/page.tsx` - живой диалог с береговой станцией.
- `src/app/radio/rozmowa/LiveDialogue.tsx` - ход диалога и повторные вопросы станции.
- `src/app/radio/rozmowa/dialogues.ts` - тексты диалогов.
- `src/app/radio/rozmowa/dialogueGrading.ts` - чистая оценка одной реплики диалога.
- `src/app/radio/rozmowa/dialogueGrading.test.ts` - тесты грейдера диалога.
- `src/app/radio/pozycja/page.tsx` - упражнение на передачу позиции.
- `src/app/radio/pozycja/PositionDrill.tsx` - тренажер координат и формата позиции.
- `src/app/radio/pozycja/drillData.ts` - данные упражнения по позиции.
- `src/app/radio/pozycja/drillData.test.ts` - тесты данных упражнения.
- `src/app/radio/zadania/page.tsx` - 26 официальных практических заданий UKE.
- `src/app/radio/zadania/tasks.ts` - задания дословно из материалов UKE плюс наши ответы.
- `src/app/radio/zadania/tasks.test.ts` - тесты заданий.
- `src/app/radio/test/page.tsx` - пробный экзамен SRC.
- `src/app/radio/test/examModel.ts` - модель экзамена: выборка, время, порог.
- `src/app/radio/test/examModel.test.ts` - тесты модели экзамена.
- `src/app/radio/courseIds.test.ts` - сверяет списки id из `src/app/radio/courseIds.ts` и названия из `src/app/radio/sciaga/scenarioTitles.ts` с банком SRC, сценариями и главами теории.
- `src/app/radio/courseIds.ts` - id глав теории, вопросов SRC и сценариев для счетчиков прогресса на /radio без импорта самих данных.

### 4.6 Курс sternik motorowodny `src/app/sternik`

- `src/app/sternik/page.tsx` - серверный вход в курс: считает из банка числа и карту id -> категория для `src/app/sternik/SternikHub.tsx`, банк вопросов в клиент не уходит.
- `src/app/sternik/layout.tsx` - layout курса.
- `src/app/sternik/SternikSubnav.tsx` - подраздельная навигация.
- `src/app/sternik/test/page.tsx` - тренажер по банку вопросов; банк получает через `SternikBankGate`, в JS страницы его нет.
- `src/app/sternik/egzamin/page.tsx` - пробный экзамен: 75 вопросов, 90 минут, порог 65; банк тоже через `SternikBankGate`.
- `src/app/sternik/bank.ts` - загрузчик банка вопросов во время работы: один запрос на загрузку страницы, проверка формы и версии, ошибка не кешируется (Retry идет в сеть заново).
- `src/app/sternik/bank.test.ts` - тесты загрузчика: адрес версионного файла, повтор после ошибки, битый или чужой файл, один запрос на несколько экранов.
- `src/app/sternik/bank-source.ts` - откуда берется файл банка: на сайте fetch версионного JSON; офлайн-пакет iOS подменяет модуль и вшивает тот же JSON.
- `src/app/sternik/bank-reload.ts` - страница, открытая до деплоя, получает 404 на старый файл банка и один раз перезагружается (на версию файла, флаг в sessionStorage); повторный 404 показывает ошибку с "Повторить". Отдельно от `src/app/sternik/bank-source.ts`, чтобы в офлайн-пакете не было fetch.
- `src/app/sternik/bank-reload.test.ts` - одна перезагрузка на версию, без перезагрузки при сети или 503 и при недоступном sessionStorage; 404 читателя называется ушедшим файлом.
- `src/app/sternik/SternikBankGate.tsx` - состояния загрузки банка: загрузка, ошибка с кнопкой "Повторить" (7 языков, 44 px), затем экран с банком; хук `useSternikBank`.
- `src/app/sternik/SternikBankGate.test.tsx` - тесты разметки: загрузка, готовность, тихий режим, ошибка и кнопка Retry.
- `src/app/sternik/SternikBankGate.retry.test.ts` - тест хука: ошибка, Retry, второй настоящий запрос, готово.
- `src/app/sternik/quiz-utils.ts` - общие помощники тренажера и экзамена.
- `src/app/sternik/analysis.ts` - персональный разбор: слабые категории из прогресса.
- `src/app/sternik/PersonalReport.tsx` - отчет по ошибкам.
- `src/app/sternik/QuestionFigure.tsx` - рисунки к вопросам (знаки, огни, ситуации).
- `src/app/sternik/prefs.tsx` - настройки курса, читаются в эффекте плюс флаг `prefsLoaded`; `SternikLangScope` держит раздел на PL / RU, кроме маршрутов тренажера рации (`RADIO_TRAINER_PATHS`), которые идут на языке сайта.
- `src/app/sternik/plOnly.ts` - политика языка: экзаменационный контент только по-польски.
- `src/app/sternik/useFocusTrap.ts` - фокус-ловушка для модальных окон.
- `src/app/sternik/SternikChat.tsx` - ИИ-разбор вопроса, ходит в `/api/sternik-chat`.
- `src/app/sternik/teoria/page.tsx` - теория курса.
- `src/app/sternik/teoria/TheorySearch.tsx` - поиск по теории.
- `src/app/sternik/teoria/SignsWeather.tsx` - знаки и погода отдельным блоком.
- `src/app/sternik/teoria/diagrams.tsx` - схемы теории.
- `src/app/sternik/ustny/page.tsx` - подготовка к устному экзамену.
- `src/app/sternik/ustny/OralTrainer.tsx` - устный тренажер с оценкой ответа.
- `src/app/sternik/ustny/oralPrompts.ts` - вопросы и ожидаемые элементы ответа.
- `src/app/sternik/ustny/oralPrompts.test.ts` - тесты грейдера устной части.
- `src/app/sternik/SternikHub.tsx` - клиентская часть хаба /sternik: формат экзамена, прогресс по категориям, личный отчет грузится лениво; числа считает серверный `src/app/sternik/page.tsx`.

### 4.7 Общие компоненты `src/components`

- `src/components/Navigation.tsx` - основная навигация по пяти разделам (владеет Shared-лейн).
- `src/components/SiteFooter.tsx` - подвал с брендовой строкой.
- `src/components/ContentFooterNav.tsx` - переходы между контентными страницами.
- `src/components/BootcampFooterNav.tsx` - нижняя панель на страницах уроков буткемпа; стоит в корневом layout, поэтому читает только `src/data/bootcamp-index.ts` и ключ ответов, не тексты уроков.
- `src/components/LanguageToggle.tsx` - переключатель языка, пишет localStorage и cookie.
- `src/components/ThemeToggle.tsx` - переключатель темы.
- `src/components/ThemeManager.tsx` - применение темы и подписка на системную.
- `src/components/GoogleAnalytics.tsx` - GA4 поток `G-ZEWWJ4N31M`.
- `src/components/ClientErrorReporter.tsx` - `page.view`, `page.engaged`, `js.uncaught`, `js.rejection`.
- `src/components/FeedbackWidget.tsx` - виджет обратной связи, шлет в `/api/feedback`; где он скрыт, решает `src/lib/feedback-routes.ts`.
- `src/components/HelpOverlay.tsx` - контекстная справка поверх страницы.
- `src/components/ServiceWorkerRegistrar.tsx` - регистрация сервис-воркера и офлайн-фолбэка.
- `src/components/AnatomyPosters.tsx` - два постера-инфографики на `/anatomy`.
- `src/components/YachtViewer3D.tsx` - общий просмотрщик GLB-яхты (анатомия и тренажер, метры).
- `src/components/product/ProductHub.tsx` - общий рендер хаба раздела по каталогу.
- `src/components/product/Product.module.css` - стили продуктовой оболочки.
- `src/components/product/Navigation.module.css` - стили навигации оболочки.
- `src/components/product/ProductMenu.tsx` - веб-меню каталога: группы из `src/lib/product/menu.ts`, поиск, пустой результат, цели 44px.
- `src/components/product/Home.module.css` - стили главной сайта с иллюстрацией.
- `src/components/design-v3/DesignStudio.module.css` - стили витрины.

### 4.8 Контент `src/data`

- `src/data/sailing-data.ts` - курсы относительно ветра (5), галсы, маневры (6; у оверштага и фордевинда необязательные массивы `commands*`, `steps*`, `mistakes*` для `/courses#turns`, читаются `legacyPickArray`), глоссарий (51 термин), категории, правила гонок, стратегии.
- `src/data/rules.ts` - сценарии расхождения и правил, 21 карточка (сцена, вопрос, ответ, почему).
- `src/data/anatomy.ts` - части яхты с координатами в SVG 1000x500 и подписями.
- `src/data/bootcamp.ts` - 8 уроков буткемпа по ~5 минут; голова каждого урока (id, порядок, эмодзи, название) берется из `src/data/bootcamp-index.ts`.
- `src/data/bootcamp-index.ts` - головы уроков буткемпа (источник названий на 7 языках) и копия маршрута и длины урока: их читают закладка, нижняя панель и возврат к уроку на каждой странице без текста уроков.
- `src/data/bootcamp-index.test.ts` - сверяет головы, порядок ключей (bootcamp.json приложения) и маршруты с `bootcampLessons`.
- `src/data/bootcamp-quiz-key.ts` - ключ ответов квизов буткемпа (id вопросов и вариантов, верный вариант) и порог сдачи: по нему проверяется сохраненный прогресс без текста квизов.
- `src/data/bootcamp-quiz-key.test.ts` - сверяет ключ ответов с `BOOTCAMP_QUIZZES` и один порог сдачи.
- `src/data/onboard.ts` - "первая неделя на борту", 12 разделов, в том числе выход из гавани, возвращение, типы швартовки, газ и пожар.
- `src/data/checklist.ts` - чек-лист перед выходом, 9 разделов, в том числе готовность яхты у причала.
- `src/data/missions.ts` - миссии гонки, оцениваются после финиша по логу.
- `src/data/venues/venues.ts` - акватории регат (Гёджек, Сплит, Мазуры, Солент, открытое море): берега и острова вокруг поля гонки, палитра, названия на 7 языках, ключ настройки `regatta.venue.v1` (ADR-0005).
- `src/data/venues/geometry.ts` - детерминированная геометрия акваторий: полигоны берега для гонок (всегда снаружи поля), рельеф для горизонта 3D и для 3D-гонки (`raceTerrain`: береговая линия 2D, поднятая в холмы).
- `src/data/venues/geometry.test.ts` - контракт: суша не заходит на поле, грани рельефа смотрят вверх, берег 3D дальше камеры, берег 3D-гонки начинается с линии воды 2D.
- `src/data/venues/look.ts` - свет и цвет гонки по акваториям (M3-6, доска `docs/design/game-graphics/art-board-m3.md`): высота, азимут и цвет солнца, зенит и горизонт неба, туман, вода глубокая и мелководье, экспозиция, теплота; `sceneColors` применяет теплоту один раз на процессоре (без прохода рендера) и дает воде отражение горизонта, притемненное к глубокой воде (`REFLECTION_DEPTH`, иначе светлый горизонт выбеливает воду за кормой), `sunDirection`, `venueLook` (неизвестная акватория получает открытое море), контраст по WCAG для проверки знаков. F4: `raceLight` (мягкий свет: экспозиция, солнце, блики, свечение, размер и подсветка знаков), `MARK_HALO` и `markHaloOpacity` (кольцо вокруг далекого знака, по умолчанию включено, проявляется с расстоянием).
- `src/data/venues/look.test.ts` - контракт доски: пять акваторий, все поля, цвета `#rrggbb`, экспозиция 0.9-1.1, солнце 20-65 градусов и не ближе 40 градусов к ветру, числа совпадают с таблицей доски в ее допусках, вода после теплоты сине-зеленая и не циан, знаки, линия старта, лейлайны, клин мертвой зоны, зона, граница и призрак (цвета читаются из исходников сцены) не теряют контраста к воде сверху; на воде камеры за кормой (смесь воды и отраженного неба) белое кольцо зоны, желтый пин, линия и лейлайны не темнее прежнего, оранжевые и красные отличаются цветом.
- `src/data/drills.ts` - каталог упражнений и сценариев, общий для веба и мобильного.
- `src/data/race-practice.ts` - разбор гонки -> практика (M4-2), один источник для веба и приложения: каждый урок судьи (кроме толкотни на старте) и каждый вид ошибки тренера ведет в карточку правила, урок курса «С нуля» или упражнение тренажера; названия карточек как в `src/data/rules.ts`, тексты ссылок на 7 языках.
- `src/data/race-practice.test.ts` - каждый урок судьи и каждый вид ошибки тренера ведет в существующий id (упражнение веб-тренажера, карточка, урок), названия карточек совпадают с `src/data/rules.ts` на 7 языках, тексты без тире.
- `src/data/gallery.ts` - видео и фото галереи.
- `src/data/gallery-2026.generated.ts` - автогенерация `scripts/build-gallery-year.mjs`, руками не править.
- `src/data/src-radio.ts` - официальный банк 324 вопросов UKE SRC.
- `src/data/sternik.ts` - банк sternik motorowodny: 879 вопросов, единственный редактируемый источник; реэкспортирует `src/data/sternik-core.ts`. Только сервер, скрипты и тесты: клиент получает банк из `public/sternik-bank/`. Id вопросов стабильны, не перенумеровывать.
- `src/data/sternik-core.ts` - все о банке, кроме самих вопросов: типы, категории, формат экзамена (75 вопросов, 90 минут, порог 65), индекс по id, пул экзамена, счетчики баз, проверка файла банка. Это импортирует клиент.
- `src/data/sternik-bank-file.generated.ts` - автогенерация `scripts/build-sternik-bank.mjs`: адрес, версия и число вопросов файла банка, руками не править.
- `src/data/sternik-bank-file.test.ts` - контракт файла банка: `--check` генератора, совпадение с `src/data/sternik.ts` по id и порядку, единственный файл, отказ на битом файле, запрет value-импорта банка в клиентских модулях курса.
- `src/data/polishDiacritics.test.ts` - страж правила 2 из `AGENTS.md`: польский текст банков sternik и SRC и данных радиокурса не содержит снятых диакритик (`sie`, `moze`, `ktory` и подобных).
- `src/data/sailing-lab/course.ts` - структура курса работы с парусами.
- `src/data/sailing-lab/lesson-ids.ts` - id уроков курса парусов по порядку для закладки в навигации без импорта курса (около 250 КБ чанка).
- `src/data/sailing-lab/lesson-ids.test.ts` - сверяет `src/data/sailing-lab/lesson-ids.ts` с `sailLessons`.
- `src/data/sailing-lab/mainsheet-lesson.ts` - урок по гика-шкоту.
- `src/data/sailing-lab/shape-lessons.ts` - уроки по форме паруса (оттяжка, шкаторины).
- `src/data/sailing-lab/sources.ts` - печатные источники книжных уроков (Дедекам, Das и von Krause, RYA) со ссылками; отдельно от `src/data/sailing-lab/course.ts`, чтобы не было цикла импорта.
- `src/data/sailing-lab/telltale-lesson.ts` - урок "Колдунчики": где стоят, четыре правила (рулем или шкотом), тонкая настройка и ложные тревоги.
- `src/data/sailing-lab/halyard-lesson.ts` - урок "Фал и положение пуза": складки как индикатор натяжения, фал против Каннингхема, книжные проценты пуза с оговоркой.
- `src/data/sailing-lab/jib-lead-lesson.ts` - урок "Каретка стаксель-шкота и метод кулаков": стартовая установка, верх или низ заполаскивает первым, кулаки по матрице Дедекама.
- `src/data/sailing-lab/slot-lesson.ts` - урок "Щель": грот и генуя как одно крыло, проверка щели, узкая и широкая, ложный диагноз грота.
- `src/data/sailing-lab/trim-doctor-lesson.ts` - урок "Доктор трима": угол руля как прибор (3-5 / 8 градусов), тяжелый и подветренный руль, нет остроты или скорости.
- `src/data/sailing-lab/reef-lesson.ts` - урок "Рифление": когда (крен 25, руль 8), системы, порядок слэб-рифления, ошибки, которые рвут парус.
- `src/data/sailing-lab/winch-lesson.ts` - урок 13 «Лебедка и стопор: путь нагрузки» (7 языков), практика на учебном стенде (`practice: "line-bench"`), добавлен в конец курса.
- `src/data/sailing-lab/line-bench-copy.ts` - тексты стенда лебедки и стопора: действия, причины отказа, подсказки, 7 языков.
- `src/data/sailing-lab/practice-copy.ts` - synchronous narrow return/save/status copy for practice consumers; original guideCopy keys retain identical localized objects.
- `src/data/sailing-lab/assessment-entry-copy.ts` - synchronous title/intro/twist/depth copy used by course entry without importing the full assessment runtime labels.
- `src/data/sailing-lab/lesson-guide.ts` - цели 13 уроков, результаты четырех модулей и подписи учебного пути на семи языках.
- `src/data/sailing-lab/learning-path.ts` - шаги урока (разобраться, проверить, на лодке; шаги не засчитывают урок), модули программы курса парусов по порядку уроков, термины урока.
- `src/data/sailing-lab/assessment-copy.ts` - тексты независимой проверки настройки в Тренажере (скрутка, глубина).

### 4.9 `src/features/sailing-lab` - общая сессия, риг и уроки

- `src/features/sailing-lab/runtime/session.ts` - общая сессия хождения под парусом: единая точка интеграции движка для Тренажера, 3D и мобильного.
- `src/features/sailing-lab/runtime/session.test.ts` - поведенческие тесты сессии.
- `src/features/sailing-lab/runtime/fixed-clock.ts` - фиксированный шаг интеграции, частота рендера на него не влияет.
- `src/features/sailing-lab/runtime/fixed-clock.test.ts` - тесты часов.
- `src/features/sailing-lab/runtime/step-rig.ts` - шаг сессии вместе с механикой рига.
- `src/features/sailing-lab/runtime/boat-step.ts` - один шаг лодки для Тренажера и физической гонки игрока (ADR-0014): руль, экипаж на шкотах, перенос парусов, силы и метры.
- `src/features/sailing-lab/runtime/controls.ts` - скорости изменения управляющих органов и интерполяция.
- `src/features/sailing-lab/runtime/trim-controls.ts` - перевод UI-настроек трима в величины движка.
- `src/features/sailing-lab/runtime/input.ts` - валидация входа сессии.
- `src/features/sailing-lab/runtime/math.ts` - clamp, компас, плавное приближение угла.
- `src/features/sailing-lab/runtime/wind.ts` - режимы ветра: ровный, смена, порыв.
- `src/features/sailing-lab/runtime/presentation.ts` - проекция состояния сессии в модель яхты для сцены.
- `src/features/sailing-lab/runtime/snapshot.ts` - снимок и воспроизведение сессии по событиям.
- `src/features/sailing-lab/runtime/checkpoint-storage.ts` - хранилище чекпоинтов и отдельных результатов упражнений; два фиксированных назначения native bridge.
- `src/features/sailing-lab/runtime/checkpoint-storage.test.ts` - тесты хранилища.
- `src/features/sailing-lab/runtime/trainer-checkpoint.ts` - формат и лимит чекпоинта.
- `src/features/sailing-lab/runtime/trainer-checkpoint.test.ts` - тесты чекпоинта.
- `src/features/sailing-lab/runtime/storage-protocol.ts` - контракт моста WebView и React Native.
- `src/features/sailing-lab/rig/passport.ts` - геометрия учебного рига в метрах и перевод в систему GLB.
- `src/features/sailing-lab/rig/layout.ts` - положение гика, каретки и проводка гика-шкота.
- `src/features/sailing-lab/rig/layout.test.ts` - тесты геометрии проводки.
- `src/features/sailing-lab/rig/main-trim.ts` - команды и пределы трима грота.
- `src/features/sailing-lab/rig/main-trim.test.ts` - тесты трима грота.
- `src/features/sailing-lab/rig/shape-trim.test.ts` - тесты формы паруса при работе оттяжками.
- `src/features/sailing-lab/rig/vang.ts` - геометрия и пределы оттяжки гика.
- `src/features/sailing-lab/rig/response.ts` - статус паруса и знаковый угол атаки.
- `src/features/sailing-lab/rig/transfer.ts` - перекладка парусов при повороте и перенос нагрузки.
- `src/features/sailing-lab/lessons/course.test.ts` - целостность курса уроков.
- `src/features/sailing-lab/lessons/lesson-position.ts` - отдельная версия закладки: шаг и выбранная схема каждого урока, без ответов и оценок.
- `src/features/sailing-lab/lessons/practice-results.ts` - четыре разрешенных результата упражнений; проверка и объединение, отдельно от теории и снимка сессии. Конверт `version: 1` неизменен (native bridge), измеренные попытки twist/depth лежат в необязательном `attempts` с собственной версией записи 2: до/после, число попыток, прошлая попытка; сохранение подтверждается чтением обратно.
- `src/features/sailing-lab/lessons/practice-results.test.ts` - старая запись только со временем читается как выполненная, версия записи, счет попыток без двойного счета при повторе записи, подтверждение сохранения.
- `src/features/sailing-lab/lessons/assessment-review.ts` - разбор последней попытки: целевой и побочный эффект, сравнение с прошлой попыткой (first / better / same / weaker).
- `src/features/sailing-lab/lessons/assessment-review.test.ts` - выбор строки сравнения и полнота строк разбора на семи языках.
- `src/features/sailing-lab/lessons/learning-continuity.test.ts` - сохранение места, поврежденные данные, покрытие модулей и языков, границы native bridge.
- `src/features/sailing-lab/lessons/progress.ts` - прогресс по урокам парусов в localStorage.
- `src/features/sailing-lab/lessons/diagrams.ts` - схемы урока: подписи, варианты, показания.
- `src/features/sailing-lab/lessons/mainsheet-diagram.ts` - схема урока по гика-шкоту.
- `src/features/sailing-lab/lessons/shape-diagrams.ts` - схемы уроков по форме паруса.
- `src/features/sailing-lab/lessons/telltale-diagram.ts` - схема входа генуи: какой колдунчик срывается, выводится из угла набегания потока.
- `src/features/sailing-lab/lessons/halyard-diagram.ts` - схема фала: складки у мачты и сечение с положением пуза по той же линии прогиба, что у outhaul.
- `src/features/sailing-lab/lessons/jib-lead-diagram.ts` - схема каретки: точка, где продолжение шкота встречает переднюю шкаторину, вычисляется.
- `src/features/sailing-lab/lessons/slot-diagram.ts` - схема щели сверху: ширина щели измеряется как расстояние от задней шкаторины генуи до грота.
- `src/features/sailing-lab/lessons/helm-diagram.ts` - шкала угла руля: зоны 3 / 5 / 8 градусов, те же пороги, что в тексте урока.
- `src/features/sailing-lab/lessons/reef-diagram.ts` - слэб-рифление в четырех фазах; таблица фаз задает рисунок и проверяемый порядок шагов.
- `src/features/sailing-lab/lessons/trim-study.ts` - разбор трима: фазы, замечания, наблюдения.
- `src/features/sailing-lab/lessons/trim-study.test.ts` - тесты разбора трима.
- `src/features/sailing-lab/scene/trim-rig.ts` - построение сцены рига для визуализации трима.
- `src/features/sailing-lab/scene/trim-rig.test.ts` - тесты сцены рига.
- `src/features/sailing-lab/ui/SavePractice.tsx` - явное сохранение завершенного упражнения через браузерное хранилище или native bridge, ошибка и повторная попытка; для twist/depth сохраняет измерения и сразу показывает разбор.
- `src/features/sailing-lab/ui/AssessmentReview.tsx` - разбор попытки проверки трима: до/после, причинная строка, сравнение с прошлой попыткой и повтор без подсказок (в тренажере и на странице урока outhaul).
- `src/features/sailing-lab/ui/LessonReturn.tsx` - возврат из тренажера и лодки к известному уроку по разрешенному ID, без произвольного URL.
- `src/features/sailing-lab/ui/SailingCourse.tsx` - UI курса работы с парусами.
- `src/features/sailing-lab/ui/SailingCourse.module.css` - стили курса.
- `src/features/sailing-lab/rig/line-handling.ts` - модель стенда: уже нагруженная снасть, стопор с двухступенчатым рычагом, шлаги, рукоятка, ходовой конец, self-tailer; блокировки строже реального железа, без чисел нагрузки.
- `src/features/sailing-lab/rig/line-handling.test.ts` - тесты блокировок и передачи нагрузки.
- `src/features/sailing-lab/rig/line-bench-guide.ts` - команды, подсказки, варианты действий и отчет стенда.
- `src/features/sailing-lab/rig/line-bench-diagram.ts` - SVG стенда и схема урока `winch`.
- `src/features/sailing-lab/ui/LineBench.tsx` - веб-стенд лебедки и стопора в шаге «На лодке».
- `src/features/sailing-lab/lessons/trim-assessment.ts` - независимая проверка настройки при другом ветре: скрутка при том же угле гика или меньшая глубина низа без смены скрутки; результат только в сессии.
- `src/features/sailing-lab/lessons/trim-assessment.test.ts` - тесты проверки: исходное положение, пауза, смена вида и ранние нажатия результата не дают.

### 4.10 `src/features/simulator-3d` - Лодка 3D (V2)

- `src/features/simulator-3d/README.md` - назначение и границы самостоятельного 3D-модуля.
- `src/features/simulator-3d/SimulatorV2.tsx` - обертка под Next.js для `/simulator2`.
- `src/features/simulator-3d/Simulator3D.tsx` - корневой компонент 3D-вида и панелей; на телефоне под парусом сцена закреплена, панель становится общим доком управления.
- `src/features/simulator-3d/Simulator3D.module.css` - стили 3D-вида.
- `src/features/simulator-3d/RegattaScene.tsx` - сцена R3F: свет, камера, вода, яхта.
- `src/features/simulator-3d/SceneBoundary.tsx` - граница ошибки сцены и отчет о сбое WebGL.
- `src/features/simulator-3d/Yacht.tsx` - рендер GLB-яхты и парусов; загрузка без декодеров Draco и meshopt (они тянутся с www.gstatic.com, CSP блокирует).
- `src/features/simulator-3d/glb-decoders.test.ts` - ни одна модель .glb/.gltf в `public/` не использует Draco или meshopt, и каждый `useGLTF` в `src` отказывается от обоих декодеров.
- `src/features/simulator-3d/config.ts` - конфиг модуля, URL модели.
- `src/features/simulator-3d/types.ts` - типы состояния яхты и подписей сцены.
- `src/features/simulator-3d/camera.ts` - подгонка камер: обзор, грот, шкот.
- `src/features/simulator-3d/camera.test.ts` - тесты камер, включая программный WebGL.
- `src/features/simulator-3d/offline-asset.test.ts` - проверка, что офлайн-ассет модели на месте.
- `src/features/simulator-3d/audio/useSailAudio.ts` - звук парусов и воды; слушается общей настройки звука гонки (`src/lib/race-sound-pref.ts`): пока она выключена, звук молчит и AudioContext не создается; нажатие «Звук» при выключенном звуке гонки включает его, выключение не трогает звук гонки, и каждое нажатие сначала сохраняет звук гонки явным выбором (ADR-0019; свой контекст Лодки 3D остается открытым пунктом).
- `src/features/simulator-3d/audio/useSailAudio.test.ts` - Лодка 3D при выключенном звуке гонки не включает звук и не строит контекст, при выключении звука гонки замолкает и усыпляет контекст, настройку читает без модуля звука гонки; нажатия через настоящие настройки гонки и тренажера: вкл, выкл, вкл не меняют звук гонки, старое выключение по ключу `regatta.muted.v1` снимается одним нажатием.
- `src/features/simulator-3d/ocean/Ocean.tsx` - поверхность воды; для гонки опции `roughness`, `skyReflection` (доля отраженного неба, в шейдере: при окружении сцены three.js игнорирует `envMapIntensity`), `sunGlint` (доля солнечной дорожки) и `farCalm` (волны сглаживаются вдали).
- `src/features/simulator-3d/ocean/Wake.tsx` - кильватерный след.
- `src/features/simulator-3d/ocean/Backdrop.tsx` - горы и острова акватории на горизонте Лодки 3D (низкополигональный рельеф с воздушной перспективой); `terrainGeometry` строит меш рельефа и для 3D-гонки.
- `src/features/simulator-3d/ocean/WindFlow.tsx` - видимый поток ветра.
- `src/features/simulator-3d/ocean/waves.ts` - поле волн (сумма синусов), общее для воды и качки.
- `src/features/simulator-3d/physics/useSailingSim.ts` - подключение общей сессии к сцене, телеметрия, подсказка коуча `coachFrom` (называет шкот).
- `src/features/simulator-3d/physics/coach.test.ts` - контракт: каждая подсказка трима называет шкот (гика-шкот, стаксель-шкот или оба).
- `src/features/simulator-3d/physics/sailModel.ts` - визуальные и подсказочные помощники (не силы).
- `src/features/simulator-3d/physics/targets.ts` - решатель целевых значений (target speed / angle).
- `src/features/simulator-3d/physics/targets.test.ts` - тесты решателя.
- `src/features/simulator-3d/sails/geometry.ts` - геометрия паруса: профиль пуза, точки, меш.
- `src/features/simulator-3d/sails/geometry.test.ts` - тесты геометрии паруса.
- `src/features/simulator-3d/sails/model-asset.test.ts` - соответствие меша исходному GLB.
- `src/features/simulator-3d/sails/response.ts` - совместимость: реакция паруса у общей сессии.
- `src/features/simulator-3d/sails/response.test.ts` - тесты реакции паруса.
- `src/features/simulator-3d/sails/transfer.ts` - совместимость: перекладка у общей сессии.
- `src/features/simulator-3d/ui/WindDial.tsx` - компасный прибор ветра.
- `src/features/simulator-3d/ui/WindReadout.tsx` - цифровые показания ветра.

### 4.11 `src/features/simulator-v3` - Тренажер трима (V3)

- `src/features/simulator-v3/index.ts` - публичный барель фичи.
- `src/features/simulator-v3/SimulatorV3Page.tsx` - страница тренажера: сцены, поды, панели; на телефоне закрепленная сцена и общий док, опция руления пером.
- `src/features/simulator-v3/SimulatorV3.module.css` - стили тренажера.
- `src/features/simulator-v3/hooks/use-simulator-v3.ts` - главный хук: состояние, цикл, ввод.
- `src/features/simulator-v3/hooks/use-trainer-checkpoint.ts` - сохранение и восстановление прогресса.
- `src/features/simulator-v3/hooks/use-trim-study.ts` - подключение разбора трима.
- `src/features/simulator-v3/runtime/create-runtime-state.ts` - `DEFAULT_UI` и перевод UI в управление движком.
- `src/features/simulator-v3/runtime/runtime-types.ts` - типы состояния рантайма.
- `src/features/simulator-v3/runtime/step-runtime.ts` - шаг рантайма поверх общей сессии.
- `src/features/simulator-v3/runtime/runtime.test.ts` - поведенческие тесты рантайма.
- `src/features/simulator-v3/runtime/feedback.ts` - выбор главной подсказки кадра.
- `src/features/simulator-v3/runtime/trim-heuristics.ts` - рекомендованный трим для текущих условий.
- `src/features/simulator-v3/runtime/scenario-presets.ts` - сценарии и определения упражнений.
- `src/features/simulator-v3/runtime/trainer-catalog.test.ts` - сверка сценариев с `src/data/drills.ts`.
- `src/features/simulator-v3/runtime/drill-clock.ts` - часы упражнения.
- `src/features/simulator-v3/runtime/drill-clock.test.ts` - тесты часов упражнения.
- `src/features/simulator-v3/runtime/deep-link.ts` - чистый разбор упражнения и share-state; известный первый урок выбирает камеру всей яхты, сохраняя приоритет учебных preset-входов. TWA принимает0..180.
- `src/features/simulator-v3/runtime/deep-link.test.ts` - тесты диплинков.
- `src/features/simulator-v3/runtime/wind-dynamics.ts` - совместимость: динамика ветра у общей сессии.
- `src/features/simulator-v3/runtime/wind-dynamics.test.ts` - тесты динамики ветра.
- `src/features/simulator-v3/ui/SceneTop.tsx` - вид сверху: курс, ветер, векторы.
- `src/features/simulator-v3/ui/SceneSide.tsx` - вид с борта.
- `src/features/simulator-v3/ui/SceneRear.tsx` - вид с кормы.
- `src/features/simulator-v3/ui/SceneElevation.tsx` - схемы-элевации сцены.
- `src/features/simulator-v3/ui/SceneOverlayLabels.tsx` - подписи поверх сцены.
- `src/features/simulator-v3/ui/TrainerBoat3D.tsx` - 3D-лодка внутри тренажера.
- `src/features/simulator-v3/ui/MetricsStrip.tsx` - полоса метрик: TWA, AWA, скорость, крен, дрейф.
- `src/features/simulator-v3/ui/CommentaryLine.tsx` - строка живого объяснения "почему".
- `src/features/simulator-v3/ui/GlossaryFooter.tsx` - подвал с терминами.
- `src/features/simulator-v3/ui/LiveWindButton.tsx` - подстановка живого ветра из `/api/weather`.
- `src/features/simulator-v3/ui/sail-projection.ts` - проекция паруса в 2D для схем.
- `src/features/simulator-v3/ui/shared.tsx` - общие мелкие элементы UI тренажера.
- `src/features/simulator-v3/ui/panels/ModeBar.tsx` - переключение режимов тренажера.
- `src/features/simulator-v3/ui/panels/ScenarioPicker.tsx` - выбор сценария.
- `src/features/simulator-v3/ui/panels/DrillCard.tsx` - карточка упражнения с оценкой.
- `src/features/simulator-v3/ui/panels/CheckpointPanel.tsx` - панель чекпоинта.
- `src/features/simulator-v3/ui/panels/TrimStudyPanel.tsx` - панель разбора трима.
- `src/features/simulator-v3/ui/panels/TourOverlay.tsx` - обучающий тур по тренажеру.
- `src/features/simulator-v3/ui/pods/WindPod.tsx` - под управления ветром.
- `src/features/simulator-v3/ui/pods/HelmPod.tsx` - под курса.
- `src/features/simulator-v3/ui/pods/MainPod.tsx` - под грота.
- `src/features/simulator-v3/ui/pods/MainTrimPod.tsx` - под тонкого трима грота.
- `src/features/simulator-v3/ui/pods/JibPod.tsx` - под стакселя.
- `src/features/simulator-v3/ui/pods/ShapeTrimControls.tsx` - оттяжки и форма паруса.
- `src/features/simulator-v3/ui/pods/ViewPod.tsx` - выбор вида сцены.
- `src/features/simulator-v3/hooks/use-trim-assessment.ts` - хук проверки настройки (`?assessment=twist|depth`).
- `src/features/simulator-v3/ui/panels/TrimAssessmentPanel.tsx` - панель задания и результата проверки.

### 4.11a `src/features/trainer-controls` - общее управление тренажерами

Одна модель управления для Основ, Тренажера трима и Лодки 3D (концепция и
решения владельца: `docs/design/trainer-controls-concept.md`). Физику не
трогает: штурвалы и ползунки отдают те же входы (курс, перо руля -1..1,
шкот 0..1).

- `src/features/trainer-controls/index.ts` - барель модуля.
- `src/features/trainer-controls/mapping.ts` - чистые функции: оборот штурвала в курс, перо руля и шкот, щелчки, смена галса.
- `src/features/trainer-controls/mapping.test.ts` - контракты: оборот = 90° курса, ±1 оборот = упор пера, оборот шкота = 25% хода.
- `src/features/trainer-controls/prefs.ts` - настройки управления (`regatta.controls.v1`, в приложении `window.__REGATTA_CONTROLS__` и обратное сообщение `controls-prefs`), хук без расхождения гидратации.
- `src/features/trainer-controls/prefs.test.ts` - умолчания по решениям владельца, очистка мусора, избранное.
- `src/features/trainer-controls/sound.ts` - щелчки штурвалов звуком (WebAudio, без файлов), только при включенном звуке.
- `src/features/trainer-controls/labels.ts` - строки дока, штурвалов и настроек на 7 языках.
- `src/features/trainer-controls/Wheel.tsx` - один штурвал: жест по кругу, клавиши, `role="slider"`.
- `src/features/trainer-controls/WheelDeck.tsx` - общий руль/шкоты с50pxрезервом трехстрочной подписи, адаптивным нижним рулем от96px и шкотами64px; в нижнем доке помощь идет после основных controls, desktop column сохраняет ее внутри своей области.
- `src/features/trainer-controls/ControlDock.tsx` - док под лодкой: вкладки «Избранное / Штурвалы, Паруса, Руль, Ветер, Ещё» и шестеренка; если пришли из урока, первой стоит и открывается вкладка «Задание» (`leadTab`).
- `src/features/trainer-controls/ControlSettingsSheet.tsx` - лист настроек: режим, что задает штурвал, возврат в центр, чувствительность, сторона шкотов, звук, состав избранного.
- `src/features/trainer-controls/TrainerWorkspace.tsx` - закрепленная сцена, показания и док; в короткой горизонтали показания справа прокручиваются с клавиатуры, сохраняя место основным controls и лодке.
- `src/features/venues/useVenue.ts` - выбранная акватория и переключатель берега (localStorage `regatta.venue.v1`, `regatta.shore.v1`), общие для гонок и Лодки 3D.
- `src/features/venues/VenuePicker.tsx` - переключатель «Берег и острова» и выбор акватории в меню веб-гонки.
- `src/features/race-3d/Race3DView.tsx` - 3D-вид одиночной гонки (ADR-0006): читает refs гонки `GameClient`, игрок в начале координат, мир сдвигается под ним; соперники, знаки, линия старта, берег, камера за кормой или сверху. `Buoy` и `World` рисуют знаки и для общей сцены гонки `RaceScene`; с F4 у знака спрайт-кольцо одного размера на экране поверх воды (`markHaloTexture`, прозрачность по расстоянию до камеры).
- `src/features/race-3d/pose.ts` - чистое преобразование лодки гонки в позу 3D-яхты (паруса под ветер по триму лодки, заполаскивание в мертвой зоне), масштаб 0.6 м на единицу, следующая цель, места в гонке (`raceRanks`, их же считает HUD веб-гонки).
- `src/features/race-3d/pose.test.ts` - контракт: паруса под ветер на обоих галсах, травятся при уваливании, лодка там, где ее поставила гонка.
- `src/features/race-3d/useRaceView.ts` - выбор вида гонки 2D/3D и камеры (localStorage `regatta.race.view.v1`, `regatta.race.camera.v1`, ссылки `?view=3d`, `?camera=high`) и флаги следующего рендера (`?scene=next`, `?fps=1`).
- `src/features/race-scene/RaceScene.tsx` - следующий рендер гонки (ADR-0008, вертикальный срез, `/game?view=3d&scene=next`): WebGPURenderer с откатом на WebGL2, вода и небо на TSL, белые следы и тени лодок, своя раскраска берега и сосны, тактическая камера по умолчанию, замер FPS и шаг плотности пикселей (`?fps=1`). Знаки, соперники и стрелки берет из `Race3DView`. После потери видеокарты один раз пересоздает холст на WebGL2 (`src/features/race-scene/gpu-loss.ts`); журнал производительности `race.perf` раз в минуту в гонке и при выходе (`src/features/race-scene/perf-journal.ts`); проп `racing`. Брызги у носа (`src/features/race-scene/BowSpray.tsx`) и тряска камеры на касании и выстреле старта (пропсы `contactId`, `started`; смещение только на нарисованный кадр в `GatedRender`, M3-5).
- `src/features/race-scene/materials.ts` - TSL-материалы сцены: вода (общие волны `WAVES`, полосы по ветру, мелководье и пена у берега по полю расстояний), небо с облаками, след, тень под корпусом. M3-6: цвета из света акватории (`TRAINER_COLORS` для тренажеров), свечение бликов солнца и пены как яркость выше белого в тех же шейдерах воды и следа (без прохода bloom; узлы строятся при `glow`, их сила - общий uniform `glow` из `waterUniforms`, поэтому шаг high/medium не компилирует шейдер), вода отражает `reflection`, а не горизонт неба, вода у камеры спокойнее (`NEAR_CALM`: рябь и наклон нормали от зыби в ближних 30 м, высота волн та же).
- `src/features/race-scene/venue-look.test.tsx` - сцена без WebGL: туман, небо, солнце, экспозиция, вода и блики берутся из света выбранной акватории, RaceScene передает `venueLook(venue.id)`, тренажеры без света акватории остаются прежними и без свечения; узлы свечения строятся только при `glow` больше 0 (на low их нет), сила свечения - uniform, high и medium дают одни и те же материалы; небо из цветов акватории; вода отражает `reflection`; экспозиция ставится на рендерер и возвращается (`applyExposure`); спокойная вода у камеры.
- `src/features/race-scene/hull-marks.test.tsx` - следы и тени корпусов без WebGL с хуками как в React: при смене материала следа посреди гонки (свечение выключено, другая акватория) у каждой лодки по-прежнему один след и одна тень, материал меняется на месте, тень и ее плоскость не освобождаются.
- `src/features/race-scene/camera-tap.ts` - общая для гонки и повтора смена камеры (M2-1, M4-3): название кнопки «Сменить камеру» на 7 языках и касание сцены, которое переключает камеру; без JSX, чтобы легкий маршрут `/r/[code]` не тянул кабину гонки.
- `src/features/race-scene/camera.ts` - чистая математика камер гонки: тактическая камера (с подветра, наклон 54 градуса, наветренная сторона вверху), порядок смены камер касанием (вокруг лодки -> за кормой -> сверху), отличие касания от перетаскивания и щипка, шаг камеры «За кормой» (идет за курсом, возврат через 1,5 с после ручного вращения, при «Уменьшить движение» одним переходом).
- `src/features/race-scene/shore.ts` - поле расстояний от воды до берега по контурам площадки, раз на акваторию (текстура для воды).
- `src/features/race-scene/trail.ts` - лента кильватера: точки кормы, расширение в V и затухание с возрастом.
- `src/features/race-scene/land.ts` - раскраска суши для света гонки: песок только на полосе пляжа, дальше зелень, скала на крутых гранях и вершинах.
- `src/features/race-scene/quality.ts` - адаптивное качество гонки (M2-5): одна лестница (плотность пикселей, затем профиль high/medium/low: сетка воды, шум воды, облака, доля деревьев, порог дальнего соперника), шаг вниз по измеренному времени кадра ниже 42 FPS, память шага на устройстве (`regatta.race.quality.v1`), отрисовка 8 кадров в секунду на паузе, размер корпуса на экране для дальнего LOD; `glow` (M3-6) - сила свечения бликов и пены: high 1, medium 0.6, low 0, ни на одном профиле нет прохода bloom.
- `src/features/race-scene/effects.ts` - событийные эффекты сцены гонки (M3-5), чистая математика: `sprayIntensity` (брызги у носа от скорости и крена, нет на дрейфе, на профиле low и при «Уменьшить движение»), пул частиц брызг в системе координат яхты без выделений памяти на кадр, тряска камеры только на касании и выстреле старта (затухает за свою длительность), смещение на один нарисованный кадр с возвратом после него (`beginShakenFrame`/`endShakenFrame`), события из пропсов `contactId` и `started`; `createSceneShake` - тряска сцены, которую живые профиль качества и «Уменьшить движение» разрешают или нет.
- `src/features/race-scene/effects.test.ts` - брызги на трех входах (дрейф, быстрый галфвинд, бейдевинд с креном), ноль на low и при «Уменьшить движение», пул частиц не растет и пустеет после остановки; тряска ноль без события, затухает до нуля за длительность, камера после кадра на прежнем месте, событие отбрасывается, когда тряска запрещена; `createSceneShake`: выстрел трясет на high и medium, не трясет на low и при «Уменьшить движение», профиль читается живым.
- `src/features/race-scene/BowSpray.tsx` - брызги у носа своей лодки: один InstancedMesh из 72 капель, создан один раз, рисуется в общем проходе (WebGPU и WebGL2), повернут как яхта и качается с ней на волне (подъем и дифферент, как в `src/features/simulator-3d/Yacht.tsx`); скрыт на профиле low и при «Уменьшить движение», пуст без своей лодки в кадре; лодка, что не движется 250 мс (пауза гонки или реплея), новых брызг не бросает. У соперников брызг нет (по цене). Здесь же `useReducedMotionRef`.
- `src/features/race-scene/BowSpray.test.tsx` - кадр без WebGL: на быстром курсе капли у носа и поворот по курсу, на дрейфе одна пустая капля, на паузе брызги стихают, без своей лодки капли не висят, дифферент как у корпуса, на low и при «Уменьшить движение» сетка скрыта.
- `src/features/race-scene/sail-flow.ts` - F6 «Ветер на парусах», чистая геометрия без three.js: ленты вымпельного ветра у своей лодки в системе координат яхты (3 на гроте, 2 на стакселе, нет на спущенном гроте и свернутом стакселе): приходят с той стороны, откуда дует вымпельный ветер, и огибают подветренную сторону паруса; полощущий парус лента проходит прямо, у сорванного отходит от паруса с 40% хорды, на попутном (вымпельный угол от 140) упирается в наветренную сторону; в Pro без совета трима поток неизвестен, лента только доходит до передней шкаторины с наветренной стороны; сила и скорость лент от вымпельного ветра (нет ниже 1 уз), состояние парусов из тренера трима гонки (`sailFlowFromCoach`) или по мертвой зоне и режиму (`sailFlowFromWind`), цвета колдунчиков (зеленый, желтый, красный, без совета белый, не циан); `raceWindLayers`: при включенных лентах 3D-стрелки ветра (`WindFlow`) не рисуются.
- `src/features/race-scene/sail-flow.test.ts` - ветер справа рисует приход справа, слева слева; лента огибает подветренную сторону, у полощущего паруса прямая, у сорванного отходит и уходит дальше под ветер за задней шкаториной; на попутном упирается в парус; неизвестный поток только до передней шкаторины с наветренной стороны; штиль и неизвестный ветер без лент; сила растет с ветром; карта советов тренера и цвета, ни один цвет не `--accent-cyan` обеих тем и не в оттенках циана; стрелки ветра и ленты никогда вместе.
- `src/features/race-scene/SailFlow.tsx` - F6: ленты у своей лодки в сцене гонки, два InstancedMesh (черточки и стрелки), повернуты, накренены и качаются на волне как яхта (`yachtSwellAttitude`: подъем, крен и дифферент по тем же четырем точкам корпуса, что в `src/features/simulator-3d/Yacht.tsx`); гик, стаксель и крен догоняют позу каждый кадр с той же скоростью, что у яхты, пути лент пересчитываются 10 раз в секунду; ветер из `raceWindReading` каждый кадр; цвет по совету трима Pro (`coachRef`, только при включенных подсказках трима), в Pro без совета (`ownTrim`) только приход ветра; при «Уменьшить движение» черточки стоят и показаны стрелки; скрыты одним экземпляром нулевого размера, а не `visible = false`, чтобы прогрев шейдеров их компилировал. Монтируется только при включенной настройке, только в одиночной гонке.
- `src/features/race-scene/SailFlow.test.tsx` - кадр без WebGL: пять лент у своей лодки, поворот, крен и качка на волне как у яхты, приход под вымпельным, а не истинным углом, против ветра ярче, чем на попутном при том же истинном ветре, крен догоняет каждый кадр через поворот, движение и неподвижность со стрелками при «Уменьшить движение», белый без совета и цвета колдунчиков по совету, в Pro без совета только наветренная сторона, скрыты одним экземпляром нулевого размера с самого начала, без ветра и без своей лодки; подключение только в `/game` вместо 3D-стрелок ветра (не мультиплеер и не повтор).
- `src/features/race-scene/gpu-loss.ts` - восстановление после потери GPU-устройства или WebGL-контекста (M0-8): один перезапуск на WebGL2, повторная потеря показывает экран ошибки сцены, потери старого холста игнорируются; в журнал `scene.gpu` только фиксированные значения.
- `src/features/race-scene/gpu-loss.test.ts` - ровно один автоматический повтор, затем отказ без цикла, ручной повтор остается на WebGL2, устаревшие поколения игнорируются; рендерер сохраняет собственную остановку three и пишет события без текста драйвера.
- `src/features/race-scene/perf.ts` - замер производительности сцены гонки (M0-9): гистограмма FPS (среднее и 5-й процентиль только по кадрам гонки, без паузы, скрытой вкладки и разрывов), средние вызовы отрисовки и треугольники, ограниченное событие `race.perf`.
- `src/features/race-scene/perf.test.ts` - процентиль и среднее на известных последовательностях кадров, исключение паузы и скрытого времени, ограничения и отказ схемы от свободного текста.
- `src/features/race-scene/perf-journal.ts` - подключение замера к сцене: событие раз в 60 с во время гонки и последнее при выходе, разрыв интервала кадров при скрытии вкладки, без выделений памяти на кадр.
- `src/features/race-scene/perf-journal.test.ts` - нет события до 60 с, ровно одно на 60 с, последнее при выходе с бэкендом, плотностью пикселей и вызовами отрисовки; скрытый промежуток не считается кадром.
- `src/features/race-scene/race-scene.test.ts` - контракты: камера ставит лодку чуть ниже середины экрана телефона и смотрит на ветер, поле берега ноль на суше и растет от пляжа, след расширяется и гаснет, качество только снижается, песок только на пляже.
- `src/features/race-hud/RaceHud.tsx` - HUD гонки (аудит C2): скорость против цели на этом курсе, компас ветра относительно лодки с сектором мертвой зоны, таблица мест со временем, всплывающее событие.
- `src/features/race-hud/target.ts` - целевая скорость из поляры движка: таблица через 5 градусов на силу ветра, интерполяция.
- `src/features/race-hud/target.test.ts` - контракт: цель ноль в мертвой зоне, на галфвинде выше, чем в бейдевинд, лодка гонки выходит на цель с точностью 10%.
- `src/features/race-hud/events.ts` - тексты событий гонки на 7 языках (цена поворота, отрыв на знаке, обгон) с порядковыми числительными.
- `src/features/race-hud/events.test.ts` - контракт: события на всех 7 языках несут измеренные числа, порядковые числа по правилам языка.
- `src/features/trainer-controls/SceneChrome.tsx` - строка над сценой (`SceneBar`), кнопка «Вид» и выезжающая сбоку панель видов и камеры (`SceneDrawer`): на телефоне поверх лодки ничего не лежит.
- `src/features/trainer-controls/TrainerControls.module.css` - стили на токенах темы.

### 4.12 `src/lib` - движок, i18n, данные, утилиты

Физика (ADR-0001, константы без нового ADR не менять):

- `src/lib/sailing-physics/index.ts` - публичный API движка.
- `src/lib/sailing-physics/types.ts` - типы и соглашения (углы в градусах, знаки).
- `src/lib/sailing-physics/constants.ts` - константы, общие для UI и движка.
- `src/lib/sailing-physics/wind.ts` - истинный ветер в кажущийся, чистая векторная математика.
- `src/lib/sailing-physics/aero.ts` - кривые Cl/Cd с явным срывом.
- `src/lib/sailing-physics/forces.ts` - тяга и боковая сила по каждому парусу.
- `src/lib/sailing-physics/balance.ts` - крен и дрейф из баланса моментов.
- `src/lib/sailing-physics/boat.ts` - параметры абстрактного двухпарусного крейсера.
- `src/lib/sailing-physics/sail-plan.ts` - номинальные площади парусов, общие для сил и рисунков.
- `src/lib/sailing-physics/sail-plan.test.ts` - тесты площадей и рифления.
- `src/lib/sailing-physics/mainsail-shape.ts` - отклик формы грота на оттяжку шкаторины.
- `src/lib/sailing-physics/simulate.ts` - `tick(state, controls, dt)`: 8 шагов, чистая функция.
- `src/lib/sailing-physics/simulate.test.ts` - 5 поведенческих тестов ADR-0001 плюс sanity.
- `src/lib/sailing-physics/simulate.fuzz.test.ts` - property-based фаззинг движка.
- `src/lib/sailing-physics/polar.ts` - полярная диаграмма из движка.
- `src/lib/sailing-physics/polar.test.ts` - тесты поляры.
- `src/lib/sailing-physics/current.ts` - течение и скорость над грунтом (аддитивно к модели).
- `src/lib/sailing-physics/current.test.ts` - тесты течения.

Остальное:

- `src/proxy.ts` - middleware: короткие языковые ссылки, cookies `regatta_sid` и `regatta_lang` (в проде `Secure`), basic-auth `/stats` и `/api/admin/*` через `src/lib/admin-auth.ts`.
- `src/proxy.test.ts` - контракт: `Secure` на cookies в проде и без него в dev, админ-шлюз 401/403, цепочка языка (`/pl` дает 307 на `/?lang=pl`, `?lang=` сильнее cookie, неизвестный `?lang=` игнорируется, подделанный входящий `x-regatta-lang` перезаписывается, без Accept-Language RU, на `/api/*` cookies нет).
- `src/lib/admin-auth.ts` - basic-auth админки (константное время, 503 без `ADMIN_PASSWORD`, CSRF для мутаций); `requireAdmin()` вызывает каждый админ-хендлер, а не только прокси.
- `src/lib/i18n.tsx` - провайдер и хуки `t` / `tp` / `tl`, приоритет источников языка.
- `src/lib/languages.ts` - список языков, `LANG_SHORTCUT_PATHS`, `pickLocalized`, порядок в пикере.
- `src/lib/languages.test.ts` - контракт языков: Accept-Language (регион, пропуск неподдержанных, EN как запасной, RU без заголовка), ровно 7 языков и 14 коротких путей, порядок отката `legacyPick`.
- `src/lib/db.ts` - SQLite: события, фидбэк, лидерборд, реплеи; единственный `insertEvent()`; индекс `(evt, ts)`; воронка для `/stats`, включая воронку гонки (первая гонка `raceNo = 1` и все гонки).
- `src/lib/db.funnel.test.ts` - воронка `getMetricsRange()` на настоящем файле SQLite и наличие индекса `(evt, ts)`.
- `src/lib/analytics-events.ts` - allow-list клиентских событий для `/api/log` и проверка полей воронки по событию, включая шаги гонки `race.countdown`, `race.first_tack`, `race.first_mark`, `race.end`, `race.replay` и их границы.
- `src/lib/funnel.ts` - клиентские хелперы воронки (экзамен, урок, задание по радио, клик App Store; гонка `trackRaceCountdown/Tack/Mark/End/Replay`: каждый шаг не чаще раза за гонку, номер гонки устройства `raceNo` в localStorage `regatta.race-count.v1`), `detectShell()` (app или web), `appStoreUrl(ct)`.
- `src/lib/funnel.test.ts` - контракт воронки: реальные id уроков и сценариев проходят проверку, результат экзамена уходит и в `/api/log`, и в приложение.
- `src/lib/event-retention.test.ts` - удаление старых событий: dry-run ничего не удаляет, реальный прогон удаляет ровно столько же, окно меньше 30 дней запрещено.
- `src/lib/net.ts` - усечение клиентского IP перед логом и записью.
- `src/lib/log.ts` - структурный лог JSON-строками в stdout контейнера.
- `src/lib/client-log.ts` - клиентский логгер через `sendBeacon`, молча падает; вне http(s) (офлайн-бандл) ничего не шлет.
- `src/lib/rate-limit.ts` - скользящее окно в памяти (один контейнер, без Redis); `clientKeys()` дает ключ сессии и ключ IP (последний хоп X-Forwarded-For), оба бакета должны пропустить запрос.
- `src/lib/rate-limit.test.ts` - контракт: свежая `regatta_sid` на каждый запрос не снимает лимит, отказ не списывает бюджет других слоев, короткое окно не стирает часовые бакеты.
- `src/lib/race-submission.ts` - общие проверки присланных гонок: санитайзер ника, правдоподобное время финиша, слаг миссии.
- `src/lib/ws-limits.test.ts` - контракт `ws-server/limits.js`: последний хоп XFF и потолки комнат.
- `src/lib/theme.ts` - разрешение темы light/dark, один источник истины.
- `src/lib/theme.test.ts` - saved/system/native theme resolution и фактическое исполнение prepaint bootstrap, включая theme-color.
- `src/components/ThemeManager.test.tsx` - route/system/storage/native events, живое применение и очистка listeners без reload.
- `src/lib/sounds.ts` - race sound signals on Web Audio (no files) and the race sound setting `regatta.race.sound.v1` (re-exported from `src/lib/race-sound-pref.ts`), separate from the wheel clicks: on by default, an old race mute stays muted, AudioContext only from a user gesture and only while sound is on, master volume 0.5, ambient audio session where supported (silent switch). `raceAudioOutput()` gives the soundscape the same context and master and never creates one (ADR-0019). `playStartSignal()` (M3-3) is the one entry for the start signals of the solo race and multiplayer: a held two-voice horn when the countdown begins, a one-voice short signal on each later second, a gun (noise crack and low thump) at zero, one horn for an individual recall.
- `src/lib/race-sound-pref.ts` - настройка звука гонки без звукового кода: чтение, запись, подписка, `pinRaceSound()` (сохраняет действующее значение явным выбором перед записью настройки тренажера); ее импортирует Лодка 3D, чтобы на `/simulator2` не ставились слушатели жестов и не создавался контекст гонки.
- `src/lib/race-haptics.ts` - вибрация только на события гонки (M3-4, решение 4): выстрел, огибание знака, контакт, финиш, короткий шаблон `navigator.vibrate` на каждое; не чаще раза в 300 мс (один троттл в `createRaceHaptics()` с подставляемыми часами); настройка `regatta.race.haptics.v1` («on»/«off», по умолчанию включена, пишется в диагностику как предпочтение `haptics`); в приложении вместо вибрации шлет `{type:"race-haptic", event}` в нативную часть, но только если приложение объявило обработчик флагом `window.__REGATTA_RACE_HAPTICS__ = true` (старые сборки без него не видят переключатель и ничего не шлют); доступность переоценивается по событию `regatta-embed`.
- `src/lib/race-haptics.test.ts` - шаблоны на четыре события, троттл на подставных часах, только выстрел среди стартовых сигналов, сообщение в приложение только при флаге обработчика (без флага ничего не шлется и переключателя нет), настройка по умолчанию, сохранение, диагностика, ключ в мосте хранилища приложения, доступность по устройству.
- `src/lib/race-start-signals.ts` - чистая модель стартовых сигналов (M3-3) поверх прежнего отсчета: первая секунда -> гудок, следующие -> короткий сигнал, ноль -> выстрел, повтор секунды ничего не дает; флаги по RRS 26 в тех же секундах (флаг класса с гудка до выстрела, P со второй секунды до последней; начало отсчета 3 в одиночной гонке и 5 на сервере), флаг X при раннем старте игрока по событиям `src/lib/race-rules.ts`.
- `src/lib/race-start-signals.test.ts` - какой сигнал на какой секунде (одиночный 3-2-1-0 и серверный 5-секундный отсчет), пауза и повтор, вход после старта без выстрела, порядок флагов RRS 26 на 3- и 5-секундном отсчете, отзыв только по событиям игрока.
- `src/lib/race-soundscape.ts` - чистое отображение звукового фона гонки (M3-2, ADR-0019): вымпельный ветер -> громкость и яркость ветра, скорость и крен -> шум воды и шлепки, мертвая зона (оба режима) или заполаскивание (только Pro) -> хлопанье паруса; тишина на паузе, без звука и без чисел; `raceSoundscapeLive()` решает, в каких фазах гонки звук может звучать.
- `src/lib/race-soundscape.test.ts` - отображение на трех входах (штиль, бейдевинд в свежий ветер, левентик), монотонность ветра и воды, тишина на паузе и без звука, заполаскивание только в Pro, фазы гонки.
- `src/lib/race-soundscape-audio.ts` - звуковой фон гонки на общем AudioContext из `src/lib/sounds.ts`: один раз строит шумовые подложки (ветер, вода, шлепки, хлопанье, трещотка лебедки) и синус удара, обновляет не чаще 10 раз в секунду (по часам страницы) через setTargetAtTime без новых узлов, замолкает на паузе, после удержания финиша, без звука, на скрытой странице; через полсекунды тишины останавливает источники до следующего живого обновления, при размонтировании останавливается.
- `src/lib/race-soundscape-audio.test.ts` - жизненный цикл на поддельном AudioContext: контекст только общий и только после жеста, у выключенного звука контекста нет, подложки строятся один раз, без узлов на обновление, не чаще 10 раз в секунду, тишина на паузе, при выключении звука, на скрытой странице, остановка источников после затянувшейся тишины и пересборка с тем же буфером, каждый тик HUD при аудиочасах с шагом буфера, остановка при размонтировании.
- `src/lib/race-physics.ts` - гонка `/game`, мультиплеера и мобильного AI: шаг лодки через движок, ворота огибания (`updateLap`), подсказка игроку (`raceWaypoint`) автопилот ботов (`raceAutopilotTurn`: петли по дистанции, сброс скорости перед знаком, повторный круг при промахе; `DECISIONS.md` ADR-0003) и столкновения (`resolveCollisions`: расталкивают всегда, скорость гасят только при сближении, финишировавшие не участвуют; ADR-0004); сложность ботов через `speedMul` в `stepBoat` (ADR-0007). Остатки аркадной модели (`speedFactorFromTWA`, `MAX_SPEED`) - долг Phase 3.
- `src/lib/race-physics.drift.test.ts` - паритет `ws-server/race-physics.js` и `src/lib/race-physics.ts`: константы, ветер, шаг лодки, курс и огибание знаков совпадают.
- `src/lib/race-course.test.ts` - тесты дистанции гонки (знаки, линия) и автопилота: все 19 стартовых мест сервера вовремя и с фальстартом, 120 разных стартов, заход ветра в слабый, обычный и сильный ветер с отсечкой 300 с, повторная гонка той же лодкой; столкновения: касание бортами, таран, финишировавшие, флот из 8 ботов до отсечки 300 с; сложность ботов (легкий заметно медленнее среднего, средний медленнее сложного).
- `src/lib/race-resume.ts` - восстановление настроек гонки после перезагрузки.
- `src/lib/best-times.ts` - личные рекорды по бакетам сложности и ветра.
- `src/lib/mp-client.ts` - WebSocket-клиент мультиплеера с автопереподключением и типизированной шиной.
- `src/lib/fallback-coach.ts` - эвристический коуч, когда OpenAI недоступен или ключа нет (M0-4: одно определение мертвой зоны для похвалы и ошибок, повороты без фордевиндов, цель из самой большой измеренной потери вне похваленного, без похвалы при сходе); у каждой ошибки вид `kind` для практики на финише (M4-2), `mirrorCoachKeys` оставляет только известный вид.
- `src/lib/feedback-routes.ts` - маршруты, где плавающая кнопка обратной связи скрыта: гонка, мультиплеер, тренажеры, sternik и с M4-3 повтор по ссылке `/r/` (на телефоне кнопка закрывала конец ленты событий).
- `src/lib/feedback-routes.test.ts` - кнопка скрыта на гонке, тренажерах и `/r/<код>`, видна на `/`, `/rules`, `/radio`, `/racing`.
- `src/lib/fallback-coach.test.ts` - локальный коуч: одно определение мертвой зоны, повороты без фордевиндов, цель по самой большой потере и не против похвалы, сход без похвалы, 7 языков.
- `src/lib/weather/types.ts` - контракт провайдера погоды.
- `src/lib/weather/open-meteo.ts` - провайдер Open-Meteo (без ключа).
- `src/lib/weather/index.ts` - выбор провайдера и общий вход.
- `src/lib/product/catalog.ts` - информационная архитектура: 5 разделов, маршруты, подписи на 7 языках.
- `src/lib/product/catalog.test.ts` - тесты маршрутов и поиска по каталогу.
- `src/lib/product/copy.ts` - общие тексты оболочки.
- `src/lib/sternik-progress.ts` - прогресс курса sternik в localStorage.
- `src/lib/db.leaderboard.test.ts` - SQL лидербордов на настоящем файле SQLite: одна настоящая лучшая строка на sid, миссии не попадают в свободные бакеты, полуоткрытое окно дня.
- `src/lib/product/menu.ts` - общий контракт меню: группы каталога для сайта и приложения, пункт навигации раздела; оболочки у сайта и приложения свои.
- `src/lib/product/learning.ts` - продолжение обучения для сайта (карточка Home); закладку реэкспортирует из `src/lib/product/learning-bookmark.ts`.
- `src/lib/product/learning-bookmark.ts` - закладка обучения (формат сайта в localStorage, не формат приложения): чтение, путь в закладку и запись, только по id уроков, потому что ее импортирует навигация на каждой странице.
- `src/lib/product/learning-bookmark.test.ts` - обход статических импортов корневого layout: навигация, нижняя панель и возврат к уроку не тянут тексты уроков и квизов; закладка по всем урокам.
- `src/lib/product/learning-web.ts` - чтение снимка обучения из localStorage сайта; запись закладки реэкспортирует из `src/lib/product/learning-bookmark.ts`.
- `src/lib/product/learning.test.ts` - тесты продолжения и закладки сайта.

### 4.13 `ws-server` - сервер мультиплеера

- `ws-server/server.js` - авторитетный сервер: комнаты, лобби, боты, миссии, тик 20 Гц.
- `ws-server/race-physics.js` - сгенерированная физика (`scripts/build-race-server.mjs`), руками не править.
- `ws-server/limits.js` - чистые хелперы лимитов: IP по последнему хопу X-Forwarded-For, потолок комнат (всего и на IP). При записи результата в `/api/race-result` ws-server передает IP игрока в X-Forwarded-For; запрос без этого заголовка (внутренний вызов) лимитируется только по сессии.
- `ws-server/package.json` - зависимости отдельного процесса (вне сборки Next).
- `ws-server/package-lock.json` - лок зависимостей ws-server.
- `ws-server/Dockerfile` - образ контейнера `regatta-ws`.

### 4.14 `scripts` - гейты, кодмоды, контент

- `scripts/check-project-map.mjs` - гейт карты: entrypoint, существование путей, покрытие файлов, секреты.
- `scripts/check-no-dash.mjs` - гейт типографики (em/en-dash), тот же запрет, что в хуке.
- `scripts/check-bundle-size.mjs` - бюджет размера бандла.
- `scripts/build-race-server.mjs` - генерация `ws-server/race-physics.js` из TS-движка, режим `--check`.
- `scripts/build-sternik-bank.mjs` - генерация банка sternik для браузера: файл с хешем содержимого в `public/sternik-bank/`, `src/data/sternik-bank-file.generated.ts` и строка `STERNIK_BANK_URL` в `public/sw.js`; режим `--check` (запускается тестом).
- `scripts/test-multiplayer.mjs` - регрессия жизненного цикла сокета на локальном сервере; с `--full` еще полная гонка двух сокетных яхтсменов и бота (яхтсменов ведет тот же автопилот, флаги старта и огибания восстанавливаются из подсказки `target`) и реванш.
- `scripts/stress-mp.js` - нагрузочный тест мультиплеера (см. раздел 5).
- `scripts/cyrillic-scan.mjs` - поиск утечек кириллицы в PL/EN/ES/FR/DE/IT на контентных маршрутах и в курсе `/learn/sails` (уроки берутся со страницы курса).
- `scripts/translate-data-flat.mjs` - массовый перевод плоских полей данных через Claude API.
- `scripts/translate-data.mjs` - перевод полей данных в новый язык через Claude API (старая форма).
- `scripts/migrate-data-fields.mjs` - кодмод формы полей в файлах данных.
- `scripts/migrate-tp-to-tl.mjs` - кодмод `tp(...)` в `tl({...})`.
- `scripts/fix-orphan-lines.mjs` - ремонт осиротевших строк переводов после массового прогона.
- `scripts/audit-sailing-model.mjs` - числовые пробы поведения движка (только чтение).
- `scripts/pregen-radio-audio.mjs` - предгенерация клипов радиофраз в `public/radio-audio`.
- `scripts/build-gallery-year.mjs` - сборка галереи за год из папки фото.
- `scripts/build-gallery-strip.mjs` - оптимизация папки фото в веб-полосу.
- `scripts/setup-nginx-geoip2.sh` - одноразовая настройка geoip2 в nginx.
- `scripts/backup-sqlite.sh` - онлайн-бэкап `regatta-stats.db` на VPS (root-owned копия в `/usr/local/sbin`): настройки из `/etc/default/regatta-backup` читаются первыми, каталог 0700 и файлы 0600, копия снимается внутри контейнера и выходит через stdout `docker exec` (root не трогает пути, которые пишет приложение; только обычный файл с заголовком SQLite, с потолком размера), выгрузка в S3 при `REGATTA_BACKUP_REMOTE` (без aws CLI выход 1), в шапке порядок восстановления под локом деплоя через `mktemp` и `mv -T`.
- `scripts/prune-events.mjs` - удаление сырых `events` и `sessions` старше 180 дней, `--dry-run` сначала; копируется в образ и запускается `docker exec regatta node scripts/prune-events.mjs`.
- `scripts/I18N_MIGRATION.md` - плейбук миграции i18n.
- `scripts/sailing-glossary.md` - рабочий глоссарий терминологии для переводов.
- `scripts/blender/build_sailing_yacht.py` - генерация учебной яхты в Blender: берет исходник `assets/3d/regatta_sloop.glb`, экспортирует рантайм-модель `public/models/regatta_sloop_sailing.glb`.
- `scripts/blender/refine_yacht.py` - доводка модели яхты: `assets/3d/regatta_sloop.glb` в `assets/3d/regatta_sloop.blend` и `assets/3d/regatta_sloop_refined.glb`.
- `scripts/blender/audit_yacht.py` - проверка модели перед экспортом.
- `scripts/blender/export_sail_shapes.mjs` - выборка формы парусов из рантайма для Blender.
- `scripts/blender/render_store_header.py` - рендер заголовка страницы App Store для iOS 27 (3840x1646, без альфы и текста, яхта в безопасной зоне Apple); загрузка через API Asset Library, разбор в `docs/audits/2026-10-18-aso-and-code-audit.md`.
- `scripts/photoshop/README.md` - как запускать скрипты Photoshop.
- `scripts/photoshop/add-watermark.jsx` - пакетный водяной знак.
- `scripts/photoshop/export-layers.jsx` - экспорт слоев PSD.
- `scripts/photoshop/gallery-optimize.jsx` - пакетная подготовка пар full и thumb.

### 4.15 `ops` и `e2e`

- `ops/deploy/README.md` - граница доверия при деплое: почему ключ CI не дает
  ни root-шелла, ни доступа к docker-демону хоста. Regatta делит VPS2 с другими
  продуктами. Это источник для установки, CI сам изменения этой политики не ставит.
- `ops/deploy/regatta-deploy.py` - root-owned граница деплоя. Принимает на stdin
  один ограниченный JSON (полный SHA коммита, два дайджеста образов `sha256:`,
  эфемерный токен реестра) и ничего больше: ни путей, ни shell-строк, ни опций
  Compose. Запускается в изолированном режиме, процессы получают массив аргументов
  и чистое окружение.
- `ops/deploy/regatta-ssh` - forced command для ключа CI: разрешена ровно одна
  операция `deploy`, всё прочее отклоняется с кодом 126. Ни шелла, ни TTY,
  ни проброса, ни SCP и SFTP.
- `ops/deploy/compose.yml` - описание контейнеров, лежащее в `/etc/regatta-deploy`
  и доступное на запись только root. CI управляет содержимым образов, но никогда
  не монтированием, сетями и привилегиями рантайма.
- `ops/deploy/test_deploy.py` - тесты границы привилегий: ограниченные deploy input/SSH/Compose/rollback, main-only publication/deployment и обязательные loopback learning/replay проверки без deploy secrets.
- `ops/deploy/.gitignore` - прячет `__pycache__/` рядом с python-скриптами.
- `ops/notify/README.md` - какие уведомления настроены и куда идут.
- `ops/notify/asc-telegram-notify.mjs` - опрос статуса ревью App Store и сообщение в Telegram.
- `ops/notify/asc-alert.sh` - управление launchd-задачей алерта.
- `ops/notify/N8N_SUPPORT_SETUP.md` - настройка потока support@ в Telegram через n8n.
- `ops/notify/regatta-support-email-to-telegram.workflow.json` - экспорт workflow n8n.
- `e2e/smoke.spec.ts` - smoke по критичным маршрутам и контрактам embed-режима; catalog inventory отдельно от Diagnostics utility, для которой проверяются все7 названий, route, доступность при поиске и 44px. Три тяжелых 3D-сценария имеют отдельный бюджет 120s по cloud trace, ожидание настоящего первого кадра V3 ограничено 45s; проверки часов, управления, pause/resume и отсутствия embed-навигации сохранены. Pro требует canvas и actual data-scene-startup=ready в одном 25s startup deadline перед прежней 15s clock-проверкой, без обхода renderer gate. Pro прикладывает before-clock/finally scene-startup, clock, visibility и максимум 10 pageerror stacks по 4KiB UTF-8. Read-only probe собирает shared pure parser внутри evaluate, возвращая только canonical 64KiB/200-entry journal либо present/invalid flags: raw invalid storage не попадает даже в retry trace. Переход Trainer/3D сохраняет actual pageerror stack в private synthetic CI report без изменения product telemetry.
- `e2e/multiplayer.spec.ts` - двухклиентный мультиплеер (нужны два браузера, см. раздел 8); отдельные120s сохраняют весь keyboard/WS/settings/layout/Fleet flow после доказанного60s deadline на поздней геометрии.
- `e2e/a11y-focus.spec.ts` - фокус на новом вопросе после "Dalej" в тренажерах sternik и SRC, lang="pl" польского курса на английском сайте.
- `e2e/trainer-controls.spec.ts` - независимые DOM measurements объединяются на одной границе состояния; missing/zero-size не принимаются, реальные действия и deadlines сохраняются. На телефоне лодка остается в кадре при прокрутке дока во всех трех тренажерах; штурвалы управляются с клавиатуры. Scroll и оба3D drawer-кейса ждут actual first frame в прежнем общем25s startup deadline до геометрии; drawer сохраняет1px bounds, view actions и60s total. Wheel-dock проверяет локализованный44px Diagnostics summary как занятое место, отсутствие перекрытий и настоящие пустые промежутки<24px, без увеличения бюджетов.
- `e2e/radio-workspace.spec.ts` - рация SRC остается в кадре целиком при прокрутке панели задания (симулятор и уроки Obsługa, телефон и десктоп), работает из закрепленного вида, у раздела четыре вкладки; действующая польская кнопка открывает объяснение управления, свободная практика не создает завершенных сценариев. Три модели проходят реальные SQL/Volume уроки мышью: actual LCD `Volume:`, вращение обода и индекса, Complete, release, Next и 44px альтернативы проверяются без изменения timeout.
- `e2e/offline.spec.ts` - офлайн-курс: один онлайн-визит на /radio, затем без сети тренажер, симулятор и теория (нужна прод-сборка, BASE_URL).
- `e2e/sailing-learning.spec.ts` - e2e курса парусов: шаги урока, проверка теории, стенд, compact Task и реальное изменение9m->11m с сохранением намерения через виды, панели и checkpoint; обычный30s бюджет этого case сохранен.

### 4.16 Корневые конфиги

- `package.json` - зависимости и все команды (`dev`, `build`, тесты, гейты).
- `tsconfig.json` - TypeScript strict и алиасы путей.
- `next.config.ts` - конфиг Next 16: standalone-сборка, заголовки, ремаппинг.
- `eslint.config.mjs` - правила ESLint (в CI пока advisory: 11 ошибок в общих веб-файлах на 2026-10-19).
- `postcss.config.mjs` - подключение Tailwind v4 через PostCSS.
- `vitest.config.ts` - web unit tests use the complete root tsconfig as a string, including pure native adapters without requiring Expo in root-only CI.
- `playwright.config.ts` - конфиг E2E, `BASE_URL` управляет целью; CI использует одного worker для независимых тяжелых сцен, локальный default и два реальных клиента внутри multiplayer case сохранены. Retries, trace policy и бюджеты не меняются.
- `playwright.swiftshader.config.ts` - тот же E2E с программным WebGL (SwiftShader, без GPU) и одним worker: локальное воспроизведение облачного раннера, `npx playwright test -c playwright.swiftshader.config.ts`.
- `Dockerfile` - образ веб-приложения (node alpine по digest, standalone); код принадлежит root, рантайм-пользователь 1001 пишет только в `/data` и `/app/.next/cache`.
- `docker-compose.yml` - только локальная разработка (проект `regatta-local`): сервисы `regatta` (172.17.0.1:4500) и `regatta-ws` (172.17.0.1:4502), том `/data`, healthcheck. Прод его не использует (`ops/deploy/compose.yml`).
- `regatta.nginx.conf` - эталон конфига реверс-прокси и CSP; на хосте применяется вручную.
- `.dockerignore` - что не попадает в контекст сборки образа.
- `.gitignore` - что не попадает в репозиторий (включая `.env*` и любые `*.png` в корне).
- `.github/workflows/ci.yml` - CI на ветки и PR: типы, blocking lint, тире, карта, весь `npx vitest run`, `npm run test:multiplayer`, отдельная джоба мобильного; Foundation browser flow собирает web, проверяет JS-бюджет 6,6 МБ и выполняет `e2e/foundation.spec.ts` до публикации.
- `.github/workflows/deploy.yml` - деплой с `main`: те же проверки до сборки, сборка и pre-deploy E2E включая sailing lessons/replay, образы в GHCR, деплой через `ops/deploy` в environment `production`, smoke и Playwright на проде. Non-main checks не получают deploy secrets и не публикуют образы. Экшены закреплены по SHA.
- `.github/dependabot.yml` - еженедельные PR обновлений: npm для корня и `ws-server`, docker-образы (digest, без смены мажорной версии Node: она меняется вместе с `node-version` в воркфлоу), GitHub Actions; без автомержа, `mobile/` не входит.

---

## 5. ws-server: константы и базовая линия

Сверено с `ws-server/server.js` (2026-10-18):

| Параметр | Значение | Где |
|---|---|---|
| Порт в контейнере | 3001, наружу `172.17.0.1:4502` | `ops/deploy/compose.yml` |
| Частота авторитетного тика | 20 Гц (`TICK_HZ`) | `ws-server/server.js:15` |
| Игроков в комнате | 10 (`MAX_PLAYERS_PER_ROOM`) | `ws-server/server.js:16` |
| Код лобби | 4 символа из алфавита без похожих букв | `ws-server/server.js` |
| Код реплея | 6 символов из того же алфавита без похожих букв | `src/lib/db.ts` |
| Грейс переподключения | 20 с (`RECONNECT_GRACE_MS`) | `ws-server/server.js:19` |
| Простой комнаты | 15 минут | `ws-server/server.js:17` |
| Отсечка гонки | 300 с | `ws-server/server.js:328` |
| Троттлинг | 30 соединений в минуту на IP, 240 сообщений в секунду на IP (IP = последний хоп X-Forwarded-For) | `ws-server/server.js` `allowConnect`, `allowMessage` |
| Комнат | 500 всего, 10 на IP (`MAX_ROOMS`, `MAX_ROOMS_PER_IP`) | `ws-server/limits.js` |

Базовая линия производительности (`STRESS-REPORT.md`, 8 клиентов, 45 с):
20.31 Гц, средний интервал 50.2 мс, p95 111 мс, p99 131 мс, максимум 140 мс,
ноль ошибок. Джиттер прячется клиентским буфером интерполяции 100 мс. Без этой
линии регрессию не отличить от нормы.

Два вывода оттуда же, которые легко переоткрыть как баги:

- Счетчик лимита сообщений ведется на соединение, а не суммарно по IP, поэтому
  документированные 60 сообщений в секунду не ограничивают клиента с несколькими
  соединениями. Нужен глобальный бакет.
- Потолок одного процесса около 20 одновременных комнат (примерно 200
  соединений), дальше нужно шардировать по воркерам.

---

## 6. Инфраструктура и эксплуатация

- Прод: vps2, домен weektoregatta.com. Контейнеры `regatta` и `regatta-ws`
  слушают только docker-bridge (`172.17.0.1:4500` и `:4502`).
- nginx - отдельный общий контейнер `nginx_server` на хосте, конфиг лежит в
  `/opt/repos/nginx_server/conf.d/`. Файл `regatta.nginx.conf` в репозитории
  только справочная копия и НЕ применяется деплоем: администратор правит
  host-файл, затем `docker exec nginx_server nginx -t` и
  `docker exec nginx_server nginx -s reload`.
- CSP разрешает только свой origin плюс GA и YouTube-фреймы. Любой внешний
  ассет в проде блокируется; новый домен появляется только правкой конфига на
  хосте и перезагрузкой nginx.
- База: том `regatta_regatta_data`, внутри контейнера `/data`
  (`REGATTA_DB_DIR=/data`), файл `regatta-stats.db` переживает редеплой. Бэкап
  и восстановление: `scripts/backup-sqlite.sh` и `docs/OPS.md`. Хранение: сырые
  события 180 дней, `scripts/prune-events.mjs` (см. `docs/OPS.md`).
- Секреты и окружение прода: `/etc/regatta-deploy/runtime.env` (root, 0600), в
  репозиторий не попадают. Старый чекаут `/opt/repos/regatta` и его `.env` не
  источник релиза.
- Деплой только из CI: push в `main` -> `.github/workflows/deploy.yml` ->
  проверки, весь `npx vitest run`, сборка и pre-deploy E2E на раннере ->
  неизменяемые образы в GHCR -> джоба в environment `production` по SSH stdin
  отдает принудительной команде `regatta-deploy` commit, два digest и
  одноразовый токен GHCR джобы (стирается после `docker pull`) -> root-owned
  `/etc/regatta-deploy/compose.yml` (исходник `ops/deploy/compose.yml`: read-only,
  `cap_drop: ALL`, лимиты) поднимает образы и сам откатывается при провале
  health -> smoke по прод-маршрутам -> Playwright на проде. Подробно:
  `ops/deploy/README.md`.
- Корневой `docker-compose.yml` на VPS не запускать: это локальный проект
  `regatta-local` без захардненных настроек; на хосте он падает на конфликте
  `container_name`, а не пересоздает прод.
- Логи: `docker logs --tail 500 regatta` и `docker logs --tail 500 regatta-ws`.
- Запрос в базу: в образе нет `sqlite3`, поэтому через better-sqlite3 только на
  чтение: `docker exec regatta node -e "const db=require('better-sqlite3')('/data/regatta-stats.db',{readonly:true});console.log(db.prepare('select count(*) n from events').get())"`.
- Откат: администратор (не деплой-аккаунт) поднимает образы из
  `/var/lib/regatta-deploy-state/previous.json` тем же фиксированным
  compose-файлом, см. `ops/deploy/README.md` ("Verification and rollback").
  Ручной `workflow_dispatch` на другом ref выполняет проверки, но публикация
  образов и deploy явно требуют `refs/heads/main`. Настройки environment
  `production` - отдельный контроль владельца, их наличие нельзя выводить
  из YAML или успешных unit-тестов.

---

## 7. Принятые решения и почему

Полные ADR в `DECISIONS.md`, датированные записи в `MEMORY.md`. Здесь то, что
чаще всего переоткрывают:

- Физика: настоящий баланс сил вместо таблиц. Модель - абстрактный
  двухпарусный крейсер около 40 футов, а не Bavaria 46; Bavaria осталась только
  референсом анатомии. Обоснование магических чисел (пик Cl 1.5, `hullDragK`
  220 после 135 / 185 / 195, GM 1.0, самоограничение крена через `cos(heel)`, а
  не `cos^2`, рифление `area = (1 - 0.65 * r)` в
  `src/lib/sailing-physics/sail-plan.ts`) записано в ADR-0001. Полоса крена на галфвинде
  ослаблена с [8, 18] до [6, 15], потому что у абстрактного крейсера около 75 м2
  паруса против 110 м2 у Bavaria 46.
- ORC-класс, CFD, спинакер и Code 0, динамика руля, течения и волны в V1
  сознательно не строились. Течение позже добавлено аддитивно в
  `src/lib/sailing-physics/current.ts`.
- `/simulator` - одна страница с двумя панелями, а не два маршрута: причинная
  цепочка учит только когда обе панели видны вместе.
- Курс в Основах задается вручную, без динамики руля. Слайдер TWS 4-25 узлов,
  по умолчанию 12; фиксированный диапазон отклонен специально.
- Старый `/simulator` держали живым во время Phase 1: замена была прогрессивной.
- Названия V1 / V2 / V3 - внутренние кодовые имена маршрутов, в UI они не
  появляются (в UI: Основы, Тренажер, Лодка 3D). Источник истины по модели -
  `docs/design/SIMULATORS.md`.
- Мобильные V2/V3 показываются в WebView, а не нативным three.js (не рендерится
  под New Arch); V1 остается нативным.

---

## 8. Ловушки регрессии

- `DEFAULT_UI` в `src/features/simulator-v3/runtime/create-runtime-state.ts`
  (`mainAngle` 52, `jibAngle` 54, начальный сид `bs = max(3, TWS * 0.45)`) - не
  вкусовщина, а защита от старта движка в срывном аттракторе. "Приведение к
  круглым числам" возвращает баг со стартом в срыве.
- `getTackSide` в Основах должен считать
  `normalizeAngle(windDir - boatHeading)`. Обратный порядок ставит паруса на
  наветренный борт.
- Cookie `regatta_sid` одна на браузер, а не на вкладку: тест мультиплеера в
  двух вкладках одного браузера структурно невозможен. Нужны два разных браузера
  или инкогнито.
- SSR-клиентские компоненты (например `src/app/sternik/prefs.tsx`) читают
  localStorage в эффекте плюс флаг `prefsLoaded`, а не в ленивом `useState`:
  иначе гидрация расходится на каждой странице. Проверять в свежей вкладке.
- В ворктри Turbopack не принимает symlink на `node_modules`: копировать
  `cp -Rc` из основного чекаута и поднимать превью на своем порту.
- Речевые грейдеры (радио и устный sternik) исторически пропускали ровно ту
  ошибку, которую должны ловить. Новые списки ключевых слов проверять
  враждебно; `npm run test:radio` не покрывает `src/app/sternik`.

---

## 9. Внешние источники правил

Правила и формулировки по языкам сверяются с национальными источниками:
fps30.ru и ВФПС для RU, IMO / USCG / World Sailing / US Sailing для EN, PZZ и
PYA для PL, RFEV для ES, FFVoile для FR, DSV для DE, Federvela для IT.
Экзаменационный контент sternik сверен с Dz.U. 2026 poz. 604, банк SRC - с
материалами UKE (bip.uke.gov.pl). Материалы и ссылки:
`docs/sternik-materials/SOURCES.md`.

---

## 10. Устаревшие утверждения

Корневые документы местами противоречат коду. Верен код; ниже расхождения,
которые уже проверены. Пути, которых в дереве больше нет, здесь намеренно
написаны без обратных кавычек: гейт карты проверяет существование каждого
пути в кавычках.

| Документ | Утверждение | Как на самом деле |
|---|---|---|
| `TECH.md`, `AUDIT.md`, `FEATURES.md` | физика 8/8 тестов | актуальные числа тестов держит блок "Как тестировать" в `AGENTS.md` |
| `CLAUDE.md` (до этой правки) | 31/31 физика, 12/12 Playwright | 58 физики, `npx playwright test --list` = 16 тестов в 2 файлах |
| `README.md` | глоссарий 64 термина | 51 запись в `src/data/sailing-data.ts` |
| `FEATURES.md` | мультиплеер 2-8 игроков | `MAX_PLAYERS_PER_ROOM = 10` |
| `FEATURES.md` | правил 8 карточек | 21 сценарий в `src/data/rules.ts` |
| `FEATURES.md` раздел 10 | i18n только localStorage, без cookie, только `t`/`tp` | cookie `regatta_lang` плюс SSR обязательны, есть `tl`; версию из `FEATURES.md` не переносить |
| `FEATURES.md` раздел 14 | нет нативного приложения, нет живой погоды, нет светлой темы | есть `mobile/` с конвейером App Store, есть `/api/weather` на Open-Meteo, есть светлая тема |
| `AUDIT.md` | порт ws `:4501` | 4502 в `ops/deploy/compose.yml` и `regatta.nginx.conf` |
| `TECH.md`, `FEATURES.md`, `AUDIT.md` | откат root-SSH на `46.225.11.249`, деплой `docker compose up` в чекауте | `178.104.223.93` - это vps2, текущий прод; `46.225.11.249` (vps1) - бывший хост Regatta, он жив и держит другие сервисы. Туда ничего не откатывать, но при аудите ключей деплоя проверять и его (ключ деплоя не должен иметь там авторизации). Деплой и откат только по `ops/deploy/README.md`; все три файла помечены баннером "исторический снимок" |
| `regatta.nginx.conf` | `server_name regatta.icoffio.com` | прод отвечает на weektoregatta.com; файл в репозитории отстал и не применяется автоматически |
| `TECH.md` R1, `AUDIT.md` R1, `ROADMAP.md` Phase 4 | переименовать src/middleware.ts в `src/proxy.ts` | уже сделано, middleware.ts в дереве нет |
| `CLAUDE.md` (до этой правки), `ROADMAP.md`, `MEMORY.md` | живой маршрут `/trim-trainer`, каталог src/features/simulator-v2 | ни того, ни другого в дереве нет (сборка V2-гонки удалена 2026-07-05, `be43938`) |
| `CLAUDE.md` (до этой правки) | гейт G1 это scripts/i18n-audit.mjs в корне | скрипт живет в `mobile/scripts/i18n-audit.mjs` |
| `DESIGN.md` | ссылка на PRODUCT.md | такого файла в репозитории нет; радиокурс описан в `docs/design/sternik-radio.md` |
| `CLAUDE.md` правило "польский без диакритик" | применяется везде | отменено 2026-09-27: польский пишется с диакритикой везде, кроме текста в OG-картинках; скрипт снятия диакритики удален |
| `MEMORY.md` | банк sternik 148 вопросов | 879 вопросов в `src/data/sternik.ts` |
| `docs/design/simulator2/ROADMAP.md` | план гоночной сборки V2 | отменен, актуален только бэклог 3D-визуала |
| `ARCHITECTURE.md` (до 2026-10-24) | `src/app/radio/runtimeSearch.ts` - поиск по материалам курса | функция отдает строку запроса страницы (на сайте `location.search`, в офлайн-бандле адрес встроенного роутера); поиска по курсу в ней нет |
| `AGENTS.md` (до 2026-10-24) | курс SRC только на польском, не адаптируется | решение владельца 2026-10-24: курс можно переводить на все 7 языков; тренажер рации уже на 7 языках со случайными акваториями, теория, уроки, разговор и банк 324 вопросов пока PL / RU |


## 2026-10-24 completion map

`docs/audits/2026-10-24/implementation-harness.md` coordinates model, offline app, cockpit, radio adaptation, site sync and ordered releases. `docs/audits/2026-10-24/audit.md` and domain reports preserve the branch/release evidence and visual baseline. App and site release branches share source modules; release cadence does not duplicate the physics/content.

- `src/lib/race-guidance.ts` retains independent advisory tack/recovery memory at 10Hz, using the shared stadium planner without steering or mutating the boat. Unsupported courses return no route. Low on the beat the hint plans from a copy of the boat moved toward the climb line (`hintCorridorScale`, M0-4), so it asks for fewer tacks than the bots' corridor; the approach to the mark is unchanged.
- `src/lib/race-guidance.integration.test.ts` follows the displayed recommendation through real start/mark/finish gates at four input cadences and four wind conditions; preserves legacy bot trajectory exactly.
- `src/lib/race-rules.ts` owns educational events, conservative right-of-way advice, early starts, mark contact and optional custom time penalties.
- `src/lib/race-judge.ts` - чистая функция `buildRaceJudgeDebrief`: события правил одной гонки превращаются в разбор учебного судьи (этап, правило, право дороги, штраф или «без штрафа: спорно», урок), повторы одного эпизода сливаются, список того, что судья не проверяет, всегда в сводке (ADR-0009).
- `src/lib/race-judge.test.ts` - слияние повторов, спорное без штрафа, ранний старт с возвратом за линию, толкотня на старте, список непроверяемого, полнота 7 языков и рендер компонента.
- `src/lib/race-start-jostle.ts` - признак «толкотни на старте» (M0-3): безштрафные сближения и касания первых 10 с после сигнала; живая подсказка молчит, разбор судьи собирает их в один пункт без урока. Отдельно от разбора судьи, который грузится только после финиша.
- `src/lib/race-spawn.ts` - стартовые позиции обычной гонки (M0-2): игрок на прежнем месте, боты тем же галсом «лесенкой» сзади и в стороны, статическая проверка раскладки.
- `src/lib/race-manoeuvres.ts` - чистый классификатор журнала гонки (M0-4): оверштаг или фордевинд с гистерезисом, без рыскания у линии ветра и у фордевинда, без дрейфа и смены курса, пока лодку держит край акватории; одно определение мертвой зоны (`inNoGoZone`) и `pressedAgainstEdge`.
- `src/lib/race-manoeuvres.test.ts` - синтетические курсы: оверштаг, фордевинд, рыскание на фордевинде, смена курса у стены, поворот от края, полный круг.
- `src/lib/race-skill-metrics.ts` - чистые метрики навыков одиночной гонки (M4-1) из журнала: опоздание на старт, VMG на лавировке и на фордевинде против лучшего VMG по цели скорости HUD, угол и потеря скорости в каждом оверштаге (классификатор M0-4, окна живой подсказки: 3 с до, от 1 с до до 4 с после), секунды в мертвой зоне (определение тренера), секунды ниже цели у знака; перебор лейлайна не считается, гонка лейлайн не знает. `raceSkillBars` дает до 4 полос экрана финиша (старт, лавировка, повороты, мертвая зона) с порогами `SKILL_BAR_SCALE`, еще не проверенными на записанных гонках. Угол и потерю в каждом оверштаге считает `src/lib/race-tack-metrics.ts`, метрики реэкспортируют `measureTacks` и типы журнала.
- `src/lib/race-tack-metrics.ts` - замер оверштагов из журнала (M4-1, вынесен в M4-3): угол и потеря скорости в каждом повороте по окнам живой подсказки, только скорость, не время и не дистанция; без локального тренера, поэтому лента повтора на `/r/<код>` не тянет `src/lib/fallback-coach.ts`.
- `src/lib/race-practice.ts` - ссылки практики экрана финиша (M4-2): веб-href с гонкой возврата, экран приложения (`/rules/<id>`, `/bootcamp/<id>`, `/simulator-v3?drill=`), список разрешенных приложению адресов `isRaceFinishNativeHref`, подписи на 7 языках, возврат гонки из урока (назад к уроку, следующий урок, после урока 8 курс парусов).
- `src/lib/race-return.ts` - гонка, в которую возвращает практика: `fromRace` (настройки, миссия, ежедневная или меню) и `raceLesson` в адресе практики, проверка и сборка ссылки `/game` с тем же выбором и возвратом к уроку; легкий, его читают страницы практики.
- `src/lib/race-practice.test.ts` - href практики и обратный путь через страницу практики к той же гонке и уроку, отказ подделке, приложению и встраиванию, адреса приложения только из сопоставления, вид ошибки у местного тренера и у ответа ИИ, возврат урока 8.
- `src/lib/race-replay-teaching.ts` - чистые части повтора, который учит (M4-3): скорости 0,5x-4x, переход за 5 с до момента внутри записи, какая ошибка тренера считается моментом (не длиннее 20 с), лента событий из журнала (старт, каждый оверштаг с потерей скорости из `measureTacks`, посчитанной так же, как в полосе навыков M4-1, где показана средняя по всем поворотам, огибание верхнего знака, пункты судьи) по порядку гонки, событие, на котором сейчас повтор (последнее случившееся или то, к которому перешли), и шаг часов повтора, который ждет первый кадр 3D-сцены.
- `src/lib/race-replay-teaching.test.ts` - шаги скорости, переход за 5 с с границами записи, ошибка на всю гонку не момент, лента по порядку с потерей поворота как у полос M4-1, без событий после записи и без мертвой зоны и финиша, текущее событие ленты (не раньше самого события, «Старт» в начале, выбранное касанием), часы стоят до первого кадра сцены.
- `src/lib/race-skill-metrics.test.ts` - три синтетические гонки, записанные как в цикле (сэмплы 0,5 с, классификатор поворотов, вход в мертвую зону): чистая, много неряшливых поворотов, поздний старт с левентиком; каждая полоса двигается в нужную сторону, поздний старт без левентика не трогает полосы лавировки и поворотов, последние секунды перед огибанием не считаются лавировкой, угол и потеря скорости поворота на окнах живой подсказки, доля выше 100% не показывается, медленное огибание видно у знака, старт находится по сэмплам, лейлайна нет.
- `src/lib/race-missed-mark.ts` - M0-5: пересечение финишной линии в сторону финиша до огибания верхнего знака, с порогом отхода от линии и паузой между подсказками.
- `src/lib/race-missed-mark.test.ts` - треки через `updateLap`: правильный круг, возврат без огибания, рыскание у старта, пауза и повторное взведение.
- `src/lib/race-ground-speed.ts` - M0-5: скорость в HUD по реально пройденному пути за 0,5 с, лодка у края карты не показывает полную скорость на месте.
- `src/lib/race-ground-speed.test.ts` - настоящий `stepBoat` на открытой воде, в углу, у борта стены, скольжение вдоль стены и толчок от столкновения.
- `src/app/game/race-missed-mark-copy.test.ts` - подсказка о пропущенном знаке на 7 языках: термины глоссария, левый борт, без типографской пунктуации, польский с диакритикой.
- `src/lib/race-spawn.test.ts` - сырые события правил первых 20 с на трех уровнях, трех seed и двух стилях игрока; доказательство, что старая раскладка этот тест не проходит; Pro на нетронутых шкотах: проверка трима тренером на трех ветрах и первые 20 с с реальной скоростью ботов уровня и порывами (medium/hard пока it.fails: бот прямо за кормой).
- `src/data/race-judge-copy.ts` - тексты разбора учебного судьи на 7 языках и шаблоны `{s}`, `{rule}`, `{boat}`, `{n}`; названия пунктов и «Толкотня на старте» берет из `src/data/race-judge-labels.ts`.
- `src/data/race-judge-labels.ts` - названия пунктов учебного судьи по видам и «Толкотня на старте» на 7 языках (M4-3): отдельно от полного разбора, чтобы лента повтора на легком `/r/<код>` не тянула все тексты судьи.
- `src/data/replay-teaching-copy.ts` - тексты повтора, который учит (M4-3), на 7 языках: группа скоростей, лента событий (старт, поворот оверштаг с потерей скорости, верхний знак), «Посмотреть момент» и «Посмотреть ошибку»; потеря поворота только скорость, не время и не дистанция.
- `src/data/race-medals.ts` - пороги медалей одиночной гонки (M4-5) по классу гонки, уровню и ветру, ПРЕДВАРИТЕЛЬНЫЕ: данных людей еще нет (M1-8), поэтому золото = медиана времени самого быстрого бота, серебро = самого медленного из шедших в темпе гонки (не дольше 1,3 времени победителя, без сошедших; пять фиксированных разбросов флота), затем более сильный флот не легче более слабого в том же ветре, бронза = любой финиш (лимит 300 с); ревизия порогов `MEDAL_THRESHOLDS_REVISION`; у классов пробной гонки строк нет, медалей они не дают. Акватория трассу не меняет и в ключ не входит.
- `src/data/race-medals.test.ts` - на каждой из 9 трасс золото быстрее серебра быстрее бронзы, в каждом ветре серебро и золото не легчают от «Легкого» к «Сложному», и числа совпадают с тем, что боты проходят сейчас (тот же движок 30 Гц, ветер одиночной гонки, старт лесенкой); у классов пробной гонки порогов нет.
- `src/data/race-medal-copy.ts` - тексты медалей (M4-5) на 7 языках: названия медалей, ветер, «Новая медаль», «Медаль трассы», следующая цель (бронза за финиш, серебро по времени, золото по времени с названиями переключателей подсказок как в настройках гонки), время на золото с подсказками, медаль не сохранилась; `medalCourseText` и `medalGoalText` (трасса и следующая цель одной фразой) общие для сайта и раздела «Гонка» приложения.
- `src/data/race-next-step-copy.ts` - тексты карточки «Следующий шаг» (M4-6) на 7 языках: цели по трем измеряемым ошибкам тренера (мертвая зона, слишком много поворотов, медленный бейдевинд, числа из целей тренера), гонка дня сегодня, рекорд трассы, трассы с медалью, дни с одиночной гонкой на этой неделе (мультиплеер ряд не пишет, поэтому тексты говорят «одиночная гонка», как в каталоге); общие для сайта и раздела «Гонка» приложения.
- `src/data/race-start-copy.ts` - F1: название легкого пресета и его кнопки старта на 7 языках, общее для лобби `/game` и раздела «Гонка» приложения: «Первая гонка» и «Начать первую гонку», пока на устройстве не было гонки, потом «Лёгкая гонка» и «Начать гонку» (`easyPresetText`, признак из `hasRacedBefore` в `src/lib/race-next-step.ts`).
- `src/data/race-skill-copy.ts` - тексты полос навыков на экране финиша (M4-1) на 7 языках, шаблон `{n}`, число с десятичным знаком языка; только измеренное, без лейлайна.
- `src/data/race-first-hints-copy.ts` - тексты подсказок первой гонки (M4-7) и строки «Показать подсказки снова» на 7 языках; термины по глоссарию, без курса, расстояния и трима
- `src/app/game/RaceJudgeReview.tsx` - презентационный блок разбора учебного судьи для экрана финиша, без собственных решений.
- `src/lib/race-physics.ts` accepts explicit manual trim/deployment and opt-in responsive solo steering (ADR-0009), preserving default bot/server behavior. Its additive raceAutopilotPlan exposes route geometry; bots retain radius80/lookahead40, responsive-player advice uses75/30. Neither VPP constants nor accelerated race travel changes.

- `src/features/trainer-controls/ReservedPanel.tsx` portals auxiliary views/settings into the existing controls area. `TrainerWorkspace` preserves the scene rectangle; inline callbacks do not restart focus effects.
- `src/features/race-scene/guidance.ts` builds a pure water-route ribbon and direction markers; RaceScene displays it only when guidance is supplied. The old target-circle and no-go overlays are removed from the race scene.

- `mobile/app/game/index.tsx` is the primary locally bundled shared 3D race. `race-3d` redirects there; the catalog has one solo entry. `mobile/src/navigation/race-entry.ts` validates supported local routes and passes `fps=1` (and, F5, `intro=1` from the Race hub's "How to race" row) through, so the FPS overlay works in the app; finish-screen practice and lesson links (M4-2) open only `isRaceFinishNativeHref` destinations from `src/lib/race-practice.ts`.
- `src/lib/race-native.ts` validates the versioned world-coordinate race/Pro-rig snapshot before native persistence. `mobile/src/persistence/race-native.ts` stores it additively, acknowledges only successful durable writes, and keeps legacy history readable. `mobile/src/persistence/race-web-storage.ts` whitelists device preferences, (M4-4) the personal ghost row `regatta.race.ghost.v1`, the one large row, checked whole by `isGhostStoreText` up to `GHOST_STORE_MAX_CHARS`, and (M4-5) the course medals row `regatta.race.medals.v1`, checked whole by `isMedalStoreText`, and (M4-6) the race home row `regatta.race.home.v1`, checked whole by `isRaceHomeStoreText`, and (M4-7) the first race hints row `regatta.race.hints-seen.v1`, a short list of hint ids with a size limit only (the web side reads unknown ids as none), and (F5) the race intro row `regatta.race.intro-seen.v1` ("1" once finished or skipped); new replay and coach use the same local course.
- `src/app/game/RaceCockpit.tsx` and its CSS reserve the 3D scene and move controls/settings to a responsive dock. Since M3-4 the pause sheet and race settings also hold the "Vibration" switch right after race sound, only where the device can vibrate. Since M4-7 race Settings hold a 44 px "Show hints again" button with a note that turns into a confirmation (`src/app/game/RaceCockpit.hints.test.tsx`). Since F2 the Helm panel is pinned (never a scroll container, touch-action none), the page does not scroll during the game layer (`src/app/globals.css`) and dock text is 16 px, secondary 14 px (`src/app/game/RaceCockpit.dock.test.tsx`). Since F4 race Settings group the hints (route, Pro trim, coach line, first race hints, the hint log, the gold rule) and Graphics ("Softer light, clearer marks"); the coach line can be off, and the hint log (`src/features/race-hud/hint-log.ts`) opens from the coach line, Settings and the pause sheet (`src/app/game/RaceCockpit.hintLog.test.tsx`). `src/app/game/race-prefs.ts` stores Simple/Pro and assistance preferences (since F4 also `coachStrip`, `firstRaceHints`, `softLight` in the same assists row; the softer light reaches `RaceScene` as gains from `raceLight` in `src/data/venues/look.ts`). `src/app/game/RaceReplay.tsx` replays actual local recordings in the shared 3D scene; since M4-3 it can play on open and open 5 s before a moment, owns the 0.5x-4x speeds, the race cameras (picker, switch button, scene tap) and the event ribbon (`src/lib/race-replay-teaching.ts`); `src/app/game/RaceReplay.controls.test.tsx` checks its static render and controls (e2e selectors kept), `src/app/game/RaceReplay.jump.test.tsx` the ribbon jump, the speed and the camera wiring and that the clock waits for the scene's first frame; since F3 the replay has the corner map and the big map with the boat and its track at the replay time (same test file). Since F3 the corner map opens the big map over the scene (`src/features/race-hud/RaceBigMap.tsx`, track from the race log, route only with hints on; `src/app/game/RaceCockpit.navigation.test.tsx`), the dock's Map tab stays. `src/app/game/race-copy.ts` holds seven-language race UI copy.
- `src/lib/daily-challenge.ts` generates identical date-based settings on server and fresh offline installs. `src/lib/db.ts` consumes it.
- `public/fonts/source-sans-3/` vendors pinned Adobe Source Sans 3 with OFL/provenance. Native assets are bundled in `mobile/assets/fonts/`; `mobile/src/design-system/fonts.tsx` and common Text/Button select weights. Offline builders embed local font bytes.

- `src/app/game/RaceCockpit.module.css` defines the protected ocean cockpit grid, responsive scene/dock split, controls and utility tabs.
- `src/features/simulator-3d/useSailCoachLabels.ts` supplies the same seven-language trim coaching phrases to simulator and race.
- `src/features/race-scene/guidance.test.ts` checks route mesh geometry, bounds and turn colors.
- `src/lib/daily-challenge.test.ts` fixes date validation and deterministic offline/server daily vectors.
- `src/lib/race-guidance.test.ts` verifies route/tack advice plus manual/automatic trim, sail deployment and opt-in steering behavior.
- `src/lib/race-native.test.ts` tests bounded local snapshots, Pro rig state, injected route state and native message validation.
- `src/lib/race-rules.test.ts` covers conservative right of way, collision/mark time penalties, early starts and rule toggles.

- `src/features/race-scene/SailingEnvironment.tsx` is the common ocean, sky, shore, lighting, local reflections and hull wake/shadow used by RaceScene and RegattaScene. No external HDR is loaded. The race passes the venue look (`src/data/venues/look.ts`, M3-6): sun, sky, fog, water, hemisphere light and the renderer's tone mapping exposure, returned on unmount; RegattaScene passes none and keeps the trainer light, exposure 1.05 and no glow. A new wake material (glow on or off, another look) is swapped onto the wakes already on the water; the glow strength is a uniform, so a quality step between high and medium builds no new material.
- `src/features/race-scene/renderer.ts` - общий рендерер WebGPU с откатом на WebGL2 и `warmUpShaders()`: `compileAsync` за экраном загрузки, не дольше 4 с и без отказа (M2-7).
- `src/features/race-scene/environment-state.ts` adapts trainer and fleet world travel/wind to common environment uniforms; `src/features/race-scene/environment-state.test.ts` verifies unit, origin and wind contracts.
- `src/features/sailing-lab/runtime/trim-coach.ts` provides pure shared trim advice and quality; `src/features/sailing-lab/runtime/trim-coach.test.ts` checks active-sail masks and downwind behavior.
- `src/lib/race-trim-coach.ts` reads race force diagnostics without stepping time and returns shared trainer coaching keys; `src/lib/race-trim-coach.test.ts` checks per-sail luff/stall, deployment, downwind and immutable state.

- `mobile/src/radio/startup-diagnostics.ts` - SRC startup attempt lifecycle, shared15s deadline and bounded session-only support codes; no storage contents, URL, message or stack retention. `mobile/__tests__/radio-startup-diagnostics.test.ts` verifies deadlines, stale callbacks, classifications and bounds.
- `mobile/src/radio/local-speech.ts` validates the local SRC speech bridge, selects device voices, probes requested-language iOS local capability instead of the phone default, requests on-device recognition only, bounds sessions and cancels stale activity results. Missing selected-locale native probe fails closed to typing. `mobile/src/radio/useLocalRadioSpeech.ts` binds its lifetime to the local WebView, focus and app state. `mobile/src/radio/README.md` specifies the contract and model-unavailable fallback.
- `mobile/plugins/with-local-radio-speech.js` applies version/assertion-checked SDK54 native volume and local recognition patches, including the selected-locale probe. All recognition anchors are checked before either native source is written. Fresh prebuild and binary are required. `mobile/__tests__/local-radio-speech.test.ts` and `mobile/__tests__/local-radio-speech-plugin.test.ts` protect permission hydration, cancellation, bounds, capability/dialect gates and patch idempotence/atomic rejection.

- `src/app/multiplayer/MultiplayerCockpit.tsx` and `src/app/multiplayer/MultiplayerCockpit.module.css` reserve server-driven race scenery and common helm controls. Online sailing remains automatically trimmed because the authoritative protocol accepts helm input only. Since M3-3 the cockpit shows the class flag and flag P over the server countdown (RRS 26 order) and has the race sound switch in Settings, a switch row like its neighbours, because the start signals play here too. Since M3-4 the "Vibration" switch follows it, only where the device can vibrate.
- `src/app/multiplayer/presentation.ts` adapts server snapshots to shared scene poses without client-side stepping; its FLEET_COLORS is the shared race palette from `src/features/race-hud/boat-colors.ts` (no cyan, M1-7). `src/app/multiplayer/presentation.test.ts` protects identity, coordinates, input and render immutability.
- `src/lib/best-times.test.ts` separates manual Pro records from existing auto-trim records while keeping old saved buckets readable.
- `src/lib/race-clock.test.ts` verifies identical solo integration at 10/15/30/60/120 FPS and pause/background handling through the shared fixed clock.
- `src/lib/race-setup.ts` fixes daily/mission query conditions before generic options and plans saved briefing restarts with recorded mode and known mission conditions. Explicit activity links suppress stale offers; unknown missions stay unavailable. `src/lib/race-setup.test.ts` protects these contracts and the unchanged wind multipliers.
- `public/sw.js` precaches exactly the eight public radio catalog/alias JSON resources for offline language switching plus the content-hashed sternik bank from `public/sternik-bank/` (cache-first as immutable) and the `/sternik/egzamin` document; arbitrary JSON and private/API responses remain excluded. `src/app/radio/sw.test.ts` covers this boundary.

- `src/lib/race-replay.ts` validates shared world recordings, preserves bounded rig/wind and mode/penalty metadata in the existing course JSON, upgrades legacy course geometry and interpolates by exact sample timestamps; since M4-3 it also reads the logged start, tack and mark events for the replay ribbon (`replayEvents`, lenient: an old row without them only has no ribbon). `src/lib/race-replay.test.ts` verifies these contracts.
- `src/app/api/replay/[code]/route.test.ts` verifies old/new replay reads; `e2e/replay.spec.ts` checks the shared 3D viewer and actual first rendered frame, exact end-time scrubbing, camera select/high preference and reserved playback controls within its own120s case budget. The corrected camera value passed at58.888s before the old60s deadline interrupted storage verification; assertions and global defaults remain unchanged.
- A solo race captures its Simple/Pro classification at countdown start, independent of later preference changes in another tab. Sheet keyboard shortcuts are owned by the race across utility tabs; absolute course sliders set a target without accumulating render-delay errors.
- Wheel hints read browser visit counts after identical server/client hydration. Desktop trainer wheel mode no longer duplicates the sheet/rudder sliders below its wheels.

- Privacy/network copy distinguishes offline SRC device speech in build59 and later from earlier app builds and online website/sternik speech. AudioData remains declared for those online features; public/native/store descriptions share this boundary.

### Local course and native storage completion, build 59

The original Polish Sternik pages are compiled into one installed package. Its local host reads asset bytes through expo-file-system, keeps the former website base origin for one-time WebKit progress migration, and guards active exams with an explicit React Native exit button, disabled swipe-back and usePreventRemove for external navigation. Cancel asks before beginning a native pop, so repeated Stay/Exit remains usable. Native snapshots become authoritative after a durable acknowledgment. Both SRC and Sternik clear their stale WebKit copies after Clear all data, retain first-run legacy migration and expose read, render and save retries.

- `mobile/src/course/LocalCourseWebView.tsx` - Local asset loading, routing or durable storage.
- `mobile/src/course/OfflineSternikCourse.tsx` - Local asset loading, routing or durable storage.
- `mobile/src/course/local-course-asset.ts` - Local asset loading, routing or durable storage.
- `mobile/src/course/OfflineRadioCourse.tsx` - Local asset loading, routing or durable storage.
- `mobile/src/persistence/sternik-storage.ts` - Polish local course package and host.
- `mobile/__tests__/local-course-asset.test.ts` - Native course and persistence regression.
- `mobile/__tests__/local-course-host.test.tsx` - Native course and persistence regression.
- `mobile/__tests__/sternik-storage.test.ts` - Native course and persistence regression.
- `mobile/__tests__/app-config.test.ts` - Native course and persistence regression.
- `mobile/__tests__/offline-radio-asset.test.ts` - Native course and persistence regression.
- `mobile/__tests__/webview-analytics-consent.test.tsx` - Native course and persistence regression.
- `mobile/src/persistence/radio-storage.ts` - Strict SRC snapshot allowlist and durable storage. Accepts the exact retired lang.v1 written by released48/49; preserves progress and app-language priority without accepting unknown keys.
- `mobile/__tests__/radio-storage.test.ts` - Native course and persistence regression.
- `mobile/scripts/build-sternik-offline.mjs` - Polish local course package and host.
- `mobile/assets/sternik-offline.html` - Polish local course package and host.
- `mobile/assets/sternik-offline.manifest.json` - Polish local course package and host.
- `mobile/scripts/offline-sternik/funnel.ts` - Polish local course package and host.
- `mobile/scripts/offline-sternik/offline.css` - Polish local course package and host.
- `mobile/scripts/offline-sternik/model.test.ts` - Polish local course package and host.
- `mobile/scripts/offline-sternik/bridge.test.ts` - Polish local course package and host.
- `mobile/scripts/offline-sternik/OfflineOralTrainer.tsx` - Polish local course package and host.
- `mobile/scripts/offline-sternik/oral.ts` - Polish local course package and host.
- `mobile/scripts/offline-sternik/build.test.ts` - Polish local course package and host.
- `mobile/scripts/offline-sternik/model.ts` - Polish local course package and host.
- `mobile/scripts/offline-sternik/README.md` - Polish local course package and host.
- `mobile/scripts/offline-sternik/i18n.tsx` - Polish local course package and host.
- `mobile/scripts/offline-sternik/router.tsx` - Polish local course package and host.
- `mobile/scripts/offline-sternik/bridge.ts` - Polish local course package and host.
- `mobile/scripts/offline-sternik/entry.tsx` - Polish local course package and host.
- `mobile/src/simulator/race-shell.ts` - native shell for race WebViews (M0-7): no back swipe on /game and /multiplayer, left/right safe-area padding for the full-screen race and native overlays (spinner, Retry, memory notice) offset by the same insets, keep-awake through the declared expo-keep-awake package (activateKeepAwakeAsync / deactivateKeepAwake with a per-screen tag), one automatic reload to the race menu after the web content process is killed.
- `mobile/__tests__/race-shell.test.tsx` - race shell: landscape side insets, overlay offsets, gestureEnabled false, keep-awake on and off through the real package wrappers, expo-keep-awake declared by the app (not the copy nested in expo), reload to the race menu after the iOS/Android web process dies, no reload loop.
- `mobile/__tests__/race-hub-setup.test.tsx` - hub start routes, hand-over through raceEntryQuery, presses in the rendered hub; F5: the "How to race" row opens `/game?intro=1` and the flag reaches the race
- `mobile/__tests__/race-hub-medal.test.tsx` - M4-5: the Race hub maps each preset (first race, free race, mission) to the course its start opens and shows that course's stored medal with its next goal, "no medal yet" for another course and for a corrupt row
- `mobile/__tests__/race-hub-next-step.test.tsx` - M4-6: the Race hub card shows the last race goal with its in-app practice, record, medal count and days this week; without a goal the course medal line moves into the card (once) and no days line at zero; after gold the daily race card opens `/game?daily=` and the bottom daily row is not repeated.
- `mobile/__tests__/metro-shared-imports.test.ts` - every app import that leaves `mobile/` lands in a Metro watch folder from `mobile/metro.config.js` (an import of `src/app` broke the release bundle of TestFlight 73 while jest and tsc passed).
- `mobile/__tests__/race-diagnostics-bridge.test.ts` - race.summary and the M1 race.lifecycle rows cross the WebView bridge, the native journal, AsyncStorage restore and Copy journal unchanged; ten minutes of helm input cannot evict them.
- `mobile/__tests__/race-sound-storage.test.ts` - the race sound row crosses the WebView storage bridge and is kept in AsyncStorage between app launches.
- `mobile/__tests__/race-storage-sync.test.tsx` - M4-4: настоящий хост гонки и SimWebView против страницы, которая выполняет настоящие внедряемые скрипты: после перезапуска ряд призрака из AsyncStorage уже в localStorage страницы до загрузки; две записи подряд в конце гонки (сброс продолжения и новый призрак) и тройная запись одной строки заканчиваются последним значением страницы и в AsyncStorage, без эха строк назад; отклоненный или не записанный ряд призрака оставляет след `storage.operation` с целью `ghost`.
- `mobile/__tests__/race-medal-storage.test.ts` - M4-5: the course medals row crosses the WebView storage bridge, is kept in AsyncStorage and reads back as the same medal; a corrupt row is refused and the stored medals stay.
- `mobile/__tests__/race-home-storage.test.ts` - M4-6: the race home row (race days, last goal, last finished daily race) crosses the WebView storage bridge and is kept in AsyncStorage; a corrupt row is refused and the stored one stays.
- `mobile/__tests__/race-hints-storage.test.ts` - M4-7: the first race hints row (hint ids shown on this device) crosses the WebView storage bridge, is kept in AsyncStorage and its removal ("Show hints again") is kept too; an oversized row is refused.
- `mobile/__tests__/race-intro-storage.test.ts` - F5: ряд знакомства с гонкой проходит мост хранилища WebView и остается в AsyncStorage после перезапуска; слишком длинный ряд отклоняется.
- `mobile/__tests__/race-ghost-storage.test.ts` - M4-4: the personal ghost row of a 5-minute race (larger than the 16 000 character limit of the other rows) crosses the WebView storage bridge, is kept in AsyncStorage and reads back with its mark times; a corrupt or oversized row is refused and the stored one stays.
- `mobile/src/simulator/race-haptics.ts` - вибрация гонки в приложении (M3-4): строгая проверка сообщения `{"type":"race-haptic","event":...}` из WebView (ровно два ключа, одно из четырех событий), только для экранов `/game` и `/multiplayer`, свой троттл 300 мс, флаг `__REGATTA_RACE_HAPTICS__` в языковом скрипте `SimWebView` (true только на этих экранах), отображение на expo-haptics (выстрел Heavy, знак Medium, контакт Warning, финиш Success); `SimWebView` обрабатывает его сразу после диагностики и дальше не передает.
- `mobile/__tests__/race-haptics.test.tsx` - флаг обработчика только на экранах гонки до и после загрузки, проверка сообщения, отображение на expo-haptics, троттл на подставных часах, отказ для тренажеров и прочих WebView, сообщение не доходит до обработчика страницы, ключ `regatta.race.haptics.v1` проходит мост хранилища.
- `mobile/src/navigation/RaceSetupPanel.tsx` - app Race hub setup panel (preset, level and wind, or mission radios, 44 pt targets); F1: the easy preset reads "Easy race" once this device has raced
- `mobile/src/navigation/RaceHubMedal.tsx` - M4-5 in the app's race menu: the course medal and next goal of the course the hub's start opens, read from the `regatta.race.medals.v1` row in AsyncStorage on every focus, with the shared web copy (`src/data/race-medal-copy.ts`); text only, not cyan, no animation
- `mobile/src/navigation/RaceHubNextStep.tsx` - M4-6 in the app: the Race hub next-step card on top (same choice as the web, `src/lib/race-next-step.ts`), reading the race home, medal and best-time rows from AsyncStorage on focus (`useRaceHubRows`); one secondary button at most (practice or daily race), no animation; F1: `useRaceHubRows` also counts the native race history (`countStoredRaces` in `mobile/src/persistence/race-history.ts`) for `hasRacedBefore`; `hubRacedBefore` keeps the words neutral ("Easy race" / "Start the race") until the first storage read of a mount settles, so a returning player never sees "first race" flash
- `mobile/src/navigation/race-setup.ts` - app Race hub setup: presets, route built for the race (`/game?difficulty&wind` or `?mission`), 7-language labels; F1: `hubStartLabel` ("Start your first race" only until this device has raced; easy preset words shared with the web in `src/data/race-start-copy.ts`). The hub's one start button is pinned under the scroll above the tab bar (`mobile/src/navigation/ProductHub.tsx`, test id race-hub-start-bar); the race photo above still starts the same race; F5: a plain "How to race" row (`RACE_INTRO_HREF`, `/game?intro=1`) opens the race page only for its intro, which gives the screen back to the hub when closed
- `mobile/src/simulator/SimWebView.tsx` - Local asset loading, routing or durable storage; after load it injects only the storage rows that changed since the page was last given them, under `NATIVE_STORAGE_SYNC_FLAG` so the race storage bridge does not post them back (M4-4); race surfaces use `mobile/src/simulator/race-shell.ts` (onContentProcessDidTerminate on /game reloads once instead of going straight to Retry); validated sail lesson return dismisses the practice route so the following Back reaches the original outline.

Release verification: `.github/workflows/deploy.yml` checks all three installed offline packages and runs smoke, foundation, sailing learning, shared replay, radio workspace and offline browser suites against the loopback production build before publishing images. The focused foundation suite also runs in its own CI job for branch/PR feedback; its fixture dismisses the unrelated trainer introduction tour. `ops/deploy/test_deploy.py` locks the prepublication suite selection, loopback target, absence of deploy secrets and main-only publication/deployment conditions. This workflow guard does not replace owner-configured environment restrictions. Pinned actions, immutable image deployment and the forced SSH boundary remain unchanged. The expanded browser gate must still run on the combined source candidate before another publication.

Both pre-deploy and production browser report steps use always() with the same pinned upload action, narrow playwright-report directory and 14-day retention, so successful retries preserve screenshots, retry traces and bounded Pro JSON attachments. The existing boundary tests also lock these artifact limits; the production job still requires successful deploy. This does not change trace-on-first-retry, UI assertions, budgets or host authority. Foundation-only CI report retention is unchanged.

Completion and installed sailing package:

- `src/lib/race-completion.ts` - once the player finishes, immediately sails every remaining bot to its own finish or the 300 s race limit with the same 30 Hz engine (M0-6, was a 15 s window); completed snapshots wait in an immutable queue for their matching native durable acknowledgment.
- `src/lib/race-completion.test.ts` - actual bot finish, penalty ranking, DNF cutoff, ordinary-step equivalence and isolated pending saves.
- `src/features/race-3d/Race3DView.test.tsx` - shared World course geometry, replaced course refs and stable-frame rendering.
- `mobile/__tests__/race-native-history.test.ts` - Installed shared sailing package routing, language or asset regression.
- `mobile/app/simulator-v1/index.tsx` - Installed shared sailing package routing, language or asset regression.
- `mobile/app/anatomy/index.tsx` - Installed shared sailing package routing, language or asset regression.
- `mobile/assets/sailing-offline.html` - Installed shared sailing package routing, language or asset regression.
- `mobile/assets/sailing-offline.manifest.json` - Installed shared sailing package routing, language or asset regression.
- `mobile/scripts/offline-sailing/i18n.test.tsx` - Installed shared sailing package routing, language or asset regression.
- `mobile/scripts/offline-sailing/build.test.ts` - Installed shared sailing package routing, language or asset regression.
- `mobile/scripts/offline-sailing/README.md` - Installed shared sailing package routing, language or asset regression.
- `mobile/scripts/offline-sailing/i18n.tsx` - Installed shared sailing package routing, language or asset regression.
- `mobile/scripts/offline-sailing/entry.tsx` - Installed shared sailing package routing, language or asset regression.
- `mobile/scripts/offline-sailing/embed.test.ts` - Installed shared sailing package routing, language or asset regression.
- `mobile/scripts/offline-sailing/embed.ts` - Installed shared sailing package routing, language or asset regression.
- `mobile/scripts/offline-sailing/next.tsx` - Installed shared sailing package routing, language or asset regression.

The installed sailing package includes the unchanged original Basics and Anatomy pages, their eight posters and the same yacht as Trainer/3D Boat/solo. Native routes retain their simplified recovery destinations. Saved replay geometry now drives the actual shared buoys and lines, including asynchronously replaced course refs. Race results are finalized at the player finish; delayed share, leaderboard or coach responses cannot update a later race.

Installed course asset reading: SDK54 expo-file-system 19.0.23 File.text() checks write access even for a read; application bundle resources are read-only. `mobile/src/course/local-course-asset.ts` retries the same bundled URI with legacy readAsStringAsync UTF-8 (read permission), never downloads it. Native diagnostics record only the bounded stage/code/scheme. `mobile/src/course/LocalCourseWebView.tsx` separates asset, storage, WebView, runtime and timeout failures without discarding stored progress.

- `mobile/scripts/asc-upload-screenshots.test.mjs` - nine offline Node regressions covering explicit selection, dry-run, capacity, upload/processing failure, safe deletion order, concurrency and idempotent retry. Included by mobile test:release-tools/check.
- `mobile/scripts/asc-upload-screenshots.mjs` now requires an explicit editable version and local screenshot manifest; dry-run is default. Only selected existing sets change, all new files must be COMPLETE with verified checksums before any old selected ID is removed. `mobile/asc-metadata/SCREENSHOTS.md` distinguishes historical source frames from current release captures.
- Sternik native exam navigation uses React Navigation usePreventRemove, which prevents UIKit/native-stack dismissal as well as JS navigation; plain beforeRemove prevention is unsupported there. Stay retains the same exam and Exit dispatches the blocked action once.

Native Apple purpose descriptions: `mobile/app.json` and all seven JSON files in `mobile/locales/` include microphone and on-device SRC transcription purposes plus NSPhotoLibraryUsageDescription. The latter covers unused Photos symbols linked by ExpoFileSystem legacy packaged-file support; Regatta does not request personal photo access. Verify base Info.plist and all seven InfoPlist.strings in the archive and exported IPA, because successful upload does not establish Apple import success.

TestFlight60 release evidence: `docs/design/mobile/testflight60-2026-10-24.md` records exact source8e39721, IPA signing/hash, final Simulator checks, Apple VALID processing and verified Self distribution, while keeping website/App Review and physical-device limits explicit. Machine-readable selected evidence: `docs/audits/2026-10-24/verification/native60-delivery.json`.

## 2026-10-25 corrections

Повторная сверка утвержденного плана: `docs/audits/2026-10-25/plan-recheck.md`. Реализация, свежие скриншоты и незакрытые проверки: `docs/audits/2026-10-25/corrections.md`. Новые общие данные не меняют содержание native или коэффициенты physics.

- `e2e/foundation.spec.ts` - браузерные сценарии настоящего квиза, возврата и ошибки сохранения; минимум 44px для возврата сравнивается с точностью 0,001px из-за погрешности DOM geometry; выполнение отмечается отдельно.
- `src/app/radio/navigation.ts` - совместимый экспорт общего контракта SRC из src/lib.
- `src/app/radio/navigation.test.ts` - ограниченные маршруты, история и защита выхода из экзамена SRC.
- `src/lib/radio-navigation.ts` - общий ограниченный контракт маршрутов SRC, native entry, Back, подтверждение выхода; Metro видит src/lib.
- `src/app/start/copy.ts` - семь языков учебных состояний и честных итогов.
- `src/app/start/foundation-content.test.ts` - неизменность 19 исходных вопросов, учебных текстов и SVG после переноса.
- `src/app/start/foundation-progress.test.ts` - сохранение проверок, черновика, места и повторной записи без ложного зачета.
- `src/app/start/start.module.css` - адаптивный учебный экран на бумажной теме, доступные цели и контраст.
- `src/app/start/useFoundationProgress.ts` - загрузка и последовательная запись учебных свидетельств с retry.
- `src/data/bootcamp-quiz.ts` - единый исходный банк 19 вопросов для сайта и native; порог сдачи реэкспортирует из `src/data/bootcamp-quiz-key.ts`.
- `src/data/foundation-guide.ts` - общие цели, модули, шаги и семь языков курса из восьми уроков.
- `src/features/race-3d/useRaceView.test.ts` - сохраненные camera presets и безопасный default orbit.
- `src/features/race-scene/orbit-camera.ts` - начальные игровые ракурсы с тем же fit яхты, что в тренажере, и поза камеры «За кормой» для текущего курса с сохранением масштаба игрока.
- `src/features/race-scene/orbit-camera.test.ts` - проекция лодки и мачты во viewport при разных размерах; камера «За кормой» стоит за кормой на любом курсе, не прыгает на повороте, держит масштаб и возвращается после ручного вращения.
- `src/features/simulator-3d/SailingCameraRig.tsx` - общая свободная камера, preset/reset один раз, удержание пользовательского ракурса.
- `src/features/simulator-3d/SailingCameraRig.test.tsx` - реальный Three camera lifecycle, жесты, resize, reset и cleanup.
- `src/features/simulator-3d/SceneStartup.tsx` - готовность после первого рендера и локализованный видимый статус загрузки.
- `src/features/simulator-3d/SceneStartup.test.tsx` - готовность после рендера, однократное событие и отмена при cleanup.
- `src/features/simulator-3d/Simulator3D.test.tsx` - честное разделение осмотра формы и управления яхтой.
- `src/features/simulator-3d/orbit-controls.ts` - canvas-only rotate/zoom и фильтрация независимых пальцев на штурвалах.
- `src/features/simulator-3d/orbit-controls.test.ts` - поворот, zoom и независимость управления от чужих pointer events.
- `src/features/simulator-v3/ui/pods/MainTrimPod.test.tsx` - краткая цель задания и рабочие длины снасти в панели.
- `src/features/trainer-controls/ControlDock.test.tsx` - задание сохраняет видимый доступ к общим штурвалам.
- `src/features/trainer-controls/Wheel.test.tsx` - точное дробное значение в ARIA без неверного округления.
- `src/features/trainer-controls/WheelDeck.test.tsx` - штурвал реального гика-шкота использует метры и нужный шаг.
- `src/features/trainer-controls/sound-copy.ts` - общие семь языков настройки звука, отдельно от громкости рации.
- `src/lib/learning/foundation-drawings.ts` - исходная чистая геометрия учебных схем для обеих платформ.
- `src/lib/learning/foundation-progress.ts` - новое ограниченное web evidence; старое completed означает просмотр, не сдачу. Проверяет и оценивает ответы по `src/data/bootcamp-quiz-key.ts`.
- `src/lib/product/learning-web.test.ts` - продолжение и честные счетчики сайта с сохранением legacy данных.
- `src/lib/sounds.test.ts` - race sound tests: on by default, old muted users stay muted, separate from the wheel clicks, persistence, nothing before a gesture, nothing while muted.

- `src/lib/race-startup.ts` - готовность относится к конкретной гонке; до первого отправленного кадра нет отсчета или движения.
- `src/lib/race-startup.test.ts` - загрузка не превращается во время simulation, устаревший callback не запускает новую гонку.
- `src/components/RaceReturn.tsx` - «Вернуться к гонке» на странице практики, открытой из разбора гонки (тренажер трима, карточка правила, урок); в приложении и во встраивании ничего не рисует.
- `src/components/FoundationReturn.tsx` - видимый возврат из immersive web practice в отведенной панели, native использует собственный header.
- `src/lib/learning/foundation-navigation.ts` - известные ID и ограниченные URL возврата без зависимости от банка вопросов.
- `src/data/foundation-copy.ts` - общие короткие подписи шагов и возврата, без импорта всех учебных объяснений в каждый toolbar.

- RaceCockpit notice keeps actual/suggested course visible in its reserved panel during pause/countdown/rule messages; primary Restart/Resume uses the common action accent. This UI checkpoint does not certify complete physical-scale parity or successful manual race completion.

Free-trim acceptance correction2026-10-25: `src/features/simulator-v3/ui/shared.tsx` defines FREE_TRAINER_UI with view3d; `src/features/simulator-v3/SimulatorV3Page.tsx` applies it only to free entry, share-link defaults and free reset. DEFAULT_UI remains the instructional baseline, lesson presets and stored checkpoint ui retain their explicit views. Informational values in `src/features/simulator-v3/ui/MetricsStrip.tsx` use neutral colors; selected actions retain cyan.

- `src/features/simulator-v3/ui/TrainerBoat3D.test.tsx` checks controlled camera preset rendering, preservation of session input and absence of overlaid camera buttons. Compact camera presets live in the existing reserved View panel; short portrait scenes cannot overflow the metric strip and shared dock tabs retain44px minimum width.
- SRC offline navigation stores hash/query/chapter selection in its bounded internal history through `src/lib/radio-navigation.ts` and `src/app/radio/runtimeSearch.ts`; `mobile/scripts/offline-radio/router.tsx` publishes route changes before child render. `src/app/radio/teoria/page.tsx` replaces the selected chapter in the current entry, so Review topic and Back restore the correct chapter without new artificial history steps.

- `src/app/radio/teoria/sectionLabels.ts` defines all12 Learn/Exam section headings explicitly in seven languages; `src/app/radio/teoria/sectionLabels.test.ts` checks all84 labels against actual locale catalogs and source usage. These are adapted UI, not original Polish exam text.
- `src/app/radio/weakSpots.test.ts` protects filtering before limits, scoped SRC reset and preservation of complete Sternik oral records in the shared existing storage key. `src/app/radio/WeakSpotsPanel.tsx` uses the same optional scope for list and reset; default unscoped callers keep their previous behavior.

61 delivery/current acceptance: `docs/design/mobile/testflight61-2026-10-25.md`, `docs/audits/2026-10-25/acceptance61.md`, `docs/audits/2026-10-25/checks/native61-delivery.json`. Actual UI/source/delivery proofs remain separate. The original build60 baseline stays immutable.

Checkpoint62 ordered work is `docs/audits/2026-10-25/release62-harness.md`: urgent SRC legacy-storage compatibility and bounded startup recovery, plus ADR-0010 foreground time/lifecycle and accessible slider names. Owner TestFlight screenshot60 shows failure before the radio mounts; an old lang.v1 snapshot reproduces that native read failure in60/61. Physical solo courses under ADR-0011 remain a following checkpoint. No physical course is enabled by this documentation.

- `src/features/sailing-lab/runtime/clock-lifecycle.ts` anchors visibility boundaries even without hidden RAF/timer samples, and disposes stale clocks; `src/features/sailing-lab/runtime/clock-lifecycle.test.ts` verifies real helper timing/lifecycle contracts. Fixed clock accepts at most2seconds/60steps of foreground time and synchronizes ready/pause/enabled state without clearing cumulative ticks. GameClient publishes HUD from the final fixed-step batch.


Delivered62/current full65 acceptance: `docs/design/mobile/testflight62-2026-10-25.md`, `docs/audits/2026-10-25/acceptance62.md`, `docs/audits/2026-10-25/checks/native62-delivery.json`. Exacte3d/tag testflight-1.7.0-62 is immutable; actual48->61failure->62instrument/relaunch and existing8-value upgrade are separate QA proofs. Physical courses/map/wind instruments/geographic island routes remain open, and website publication has its own full gate.

- `docs/audits/2026-10-25/physical-courses-next.md` is the portable ordered implementation plan for shared Trainer kinematics, versioned short/medium/long contexts and pre-emission metadata/PB/replay/server compatibility. Proposed modules are not implemented by this document. It keeps map/wind and geographic island topology separate from three leg lengths.
- `docs/audits/2026-10-25/feedback-triage.md` reconciles actual submitted build60 feedback with bounded62 evidence; raw feedback/contact data stays outside Git.

## Physical-course phase1, preparation only

- `src/lib/sailing-kinematics.ts` owns the existing Trainer heading and metre displacement laws without React, DOM or feature dependencies. `src/features/sailing-lab/runtime/session.ts` calls it in the original heading-before-force and travel-after-force order. The public Steering and heading-rate exports remain compatible.
- `src/lib/sailing-kinematics.test.ts` checks knot/metre travel, compass/leeway signs, low-speed helm authority and bounded course assist.
- `src/features/sailing-lab/runtime/session.kinematics.test.ts` locks a complete600-tick pre-extraction production trajectory with a portable normalized digest and readable numeric checkpoints.
- `src/lib/race-context.ts` defines immutable registered legacy/physical contexts, strict invalid/unsupported reads and canonical base result classes. Missing historical context remains legacy.
- `src/lib/race-context.test.ts` checks all registered contexts, unknown revisions/models/units and preservation of raw inputs.
- `src/lib/race-courses.ts` is the 120/300/600m metric registry, used only by the opt-in `/game?race=` physical trial (ADR-0014), and fresh world-coordinate factory/spawn layout. Its hull-centre water limits are shared by actual physical motion and prediction. It does not switch race defaults, recordings or multiplayer. Metadata/PB/replay/server compatibility must precede activation.
- `src/lib/race-courses.test.ts` checks metric distances, fixed hull/hardware, all five fleet clearances, proposed rounding envelopes and unchanged legacy factory output. Full sailing/recovery validation remains a later engine gate.

- `src/app/radio/obsluga/guideTranslations.test.ts` reads actual JSX section titles and visible table cells through the real catalog/generator, protecting all7 guide adaptations, verbatim hardware inscriptions and existing aliases. The generator explicitly enumerates paired JSX language attributes and visible Table arrays, including copy with equals signs; it does not rewrite course IDs, state or protocol speech.
- `docs/audits/2026-10-25/release63-harness.md` owns the bounded SRC layout/guide-copy, Foundation gutter and Sternik information checkpoint, native verification and separate website gates.

- `docs/audits/2026-10-25/checks/website62-runtime-gate.json` is the portable72b4f57 publication, immutable image/runtime and red final browser-gate record. Healthy deployment and targeted manual UI do not replace successful full acceptance.
- `docs/audits/2026-10-25/checks/website63-browser-contracts.json` records the exact red60-case source/artifact, five diagnosed LCD/Menu expectation corrections and the required next combined gate without claiming runtime or delivery acceptance.

- Language URL cleanup in `src/lib/i18n.tsx` preserves browser history state. Removing a lang query must not replace App Router metadata with null: that can change the Back URL while leaving the previous React screen mounted. The seven SRC course-return browser cases cover this flow.


## Local diagnostics and rotary radio input, candidate63

The typed journal accepts only finite command projections and fixed outcome/reason
codes. It retains at most200 entries/64KiB with a48h persisted envelope. Adjacent
control samples can coalesce while retaining their input count and endpoints.
Browser journals use one debounced localStorage row. Installed WebViews use
memory only; validated append-only batches flow to the authoritative native
AsyncStorage journal. Neither transport can invoke navigation, storage or speech
commands. Raw messages, answers, callsigns, MMSI, positions, audio, URLs and
exception text never enter these entries. No automatic upload is added.

Native Settings opens the app journal with filter, clear and confirmed clipboard
copy. Clear all suspends native persistence before deletion and removes any late
write. One pending diagnostic flush and one latest-state follow-up bound a stalled
writer. Radio panels and sailing docks expose the current screen journal in
reserved space. One preloaded split point shares its seven-language panel without
duplicating the catalog in every route; offline builders embed that code locally.

Radio DIAL uses one pointer owner, centre horizontal detents or rim angle detents,
a visible index, tap selection and1000ms power hold. Rotation cancels tap/hold;
cancellation, model/Inspect changes and unmount clear pending timers. All layouts
retain44px arrow controls and keyboard alternatives. Runtime radio commands are
projected from actual previous/next reducer states, outside React updaters.
Race/trainer adapters log user commands and actual save acknowledgements, excluding
physics ticks and automatic helm corrections. Coverage and limits are recorded
in `docs/audits/2026-10-25/diagnostics63.md`; a journal is not proof that every
product acceptance item has passed.

- `mobile/__tests__/screens/diagnostics.test.tsx` - native journal filtering, progress-preserving clear and confirmed clipboard outcomes.
- `mobile/app/diagnostics.tsx` - native Settings destination for the whole app journal.
- `mobile/src/diagnostics/DiagnosticLifecycle.tsx` - nonblocking native initialization and foreground/background flush boundaries.
- `mobile/src/diagnostics/journal.test.ts` - native delayed read/write, wipe, failed storage, transport and boundedness checks.
- `mobile/src/diagnostics/journal.ts` - native asynchronous journal, coalesced flushes, safe embedded transport and global-clear epoch barrier.
- `src/app/diagnostics/page.tsx` - web Menu destination for the current browser journal.
- `src/app/game/GameClient.commands.test.tsx` - actual solo handler normalization, rapid commands, no-op and recorder failure isolation.
- `src/app/radio/symulator/RadioFront.test.tsx` - all model/skin/layout arrow and index markup contracts.
- `src/app/radio/symulator/commandDiagnostics.test.ts` - radio clamp/rejection results and private-data exclusion.
- `src/app/radio/symulator/commandDiagnostics.ts` - safe actual radio reducer outcome projection without transmission contents.
- `src/app/radio/symulator/dialGesture.test.ts` - rim/centre motion, cancellation, keyboard and hold exclusivity.
- `src/app/radio/symulator/dialGesture.ts` - pure detents and exclusive tap/hold/rotate lifecycle controller.
- `src/app/radio/symulator/useRotaryDial.ts` - React pointer capture, moving index, gesture diagnostics and local non-passive touch-default cancellation outside Inspect.
- `src/app/radio/symulator/useRotaryDial.test.ts` - actual hook/ref listener, pointer command exclusivity, Inspect and node/model cleanup contracts.
- `src/components/diagnostics/DiagnosticAccess.tsx` - preloaded journal disclosure inside existing sailing dock space.
- `src/components/diagnostics/DiagnosticPanel.tsx` - filtered local journal, explicit clear and guarded browser copy.
- `src/components/diagnostics/DiagnosticPanelLoader.tsx` - shared dynamic panel split point, locally bundled in native builds.
- `src/features/simulator-3d/physics/useSailingSim.diagnostics.test.ts` - real control hook commands, no-op, automatic correction suppression and logger failure isolation.
- `src/features/simulator-v3/SimulatorV3Page.diagnostics.test.tsx` - actual trainer UI trim geometry/reef/furl projection.
- `src/features/simulator-v3/hooks/use-trainer-checkpoint.test.ts` - pending versus acknowledged checkpoint saves, errors and restore.
- `src/lib/diagnostic-copy.ts` - complete seven-language journal/outcome copy.
- `src/lib/diagnostic-destination.test.ts` - static route projection and unknown-route privacy regression.
- `src/lib/diagnostic-destination.ts` - fixed route and surface identifiers that omit all dynamic path/query data.
- `src/lib/diagnostic-title.ts` - small shared title and language lookup without the full panel catalog.
- `src/lib/diagnostics-bridge.test.ts` - batch bounds, original event counts, private-field rejection and failed transport isolation.
- `src/lib/diagnostics-bridge.ts` - one append-only native transport for original validated events.
- `src/lib/diagnostics-controls.test.ts` - actual outcome and unchanged-value projections.
- `src/lib/diagnostics-controls.ts` - failure-isolated normalized control and preference recording.
- `src/lib/diagnostics-web.test.ts` - SSR isolation, persistence failures, original-input subscription and native memory-only regression.
- `src/lib/diagnostics-web.ts` - per-window browser journal and memory-only native WebView adapter.
- `src/lib/diagnostics.test.ts` - privacy, event ranges, byte/entry bounds, coalescing and expiry regressions.
- `src/lib/diagnostics.ts` - pure bounded journal, exact event schemas and validated persistence/transport codecs; when full it evicts by retention class (`diagnosticRetention`: continuous control.change, dial, scan and seek first; lifecycle, save, perf, gpu, race.summary, startup and failures last); race.summary schema and race.lifecycle restart/results/finish-hold/exit-ask/exit-stay.

The shared radio hardware stage disables text selection and iOS touch callouts
for its faceplate/captions and cancels contextmenu. The DIAL button alone was
already protected, but installed course holds could still select the nearby
caption and cover controls. Teaching text and diagnostics lie outside this stage
and keep selection/copy. The source6aaa110 candidate is preserved, never uploaded.

### Delivered63 and following navigation instruments

`docs/design/mobile/testflight63-2026-10-25.md` and
`docs/audits/2026-10-25/checks/native63-delivery.json` pin source88fdaac and
actual Self/native evidence. `docs/audits/2026-10-25/diagnostics63.md` owns
coverage limits. `docs/audits/2026-10-25/acceptance63.md` retains all65rows
and current qualified acceptance. Next64 adds race map/wind display and shared gear affordance;
physical motion/classes and full product acceptance remain separate.

- `docs/audits/2026-10-25/checks/website63-prepublication.json` - immutable APP 88/runtime and SITE c8ae4ef first-pass 60 proof, validated Pro observations/artifact hashes and explicit unpublished/partial-acceptance boundaries; later docs-only sync does not add source 64.
- `docs/audits/2026-10-25/checks/website63-production.json` - published b75c1e4/runtime88 image digests,60 first-pass prepublication cases,16 healthy public routes and exact catalogs/privacy; final74-case production gate has70 first-pass,1flaky,2failed,1skipped. Records the real63 multiplayer accessible-name defect and proposed bounded trainer test corrections, with fresh OPS/volume verification explicitly unknown.


### Map/wind presentation checkpoint64

`docs/audits/2026-10-25/release64-harness.md` owns the next ordered UI gate.
`src/features/trainer-controls/GearIcon.tsx` is the lightweight shared toothed
settings SVG used by existing control settings, with labels/actions retained.
CoursePreview wind text suppresses the inherited arrow stroke.

- `src/features/race-hud/navigation-model.ts` - pure finite true/apparent wind
  readings and immutable live course/fleet snapshots, using the trainer sign
  convention. Uniform north-up projection preserves all actual course geometry.
- `src/features/race-hud/navigation-model.test.ts` - wind sign/speed/unknown data,
  reversed shared lines, actual marks/boats and projection/terrain contracts.
- `src/features/race-hud/RaceOverviewMap.tsx` - reserved SVG course overview with
  start/finish lines, all marks, player/fleet headings and incoming true wind. F3: на полной карте стрелка стороны огибания у знака, след игрока и линия подсказки маршрута; своя проекция большой карты (масштаб, нос наверху поворачивает лодки, ветер и стрелку севера), крупнее значки.
- `src/features/race-hud/RaceOverviewMap.test.tsx` - map labels, actual elements,
  shared-line deduplication and invalid snapshot fallback.
- `src/features/race-hud/navigation-copy.ts` - all map/wind/style labels in
  RU/EN/PL/ES/FR/DE/IT: bow-relative true TWA, absolute TWD and distinct apparent air arrows.
- `src/features/race-hud/RaceWindInstrument.tsx` - bow-up true-wind instrument,
  signed-side TWA, separate absolute TWD/TWS and detailed apparent speed; all four saved visual aid choices retained.
- `src/features/race-hud/RaceWindInstrument.module.css` - compact/detailed
  instruments,44px choices and wrapping unknown values on narrow screens.
- `src/features/race-hud/RaceWindInstrument.test.tsx` - bow/arrow/side/wrap/endpoints,
  true/apparent separation, unknown readings and exclusive four-way controls across all seven languages; F2: хвост стрелки читается из разметки и лежит в четверти того борта, откуда дует, слово «с носа» / «с кормы» совпадает с доступным именем на всех языках.
- `src/features/race-hud/wind-dial.ts` - F2: чистый ветер относительно носа для прибора ветра (нос наверху): знаковый угол, TWA, борт (левый, правый, с носа, с кормы; 0 и 180 без борта), точки хвоста, острия и двух усов стрелки на циферблате, по которым прибор и рисует стрелку; ветер с правого борта рисуется справа.
- `src/features/race-hud/map-view.ts` - F3: чистая математика большой карты гонки: масштаб от всей трассы (1) до 8, шаги кнопок, щипок, колесо, «Вся трасса», север наверху или нос наверху, проекция из координат гонки в пиксели (при приближении лодка игрока остается на том же месте карты, нос наверху поворачивает мир вокруг лодки), сдвиг приближенной карты пальцем (в пределах половины трассы, сбрасывается на всей трассе), перевод сдвига с экрана в координаты гонки с учетом поворота, запись следа в онлайн-гонке (раз в секунду, не больше 1800 точек), прореживание следа и дуга стрелки огибания знака (левым бортом против часовой стрелки).
- `src/features/race-hud/map-view.test.ts` - F3: вся трасса внутри карты, лодка на месте при приближении, нос вверх при любом курсе и вся трасса при этом в карте, пределы масштаба, сдвиг пальцем и его сброс, запись онлайн-следа, след и направление стрелки огибания.
- `src/features/race-hud/RaceBigMap.tsx` - F3: большая карта поверх сцены гонки, мультиплеера и повтора (открывается касанием мини-карты): трасса со стороной огибания знаков, все лодки, твой след, ветер и линия подсказки маршрута, когда подсказки включены (те же галсы, что маршрут на воде, `guidancePath` из `src/features/race-scene/guidance.ts`); север наверху / нос наверху, «Вся трасса», минус и плюс под картой, щипок двумя пальцами, колесо мыши и сдвиг приближенной карты одним пальцем; закрывается кнопкой и Esc из любого места (слушатель окна в фазе захвата, Esc не ставит гонку на паузу), гонка идет, док с рулем не закрыт. В одиночной гонке карта привязана к raceId (рестарт начинается с закрытой картой) и прячется под листом паузы; в мультиплеере след пишет `src/app/multiplayer/MultiplayerClient.tsx`.
- `src/features/race-hud/RaceBigMap.module.css` - F3: сплошная панель над сценой (z-index 5: над угловыми приборами и строкой тренера, под отсчетом старта, стартовыми флагами, тостами и рамкой касания, листом паузы и строкой состояния), кнопки 44 px, текст 16 px, пояснение 14 px, касание по карте не двигает страницу; на низкой сцене (контейнер до 560 px) заголовок только для чтения с экрана, виды рядом с крестиком, без пояснения, карта ужимается, панель прокручивается в крайнем случае.
- `src/features/race-hud/RaceBigMap.test.tsx` - F3: открытие на всей трассе севером вверх, шаги масштаба и «Вся трасса», нос наверху (поворот на минус курс) и запоминание выбора, щипок, сдвиг пальцем, закрытие кнопкой и Esc, эффекты на подделках (Esc с окна в фазе захвата, колесо без прокрутки страницы, размер рамки, фокус на крестик и обратно), маршрут только с подсказкой и лавировкой вне мертвой зоны, прореженный след, без лодки игрока только север, слои (отсчет и тосты над картой).
- `src/data/race-map-copy.ts` - F3: подписи большой карты на 7 языках (закрыть, ориентация, север наверху, нос наверху, масштаб, «Вся трасса», след, подсказка маршрута, сторона огибания, «Гонка идет»), термины по глоссарию.
- `src/features/race-hud/hint-log.ts` - F4: чистый журнал подсказок гонки: все, что отдано шине отзывов (правила, пропущенный знак, повороты, знак, места, сплиты, подсказки первой гонки), строка маршрута, когда просит маневр (оверштаг, фордевинд, за линию, знак слева), и смена подсказки трима Pro, когда она просит действия (`LOGGED_TRIM_KEYS`, строка трима сразу после строки трима заменяет ее); выбор строк маршрута и трима для страницы (`loggedRouteAction`, `loggedTrimKey`); новые сверху, не больше 20, тот же текст не раньше чем через 20 с гоночного времени; формат времени «1:05».
- `src/features/race-hud/hint-log.test.ts` - F4: порядок и время, предел 20 строк, окно повтора, пустой текст и время не числом отбрасываются, виды по источникам шины, какие действия маршрута пишутся, мигающий трим не вытесняет замечания судьи, строки маршрута и трима только при своих подсказках.
- `src/features/race-hud/RaceHintLog.tsx` - F4: хук журнала гонки на странице (добавить строку с временем гонки, очистить для новой гонки), список строк и панель «Подсказки гонки» над сценой (диалог, Close 44 px, Esc раньше паузы гонки, фокус возвращается к открывшей кнопке, только если не ушел к другому элементу, например к меню паузы).
- `src/features/race-hud/RaceHintLog.module.css` - F4: панель журнала там же, где большая карта (z-index 5, сплошная), текст 16/24, время и вид 14/20, тон рамкой слева (не циан), без анимации.
- `src/features/race-hud/RaceHintLog.test.tsx` - F4: разметка панели (диалог с именем, новые сверху, время и вид, «гонка идет» только не на паузе), пустой журнал на en и ru, размеры текста, 44 px, без циана и анимации.
- `src/data/race-hint-log-copy.ts` - F4: подписи журнала подсказок, групп «Подсказки» и «Графика», строки тренера, подсказок первой гонки, правила золота и мягкого света на 7 языках.
- `src/data/race-sail-flow-copy.ts` - F6: подпись и пояснение настройки «Ветер на парусах» в группе «Графика» на 7 языках (вымпельный ветер, цвета колдунчиков).
- `src/app/game/GameClient.hintLog.test.tsx` - F4: настоящий GameClient кладет каждое сообщение шины в журнал с видом, тоном и временем гонки, отдает журнал кокпиту и очищает его при новом старте.
- `src/app/game/RaceCockpit.hintLog.test.tsx` - F4: строка тренера выключается (без строк маршрута и трима полосы нет, у старых настроек она включена), журнал открывается из строки тренера, из настроек и с паузы (поверх листа паузы), закрывается и принадлежит своей гонке; группы «Подсказки» и «Графика» пишут новые переключатели в настройки гонки.
- `src/features/race-hud/race-intro.ts` - F5: чистые правила знакомства с гонкой «Как проходит гонка»: само открывается только на старте из лобби (и передаче из хаба приложения), один раз на устройство (и тем, кто гонялся до появления знакомства), не в пробной гонке и не в мультиплеере; `?intro=1` (строка хаба приложения) открывает его по запросу, но не в пробной гонке, повторе и гонке с настройкой из ссылки; «Начать гонку» ведет сразу к отсчету, «Пропустить» на шаг самого старта (брифинг первого старта трассы); запись `regatta.race.intro-seen.v1` при старте, пропуске и «Понятно» по запросу в одиночной гонке (не из мультиплеера), память визита при запрете хранилища.
- `src/features/race-hud/race-intro.test.ts` - F5: когда открывается само и когда нет (пробная, «Еще раз», «Заново», «i», возврат после перезагрузки), когда открывает ссылка `?intro=1`, какие концы записывают просмотр, шаг после конца, четыре карточки без выхода за края, запись на устройстве и порченая строка, ключ в списке моста приложения, тексты на 7 языках без тире, правило 30° и знака слева.
- `src/features/race-hud/RaceIntro.tsx` - F5: модальный лист из четырех карточек (цель, руль и шкоты, ветер относительно носа, карта и подсказки) со схемами на SVG из частей гонки (геометрия прибора ветра, значки HUD); перед первой гонкой «Пропустить» и одно основное действие «Начать гонку», по запросу «Закрыть» и «Понятно»; Esc, стрелки, Tab внутри листа; клавиши ловит слушатель окна в фазе захвата, поэтому они не доходят до гонки и при фокусе на body после касания текста или фона; страница за листом получает `inert` (`inertOutside`), фокус возвращается к открывшей кнопке; из мультиплеера без Pro, шкотов и журнала подсказок; без анимации.
- `src/features/race-hud/RaceIntro.module.css` - F5: лист над страницей (z-index 90), карточка помещается на 390 x 844 без прокрутки, на низком экране прокручивается сам лист; текст 16/24, шаг 14/20, кнопки от 44 px, циан только у основного действия.
- `src/features/race-hud/RaceIntro.test.tsx` - F5: четыре карточки до «Начать гонку» (единственное основное действие последней), пропуск кнопкой и Esc при фокусе на body, все клавиши остановлены слушателем окна, Tab снаружи возвращается в лист, `inert` страницы за листом и его снятие, мультиплеер без Pro и журнала, стрелки и «Назад», по запросу «Закрыть» и «Понятно», имя и описание диалога, своя схема на каждой карточке, текст Pro и обычного режима, 7 языков, размеры и отсутствие анимации.
- `src/data/race-intro-copy.ts` - F5: тексты знакомства с гонкой на 7 языках (шаг, кнопки, четыре карточки, варианты для мультиплеера), термины по глоссарию; грузится только с ленивым листом.
- `src/data/race-intro-title.ts` - F5: название «Как проходит гонка» на 7 языках отдельно от карточек, для входов в лобби, настройках гонки, меню мультиплеера и хабе приложения.
- `src/app/game/GameClient.intro.test.tsx` - F5: настоящий GameClient открывает знакомство на первом старте вместо брифинга и отсчета, «Начать гонку» ведет к отсчету и отмечает знакомство и брифинг классической трассы, «Пропустить» к брифингу; после просмотра, из «i» и «Еще раз» не открывает; из лобби и из настроек гонки открывает по запросу, гонка встает на паузу и остается на ней; пробная гонка `?race=` не открывает его и до загрузки своего движка; «Понятно» отмечает просмотр, «Закрыть» нет; открытое хабом приложения возвращает экран хабу.
- `src/app/game/RaceCockpit.intro.test.tsx` - F5: в группе «Подсказки» настроек гонки кнопка «Как проходит гонка» 44 px открывает знакомство; без обработчика страницы ее нет.
- `src/app/multiplayer/MultiplayerClient.intro.test.tsx` - F5: мультиплеер сам знакомство не открывает, «Как проходит гонка» в меню открывает его по запросу, закрытие возвращает в меню.
- `src/app/multiplayer/MultiplayerLobby.intro.test.tsx` - F5: кнопка «Как проходит гонка» в меню мультиплеера на 7 языках, 44 px, не основное действие.
- `src/features/race-hud/wind-dial.test.ts` - F2: ветер с правой скулы справа, с левой скулы и левой раковины слева, траверз на уровне лодки, встречный сверху, после поворота оверштаг тот же ветер переходит на другой борт, нет данных - нет показания.
- `src/lib/race-visual-prefs.ts` - shared finite visual-assist schema with
  compass/arrows/both/off enum, default compass and legacy-safe sanitization.
- `src/lib/race-visual-prefs.test.ts` - all valid enum values, unknown payloads
  and preserving independent old assists/defaults.
- `src/app/game/race-prefs.test.ts` - web preference patches retain valid wind
  style, normalize invalid persisted input and record finite outcomes.
- `src/app/game/RaceCockpit.navigation.test.tsx` - reserved Map/fleet/Helm return,
  settings, actual transition diagnostics and logger-failure isolation.
- `src/features/simulator-3d/ocean/WindFlow.test.tsx` - shared real instanced
  arrow callback flow, absent/invalid wind hiding and unchanged trainer fallback.
- `src/components/ContentFooterNavLoader.tsx` - one shared dynamic import with
  default SSR. Eleven content pages share it; footer links and all translations
  stay server rendered. Keep ContentFooterNav's source path for offline adapters.
- `e2e/race-navigation.spec.ts` - batches only independent acceptance reads, with fresh per-wheel baselines. Private stage markers stay in Node; one installed passive bounded observer records classified input/EventTiming/semantic commits/RAF/longtasks with at most2documents/64KiB test-only handoff and one500ms final read. No layout reads in observers, content, product storage or per-event IPC; RAF is not presented FPS and correlation is not a delay cause. All real inputs/assertions/viewport/deadlines remain. Two independent real390px Simple race journeys:
  full live Map/Fleet/clock with five geometry samples, then wind styles/Helm
  input/preferences. Each shares the original real25s startup and15s clock
  checks within its120s total. All original assertions remain; attachments reuse
  the successful geometry samples. Validates private-free canonical journals
  in-browser, without reading invalid payloads into CI.

Solo and multiplayer both read actual model data in their existing100ms HUD
batch. No per-frame React updates, invented wind speed, new timer or protocol.
Map entry/exit and wind preferences use finite diagnostics, never boat positions.
The existing shared WindFlow renderer takes an optional actual-wind callback;
trainer callers retain their existing state path. Scene arrows require arrows
or both. Off retains numeric wind. Native keeps the enum in the existing assists
snapshot and validates durable restore/reopen without new keys or permissions.
The map is a course schematic, not a geographic chart or new physical course.
The shared Settings button uses the toothed icon; its full accessible name stays
available even where the visible tab contains only the gear.

Checkpoint64 extends the existing loopback pre-deploy E2E file set with the
shared race navigation case and the existing trainer-controls suite. The finite expected list in ops/deploy/test_deploy.py
changes with it; all9 deployment boundary tests pass. Publication/deployment
remain main-only, with the same secrets, pinned actions, report retention and
confined forced command. No host/runtime/permission policy changes.

Map SVG height now accepts the cockpit's --race-map-height custom property.
Only the active Map panel becomes a size query container; its SVG fits the
available panel height with caption space, preserving standalone auto height.
The race-navigation E2E checks complete SVG/caption containment at four viewport
sizes before any scroll. Native1543 clipping was found before upload; its
verified artifacts remain a historical never-uploaded candidate.

### Physical record readers, isolated phase2

- `src/lib/physical-race-record.ts` - strict physical sample validation without
  legacy coercion or dropped rows, actual world bounds, t0 and optional exact
  finished endpoint. Unfinished public replay does not invent a finish.
- `src/lib/race-record-context.test.ts` - old identity/bytes, all3 physical
  geometries, unknown/conflicting contexts, raw rounding, strict samples and
  disabled result/start emission.
- `src/lib/race-native-env.ts` - synchronous native marker, injected race query; `navigateNativeRaceFinish` sends a finish-screen practice or lesson link to the app (M4-2)
  and fixed race/history navigation, without importing the saved-record decoder.
- `src/lib/race-native-env.test.ts` - public reexport identity, SSR/query
  precedence, unchanged input and native destination allowlist contracts.
- `src/lib/race-replay-frame.ts` - recorded-time interpolation kept separate
  from shared replay parsing, with the existing public reexport preserved.
- `src/lib/race-replay-frame.test.ts` - public function identity, irregular
  recorded intervals, final frames, wrapped heading/wind and saved rig playback.

The existing race-courses matcher compares raw registered physical geometry;
race-native validates optional raceContext before accepting any world snapshot.
The replay context reader checks both direct and stored metadata locations
before legacy normalization. replayRecordMetadata is shared with the API so
mode cannot hide future coordinates or lose a context-only record. Historical
records without context keep their previous parser/serialized shape.
Physical records require an explicit Simple/Pro mode and retain exact recorded
coordinates, headings, speeds and timestamps. Explicit future replay schemas
are rejected before historical defaults. Legacy rounding remains unchanged.
PHYSICAL_RACE_EMISSION_ENABLED remains false at every new producer boundary;
this reader checkpoint does not introduce playable physical races or new PB.

Replay POST validates the same direct/nested metadata and raw physical samples
before player lookup, global quota or storage; known physical uploads remain422
while emission is disabled. Rebuilt course UTF-8 JSON keeps its existing16KiB
cap. GET returns422 for unsupported physical records instead of silently changing
coordinate classes, preserving the existing404 and legacy scenery behavior.
Native entry classification is mapped in docs/design/mobile/ARCHITECTURE.md.
The same classifier guards Coach before pixel-course lookup or remote requests;
late requests from a previous race cannot replace the current result. The shared
native unavailable screen and its seven-language copy keep stored history intact.
Local dependency directories and symlinks are both ignored, so worktree reuse
cannot accidentally add a machine-specific node_modules path to the repository.
Race preferences and camera hooks import only the lightweight environment;
the live replay component imports interpolation without the upload/read codec.
These synchronous boundaries preserve offline behavior. The existing6.5MiB
budget is unchanged; actual final measurements belong to the phase2 harness.

- `src/app/game/replay-copy.ts` - canonical nine replay label resources and the
  small synchronous hook, reused by the full race dictionary without a reverse
  dependency on that dictionary.
- `src/app/game/replay-copy.test.ts` - all seven languages, full dictionary
  public-shape/formatter parity and the replay-only import boundary.

The replay component no longer imports the complete rules/save dictionary.
No async boundary or first-frame fetch was added. Actual measured headroom and
offline package acceptance: `docs/audits/2026-10-26/replay-bundle-harness.md`.

### Radio16/C cancellation follow-up

RadioFront Key accepts a distinct cancel callback. Only16/C overrides the
historical cancel-as-release behavior: it clears the real hold timer before
recording one constant local radio.gesture cancel/noop. AQUA and PTT still release
on cancellation. Pointerleave and cleanup do not masquerade as pointer-cancel,
and diagnostics failure cannot revive a command or timer. RadioFront tests cover
both models/layouts and actual reducer/timer behavior. The catalog generator
excludes only the internal16c diagnostic ID, retaining visible[16/C] guide copy;
the real-generator regression guards that distinction.
Source and delivery limits: `docs/audits/2026-10-26/radio-cancel-harness.md`.
The16/C release callback also checks actual button bounds before a short command:
iOS implicit capture can deliver pointerup before pointerleave. Outside release
uses the bounded cancelled/noop path; an OS pointercancel keeps its distinct
pointer-cancel reason, and an already settled hold/cancellation is not logged twice.

### Physical comparison and result classes

- `src/lib/race-record-class.ts` - pure canonical local comparison keys, closed
  registered class lookup and global unclassified/classified selection. It has
  no storage, React, database or physics dependency and does not prove eligibility.
- `src/lib/race-record-class.test.ts` - all18 historical/54 physical keys,
  supported whole-store capacity, explicit physical mode, global provenance,
  derived class authority, unknown metadata and nonmutation.

Missing local PB context keeps the exact old key convention. Missing global
context remains unclassified even when a valid mode is supplied. Classified
saved-record/result eligibility additionally requires explicit context, mode and
raw registered geometry. Unsupported native records cannot inherit a Simple or
Short fallback. Consumer implementation and emission gates are owned by
`docs/audits/2026-10-26/physical-classes-harness.md`.

The native Sternik LocalCourseWebView guard records only actual dirty-exam
prompt requests and one cancellation per prompt. Stay/system dismissal share a
settled guard; confirmed Exit dispatches the original blocked action and a later
dismiss cannot cancel it. local-course-host tests cover actual callbacks,
duplicate suppression, stale dismissal, privacy and diagnostic failure isolation.
The remaining nine-scope logging matrix is
`docs/audits/2026-10-26/diagnostics-followup.md`.

### Physical consumer foundation, not activated

- `src/lib/race-result-eligibility.ts` - canonical registered raw course matching
  and closed classified Free-result eligibility, with physical emission disabled.
- `src/lib/race-result-eligibility.test.ts` - geometry, provenance, adjusted-time,
  condition and disabled-writer boundaries.
- `src/lib/race-result-schema.ts` - transactional additive nullable SQLite class,
  mode, context, raw finish and penalty columns, without historical backfill.
- `src/lib/race-result-schema.test.ts` - real SQLite migration, retained rows,
  rollback and repeat initialization.
- `src/lib/db.race-classes.test.ts` - real DB historical winning rows, isolated
  class/mode/conditions queries and all72comparison buckets.
- `src/lib/db.race-init.test.ts` - failed initialization closes the unpublished
  candidate connection and allows a clean retry.
- `src/lib/race-resume.test.ts` - future metadata before TTL, protected intent,
  explicit replacement/discard and actual storage outcome contracts.
- `mobile/src/persistence/race-record-presentation.ts` - pure historical,
  classified and unavailable native projection, separate from permissive replay.
- `mobile/__tests__/race-record-presentation.test.ts` - raw plus penalty,
  explicit provenance, class aliases, builder fixtures and writer-off boundary.
- `mobile/__tests__/race-history-diagnostics.test.tsx` - awaited serial clear,
  failed read/clear, unknown-row preservation and diagnostic failure isolation.

best-times owns bounded pure update planning and honest synchronous web writes.
race-resume owns protected intent storage, not live race state. Additive Daily
identity validates its canonical conditions before TTL cleanup. GameClient uses
the saved mode and sets the wind ref before initial trim, retaining context
absence/null through briefing/countdown saves. Explicit new Start may replace
an incompatible intent; dismiss and finish remain guarded against a concurrent
future save. Restart buttons retain44px targets. The navigation browser suite
adds one real saved-mode regression to the same70-case prepublication command,
without changing permissions, assertions or timeout budgets. Native validators
preserve null/absent context through actual messages; replay omits absent context
and checks both locations before using a known nested context. No historical
global/native record inherits a class from a local-PB default.

The real result/leaderboard routes retain cookie/rate/privacy contracts and
explicit finite class selectors. DB initialization publishes its connection only
after all migrations succeed. Default/Daily/mission pools exclude classified
rows; explicit class queries do not expose session IDs or arbitrary stored JSON.
Native save preparation/projection does not yet connect real History/Leaderboard
views in the initial foundation; the following list integration is described
below. A separate PB write still needs native acknowledgement. Ordered evidence:
`docs/audits/2026-10-26/physical-consumers-harness.md`.

Delivered64 is documented in `docs/design/mobile/testflight64-2026-10-26.md`,
with all65IDs retained in `docs/audits/2026-10-26/acceptance64.md` and safe portable
proof `docs/audits/2026-10-26/checks/native64-delivery.json`. NEXT source is excluded.

Native namespaced class-alias consistency belongs to the shared Replay/Coach
entry classifier, so the projection and both real routes cannot disagree about
a contradictory or future wrapper identity. Old bare aliases and minimal
historical classifier inputs remain supported. Actual-route tests verify safe
notice/Back, no shared redirect/pixel geometry/Coach request and byte-preserved
history. This boundary is not a new result class or physical writer.

- `src/lib/race-record-copy.ts` - shared seven-language saved-course titles,
  mode/condition labels and adjusted/raw/penalty wording. Unknown descriptors
  have a generic title; IDs and comparison keys never become display text.
- `mobile/src/leaderboard/race-records.ts` - projection once per stable history
  array, canonical profile/period filtering, previous score-first PBs and
  adjusted-time PB selection within each registered comparison only.
- `mobile/src/components/RaceRecordDetails.tsx` - native registered conditions,
  raw finish, penalty and adjusted time, plus preserved unavailable-record copy.
- `mobile/__tests__/race-list-consumers.test.tsx` - actual History/Leaderboard
  consumers, old ordering, all54physical groups, period/profile filtering,
  authoritative times, route exits, stable-array memoization and all7languages.
- `docs/audits/2026-10-26/checks/next70-prepublication.json` - exact16d4eed
  safe non-main gate:70first-attempt browser passes, retained artifact hash,
  source checks and explicitly skipped publication/deployment/production jobs.
- `src/features/race-hud/RaceCornerInstruments.tsx` - shared solo/multiplayer
  passive wind corner and live mini-map button, using the existing snapshots,
  with no second simulation or animation loop. F3: мини-карта (`RaceMiniMapButton`, и в повторе) открывает большую карту, знак «развернуть» в ее углу.
- `src/features/race-hud/RaceCornerInstruments.module.css` - bounded scene-corner
  positions, container-relative map sizing and pointer-through wind surface.
- `docs/audits/2026-10-26/corner-instruments-harness.md` - owner-requested
  persistent corner instrument contract, source/real browser evidence and
  explicit next installed/delivery gates.
- `docs/audits/2026-10-26/release65-harness.md` - ordered source/version,
  corrected72-case browser, generated/native G2/archive/export and exact Self
  delivery gates for the corner-instrument candidate, retaining64rollback.
- `docs/audits/2026-10-26/checks/native65-delivery.json` - portable exact65
  source, all72browser first-pass, native package/installed and independent
  Apple Self/notes proof, without private journals or signed URLs.
- `docs/audits/2026-10-26/acceptance65.md` - the same65ordered product IDs,
  historical statuses plus qualified fresh65 evidence and remaining work.
- `docs/audits/2026-10-26/independent-product-audit.md` - audit-only second
  product review with15prioritized findings, confidence, proposed decision gates,
  twelve observed journeys and explicit physical-device/full-course limits.
- `docs/audits/2026-10-26/checks/independent-product-audit.json` - bounded
  audit provenance, two confirmed native Skia terminations and22screen hashes;
  no raw native journal or personal data.
- `docs/audits/2026-10-26/independent-product-screens/` - exact accepted PNGs
  captured in this audit, linked in journey order; no generated concept images.
- `docs/audits/2026-10-28/cockpit-navigation-harness.md` - ordered P10/T02/T04 source, smaller dock, phase focus/scroll, same-map retap, copy parity/budget and separate candidate70 native/release gates.
- `docs/audits/2026-10-28/cockpit-screens/` - intermediate/follow-up web screens, exact first94gate IT/Simple/DE failures and ten inspected installed d8 native70 upgrade/clean screens; observations stay separate from full G2 and delivery.
- `mobile/releases/testflight-1.7.0-70.json` - prepared eight-locale beta notes for day chrome/navigation/scene checkpoint; no delivery or public submission implied.
- `docs/audits/2026-10-28/checks/cockpit-navigation.json` - exact source/check/artifact hashes, retained rejected regressions and qualified current candidate70 evidence.
- `docs/audits/2026-10-28/completion-status.md` - current owner-facing full status: all65IDs/F01-F15/feedback, concise done/partial/open readout, delivered69 versus D8 negativeT05/acf redcloud/current147 bounded installed, native upgrade/clean audit, five final web screens, actual offline exceptions, bounded live-language observation and ordered completion gates.
- `docs/audits/2026-10-28/checks/completion-status.json` - historical12:19baseline with9screens and its original report hash; it does not hash the later owner report, whose current hash lives in cockpit-navigation proof.
- `docs/audits/2026-10-28/testflight-feedback-review.md` - actual read-only Apple feedback reconciliation: all14 submissions plus separate direct OWNER-J01 journal, chronological builds, qualified text/image scope and remaining radio/relative-wind findings.
- `docs/audits/2026-10-28/checks/testflight-feedback-review.json` - sanitized feedback evidence and private artifact digests; no tester data, image URLs or user screenshots.
- `docs/audits/2026-10-28/review-screens/` - nine retained baseline29aa production-web JPEGs, including actual T04 clipping, plus five final acf RU Light production-web PNGs10-14; each set keeps its source/surface boundary.
- `docs/audits/2026-10-27/completion-reconciliation.md` - owner-facing reconciliation of all65requirements, F01-F15 and delivered69, with reopened cross-surface theme consistency and proposed ordered checkpoints. Source-only physical preparation is not presented as live racing.
- `docs/audits/2026-10-27/checks/completion-reconciliation.json` - audited refs, eight fresh local web JPEG hashes, theme/canvas/orbit observations and explicit limits; no installed-native acceptance or private journals.
- `docs/audits/2026-10-27/completion-review-screens/` - eight unedited, inspected screenshots of Light Home/Practice, forced-dark Trainer, Pro briefing/running/Pause/Orbit and OFF radio free entry.
- `docs/audits/2026-10-26/completion-program.md` - owner-approved P00-P12
  completion harness, current P01 native crash/offline-weather contract, ghost
  versus live multiplayer semantics and a staged SwiftUI shell proposal.
- `docs/audits/2026-10-26/completion-history-before-program.md` - preserved
  former AGENTS current-work block; historical statuses are not current gates.
- `docs/audits/2026-10-26/release66-harness.md` - P01 native crash/offline
  hotfix66, old-source regression, final source gates and ordered exact
  installed/archive/Apple delivery checks; later program stages stay open.
- `docs/audits/2026-10-26/checks/native66-installed.json` - retained26.5/27
  actual first-lesson drill, wind, Back, repeated entry and cold relaunch proof;
  data-preservation counts, private screenshot hashes and physical-device limits.
- `docs/audits/2026-10-26/checks/source66-predeploy.json` - exact422b safe
  workflow,72first-attempt cases, artifact hash and skipped publication jobs.
- `docs/audits/2026-10-26/checks/native66-delivery.json` - exact source/tag,
  archive/IPA checks, independent Apple Self/eight-note GETs and delivery limits.
- `docs/audits/2026-10-26/acceptance66.md` - preserved65ordered product IDs,
  qualified fresh P01 evidence and corrected partial first-lesson parity status.
- `docs/audits/2026-10-26/checks/local-branch-archive.json` -52local recovery
  refs,50safely removed local heads and the two safe-delete refusals. Remote
  branches, unique work and active worktrees are retained; this is partial cleanup.
- `docs/design/learning-renders/README.md` - exact built-in ImageGen prompts,
  artifact hashes and review limits for the first filled/luffing mainsail pair.
  Its two WebP assets are art preparation, not bundled production lesson content.
- `docs/design/mobile/testflight65-2026-10-26.md` - delivered65 scope,
  first-candidate native rejection, final G2 and exact Apple delivery limits.
- `docs/design/mobile/testflight66-2026-10-26.md` - delivered P01 offline
  practice fix, retained-data/native/browser checks, exact Apple GETs and rollback.

P02 shared teaching and illustration boundary:

- `src/data/foundation-wind.ts` - reviewed first-lesson teaching and wind-scene
  copy shared by native compatibility entries and the web Foundation guide.
- `src/data/foundation-practice.ts` - shared wind-observation task, title and
  explicit web/native routes to the same3Dboat, retaining bounded lesson return.
- `src/data/lesson-copy.ts` - shared seven-language lesson-template labels;
  native pilots retain their compatibility re-export.
- `src/data/sail-shape.ts` - generated-illustration frames, callout labels,
  observations and limits; no calculated pressure field or procedural rigging.
- `src/lib/learning/illustration-attempt.ts` - framework-free stale/duplicate/
  unmount image-event guard; each platform owns its React render token.
- `src/lib/learning/sail-shape-markers.ts` - read-only numeric leader geometry
  in the image coordinate system, without external assets or baked text.
- `src/app/start/FoundationClient.tsx` - existing interactive Foundation flow;
  the server page supplies teaching copy as serializable data.
- `src/app/start/SailShapeIllustration.tsx` and
  `src/app/start/sail-shape.module.css` - web Scheme/Picture pilot, real asset
  outcomes, stale callback guard and preserved force diagram.
- `mobile/src/bootcamp/SailShapeIllustration.tsx` - native version using the
  same content/markers and bundled images, preserving lesson/quiz schemas.
- `public/learning/mainsail-filled.jpg` and
  `public/learning/mainsail-luffing.jpg` - shared web/native packaging assets
  derived from the reviewed draft pair; narrow Metro watch path bundles them.
- `mobile/__tests__/learning-illustration.test.tsx` - shared teaching identity,
  seven-language completeness, no false credit, image error/retry and stale events.
- `docs/audits/2026-10-26/learning-visuals-harness.md` - P02 scope, ordered
  source/browser/native/delivery gates and the explicit wider-illustration limits.

History keeps every row newest-first and projects once per history array.
Leaderboard filters already projected rows, keeps historical score ranks in
their own section and chooses one adjusted-time PB per class/mode/conditions.
Registered groups are ordered by identity, with no cross-class time rank.
Unavailable rows stay visible in All and never enter a PB. Titles wrap and
course-filter chips retain44px targets. The native course registry reuses the
same historical title resource without changing any saved ID, geometry or hint.

The shared RaceCornerInstruments lives inside each real race scene, independently
of the dock tab. Speed/time/position retain the header; the existing compact
true-wind instrument moves to the upper-left, keeping its numeric readings even
when compass/arrows are off. The upper-right mini-map reuses RaceOverviewMap's
canonical projection without the full legend; compact clipping preserves edge
boats inside the outer frame. Its44px-plus button opens the existing full dock
map. The wind surface passes pointer input to the3Dcanvas; only the map button
captures its own corner. Mini-map visibility defaults true, validates strictly
as a boolean, persists in regatta.race.assists.v1 and records only bounded
mini-map preference values. Native bridges keep the same allowed key/limits.
  The same prepublication files now select72cases, with independent real3D
journeys for five viewport bounds and persistence/reload/canonical diagnostics.
Existing browser assertions and timeout/publication guards stay unchanged;
physics and result classes are untouched.

- `docs/audits/2026-10-25/checks/website64-prepublication-main.json` - exactb459ecc
  prepublication failure and retained timing/geometry proof,67passed/1deadline,
  no image/deploy mutation, prior production health and the bounded two-journey
  SITE correction. The unchanged eight-file policy now selects69cases; future
  browser/native/production acceptance is recorded separately.


P02 portable acceptance evidence:

- `docs/audits/2026-10-26/checks/source67-predeploy.json` - exact77c safe gate,
  77first-attempt browser cases, active-worker image fault injection and3skipped
  main-only publication jobs.
- `docs/audits/2026-10-26/checks/native67-installed.json` - actual teaching and
  picture review, exact installed packages, explicit120-file runtime/asset
  equivalence plus local Expo manifest identity/time, upgrade preservation and
  bounded journals; exact delivery is recorded separately below and physical-phone checks remain open.

- `docs/audits/2026-10-26/checks/native67-delivery.json` - exact source/tag,
  18/29/36/38package checks, unchanged IPA hash, VALID import and independent
  Self/eight-note GET proof; physical emission OFF.
- `docs/audits/2026-10-26/acceptance67.md` - all65ordered product IDs with
  qualified fresh P02 evidence and explicit broader completion gaps.
- `docs/design/mobile/testflight67-2026-10-26.md` - delivered P02 pilot scope,
  package equivalence, installed/source proof and immutable66rollback.


P03 independent native personal-best acknowledgement:

- `src/lib/race-best-command.ts` - closed command/reply validation, canonical
  comparison/course/time, same-row durable receipt and bounded attempt queue.
  `src/lib/race-best-command.test.ts` owns lost/stale/foreign/reordered reply,
  receipt, opaque-row and all18legacy condition-bucket contracts.
- `src/lib/race-native.ts` transports the separate PB command. The actual
  `src/app/game/GameClient.tsx` finish waits for its PB reply independently of
  History; web synchronous storage is retained. Four new7language labels live
  in `src/app/game/race-copy.ts`; old43copy/formatter hashes stay unchanged.
- `mobile/src/persistence/race-personal-best.ts` - start ownership, serial
  native read/compare/write and finite result event. Generic race storage never
  writes PB rows; `mobile/src/persistence/race-web-storage.ts` hydrates/accepts
  only confirmed PB cache data and re-reads after epoch changes.
- `mobile/src/persistence/data-epoch.ts` and
  `mobile/src/persistence/clear-native-data.ts` - invalidate old race work and
  serialize the actual global sweep before fresh race reads; preserve analytics
  choice/unrelated keys. Settings reports an unconfirmed sweep on failure.
  Other writers/app caches remain P08 acceptance work.
- `mobile/app/game/index.tsx` re-exports `mobile/src/game/SharedRaceHost.tsx`,
  which owns active starts and independent PB replies. `mobile/app/replay/[id].tsx`
  mounts the same host with an explicit saved ID in its own route, preserving
  the original race parameters and dismissing to History on replay Back;
  `mobile/src/simulator/SimWebView.tsx` ties async injection to its owning view.
- `mobile/__tests__/race-personal-best.test.tsx` exercises real host/storage
  delayed ACK, independent History failure, retry, corrupt/read errors,
  disposal, clear ordering and mounted-cache rehydration. Native Settings and
  SimWebView route tests check actual failure alert and stale-injection guard.

Current native candidate68 is not the delivered67binary. Physical emission
remains OFF. Its ordered installed/cloud/delivery gates belong to the existing
physical consumer harness; no private storage or raw journal enters this map.

## P03 delivered68 evidence

- `docs/design/mobile/testflight68-2026-10-27.md` - exact source/IPA/native/browser/Apple scope and limits.
- `docs/audits/2026-10-26/acceptance68.md` - all65stable IDs with new and inherited evidence separated.
- `docs/audits/2026-10-26/checks/native68-delivery.json` - exact Self/notes independent GET, IPA and artifact checks.
- `docs/audits/2026-10-26/checks/native68-installed.json` - real finished races, receipts/cold, Back and additional exact-f7 fresh27 startup.
- `docs/audits/2026-10-26/checks/source68-predeploy.json` - exact77first-attempt cloud gate and qualified mobile CI retry history.

Physical emission remains OFF. Shared replay uses its own native route/host, preserving the original race route and dismissing to History; the full program is still ordered in the completion harness.

## P04 physical motion boundary

- `src/features/simulator-3d/scene-diagnostics.ts` - finite actual startup-stage observations and binary viewport state, with safe installed-route mapping and fail-open logging.
- `src/features/simulator-3d/scene-diagnostics.test.ts` - actual canonical batch acceptance, no URL/query/dimensions, logging failures and rejected unknown stage/viewport fields.
- `src/features/simulator-3d/yacht-loader-observer.ts` - observes actual shared GLTF asset/decode callbacks once per loader while preserving requests, progress, errors, cache and decoder selection.
- `src/features/simulator-3d/yacht-loader-observer.test.ts` - pending/completed stages, exact callback identity, original error propagation and no stacked wrappers or private model paths in observations.
- `src/features/race-scene/renderer.test.ts` - unresolved initialization, actual constructor/init errors, preserved backend policy and viewport classification.
- `docs/audits/2026-10-27/scene-startup-harness.md` - native69 fresh startup gate failure, private preserved candidate and ordered observation/repair gate.
- `docs/audits/2026-10-27/checks/scene-probe-source.json` - exact observation-source inputs,1672web/589native gates, preserved failed size report and restored budget; installed diagnosis/repair still pending.
- `docs/audits/2026-10-27/checks/scene-probe-native8e.json` - official31-check/121-file package evidence, actual Simple/Pro cold startup stages, clock/Back/orbit/trim observations; prior failure cause and full native acceptance remain open.
- `docs/audits/2026-10-27/checks/scene-loader-source.json` - exact asset/decode observer inputs,1679web/589native checks, unchanged bundle budget and regenerated installed packages; actual callbacks are not accepted until native observation.
- `docs/audits/2026-10-27/checks/scene-loader-nativef3.json` - official exactf3 package/install proof, actual GLTF asset/decode callbacks, submitted frame and native Back; qualified observation only, no repaired-cause or delivery claim.
- `docs/audits/2026-10-27/radio-free-speech-harness.md` - ordered main P07 scope for visible bounded free PTT, typed fallback, private session rows and actual lifecycle diagnostics; source/browser/native/delivery gates remain separate.
- `docs/audits/2026-10-27/checks/radio-reset-source.json` - exact89ced94 reset source/log hashes,1760web/589native gate, retained initial local timeout failures and explicit pending browser/native acceptance.
- `docs/audits/2026-10-27/checks/radio-reset-browser89.json` - exact downloaded/digest-checked89 cloud report:81first-attempt plus one flaky LCD geometry sample; four actual free-speech journeys pass first attempt, full acceptance stays open.
- `docs/audits/2026-10-27/checks/radio-reset-native89.json` - exact31-check/121-file retained26.5 installation,16preserved prior keys and actual radio entry/Exit; typed reset, PTT/model and microphone remain unaccepted.
- `docs/audits/2026-10-27/checks/scene-probe-browser8e.json` - exact8e safe non-main cloud gate with78first-attempt cases and verified artifact digest; source scope is separate from subsequent loader observations.
- `docs/audits/2026-10-27/checks/scene-startup69-held.json` - exact held source/IPA, qualified older checks, responsive UI and unproven cause.
- `src/lib/race-physical-progress.ts` - canonical immutable metric gates and ordered progression from propelled endpoints; currently unwired, rejects invalid contexts/states before mutation.
- `src/lib/race-physical-progress.test.ts` - all profiles, gate order/direction/extensions, countdown, collision/recovery independence, finish idempotence and invalid-state atomicity.
- `docs/audits/2026-10-27/checks/physical-progress-browser.json` - exact6fcf safe non-main cloud gate, verified artifact digest and78first-attempt browser cases; publication/deploy skipped.
- `docs/audits/2026-10-27/checks/physical-progress-source.json` - input hashes, accepted source gate counts, retained timeout attempt and recoverable rejected-research manifest; no activation or delivery claim.
- `docs/audits/2026-10-27/physical-progress-harness.md` - pure progress checkpoint, failed fleet research boundary and following engine gates.
- `src/lib/race-physical-motion.ts` - explicit validated physical-context adapter; the player's boat runs the shared trainer boat step with crew and rig (ADR-0014), bot crews keep instant sail transfer; shared trainer heading/metres, fixed metric hull bounds and immutable propelled segment before collision resolution. Currently unwired from live races/results.
- `src/lib/race-physical-bot.ts` - physical-only metric path/recovery, integer-tick memory, reachable-turn traffic/hardware prediction, canonical gate entry, weak-authority turn-side memory, shared water bounds and endpoint-clear recovery; legacy autopilot and human steering stay separate.
- `src/lib/race-physical-bot.test.ts` - reachable physical turning curves, explicit human course-assist prediction, metre-per-knot and stable weak/full-authority turn behavior.
- `src/lib/race-physical-fleet.ts` - unwired validated30Hz fleet transaction with copied memory/boats, simultaneous perception of last actual bot commands, unchanged shared forces/helm, coupled impact-truncated travel and recovery-free progress; live emission stays OFF.
- `src/lib/race-physical-contact.ts` - bounded immutable hull/mark swept-circle observations from actual propelled segments, canonical hardware and explicit physical context; no response, penalty, diagnostic stream or persistence.
- `src/lib/race-physical-contact.test.ts` - simultaneous versus different-time path crossings, tangency/initial overlap, larger committee hardware, finished exclusion, bounds/ownership and malformed-frame rejection.
- `src/lib/race-physical-fleet.test.ts` - real five-boat18profile/wind/early-start journeys plus atomic rejection, memory ownership, fixed-clock/countdown, human input and collision-credit contracts.
- `src/lib/race-ghost.ts` - personal ghost (P09): your best finished race of the same class (course revision, mode, difficulty, wind, mission), bounded validated local track, pose by race time; never in fleet, ranks, collisions or rules. M4-4: the track also keeps its mark rounding times (`marks`, older tracks read them from the laps in `ghostMarkTimes`), the row stays under `GHOST_STORE_MAX_CHARS` on the web too (a saved class moves to the end, so the class improved least recently is dropped first) and `isGhostStoreText` checks a whole row for the iOS app's race bridge, so the ghost runs in the app too.
- `src/lib/race-ghost.test.ts` - class separation, faster-wins, interpolation through north, corrupt/unfair track refusal and storage round trip; M4-4: mark times survive the round trip and are checked, the row stays under the bridge size by dropping the class improved least recently (not the one first saved), the key is listed in `mobile/src/persistence/race-web-storage.ts`.
- `src/lib/race-medals.ts` - локальный прогресс и медали (M4-5, решение 8): ключ трассы «класс гонки | уровень | ветер», бронза за любой финиш (и со штрафом за лимитом), серебро и золото по порогам `src/data/race-medals.ts`, золото только без подсказок маршрута и трима (`raceUsesHints`: путь в обоих режимах, трим только в Pro); медаль никогда не снижается, серий нет. Ряд `regatta.race.medals.v1` хранит класс с версией, ревизию порогов и доказательства (лучшее время и лучшее без подсказок), чтобы новая ревизия порогов внутри класса пересчитала медали по сохраненным временам, не отнимая их, а медали старой и метрической гонки не смешивались (перенос на метры в M5 потребует отдельной миграции); `isMedalStoreText` проверяет ряд целиком для моста приложения; `nextMedalGoal` дает следующую цель (для M4-6). Класс без порогов (пробная гонка) медали не получает.
- `src/lib/race-medals.test.ts` - бронза, серебро и золото на границах, золото с подсказками остается серебром, штраф за лимитом остается бронзой, медаль не снижается, трассы раздельны, пробная гонка ничего не получает, пересчет по новой ревизии повышает и не понижает, ряд под версионным ключом, битые записи отбрасываются, битый ряд для моста отклоняется целиком.
- `src/lib/race-next-step.ts` - главный экран гонки (M4-6), чисто: какая одна карточка показывается (`pickRaceNextStep`: цель прошлой гонки, иначе следующая медаль трассы старта, иначе гонка дня, если сегодня не закончена и меню не она), ряд `regatta.race.home.v1` (местные дни с гонкой, не больше 14, цель последней гонки, последняя законченная гонка дня по UTC; `isRaceHomeStoreText` для моста приложения), дни с гонкой с понедельника по сегодня без серий, рекорд из ряда лучших времен без диагностики (`storedBestSec`), прогресс медалей класса (`medalProgress`) и вид для меню (`raceHomeView`). F1: `hasRacedBefore` - была ли на устройстве гонка (день в ряду главного экрана, любое лучшее время или, в приложении, гонка в нативной истории), от него зависят «Первая гонка» и «Лёгкая гонка». Пробная гонка ряд не пишет.
- `src/lib/race-next-step.test.ts` - каждая ветка выбора карточки и порядок, неизвестная цель, запись дня, цели и гонки дня (лимит времени не закрывает гонку дня, старая ссылка на гонку дня не сдвигает отметку назад), предел 14 дней, битые ряды, неделя с понедельника, рекорд по режиму, 2 из 9 медалей и ничего у пробной гонки, вид новичка (бронза) и после золота (гонка дня), без выбранной трассы без медали и рекорда.
- `src/lib/race-ghost-splits.ts` - сплиты против призрака (M4-4), чистый модуль: на знаке и на финише твое время минус время призрака, округление до десятой как на экране, минус = впереди (зеленый), плюс = позади (красный), показанные 0.0 = вровень; знаки сравнивают часы гонки, финиш сравнивает время результата со штрафами, как рекорд.
- `src/lib/race-ghost-splits.test.ts` - знак и округление на трех входах, сохраненное время знака и время по кругам у старого трека, список знаков и финиша, цвета по вердикту, знак и слово на 7 языках, без тире.
- `src/data/race-ghost-copy.ts` - тексты сплитов против твоего лучшего (M4-4) на 7 языках: заголовок на экране результатов, плашка HUD на знаке, «Верхний знак» и «Финиш» по глоссарию, слова «впереди / позади / вровень»; знак пишется всегда, десятичная точка как в HUD.
- `src/lib/race-trial.ts` - opt-in physical trial race flag (`/game?race=short|medium|long`) and the one helm meaning for it (shared trainer law, a held rudder overrides course assist).
- `src/lib/race-trial.test.ts` - flag parsing (only one exact profile opens a trial) and steering choice tests.
- `src/lib/race-shared-boat.test.ts` - ADR-0014 contract: the trainer session and the player's physical race boat give the same heading, speed, heel, leeway, sheets, sail positions and metres on three inputs.
- `src/lib/race-physical-motion.test.ts` - actual integrated metre travel, helm/course assist, low-speed choice, force/trim/handicap parity, rejected-input atomicity and collision-independent endpoint tests.
- `src/lib/race-legacy-motion.fixture.json` - twelve pre-extraction legacy/responsive trajectories captured from frozen68 sourcef7, not generated from the new implementation.
- `src/lib/race-legacy-motion.test.ts` - preserves those independent legacy trajectories after extracting the shared force/trim boundary.
- `docs/audits/2026-10-27/physical-motion-harness.md` - verified foundation and explicit remaining activation/release gates.

`src/lib/race-physics.ts` now exports the same force/trim step for both motion adapters. Its existing `stepBoat` keeps legacy turning,8units/knot-second and20unit clamp; generated server behavior and no-context defaults remain unchanged. Physical emission stays OFF. The trainer's transient rig integration remains separate and is not claimed identical to steady race trim.

- `docs/audits/2026-10-27/checks/physical-motion-observations.json` - three synthetic metre/heading measurements, explicitly not installed acceptance.
- `docs/audits/2026-10-27/checks/physical-motion-source.json` - production input hashes, source gates and qualified native timing retry.

## Ads inspection lab, native prototype

- `src/lib/ads-preview.ts` - fixed scene/camera/lens/placement vocabulary and immutable40-action session preview journal; no SDK signal ingestion.
- `src/lib/ads-preview.test.ts` - bounded/private-free preview journal and diagnostic rejection of unknown IDs/SDK payloads.
- `src/features/ads-lab/AdsLab.tsx` - camera/venue/placement inspection dock and explicit unconfigured SDK status.
- `src/features/ads-lab/AdsLab.module.css` - reserved scene and scrollable44px controls, desktop sidebar/mobile lower dock.
- `src/features/ads-lab/AdsCameraRig.tsx` - shared scoped OrbitControls binding, camera presets and actual directional button movement.
- `src/features/ads-lab/camera.ts` - pure camera fitting and horizontal/vertical rotation geometry.
- `src/features/ads-lab/camera.test.ts` - declared lens/viewport fitting, directional geometry and seven-language copy coverage.
- `src/lib/ads-copy.ts` - seven-language lab instructions/statuses; owner-requested Ads name and fixed test-card IDs remain technical labels.
- `src/features/ads-lab/TestPlacements.tsx` - three local front-facing test cards with explicit texture disposal; no ad network/SDK.
- `docs/design/mobile/ads-lab.md` - requested scope, actual evidence and SDK/release limits.

`RegattaScene` accepts optional inspection content/camera composition; regular trainer callers retain their existing rig. Native offline sailing dispatch adds `/ads` without a public website route. `diagnostics` accepts only finite preview actions/tokens, never SDK payloads or ad-unit IDs. Actual ad serving is absent.

`e2e/offline.spec.ts` adds an actual bundled Ads first-frame/control/geometry/placement-journal case with the existing25s scene and60s case limits; it checks no external/API request. This source test still requires its next exact cloud run. `SceneBoundary`/`SceneStartup` optional callbacks keep Ads directional controls disabled until a real frame and after an actual scene failure; normal trainer callers retain their existing behavior.

- `docs/audits/2026-10-27/checks/physical-motion-browser.json` - exact3f portable77-case report with one attempt each; physical activation remains off.
- `docs/audits/2026-10-27/checks/ads-source.json` - source gates and qualified actual browser geometry/controls, with original screenshot hashes; native acceptance remains separate.

- `docs/audits/2026-10-27/checks/radio-readiness-browser36.json` - exact downloaded/digest-checked82first-attempt radio/browser journeys after bounded faceplate readiness, separate from native microphone and physical095 acceptance.
- `docs/audits/2026-10-27/checks/physical-contact-source.json` - exact095 source/log hashes,1769web/589native and89targeted checks,18contact-free circle-model fleets, preserved failed experiments and still-disabled physical emission.

- `docs/audits/2026-10-27/checks/physical-game-fleet95.json` - separate54case autonomous game-ID/handicap research:53full finishes,39strict clean,15contact observations and one short weak deadline miss; no human Pro or activation acceptance.

- `docs/audits/2026-10-27/checks/physical-contact-browser95.json` - exact095 source passes82first-attempt preserved-UI journeys; physical API remains unwired and expanded54case/installed gates stay separate.
- `docs/audits/2026-10-27/checks/radio-powered-native916.json` - human power-on, actual native unavailable recognition state and121retained916 hashes, with coordinate PTT/typing still unaccepted.

- `docs/audits/2026-10-27/checks/physical-game-luff.json` - exact-input54autonomous game-ID/difficulty sweep after stable luff candidate selection:54finish,45strict clean, zero mark frames and nine moving early hard hull-contact cases, with full counters.
- `docs/audits/2026-10-27/checks/physical-luff-source.json` -1772web/589native and92targeted source acceptance; unchanged forces/server/offline HTML and qualified following cloud/native gates.

- `src/lib/race-physical-response.ts` - physical-only atomic circular hull/mark/water constraint, initial recovery excluded from travel, one common impact clock, bounded stops/closing loss and immutable actual segments. Separate initialContacts and owned metric impact centres/velocities/closing evidence feed the following judge; no live caller outside the unwired fleet.
- `src/lib/race-physical-response.test.ts` -14contracts for tunnelling/later/tangent/escape/coupled recovery, actual common-clock metric impact evidence, conservative wall constraints, actual contact/gate truth, finished exclusion and atomic rejection.
- `docs/audits/2026-10-27/physical-response-harness.md` - ADR-0013 development checkpoint, preserved8ccd RED deadline and following90specified full-fleet finishes; not physical activation or delivery acceptance.
- `docs/audits/2026-10-27/checks/physical-response-source.json` - input-bound1783web/589native source checks and all54research rows, retaining53full finishes and actual contact counter semantics.

- `docs/audits/2026-10-27/checks/physical-luff-browser-d580.json` - exactd58082first-attempt downloaded/digest-verified UI gate, publication/deploy skipped, following response/physical activation excluded.
- `docs/audits/2026-10-27/checks/radio-typed-native916.json` -121exact installed hashes, PL typed Add/Clear/Exit and actual unavailable PTT, only diagnostic storage changes, qualified real-hold/microphone/native89reset limits.

- `docs/audits/2026-10-27/checks/physical-bot-stability-source.json` - exact-input109targeted/1789web/589native local gate and90autonomous fleet rows, with qualified retained hull contacts and no physical activation.
- `docs/audits/2026-10-27/completion-checkpoint-history.md` - verbatim dated checkpoint archive moved from AGENTS afterfa42626; preserves earlier scope/failures without presenting them as current state.
- `docs/audits/2026-10-27/checks/physical-response-browser8ccd.json` - exact8ccd82first-attempt UI gate, separate from its retained RED autonomous-fleet result.
- `docs/audits/2026-10-27/checks/physical-bot-stability-browser-e414.json` - exacte41482first-attempt digest-verified UI report and successful push/PR CI; the physical API remains unwired, publication/deploy skipped.
- `docs/audits/2026-10-27/checks/radio-typed-native89.json` - retained26.5/121matching installed files, actual nonempty typed Add and native Exit, with exact-string/tool qualification and native Reset/microphone still open.
- `docs/audits/2026-10-27/checks/physical-impact-evidence-source.json` - input-bound113targeted/1793web/589native local gate for actual metric impact data, identical installed HTML and unchanged force/navigation inputs; no new90-case or physical-judge/native acceptance claim.
- `docs/audits/2026-10-27/checks/radio-locale-source.json` - requested-locale native capability fix with1793web/596native and15focused post-patch tests; guarded SDK source hashes/Swift parse, separate pending full native compile/install/microphone gates.
- `docs/audits/2026-10-27/checks/radio-locale-native-b9.json` - exactb9 Release Simulator compile,31package checks plus native/Hermes method presence,121matching retained26.5 installed files and16preserved prior keys; actual new-probe UI/Reset/microphone remain open after Device Hub timeouts.
- `docs/audits/2026-10-27/checks/radio-locale-ci-b9.json` - exactb9 successful push/PR CI and Foundation browser jobs; full predeploy82-case gate stays separate from these source checks.
- `mobile/src/diagnostics/export.ts` - native clipboard support envelope with validated canonical journal and bounded app version/build/platform, preserving storage/entry schema and excluding arbitrary context.
- `mobile/__tests__/diagnostic-export.test.ts` - support context, unchanged session, privacy rejection and finite long-test export contracts. The real Diagnostics copy handler remains covered by its screen test.
- `docs/audits/2026-10-27/release69-owner-beta.md` - owner's explicit TestFlight manual-radio acceptance transfer, retained exact-source/archive/IPA/Apple gates and bounded support-journal scope; not public App Review or physical activation.
- `mobile/releases/testflight-1.7.0-69.json` - eight adapted Apple beta-note locales for the owner's radio walkthrough and local support export, separate from public App Store1.7.0 notes.
- `docs/audits/2026-10-27/checks/release69-source.json` - input-bound1793web/602native and source/budget checks for the owner's TestFlight checkpoint, explicitly deferred manual radio gate and pending exact archive/Apple delivery.
- `docs/design/mobile/testflight69-2026-10-27.md` - exact2ea TestFlight69 delivery, source/package/Apple gates, owner-deferred manual radio acceptance and actual support-copy route.
- `docs/audits/2026-10-27/checks/native69-delivery.json` - immutable runtime source, IPA/native/Hermes digests, generated18/archive36/IPA38, Apple import VALID and independent exact Self/eight-note reads. No current69Simulator UI/microphone acceptance is asserted.
- `docs/audits/2026-10-27/checks/release69-browser.json` - exact2ea82first-attempt downloaded/digest-verified predeploy report; publication/deploy skipped, unwired physical API excluded.
- `docs/audits/2026-10-27/acceptance69.md` - qualified69delta over the immutable65-ID acceptance68 matrix, preserving all unresolved work and owner-led radio checks.
