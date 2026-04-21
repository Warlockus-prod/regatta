'use client';

import { useState } from 'react';
import { type TpFn } from './shared';

// ---------------------------------------------------------------------------
// Collapsible glossary footer - explains all abbreviations without cluttering
// the main scene. Default collapsed; user taps to open.
// ---------------------------------------------------------------------------

export function GlossaryFooter({ tp }: { tp: TpFn }) {
  const [open, setOpen] = useState(false);

  const entries: Array<{ term: string; ru: string; en: string; pl: string }> = [
    {
      term: 'TWS',
      ru: 'скорость истинного ветра',
      en: 'true wind speed',
      pl: 'predkosc prawdziwego wiatru',
    },
    {
      term: 'TWA',
      ru: 'угол к истинному ветру (0 = в ветер, 90 = галф, 180 = по ветру)',
      en: 'angle to true wind (0 = upwind, 90 = beam, 180 = downwind)',
      pl: 'kat do prawdziwego wiatru',
    },
    {
      term: 'AWS',
      ru: 'apparent wind speed - скорость ветра, которую ЧУВСТВУЕТ движущаяся яхта',
      en: 'apparent wind speed - the wind the moving boat feels',
      pl: 'predkosc pozornego wiatru',
    },
    {
      term: 'AWA',
      ru: 'apparent wind angle - угол ветра как его чувствует яхта. На галфвинде AWA меньше TWA (ветер приходит вперёд)',
      en: 'apparent wind angle - wind angle the boat feels. On beam reach AWA is less than TWA (wind comes forward)',
      pl: 'kat pozornego wiatru',
    },
    {
      term: 'VMG',
      ru: 'velocity made good - скорость в направлении ветра. На галсировании главное число',
      en: 'velocity made good - speed toward the wind. Key metric upwind',
      pl: 'predkosc w kierunku wiatru',
    },
    {
      term: 'Heel',
      ru: 'крен, наклон лодки. До 15° нормально, 25° уже много, 30° пора рифиться',
      en: 'heel angle. Up to 15 deg normal, 25 is a lot, 30 means reef now',
      pl: 'przechyl',
    },
    {
      term: 'Leeway',
      ru: 'снос лодки вбок. Киль не идеален, лодку всегда сносит под ветер на 3-8°',
      en: 'sideways drift. The keel is not perfect; boats always slip 3-8 deg to leeward',
      pl: 'dryf boczny',
    },
    {
      term: 'Slot',
      ru: 'щель между гротом и стакселем. Хороший слот ускоряет поток на гроте и даёт больше тяги. Стаксель перетянут - слот закрыт, грот теряет',
      en: 'the slot between main and jib. A good slot accelerates flow on the main. Overtrimmed jib closes it and kills the main',
      pl: 'slot miedzy grotem a fokiem',
    },
    {
      term: 'Stall',
      ru: 'срыв потока. Угол атаки паруса слишком большой, поток отрывается, тяга падает. Признак - флаги на стакселе полощут',
      en: 'flow separation. Angle of attack too high, flow detaches, drive drops. Sign: telltales flutter on the jib',
      pl: 'oderwanie przeplywu',
    },
    {
      term: 'Drive / Тяга',
      ru: 'проекция аэродинамической силы паруса в сторону носа лодки. Именно это толкает вперёд',
      en: 'forward component of sail aero force. This is what pushes you',
      pl: 'ciag',
    },
    {
      term: 'Side / Боковая сила',
      ru: 'поперечная составляющая силы паруса. Рождает крен и leeway. Полезная работа - только drive',
      en: 'sideways component of sail force. Creates heel and leeway. The useful work is drive only',
      pl: 'sila boczna',
    },
    {
      term: 'AoA',
      ru: 'angle of attack - угол атаки паруса к ветру. Оптимум ~ 12-18°. Меньше - парус полощет. Больше - stall',
      en: 'angle of attack - sail angle to wind. Optimal ~ 12-18 deg. Less: luffing. More: stall',
      pl: 'kat natarcia',
    },
    {
      term: tp('Оптимум / ghost', 'Optimum / ghost', 'Optimum / ghost'),
      ru: 'пунктирные зелёные силуэты - где грот и стаксель ДОЛЖНЫ стоять при текущем курсе и ветре. Сравни со своей настройкой',
      en: 'dashed green silhouettes - where main and jib SHOULD sit for the current course and wind. Compare to your trim',
      pl: 'zielone kontury - gdzie zagle powinny byc',
    },
    {
      term: tp('Трим % / trim', 'Trim %', 'Trim %'),
      ru: 'ваша скорость в % от скорости при идеальном триме для этого курса. 100% = не проигрываете ничего',
      en: 'your speed as % of the ideal-trim speed for this course. 100% means you lose nothing to trim',
      pl: 'procent idealnego trymu',
    },
  ];

  return (
    <div className="border-t mx-2 lg:mx-5 mt-2" style={{ borderColor: 'rgba(0, 212, 255, 0.12)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-[rgba(0,212,255,0.04)]"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: 'var(--accent-cyan)' }}
        >
          {open ? '▾' : '▸'}{' '}
          {tp(
            'Что означают все эти сокращения?',
            'What do all these abbreviations mean?',
            'Co oznaczaja te skroty?',
          )}
        </span>
        <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline">
          {tp(
            'TWA, AWA, AWS, slot, stall, drive, side, heel, leeway и другие',
            'TWA, AWA, AWS, slot, stall, drive, side, heel, leeway and more',
            'TWA, AWA, AWS, slot, stall itd',
          )}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-4 pt-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          {entries.map((e) => (
            <div key={e.term} className="text-[11px] sm:text-xs leading-relaxed">
              <span className="font-mono font-bold" style={{ color: 'var(--accent-cyan)' }}>
                {e.term}
              </span>
              <span className="text-[var(--text-secondary)]"> - {tp(e.ru, e.en, e.pl)}</span>
            </div>
          ))}
          <div
            className="col-span-full mt-2 pt-2 border-t text-[10px] text-[var(--text-muted)]"
            style={{ borderColor: 'rgba(0, 212, 255, 0.08)' }}
          >
            {tp(
              'Сцена, метрики и комментарий читают один и тот же state. Движок пересчитывает при каждом изменении контрола.',
              'Scene, metrics, and commentary all read one state. The engine recomputes on every control change.',
              'Jeden stan, silnik przelicza przy kazdej zmianie.',
            )}
          </div>
        </div>
      )}
    </div>
  );
}
