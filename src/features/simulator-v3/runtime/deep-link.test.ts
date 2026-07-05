import { describe, expect, it } from 'vitest';
import { resolveTrainerDeepLink } from './deep-link';
import { DRILLS, SCENARIO_PRESETS } from './scenario-presets';

// ---------------------------------------------------------------------------
// Lesson deep-links: ?drill=<id> / ?scenario=<id> must resolve to the exact
// catalogue entries the DrillCard / ScenarioPicker panels activate, so the
// bootcamp routes in src/data/bootcamp.ts and the app's ?embed=1&drill=...
// links keep working as the catalogue evolves.
// ---------------------------------------------------------------------------

describe('resolveTrainerDeepLink', () => {
  it('resolves every drill id in the catalogue to its definition', () => {
    for (const drill of DRILLS) {
      const link = resolveTrainerDeepLink(new URLSearchParams(`drill=${drill.id}`));
      expect(link).toEqual({ kind: 'drill', drill });
    }
  });

  it('resolves every scenario id in the catalogue to its preset', () => {
    for (const scenario of SCENARIO_PRESETS) {
      const link = resolveTrainerDeepLink(
        new URLSearchParams(`scenario=${scenario.id}`),
      );
      expect(link).toEqual({ kind: 'scenario', scenario });
    }
  });

  it('resolves the bootcamp lesson link (drill=hold-trim, with embed)', () => {
    // Mirrors the route wired in src/data/bootcamp.ts and the app deep-link
    // convention ?embed=1&drill=... - extra params must not interfere.
    const link = resolveTrainerDeepLink(
      new URLSearchParams('embed=1&drill=hold-trim'),
    );
    expect(link?.kind).toBe('drill');
    expect(link?.kind === 'drill' && link.drill.id).toBe('hold-trim');
  });

  it('prefers the drill when both drill and scenario are present', () => {
    const link = resolveTrainerDeepLink(
      new URLSearchParams('drill=reduce-heel&scenario=overpowered'),
    );
    expect(link?.kind).toBe('drill');
  });

  it('falls through to the scenario when the drill id is unknown', () => {
    const link = resolveTrainerDeepLink(
      new URLSearchParams('drill=nope&scenario=bad-slot'),
    );
    expect(link?.kind === 'scenario' && link.scenario.id).toBe('bad-slot');
  });

  it('ignores unknown or absent ids silently', () => {
    expect(resolveTrainerDeepLink(new URLSearchParams(''))).toBeNull();
    expect(resolveTrainerDeepLink(new URLSearchParams('drill='))).toBeNull();
    expect(resolveTrainerDeepLink(new URLSearchParams('drill=unknown'))).toBeNull();
    expect(resolveTrainerDeepLink(new URLSearchParams('scenario=unknown'))).toBeNull();
    expect(resolveTrainerDeepLink(new URLSearchParams('twa=90&tws=12'))).toBeNull();
  });
});
