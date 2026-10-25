import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { confirmRadioLeave, parseRadioRoute, popRadioRoute, postRadioMessage, pushRadioRoute, RADIO_FREE_HREF, radioHref, type RadioRoute } from "../../../src/app/radio/navigation";

interface RouteState {
  path: string;
  search: string;
  hash: string;
}

interface RouterContextValue extends RouteState {
  navigate: (href: string) => void;
  back: () => void;
}

declare global {
  interface Window {
    __REGATTA_OFFLINE_SEARCH__?: string;
  }
}

const DEFAULT_ROUTE: RadioRoute = parseRadioRoute(RADIO_FREE_HREF)!;

const RouterContext = createContext<RouterContextValue>({
  ...DEFAULT_ROUTE,
  navigate: () => {},
  back: () => {},
});

export function OfflineRouterProvider({
  children,
}: {
  children: (route: RouteState) => ReactNode;
}) {
  const [history, setHistory] = useState<RadioRoute[]>(() => {
    const entry = (window as Window & { __REGATTA_RADIO_ENTRY__?: string }).__REGATTA_RADIO_ENTRY__;
    return [parseRadioRoute(entry) ?? DEFAULT_ROUTE];
  });
  const historyRef = useRef(history);
  const route = history[history.length - 1];
  const apply = useCallback((next: RadioRoute[], restoreScroll = false) => {
    historyRef.current = next;
    const current = next[next.length - 1];
    window.__REGATTA_OFFLINE_SEARCH__ = current.search;
    setHistory(next);
    window.requestAnimationFrame(() => {
      if (!restoreScroll && current.hash) document.getElementById(current.hash.slice(1))?.scrollIntoView({ block: "start" });
      else window.scrollTo({ top: current.scroll, behavior: "auto" });
    });
  }, []);

  const navigate = useCallback((href: string) => {
    if (!parseRadioRoute(href) || !confirmRadioLeave()) return;
    apply(pushRadioRoute(historyRef.current, href, window.scrollY));
  }, [apply]);
  const back = useCallback(() => {
    if (confirmRadioLeave()) apply(popRadioRoute(historyRef.current), true);
  }, [apply]);

  useEffect(() => {
    window.__REGATTA_OFFLINE_SEARCH__ = route.search;
    postRadioMessage({ type: "radio-route", href: radioHref(route), canGoBack: history.length > 1 });
  }, [route, history.length]);
  useEffect(() => {
    const go = (event: Event) => { const href = (event as CustomEvent<{ href?: unknown }>).detail?.href; if (typeof href === "string") navigate(href); };
    window.addEventListener("regatta:radio-back", back);
    window.addEventListener("regatta:radio-navigate", go);
    return () => { window.removeEventListener("regatta:radio-back", back); window.removeEventListener("regatta:radio-navigate", go); };
  }, [back, navigate]);

  const value = useMemo<RouterContextValue>(() => ({
    ...route,
    navigate,
    back,
  }), [back, navigate, route]);

  return (
    <RouterContext.Provider value={value}>
      {children(route)}
    </RouterContext.Provider>
  );
}

export function usePathname(): string {
  return useContext(RouterContext).path;
}
export function useSearchParams() {
  return new URLSearchParams(useContext(RouterContext).search);
}
export function useRouter() {
  const { navigate, back } = useContext(RouterContext);
  return { push: navigate, back };
}

export function OfflineLink({
  href,
  onClick,
  children,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | { pathname?: string; query?: Record<string, string> };
}) {
  const { navigate } = useContext(RouterContext);
  const rawHref = typeof href === "string"
    ? href
    : `${href.pathname ?? "/radio"}${
        href.query
          ? `?${new URLSearchParams(href.query).toString()}`
          : ""
      }`;
  const external = /^(?:https?:|mailto:|tel:)/i.test(rawHref);
  const anchorOnly = rawHref.startsWith("#");

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || external || anchorOnly) return;
    event.preventDefault();
    navigate(rawHref);
  };

  return (
    <a {...props} href={rawHref} onClick={handleClick}>
      {children}
    </a>
  );
}
