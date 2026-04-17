'use client';

import { useEffect, useState } from 'react';

const SHORTCUTS = [
  { group: 'Симулятор', items: [
    { keys: ['← →', 'A / D'], action: 'Повернуть яхту' },
    { keys: ['↑ ↓', 'W / S'], action: 'Изменить направление ветра' },
    { keys: ['Мышь'], action: 'Тянуть за яхту или за ветер на кольце' },
  ]},
  { group: 'Игра', items: [
    { keys: ['← →', 'A / D'], action: 'Повернуть яхту' },
    { keys: ['AUTO'], action: 'Автопилот - держит курс' },
    { keys: ['🔊'], action: 'Звук вкл/выкл' },
  ]},
  { group: 'Везде', items: [
    { keys: ['?'], action: 'Эта справка' },
    { keys: ['Esc'], action: 'Закрыть диалог' },
  ]},
];

export default function HelpOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't trigger when typing in an input
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        setOpen((o) => !o);
        e.preventDefault();
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Expose a global opener so nav button can trigger it
  useEffect(() => {
    (window as unknown as { __openHelp?: () => void }).__openHelp = () => setOpen(true);
    return () => {
      delete (window as unknown as { __openHelp?: () => void }).__openHelp;
    };
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ background: 'rgba(5, 12, 24, 0.75)', backdropFilter: 'blur(6px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="card max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ border: '1px solid rgba(0, 212, 255, 0.3)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Горячие клавиши</h2>
          <button onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
        </div>

        <div className="space-y-5">
          {SHORTCUTS.map((group) => (
            <div key={group.group}>
              <div className="text-xs font-semibold tracking-wider text-[var(--accent-cyan)] mb-2">{group.group.toUpperCase()}</div>
              <div className="space-y-1.5">
                {group.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-[var(--text-secondary)]">{it.action}</span>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {it.keys.map((k, j) => (
                        <kbd key={j} className="px-2 py-0.5 rounded border border-[rgba(0,212,255,0.2)] bg-[var(--bg-secondary)] text-xs font-mono text-[var(--text-primary)]">
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
