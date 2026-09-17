import { lazy, Suspense, type ComponentType, type AnchorHTMLAttributes } from "react";

export const usePathname = () => "/simulator2";
export const useSearchParams = () => new URLSearchParams("embed=1&offline=1");
export function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />;
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
