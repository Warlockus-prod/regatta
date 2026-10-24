# Regatta: аудит веток, релизов и оставшейся работы

Дата: 2026-10-24, Europe/Warsaw. Read-only проверка git, GitHub Actions, PR, App Store Connect API и исходников. Код, ветки, worktrees, удаленный сервер и состояние App Store не изменялись. Это часть общего аудита; интерактивную проверку гонки и полную языковую проверку выполняют параллельные части.

## Самое важное

1. Основной код существенно новее открытого корневого каталога. `origin/main` = `afe567c4597f40cf2888ffd266f1c40db86125c8`, а root `main` = `ecf3c3b7f834b2999ef4b40804402f54d5c0536a`, отставание 107 коммитов. В root 79 измененных/неотслеживаемых записей. Его нельзя принимать за актуальный продукт или бездумно обновлять поверх локальной работы.
2. Основная работа дизайна, обучения и гонок уже сведена в main. `design/v3`, `codex/learning-modules`, `claude/polish-1.7.0`, `claude/release-1.7.0-all`, `release/1.7.0-build49` являются предками актуального main. Их не нужно интегрировать повторно.
3. Последний перевод тренажера рации на 7 языков уже merged в main, но НЕ deployed на сайт: последний pipeline остановился на бюджете JS, 6.84 MB при лимите 6.5 MB. Это объясняет, почему пользователь продолжает видеть польский тренажер на сайте.
4. TestFlight 1.7.0 build 58 существует, VALID и прикреплен к Self. Публичная версия по живому ASC GET: 1.6.4 READY_FOR_SALE; 1.7.0 PREPARE_FOR_SUBMISSION. Ни одна из этих проверок не означает, что 1.7.0 уже выпущена в App Store.
5. Ветка `claude/testflight-radio` по числу коммитов выглядит несведенной (+12/-3), но полный diff деревьев с main содержит ТОЛЬКО `AGENTS.md`, `docs/design/mobile/BUILDS.md`, `mobile/app.json` (57 -> 58). Все ее изменения продуктового кода уже присутствуют в main.

## Источники текущего состояния

| Поверхность | Подтверждено сейчас | Что это не подтверждает |
| --- | --- | --- |
| Git source | `origin/main` afe567c, merged PR #80 | Автоматическую публикацию этого коммита |
| Последний успешный веб-релиз | 4d9b663, PR #79, все 4 jobs, включая prod E2E, зеленые | Ручное отсутствие всех продуктовых багов |
| Последняя попытка веб-релиза | afe567c, PR #80: build/checks job красный, deploy/images/prod E2E skipped | Наличие 7-язычного тренажера на production |
| App Store | Живой ASC API: 1.6.4 READY_FOR_SALE | Наличие учебного дизайна 1.7.0 у публичных пользователей |
| App Store 1.7.0 | Живой ASC API: PREPARE_FOR_SUBMISSION | Отправку на ревью или одобрение |
| TestFlight | Живой ASC API: builds 54-58 VALID и находятся в internal группе Self | Какой build установлен на конкретном телефоне |
| Native build 58 source | `claude/testflight-radio` 5fc445b; журнал описывает радио, офлайн-бандл и скрытие native navigation | Самостоятельную проверку физического iPhone в этом аудите |

Ссылки на проверяемую историю:

- [PR #80: перевод тренажера](https://github.com/Warlockus-prod/regatta/pull/80), merge `afe567c`.
- [Красный deploy #80](https://github.com/Warlockus-prod/regatta/actions/runs/40079199287), ошибка в [Build, checks + pre-deploy E2E](https://github.com/Warlockus-prod/regatta/actions/runs/40079199287/job/120830372193).
- [PR #79: рабочий экран радио](https://github.com/Warlockus-prod/regatta/pull/79), merge `4d9b663`.
- [Успешный deploy #79](https://github.com/Warlockus-prod/regatta/actions/runs/40078969915), [deploy job](https://github.com/Warlockus-prod/regatta/actions/runs/40078969915/job/120829269089), [prod E2E](https://github.com/Warlockus-prod/regatta/actions/runs/40078969915/job/120829433282).

Прямой SSH-аудит фактически работающих контейнеров не выполнялся. Поэтому 4d9b663 здесь назван последним успешным CI-релизом, а не результатом чтения текущего runtime на хосте.

## Что прошел последний main в CI

У `afe567c` прошли TypeScript, типографика, карта проекта, проверка сгенерированной физики сервера, multiplayer socket lifecycle, 871 unit-тест в 80 файлах и production Next build. Затем `check-bundle-size` сообщил:

```
Total static chunks: 6.84 MB (budget 6.5 MB)
Largest single chunk: 0.93 MB (budget 2 MB)
Total files: 104
FAIL: total 6.84 MB > budget 6.5 MB
```

Pre-deploy browser E2E и последующие jobs из-за этого не запускались. У предыдущего `4d9b663` оба браузерных этапа и deployment прошли. Повторно в чистом tracked worktree `wt80` с полным деревом, идентичным origin/main, выполнены `npm run check:map` (PASS: 541 tracked files, 981 quoted paths) и `npm run check:dash` (PASS: no em/en-dash). Дополнительные build/unit-test запуски в этой части аудита не делались; общий аудит запускает независимый набор на изолированном снимке main.

## Инвентарь веток

Полная таблица всех 126 refs: `branch-inventory.csv`. В ней 75 локальных веток и 51 remote branch, исключая символический `origin/HEAD`. Колонки: SHA, дата, ahead/behind относительно зафиксированного main, git-cherry patches, классификация, worktree и грязные записи.

- Локальные: 57 являются предками main, 18 имеют другую историю.
- Remote: 32 являются main/предками main, 19 имеют другую историю.
- Несовпадение истории НЕ означает потерянную реализацию. В проекте много squash merges, cherry-picks и release commits. Поэтому дополнительно проверялись `git cherry`, полный endpoint diff и текущие исходники.
- `app` = ff0b165, историческая ветка от июня, отстает от main на 320 коммитов. Не использовать ее для дальнейшей мобильной работы. Мобильный исходник теперь живет в main.

### Несведенные по истории группы и решение

| Ветки | Фактическое состояние | Дальше |
| --- | --- | --- |
| `claude/testflight-radio` (local + remote) | +12/-3 из-за истории, diff дерева только AGENTS, BUILDS, app.json build 58 | Перенести три актуальные release-записи в main отдельным небольшим изменением |
| `claude/radio-trainer-i18n` local | Полное дерево совпадает с main | Не мержить заново |
| `claude/radio-i18n-rebased` local, `origin/claude/radio-trainer-i18n` | Полное дерево совпадает с main, различаются commit identity | Не мержить заново |
| `claude/keen-khorana-df31d2` local + remote | История рабочего радиоэкрана #79, дополненная в #80 | Продукт уже в main; не возвращать старое дерево |
| `claude/courses-in-theory` local + remote | Git cherry: 2 equivalent patches, 0 unique | Архивная документация и интегрированный код |
| `claude/radio-audio-realism`, `claude/radio-deep-learning`, `claude/radio-live-dialogue`, `claude/radio-ptt-inspect-fix`, `claude/radio-sternik-chat-recovery-526fe1` (local/remote) | Git cherry не находит unique patches | Код интегрирован, повторное сведение не нужно |
| `claude/radio-design-finish` local + remote | Старые hint/печать/сертификат/контраст, работа пришла через squash #35 (1997564), затем менялась | Исторический указатель; не считать отдельным незавершенным продуктом |
| `claude/radio-finish-backlog` local + remote | Offline/oral/position/night, работа пришла через squash #47 (1e8efcf), затем hardening | Исторический указатель, нужные поверхности присутствуют в main |
| `claude/focused-lewin-b0d290`, `claude/intelligent-swirles-97bc76`, `claude/pensive-wing-bacfcb` local | Предварительные API/аналитика/диакритика; поздние версии интегрированы через #58/#59/#60 и #62 | Не мержить прежние снимки поверх исправленных вариантов |
| `feature/mobile-1.4-parity` local + remote | Старое меню и галерея build 23/24; main содержит дальнейшую навигацию v3 | Сравнивать отдельную функцию при необходимости, не возвращать всю ветку |
| `feature/mobile-light-theme` local | Исторический Auto/Light/Dark. В 1.7.0 сознательно приняты светлые paper screens + темные instruments | Не считать отсутствие старого switcher незавершенной задачей |
| `hotfix/1.6.3-ios27` local + remote | Release-specific SHA вне ancestry, но UIScene plugin и 1.6.3 уже в main через e7e87d6 | Не мержить повторно |
| 6 `dependabot/*` remote | Единственные открытые PR #63-#68 | Отдельная очередь зависимостей, не мешать с игровой переделкой |

Локальная `claude/laughing-murdock-32856e` отмечена ahead 135 к своему старому remote, но обе версии являются предками main. Это не потерянные 135 коммитов. Похожие старые tracking labels у branch `design/v3`, `main-fix` и `worktree-wf_*` не означают самостоятельную актуальную линию.

## Worktrees и несохраненная работа

Зарегистрировано 12 worktrees. Машиночитаемая полная запись статусов: `worktree-inventory.json`.

| Worktree | Состояние | Значение |
| --- | --- | --- |
| `/Users/Andrey/App/all/regatta` | root main ecf3c3b, 79 dirty entries | Старый учебный/design slice, локальные графические материалы и docs. Не сбрасывать, не использовать как релизную базу |
| `.claude/worktrees/practical-bassi-54d912` | `codex/learning-modules` 1898973, 8 untracked screenshots | Исходный код уже в main, скриншоты сохранить перед любой уборкой |
| `.claude/worktrees/thirsty-mcclintock-f6b152` | Очень старый a99e9bb, 4 modified source files + 1 untracked audit | Несохраненные game/multiplayer edits требуют отдельного diff-review перед уборкой |
| `.claude/worktrees/keen-khorana-df31d2` | `claude/testflight-radio` 5fc445b, clean | Снимок архивирования build 58, три release metadata differences с main |
| Остальные 8 | Clean, включая temporary radio rebase и внешний deploy-hardening checkout | Архивные/служебные снимки; удаление в этом аудите не выполнялось |

Несохраненные старые edits в `thirsty-mcclintock` могут быть экспериментом или устаревшим исправлением. Сам факт их наличия не подтверждает, что их нужно переносить в актуальную гонку.

## Общая готовность модулей

Статусы ниже отделяют наличие реализации от полного пользовательского QA.

| Модуль | Что уже в main | Что осталось/не подтверждено |
| --- | --- | --- |
| Оболочка v3 | Home, Menu и хабы, общий catalog, светлые native content screens, темные instruments; learning bookmarks | Полный перенос всех исходных HTML экранов никогда не заявлялся. Нужен последовательный UX-аудит хабов и уроков |
| Курс парусов | 13 уроков в 4 модулях, goal/diagram/theory/practice, сохранение шага, возврат из тренажера; 4 отдельно сохраненных результата упражнений | Большинство практик остается наблюдением. Это не проверка навыка на настоящей лодке |
| «С нуля» native | 8 уроков, 3 модуля, SVG схемы, goal/check/practice, сохранение места, quiz evidence, возврат | Web `/start` остается старым экраном со списком и ручной отметкой выполнения. Полного web/native parity этого курса нет |
| Веб-прогресс foundation | `src/app/start/page.tsx`, `src/lib/storage.ts` сохраняют manual completed, Home называет счетчик visited | Связать с evidence-driven model, если решим переносить native foundation UX на сайт; нельзя молча переименовать manual completion в проверенный навык |
| Тренажеры | Основы Canvas, Тренажер трима SVG, Лодка 3D R3F/GLB, общий physics engine, wheels/sliders/settings | Это три разные teaching surfaces. Нужна продуктовая ясность входа в 3D, не повторное создание движка |
| Native offline | Bundled sailing + radio, native fallback, общие исходники physics через alias, CI freshness guards | Публичная 1.6.4 не получает новые bundled HTML от обычного web deployment; новая версия бинарника обязательна |
| Оборудование | Стенд лебедка/стопор, качественная модель load ownership, сценарий завершения, сохранение учебного результата | Не подключен к 3D hardware или полной системе boom/halyard. Управляемая постановка/уборка и hardware pass остаются целевой работой |
| Гонка | Simple/Pro, native offline 2D, отдельная online 3D, акватории, соперники по сложности, HUD, race events, 3D scene slice | 3D slice пока отдельный flag. Выбор основной гонки, перенос настроек/режимов, native 2D/online3D coherence и оставшаяся game roadmap проверяются игровой частью аудита |
| Радио | 324 UKE вопроса, теория, 26 заданий, голос, живой разговор, управление, simulator; simulator теперь 7 языков в source | Полный курс по-прежнему PL/RU. Перевод simulator не deployed на веб. Theory/exam/cheat/Obsługa/live dialogue еще требуют полной адаптации |
| Sternik | 879 вопросов, theory/test/exam/oral, PL-only official course | Отдельный языковой policy от радио. Не расширять перевод автоматически без изменения продуктового решения |
| Правила/библиотека | Rules, tactics, glossary, anatomy, onboard, checklist, gallery, spots/weather; shared content twins | Не все пути прошли новый visual QA. `/rules` payload всех языков был зафиксирован как технический долг |
| Мультиплеер | Authoritative ws-server, реальная web/native shared surface, room limits, lifecycle tests, generated physics guard | Два живых клиента на устройстве и остальные реальные гонки не проверялись в этой части аудита |
| Replay, history, leaderboard | Реализация есть в main, API hardening и лимиты | Retention для сохраненных результатов/реплеев числится отдельным операционным решением; полная UX-проверка не выполнялась здесь |
| AI-помощник/коуч | OpenAI endpoint с лимитами, fallback coach, санитизация racing input, 7 language prompts | Платные вызовы не выполнялись. Карта сайта в system prompt устарела: 15 radio scenarios вместо нынешних 19, старое описание курса и учебных путей |
| Аналитика/данные | Funnel allow-list, bot filtering, IP truncation, retention script, native consent propagation, privacy manifest | Реальные host schedules, очистка исторических данных, PostHog settings и старые owner actions не подтверждены живым ops-аудитом |
| App Store | 1.6.4 публична, 1.7.0 подготовлена, новые builds в Self | Обновить выбранный build, тексты и пройти gate точного release binary перед submission. FPS/debug slice flags пока видимы в 3D entry build 57/58 |

## Какие планы актуальны, а какие вводят в заблуждение

- `docs/design/mobile/ROADMAP.md` начинается состоянием от 2026-05-12 и build 2. Это историческая последовательность, не текущий backlog.
- `docs/design/mobile/CROSS_PLATFORM_PLAN.md` по-прежнему имеет все `[ ]`, утверждает дублирование physics и предлагает R3F-native/packages extraction. ADR-0009 уже убрал дублирование через `@regatta/physics`; ADR-0011 и offline bundle выбрали другую доставку. Этот checklist нельзя исполнять буквально.
- `docs/design/simulator-v3/BACKLOG.md` прямо говорит: PR-1..PR-6 shipped. Его подробные задачи не являются шестью открытыми PR.
- `docs/design/sailing-ux-roadmap-2026-09-21.md` и `learning-modules-2026-10-15.md` содержат верные инженерные ограничения, но их «local only / not published» устарели после #74/build 50. Открытые механические части сохраняются, publication snapshots уже исторические.
- `docs/design/mobile/ARCHITECTURE.md` сверху все еще называет `codex/learning-modules` текущей линией и пишет про последующую адаптацию сайта, хотя #74 уже merged/deployed. Ниже в том же файле есть актуальные notes радио 24.10. Требуется редакционная сверка документа.
- Main `AGENTS.md` и `BUILDS.md` знают только build 57 и пишут next build 58. Реальная сборка 58 уже в Self, актуальная запись только в `claude/testflight-radio`.
- Main `AGENTS.md` в разделе ветвления все еще пишет «app = main плюс mobile», но mobile architecture прямо называет app исторической, и git подтверждает отставание 320 коммитов.
- Main `AGENTS.md` ошибочно называет ссылку DESIGN.md на PRODUCT.md мертвой: `git ls-tree origin/main PRODUCT.md` подтверждает tracked blob `ff5bc893ee8848f18ea7194c9c0ad86b9722e01e`. Сам PRODUCT.md посвящен только радиокурсу, оставляет польский основным и русский дополнительным, поэтому его языковое решение устарело относительно принятого 24.10 перевода SRC на семь языков. Исправить запись библиотеки AGENTS и актуализировать brief, сохранив его радио-область.
- Root AGENTS называет все локальным, не published и с public 1.6.3. Его нельзя применять как описание текущего релиза: это старый checkout.

## Открытая очередь операций и зависимостей

Следующие пункты записаны в `docs/audits/2026-10-19-full-review.md` как owner/ops actions. Это исторически открытые пункты, а не заново подтвержденные инциденты: PostHog GeoIP/IP discard; решение GA4/consent; контактные/юридические реквизиты privacy policy; проверка следов старого admin-password incident; установка и проверка backup/prune schedules; чистка старых тестовых/исторических данных; retention реплеев/отзывов/результатов; GitHub production environment/branch protections/collaborator access. Состояние хоста, GitHub settings и сервисов в этой части не менялось и не проверялось, поэтому закрытыми их считать нельзя.

Текущие открытые PR:

| PR | Изменение | Проверки на момент аудита |
| --- | --- | --- |
| [#63](https://github.com/Warlockus-prod/regatta/pull/63) | Web minor/patch group, 16 updates | Web и mobile CI красные |
| [#64](https://github.com/Warlockus-prod/regatta/pull/64) | better-sqlite3 13.0.3 | Старые CI зеленые; нужна перепроверка после обновления базы main |
| [#65](https://github.com/Warlockus-prod/regatta/pull/65) | Vitest 5.0.5 | Web и mobile CI красные |
| [#66](https://github.com/Warlockus-prod/regatta/pull/66) | upload-artifact 7.0.2 | Старые CI зеленые |
| [#67](https://github.com/Warlockus-prod/regatta/pull/67) | ws 8.22.0 | Старые CI зеленые |
| [#68](https://github.com/Warlockus-prod/regatta/pull/68) | checkout 7.0.1 | Один старый web run красный, другой зеленый; mobile зеленые |

Ни один открытый PR сейчас не скрывает отдельную игровую или радио-функцию. Feature work уже merged, проблема состоит в публикации/доводке/продуктовом связывании.

## Предлагаемый порядок следующей работы

1. Зафиксировать main как базу следующего среза, отдельно сохранить root dirty work и старый game/multiplayer experiment. Обновить только release metadata build 58 и документы состояния, не сливать весь исторический набор веток.
2. Разобрать JS-size regression #80 и вернуть зеленый deployment. Не считать перевод рации доступным на сайте до успешного релиза и проверки на production.
3. Принять один пользовательский вход в гонку: основной 3D experience, осмысленный Simple/Pro и понятная offline behavior. Игровая часть аудита дает точные места и оставшуюся roadmap.
4. Перевести весь международный SRC learning path на каждый выбранный язык, включая theory/exam/help/audio/ошибки/результаты. Английская радиофразеология остается учебным содержанием, а пояснения должны соответствовать языку пользователя.
5. Закрыть web/native foundation parity и обновить карту учебного пути. Не смешивать ручную отметку со сданной проверкой.
6. Выпускной кандидат: убрать диагностические slice flags либо сделать проверенную новую сцену основной; воспроизвести clean install, upgrade с 1.6.4, offline, выбранные языки и все основные переходы на точном binary.
7. После этого решать следующий большой контентный срез: механика оборудования/hoist/lower, 3D hardware, самостоятельная итоговая практика. Старые планы packages/native rewrite сами по себе не цель.

## Полный список refs

Сокращенная сводка CSV; `behind/ahead` относительно afe567c.

| Scope | Branch | SHA | Behind/ahead | Classification |
| --- | --- | --- | --- | --- |
| local | `app` | `ff0b165` | 320/0 | ancestor-of-main |
| local | `claude/analytics-funnel` | `2a88207` | 100/0 | ancestor-of-main |
| local | `claude/api-hardening` | `bba5da3` | 101/0 | ancestor-of-main |
| local | `claude/app-motorowodny-radio-courses` | `e122806` | 192/0 | ancestor-of-main |
| local | `claude/aso-regatta-audit-9b75c5` | `1011c1b` | 102/0 | ancestor-of-main |
| local | `claude/beautiful-pare-18a023` | `21432f4` | 48/0 | ancestor-of-main |
| local | `claude/charming-meitner-e4d0c1` | `cc0c488` | 422/0 | ancestor-of-main |
| local | `claude/courses-in-theory` | `4401e0f` | 175/2 | patch-equivalent-history |
| local | `claude/elastic-lalande-4ae288` | `1f7142e` | 277/0 | ancestor-of-main |
| local | `claude/fix-b1-api` | `4c35c30` | 84/0 | ancestor-of-main |
| local | `claude/fix-b2-analytics` | `dca0d02` | 90/0 | ancestor-of-main |
| local | `claude/fix-b2-analytics-r2` | `1966663` | 88/0 | ancestor-of-main |
| local | `claude/fix-b3-ci-ops-docs` | `340d161` | 88/0 | ancestor-of-main |
| local | `claude/fix-b4-privacy-listing` | `966b386` | 87/0 | ancestor-of-main |
| local | `claude/fix-b5-web-learner` | `85566d3` | 86/0 | ancestor-of-main |
| local | `claude/fix-b6-mobile` | `eaf366c` | 87/0 | ancestor-of-main |
| local | `claude/fix-flaky-smoke-onboarding` | `b652b12` | 204/0 | ancestor-of-main |
| local | `claude/focused-lewin-b0d290` | `1b6c891` | 103/1 | historical-or-reworked-divergence |
| local | `claude/gallant-sanderson-001b6a` | `24113c2` | 282/0 | ancestor-of-main |
| local | `claude/hide-feedback-in-embed` | `e3ae92a` | 190/0 | ancestor-of-main |
| local | `claude/intelligent-swirles-97bc76` | `7968071` | 103/1 | historical-or-reworked-divergence |
| local | `claude/keen-khorana-df31d2` | `e436f2d` | 2/3 | historical-or-reworked-divergence |
| local | `claude/laughing-murdock-32856e` | `0cd715b` | 182/0 | ancestor-of-main |
| local | `claude/missing-sternik-dialog-d92a17` | `6ecfc5f` | 206/0 | ancestor-of-main |
| local | `claude/motorowodny-lang-policy` | `5b6e278` | 194/0 | ancestor-of-main |
| local | `claude/native-wheels` | `fddf030` | 41/0 | ancestor-of-main |
| local | `claude/pensive-wing-bacfcb` | `a1aa16a` | 103/1 | historical-or-reworked-divergence |
| local | `claude/pl-diacritics` | `c79fd8d` | 99/0 | ancestor-of-main |
| local | `claude/polish-1.7.0` | `7103518` | 2/0 | ancestor-of-main |
| local | `claude/privacy-manifest-six` | `be89a13` | 49/0 | ancestor-of-main |
| local | `claude/radio-26-tasks` | `809cf69` | 196/0 | ancestor-of-main |
| local | `claude/radio-audio-realism` | `afce947` | 177/1 | patch-equivalent-history |
| local | `claude/radio-deep-learning` | `f9b0c1b` | 182/2 | patch-equivalent-history |
| local | `claude/radio-design-finish` | `4503cdc` | 184/2 | historical-or-reworked-divergence |
| local | `claude/radio-finish-backlog` | `94ed874` | 171/4 | historical-or-reworked-divergence |
| local | `claude/radio-group-call` | `e40e8ff` | 198/0 | ancestor-of-main |
| local | `claude/radio-i18n-rebased` | `053e645` | 1/1 | same-tree-diverged-history |
| local | `claude/radio-inspect-mode` | `e630142` | 186/0 | ancestor-of-main |
| local | `claude/radio-live-dialogue` | `89a86be` | 172/1 | patch-equivalent-history |
| local | `claude/radio-panel-redesign` | `e630142` | 186/0 | ancestor-of-main |
| local | `claude/radio-ptt-inspect-fix` | `050422e` | 181/1 | patch-equivalent-history |
| local | `claude/radio-receive-scenarios` | `a2981f2` | 200/0 | ancestor-of-main |
| local | `claude/radio-scenarios-batch2` | `b8a1dd8` | 202/0 | ancestor-of-main |
| local | `claude/radio-sternik-chat-recovery-526fe1` | `67da315` | 164/1 | patch-equivalent-history |
| local | `claude/radio-trainer-i18n` | `f5d8741` | 2/7 | same-tree-diverged-history |
| local | `claude/release-1.7.0-all` | `52dc1f3` | 7/0 | ancestor-of-main |
| local | `claude/review-fixes` | `071ad13` | 53/0 | ancestor-of-main |
| local | `claude/review-prompt` | `f2f3400` | 93/0 | ancestor-of-main |
| local | `claude/review-report` | `6188821` | 51/0 | ancestor-of-main |
| local | `claude/river-education-diagrams-e13b8b` | `c3e50bf` | 212/0 | ancestor-of-main |
| local | `claude/sailing-educational-materials-3b2792` | `e7e87d6` | 103/0 | ancestor-of-main |
| local | `claude/silly-lamarr-9f90b1` | `7ca1abf` | 150/0 | ancestor-of-main |
| local | `claude/sleepy-pascal-791adf` | `cc0c488` | 422/0 | ancestor-of-main |
| local | `claude/sternik-exam-prep-site-b1555c` | `1517344` | 234/0 | ancestor-of-main |
| local | `claude/testflight-radio` | `5fc445b` | 3/12 | release-metadata-only |
| local | `claude/thirsty-mcclintock-f6b152` | `a99e9bb` | 431/0 | ancestor-of-main |
| local | `claude/wonderful-cerf-0b2c8c` | `22709b6` | 42/0 | ancestor-of-main |
| local | `codex/learning-modules` | `1898973` | 79/0 | ancestor-of-main |
| local | `design/v3` | `946ca15` | 81/0 | ancestor-of-main |
| local | `feature/mobile-1.4-parity` | `654a23a` | 320/4 | historical-or-reworked-divergence |
| local | `feature/mobile-light-theme` | `aaca981` | 282/1 | historical-or-reworked-divergence |
| local | `hotfix/1.6.3-ios27` | `09889d8` | 110/1 | historical-or-reworked-divergence |
| local | `main` | `ecf3c3b` | 107/0 | ancestor-of-main |
| local | `main-fix` | `b6df513` | 215/0 | ancestor-of-main |
| local | `release/1.7.0-build49` | `84412dd` | 37/0 | ancestor-of-main |
| local | `wip/main-checkout-2026-09-28` | `c7a1047` | 106/0 | ancestor-of-main |
| local | `worktree-wf_5eb9185e-cf0-1` | `b9081e0` | 92/0 | ancestor-of-main |
| local | `worktree-wf_5eb9185e-cf0-12` | `b9081e0` | 92/0 | ancestor-of-main |
| local | `worktree-wf_5eb9185e-cf0-14` | `b9081e0` | 92/0 | ancestor-of-main |
| local | `worktree-wf_5eb9185e-cf0-15` | `b9081e0` | 92/0 | ancestor-of-main |
| local | `worktree-wf_5eb9185e-cf0-2` | `b9081e0` | 92/0 | ancestor-of-main |
| local | `worktree-wf_5eb9185e-cf0-3` | `b9081e0` | 92/0 | ancestor-of-main |
| local | `worktree-wf_5eb9185e-cf0-4` | `b9081e0` | 92/0 | ancestor-of-main |
| local | `worktree-wf_5eb9185e-cf0-5` | `b9081e0` | 92/0 | ancestor-of-main |
| local | `worktree-wf_5eb9185e-cf0-6` | `b9081e0` | 92/0 | ancestor-of-main |
| remote | `origin/app` | `ff0b165` | 320/0 | ancestor-of-main |
| remote | `origin/claude/analytics-funnel` | `68257be` | 98/0 | ancestor-of-main |
| remote | `origin/claude/api-hardening` | `5f2cab7` | 97/0 | ancestor-of-main |
| remote | `origin/claude/app-motorowodny-radio-courses` | `e122806` | 192/0 | ancestor-of-main |
| remote | `origin/claude/aso-regatta-audit-9b75c5` | `bf874e8` | 96/0 | ancestor-of-main |
| remote | `origin/claude/courses-in-theory` | `4401e0f` | 175/2 | patch-equivalent-history |
| remote | `origin/claude/fix-flaky-smoke-onboarding` | `b652b12` | 204/0 | ancestor-of-main |
| remote | `origin/claude/hide-feedback-in-embed` | `e3ae92a` | 190/0 | ancestor-of-main |
| remote | `origin/claude/keen-khorana-df31d2` | `e436f2d` | 2/3 | historical-or-reworked-divergence |
| remote | `origin/claude/laughing-murdock-32856e` | `1e80fb1` | 317/0 | ancestor-of-main |
| remote | `origin/claude/missing-sternik-dialog-d92a17` | `6ecfc5f` | 206/0 | ancestor-of-main |
| remote | `origin/claude/motorowodny-lang-policy` | `5b6e278` | 194/0 | ancestor-of-main |
| remote | `origin/claude/native-wheels` | `fddf030` | 41/0 | ancestor-of-main |
| remote | `origin/claude/pl-diacritics` | `c79fd8d` | 99/0 | ancestor-of-main |
| remote | `origin/claude/polish-1.7.0` | `7103518` | 2/0 | ancestor-of-main |
| remote | `origin/claude/privacy-manifest-six` | `be89a13` | 49/0 | ancestor-of-main |
| remote | `origin/claude/radio-26-tasks` | `809cf69` | 196/0 | ancestor-of-main |
| remote | `origin/claude/radio-audio-realism` | `afce947` | 177/1 | patch-equivalent-history |
| remote | `origin/claude/radio-deep-learning` | `a653a22` | 182/1 | patch-equivalent-history |
| remote | `origin/claude/radio-design-finish` | `4503cdc` | 184/2 | historical-or-reworked-divergence |
| remote | `origin/claude/radio-finish-backlog` | `94ed874` | 171/4 | historical-or-reworked-divergence |
| remote | `origin/claude/radio-group-call` | `e40e8ff` | 198/0 | ancestor-of-main |
| remote | `origin/claude/radio-inspect-mode` | `e630142` | 186/0 | ancestor-of-main |
| remote | `origin/claude/radio-live-dialogue` | `89a86be` | 172/1 | patch-equivalent-history |
| remote | `origin/claude/radio-panel-redesign` | `66c6ced` | 187/0 | ancestor-of-main |
| remote | `origin/claude/radio-ptt-inspect-fix` | `050422e` | 181/1 | patch-equivalent-history |
| remote | `origin/claude/radio-receive-scenarios` | `a2981f2` | 200/0 | ancestor-of-main |
| remote | `origin/claude/radio-scenarios-batch2` | `b8a1dd8` | 202/0 | ancestor-of-main |
| remote | `origin/claude/radio-sternik-chat-recovery-526fe1` | `67da315` | 164/1 | patch-equivalent-history |
| remote | `origin/claude/radio-trainer-i18n` | `053e645` | 1/1 | same-tree-diverged-history |
| remote | `origin/claude/release-1.7.0-all` | `52dc1f3` | 7/0 | ancestor-of-main |
| remote | `origin/claude/review-fixes` | `071ad13` | 53/0 | ancestor-of-main |
| remote | `origin/claude/review-prompt` | `f2f3400` | 93/0 | ancestor-of-main |
| remote | `origin/claude/review-report` | `6188821` | 51/0 | ancestor-of-main |
| remote | `origin/claude/river-education-diagrams-e13b8b` | `c3e50bf` | 212/0 | ancestor-of-main |
| remote | `origin/claude/sailing-educational-materials-3b2792` | `e7e87d6` | 103/0 | ancestor-of-main |
| remote | `origin/claude/sternik-exam-prep-site-b1555c` | `1517344` | 234/0 | ancestor-of-main |
| remote | `origin/claude/testflight-radio` | `5fc445b` | 3/12 | release-metadata-only |
| remote | `origin/claude/wonderful-cerf-0b2c8c` | `22709b6` | 42/0 | ancestor-of-main |
| remote | `origin/dependabot/github_actions/actions/checkout-7.0.1` | `b16e69f` | 52/1 | open-dependency-pr |
| remote | `origin/dependabot/github_actions/actions/upload-artifact-7.0.2` | `80436b0` | 52/1 | open-dependency-pr |
| remote | `origin/dependabot/npm_and_yarn/better-sqlite3-13.0.3` | `8088ffa` | 52/1 | open-dependency-pr |
| remote | `origin/dependabot/npm_and_yarn/vitest-5.0.5` | `ba28d58` | 52/1 | open-dependency-pr |
| remote | `origin/dependabot/npm_and_yarn/web-minor-and-patch-ea05129b7d` | `502ab7f` | 36/1 | open-dependency-pr |
| remote | `origin/dependabot/npm_and_yarn/ws-server/ws-minor-and-patch-f8e16edbe3` | `69d1d29` | 36/1 | open-dependency-pr |
| remote | `origin/design/v3` | `946ca15` | 81/0 | ancestor-of-main |
| remote | `origin/feature/mobile-1.4-parity` | `654a23a` | 320/4 | historical-or-reworked-divergence |
| remote | `origin/hotfix/1.6.3-ios27` | `09889d8` | 110/1 | historical-or-reworked-divergence |
| remote | `origin/main` | `afe567c` | 0/0 | current-main |
| remote | `origin/release/1.7.0-build49` | `84412dd` | 37/0 | ancestor-of-main |
| remote | `origin/wip/main-checkout-2026-09-28` | `c7a1047` | 106/0 | ancestor-of-main |
