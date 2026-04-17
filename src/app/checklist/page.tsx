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
      'Непромокаемая куртка и штаны (foulies)',
      'Обувь с нескользящей белой подошвой',
      'Солнцезащитные очки с ремешком',
      'Крем SPF 50+, бальзам для губ',
      'Шапка/кепка',
      'Перчатки для шкотов',
      'Тёплый слой (на воде холоднее)',
      'Вода (1.5 л на день)',
      'Лёгкие перекусы (батончики, фрукты)',
      'Таблетки от морской болезни (за час до выхода)',
      'Маленький сухой мешок для телефона/документов',
      'Powerbank',
      'Запасная сухая одежда (оставить в машине/рундуке)',
    ],
    itemsEn: [
      'Foulies (waterproof jacket + pants)',
      'Non-marking white-sole shoes',
      'Sunglasses with retainer strap',
      'SPF 50+ sunscreen, lip balm',
      'Hat',
      'Sailing gloves',
      'Warm layer (water is colder)',
      'Water (1.5 L per day)',
      'Light snacks (bars, fruit)',
      'Motion sickness tablets (one hour before)',
      'Small dry bag for phone/docs',
      'Powerbank',
      'Spare dry clothes (leave in car/locker)',
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
