import type { ReactNode } from "react";

// The Polish certificate keeps Polish exam language in every app locale.
const polish = {
  lang: "pl" as const,
  setLang: () => {},
  tp: (_ru: string, _en: string, pl: string) => pl,
  tl: (text: { pl: string }) => text.pl,
};
export function useI18n() { return polish; }
export function I18nScope({ children }: { children: ReactNode; lang?: string }) { return <>{children}</>; }
