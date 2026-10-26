# AGENTS - точка входа в проект Regatta

Этот файл читают первым Claude, Codex, Cursor, Gemini и любой другой агент.
`CLAUDE.md` импортирует его строкой `@AGENTS.md`, поэтому правила живут здесь, в
одном месте. Карта кода - `ARCHITECTURE.md`. Что изменилось - `CHANGELOG.md`
(читать первым, чтобы понять текущее состояние).

## Current completion work

- Owner-approved follow-up: `docs/audits/2026-10-26/completion-program.md` is the ordered harness. Priorities include reliable offline learning, shared boat/controls, configurable courses/help/judging, reviewed Scheme/Picture learning visuals, visible bounded radio speech practice, actual outcome diagnostics, PL/RU/EN first, and recoverable cleanup. SwiftUI is a staged shell migration proposal, not permission to duplicate the force model.
- P01 is active: build65 first-lesson extra simulator CTA crashes at the unsupported Skia accessibility setter. The candidate moves actions to a native View and removes the trainer's live-weather feature. Source checks are not installed acceptance or delivery.
- Delivered65 remains immutable sourceb0e5868/tagtestflight-1.7.0-65. Exact Apple Self/notes evidence, source/browser/native limits: `docs/audits/2026-10-26/checks/native65-delivery.json` and `docs/design/mobile/testflight65-2026-10-26.md`. Full acceptance remains open in `docs/audits/2026-10-26/acceptance65.md`.
- Independent product audit: `docs/audits/2026-10-26/independent-product-audit.md`. Its audit-only state is historical; the owner subsequently authorized the completion program. All22screens and two native crash records remain unchanged.
- Physical emission stays OFF until native PB durability, class-aware consumers/server, engine, bots, guidance and recorded-data gates pass. Use `docs/audits/2026-10-26/physical-consumers-harness.md`; outcome logging gaps remain in `docs/audits/2026-10-26/diagnostics-followup.md`.
- APP active checkout is NEXT, SITE5df0ee5 and delivered APP64/65 are separate checkpoints. Do not mutate the frozen APP64 checkout or protected dirty root. Before cleanup, preserve unique changes and archival references.
- Earlier dated status entries are preserved in `docs/audits/2026-10-26/completion-history-before-program.md`, not deleted or promoted to current evidence.

## Что это

- Продукт: Regatta, в UI "Week to Regatta". Учебное приложение по парусному
  спорту: теория, тренажеры на реальной модели сил, гонка с ботами и
  мультиплеер, два курса под польские сертификаты (радиосвязь SRC и sternik
  motorowodny).
- Для кого: новичок перед первой неделей на яхте, возвращающийся шкипер,
  кандидат на польский патент.
- Прод: https://weektoregatta.com. Хост vps2, Docker Compose (контейнеры
  `regatta` и `regatta-ws`) за общим контейнером nginx.
- Мобильное приложение: Expo / React Native (Expo SDK 54) в `mobile/`.
  TestFlight1.7.0(65), группа Self: sourceb0e5868,
  VALID/IN_BETA_TESTING и8notes независимо проверены2026-10-26 11:46UTC;
  `docs/design/mobile/testflight65-2026-10-26.md`. Публичная1.6.4(48)
  остается отдельно от TestFlight.
  Историческая проверка60:
  Сборка 60 из 8e39721: VALID, IN_BETA_TESTING, восемь локалей заметок проверены.
  Сборка 59 отклонена Apple при импорте, не распространялась. Описание
  Photos API встроенного Expo file reader исправлено на семи языках.
  Доказательства: `docs/design/mobile/testflight60-2026-10-24.md`.
  Доставку в Self подтверждают отдельно через живой ASC GET; архив и успешная
  загрузка сами по себе не означают доступность тестировщику. Журнал и история:
  `docs/design/mobile/BUILDS.md`. Выпуск только через обязательный гейт ниже.
  Жизненный цикл UIScene для Xcode 27 дает `mobile/plugins/with-uiscene.js`.
- Стек: Next.js 16 (App Router, Turbopack), React 19, TypeScript strict,
  Tailwind v4, SQLite (better-sqlite3), three.js / R3F для 3D, отдельный
  WebSocket-сервер на Node.

## Учебный интерфейс: текущая доработка

- Приоритет владельца от 2026-10-15: сначала мобильное приложение и TestFlight.
  Решение владельца 2026-10-21: дизайн v3 и учебные модули выходят и на сайте
  (PR #74 вместе со сборкой 50), сначала все доделать до рабочего состояния,
  потом общая доводка.
- Курс «С нуля»: 8 уроков, 3 модуля, шаги разобрать / проверить / практика.
  Реализация и проверка build 47: `docs/design/mobile/foundation-release47-2026-10-15.md`.
  ADR-0018 описывает native-схемы, сохранение места и возврат из практики.

- Срез 2026-10-15: `docs/design/learning-modules-2026-10-15.md`, решение
  ADR-0017 в `docs/design/mobile/DECISIONS.md`. Все 13 уроков парусов имеют
  общие цели и модульную структуру на сайте и в приложении.
- Хранить отдельно теорию, место в уроке, результат упражнения и снимок
  симулятора. Открытие шага не засчитывает навык. Native WebView использует
  AsyncStorage через два разрешенных назначения, не file-origin localStorage.
- Новая порция учебных материалов должна включать понятную цель, читаемую
  схему, объяснение, проверку и подходящую практику с возвратом. Не заменять
  проверенные учебные схемы декоративными AI-картинками.

## Жесткие правила

1. **Типографика.** Никогда не использовать длинное тире (U+2014) и среднее
   тире (U+2013): только ASCII-дефис, запятая или двоеточие. Касается TS/TSX
   строк, комментариев, markdown, переводов, сообщений коммитов и промптов.
   Правило одинаково для всех семи языков. Для английского двойные кавычки; в
   русском допустимы `«елочки»`.
2. **Полное написание во всех языках.** Польский пишется с диакритикой
   (`ą ć ę ł ń ó ś ź ż`), как пишут поляки; ES / FR / DE / IT со своими знаками
   (решение владельца 2026-09-27, прежнее правило "польский без диакритик"
   отменено). Переводы адаптируются, а не переводятся слово в слово; термины по
   `scripts/sailing-glossary.md`. Фигурные кавычки, символ многоточия и прочую
   типографскую юникод-пунктуацию не используем. Курс sternik motorowodny только
   на польском, в формулировках официальных материалов, его не адаптируем. Курс
   по радио (SRC): решение владельца 2026-10-24, это международный стандарт, его
   можно переводить на все 7 языков. Тренажер рации (`/radio/symulator`:
   сценарии, подсказки, разбор, Rozbiór, интерфейс) уже на 7 языках, радиофразы
   остаются английскими, акватории случайные (`src/app/radio/symulator/venues.ts`,
   только проверенные станции и каналы). Теория, шпаргалка, уроки Obsługa,
   живой разговор и банк 324 вопросов UKE адаптированы на все 7 языков.
   Исходная польская формулировка доступна отдельно. Английские фразы и
   варианты языковых упражнений сохраняются точно. Карта: `docs/radio-i18n.md`. Исключение техническое: текст, который рисуется в OG-картинках
   (`src/app/api/og/*`), остается без диакритики, у встроенного шрифта может не
   быть глифов.
3. **`src/app/simulator/*` - это Основы (внутреннее имя V1), основной
   продакшен-тренажер.** Не рефакторить и не "улучшать" из лейнов V2/V3. Правки
   только в Shared-лейне и только изолированные, без переписывания физики.
4. **i18n-плумбинг** (`src/lib/i18n.tsx`, языковая часть `src/proxy.ts`,
   `generateMetadata` в `src/app/layout.tsx`) принадлежит Shared-лейну. Им
   пользуются, его не перепроектируют.
5. **Контентные маршруты** (`/game`, `/multiplayer`, `/rules`, `/onboard`,
   `/start`, `/checklist`, `/anatomy`, `/courses`, `/racing`, `/glossary`,
   `/gallery`, `/leaderboard`) и `src/components/Navigation.tsx` принадлежат
   Shared-лейну.
6. **CI и деплой** (GitHub Actions, nginx, Docker, `ops/deploy/*`, окружение
   на VPS) принадлежат Shared-лейну.
7. **CSP.** Конфиг реверс-прокси разрешает практически только свой origin
   (плюс GA и YouTube-фреймы). Любой внешний ассет в проде блокируется: это уже
   стоило инцидента "page couldn't load" (Drei `<Environment preset="sunset">`
   тянул HDR со сторонего домена). Новый внешний домен - только правкой
   конфига на хосте и перезагрузкой nginx, не правкой кода.
8. **Константы движка** (`src/lib/sailing-physics/*`) не трогать без нового ADR
   в `DECISIONS.md`. Числа там выстраданы, обоснование в ADR-0001.
9. **Имена V1 / V2 / V3 - внутренние кодовые имена маршрутов.** В UI они не
   появляются. Источник истины по модели - `docs/design/SIMULATORS.md`.
10. **Секреты** не попадают ни в код, ни в `AGENTS.md`, `ARCHITECTURE.md`,
    `CHANGELOG.md`, ни в любой документ репозитория. Только имена переменных.
11. **UI-инварианты** (`DESIGN.md`): ширина веб-контента 1080px, горизонтальный
    отступ на мобиле 20px, текст 16px с интерлиньяжем около 24px, основная
    тач-цель минимум 44px, ни один ключевой ярлык не обрезается. Циан означает
    только действие, выбранный раздел или активный контрол. Новой декоративной
    анимации не добавляем. На Home одно основное действие. Нативный нижний бар
    скрывается при управлении лодкой, гонке, реплее и экзамене.

### Как правило типографики применяется

- Хук: `.githooks/pre-commit` блокирует коммит с em/en-dash. Включается один раз
  на клон: `git config core.hooksPath .githooks`. Хук проверяет staged-содержимое
  (`git show :path`), а не рабочее дерево, то есть ровно то, что уходит в
  коммит, и печатает `file:line` с типом тире. Файлы со старыми тире не
  флагаются, пока их не пересоберут в индекс.
- CI: `npm run check:dash` (`scripts/check-no-dash.mjs`) проходит по всему
  репозиторию: `src`, `docs`, `scripts`, `mobile`, `ws-server`, `e2e`, `ops`,
  `.github`, `.githooks` и корневые документы (`node_modules` и сборки пропускает).

## Код-стайл

- TypeScript strict. `npx tsc --noEmit` должно оставаться чистым перед каждым
  коммитом, `npm run build` - перед каждым пушем.
- Клиентские компоненты начинаются с `'use client';`.
- Держим CSS-переменные темной океанской темы (`--accent-cyan`,
  `--bg-primary` и остальные) из `src/app/globals.css`; светлая тема
  переопределяет те же токены.
- Для новых строк UI - `tl({...})`, см. раздел i18n. Новых вызовов `t(ru, en)`
  не добавляем.
- Данные и контент живут в `src/data/*`, а не в компонентах: один источник
  истины для веба и мобильного.

## Как запускать

```
npm install
npm run dev                  # http://localhost:3000
npm run dev -- --port 3007   # другой порт (нужно для ворктри и сканеров)
```

- Локальная админка: `/stats` закрыта basic-auth и без переменной
  `ADMIN_PASSWORD` отдает 503 (фолбэка в коде нет). Для локальной разработки
  задайте `ADMIN_PASSWORD` в `.env.local` любым значением.
- Ворктри: Turbopack не принимает symlink на `node_modules`. Копируйте его из
  основного чекаута через `cp -Rc` и поднимайте превью на своем порту.
- Next 16 в dev иногда пишет шумное `Can't resolve 'tailwindcss'` уровнем выше
  репозитория. Это косметика (tailwind лежит в `node_modules` проекта),
  игнорировать, если `/` не отдает 500.

## Как тестировать

Красное - не мержим. Перед коммитом и перед пушем:

```
npx tsc --noEmit             # должно быть чисто
npm run build                # прод-сборка Turbopack строже dev
npm run test:physics         # общая физика и совместимость серверного движка
npm run test:api             # контракты API-роутов
npm run test:radio           # радиокурс (НЕ покрывает src/app/sternik)
npx vitest run src/app/sternik   # грейдер устного экзамена
npx vitest run               # все веб-юнит-тесты, текущие числа в harness
npm run test:multiplayer     # живой ws-server: жизненный цикл сокетов
npx playwright test          # все browser-сценарии (BASE_URL задает цель)
npm run check:dash           # типографика
npm run check:map            # карта проекта актуальна
```

- CI гоняет весь набор, а не список папок: `.github/workflows/ci.yml` на
  каждый PR и `.github/workflows/deploy.yml` перед сборкой запускают
  `node scripts/build-race-server.mjs --check`, затем `npx vitest run`, плюс
  `npm run test:multiplayer` и `npm run check:map`. Новый тестовый файл где
  угодно в `src` попадает в CI сам.
- Отдельная джоба CI `Foundation browser flow` собирает web, проверяет прежний
  JS-бюджет и запускает `e2e/foundation.spec.ts` на локальной production-сборке.
  Те же сценарии входят в pre-deploy E2E до публикации образов: настоящий квиз,
  черновик/reload, отказ записи/retry и возврат из практики. Это не приемка
  установленного приложения или всей матрицы устройств/языков.
- Pre-deploy E2E также включает курс парусов и shared replay. Проверки используют
  реальные Task controls, изменение длины9m->11m, сохранение/восстановление и
  select камеры; первый настоящий кадр3D остается обязательным.
  двухклиентный multiplayer case получает120s по production report: keyboard
  и положительный WS input прошли, затем60s истекли на геометрии дока.
  Shared3D replay case также получает120s: corrected select/value прошли
  на57.9s, но storage poll встретил прежний60s deadline. Все assertions
  сохранены. Ошибка simulator smoke сохраняется со stack в private synthetic
  CI report, это не изменение product telemetry.
  Non-main workflow_dispatch проверяет candidate без публикации/деплоя.
  Изменение тестов не означает, что следующий browser gate уже пройден.
- Browser Menu inventory counts catalog destinations separately from its always-reachable Diagnostics utility. The utility must keep its localized name, exact route and 44px target during empty search and after clear. DIAL browser checks use the actual LCD label `Volume:` while preserving real SQL and rim motion, lesson completion, release and geometry checks; no timeout increase.
- The Pro smoke case attaches private CI observations before its initial clock check and in finally: bounded pageerror stacks, actual scene-startup/clock/visibility and only the shared parser's canonical diagnostic snapshot. Invalid storage never leaves the browser probe. Both deploy-workflow browser reports upload on success/failure for 14 days, including flaky-success evidence; assertions, trace policy, permissions and main-only release guards stay unchanged.
- Pro canvas visibility and actual first-frame readiness share one 25s startup deadline before the unchanged 15s clock check and 120s case limit. CI runs independent browser cases with one worker; local defaults and each multiplayer case's real concurrent clients stay unchanged. Recorded WebGL2/ReadPixels stalls and heavy-scene overlap justify isolation, but contention as the sole cause is not proven.
- Checkpoint64 adds `e2e/race-navigation.spec.ts` to the same loopback pre-deploy command and finite expected-file guard. It covers actual running Map, wind choices and Helm return; main-only publication, pinned actions, secrets and host authority stay unchanged.
- `npm run test:physics` это не только `src/lib/sailing-physics`: сначала
  `node scripts/build-race-server.mjs --check` (серверная физика сгенерирована
  из TS), затем `sailing-physics`, `src/lib/race-physics.drift.test.ts` и
  `src/lib/race-course.test.ts`.
- Сканер утечек кириллицы: `npm run dev -- --port 3007` и затем
  `node scripts/cyrillic-scan.mjs` - на контентных маршрутах ожидается ноль.
- Мультиплеер нельзя проверить в двух вкладках одного браузера: cookie
  `regatta_sid` одна на браузер. Нужны два браузера или инкогнито.
- Прод-смоук: `curl -I https://weektoregatta.com/`, затем Playwright с
  `BASE_URL=https://weektoregatta.com`.

## Как шипить

- Ветки: `main` - веб-приложение плюс инфраструктура; `app` - это `main` плюс
  работа по мобильному приложению (`mobile/`).
- Деплой только из CI. Push в `main` запускает `.github/workflows/deploy.yml`:
  проверки (типы, типографика, карта, весь `npx vitest run`, сокеты), сборка и
  pre-deploy E2E на раннере, затем неизменяемые образы в GHCR.
  Публикация образов и deploy имеют явное условие refs/heads/main; другой ref
  запускает только проверки. Это не заменяет отдельные правила environment. Джоба деплоя
  (GitHub environment `production`) по SSH stdin отдает принудительной
  команде `regatta-deploy` на VPS commit, два digest образов и одноразовый
  токен GHCR этой джобы (стирается вместе с временной авторизацией Docker
  сразу после `docker pull`; контракт запроса: `ops/deploy/README.md`, "Trust
  boundary"). Root-owned
  `/etc/regatta-deploy/compose.yml` поднимает их с read-only файловой
  системой, без capabilities и с лимитами ресурсов и сам откатывается, если
  health не прошел. Затем smoke по прод-маршрутам и Playwright на проде.
  Устройство, установка и проверки: `ops/deploy/README.md`.
- Корневой `docker-compose.yml` только для локальной разработки (проект
  `regatta-local`). На VPS его не запускать и `docker compose up` из чекаута не
  делать: так пересоздаются захардненные прод-контейнеры без read-only и
  прочих ограничений. Старый чекаут `/opt/repos/regatta` на VPS не источник
  релиза.
- Откат делает администратор, не деплой-аккаунт: образы из
  `/var/lib/regatta-deploy-state/previous.json` поднимаются тем же
  фиксированным compose-файлом (`ops/deploy/README.md`, "Verification and
  rollback").
- nginx это отдельный общий контейнер (`/opt/repos/nginx_server/conf.d/` на
  хосте). Файл `regatta.nginx.conf` в репозитории только справочная копия и
  деплоем НЕ применяется: администратор правит host-файл, затем
  `docker exec nginx_server nginx -t` и
  `docker exec nginx_server nginx -s reload`.
- Проверка после деплоя: `curl -I https://weektoregatta.com/`, живой
  `/stats` под auth, сканер кириллицы.
- Эксплуатационные рецепты (логи, база, бэкап, восстановление) - в
  `ARCHITECTURE.md` раздел 6 и `docs/OPS.md`.

### Релиз мобильного приложения (обязательный гейт)

Перед ЛЮБОЙ отправкой в App Store пройти гейт из
`docs/design/mobile/RELEASE_CHECKLIST.md`. Ни один пункт не может быть красным.
По порядку:

- G1: переводы полные - `node mobile/scripts/i18n-audit.mjs` (скрипт лежит в
  `mobile/scripts/`, не в корневом `scripts/`).
- G2: сборка плюс визуальная проверка на iOS-симуляторе (бумажные экраны и
  темные экраны приборов; системной смены темы в приложении нет), запуск релизной
  сборки с чистой установки на самой новой iOS и установка поверх версии из
  магазина с сохранением прогресса.
- G3: Codemagic `cancel_previous_submissions` плюс строго растущий номер сборки.
- G4: `fastlane precheck` - ноль ошибок метаданных (именно это раньше давало
  отказы по метаданным; lane не проверяет покупки внутри приложения).
- G5: только после этого submit.

## Где что искать

| Что нужно | Файл или каталог | Маршрут |
|---|---|---|
| Глоссарий, курсы относительно ветра, маневры, правила, стратегии | `src/data/sailing-data.ts` | `/glossary`, `/courses`, `/racing` |
| Сценарии правил и расхождения (21 карточка) | `src/data/rules.ts` | `/rules` |
| Устройство яхты (части и подписи) | `src/data/anatomy.ts` | `/anatomy` |
| Буткемп из 8 уроков | `src/data/bootcamp.ts` | `/start` |
| Первая неделя на борту | `src/data/onboard.ts` | `/onboard` |
| Чек-лист перед выходом | `src/data/checklist.ts` | `/checklist` |
| Миссии гонки | `src/data/missions.ts` | `/game` |
| Акватории регат (берег и острова вокруг гонки и на горизонте 3D) | `src/data/venues/` | `/game`, `/multiplayer`, `/simulator2` |
| 3D-вид гонки (та же гонка с лодки, ADR-0006) | `src/features/race-3d/` | `/game` (переключатель 2D/3D), в приложении `/race-3d` |
| Каталог упражнений тренажера | `src/data/drills.ts` | `/simulator-v3` |
| Галерея | `src/data/gallery.ts`, `src/data/gallery-2026.generated.ts` | `/gallery` |
| Банк вопросов SRC (324, UKE) | `src/data/src-radio.ts` | `/radio` |
| Практика на рации SRC: список Практики и рабочий экран с закрепленной рацией (симулятор, уроки Obsługa, живой разговор) | `src/app/radio/symulator/RadioWorkspace.tsx`, `src/app/radio/symulator/practiceMenu.ts` | `/radio/symulator`, `/radio/obsluga?kurs=1`, `/radio/rozmowa` |
| Банк вопросов sternik (879) | `src/data/sternik.ts` | `/sternik` |
| Уроки работы с парусами | `src/data/sailing-lab/course.ts` и соседние | `/learn/sails` |
| Информационная архитектура (5 разделов, подписи, маршруты) | `src/lib/product/catalog.ts` | все хабы |
| Физика скорости яхты (VPP) | `src/lib/sailing-physics/*` | все тренажеры |
| Язык и переводы | `src/lib/i18n.tsx`, `src/lib/languages.ts` | все |
| Аналитика и БД | `src/lib/db.ts`, `src/app/api/log/route.ts` | `/stats` |

Полная карта кода, файл за файлом, - `ARCHITECTURE.md` раздел 4.

### Курс sternik: правила контента

- Банк: `src/data/sternik.ts`, 879 вопросов, экзамен 75 вопросов / 90 минут /
  порог 65 правильных.
- **Id вопросов стабильны, перенумеровывать нельзя** (на них висит прогресс
  пользователей и разбор ошибок).
- Язык курса только польский (`src/app/sternik/plOnly.ts`), текст как в
  официальных материалах; языковая адаптация его не трогает.
- Юридические факты сверены с Dz.U. 2026 poz. 604, источники и материалы -
  `docs/sternik-materials/SOURCES.md`.

### Общие движки

- `src/lib/sailing-physics/*` - один VPP-движок на все: Основы, Тренажер, Лодка
  3D, общая сессия `src/features/sailing-lab/runtime/session.ts` и мобильное
  приложение (алиас `@regatta/physics`). От него зависят несколько лейнов, так
  что изменения согласуются; форк движка в `mobile/` запрещен и проверяется в CI.
- Серверная физика мультиплеера `ws-server/race-physics.js` генерируется из
  TS-исходников: `node scripts/build-race-server.mjs`, проверка `--check`.
- Гейт: `npm run test:physics`.

### Тренажеры

| Поверхность | Маршрут | Имя в UI | Роль |
|---|---|---|---|
| V1 | `/simulator` | Основы | основной продакшен-тренажер, canvas |
| V3 | `/simulator-v3` | Тренажер трима | живая физика, трим, упражнения |
| V2 | `/simulator2` | Лодка 3D | осмотр формы парусов, R3F и GLB, не гоночная поверхность |

Источник истины по модели и названиям - `docs/design/SIMULATORS.md`.

## i18n

- 7 языков: RU (источник), EN, PL, ES, FR, DE, IT.
- Приоритет языка (`src/lib/i18n.tsx`): `?lang=` в URL > localStorage > cookie
  (для SSR) > Accept-Language > RU.
- Короткие ссылки для шеринга: `/pl`, `/en`, `/ru`, `/es`, `/fr`, `/de`, `/it`
  редиректят на `/` и закрепляют cookie.
- Серверный конвейер: `src/proxy.ts` пишет cookie `regatta_lang`,
  `src/app/layout.tsx` читает ее для `<html lang>` и `generateMetadata`. Эту
  цепочку не ломать.
- Хелперы: для нового кода `tl({ru, en, pl, es, fr, de, it})`; `tp(ru, en, pl,
  {...})` - безопасный путь апгрейда существующих вызовов; `t(ru, en)` - legacy,
  новых вызовов не добавлять.
- Данные: строки в файлах данных лежат как `fieldRu/En/Pl` (обязательные) плюс
  `fieldEs/Fr/De/It` (опциональные), тип `LegacyLocalized`, чтение через
  `legacyPick(obj, 'field', lang)`.
- Массовый перевод: `ANTHROPIC_API_KEY=... node scripts/translate-data-flat.mjs
  --file <path> --lang es,fr,de,it`.
- Сканер утечек: `node scripts/cyrillic-scan.mjs` (ожидается ноль на контентных
  маршрутах). Статус по маршрутам: `docs/I18N_AUDIT.md`.
- Исключение: подписи на `/courses` по-русски намеренно, это конвенция бумажных
  диаграмм ветра, а не баг i18n.

## Аналитика и приватность

- Все записи событий идут через `insertEvent()` в `src/lib/db.ts`. Поля события
  включают `country`, `device_model`, `ms_since_start`, `utm_source/medium/
  campaign`, `referrer`, `device`, `viewport`, `language`.
- Страна определяется в `/api/log` по заголовкам `cf-ipcountry`,
  `x-vercel-ip-country`, `x-country-code`. Одноразовая настройка nginx geoip2
  описана в `docs/OPS.md` (`scripts/setup-nginx-geoip2.sh`).
- IP усекается на входе (`src/lib/net.ts`): последний октет IPv4 в ноль, IPv6 до
  первых трех хекстетов. Полные IP не хранятся и не попадают в `/stats`.
- В `meta` сохраняется только allow-list полей с лимитом 4 КБ, а не сырое тело
  запроса.
- `/api/race-result` ограничен 60 запросами в час на сессию и проверяет границы
  значений (защита от отравления лидерборда).
- Лимиты API и дневной потолок ИИ (100 в сутки) считаются и по сессии, и по IP
  (`clientKeys()` в `src/lib/rate-limit.ts`): `regatta_sid` выбирает клиент,
  поэтому одной cookie мало. IP берется из последнего хопа X-Forwarded-For: на
  vps2 SNI-роутер передает адрес клиента через PROXY protocol (проверено
  2026-10-18). Первый хоп подделывается клиентом, для лимитов его не брать.
- Basic-auth на `/stats` и `/api/admin/*` сравнивает значения за константное
  время; без `ADMIN_PASSWORD` отдает 503. Проверку делает и прокси, и сам
  хендлер (`requireAdmin()` из `src/lib/admin-auth.ts`): новый админ-роут без
  этого вызова не мержим.
- Серверные события: `race.finish`, `coach.requested`. Клиентские из
  `src/components/ClientErrorReporter.tsx`: `page.view`, `page.engaged`,
  `js.uncaught`, `js.rejection`; воронка из `src/lib/funnel.ts`:
  `exam.start`, `exam.finish`, `lesson.complete`, `radio.task.complete`,
  `app_store.click`. `/api/log` пишет только имена из
  `src/lib/analytics-events.ts` и только проверенные поля; новое событие
  сначала добавляется туда (с тестом), иначе оно молча пропадает.
- `page.view` несет `embed` и `client` (`app` внутри iOS-приложения, `web` в
  браузере). Ссылки на App Store строятся через `appStoreUrl(ct)` с меткой
  места (`web_home`), без нее источник установки не виден.
- Сырые `events` и `sessions` хранятся 180 дней (`scripts/prune-events.mjs`,
  сначала `--dry-run`, см. `docs/OPS.md`); окно `/stats` не шире 90 дней.
- GA4 поток `G-ZEWWJ4N31M` в `src/components/GoogleAnalytics.tsx`.

## Окружение

Значения не хранятся в репозитории. На VPS прод читает
`/etc/regatta-deploy/runtime.env` (root, 0600, см. `ops/deploy/README.md`), а
не `.env` в чекауте; локально - `.env.local` (в `.gitignore`).

| Переменная | Зачем | Где живет |
|---|---|---|
| `ADMIN_PASSWORD` | basic-auth для `/stats` и `/api/admin/*`, без нее 503 | VPS, локально `.env.local` |
| `OPENAI_API_KEY` | ИИ-коуч (`/api/coach`), чаты (`/api/ai-chat`, `/api/sternik-chat`), STT и TTS радиокурса | VPS (локальный ключ мертв, предгенерация идет через прод) |
| `OPENAI_MODEL` | модель коуча и чатов (по умолчанию `gpt-5-mini`) | опционально |
| `OPENAI_TTS_MODEL`, `OPENAI_TTS_VOICE`, `OPENAI_STT_MODEL` | параметры голоса и распознавания | опционально |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | только скрипты перевода (`scripts/translate-data.mjs`, `scripts/translate-data-flat.mjs`), приложение их не читает | локально при переводах |
| `REGATTA_DB_DIR` | каталог SQLite, в контейнере `/data` | `ops/deploy/compose.yml` (локально `docker-compose.yml`) |
| `NEXT_INTERNAL_URL` | адрес приложения для ws-server | `ops/deploy/compose.yml` (локально `docker-compose.yml`) |
| `PORT` | порт приложения (3000) и ws-server (3001) в контейнере | `ops/deploy/compose.yml` (локально `docker-compose.yml`) |
| `NEXT_PUBLIC_WS_URL`, `WS_URL` | адрес WebSocket для клиента и тестов | сборка и локально |
| `NEXT_PUBLIC_SW_VERSION` | версия сервис-воркера | сборка |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | уведомления поддержки и статуса релиза | VPS и `ops/notify` |
| `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_PATH`, `ASC_APP_ID` и прочие `ASC_*` | App Store Connect API для релизов | только машина релиза |
| `GOOGLE_SITE_VERIFICATION`, `YANDEX_VERIFICATION` | подтверждение владения сайтом | VPS |
| `SCAN_BASE`, `SHOT_DIR`, `REGATTA_I18N_REPORT`, `PREGEN_*` | параметры служебных скриптов | локально |

## Библиотека документации

| Документ | На что отвечает | Статус |
|---|---|---|
| `AGENTS.md` | точка входа, правила, где что искать | актуален |
| `ARCHITECTURE.md` | карта кода и потоков, инфраструктура | актуален |
| `CHANGELOG.md` | что изменилось, релизы | актуален |
| `DESIGN.md` | продуктовая оболочка, визуальные и навигационные инварианты | актуален (2026-09-08), ссылка на PRODUCT.md мертвая (файла нет) |
| `DECISIONS.md` | ADR, обоснование констант движка | актуален, новые развилки дописывать новым ADR |
| `PATTERNS.md` | каталог повторяющихся провалов P1-P6 и чеклист "дверь" D1-D6 | актуален |
| `README.md` | витрина проекта, внешние источники правил | в основном актуален, числа (глоссарий 64) устарели |
| `docs/TECH.md` | краткий обзор стека, деплоя, i18n, погоды, ветвления | актуален |
| `docs/OPS.md` | эксплуатация VPS, geoip2, бэкапы и восстановление базы | актуален; деплой и откат - `ops/deploy/README.md` |
| `ops/deploy/README.md` | confined-деплой: принудительная команда, root-owned compose, откат | источник истины по деплою |
| `docs/I18N_AUDIT.md` | покрытие маршрутов языками | поддерживать при изменении покрытия |
| `docs/design/SIMULATORS.md` | двухтиерная модель тренажеров и названия | источник истины |
| `docs/design/simulator-v3/*` | спека, контракты поведения, QA Тренажера | актуально для лейна V3 |
| `docs/design/mobile/*` | мобильная архитектура, решения, гейт релиза | актуально для мобильного лейна |
| `docs/design/books-audit-2026-09-26.md` | бэклог обучающего контента из трех книг (Дедекам, "Маневры под парусами", RYA Day Skipper), проверенная матрица трима, числа и допуски | актуален, спека для контентных задач; сделанное помечать в `CHANGELOG.md` |
| `docs/audits/2026-10-18-aso-and-code-audit.md` | ASO-анализ и карточка App Store, аудит безопасности, данных и инженерии, открытый бэклог | актуален на 2026-10-18 |
| `docs/audits/2026-10-19-full-review.md` | полное ревью 2026-10-19 (код, безопасность, долг, тесты, данные, язык, ASO, доступность, приватность): 85 подтвержденных пунктов, что исправлено в PR #62, что за владельцем | актуален на 2026-10-19 |
| `docs/audits/2026-10-22-game-audit.md` | аудит игры под углом «как настоящая игра»: графика 3D, физика ощущений, HUD, меню, нативная гонка, звук, инструменты (Unity не нужен), план по визуалу и UI/UX в три этапа, решения за владельцем | актуален на 2026-10-22, сделанное помечать в `CHANGELOG.md` |
| `docs/design/game-graphics-concept.md` | концепция графики и движка гонки: одна гонка и одна three.js-сцена для сайта и приложения, WebGPU/TSL с откатом на WebGL2, стиль «чистая стилизация» с тактической камерой, сравнение движков (Unity, Godot, Filament, нативный WebGPU), бюджет FPS, план с вертикальным срезом; снимки в `docs/design/game-graphics/` | принята владельцем 2026-10-24 (ADR-0008), источник истины по графике гонки; в работе вертикальный срез `?scene=next` |
| `docs/design/trainer-controls-concept.md` | концепция управления тренажерами: закрепленная лодка и док, лента ползунков, режим штурвалов, названия шкотов в 7 языках, фазы и вопросы владельцу; прототип и макеты в `docs/design/trainer-controls/` | согласована и реализована 2026-10-19 (раздел «Что сделано»), источник истины по управлению тренажерами |
| `TECH.md` (корневой) | старая карта кода и инфраструктуры | исторический снимок, не руководство по эксплуатации (баннер в начале); заменен `ARCHITECTURE.md`, адреса хостов и числа неверны |
| `FEATURES.md` | инвентарь фич на 2026-07 | исторический снимок, не руководство по эксплуатации; см. `ARCHITECTURE.md` раздел 10 |
| `AUDIT.md` | аудит состояния на 2026-06 | исторический снимок, не руководство по эксплуатации |
| `ROADMAP.md` | фазы 0-4 | исторический снимок, долг перенесен в `CHANGELOG.md` |
| `MEMORY.md` | датированные решения "почему X, а не Y" | исторический снимок, ключевое перенесено в `ARCHITECTURE.md` раздел 7 |
| `STRESS-REPORT.md` | базовая линия мультиплеера | актуален как базовая линия |
| `docs/design/simulator2/ROADMAP.md` | план гоночной сборки V2 | отменен, актуален только бэклог 3D-визуала |

Если документ говорит одно, а код другое - прав код, и расхождение фиксируется
в `ARCHITECTURE.md` раздел 10.

## Границы продукта

Сознательно не делаем (чтобы не "добавлять" уже отклоненное):

- Нет аккаунтов и логина: ник живет в localStorage, логин-стена теряет
  большинство первых визитов.
- Нет платежей и платного тарифа.
- Нет лицензирования бренда лодки: движок описывает абстрактный двухпарусный
  крейсер, Bavaria 46 остается только анатомическим референсом.
- Нет физики уровня ORC и CFD: минимально достаточный реализм, чтобы показать
  причинную цепочку.
- Нет динамики руля и рыскания.
- Нет спинакера, Code 0 и генакера: двухпарусный риг.
- Нет приливов и волн в модели хода (течение добавлено отдельно и аддитивно).
- Нет 3D-заглушки Kenney в анатомии: удалена, потому что это была не та лодка с
  хотспотами не на тех местах.

## Правила работы

Из `ROADMAP.md` (operating rules) и `PATTERNS.md` (дверь D1-D6):

1. Одна фаза в работе одновременно: не совмещаем переделку физики и UI.
2. Каждая фаза заканчивается деплоем и проверкой в браузере.
3. Каждая развилка получает новый ADR в `DECISIONS.md`.
4. Устаревший документ - это провал, его переписывает та же работа, которая его
   обесценила, в том же коммите.
5. D1: прежде чем сказать "готово", сформулируй поведенческий контракт одной
   фразой и убедись, что есть тест, который упал бы при его нарушении. Для
   физики - посмотри, как числа двигаются на трех разных входах.
6. D2: не полируй UI во время физической задачи. Тяга к цветам при сложной
   физике - это уход от задачи.
7. D3: перед коммитом прогони проверку на тире, сборку и `git diff --stat`.
8. D4: обнови документ, который стал ложным, в том же коммите.
9. D5: проверь UI в браузере на затронутом маршруте, включая мобильный вьюпорт.
10. D6: если спросили нумерованные вопросы, ответь по номерам в первом абзаце.
11. Застрял - назови блок одной фразой (что пробовал, что дальше), не имитируй
    прогресс правкой несвязанного кода.

Разбор самих провалов P1-P6 - в `PATTERNS.md`, туда добавляют паттерн только
после двух подтверждений.

## Правило поддержки карты

`AGENTS.md`, `ARCHITECTURE.md` и `CHANGELOG.md` - единственная карта, которой
доверяет следующий агент. Поэтому:

1. В том же коммите, что и изменение: если файл появился, переехал или удален -
   поправь карту кода в `ARCHITECTURE.md` (одна строка на файл). Если изменился
   поток, шаг деплоя, хост или правило - поправь соответствующий раздел.
2. Любое изменение, видимое пользователю или эксплуатации, получает строку в
   `## Unreleased` в `CHANGELOG.md` простым языком.
3. Гейт: `npm run check:map` (`scripts/check-project-map.mjs`) проверяет, что
   `CLAUDE.md` импортирует `AGENTS.md`, что все упомянутые пути существуют, что
   у каждого файла из `src`, `scripts`, `ws-server`, `ops`, `e2e` и корневых
   конфигов есть строка в карте, и что в карту не утек секрет. Он же стоит в CI
   шагом "Project map is current".
4. Значения секретов в эти три файла не попадают никогда: только имена
   переменных.
5. Если утверждение документа расходится с кодом, прав код: правь документ и
   отмечай расхождение в `ARCHITECTURE.md` раздел 10.

## Параллельные лейны

Четыре чата работают по репозиторию параллельно, по одному на лейн. Определите
свой лейн из задачи и оставайтесь в нем.

### Лейн V3 (Тренажер трима)

- Владеет: `src/app/simulator-v3/*`, `src/features/simulator-v3/*`,
  `docs/design/simulator-v3/*`.
- Может читать: `src/lib/sailing-physics/*`, глоссарий, файлы данных.
- Не правит: i18n-систему, `src/app/simulator/*`, `src/app/simulator2/*`,
  мобильное приложение.
- Работает по `docs/design/simulator-v3/PIPELINE.md` и
  `docs/design/simulator-v3/BACKLOG.md`, QA по
  `docs/design/simulator-v3/QA_CHECKLIST.md`, контракты в
  `docs/design/simulator-v3/BEHAVIORAL_CONTRACTS.md`.

### Лейн V2 (Лодка 3D, `/simulator2`)

- Владеет: `src/app/simulator2/*`, `src/features/simulator-3d/*`,
  `docs/design/simulator2/*`.
- Может читать: `src/lib/sailing-physics/*`, `src/data/sailing-data.ts`.
- Не правит: i18n-систему, `src/app/simulator/*`, `src/app/simulator-v3/*`,
  `src/features/simulator-v3/*`, мобильное приложение, общие контентные
  маршруты.
- Роль и названия: `docs/design/SIMULATORS.md`. Старая гоночная сборка
  simulator-v2 удалена 2026-07-05 (`be43938`).

### Shared-лейн (веб, i18n, контент, CI)

- i18n-фиксы, документация, контент (`/rules`, `/onboard`, `/start`,
  `/checklist`), HUD гонки, навигация, мелкие багфиксы по веб-приложению,
  API-роуты (`src/app/api/*`).
- Владеет: `src/proxy.ts`, `src/lib/i18n.tsx`, `src/app/layout.tsx`,
  `src/components/Navigation.tsx`, все контентные маршруты, конфигурация CI и
  деплоя.
- Верификация: прод-смоук, сканер кириллицы, `/stats` под auth.

### Мобильный лейн

- Владеет: `docs/design/mobile/*` и `mobile/*`.
- Может читать (и позже вынести в общий пакет): `src/data/*`,
  `src/lib/sailing-physics/*`, ключи и переводы i18n, схемы HTTP API
  (`/api/coach`, `/api/log`, `/api/feedback`, `/api/leaderboard`).
- Обязан ходить в существующий веб-API, своего бэкенда у мобильного нет.
- Не правит код веб-маршрутов (`src/app/*`), i18n-плумбинг, тренажеры V1/V2/V3,
  nginx / docker / CI веба.
- Решения, которые дублируют или меняют общие ассеты (контент, физика, i18n),
  оформляются ADR в `docs/design/mobile/DECISIONS.md`. Прежде чем что-то
  дублировать, вернитесь в Shared-лейн и спланируйте вынос общего пакета.
- Верификация: `cd mobile && npm run check` (синхронность контента, lint,
  typecheck, тесты) плюс гейт релиза выше.

### Общие файлы: спросить или не трогать

Перед правкой проверьте `git log` этих файлов; если неясно - согласуйте в
Shared-лейне:

- `src/lib/sailing-physics/*` (от движка зависят V2, V3 и мобильное)
- `src/proxy.ts`, `src/lib/i18n.tsx`, `src/app/layout.tsx`,
  `src/components/Navigation.tsx` (Shared-лейн)
- `AGENTS.md`, `CLAUDE.md`, `ARCHITECTURE.md`, `CHANGELOG.md` (любой лейн, но
  через коммит-согласование)
- `docs/TECH.md`, `docs/I18N_AUDIT.md`, `README.md`

### Этикет коммитов

- Перед началом значимой работы: `git fetch origin`, `git status`,
  `git log --oneline -10`. Если `main` ушел вперед - `git pull --rebase origin main`.
- Коммитить только файлы своего лейна: `git add <конкретные файлы>`, не
  `git add -A`.
- Push в `main` напрямую допустим, если файлы изолированы.
- Большой рефакторинг - через ветку (`feature/...`), потом `git merge --no-ff`.
- Никогда `push --force` в `main`. Никогда `git reset --hard` без
  предупреждения других лейнов.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` - verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
