import Link from 'next/link';

// ============================================================================
// Three primary entry points — matches the "who are you" framing
// ============================================================================

const entryPoints = [
  {
    href: '/start',
    emoji: '🎓',
    title: 'Начать с нуля',
    subtitle: 'Bootcamp',
    description: '8 уроков по 5 минут. От ветра до мини-гонки. Прогресс сохраняется, можно проходить постепенно.',
    accent: 'var(--accent-cyan)',
    border: 'rgba(0, 212, 255, 0.3)',
    bg: 'rgba(0, 212, 255, 0.08)',
  },
  {
    href: '/game',
    emoji: '⛵',
    title: 'Освежить перед стартом',
    subtitle: 'Quick refresher',
    description: 'Опыт есть, но регата скоро. Гонка с AI-соперниками + разбор ошибок AI-тренером.',
    accent: 'var(--success)',
    border: 'rgba(68, 255, 136, 0.3)',
    bg: 'rgba(68, 255, 136, 0.08)',
  },
  {
    href: '/rules',
    emoji: '📖',
    title: 'Разобрать правила',
    subtitle: 'Simple rules',
    description: 'Правый галс, место у знака, старт, столкновение — через 8 карточек-сценариев, не сухой текст.',
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
    href: '/onboard',
    title: 'Первая неделя на яхте',
    subtitle: 'First week on board',
    description: 'Не как управлять, а как вести себя на борту: команды, что опасно, что брать.',
    accent: 'var(--success)',
    icon: '⚓',
  },
  {
    href: '/anatomy',
    title: 'Устройство яхты',
    subtitle: 'Yacht anatomy',
    description: 'Bavaria 46 с кликабельными деталями: нос, мачта, гик, шкоты, лебёдки.',
    accent: 'var(--success)',
    icon: '🔧',
  },
  {
    href: '/knots',
    title: '6 узлов',
    subtitle: 'Knots',
    description: 'Восьмёрка, беседочный, на утку — только реально нужные, с пошаговыми схемами.',
    accent: '#8844ff',
    icon: '🪢',
  },
  {
    href: '/checklist',
    title: 'Чек-лист к регате',
    subtitle: 'Pre-race checklist',
    description: 'Что взять, что узнать, что сделать перед выходом. Прогресс сохраняется.',
    accent: 'var(--warning)',
    icon: '✅',
  },
  {
    href: '/simulator',
    title: 'Симулятор',
    subtitle: 'Simulator',
    description: 'Интерактивная яхта: top-view + side-view с креном. Почувствуй ветер руками.',
    accent: 'var(--accent-cyan)',
    icon: '🎮',
  },
  {
    href: '/racing',
    title: 'Тактика',
    subtitle: 'Tactics',
    description: 'Лавировка, старт, огибание знаков, правила расхождения — диаграммы.',
    accent: 'var(--warning)',
    icon: '🎯',
  },
  {
    href: '/courses',
    title: 'Курсы относительно ветра',
    subtitle: 'Points of sail',
    description: 'Левентик, бейдевинд, галфвинд, бакштаг, фордевинд — интерактивная диаграмма.',
    accent: 'var(--success)',
    icon: '🧭',
  },
  {
    href: '/glossary',
    title: 'Глоссарий',
    subtitle: 'Glossary',
    description: '51 термин RU/EN. Бейдевинд = close-hauled, связка = overlap. Ищи и фильтруй.',
    accent: '#8844ff',
    icon: '📚',
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {secondaryTools.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="group card p-4 flex flex-col gap-2 hover:border-[var(--accent-cyan)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold group-hover:text-[var(--accent-cyan)] transition-colors line-clamp-1">{t.title}</div>
                  <div className="text-[10px] text-[var(--text-muted)]">{t.subtitle}</div>
                </div>
              </div>
              <div className="text-xs text-[var(--text-secondary)] line-clamp-2">{t.description}</div>
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
