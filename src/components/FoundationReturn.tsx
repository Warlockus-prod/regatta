"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { bootcampLessons } from "@/data/bootcamp";
import { foundationCopy } from "@/data/foundation-copy";
import { useI18n } from "@/lib/i18n";
import { legacyPick } from "@/lib/languages";
import { foundationHref, foundationReturnForSearch } from "@/lib/learning/foundation-navigation";
import { words } from "@/lib/product/catalog";

const lessonLabel = words("Урок", "Lesson", "Lekcja", "Lección", "Leçon", "Lektion", "Lezione");
const subscribe = (listener: () => void) => {
  window.addEventListener("popstate", listener);
  return () => window.removeEventListener("popstate", listener);
};

export function useFoundationReturnId(initialSearch?: string) {
  return useSyncExternalStore(subscribe, () => foundationReturnForSearch(initialSearch ?? window.location.search, Boolean((window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView)), () => null);
}

/** A reserved toolbar link; native embeds already have their own lesson header. */
export function FoundationReturn({ compact = false, bar = false, initialSearch }: { compact?: boolean; bar?: boolean; initialSearch?: string }) {
  const { lang } = useI18n();
  const id = useFoundationReturnId(initialSearch);
  const lesson = bootcampLessons.find(item => item.id === id);
  if (!lesson) return null;
  const title = legacyPick(lesson, "title", lang);
  const link = <Link href={foundationHref(lesson.id, "practice")} data-testid="foundation-return" aria-label={`${foundationCopy.return[lang]}: ${title}`} className="inline-flex min-h-11 min-w-11 shrink-0 items-center rounded-md px-2 text-sm text-[var(--accent-cyan)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-cyan)]">
    ‹ {compact ? `${lessonLabel[lang]} ${lesson.order}` : foundationCopy.return[lang]}
  </Link>;
  return bar ? <div className="shrink-0 border-b border-[var(--border-subtle)] px-5">{link}</div> : link;
}
