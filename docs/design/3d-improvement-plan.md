# 3D improvement plan

Scope: shared web /simulator2, its native WebView host, and /anatomy.

1. Correct sail-specific visual state, reef-aware targets, reset and keyboard steering.
2. Reframe the yacht responsively; add useful camera presets and improve water, wake and materials.
3. Simplify mobile controls, make instruments readable, replace automatic tours with optional help, and handle scene loading failures.
4. Improve anatomy framing and show only the selected label.
5. Validate types, focused lint, regression tests and desktop/mobile browser flows.
6. Deploy the shared scene to the VPS and verify the production site.
7. Archive and upload iOS 1.6.1 (34), attach it to TestFlight, prepare the App Store update, and record release results.

Preserve existing user changes and existing GLB assets. Evaluate geometry work after rendering improvements. The owner authorized server deployment and a new app release on 2026-09-07.

## Progress

Steps 1-6 completed. Website release `639eb17` is live and production tests pass.
Step 7: iOS 1.6.1 (34) archive, export, simulator build and launch completed;
Apple validation/upload passed and build 34 is verified in the Self TestFlight group.
Public App Store review remains pending the native visual release gate.

Owner screenshot follow-up: fix anchored sail geometry and replace Trainer rear/
side projections. Published and verified on production (`8e7bf3d`); all deployment jobs passed.
See `3d-release-2026-09-07.md` for the exact checks and release limitations.
