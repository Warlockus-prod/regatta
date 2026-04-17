'use client';

import { useI18n, type Lang } from '@/lib/i18n';

const OPTIONS: { id: Lang; label: string; aria: string }[] = [
  { id: 'ru', label: 'RU', aria: 'Русский' },
  { id: 'en', label: 'EN', aria: 'English' },
  { id: 'pl', label: 'PL', aria: 'Polski' },
];

export default function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div
      className="flex items-center rounded-full p-0.5 gap-0"
      style={{ background: 'rgba(139, 167, 184, 0.1)', border: '1px solid rgba(139, 167, 184, 0.2)' }}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          onClick={() => setLang(o.id)}
          className="w-8 h-6 text-[11px] font-semibold rounded-full transition"
          aria-label={o.aria}
          aria-pressed={lang === o.id}
          style={{
            background: lang === o.id ? 'var(--accent-cyan)' : 'transparent',
            color: lang === o.id ? '#0a1628' : 'var(--text-secondary)',
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
