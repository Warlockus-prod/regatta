'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'regatta.onboarding.v1';
const HIDE_ON = ['/simulator', '/trim-trainer', '/game', '/multiplayer'];

const STEPS = [
  {
    emoji: '🧭',
    title: 'Добро пожаловать в Regatta',
    body: 'Это обучающий симулятор парусной яхты. Ты научишься понимать ветер, ставить паруса и проходить гоночные трассы.',
  },
  {
    emoji: '🌬',
    title: 'Ключевая идея: угол к ветру',
    body: 'Яхта не может идти прямо против ветра (мёртвая зона). Поэтому в зависимости от угла к ветру парус работает по-разному - как крыло или как парус-парашют.',
  },
  {
    emoji: '🗺',
    title: 'С чего начать',
    body: 'Открой "Курсы" - там все 5 курсов с диаграммой. Потом "Симулятор" для практики управления. Потом "Игра" - гонка с соперниками и AI-тренером, который разбирает твои ошибки.',
  },
];

export default function OnboardingTour() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && HIDE_ON.some((p) => window.location.pathname.startsWith(p))) {
        return;
      }
      if (!localStorage.getItem(STORAGE_KEY)) {
        // Delay slightly so page is rendered
        const t = setTimeout(() => setShow(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage may throw in private browsing
    }
  }, []);

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
          aria-label="Skip tour"
          className="absolute top-3 right-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm transition"
        >
          Пропустить
        </button>

        <div className="text-5xl mb-4">{current.emoji}</div>
        <h2 className="text-2xl font-bold mb-3 text-[var(--text-primary)]">{current.title}</h2>
        <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed mb-6">{current.body}</p>

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
              Назад
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
            {step < STEPS.length - 1 ? 'Дальше' : 'Начать'}
          </button>
        </div>
      </div>
    </div>
  );
}
