import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

interface RouteState {
  path: string;
  search: string;
  hash: string;
}

interface RouterContextValue extends RouteState {
  navigate: (href: string) => void;
}

declare global {
  interface Window {
    __REGATTA_OFFLINE_SEARCH__?: string;
  }
}

const DEFAULT_ROUTE: RouteState = { path: "/radio", search: "", hash: "" };

const RouterContext = createContext<RouterContextValue>({
  ...DEFAULT_ROUTE,
  navigate: () => {},
});

function parseInternalHref(href: string): RouteState {
  const url = new URL(href, "https://offline.weektoregatta.local");
  return {
    path: url.pathname,
    search: url.search,
    hash: url.hash,
  };
}

export function OfflineRouterProvider({
  children,
}: {
  children: (route: RouteState) => ReactNode;
}) {
  const [route, setRoute] = useState<RouteState>(DEFAULT_ROUTE);

  const navigate = useCallback((href: string) => {
    const next = parseInternalHref(href);
    window.__REGATTA_OFFLINE_SEARCH__ = next.search;
    setRoute(next);
    if (next.hash) {
      window.setTimeout(() => {
        document.getElementById(next.hash.slice(1))?.scrollIntoView({ block: "start" });
      }, 0);
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, []);

  useEffect(() => {
    window.__REGATTA_OFFLINE_SEARCH__ = route.search;
  }, [route.search]);

  const value = useMemo<RouterContextValue>(() => ({
    ...route,
    navigate,
  }), [navigate, route]);

  return (
    <RouterContext.Provider value={value}>
      {children(route)}
    </RouterContext.Provider>
  );
}

export function usePathname(): string {
  return useContext(RouterContext).path;
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
