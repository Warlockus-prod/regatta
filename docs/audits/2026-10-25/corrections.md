# Повторная приемка после обратной связи владельца

Дата: 2026-10-25, Europe/Warsaw. Этот документ продолжает утвержденный harness 24 октября. Неизменяемая матрица 65 требований на снимке build 60: [plan-recheck.md](plan-recheck.md). Исторические source/delivery доказательства остаются действительными только в своем объеме.

## Текущий статус

Candidate 1.7.0 (61) реализован и проходит повторную приемку. Здесь нет заявления о его доставке. Build 60 действительно доставлен в Self, но весь аудит им не закрыт. Публикация сайта и публичный App Store отдельно от TestFlight.

## Исправленные исходники

- N02/N03/R02/R03: первый пункт Практики открывает саму рацию. У курса и свободной практики разные явные адреса. Из прибора доступны обучение с подсказками, курс и ситуации. Открытие курса из Learn/Home продолжает именно курс.
- N05/N06/N07/N08: ограниченная история SRC с отдельным Back и выходом в приложение; защита незавершенного экзамена. Native exit виден также при чтении данных, ошибке и таймауте. Остальные активности имеют подписанный Back с безопасным hub при входе без истории.
- G02/G03: свободное вращение и масштабирование камеры, как в тренажере; крупный общий fit яхты по умолчанию, сохраненные ракурсы уважаются, есть reset. Жест штурвала не вращает камеру.
- G09: холодная загрузка имеет видимый статус. Отсчет и движение solo ждут первого отправленного кадра сцены; callback прежней гонки не запускает новую. Это не измерение физического GPU/нагрева.
- G13/G14/G15: загруженный native replay возвращается в History; offline результат не обещает global публикацию. Реальный combined multiplayer route освобождает место от пяти нижних tabs и имеет темную оболочку.
- U03/U04/U05/U06: учебная вкладка сохраняет доступ к штурвалам; короткая цель перед реальными метрами гика-шкота, шаг 0.1 м; свободный осмотр формы честно отличается от управления. Старый recovery trainer складывает дополнительные элементы в отдельный dock, без второго руля в wheels.
- U09/U10/U11: touch targets 44 px, короткий viewport оставляет панели локальную прокрутку, одна настройка звука controls/race с legacy migration. Громкость рации остается на приборе.
- V01/V02/V03/V04: одинаковая темная оболочка приборов, Source Sans 3 при успешной загрузке и системный fallback при ошибке. Циан для действий/выбора, нейтральные информационные панели; аппаратные LCD/DISTRESS и учебная подсветка сохранены. Обычный/Pro видны как выбранный режим также вне cockpit. Результат стал обычной прокручиваемой страницей без старого blur overlay.
- Учебная web parity: исходные 19 вопросов, схемы и тексты общие с native; старое completed означает просмотр, не сдачу. Раздельные просмотр/теория/открытие практики, черновик/место/retry. Видимый возврат из immersive practice к известному уроку; native mini-race сохраняет тот же контекст.
- Очистка: исторический review entry /design-v3 не импортирует прототип в release. Его исходники, ассеты, Git history и пользовательский dirty root сохранены. Лимит JS не поднят.

## Свежая UI-проверка

Эти кадры сделаны на установленной Release Simulator 61, до итогового checkpoint. Это доказательство конкретных действий, не всей матрицы языков/устройств.

- [01-radio-free-native.png](checks/01-radio-free-native.png): Home -> Practice -> Radio practice открывает прибор, свободный guide и отдельные Course/Scenarios. LCD/кнопки не перекрыты нижним заданием.
- [02-race-orbit-native.png](checks/02-race-orbit-native.png), [03-race-after-orbit-drag.png](checks/03-race-after-orbit-drag.png): настоящая native гонка Pro, крупная лодка, отдельные штурвалы; жест по сцене меняет ракурс, пауза и часы сохраняются. Это не полный финиш.
- [05-radio-guide-task-completed.png](checks/05-radio-guide-task-completed.png): свободная рация -> обучение -> урок 1, реальное удержание DIAL включает прибор и засчитывает действие, Next доступен; задача не закрывает прибор.
- Web /start: выбраны два правильных ответа, reload восстановил оба, третий ответ и проверка дали 3/3 и 1/8 теоретических проверок. Скриншот [04-foundation-real-check.png](checks/04-foundation-real-check.png) относится к desktop dark dev preview, не ко всем mobile состояниям.

Device Hub иногда показывал предыдущий streaming кадр. Поэтому спорные состояния сверены свежим simctl screenshot установленного приложения. Сам ранний streaming кадр со списком SRC не подтверждает дефект: фактический native кадр показал свободную рацию.

## Проверки исходников и пакетов

- Итоговый полный web suite: 1024 PASS/116 files. Финальный production build и прежний budget gate: 6.46 MB/6.5 MB, largest 0.94 MB/2 MB.
- Общие данные foundation перенесены без изменения 19 вопросов/ID/вариантов/ответов/7 языков/60 SVG outputs; focused content/progress/native compatibility проходят.
- Все три локальных пакета пересобраны: sailing eebd9d783186, radio 8d0af359d405, Sternik c05376f4c523. Нужна итоговая проверка точного source checkpoint перед архивом.
- Нативная Release Simulator 61 собирается. Первый реальный build нашел невидимый TypeScript/Jest дефект Metro: общий SRC navigation находился вне watchFolders. Канонический модуль перенесен в уже наблюдаемый src/lib, web compatibility export сохранен.
- Полный mobile check после исправления двух устаревших ожидаемых ссылок: 435 PASS/68 suites, все три package freshness checks, sync-content, TypeScript, native lint и release-tool tests проходят. Web TypeScript, lint (0 errors,17 прежних warnings), project map и typography проходят.
- Один generated vendor shader template содержит trailing whitespace; его байты не правились вручную. Это замечание git diff --check, не скрытый успешный whitespace result. Пакет проверен сборщиком по точным исходникам.

## Еще не закрытые доказательства

- Итоговая точная сборка 61: холодный start/status/3-2-1, исходное положение, свободная камера, Pro trim/hoist/reef и настройки на short phone/landscape/iPad. Ранние кадры не заменяют итоговую проверку.
- Настоящий вручную доведенный native race -> finish -> durable History -> replay -> coach -> restart, без синтетического race-finished.
- SRC внутренний Back/Stay/repeatedExit/Exit на итоговом binary; остальные ветви Back по 65 пунктам baseline.
- Полная seven-language visual матрица, физические English speech models, реальные GPU/FPS/нагрев, два живых multiplayer UI до finish. Unit/DOM/socket результаты не заменяют эти проверки.
- Итоговые full checks, CI точного commit, проверенные archive/export/upload/ASC processing/Self 61, сайт и public privacy, App Store screenshots/App Review. Ни один upload не равен доступности тестировщику.
- P2 аппаратура EPIRB/SART и будущие экзаменационные варианты остаются отдельным backlog; данный пакет не объявляет все устройства аппаратно смоделированными.

## Повторный UI checkpoint после eda54c9

Ручной маршрут в установленной eda54c9 завершился DNF по 300-секундному ограничению. Паузы, выбор курса, смена галса, свободный обзор сверху и возврат Result -> Menu -> app Race hub сработали. Это не полноценный финиш и не доказательство нового сохраненного результата. [07-native-dnf-result.png](checks/07-native-dnf-result.png) также выявил старую зеленую primary кнопку повтора.

После проверки исправлены два оставшихся UI разрыва: Restart/Resume приведены к cyan, а выделение текста кнопок при касании отключено. Notice в отведенной панели теперь сохраняет фактический и рекомендуемый курс с расстоянием даже при паузе или объяснении правила. Ручное руление и исходная физика сохранены. Новые исходники требуют своей пересборки и проверки.

Первый локальный пакет 61 от eda54c9 прошел generated 18/18, archive 33/33, IPA 35/35, но не загружался в Apple. Он сохраняется как отдельный предыдущий checkpoint; итоговый пакет должен содержать перечисленные UI исправления.

Русская installed-проверка: Settings -> Русский -> Practice -> Radio, весь свободный экран адаптирован ([08](checks/08-radio-russian-native.png)). Переход Course -> native Back вернул тот же прибор ([09](checks/09-radio-internal-back.png)); это проверенный внутренний возврат, не доказательство всех экзаменационных веток.

## Дополнительные подтвержденные пробелы и исправления

Фактический вход свободного трима открывал DEFAULT_UI.top, это не было сохраненной настройкой QA. [10](checks/10-native-trainer-entry.png) показывает плоский вход; [11](checks/11-trainer-reserved-view-panel.png) и [12](checks/12-native-trainer-shared-3d.png) показывают выбор существующего 3D в зарезервированной панели. FREE_TRAINER_UI теперь открывает 3D при свободном входе и сбросе. Учебные presets, упражнения и сохраненный checkpoint сохраняют свою явную камеру. Информационные показатели приведены к нейтральному цвету. Эти три кадра относятся к установленному eda54c9, новые исходники еще требуют повторной установки.

Проверка поворота нашла конкретную причину широкой дуги: гонка проходит8 world units на knot-second, сцена отображает0.6м/unit, то есть4.8м на knot-second. Общий 3D-тренажер проходит0.514444м на knot-second. Визуальное ускорение гонки9.33046x. При6kn responsive-поворот40deg/s имеет радиус68.75world units, или41.25м сцены; тренажер22deg/s дает около8.04м. Угловой поворот гонки быстрее, но видимая дуга примерно5.13x шире. Эти величины вычислены из действующих исходников, не являются замером физической яхты. VPP и масштаб движения в этой поправке не изменяются. Вопрос о компактной трассе с физическим масштабом вынесен владельцу отдельно.

Прежняя рекомендация вокруг60-unit углов не имела памяти галса и восстановления воротец. Детерминированное следование ей тем же error/12 управлением не финишировало за300s. Исправление использует общий stadium planner с отдельной памятью подсказок и радиусом75/lookahead30 для responsive-игрока. Боты сохраняют точные80/40. Водная полоса читает ту же геометрию. Подсказка не меняет позицию, скорость, трим, руль или прогресс игрока.

128 интеграционных прогонов проходят реальные ordered start/mark/finish gates за менее300s: восемь исходных/пропущенных состояний, static и solo shifting wind x0.65/1/1.3, ввод рекомендуемого курса30Hz/10Hz/1s/3s при работающем10Hz advice. Все дают mark+finish; исходная траектория ботов закреплена точными числами. Независимая дифференциальная проверка12 полных гонок совпала на11028 шагах;60 deeply-frozen вызовов не меняют входы. Это математическая проверка доступности маршрута, не ручной native финиш. Новый полный harness и доставка еще не заявлены.

## Короткий экран и переход SRC к теме

На390x844 свободный вход нового sailing449cc0748462 сразу показал3D, море, лодку и отдельные штурвалы: [13](checks/13-free-trim-3d-mobile.png). На320x568 обнаружено перекрытие кнопок ракурса с метриками: [14](checks/14-short-trim-overlap-before.png). Исправление переносит ракурсы в существующую панель Вид; scene не переполняет выделенную высоту, вкладки имеют минимум44px. Это отдельное исправление после математического planner checkpoint.
## SRC topic routing correction

N06/R06: the installed SRC router now carries the theory chapter hash alongside its query and bounded internal history. A question's Review topic link opens its mapped chapter. Selecting another chapter replaces that current theory entry; leaving and using internal Back restores the selected chapter and saved scroll position. If an anchor is not present in the rendered page, navigation returns to the saved or top position instead of retaining an unrelated page's scroll. The regular website keeps its existing browser hash behavior.

Source evidence: `src/lib/radio-navigation.ts`, `src/app/radio/runtimeSearch.ts`, `src/app/radio/teoria/page.tsx`, `mobile/scripts/offline-radio/router.tsx`. Focused navigation coverage includes replace/query/hash/scroll/Back; all 229 radio tests in 18 files pass. TypeScript for web and the offline entry, scoped lint and catalog freshness pass. Catalogs contain 3734 resources and 7391 aliases; the only added catalog value is a technical route event identifier, identical in all seven languages. Learning content, question IDs, answer keys and progress formats are unchanged.

The existing native-bundle E2E recipe now covers Theory -> DSC questions -> Review topic -> DSC chapter, another chapter selection, Practice and the bounded native Back event. This recipe was updated but has not been executed by the SRC source agent. The exact regenerated HTML and installed native chapter/Back acceptance must be recorded separately by the release owner.

## Final3 source и browser checkpoint

1055 web tests/118 files, web TypeScript и lint (0 errors,15 existing warnings) PASS. Полный mobile check:435 tests/68 suites,9 release-tool tests, TypeScript/native lint/content и все пакеты PASS. Production build PASS; unchanged JS budget6.48MB/6.5MB, largest0.94MB/2MB. Live WS contracts4/4 PASS предыдущего exact engine source. Финальные пакеты: sailing3efe0c001bbf, radio11be678647b3, Sternikc05376f4c523.

CUA повторил final sailing в browser320x568,390x844,844x390. Нет page horizontal overflow; canvas320x123,390x399,landscape464x345. На коротком экране [15](checks/15-short-trim-after.png) ракурсы не перекрывают метрики, вкладка Ещё44x44. View открывается в reserved bottom panel, выбор Палуба работает и закрывает панель. Landscape [16](checks/16-trim-landscape.png) оставляет море слева, приборы и штурвалы справа. Итоговый390 [17](checks/17-free-trim-final-mobile.png) подтверждает3D по умолчанию. Это browser проверка installed HTML, не physical touch/FPS acceptance.

## Реальный native finish и сохраненная цепочка

Release Simulator с sailing449cc0748462 вручную проведен через старт, знак и финиш:1:18.3,1/3,coach85/100. [18](checks/18-native-manual-finish.png) показывает подтверждение Гонка сохранена на устройстве. Использовались видимый course slider, реальные подсказки, паузы для чтения и собственный выбранный180deg на заключительном участке. Не вводился synthetic race-finished, позиция/воротца не подменялись. Это Simple, не проверка полного manual Pro finish.

Проверено Result -> inline3D replay -> Back возвращает Result; Result -> native History содержит1:18/85; History -> saved replay открывает3D [19](checks/19-native-saved-replay.png), Back возвращает History; History -> Coach показывает85/100 и ту же гонку; Сыграть еще открывает новую гонку. Сохранение после перезапуска и повторная установка exact final3 еще проверяются отдельно. Математика гонки между449 иfinal3 неизменна; измененияfinal3 касаются компактных ракурсов трима и SRC chapter routing.

## Final4: подтвержденные языковые и межкурсовые исправления

Живой EN экран выявил12 польских заголовков теории/Exam review: props не попадали в прежний lookup. Теперь все12 явно заданы на7 языках,84 catalog-backed проверки PASS. CUA переключил реальный пересобранный HTML через DE/EN/ES/FR/IT/PL/RU: заголовки меняются вместе с языком, горизонтального overflow нет. [20](checks/20-radio-theory-translated.png) показывает исправленный русский экран. Catalog3746/7475, missing0all7. Это не заявление о ручном просмотре каждого из324вопросов.

В shared памяти была польская ошибка Sternik oral, которую SRC показывал с неработающей локальной ссылкой; прежний Reset очищал и чужой курс. Теперь SRC фильтрует собственные области до limit и сбрасывает только их; исходные oral записи сохраняются целиком, unscoped API прежних callers сохранен. Отдельные persistence tests PASS. E2E topic flow исправлен под реальный путь: сначала Exam review, затем Open UKE questions. Root вручную прошел DSC -> вопрос -> ответ -> related theory, выбран именноDSC.

Final4 полный web1062tests/120files, web/native TypeScript и lint, production build и JS6.48MB/6.5MB PASS. Полный native435/68,9release tools, source/content и свежесть трех пакетов PASS. Radio94a299b1fcf4, sailing3efe0c001bbf, Sternikc05376f4c523. Native reinstallation final3 сохранила строки настоящей race-history иbest-times byte-for-byte; вход свободного трима теперь сразу3D. Реальные Back из Trainer, Boat3D и Basics возвращают Practice. Пакетd4 не загружался и сохранен как предыдущий архив, доставка final4 пока не заявляется.

## Доставка61 и следующий stage

Exact37 archive33/33 иIPA35/35, Applevalidate/upload/processingVALID,8notesVERIFIED и независимыйGET15:35:51UTC подтверждаютSelf IN_BETA_TESTING. Отчет `docs/design/mobile/testflight61-2026-10-25.md`; текущаяматрица65пунктов `docs/audits/2026-10-25/acceptance61.md`. FinalnativeSRCStay/repeatedBack/Exit, Promainwheel35->30, Orbitdrag иupgrade26.5с7сохраненнымизначениями подтверждены. Сайт остановлен pre-deploy browsergate:2staleassertions иforegroundclocklimitприRAF>250ms;productionнеизменен. Владелецвыбралphysicalscaleкактренажерикороткие/длинныетрассы:этоотдельный62checkpointпосле61,неизменениеужеотправленногоbinary.


## Urgent SRC startup correction62

Owner feedback fetched read-only from ASC on2026-10-25 contains a build60 screenshot from iPhone18_2/iOS26.6.1: the native error is shown before the radio instrument mounts. Ten screenshot submissions and zero submitted crash reports were available; absence of crash submissions does not prove a successful launch. Raw feedback, contact details and signed image URLs stay outside Git.

Released48/49 store `regatta.radio.offline.lang.v1` inside `regatta.radio.offline.web-storage.v1`. Readers60/61 reject that legitimate retired key, so Retry repeats the same failure without mounting WebView. The exact readers reproduce3/3 failures without rewriting the row. The fix explicitly accepts only this historical key; unknown keys and existing limits remain rejected. All progress strings survive read/bootstrap/save, and Clear all data includes the retired key. The injected app language retains priority. Historical48/49/58 literal-key audit found no other omitted known key. This proves the compatibility defect; the owner's private device row is unavailable, so it is not proof that this was the only cause on that phone.

Startup62 now has one15s deadline from storage through embedded readiness, classified support codes, bounded session-only safe diagnostics and invalidated old callbacks on retry. WK process termination exposes Retry/Exit and disposes local speech through the existing lifecycle. Native tests452/69 pass, with types and scoped lint clean. Actual upgrade48->61->62 and final release gates are recorded in `docs/audits/2026-10-25/release62-harness.md`. Physical short/long courses move to a following checkpoint.


## Verified62 delivery and current remaining work

Native62 frome3d70a1 is now delivered to exact Self, independently checked17:09:17UTC as VALID/IN_BETA_TESTING, with8unchanged beta notes. `docs/design/mobile/testflight62-2026-10-25.md` records the exact binary and actual48->61failure->62 repair, clean27RU and a separate8-value upgrade/Home1of8. Current all65 statuses moved to `docs/audits/2026-10-25/acceptance62.md`; previous matrices remain historical evidence.

Submitted feedback also confirms missing whole-course map, wind direction/speed readout and real island routes. Current venues are scenery; different leg lengths alone do not implement geographic routes. Foundation gutters and cyan information values remain. Fresh62 QA additionally sees narrow SRC status text clip; functional Next/Back does not close that visual issue. `docs/audits/2026-10-25/feedback-triage.md` reconciles these points without copying private images or contacts. Website publication is separately held on its full browser gate; native TestFlight delivery is not a claim of production website or full product acceptance.
