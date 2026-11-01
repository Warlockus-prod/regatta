# CHANGELOG

Что изменилось, простым языком. Новую строку в `## Unreleased`
добавляют в том же коммите, что и само изменение, если оно видно пользователю
или эксплуатации. Подробные разборы релизов лежат в `docs/design/*`, здесь
только короткая запись и ссылка.

## Unreleased

- На экране результатов одиночной гонки (`/game`) под местом и временем появились полосы навыков (этап M4, M4-1): «Старт» (через сколько секунд после сигнала лодка пересекла линию), «Лавировка» (сколько процентов лучшей скорости на ветер, VMG, ты набрал по той же цели скорости, что показывает прибор), «Повороты оверштаг» (сколько узлов скорости в среднем теряется в повороте) и «Мертвая зона» (сколько секунд нос был в ней). У каждой полосы одна подпись и одно число на 7 языках; хорошее число отмечено галочкой у подписи (а для чтения с экрана словами «хороший результат»), цвет полосы одинаковый у всех. Доля VMG показывается не больше 100%: цель скорости считает средний ветер, и в порыве лавировка может ненадолго обогнать ее. Перебор лейлайна не показывается: гонка лейлайн не знает. В пробной метрической гонке полос нет. Пороги полос пока догадка, на гонках людей еще не проверены; в приложении полосы появятся с новым офлайн-пакетом гонки.

- Мультиплеер (`/multiplayer`) теперь звучит, как одиночная гонка (хвост этапа M3): слышны ветер, шум воды и шлепки волн о корпус своей лодки, они растут с ветром и скоростью, а паруса хлопают, когда нос в мертвой зоне. Сервер не сообщает крен и сам триммит паруса, поэтому шлепки зависят только от скорости, а трещотки лебедки и хлопанья при заполаскивании здесь нет; удара о другую лодку тоже нет (касаний сервер не сообщает). Звук идет только в отсчете и в гонке, выключается тем же переключателем «Звук гонки» и замолкает, как только своя лодка финишировала (даже если другие еще идут), на итогах, в лобби, пока связь с сервером восстанавливается, и при уходе со страницы. На телефоне еще не проверено.

- У каждой акватории в 3D-гонке свой свет (этап M3, M3-6, решение 7, доска `docs/design/game-graphics/art-board-m3.md`): в Гёджеке теплый поздний день и низкое солнце, в Сплите яркий полдень с дымкой, на Мазурах мягкий свет и зеленоватая озерная вода, в Соленте светлая облачность и серо-зеленая вода, в открытом море высокое солнце и глубокий синий. Солнце никогда не стоит прямо по курсу на первой лавировке. Блики солнца на воде и пена у берега и в кильватере слегка светятся на среднем и высоком уровне качества картинки; на самом простом уровне свечения нет, меняются только цвета. Вода у камеры теперь спокойнее, чем вдали, и своя лодка не теряется в бликах. Знаки, линия старта, клин мертвой зоны и граница трассы читаются на новой воде не хуже прежнего. Снимки после прохода лежат в `docs/design/game-graphics/` (файлы `m3-<акватория>-<камера>.jpg`, например `docs/design/game-graphics/m3-gocek-stern.jpg`). Вода за кормой отражает притемненный горизонт и не выбеливается, поэтому белое кольцо зоны и желтый пин на ней видны не хуже прежнего. Если гонка сама снижает качество картинки, следы и тени лодок не задваиваются и не застывают на воде, а переход с высокого на средний уровень не пересобирает шейдеры воды. Тренажеры (Лодка 3D) остались при прежнем свете. На настоящем телефоне и с замером FPS еще не проверено.

- Сцена гонки стала живее (этап M3, M3-5): у носа своей лодки летят белые брызги, их больше на скорости и при крене, на дрейфе их нет; камера коротко вздрагивает при касании другой лодки и на выстреле старта, а в обычном плавании никогда. Брызги и тряска выключены при системной настройке «Уменьшить движение» и на самом простом уровне качества картинки (его сцена выбирает сама на слабом телефоне). На паузе гонки и реплея брызги стихают. У соперников брызг нет. В мультиплеере камера вздрагивает только на выстреле (касаний сервер не сообщает). На настоящем телефоне еще не проверено.

- Гонка теперь ощущается в руке (этап M3, M3-4, решение 4): телефон коротко вибрирует на выстреле старта, при огибании знака, при касании другой лодки и на финише, у каждого события своя вибрация, и не чаще одного раза в 300 мс. На руль, штурвалы и шкоты вибрации нет. В меню паузы и в настройках гонки рядом со «Звуком гонки» появился переключатель «Вибрация», он включен по умолчанию и запоминается; его видно только там, где вибрация возможна: в приложении на iPhone и в браузере телефона, который умеет вибрировать (iPhone в Safari не умеет). В мультиплеере вибрируют выстрел, свой знак и свой финиш (касаний сервер не сообщает). Уже установленные версии приложения, которые еще не умеют вибрировать (1.6.4 и 1.7.0 (74)), переключатель не показывают. В приложении выбор для одиночной гонки и для мультиплеера пока хранится отдельно. На настоящем телефоне вибрация еще не проверена.

- Старт гонки звучит и выглядит как на воде (этап M3, M3-3): когда начинается отсчет, гудит гудок и над сценой поднимается флаг класса, на следующей секунде к нему добавляется флаг P, на последней секунде флаг P опускается, как в правилах (RRS 26), на каждой секунде после гудка звучит короткий сигнал, в ноль раздается выстрел и опускается флаг класса. Длина отсчета и правила старта не изменились. Если игрок пересек линию раньше времени (это гонка уже определяла и раньше), звучит сигнал отзыва и показывается флаг X, пока игрок не вернется за линию; если в настройках выключить «Правила», флаг X сразу пропадает. В мультиплеере (`/multiplayer`) отсчет сервера звучит теми же гудком, сигналами и выстрелом (флаг X там не показывается: сервер не определяет ранний старт), флаги класса и P тоже видны, после переподключения выстрел и гудок не повторяются, огибание знака, финиш и вход в мертвую зону своей лодки звучат так же, как в одиночной гонке (раньше клиент эти события сервера выбрасывал), а в настройках гонки появился переключатель «Звук гонки» того же вида, что и соседние. Все сигналы создаются в коде, без файлов, и молчат, когда звук гонки выключен. На телефоне звук сигналов еще не проверен.

- Одиночная гонка (`/game`) звучит живее (этап M3, ADR-0019; мультиплеер см. строку выше): слышен ветер, громче и ярче в свежий ветер, шум воды и шлепки волн о корпус растут со скоростью и креном, паруса хлопают, когда нос в мертвой зоне, а в режиме Pro и когда паруса заполаскивают; движение шкота дает трещотку лебедки, касание другой лодки глухой удар. Весь звук создается в коде, без музыки и без файлов, на том же звуке гонки, что и сигналы: он включен по умолчанию, выключается тем же переключателем, замолкает на паузе, на экране результатов и в свернутом приложении. Бесшумный режим iPhone должен его глушить, но на телефоне это еще не проверено. Лодка 3D теперь тоже слушается этого переключателя: пока звук гонки выключен, ее звук молчит, а нажатие ее кнопки «Звук» включает звук и там, и в гонке; выключение звука в Лодке 3D звук гонки больше не выключает.

- Этап M2 и хвосты M1 (ниже по пунктам). Решение 5 (камера по умолчанию «Вокруг лодки», смена касанием, камера «За кормой») принято по рекомендации плана. Найдена и исправлена ошибка прогрева шейдеров, из-за которой сцена гонки в браузере не стартовала (только в рабочей версии, до выкладки).

- Лобби мультиплеера проще для новичка: ссылка «<- Гонка», готовое имя по умолчанию, кнопка «Создать лобби» больше не выглядит выключенной и пишет, чего не хватает, текст не мельче 14 px, код комнаты можно отправить через системное меню «Поделиться» (иначе ссылка копируется). Ярлыки вкладок гонки больше не рвутся посреди слова («Держат / ь курс»). Escape, который закрывает справку по клавишам, больше не ставит гонку на паузу. Схема трассы в брифинге, окно ника и карточка повтора больше не окрашены в циан.

- Режим Pro: если не трогать шкоты, лодка теперь стартует с парусами, выбранными в бейдевинд (грот потравлен на 25%, стаксель на 35%, раньше 35% и 53%), быстро набирает ход, и подсказка трима говорит "Хороший трим" вместо "заполаскивает"; на легком уровне бот сзади больше не догоняет игрока в первые 20 секунд.

- Гонка: на воде появились клин мертвой зоны у носа, кольцо зоны вокруг верхнего знака, видимая граница трассы с подсказкой заранее, контрастная белая линия маршрута с желтой точкой поворота и стрелка к знаку у края экрана, когда знак за кадром; мини-карта в углу стала темным полупрозрачным радаром вокруг лодки с автомасштабом до знака и ближайших соперников.

- Гонка: камеру теперь можно сменить касанием сцены по кругу (вокруг лодки, за кормой, сверху), а на широком экране и кнопкой в строке состояния. Камера «За кормой» идет за курсом лодки и через полторы секунды после ручного вращения сама возвращается за лодку; при «Уменьшить движение» возврат без плавного облета, одним переходом. Камера по умолчанию осталась «Вокруг лодки».

- Гонка подстраивает качество картинки под телефон: если кадров меньше 42 в секунду, сначала снижается плотность пикселей, потом сетка воды, шум, облака и число деревьев; ступень запоминается на устройстве. На паузе сцена рисуется 8 раз в секунду, а не 60. Дальние соперники и призрак рисуются простой лодкой, ближние в несколько раз дешевле при том же виде. Шейдеры готовятся за экраном загрузки. Файл яхты стал меньше на 150 КБ. Исправлено: снижение плотности пикселей раньше сбрасывалось при каждой перерисовке сцены.

- Языковая проверка гонки на семи языках: во французском знак везде называется «bouée», в немецком «Bahnmarke»; в немецком исправлено «Ziellinie gekreuzt» (kreuzen значит лавировать); в польском «Wolny wyścig» (читалось как «медленная гонка») заменено на «Wyścig swobodny»; в испанском и итальянском кнопка старта в лобби стала глаголом («Empezar», «Inizia»); в русском хаб приложения «Заезд» и мультиплеерные «Условия гонки» и «Обычная регата» приведены к словам гонки.
- Курс sternik: банк из 879 вопросов больше не лежит в JavaScript тренажера и пробного экзамена. Он приходит отдельным версионным файлом (`public/sternik-bank/`, имя файла с хешем содержимого, его пишет `node scripts/build-sternik-bank.mjs` из `src/data/sternik.ts`), пока он грузится, страница пишет "Wczytywanie bazy pytań...", при ошибке показывает сообщение и кнопку "Spróbuj ponownie". Первая загрузка `/sternik/test` легче примерно на 540 КБ JS (около 165 КБ в gzip), все чанки сайта вместе на 522 КБ меньше. Офлайн-кеш сайта хранит файл банка и теперь и страницу `/sternik/egzamin`. Прогресс и разбор ошибок работают как раньше, id вопросов те же. Офлайн-пакет sternik в приложении пересобран: в него вшит тот же JSON, без сети и без экрана загрузки. После правки банка нужно запустить генератор, иначе тест `--check` красный.

- Курс sternik: если сайт обновился, пока страница тренажера или экзамена была открыта, она сама один раз перезагружается и берет новую базу вопросов, вместо ошибки "Не удалось загрузить вопросы".

- Справочные страницы сайта (глоссарий, правила, чек-лист, приватность) при первом входе скачивают примерно на 330 КБ меньше JavaScript (около 125 КБ в gzip), главная на 74 КБ: навигация, нижняя панель урока и возврат к уроку больше не тянут весь курс парусов, тексты уроков буткемпа и квизы, им хватает id, названий и ключа ответов. Закладки, "продолжить" и нижняя панель работают как раньше. Офлайн-пакет курса парусов в приложении пересобран (без текстов буткемпа).

- Приложение: `expo-keep-awake` (~15.0.8, та же версия, что уже была в сборке через `expo`) теперь объявлен в `mobile/package.json`, и экран гонки держит экран включенным через API пакета (`activateKeepAwakeAsync` / `deactivateKeepAwake` со своим тегом у каждого экрана). Поведение то же; будущий Expo не сможет молча убрать модуль. Следующему архиву нужен `expo prebuild` или `pod install`: путь пода ExpoKeepAwake меняется на `node_modules/expo-keep-awake/ios`.

- TestFlight 1.7.0 (74) в группе Self: гонка как в 73, журнал диагностики теперь пишет итог каждой гонки; проверка по чек-листу `docs/design/mobile/race-test-checklist.md`. Откат 73 (начнет с пустого журнала). [Отчет](docs/design/mobile/testflight74-2026-10-31.md).

- Журнал диагностики теперь отвечает, как прошла каждая гонка: в конце гонки две строки race.summary (настройка, место, время, финишировавшие боты, повороты, фордевинды, мертвая зона, контакты, пропущенный знак, нарушения по судье, оценка и главная ошибка тренера, звук, ориентация). В race.lifecycle добавлены «Заново» и «Еще раз» с источником, показ результата, удержание финиша, вопрос о выходе и «Остаться», у паузы видно, кнопка это или клавиатура. При заполнении журнала первыми вытесняются движения руля и шкотов, а не события гонки. Чек-лист проверки гонки по журналу: `docs/design/mobile/race-test-checklist.md`. Старые сборки (72, 73) не читают журнал новой сборки и начинают с пустого.

- TestFlight 1.7.0 (73) в группе Self: весь этап M1 «гонка играется как игра» и исправления после проверки 72. Просим пройти гонку до финиша, паузу и «Заново» и прислать журнал. Откат 72. [Отчет](docs/design/mobile/testflight73-2026-10-31.md).

- Гонка «играется как игра» (этап M1). Меню гонки стало игровым лобби: кадр гонки, акватории карточками, одна главная кнопка старта и «i» для брифинга. Режим, уровень и ветер выбираются один раз (в приложении в разделе Гонка), брифинг показывается только перед первым стартом на трассе, «Еще раз» и «Заново» сразу ведут в отсчет. Во время отсчета, гонки и повтора шапка сайта скрыта, сверху одна тонкая строка: «Меню», время, место, скорость против целевой, звук; сцена занимает около 73% высоты телефона. «Меню» ставит паузу и открывает лист: «Продолжить», «Заново», «Настройки гонки», «Выйти» с подтверждением; на компьютере Esc и P, полный экран по кнопке. Крупный отсчет поверх сцены, сообщения рядом с лодкой с тоном, цена поворота в момент минимальной скорости, красная рамка при касании; подсказка правил больше не прячет другие события. После финиша сцена держится 2,5 с с плашкой места, затем результат: место и время, отрыв от победителя, разница с рекордом, одна главная ошибка и «Еще раз» главной кнопкой; спокойный экран при сходе. Звук гонки включен по умолчанию и отделен от щелчков штурвалов (решение 3 по рекомендации плана; кто выключал звук раньше, остается без звука). Единицы на языке игрока, иконки вместо эмодзи, лодка игрока фиолетовая, циан только у действий. Таблица лучших разделяет Обычный и Pro и помещается на 390 px; свободная гонка теперь сохраняет режим вместе с результатом. Шапка скрыта по решению 2, принятому по рекомендации плана. При «Заново» цифра отсчета не накрывает надпись загрузки сцены, а скорость начинается с нуля.

- Экран финиша: у лодки, которая не финишировала, в таблице больше нет медали; окна ошибок тренера при сходе охватывают всю гонку, а не обрываются на 2:00 (найдено при проверке сборки 72).

- TestFlight 1.7.0 (72) в группе Self: весь этап M0 «честная первая минута» (старт, тренер, пропущенный знак, оболочка приложения, перезапуск после потери видеокарты, журнал FPS). Владельца просим пройти гонку 3-10 минут и прислать журнал. Откат 71. [Отчет](docs/design/mobile/testflight72-2026-10-30.md).

- JS-бюджет снова в норме без повышения лимита: 6 854 454 байт при лимите 6 920 601 (запас около 65 КБ, было на 11 КБ больше лимита). Шпаргалка по рации (`/radio/sciaga`) больше не тянет весь тренажер ради 19 названий сценариев (около 80 КБ меньше при открытии), а тренажер рации не тянет тексты 26 заданий UKE ради их номеров (около 17 КБ меньше). Из-за этого модель рации больше не копируется в чанк каждой страницы рации. Поведение страниц не изменилось.

- Журнал гонки отличает поворот оверштаг от поворота фордевинд и не считает поворотом рыскание на полных курсах и смену курса, пока лодку держит край акватории (M0-4). Локальный тренер одинаково определяет мертвую зону для похвалы и для ошибок, выбирает цель на следующую гонку по самой большой измеренной потере времени и не советует исправлять то, что сам похвалил; гонку без финиша не хвалит. Подсказка маршрута на лавировке реже просит поворачивать. Шаги «анализа» на экране финиша называют только то, что действительно считается (без лейлайнов), урок 8 больше не обещает «AI-тренера».

- Пропущенный знак (M0-5): если пересечь финишную линию, не обогнув верхний знак, игра объясняет, что финиш не засчитан и знак нужно сначала обогнуть, оставив его по левому борту. У края карты скорость в HUD показывает реальное движение лодки, а не полную скорость на месте.

- Приложение (M0-7): во время гонки и повтора свайп от края экрана больше не выкидывает из гонки, экран не гаснет, в альбомной ориентации кнопки и плашки не уходят под Dynamic Island и скругленные углы; если система закрыла страницу гонки из-за нехватки памяти, гонка сама открывается заново на меню и коротко объясняет, что случилось. На устройстве еще не проверено.

- Гонка 3D (M0-8, M0-9): если браузер или телефон теряет видеокарту, сцена один раз сама перезапускается на WebGL2, при повторной потере показывает обычный экран ошибки с кнопкой повтора; это записывается в журнал диагностики. Там же раз в минуту во время гонки и в конце появляется замер производительности: бэкенд, средний FPS и 5-й процентиль, плотность пикселей, вызовы отрисовки, время до первого кадра. Модели яхты (гонка, тренажер, анатомия) грузятся без декодера Draco с www.gstatic.com, который блокирует CSP. В приложении работает `?fps=1`.

- Воронка первой гонки (M0-12): сайт и приложение отправляют шаги гонки (отсчет, первый поворот, первый знак, конец гонки, повтор) с номером гонки на устройстве, в `/stats` появилась воронка гонки, отдельно для первой гонки. Политика приватности описывает новые события (обновлена 2026-10-30).

- Код гонки разделен (M0-1): `src/app/game/GameClient.tsx` уменьшился с 2189 до примерно 1000 строк, экраны брифинга и финиша и цикл гонки вынесены в отдельные файлы без изменения поведения (браузерные сценарии гонки и повтора 21 из 21). Удален мертвый код: старый переключатель 2D/3D, рисовалка берега для 2D, неиспользуемая витрина DesignStudio, старый localStorage-помощник, старые модули ботов нативной гонки. Запас JS-бюджета это почти не меняет: сборщик и так выбрасывал неиспользуемое (замер и оценка выноса данных в `docs/STATUS.md`).

- Разведки M0-13 (код не менялся): пробная метрическая гонка «зависает», потому что две лодки замирают в контакте, а не из-за вычислений; поворот в обычной гонке почти ничего не стоит из-за инерции и мгновенного переноса парусов. Отчеты: `docs/audits/2026-10-30/m0-13-metric-race-hang.md`, `docs/audits/2026-10-30/m0-13-tack-cost.md`.

- Честный старт гонки (M0-2): раньше боты стартовали курсом наперерез игроку, и на «Сложном» судья уже в первую секунду штрафовал игрока на 5 с по правилу 10, а на «Среднем» один бот стоял в 20 единицах прямо за игроком. Теперь игрок на прежнем месте и курсе, а боты тем же галсом «лесенкой» сзади и в стороны. Тест проверяет сырые события правил первых 20 с на трех уровнях, трех seed и двух стилях игрока: ни одного события с игроком; старая раскладка этот тест не проходит. Время игрока сравнимо с прежними рекордами (тот же старт, курс и физика игрока), поэтому класс записи не меняется.

- Толкотня на старте (M0-3): безштрафные сближения и касания первых 10 с после сигнала больше не всплывают подсказкой «ты должен был уступить», а в разборе судьи собраны в один пункт «Толкотня на старте» без урока. Штрафы, если они были, по-прежнему видны отдельными пунктами.

- После финиша игрока остальные лодки доплывают до своего финиша или лимита гонки 300 с (M0-6). Раньше им давали только 15 с, и на «Легком» большинство ботов оставались «не финишировали».

- TestFlight 1.7.0 (71) в группе Self: разбор учебного судьи после гонки, разбор проверки трима с повтором без подсказок и статус сохранения в практике на рации. Пробная гонка в метрах и призрак в приложение не входят. Откат 70.

- Лимит размера JS сайта поднят с 6,5 до 6,6 МБ по решению владельца: этапы 2-5 (общая лодка, пробная гонка, призрак, разбор навыка, судья) добавили около 114 КБ, движок пробной гонки и судья уже грузятся только там, где нужны. Запас после подъема около 15 КБ; следующий рост решается выносом данных радио и курсов из клиентского бандла.

- Полный учебный цикл для двух навыков. Проверка трима (открыть верх / уплощить низ) теперь сохраняет измерения до и после и число попыток, сразу после сохранения и на странице урока outhaul показывает разбор с причиной и кнопку "Повторить без подсказок", а повтор сравнивается с прошлой попыткой (лучше, так же или слабее). Старые сохранения без измерений по-прежнему считаются выполненными. В тренажере рации после оценки видно, сохранился ли результат, при ошибке есть "Сохранить ещё раз"; ключ и формат прогресса прежние.

- Подготовлен разбор «учебного судьи» после гонки: каждый эпизод с этапом гонки, номером правила, правом дороги, штрафом или пометкой «без штрафа: спорно» и советом на следующий раз; повторы одного эпизода сливаются, а список того, что судья не проверяет (место у знака, протесты, штрафные круги, настоящий судья), всегда виден. Разбор показывается на экране результата после финиша.

- Призрак в гонке (сайт): после финиша твой лучший заезд в тех же условиях (режим, сложность, ветер, миссия, трасса) сохраняется в браузере, и в следующей гонке рядом идет серая лодка «Твой лучший 1:23». Она не сталкивается, не влияет на место, правила и физику. В приложении пока нет: WebView не хранит такие данные надежно.

- Пробная гонка в метрах за флагом: `/game?race=short`, `medium` или `long` открывает трассу 120, 300 или 600 м, где лодка игрока идет тем же шагом, что в Тренажере (руль 22 град/с, удержание курса 45 град/с, экипаж на шкотах). Брифинг и экран результата это прямо говорят. Результат, рекорд, запись гонки, миссии и возобновление в пробной гонке не сохраняются, обычная гонка без флага не изменилась. Финиш пробной гонки в браузере руками еще не пройден, остальные лодки после финиша игрока не догоняются.

- Одна лодка в тренажере и в физической гонке (ADR-0014): лодка игрока в гонке в метрах теперь идет тем же шагом, что и в Тренажере, с экипажем на шкотах и переносом парусов при повороте. На трех разных входах курс, скорость, крен, снос, шкоты и пройденные метры совпадают на каждом шаге. Тренажер не изменился ни на бит. Боты пока переносят паруса мгновенно, это открытый пункт. Физическая гонка еще не включена в игру.

- Сборка 1.7.0 (70) доставлена в TestFlight, группа Self: дневная тема, исправления Back, «Начать с основ» в теории SRC и «Справка» с пояснением по касанию. Перед загрузкой сборка проверена руками в симуляторе на iOS 27, включая обновление с магазинной 48 с сохранением прогресса. [Отчет](docs/design/mobile/testflight70-2026-10-29.md).

- Проверка перед публикацией: два сценария кабины гонки (Обычный и Pro) разделены на отдельные случаи по размеру экрана. Все проверки и поворот экрана сохранены, облачный прогон 40798214738 показал, что один проход на раннере все равно идет дольше 120 с (локально с тем же программным рендером 25-35 с, раннер примерно в 4 раза медленнее; ни разрешение, ни прореживание кадров не помогают), поэтому у этих 8 случаев лимит 240 с, общий доступный срок растет с 240 до 1920 с. Причина измерена: без видеокарты около 90% кадра главный поток ждет программный рендер, и цепочка из шести частей не укладывалась в лимит. `playwright.swiftshader.config.ts` воспроизводит облачный раннер локально.

- Рация SRC: открытая вкладка «Справка» сама включает режим пояснений, касание любой части рации объясняет ее, а не нажимает. Переход на другую вкладку возвращает обычное управление. Раньше подсказка «Ткни в любую часть рации» работала только с отдельно включенной кнопкой «Изучить радио» (отзыв TestFlight 69, TF13). Так в свободной практике и в уроках Obsługa.

- Теория SRC: кнопка «Начать с основ» (и выбор главы) теперь ведет к тексту главы и ставит на него фокус. Раньше на новом курсе она выбирала уже открытую первую главу и прокручивала к началу страницы, поэтому казалось, что кнопка не работает (отзыв TestFlight 69, TF12).

- Получены и разобраны еще3отзыва69, всего14, и отдельный журнал владельца. Четыре native результата распознавания подтверждены без раскрытия речи; начало теории, полный guide и Reset остаются открыты. Exact147пакет проходит43проверки,121файл совпадает после установки, прямое48upgrade сохраняет прогресс. Пять известных возвратов и cold quiz проверены; полныйG2/cloud/доставка70не закрыты. [Статус](docs/audits/2026-10-28/completion-status.md).

- Нижняя кнопка программы Foundation возвращает к существующему списку курса и удаляет пройденные экраны из стека: следующий Back ведет в обучение. Новый StackRouter regression сохраняет четыре непустые учебные записи;614native/typecheck/lint проходят. Установленная приемка нового пакета остается обязательной.

- Вернулись к исходному независимому аудиту: краткая сводка и полный список сохраняют65требований,15находок и11тем TestFlight. Пять свежих web-экранов подтверждают дневную тему в локальной сборке; в69ее еще нет. Уточнены разные смыслы руля, сетевые Gallery/погода/Ask, остаток Back и точные границы D8/acf/пятой footer-правки. [Отчет и порядок](docs/audits/2026-10-28/completion-status.md).

- После возврата из учебной практики следующий Back должен вести к программе курса, а не снова открывать тренажер. Исправлены четыре известных контекстных возврата; общий Back и запись прогресса сохранены. Ошибка воспроизведена на D8, приемка нового установленного пакета остается обязательной. [T05](docs/audits/2026-10-28/completion-status.md).

- Измерение browser-сценариев гонки собирает ограниченные пассивные события вместо повторных layout probes между действиями. Все173assertions/53действия/размеры/сроки сохранены; два локальных пути проходят. Это не доказательство причины старого cloud timeout и не новая приемка70.

- Итоговый аудит дополнен чистой установкой70: первый урок, настоящий3D, возврат, cold-resume и реакция руля Simple. Все65ID/F01-F15/11тем отзывов сохранены. Exact cloudD8красный92/94; причины задержек не объявлены установленными. Общая лодка, смысл руля, весь учебный цикл и поставка70остаются открытыми. [Полный отчет](docs/audits/2026-10-28/completion-status.md).

- Полный отчет повторно сверен со всеми65требованиями,15находками и11отзывами TestFlight. Семь новых установленных кадров кандидата70 подтверждают дневной путь и Pro orbit/ручной шкот; полныйG2и доставка остаются открыты. Старый offline-документ28помечен историческим, чтобы не подменять нынешние локальные пакеты.

- Длинная подпись знака в брифинге переносится по словам с локальным Source Sans 3, сохраняя переводы и размер текста. В проверочном цикле объединены независимые измерения без сокращения пользовательских действий; принадлежность App/Data путей Simulator проверяется до работы с данными и UI.

- Предыдущий checkpoint70/source25baff1 проходит43package checks и первые дневные UI-пути. Кажущаяся потеря на RU26 оказалась сравнением разных устройств через stale clone path; ownership guard теперь обязателен. Прямой SE26 сохраняет прогресс, но exact25baff1cloud predeploy красный и полный G2 открыт. Новый TestFlight upload не выполнен. [P10](docs/audits/2026-10-28/cockpit-navigation-harness.md).

- В кандидате70 прибор ветра показывает TWA относительно носа с указанием борта, отдельно сохраняет абсолютный TWD;3Dстрелки продолжают показывать вымпельный поток. Исправлены резерв трехстрочной подписи руля, длинные вкладки гонки и короткий landscape тренажера; фон запуска согласован с дневной оболочкой. Полные source/browser и новые installed gates учитываются отдельно в [P10](docs/audits/2026-10-28/cockpit-navigation-harness.md).

- Через Apple GET прочитаны все11входящих текстов TestFlight, версии и даты отделены от текущей69. Радио60оказалось отказом входа в SRC до прибора; отзыв66уточнил потребность в ветре относительно носа. Сырые пользовательские данные остаются приватно. [Сверка](docs/audits/2026-10-28/testflight-feedback-review.md).

- В исходнике исправлены скрытый Back/начало брифинга и прокрутка карты, гонке выделено больше места лодке. Убрано дублирование учебных подписей без изменения семи языков. Первый94gate выявил IT short обрезание, DE test-selector и незавершенный Simple возврат; после follow-up полный94gate проходит,70удержан до native-приемки. [P10](docs/audits/2026-10-28/cockpit-navigation-harness.md); поставка пока69.

- Повторный полный отчет сохраняет все65требований/F01-F15 и пожелания владельца. Пять свежих экранов отделяют исправленные в source тему/Back/сцену от поставки69; открыты единое движение/снасти/руль, повторная подготовка гонки, весь учебный цикл и installed acceptance70. Уточнены устаревшие статусы пилота иллюстраций и Ads. [Состояние и этапы](docs/audits/2026-10-28/completion-status.md).

- Повторно сверены все 65 требований и 15 находок независимого аудита с поставкой 69. Сохранены 8 свежих web-снимков: вращение 3D работает, светлая тема принудительно меняется в тренажере, новая физика еще не подключена. Жалоба на оформление снова открыта; полный остаток и порядок работ: [итоговая сверка](docs/audits/2026-10-27/completion-reconciliation.md). Этот проход не меняет приложение или релиз.

- Delivered1.7.0(69) to exact TestFlight Self from2ea498b: bounded free radio practice, requested-locale native ASR, independent native outcome logs, versioned support export and local Ads preview.1793web/602native and82first-attempt browser cases pass; generated18/archive36/IPA38, Apple VALID and independent Self/8notes GETs11:12UTC. Owner performs manual radio/Reset/PTT/microphone acceptance in TestFlight. Physical emission, website and public submission remain OFF.

- Add independent native radio recognition outcome logs and a copied support report with app version/build. Exclude speech, audio, request IDs and interim samples. The owner will perform manual radio acceptance in TestFlight69; the Simulator interaction gate is explicitly deferred for this beta.

- Verify the radio locale fix in an exact native Release Simulator package:31package checks, compiled native/JS probe,121matching installed files and all16prior storage keys preserved. Actual installed radio callbacks/Reset/microphone remain open after Device Hub stopped responding; no69 delivery.

- Check native radio recognition for the requested English dialect instead of the phone's default-language capability. Older binaries without the new locale probe keep typed fallback until a native rebuild; actual microphone acceptance remains separate.

- Preserve actual metric impact velocities for the following optional race judge. Separate initial overlap from travelled encounters, including later contact with a stopped hull; no fault or penalty is inferred yet. The physical fleet remains unwired.

- Verify exact e414 push/PR CI and82first-attempt browser cases. Retained native89 also confirms typed radio Add and Exit; actual Reset and microphone recognition remain open. No69 delivery is claimed.

- Keep physical bots clear of missed rounding gates and stop rearward turns from alternating while steerage is weak. All90specified autonomous fleets now finish, with no mark contact;15moving early hard fleets retain hull encounters. Human guidance and physical activation remain separate gates.
- Move dated completion checkpoints out of the agent entry point into a linked history, keeping the current plan and delivery status easy to find.

- Verify PL typed radio practice, Clear and Exit in the exact installed916 package; PTT reports unavailable and real microphone recognition stays open. Confirm the earlier d580UI checkpoint with82first-attempt cloud cases, separately from later physical response work.

- Prepare actual impact-truncated hull/mark/water travel in the unwired physical fleet. Recovery cannot earn a start or rounding gate. Dedicated response tests pass; physical activation still awaits judging, guidance, recording and installed gates.

- Make physical bot avoidance consistent at the close-hauled numeric boundary, including temporary luffs around an obstruction. All54autonomous difficulty/course/wind/start cases now finish; nine moving early hard starts still have hull contacts. This preparation remains unwired pending response, judging, recording and installed gates.

- Prepare actual physical hull/mark contact observations before separation. Align bot predictions with water limits and their last steering commands; fit start recovery circles around the real line hardware. Eighteen five-boat journeys pass without observed envelope contact. This source remains unwired pending hardware response, judging, guidance, recording and installed gates.

- Wait for a complete responsive radio faceplate before checking its unchanged screen bounds in browser acceptance. Preserve the exact89 report with one flaky case and its qualified native entry/Exit proof; they do not establish full delivery readiness.

- Reset free radio practice into a fresh private session even when the clock repeats. Clear prior transmissions and pending recognition, then return the task dock to its beginning. Following exact acceptance remains separate from frozen916.

- Prepare an unwired physical fleet transaction with shared trainer helm/metres, separate bot memory and reachable-turn traffic advice. Five-boat course/wind/early-start tests retain the original limits. Physical result emission and the live game remain unchanged pending the remaining engine/recorder/installed gates.

- Verify the free-radio source with1721web/589native tests and82first-attempt browser cases. Preserve its exact31-check/121-file Simulator package and prior data. Installed entry/Exit work; native PTT/microphone acceptance and69delivery remain open.

- Add free radio transmission practice beside the pinned radio: provisional on-device English recognition, a clearly labelled offline typed fallback and eight session-only transmissions. Cancel/Clear discard pending text; actual outcomes enter the bounded diagnostic journal without words or audio. Source, installed microphone and delivery acceptance remain separate.

- Verify actual yacht asset/decode callbacks and native Back in exactf3 Simulator observation. Keep the earlier startup cause and full release acceptance open; no69 upload is claimed.

- Distinguish actual yacht asset reading from GLTF decoding in the bounded startup journal. Preserve loader callbacks and the real first-frame gate. Official8e has one successful installed race startup; the earlier f4 failure remains unexplained and69 is not delivered.

- Hold candidate69 after its fresh installed race failed to produce a first3Dframe. Add bounded scene/renderer/model/frame observations to locate the delay; preserve the actual first-frame gate and existing renderer/physics policy. This observation checkpoint does not claim a startup fix or delivery.

- Add an unwired physical progression boundary with canonical metric gates, ordered rounding and collision-independent finish credit. Preserve the failed fleet research separately; physical races remain disabled until actual fleet, guidance, recorder and installed acceptance pass.

- Закреплен основной порядок завершения продукта: Ads и исследование eSail учитываются отдельно и не закрывают готовность гонок, радио и обучения.

- Keep Ads translations in the existing shared pure-library boundary so Metro can bundle native Settings and the Ads route. The first69 source candidate stopped during Simulator export and was never uploaded.

- Prepare1.7.0(69) after an independent read-only Apple check confirmed maximum68 and no69. Ads remains a local inspection place; installed, exact browser and delivery gates are pending.

- Keep frozen legacy trajectory checks portable across Mac/Linux: only heel/leeway allow12-decimal precision after observed5e-15 runtime differences. All remaining force-state fields and trim stay exact; motion comparisons retain their existing precision. The frozen fixture and production engine are unchanged.

- Add a native Settings entry named Ads for local camera and placement inspection using the same yacht/sea. The prototype provides four camera views, free orbit/zoom, directional buttons, lens choices, three test cards and a bounded preview journal. SDK/provider is still unconfigured, with no ad requests or impression claims; installed/release acceptance follows separately.
- Prepare an explicit physical race motion boundary using the trainer's metre and heading helpers and the existing race force/trim integration. Preserve twelve frozen legacy trajectories and server defaults. This is currently an unwired API; physical races stay disabled until course/bot/guidance/progression/recorder/native consumer and installed gates pass.
- Delivered1.7.0(68) to exact TestFlight Self: independent confirmed native PB/History, idempotent receipts and a corrected shared3D replay Back route. Actual26.5/27 finishes, cold results and exact-f7 fresh27 startup pass;77first-attempt browser cases and independent23:23UTC Self/8notes GETs. Physical races and the wider completion program remain open. [Release68](docs/design/mobile/testflight68-2026-10-27.md).

- Keep a saved shared3D replay inside its own native route, so opening it cannot replace the original race parameters and Back cannot cycle between History and Replay. The first68 candidate was held at native G2; corrected f7 is delivered68.

- Native race personal-best banners now wait for their own confirmed device write, separately from History. Same-row receipts make retries idempotent; stale replies, corrupt/read-failed stores and old WebKit row writes cannot claim a new record. Global clear invalidates old race work and reports an unconfirmed sweep on failure. Delivered68 passes qualified installed and delivery gates; physical races remain disabled.


- Delivered1.7.0(67) to exact TestFlight Self: shared first-lesson3Dpractice plus one Scheme/Picture sail pilot with filled/luffing views, preserved force states and actual image-result diagnostics. Exact77c passes77first-attempt browser cases and qualified installed26.5/27 acceptance; independent18:53UTC Apple GET verifies VALID/IN_BETA_TESTING and8notes. Wider lessons, PB durability, physics/courses, radio transcript and public/device acceptance remain open. [Release67](docs/design/mobile/testflight67-2026-10-26.md).

- Keep browser lesson acceptance within separate30s journeys for quiz/reload and ready3Dreturn, retaining the25s scene deadline and every prior assertion.

- Keep picture retries and stale-load protection consistent across app and web while each platform retains its own React runtime.

- Share the first Foundation lesson across app and web, with real3Dwind observation and return to the same lesson step. Add a Scheme/Picture pilot with filled/luffing mainsail views, readable callouts, preserved force diagrams and local image-result diagnostics. Picture selection does not pass a lesson; a failed image returns to the diagram. Native Image sizing keeps picture callouts aligned with the sail. Delivered in67 within the qualified P02 pilot scope.

- Delivered1.7.0(66) to exact TestFlight Self: the first lesson's native practice no longer passes an unsupported accessibility action to Skia Canvas. Local wind remains; live-weather requests are removed from the native trainer. Installed26.5/27 checks and72first-attempt browser cases pass. Independent Apple GET confirms VALID/IN_BETA_TESTING and eight matching notes. [Scope and limits](docs/design/mobile/testflight66-2026-10-26.md).

- Safely archive50inactive local branch heads with52verified recovery refs. Remote branches, active worktrees, unique work and user files remain preserved. The manifest records the two safe-delete refusals; full cleanup remains open.

- Start the owner-approved completion program with an ordered harness and recoverable checkpoints. P01 is delivered in66; shared lessons, reviewed Scheme/Picture integration, physical courses, free radio transcription, ghost and full public acceptance remain following stages.

- Recorded an independent product audit with fresh installed/web screens and a twice-reproduced first-lesson native simulator crash. The report separates strengths, remaining learning/game/UX gaps and proposed priorities; no product behavior or release changed.

Следующие source checkpoints уже входят в APP65, где явно указано ниже;
синхронизация SITE и оставшиеся физические/продуктовые gates остаются отдельно.

- Cancel a radio16/C press released outside the button even when iOS retains pointer capture. Preserve the current channel, stop the pending hold and record one local cancellation. Real taps, completed holds and keyboard input retain their behavior. Native G2 found this before the first65 candidate was uploaded.

- Prepare1.7.0(65) after confirming its number is unused, retaining64rollback. The first corner gate's diagnostic expectations now include the new field; geometry and cold persistence use independent journeys with unchanged assertions and budgets. Native/Apple acceptance is still required before delivery.

- Keep a live mini-map and wind readout in the3Dscene corners during solo and multiplayer races, through every dock tab. Tap the mini-map for the full overview; its on/off choice is saved and logged locally. Wind readings stay visible, with the existing optional compass/air arrows. The same boat, controls and physical model are retained.

- History and Personal records now name saved courses from validated metadata, preserve unknown entries and show registered finish time plus penalties. Previous score records retain their order; each registered class, mode, difficulty and wind has its own PB without a shared rank. All names and conditions have seven language adaptations. Physical races remain disabled pending durability and engine gates.

- Restarting an interrupted race now restores its saved Pro or Simple mode and wind before the sails are initialized. Mission and Daily identity survive, explicit activity links keep their own setup, and incompatible saved data stays protected until a new Start. The mobile restart buttons have44px touch targets; the same prepublication gate adds a real saved-mode regression for70cases.

- Replay and Coach now reject a saved race whose namespaced class contradicts its world data, using the existing translated explanation and Back action while preserving history. The same check serves the native projection; no fallback geometry or coaching request is created.

- Delivered1.7.0(64) to exact Self with a complete fitted course map, four saved wind display choices and a real Settings gear. Upgrade26.5 and clean27 changed-screen checks, Apple VALID and independent eight-language notes/group checks passed. The website is published and healthy, with one remaining multiplayer production browser failure explicitly retained.

- Prepared safe result-class consumers without enabling physical races: failed PB saves cannot announce a record, future setup intents survive implicit cleanup, historical SQLite rows stay unclassified, native preparation keeps explicit provenance and history clear reports its actual result. Real history/leaderboard UI and native PB durability still follow before physical activation.

- The native Sternik exam journal now explains guarded Exit and Stay/system-dismiss outcomes once per prompt, preserving the exact exam exit behavior and Polish copy.

- Prepared canonical comparison/result identities for physical courses, preserving old personal-best keys and keeping historical global results unclassified. New result emission remains disabled while storage and API consumers are integrated.

- Reduced replay bundle duplication while keeping all seven languages and existing labels, leaving room for the following result-class work within the unchanged size limit.

- Canceling a radio16/C touch no longer selects CH16 or fires a delayed hold. A bounded local cancel/noop entry explains the canceled input; actual tap, one-second hold, AQUA and PTT keep their behavior.

- Prepared versioned physical race record readers without changing live racing: known tracks retain geometry and exact recorded trajectory, unknown future coordinates cannot fall back to pixel replay or remote coaching, and new result emission stays disabled until score classes and the engine are ready. Saved history stays intact, with a shared seven-language explanation and working Back for unsupported records.

- Separated race Map/Fleet and wind/Helm browser journeys after the combined case reached its120s deadline with successful real geometry and a running clock. Both journeys keep25s startup,15s clock and120s total budgets, all assertions and five viewport samples. Evidence reuses each validated sample. The same prepublication files now contain69cases; runtime and deployment permissions stay unchanged.

- Fitted the complete course map and legend inside the available cockpit panel, including the native safe area and short/landscape screens. Marks and boats are visible before scrolling; boat space and controls stay reserved.

- Trainer drawer geometry now waits for the actual first3Dframe inside the same25s startup allowance. A retained cloud screenshot showed Loading yacht during the former597ms geometry sample; both drawer cases keep their1px bounds, view actions and60s total budgets. No runtime or timeout was changed.

- Added the existing trainer control/layout suite to the same loopback pre-deploy browser gate so its real first-frame, occupied Diagnostics and unobscured-boat contracts run before publication. The frozen64 source also repairs the63 multiplayer slider's accessible name; its strict guest input check stays in place. Publication guards, permissions and timeout budgets are unchanged.

- Recorded healthy website63 publication and its red final browser gate. Trainer geometry now waits for the real first3Dframe within the existing startup allowance and counts the44px Diagnostics utility as occupied content while retaining blank-gap, viewport and no-overlap checks. The real63 multiplayer accessibility defect remains visible to its unchanged assertion; no runtime, budget or deployment privilege changed.

- Prepared native build64 with refreshed radio, sailing and Sternik offline packages. The running map and four wind choices join the existing browser check before website publication; deployment privileges and budgets stay unchanged.

- Added a live race course map with all marks, start/finish and boats in the reserved cockpit. Actual wind direction/speed stays visible, with compass, 3D air arrows, both or off choices saved for the next launch. Solo and multiplayer share the instrument; Settings now uses a real gear. Briefing wind text is readable. All new labels have seven language adaptations.

- Shared content footer loading and deduplicated link metadata keep the existing6.5MiB build budget, preserving server-rendered links, translations and offline adapters.

- Delivered1.7.0(63) to Self: finger-operated radio DIAL, moving index, retained arrows, native selection protection and bounded local diagnostics. Native copy/relaunch and progress-preserving upgrade plus clean27 pass; independent Apple GET confirms VALID/IN_BETA_TESTING and8notes. The following map/wind/gear and physical-course checkpoints remain separate.

- Website 63 prepublication passed all 60 browser cases on the first attempt with actual frame readiness and unchanged budgets; Pro observations and its canonical journal are verified. Native 63 delivery is separate, and website merge/deploy/production acceptance remain pending.

- Pro browser startup now requires an actual rendered frame within the same 25s allowance as canvas visibility, before its unchanged 15s clock and 120s case checks. CI serializes independent browser cases after measured WebGL2/ReadPixels stalls and overlapping heavy scenes; contention remains an inference. Local defaults, real multiplayer clients, assertions, retries and trace policy are preserved.

- Suppressed the native touch default only on the active DIAL, preserving separate tap/hold/rotation commands and normal Inspect clicks. Repeated rapid taps now have an explicit selection-prevention path; native UI acceptance remains required.

- Preserve bounded Pro browser evidence on successful retries: actual scene readiness, clock, visibility, pageerror stacks and a validated local journal. Invalid journal contents stay inside the read-only probe. Both deployment browser reports retain their existing 14-day artifact scope after success or failure; UI checks, budgets, trace policy and publication privileges are unchanged.

- Prevented iOS Copy/Look Up callouts on the radio hardware and its captions, so long holds cannot cover the instrument. Learning text and the diagnostic journal remain selectable.

- Corrected the final DIAL browser checks to the actual LCD label Volume:, retaining real SQL and rim motion and every completion/layout check. Menu browser checks keep the catalog inventory separate from the Diagnostics utility and verify its seven translated names, exact route and 44px target during search. No runtime or timeout changed; the next full browser gate remains required.

- Radio DIAL now turns with a finger and shows a moving index, with44px arrows retained in every layout and keyboard alternatives. Rotation, tap and power hold have separate cancellation paths.

- Added a bounded local diagnostic journal for radio, sailing controls, embedded startup/navigation and real save results, with clear/copy and outcome filtering in the dock and native Settings. It excludes private transmission/storage contents and automatic physics updates; native global data clearing prevents delayed journal revival. Complete product and native delivery acceptance remain separate.

- Fixed browser Back after a language link: clearing the language query now preserves navigation history, so the free radio page can restore instead of leaving the lesson mounted under its URL.

- Gave the shared3D replay browser case120s after its real camera selection passed at57.9s and the storage check met the former60s deadline. All readiness, recording, playback, camera and geometry assertions remain. The simulator smoke now retains actual error stacks in its private synthetic CI report; product telemetry is unchanged.

- Gave radio status its own readable row below the compact toolbar, filled eight missing guide headings and three control descriptions in every SRC language, and made Back labels match the current return route. Aligned introductory lesson-list margins and neutral Sternik information colors. Candidate63 retains the62 progress-preserving startup repair; installed/native delivery gates follow separately.

- Prepared one shared Trainer movement/turn helper and a versioned registry for short, medium and long physical courses. Current motion is preserved; the new race model is not enabled until saved records, replay and result classes support it.

- Website pre-deploy checks now include sailing lessons and shared replay. Updated their browser contracts to the compact Task controls and actual camera selector, retaining real9m-to-11m keyboard input, pause, checkpoint and playback checks. The two-client multiplayer case receives120s after its60s deadline expired following verified helm input; global budgets and publication privileges are unchanged. Combined browser verification is still pending.

- Gave three real 3D browser flows individual 120s budgets after cloud traces showed valid controls, pause and rendered scenes exhausting the former 30/60s limits. The trainer still must report its actual first rendered frame within 45s; every interaction and assertion remains in place, with no global timeout or app-runtime change.

- Fixed SRC failing to open after an update from released48/49 when their retired language preference is present. Saved progress is preserved. Startup now has a bounded wait, separate support codes and usable Retry/Exit, including interrupted WebView processes. Delivered1.7.0(62) to Self: independent Apple GET confirms VALID/IN_BETA_TESTING and8notes. Actual48->61failure->62instrument/relaunch and existing8-value upgrade retain progress; full product/physical acceptance remains qualified.

- The foundation return test keeps the 44px minimum while comparing browser geometry to 0.001px precision, avoiding a false failure at 43.999992px. Course return, navigation and progress assertions remain unchanged.

- Fixed foreground simulation time freezing at2-3FPS. Ready, pause, visibility and enabled boundaries exclude inactive time, while simulation keeps its1/30second step. Race sliders now expose their existing translated names to accessibility tools.

- Reprioritized checkpoint62 for the urgent SRC upgrade failure plus stable foreground time and accessible race sliders. Owner-approved physical-scale short/medium/long courses follow separately; they are not part of62.

- Updated two website browser expectations to the current Polish radio help label and default 3D trim view. The checks still require working help without invented progress, a rendered first frame and hidden embed navigation. The separate race-clock assertion is retained.

- Website image publication and deployment now explicitly require main, so a manual run on another branch or tag performs checks without changing production. The confined server policy and credentials are unchanged.

- Website foundation browser journeys now run in branch/PR CI and before deployment: original checks, restored drafts, failed-save retry and return from practice must work before the website is published. App release sources and installed assets are unchanged by this site-only gate.

- Delivered1.7.0(61) to Self with Apple VALID processing, verified membership/readiness and8notes. It includes the reviewed3D camera, radio/navigation, route advice and language corrections. Public website/AppReview and the next physical-scale short/long course stage remain separate.

- Finished adapting12 SRC theory section headings in all seven languages. Radio mistakes and their Reset now stay within SRC, preserving saved Polish Sternik oral practice.

- Fixed SRC Review topic opening the wrong offline theory chapter; Back now restores the chosen chapter and scroll position. Moved compact trainer camera presets into View so they do not overlap instruments on short screens.

- Free trim now opens in 3D, while lessons and saved checkpoints keep their selected views. Informational trainer values use neutral colors.
- Race route hints now retain the chosen tack, recover missed rounding gates and show the actual feasible turn on the water. The advice does not steer for the player; existing physics and bot behavior remain unchanged.

- Race guidance now keeps the actual and suggested course visible while paused or explaining a rule. Primary restart/resume actions use the shared accent, and cockpit buttons avoid text selection during touch control.

- Reopened the full completion audit after build60 feedback. Candidate61 adds the trainer's freely rotatable close3D camera to racing, a direct radio-practice entry, internal SRC Back, dependable native exits, and matching dark instrument frames. Actual-device acceptance and delivery are recorded separately.
- Kept wheels visible alongside lesson tasks, restored real mainsheet lengths and precise steps, moved recovery-trainer overlays into reserved controls, and unified race/control sounds. Offline results no longer promise global publication.
- Replaced website foundation manual completion with the original shared19-question checks, learning diagrams, saved drafts and honest viewed/theory/practice evidence. Original native content and historical progress remain intact.

- Delivered 1.7.0 (60) to the internal Self TestFlight group with verified Apple processing, availability and release notes in eight locales. Final Release checks retain progress when updating the public build. Website and public App Store release remain separate.

- Fixed Apple import validation for the Expo file reader with an honest photo-library description in all seven languages. The app does not request access to personal photos. Web CI now runs native navigation adapter tests without installing Expo.

- Added an explicit return from the fullscreen solo menu to the app race hub in seven languages. Candidate60 supersedes uploaded59 before Self distribution.

- Fixed native exam cancellation so Stay keeps the active Sternik session and its exit button remains usable on repeated attempts. Trim advice now describes deployed sails correctly when one sail is furled. Screenshot publishing requires an explicit version and verifies new images before replacing selected old frames.

- Fixed installed Sternik startup on SDK54: the packaged read-only HTML now uses a read-capable UTF-8 fallback when the SDK file reader incorrectly asks for write access. Retry reports a bounded failure stage while preserving course progress.

- Prepared the 1.7.0 store notes for the complete offline release and recorded the source, language, layout and storage verification. Native release and public publication still require their runtime gates.

- Basics and 3D anatomy now load from the installed sailing package with their diagrams and yacht available offline. Completed solo races save immediately without waiting for bots; late replies cannot replace another race result, and custom replays show their own course marks.

- Website deployment now checks all installed course packages and exercises radio layouts and offline practice against the production build before publishing.

- Installed Polish Sternik theory, question practice, mock exams and typed oral-answer checking for offline use, with progress migration and exam exit protection. Fixed SRC restoration so stale WebView data cannot replace saved progress or reappear after clearing data.

- Fixed native 3D top and bottom safe areas and retained cockpit utility tabs when hiding site navigation. Radio controls now stay above the home indicator.

- Adapted the complete SRC course, theory, question presentation, lessons and practice to seven languages. Native speech stays on-device with typed checking when a model is unavailable; web also supports local typed practice. The pinned radio and separate task panel preserve the controls, official English protocol wording and real learner progress.

- Prepared native candidate59 and aligned privacy/network descriptions in seven languages with local SRC speech, unavailable-model typed practice and the separate online sternik voice feature. No upload or submission is implied.

- Shared replay links now open the same 3D yacht with recorded sails, wind, exact timestamps and training penalties. Fixed first-load wheel hints, duplicated desktop controls and course/keyboard settings that did not match their labels.

- Unified the online race cockpit and wheel controls while retaining server-authoritative movement. Solo timing is identical at normal and slower display rates, Simple/Pro records are separate, and linked missions/daily races retain their declared conditions. Mode selection is fixed before starting; training penalties count toward time objectives.

- Unified the 3D trainer and race ocean, shore, yacht lighting and rendering backend, and added the same live Pro trim guidance with a separate hint toggle.

- Replaced the flat native solo entry with the shared local 3D race, durable offline history/replay/coaching, a protected cockpit, Simple/Pro controls and locally bundled Source Sans 3. Preserved old race records and saved control choices. Offline assets and release verification are still pending.

- Reserved trainer control space for settings and views, stabilized keyboard focus, and added optional water-route guidance with smoother shore rendering and correct sail deployment visuals.

- Added the shared model for manual Pro sheets, sail deployment, responsive solo steering, route advice and optional educational race rules with declared training penalties.

- Recorded the complete 2026-10-24 audit, selected ocean cockpit direction and ordered app/site completion harness. Implementation is in progress; this entry does not mean deployment.

- Added local device speech and on-device recognition for offline SRC practice, with a typed-answer fallback when a voice/model is absent. Race history now updates mounted screens after durable saves and includes declared training penalties. Native binary verification is still required.

- Тренажер рации SRC теперь на всех 7 языках сайта (решение владельца: процедуры радиосвязи - международный стандарт): сценарии, подсказки, «почему», ошибки, разбор, объяснения режима Rozbiór, пункты голосовой проверки и все кнопки. Радиофразы (MAYDAY, THIS IS, OVER) остаются английскими, как в эфире. Каждый прогон теперь проходит в случайной акватории: Гданьский залив, Солент (Англия), бухта Пальма (Майорка) или Бодрум (Турция), со своими береговой станцией, мариной, VTS, рабочими каналами и позициями; станции и каналы только проверенные (у Бодрума нет проверенного MMSI береговой станции, поэтому там только вызовы марины и сценарии без береговой станции). Голосовая проверка понимает позиции к западу от Гринвича и ждет станцию своей акватории. Теория, банк 324 вопросов UKE, шпаргалка, уроки Obsługa и живой разговор пока на польском (с русской помощью). В приложении тренажер идет на языке приложения, офлайн-курс пересобран и попадет к пользователям со следующей сборкой.
- Тренажер рации SRC: рация больше не уезжает при прокрутке задания. Сценарий, уроки «Obsługa» и живой разговор открываются на рабочем экране: рация закреплена сверху (на компьютере слева), а задание, подсказка, голосовой шаг, ситуация и журнал прокручиваются под ней; новый шаг сразу виден под рацией, последнее событие журнала (ошибка или «✓») показано рядом с заданием. На телефоне рация стала компактнее (те же кнопки не меньше 44 px, DISTRESS и PTT рядом), рабочий экран закрывает меню сайта, а в приложении на это время прячется заголовок «SRC Radio». Вкладок у раздела рации теперь четыре: Kurs, Teoria, Trening, Egzamin; меню «Więcej» (на телефоне оно открывалось за краем экрана) убрано. «Trening» стал одним списком: первые шаги, 19 сценариев по группам с номерами заданий UKE, голосовые упражнения, ссылки на 26 заданий и шпаргалку; режим Nauka / Egzamin выбирается один раз над списком, сценарий запускается одним нажатием. Офлайн-курс в приложении (`mobile/assets/radio-offline.html`) пересобран и попадет к пользователям со следующей сборкой; в нем же исправлены польские надписи без диакритики («Kurs zapisany na urządzeniu», «Głos online» и другие). Решение владельца: курс радио можно переводить на все 7 языков, следующим шагом тренажер со случайными акваториями по миру.
- Новая графика гонки, вертикальный срез (ADR-0008), пока только по ссылке `/game?view=3d&scene=next` и в 3D-гонке TestFlight-сборки 57: WebGPU (на iOS 26+ и в новых браузерах) с откатом на WebGL2, вода показывает ветер полосами, мелководье и пену у пляжа, белые следы за всеми лодками, тени под корпусами, сосны на берегу, камера сверху по умолчанию (наветренная сторона вверху, как на карте). С `?fps=1` видно бэкенд и частоту кадров. Обычная гонка на сайте не изменилась.
- Камера 3D-гонки теперь переключается и при `?camera=` в адресе (раньше роутер возвращал выбор назад).
- HUD гонки на телефоне: название курса («Бейдевинд», «Close-hauled», «Hoch am Wind») больше не обрезается, курс и целевая скорость стоят двумя строками.
- Новый HUD гонки на сайте: крупная скорость и полоса «сколько от возможного на этом курсе», компас ветра относительно лодки с сектором мертвой зоны, таблица мест с именами и временем. Короткие сообщения о событиях: сколько скорости стоил поворот, каким ты обошел знак и с каким отрывом, обгон или «тебя обошли».
- 3D-гонка: на воде у носа видна мертвая зона, над знаком метка с расстоянием, стрелка у края экрана показывает знак, когда он вне кадра; стартовая линия оранжевым пунктиром с судейским судном и пин-буем.
- Брифинг гонки в одну карточку: схема трассы, четыре шага и три коротких правила; расстояния в метрах одинаковые на карте, в 3D и в HUD (подойти к знаку на ~20 м).
- Гонка в приложении: соперники нарисованы лодками своего цвета с мачтой и гиком под ветер, а не треугольниками.

- Сложность гонки теперь настоящая: на «легком» соперники идут медленнее, на «сложном» почти без потерь (раньше от уровня зависело только их число). На сайте и в приложении; на стандартной трассе боты финишируют примерно за 98, 84 и 76 секунд.
- Меню гонки на сайте в общем стиле: без розового заголовка и зеленой кнопки, свои иконки вместо эмодзи, режим «Первая гонка» вместо «Учусь гоняю», без английских вставок в русском тексте.
- 3D-гонка: небо и туман одного цвета у горизонта (нет шва между водой и небом), склоны берегов с цветом скалы, солнечная дорожка на воде серебристая вместо белых пятен, соперники в своих цветах и с табличкой «место и имя» над мачтой.
- Гонка в приложении: компас ветра уходит в другой угол, когда лодка подходит к нему, подписи под штурвалами читаются на темном фоне, строка состояния парусов до старта не пустая.

- Гонка в 3D: на сайте в меню гонки и прямо во время гонки есть переключатель «Карта 2D» / «С лодки 3D». 3D показывает ту же гонку с воды: соперников (цветная метка над мачтой), знаки, линию старта и берег выбранной акватории; камера за кормой или сверху, мини-карта остается. В приложении это пункт «3D-гонка» в разделе «Гонка» (нужен интернет). Соперник, оказавшийся между камерой и твоей лодкой, не закрывает ее.
- Веб-гонка на телефоне: кнопка «Меню» больше не растягивается в высокую панель справа, звук и меню стоят под карточкой курса, указатель ветра под карточкой места и времени, мини-карта поднята над кнопкой поворота.

- Гонка в приложении: два режима в разделе «Гонка». «Простой»: паруса настраиваются сами, ты только рулишь. «Про»: гика-шкот и стаксель-шкот на тебе, как в тренажере, ползунками или штурвалами (выбор в Настройках, «Тренажеры»), под полем видно, тянет ли парус. Руль стал понятнее: коснись воды, куда плыть, и лодка повернет туда (раньше курс считался от центра экрана, а не от лодки); лодка игрока компактнее.
- Берег и острова теперь включаются и выключаются отдельным переключателем (раздел «Гонка» в приложении, меню гонки на сайте, панель «Вид» Лодки 3D); выключенный берег дает открытое море, выбранная акватория запоминается.
- Акватории регат: вокруг гонки и на горизонте Лодки 3D теперь настоящий берег. Гёджек (сосновые горы и острова Яссыджа, Терсане, Зейтинли), Сплит (Козьяк, Мосор, острова Брач, Шолта, Чиово, Хвар), Мазуры (лесные берега Снярдвы и острова), Солент (остров Уайт, Needles) или открытое море. Выбор в меню гонки на сайте, в разделе «Гонка» приложения и в панели «Вид» Лодки 3D. Берег только вокруг поля, физику не меняет; в гонке приложения лодки теперь упираются в берег залива, а не перескакивают через край экрана.
- Тексты приложения (ревью языковой адаптации, часть 2): нативные экраны и тексты App Store «Что нового» поправлены на 7 языках; в английском везде американское написание (practice, maneuver, center, harbor), в русском одна «мёртвая зона» вместо «неходовой»; запасной нативный тренажер называется «Упрощённый тренажёр», как кнопка, которая его открывает.
- Тексты на 7 языках (ревью языковой адаптации 2026-10-21, около 190 правок в уроках, тренажерах и меню): в русском больше нигде нет «гротшкота», только «гика-шкот»; тренажер в польском, испанском и итальянском больше не называется «тренером» (Trenażer, Trimado, Regolazione), названия трех тренажеров на всех языках сведены в `docs/design/SIMULATORS.md`; убраны символ многоточия и английские вставки в русском, поправлены неточные и дословные переводы, единые термины по глоссарию (испанский: winch и stopper; немецкие курсы к ветру; русское «право дороги»).
- Приложение, гонка: полоса показаний (курс, скорость, TWA, AWA, время) больше не лежит на лодке у линии старта, а стоит под полем гонки крупнее; поле занимает освободившуюся высоту.
- Тренажеры на телефоне: поверх лодки больше ничего не лежит. Плашка «Трим · курс · галс» в Тренажёре трима и ряды камер и ветра в Лодке 3D ушли со сцены: курс и галс (или режим 3D) стоят строкой над лодкой, показания под ней, а виды и камеры выезжают сбоку по кнопке «Вид» и уезжают после выбора. В Лодке 3D кнопки руления ‹ › переехали под сцену к показаниям, подсказка «?» снова открывается на телефоне. В режиме штурвалов под колесами больше нет пустой полосы, лодка стала крупнее. Горизонтально сцена занимает всю левую половину. Вид сверху в Тренажёре трима больше не дает ошибку гидратации в консоли.
- App Store (2026-10-21): версия 1.7.0 подготовлена со сборкой 50: «Что нового» на 8 локалях, заметки для ревью, гейт выпуска пройден (в том числе установка поверх 1.6.4 с сохранением прогресса). На ревью еще не отправлена.
- Сведены две линии 1.7.0: дизайн v3 с плиточной главной, разделами и учебными модулями (ветка Codex, сборки 45-47) и управление тренажерами (сборка 49). Сборка 49 вышла из `main` без дизайна v3, поэтому в ней главная снова выглядела по-старому; сборка 50 содержит все вместе и загружена в TestFlight (группа Self, 2026-10-20). После слияния в `main` сайт тоже получит дизайн v3 (новая главная и разделы).
- Тренажер трима на телефоне: если пришел из урока (наблюдение или самостоятельная проверка), док открывается на новой вкладке «Задание» с заданием и снастями грота, а не на «Избранном».

- Приложение 1.7.0 (сборка 49) в TestFlight, группа Self: управление тренажерами (закрепленная лодка, штурвалы, названия шкотов, раздел «Тренажеры» в Настройках, поворот экрана на тренажерах). В App Review не отправлено; учебных модулей из сборок 45-47 в ней нет.

- App Store (2026-10-19): ярлык App Privacy больше не говорит "Data Not Collected". Опубликовано "Data Not Linked to You" с шестью типами: взаимодействие с приложением, прочая диагностика и примерное местоположение (аналитика), игровой контент, прочий пользовательский контент и аудио (работа функций); ничего не используется для трекинга. Манифест приватности следующей сборки объявляет те же шесть типов, тест сверяет их с ярлыком.
- Один цветовой стиль во всех тренажерах. Небо 3D-сцены (Лодка 3D и 3D-вид Тренажёра трима) стало глубоким морским синим вместо бледного дневного, панели Тренажёра трима и Основ берут цвета из темы, а не из разовых оттенков, кнопки руля в 3D тоже. Полоса браузера на тренажерах темная, а переключатель темы там честно говорит, что тренажеры всегда в темной теме.
- Приложение (следующая сборка, 1.7.0): в Настройках новый раздел «Тренажеры» (ползунки или штурвалы, звук щелчков), выбор общий с веб-тренажерами внутри приложения; тренажеры можно повернуть горизонтально, остальное приложение остается вертикальным (модуль expo-screen-orientation, нужна новая сборка); в запасном нативном тренажере сцена закреплена, а ползунки называются «Гика-шкот» и «Стаксель-шкот» и показывают «0% выбран, 100% потравлен», как на сайте. В режиме «Штурвалы» запасной нативный тренажер тоже показывает штурвалы вместо ползунков шкотов: большой руль задает курс (оборот штурвала = 90 градусов), стаксель-шкот и гика-шкот по бокам (оборот = 25% шкота, по часовой выбирает), нажатый шкот встает в центр; VoiceOver шагает на 5 градусов и 5%, при «Уменьшении движения» штурвалы переставляются без анимации, щелчки звучат только при включенном звуке (модуль expo-audio, нужна новая сборка), вибрации нет.
- Тренажеры на телефоне: лодка всегда на экране. Сцена закреплена сверху, под ней показания и док управления с вкладками «Избранное, Паруса, Руль, Ветер, Ещё»; прокручивается только док. Так устроены Основы, Тренажёр трима и Лодка 3D, в браузере и в приложении. В шестеренке дока новый режим «Штурвалы»: большой руль по центру, стаксель-шкот и гика-шкот по бокам (нажми шкот, он встанет в центр), щелчки звуком при включенном звуке, по умолчанию остаются ползунки. В Тренажёре трима появилась опция руления пером, в Лодке 3D опция штурвала по курсу. На десктопе штурвалы встают в колонку управления. Футер сайта и кнопка отзывов спрятаны на всех тренажерах, а не только на одном.
- Тренажеры: каждый ярлык и каждая подсказка называет шкот. «Угол» в Тренажёре трима стал «Гика-шкот» и «Стаксель-шкот» со значением «61% (52°)»: насколько потравлен и угол паруса к ДП. Лодка 3D говорит «Срыв на гроте - потрави гика-шкот» вместо «потрави шкот». В уроках и анатомии одна форма «гика-шкот» вместо «гротшкот»; глоссарий перевода дополнен шкотами и каретками на 7 языках.
- Концепция управления тренажерами на согласование (лодка всегда на экране, лента ползунков, режим штурвалов, единые названия шкотов): `docs/design/trainer-controls-concept.md`, кликабельный прототип `docs/design/trainer-controls/prototype.html`. Код тренажеров не менялся.
- Отчет полного ревью 2026-10-19 и список действий для владельца: `docs/audits/2026-10-19-full-review.md`.
- Безопасность API, вторая волна (ревью 2026-10-19). Запросы, которые отклонил часовой или общий лимит, больше не списывают дневной бюджет ИИ. Сеть целиком (класс или клуб за одним роутером) получает 10 дневных бюджетов вместо 3, и при отказе по общей сети сообщение так и говорит. Приложение без cookie (iOS) больше не делит лимит с веб-пользователями на том же IP. Польские сообщения о лимитах снова с диакритикой. Реплеи меряются в байтах, хранятся только числовые поля сэмплов и короткие события, на весь сайт не больше 300 загрузок в час. `/api/daily` больше не отдает чужие `regatta_sid` и не создает строку на любую дату (только на сегодня плюс-минус день, неверная дата дает 400). Ник в `/api/player` сохраняется только для настоящей сессии и не чаще 20 раз в час. Обращения со страницы поддержки сохраняются в базе (видны в `/stats`) до отправки в Telegram и не теряются при его сбое, IPv6 усекается. `/api/feedback` больше не падает с ошибкой 500, если вместо строки пришло число. В мультиплеере кнопки «Создать лобби» и «Войти» неактивны, пока ник не подходит для лидерборда (минимум 2 буквы или цифры), а для старых клиентов сервер подставляет «Player». Комната, из которой хост выпал после добавления ботов, больше не остается без хоста. В логе ошибок сокета IP усечен.
- Приватность: страница /privacy (7 языков, она же адрес политики в App Store) и текст политики приложения теперь честно говорят, что собирается: AI-тренер и ассистенты работают на OpenAI (а не Anthropic); голосовые ответы в тренажере рации SRC и на тренировке устного экзамена sternik распознает OpenAI, запись не хранится; приложение шлет псевдонимную аналитику PostHog; перечислены сетевые запросы приложения, наши два cookie (псевдонимный regatta_sid и regatta_lang) и cookie Google Analytics, сообщения в поддержку; ссылка «Powered by Claude» убрана. Описание App Store на 8 языках исправлено (план 7 дней, число правил, названия тренажеров, ключевые слова en-GB и pl). В гейт релиза приложения добавлен G4b: ярлык App Privacy, манифест сборки, страница в App Store и тексты политики должны совпадать.
- Курсы sternik и SRC: офлайн-курс работает и на страницах, которые не открывались с сетью (сервис-воркер сохраняет и скрипты страниц, а предзагрузку курса просят только страницы /radio и /sternik, а не весь сайт); после «Dalej» фокус переходит на новый вопрос, польский текст курса помечен lang="pl", кнопки и ссылки дотянуты до 44 px, цвета категорий в светлой теме контрастнее; /start показывает уроки сразу, без «...»; хабы /sternik и /radio больше не грузят банки вопросов ради счетчиков; исправлены польские тексты (приветствие чата «Cześć!», «zapowiedz SECURITE», cz-195, moto-007, польские термины в 124 русских пояснениях, подписи голосового тренажера SRC, ключ устного вопроса 10); сообщение о лимите запросов показано на языке ученика; подпись ИИ-разбора гонки называет модель OpenAI.
- Приложение (следующая сборка): запрос оценки App Store больше не всплывает поверх тренажера или гонки после нажатия «Открыть» в уроке. Успехом теперь считаются первый сданный квиз урока, сохраненная проверка теории парусов, сданный пробный экзамен и место в тройке, но не последнее: на легкой трассе с двумя ботами третье место больше не считается. Переключатель «Анонимная аналитика» отключает и аналитику встроенных страниц сайта (вместе с правкой на сайте), PostHog больше не определяет город по IP, а «Удалить все данные» не включает аналитику обратно. Манифест приватности впервые попадает в сборку: раньше он лежал в настройках плагина, который его игнорирует, и сборки уходили с пустым списком собираемых данных. Запрос микрофона на 7 языках упоминает и устный экзамен sternik. В настройках честный список того, что уходит в сеть: превью YouTube, вопросы и данные гонки в OpenAI через наш сервер, ник в мультиплеере. Уязвимые пакеты сборки обновлены (критических 0), мертвый код старого мультиплеера удален.
- Сведение исправлений ревью (2026-10-19): `/api/replay` списывает общий часовой лимит сайта только за прошедшую проверку запись, так что поток мусорных запросов больше не может закрыть загрузку реплеев для всех; IPv6-клиенты в ключах лимитов группируются по сети /64. Офлайн-курс помечает предзагрузку выполненной, только если сохранились все страницы курса, иначе следующая страница курса пробует снова. В устном экзамене sternik ответ «śruba znosi jacht» снова засчитывается как эффект винта.
- CI, деплой и эксплуатация (аудит 2026-10-18). CI и деплой гоняют весь `npx vitest run` (списки папок молча пропускали 7 тестовых файлов), CI запускает тесты мультиплеера, деплой проверяет карту проекта. Джоба деплоя работает в GitHub environment `production`, ручной запуск больше не принимает произвольную ветку, все actions закреплены по SHA, `.github/dependabot.yml` раз в неделю предлагает обновления npm, базовых образов (без смены мажорной версии Node) и actions, без автомержа. Оба образа собираются из `node:22-alpine` по digest, код в веб-образе принадлежит root, приложение пишет только в `/data` и кеш Next. Корневой `docker-compose.yml` стал локальным проектом `regatta-local` и на VPS прод не пересоздает. `@anthropic-ai/sdk` переехал в devDependencies (`npm audit --omit=dev` = 0); заодно в прод-образ попал `@opentelemetry/api` 1.9.1, без зарегистрированного SDK трассировка Next остается пустой. Бэкап `scripts/backup-sqlite.sh` читает `/etc/default/regatta-backup` (выгрузка в S3 раньше не запускалась), падает, если S3 задан, а aws CLI нет, хранит копии 0600 в каталоге 0700, снимает копию внутри контейнера и забирает ее через stdout `docker exec`, так что root не трогает файлы, которые может подменить приложение, и принимает только файл с заголовком SQLite. Восстановление идет под локом деплоя через `mktemp` и `mv -T`. Удален скрипт apply-nginx-config.sh: он целил в хостовый nginx и старый домен, а nginx на vps2 живет в общем контейнере. Документация деплоя, отката и окружения теперь ведет в `ops/deploy/README.md`, а исторические `TECH.md`, `AUDIT.md`, `FEATURES.md`, `ROADMAP.md` и `MEMORY.md` помечены баннером "исторический снимок". Удалены неиспользуемые веб-компоненты, модель `Andryu_Yacht_v8.glb` и 15 скриншотов в корне, исходники Blender переехали в `assets/3d/` (прод-образ легче примерно на 5.6 МБ). Выбор языка (`/pl`, `?lang=`, cookie, Accept-Language) закреплен тестами. На сервере бэкап еще нужно установить, а environment `production` настроить: это шаги владельца.
- Аналитика `/stats` стала честнее (аудит 2026-10-18). У событий снова есть страна: модуль геолокации `fast-geoip` больше не вшивается в серверную сборку, где каждый поиск молча возвращал пустоту, а сборка теперь падает, если это повторится. Наши автотесты и безголовые браузеры (около половины всех просмотров страниц) больше не записываются ни в `/stats`, ни в GA4; Playwright без `BASE_URL` идет на localhost, а не на прод, и не создает на проде игроков `E2E_Tester_*`. Внутри приложения GA4 не загружается совсем, на сайте он работает как раньше. `/api/log` принимает не больше 120 событий в минуту на сессию и 360 на IP и отбрасывает ошибки расширений браузера. События `race.finish` и `coach.requested` и отзывы больше не хранят полный IP, только усеченный (в том числе для адресов вида `::ffff:1.2.3.4`), а список отзывов в админке не отдает в браузер IP и user agent. Новые плитки: визиты (разрыв 30 минут), медиана и p90 длины визита, страниц за визит, доля возвращающихся; Android с урезанным user agent показан как `Android (model hidden)`, а не `K`. Время на странице считается один раз на просмотр, только пока вкладка видна, и не больше 30 минут. Повторные экзамены, уроки и задания считаются все, а частые ошибки на странице больше не съедают их лимит. Сервис-воркер получает новую версию на каждой сборке без `GITHUB_SHA` (раньше сборки с разницей до 2,8 часа получали одну и ту же). Старые строки автотестов в базе остаются в `/stats`, пока владелец их не удалит.
- Приложение 1.6.4 (сборка 48): после трех успехов (пройден урок, сдан пробный экзамен, место в тройке в гонке) iOS может показать системный запрос оценки, не чаще раза в 120 дней (`mobile/src/review/review-prompt.ts`). Отзывов у приложения пока один, это главный провал по баллам ASO.
- App Store (2026-10-18): новая карточка на 8 локалях (добавлена en-GB). В названии теперь бренд плюс ключ ("Week to Regatta: Learn Sailing", польское "Żeglarstwo"), новые подзаголовки (в Польше "Testy sternik motorowodny, SRC"), ключевые слова без повторов, описания с курсами SRC и sternik, мультиплеером и ИИ-тренером, польский с диакритикой. Прежнее "No analytics" в описании противоречило политике приватности (анонимная аналитика PostHog есть), теперь текст честный. Рекламный текст уже виден в магазине; название, подзаголовок, ключи и описание лежат в черновике 1.6.4 и выйдут с ближайшей сборкой. Разбор: `docs/audits/2026-10-18-aso-and-code-audit.md`.
- Приложение (следующая сборка): App Store и настройки iOS покажут все 7 языков вместо одного английского (`CFBundleLocalizations`), запрос доступа к микрофону переведен на 7 языков, исправлены польские строки без диакритики на экранах курсов. Встроенные курсы дают микрофон без запроса только своему сайту, чужая страница получит обычный запрос.
- Безопасность: Next.js 16.2.11 -> 16.3.8 (закрыты уязвимости удаленного выполнения кода, одна из них в `next/og`, который отдает картинки результатов). `/api/log` отклоняет тело больше 16 КБ, обрезает строки и пишет в лог только разрешенные поля. WebSocket-сервер не принимает сообщения больше 4 КБ на уровне сокета (раньше буферизовал до 100 МБ) и больше не падает целиком от битого кадра от одного клиента: у сокета не было обработчика `error`. Из публичного репозитория убран старый пароль админки; CI-воркфлоу получили права только на чтение по умолчанию. Линтер больше не проверяет `mobile/` и скрипты Photoshop (ошибок 129 -> 12).
- Безопасность API (аудит 2026-10-18). Лимиты запросов и дневной потолок ИИ больше не обходятся новой cookie на каждый запрос: кроме сессии считается и IP клиента (на одном IP втрое больше, чем на сессию, чтобы класс или клуб за одним роутером не упирался). Заодно починен лимитер, который при любом лайке в галерее стирал часовые счетчики остальных роутов. ИИ-коуч приводит каждое поле лога гонки к числу, списку значений или короткой строке и не падает на мусорном теле. Админка проверяет пароль в каждом хендлере и на странице `/stats`, а не только в прокси. Лидерборд не принимает время быстрее 20 с и медленнее 2 ч, ник в результатах и реплеях чистится тем же фильтром, что в `/api/player`, у реплеев есть потолок размера событий и короткий код миссии. Сервер мультиплеера берет IP из последнего хопа X-Forwarded-For (первый подделывается) и создает не больше 500 комнат, 10 на один IP. Cookies `regatta_sid` и `regatta_lang` в проде помечены `Secure`.
- Аналитика показывает воронку: на сайте и на страницах сайта, встроенных в приложение, теперь считаются начатые и сданные пробные экзамены sternik и SRC (балл, сдан или нет), пройденные уроки (буткемп, паруса, теория радио), выполненные задания на симуляторе рации и клики по ссылке в App Store с меткой места (`ct=web_home`). Офлайн-курс радио SRC в приложении (его режим по умолчанию, открывается из локального файла `file://`) до `/api/log` не доходит: его уроки, задания и начатые экзамены в `/stats` не видны, а сданные экзамены попадают только в аналитику самого приложения (PostHog, событие `exam_finished`). Просмотры страниц внутри приложения помечены `client: app` и больше не выглядят как веб. В `/stats` новые панели: app или web, экзамены, уроки, клики App Store. `/api/log` принимает только известные имена событий и проверяет их поля, остальное молча отбрасывает.
- В приложении: событие `lesson_completed` (буткемп и паруса) наконец отправляется, результат экзамена из встроенной страницы приходит как `exam_finished` (в том числе из офлайн-курса радио). Политика конфиденциальности приложения описывает новые события; в манифесте приватности вместо «данных о сбоях» (приложение их не собирает) указаны «другие диагностические данные»: отчеты об ошибках скриптов встроенных страниц сайта. Появится в следующей сборке.
- Эксплуатация: сырые события и сессии хранятся 180 дней, их удаляет `scripts/prune-events.mjs` (сначала `--dry-run`); на сервере его еще нужно запустить вручную и поставить в cron, порядок в `docs/OPS.md`. Индекс `(evt, ts)` для запросов `/stats`, окно `/api/admin/stats-range` не шире 90 дней. Бэкап базы описан через `scripts/backup-sqlite.sh` (копия, принадлежащая root) вместо `cp`, а запасной путь скрипта больше не требует `sqlite3` в контейнере. Из `docs/OPS.md` убран записанный там пароль `/stats`: если он еще действует, его нужно сменить.
- Страница «Приватность» на сайте перечисляет учебные события и срок хранения 180 дней на 7 языках.
- Разделы sternik и радио (SRC) на сайте и во встроенных в приложение страницах снова пишут по-польски с диакритикой: «pytań ze źródeł», «próbny egzamin», «Uporczywe błędy», объяснения к вопросам sternik (около 220 вопросов), весь курс радиосвязи (теория, симулятор, диалоги, задания, шпаргалка) и устный экзамен. Менялись только диакритики, формулировки вопросов и id не трогали; английские радиофразы, ключевые слова оценщика речи (он сравнивает без диакритик) и аудио не затронуты. Новый тест `src/data/polishDiacritics.test.ts` не даст снятым диакритикам вернуться. Офлайн-копия радиокурса в приложении (`mobile/assets/radio-offline.html`) пересобрана и попадет к пользователям со следующей сборкой.
- Мобильный курс «С нуля»: восемь уроков сгруппированы в три модуля, у каждого цель и шаги «Разобраться», «Проверить себя», «Практика». Добавлены семь учебных схем с переключаемыми состояниями. Приложение помнит шаг и схему, возвращает из тренажера в урок и подтверждает результат проверки только после сохранения. Уроки поворотов ведут к конкретной практике. Подготовлена сборка 1.7.0 (47) для TestFlight; фактический статус в `docs/design/mobile/BUILDS.md`. Сайт этим выпуском не обновляется.

- Учебный путь парусов на сайте и в приложении: четыре раскрываемых модуля с иллюстрациями, временем и прогрессом; короткая цель каждого из 13 уроков; контрастная подложка схем. Шаг урока и вариант схемы сохраняются, из тренажера и Лодки 3D можно явно вернуться к своему уроку. Результаты опыта с гротшкотом, двух заданий по форме паруса и стенда лебедки сохраняются отдельно от теории. Ошибка чтения не позволяет затереть предыдущие оценки, ошибка записи оставляет повторную попытку. Новые подписи доступны на семи языках. Локальная доработка, не публикация сайта или App Store. Подробности: `docs/design/learning-modules-2026-10-15.md`.

- В приложении новый светлый дизайн v3 (ветка `design/v3`, пока не выпущен): теплая «бумага», синие чернила, один синий цвет действий, фото регат в шапке главной. Пятая вкладка теперь «Меню» со всеми разделами, поиском и блоком «Мой прогресс» (справочные материалы стали его группой, старые ссылки на справочник ведут туда же). Главная продолжает последний курс, в котором был ученик (С нуля, паруса, радио SRC или моторный), и обновляется после возврата из урока. Урок считается пройденным только после сданной проверки (от 70% верных ответов): раньше его засчитывало уже открытие практики, такие старые отметки сохранены и показываются как «просмотрен». Круг курсов относительно ветра перекрашен под светлый фон: лодки и подписи снова читаются. Симуляторы, гонка и реплей остаются темными. Кнопка «Назад» везде компактная (стрелка), подписи вкладок не ломаются при крупном шрифте. Прогресс больше не теряется: открытие урока до чтения сохранений не стирает старые отметки, результат проверки сразу виден в списке уроков после возврата, а оглавление курса парусов не сбрасывает незаконченный урок. Результат проверки урока записывается сразу, как только она закончена (раньше экран писал «засчитан», но сохранял только после дополнительной кнопки, и «Назад» его терял). Меню открывается сразу разделами, «Мой прогресс» свернут в конце. Оглавление курса парусов предлагает тот же урок, что и главная. На круге курсов деления и подписи контрастнее и не перекрываются лодками и кольцом. При очень крупном шрифте заголовки и метки «Нужен интернет» больше не рвутся посреди слова. Подписи галсов под кругом курсов стояли наоборот: теперь слева правый галс, справа левый (ветер сверху, лодка слева идет влево и получает ветер в правый борт); ошибка была и в прежних версиях. В меню, «Обучении», «Практике» и «Гонке» текст при прокрутке больше не заезжает под часы и значки системной строки. Два урока получили новую учебную графику по шаблону «цель, картинка, объяснение, частая ошибка, проверка, практика»: «Ветер и направление» (схема с тремя положениями ветра: с носа, с правого борта, с кормы, с легендой и объяснением, откуда ветер приходит и куда движется воздух) и «Какая снасть что меняет» (иллюстрация паруса, гика и мачты с отметками, списком деталей и крупным планом, затем схема фала, гротшкота и оттяжки в разделе «Как это работает»). Остальные уроки пока в прежнем виде. Сайт не менялся.
- В ветку влита работа, которая с 2026-09-21 лежала незакоммиченной в основной копии: урок 13 «Лебедка и стопор» с учебным стендом (шлаги, стопор, ходовой конец, проверка передачи нагрузки; нагрузки не показываются, стенд не оценивает), уроки курса парусов разбиты на шаги «Разобраться», «Проверить себя», «На лодке» (шаги не засчитывают урок), программа курса сгруппирована по модулям, у каждого урока есть свернутый список терминов, в Тренажере отдельные вкладки камеры, условий, управления и сессии и независимая проверка настройки (скрутка и глубина при другом ветре, результат только в сессии). На сайте: меню-каталог вместо «Справочника», страница /menu, внутренняя витрина /design-v3 и иллюстрация на главной. В приложении сохранены главная, «Меню» и закладка v3: старые версии этих экранов из основной копии не переносились.
- Приложение 1.7.0 (сборка 45) с этим дизайном и двумя уроками с новой графикой выложено в TestFlight для внутренней группы Self. В App Store на ревью не отправлено; в продаже по-прежнему 1.6.2, на ревью 1.6.3.
- Сборка 46 (1.7.0) в TestFlight Self: то же плюс урок 13 «Лебедка и стопор» со стендом, шаги уроков, модули программы и проверка настройки в Тренажере. В App Store на ревью не отправлена.
- Приложение получит следующей сборкой то, что на сайте работает с 2026-09-28: раздел «Повороты» на экране «Курсы», 6 новых уроков курса «Работа с парусами» (фал, проводка стакселя, риф, щель между парусами, колдунчики, «Доктор трима»), адаптированные переводы и польский с диакритикой, автопилот ботов, который доходит до финиша, и исправления ниже.
- В приложении: даты в истории гонок на языке приложения (было «12 May» во всех языках), экран ошибки без «стека в dev-консоли», в настройках и галерее везде «ты», исправлены окончания («Сохранено гонок: 3»). На сайте плашка гонки больше не показывает внутренний адрес «/simulator-v3» и честно говорит, что упрощено (паруса настраиваются сами, руль упрощен).
- В приложении испанское предупреждение чек-листа о гике говорило «кнопка» (El botón) вместо «гик» (la botavara): ручная копия чек-листа разошлась с сайтом. Исправлено, и копия больше не ручная: `npm run sync-content` собирает ее из `src/data/checklist.ts`, а CI падает, если она отстала.
- В приложении на экране «Курсы» появился тот же раздел «Повороты», что на сайте: оверштаг и фордевинд как процедуры с командами, шагами с числами, частыми ошибками и врезкой про румпель и штурвал, со ссылкой на чек-лист. Данные берутся из синхронизированных `maneuvers`, тексты совпадают с сайтом на 7 языках; на других языках под названием каждого поворота стоит английское (Tacking, Jibing / Gybing). Появится в следующей сборке.

Незакрытый долг (перенесено из `ROADMAP.md`):

- Phase 3 (перевести `/game` на `src/lib/sailing-physics`) по сути закрыта
  2026-09-07 (`32b63d7`): скорость и дрейф в гонке считает общий движок. В
  `src/lib/race-physics.ts` остался гоночный слой (руль, ворота, автопилот,
  столкновения); удалять файл не нужно.
- Кандидаты Phase 4 (не приняты): динамика руля, динамическая форма паруса,
  волны и течение в сцене, модель порывов в движке, третий парус (Code 0),
  логбук и задачи дня, механика шеринга результатов.
- Мультиплеер: лимит сообщений считается на соединение, а не суммарно по IP
  (нужен глобальный бакет), см. `STRESS-REPORT.md`.

## 1.7.0 (iOS build 65) - TestFlight2026-10-26

- Постоянные мини-карта справа и истинный ветер слева от3D сцены; нажатие
  открывает полный обзор, видимость карты сохраняется после перезапуска.
- Реальное native G2 обнаружило отпускание16/C снаружи; исправление сохраняет
  канал и пишет одну локальную отмену. Tap/hold и вращение DIAL сохранены.
- Exactb0e5868/tagtestflight-1.7.0-65 доступен в Self: независимые GET11:46:55UTC
  подтвердили VALID/IN_BETA_TESTING и8совпадающих заметок. Upgrade26.5 и
  clean27,72browser first-pass и package gates пройдены. Все65пунктов продукта,
  физические трассы, native PB durability и итоговый сайт/MP gate не закрыты.
  [Приемка65](docs/audits/2026-10-26/acceptance65.md).

## 1.6.4 (iOS build 48) - отправлена на ревью 2026-10-18

В сборку вошли строки про приложение из `Unreleased` выше: новая карточка App Store, языки в Info.plist, запрос отзыва, раздел "Повороты", 6 уроков по парусам, боты до финиша, польский с диакритикой. Плюс заголовок страницы для iOS 27 (рендер яхты в Blender) на всех 8 локалях. Журнал: `docs/design/mobile/BUILDS.md`.

## 1.6.3 (iOS build 44) - 2026-09-28

- Приложение снова открывается на iPhone с iOS 27: включен жизненный цикл UIScene, которого iOS 27 требует от приложений, собранных на новом SDK (плагин `mobile/plugins/with-uiscene.js`; сценарий, ссылки `regatta://` и офлайн-тренажер проверены на iOS 27 и 26.5). Контент тот же, что в 1.6.2. Отправлено на ревью Apple.
- Найдено: приложение 1.6.2 из App Store не открывается на iPhone с iOS 27, закрывается сразу после запуска. Сборку 43 собрал Xcode 27, а приложения на SDK iOS 27 обязаны запускаться через UIScene, которого в Expo SDK 54 нет. На iOS 26 и старше все работает. Разбор и варианты починки в `docs/design/mobile/BUILDS.md`; в гейт релиза добавлен запуск релизной сборки на самой новой iOS.

## Веб-релиз 2026-09-28: карта проекта, книги, автопилот, локализация (#56)

- Все переводы сайта и приложения выверены и адаптированы по смыслу, а не переведены слово в слово: около 2700 польских строк переписаны нормальным польским с диакритикой, испанский, французский, немецкий, итальянский и английский вычитаны по словарю терминов. Курсы по радио и sternik motorowodny не трогали: только польский, как в официальных материалах.
- Дописаны недостающие переводы. Гонка и мультиплеер показывали испанцам, французам, немцам и итальянцам английский (174 строки), теперь у них свой язык; у локального коуча гонки появились тексты на этих языках, в Основах переведены 16 подписей, на схемах приложения 11 английских подписей (UPWIND, NO-GO и другие).
- Исправлены переводы, которые учили неправильному. Примеры: в испанском, французском, немецком и итальянском определение нижнего знака описывало верхний; испанская карточка правил говорила яхте на левом галсе, что у нее право прохода; в итальянском левентик назывался «лечь в дрейф»; на карте гонки испанцы, французы, немцы и итальянцы видели русское «Верхний знак»; немецкий гик был гафелем, испанский кнопкой; ползунок стакселя в английском и польском был подписан наоборот (свернуто вместо развернуто).
- Исправлены ошибки русского исходного текста, найденные при переводе: место у знака (решает связка в момент входа первой яхты в зону, правило 18.2(b)); совет по сдвигам ветра (поворачивать на заходе); самый быстрый курс в викторине (галфвинд, как считает движок); штраф за касание знака (один оборот, правило 44.1); ограничение правила 17 при обгоне; огни при пересечении курсов; правило 18(b)(iii) МППСС для рыболовного судна; звуковые сигналы (правило 34, суда видят друг друга); отворот при расхождении не 10-15°, а решительно, от 30° (правило 8); признак срыва потока (падают подветренные колдунчики, а не «полощут флаги»); киль не дает крен, а сопротивляется ему; в «Жизни на борту» экипаж переходит на новый борт, когда нос проходит линию ветра, а не заранее.
- Страница поддержки больше не утверждает, что приложение не собирает данных: теперь она повторяет политику конфиденциальности (анонимная аналитика, ее можно выключить). На странице правил банк sternik назван правильно: 879 вопросов, а не 148.
- Длинные заголовки карточек правил, разделов «Жизни на борту» и уроков буткемпа на телефоне переносятся на вторую строку, а не обрезаются многоточием (обрезались даже по-русски).
- Польский теперь пишется с диакритикой (ą, ę, ł, ż и другие), как пишут поляки: прежнее правило «польский без диакритики» отменено по решению владельца. Эталонный словарь терминов `scripts/sailing-glossary.md` переписан с правильным написанием на всех языках, и в нем исправлены ошибки, которые переводчик разносил по сайту: испанский гик был «кнопкой» (boton вместо botavara), курсы к ветру во французском, испанском и итальянском назывались неверно, по-польски курс «левентик» называется «łopot». Курсы по радио и sternik motorowodny остаются только на польском, в формулировках официальных материалов.
- Урок «Доктор трима»: против тяжелого наветренного руля теперь сначала риф на гроте, а генуя только после него. Раньше урок, его вопрос и подпись схемы руля ставили «риф грота или часть генуи» на равных, но уборка генуи сдвигает центр парусности назад и утяжеляет руль. Так же читает книгу разбор Дедекама (D4-36: увеличить отношение стакселя к гроту).
- В немецком описании лавировки (стратегия «против ветра» на странице гонок и в приложении) стояло «kreuzen - in Halsen», то есть лавировать поворотами фордевинд. Теперь «in Kreuzschlägen». Эту ошибку того же рода, что чинили в глоссарии, пропустили в прошлый раз.
- Сканер кириллицы `scripts/cyrillic-scan.mjs` проверяет и курс «Работа с парусами»: `/learn`, `/learn/sails` и каждый урок, список уроков он берет со страницы курса.
- Столкновения лодок: скорость теперь теряют только лодки, которые сближаются, полностью при сближении от 1 узла. Касание бортами и расходящиеся лодки только расталкиваются. Для игроков это заметно: задеть соседа больше не значит затормозить, таран по-прежнему наказывается. Финишировавшая лодка выбывает из столкновений и не загораживает линию финиша следующим. Раньше две лодки, сцепившиеся бортами, могли встать навсегда на 0,1-0,2 узла, а носом к ветру без шанса тронуться. Во флотах от 2 до 8 ботов до серверной отсечки 300 с финишируют 96,5% вместо 80%, медиана 122 с вместо 144. Подробности: `DECISIONS.md` ADR-0004.
- Полный режим сокетного теста мультиплеера (`node scripts/test-multiplayer.mjs --full`) ведет двух яхтсменов тем же автопилотом, что и ботов. Раньше они гнались за подсказкой старой логикой, и в большинстве прогонов один не доезжал до финиша.
- Боты теперь доходят до финиша. Старый автопилот гнался за точками ближе собственного круга разворота: на гоночной скорости лодка разворачивается шире ворот у знака, поэтому часть ботов промахивалась, а потом «восьмерила» на попутном курсе или кружила под стартовой линией. Новый ведет лодку по петлям, построенным от самой дистанции: к знаку поднимается по коридору и перед ним гасит ход, чтобы разворот уложился в ворота, а при промахе просто идет еще на один круг. Из всех 19 стартовых мест сервера финишируют все, вовремя и после фальстарта (было 16 и 11); из 120 разных стартов все (было 66). Медиана гонки 82 с вместо 162. На заходах ветра и в сильный ветер в 3950 одиночных гонках ни одного схода и ни одной гонки дольше серверной отсечки 300 с (самая долгая 162 с). Во флотах от 2 до 8 ботов со старыми столкновениями и отсечкой 300 с финишировали 80% вместо 45%; вместе с правкой столкновений (строка выше) 96,5%. Время ботов в мобильном приложении не изменилось. Подробности и замеры: `DECISIONS.md` ADR-0003.
- Реванш в мультиплеере: сервер пересобирал ботов слиянием нового места старта со старым объектом, и у бота оставались `started`, `roundPhase` и `finishTime` прошлой гонки. Во втором заезде бот считался уже стартовавшим и прошедшим двое ворот из трех. Теперь ботам к новой гонке создаются свежие объекты, как игрокам.
- На странице «Курсы» появился раздел «Повороты»: оверштаг и фордевинд как процедуры для рулевого и шкотового по книге Даса и фон Краузе. Команды в формулировках проекта, шаги с числами (руль около 30 градусов; на лебедке 1 шлаг в слабый ветер и 2-3 в сильный; 3-4 шлага под ручку; 2 шлага на новом стаксель-шкоте перед фордевиндом), частые ошибки и врезка «румпель от себя - привестись, на себя - увалиться». Чек-лист больше не утверждает, что у обоих поворотов одинаковая работа экипажа: в фордевинд грот выбирают до поворота, а стаксель переносят после. У разделов чек-листа появились якоря, уроки буткемпа про повороты открывают сразу нужный раздел. Все на 7 языках.
- Исправлены переводы поворотов: в испанском и итальянском «Жизни на борту» фордевинд был описан словом для оверштага, в немецком исполнительной командой оверштага стояло «Wende» вместо «Ree», а фордевинд был описан как «Wende über das Heck» (теперь команда «Rund achtern»), в буткемпе испанский гик назывался «boton» (пуговица). В глоссарии итальянский галфвинд был записан по-немецки («Halbwind»), теперь «Traverso».
- На странице «Курсы» пропала ошибка гидрации: сервер и браузер расходились в последнем знаке синуса в координатах иконок яхт, теперь координаты округляются.
- «Жизнь на борту» получила четыре раздела по книгам «Маневры под парусами» и RYA: выход из гавани по шагам, возвращение и уборка парусов, куда швартуются (борт о борт, понтон, короткий бон, бокс, кормой на муринге) и «Газ, пары и пожар». Советы по газу и тушению согласованы с экзаменационным банком sternik: сначала вентиль на баллоне, в моторный отсек через щель. В чек-листе появился раздел «Яхта готова к выходу» - что проверить на палубе у причала. Все на 7 языках, мобильные копии обновлены, чат-помощник знает о новых темах.
- Курс «Работа с парусами» вырос с 6 до 12 уроков по книгам Дедекама, Даса и фон Краузе: колдунчики, фал и положение пуза, каретка стаксель-шкота и метод кулаков, щель между гротом и генуей, доктор трима (угол руля как прибор: 3-5 градусов, больше 8 - уменьшай паруса) и рифление по шагам. У каждого урока своя схема, и в ней вычисляется то, о чем урок: какой колдунчик срывается, где продолжение шкота встречает переднюю шкаторину, ширина щели, зона угла руля, порядок фаз рифления. Все на 7 языках; уроки добавлены в конец, сохраненный прогресс не сдвигается. Мобильное приложение получит их при следующей сборке.
- Физика: дрейф на острых курсах больше не упирается в искусственное ограничение 12 градусов при любом ветре. Теперь он 3-5 градусов при нормальном крене, растет, когда лодку перекренивает, и почти пропадает на полных курсах, как описано у Дедекама. Киль теряет сцепление с креном, поэтому перегруженная лодка снова скользит под ветер и рифы снова окупаются. Скорости яхты остались в пределах 2% от прежних, так что время гонок, миссии и рекорды не сдвигаются. Решение и числа: `DECISIONS.md` ADR-0002.
- Правка дрейфа сама по себе подняла долю финишей ботов из реальных стартовых позиций сервера до 16 из 19 (было 15), после фальстарта до 11 из 19 (было 6). Остальные застревали у наветренного знака; это исправлено новым автопилотом, строка выше.
- Глоссарий учил неверному в испанском, французском, немецком и итальянском: "уваливание" было подписано словом для поворота фордевинд, "приведение" описано как поворот оверштаг, "лечь в дрейф" названо словом для сноса, "левентик" словом для дрейфа, румпель назван рулем, а испанская передняя шкаторина словом для задней. Немецкое описание лавировки говорило, что галсы меняют поворотами фордевинд. Исправлено во всех языках, определения приведения и уваливания теперь прямо говорят, что галс не меняется. Причина была в справочнике переводчика `scripts/sailing-glossary.md`: там левентик был записан как "in panna" / "en facha" (это лечь в дрейф), а строк для привестись, увалиться и лечь в дрейф не было вовсе, поэтому исправлен и он.
- В определении "лечь в дрейф" румпель был положен на ветер. Правильно под ветер (штурвал на ветер): вынесенный стаксель уваливает нос, руль должен его приводить. Это исправление не из книг, а по стандартной методике RYA.
- Появился разбор трех книг (Дедекам «Настройка парусов и такелажа», Дас и фон
  Краузе «Маневры под парусами», RYA Day Skipper) для проекта:
  `docs/design/books-audit-2026-09-26.md`. Бэклог по трем волнам, сводная таблица
  чисел и допусков (матрица трима, настройка такелажа, пороги крена и руля, Бофорт),
  отклоненные предложения с причинами, цена перевода. Код не менялся.
- Добавлена карта проекта для агентов: `AGENTS.md` (точка входа),
  `ARCHITECTURE.md` (карта кода и потоков), этот файл. `CLAUDE.md` теперь
  импортирует `AGENTS.md`, чтобы Claude, Codex и другие модели читали одни и те
  же правила.
- Гейт `npm run check:map` проверяет карту: `CLAUDE.md` импортирует `AGENTS.md`,
  все упомянутые пути существуют, у каждого файла из `src`, `scripts`,
  `ws-server`, `ops`, `e2e` есть строка в карте кода, в карту не утек секрет.
  Подключен в CI шагом "Project map is current".
- Гейт типографики теперь покрывает весь репозиторий: к `src`, `docs`, `scripts`,
  `.githooks` добавлены `.github`, `mobile`, `ws-server`, `e2e`, `ops` и корневые
  документы (`AGENTS.md`, `ARCHITECTURE.md`, `DECISIONS.md` и другие). Раньше тире
  в приложении или в ADR ловил только локальный хук, а в CI они проходили.
- Починен job "Mobile (twins + lint + typecheck + tests)": он ставил только
  зависимости `mobile/`, а скрипты сборки офлайн-бандлов импортируют `esbuild`
  из корневого `package.json` и падали с ERR_MODULE_NOT_FOUND. CI не запускается
  на пушах в `main`, поэтому поломка была не видна до первого pull request.
- В карте зафиксированы фактические числа вместо старых: `npm run test:physics`
  = 58 тестов, весь `npx vitest run` = 434, `npx playwright test` = 16.

## 1.6.2 (iOS build 43) - 2026-09-17

- Офлайн-уроки по парусам, управление ригом и новая навигация в приложении.
- Проверка бандла офлайн-контента против исходников сайта включена в CI.
- Бюджет времени программного WebGL в smoke-проверке камер.
- Статус сборки: VALID и WAITING_FOR_REVIEW, релиз автоматически после
  одобрения.
- Подробности: `docs/design/sailing-release43-2026-09-17.md`,
  `docs/design/mobile/BUILDS.md`.

## Веб-релиз 42: навигация и 3D-паруса - 2026-09-08

- Пять разделов оболочки (Home, Learn, Practice, Race, Library) на вебе и в
  приложении, каталог маршрутов вынесен в `src/lib/product/catalog.ts`.
- Паруса в 3D реагируют на ветер, добавлены камеры осмотра, исправлены стороны
  парусов и автоматические перекладки.
- Подробности: `docs/design/navigation-redesign-2026-09-08.md`,
  `docs/design/sail-transfer-2026-09-08.md`.

## Веб-релиз 40-41: яхта из Blender - 2026-09-08

- Новая учебная модель яхты, согласованная с анатомией, исправлена обратная
  связь тренажера, подписи не перекрывают ветер на телефонах.
- Подробности: `docs/design/blender-sailing-update-2026-09-08.md`.

## Веб-релиз 37-39 и iOS 1.6.1 - 2026-09-07

- Единая модель сил для тренажеров и гонки, общий 3D-рендер для веба и iOS.
- Исправлены площади парусов, рифление и крен, убрана ветровая тень от
  опущенного грота.
- Радиокурс SRC: исправлены процедуры и пробные экзамены.
- Гонка: управление на планшетах, объяснение дистанции всем игрокам.
- Подробности: `docs/design/3d-release-2026-09-07.md`,
  `docs/design/sailing-release37-2026-09-07.md`,
  `docs/design/radio-course-audit-2026-09-07.md`,
  `docs/design/ux-multiplayer-2026-09-07.md`.

## Радиокурс и офлайн - 2026-07-22 .. 2026-07-30

- Полный симулятор теории SRC, конспект по всем 324 вопросам UKE, офлайн-курс.
- Локализованная картинка для шеринга (была всегда русская).
- Мобильный CI: свои lint, typecheck и тесты.

## Ранняя история

- 2026-04-18 .. 2026-04-25: физический движок (ADR-0001), новый `/simulator` на
  движке, расширенная аналитика (страны, устройства, utm, время на странице).
- 2026-05-24: приватность и защита от злоупотреблений (усечение IP,
  allow-list `meta`, лимиты `/api/race-result`, константное сравнение в
  basic-auth `/stats`).
- 2026-07-05: удалена гоночная сборка src/features/simulator-v2 (`be43938`).
- Более ранние волны и подробности: `MEMORY.md`, `FEATURES.md`, `docs/design/`.
