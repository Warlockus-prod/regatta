'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { storageGet, storageSet } from '@/lib/storage';

interface ChecklistGroup {
  id: string;
  titleRu: string;
  titleEn: string;
  icon: string;
  itemsRu: string[];
  itemsEn: string[];
}

const GROUPS: ChecklistGroup[] = [
  {
    id: 'first-10-min',
    icon: '🗺️',
    titleRu: 'Первые 10 минут на борту',
    titleEn: 'First 10 minutes on board',
    itemsRu: [
      'Нашёл свой спасжилет, примерил, поправил лямки под свой рост',
      'Запомнил где лежат запасные спасжилеты и "подкова" для МОБ',
      'Нашёл аптечку и огнетушитель (спросил у шкипера)',
      'Нашёл главный выключатель батарей и газ (на случай пожара)',
      'Спросил какой VHF канал, как звать экстренную помощь',
      'Нашёл гальюн, спросил как сливать (кингстоны - это важно!)',
      'Бросил свои вещи в каюту, не оставил на палубе',
      'Снял обувь с тёмной подошвой или переобулся в "палубники"',
    ],
    itemsEn: [
      'Found my lifejacket, tried it on, adjusted straps to my size',
      'Noted location of spare lifejackets and MOB horseshoe',
      'Found the first-aid kit and fire extinguisher (asked skipper)',
      'Found the main battery switch and gas valve (in case of fire)',
      'Asked VHF channel and how to call for emergency help',
      'Found the head, asked how to flush (through-hulls matter)',
      'Stashed my gear in the cabin, nothing left loose on deck',
      'Changed out of dark-soled shoes into non-marking deck shoes',
    ],
  },
  {
    id: 'parts',
    icon: '⚙️',
    titleRu: 'Что есть на яхте и как работает',
    titleEn: 'What is on the yacht and how it works',
    itemsRu: [
      'Мачта - вертикальная труба. Не опираюсь на неё, там идут фалы',
      'Гик - горизонтальная труба в основании грота. При повороте летит через палубу. Голову бережём',
      'Грот - большой парус от мачты. Регулируется гика-шкотом',
      'Стаксель/генуя - передний парус. Два шкота (левый и правый)',
      'Шкот - верёвка которая тянет парус. Шкоты грота и стакселя разные',
      'Фал - верёвка которая поднимает парус. Идёт вверх по мачте',
      'Лебёдка (винч) - цилиндр на палубе. На неё кладут шкот и крутят рукояткой',
      'Утка (клампа) - рогатая штука, на которую фиксируется шкот восьмёркой',
      'Штурвал/румпель - управление курсом. На больших - штурвал, на малых - румпель',
      'Стопор (клямсы) - держит фал/шкот без лебёдки. Открыл - верёвка пошла свободно',
      'Вант-путенс - точка крепления штагов сбоку от мачты. Не трогаем - это держит мачту',
    ],
    itemsEn: [
      'Mast - vertical pole. Do not lean on it, halyards run inside',
      'Boom - horizontal pole at the foot of the main. Swings across during a jibe. Mind your head',
      'Main - big sail from the mast aft. Controlled by the main sheet',
      'Jib / genoa - forward sail. Two sheets (port and starboard)',
      'Sheet - line that pulls a sail in. Main and jib sheets are different',
      'Halyard - line that hoists a sail. Runs up the mast',
      'Winch - cylinder on deck. Sheet wraps around it, you crank the handle',
      'Cleat - horned fitting. Sheet gets figure-8-ed onto it to hold',
      'Wheel / tiller - steering. Big boats have a wheel, small ones a tiller',
      'Clutch / jammer - holds a halyard or sheet without the winch. Pop it open to release',
      'Shroud chainplate - attachment of the side stays. Do not touch, it holds the mast up',
    ],
  },
  {
    id: 'before-sail',
    icon: '⛵',
    titleRu: 'Перед выходом под парусом',
    titleEn: 'Before we leave under sail',
    itemsRu: [
      'Посмотрел на ветровой индикатор (стрелка наверху мачты) - откуда дует',
      'Спросил какой курс пойдём первым',
      'Знаю куда отходит гик при повороте (на меня? от меня?)',
      'Спросил "что я делаю при повороте" - роль',
      'Шкот стакселя на своей стороне (с той на которую перекидывают)',
      'Ничего не болтается на палубе - всё закреплено или в рундуке',
      'Спасжилет надет и застёгнут',
      'Сходил в гальюн',
    ],
    itemsEn: [
      'Looked at the wind indicator at the masthead - where is the wind from',
      'Asked what course we are sailing first',
      'I know where the boom goes during a tack or jibe (toward me? away?)',
      'Asked "what do I do during a tack" - my role',
      'Jib sheet prepared on the side the crew tosses it to',
      'Nothing loose on deck - everything secured or stowed',
      'Lifejacket on and clipped',
      'Went to the head',
    ],
  },
  {
    id: 'during-maneuvers',
    icon: '🎯',
    titleRu: 'Во время поворотов',
    titleEn: 'During maneuvers',
    itemsRu: [
      'Услышал команду "готовимся к повороту" - встал на своё место',
      'Подтвердил "готов" шкиперу (он не может читать мысли)',
      'При оверштаге голова ниже гика, руки держат леер или шкот',
      'При фордевинде ОСОБЕННО голова ниже гика - он летит быстрее',
      'Работающий шкот отпустил, новый - подтянул на винче',
      'Не встаю на шкот ногой и не зажимаю его об ногу',
      'После поворота убрал хвост шкота из-под ног - порядок',
      'Если что-то пошло не так - громко "стоп" и шкипер решает',
    ],
    itemsEn: [
      'Heard "ready about" - got to my station',
      'Said "ready" back to the skipper (he cannot read your mind)',
      'In a tack, head below the boom, hands on a lifeline or sheet',
      'In a jibe ESPECIALLY head down, the boom comes across fast',
      'Released the working sheet, tailed the new one onto the winch',
      'Never stood on a sheet or pinched it against my leg',
      'After the maneuver, cleared the sheet tail from the cockpit floor',
      'If something goes wrong - loud "stop" and the skipper decides',
    ],
  },
  {
    id: 'start',
    icon: '🏁',
    titleRu: 'На старте регаты',
    titleEn: 'At the race start',
    itemsRu: [
      'Знаю где стартовая линия и куда идёт первая нога',
      'Понимаю сигнальную последовательность: 5 мин, 4, 1, старт',
      'Знаю свою позицию на лодке во время старта',
      'Слежу за временем до старта - объявляю вслух на запросе',
      'Не болтаю - шкиперу нужна тишина чтобы слышать',
      'Слежу за гиком особенно у стартовой линии',
      'При "right of way" ситуациях - не кричу, шкипер знает',
    ],
    itemsEn: [
      'I know where the start line is and where the first leg goes',
      'I understand the sequence: 5 min, 4, 1, start',
      'I know my station during the start',
      'Watching the countdown - call it out when asked',
      'No unnecessary chatter - skipper needs to hear',
      'Watching the boom especially near the start line',
      'In right-of-way situations I do not shout, skipper knows',
    ],
  },
  {
    id: 'docking',
    icon: '⚓',
    titleRu: 'При возвращении и швартовке',
    titleEn: 'Returning and docking',
    itemsRu: [
      'Кранцы вывешены по борту, на нужной стороне',
      'Швартовы (концы) подготовлены, концы собраны в бухту, не в клубок',
      'Знаю на какую утку/пал я бросаю конец',
      'Не прыгаю на причал на ходу - жду команду или стоп',
      'Не ставлю руку между лодкой и причалом - раздавит',
      'Рубильник на стопе после швартовки - когда шкипер скажет',
      'Паруса убраны, чехлы одеты, концы разобраны',
    ],
    itemsEn: [
      'Fenders out on the correct side',
      'Dock lines prepared, coiled neatly not tangled',
      'I know which cleat / bollard to throw the line to',
      'Never jump onto the dock while we are still moving - wait for call',
      'Never put a hand between boat and dock - it crushes',
      'Battery switch off when skipper says so after tying up',
      'Sails flaked and covered, lines coiled, cockpit tidy',
    ],
  },
  {
    id: 'bring',
    icon: '🎒',
    titleRu: 'Что взять с собой',
    titleEn: 'What to bring',
    itemsRu: [
      'Яхтенные перчатки (без пальцев или с неопреновыми) - иначе руки натрёт за день',
      'Обувь со светлой нескользящей подошвой',
      'Кроксы/сланцы для марины',
      'Солнцезащитные очки с ремешком (иначе слетят)',
      'SPF 50+, бальзам для губ (стик удобнее тюбика на воде)',
      'Длинный рукав + кепка - солнце весь день',
      'Лёгкая непромокайка',
      '2-3 комплекта быстросохнущего',
      'Таблетки от укачивания - за час ДО выхода',
      'Сухой мешок для телефона и документов',
      'Powerbank',
      'Мягкая сумка (чемодана на лодке не место)',
      'Вода 1.5 л на день, лёгкие перекусы',
    ],
    itemsEn: [
      'Sailing gloves (fingerless or with neoprene) - hands get shredded otherwise',
      'Shoes with light non-marking sole',
      'Crocs/flip-flops for the marina',
      'Sunglasses with retainer strap',
      'SPF 50+, lip balm (stick beats tube on the water)',
      'Long sleeve + cap - sun all day',
      'Light waterproof shell',
      '2-3 quick-dry sets',
      'Motion sickness tablets - one hour BEFORE departure',
      'Dry bag for phone and docs',
      'Power bank',
      'Soft duffel (no room for a suitcase)',
      '1.5 L water per day, light snacks',
    ],
  },
];

export default function ChecklistPage() {
  const { lang, t } = useI18n();
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setChecked(storageGet<Record<string, boolean>>('checklist', {}));
  }, []);

  const toggle = (key: string) => {
    const next = { ...checked, [key]: !checked[key] };
    setChecked(next);
    storageSet('checklist', next);
  };

  const resetAll = () => {
    if (confirm(t('Сбросить чек-лист?', 'Reset checklist?'))) {
      setChecked({});
      storageSet('checklist', {});
    }
  };

  const totalItems = GROUPS.reduce((sum, g) => sum + g.itemsRu.length, 0);
  const doneItems = Object.values(checked).filter(Boolean).length;

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-medium"
             style={{ background: 'rgba(255, 170, 0, 0.1)', border: '1px solid rgba(255, 170, 0, 0.25)', color: 'var(--warning)' }}>
          ✅ {t('Чек-лист', 'Checklist')}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {t('Готовимся к регате', 'Getting ready for the regatta')}
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          {t(
            'Отметь что взял/сделал. Прогресс сохраняется между заходами.',
            'Check off what you packed/did. Progress saved between visits.',
          )}
        </p>
      </div>

      <div className="card p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-semibold">
              {doneItems}/{totalItems} {t('готово', 'done')}
            </div>
            <div className="text-sm text-[var(--text-muted)]">
              {Math.round((doneItems / totalItems) * 100)}%
            </div>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <div
              className="h-full transition-all"
              style={{ width: `${(doneItems / totalItems) * 100}%`, background: 'linear-gradient(90deg, var(--warning), var(--success))' }}
            />
          </div>
        </div>
        {doneItems > 0 && (
          <button
            onClick={resetAll}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition"
          >
            {t('Сбросить', 'Reset')}
          </button>
        )}
      </div>

      <div className="space-y-6">
        {GROUPS.map((g) => {
          const items = lang === 'ru' ? g.itemsRu : g.itemsEn;
          const title = lang === 'ru' ? g.titleRu : g.titleEn;
          const groupDone = items.filter((_, i) => checked[`${g.id}.${i}`]).length;
          return (
            <div key={g.id} className="card p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span>{g.icon}</span>
                  <span>{title}</span>
                </h2>
                <span className="text-xs text-[var(--text-muted)]">
                  {groupDone}/{items.length}
                </span>
              </div>
              <ul className="space-y-2">
                {items.map((item, i) => {
                  const key = `${g.id}.${i}`;
                  const done = !!checked[key];
                  return (
                    <li
                      key={key}
                      onClick={() => toggle(key)}
                      className="flex items-start gap-3 cursor-pointer group py-1"
                    >
                      <div
                        className="w-5 h-5 rounded shrink-0 flex items-center justify-center transition mt-0.5"
                        style={{
                          background: done ? 'var(--success)' : 'transparent',
                          border: `2px solid ${done ? 'var(--success)' : 'rgba(139, 167, 184, 0.4)'}`,
                        }}
                      >
                        {done && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a1628" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                      <span
                        className={`text-sm leading-relaxed ${done ? 'line-through opacity-60' : ''}`}
                      >
                        {item}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
