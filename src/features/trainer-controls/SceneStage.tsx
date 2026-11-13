'use client';

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";
import styles from "./TrainerControls.module.css";
import { STAGE_EVENT, formatStageWindow } from "./stage";

/**
 * Package 32 stage B: what a trainer paints (the 3D canvas, or the water
 * behind a flat drawing) goes into a stage. Inside the phone workspace the
 * stage grows from the free window to the whole workspace, so the scene shows
 * under the bar, the readouts and the dock; it tells the scene where the
 * window is (data-window, STAGE_EVENT) so the boat stays in the middle of it.
 * Outside a workspace (desktop layouts) it is a plain box that fills its
 * parent.
 */
export function SceneStage(props: { children?: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const stage = ref.current;
    const workspace = stage?.closest<HTMLElement>('[data-testid="trainer-workspace"]');
    const free = stage?.closest<HTMLElement>("[data-trainer-window]");
    if (!stage || !workspace || !free) return;
    workspace.dataset.stage = "true";
    const place = () => {
      const all = workspace.getBoundingClientRect(), win = free.getBoundingClientRect();
      const origin = (stage.offsetParent ?? free).getBoundingClientRect();
      if (all.width <= 0 || all.height <= 0) return;
      stage.style.left = `${all.left - origin.left}px`;
      stage.style.top = `${all.top - origin.top}px`;
      stage.style.width = `${all.width}px`;
      stage.style.height = `${all.height}px`;
      // The instrument card and the coach's subtitle hang on the window's corners (TrainerControls.module.css).
      workspace.style.setProperty("--window-top", `${win.top - all.top}px`);
      workspace.style.setProperty("--window-right", `${all.right - win.right}px`);
      workspace.style.setProperty("--window-bottom", `${all.bottom - win.bottom}px`);
      workspace.style.setProperty("--window-left", `${win.left - all.left}px`);
      const next = formatStageWindow({ left: win.left - all.left, top: win.top - all.top, width: win.width, height: win.height });
      if (stage.dataset.window !== next) {
        stage.dataset.window = next;
        stage.dispatchEvent(new Event(STAGE_EVENT));
      }
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(workspace);
    observer.observe(free);
    window.addEventListener("resize", place);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      delete workspace.dataset.stage;
      delete stage.dataset.window;
      for (const key of ["left", "top", "width", "height"] as const) stage.style[key] = "";
      for (const edge of ["top", "right", "bottom", "left"]) workspace.style.removeProperty(`--window-${edge}`);
      stage.dispatchEvent(new Event(STAGE_EVENT));
    };
  }, []);
  return <div ref={ref} className={`${styles.stage} ${props.className ?? ""}`} style={props.style} data-trainer-stage>{props.children}</div>;
}
