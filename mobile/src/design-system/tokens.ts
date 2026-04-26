/**
 * Design tokens for Regatta mobile.
 *
 * Colors mirror `src/app/globals.css` :root vars so web and mobile stay in sync.
 * Source of truth is web for now; ADR-0003 defines extraction into a shared
 * package once both clients consume the same tokens.
 */

export const colors = {
  bgPrimary: '#0a1628',
  bgSecondary: '#0f2035',
  bgCard: '#152540',
  bgCardHover: '#1a2d4d',
  accentCyan: '#00d4ff',
  accentCyanDim: '#0099cc',
  accentTeal: '#00ffcc',
  textPrimary: '#e8f4f8',
  textSecondary: '#8ba7b8',
  textMuted: '#5a7a8a',
  danger: '#ff4444',
  success: '#44ff88',
  warning: '#ffaa00',
  windColor: '#00e5ff',
  sailColor: '#ffffff',
  waterLight: '#0d2847',
  waterDark: '#061428',
} as const;

/**
 * Ocean gradient stops, top to bottom. Matches the `.ocean-bg` class in
 * `src/app/globals.css`. Mobile renders this via `expo-linear-gradient`
 * (wired up in a later task).
 */
export const oceanGradient = ['#0a1628', '#071a30', '#0d2847'] as const;

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

export type ColorToken = keyof typeof colors;
