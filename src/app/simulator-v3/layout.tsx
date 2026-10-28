import type { ReactNode } from "react";

// Inherit the root viewport; the shared theme resolver keeps browser chrome
// aligned with the saved or native appearance, independently of scene lighting.
export default function TrainerLayout({ children }: { children: ReactNode }) {
  return children;
}
