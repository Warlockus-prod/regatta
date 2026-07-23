'use client';

// ============================================================================
// What you keep getting wrong.
//
// Every trainer here already knows the answer to "did they get this right" - the
// scenario mistake detectors, the voice checklists, the dialogue turns, the
// question bank. But none of them REMEMBERED, so a learner who fails the same
// thing eight times gets told about it eight times and never once gets told that
// it is a pattern.
//
// This is the memory. Each miss is one increment against a stable key; each hit
// decays it. What surfaces is not "you scored 71%" - which teaches nothing - but
// "you have dropped OVER at the end of a transmission six times", which is a
// thing a person can go and fix.
//
// Local only, like every other bit of progress in this section. It never leaves
// the device.
// ============================================================================

const KEY = 'sternik.radio.weak.v1';

export type WeakArea = 'voice' | 'procedure' | 'dialogue' | 'control' | 'position' | 'theory' | 'oral';

export interface WeakSpot {
  /** stable id: the check id, the mistake id, the lesson id */
  id: string;
  area: WeakArea;
  /** what it is, in the learner's words - stored so the panel needs no lookup */
  label: string;
  misses: number;
  hits: number;
  lastMissAt: number;
}

type Store = Record<string, WeakSpot>;

function load(): Store {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    // Guard the SHAPE, not just parse errors: 'null' -> null, '42' -> number,
    // '"x"' -> string all parse fine, then record() does store[key] and weakest()
    // does Object.values() on them and throws on every graded attempt after.
    const p = JSON.parse(raw);
    return p && typeof p === 'object' && !Array.isArray(p) ? p as Store : {};
  } catch {
    return {};
  }
}

function save(s: Store): void {
  try { window.localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private browsing */ }
}

/**
 * Record one graded attempt. `missed` are the things that went wrong; `passed`
 * are the things that went right, and they decay the count - otherwise a
 * mistake made once in January would still be top of the list in July.
 */
export function record(area: WeakArea, missed: { id: string; label: string }[], passed: { id: string }[] = []): void {
  if (typeof window === 'undefined') return;
  const store = load();
  const now = Date.now();

  for (const m of missed) {
    const key = `${area}:${m.id}`;
    const cur = store[key] ?? { id: m.id, area, label: m.label, misses: 0, hits: 0, lastMissAt: now };
    store[key] = { ...cur, label: m.label, misses: cur.misses + 1, lastMissAt: now };
  }
  for (const p of passed) {
    const key = `${area}:${p.id}`;
    const cur = store[key];
    if (cur) store[key] = { ...cur, hits: cur.hits + 1 };
  }
  save(store);
}

/**
 * The things worth working on, worst first.
 *
 * "Worst" is misses minus half the hits: something you have failed five times and
 * since fixed four is not a weak spot any more, and telling a learner otherwise
 * is how a trainer loses their trust.
 */
export function weakest(limit = 6): WeakSpot[] {
  if (typeof window === 'undefined') return [];
  return Object.values(load())
    .map((w) => ({ ...w, net: w.misses - w.hits * 0.5 }))
    .filter((w) => w.net >= 1)
    .sort((a, b) => b.net - a.net || b.lastMissAt - a.lastMissAt)
    .slice(0, limit)
    .map(({ ...w }) => w);
}

export function clearWeakSpots(): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
}
