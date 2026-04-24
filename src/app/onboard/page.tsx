'use client';

import Link from 'next/link';
import { legacyPick, legacyPickArray } from '@/lib/languages';
import { useState } from 'react';
import { onboardSections } from '@/data/onboard';
import { useI18n } from '@/lib/i18n';
import ContentFooterNav from '@/components/ContentFooterNav';

export default function OnboardPage() {
  const { lang, tp } = useI18n();
  // Open all sections by default so everything is readable in one scroll.
  // Users expected to see the full "how to behave on a yacht" reference,
  // not a click-by-click accordion.
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(onboardSections.map((s) => s.id)),
  );
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-medium"
             style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.25)', color: 'var(--accent-cyan)' }}>
          ⚓ {tp('Первая неделя на яхте', 'First week on board', 'Pierwszy tydzien na jachcie')}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {tp('Что происходит на борту и как не чувствовать себя потерянным', 'What happens on board and how to not feel lost', 'Co dzieje sie na pokladzie i jak sie nie zagubic')}
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          {tp(
            'Для тех, кто впервые идёт на регату или чартер. Не учат как управлять яхтой, а как вести себя на борту, чтобы быть полезным и не мешать.',
            'For first-time regatta/charter crew. Not how to sail - how to behave on board so you\'re useful and not in the way.',
            'Dla tych, ktorzy pierwszy raz ida na regate lub czarter. Nie uczymy jak sterowac - jak zachowac sie na pokladzie, aby byc pomocnym i nie przeszkadzac.',
          )}
        </p>
      </div>

      <div className="space-y-3">
        {onboardSections.map((section) => {
          const isOpen = openIds.has(section.id);
          const items = legacyPickArray(section, 'items', lang);
          const title = legacyPick(section, 'title', lang);
          const warning = legacyPick(section, 'warning', lang);
          return (
            <div
              key={section.id}
              className="card overflow-hidden transition-all"
              style={{ borderColor: isOpen ? 'rgba(0, 212, 255, 0.3)' : undefined }}
            >
              <button
                onClick={() => toggle(section.id)}
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
                      <span className="font-semibold" style={{ color: 'var(--warning)' }}>⚠️ {tp('Важно', 'Important', 'Wazne')}:</span>{' '}
                      <span className="text-[var(--text-primary)]">{warning}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Deep-dive chapters (linked standalone pages) */}
      <div className="mt-10 mb-4">
        <h2 className="text-xl font-semibold mb-2">
          {tp('Глубже по темам', 'Deeper by topic', 'Glebiej po tematach')}
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          {tp(
            'Краткий обзор здесь - подробности в отдельных разделах.',
            'Overview here - details on dedicated pages.',
            'Krotki przeglad tutaj - szczegoly w osobnych sekcjach.',
          )}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/anatomy" className="card p-4 hover:border-[var(--accent-cyan)] transition">
            <div className="text-2xl mb-1">🔧</div>
            <div className="font-semibold">{tp('Устройство яхты', 'Yacht anatomy', 'Budowa jachtu')}</div>
            <div className="text-[10px] text-[var(--text-muted)] mb-1">Bavaria 46</div>
            <p className="text-xs text-[var(--text-secondary)]">
              {tp('17 деталей с описанием, 2D профиль.', '17 parts described, 2D profile.', '17 czesci z opisem, profil 2D.')}
            </p>
          </Link>
          <Link href="/checklist" className="card p-4 hover:border-[var(--accent-cyan)] transition">
            <div className="text-2xl mb-1">✅</div>
            <div className="font-semibold">{tp('Чек-лист к регате', 'Pre-race checklist', 'Lista przed regata')}</div>
            <div className="text-[10px] text-[var(--text-muted)] mb-1">{tp('Что взять, что знать', 'Pack, know, do', 'Co wziac, co wiedziec')}</div>
            <p className="text-xs text-[var(--text-secondary)]">
              {tp('Прогресс по пунктам сохраняется в браузере.', 'Progress saved in the browser.', 'Postep zapisuje sie w przegladarce.')}
            </p>
          </Link>
        </div>
      </div>

      <div className="mt-8 p-5 card text-center" style={{ background: 'rgba(68, 255, 136, 0.04)', borderColor: 'rgba(68, 255, 136, 0.2)' }}>
        <p className="text-sm text-[var(--text-secondary)]">
          {tp(
            'Это базовая подборка. Каждая яхта - свой маленький мир. Главное правило: не уверен - спроси, не трогай без команды.',
            'This is the basics. Each yacht has its own quirks. Main rule: not sure - ask. Don\'t touch without a command.',
            'To podstawy. Kazdy jacht ma swoje kwirki. Glowna zasada: nie jestes pewien - zapytaj, nie dotykaj bez komendy.',
          )}
        </p>
      </div>

      <ContentFooterNav page="/onboard" />
    </div>
  );
}
