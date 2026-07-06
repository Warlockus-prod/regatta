import { describe, expect, it } from 'vitest';
import { trainerCatalog } from '@/data/drills';
import { DRILLS, SCENARIO_PRESETS } from './scenario-presets';

// ---------------------------------------------------------------------------
// The trainer catalog (src/data/drills.ts) is the single source of truth for
// drill/scenario/mission ids and localized text on BOTH platforms (web V3
// reads it directly; mobile reads the synced drills.json). These tests keep
// it complete: every entry must carry non-empty title + goal in all 7
// languages, ids must be unique, and the web runtime must never reference an
// id the catalog does not have.
// ---------------------------------------------------------------------------

const LANGS = ['ru', 'en', 'pl', 'es', 'fr', 'de', 'it'] as const;

describe('trainer catalog (src/data/drills.ts)', () => {
  it('has unique ids across all kinds', () => {
    const ids = trainerCatalog.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has non-empty title and goal in all 7 languages for every entry', () => {
    for (const entry of trainerCatalog) {
      for (const lang of LANGS) {
        expect(entry.title[lang]?.trim(), `${entry.id}.title.${lang}`).toBeTruthy();
        expect(entry.goal[lang]?.trim(), `${entry.id}.goal.${lang}`).toBeTruthy();
      }
    }
  });

  it('declares a valid kind and at least one platform for every entry', () => {
    for (const entry of trainerCatalog) {
      expect(['drill', 'scenario', 'mission']).toContain(entry.kind);
      expect(entry.platforms.length, `${entry.id}.platforms`).toBeGreaterThan(0);
    }
  });

  it('covers every V3 drill and scenario id the web runtime uses', () => {
    const ids = new Set(trainerCatalog.map((e) => e.id));
    for (const drill of DRILLS) {
      expect(ids.has(drill.id), `catalog entry for drill "${drill.id}"`).toBe(true);
    }
    for (const scenario of SCENARIO_PRESETS) {
      expect(ids.has(scenario.id), `catalog entry for scenario "${scenario.id}"`).toBe(true);
    }
  });
});
