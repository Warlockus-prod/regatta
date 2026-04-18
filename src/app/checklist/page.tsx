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
    id: 'bring',
    icon: '🎒',
    titleRu: 'Что взять с собой',
    titleEn: 'What to bring',
    itemsRu: [
      'Яхтенные перчатки (Musto или аналог) - главное, что натрёт руки за неделю',
      'Обувь со светлой нескользящей подошвой (тёмная оставляет следы на палубе)',
      'Вторая пара - кроксы/сланцы для марины',
      'Солнцезащитные очки с ремешком',
      'Крем SPF 50+ (стик или спрей - быстро наносить), бальзам для губ',
      'Лёгкая футболка с длинным рукавом - защита от солнца весь день',
      'Кепка',
      'Шорты с застёжками на карманах (чтоб не выронить ключи/телефон за борт)',
      'Непромокаемая куртка (лёгкая, против брызг и ветра)',
      '2-3 комплекта быстросохнущей одежды',
      'Запасные носки',
      'Таблетки от морской болезни (за час до выхода, если укачивает)',
      'Личная аптечка (свои лекарства + пластырь)',
      'Сухой мешок для телефона/документов',
      'Powerbank',
      'Мягкая сумка вместо чемодана (на яхте полки, а не багажные отсеки)',
      'Вода (1.5 л на день), лёгкие перекусы',
    ],
    itemsEn: [
      'Sailing gloves (Musto or similar) - hands get chewed up after a week otherwise',
      'Shoes with light non-marking sole (dark soles streak the deck)',
      'Second pair - crocs/flip-flops for the marina',
      'Sunglasses with retainer strap',
      'SPF 50+ sunscreen (stick or spray - fast reapply), lip balm',
      'Light long-sleeve athletic shirt - all-day sun protection',
      'Cap',
      'Shorts with zippered/closed pockets (nothing falls overboard mid-race)',
      'Light waterproof / windproof jacket (for spray)',
      '2-3 sets of quick-dry clothes',
      'Spare socks',
      'Motion sickness tablets (one hour before, if prone)',
      'Personal first-aid kit (your meds + plasters)',
      'Dry bag for phone / docs',
      'Power bank',
      'Soft duffel instead of a suitcase (yacht has shelves, not baggage holds)',
      'Water (1.5 L per day), light snacks',
    ],
  },
  {
    id: 'know',
    icon: '🧠',
    titleRu: 'Что узнать у шкипера',
    titleEn: 'What to ask the skipper',
    itemsRu: [
      'Свою роль на борту',
      'Команды, которые будут звучать чаще всего',
      'Где спасжилеты и как ими пользоваться',
      'Что делать при "человек за бортом"',
      'Где огнетушители, где аптечка',
      'VHF канал яхты',
      'Во сколько сбор и во сколько выход',
      'Нужно ли что-то принести (еду, запчасти, документы)',
    ],
    itemsEn: [
      'Your role on board',
      'Commands you\'ll hear most often',
      'Lifejacket location and how to use',
      'Man-overboard procedure',
      'Fire extinguisher + first aid kit location',
      'Yacht\'s VHF channel',
      'Meet time and departure time',
      'Anything to bring (food, spares, docs)',
    ],
  },
  {
    id: 'before',
    icon: '⏰',
    titleRu: 'Перед выходом на воду',
    titleEn: 'Before heading out',
    itemsRu: [
      'Туалет (!) - в море хуже',
      'Спасжилет на себя, подогнан по размеру',
      'Таблетка от морской болезни',
      'Телефон в сухой мешок',
      'Крем на лицо, уши, шею',
      'Вода под рукой',
      'Слой одежды подобран под погоду',
      'Кошелёк и документы убраны в непромокаемое',
      'Узнал/послушал прогноз погоды',
    ],
    itemsEn: [
      'Toilet (!) - it\'s worse at sea',
      'Lifejacket on and properly fitted',
      'Motion sickness pill',
      'Phone in dry bag',
      'Sunscreen on face, ears, neck',
      'Water at hand',
      'Clothing layer matches weather',
      'Wallet + docs in waterproof',
      'Weather forecast checked',
    ],
  },
  {
    id: 'start',
    icon: '🏁',
    titleRu: 'На старте регаты',
    titleEn: 'At the race start',
    itemsRu: [
      'Понимаю стартовую процедуру (сигналы)',
      'Знаю свою позицию на борту во время старта',
      'Готов к команде "готовимся к повороту"',
      'Знаю какой галс мы выбираем и почему',
      'Следишь за временем до старта',
      'Не болтать лишнего',
      'Следить за гиком (не полезть под него)',
    ],
    itemsEn: [
      'I understand the start sequence (signals)',
      'I know my position on board at start',
      'Ready for "ready about" command',
      'I know which tack we\'re on and why',
      'Watching the time to start',
      'No unnecessary chatter',
      'Watching the boom (not walking under it)',
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
