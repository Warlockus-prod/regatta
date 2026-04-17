'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LanguageToggle from './LanguageToggle';
import { useI18n } from '@/lib/i18n';

const navItems = [
  {
    href: '/',
    label: 'Главная',
    labelEn: 'Home',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/start',
    label: 'Старт',
    labelEn: 'Start',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="10 8 16 12 10 16 10 8"/>
      </svg>
    ),
  },
  {
    href: '/onboard',
    label: 'На яхте',
    labelEn: 'On board',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L12 22"/>
        <path d="M5 8H19"/>
        <path d="M3 18c2 1 4 1 6 0s4-1 6 0 4 1 6 0"/>
      </svg>
    ),
  },
  {
    href: '/simulator',
    label: 'Симулятор',
    labelEn: 'Simulator',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20l3.5-3.5"/>
        <path d="M18 4l-6.5 6.5"/>
        <path d="M2 20l8-2-6-6-2 8z"/>
        <path d="M18 4l2 2-8 8"/>
        <path d="M20 6l-1.5 8.5L12 21"/>
      </svg>
    ),
  },
  {
    href: '/courses',
    label: 'Курсы',
    labelEn: 'Courses',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
        <path d="M2 12h20"/>
      </svg>
    ),
  },
  {
    href: '/rules',
    label: 'Правила',
    labelEn: 'Rules',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    href: '/racing',
    label: 'Тактика',
    labelEn: 'Tactics',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
        <line x1="4" y1="22" x2="4" y2="15"/>
      </svg>
    ),
  },
  {
    href: '/game',
    label: 'Гонка',
    labelEn: 'Race',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
        <line x1="4" y1="22" x2="4" y2="15"/>
        <circle cx="14" cy="10" r="2" fill="currentColor"/>
      </svg>
    ),
  },
  {
    href: '/glossary',
    label: 'Глоссарий',
    labelEn: 'Glossary',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        <line x1="8" y1="7" x2="16" y2="7"/>
        <line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ),
  },
];

export default function Navigation() {
  const pathname = usePathname();
  const { t } = useI18n();

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

          {/* Nav Links - Desktop only shows text on xl+, icons-only on md-lg */}
          <div className="hidden md:flex items-center gap-0.5 lg:gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`flex items-center gap-2 px-2 py-2 lg:px-3 rounded-lg text-sm font-medium transition-all
                    ${isActive
                      ? 'text-[var(--accent-cyan)] bg-[rgba(0,212,255,0.1)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)]'
                    }`}
                >
                  {item.icon}
                  <span className="hidden lg:inline">{t(item.label, item.labelEn)}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <LanguageToggle />

            {/* Help button */}
            <button
              onClick={() => (window as unknown as { __openHelp?: () => void }).__openHelp?.()}
              title="Горячие клавиши (?)"
              aria-label="Open help"
              className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)] transition text-sm font-bold"
            >
              ?
            </button>

            {/* Mobile menu button */}
            <MobileMenu pathname={pathname} />
          </div>
        </div>
      </div>
    </nav>
  );
}

function MobileMenu({ pathname }: { pathname: string }) {
  const { t } = useI18n();
  return (
    <div className="md:hidden">
      <details className="relative">
        <summary className="list-none cursor-pointer p-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </summary>
        <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl border border-[rgba(0,212,255,0.15)] overflow-hidden"
             style={{ background: 'var(--bg-card)' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all
                  ${isActive
                    ? 'text-[var(--accent-cyan)] bg-[rgba(0,212,255,0.1)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.04)]'
                  }`}
              >
                {item.icon}
                <span>{t(item.label, item.labelEn)}</span>
              </Link>
            );
          })}
        </div>
      </details>
    </div>
  );
}
