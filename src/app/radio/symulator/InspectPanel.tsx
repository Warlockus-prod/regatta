'use client';

import { useRadioI18n } from "@/app/radio/localization/context";

import { useTrainerI18n } from './trainerText';
import { INSPECT } from './inspectData';

// ============================================================================
// The panel that answers "what is this button". Shared by the simulator and the
// interactive course, because the course is exactly where a learner is meeting
// the buttons for the first time and asking that question.
//
// It shows the three labelled blocks - what / why / when. The labels are what
// turn a wall of text into an answer to the question actually asked.
// ============================================================================

export function InspectPanel({
  inspectKey, showPl, showRu, onSelect, className = 'mt-3',
}: {
  inspectKey: string | null;
  showPl: boolean;
  showRu: boolean;
  /** spacing from the block above (the simulator's panel spaces its own cards) */
  className?: string;
  onSelect?: (key:string)=>void;
}) {
  const { rt: radioText } = useRadioI18n();
  const { tp, lang } = useTrainerI18n();
  const item = inspectKey ? INSPECT[inspectKey] : undefined;
  // PL and RU follow the section's language policy; the other site languages
  // (the trainer runs in all seven) get the translation of the Polish text
  const other = lang !== 'pl' && lang !== 'ru';
  const pl = (text: string) => (other ? radioText(text) : showPl ? text : null);
  const ru = (text: string) => (other ? null : showRu ? text : null);

  return (
    <div
      data-testid="inspect-panel"
      className={`${className} rounded-2xl p-4`}
      style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,206,77,0.35)' }}
    >
      {item ? (
        <>
          <div className="mb-2 text-sm font-bold" style={{ color: 'var(--hl-amber, #ffce4d)' }}>
            {radioText(other ? radioText(item.titlePl) : showRu && !showPl ? item.titleRu : item.titlePl)}
          </div>
          <Block
            label={tp('Что это', 'What it is', 'Co to jest')}
            pl={pl(item.whatPl)}
            ru={ru(item.whatRu)}
          />
          <Block
            label={tp('Зачем', 'Why it exists', 'Po co')}
            pl={pl(item.whyPl)}
            ru={ru(item.whyRu)}
          />
          <Block
            label={tp('Когда', 'When you use it', 'Kiedy używasz')}
            pl={pl(item.whenPl)}
            ru={ru(item.whenRu)}
          />
        </>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {radioText(tp(
            'Ткни в любую часть рации: экран, номер канала, любую клавишу, крутилку, 16/C, DISTRESS, PTT, микрофон. Каждая объяснит, что это, зачем и когда используется.',
            'Tap any part of the radio: the screen, the channel number, any key, the knob, 16/C, DISTRESS, PTT, the mic. Each one explains what it is, why it exists and when you use it.',
            'Dotknij dowolnej części radia: ekranu, numeru kanału, dowolnego klawisza, pokrętła, 16/C, DISTRESS, PTT, mikrofonu. Każda wyjaśni, co to jest, po co i kiedy się tego używa.',
          ))}
        </p>
      )}
      {onSelect && <details className="mt-3"><summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-semibold">{radioText("Wybierz element z listy")}</summary>
        <div className="divide-y">{Object.entries(INSPECT).map(([key,part])=><button key={key} type="button" className="block min-h-[44px] w-full px-2 py-2 text-left text-sm" aria-pressed={inspectKey===key} onClick={()=>onSelect(key)}>{radioText(lang==="ru"?part.titleRu:part.titlePl)}</button>)}</div>
      </details>}
    </div>
  );
}

function Block({ label, pl, ru }: { label: string; pl: string | null; ru: string | null }) {
  const { rt: radioText } = useRadioI18n();
  if (!pl && !ru) return null;
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {radioText(label)}
      </div>
      {pl && <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{radioText(pl)}</p>}
      {ru && <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{radioText(ru)}</p>}
    </div>
  );
}

export default InspectPanel;
