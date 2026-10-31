# Проверка гонки в TestFlight по журналу диагностики

Для владельца: что сделать в приложении и какая строка журнала это доказывает.
Журнал: Меню > Настройки > Диагностика > «Скопировать журнал». Это JSON
(`format: "regatta-diagnostics"`), строки лежат в `journal.entries[].event`.
В журнале нет имен, ника, ответов и свободного текста: только типы, перечисления
и ограниченные числа (схема: `src/lib/diagnostics.ts`).

## Как читать

- Каждая строка: `type` (что), `action` (какое действие), `outcome`
  (`accepted`, `noop`, `rejected`, `failed`), иногда `reason` и `source`.
- `elapsedMs` - время от запуска журнала, `count` - сколько одинаковых вводов
  слилось в одну строку (руль и шкоты).
- Журнал хранит 200 строк. Когда он полон, первыми уходят непрерывные вводы
  (`control.change` руля и шкотов, вращение ручки рации, перемотка повтора),
  потом обычные команды. Строки `race.lifecycle`, `race.save`, `race.perf`,
  `race.summary`, `scene.gpu`, `embedded.lifecycle` и любые `failed` или
  `rejected` уходят последними. `dropped` - сколько вводов вытеснено.
- Итог каждой гонки - две строки `race.summary`: `action: "result"`
  (настройка и исход) и `action: "debrief"` (что было на воде). Пишутся один
  раз в конце гонки: финиш или лимит времени. При включенных правилах `debrief`
  ждет разбор судьи и приходит через мгновение, между ними может стоять
  `race.save`. Выход посреди гонки дает только
  `race.lifecycle exit` с `phase: "racing"`, итога нет.

## Одна гонка от начала до конца

1. Открой гонку из хаба: `race.lifecycle` по порядку `init`, `briefing` (только
   при первом заходе на трассу) или сразу `countdown`, затем `scene-ready`,
   `start`.
2. Пройди гонку 3-10 минут до финиша: `race.lifecycle finish` с
   `elapsedSeconds`, затем `finish-hold`, затем `results`. По лимиту времени
   вместо этого `timeout`, без `finish-hold`.
3. Итог: `race.summary result` и `race.summary debrief` (поля ниже).
4. Производительность: `race.perf` раз в минуту (`action: "sample"`) и
   итоговая (`final`).

## M0: честная первая минута

| Пункт | Что сделать | Что доказывает в журнале |
|---|---|---|
| M0-2 честный старт | Стартовать, не трогая руль первые 10 с | `race.summary.debrief.startJostleEvents` = 0: у лодки, которая держит курс, событий правил на старте нет; больше 0 - это находка |
| M0-3 толкотня на линии | Стартовать в плотной группе | `startJostleEvents` больше 0, а `judgeIncidents` их не включает |
| M0-4 повороты и фордевинды | Сделать несколько поворотов и хотя бы один фордевинд | `debrief.tacks` и `debrief.gybes` раздельно, совпадают с тем, что делал |
| M0-4 мертвая зона | Дважды завести лодку в мертвую зону | `debrief.noGoEntries` = 2 (тот же признак, что у тренера) |
| M0-4 тренер | Посмотреть экран результата | `debrief.coachScore` (0-100) и `debrief.mainMistake` (`no-go`, `tacks`, `close-hauled` или `none`) совпадают с главной ошибкой на экране (в приложении тренер локальный; на сайте экран может заменить его ответом ИИ-тренера, журнал пишет локальную оценку) |
| M0-5 пропущенный знак | Пересечь финиш, не обогнув верхний знак | `debrief.missedMarkNotices` больше 0 |
| M0-6 боты доплывают | Финишировать не последним | `result.botsFinished` = `total - 1`, если боты успели до лимита; при лимите столько, сколько дошло |
| M0-7 оболочка | Свернуть приложение посреди гонки и вернуться | `race.lifecycle pause` с `reason: "hidden"`, `source: "system"`; `embedded.lifecycle background` и `foreground` (`surface: "app"`); после падения WebView `embedded.lifecycle process-terminated` и `retry` |
| M0-8 потеря GPU | Только если случилось | `scene.gpu lost`, затем `retry` или `failed`, поле `backend` |
| M0-9 производительность | Пройти гонку целиком | `race.perf`: `backend`, `fpsAvg`, `fpsP5`, `dpr`, `drawCalls`, `firstFrameMs` (время до первого кадра) |

## M1: играется как игра

| Пункт | Что сделать | Что доказывает в журнале |
|---|---|---|
| M1-1 одна настройка | Старт из хаба | `race.summary.result.setupSource: "hub"` |
| M1-1 брифинг один раз | Первая гонка на трассе, потом вторая | первая: `race.lifecycle briefing`, `result.briefingShown: true`; вторая: без `briefing`, `briefingShown: false` |
| M1-1 «Еще раз» | На результате нажать «Еще раз» | `race.lifecycle restart` с `setupSource: "again"`, `phase: "finished"`, сразу `init` и `countdown`; в итоге следующей гонки `setupSource: "again"` |
| M1-2 пауза | Кнопка «Меню», затем «Продолжить» | `race.lifecycle pause` и `resume` с `source: "pointer"` |
| M1-2 Esc и P | На клавиатуре (iPad или сайт) Esc или P | `pause` и `resume` с `source: "keyboard"` |
| M1-2 «Заново» | Пауза > «Заново» | `race.lifecycle restart` с `setupSource: "restart"`, `phase: "racing"` |
| M1-2 выход с подтверждением | Пауза > «Выйти» > «Остаться», затем снова «Выйти» > «Выйти» | `exit-ask`, `exit-stay` (`outcome: "noop"`), `exit-ask`, `exit` с `phase: "racing"` |
| M1-3 красная рамка | Коснуться другой лодки | `debrief.contacts` больше 0 |
| M1-4 финиш и результат | Финишировать | `race.lifecycle finish`, `finish-hold`, `results`; `result.finishHoldShown: true`, `result.place`, `result.total`, `result.raceSeconds`, `result.penaltySeconds` |
| M1-4 сход | Не успеть до лимита | `race.lifecycle timeout`, `result.finished: false`, `finishHoldShown: false` |
| M1-5 звук | Выключить звук в паузе, пройти гонку | `control.preferences` с `preference: "sound"`; `result.soundOn: false` |
| M1-7 ориентация | Пройти гонку в альбомной ориентации | `result.orientation: "landscape"` (на момент финиша) |
| Режим и уровень | Выбрать Pro, сложный уровень, сильный ветер | `result.mode`, `result.difficulty`, `result.wind`; миссия или ежедневная гонка: `result.race` (`free`, `mission`, `daily`, `trial`) |

## Поля race.summary

- `result`: `mode`, `difficulty`, `wind`, `setupSource` (`lobby`, `info`,
  `hub`, `again`, `restart`, `resume`), `race` (`free`, `mission`, `daily`,
  `trial`), `briefingShown`, `finished`, `place`, `total`, `botsFinished`,
  `raceSeconds`, `penaltySeconds`, `finishHoldShown`, `soundOn`,
  `orientation` (если устройство сообщило).
- `debrief`: `tacks`, `gybes`, `noGoEntries`, `missedMarkNotices`, `contacts`,
  `startJostleEvents`, `judgeIncidents` (столько пунктов, сколько в разборе
  судьи на экране результата, без пункта толкотни на старте), `coachScore`,
  `mainMistake`. В пробной метрической гонке (`?race=`) нет
  `missedMarkNotices` и `contacts`: этот движок их не меряет.
- Границы: места и лодки 1-64, секунды 0-7200, счетчики 0-10000, оценка 0-100.

## Что прислать

Скопированный журнал целиком и одной строкой: что делал (например, «3 гонки:
хаб, Еще раз, Заново из паузы, одна по лимиту»). Если строки нет там, где
таблица ее обещает, это и есть находка.
