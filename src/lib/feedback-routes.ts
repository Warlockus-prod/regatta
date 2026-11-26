// Where the floating feedback and AI chat button stays hidden: the full-screen
// race and trainer surfaces, where it would sit on top of touch controls. The
// shared race replay (/r/<code>) is one of them since M4-3: at phone width the
// button covered the right end of the replay's event ribbon.
// src/app/layout.tsx passes the list, src/components/FeedbackWidget.tsx reads it.

export const FEEDBACK_HIDDEN_ROUTES: readonly string[] = ["/game", "/multiplayer", "/simulator", "/sternik", "/r/"];

/** Whether the button is hidden on `pathname` (a route prefix match). */
export function feedbackHiddenOn(pathname: string | null | undefined, hideOn: readonly string[] = FEEDBACK_HIDDEN_ROUTES): boolean {
  return typeof pathname === "string" && hideOn.some((prefix) => pathname.startsWith(prefix));
}
