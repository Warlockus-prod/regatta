# Product

## Register

product

## Users

Week to Regatta serves sailing beginners, returning sailors and candidates preparing for Polish SRC and sternik motorowodny qualifications. People study on a phone or laptop, often in short sessions, and return to the same material for practice or an onboard refresher.

Beginners need a clear next lesson and a useful first action. Returning sailors need direct access to boat controls, races and reference material. Exam candidates need accurate questions, explanations and instrument procedures, with exam truth kept distinct from practical competence.

## Product Purpose

Connect understanding, a real knowledge check and relevant practice. Sailing diagrams explain wind, sails, manoeuvres and rules. The shared boat model powers trainers and races. SRC connects the official question bank to a working VHF DSC radio. Sternik provides the Polish theory, tests, exams and oral-practice material.

A viewed lesson, a passed theory check and a practical result are different evidence. Opening a trainer does not prove a skill. Old manual lesson marks remain readable as visits. Progress belongs to the device; an account or cross-device sync is not required or promised.

## Platforms and languages

- The public interface and SRC course support RU, EN, PL, ES, FR, DE and IT. Translate instructions and explanations naturally; preserve exact radio prowords, English on-air phrases, MMSI values, channel numbers and language-exercise options when they are the subject of assessment. The original Polish exam formulation remains separately available.
- Sternik motorowodny remains Polish only, with the original question and answer truth.
- Web and native share content, quiz truth, physics, boat geometry and the relevant simulator source. They have separate app shells and presentation where appropriate.
- The native app installs local sailing, SRC and Sternik packages. Solo racing, trainers, theory and typed practice must work after a clean installation without a network. Native SRC uses device speech and strict on-device recognition when the system model is available, with typed practice available when it is not. Native Sternik oral practice uses a local typed rubric. Multiplayer requires the network. Online website speech/AI features have their own availability and privacy rules.
- Simple and Pro are control modes: simple uses automatic trim; Pro exposes manual sail control in the same 3D race. These names do not imply a paid entitlement.

## Brand Personality

Precise, calm, practical. The product should feel like a trusted instructor on the bridge: clear enough for a beginner, rigorous enough for an experienced sailor, and composed during safety-critical topics.

The owner selected the first Ocean Cockpit reference in [the design proposal](docs/audits/2026-10-24/design-proposal.md). It guides instrument hierarchy, protected boat/radio space and reserved controls. A concept image is not a release screenshot or proof of a finished flow. Text-learning pages may retain their readable paper surface and web theme support.

## Anti-references

- Dense facts that assume unexplained abbreviations are understood.
- Decorative nautical styling that competes with procedures or safety information.
- Memorising exam tricks without explaining the operational reason.
- Treating regional practice as a universal rule.
- Diagrams that look impressive but cannot support a decision.
- Controls, hints or drawers that cover the boat or radio being operated.
- Progress claims based on a visit, a manual checkbox or an opened exercise.

## Design Principles

1. Explain the reason before asking for the procedure.
2. Use reviewed diagrams as working mental models, not decoration.
3. Keep exam truth, operational truth and regional practice visibly distinct.
4. Close theory with an original question and relevant practice, with a clear route back.
5. Keep the current task and primary controls visible. Put auxiliary content in reserved bottom or side space.
6. Share the engine and assessment truth; validate the actual user flow on each platform.

## Accessibility and Inclusion

Target WCAG AA contrast and keyboard operation. Never communicate priority or correctness by color alone. Keep interactive targets at least 44px, provide useful alternatives to diagrams, preserve readable labels on narrow screens and support text scaling. Use bundled Source Sans 3 for ordinary interface text, with deliberate monospace or device markings where necessary. No runtime font service is required.

## Evidence boundary

The owner's theme-consistency complaint remains open for delivered69. The [current status](docs/audits/2026-10-28/completion-status.md) retains all65IDs and F01-F15, distinguishes day-theme/layout source from the delivered binary, and records the remaining briefing, scene, physical-runtime and learning gaps. The selected first concept remains a visual reference, not proof of achieved graphics. Native day chrome and web inheritance are prepared; full native modes and installed acceptance remain open.

The 2026-10-25 source corrections address the follow-up audit of TestFlight build60: direct radio practice entry, orbit controls, consistent activity navigation, reserved control areas and the website foundation flow. Unit tests and a source/build check do not close device acceptance. Current implementation, visual evidence and release gates belong to [the harness](docs/audits/2026-10-24/implementation-harness.md); the frozen [25 October recheck](docs/audits/2026-10-25/plan-recheck.md) records the earlier baseline.
