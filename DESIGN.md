# Regatta interface

## Context

A learner opens Regatta on a phone between other tasks, or on a laptop for a longer practice session. Sailing beginners need a next step. Returning sailors need direct access to practice and reference. Polish licence candidates need a clearly identified exam course. PRODUCT.md defines the shared product and the seven-language SRC / Polish-only Sternik boundary.

## Structure

Primary destinations: Home, Learn, Practice, Race, Menu. Menu means every public section, not just reference material. The old /library URLs lead to /menu and remain valid bookmarks. Reference is a content group inside Menu, not a misleading name for the whole product. Polish exam preparation has its own group.

The platform-neutral catalog in src/lib/product/catalog.ts owns content labels and destinations. src/lib/product/menu.ts owns the directory grouping. Share lessons, progress contracts and physics, not one forced page layout. The website and native app have separate presentation components and interaction rules.

Home has one primary action: start or resume learning in the last visited course. Introductory sailing and sail-handling lessons resume by validated lesson ID. Radio and motorboat courses reopen their own course home, without inventing exam progress or restoring an unsaved conversation. The other three learning directions form a secondary flat list. Practice and Race stay in persistent navigation, not another duplicated grid on Home. Weather belongs with places; daily competition belongs with Race. Avoid automatic welcome dialogs.

## Visual rules

Preserve the dark-ocean tokens and web light theme. Cyan indicates an action, selected section or active control. Do not assign a different bright color to every content card. Use flat divided lists for catalogs, one restrained surface for the next lesson, generous margins and readable secondary text. Ordinary interface text uses locally bundled Adobe Source Sans 3: 400 for body text, 600 for controls and 700 for headings or key readings. The web uses public/fonts/source-sans-3/SourceSans3VF-Upright.woff2; native loads the corresponding bundled TTFs through mobile/src/design-system/fonts.tsx. Existing --font-geist-sans is a compatibility variable pointing to Source Sans 3, not an active Geist font. Keep deliberate monospace numerals and real radio markings. No external font download is required.

Web content width: 1080px; compact catalogs remain readable on large displays. Mobile horizontal padding: 20px. Body text: 16px with roughly 24px line height. Primary touch actions: at least 44px. Native navigation labels may use smaller text with wrapping and system text scaling. No essential label should be ellipsized.


## Working instruments

The owner selected the first Ocean Cockpit reference in [the 24 October proposal](docs/audits/2026-10-24/design-proposal.md). Use a dark-ocean instrument shell, clear readings and restrained action color. This does not mandate a dark background for every long-form learning page. Native paper learning uses lightColors; instrument subtrees use DarkSurface/darkColors from mobile/src/design-system. Web pages use the equivalent CSS tokens and retain light-theme support.

The boat or radio occupies a protected rectangle. Main controls use reserved space below it in portrait and beside it when landscape space allows. Auxiliary task, hint, settings, situation and log panels must reduce the scene allocation or remain in that reserved region. A drawer must not cover the object. Keep the current task and primary controls ahead of long explanations; account for status bars, safe areas, keyboard and text scaling.

Simple and Pro use the same 3D boat/race scene. Simple is automatic trim; Pro is manual trim. Steering and sail input can use the shared wheel deck or a saved slider preference, independently of race difficulty. New installations use wheels. Do not add a second competing helm over the scene. Camera presets do not substitute for the expected ability to inspect the boat; validate orbit gestures and reset in the installed app as well as the browser.

Cyan means an actionable or selected element. Success, caution and errors use their semantic tokens plus text. Preserve the radio's real LCD colors and red DISTRESS control. Do not recolor protocol diagrams or reviewed sail geometry for decoration.

## Learning evidence and delivery

Foundation lessons expose Understand, Check yourself and Practice as distinct steps. Shared pure source lives in src/data/bootcamp-quiz.ts, src/data/foundation-guide.ts and src/lib/learning/foundation-drawings.ts; old native imports remain compatibility exports. Preserve all original IDs, answer truth and scene geometry. Native-only focused practice routes remain native.

The website resumes by validated /start?lesson=stable-id links. Its additive regatta.foundation.web.v1 record stores position, viewed lessons, answer drafts and submitted original checks. Derive a passed theory check from the actual answers and the existing 70% rule. Keep old regatta.bootcamp completed markers readable as viewed only. Opening the existing web practice destination is recorded separately and does not grade a practical result. A failed durable write keeps the verified counter unchanged and offers retry.

Native installed sailing, SRC and Sternik HTML packages compile the shared source for local WebView delivery, including required assets and fonts. Do not create an independent native 3D engine or translate device geometry by hand. Native presentation, safe areas, routing and approved persistence bridges remain native responsibilities. SRC supports all seven UI languages and exact protocol phrases; Sternik stays Polish. Multiplayer requires the network.

## Navigation and accessibility

Web: four primary links plus a labelled Menu button in the top toolbar. On small screens the four links move to a second row with larger labels; Menu stays next to the brand/language controls. The theme control moves into Menu on narrow screens. The web directory uses compact columns on desktop and a single list on a phone. It is a real page with a URL, browser Back and keyboard search, not a modal.

Native: five bottom tabs ending with Menu, reachable from Home without scrolling. Do not duplicate Menu in the header where the bottom tabs are visible. Hide the bottom bar during boat control, racing, replay or an exam, and retain the labelled header Menu entry where that native header is available. The native directory is a compact one-column list with search, safe-area padding and explicit internet labels for online-only destinations. Do not add a website footer or promotional hero to this screen.

Nested pages highlight their parent section; reference/settings pages highlight Menu. Keep internal Back within an activity and provide a distinct, consistently styled exit to its native hub. Deep links need a valid fallback. Active exams need the native-stack removal guard, including Stay and confirmed Exit, rather than a visual alert after a route has already disappeared. Suppress only the product navigation in embedded views; broad nav selectors must not hide working cockpit tabs. A course step should not compete visually with app navigation.

Use native buttons/links, visible keyboard focus, selected-state semantics, labelled search, meaningful empty states and safe-area insets. No new decorative motion. Support RU, EN, PL, ES, FR, DE and IT with real localized strings. Keep existing lesson progress and offline fallback behavior.

Home uses a shared read-only continuation model, but distinct web/native presentation. Its versioned local bookmark is not a completion record or cross-device sync. Never show a guessed start action while stored progress is still loading. On read failure, offer retry and keep all course links available. Distinguish lessons visited from theory checks passed; neither implies practical certification.

Desktop sail lessons place the working diagram beside explanatory text at 1000px and wider. Keep the diagram sticky only with sufficient viewport height. Narrow screens retain a sequential layout, with one learning step selected at a time. Native lessons remain their own React Native screens, not a desktop layout squeezed into a WebView.

## Boundaries

### Claude handoff adaptation, 2026-09-28

The historical v3.1 review source adds warm-paper learning surfaces, contained
Mediterranean imagery and navy/ocean controls. See
`docs/design/regatta-v3-master-plan.md` for the agreed direction and remaining
work. The review deliberately does not import the original runtime or invented
progress. The real web Home keeps the user's theme and continuation; native
Home adds a bundled image without claiming a new global light theme.
AI artwork is atmospheric, never a technical source for rigging or forces.
The generated mobile screen is a concept, not a release screenshot.

The 2026-09-28 paragraph above records the historical first slice. The selected instrument direction and 2026-10-25 corrections now guide current source work. The frozen plan-recheck.md describes build60-era gaps and must not be silently rewritten as new evidence. Current source fixes include direct radio practice entry, orbit/input changes, consistent activity navigation, a reserved native fallback dock and the website foundation loop. Their source tests are not proof that every installed-device flow is complete. Follow implementation-harness.md for actual binary and browser acceptance, and keep measured evidence separate from proposals. Physics and assessment truth remain outside a visual-only change.

The historical /design-v3 release entry now returns404. Its reviewed source/assets remain preserved; the production app uses the actual learning/instrument routes and stays under the unchanged JavaScript budget.
