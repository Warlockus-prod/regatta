# ADR-0003 execution checklist (Shared lane)

This is the runbook for the Shared lane to execute the workspace
extraction approved in ADR-0003. Mobile lane has signed off on the
decision; the actual file moves and import rewrites happen here.

Run from repo root unless otherwise noted.

## Prerequisites

- `main` branch is clean (`git status` no uncommitted changes).
- The mobile bridging is in place: `mobile/scripts/sync-content.ts`
  produces `mobile/src/data/*.json` from `src/data/*.ts`. Today, mobile
  has its own typed barrel at `mobile/src/data/index.ts`.

## Step 1: Set up workspaces at repo root

1. Edit `package.json` at repo root:
   ```json
   {
     "workspaces": ["mobile", "packages/*"]
   }
   ```
2. Create the empty `packages/` directory.

## Step 2: Extract `@regatta/content`

```bash
mkdir -p packages/content/src
git mv src/data/*.ts packages/content/src/
```

Move localization types that data files import (`LegacyLocalized<>`,
`Lang`, `LocalizedText`, `pickLocalized`, `legacyPick`,
`legacyPickArray`) from `src/lib/languages.ts` into
`packages/content/src/types.ts`. Web's `src/lib/languages.ts` keeps
the React-bound bits (`LANGUAGE_CATALOG`, `pickLangFromAccept`,
`pickLangFromNavigator`) and re-exports the moved ones from the
package.

Create `packages/content/package.json`:
```json
{
  "name": "@regatta/content",
  "version": "0.1.0",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "private": true
}
```

Create `packages/content/src/index.ts` with re-exports of every data
file plus the types.

Update web imports across the repo. The mechanical change:
- `from '@/data/bootcamp'` -> `from '@regatta/content/bootcamp'`
- `from '@/lib/languages'` -> `from '@regatta/content/types'` for the
  type-only imports; the runtime `pickLocalized` etc. also live in the
  package now.

The `tsconfig.json` `paths` alias may need adjustment so `@/data` no
longer resolves (force the full `@regatta/content` import).

`scripts/translate-data-flat.mjs` and `scripts/cyrillic-scan.mjs` get
their search-path updated from `src/data/*` to `packages/content/src/*`.

## Step 3: Switch mobile to the package

In `mobile/package.json`:
```json
{
  "dependencies": {
    "@regatta/content": "*"
  }
}
```

Then in `mobile/src/data/index.ts`:
```ts
export * from '@regatta/content';
export * from '@regatta/content/types';
```

The local `mobile/src/data/*.json` files and `mobile/src/data/types.ts`
get deleted. `mobile/scripts/sync-content.ts` and the
`sync-content` / `sync-content:check` npm scripts get deleted.

CI: remove the `sync-content:check` step from any mobile workflow.

## Step 4: Metro monorepo config (mobile-side)

Create `mobile/metro.config.js`:
```js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
```

Standard Expo monorepo recipe. Watches the entire repo so Metro picks
up changes inside `packages/*`.

## Step 5: Extract `@regatta/physics` (Phase 2 trigger)

Same shape as content extraction. Move `src/lib/sailing-physics/*` to
`packages/physics/src/`. Mobile imports `@regatta/physics` instead of
the local stub at `mobile/src/simulator/tick.ts`. Both clients run
`packages/physics`'s test suite in CI (golden fixtures). Mobile's
stub `tick` and `types` files get deleted in favor of the shared API.

## Step 6: CI

Update `paths:` filters on existing GitHub Actions workflows:
- Web workflows: trigger on `src/**`, `app/**` (web), `packages/**`,
  `package.json` at root.
- Mobile workflows: trigger on `mobile/**`, `packages/**`,
  `package.json` at root.

## Verification

After extraction:

1. `npm install` at root succeeds. All three workspaces (web, mobile,
   packages/content) install.
2. Web build still works: `npm run build` from repo root.
3. Mobile typecheck passes: `cd mobile && npm run typecheck`.
4. Mobile tests pass: `cd mobile && npm test`.
5. `cd mobile && npx expo run:ios` boots the app, every content screen
   renders the same lessons / rules / glossary as before extraction.

## Rollback

The whole change is a series of file moves + import rewrites. If
something breaks at the Metro / Expo side, `git revert` returns to the
bridging-script flow. Mobile's `sync-content.ts` resurrects with the
revert.
