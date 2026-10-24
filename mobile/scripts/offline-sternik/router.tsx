import { createContext, useCallback, useContext, useEffect, useMemo, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { canLeaveSternikExam, postSternikProgress } from "./bridge";
import { sternikRoute, type SternikRoute } from "./model";

const initial = (): SternikRoute => {
  const injected = window.__REGATTA_EMBED__;
  const query = typeof injected?.query === "string" ? injected.query : "";
  return sternikRoute(`${injected?.path ?? "/sternik"}${query ? `?${query}` : ""}`) ?? { path: "/sternik", search: "", hash: "" };
};
const Context = createContext<SternikRoute & { navigate: (href: string) => void }>({ path: "/sternik", search: "", hash: "", navigate() {} });

export function OfflineRouterProvider({ children }: { children: (route: SternikRoute) => ReactNode }) {
  const [route, setRoute] = useState(initial);
  const navigate = useCallback((href: string) => {
    const next = sternikRoute(href);
    if (!next || !canLeaveSternikExam()) return;
    postSternikProgress(true);
    setRoute(next);
  }, []);
  useEffect(() => {
    const fromNative = (event: Event) => {
      const href = (event as CustomEvent<{ href?: unknown }>).detail?.href;
      if (typeof href === "string") navigate(href);
    };
    window.addEventListener("regatta:sternik-navigate", fromNative);
    return () => window.removeEventListener("regatta:sternik-navigate", fromNative);
  }, [navigate]);
  useEffect(() => {
    if (route.hash) {
      let id = route.hash.slice(1);
      try { id = decodeURIComponent(id); } catch { /* Keep the literal fragment. */ }
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    } else window.scrollTo({ top: 0, behavior: "auto" });
  }, [route]);
  const value = useMemo(() => ({ ...route, navigate }), [route, navigate]);
  return <Context.Provider value={value}>{children(route)}</Context.Provider>;
}
export const usePathname = () => useContext(Context).path;
export function useSearchParams() {
  const { search } = useContext(Context);
  return useMemo(() => new URLSearchParams(search), [search]);
}
export function OfflineLink({ href, onClick, children, ...props }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string }) {
  const { navigate } = useContext(Context);
  const click = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (href.startsWith("#")) return;
    if (href === "/radio") {
      event.preventDefault();
      if (canLeaveSternikExam()) { postSternikProgress(true); window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "sternik-open-radio" })); }
    } else if (sternikRoute(href)) { event.preventDefault(); navigate(href); }
    else if (!/^https:\/\//i.test(href)) event.preventDefault();
  };
  return <a {...props} href={href} onClick={click}>{children}</a>;
}
