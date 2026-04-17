'use client';

import { useState } from 'react';
import { onboardSections } from '@/data/onboard';
import { useI18n } from '@/lib/i18n';

export default function OnboardPage() {
  const { lang, t } = useI18n();
  const [openId, setOpenId] = useState<string | null>(onboardSections[0].id);

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-medium"
             style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.25)', color: 'var(--accent-cyan)' }}>
          ⚓ {t('Первая неделя на яхте', 'First week on board')}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {t('Что происходит на борту и как не чувствовать себя потерянным', 'What happens on board and how to not feel lost')}
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          {t(
            'Для тех, кто впервые идёт на регату или чартер. Не учат как управлять яхтой, а как вести себя на борту, чтобы быть полезным и не мешать.',
            'For first-time regatta/charter crew. Not how to sail - how to behave on board so you\'re useful and not in the way.',
          )}
        </p>
      </div>

      <div className="space-y-3">
        {onboardSections.map((section) => {
          const isOpen = openId === section.id;
          const items = lang === 'ru' ? section.itemsRu : section.itemsEn;
          const title = lang === 'ru' ? section.titleRu : section.titleEn;
          const warning = lang === 'ru' ? section.warningRu : section.warningEn;
          return (
            <div
              key={section.id}
              className="card overflow-hidden transition-all"
              style={{ borderColor: isOpen ? 'rgba(0, 212, 255, 0.3)' : undefined }}
            >
              <button
                onClick={() => setOpenId(isOpen ? null : section.id)}
                className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0">{section.icon}</span>
                  <div className="min-w-0">
                    <div className="text-base sm:text-lg font-semibold truncate">{title}</div>
                  </div>
                </div>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`shrink-0 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {isOpen && (
                <div className="px-4 sm:px-5 pb-5 space-y-3">
                  <ul className="space-y-2">
                    {items.map((item, i) => (
                      <li key={i} className="flex gap-3 text-sm leading-relaxed">
                        <span className="text-[var(--accent-cyan)] mt-0.5">•</span>
                        <span className="text-[var(--text-primary)]">{item}</span>
                      </li>
                    ))}
                  </ul>
                  {warning && (
                    <div className="p-3 rounded-lg text-sm leading-relaxed"
                         style={{ background: 'rgba(255, 170, 0, 0.08)', border: '1px solid rgba(255, 170, 0, 0.25)' }}>
                      <span className="font-semibold" style={{ color: 'var(--warning)' }}>⚠️ {t('Важно', 'Important')}:</span>{' '}
                      <span className="text-[var(--text-primary)]">{warning}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-10 p-5 card text-center" style={{ background: 'rgba(68, 255, 136, 0.04)', borderColor: 'rgba(68, 255, 136, 0.2)' }}>
        <p className="text-sm text-[var(--text-secondary)]">
          {t(
            'Это базовая подборка. Каждая яхта - свой маленький мир. Главное правило: не уверен - спроси, не трогай без команды.',
            'This is the basics. Each yacht has its own quirks. Main rule: not sure - ask. Don\'t touch without a command.',
          )}
        </p>
      </div>
    </div>
  );
}
