import type { ReactNode } from "react";
import { routeMetadata } from "@/lib/product/route-metadata";

export const generateMetadata = routeMetadata("offline");

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
