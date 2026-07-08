'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';

// ============================================================================
// Full-text search over the theory page. Highlights all matches live via the
// CSS Custom Highlight API (no DOM mutation) and lets you jump between them.
// Diacritic-insensitive so "swiatla" finds "swiatla" and "światła".
// ============================================================================

const foldDiacritics = (s: string) =>
  s.toLowerCase()
    .replace(/[ąàâä]/g, 'a').replace(/[ćç]/g, 'c').replace(/[ęèéê]/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/[óòô]/g, 'o')
    .replace(/[śş]/g, 's').replace(/[żź]/g, 'z').replace(/[ûùü]/g, 'u');

interface Match {
  node: Text;
  start: number;
  end: number;
  sectionId: string | null;
}

export default function TheorySearch() {
  const { tp } = useI18n();
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [active, setActive] = useState(0);
  const supported = typeof window !== 'undefined' && 'highlights' in CSS;

  const run = useCallback((q: string) => {
    const container = document.getElementById('sternik-theory');
    if (!container) return;
    const needle = foldDiacritics(q.trim());
    if (needle.length < 2) {
      try { (CSS as unknown as { highlights: Map<string, unknown> }).highlights.delete('sternik-search'); } catch { /* ignore */ }
      setMatches([]);
      return;
    }
    // collect text nodes, skipping the search box itself
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        n.parentElement?.closest('[data-theory-search]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    const found: Match[] = [];
    const ranges: Range[] = [];
    let node = walker.nextNode() as Text | null;
    while (node) {
      const hay = foldDiacritics(node.data);
      let from = 0;
      let idx = hay.indexOf(needle, from);
      while (idx !== -1) {
        const r = document.createRange();
        r.setStart(node, idx);
        r.setEnd(node, idx + needle.length);
        ranges.push(r);
        found.push({ node, start: idx, end: idx + needle.length, sectionId: node.parentElement?.closest('section[id]')?.id ?? null });
        from = idx + needle.length;
        idx = hay.indexOf(needle, from);
        if (found.length > 500) break;
      }
      node = walker.nextNode() as Text | null;
    }
    if (supported) {
      try {
        const HL = (window as unknown as { Highlight: new (...r: Range[]) => unknown }).Highlight;
        (CSS as unknown as { highlights: Map<string, unknown> }).highlights.set('sternik-search', new HL(...ranges));
      } catch { /* ignore */ }
    }
    setMatches(found);
    setActive(0);
  }, [supported]);

  // debounce
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => run(query), 180);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, run]);

  // cleanup highlight on unmount
  useEffect(() => () => {
    try { (CSS as unknown as { highlights: Map<string, unknown> }).highlights.delete('sternik-search'); } catch { /* ignore */ }
  }, []);

  const jump = (dir: 1 | -1) => {
    if (matches.length === 0) return;
    const next = (active + dir + matches.length) % matches.length;
    setActive(next);
    const m = matches[next];
    m.node.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div data-theory-search className="mb-5">
      <div
        className="flex items-center gap-2 rounded-xl px-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <span style={{ color: 'var(--text-muted)' }}>🔎</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') jump(e.shiftKey ? -1 : 1); }}
          placeholder={tp('Поиск по теории...', 'Search the theory...', 'Szukaj w teorii...')}
          className="min-h-[44px] flex-1 bg-transparent text-sm outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        {matches.length > 0 && (
          <>
            <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {active + 1}/{matches.length}
            </span>
            <button type="button" aria-label="prev" onClick={() => jump(-1)} className="px-1.5 text-lg" style={{ color: 'var(--text-secondary)' }}>‹</button>
            <button type="button" aria-label="next" onClick={() => jump(1)} className="px-1.5 text-lg" style={{ color: 'var(--text-secondary)' }}>›</button>
          </>
        )}
        {query && (
          <button type="button" aria-label="clear" onClick={() => setQuery('')} className="px-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>×</button>
        )}
      </div>
      {query.trim().length >= 2 && matches.length === 0 && (
        <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          {tp('Ничего не найдено', 'No matches', 'Brak wynikow')}
        </div>
      )}
    </div>
  );
}
