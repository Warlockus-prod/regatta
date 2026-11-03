# App Store 1.7.1 (78): раздел рекламы в магазине

Дата: 2026-11-03. Сборка 78, поезд 1.7.1 (поезд 1.7.0 закрыт выпуском 77
2026-11-02). Исходник `e4bb67ba` в ветке `claude/app-next`.

## Что в сборке

- Все после 77: пакет 12 (слова для новичка), пакет 13 (руль гонки стрелками,
  кнопка поворота, помощник руля, автотрим и пресет «Лучший VMG» в Тренажере,
  «Покажи»), пакет 14 (шаги M5 7-8: призрак длинной гонки, медали не теряются;
  запись метрической гонки по-прежнему выключена), мертвая зона 40° (ADR-0023),
  название «Быстрая онлайн-гонка».
- Раздел рекламы (решение владельца 2026-11-03, Р-36): Настройки > Ads, последний
  пункт Настроек. Только VOX SDK 1 (Hybrid Adtech, `ssp.hybrid.ai`), места из
  сборки 75, каждый запрос с `gdpr=1` без строки согласия: только
  неперсонализированная реклама. VOX SDK 2 / PrebidMobile в бинарник не входит
  (линкуется только с `VOX_PREBID=1` для локальных проверок). IDFA и IDFV не
  читаются, запроса ATT нет.
- Манифест приватности: ProductInteraction (Analytics, ThirdPartyAdvertising) и
  новый OtherDataTypes (ThirdPartyAdvertising), оба не связаны с пользователем и
  без отслеживания; остальные шесть типов без изменений.

## Проверки

- Полный локальный гейт на `98f2b7a4` плюс версия: tsc, check:dash, check:map,
  test:physics, test:api, весь vitest, `npm run build`, `cd mobile && npm run
  check`, test:multiplayer, check:ui на 390 px (0 находок), e2e 69/69
  (smoke, race-navigation, trainer-controls, sailing-learning, replay,
  foundation, одним воркером). JS-бюджет сайта 6,76 МБ при лимите 6,6:
  красный, как и до этой работы (решение за владельцем).
- После правок рекламы и текстов: tsc, mobile typecheck и lint, jest 99/719,
  check:dash, check:map.
- G1: `node mobile/scripts/i18n-audit.mjs` те же 12 известных находок.
- G2: Release-сборка для симулятора (iOS 27.0, свой QA-симулятор
  `3914AAC9`, пути App/Data проверены на этот UUID) поставлена поверх 1.7.0
  (77) без удаления: манифест AsyncStorage после установки совпал байт в байт,
  после запуска 7 из 7 ключей прогресса без изменений, главная «Урок 4 из 8,
  Пройдено 1 из 8». Касания в симуляторе недоступны (доступ к панели не дан),
  поэтому экран рекламы руками не открыт. Вместо этого живой запрос к Hybrid
  SSP тем же GET, что делает SDK: с `gdpr=1` заполняются все 10 мест
  (50 из 60 запросов против 54 из 60 без `gdpr`).
- Бинарник: в IPA есть `ssp.hybrid.ai` и `VOXSDKResources.bundle`, нет
  PrebidMobile; `PrivacyInfo.xcprivacy` с семью типами; в JS-бандле новые
  тексты раздела.
- Архив и экспорт Xcode 27, IPA 31,0 МБ, `altool --validate-app` без ошибок,
  загрузка: Delivery UUID `a11b5235-66e0-4e5c-89c5-016d6daf0ebb`.
- TestFlight: сборка VALID 2026-11-03 08:00 UTC, заметки на 8 языках
  (`mobile/releases/testflight-1.7.1-78.json`) записаны и прочитаны (MATCH).
  Apple не добавила сборку в Self сама; добавлена через API, независимый GET
  08:01:32 UTC: Self 78, 77, 76, 75, 74. Откат 77.
- App Store: версия 1.7.1 создана, «Что нового» на 8 языках
  (`mobile/releases/appstore-1.7.1.json`), описание и промо-текст 8 локалей
  без «без рекламы» (повторная сверка: 0 расхождений), заметки для ревью
  (`mobile/releases/review-notes-1.7.1.txt`, MATCH, 3377 знаков), анкета
  возрастного рейтинга `advertising: true`, сборка 78 прикреплена, выпуск
  AFTER_APPROVAL. G4 `fastlane gate` (precheck) без замечаний.
  `asc-submit.mjs --dry`: все условия выполнены.

## Отправка на ревью

- Политика: по «да» владельца на `main` ушел только `src/app/privacy/page.tsx`
  (`f25d4dbd` поверх `41348ddb`), деплой ручным `deploy.yml` 2026-11-03
  (run 41602279442). Проверка с Mac: weektoregatta.com/privacy и
  regatta.icoffio.com/privacy отдают 200 с Hybrid, VOX SDK и датой
  2026-11-03, `/` 200. Прод-Playwright 109 из 110: упал двухклиентный
  `multiplayer.spec.ts` «create lobby + guest joins by code», тот же тест упал
  и в деплое 2026-10-31 до этой правки.
- Ярлык App Privacy (публичная страница App Store, US): в «Data Not Linked to
  You» есть Third-Party Advertising с Usage Data > Product Interaction. Типа
  Other Data в ярлыке нет, хотя манифест его объявляет (G4b не полностью
  зеленый). Владелец добавляет Other Data с целью Third-Party Advertising (Not
  Linked, Not Used for Tracking) в App Store Connect; ярлык правится отдельно от
  версии, без новой сборки.
- `asc-submit.mjs --version 1.7.1`: reviewSubmission
  `7b9d3cbd-e93d-49cc-b36b-5c8b6315e2ff`, отправлено 2026-11-03 14:51:26 UTC.
  Независимый GET 14:51:37 UTC: 1.7.1 WAITING_FOR_REVIEW. Выпуск
  AFTER_APPROVAL.

## Что осталось

- Other Data в ярлыке App Privacy (владелец, см. выше).
- `app-ads.txt` на weektoregatta.com: нужна строка продавца от Hybrid
  (публичного `sellers.json` у Hybrid нет, в README VOX SDK формат не указан).
  Файл ляжет в `public/app-ads.txt`, на сайте нигде не виден, нужен только
  по адресу https://weektoregatta.com/app-ads.txt (домен Marketing URL);
  станет живым с обновлением сайта.

Адрес политики: владелец сменил en-US на https://weektoregatta.com/privacy,
остальные 7 локалей выровнены через API 2026-11-03 (PATCH
appInfoLocalizations, все 200).
