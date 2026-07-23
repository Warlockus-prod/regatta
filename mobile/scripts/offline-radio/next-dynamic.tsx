import {
  lazy,
  Suspense,
  type ComponentType,
  type LazyExoticComponent,
} from "react";

export default function dynamic<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>,
): ComponentType<P> {
  const Lazy = lazy(loader) as LazyExoticComponent<ComponentType<P>>;
  return function OfflineDynamic(props: P) {
    return (
      <Suspense fallback={null}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}
