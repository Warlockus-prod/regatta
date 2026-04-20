'use client';

import { useState, useMemo } from 'react';
import { glossaryTerms, glossaryCategories } from '@/data/sailing-data';
import { useI18n } from '@/lib/i18n';

const categoryColors: Record<string, { color: string; bg: string; border: string }> = {
  boat:     { color: '#00d4ff', bg: 'rgba(0, 212, 255, 0.12)',  border: 'rgba(0, 212, 255, 0.25)' },
  sail:     { color: '#00d4ff', bg: 'rgba(0, 212, 255, 0.12)',  border: 'rgba(0, 212, 255, 0.25)' },
  course:   { color: '#44ff88', bg: 'rgba(68, 255, 136, 0.12)', border: 'rgba(68, 255, 136, 0.25)' },
  maneuver: { color: '#ffaa00', bg: 'rgba(255, 170, 0, 0.12)',  border: 'rgba(255, 170, 0, 0.25)' },
  wind:     { color: '#00ffcc', bg: 'rgba(0, 255, 204, 0.12)',  border: 'rgba(0, 255, 204, 0.25)' },
  racing:   { color: '#ffaa00', bg: 'rgba(255, 170, 0, 0.12)',  border: 'rgba(255, 170, 0, 0.25)' },
  crew:     { color: '#8844ff', bg: 'rgba(136, 68, 255, 0.12)', border: 'rgba(136, 68, 255, 0.25)' },
};

const allCategories = ['all', ...Object.keys(glossaryCategories)] as const;

export default function GlossaryPage() {
  const { lang, tp } = useI18n();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [animationKey, setAnimationKey] = useState(0);

  // Pick the term / definition / category-name in the active language.
  // Russian stays original; English is the international anchor; Polish uses
  // its own terms where applicable (some are loanwords like "bajdewind").
  const pickTerm = (t: typeof glossaryTerms[number]): string =>
    lang === 'pl' ? t.termPl : lang === 'en' ? t.termEn : t.termRu;
  const pickDef = (t: typeof glossaryTerms[number]): string =>
    lang === 'pl' ? t.definitionPl : lang === 'en' ? t.definitionEn : t.definition;
  const pickCat = (cat: string): string => {
    const c = glossaryCategories[cat];
    if (!c) return cat;
    return lang === 'pl' ? c.namePl : lang === 'en' ? c.nameEn : c.nameRu;
  };

  const filteredTerms = useMemo(() => {
    const q = search.toLowerCase().trim();
    return glossaryTerms.filter((term) => {
      const matchesCategory = activeCategory === 'all' || term.category === activeCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        term.termRu.toLowerCase().includes(q) ||
        term.termEn.toLowerCase().includes(q) ||
        term.termPl.toLowerCase().includes(q) ||
        term.definition.toLowerCase().includes(q) ||
        term.definitionEn.toLowerCase().includes(q) ||
        term.definitionPl.toLowerCase().includes(q)
      );
    });
  }, [search, activeCategory]);

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setAnimationKey((k) => k + 1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setAnimationKey((k) => k + 1);
  };

  return (
    <div className="page-enter">
      {/* Header */}
      <section className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-8 text-center">
          <h1
            className="text-3xl sm:text-4xl font-bold tracking-tight mb-2"
            style={{
              background: 'linear-gradient(135deg, var(--text-primary), #8844ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {tp('Глоссарий', 'Glossary', 'Slownik')}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">{tp('Sailing Glossary', 'Sailing Glossary', 'Slownik zeglarski')}</p>
        </div>
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(136,68,255,0.3), transparent)' }}
        />
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder={tp('Поиск терминов...', 'Search terms...', 'Wyszukaj terminy...')}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="search-input w-full pl-11 pr-4 py-3 text-sm"
          />
          {search && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[rgba(0,212,255,0.1)] transition-colors"
              aria-label="Clear search"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
          {allCategories.map((cat) => {
            const isActive = activeCategory === cat;
            const colors = cat !== 'all' ? categoryColors[cat] : null;
            return (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className="shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                style={
                  isActive
                    ? cat === 'all'
                      ? {
                          background: 'rgba(0, 212, 255, 0.15)',
                          color: '#00d4ff',
                          border: '1px solid rgba(0, 212, 255, 0.3)',
                        }
                      : {
                          background: colors!.bg,
                          color: colors!.color,
                          border: `1px solid ${colors!.border}`,
                        }
                    : {
                        background: 'rgba(255,255,255,0.04)',
                        color: 'var(--text-muted)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }
                }
              >
                {cat === 'all' ? tp('Все', 'All', 'Wszystkie') : pickCat(cat)}
              </button>
            );
          })}
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>
            {filteredTerms.length === glossaryTerms.length
              ? tp(
                  `${glossaryTerms.length} терминов`,
                  `${glossaryTerms.length} terms`,
                  `${glossaryTerms.length} terminow`,
                )
              : tp(
                  `${filteredTerms.length} из ${glossaryTerms.length}`,
                  `${filteredTerms.length} of ${glossaryTerms.length}`,
                  `${filteredTerms.length} z ${glossaryTerms.length}`,
                )}
          </span>
          {activeCategory !== 'all' && (
            <span style={{ color: categoryColors[activeCategory]?.color }}>
              {pickCat(activeCategory)}
            </span>
          )}
        </div>

        {/* Term cards grid */}
        {filteredTerms.length > 0 ? (
          <div key={animationKey} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTerms.map((term, index) => {
              const colors = categoryColors[term.category];
              return (
                <div
                  key={term.id}
                  className="card p-5 flex flex-col gap-3"
                  style={{
                    animation: `cardFadeIn 0.3s ease-out ${index * 0.03}s both`,
                  }}
                >
                  {/* Top row: terms + badge. Show the active-lang term big,
                      English stays as a small subtitle (the international
                      anchor every sailor will recognise). */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold leading-tight text-[var(--text-primary)]">
                        {pickTerm(term)}
                      </h2>
                      {lang !== 'en' && (
                        <p className="text-sm mt-0.5" style={{ color: '#00d4ff' }}>
                          {term.termEn}
                        </p>
                      )}
                    </div>
                    <span
                      className="badge shrink-0 mt-0.5"
                      style={{
                        background: colors.bg,
                        color: colors.color,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      {pickCat(term.category)}
                    </span>
                  </div>

                  {/* Definition in active language. EN shown as faint subtitle
                      only in non-EN modes (keeps cards compact for EN readers). */}
                  <div className="flex flex-col gap-1.5">
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                      {pickDef(term)}
                    </p>
                    {lang !== 'en' && (
                      <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                        {term.definitionEn}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty state */
          <div className="card p-12 text-center flex flex-col items-center gap-3">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: 0.5 }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            <p className="text-sm text-[var(--text-muted)]">
              {tp('Ничего не найдено', 'No terms match your search', 'Nic nie znaleziono')}
            </p>
            {lang !== 'en' && (
              <p className="text-xs text-[var(--text-muted)]" style={{ opacity: 0.7 }}>
                No terms match your search
              </p>
            )}
            <button
              onClick={() => {
                setSearch('');
                setActiveCategory('all');
                setAnimationKey((k) => k + 1);
              }}
              className="mt-2 text-xs px-4 py-1.5 rounded-full transition-colors"
              style={{
                color: '#00d4ff',
                background: 'rgba(0, 212, 255, 0.1)',
                border: '1px solid rgba(0, 212, 255, 0.2)',
              }}
            >
              {tp('Сбросить фильтры', 'Clear filters', 'Wyczysc filtry')}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
