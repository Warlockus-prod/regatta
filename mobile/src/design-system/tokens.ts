/**
 * Design tokens for Regatta mobile.
 *
 * Colors mirror `src/app/globals.css` :root (dark) and `[data-theme="light"]`
 * (light) vars so web and mobile stay in sync. Source of truth is web for now;
 * ADR-0003 defines extraction into a shared package once both clients consume
 * the same tokens.
 *
 * `radii`, `spacing`, `motion` are theme-independent. `colors` is split into
 * `darkColors` / `lightColors` with identical keys; the active palette is
 * resolved at runtime by the ThemeProvider (see `./theme.tsx`). New code reads
 * `useColors()` / `useThemedStyles()`; the module-level `colors` export below
 * stays pinned to the dark palette purely for back-compat with any not-yet
 * themed reference.
 *
 * Note: the palette / glow / shadow base objects are intentionally NOT `as
 * const` - their `typeof` is used as the shared shape type, so the values must
 * widen to `string` / `number` for the light variants to be assignable.
 */

export const darkColors = {
  bgPrimary: '#0a1628',
  bgSecondary: '#0f2035',
  bgCard: '#152540',
  bgCardHover: '#1a2d4d',
  accentCyan: '#00d4ff',
  accentCyanDim: '#0099cc',
  accentTeal: '#00ffcc',
  textPrimary: '#e8f4f8',
  textSecondary: '#8ba7b8',
  textMuted: '#7593a6',
  danger: '#ff4444',
  success: '#44ff88',
  warning: '#ffaa00',
  windColor: '#00e5ff',
  sailColor: '#ffffff',
  waterLight: '#0d2847',
  waterDark: '#061428',
  /** Hairline cyan border (10% alpha). Default Card border, ListRow separator. */
  borderCyanFaint: 'rgba(0, 212, 255, 0.10)',
  /** Soft cyan border (25% alpha). Pressed Card, secondary Button border. */
  borderCyanSoft: 'rgba(0, 212, 255, 0.25)',
  /** Strong cyan border (40% alpha). Outline ring, active badge. */
  borderCyanStrong: 'rgba(0, 212, 255, 0.40)',
  /** Cyan tint background (10% alpha). PulsePill, ghost surfaces. */
  surfaceCyanFaint: 'rgba(0, 212, 255, 0.10)',
  /** Cyan tint background (15% alpha). Active badge background. */
  surfaceCyanSoft: 'rgba(0, 212, 255, 0.15)',
  /** Caution yellow: simulator overtrim sail state (between optimal green and luff). */
  overtrim: '#f5e26b',
  /** Success tint background (15% alpha). Completed badges, success surfaces. */
  surfaceSuccess: 'rgba(68, 255, 136, 0.15)',
  /** Success border (40% alpha). Completed-badge ring. */
  borderSuccess: 'rgba(68, 255, 136, 0.40)',
};

export type ThemeColors = typeof darkColors;
export type ColorToken = keyof ThemeColors;

/**
 * Light palette. Mirrors the web `[data-theme="light"]` block in
 * `src/app/globals.css`; keep them in sync. Same keys as `darkColors`.
 */
export const lightColors: ThemeColors = {
  bgPrimary: '#f4f8fc',
  bgSecondary: '#e9f1f8',
  bgCard: '#ffffff',
  bgCardHover: '#eef5fb',
  accentCyan: '#0096c7',
  accentCyanDim: '#0077a3',
  accentTeal: '#00a78e',
  textPrimary: '#0c2233',
  textSecondary: '#45606f',
  textMuted: '#6a8190',
  danger: '#d92d2d',
  success: '#1f9d57',
  warning: '#b7791f',
  windColor: '#0096c7',
  sailColor: '#1a2d4d',
  waterLight: '#cfe6f5',
  waterDark: '#aacbe6',
  borderCyanFaint: 'rgba(12, 34, 51, 0.10)',
  borderCyanSoft: 'rgba(0, 150, 199, 0.30)',
  borderCyanStrong: 'rgba(0, 150, 199, 0.45)',
  surfaceCyanFaint: 'rgba(0, 150, 199, 0.08)',
  surfaceCyanSoft: 'rgba(0, 150, 199, 0.14)',
  overtrim: '#b8932a',
  surfaceSuccess: 'rgba(31, 157, 87, 0.14)',
  borderSuccess: 'rgba(31, 157, 87, 0.40)',
};

/**
 * Back-compat: `colors` stays pinned to the dark palette so any not-yet-themed
 * reference still resolves. New/refactored code must read the active palette
 * via `useColors()` / `useThemedStyles()` (see `./theme.tsx`).
 */
export const colors = darkColors;

/** Animation durations, ms. Centralized so motion stays consistent. */
export const motion = {
  /** Fast UI feedback (press, fade). */
  fast: 150,
  /** Default screen transitions. */
  base: 250,
  /** Pulse / ambient loops. */
  pulse: 1000,
} as const;

/**
 * Soft cyan glow used by the brand surfaces (PulsePill, Continue card,
 * Anatomy hotspot ring). Use as an iOS shadow on a `View`; on Android
 * it falls back gracefully to no glow (Android does not render colored
 * shadows pre-API-28). Keep it subtle - the dark-ocean base does the
 * heavy lifting and a strong glow reads "kids' app".
 */
export const glow = {
  /** Cyan halo for a primary-tinted card. */
  primary: {
    shadowColor: '#00d4ff',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  /** Subtle teal halo for a success-tinted celebration card. */
  success: {
    shadowColor: '#44ff88',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  /** Warm amber halo for a warning-tinted card or pill. */
  warning: {
    shadowColor: '#ffaa00',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
};

export type GlowSet = typeof glow;

/**
 * Light-mode glow: near-zero. A cyan halo on a white surface reads muddy, so
 * the ThemeProvider hands consumers this zeroed set in light mode (same keys,
 * so `useGlow().primary` spreads safely in either theme). Gate glow behind
 * `scheme === 'dark'` via `useGlow()`.
 */
export const glowLight: GlowSet = {
  primary: { shadowColor: '#00d4ff', shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 } },
  success: { shadowColor: '#44ff88', shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 } },
  warning: { shadowColor: '#ffaa00', shadowOpacity: 0, shadowRadius: 0, shadowOffset: { width: 0, height: 0 } },
};

/**
 * Layered drop-shadow tokens for Card / Sheet / Toast.
 * Designer scale: `card` (default surface), `lift` (pressed / floating),
 * `sheet` (bottom-sheet, modal). Tuned for the dark-ocean base where a
 * pure-black shadow disappears - the warm slate alpha gives definition.
 */
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  lift: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  sheet: {
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
};

export type ShadowSet = typeof shadow;

/**
 * Light-mode shadows. Same offsets/elevation as `shadow` but far lower opacity:
 * a 0.35+ black shadow reads too heavy on a white card. The ThemeProvider hands
 * consumers this set in light mode via `useShadows()`.
 */
export const shadowLight: ShadowSet = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  lift: {
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  sheet: {
    shadowColor: '#000',
    shadowOpacity: 0.20,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
};

/**
 * Ocean gradient stops, top to bottom. Matches the `.ocean-bg` class in
 * `src/app/globals.css`. Mobile renders this via `expo-linear-gradient`.
 * `oceanGradientLight` is the light-theme counterpart (soft sky-to-water).
 */
export const oceanGradient = ['#0a1628', '#071a30', '#0d2847'] as const;
export const oceanGradientLight = ['#ffffff', '#eef5fb', '#e2eef8'] as const;

/**
 * Border radius scale, RN-native pixel values. Aligned with the most
 * common values used in web (`.card` is 12, `.search-input` is 8,
 * badges use full pill).
 */
export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

/**
 * Spacing scale, 4-pt grid. Approximate match to common Tailwind spacing
 * usage on web. Refine as actual screens land.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;
