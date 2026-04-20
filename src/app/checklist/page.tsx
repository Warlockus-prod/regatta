'use client';

import { useI18n } from '@/lib/i18n';

// ============================================================================
// CHECKLIST (/checklist) - reference page for beginners stepping on a yacht.
//
// Per user request (2026-04-20): this is NOT an interactive checkbox form
// anymore. It's a reading reference: sections with practical advice on what
// to do, who to listen to, what's on the boat, what to bring. Same aesthetic
// as /onboard - all sections open by default so the first scroll is the full
// picture.
//
// Content owner: this is the single page a first-time regatta crew member
// should read once before they step on the boat. It does not try to make
// them a sailor, it tries to make them useful and not in the way.
// ============================================================================

interface Section {
  id: string;
  icon: string;
  titleRu: string;
  titleEn: string;
  introRu?: string;
  introEn?: string;
  itemsRu: string[];
  itemsEn: string[];
  warningRu?: string;
  warningEn?: string;
}

const SECTIONS: Section[] = [
  {
    id: 'who-to-listen',
    icon: '👂',
    titleRu: 'Кого слушать и как себя вести',
    titleEn: 'Who to listen to and how to behave',
    introRu: 'На яхте всегда есть один главный: шкипер. Даже если кто-то крутой рядом стоит, решения принимает шкипер. Твоя задача - сделать то, что он сказал, быстро и тихо.',
    introEn: 'There is one captain on a yacht: the skipper. Even if a more experienced sailor is standing next to you, decisions come from the skipper. Your job is to do what he said, fast and quietly.',
    itemsRu: [
      'Шкипер - главный. Его слово финальное',
      'Боцман (первый помощник) - рулит палубой и парусами, после шкипера его слушаем',
      'Тактик на гонках - подсказывает курс, но команды всё равно даёт шкипер',
      'Подтверждай вслух "принял" или "готов" - шкипер должен знать что ты услышал',
      'Если не понял команду - переспроси сразу, не через 5 секунд',
      'Не кричи "всё плохо" - скажи коротко что видишь: "гик идёт", "человек за бортом", "порвало"',
      'На гонке и швартовке - минимум болтовни. Шкипер должен слышать ветер и команды',
      'Если тебе кажется что ошибка - скажи один раз спокойно шкиперу, не спорь при всех',
    ],
    itemsEn: [
      'Skipper is in charge. His word is final',
      'Bowman / first mate runs the deck and sails; listen to him second',
      'Tactician on races suggests the course, but commands still come from the skipper',
      'Acknowledge verbally ("got it" / "ready") - skipper needs to know you heard',
      'If you did not understand a command, ask immediately, not 5 seconds later',
      'Do not shout "everything is bad". Say what you see: "boom coming", "man overboard", "sail ripped"',
      'During the start and docking - minimum chatter. Skipper must hear the wind and commands',
      'If you think there is a mistake, tell the skipper once calmly, do not argue in front of everyone',
    ],
  },
  {
    id: 'first-10-min',
    icon: '🗺️',
    titleRu: 'Первые 10 минут на борту',
    titleEn: 'First 10 minutes on board',
    introRu: 'Зашёл на лодку - не стой. Сразу найди несколько важных вещей сам, без напоминаний. Это сэкономит всем время.',
    introEn: 'Once you step on, do not just stand there. Find a few key things yourself without being told. It saves everyone time.',
    itemsRu: [
      'Найди свой спасжилет, примерь, подтяни лямки',
      'Запомни где запасные спасжилеты и спасательная "подкова" для "человек за бортом"',
      'Найди аптечку и огнетушитель (спроси шкипера)',
      'Главный выключатель батарей и газовый кран - знать где, на случай пожара',
      'VHF канал яхты и как вызывать экстренную помощь',
      'Гальюн (туалет) - как сливать (кингстоны важны!)',
      'Брось вещи в каюту, ничего не оставляй на палубе',
      'Переобуйся в палубную обувь (белая подошва) или босиком',
    ],
    itemsEn: [
      'Find your lifejacket, try it on, adjust straps',
      'Note the spare lifejackets and the MOB horseshoe',
      'First-aid kit and fire extinguisher - ask skipper',
      'Main battery switch and gas valve - in case of fire',
      'Yacht VHF channel and how to call emergency',
      'Head (toilet) - how to flush, through-hull valves matter',
      'Stash your gear in the cabin, nothing loose on deck',
      'Change into deck shoes (white sole) or go barefoot',
    ],
  },
  {
    id: 'parts',
    icon: '⚙️',
    titleRu: 'Что есть на яхте и как работает',
    titleEn: 'What is on the yacht and how it works',
    introRu: 'Не обязательно знать всё. Но если шкипер говорит "выбери стаксель-шкот левого борта" - надо понимать где шкот, где стаксель, где левый борт. Вот минимум.',
    introEn: 'You do not need to know everything. But when the skipper says "trim the port jib sheet", you need to know where each of those things is. Here is the minimum.',
    itemsRu: [
      'Мачта - вертикальная труба. Не опирайся, внутри идут фалы',
      'Гик - горизонтальная труба в основании грота. При повороте летит через палубу. Голова всегда ниже',
      'Грот - большой парус от мачты назад. Регулируется гика-шкотом',
      'Стаксель или генуя - передний парус. Два шкота: один рабочий, второй с другого борта',
      'Шкот - верёвка которая тянет парус. Шкоты грота и стакселя разные',
      'Фал - верёвка которая поднимает парус. Идёт вверх по мачте',
      'Лебёдка (винч) - цилиндр на палубе. Шкот кладут на неё и крутят рукояткой',
      'Утка или клампа - рогатая штука, на которую фиксируется верёвка восьмёркой',
      'Штурвал или румпель - управление. На больших яхтах штурвал, на малых румпель',
      'Стопор (клямс) - держит фал/шкот без лебёдки. Открыл - верёвка пошла свободно',
      'Ванты и штаги - тросы которые держат мачту. Трогать нельзя',
      'Нос лодки - перед. Корма - зад. Левый борт (port) - красный. Правый (starboard) - зелёный',
      'Ветер ВСЕГДА откуда-то. "С какого галса" = "с какой стороны тебе дует"',
    ],
    itemsEn: [
      'Mast - vertical pole. Do not lean on it, halyards run inside',
      'Boom - horizontal pole at the foot of the main. Swings across during a maneuver. Head always below',
      'Main - big sail from the mast aft. Controlled by the main sheet',
      'Jib or genoa - forward sail. Two sheets, one working, the other on the opposite side',
      'Sheet - the line that pulls a sail in. Main and jib sheets are different',
      'Halyard - the line that hoists a sail. Runs up the mast',
      'Winch - cylinder on deck. Sheet wraps around it and you crank the handle',
      'Cleat - horned fitting. Rope gets figure-8-ed onto it to hold',
      'Wheel or tiller - steering. Big boats have a wheel, small ones a tiller',
      'Clutch / jammer - holds a halyard or sheet without the winch. Pop open to release',
      'Shrouds and stays - wires holding the mast up. Do not touch',
      'Bow - front. Stern - back. Port - left (red). Starboard - right (green)',
      'Wind always comes from somewhere. "Tack" = which side the wind hits you',
    ],
    warningRu: 'Гик - главная опасность на яхте. Он быстрый и тяжёлый. Перед любым поворотом голова ВСЕГДА ниже гика.',
    warningEn: 'The boom is the main danger on a yacht. Fast and heavy. Before any maneuver, head ALWAYS below the boom.',
  },
  {
    id: 'maneuvers',
    icon: '🎯',
    titleRu: 'Как проходят повороты и что ты делаешь',
    titleEn: 'How tacks happen and what you do',
    introRu: 'Поворот = момент когда лодка меняет сторону, с которой дует ветер. Два вида: оверштаг (через ветер) и фордевинд (под ветер). Последовательность у обоих одинаковая по "хореографии" экипажа.',
    introEn: 'A maneuver is the moment the boat changes which side the wind comes from. Two kinds: tack (through the wind) and jibe (downwind). The crew choreography is the same in both.',
    itemsRu: [
      'Шкипер говорит "готовимся к повороту" (ready about) - встань на своё место',
      'Ответь "готов" ВСЛУХ - шкипер не читает мысли',
      'Шкипер говорит "поворот" (tacking / jibing) - теперь делаем движение',
      'Работающий шкот отпускается (старая сторона)',
      'Новый шкот подтягивается на лебёдку (новая сторона)',
      'При оверштаге голова ниже гика, но гик летит через палубу с СРЕДНЕЙ скоростью',
      'При фордевинде голова ниже гика ОБЯЗАТЕЛЬНО - он летит очень быстро и сильно',
      'После поворота убери хвост шкота из-под ног, намотай на утку или в бухту',
      'Не вставай на шкот ногой, не зажимай его об ногу',
      'Если что-то пошло не так - "СТОП" громко. Шкипер сам решит что делать',
    ],
    itemsEn: [
      'Skipper calls "ready about" - get to your station',
      'Answer "ready" OUT LOUD - skipper cannot read your mind',
      'Skipper calls "tacking" or "jibing" - now the move happens',
      'Old working sheet is released',
      'New sheet is tailed on the winch (new side)',
      'In a tack, head below the boom, it swings across MEDIUM fast',
      'In a jibe, head below the boom MANDATORY - it swings across very fast',
      'After the maneuver, clear the tail from underfoot, coil or figure-8 it',
      'Never step on a sheet, never pinch it against your leg',
      'If something goes wrong - shout "STOP". Skipper decides what to do',
    ],
  },
  {
    id: 'start',
    icon: '🏁',
    titleRu: 'На старте гонки',
    titleEn: 'At the race start',
    introRu: 'Старт гонки = минута тишины и сосредоточенности. Шкиперу нужно слышать ветер, таймер и своих ближайших соперников. Всё что делает новичок на старте полезного - это молчит и смотрит.',
    introEn: 'The race start is one minute of silence and focus. The skipper needs to hear wind, timer, and nearby competitors. The most useful thing a beginner can do at the start is shut up and watch.',
    itemsRu: [
      'Знай где стартовая линия и куда идёт первая нога гонки',
      'Стартовая последовательность: 5 минут, 4, 1, старт (обычно)',
      'Твоя позиция на лодке во время старта - уточнил заранее',
      'Таймер до старта - объявляй только когда шкипер запросит',
      'Не болтай лишнего. Шкипер должен слышать',
      'Следи за гиком у стартовой линии - там лодок много и все маневрируют',
      'При "right of way" ситуациях - молчи, шкипер сам знает правила',
      'После стартового сигнала - работа как обычно',
    ],
    itemsEn: [
      'Know where the start line is and where the first leg goes',
      'Start sequence: 5 minutes, 4, 1, go (usually)',
      'Your station on board at the start - clarified ahead',
      'Countdown - call it only when skipper asks',
      'No unnecessary talk. Skipper must hear',
      'Watch the boom near the line - many boats, all maneuvering',
      'Right-of-way situations - stay silent, skipper knows the rules',
      'After the gun, work as usual',
    ],
  },
  {
    id: 'docking',
    icon: '⚓',
    titleRu: 'Возвращение и швартовка',
    titleEn: 'Returning and docking',
    introRu: 'Подход к причалу - момент когда новичок чаще всего ломает что-то дорогое. Пара простых правил закрывают 90% проблем.',
    introEn: 'Docking is when a beginner most often breaks something expensive. A few simple rules cover 90 percent of the risk.',
    itemsRu: [
      'Кранцы вывешены по борту, на правильной стороне (шкипер скажет)',
      'Швартовые концы подготовлены, собраны в аккуратную бухту не в клубок',
      'Знай какой конец бросаешь и на какую утку на причале',
      'НЕ ПРЫГАЙ на причал на ходу - жди команду или полный стоп',
      'НЕ СТАВЬ руку между лодкой и причалом - раздавит в момент',
      'Спина к причалу не поворачивается пока лодка не привязана',
      'После швартовки - рубильник на стоп когда шкипер разрешит',
      'Паруса убраны, чехлы одеты, шкоты разобраны, кокпит вымыт',
    ],
    itemsEn: [
      'Fenders out on the correct side (skipper will say)',
      'Dock lines prepared, coiled neatly not tangled',
      'Know which line you throw and to which cleat on the dock',
      'DO NOT jump onto the dock while the boat is still moving',
      'DO NOT put a hand between boat and dock - it crushes instantly',
      'Do not turn your back to the dock until the boat is tied',
      'Battery switch off once the skipper says so',
      'Sails flaked, covers on, sheets coiled, cockpit tidy',
    ],
    warningRu: 'Пальцы/ладони между бортом и причалом - самая частая серьёзная травма на яхтах. Один раз увидеть достаточно.',
    warningEn: 'Fingers or hand between the hull and the dock is the single most common serious injury on yachts. Seeing it once is enough.',
  },
  {
    id: 'summer-tips',
    icon: '☀️',
    titleRu: 'Что взять на лето и что реально важно',
    titleEn: 'Summer kit and what really matters',
    introRu: 'Собирай небольшую мягкую сумку. Лодка не отель. Всё что не помещается в один duffel - оставь в машине. Вот что действительно нужно.',
    introEn: 'Pack a small soft duffel. A yacht is not a hotel. Anything that does not fit in one duffel - leave in the car. Here is what actually matters.',
    itemsRu: [
      'Яхтенные перчатки (без пальцев или с неопреновыми накладками) - без них руки сотрёшь за день о шкоты',
      'Обувь с БЕЛОЙ или светло-серой подошвой - тёмная оставляет чёрные следы на палубе, шкипер будет расстроен',
      'Вторая пара для марины - кроксы или сланцы',
      'Шорты с застёгивающимися карманами (молния или пуговица) - ключи и телефон за борт не улетят',
      'Тонкая футболка с длинным рукавом - защита от солнца весь день, двух штук мало не будет',
      'Кепка с длинным козырьком, ещё лучше с "хвостом" сзади для шеи',
      'Солнцезащитные очки НА РЕМЕШКЕ (croakie) - без него рано или поздно утонут',
      'Запасной держатель для очков в карман - стоит копейки, выручает',
      'Крем SPF 50+ в виде стика (не тюбика) - руки мокрые, стик мажется быстро',
      'Бальзам для губ с SPF - солёная вода и солнце сушат за часы',
      'Лёгкая ветровка или непромокайка - на воде всегда прохладнее, на ходу продувает',
      '2-3 комплекта быстросохнущей одежды - хлопок сохнет часами, бери синтетику или мериносовую шерсть',
      'Тонкие технические носки - ноги потеют, мокрые хлопковые натрут',
      'Таблетки от морской болезни за ЧАС до выхода, если хоть немного укачивает',
      'Сухой мешок (dry bag) для телефона и документов',
      'Powerbank - розеток на ходу обычно нет',
      'Мягкая сумка (duffel) вместо чемодана - на яхте полки и узкие проходы, чемодан ставить некуда',
      'Вода: 2 маленькие бутылки удобнее 1 большой - одной хватит до марины, вторая на борту',
      'Лёгкие перекусы - батончики, орехи, фрукты',
      'Маленький нож-мультитул на шнурке в кармане - пригождается чаще чем думаешь (порвавшийся узел, пластик)',
      'Личная аптечка - свои лекарства, пластырь, жгут от мозолей',
    ],
    itemsEn: [
      'Sailing gloves (fingerless or with neoprene) - without them hands get shredded on sheets in a day',
      'Shoes with WHITE or light grey sole - dark soles streak the deck, skipper will be upset',
      'Second pair for the marina - crocs or flip-flops',
      'Shorts with zippered or buttoned pockets - keys and phone stay on board',
      'Thin long-sleeve shirt - all-day sun protection, two will not be too many',
      'Cap with long brim, even better with a neck cover at the back',
      'Sunglasses ON A RETAINER (croakie) - without one they will eventually swim',
      'Spare retainer in a pocket - costs cents, saves the day',
      'SPF 50+ stick (not tube) - hands are wet, stick applies fast',
      'Lip balm with SPF - salt plus sun dries in hours',
      'Light windbreaker or waterproof shell - water is always cooler, underway it blows through',
      '2-3 quick-dry sets - cotton stays wet for hours, go synthetic or merino wool',
      'Thin technical socks - cotton stays wet and chafes',
      'Motion sickness tablets one HOUR before departure if you are even a bit prone',
      'Dry bag for phone and documents',
      'Power bank - usually no outlets underway',
      'Soft duffel instead of a suitcase - no room for a hard case on a yacht',
      'Water: two small bottles beat one big - one for the walk, one on deck',
      'Light snacks - bars, nuts, fruit',
      'Small multitool on a lanyard - more useful than you think (jammed knot, plastic)',
      'Personal first-aid - your meds, plasters, blister tape',
    ],
  },
  {
    id: 'golden-rules',
    icon: '⭐',
    titleRu: 'Золотые правила',
    titleEn: 'Golden rules',
    introRu: 'Если забудешь всё остальное - запомни эти пять.',
    introEn: 'If you forget everything else, remember these five.',
    itemsRu: [
      'Одна рука для себя, одна для лодки. Всегда держись за что-то',
      'Не уверен - спроси. Спросить всегда безопаснее чем "додумать"',
      'Голова ниже гика при любом повороте. Никаких исключений',
      'Никаких рук между лодкой и причалом. Ни пальца',
      'Шкипер главный. Спор потом на берегу',
    ],
    itemsEn: [
      'One hand for yourself, one for the boat. Always hold on to something',
      'Not sure - ask. Asking is always safer than guessing',
      'Head below the boom on every maneuver. No exceptions',
      'No hands between the hull and the dock. Not one finger',
      'The skipper is in charge. Argue later on land',
    ],
  },
];

export default function ChecklistPage() {
  const { lang, tp } = useI18n();

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-medium"
             style={{ background: 'rgba(255, 170, 0, 0.1)', border: '1px solid rgba(255, 170, 0, 0.25)', color: 'var(--warning)' }}>
          ⚓ {tp('Готовимся к регате', 'Getting ready', 'Przygotowanie')}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {tp(
            'Что взять и как вести себя на яхте',
            'What to pack and how to behave on a yacht',
            'Co zabrac i jak zachowac sie na jachcie',
          )}
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          {tp(
            'Это одна страница, которую новичку стоит прочитать ДО того как он впервые встанет на палубу. Не учит как управлять яхтой - учит не мешать, быть полезным и не пораниться.',
            'One page a first-timer should read BEFORE stepping on deck. It does not teach how to sail - it teaches how to not be in the way, be useful, and not get hurt.',
            'Jedna strona, ktora nowicjusz powinien przeczytac PRZED wejsciem na poklad. Nie uczy jak zeglowac - uczy jak nie przeszkadzac, byc przydatnym i nie zranic sie.',
          )}
        </p>
      </div>

      <div className="space-y-4">
        {SECTIONS.map((section) => {
          const title = lang === 'ru' ? section.titleRu : section.titleEn;
          const intro = lang === 'ru' ? section.introRu : section.introEn;
          const items = lang === 'ru' ? section.itemsRu : section.itemsEn;
          const warning = lang === 'ru' ? section.warningRu : section.warningEn;
          return (
            <section key={section.id} className="card p-4 sm:p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl shrink-0">{section.icon}</span>
                <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
              </div>
              {intro && (
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
                  {intro}
                </p>
              )}
              <ul className="space-y-2">
                {items.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span className="text-[var(--accent-cyan)] mt-0.5 shrink-0">•</span>
                    <span className="text-[var(--text-primary)]">{item}</span>
                  </li>
                ))}
              </ul>
              {warning && (
                <div className="mt-3 p-3 rounded-lg text-sm leading-relaxed"
                     style={{ background: 'rgba(255, 82, 82, 0.08)', border: '1px solid rgba(255, 82, 82, 0.25)' }}>
                  <span className="font-semibold" style={{ color: 'var(--danger)' }}>
                    ⚠️ {tp('Важно', 'Important', 'Wazne')}:
                  </span>{' '}
                  <span className="text-[var(--text-primary)]">{warning}</span>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="mt-8 p-5 card text-center"
           style={{ background: 'rgba(0, 212, 255, 0.04)', borderColor: 'rgba(0, 212, 255, 0.2)' }}>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {tp(
            'Это базовая подборка. Каждая яхта - свой маленький мир. Главное: не уверен - спроси, не трогай без команды.',
            'This is the basics. Each yacht is its own small world. Main rule: not sure - ask. Do not touch without a command.',
            'To podstawa. Kazdy jacht jest innym malym swiatem. Glowna zasada: nie jestes pewien - pytaj, nie dotykaj bez polecenia.',
          )}
        </p>
      </div>
    </div>
  );
}
