import { lazy, Suspense, useSyncExternalStore, type ComponentType, type AnchorHTMLAttributes } from "react";
import { readSailingEmbed, sailingSearch } from "./embed";

const subscribe = (update: () => void) => {
  window.addEventListener("regatta-embed", update);
  return () => window.removeEventListener("regatta-embed", update);
};
export const usePathname = () => useSyncExternalStore(subscribe, () => readSailingEmbed().path);
export const useSearchParams = () => {
  const query = useSyncExternalStore(subscribe, () => readSailingEmbed().query);
  return sailingSearch(query);
};
export function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} onClick={event => {
    props.onClick?.(event);
    if (event.defaultPrevented || !props.href || props.href.startsWith("#")) return;
    event.preventDefault();
    if (props.href.startsWith("/") && !props.href.startsWith("//")) {
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "native-navigate", href: props.href }));
    }
  }} />;
}
export function dynamic<P extends object>(loader: () => Promise<ComponentType<P> | { default: ComponentType<P> }>) {
  const Component = lazy(async () => {
    const loaded = await loader();
    return { default: "default" in loaded ? loaded.default : loaded };
  });
  return function OfflineComponent(props: P) {
    return <Suspense fallback={null}><Component {...props} /></Suspense>;
  };
}
