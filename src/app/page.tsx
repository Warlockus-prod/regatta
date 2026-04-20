'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

// ============================================================================
// Three primary entry points - matches the "who are you" framing
// ============================================================================

interface EntryPoint {
  href: string;
  emoji: string;
  titleRu: string; titleEn: string; titlePl: string;
  subtitleRu: string; subtitleEn: string; subtitlePl: string;
  descRu: string; descEn: string; descPl: string;
  accent: string; border: string; bg: string;
}

const entryPoints: EntryPoint[] = [
  {
    href: '/start',
    emoji: '🎓',
    titleRu: 'Начать с нуля', titleEn: 'Start from zero', titlePl: 'Zacznij od zera',
    subtitleRu: 'Bootcamp', subtitleEn: 'Bootcamp', subtitlePl: 'Bootcamp',
    descRu: '8 уроков по 5 минут. От ветра до мини-гонки. Прогресс сохраняется.',
    descEn: '8 lessons, 5 minutes each. From wind basics to a mini-race. Progress saved.',
    descPl: '8 lekcji po 5 minut. Od wiatru do mini-regaty. Postęp jest zapisywany.',
    accent: 'var(--accent-cyan)',
    border: 'rgba(0, 212, 255, 0.3)',
    bg: 'rgba(0, 212, 255, 0.08)',
  },
  {
    href: '/quick',
    emoji: '⚡',
    titleRu: 'Освежить за 15 мин', titleEn: 'Refresh in 15 min', titlePl: 'Odśwież w 15 min',
    subtitleRu: 'Quick refresh', subtitleEn: 'Quick refresh', subtitlePl: 'Szybkie powtórzenie',
    descRu: 'Опыт есть, но регата - завтра. 6 ключевых тем без воды, прямо к делу.',
    descEn: 'Got some experience but race is tomorrow. 6 key topics, no fluff.',
    descPl: 'Masz doświadczenie, ale regata jutro. 6 kluczowych tematów bez zbędnych słów.',
    accent: 'var(--success)',
    border: 'rgba(68, 255, 136, 0.3)',
    bg: 'rgba(68, 255, 136, 0.08)',
  },
  {
    href: '/rules',
    emoji: '📖',
    titleRu: 'Разобрать правила', titleEn: 'Learn the rules', titlePl: 'Poznaj przepisy',
    subtitleRu: 'Simple rules', subtitleEn: 'Simple rules', subtitlePl: 'Proste przepisy',
    descRu: 'Правый галс, место у знака, старт, столкновение - через 8 карточек-сценариев.',
    descEn: 'Starboard tack, mark room, start, collision - via 8 scenario cards.',
    descPl: 'Hals prawy, miejsce przy znaku, start, kolizja - przez 8 kart-scenariuszy.',
    accent: 'var(--warning)',
    border: 'rgba(255, 170, 0, 0.3)',
    bg: 'rgba(255, 170, 0, 0.08)',
  },
];

// ============================================================================
// Secondary tools (after the main entry points)
// ============================================================================

interface Tool {
  href: string;
  titleRu: string; titleEn: string; titlePl: string;
  subtitleRu: string; subtitleEn: string; subtitlePl: string;
  descRu: string; descEn: string; descPl: string;
  accent: string; icon: string;
}

const secondaryTools: Tool[] = [
  {
    href: '/onboard',
    titleRu: 'Первая неделя на яхте', titleEn: 'First week on board', titlePl: 'Pierwszy tydzień na jachcie',
    subtitleRu: 'First week on board', subtitleEn: 'First week on board', subtitlePl: 'Pierwszy tydzień na jachcie',
    descRu: 'Не как управлять, а как вести себя на борту: команды, что опасно, что брать.',
    descEn: 'Not how to sail - how to behave aboard: commands, dangers, what to pack.',
    descPl: 'Nie jak sterować - jak zachować się na pokładzie: komendy, zagrożenia, co zabrać.',
    accent: 'var(--success)',
    icon: '⚓',
  },
  {
    href: '/anatomy',
    titleRu: 'Устройство яхты', titleEn: 'Yacht anatomy', titlePl: 'Budowa jachtu',
    subtitleRu: 'Yacht anatomy', subtitleEn: 'Yacht anatomy', subtitlePl: 'Budowa jachtu',
    descRu: 'Bavaria 46 с кликабельными деталями: нос, мачта, гик, шкоты, лебёдки.',
    descEn: 'Bavaria 46 with clickable parts: bow, mast, boom, sheets, winches.',
    descPl: 'Bavaria 46 z klikalnymi elementami: dziób, maszt, bom, szoty, kabestany.',
    accent: 'var(--success)',
    icon: '🔧',
  },
  {
    href: '/checklist',
    titleRu: 'Чек-лист к регате', titleEn: 'Pre-race checklist', titlePl: 'Lista przed regatą',
    subtitleRu: 'Pre-race checklist', subtitleEn: 'Pre-race checklist', subtitlePl: 'Lista przed regatą',
    descRu: 'Что взять, что узнать, что сделать перед выходом. Прогресс сохраняется.',
    descEn: 'What to pack, learn, and do before casting off. Progress saved.',
    descPl: 'Co zabrać, czego się dowiedzieć, co zrobić przed wyjściem. Postęp zapisywany.',
    accent: 'var(--warning)',
    icon: '✅',
  },
  {
    href: '/simulator',
    titleRu: 'Симулятор', titleEn: 'Simulator', titlePl: 'Symulator',
    subtitleRu: 'Simulator', subtitleEn: 'Simulator', subtitlePl: 'Symulator',
    descRu: 'Интерактивная яхта: top-view + side-view с креном. Почувствуй ветер руками.',
    descEn: 'Interactive yacht: top view + side view with heel. Feel the wind.',
    descPl: 'Interaktywny jacht: widok z góry + z boku z przechyłem. Poczuj wiatr.',
    accent: 'var(--accent-cyan)',
    icon: '🎮',
  },
  {
    href: '/racing',
    titleRu: 'Тактика', titleEn: 'Tactics', titlePl: 'Taktyka',
    subtitleRu: 'Tactics', subtitleEn: 'Tactics', subtitlePl: 'Taktyka',
    descRu: 'Лавировка, старт, огибание знаков, правила расхождения - диаграммы.',
    descEn: 'Upwind, start, mark rounding, right-of-way - diagrams.',
    descPl: 'Halsowanie, start, opływanie znaków, pierwszeństwo - diagramy.',
    accent: 'var(--warning)',
    icon: '🎯',
  },
  {
    href: '/courses',
    titleRu: 'Курсы относительно ветра', titleEn: 'Points of sail', titlePl: 'Kursy względem wiatru',
    subtitleRu: 'Points of sail', subtitleEn: 'Points of sail', subtitlePl: 'Kursy względem wiatru',
    descRu: 'Левентик, бейдевинд, галфвинд, бакштаг, фордевинд - интерактивная диаграмма.',
    descEn: 'In-irons, close-hauled, beam, broad, running - interactive diagram.',
    descPl: 'W linii wiatru, ostry, półwiatr, baksztag, fordewind - interaktywny diagram.',
    accent: 'var(--success)',
    icon: '🧭',
  },
  {
    href: '/glossary',
    titleRu: 'Глоссарий', titleEn: 'Glossary', titlePl: 'Glosariusz',
    subtitleRu: 'Glossary', subtitleEn: 'Glossary', subtitlePl: 'Glosariusz',
    descRu: '51 термин RU/EN. Бейдевинд = close-hauled, связка = overlap. Ищи и фильтруй.',
    descEn: '51 terms RU/EN. Search and filter.',
    descPl: '51 pojęć RU/EN. Szukaj i filtruj.',
    accent: '#8844ff',
    icon: '📚',
  },
];

// ============================================================================
// "Why" bullets
// ============================================================================

const whyBullets = [
  {
    icon: '⚡',
    titleRu: 'За 45 минут', titleEn: 'In 45 minutes', titlePl: 'W 45 minut',
    textRu: 'От «я ничего не понимаю» до «я готов слушать брифинг».',
    textEn: 'From "I don\'t get any of this" to "I can follow the briefing".',
    textPl: 'Od „nic nie rozumiem" do „jestem gotowy na odprawę".',
  },
  {
    icon: '🎯',
    titleRu: 'Через сценарии', titleEn: 'Via scenarios', titlePl: 'Przez scenariusze',
    textRu: 'Не учебник, а ситуации с воды. Действие → объяснение.',
    textEn: 'Not a textbook - real on-water situations. Action → explanation.',
    textPl: 'Nie podręcznik - realne sytuacje z wody. Akcja → wyjaśnienie.',
  },
  {
    icon: '🌐',
    titleRu: 'RU / EN / PL', titleEn: 'RU / EN / PL', titlePl: 'RU / EN / PL',
    textRu: 'Термины на 3 языках - учишь и язык тоже.',
    textEn: 'Terminology in 3 languages - you learn the language too.',
    textPl: 'Terminologia w 3 językach - uczysz się też języka.',
  },
  {
    icon: '📱',
    titleRu: 'В браузере', titleEn: 'In the browser', titlePl: 'W przeglądarce',
    textRu: 'Ничего не ставишь. Открыл ссылку - учишься.',
    textEn: 'Nothing to install. Open the link, start learning.',
    textPl: 'Nic nie instalujesz. Otwierasz link, uczysz się.',
  },
];

export default function HomePage() {
  const { tp, t } = useI18n();

  return (
    <div className="page-enter">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-medium"
               style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.25)', color: 'var(--accent-cyan)' }}>
            <span className="w-1.5 h-1.5 rounded-full pulse-gentle" style={{ background: 'var(--accent-cyan)' }} />
            {tp('Быстрый вход в яхтенные гонки', 'Fast track into sailing races', 'Szybki start w regatach')}
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-4 leading-[1.1]">
            {tp(
              'До регаты неделя?',
              'Race in a week?',
              'Regata za tydzień?',
            ).split('?')[0]}{' '}
            <span style={{ color: 'var(--accent-cyan)' }}>?</span>
            <br />
            {tp('Успеешь разобраться.', "You'll figure it out.", 'Zdążysz się ogarnąć.')}
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed mb-3">
            {tp(
              'Интерактивный тренажёр для тех, кому скоро на регату, тренировку или первая неделя на яхте. Ветер, курсы, паруса, базовые правила - через короткие сценарии, не учебник.',
              'Interactive trainer for anyone with a race, a training day, or a first week on board coming up. Wind, points of sail, sails, basic rules - via short scenarios, not a textbook.',
              'Interaktywny trener dla osób, które mają przed sobą regatę, trening lub pierwszy tydzień na jachcie. Wiatr, kursy, żagle, podstawowe przepisy - przez krótkie scenariusze, nie podręcznik.',
            )}
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-10">
            {tp(
              'Тренажёр в браузере · RU / EN / PL',
              'Browser-based sailing trainer · RU / EN / PL',
              'Trener w przeglądarce · RU / EN / PL',
            )}
          </p>

          {/* CTA badges */}
          <div className="inline-flex flex-wrap gap-2 justify-center text-xs text-[var(--text-muted)]">
            <span className="px-2.5 py-1 rounded-full" style={{ border: '1px solid rgba(139, 167, 184, 0.2)' }}>
              {tp('~45 мин базы', '~45 min basics', '~45 min podstaw')}
            </span>
            <span className="px-2.5 py-1 rounded-full" style={{ border: '1px solid rgba(139, 167, 184, 0.2)' }}>
              {tp('Без установки', 'No install', 'Bez instalacji')}
            </span>
            <span className="px-2.5 py-1 rounded-full" style={{ border: '1px solid rgba(139, 167, 184, 0.2)' }}>
              RU / EN / PL
            </span>
            <span className="px-2.5 py-1 rounded-full" style={{ border: '1px solid rgba(139, 167, 184, 0.2)' }}>
              {tp('AI-тренер после гонки', 'AI coach after the race', 'Trener AI po regatach')}
            </span>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px"
             style={{ background: 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.3), transparent)' }} />
      </section>

      {/* ===== THREE ENTRY POINTS ===== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold mb-2">
            {tp('С чего начнёшь?', 'Where do you start?', 'Od czego zaczniesz?')}
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            {tp('Выбери точку входа', 'Pick your entry point', 'Wybierz punkt startu')}
          </p>
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
                <div className="text-lg font-semibold mb-0.5">{tp(ep.titleRu, ep.titleEn, ep.titlePl)}</div>
                <div className="text-xs text-[var(--text-muted)]">{tp(ep.subtitleRu, ep.subtitleEn, ep.subtitlePl)}</div>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-1">
                {tp(ep.descRu, ep.descEn, ep.descPl)}
              </p>
              <div className="flex items-center gap-1 text-xs font-medium mt-auto" style={{ color: ep.accent }}>
                <span>{tp('Начать', 'Start', 'Zacznij')}</span>
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
            <div key={b.titleEn} className="card p-4">
              <div className="text-2xl mb-2">{b.icon}</div>
              <div className="text-sm font-semibold mb-1">{tp(b.titleRu, b.titleEn, b.titlePl)}</div>
              <div className="text-xs text-[var(--text-muted)] leading-relaxed">{tp(b.textRu, b.textEn, b.textPl)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== SECONDARY TOOLS ===== */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-1">
            {tp('Дополнительно', 'Extras', 'Dodatkowo')}
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            {tp('Инструменты под руками', 'Tools at hand', 'Narzędzia pod ręką')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {secondaryTools.map((t2) => (
            <Link
              key={t2.href}
              href={t2.href}
              className="group card p-4 flex flex-col gap-2 hover:border-[var(--accent-cyan)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{t2.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold group-hover:text-[var(--accent-cyan)] transition-colors line-clamp-1">
                    {tp(t2.titleRu, t2.titleEn, t2.titlePl)}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">{tp(t2.subtitleRu, t2.subtitleEn, t2.subtitlePl)}</div>
                </div>
              </div>
              <div className="text-xs text-[var(--text-secondary)] line-clamp-2">
                {tp(t2.descRu, t2.descEn, t2.descPl)}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== CALL-TO-ACTION / TIP ===== */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="card p-5 sm:p-6 text-center" style={{ background: 'rgba(0, 212, 255, 0.04)', borderColor: 'rgba(0, 212, 255, 0.2)' }}>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            <span className="font-semibold text-[var(--text-primary)]">
              {tp('Не знаешь куда идти?', "Not sure where to go?", 'Nie wiesz od czego zacząć?')}
            </span>{' '}
            {tp('Начни с', 'Start with', 'Zacznij od')}{' '}
            <Link href="/courses" className="text-[var(--accent-cyan)] hover:underline font-medium">
              {tp('«Курсов относительно ветра»', '"Points of sail"', '"Kursy wzgledem wiatru"')}
            </Link>
            {' '}- {tp('это база всего парусного. Потом', "it's the foundation. Then", 'to fundament. Potem')}{' '}
            <Link href="/simulator" className="text-[var(--accent-cyan)] hover:underline font-medium">
              {tp('Симулятор', 'Simulator', 'Symulator')}
            </Link>
            {' '}{tp('для ощущения в руках, потом', 'to feel it, then', 'żeby poczuć, potem')}{' '}
            <Link href="/game" className="text-[var(--accent-cyan)] hover:underline font-medium">
              {tp('Гонка', 'Race', 'Regata')}
            </Link>
            {' '}{tp('с AI-соперниками для практики.', 'with AI opponents for practice.', 'z AI dla praktyki.')}
          </p>
        </div>
      </section>
    </div>
  );
}
