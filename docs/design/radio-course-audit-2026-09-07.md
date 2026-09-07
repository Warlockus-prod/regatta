# SRC radio course audit, 2026-09-07

## Verdict and scope

The learning path is usable and worth keeping: understand the system, operate the set, practise procedures, then take a mock theory exam. The course has 18 chapters, 324 bank questions mapped to chapters, 26 practical tasks, 15 control lessons and 19 scenarios. However, the previous version contained contradictions in emergency teaching and gaps in assessment. It should not be described as an independently certified substitute for an SRC instructor or a practical examination.

Reviewed: course map, theory and diagrams, controls lessons, cheat sheet, task-to-scenario links, mock exam, radio reducer and scenario progression, deterministic speech assessment, and the shared mobile offline package. Content review concentrated on distress/urgency, DSC, channel use, position reporting and exam semantics. This was not a new independent answer-by-answer certification of all 324 answers.

## Corrections implemented

| Priority | Previous behaviour | Correction |
| --- | --- | --- |
| P1 | Practical task 10 taught MAYDAY but linked to a visible-MOB PAN-PAN scenario. A controls lesson also listed MOB as an ordinary urgency example. | Replaced that scenario with `mob-mayday`, DSC nature Man Overboard and a matching MAYDAY speech grader/reply. Updated task 10 and the lesson. Old deep links resolve to the corrected exercise; old PAN-PAN progress does not count as completing it. Scenario count remains 19. |
| P1 | Fire scenario forced the learner to wait for DSC ACK even though explanatory text allowed voice without it. | Fire and MOB now allow the voice phase without ACK. Instructions say to send after ACK or about 15 seconds, select 16/C when necessary, and leave repeat alerting active. ACK/ALARM OFF remains usable when confirmation arrives. |
| P1 | Voice position grading searched independently for latitude digits, longitude digits and hemisphere words anywhere in the transmission. A swapped position could pass. | Coordinate sequences must now occur together with their corresponding hemispheres and in the correct order. Digit-by-digit speech with units remains accepted. Assigned own-distress exercises require position, nature and requested assistance as well as the distress signal. |
| P2 | Mock exam immediately revealed correct answers and only showed a total score. Entering it from a chapter could produce a chapter-sized quiz despite promising 10 questions. | Always draws five questions from each subject. Hides correctness until the end, reports each subject separately and requires at least 3/5 in each. Adds answer review with theory links and states that practical skills are assessed separately. Invalid inherited-property chapter query values are ignored. |
| P2 | Cheat sheet and radio-check briefing implied that every routine initial call on channel 16 was forbidden. | Distinguishes a short initial call from a routine conversation or radio check; these exercises use the designated working channel. |
| P2 | Power-on explanation implied automatic voice watch on 16 regardless of the selected channel. | Separates the dedicated DSC receiver on 70 from voice watch on the selected channel. |
| P2 | Diagram language followed the global site language while lesson text followed PL/RU explanation settings. | Diagrams use the explanation setting. In bilingual mode the diagram remains Polish alongside bilingual prose. |
| P2 | At 390 px, language controls squeezed the main radio navigation to almost one visible tab. | Main navigation gets its own full-width row on phones. More and language controls sit below it. |
| P3 | A weighted completion percentage was labelled course readiness. | Renamed to learning progress; it is not a probability of passing the examination. |
| P3 | One explanation said a DSC alert always contains a usable position; another presented a historical GEOSAR satellite count as a current fact. | Clarified missing/stale position and labelled the satellite number as the historical study-bank answer, with QARS as the current-status source. Official question wording and answer indices are unchanged. |

## Educational recommendations

1. Keep the four-part course map. Offer a short first session combining system overview, channel 16/70, power/volume/squelch and one routine call. Avoid suggesting that a beginner must finish all 305 estimated theory minutes before touching the radio.
2. Test the path with a Polish learner and a Russian-speaking learner. Observe whether they can choose the priority, identify their vessel, communicate position and find the next exercise without help.
3. Have an SRC instructor review the answer key and emergency scenarios. Three pre-existing bank items remain explicitly uncertain: `src-1-36`, `src-2-24`, `src-2-25`. A flag is not a substitute for resolving the interpretation.
4. Give practical equipment handling its own explicit completion criteria. The four EPIRB/SART tasks are currently procedure references, not physical equipment simulations.
5. Polish editorial copy still frequently omits diacritics. The official question bank retains them. A separate language edit would improve credibility and readability without changing the procedures.
6. Add a controlled exercise with a delayed/missing coast reply and a debrief about escalation. Current simulator ACKs are accelerated; passing a button sequence is not evidence of decision-making under real radio conditions.

## Sources checked

- [UKE maritime certificates and SRC materials](https://bip.uke.gov.pl/swiadectwa-operatora-urzadzen-radiowych-tresci/swiadectwa-morskie-i-zeglugi-srodladowej,4.html): certificate/exam context and current SRC fee, 150 PLN exam plus 25 PLN certificate.
- [Polish regulation, 16 January 2015, section 24](https://eli.gov.pl/api/acts/DU/2015/99/text.html): at least 60% in each subject; every subject must pass. Retrieved directly from ELI after the web reader failed. The local 3/5 rule is the equal-weight multiple-choice practice implementation of that threshold.
- [RYA man-overboard guidance](https://www.rya.org.uk/water-safety/cold-water-shock-safety/man-overboard/): visual contact is maintained while raising the alarm; MAYDAY/DSC alert is part of the response to an unattached casualty in the water.
- [MCA VHF DSC procedures for small boat users](https://www.gov.uk/government/publications/gmdss-sea-areas-and-procedures-for-small-boat-users/gmdss-vhf-dsc-procedures-for-small-boat-users): voice distress after ACK or approximately 15 seconds; initial calling and working-channel distinction. Used for these procedures, not its older A3 description.
- [COSPAS-SARSAT QARS](https://qars.cospas-sarsat.int/?tab=ss): source of changing constellation status. No current satellite count is asserted in this audit.

## Verification and delivery status

- Radio and radio-voice unit suites: 156 tests in 11 files passed. New regressions cover both radio models, fire/MOB with and without ACK, swapped coordinates, mandatory distress information, task 10 priority, balanced question selection and a failed subject despite a strong total score.
- Web TypeScript and whitespace/dash checks passed.
- Browser: completed all 10 mock-exam questions with no live correctness disclosure. Result showed 1/5 and 4/5 separately and correctly failed the mock. Verified an old MOB link opens the new MAYDAY exercise. Verified Polish diagram under Russian global UI and phone navigation at 390 x 844 with no document overflow.
- Mobile offline HTML regenerated from shared sources. Mobile asset freshness, content sync, lint and TypeScript checks passed; 112 tests in 23 suites passed with Watchman disabled. The ordinary test command encountered a sandbox restriction when connecting to Watchman; the non-Watchman run completed successfully.
- No microphone recording/transcription round trip, real ICOM hardware session, or physical-device offline walkthrough was performed in this audit.
- Changes and the rebuilt offline asset are in the workspace. This audit does not deploy them to production or replace the previously submitted iOS build 38. A new app binary is needed to deliver the changed embedded offline course to installed apps.
