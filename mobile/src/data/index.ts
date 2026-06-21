/**
 * Typed barrel for content bundles synced from web (`src/data/*.ts`).
 *
 * The `*.json` files in this directory are produced by
 * `mobile/scripts/sync-content.ts`. CI guard
 * (`npm run sync-content:check`) enforces parity with the source.
 *
 * After ADR-0003 lands the workspace extraction (`@regatta/content`),
 * this barrel becomes a thin re-export from the shared package.
 */

import type {
  AnatomyPart,
  BootcampLesson,
  ChecklistSection,
  GalleryAspect,
  GalleryItem,
  GalleryKind,
  GlossaryCategories,
  GlossaryCategoryId,
  GlossaryTerm,
  OnboardSection,
  PointOfSail,
  QuickLesson,
  RacingRule,
  RacingStrategy,
  RuleScenario,
  RuleScenarioSvg,
} from './types';
import anatomyJson from './anatomy.json';
import bootcampJson from './bootcamp.json';
import checklistJson from './checklist.json';
import galleryJson from './gallery.json';
import onboardJson from './onboard.json';
import rulesJson from './rules.json';
import sailingDataJson from './sailing-data.json';

interface AnatomyBundle {
  anatomyParts: AnatomyPart[];
}

interface BootcampBundle {
  bootcampLessons: BootcampLesson[];
  quickRefreshLessons: QuickLesson[];
  BOOTCAMP_TOTAL_MINUTES: number;
}

interface ChecklistBundle {
  checklistSections: ChecklistSection[];
}

interface GalleryBundle {
  galleryItems: GalleryItem[];
}

interface OnboardBundle {
  onboardSections: OnboardSection[];
}

interface RulesBundle {
  ruleScenarios: RuleScenario[];
}

interface SailingDataBundle {
  glossaryTerms: GlossaryTerm[];
  glossaryCategories: GlossaryCategories;
  pointsOfSail: PointOfSail[];
  racingRules: RacingRule[];
  racingStrategies: RacingStrategy[];
  // tacks / maneuvers also live in the JSON; type when wired up.
}

const anatomy = anatomyJson as unknown as AnatomyBundle;
const bootcamp = bootcampJson as unknown as BootcampBundle;
const checklist = checklistJson as unknown as ChecklistBundle;
const gallery = galleryJson as unknown as GalleryBundle;
const onboard = onboardJson as unknown as OnboardBundle;
const rules = rulesJson as unknown as RulesBundle;
const sailingData = sailingDataJson as unknown as SailingDataBundle;

export const anatomyParts: AnatomyPart[] = anatomy.anatomyParts;
export const bootcampLessons: BootcampLesson[] = bootcamp.bootcampLessons;
export const quickRefreshLessons: QuickLesson[] = bootcamp.quickRefreshLessons;
export const BOOTCAMP_TOTAL_MINUTES: number = bootcamp.BOOTCAMP_TOTAL_MINUTES;
export const checklistSections: ChecklistSection[] = checklist.checklistSections;
export const galleryItems: GalleryItem[] = gallery.galleryItems;
export const onboardSections: OnboardSection[] = onboard.onboardSections;
export const ruleScenarios: RuleScenario[] = rules.ruleScenarios;
export const glossaryTerms: GlossaryTerm[] = sailingData.glossaryTerms;
export const glossaryCategories: GlossaryCategories = sailingData.glossaryCategories;
export const pointsOfSail: PointOfSail[] = sailingData.pointsOfSail;
export const racingRules: RacingRule[] = sailingData.racingRules;
export const racingStrategies: RacingStrategy[] = sailingData.racingStrategies;

export type {
  AnatomyPart,
  BootcampLesson,
  ChecklistSection,
  GalleryAspect,
  GalleryItem,
  GalleryKind,
  GlossaryCategories,
  GlossaryCategoryId,
  GlossaryTerm,
  OnboardSection,
  PointOfSail,
  QuickLesson,
  RacingRule,
  RacingStrategy,
  RuleScenario,
  RuleScenarioSvg,
};
