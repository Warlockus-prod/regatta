"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { BOOTCAMP_LESSON_PLAN, bootcampLessonHeads } from "@/data/bootcamp-index";
import { foundationCopy } from "@/data/foundation-copy";
import { useI18n } from "@/lib/i18n";
import { legacyPick } from "@/lib/languages";
import { theoryResult } from "@/lib/learning/foundation-progress";
import { foundationHref } from "@/lib/learning/foundation-navigation";
import { foundationWebCopy } from "@/app/start/copy";
import { useFoundationProgress } from "@/app/start/useFoundationProgress";

/**
 * Return from a lesson destination without turning a visit into a passed check.
 * Rendered by the root layout on every page: it reads lesson heads and the quiz
 * answer key only, never bootcamp.ts or the quiz text (learning-bookmark.test.ts).
 */
export default function BootcampFooterNav() {
  const { lang } = useI18n();
  const pathname = usePathname();
  const state = useFoundationProgress();
  const current = state.progress.current ?? state.legacyCurrent;
  const lesson = bootcampLessonHeads.find(item => item.id === current);
  const baseRoute = BOOTCAMP_LESSON_PLAN.find(item => item.id === lesson?.id)?.route.split(/[#?]/)[0];
  const immersive = ["/game", "/multiplayer", "/simulator", "/simulator2", "/simulator-v3"].some(route => pathname === route || pathname.startsWith(`${route}/`));
  const visible = Boolean(state.ready && !state.readError && lesson && baseRoute && (pathname === baseRoute || pathname.startsWith(`${baseRoute}/`)) && !immersive);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!visible || !element) { document.body.style.removeProperty("--bootcamp-footer-h"); return; }
    const update = () => document.body.style.setProperty("--bootcamp-footer-h", `${element.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update); observer.observe(element);
    return () => { observer.disconnect(); document.body.style.removeProperty("--bootcamp-footer-h"); };
  }, [visible]);
  if (!visible || !lesson) return null;
  const passed = theoryResult(state.progress, lesson.id).passed;
  return <div ref={ref} className="fixed inset-x-0 bottom-0 z-40 border-t" style={{ background: "var(--nav-bg)", borderColor: "var(--border-subtle, rgba(139,167,184,.3))", paddingBottom: "env(safe-area-inset-bottom, 0px)" }} role="region" aria-label={foundationCopy.return[lang]}>
    <div className="mx-auto flex max-w-[1080px] flex-wrap items-center gap-3 px-5 py-3">
      <div className="min-w-0 flex-1 basis-48">
        <p className="text-sm text-[var(--text-secondary)]">{lesson.order}/8 · {passed ? foundationWebCopy.passed[lang] : foundationWebCopy.notChecked[lang]}</p>
        <p className="text-base font-semibold">{legacyPick(lesson, "title", lang)}</p>
      </div>
      <Link href={foundationHref(lesson.id, "check")} className="inline-flex min-h-11 items-center rounded-md bg-[var(--accent-cyan)] px-4 py-2.5 text-center font-semibold text-[var(--accent-ink)]">{foundationCopy.check[lang]}</Link>
      <Link href={foundationHref(lesson.id, "practice")} className="inline-flex min-h-11 items-center rounded-md border border-[var(--text-muted)] px-4 py-2.5 text-center">{foundationCopy.return[lang]}</Link>
    </div>
  </div>;
}
