import Link from 'next/link';

const sections = [
  {
    href: '/simulator',
    title: 'Интерактивный симулятор',
    subtitle: 'Interactive Simulator',
    description: 'Управляй яхтой, настраивай паруса, пойми как ветер влияет на движение',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20l3.5-3.5"/>
        <path d="M18 4l-6.5 6.5"/>
        <path d="M2 20l8-2-6-6-2 8z"/>
        <path d="M18 4l2 2-8 8"/>
        <path d="M20 6l-1.5 8.5L12 21"/>
      </svg>
    ),
    color: 'var(--accent-cyan)',
    bgColor: 'rgba(0, 212, 255, 0.08)',
    borderColor: 'rgba(0, 212, 255, 0.2)',
  },
  {
    href: '/courses',
    title: 'Курсы относительно ветра',
    subtitle: 'Points of Sail',
    description: 'Все курсы яхты: от левентика до фордевинда. Углы, паруса, скорости',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
        <path d="M2 12h20"/>
      </svg>
    ),
    color: 'var(--success)',
    bgColor: 'rgba(68, 255, 136, 0.08)',
    borderColor: 'rgba(68, 255, 136, 0.2)',
  },
  {
    href: '/racing',
    title: 'Гоночные стратегии',
    subtitle: 'Racing Strategy',
    description: 'Лавировка, старт, огибание знаков, расхождение с яхтами, правила',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
        <line x1="4" y1="22" x2="4" y2="15"/>
      </svg>
    ),
    color: 'var(--warning)',
    bgColor: 'rgba(255, 170, 0, 0.08)',
    borderColor: 'rgba(255, 170, 0, 0.2)',
  },
  {
    href: '/game',
    title: 'Гонка-симулятор',
    subtitle: 'Race Game',
    description: 'Соревнуйся с AI-соперниками. 3 уровня сложности. Проверь свои навыки на практике',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="10 8 16 12 10 16 10 8"/>
      </svg>
    ),
    color: '#ff6688',
    bgColor: 'rgba(255, 102, 136, 0.08)',
    borderColor: 'rgba(255, 102, 136, 0.2)',
  },
  {
    href: '/glossary',
    title: 'Глоссарий терминов',
    subtitle: 'Sailing Glossary',
    description: 'Все парусные термины на русском и английском. Части яхты, паруса, манёвры',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        <line x1="8" y1="7" x2="16" y2="7"/>
        <line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ),
    color: '#8844ff',
    bgColor: 'rgba(136, 68, 255, 0.08)',
    borderColor: 'rgba(136, 68, 255, 0.2)',
  },
];

export default function HomePage() {
  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4"
              style={{ background: 'linear-gradient(135deg, var(--text-primary), var(--accent-cyan))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Regatta
          </h1>
          <p className="text-xl text-[var(--text-secondary)] mb-2">
            Симулятор парусной яхты
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-10">
            Sailing Yacht Simulator
          </p>
          <p className="max-w-2xl mx-auto text-[var(--text-secondary)] leading-relaxed">
            Научись управлять яхтой: пойми как ставить паруса под разными углами к ветру,
            освой курсы и манёвры, подготовься к гонкам. Все термины на русском и английском.
          </p>
        </div>

        {/* Decorative wave */}
        <div className="absolute bottom-0 left-0 right-0 h-px"
             style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.3), transparent)' }} />
      </section>

      {/* Section Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section, idx) => (
            <Link
              key={section.href}
              href={section.href}
              className={`group card p-6 flex flex-col gap-4 hover:scale-[1.02] transition-all duration-300 ${
                // 5th card (index 4) spans 2 cols on medium screens to avoid lonely row
                idx === sections.length - 1 ? 'sm:col-span-2 lg:col-span-1' : ''
              }`}
              style={{ borderColor: section.borderColor }}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                     style={{ background: section.bgColor, color: section.color, border: `1px solid ${section.borderColor}` }}>
                  {section.icon}
                </div>
                <div>
                  <h2 className="text-lg font-semibold group-hover:text-[var(--accent-cyan)] transition-colors">
                    {section.title}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">{section.subtitle}</p>
                </div>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {section.description}
              </p>
              <div className="flex items-center gap-1 text-xs font-medium mt-auto"
                   style={{ color: section.color }}>
                <span>Открыть</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                     className="group-hover:translate-x-1 transition-transform">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Info */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="card p-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            <span className="font-medium text-[var(--text-primary)]">Совет:</span>{' '}
            Начни с раздела{' '}
            <Link href="/courses" className="text-[var(--accent-cyan)] hover:underline">Курсы</Link>
            , чтобы понять основы, затем переходи в{' '}
            <Link href="/simulator" className="text-[var(--accent-cyan)] hover:underline">Симулятор</Link>
            {' '}для практики.
          </p>
        </div>
      </section>
    </div>
  );
}
