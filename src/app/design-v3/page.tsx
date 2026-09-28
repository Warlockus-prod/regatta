import type { Metadata } from "next";
import DesignStudio from "@/components/design-v3/DesignStudio";

export const metadata: Metadata = {
  title: "Regatta | Design v3 review",
  robots: { index: false, follow: false },
};

export default function DesignReviewPage() {
  return <DesignStudio />;
}
