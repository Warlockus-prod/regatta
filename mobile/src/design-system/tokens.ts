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
} as const;

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
} as const;

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
