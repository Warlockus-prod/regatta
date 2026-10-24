import { dailySettings } from "../../../src/lib/daily-challenge";

/** The public race entry and old deep links all mount the same local scene. */
export function raceEntryQuery(params: Record<string, string | string[] | undefined>, mode: "simple" | "pro", now = new Date()) {
  const query: Record<string, string> = { view: "3d", scene: "next", camera: "high", mode };
  for (const name of ["mission", "difficulty", "wind", "replayId"] as const) {
    const value = params[name];
    if (typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value)) query[name] = value;
  }
  const day = typeof params.daily === "string" ? params.daily : params.course === "daily" ? now.toISOString().slice(0, 10) : null;
  if (day) {
    try {
      const daily = dailySettings(day);
      query.daily = daily.day;
      query.difficulty = daily.difficulty;
      query.wind = daily.windStrength;
    } catch { /* An invalid deep link still opens the normal race menu. */ }
  }
  return query;
}

/** Local content can request only known app destinations, never arbitrary URLs. */
export function raceNativeDestination(href: unknown): string | null {
  if (href === "/" || href === "/race") return "/race";
  if (href === "/history" || href === "/leaderboard") return href;
  if (typeof href === "string" && /^\/replay\/[a-zA-Z0-9_-]{1,100}$/.test(href)) return href;
  return null;
}
