export const SAILING_ROUTES = ["/simulator", "/simulator-v3", "/simulator2", "/game", "/anatomy", "/ads"] as const;
export type SailingPath = typeof SAILING_ROUTES[number];
export interface SailingEmbed { path: SailingPath; query: string }

const previewScreens: Record<string, SailingPath> = {
  basics: "/simulator", trainer: "/simulator-v3", boat3d: "/simulator2", game: "/game", anatomy: "/anatomy", ads: "/ads",
};

/** Native paths take priority; preview aliases never discard lesson or race queries. */
export function sailingEmbed(injected: { path: string; query: string } | undefined, search: string): SailingEmbed {
  const params = new URLSearchParams(search);
  const path = injected && SAILING_ROUTES.includes(injected.path as SailingPath) ? injected.path as SailingPath
    : previewScreens[params.get("screen") ?? ""] ?? "/simulator2";
  return { path, query: injected?.query ?? params.toString() };
}

export function sailingSearch(query: string): URLSearchParams {
  const params = new URLSearchParams(query);
  params.set("embed", "1");
  params.set("offline", "1");
  return params;
}

export function readSailingEmbed(): SailingEmbed {
  return sailingEmbed(window.__REGATTA_EMBED__, window.location.search);
}

/** Shared pages that read location directly still see the native query and embed flags. */
export function readSailingSearch(): URLSearchParams {
  return sailingSearch(readSailingEmbed().query);
}

declare global {
  interface Window { __REGATTA_EMBED__?: { path: string; query: string } }
}
