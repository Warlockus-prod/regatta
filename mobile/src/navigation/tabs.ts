import { sectionForPath, sections, type Label } from "../../../src/lib/product/catalog";
import { copy } from "../../../src/lib/product/copy";

/**
 * Native tab model: a read-only adapter over the shared catalog. The catalog
 * (and the site) keep five sections ending with Library. In the app the fifth
 * tab is Menu: the complete catalog behind one tap, with the reference
 * material as one of its groups, so there are not two near-identical lists.
 */
export type NativeTabId = "home" | "learn" | "practice" | "race" | "menu";

export interface NativeTab {
  id: NativeTabId;
  route: string;
  title: Label;
  icon: string;
}

export const MENU_ROUTE = "/menu";

export const nativeTabs: NativeTab[] = [
  ...sections
    .filter(s => s.id !== "library")
    .map(s => ({ id: s.id as NativeTabId, route: s.native, title: s.title, icon: s.icon })),
  { id: "menu", route: MENU_ROUTE, title: copy.menu, icon: "menu" },
];

/** Which tab a route belongs to. Reference pages and unknown routes sit under Menu. */
export function tabForPath(path: string): NativeTabId {
  const clean = path.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  if (clean === MENU_ROUTE || clean === "/library") return "menu";
  const section = sectionForPath(clean, "native");
  return section === "library" ? "menu" : section;
}
