# Regatta interface

## Context

A learner opens Regatta on a phone between other tasks, or on a laptop for a longer practice session. Sailing beginners need a next step. Returning sailors need direct access to practice and reference. Polish licence candidates need a clearly identified exam course. The existing PRODUCT.md describes the radio course; this document covers the shared product shell without replacing that brief.

## Structure

Primary destinations: Home, Learn, Practice, Race, Menu. Menu means every public section, not just reference material. The old /library URLs lead to /menu and remain valid bookmarks. Reference is a content group inside Menu, not a misleading name for the whole product. Polish exam preparation has its own group.

The platform-neutral catalog in src/lib/product/catalog.ts owns content labels and destinations. src/lib/product/menu.ts owns the directory grouping. Share lessons, progress contracts and physics, not one forced page layout. The website and native app have separate presentation components and interaction rules.

Home has one primary action: start or resume learning in the last visited course. Introductory sailing and sail-handling lessons resume by validated lesson ID. Radio and motorboat courses reopen their own course home, without inventing exam progress or restoring an unsaved conversation. The other three learning directions form a secondary flat list. Practice and Race stay in persistent navigation, not another duplicated grid on Home. Weather belongs with places; daily competition belongs with Race. Avoid automatic welcome dialogs.

## Visual rules

Preserve the dark-ocean tokens and web light theme. Cyan indicates an action, selected section or active control. Do not assign a different bright color to every content card. Use flat divided lists for catalogs, one restrained surface for the next lesson, generous margins and readable secondary text. System/native fonts and the existing web Geist font remain.

Web content width: 1080px; compact catalogs remain readable on large displays. Mobile horizontal padding: 20px. Body text: 16px with roughly 24px line height. Primary touch actions: at least 44px. Native navigation labels may use smaller text with wrapping and system text scaling. No essential label should be ellipsized.

## Navigation and accessibility

Web: four primary links plus a labelled Menu button in the top toolbar. On small screens the four links move to a second row with larger labels; Menu stays next to the brand/language controls. The theme control moves into Menu on narrow screens. The web directory uses compact columns on desktop and a single list on a phone. It is a real page with a URL, browser Back and keyboard search, not a modal.

Native: five bottom tabs ending with Menu, reachable from Home without scrolling. Do not duplicate Menu in the header where the bottom tabs are visible. Hide the bottom bar during boat control, racing, replay or an exam, and retain the labelled header Menu entry where that native header is available. The native directory is a compact one-column list with search, safe-area padding and explicit internet labels for online-only destinations. Do not add a website footer or promotional hero to this screen.

Nested pages highlight their parent section; reference/settings pages highlight Menu. Keep back navigation inside activities and suppress web chrome in embedded views. A course step should not compete visually with app navigation.

Use native buttons/links, visible keyboard focus, selected-state semantics, labelled search, meaningful empty states and safe-area insets. No new decorative motion. Support RU, EN, PL, ES, FR, DE and IT with real localized strings. Keep existing lesson progress and offline fallback behavior.

Home uses a shared read-only continuation model, but distinct web/native presentation. Its versioned local bookmark is not a completion record or cross-device sync. Never show a guessed start action while stored progress is still loading. On read failure, offer retry and keep all course links available. Distinguish lessons visited from theory checks passed; neither implies practical certification.

Desktop sail lessons place the working diagram beside explanatory text at 1000px and wider. Keep the diagram sticky only with sufficient viewport height. Narrow screens retain a sequential layout, with one learning step selected at a time. Native lessons remain their own React Native screens, not a desktop layout squeezed into a WebView.

## Boundaries

### Claude handoff adaptation, 2026-09-28

The v3.1 review at `/design-v3` adds warm-paper learning surfaces, contained
Mediterranean imagery and navy/ocean controls. See
`docs/design/regatta-v3-master-plan.md` for the agreed direction and remaining
work. The review deliberately does not import the original runtime or invented
progress. The real web Home keeps the user's theme and continuation; native
Home adds a bundled image without claiming a new global light theme.
AI artwork is atmospheric, never a technical source for rigging or forces.
The generated mobile screen is a concept, not a release screenshot.

This first redesign establishes the global shell, home and four hubs on both platforms. It does not claim that every lesson, instrument panel or radio exercise has been redesigned. Later flow changes require their own functional and visual verification. Sail physics and 3D assets are independent of this navigation work.
