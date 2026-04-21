'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';

const STORAGE_KEY = 'regatta.onboarding.v1';

// Routes where the tour must not appear - immersive sims / game UI. Covers
// both V1 (/simulator), V2 (/simulator2), V3 (/simulator-v3), /game, and
// /multiplayer. Previously V3/sim2 were missing from this list so foreign
// visitors who landed on V3 first got a Russian welcome modal on top of it.
const HIDE_ON = ['/simulator', '/simulator2', '/simulator-v3', '/game', '/multiplayer'];

interface Step {
  emoji: string;
  titleRu: string; titleEn: string; titlePl: string;
  bodyRu: string; bodyEn: string; bodyPl: string;
}

const STEPS: Step[] = [
  {
    emoji: '🧭',
    titleRu: 'Добро пожаловать в Regatta',
    titleEn: 'Welcome to Regatta',
    titlePl: 'Witaj w Regatta',
    bodyRu: 'Это обучающий симулятор парусной яхты. Ты научишься понимать ветер, ставить паруса и проходить гоночные трассы.',
    bodyEn: 'A sailing simulator for learners. You will get the feel for wind, sail trim, and racing courses.',
    bodyPl: 'Symulator zeglarstwa dla poczatkujacych. Poznasz wiatr, trymowanie zagli i trase regat.',
  },
  {
    emoji: '🌬',
    titleRu: 'Ключевая идея: угол к ветру',
    titleEn: 'Key idea: angle to the wind',
    titlePl: 'Kluczowa idea: kat do wiatru',
    bodyRu: 'Яхта не может идти прямо против ветра (мёртвая зона). Поэтому в зависимости от угла к ветру парус работает по-разному - как крыло или как парус-парашют.',
    bodyEn: 'A yacht can\'t sail straight into the wind (the no-go zone). Depending on the angle, the sail works differently - as a wing close-hauled, as a parachute downwind.',
    bodyPl: 'Jacht nie moze plynac prosto pod wiatr (martwa strefa). W zaleznosci od kata zagiel pracuje inaczej - jak skrzydlo na bajdewindzie, jak spadochron na fordewindzie.',
  },
  {
    emoji: '🗺',
    titleRu: 'С чего начать',
    titleEn: 'Where to start',
    titlePl: 'Od czego zaczac',
    bodyRu: 'Открой «Курсы» - там все 5 курсов с диаграммой. Потом «Симулятор» для практики управления. Потом «Гонка» - с AI-тренером, который разбирает твои ошибки.',
    bodyEn: 'Open "Points of sail" - all 5 courses on a diagram. Then "Simulator" for hands-on control. Then "Race" - with an AI coach that reviews your mistakes.',
    bodyPl: 'Otworz "Kursy wiatru" - wszystkie 5 kursow na diagramie. Potem "Symulator" na praktyke. Potem "Regata" - z trenerem AI, ktory analizuje twoje bledy.',
  },
];

export default function OnboardingTour() {
  const pathname = usePathname();
  const { lang } = useI18n();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  // Reactive hideOn: recompute when pathname changes. Previously the check
  // happened once on mount, so navigating INTO an immersive page via client
  // routing still showed the tour.
  const onHiddenRoute = HIDE_ON.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (onHiddenRoute) {
      // If we're on an immersive route, make sure the tour is hidden.
      setShow(false);
      return;
    }
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // Delay slightly so page is rendered
        const t = setTimeout(() => setShow(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage may throw in private browsing
    }
  }, [onHiddenRoute]);

  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    setShow(false);
  };

  const skip = () => finish();
  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  if (!show) return null;
  const current = STEPS[step];
  const pick = (ru: string, en: string, pl: string) =>
    lang === 'pl' ? pl : lang === 'en' ? en : ru;
  const title = pick(current.titleRu, current.titleEn, current.titlePl);
  const body = pick(current.bodyRu, current.bodyEn, current.bodyPl);
  const labelSkip = pick('Пропустить', 'Skip', 'Pomin');
  const labelBack = pick('Назад', 'Back', 'Wstecz');
  const labelNext = step < STEPS.length - 1
    ? pick('Дальше', 'Next', 'Dalej')
    : pick('Начать', 'Start', 'Start');
  const ariaSkip = pick('Пропустить обзор', 'Skip tour', 'Pomin przewodnik');

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(5, 12, 24, 0.75)', backdropFilter: 'blur(6px)' }}
      onClick={skip}
    >
      <div
        className="card w-full max-w-md p-6 sm:p-8 relative"
        onClick={(e) => e.stopPropagation()}
        style={{ border: '1px solid rgba(0, 212, 255, 0.3)' }}
      >
        <button
          onClick={skip}
          aria-label={ariaSkip}
          className="absolute top-3 right-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm transition"
        >
          {labelSkip}
        </button>

        <div className="text-5xl mb-4">{current.emoji}</div>
        <h2 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">{title}</h2>
        <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed mb-6">{body}</p>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === step ? 24 : 8,
                background: i === step ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.3)',
              }}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-2.5 rounded-lg border border-[rgba(0,212,255,0.3)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
            >
              {labelBack}
            </button>
          )}
          <button
            onClick={next}
            className="flex-[2] py-2.5 rounded-lg font-semibold text-sm transition"
            style={{
              background: 'linear-gradient(135deg, var(--accent-cyan), #0099cc)',
              color: '#0a1628',
            }}
          >
            {labelNext}
          </button>
        </div>
      </div>
    </div>
  );
}
