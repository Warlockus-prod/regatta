/**
 * Screen-space scale shared by the native trainer (`use-sim-loop.ts`) and the
 * native race rivals (`ai-boats.ts`). One definition, so the player and the AI
 * boats always move at the same pixels per knot.
 *
 * This is a UX tuning value, not physics: a cruiser at 6 kn crosses the
 * 320-wide playfield in about 10 seconds, which reads as "moving" without
 * leaving the visible field too quickly. The web race uses its own scale and
 * integrator (see docs/design/mobile/WEB_VS_APP_PARITY.md); the shared VPP in
 * `@regatta/physics` only supplies boat speed in knots.
 */
export const KN_TO_PX_PER_S = 6;
