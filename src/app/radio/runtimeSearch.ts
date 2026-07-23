declare global {
  interface Window {
    __REGATTA_OFFLINE_SEARCH__?: string;
  }
}

/**
 * The regular website reads the browser query string. The embedded offline
 * course uses an in-memory router because its document is a local file.
 */
export function radioRuntimeSearch(): string {
  if (typeof window === "undefined") return "";
  return window.__REGATTA_OFFLINE_SEARCH__ ?? window.location.search;
}
