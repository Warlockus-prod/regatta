'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { ENABLED_LANGUAGES } from '@/lib/languages';

export default function LanguageToggle() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = ENABLED_LANGUAGES.find((o) => o.id === lang) ?? ENABLED_LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickAway);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold transition"
        aria-label="Choose language"
        aria-expanded={open}
        aria-haspopup="menu"
        style={{
          background: open ? 'rgba(0, 212, 255, 0.14)' : 'rgba(139, 167, 184, 0.1)',
          border: open ? '1px solid rgba(0, 212, 255, 0.35)' : '1px solid rgba(139, 167, 184, 0.2)',
          color: open ? 'var(--accent-cyan)' : 'var(--text-secondary)',
        }}
      >
        <span>{active.short}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 160ms ease' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-[rgba(0,212,255,0.2)] p-1.5 shadow-xl"
          style={{ background: 'var(--bg-card)' }}
        >
          {ENABLED_LANGUAGES.map((o) => {
            const isActive = lang === o.id;
            return (
              <button
                key={o.id}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  setLang(o.id);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition"
                style={{
                  background: isActive ? 'rgba(0, 212, 255, 0.12)' : 'transparent',
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                }}
              >
                <span className="flex flex-col leading-tight">
                  <span className="font-semibold">{o.nativeName}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {o.name}
                  </span>
                </span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={{
                    background: isActive ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.1)',
                    color: isActive ? '#0a1628' : 'var(--text-muted)',
                  }}
                >
                  {o.short}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
