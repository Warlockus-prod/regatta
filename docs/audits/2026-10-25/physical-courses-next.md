# Следующий checkpoint: физический solo и выбор длины

Статус: план следующей реализации, 2026-10-25. Решение владельца принято: движение и поворот как в Trainer, короткие и длинные дистанции. Игровой физический adapter пока не подключен. Фаза1 добавляет только общий helper и неактивный registry120/300/600m; playable courses, metadata integration и новые результаты еще не реализованы. Номер следующей сборки определяется отдельно; это не продолжение неизменяемой62.

База runtime: `e3d70a18077b9f30509807f2106076fc476515bd`, TestFlight1.7.0(62). Доставка в exact Self подтверждена независимым GET17:09:17UTC. Доставленные60/61/62, их архивы, пакеты, сохранения и доказательства не меняются. Website publication и App Review имеют собственные открытые gates.

План хранится в репозитории и не зависит от внешних временных файлов. Ниже указан порядок rollback checkpoints и gates; еще не реализованные имена модулей явно помечены как предложения.

## База решения и доказательства

- [ADR-0011](../../../DECISIONS.md#adr-0011---versioned-physical-solo-courses-and-shared-trainer-kinematics) принят; GoldenVPP остается общим и неизменным.
- [Release62 harness](../../../docs/audits/2026-10-25/release62-harness.md) и [журнал62](../../../docs/design/mobile/testflight62-2026-10-25.md) отделяют выполненный SRC/clock hotfix от отложенных физических трасс.
- [Текущие65 статусов](../../../docs/audits/2026-10-25/acceptance62.md) и [разбор обратной связи](../../../docs/audits/2026-10-25/feedback-triage.md) сохраняют открытые карту, TWD/TWS, географические маршруты и полный device/content audit.
- [Native clock evidence62](../../../docs/audits/2026-10-25/checks/native62-clock.json) подтверждает конкретные pause/resume/Orbit/controls действия, не полный ручной Pro финиш и не физическую производительность.
- [Corrections](../../../docs/audits/2026-10-25/corrections.md) содержит настоящий ручной Simple финиш1:18.3, сохранение и replay на прежнем ускоренном adapter. Он не доказывает проходимость будущей физической модели.

Clock stage0 уже завершен отдельным commit `fded2f1` и включен в62. Его30Hz, максимум2s/60steps foreground catch-up, ready/pause/visibility boundaries не переделываем ради длительности курса. Не обходить настоящий3D/ready/clock gate тестовым forceReady или плоским renderer.

## Неизменяемые инварианты

1. Один force model и контент для web/native/offline. Константы `src/lib/sailing-physics/*`, поляр/VPP и Golden fixtures не настраиваются под желаемое время финиша.
2. Physical motion использует Trainer:1kn=`0.514444m/s`; helm22deg/s с тем же speed authority и low-speed assist0.12; course-assist45deg/s с тем же `approachHeading`. Course assist остается явно учебной помощью.
3. Сначала извлечь чистую кинематику из [session.ts](../../../src/features/sailing-lab/runtime/session.ts), сохранив порядок heading-before-force-step и displacement-after-force-step. Trainer до/после должен совпасть численно на полной fixture-последовательности.
4. Legacy остается прежним:8units/kn/s и0.6m/unit дают4.8m/kn/s, то есть`9.33046x` Trainer travel. Legacy solo responsive40deg/s/floor0.2 и серверные defaults также сохраняются. Это явная версия gameplay adapter, не изменение knot в VPP.
5. Raw world coordinates остаются `race-world-v1`,0.6m/unit. Physical displacement=`0.514444/0.6`=`0.8574066666666668units/kn/s`. Метрическую геометрию конвертировать ровно один раз; старые координаты никогда не угадывать по их диапазону.
6. Размер яхты, оборудования, collision envelope и закон поворота одинаковы на всех трех длинах. Меняется расстояние и лимит времени, а не скорость времени, яхта или радиусы буев.
7. No-context engine/factory/WS остаются legacy с прежними trajectory/events. MPserver авторитетен:20Hz/300s, без нового протокола и без применения локального physical preference к его frames.
8. Metadata readers, PB/replay/native compatibility и server result classes должны быть готовы до первого physical emission. Context фиксируется до countdown, сохраняется до finish и не меняется Settings.
9. Старые записи/IDs/PB/progress не переписываются. Missing/null context означает legacy; явный неизвестный model/revision означает unsupported, а не новую трассу или pixel replay.
10. Advice никогда не меняет player heading, trim, speed, position или gates. Не вводить скрытый autohelm, player speed cap или фальшивое завершение.

## Фаза1: заморозить общий API до параллельной интеграции

Эти три pure-модуля теперь существуют в phase1 source checkpoint; их API заморожен ниже. Они не подключены к racing adapter и не разрешают physical result emission. Validators/UI/native/backend начинают integration после локального gate и rollback commit фазы1.

| Предлагаемый модуль | Минимальный контракт |
| --- | --- |
| `src/lib/sailing-kinematics.ts` | `KNOT_METRES_PER_SECOND`; `advanceSailingHeading(heading, speedKn, steering, dt)`; `sailingDisplacement(heading, leeway, speedKn, dt)` -> metres east/north. Точный текущий steering union Trainer, без React/DOM/feature dependency. |
| `src/lib/race-context.ts` | Readonly `RaceContext`; `LEGACY_RACE_CONTEXT`; `physicalRaceContext(profile)`; `readRaceContext(raw)` -> ok/context или invalid/unsupported; `raceClassId(context)` -> canonical base class. |
| `src/lib/race-courses.ts` | `PHYSICAL_COURSE_PROFILES`; `physicalCourseDefinition(profile)`; `makePhysicalRaceCourse(profile)`; `physicalFleetSpawns(total)`. Definition содержит metric geometry/gates/planner/limits и conversion, не новую копию VPP. |

```ts
type RaceContext = {
  version: 1;
  geometryRevision: 1;
  coordinateUnits: "race-world-v1";
  metresPerUnit: 0.6;
} & (
  | { model: "legacy-race-v1"; profile: "standard" }
  | { model: "physical-cruiser-v1"; profile: "short" | "medium" | "long" }
);
```

Parser принимает известные registry values, не произвольные `metresPerUnit`. Canonical base class имеет вид`model:profile:r1`; result/PB bucket дополнительно включает Simple/Pro, difficulty и wind. Server выводит class из проверенного context, а не доверяет присланному class string.

Новый physical record хранит context вместе с точной course geometry и timestamps. Geometry нового зарегистрированного class должна соответствовать canonical revision; labels локализуются отдельно. Replay использует сохраненную геометрию, а не последнюю factory. Legacy arbitrary world courses остаются читаемыми прежним parser.

Frozen exports: `SailingSteering`, `KNOT_METRES_PER_SECOND`, `HELM_TURN_RATE_DEG_PER_S`, `COURSE_ASSIST_TURN_RATE_DEG_PER_S`, `advanceSailingHeading`, `sailingDisplacement`; `PhysicalRaceProfile`, `RaceContext`, `LegacyRaceContext`, `PhysicalRaceContext`, `ReadRaceContext`, `RaceClassId`, `PHYSICAL_RACE_PROFILES`, `LEGACY_RACE_CONTEXT`, `physicalRaceContext`, `readRaceContext`, `raceClassId`; `PHYSICAL_COURSE_PROFILES`, `MetricRacePoint`, `PhysicalCourseDefinition`, `physicalCourseDefinition`, `makePhysicalRaceCourse`, `physicalFleetSpawns`. `readRaceContext` returns `{ok:true,context}` or `{ok:false,reason:"invalid"|"unsupported"}`. Metric points use `eastMetres/southMetres`.

Gate фазы1:119targeted tests/9files PASS;600complete Trainer states exact JSON equal to untouched f883a19 before extraction, plus portable9-significant-digit trajectory digest and8readable high-precision checkpoints. Root full gate PASS:1107web tests/125files,452native tests/69suites plus9release tools, TS/lint/content/all3package freshness checks, production build and unchanged6.48/6.5MB budget. Sailing bundle rebuilt as3e5a21be32e3/196sources. [Portable phase1 proof](checks/physical-phase1.json). Legacy engine defaults, result emission, VPP, MP and all deployed binaries remain unchanged. This source foundation is not acceptance of full courses or recoveries.

## Фаза2: metadata и классы раньше physical emission

| Текущий consumer | Обязательное изменение и проверка |
| --- | --- |
| [race-native.ts](../../../src/lib/race-native.ts) | Additive context в started/finished snapshot, обязателен для новых physical записей; bounded validation/version/units/canonical geometry. Schema1 без context сохраняет legacy meaning. |
| [native game host](../../../mobile/app/game/index.tsx), [native save adapter](../../../mobile/src/persistence/race-native.ts) | Пронести profile/model, убрать physical hardcode daily/short; сохранить idempotent ID/durable ack/error correlation. Native solo остается локальным. |
| [history storage](../../../mobile/src/persistence/race-history.ts), [History](../../../mobile/app/history/index.tsx) | Старые20rows/IDs читаются без переписывания. Новый title/distance/par resolver не превращает неизвестный profile в Short. |
| [native replay](../../../mobile/app/replay/[id].tsx) | Явно различать world, legacy pixel и unsupported. Наличие невалидного/будущего webRace не должно проваливаться в pixel fallback. Старый `mobile/src/game/course.ts` для pixel replay не переопределять. |
| [shared replay parser](../../../src/lib/race-replay.ts), [replay API](../../../src/app/api/replay/route.ts) | Оба whitelist course/metadata сохраняют context. Malformed tagged physical не заменять стандартной трассой. Existing auth/rate limits/DTO bounds сохраняются; additive metadata может жить в `course_json`. |
| [Best times](../../../src/lib/best-times.ts) | Optional context argument: старые `difficulty-wind` и `pro:difficulty-wind` buckets остаются byte-identical; physical class/profile/revision/mode/conditions отдельны. Не нужен новый native storage key. |
| [Resume intent](../../../src/lib/race-resume.ts), [setup](../../../src/lib/race-setup.ts), [native query](../../../mobile/src/navigation/race-entry.ts) | Allowlist context/profile в query и30min intent. Missing context -> legacy briefing; unknown -> понятное unsupported/menu, без удаления старого blob. Again/fromLesson сохраняют профиль; replay context приоритетен. Это не live-state resume. |
| [Result API](../../../src/app/api/race-result/route.ts), [DB](../../../src/lib/db.ts) | До physical публикации добавить server-derived result partition и class-aware query/ranking. Отсутствие context у старого клиента -> legacy. Новый physical request не попадает в legacy leaderboard. Не расширять auth/privacy/rate-limit permissions. |
| [Daily](../../../src/lib/daily-challenge.ts), [missions](../../../src/data/missions.ts) | Прежде чем переводить их на physical, version identity/conditions/par/award class. Старые даты и sub90 сохраняют legacy meaning. Без этого new physical Free не должен незаметно менять старые linked Daily/Mission. |

Gate фазы2: roundtrip fixtures query -> briefing -> snapshot -> native ack -> History -> shared3D replay -> Again; old bytes/poses/titles/PB сохранены. Unknown model/revision/units/geometry fails closed. Server class isolation проверена до включения physical Free. Смена общих API/auth требует собственного scoped review, а не обхода existing guards.

## Фаза3: три метрические дистанции без масштабирования всей сцены

Начальная topology одна: start -> legal port rounding G0/G1/G2 -> finish. Это честно названные три длины windward-return, не три географические трассы вокруг островов.

Предпочтительный минимальный registry сохраняет [WORLD800x1200](../../../src/lib/race-physics.ts) и существующую0.6 mapping:

| Profile | Windward leg | Start centre, raw units | Windward mark, raw units | Первый лимит для проверки |
| --- | --- | --- | --- | --- |
| short |120m |400,1050 |400,850 |480s |
| medium |300m |400,1050 |400,550 |1200s |
| long |600m |400,1050 |400,50 |2400s |

Лимиты предварительные. Реальные ranges/par и UI duration задаются только после полного physical course matrix, не по старым90/300s. Номинальная длина туда/назад240/600/1200m отличается от sailed distance при лавировке.

- Сохранить существующую яхту; предварительный collision diameter13.2m соответствует нынешним22units. Проверить against actual model fit, не уменьшать hull ради короткой гонки.
- Фиксированные предложения: buoy radius1.5m, отдельный committee envelope около4.5m; rounding stadiumR18m с centre6m ниже mark; legal gate band8.1..26m. Visual hardware, collision envelope и capture gate имеют разные назначения, но согласованную геометрию.
- Такой stadium пересекает боковые gates на16.9706m и северный на12m. У long северный centre достигает rawY30:18m от world edge; север hull-envelope rawY19:11.4m. Centre остается6m внутри нынешней clamp boundaryY20. Это clearance расчета для этого круга, не доказательство всех recovery loops.
- Start line100m, solo capacity пока5. Endpoint clearance>=13.1m оставляет73.8m для центров:4gap по18.45m больше13.2m hull+3m buffer. Спавны ниже линии, все пары без overlap; legacy spread/MP8 не переносить автоматически.
- Все start-dip, missed-gate, tack, opposite-heading, finish-loop и collision envelopes проверить внутри water bounds. FixedWORLD сохранять только если весь matrix проходит. Если нет, согласовать явные context bounds/renderer/shore changes до factory freeze, не скрывать проблему clamp/телепортом.
- [Venue geometry](../../../src/data/venues/geometry.ts) держит декоративные острова за world box; берег остается scenery по ADR-0005. Новый маршрут должен визуально оставаться на воде. Камера close Orbit не отдаляется пропорционально длине.

## Фаза4: opt-in physical engine, gates, bots и advice

- Добавить явный physical context в racing adapter. No-argument [stepBoat/makeStandardCourse](../../../src/lib/race-physics.ts) остаются exact legacy. Нельзя глобально менять8units,22/40yaw,WORLD или0.6.
- Physical helm/course-assist используют общий helper и прежние control semantics. Любой ручной руль отменяет course hold; Simple auto-trim и Pro sheets/deployment сохраняются. Player speedMul=1; bot difficulty handicap остается явно игровым.
- [Pose](../../../src/features/race-3d/pose.ts), common environment/wakes/HUD получают model-aware speed interpretation: physical multiplier1, legacy9.33046 там, где применяется. Raw positions по-прежнему умножаются на0.6. Не переигрывать физику при replay.
- Physical progression читает фактический integrated movement segment; collision-only repel не выдает start/mark/finish неподвижной лодке. Legacy ordering сохранен. Ordered gates/wrong side/shortcut/finish-once проверяются отдельно.
- [Rules](../../../src/lib/race-rules.ts) CPA использует фактический model displacement, не глобальные8units. Hull/proximity/3lengths и penalty seconds согласуются с physical metres/real seconds. Это прежний образовательный subset, не full umpire.
- Bot/advice planner получает общий metric descriptor: stadium/gates/lookahead/start/finish recoveries. Legacy80/40 и advice75/30 остаются неизменными. Physical lookahead сначала8..12m для проверки; feather/shed допускается только при доказанной недостаточности turn clearance, не как скрытое замедление игрока.
- Advice хранит отдельную read-only tack/recovery memory; [water ribbon](../../../src/features/race-scene/guidance.ts) показывает тот же осуществимый path. Старые128 ускоренных probes не засчитываются как новая physical приемка.

Gate фазы4: all3profiles x winds/light-medium-heavy x solo difficulties x normal/early/opposite/stopped/missedG0/G1/G2/finish miss. Actual30Hz, current shifting-wind/gust formula, real gates. Advice eval30Hz/10Hz и held heading1s/3s; shared course-assist и реальный helm driver отдельно. Никаких position/gate shortcuts или player speed clamp.

## Фаза5: длинные записи и действительно durable finish

- Timeout/finalizer получает frozen profile, включая restart/Again. Ни в одном physical solo path не остается жестких legacy300s/15s. Server legacy300s неизменен.
- При player finish фиксировать raw time, exact final sample, penalty, context и race ID один раз. Save/PB/progress/native ack не должны ждать обычного long-course финиша всех ботов или теряться при Menu/Again/late callback.
- Для final rank достаточно unfinished bots до `min(profile.maxRaceSeconds, player.rawFinish + player.penaltySeconds)`, если penalties неотрицательны. Проверить tie policy. Не досчитывать сотни секунд синхронно ради всей таблицы.
- До включения long заморозить reviewed finalization contract: доказать bounded compute для rank window, гарантировать durable completed-player result и отзывчивый UI. Если allowed penalties не помещаются в бюджет, согласовать точный durable completion/rank contract, а не обрезать штрафы, подменять rank или ждать15s с риском потери finish.
- Remaining fleet может считаться небольшими time-sliced chunks; показывать racing до объявленного cutoff. Не объявлять нормальных long easy bots DNF через15s. Поздняя fleet UI не переписывает завершенный player record.
- Сейчас native snapshot<=1MiB,7201samples/2000events,time<=3600s; shared API<=1MB body,600KB samples,5000samples,100KB events,16KB course. Проверить полные serialized bytes, не только число samples.
- Для long2400s начальное предложение1Hz regular samples плюс exactt0/finish и bounded deployment transitions. Replay использует actual sample.t; old0.5s/irregular timestamps остаются читаемыми. Continuous trim не обязан записываться на каждом input event; не округлять simulation state ради бюджета.
- Worst-realistic record, event/control churn и exact-last-sample проходят все native/API/bridge caps. При нехватке места менять bounded sampling/encoding осознанно; не молча терять конец и не поднимать caps без измерений.

## Фаза6: выбор курса, карта и понятный ветер

После предыдущих gates подключить explicit opt-in Free, затем deliberate default switch. В menu/briefing/result/History/Again показывать профиль, расстояние, режим и measured approximate duration на7языках. Внутри race context locked. Preview строится из выбранной factory, а не статической картинки.

Свежая обратная связь требует отдельной видимой ориентации:

- Карта/overview читает те же boat/course/land refs и показывает start/marks/finish/boat/fleet/wind. Reserved drawer/dock, без перекрытия яхты. Above preset и blue advice strip картой не считаются.
- Wind instrument показывает понятные direction/speed и ориентацию камеры; нынешний absoluteTWA не заменяет TWD/TWS/compass. Использовать существующее состояние ветра, не вводить другой weather engine.
- Сохранять canvas drag/pinch, reset, gestures отдельно от wheels и полезную близкую лодку. На320x568/390x844/844x390/tablet controls остаются44px, панели прокручиваются и не съедают scene.
- Map/wind UI можно делать отдельным rollback после API freeze, но до заявленной приемки соответствующего owner requirement. Это не основание смешивать новую географию с MVP трех длин.

## Отдельный следующий scope: реальные островные маршруты

Три длины не закрывают пожелание реальных трасс вокруг островов. Сейчас [venues](../../../src/data/venues/venues.ts) артистические/scenery-only; острова вне playable box, а лодка clamped внутри. Нужны отдельные approved route/topology/geometry revisions:

1. Честный источник геометрии/право offline packaging, coordinate mapping, water/land/clearance contract. Называть декоративное окружение навигационной картой нельзя.
2. Multi-mark/waypoint progression, обход нужной стороной, start/finish, береговые ограничения и ground/collision policy. Не добавлять marks в старую factory, которая считает только marks[0].
3. Общие пути player advice/bots/map/render и успешные full routes при ветре/recovery. Dynamic bounds/shore placement согласовать с hull dimensions, не масштабировать всю яхту.
4. Model/course/revision-aware recording, PB/ranking/replay/offline/native query. Старые простые трассы читаются неизменно.

Не объявлять эту часть выполненной после physical120/300/600. Решить ее точный объем отдельным implementation checkpoint после базовой физической версии.

## Обязательные регрессии и приемка

- Units:1kn*60s=30.86664m; headings0/90/180/270, leeway signs; speeds0/1/3/6/8, helm-1..1, low-speed assist on/off; wrap359->1 и cap45 course assist. После0.6 conversion совпадение с Trainer.
- До/после extraction полная Trainer sequence; Golden/session/rig/polar неизменны. Legacy boat/bot numeric goldens, existing advice recovery matrix, full old-vs-new WS trajectories/events сохраняются exact.
- All3geometry factories: canonical context, одинаковое hardware/hull, legal ordered gates, no collision-only progress, spawn/turn/recovery/shore clearance; full-course и delayed heading matrix фазы4.
- Fixtures: schema1 world800x1200, old world1000x1400, native pixel, missing context,3physical contexts, unknown revision/model, invalid units/geometry. Old byte/PB/title/pose preservation; unknown никогда не pixel fallback.
- Finished raw+penalty, tie/rank boundary, one durable save, late ack/error/coach/share callbacks, Menu/Again/relaunch. Long worst-case payload; actualt0/final/deployment state and replay rates/Home/End.
- API class partition, old clients/leaderboard default, Daily/Mission identity and awards; no physical request contaminates legacy. MP unchanged no-arg/protocol/server authority; generated WS check и real socket lifecycle.
- Source freeze -> full web Vitest/TS/lint/build, `node scripts/check-bundle-size.mjs` без подъема6.5MB, mobile fullcheck/content/3packages, map/dash, exact CI. Регенерация assets только после freeze; root owns docs/version/commit/archive/ASC.
- Настоящий installed offline journey: все3выбора; short Simple finish -> durable History/replay/coach/Again; полный manual Pro finish; medium/long actual start/round/finish/record context. Не подменять progression synthetic events.
- Сравнить Trainer/race travel и turn при одинаковых knots/input; pause/background/ready и Orbit/wheels/pinch/layout на точном бинарнике. Численный parity PASS не равен физической приемке iPhone.
- Физический owner iPhone/iOS26.6.1, sustained FPS/нагрев, speech models/mic, full content/accessibility/двое людейMP и public AppReview остаются явно отдельными. Simulator26.5/27 и452tests не закрывают эти пункты.

Каждая фаза завершается небольшим rollback commit и конкретным gate result. Не выдавать планы/API за реализованную модель, unit tests за manual finish или TestFlight delivery за весь выполненный65-пунктный аудит.
