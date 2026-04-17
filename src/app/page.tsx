import Link from 'next/link';

// ============================================================================
// Three primary entry points — matches the "who are you" framing
// ============================================================================

const entryPoints = [
  {
    href: '/courses',
    emoji: '🧭',
    title: 'Начать с нуля',
    subtitle: 'First time',
    description: 'Впервые идёшь на яхту или регату. Освой базу за 45 минут: ветер, курсы, паруса, простые правила.',
    accent: 'var(--accent-cyan)',
    border: 'rgba(0, 212, 255, 0.3)',
    bg: 'rgba(0, 212, 255, 0.08)',
  },
  {
    href: '/game',
    emoji: '⛵',
    title: 'Освежить перед стартом',
    subtitle: 'Quick refresher',
    description: 'Опыт есть, но регата скоро. Прогони ветер, лавировку и старт на практике в игре с AI.',
    accent: 'var(--success)',
    border: 'rgba(68, 255, 136, 0.3)',
    bg: 'rgba(68, 255, 136, 0.08)',
  },
  {
    href: '/racing',
    emoji: '📖',
    title: 'Разобрать правила',
    subtitle: 'Rules & tactics',
    description: 'Правый галс, место у знака, грязный ветер, лейлайн — через короткие сценарии, не сухой текст.',
    accent: 'var(--warning)',
    border: 'rgba(255, 170, 0, 0.3)',
    bg: 'rgba(255, 170, 0, 0.08)',
  },
];

// ============================================================================
// Secondary tools (after the main entry points)
// ============================================================================

const secondaryTools = [
  {
    href: '/simulator',
    title: 'Симулятор',
    subtitle: 'Simulator',
    description: 'Интерактивная яхта: top-view + side-view с креном. Почувствуй ветер руками.',
    accent: 'var(--accent-cyan)',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20l3.5-3.5"/><path d="M18 4l-6.5 6.5"/><path d="M2 20l8-2-6-6-2 8z"/><path d="M18 4l2 2-8 8"/>
      </svg>
    ),
  },
  {
    href: '/glossary',
    title: 'Глоссарий',
    subtitle: 'Glossary',
    description: '51 термин RU/EN. Бейдевинд = close-hauled, связка = overlap. Ищи и фильтруй.',
    accent: '#8844ff',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        <line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ),
  },
];

// ============================================================================
// "Why" bullets — differentiators at a glance
// ============================================================================

const whyBullets = [
  { icon: '⚡', title: 'За 45 минут', text: 'От «я ничего не понимаю» до «я готов слушать брифинг».' },
  { icon: '🎯', title: 'Через сценарии', text: 'Не учебник, а ситуации с воды. Действие → объяснение.' },
  { icon: '🌐', title: 'RU / EN', text: 'Все термины на русском и английском — учишь и язык тоже.' },
  { icon: '📱', title: 'В браузере', text: 'Ничего не ставишь. Открыл ссылку — учишься.' },
];

export default function HomePage() {
  return (
    <div className="page-enter">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-medium"
               style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.25)', color: 'var(--accent-cyan)' }}>
            <span className="w-1.5 h-1.5 rounded-full pulse-gentle" style={{ background: 'var(--accent-cyan)' }} />
            Быстрый вход в яхтенные гонки
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-4 leading-[1.1]">
            До регаты <span style={{ color: 'var(--accent-cyan)' }}>неделя?</span>
            <br />
            Успеешь разобраться.
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed mb-3">
            Интерактивный тренажёр для тех, кому скоро на регату, тренировку или первая неделя на яхте.
            Ветер, курсы, паруса, базовые правила — через короткие сценарии, не учебник.
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-10">
            Browser-based sailing trainer · RU / EN
          </p>

          {/* CTA badges */}
          <div className="inline-flex flex-wrap gap-2 justify-center text-xs text-[var(--text-muted)]">
            <span className="px-2.5 py-1 rounded-full" style={{ border: '1px solid rgba(139, 167, 184, 0.2)' }}>
              ~45 мин базы
            </span>
            <span className="px-2.5 py-1 rounded-full" style={{ border: '1px solid rgba(139, 167, 184, 0.2)' }}>
              Без установки
            </span>
            <span className="px-2.5 py-1 rounded-full" style={{ border: '1px solid rgba(139, 167, 184, 0.2)' }}>
              RU / EN
            </span>
            <span className="px-2.5 py-1 rounded-full" style={{ border: '1px solid rgba(139, 167, 184, 0.2)' }}>
              AI-тренер после гонки
            </span>
          </div>
        </div>

        {/* Decorative bottom line */}
        <div className="absolute bottom-0 left-0 right-0 h-px"
             style={{ background: 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.3), transparent)' }} />
      </section>

      {/* ===== THREE ENTRY POINTS ===== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold mb-2">С чего начнёшь?</h2>
          <p className="text-sm text-[var(--text-muted)]">Where do you start?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {entryPoints.map((ep) => (
            <Link
              key={ep.href}
              href={ep.href}
              className="group card p-6 hover:scale-[1.02] transition-all duration-300 flex flex-col gap-4"
              style={{ borderColor: ep.border, background: ep.bg }}
            >
              <div className="text-4xl">{ep.emoji}</div>
              <div>
                <div className="text-lg font-semibold mb-0.5">{ep.title}</div>
                <div className="text-xs text-[var(--text-muted)]">{ep.subtitle}</div>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-1">{ep.description}</p>
              <div className="flex items-center gap-1 text-xs font-medium mt-auto" style={{ color: ep.accent }}>
                <span>Начать</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     className="group-hover:translate-x-1 transition-transform">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== WHY BULLETS ===== */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {whyBullets.map((b) => (
            <div key={b.title} className="card p-4">
              <div className="text-2xl mb-2">{b.icon}</div>
              <div className="text-sm font-semibold mb-1">{b.title}</div>
              <div className="text-xs text-[var(--text-muted)] leading-relaxed">{b.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== SECONDARY TOOLS ===== */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-1">Дополнительно</h2>
          <p className="text-xs text-[var(--text-muted)]">Инструменты под руками</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {secondaryTools.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="group card p-5 flex items-center gap-4 hover:border-[var(--accent-cyan)] transition-colors"
            >
              <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                   style={{ color: t.accent, background: 'rgba(139, 167, 184, 0.08)', border: '1px solid rgba(139, 167, 184, 0.15)' }}>
                {t.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold group-hover:text-[var(--accent-cyan)] transition-colors">{t.title}</div>
                <div className="text-[11px] text-[var(--text-muted)] mb-1">{t.subtitle}</div>
                <div className="text-xs text-[var(--text-secondary)]">{t.description}</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                   className="text-[var(--text-muted)] group-hover:text-[var(--accent-cyan)] group-hover:translate-x-1 transition-all">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== CALL-TO-ACTION / TIP ===== */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="card p-5 sm:p-6 text-center" style={{ background: 'rgba(0, 212, 255, 0.04)', borderColor: 'rgba(0, 212, 255, 0.2)' }}>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            <span className="font-semibold text-[var(--text-primary)]">Не знаешь куда идти?</span>{' '}
            Начни с{' '}
            <Link href="/courses" className="text-[var(--accent-cyan)] hover:underline font-medium">«Курсов относительно ветра»</Link>
            {' '}— это база всего парусного. Потом{' '}
            <Link href="/simulator" className="text-[var(--accent-cyan)] hover:underline font-medium">Симулятор</Link>
            {' '}для ощущения в руках, потом{' '}
            <Link href="/game" className="text-[var(--accent-cyan)] hover:underline font-medium">Гонка</Link>
            {' '}с AI-соперниками для практики.
          </p>
        </div>
      </section>
    </div>
  );
}
