// Race colours of the boats (M1-7). Cyan means an action, a selected section
// or an active control (DESIGN.md), so neither the player nor the fleet is
// cyan or the light theme's accent blue any more.
//
// How they were chosen (checked by boat-colors.test.ts):
// - every colour keeps at least 3:1 against the dark and the light page and
//   card backgrounds (WCAG 1.4.11 for graphics), so the dots, the map arrows
//   and the hull tints read on both themes;
// - the player's violet stays far from every fleet colour for normal vision
//   and for simulated protanopia, deuteranopia and tritanopia;
// - the fleet colours differ from each other for normal vision. Under colour
//   blindness they may come close: each rival is also named on its tag and in
//   the standings, and the player is marked by shape and "You" as well, never
//   by colour alone.

/** The player's boat: violet, unique in the race. */
export const PLAYER_COLOR = "#a845e8";

/** Rivals, in the order of AI_NAMES (src/app/game/race-model.ts). */
export const FLEET_COLORS = ["#d55e00", "#1f8f3a", "#a87a12", "#07857a", "#d14a6e", "#8a6a4a"] as const;
