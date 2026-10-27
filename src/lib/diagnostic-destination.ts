import type { DiagnosticInput, DiagnosticSurface } from "./diagnostics";
type Destination = Extract<DiagnosticInput, { type: "navigation" }>["to"];
/** Map routes to fixed product identifiers. Never retain a URL, query or lesson ID. */
export function diagnosticDestination(path: string): NonNullable<Destination> {
  const clean = path.split(/[?#]/, 1)[0].replace(/\/$/, "") || "/";
  if (clean === "/") return "home";
  if (clean === "/ads") return "ads";
  if (/^\/(?:kursy\/radio|radio)(?:\/|$)/.test(clean)) return /\/(?:symulator|obsluga|rozmowa)(?:\/|$)/.test(clean) ? "radio-practice" : "radio";
  if (/^\/sternik(?:\/|$)/.test(clean)) return "motor";
  if (/^\/kursy\/motorowodny(?:\/|$)/.test(clean)) return "motor";
  if (/^\/r\/[^/]+$/.test(clean)) return "replay";
  if (/^\/learn\/sails(?:\/|$)/.test(clean)) return "sails";
  if (/^\/replay(?:\/|$)/.test(clean)) return "replay";
  if (/^\/game(?:\/|$)/.test(clean) || clean === "/race-3d") return "solo";
  if (/^\/multiplayer(?:\/|$)/.test(clean)) return "multiplayer";
  if (/^\/simulator(?:-basics|-v1)?(?:\/|$)/.test(clean)) return "basics";
  if (/^\/simulator-v3(?:\/|$)/.test(clean)) return "trainer";
  if (/^\/simulator2(?:\/|$)/.test(clean)) return "boat";
  if (/^\/(?:bootcamp|courses)(?:\/|$)/.test(clean)) return "course";
  if (/^\/anatomy(?:-offline)?(?:\/|$)/.test(clean)) return "anatomy";
  const exact: Record<string, NonNullable<Destination>> = { "/learn": "learn", "/simulators": "practice", "/practice": "practice", "/start": "course", "/race": "race", "/library": "library", "/menu": "menu", "/sails": "sails", "/rules": "rules", "/racing": "tactics", "/points": "points", "/leaderboard": "leaderboard", "/history": "history", "/coach": "coach", "/onboard": "onboard", "/checklist": "checklist", "/glossary": "glossary", "/spots": "spots", "/gallery": "gallery", "/ask": "ask", "/settings": "settings", "/diagnostics": "diagnostics", "/privacy": "privacy" };
  return exact[clean] ?? "unknown";
}
export function diagnosticSurface(path: string): DiagnosticSurface {
  const destination = diagnosticDestination(path);
  return ({ solo: "race", "radio-practice": "radio", radio: "radio", motor: "sternik", course: "learn", practice: "trainer" } as Partial<Record<NonNullable<Destination>, DiagnosticSurface>>)[destination]
    ?? (["multiplayer", "replay", "basics", "trainer", "boat", "anatomy", "learn", "menu", "diagnostics", "ads"].includes(destination) ? destination as DiagnosticSurface : "app");
}
