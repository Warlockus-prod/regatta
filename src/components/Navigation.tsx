'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import LanguageToggle from './LanguageToggle';
import BootcampProgressChip from './BootcampProgressChip';
import { useI18n } from '@/lib/i18n';

// ============================================================================
// Menu model - primary items always visible on desktop,
// "Ещё / More" opens a rich dropdown with everything else grouped.
// ============================================================================

interface NavItem {
  href: string;
  ru: string; en: string; pl: string;
  icon: React.ReactNode;
}

interface NavGroup {
  titleRu: string; titleEn: string; titlePl: string;
  items: NavItem[];
}

const Icon = {
  home: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  start: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
    </svg>
  ),
  quick: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  rules: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  onboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L12 22"/><path d="M5 8H19"/>
      <path d="M3 18c2 1 4 1 6 0s4-1 6 0 4 1 6 0"/>
    </svg>
  ),
  simulator: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20l3.5-3.5"/><path d="M18 4l-6.5 6.5"/>
      <path d="M2 20l8-2-6-6-2 8z"/><path d="M18 4l2 2-8 8"/>
      <path d="M20 6l-1.5 8.5L12 21"/>
    </svg>
  ),
  courses: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
    </svg>
  ),
  tactics: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  race: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
      <line x1="4" y1="22" x2="4" y2="15"/>
      <circle cx="14" cy="10" r="2" fill="currentColor"/>
    </svg>
  ),
  glossary: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  anatomy: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 10v6m11-11h-6M7 12H1"/>
    </svg>
  ),
  checklist: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4"/>
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
    </svg>
  ),
  gallery: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  ),
};

// Primary - always in the desktop bar
const primary: NavItem[] = [
  { href: '/', ru: 'Главная', en: 'Home', pl: 'Główna', icon: Icon.home },
  { href: '/start', ru: 'Старт', en: 'Start', pl: 'Start', icon: Icon.start },
  { href: '/courses', ru: 'Курсы к ветру', en: 'Points of sail', pl: 'Kursy wiatru', icon: Icon.courses },
  { href: '/simulator', ru: 'Симулятор', en: 'Simulator', pl: 'Symulator', icon: Icon.simulator },
  { href: '/game', ru: 'Гонка', en: 'Race', pl: 'Regata', icon: Icon.race },
];

// Grouped extras
const groups: NavGroup[] = [
  {
    titleRu: 'Обучение', titleEn: 'Learn', titlePl: 'Nauka',
    items: [
      { href: '/rules', ru: 'Правила', en: 'Rules', pl: 'Przepisy', icon: Icon.rules },
      { href: '/racing', ru: 'Тактика', en: 'Tactics', pl: 'Taktyka', icon: Icon.tactics },
    ],
  },
  {
    titleRu: 'На борту', titleEn: 'On board', titlePl: 'Na pokładzie',
    items: [
      { href: '/anatomy', ru: 'Устройство яхты', en: 'Yacht anatomy', pl: 'Budowa jachtu', icon: Icon.anatomy },
      { href: '/checklist', ru: 'Чек-лист', en: 'Checklist', pl: 'Lista kontrolna', icon: Icon.checklist },
    ],
  },
  {
    titleRu: 'Ещё', titleEn: 'More', titlePl: 'Więcej',
    items: [
      { href: '/multiplayer', ru: 'Мультиплеер', en: 'Multiplayer', pl: 'Multiplayer', icon: Icon.race },
      { href: '/glossary', ru: 'Глоссарий', en: 'Glossary', pl: 'Glosariusz', icon: Icon.glossary },
      { href: '/gallery', ru: 'Галерея', en: 'Gallery', pl: 'Galeria', icon: Icon.gallery },
    ],
  },
];

// ============================================================================

export default function Navigation() {
  const pathname = usePathname();
  const { lang, tp } = useI18n();
  const labelOf = (item: NavItem) => (lang === 'ru' ? item.ru : lang === 'pl' ? item.pl : item.en);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Close all menus on route change. React Compiler flags these setState
  // calls, but reacting to a navigation event is a correct and idiomatic use.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMoreOpen(false);
  }, [pathname]);

  return (
    <nav className="sticky top-0 z-50 border-b border-[rgba(0,212,255,0.1)] backdrop-blur-md"
         style={{ background: 'rgba(10, 22, 40, 0.9)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                 style={{ background: 'rgba(0, 212, 255, 0.15)', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 20l3.5-3.5"/>
                <path d="M18 4l-6.5 6.5"/>
                <path d="M2 20l8-2-6-6-2 8z"/>
                <path d="M18 4l2 2-8 8"/>
              </svg>
            </div>
            <span className="text-lg font-semibold tracking-tight group-hover:text-[var(--accent-cyan)] transition-colors">
              Regatta
            </span>
          </Link>

          {/* Desktop primary + More */}
          <div className="hidden md:flex items-center gap-0.5 lg:gap-1">
            {primary.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={labelOf(item)}
                  className={`flex items-center gap-2 px-2 py-2 lg:px-3 rounded-lg text-sm font-medium transition-all
                    ${isActive
                      ? 'text-[var(--accent-cyan)] bg-[rgba(0,212,255,0.1)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)]'
                    }`}
                >
                  {item.icon}
                  <span className="hidden lg:inline">{labelOf(item)}</span>
                </Link>
              );
            })}

            {/* More dropdown */}
            <MoreDropdown
              open={moreOpen}
              setOpen={setMoreOpen}
              labelOf={labelOf}
              pathname={pathname}
              moreLabel={tp('Ещё', 'More', 'Więcej')}
            />
          </div>

          <div className="flex items-center gap-2">
            <BootcampProgressChip />
            <LanguageToggle />

            <button
              onClick={() => (window as unknown as { __openHelp?: () => void }).__openHelp?.()}
              title={tp('Горячие клавиши (?)', 'Shortcuts (?)', 'Skróty (?)')}
              aria-label="Open help"
              className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)] transition text-sm font-bold"
            >
              ?
            </button>

            {/* Mobile menu */}
            <MobileMenu
              open={mobileOpen}
              setOpen={setMobileOpen}
              labelOf={labelOf}
              pathname={pathname}
              tp={tp}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}

// ============================================================================
// More dropdown (desktop) - with outside-click / Escape close
// ============================================================================

function MoreDropdown({
  open,
  setOpen,
  labelOf,
  pathname,
  moreLabel,
}: {
  open: boolean;
  setOpen: (b: boolean) => void;
  labelOf: (i: NavItem) => string;
  pathname: string;
  moreLabel: string;
}) {
  const { tp } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

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
  }, [open, setOpen]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex items-center gap-1.5 px-2 py-2 lg:px-3 rounded-lg text-sm font-medium transition-all
          ${open
            ? 'text-[var(--accent-cyan)] bg-[rgba(0,212,255,0.1)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)]'
          }`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="5" cy="12" r="1.5"/>
          <circle cx="12" cy="12" r="1.5"/>
          <circle cx="19" cy="12" r="1.5"/>
        </svg>
        <span className="hidden lg:inline">{moreLabel}</span>
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-xl shadow-xl border border-[rgba(0,212,255,0.2)] p-2 overflow-hidden"
          style={{ background: 'var(--bg-card)' }}
        >
          {groups.map((g) => (
            <div key={g.titleEn} className="py-1.5">
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {tp(g.titleRu, g.titleEn, g.titlePl)}
              </div>
              <div className="grid grid-cols-1 gap-0.5">
                {g.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all
                        ${isActive
                          ? 'text-[var(--accent-cyan)] bg-[rgba(0,212,255,0.1)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)]'
                        }`}
                    >
                      {item.icon}
                      <span>{labelOf(item)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Mobile menu - custom overlay for proper outside-click close
// ============================================================================

function MobileMenu({
  open,
  setOpen,
  labelOf,
  pathname,
  tp,
}: {
  open: boolean;
  setOpen: (b: boolean) => void;
  labelOf: (i: NavItem) => string;
  pathname: string;
  tp: (ru: string, en: string, pl: string) => string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Outside-click + Escape close
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, setOpen]);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Open menu"
        className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)]"
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60]"
          style={{ top: 56, background: 'rgba(5, 12, 24, 0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => setOpen(false)}
        >
          <div
            ref={panelRef}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-2 top-2 w-[calc(100%-1rem)] max-w-xs rounded-xl shadow-xl border border-[rgba(0,212,255,0.2)] p-2 overflow-hidden max-h-[80vh] overflow-y-auto"
            style={{ background: 'var(--bg-card)' }}
          >
            {/* Primary */}
            <div className="py-1">
              {primary.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition
                      ${isActive
                        ? 'text-[var(--accent-cyan)] bg-[rgba(0,212,255,0.1)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)]'
                      }`}
                  >
                    {item.icon}
                    <span>{labelOf(item)}</span>
                  </Link>
                );
              })}
            </div>

            {/* Grouped extras */}
            {groups.map((g) => (
              <div key={g.titleEn} className="py-1 border-t border-[rgba(0,212,255,0.08)]">
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {tp(g.titleRu, g.titleEn, g.titlePl)}
                </div>
                {g.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition
                        ${isActive
                          ? 'text-[var(--accent-cyan)] bg-[rgba(0,212,255,0.1)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)]'
                        }`}
                    >
                      {item.icon}
                      <span>{labelOf(item)}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
