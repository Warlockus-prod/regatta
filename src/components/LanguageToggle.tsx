'use client';

import { useI18n } from '@/lib/i18n';

export default function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div
      className="flex items-center rounded-full p-0.5 gap-0"
      style={{ background: 'rgba(139, 167, 184, 0.1)', border: '1px solid rgba(139, 167, 184, 0.2)' }}
    >
      <button
        onClick={() => setLang('ru')}
        className="w-8 h-6 text-[11px] font-semibold rounded-full transition"
        aria-label="Русский"
        style={{
          background: lang === 'ru' ? 'var(--accent-cyan)' : 'transparent',
          color: lang === 'ru' ? '#0a1628' : 'var(--text-secondary)',
        }}
      >
        RU
      </button>
      <button
        onClick={() => setLang('en')}
        className="w-8 h-6 text-[11px] font-semibold rounded-full transition"
        aria-label="English"
        style={{
          background: lang === 'en' ? 'var(--accent-cyan)' : 'transparent',
          color: lang === 'en' ? '#0a1628' : 'var(--text-secondary)',
        }}
      >
        EN
      </button>
    </div>
  );
}
