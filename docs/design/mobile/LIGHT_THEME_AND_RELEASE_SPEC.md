# Mobile light theme + release spec (build 23)

Status: ready to implement. Written 2026-06-29 from the Shared/web lane after the
web light theme shipped. **Do this in the main `mobile/` checkout** (toolchain +
Apple signing live there), NOT in a web worktree - the app must be run in the iOS
simulator to verify before submitting.

## What is already done (no work needed)
- `mobile/src/data/gallery.json` already carries the **2026 album (34 photos)** and
  the **de-dated 2025** titles (synced from web via `npm run sync-content`). Images
  stream from `weektoregatta.com`.
- Domain rebrand to `weektoregatta.com` is already in the mobile code (`WEB_BASE`,
  `API_BASE`, asc-metadata, settings text).
- So the **next build picks up the gallery + domain for free**. This spec adds the
  **light theme**, then ships everything as one release.

## Goal
Add an Auto / Light / Dark theme to the app (currently dark-only), matching the web.
- `auto` follows the OS (`Appearance` / `useColorScheme`), live-updating.
- Choice persists in `AsyncStorage` under key `regatta_theme` (same key as web).
- Toggle lives in Settings.

---

## 1. Tokens: split into light + dark (`src/design-system/tokens.ts`)

Keep `radii`, `spacing`, `motion` exactly as-is (theme-independent). Split `colors`
into two palettes with identical keys. **Light values mirror the web
`[data-theme="light"]` block in `src/app/globals.css`** - keep them in sync.

```ts
export const darkColors = {
  bgPrimary: '#0a1628', bgSecondary: '#0f2035', bgCard: '#152540', bgCardHover: '#1a2d4d',
  accentCyan: '#00d4ff', accentCyanDim: '#0099cc', accentTeal: '#00ffcc',
  textPrimary: '#e8f4f8', textSecondary: '#8ba7b8', textMuted: '#7593a6',
  danger: '#ff4444', success: '#44ff88', warning: '#ffaa00',
  windColor: '#00e5ff', sailColor: '#ffffff', waterLight: '#0d2847', waterDark: '#061428',
  borderCyanFaint: 'rgba(0,212,255,0.10)', borderCyanSoft: 'rgba(0,212,255,0.25)', borderCyanStrong: 'rgba(0,212,255,0.40)',
  surfaceCyanFaint: 'rgba(0,212,255,0.10)', surfaceCyanSoft: 'rgba(0,212,255,0.15)',
  overtrim: '#f5e26b', surfaceSuccess: 'rgba(68,255,136,0.15)', borderSuccess: 'rgba(68,255,136,0.40)',
} as const;

export const lightColors: typeof darkColors = {
  bgPrimary: '#f4f8fc', bgSecondary: '#e9f1f8', bgCard: '#ffffff', bgCardHover: '#eef5fb',
  accentCyan: '#0096c7', accentCyanDim: '#0077a3', accentTeal: '#00a78e',
  textPrimary: '#0c2233', textSecondary: '#45606f', textMuted: '#6a8190',
  danger: '#d92d2d', success: '#1f9d57', warning: '#b7791f',
  windColor: '#0096c7', sailColor: '#1a2d4d', waterLight: '#cfe6f5', waterDark: '#aacbe6',
  borderCyanFaint: 'rgba(12,34,51,0.10)', borderCyanSoft: 'rgba(0,150,199,0.30)', borderCyanStrong: 'rgba(0,150,199,0.45)',
  surfaceCyanFaint: 'rgba(0,150,199,0.08)', surfaceCyanSoft: 'rgba(0,150,199,0.14)',
  overtrim: '#b8932a', surfaceSuccess: 'rgba(31,157,87,0.14)', borderSuccess: 'rgba(31,157,87,0.40)',
} as const;

export type ThemeColors = typeof darkColors;
export type ColorToken = keyof ThemeColors;

// Back-compat: keep `colors` exported as the dark palette so any non-themed
// reference still resolves. New code uses useColors().
export const colors = darkColors;

export const oceanGradient = ['#0a1628', '#071a30', '#0d2847'] as const;        // dark
export const oceanGradientLight = ['#ffffff', '#eef5fb', '#e2eef8'] as const;   // light
```

Shadows (`shadow.*`) are tuned for dark (`shadowColor:'#000'`, high opacity). On
light surfaces they read too heavy. Add light shadow variants (e.g. opacity 0.10/
0.14/0.20, same offsets) and select by scheme in `useThemedStyles` consumers that
use shadows (Card, Sheet, Toast). `glow.*` (cyan halo) should be near-zero in light
mode - gate it behind `scheme === 'dark'`.

---

## 2. Theme provider + hooks (`src/design-system/theme.tsx`, new)

```tsx
import { Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { darkColors, lightColors, type ThemeColors } from './tokens';

export type ThemeMode = 'auto' | 'light' | 'dark';
const KEY = 'regatta_theme';

type Ctx = { mode: ThemeMode; scheme: 'light' | 'dark'; colors: ThemeColors; setMode: (m: ThemeMode) => void };
const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();                 // live OS scheme
  const [mode, setModeState] = useState<ThemeMode>('auto');
  useEffect(() => { AsyncStorage.getItem(KEY).then((v) => { if (v === 'light' || v === 'dark' || v === 'auto') setModeState(v); }); }, []);
  const setMode = (m: ThemeMode) => { setModeState(m); AsyncStorage.setItem(KEY, m).catch(() => {}); };
  const scheme: 'light' | 'dark' = mode === 'auto' ? (system === 'light' ? 'light' : 'dark') : mode;
  const colors = scheme === 'light' ? lightColors : darkColors;
  const value = useMemo(() => ({ mode, scheme, colors, setMode }), [mode, scheme, colors]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() { const c = useContext(ThemeCtx); if (!c) throw new Error('useTheme outside ThemeProvider'); return c; }
export function useColors() { return useTheme().colors; }

// Build themed StyleSheet once per palette change.
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(factory: (c: ThemeColors) => T): T {
  const colors = useColors();
  return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
}
```

Export these from `src/design-system/components/index.ts` (or a `theme` barrel).

---

## 3. Refactor the 24 color consumers

Files (all under `mobile/src/`):
```
design-system/components/: Slider, OfflineBanner, Card, QuizCard, RuleScenarioDiagram,
  PointsOfSailDiagram, SkiaYacht, PulsePill, Text, Wordmark, LessonDiagram, ErrorBoundary,
  Icon, Screen, Button, ListRow, Skeleton, WindNowCard, EmptyState, PlaceholderScreen,
  RacingDiagrams
anatomy/yacht-svg.ts        (util - NOT a component)
leaderboard/local.ts        (util - NOT a component)
onboarding/first-launch-language.tsx
```

### Component pattern (the 22 component files)
Convert the module-level `StyleSheet.create` to a `makeStyles(c)` factory and call
the hook in the component:

```tsx
// before
import { colors, spacing } from '../tokens';
const styles = StyleSheet.create({ card: { backgroundColor: colors.bgCard, borderColor: colors.borderCyanFaint } });
export function Card(props) { return <View style={styles.card} />; }

// after
import { spacing } from '../tokens';
import { useThemedStyles } from '../theme';
import type { ThemeColors } from '../tokens';
const makeStyles = (c: ThemeColors) => StyleSheet.create({ card: { backgroundColor: c.bgCard, borderColor: c.borderCyanFaint } });
export function Card(props) { const styles = useThemedStyles(makeStyles); return <View style={styles.card} />; }
```

Rules for the refactor:
- Replace `colors.X` inside the StyleSheet with `c.X`; keep `spacing`/`radii` imports as static.
- Any inline `style={{ color: colors.X }}` in JSX -> `const c = useColors()` then `c.X`.
- Hardcoded hex that maps to a token (e.g. `'#00d4ff'`) -> the matching `c.*`.
- `oceanGradient` usage (Screen background) -> pick `scheme === 'light' ? oceanGradientLight : oceanGradient` via `useTheme()`.
- SVG/Skia (`SkiaYacht`, `*Diagram`, `yacht-svg.ts`): these draw with explicit colors.
  For the **components**, read `useColors()` and pass colors into the draw props. For
  `yacht-svg.ts` (pure util that returns SVG strings/data), add a `colors: ThemeColors`
  parameter and have callers pass the active palette (don't import the static one).
- `leaderboard/local.ts` (util): if it only uses a color for a computed value, pass it
  in from the caller; otherwise it can keep the dark default - confirm it renders nothing.

This is mechanical but per-file; budget for careful review of the SVG/Skia/diagram
files (they have the most color references).

### StatusBar
In `app/_layout.tsx`, drive `expo-status-bar` from the scheme:
`<StatusBar style={scheme === 'light' ? 'dark' : 'light'} />` (needs a small child
component inside ThemeProvider so it can read `useTheme()`).

---

## 4. Wire the provider (`app/_layout.tsx`)
Wrap the existing provider stack with `ThemeProvider` (inside SafeAreaProvider,
outside I18nProvider is fine). Replace the static `import { colors }` used for the
root background with a themed read. Keep `SplashScreen` logic intact.

---

## 5. Toggle UI (Settings screen)
Add a 3-state control (Auto / Light / Dark) calling `useTheme().setMode`. Mirror the
web labels: RU "Тема: авто/светлая/тёмная", EN "Theme: auto/light/dark" (+ pl/es/fr/
de/it as in `src/components/ThemeToggle.tsx`). Place it near the existing
appearance/data settings.

---

## 6. Verify in the iOS simulator (MANDATORY before submit)
```
cd mobile
npm install            # if needed
npx expo run:ios       # or open ios/ in Xcode and run
```
Walk every major screen in **light**, **dark**, and **auto** (flip the simulator's
Appearance: Settings > Developer > Dark Appearance, or Features menu):
- Home, bootcamp lesson + diagram, quiz, rules scenario, points-of-sail, anatomy
  (Skia yacht), gallery (2026 album loads + 2025 de-dated), leaderboard, settings,
  onboarding/first-launch, offline banner, simulator preview screen.
- Check: text contrast, card borders, the ocean gradient, StatusBar legibility,
  no white-on-white or dark-on-dark, no leftover `#0a1628` hardcodes.
Take screenshots in both modes for the record.

## 7. Build + submit (ship-expo-ios-appstore skill)
- Bump `mobile/app.json`: `expo.version` -> `1.4.0`, `ios.buildNumber` -> `"23"`.
- Follow the `ship-expo-ios-appstore` skill end-to-end (archive -> altool -> ASC).
- App Store Connect "What's New" (7 langs), suggested EN:
  "New 2026 regatta photo gallery, plus a light theme with automatic day/night
  switching. Now at weektoregatta.com."
- Submit for review.

## 8. Coordination
This touches Mobile-lane files (`mobile/src/design-system/*`, screens). If a mobile
chat is active, coordinate before the 24-file refactor to avoid conflicts. The web
light theme (already shipped) is the reference for palette + behavior; keep
`lightColors` in sync with `[data-theme="light"]` in `src/app/globals.css`.
