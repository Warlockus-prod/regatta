'use client';

import { useState } from 'react';
import { knots } from '@/data/knots';
import { useI18n } from '@/lib/i18n';

// Simple step visualization: show rope as connected arcs with highlighted step
function KnotStepVisual({ knotId, step, doneLabel }: { knotId: string; step: number; doneLabel: string }) {
  // Each knot gets a dedicated stylized SVG diagram per step.
  // We keep them intentionally simple - the text does the heavy lifting.
  const visuals: Record<string, (step: number) => React.ReactElement> = {
    'figure-eight': (s) => (
      <svg viewBox="0 0 200 140" className="w-full h-auto">
        {/* Base rope */}
        <path d="M 30 100 Q 100 60 170 100" stroke="#8ba7b8" strokeWidth="3" fill="none" />
        {s >= 1 && <path d="M 130 100 Q 110 80 130 60 Q 150 40 130 30" stroke="var(--accent-cyan)" strokeWidth="3" fill="none" />}
        {s >= 2 && <path d="M 130 30 Q 100 20 80 50" stroke="var(--accent-cyan)" strokeWidth="3" fill="none" />}
        {s >= 3 && <path d="M 80 50 Q 90 80 110 70" stroke="var(--accent-cyan)" strokeWidth="3" fill="none" />}
        {s >= 4 && (
          <g>
            <path d="M 110 70 Q 140 80 160 110" stroke="var(--accent-cyan)" strokeWidth="3" fill="none" />
            <text x="100" y="130" textAnchor="middle" fontSize="9" fill="#44ff88">{doneLabel}</text>
          </g>
        )}
      </svg>
    ),
    'bowline': (s) => (
      <svg viewBox="0 0 200 140" className="w-full h-auto">
        <path d="M 30 110 L 170 110" stroke="#8ba7b8" strokeWidth="3" fill="none" />
        {s >= 1 && <circle cx="100" cy="85" r="12" stroke="var(--accent-cyan)" strokeWidth="2" fill="none" />}
        {s >= 2 && <path d="M 95 85 L 95 55" stroke="var(--accent-cyan)" strokeWidth="3" fill="none" />}
        {s >= 3 && <path d="M 95 55 Q 130 50 130 75" stroke="var(--accent-cyan)" strokeWidth="3" fill="none" />}
        {s >= 4 && <path d="M 130 75 Q 125 95 105 90" stroke="var(--accent-cyan)" strokeWidth="3" fill="none" />}
        {s >= 5 && (
          <g>
            <ellipse cx="100" cy="100" rx="22" ry="30" stroke="#44ff88" strokeWidth="2" fill="none" />
            <text x="100" y="130" textAnchor="middle" fontSize="9" fill="#44ff88">{doneLabel}</text>
          </g>
        )}
      </svg>
    ),
    'cleat-hitch': (s) => (
      <svg viewBox="0 0 200 140" className="w-full h-auto">
        {/* Cleat */}
        <rect x="70" y="70" width="60" height="12" rx="4" fill="#8ba7b8" />
        <rect x="60" y="65" width="16" height="22" rx="3" fill="#8ba7b8" />
        <rect x="124" y="65" width="16" height="22" rx="3" fill="#8ba7b8" />
        {s >= 1 && <path d="M 20 100 Q 40 80 70 80 L 130 80" stroke="var(--accent-cyan)" strokeWidth="3" fill="none" />}
        {s >= 2 && <path d="M 130 80 Q 150 65 132 60 L 68 70 Q 50 75 70 60 L 130 50" stroke="var(--accent-cyan)" strokeWidth="3" fill="none" />}
        {s >= 3 && <path d="M 130 50 Q 140 55 120 60" stroke="var(--accent-cyan)" strokeWidth="3" fill="none" />}
        {s >= 4 && <text x="100" y="130" textAnchor="middle" fontSize="9" fill="#44ff88">{doneLabel}</text>}
      </svg>
    ),
    'clove-hitch': (s) => (
      <svg viewBox="0 0 200 140" className="w-full h-auto">
        {/* Post (vertical) */}
        <line x1="100" y1="20" x2="100" y2="120" stroke="#8ba7b8" strokeWidth="8" strokeLinecap="round" />
        {s >= 1 && <path d="M 40 100 Q 100 100 100 80 Q 100 65 160 65" stroke="var(--accent-cyan)" strokeWidth="3" fill="none" />}
        {s >= 2 && <path d="M 160 65 Q 170 45 100 50 Q 80 50 80 70 Q 80 85 160 95" stroke="var(--accent-cyan)" strokeWidth="3" fill="none" />}
        {s >= 3 && <path d="M 160 95 Q 145 100 130 95" stroke="var(--accent-cyan)" strokeWidth="3" fill="none" />}
        {s >= 4 && <text x="100" y="135" textAnchor="middle" fontSize="9" fill="#44ff88">{doneLabel}</text>}
      </svg>
    ),
    'round-turn-two-half-hitches': (s) => (
      <svg viewBox="0 0 200 140" className="w-full h-auto">
        {/* Ring */}
        <circle cx="100" cy="70" r="18" stroke="#8ba7b8" strokeWidth="4" fill="none" />
        {s >= 1 && (
          <g>
            <path d="M 20 70 Q 60 70 82 70" stroke="var(--accent-cyan)" strokeWidth="3" fill="none" />
            <ellipse cx="100" cy="70" rx="20" ry="20" stroke="var(--accent-cyan)" strokeWidth="2" fill="none" strokeDasharray="3,2" />
          </g>
        )}
        {s >= 2 && <path d="M 120 75 Q 140 90 130 100 Q 120 105 115 95" stroke="var(--accent-cyan)" strokeWidth="3" fill="none" />}
        {s >= 3 && <path d="M 115 95 Q 135 110 145 120 Q 155 122 148 112" stroke="var(--accent-cyan)" strokeWidth="3" fill="none" />}
        {s >= 4 && <text x="100" y="135" textAnchor="middle" fontSize="9" fill="#44ff88">{doneLabel}</text>}
      </svg>
    ),
    'sheet-bend': (s) => (
      <svg viewBox="0 0 200 140" className="w-full h-auto">
        {/* Thick rope loop */}
        {s >= 1 && <path d="M 30 85 Q 60 60 90 85 L 90 110" stroke="#8ba7b8" strokeWidth="5" fill="none" />}
        {/* Thin rope */}
        {s >= 2 && <path d="M 170 85 L 100 85 Q 80 85 85 100" stroke="var(--accent-cyan)" strokeWidth="3" fill="none" />}
        {s >= 3 && <path d="M 85 100 Q 75 75 60 75 L 55 70" stroke="var(--accent-cyan)" strokeWidth="3" fill="none" />}
        {s >= 4 && <path d="M 55 70 Q 65 55 95 70" stroke="var(--accent-cyan)" strokeWidth="3" fill="none" />}
        {s >= 5 && <text x="100" y="130" textAnchor="middle" fontSize="9" fill="#44ff88">{doneLabel}</text>}
      </svg>
    ),
  };

  const visual = visuals[knotId];
  if (!visual) {
    return (
      <div className="w-full h-32 flex items-center justify-center text-xs text-[var(--text-muted)]">
        {`step ${step}`}
      </div>
    );
  }
  return visual(step);
}

export default function KnotsPage() {
  const { lang, t } = useI18n();
  const [openId, setOpenId] = useState<string | null>(knots[0].id);
  const [stepByKnot, setStepByKnot] = useState<Record<string, number>>({});

  return (
    <div className="page-enter max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-6 p-4 rounded-xl"
           style={{ background: 'rgba(255, 170, 0, 0.08)', border: '1px solid rgba(255, 170, 0, 0.3)' }}>
        <div className="text-sm font-semibold mb-1" style={{ color: 'var(--warning)' }}>
          🚧 {t('Раздел в разработке', 'Section in progress')}
        </div>
        <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {t(
            'Готовим нормальные схемы узлов. Пока этот раздел спрятан из меню, но доступен по прямой ссылке для тестирования.',
            'Proper knot diagrams are in the works. Section is hidden from the menu for now but reachable via direct link.',
          )}
        </div>
      </div>
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-medium"
             style={{ background: 'rgba(136, 68, 255, 0.1)', border: '1px solid rgba(136, 68, 255, 0.25)', color: '#8844ff' }}>
          🪢 {t('Узлы', 'Knots')}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {t('6 узлов, которые реально нужны', '6 knots you actually need')}
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          {t(
            'Не коллекция, а рабочий набор. Используются везде на Bavaria 46 и на любой другой яхте.',
            'Not a collection - a working set. Used everywhere on Bavaria 46 and most yachts.',
          )}
        </p>
      </div>

      <div className="space-y-3">
        {knots.map((knot) => {
          const isOpen = openId === knot.id;
          const step = stepByKnot[knot.id] ?? 1;
          const name = lang === 'ru' ? knot.nameRu : knot.nameEn;
          const use = lang === 'ru' ? knot.useRu : knot.useEn;
          const bavUse = lang === 'ru' ? knot.bavariaUseRu : knot.bavariaUseEn;
          const mistake = lang === 'ru' ? knot.mistakeRu : knot.mistakeEn;
          const currentStep = knot.steps[Math.min(step - 1, knot.steps.length - 1)];
          return (
            <div key={knot.id} className="card overflow-hidden" style={{ borderColor: isOpen ? 'rgba(136, 68, 255, 0.3)' : undefined }}>
              <button
                onClick={() => setOpenId(isOpen ? null : knot.id)}
                className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0">{knot.emoji}</span>
                  <div className="min-w-0">
                    <div className="text-base sm:text-lg font-semibold truncate">{name}</div>
                    <div className="text-xs text-[var(--text-muted)] line-clamp-1">{use}</div>
                  </div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     className={`shrink-0 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {isOpen && (
                <div className="px-4 sm:px-5 pb-5 grid grid-cols-1 md:grid-cols-[260px,1fr] gap-5">
                  {/* Visual */}
                  <div>
                    <div className="rounded-lg p-3" style={{ background: 'rgba(11, 30, 56, 0.5)' }}>
                      <KnotStepVisual knotId={knot.id} step={step} doneLabel={t('готово', 'done')} />
                    </div>
                    {/* Step controls */}
                    <div className="flex items-center justify-between mt-3 gap-2">
                      <button
                        onClick={() => setStepByKnot((p) => ({ ...p, [knot.id]: Math.max(1, step - 1) }))}
                        disabled={step <= 1}
                        className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30 transition"
                        style={{ background: 'rgba(0, 212, 255, 0.15)', color: 'var(--accent-cyan)' }}
                      >
                        ←
                      </button>
                      <div className="flex gap-1">
                        {knot.steps.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setStepByKnot((p) => ({ ...p, [knot.id]: i + 1 }))}
                            className="w-6 h-1.5 rounded-full transition"
                            style={{ background: i + 1 <= step ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.3)' }}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => setStepByKnot((p) => ({ ...p, [knot.id]: Math.min(knot.steps.length, step + 1) }))}
                        disabled={step >= knot.steps.length}
                        className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-30 transition"
                        style={{ background: 'rgba(0, 212, 255, 0.15)', color: 'var(--accent-cyan)' }}
                      >
                        →
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">
                        {t('Применение', 'Use')}
                      </div>
                      <p className="text-[var(--text-primary)]">{use}</p>
                      {bavUse && (
                        <p className="mt-2 text-xs" style={{ color: 'var(--accent-cyan)' }}>⚓ {bavUse}</p>
                      )}
                    </div>

                    <div className="p-3 rounded-lg" style={{ background: 'rgba(0, 212, 255, 0.05)', border: '1px solid rgba(0, 212, 255, 0.15)' }}>
                      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--accent-cyan)' }}>
                        {t('Шаг', 'Step')} {step}/{knot.steps.length}: {lang === 'ru' ? currentStep.titleRu : currentStep.titleEn}
                      </div>
                      <p className="text-[var(--text-primary)] leading-relaxed">
                        {lang === 'ru' ? currentStep.detailsRu : currentStep.detailsEn}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg text-xs" style={{ background: 'rgba(255, 170, 0, 0.05)', border: '1px solid rgba(255, 170, 0, 0.2)' }}>
                      <span className="font-semibold" style={{ color: 'var(--warning)' }}>⚠️ {t('Типичная ошибка', 'Common mistake')}:</span>{' '}
                      <span className="text-[var(--text-primary)]">{mistake}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
