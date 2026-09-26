# ARCHITECTURE - карта кода Regatta

Карта кода и потоков. Точка входа для агента - `AGENTS.md`, история изменений -
`CHANGELOG.md`. Этот файл держится в синхроне с деревом: `npm run check:map`
падает, если появился файл без строки в разделе 4 или путь в карте больше не
существует.

Проверено по коду 2026-09-26 (ветка `claude/sailing-educational-materials-3b2792`).

---

## 1. Что это и где работает

Regatta (в UI "Week to Regatta") - учебное приложение по парусному спорту:
теория, три тренажерные поверхности на одном физическом движке, гонка с ботами
и мультиплеер, плюс два экзаменационных курса под польские сертификаты (SRC
радиосвязь и sternik motorowodny).

- Веб: Next.js 16 (App Router, Turbopack) + React 19, TypeScript strict,
  Tailwind v4. Прод: https://weektoregatta.com, vps2, два контейнера
  (`regatta`, `regatta-ws`) за общим контейнером nginx.
- Мобильное: Expo / React Native в `mobile/`, версия 1.6.2 (build 43, ожидает
  ревью), свой CI-джоб и свой гейт релиза. Своя карта: `docs/design/mobile/ARCHITECTURE.md`.
- Данные: SQLite (better-sqlite3) в томе `/data` контейнера `regatta`.
- ИИ: Claude через `@anthropic-ai/sdk` (коуч, чаты), OpenAI (STT/TTS радиокурса).

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
`page.view`, `page.engaged`, `js.uncaught`, `js.rejection`.

### 3.3 Физика

Один движок: `src/lib/sailing-physics/*` (чистый TypeScript, без React, DOM и
I/O). Его используют Основы (`/simulator`), Тренажер (`/simulator-v3`), Лодка
3D (`/simulator2`), общая сессия `src/features/sailing-lab/runtime/session.ts`
и мобильное приложение через алиас `@regatta/physics`. Обоснование и константы
зафиксированы в `DECISIONS.md` ADR-0001: менять коэффициенты движка можно
только новым ADR. `ws-server/race-physics.js` генерируется из TS-исходников
скриптом `scripts/build-race-server.mjs`, руками его не правят.

### 3.4 Гонка и мультиплеер

Одиночная гонка `/game` пока считается на `src/lib/race-physics.ts` (аркадная
модель, долг Phase 3 - перевести на `sailing-physics` и удалить файл).
Мультиплеер: `src/lib/mp-client.ts` -> `wss://weektoregatta.com/ws` -> nginx ->
`ws-server/server.js` (авторитетный тик 20 Гц). На финише ws-server постит
результат в `/api/race-result`, оттуда он попадает в лидерборд и реплей.

### 3.5 Живая погода

Провайдер Open-Meteo, без ключа: `src/lib/weather/open-meteo.ts` за контрактом
`src/lib/weather/types.ts`, роут `src/app/api/weather/route.ts` нормализует
ветер, волну и течение, переводит в узлы и кэширует в памяти. Потребители:
`src/components/WindNowCard.tsx`, `/spots`, кнопка живого ветра в Тренажере.

### 3.6 Офлайн-контент для мобильного

`mobile/scripts/build-sailing-offline.mjs` и
`mobile/scripts/build-radio-offline.mjs` собирают
веб-контент в нативный ассет; `npm run build:sailing-offline:check` в CI падает,
если бандл разошелся с исходниками сайта. Мост между WebView и RN описан в
`src/features/sailing-lab/runtime/storage-protocol.ts` (произвольные ключи,
URL и удаление со страницы не принимаются).

### 3.7 Тема

`src/lib/theme.ts` - единственное место, где решается light/dark; его читают
`src/components/ThemeManager.tsx`, `src/components/ThemeToggle.tsx` и
inline-скрипт без мигания в `src/app/layout.tsx`.

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

### 4.2 Пять разделов оболочки и контент

- `src/app/learn/page.tsx` - хаб Learn: уроки, курсы, сертификаты.
- `src/app/learn/sails/page.tsx` - курс "работа с парусами": список уроков.
- `src/app/learn/sails/[lesson]/page.tsx` - один урок курса парусов (статические параметры).
- `src/app/practice/page.tsx` - хаб Practice: три тренажерные поверхности.
- `src/app/race/page.tsx` - хаб Race: одиночная гонка, мультиплеер, лидерборд.
- `src/app/library/page.tsx` - хаб Library с поиском по всем разделам.
- `src/app/start/page.tsx` - буткемп из 8 уроков "с нуля".
- `src/app/quick/page.tsx` - повторение за 15 минут.
- `src/app/courses/page.tsx` - курсы относительно ветра (подписи по-русски намеренно).
- `src/app/rules/page.tsx` - правила гонок и расхождения, 21 сценарий.
- `src/app/rules/CoursesSection.tsx` - блок курсов внутри страницы правил.
- `src/app/racing/page.tsx` - тактика гонки.
- `src/app/glossary/page.tsx` - глоссарий, 51 термин с категориями.
- `src/app/anatomy/page.tsx` - устройство яхты: 3D-модель плюс постеры.
- `src/app/onboard/page.tsx` - первая неделя на борту.
- `src/app/checklist/page.tsx` - чек-лист перед выходом.
- `src/app/spots/page.tsx` - места и живая погода.
- `src/app/gallery/page.tsx` - галерея фото и видео прошлых регат.

### 4.3 Тренажеры, гонка, реплей, статистика

- `src/app/simulator/page.tsx` - Основы (внутреннее имя V1), canvas, прод-поверхность.
- `src/app/simulator2/page.tsx` - Лодка 3D (V2), обертка над `src/features/simulator-3d`.
- `src/app/simulator-v3/page.tsx` - Тренажер трима (V3), обертка над `src/features/simulator-v3`.
- `src/app/game/page.tsx` - серверная обертка одиночной гонки.
- `src/app/game/GameClient.tsx` - клиент гонки: старт, знаки, боты, коуч на финише.
- `src/app/multiplayer/page.tsx` - серверная обертка мультиплеера.
- `src/app/multiplayer/MultiplayerClient.tsx` - лобби, код комнаты, гонка по WebSocket.
- `src/app/leaderboard/page.tsx` - лучшие времена по бакетам и дневной вызов.
- `src/app/r/[code]/page.tsx` - страница реплея по 6-символьному коду.
- `src/app/r/[code]/ReplayViewer.tsx` - проигрыватель реплея с таймлайном.
- `src/app/stats/page.tsx` - вход в админку, за basic-auth из `src/proxy.ts`.
- `src/app/stats/StatsDashboard.tsx` - панели: страны, устройства, источники, время на странице.
- `src/app/stats/FeedbackAdmin.tsx` - разбор обратной связи со статусами.

### 4.4 API `src/app/api`

- `src/app/api/health/route.ts` - liveness для healthcheck Docker и nginx, без рендера и БД.
- `src/app/api/log/route.ts` - прием клиентских событий: усечение IP, allow-list `meta`, страна из заголовков.
- `src/app/api/log/route.test.ts` - контракт: всегда 204, даже на мусорном теле.
- `src/app/api/race-result/route.ts` - запись результата гонки, лимит 60/час/сессия, границы значений.
- `src/app/api/race-result/route.test.ts` - контракт валидации входа без реальной SQLite.
- `src/app/api/leaderboard/route.ts` - выдача лучших времен по бакетам.
- `src/app/api/daily/route.ts` - миссия дня (одна на UTC-сутки).
- `src/app/api/player/route.ts` - ник игрока и его идентификатор.
- `src/app/api/replay/route.ts` - сохранение реплея, выдача кода.
- `src/app/api/replay/[code]/route.ts` - чтение реплея по коду.
- `src/app/api/coach/route.ts` - ИИ-коуч на финише, событие `coach.requested`.
- `src/app/api/ai-chat/route.ts` - общий ИИ-чат по учебным темам.
- `src/app/api/sternik-chat/route.ts` - ИИ-разбор вопросов экзамена sternik.
- `src/app/api/feedback/route.ts` - прием обратной связи из виджета.
- `src/app/api/support/route.ts` - заявка со страницы поддержки, уходит в Telegram.
- `src/app/api/admin/feedback/route.ts` - смена статусов фидбэка для `/stats`.
- `src/app/api/admin/stats-range/route.ts` - агрегаты за период для дашборда.
- `src/app/api/weather/route.ts` - прокси Open-Meteo: ветер, волна, течение, кэш в памяти.
- `src/app/api/weather/route.test.ts` - контракт роута погоды без сети.
- `src/app/api/gallery/like/route.ts` - лайк фото галереи.
- `src/app/api/gallery/likes/route.ts` - счетчики лайков.
- `src/app/api/og/route.tsx` - генерация OG-картинки для страниц.
- `src/app/api/og/result/route.tsx` - OG-картинка результата гонки.
- `src/app/api/radio-tts/route.ts` - синтез радиофраз (fallback, когда нет статического mp3).
- `src/app/api/radio-transcribe/route.ts` - распознавание речи для голосовых упражнений.
- `src/app/api/radio-voice/route.ts` - прием записи, транскрипция и оценка передачи.
- `src/app/api/radio-voice/voiceGrading.ts` - чистая оценка радиопередачи по ключевым элементам.
- `src/app/api/radio-voice/voiceGrading.test.ts` - тесты грейдера: обратный порядок слов не должен проходить.

### 4.5 Радиокурс SRC `src/app/radio`

- `src/app/radio/page.tsx` - вход в курс: разделы, прогресс, слабые места.
- `src/app/radio/layout.tsx` - layout курса, скрывает лишний хром в embed-режиме.
- `src/app/radio/RadioSubnav.tsx` - подраздельная навигация курса.
- `src/app/radio/MicCheck.tsx` - проверка микрофона перед голосовыми упражнениями.
- `src/app/radio/WeakSpotsPanel.tsx` - панель "что ты стабильно путаешь".
- `src/app/radio/weakSpots.ts` - сбор слабых мест из ответов всех тренажеров.
- `src/app/radio/courseProgress.ts` - прогресс по главам курса в localStorage.
- `src/app/radio/questionProgress.ts` - прогресс по отдельным вопросам.
- `src/app/radio/runtimeSearch.ts` - поиск по материалам курса на клиенте.
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
- `src/app/radio/obsluga/InteractiveRadioCourse.tsx` - пошаговый тренажер по 15 урокам.
- `src/app/radio/obsluga/lessonData.ts` - объяснения "почему", а не только "какую кнопку".
- `src/app/radio/symulator/page.tsx` - симулятор станции ICOM (M330GE / M323).
- `src/app/radio/symulator/RadioFront.tsx` - передняя панель станции.
- `src/app/radio/symulator/radioModel.ts` - чистый конечный автомат станции по мануалам ICOM.
- `src/app/radio/symulator/radioModel.test.ts` - тесты автомата станции.
- `src/app/radio/symulator/scenarios.ts` - сценарии тренировки: что нажать и что сказать.
- `src/app/radio/symulator/scenarios.test.ts` - тесты сценариев.
- `src/app/radio/symulator/radioTraffic.ts` - кто в эфире, на каком канале и с какой силой.
- `src/app/radio/symulator/stationReply.ts` - правильный ответ береговой станции.
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

### 4.6 Курс sternik motorowodny `src/app/sternik`

- `src/app/sternik/page.tsx` - вход в курс: тренажер, теория, экзамен, устная часть.
- `src/app/sternik/layout.tsx` - layout курса.
- `src/app/sternik/SternikSubnav.tsx` - подраздельная навигация.
- `src/app/sternik/test/page.tsx` - тренажер по банку вопросов.
- `src/app/sternik/egzamin/page.tsx` - пробный экзамен: 75 вопросов, 90 минут, порог 65.
- `src/app/sternik/quiz-utils.ts` - общие помощники тренажера и экзамена.
- `src/app/sternik/analysis.ts` - персональный разбор: слабые категории из прогресса.
- `src/app/sternik/PersonalReport.tsx` - отчет по ошибкам.
- `src/app/sternik/QuestionFigure.tsx` - рисунки к вопросам (знаки, огни, ситуации).
- `src/app/sternik/prefs.tsx` - настройки курса, читаются в эффекте плюс флаг `prefsLoaded`.
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

### 4.7 Общие компоненты `src/components`

- `src/components/Navigation.tsx` - основная навигация по пяти разделам (владеет Shared-лейн).
- `src/components/SiteFooter.tsx` - подвал с брендовой строкой.
- `src/components/ContentFooterNav.tsx` - переходы между контентными страницами.
- `src/components/BootcampFooterNav.tsx` - нижняя панель на страницах уроков буткемпа.
- `src/components/BootcampProgressChip.tsx` - чип прогресса буткемпа в шапке.
- `src/components/LanguageToggle.tsx` - переключатель языка, пишет localStorage и cookie.
- `src/components/ThemeToggle.tsx` - переключатель темы.
- `src/components/ThemeManager.tsx` - применение темы и подписка на системную.
- `src/components/GoogleAnalytics.tsx` - GA4 поток `G-ZEWWJ4N31M`.
- `src/components/ClientErrorReporter.tsx` - `page.view`, `page.engaged`, `js.uncaught`, `js.rejection`.
- `src/components/FeedbackWidget.tsx` - виджет обратной связи, шлет в `/api/feedback`.
- `src/components/HelpOverlay.tsx` - контекстная справка поверх страницы.
- `src/components/OnboardingTour.tsx` - первый проход по интерфейсу.
- `src/components/ServiceWorkerRegistrar.tsx` - регистрация сервис-воркера и офлайн-фолбэка.
- `src/components/WindNowCard.tsx` - карточка живого ветра из `/api/weather`.
- `src/components/AnatomyPosters.tsx` - два постера-инфографики на `/anatomy`.
- `src/components/YachtViewer3D.tsx` - общий просмотрщик GLB-яхты (анатомия и тренажер, метры).
- `src/components/product/ProductHub.tsx` - общий рендер хаба раздела по каталогу.
- `src/components/product/Product.module.css` - стили продуктовой оболочки.
- `src/components/product/Navigation.module.css` - стили навигации оболочки.

### 4.8 Контент `src/data`

- `src/data/sailing-data.ts` - курсы относительно ветра (5), галсы, маневры (6), глоссарий (51 термин), категории, правила гонок, стратегии.
- `src/data/rules.ts` - сценарии расхождения и правил, 21 карточка (сцена, вопрос, ответ, почему).
- `src/data/anatomy.ts` - части яхты с координатами в SVG 1000x500 и подписями.
- `src/data/bootcamp.ts` - 8 уроков буткемпа по ~5 минут.
- `src/data/onboard.ts` - "первая неделя на борту", 8 разделов.
- `src/data/checklist.ts` - чек-лист перед выходом.
- `src/data/missions.ts` - миссии гонки, оцениваются после финиша по логу.
- `src/data/drills.ts` - каталог упражнений и сценариев, общий для веба и мобильного.
- `src/data/gallery.ts` - видео и фото галереи.
- `src/data/gallery-2026.generated.ts` - автогенерация `scripts/build-gallery-year.mjs`, руками не править.
- `src/data/src-radio.ts` - официальный банк 324 вопросов UKE SRC.
- `src/data/sternik.ts` - банк sternik motorowodny: 879 вопросов, категории, конфиг экзамена (75 вопросов, 90 минут, порог 65). Id вопросов стабильны, не перенумеровывать.
- `src/data/sailing-lab/course.ts` - структура курса работы с парусами.
- `src/data/sailing-lab/mainsheet-lesson.ts` - урок по гика-шкоту.
- `src/data/sailing-lab/shape-lessons.ts` - уроки по форме паруса (оттяжка, шкаторины).

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
- `src/features/sailing-lab/runtime/checkpoint-storage.ts` - хранилище чекпоинтов тренажера.
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
- `src/features/sailing-lab/lessons/progress.ts` - прогресс по урокам парусов в localStorage.
- `src/features/sailing-lab/lessons/diagrams.ts` - схемы урока: подписи, варианты, показания.
- `src/features/sailing-lab/lessons/mainsheet-diagram.ts` - схема урока по гика-шкоту.
- `src/features/sailing-lab/lessons/shape-diagrams.ts` - схемы уроков по форме паруса.
- `src/features/sailing-lab/lessons/trim-study.ts` - разбор трима: фазы, замечания, наблюдения.
- `src/features/sailing-lab/lessons/trim-study.test.ts` - тесты разбора трима.
- `src/features/sailing-lab/scene/trim-rig.ts` - построение сцены рига для визуализации трима.
- `src/features/sailing-lab/scene/trim-rig.test.ts` - тесты сцены рига.
- `src/features/sailing-lab/ui/SailingCourse.tsx` - UI курса работы с парусами.
- `src/features/sailing-lab/ui/SailingCourse.module.css` - стили курса.

### 4.10 `src/features/simulator-3d` - Лодка 3D (V2)

- `src/features/simulator-3d/README.md` - назначение и границы самостоятельного 3D-модуля.
- `src/features/simulator-3d/index.ts` - публичный барель портируемых частей модуля.
- `src/features/simulator-3d/SimulatorV2.tsx` - обертка под Next.js для `/simulator2`.
- `src/features/simulator-3d/Simulator3D.tsx` - корневой компонент 3D-вида и панелей.
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
- `src/features/simulator-3d/ocean/Ocean.tsx` - поверхность воды.
- `src/features/simulator-3d/ocean/Wake.tsx` - кильватерный след.
- `src/features/simulator-3d/ocean/WindFlow.tsx` - видимый поток ветра.
- `src/features/simulator-3d/ocean/waves.ts` - поле волн (сумма синусов), общее для воды и качки.
- `src/features/simulator-3d/physics/useSailingSim.ts` - подключение общей сессии к сцене, телеметрия.
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
- `src/features/simulator-v3/SimulatorV3Page.tsx` - страница тренажера: сцены, поды, панели.
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
- `src/features/simulator-v3/runtime/deep-link.ts` - разбор ссылки на конкретное упражнение.
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

- `src/proxy.ts` - middleware: короткие языковые ссылки, cookie `regatta_lang`, basic-auth `/stats` со сравнением за константное время и 503 без `ADMIN_PASSWORD`.
- `src/lib/i18n.tsx` - провайдер и хуки `t` / `tp` / `tl`, приоритет источников языка.
- `src/lib/languages.ts` - список языков, `LANG_SHORTCUT_PATHS`, `pickLocalized`, порядок в пикере.
- `src/lib/db.ts` - SQLite: события, фидбэк, лидерборд, реплеи; единственный `insertEvent()`.
- `src/lib/net.ts` - усечение клиентского IP перед логом и записью.
- `src/lib/log.ts` - структурный лог JSON-строками в stdout контейнера.
- `src/lib/client-log.ts` - клиентский логгер через `sendBeacon`, молча падает.
- `src/lib/rate-limit.ts` - скользящее окно в памяти (один контейнер, без Redis).
- `src/lib/storage.ts` - версионированный localStorage в пространстве `regatta.`.
- `src/lib/theme.ts` - разрешение темы light/dark, один источник истины.
- `src/lib/sounds.ts` - процедурные звуки на WebAudio, уважают общий mute.
- `src/lib/race-physics.ts` - аркадная модель гонки `/game` (долг: перевести на движок).
- `src/lib/race-physics.drift.test.ts` - тесты дрейфа аркадной модели.
- `src/lib/race-course.test.ts` - тесты дистанции гонки (знаки, линия).
- `src/lib/race-resume.ts` - восстановление настроек гонки после перезагрузки.
- `src/lib/best-times.ts` - личные рекорды по бакетам сложности и ветра.
- `src/lib/mp-client.ts` - WebSocket-клиент мультиплеера с автопереподключением и типизированной шиной.
- `src/lib/fallback-coach.ts` - эвристический коуч, когда Claude недоступен.
- `src/lib/weather/types.ts` - контракт провайдера погоды.
- `src/lib/weather/open-meteo.ts` - провайдер Open-Meteo (без ключа).
- `src/lib/weather/index.ts` - выбор провайдера и общий вход.
- `src/lib/product/catalog.ts` - информационная архитектура: 5 разделов, маршруты, подписи на 7 языках.
- `src/lib/product/catalog.test.ts` - тесты маршрутов и поиска по каталогу.
- `src/lib/product/copy.ts` - общие тексты оболочки.
- `src/lib/sternik-progress.ts` - прогресс курса sternik в localStorage.

### 4.13 `ws-server` - сервер мультиплеера

- `ws-server/server.js` - авторитетный сервер: комнаты, лобби, боты, миссии, тик 20 Гц.
- `ws-server/race-physics.js` - сгенерированная физика (`scripts/build-race-server.mjs`), руками не править.
- `ws-server/package.json` - зависимости отдельного процесса (вне сборки Next).
- `ws-server/package-lock.json` - лок зависимостей ws-server.
- `ws-server/Dockerfile` - образ контейнера `regatta-ws`.

### 4.14 `scripts` - гейты, кодмоды, контент

- `scripts/check-project-map.mjs` - гейт карты: entrypoint, существование путей, покрытие файлов, секреты.
- `scripts/check-no-dash.mjs` - гейт типографики (em/en-dash), тот же запрет, что в хуке.
- `scripts/check-bundle-size.mjs` - бюджет размера бандла.
- `scripts/build-race-server.mjs` - генерация `ws-server/race-physics.js` из TS-движка, режим `--check`.
- `scripts/test-multiplayer.mjs` - регрессия жизненного цикла сокета на локальном сервере.
- `scripts/stress-mp.js` - нагрузочный тест мультиплеера (см. раздел 5).
- `scripts/cyrillic-scan.mjs` - поиск утечек кириллицы в ES/FR/DE/IT на контентных маршрутах.
- `scripts/translate-data-flat.mjs` - массовый перевод плоских полей данных через Claude API.
- `scripts/translate-data.mjs` - перевод полей данных в новый язык (старая форма).
- `scripts/migrate-data-fields.mjs` - кодмод формы полей в файлах данных.
- `scripts/migrate-tp-to-tl.mjs` - кодмод `tp(...)` в `tl({...})`.
- `scripts/strip-polish-diacritics.mjs` - снятие диакритик только с польских строк.
- `scripts/fix-orphan-lines.mjs` - ремонт осиротевших строк переводов после массового прогона.
- `scripts/audit-sailing-model.mjs` - числовые пробы поведения движка (только чтение).
- `scripts/pregen-radio-audio.mjs` - предгенерация клипов радиофраз в `public/radio-audio`.
- `scripts/build-gallery-year.mjs` - сборка галереи за год из папки фото.
- `scripts/build-gallery-strip.mjs` - оптимизация папки фото в веб-полосу.
- `scripts/apply-nginx-config.sh` - применение `regatta.nginx.conf` к nginx на хосте.
- `scripts/setup-nginx-geoip2.sh` - одноразовая настройка geoip2 в nginx.
- `scripts/backup-sqlite.sh` - онлайн-бэкап `/data/regatta-stats.db` на VPS.
- `scripts/I18N_MIGRATION.md` - плейбук миграции i18n.
- `scripts/sailing-glossary.md` - рабочий глоссарий терминологии для переводов.
- `scripts/blender/build_sailing_yacht.py` - генерация учебной яхты в Blender.
- `scripts/blender/refine_yacht.py` - доводка модели яхты.
- `scripts/blender/audit_yacht.py` - проверка модели перед экспортом.
- `scripts/blender/export_sail_shapes.mjs` - выборка формы парусов из рантайма для Blender.
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
- `ops/deploy/test_deploy.py` - тесты именно границы привилегий, а не приложения.
- `ops/deploy/.gitignore` - прячет `__pycache__/` рядом с python-скриптами.
- `ops/notify/README.md` - какие уведомления настроены и куда идут.
- `ops/notify/asc-telegram-notify.mjs` - опрос статуса ревью App Store и сообщение в Telegram.
- `ops/notify/asc-alert.sh` - управление launchd-задачей алерта.
- `ops/notify/N8N_SUPPORT_SETUP.md` - настройка потока support@ в Telegram через n8n.
- `ops/notify/regatta-support-email-to-telegram.workflow.json` - экспорт workflow n8n.
- `e2e/smoke.spec.ts` - smoke по критичным маршрутам и контрактам embed-режима.
- `e2e/multiplayer.spec.ts` - двухклиентный мультиплеер (нужны два браузера, см. раздел 8).

### 4.16 Корневые конфиги

- `package.json` - зависимости и все команды (`dev`, `build`, тесты, гейты).
- `tsconfig.json` - TypeScript strict и алиасы путей.
- `next.config.ts` - конфиг Next 16: standalone-сборка, заголовки, ремаппинг.
- `eslint.config.mjs` - правила ESLint (в CI пока advisory).
- `postcss.config.mjs` - подключение Tailwind v4 через PostCSS.
- `vitest.config.ts` - конфиг unit-тестов.
- `playwright.config.ts` - конфиг E2E, `BASE_URL` управляет целью.
- `Dockerfile` - образ веб-приложения (node alpine, standalone).
- `docker-compose.yml` - сервисы `regatta` (172.17.0.1:4500) и `regatta-ws` (172.17.0.1:4502), том `/data`, healthcheck.
- `regatta.nginx.conf` - эталон конфига реверс-прокси и CSP; на хосте применяется вручную.
- `.dockerignore` - что не попадает в контекст сборки образа.
- `.gitignore` - что не попадает в репозиторий (включая `.env*`).

---

## 5. ws-server: константы и базовая линия

Сверено с `ws-server/server.js` (2026-09-26):

| Параметр | Значение | Где |
|---|---|---|
| Порт в контейнере | 3001, наружу `172.17.0.1:4502` | `docker-compose.yml` |
| Частота авторитетного тика | 20 Гц (`TICK_HZ`) | `ws-server/server.js:15` |
| Игроков в комнате | 10 (`MAX_PLAYERS_PER_ROOM`) | `ws-server/server.js:16` |
| Код лобби | 4 символа из алфавита без похожих букв | `ws-server/server.js` |
| Код реплея | 6 символов из того же алфавита без похожих букв | `src/lib/db.ts` |
| Грейс переподключения | 20 с (`RECONNECT_GRACE_MS`) | `ws-server/server.js:19` |
| Простой комнаты | 15 минут | `ws-server/server.js:17` |
| Отсечка гонки | 300 с | `ws-server/server.js:328` |
| Троттлинг | 30 соединений в минуту на IP, 60 сообщений в секунду | `ws-server/server.js:408` |

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
  НЕ применяется деплоем: правится host-файл, затем
  `docker exec nginx_server nginx -s reload` (можно через
  `scripts/apply-nginx-config.sh`).
- CSP разрешает только свой origin плюс GA и YouTube-фреймы. Любой внешний
  ассет в проде блокируется; новый домен появляется только правкой конфига на
  хосте и перезагрузкой nginx.
- База: том `/data` внутри контейнера (`REGATTA_DB_DIR=/data`), файл
  `regatta-stats.db` переживает редеплой. Бэкап: `scripts/backup-sqlite.sh`.
- Секреты: `.env` рядом с чекаутом репозитория на VPS, в репозиторий не попадают.
- Деплой: push в `main` -> `.github/workflows/deploy.yml` -> проверки и
  pre-deploy E2E -> SSH на VPS -> `docker compose build` и `docker compose up -d`
  -> smoke по прод-маршрутам -> Playwright на проде.
- Логи: `docker logs --tail 500 regatta` и `docker logs --tail 500 regatta-ws`.
- Запрос в базу: `docker exec regatta sqlite3 /data/regatta-stats.db "..."`.
- Откат: ssh на VPS, в каталоге чекаута `git checkout <тег>` и
  `docker compose up -d --build` (деплой умеет и тег `v*`, и
  `workflow_dispatch` с произвольным ref).

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
| `TECH.md`, `AUDIT.md`, `FEATURES.md` | физика 8/8 тестов | `npm run test:physics` = 46 тестов в 7 файлах; весь `npx vitest run` = 414 тестов в 45 файлах |
| `CLAUDE.md` (до этой правки) | 31/31 физика, 12/12 Playwright | 46 физики, `npx playwright test --list` = 16 тестов в 2 файлах |
| `README.md` | глоссарий 64 термина | 51 запись в `src/data/sailing-data.ts` |
| `FEATURES.md` | мультиплеер 2-8 игроков | `MAX_PLAYERS_PER_ROOM = 10` |
| `FEATURES.md` | правил 8 карточек | 21 сценарий в `src/data/rules.ts` |
| `FEATURES.md` раздел 10 | i18n только localStorage, без cookie, только `t`/`tp` | cookie `regatta_lang` плюс SSR обязательны, есть `tl`; версию из `FEATURES.md` не переносить |
| `FEATURES.md` раздел 14 | нет нативного приложения, нет живой погоды, нет светлой темы | есть `mobile/` с конвейером App Store, есть `/api/weather` на Open-Meteo, есть светлая тема |
| `AUDIT.md` | порт ws `:4501` | 4502 в `docker-compose.yml` и `regatta.nginx.conf` |
| `TECH.md` | VPS `178.104.223.93`, откат через `46.225.11.249` | адреса не актуальны, хост берется из секретов деплоя; домен weektoregatta.com |
| `regatta.nginx.conf` | `server_name regatta.icoffio.com` | прод отвечает на weektoregatta.com; файл в репозитории отстал и не применяется автоматически |
| `TECH.md` R1, `AUDIT.md` R1, `ROADMAP.md` Phase 4 | переименовать src/middleware.ts в `src/proxy.ts` | уже сделано, middleware.ts в дереве нет |
| `CLAUDE.md` (до этой правки), `ROADMAP.md`, `MEMORY.md` | живой маршрут `/trim-trainer`, каталог src/features/simulator-v2 | ни того, ни другого в дереве нет (сборка V2-гонки удалена 2026-07-05, `be43938`) |
| `CLAUDE.md` (до этой правки) | гейт G1 это scripts/i18n-audit.mjs в корне | скрипт живет в `mobile/scripts/i18n-audit.mjs` |
| `DESIGN.md` | ссылка на PRODUCT.md | такого файла в репозитории нет; радиокурс описан в `docs/design/sternik-radio.md` |
| `CLAUDE.md` правило "польский без диакритик" | применяется везде | в экзаменационном контенте (`src/data/sternik.ts`, радиокурс) диакритики намеренно есть; `src/lib/product/catalog.ts` тоже их содержит |
| `MEMORY.md` | банк sternik 148 вопросов | 879 вопросов в `src/data/sternik.ts` |
| `docs/design/simulator2/ROADMAP.md` | план гоночной сборки V2 | отменен, актуален только бэклог 3D-визуала |
