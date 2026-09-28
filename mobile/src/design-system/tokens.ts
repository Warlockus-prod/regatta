/**
 * Design tokens for Regatta mobile.
 *
 * Two palettes with identical keys:
 * - `lightColors` is the v3 "paper" look (warm paper, ink text, one blue
 *   action colour, teal for confirmation). It is the app default: `colors`.
 * - `darkColors` is the dark-ocean palette of builds up to 1.6.3. Instrument
 *   screens (native simulators, race, replay, offline anatomy) keep it and
 *   wrap their content in `<DarkSurface>` so the shared components switch too.
 *
 * Key names predate v3: `accentCyan` is "the action colour" (blue on paper,
 * cyan on dark ocean), `accentTeal` is confirmation. Keep using the names by
 * role, not by hue. Design source: docs/design/regatta-v3-master-plan.md.
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
  /** Hairline border (10% alpha). Default Card border, ListRow separator. */
  borderCyanFaint: 'rgba(0, 212, 255, 0.10)',
  /** Soft accent border (25% alpha). Pressed Card, secondary Button border. */
  borderCyanSoft: 'rgba(0, 212, 255, 0.25)',
  /** Strong accent border (40% alpha). Outline ring, active badge. */
  borderCyanStrong: 'rgba(0, 212, 255, 0.40)',
  /** Accent tint background (10% alpha). PulsePill, ghost surfaces. */
  surfaceCyanFaint: 'rgba(0, 212, 255, 0.10)',
  /** Accent tint background (15% alpha). Active badge background. */
  surfaceCyanSoft: 'rgba(0, 212, 255, 0.15)',
  /** Caution yellow: simulator overtrim sail state (between optimal green and luff). */
  overtrim: '#f5e26b',
  /** Success tint background (15% alpha). Completed badges, success surfaces. */
  surfaceSuccess: 'rgba(68, 255, 136, 0.15)',
  /** Success border (40% alpha). Completed-badge ring. */
  borderSuccess: 'rgba(68, 255, 136, 0.40)',
  /** v3: sand chips, number circles, progress tracks. */
  sand: '#1b3150',
  /** v3: pressed sand, stronger chip. */
  sandStrong: '#24406a',
  /** v3: uppercase section labels ("NEXT LESSON"). */
  eyebrow: '#5fd4c4',
  /** v3: raised surface of cards and the tab bar. */
  surfaceRaised: '#13243d',
  /** v3: text and icons drawn on top of photos. */
  onPhoto: '#ffffff',
} as const;

export type ThemeColors = { [K in keyof typeof darkColors]: string };

export const lightColors: ThemeColors = {
  bgPrimary: '#f7f5f0',
  bgSecondary: '#efebe3',
  bgCard: '#ffffff',
  bgCardHover: '#f3f0ea',
  accentCyan: '#006ea6',
  accentCyanDim: '#005a88',
  accentTeal: '#006d70',
  textPrimary: '#123247',
  textSecondary: '#526675',
  textMuted: '#5f7280',
  danger: '#b3261e',
  success: '#006d70',
  warning: '#8a6100',
  windColor: '#006ea6',
  sailColor: '#123247',
  waterLight: '#cfe3ee',
  waterDark: '#a9c9dc',
  borderCyanFaint: 'rgba(18, 50, 71, 0.10)',
  borderCyanSoft: 'rgba(0, 110, 166, 0.28)',
  borderCyanStrong: 'rgba(0, 110, 166, 0.45)',
  surfaceCyanFaint: 'rgba(0, 110, 166, 0.07)',
  surfaceCyanSoft: 'rgba(0, 110, 166, 0.12)',
  overtrim: '#9a7400',
  surfaceSuccess: 'rgba(0, 109, 112, 0.10)',
  borderSuccess: 'rgba(0, 109, 112, 0.40)',
  sand: '#e9ddc7',
  sandStrong: '#dccbaa',
  eyebrow: '#006d70',
  surfaceRaised: '#ffffff',
  onPhoto: '#ffffff',
};

/** The app palette. Instrument screens import `darkColors` instead. */
export const colors = lightColors;

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
 * Accent halos. On paper a coloured glow reads as a smudge, so the light
 * set is a soft ink shadow; the dark-ocean screens keep the cyan halo.
 */
export const darkGlow = {
  primary: { shadowColor: '#00d4ff', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  success: { shadowColor: '#44ff88', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  warning: { shadowColor: '#ffaa00', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
} as const;

export const glow = {
  primary: { shadowColor: '#123247', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  success: { shadowColor: '#123247', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  warning: { shadowColor: '#123247', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
} as const;

/**
 * Drop shadows: `card` (default surface), `lift` (pressed / floating),
 * `sheet` (bottom sheet, modal). The dark set uses black at high opacity
 * because a light shadow disappears on the ocean base.
 */
export const darkShadow = {
  card: { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  lift: { shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  sheet: { shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 24, shadowOffset: { width: 0, height: -8 }, elevation: 12 },
} as const;

export const shadow = {
  card: { shadowColor: '#123247', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  lift: { shadowColor: '#123247', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  sheet: { shadowColor: '#123247', shadowOpacity: 0.14, shadowRadius: 24, shadowOffset: { width: 0, height: -6 }, elevation: 12 },
} as const;

/** Ocean gradient stops, top to bottom (dark instrument screens). */
export const oceanGradient = ['#0a1628', '#071a30', '#0d2847'] as const;

/**
 * Border radius scale. `sm`/`md`/`lg` are the pre-v3 values still used by
 * dense screens; v3 surfaces use `control` (buttons, inputs, chips),
 * `card`, `photo` and `sheet`.
 */
export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  control: 14,
  card: 20,
  photo: 24,
  sheet: 28,
  pill: 999,
} as const;

/** Spacing scale, 4-pt grid. Phone side margin is `xl - 4` = 20. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export type ColorToken = keyof ThemeColors;
