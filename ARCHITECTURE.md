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
- `mobile/src/bootcamp/ReturnToLesson.tsx` - доступная кнопка возврата из практики, цвет наследуется от заголовка.
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
- Мобильное: Expo / React Native в `mobile/`, публичная 1.6.4 (48), внутренний TestFlight1.7.0(61), source37c7079, exactSelf VALID/IN_BETA_TESTING. Доставка61 не означает завершения всех65 требований; сайт удержан pre-deploy gate, физические short/long трассы согласованы для62. Свой CI-джоб и гейт релиза.
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
`radio.task.complete`, `app_store.click` (токен `ct` места ссылки).
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

`src/lib/theme.ts` - единственное место, где решается light/dark; его читают
`src/components/ThemeManager.tsx`, `src/components/ThemeToggle.tsx` и
inline-скрипт без мигания в `src/app/layout.tsx`.

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
- `src/app/rules/page.tsx` - правила гонок и расхождения, 21 сценарий.
- `src/app/rules/CoursesSection.tsx` - блок курсов внутри страницы правил.
- `src/app/racing/page.tsx` - тактика гонки.
- `src/app/glossary/page.tsx` - глоссарий, 51 термин с категориями.
- `src/app/anatomy/page.tsx` - устройство яхты: 3D-модель плюс постеры.
- `src/app/onboard/page.tsx` - первая неделя на борту.
- `src/app/checklist/page.tsx` - чек-лист перед выходом. У каждого раздела якорь по его `id` (`/checklist#maneuvers`), из раздела про повороты ссылка на `/courses#turns`.
- `src/app/spots/page.tsx` - места и живая погода.
- `src/app/gallery/page.tsx` - галерея фото и видео прошлых регат.

### 4.3 Тренажеры, гонка, реплей, статистика

- `src/app/simulator/layout.tsx`, `src/app/simulator-v3/layout.tsx`, `src/app/simulator2/layout.tsx` - цвет полосы браузера под всегда темные тренажеры (`themeColor`).
- `src/app/simulator/page.tsx` - Основы (внутреннее имя V1), canvas, прод-поверхность; на телефоне холст закреплен, управление в общем доке (раскладка изменена с согласия владельца 2026-10-19, логика холста прежняя).
- `src/app/simulator2/page.tsx` - Лодка 3D (V2), обертка над `src/features/simulator-3d`.
- `src/app/simulator-v3/page.tsx` - Тренажер трима (V3), обертка над `src/features/simulator-v3`.
- `src/app/game/page.tsx` - серверная обертка одиночной гонки.
- `src/app/game/GameClient.tsx` - единая 3D-гонка: брифинг, старт, знаки, боты, Simple/Pro, локальный финиш и коуч. Сцена и штурвалы общие с тренажером. Нативное меню содержит явную ссылку возврата к выбору гонок через существующий проверенный bridge.
- `src/app/game/GameClient.navigation.test.tsx` - реальное меню на семи языках, отсутствие native-only ссылки на сайте и переход через offline Link bridge в нативный раздел гонок.
- `src/app/game/GameMenu.tsx` - меню гонки: три режима (первая гонка, свободная, миссия), вид 2D/3D, акватория, кнопка старта.
- `src/app/game/config.ts` - уровни сложности (число соперников, `aiSpeedMul` по ADR-0007, подписи на 7 языках) и стили лодки, общие для меню и гонки.
- `src/app/multiplayer/page.tsx` - серверная обертка мультиплеера.
- `src/app/multiplayer/MultiplayerClient.tsx` - лобби, код комнаты, гонка по WebSocket.
- `src/app/leaderboard/page.tsx` - лучшие времена по бакетам и дневной вызов.
- `src/app/r/[code]/page.tsx` - страница реплея по 6-символьному коду.
- `src/app/r/[code]/ReplayViewer.tsx` - проигрыватель реплея с таймлайном.
- `src/app/stats/page.tsx` - вход в админку, за basic-auth из `src/proxy.ts` и повторной проверкой `checkAdminAuth()` в самой странице (без нее 404).
- `src/app/stats/StatsDashboard.tsx` - панели: страны, устройства, источники, время на странице.
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
- `src/app/api/coach/route.ts` - ИИ-коуч на финише, событие `coach.requested`.
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
- `src/app/radio/symulator/practiceMenu.ts` - группы списка Практики и номера заданий UKE для каждого сценария (из `zadania/tasks.ts`).
- `src/app/radio/symulator/practiceMenu.test.ts` - каждый сценарий в списке ровно один раз, ни одно задание UKE со сценарием не потеряно.
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
- `src/app/radio/courseIds.test.ts` - сверяет списки id из `src/app/radio/courseIds.ts` с банком SRC, сценариями и главами теории.
- `src/app/radio/courseIds.ts` - id глав теории, вопросов SRC и сценариев для счетчиков прогресса на /radio без импорта самих данных.

### 4.6 Курс sternik motorowodny `src/app/sternik`

- `src/app/sternik/page.tsx` - серверный вход в курс: считает из банка числа и карту id -> категория для `src/app/sternik/SternikHub.tsx`, банк вопросов в клиент не уходит.
- `src/app/sternik/layout.tsx` - layout курса.
- `src/app/sternik/SternikSubnav.tsx` - подраздельная навигация.
- `src/app/sternik/test/page.tsx` - тренажер по банку вопросов.
- `src/app/sternik/egzamin/page.tsx` - пробный экзамен: 75 вопросов, 90 минут, порог 65.
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
- `src/components/BootcampFooterNav.tsx` - нижняя панель на страницах уроков буткемпа.
- `src/components/LanguageToggle.tsx` - переключатель языка, пишет localStorage и cookie.
- `src/components/ThemeToggle.tsx` - переключатель темы.
- `src/components/ThemeManager.tsx` - применение темы и подписка на системную.
- `src/components/GoogleAnalytics.tsx` - GA4 поток `G-ZEWWJ4N31M`.
- `src/components/ClientErrorReporter.tsx` - `page.view`, `page.engaged`, `js.uncaught`, `js.rejection`.
- `src/components/FeedbackWidget.tsx` - виджет обратной связи, шлет в `/api/feedback`.
- `src/components/HelpOverlay.tsx` - контекстная справка поверх страницы.
- `src/components/ServiceWorkerRegistrar.tsx` - регистрация сервис-воркера и офлайн-фолбэка.
- `src/components/AnatomyPosters.tsx` - два постера-инфографики на `/anatomy`.
- `src/components/YachtViewer3D.tsx` - общий просмотрщик GLB-яхты (анатомия и тренажер, метры).
- `src/components/product/ProductHub.tsx` - общий рендер хаба раздела по каталогу.
- `src/components/product/Product.module.css` - стили продуктовой оболочки.
- `src/components/product/Navigation.module.css` - стили навигации оболочки.
- `src/components/product/ProductMenu.tsx` - веб-меню каталога: группы из `src/lib/product/menu.ts`, поиск, пустой результат, цели 44px.
- `src/components/product/Home.module.css` - стили главной сайта с иллюстрацией.
- `src/components/design-v3/DesignStudio.tsx` - сохраненный исторический исходник витрины Claude Design; в release не импортируется.
- `src/components/design-v3/DesignStudio.module.css` - стили витрины.

### 4.8 Контент `src/data`

- `src/data/sailing-data.ts` - курсы относительно ветра (5), галсы, маневры (6; у оверштага и фордевинда необязательные массивы `commands*`, `steps*`, `mistakes*` для `/courses#turns`, читаются `legacyPickArray`), глоссарий (51 термин), категории, правила гонок, стратегии.
- `src/data/rules.ts` - сценарии расхождения и правил, 21 карточка (сцена, вопрос, ответ, почему).
- `src/data/anatomy.ts` - части яхты с координатами в SVG 1000x500 и подписями.
- `src/data/bootcamp.ts` - 8 уроков буткемпа по ~5 минут.
- `src/data/onboard.ts` - "первая неделя на борту", 12 разделов, в том числе выход из гавани, возвращение, типы швартовки, газ и пожар.
- `src/data/checklist.ts` - чек-лист перед выходом, 9 разделов, в том числе готовность яхты у причала.
- `src/data/missions.ts` - миссии гонки, оцениваются после финиша по логу.
- `src/data/venues/venues.ts` - акватории регат (Гёджек, Сплит, Мазуры, Солент, открытое море): берега и острова вокруг поля гонки, палитра, названия на 7 языках, ключ настройки `regatta.venue.v1` (ADR-0005).
- `src/data/venues/geometry.ts` - детерминированная геометрия акваторий: полигоны берега для гонок (всегда снаружи поля), рельеф для горизонта 3D и для 3D-гонки (`raceTerrain`: береговая линия 2D, поднятая в холмы).
- `src/data/venues/geometry.test.ts` - контракт: суша не заходит на поле, грани рельефа смотрят вверх, берег 3D дальше камеры, берег 3D-гонки начинается с линии воды 2D.
- `src/data/drills.ts` - каталог упражнений и сценариев, общий для веба и мобильного.
- `src/data/gallery.ts` - видео и фото галереи.
- `src/data/gallery-2026.generated.ts` - автогенерация `scripts/build-gallery-year.mjs`, руками не править.
- `src/data/src-radio.ts` - официальный банк 324 вопросов UKE SRC.
- `src/data/sternik.ts` - банк sternik motorowodny: 879 вопросов, категории, конфиг экзамена (75 вопросов, 90 минут, порог 65). Id вопросов стабильны, не перенумеровывать.
- `src/data/polishDiacritics.test.ts` - страж правила 2 из `AGENTS.md`: польский текст банков sternik и SRC и данных радиокурса не содержит снятых диакритик (`sie`, `moze`, `ktory` и подобных).
- `src/data/sailing-lab/course.ts` - структура курса работы с парусами.
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
- `src/data/sailing-lab/lesson-guide.ts` - цели 13 уроков, результаты четырех модулей и подписи учебного пути на семи языках.
- `src/data/sailing-lab/learning-path.ts` - шаги урока (разобраться, проверить, на лодке; шаги не засчитывают урок), модули программы курса парусов по порядку уроков, термины урока.
- `src/data/sailing-lab/assessment-copy.ts` - тексты независимой проверки настройки в Тренажере (скрутка, глубина).

### 4.9 `src/features/sailing-lab` - общая сессия, риг и уроки

- `src/features/sailing-lab/runtime/session.ts` - общая сессия хождения под парусом: единая точка интеграции движка для Тренажера, 3D и мобильного.
- `src/features/sailing-lab/runtime/session.test.ts` - поведенческие тесты сессии.
- `src/features/sailing-lab/runtime/fixed-clock.ts` - фиксированный шаг интеграции, частота рендера на него не влияет.
- `src/features/sailing-lab/runtime/fixed-clock.test.ts` - тесты часов.
- `src/features/sailing-lab/runtime/step-rig.ts` - шаг сессии вместе с механикой рига.
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
- `src/features/sailing-lab/lessons/practice-results.ts` - четыре разрешенных результата упражнений; проверка и объединение, отдельно от теории и снимка сессии.
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
- `src/features/sailing-lab/ui/SavePractice.tsx` - явное сохранение завершенного упражнения через браузерное хранилище или native bridge, ошибка и повторная попытка.
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
- `src/features/simulator-3d/index.ts` - публичный барель портируемых частей модуля.
- `src/features/simulator-3d/SimulatorV2.tsx` - обертка под Next.js для `/simulator2`.
- `src/features/simulator-3d/Simulator3D.tsx` - корневой компонент 3D-вида и панелей; на телефоне под парусом сцена закреплена, панель становится общим доком управления.
- `src/features/simulator-3d/Simulator3D.module.css` - стили 3D-вида.
- `src/features/simulator-3d/RegattaScene.tsx` - сцена R3F: свет, камера, вода, яхта.
- `src/features/simulator-3d/SceneBoundary.tsx` - граница ошибки сцены и отчет о сбое WebGL.
- `src/features/simulator-3d/Yacht.tsx` - рендер GLB-яхты и парусов.
- `src/features/simulator-3d/config.ts` - конфиг модуля, URL модели.
- `src/features/simulator-3d/types.ts` - типы состояния яхты и подписей сцены.
- `src/features/simulator-3d/camera.ts` - подгонка камер: обзор, грот, шкот.
- `src/features/simulator-3d/camera.test.ts` - тесты камер, включая программный WebGL.
- `src/features/simulator-3d/offline-asset.test.ts` - проверка, что офлайн-ассет модели на месте.
- `src/features/simulator-3d/audio/useSailAudio.ts` - звук парусов и воды.
- `src/features/simulator-3d/ocean/Ocean.tsx` - поверхность воды; для гонки опции `roughness`, `skyReflection` (доля отраженного неба, в шейдере: при окружении сцены three.js игнорирует `envMapIntensity`), `sunGlint` (доля солнечной дорожки) и `farCalm` (волны сглаживаются вдали).
- `src/features/simulator-3d/ocean/Wake.tsx` - кильватерный след.
- `src/features/simulator-3d/ocean/Backdrop.tsx` - горы и острова акватории на горизонте Лодки 3D (низкополигональный рельеф с воздушной перспективой); `terrainGeometry` строит меш рельефа и для 3D-гонки.
- `src/features/simulator-3d/ocean/WindFlow.tsx` - видимый поток ветра.
- `src/features/simulator-3d/ocean/waves.ts` - поле волн (сумма синусов), общее для воды и качки.
- `src/features/simulator-3d/physics/useSailingSim.ts` - подключение общей сессии к сцене, телеметрия, подсказка коуча `coachFrom` (называет шкот).
- `src/features/simulator-3d/physics/coach.test.ts` - контракт: каждая подсказка трима называет шкот (гика-шкот, стаксель-шкот или оба).
- `src/features/simulator-3d/physics/sailModel.ts` - визуальные и подсказочные помощники (не силы).
- `src/features/simulator-3d/physics/step.ts` - совместимость: шаг отдан общей сессии.
- `src/features/simulator-3d/physics/step.test.ts` - тесты шага 3D-сцены.
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
- `src/features/trainer-controls/WheelDeck.tsx` - режим штурвалов: руль по центру, стаксель-шкот и гика-шкот по бокам, обмен местами по нажатию.
- `src/features/trainer-controls/ControlDock.tsx` - док под лодкой: вкладки «Избранное / Штурвалы, Паруса, Руль, Ветер, Ещё» и шестеренка; если пришли из урока, первой стоит и открывается вкладка «Задание» (`leadTab`).
- `src/features/trainer-controls/ControlSettingsSheet.tsx` - лист настроек: режим, что задает штурвал, возврат в центр, чувствительность, сторона шкотов, звук, состав избранного.
- `src/features/trainer-controls/TrainerWorkspace.tsx` - раскладка телефона: строка над сценой, закрепленная сцена, показания, док; горизонталь: сцена слева, показания и док справа.
- `src/features/venues/drawVenue.ts` - берег и острова акватории на canvas веб-гонки и мультиплеера (под трассой).
- `src/features/venues/useVenue.ts` - выбранная акватория и переключатель берега (localStorage `regatta.venue.v1`, `regatta.shore.v1`), общие для гонок и Лодки 3D.
- `src/features/venues/VenuePicker.tsx` - переключатель «Берег и острова» и выбор акватории в меню веб-гонки.
- `src/features/race-3d/Race3DView.tsx` - 3D-вид одиночной гонки (ADR-0006): читает refs гонки `GameClient`, игрок в начале координат, мир сдвигается под ним; соперники, знаки, линия старта, берег, камера за кормой или сверху.
- `src/features/race-3d/pose.ts` - чистое преобразование лодки гонки в позу 3D-яхты (паруса под ветер по триму лодки, заполаскивание в мертвой зоне), масштаб 0.6 м на единицу, следующая цель, места в гонке (`raceRanks`, их же считает HUD веб-гонки).
- `src/features/race-3d/pose.test.ts` - контракт: паруса под ветер на обоих галсах, травятся при уваливании, лодка там, где ее поставила гонка.
- `src/features/race-3d/useRaceView.ts` - выбор вида гонки 2D/3D и камеры (localStorage `regatta.race.view.v1`, `regatta.race.camera.v1`, ссылки `?view=3d`, `?camera=high`) и флаги следующего рендера (`?scene=next`, `?fps=1`).
- `src/features/race-3d/RaceViewPicker.tsx` - выбор «Карта 2D» / «С лодки 3D» в меню веб-гонки.
- `src/features/race-scene/RaceScene.tsx` - следующий рендер гонки (ADR-0008, вертикальный срез, `/game?view=3d&scene=next`): WebGPURenderer с откатом на WebGL2, вода и небо на TSL, белые следы и тени лодок, своя раскраска берега и сосны, тактическая камера по умолчанию, замер FPS и шаг плотности пикселей (`?fps=1`). Знаки, соперники и стрелки берет из `Race3DView`.
- `src/features/race-scene/materials.ts` - TSL-материалы сцены: вода (общие волны `WAVES`, полосы по ветру, мелководье и пена у берега по полю расстояний), небо с облаками, след, тень под корпусом.
- `src/features/race-scene/camera.ts` - тактическая камера: с подветра, наклон 54 градуса, наветренная сторона вверху экрана, лодка чуть ниже середины, взгляд вперед к знаку.
- `src/features/race-scene/shore.ts` - поле расстояний от воды до берега по контурам площадки, раз на акваторию (текстура для воды).
- `src/features/race-scene/trail.ts` - лента кильватера: точки кормы, расширение в V и затухание с возрастом.
- `src/features/race-scene/land.ts` - раскраска суши для света гонки: песок только на полосе пляжа, дальше зелень, скала на крутых гранях и вершинах.
- `src/features/race-scene/quality.ts` - адаптивное качество: плотность пикселей шагами вниз, пока FPS ниже 42.
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
- `src/lib/db.ts` - SQLite: события, фидбэк, лидерборд, реплеи; единственный `insertEvent()`; индекс `(evt, ts)`; воронка для `/stats`.
- `src/lib/db.funnel.test.ts` - воронка `getMetricsRange()` на настоящем файле SQLite и наличие индекса `(evt, ts)`.
- `src/lib/analytics-events.ts` - allow-list клиентских событий для `/api/log` и проверка полей воронки по событию.
- `src/lib/funnel.ts` - клиентские хелперы воронки (экзамен, урок, задание по радио, клик App Store), `detectShell()` (app или web), `appStoreUrl(ct)`.
- `src/lib/funnel.test.ts` - контракт воронки: реальные id уроков и сценариев проходят проверку, результат экзамена уходит и в `/api/log`, и в приложение.
- `src/lib/event-retention.test.ts` - удаление старых событий: dry-run ничего не удаляет, реальный прогон удаляет ровно столько же, окно меньше 30 дней запрещено.
- `src/lib/net.ts` - усечение клиентского IP перед логом и записью.
- `src/lib/log.ts` - структурный лог JSON-строками в stdout контейнера.
- `src/lib/client-log.ts` - клиентский логгер через `sendBeacon`, молча падает; вне http(s) (офлайн-бандл) ничего не шлет.
- `src/lib/rate-limit.ts` - скользящее окно в памяти (один контейнер, без Redis); `clientKeys()` дает ключ сессии и ключ IP (последний хоп X-Forwarded-For), оба бакета должны пропустить запрос.
- `src/lib/rate-limit.test.ts` - контракт: свежая `regatta_sid` на каждый запрос не снимает лимит, отказ не списывает бюджет других слоев, короткое окно не стирает часовые бакеты.
- `src/lib/race-submission.ts` - общие проверки присланных гонок: санитайзер ника, правдоподобное время финиша, слаг миссии.
- `src/lib/ws-limits.test.ts` - контракт `ws-server/limits.js`: последний хоп XFF и потолки комнат.
- `src/lib/storage.ts` - версионированный localStorage в пространстве `regatta.`.
- `src/lib/theme.ts` - разрешение темы light/dark, один источник истины.
- `src/lib/sounds.ts` - процедурные звуки на WebAudio, уважают общий mute.
- `src/lib/race-physics.ts` - гонка `/game`, мультиплеера и мобильного AI: шаг лодки через движок, ворота огибания (`updateLap`), подсказка игроку (`raceWaypoint`) автопилот ботов (`raceAutopilotTurn`: петли по дистанции, сброс скорости перед знаком, повторный круг при промахе; `DECISIONS.md` ADR-0003) и столкновения (`resolveCollisions`: расталкивают всегда, скорость гасят только при сближении, финишировавшие не участвуют; ADR-0004); сложность ботов через `speedMul` в `stepBoat` (ADR-0007). Остатки аркадной модели (`speedFactorFromTWA`, `MAX_SPEED`) - долг Phase 3.
- `src/lib/race-physics.drift.test.ts` - паритет `ws-server/race-physics.js` и `src/lib/race-physics.ts`: константы, ветер, шаг лодки, курс и огибание знаков совпадают.
- `src/lib/race-course.test.ts` - тесты дистанции гонки (знаки, линия) и автопилота: все 19 стартовых мест сервера вовремя и с фальстартом, 120 разных стартов, заход ветра в слабый, обычный и сильный ветер с отсечкой 300 с, повторная гонка той же лодкой; столкновения: касание бортами, таран, финишировавшие, флот из 8 ботов до отсечки 300 с; сложность ботов (легкий заметно медленнее среднего, средний медленнее сложного).
- `src/lib/race-resume.ts` - восстановление настроек гонки после перезагрузки.
- `src/lib/best-times.ts` - личные рекорды по бакетам сложности и ветра.
- `src/lib/mp-client.ts` - WebSocket-клиент мультиплеера с автопереподключением и типизированной шиной.
- `src/lib/fallback-coach.ts` - эвристический коуч, когда OpenAI недоступен или ключа нет.
- `src/lib/weather/types.ts` - контракт провайдера погоды.
- `src/lib/weather/open-meteo.ts` - провайдер Open-Meteo (без ключа).
- `src/lib/weather/index.ts` - выбор провайдера и общий вход.
- `src/lib/product/catalog.ts` - информационная архитектура: 5 разделов, маршруты, подписи на 7 языках.
- `src/lib/product/catalog.test.ts` - тесты маршрутов и поиска по каталогу.
- `src/lib/product/copy.ts` - общие тексты оболочки.
- `src/lib/sternik-progress.ts` - прогресс курса sternik в localStorage.
- `src/lib/db.leaderboard.test.ts` - SQL лидербордов на настоящем файле SQLite: одна настоящая лучшая строка на sid, миссии не попадают в свободные бакеты, полуоткрытое окно дня.
- `src/lib/product/menu.ts` - общий контракт меню: группы каталога для сайта и приложения, пункт навигации раздела; оболочки у сайта и приложения свои.
- `src/lib/product/learning.ts` - продолжение обучения и закладка для сайта (формат сайта в localStorage, не формат приложения).
- `src/lib/product/learning-web.ts` - чтение и запись закладки и снимка обучения в localStorage сайта.
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
- `e2e/trainer-controls.spec.ts` - на телефоне лодка остается в кадре при прокрутке дока во всех трех тренажерах; штурвалы управляются с клавиатуры. Scroll и оба3D drawer-кейса ждут actual first frame в прежнем общем25s startup deadline до геометрии; drawer сохраняет1px bounds, view actions и60s total. Wheel-dock проверяет локализованный44px Diagnostics summary как занятое место, отсутствие перекрытий и настоящие пустые промежутки<24px, без увеличения бюджетов.
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
- `Dockerfile` - образ веб-приложения (node alpine по digest, standalone); код принадлежит root, рантайм-пользователь 1001 пишет только в `/data` и `/app/.next/cache`.
- `docker-compose.yml` - только локальная разработка (проект `regatta-local`): сервисы `regatta` (172.17.0.1:4500) и `regatta-ws` (172.17.0.1:4502), том `/data`, healthcheck. Прод его не использует (`ops/deploy/compose.yml`).
- `regatta.nginx.conf` - эталон конфига реверс-прокси и CSP; на хосте применяется вручную.
- `.dockerignore` - что не попадает в контекст сборки образа.
- `.gitignore` - что не попадает в репозиторий (включая `.env*` и любые `*.png` в корне).
- `.github/workflows/ci.yml` - CI на ветки и PR: типы, blocking lint, тире, карта, весь `npx vitest run`, `npm run test:multiplayer`, отдельная джоба мобильного; Foundation browser flow собирает web, проверяет неизменный JS-бюджет и выполняет `e2e/foundation.spec.ts` до публикации.
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

- `src/lib/race-guidance.ts` retains independent advisory tack/recovery memory at 10Hz, using the shared stadium planner without steering or mutating the boat. Unsupported courses return no route.
- `src/lib/race-guidance.integration.test.ts` follows the displayed recommendation through real start/mark/finish gates at four input cadences and four wind conditions; preserves legacy bot trajectory exactly.
- `src/lib/race-rules.ts` owns educational events, conservative right-of-way advice, early starts, mark contact and optional custom time penalties.
- `src/lib/race-physics.ts` accepts explicit manual trim/deployment and opt-in responsive solo steering (ADR-0009), preserving default bot/server behavior. Its additive raceAutopilotPlan exposes route geometry; bots retain radius80/lookahead40, responsive-player advice uses75/30. Neither VPP constants nor accelerated race travel changes.

- `src/features/trainer-controls/ReservedPanel.tsx` portals auxiliary views/settings into the existing controls area. `TrainerWorkspace` preserves the scene rectangle; inline callbacks do not restart focus effects.
- `src/features/race-scene/guidance.ts` builds a pure water-route ribbon and direction markers; RaceScene displays it only when guidance is supplied. The old target-circle and no-go overlays are removed from the race scene.

- `mobile/app/game/index.tsx` is the primary locally bundled shared 3D race. `race-3d` redirects there; the catalog has one solo entry. `mobile/src/navigation/race-entry.ts` validates supported local routes.
- `src/lib/race-native.ts` validates the versioned world-coordinate race/Pro-rig snapshot before native persistence. `mobile/src/persistence/race-native.ts` stores it additively, acknowledges only successful durable writes, and keeps legacy history readable. `mobile/src/persistence/race-web-storage.ts` whitelists device preferences; new replay and coach use the same local course.
- `src/app/game/RaceCockpit.tsx` and its CSS reserve the 3D scene and move controls/settings to a responsive dock. `src/app/game/race-prefs.ts` stores Simple/Pro and assistance preferences. `src/app/game/RaceReplay.tsx` replays actual local recordings in the shared 3D scene. `src/app/game/race-copy.ts` holds seven-language race UI copy.
- `src/lib/daily-challenge.ts` generates identical date-based settings on server and fresh offline installs. `src/lib/db.ts` consumes it.
- `public/fonts/source-sans-3/` vendors pinned Adobe Source Sans 3 with OFL/provenance. Native assets are bundled in `mobile/assets/fonts/`; `mobile/src/design-system/fonts.tsx` and common Text/Button select weights. Offline builders embed local font bytes.

- `src/app/game/RaceCockpit.module.css` defines the protected ocean cockpit grid, responsive scene/dock split, controls and utility tabs.
- `src/features/simulator-3d/useSailCoachLabels.ts` supplies the same seven-language trim coaching phrases to simulator and race.
- `src/features/race-scene/guidance.test.ts` checks route mesh geometry, bounds and turn colors.
- `src/lib/daily-challenge.test.ts` fixes date validation and deterministic offline/server daily vectors.
- `src/lib/race-guidance.test.ts` verifies route/tack advice plus manual/automatic trim, sail deployment and opt-in steering behavior.
- `src/lib/race-native.test.ts` tests bounded local snapshots, Pro rig state, injected route state and native message validation.
- `src/lib/race-rules.test.ts` covers conservative right of way, collision/mark time penalties, early starts and rule toggles.

- `src/features/race-scene/SailingEnvironment.tsx` is the common ocean, sky, shore, lighting, local reflections and hull wake/shadow used by RaceScene and RegattaScene. No external HDR is loaded.
- `src/features/race-scene/renderer.ts` creates the shared WebGPU renderer with WebGL2 fallback and the same tone mapping. The old optional trainer Bloom/Vignette stack is superseded by common light/tone settings.
- `src/features/race-scene/environment-state.ts` adapts trainer and fleet world travel/wind to common environment uniforms; `src/features/race-scene/environment-state.test.ts` verifies unit, origin and wind contracts.
- `src/features/sailing-lab/runtime/trim-coach.ts` provides pure shared trim advice and quality; `src/features/sailing-lab/runtime/trim-coach.test.ts` checks active-sail masks and downwind behavior.
- `src/lib/race-trim-coach.ts` reads race force diagnostics without stepping time and returns shared trainer coaching keys; `src/lib/race-trim-coach.test.ts` checks per-sail luff/stall, deployment, downwind and immutable state.

- `mobile/src/radio/startup-diagnostics.ts` - SRC startup attempt lifecycle, shared15s deadline and bounded session-only support codes; no storage contents, URL, message or stack retention. `mobile/__tests__/radio-startup-diagnostics.test.ts` verifies deadlines, stale callbacks, classifications and bounds.
- `mobile/src/radio/local-speech.ts` validates the local SRC speech bridge, selects device voices, requests on-device recognition only, bounds sessions and cancels stale activity results. `mobile/src/radio/useLocalRadioSpeech.ts` binds its lifetime to the local WebView, focus and app state. `mobile/src/radio/README.md` specifies the contract and model-unavailable fallback.
- `mobile/plugins/with-local-radio-speech.js` applies version/assertion-checked SDK54 native volume and local recognition patches. Fresh prebuild and binary are required. `mobile/__tests__/local-radio-speech.test.ts` and `mobile/__tests__/local-radio-speech-plugin.test.ts` protect permission hydration, cancellation, bounds and patch idempotence.

- `src/app/multiplayer/MultiplayerCockpit.tsx` and `src/app/multiplayer/MultiplayerCockpit.module.css` reserve server-driven race scenery and common helm controls. Online sailing remains automatically trimmed because the authoritative protocol accepts helm input only.
- `src/app/multiplayer/presentation.ts` adapts server snapshots to shared scene poses without client-side stepping; `src/app/multiplayer/presentation.test.ts` protects identity, coordinates, input and render immutability.
- `src/lib/best-times.test.ts` separates manual Pro records from existing auto-trim records while keeping old saved buckets readable.
- `src/lib/race-clock.test.ts` verifies identical solo integration at 10/15/30/60/120 FPS and pause/background handling through the shared fixed clock.
- `src/lib/race-setup.ts` fixes daily/mission query conditions before generic options and plans saved briefing restarts with recorded mode and known mission conditions. Explicit activity links suppress stale offers; unknown missions stay unavailable. `src/lib/race-setup.test.ts` protects these contracts and the unchanged wind multipliers.
- `public/sw.js` precaches exactly the eight public radio catalog/alias JSON resources for offline language switching; arbitrary JSON and private/API responses remain excluded. `src/app/radio/sw.test.ts` covers this boundary.

- `src/lib/race-replay.ts` validates shared world recordings, preserves bounded rig/wind and mode/penalty metadata in the existing course JSON, upgrades legacy course geometry and interpolates by exact sample timestamps. `src/lib/race-replay.test.ts` verifies these contracts.
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
- `mobile/src/simulator/SimWebView.tsx` - Local asset loading, routing or durable storage.

Release verification: `.github/workflows/deploy.yml` checks all three installed offline packages and runs smoke, foundation, sailing learning, shared replay, radio workspace and offline browser suites against the loopback production build before publishing images. The focused foundation suite also runs in its own CI job for branch/PR feedback; its fixture dismisses the unrelated trainer introduction tour. `ops/deploy/test_deploy.py` locks the prepublication suite selection, loopback target, absence of deploy secrets and main-only publication/deployment conditions. This workflow guard does not replace owner-configured environment restrictions. Pinned actions, immutable image deployment and the forced SSH boundary remain unchanged. The expanded browser gate must still run on the combined source candidate before another publication.

Both pre-deploy and production browser report steps use always() with the same pinned upload action, narrow playwright-report directory and 14-day retention, so successful retries preserve screenshots, retry traces and bounded Pro JSON attachments. The existing boundary tests also lock these artifact limits; the production job still requires successful deploy. This does not change trace-on-first-retry, UI assertions, budgets or host authority. Foundation-only CI report retention is unchanged.

Completion and installed sailing package:

- `src/lib/race-completion.ts` - immediately resolves the bounded existing fleet finish window with the same 30 Hz engine; completed snapshots wait in an immutable queue for their matching native durable acknowledgment.
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
- `src/data/bootcamp-quiz.ts` - единый исходный банк 19 вопросов для сайта и native.
- `src/data/foundation-guide.ts` - общие цели, модули, шаги и семь языков курса из восьми уроков.
- `src/features/race-3d/useRaceView.test.ts` - сохраненные camera presets и безопасный default orbit.
- `src/features/race-scene/orbit-camera.ts` - начальные игровые ракурсы с тем же fit яхты, что в тренажере.
- `src/features/race-scene/orbit-camera.test.ts` - проекция лодки и мачты во viewport при разных размерах.
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
- `src/lib/learning/foundation-progress.ts` - новое ограниченное web evidence; старое completed означает просмотр, не сдачу.
- `src/lib/product/learning-web.test.ts` - продолжение и честные счетчики сайта с сохранением legacy данных.
- `src/lib/sounds.test.ts` - одна настройка звука управления/гонки, legacy migration и native injection.

- `src/lib/race-startup.ts` - готовность относится к конкретной гонке; до первого отправленного кадра нет отсчета или движения.
- `src/lib/race-startup.test.ts` - загрузка не превращается во время simulation, устаревший callback не запускает новую гонку.
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
- `src/lib/race-courses.ts` is an unconnected120/300/600m metric registry and fresh world-coordinate factory/spawn layout. It does not switch race defaults, physics, progression, recordings or multiplayer. Metadata/PB/replay/server compatibility must precede activation.
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
- `src/lib/diagnostics.ts` - pure bounded journal, exact event schemas and validated persistence/transport codecs.

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
  start/finish lines, all marks, player/fleet headings and incoming true wind.
- `src/features/race-hud/RaceOverviewMap.test.tsx` - map labels, actual elements,
  shared-line deduplication and invalid snapshot fallback.
- `src/features/race-hud/navigation-copy.ts` - all map/wind/style labels in
  RU/EN/PL/ES/FR/DE/IT. True wind is geographic; air arrows use apparent wind.
- `src/features/race-hud/RaceWindInstrument.tsx` - compact actual TWD/TWS,
  north-up compass and detailed true/apparent readings; four visual aid choices.
- `src/features/race-hud/RaceWindInstrument.module.css` - compact/detailed
  instruments,44px choices and wrapping unknown values on narrow screens.
- `src/features/race-hud/RaceWindInstrument.test.tsx` - known/unknown readings
  and complete exclusive four-way controls across all seven languages.
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
- `e2e/race-navigation.spec.ts` - two independent real390px Simple race journeys:
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
- `src/lib/race-native-env.ts` - synchronous native marker, injected race query
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
  passive wind corner and live mini-map button, using the existing snapshots
  and full dock Map action, with no second simulation or animation loop.
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
