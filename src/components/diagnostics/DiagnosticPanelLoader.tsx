'use client';
import dynamic from "next/dynamic";
/** A single split point avoids duplicating all seven diagnostic catalogs. */
export const loadDiagnosticPanel = () => import("./DiagnosticPanel");
const DiagnosticPanelLoader = dynamic<{ active?: boolean }>(() => import("./DiagnosticPanel"), { ssr: false });
export default DiagnosticPanelLoader;
