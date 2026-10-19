import type { Viewport } from "next";
import type { ReactNode } from "react";

// Trainers are always dark (src/lib/theme.ts isImmersive), so the browser bar
// matches the page instead of following a light OS setting.
export const viewport: Viewport = { themeColor: "#0a1628" };

export default function TrainerLayout({ children }: { children: ReactNode }) {
  return children;
}
