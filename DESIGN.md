# Regatta interface

## Context

A learner opens Regatta on a phone between other tasks, or on a laptop for a longer practice session. Sailing beginners need a next step. Returning sailors need direct access to practice and reference. Polish licence candidates need a clearly identified exam course. The existing PRODUCT.md describes the radio course; this document covers the shared product shell without replacing that brief.

## Structure

Five stable destinations across web and native: Home, Learn, Practice, Race, Library. The platform-neutral catalog in src/lib/product/catalog.ts owns labels, routes and grouping. Existing lesson and simulator URLs remain valid. Library searches every section, not only reference material. Polish exam courses form a separate group inside Learn.

Home has one primary action: start or resume a lesson. Practice and Race are secondary choices. Weather belongs with places; daily competition belongs with Race. Avoid duplicated tool grids and automatic welcome dialogs.

## Visual rules

Preserve the dark-ocean tokens and web light theme. Cyan indicates an action, selected section or active control. Do not assign a different bright color to every content card. Use flat divided lists for catalogs, one restrained surface for the next lesson, generous margins and readable secondary text. System/native fonts and the existing web Geist font remain.

Web content width: 1080px; compact catalogs remain readable on large displays. Mobile horizontal padding: 20px. Body text: 16px with roughly 24px line height. Primary touch actions: at least 44px. Native navigation labels may use smaller text with wrapping and system text scaling. No essential label should be ellipsized.

## Navigation and accessibility

Web exposes all five sections, with a second navigation row on small screens. Native exposes a bottom bar; hide it while controlling a boat, racing, replaying or taking an exam. Nested pages highlight their parent section. Keep back navigation inside activities and suppress web chrome in embedded views.

Use native buttons/links, visible keyboard focus, selected-state semantics, labelled search, meaningful empty states and safe-area insets. No new decorative motion. Support RU, EN, PL, ES, FR, DE and IT with real localized strings. Keep existing lesson progress and offline fallback behavior.

## Boundaries

This first redesign establishes the global shell, home and four hubs on both platforms. It does not claim that every lesson, instrument panel or radio exercise has been redesigned. Later flow changes require their own functional and visual verification. Sail physics and 3D assets are independent of this navigation work.
