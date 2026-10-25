import { findSailLesson } from "../../../src/data/sailing-lab/course";

const routes: Record<string, string> = {
  "/": "/", "/practice": "/simulators", "/simulator": "/simulator-v1",
  "/simulator-v3": "/simulator-v3", "/simulator2": "/simulator2",
  "/learn/sails": "/learn/sails", "/anatomy": "/anatomy",
};

/** Links from the installed sailing pages stay inside known native activities. */
export function sailingNativeDestination(href: unknown): string | null {
  if (typeof href !== "string" || href.length > 512 || !href.startsWith("/") || href.startsWith("//") || href.includes("\\")) return null;
  const url = new URL(href, "https://local.invalid");
  if (url.origin !== "https://local.invalid") return null;
  let target = routes[url.pathname];
  if (!target && url.pathname.startsWith("/learn/sails/")) {
    const id = url.pathname.slice("/learn/sails/".length);
    if (findSailLesson(id)) target = `/learn/sails/${id}`;
  }
  if (!target) return null;
  const query = new URLSearchParams();
  for (const name of ["lesson", "study", "fromLesson", "drill", "scenario"] as const) {
    const value = url.searchParams.get(name);
    if (value && /^[a-zA-Z0-9_-]{1,80}$/.test(value)) query.set(name, value);
  }
  const search = query.toString();
  return target + (search ? `?${search}` : "");
}
