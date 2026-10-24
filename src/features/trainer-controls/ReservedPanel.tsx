'use client';

import { createContext, useContext, useLayoutEffect, useState } from "react";
import styles from "./TrainerControls.module.css";

/** The existing cockpit control area, never the canvas. */
export const ReservedPanelContext = createContext<{
  host: HTMLElement | null;
  reserve: (id: string) => () => void;
} | null>(null);

/** Panels borrow the space already reserved for controls. Compact workspaces
 * provide a bottom/side host; desktop settings use the marked control column. */
export function useReservedPanel(id: string, open: boolean): HTMLElement | null {
  const context = useContext(ReservedPanelContext);
  // Settings mount after a user action, when the desktop column already exists.
  const [desktopHost] = useState<HTMLElement | null>(() => context || typeof document === "undefined"
    ? null : document.querySelector<HTMLElement>("[data-trainer-settings-host]"));
  const reserve = context?.reserve;
  useLayoutEffect(() => {
    if (!open) return;
    if (reserve) return reserve(id);
    if (!desktopHost) return;
    desktopHost.classList.add(styles.desktopPanelReserved);
    return () => {
      desktopHost.classList.remove(styles.desktopPanelReserved);
    };
  }, [desktopHost, id, open, reserve]);
  return context ? context.host : desktopHost;
}
