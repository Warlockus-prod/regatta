/**
 * Bootcamp lesson routes come from the WEB content source (src/data/bootcamp.ts,
 * synced into mobile/src/data/bootcamp.json by scripts/sync-content.ts), so they
 * are WEB paths. One of them collides with an app path:
 *
 *   web  "/simulator"  = the Basics (V1) tier
 *   app  "/simulator"  = the NATIVE trainer screen
 *
 * Pushing the web string straight into expo-router therefore dropped the learner
 * into the native trainer on a lesson whose own text says "open the Basics
 * simulator". Map the colliding path to the app route that shows the same thing
 * (the Basics tier embed). Everything else already matches an app route:
 * "/simulator-v3?drill=hold-trim" and "/simulator2" exist in the app too, and
 * content paths like "/courses#wind" are unaffected.
 *
 * Do NOT use this for the separate "try this drill" CTA - that one carries the
 * NATIVE trainer's drill ids on purpose (see lesson-drill-map.ts).
 */
export function webRouteToAppRoute(route: string): string {
  const [path] = route.split(/[?#]/, 1);
  if (path === '/simulator') {
    const rest = route.slice(path.length);
    return `/simulator-v1${rest}`;
  }
  return route;
}
