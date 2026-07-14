'use client';

import { useI18n } from '@/lib/i18n';
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
  inspectKey, showPl, showRu,
}: {
  inspectKey: string | null;
  showPl: boolean;
  showRu: boolean;
}) {
  const { tp } = useI18n();
  const item = inspectKey ? INSPECT[inspectKey] : undefined;

  return (
    <div
      data-testid="inspect-panel"
      className="mt-3 rounded-2xl p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,206,77,0.35)' }}
    >
      {item ? (
        <>
          <div className="mb-2 text-sm font-bold" style={{ color: 'var(--hl-amber, #ffce4d)' }}>
            {showRu && !showPl ? item.titleRu : item.titlePl}
          </div>
          <Block
            label={tp('Что это', 'What it is', 'Co to jest')}
            pl={showPl ? item.whatPl : null}
            ru={showRu ? item.whatRu : null}
          />
          <Block
            label={tp('Зачем', 'Why it exists', 'Po co')}
            pl={showPl ? item.whyPl : null}
            ru={showRu ? item.whyRu : null}
          />
          <Block
            label={tp('Когда', 'When you use it', 'Kiedy uzywasz')}
            pl={showPl ? item.whenPl : null}
            ru={showRu ? item.whenRu : null}
          />
        </>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {tp(
            'Ткни в любую часть рации: экран, номер канала, любую клавишу, крутилку, 16/C, DISTRESS, PTT, микрофон. Каждая объяснит, что это, зачем и когда используется.',
            'Tap any part of the radio: the screen, the channel number, any key, the knob, 16/C, DISTRESS, PTT, the mic. Each one explains what it is, why it exists and when you use it.',
            'Dotknij dowolnej czesci radia: ekranu, numeru kanalu, dowolnego klawisza, pokretla, 16/C, DISTRESS, PTT, mikrofonu. Kazda wyjasni, co to jest, po co i kiedy sie tego uzywa.',
          )}
        </p>
      )}
    </div>
  );
}

function Block({ label, pl, ru }: { label: string; pl: string | null; ru: string | null }) {
  if (!pl && !ru) return null;
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      {pl && <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{pl}</p>}
      {ru && <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{ru}</p>}
    </div>
  );
}

export default InspectPanel;
