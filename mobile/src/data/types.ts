/**
 * Type definitions for mobile content bundles.
 *
 * Mirrors the structural types from `src/data/*.ts` on web. Until the
 * Shared lane completes the ADR-0003 extraction (`@regatta/content`),
 * these are kept in sync by hand and `sync-content:check` in CI catches
 * shape drift between web TS and mobile JSON.
 */

import type { LegacyLocalized, LocalizedText } from '../i18n/languages';

/** A guided Bootcamp lesson, ~5 min each, 8 total. */
export type BootcampLesson =
  & LegacyLocalized<'title'>
  & LegacyLocalized<'summary'>
  & LegacyLocalized<'focus'>
  & {
    id: string;
    order: number;
    emoji: string;
    estMinutes: number;
    /** Route to open for this lesson, e.g. `/simulator`. */
    route: string;
  };

/** A 30-second refresh tip for experienced sailors. */
export type QuickLesson =
  & LegacyLocalized<'title'>
  & LegacyLocalized<'tip'>
  & {
    id: string;
    emoji: string;
    route: string;
    estMinutes: number;
  };

/** Glossary category buckets. */
export type GlossaryCategoryId =
  | 'boat'
  | 'sail'
  | 'course'
  | 'maneuver'
  | 'racing'
  | 'wind'
  | 'crew';

/** A glossary term with localized definition. */
export type GlossaryTerm =
  & LegacyLocalized<'term'>
  & LegacyLocalized<'definition'>
  & {
    id: string;
    category: GlossaryCategoryId;
  };

/** Categories rendered as filter chips. Values carry display names. */
export type GlossaryCategories = Record<
  GlossaryCategoryId,
  LegacyLocalized<'name'>
>;

/** SVG illustration name for a rule scenario. */
export type RuleScenarioSvg =
  | 'port-vs-starboard'
  | 'windward-leeward'
  | 'overtaking'
  | 'mark-room'
  | 'crossing'
  | 'start-line'
  | 'collision-avoid'
  | 'penalty';

/** A racing-rule or COLREGS scenario with reveal-style Q/A. */
export type RuleScenario =
  & LegacyLocalized<'title'>
  & LegacyLocalized<'scene'>
  & LegacyLocalized<'question'>
  & LegacyLocalized<'answer'>
  & LegacyLocalized<'why'>
  & LegacyLocalized<'inPractice'>
  & {
    id: string;
    icon: string;
    svg: RuleScenarioSvg;
    /** RRS = Racing Rules of Sailing. COLREGS = collision-prevention rules. */
    source?: 'rrs' | 'colregs';
  };

/**
 * A shipboard culture / commands / etiquette section. Items and warning
 * use flat-shape locale fields rather than the `LegacyLocalized<>` adapter
 * because they are arrays / optional strings respectively.
 */
export type OnboardSection =
  & LegacyLocalized<'title'>
  & {
    id: string;
    icon: string;
    itemsRu: string[];
    itemsEn: string[];
    itemsPl: string[];
    itemsEs?: string[];
    itemsFr?: string[];
    itemsDe?: string[];
    itemsIt?: string[];
    warningRu?: string;
    warningEn?: string;
    warningPl?: string;
    warningEs?: string;
    warningFr?: string;
    warningDe?: string;
    warningIt?: string;
  };

/**
 * Pre-regatta checklist section. Same flat-locale shape as `OnboardSection`
 * (items as string[] per language, optional warning string per language)
 * plus an optional intro paragraph. Mobile turns each item into a tickable
 * row whose state lives in AsyncStorage under `regatta.checklist.v1`.
 */
export type ChecklistSection =
  & LegacyLocalized<'title'>
  & {
    id: string;
    icon: string;
    introRu?: string;
    introEn?: string;
    introPl?: string;
    introEs?: string;
    introFr?: string;
    introDe?: string;
    introIt?: string;
    itemsRu: string[];
    itemsEn: string[];
    itemsPl: string[];
    itemsEs?: string[];
    itemsFr?: string[];
    itemsDe?: string[];
    itemsIt?: string[];
    warningRu?: string;
    warningEn?: string;
    warningPl?: string;
    warningEs?: string;
    warningFr?: string;
    warningDe?: string;
    warningIt?: string;
  };

/** A part of yacht anatomy. Hotspots and 3D coords are kept for future use. */
export type AnatomyPart =
  & LegacyLocalized<'name'>
  & LegacyLocalized<'desc'>
  & LegacyLocalized<'useOnBoard'>
  & {
    id: string;
    side: { x: number; y: number };
    top?: { x: number; y: number };
    three?: { x: number; y: number; z: number };
  };

/** A point-of-sail (course relative to the wind). 5 in total. */
export type PointOfSail =
  & LegacyLocalized<'name'>
  & LegacyLocalized<'description'>
  & LegacyLocalized<'sailWork'>
  & {
    id: string;
    angleMin: number;
    angleMax: number;
    /** Sail angle from the boat's centerline, degrees. */
    sailAngle: number;
    /** Relative speed, 0..1. */
    speedFactor: number;
    /** Hex color for visual differentiation in the diagram. */
    color: string;
  };

/** A racing right-of-way rule. Lower priority number wins. */
export type RacingRule =
  & LegacyLocalized<'title'>
  & LegacyLocalized<'description'>
  & {
    id: string;
    priority: number;
  };

/** A racing strategy section (upwind / downwind / start / mark-rounding). */
export type RacingStrategy =
  & LegacyLocalized<'title'>
  & LegacyLocalized<'description'>
  & {
    id: string;
    /** Each tip is a fully localized chunk; no LegacyLocalized adapter here. */
    tips: LocalizedText[];
  };

/** A gallery entry: photo from `public/gallery/...` or YouTube video. */
export type GalleryKind = 'image' | 'youtube';

/** Aspect ratio hint for the gallery grid. Default is `square`. */
export type GalleryAspect = 'square' | 'portrait' | 'landscape' | '16:9';

export type GalleryItem = LegacyLocalized<'title'> & {
  id: string;
  kind: GalleryKind;
  /** For images: relative path under web `/public/...`. For YouTube: 11-char videoId. */
  src: string;
  /** Optional smaller thumbnail. For images: relative path. For YouTube: override. */
  thumb?: string;
  width?: number;
  height?: number;
  /** Year / event tag, e.g. `'2025'`. */
  badge?: string;
  aspect?: GalleryAspect;
};
