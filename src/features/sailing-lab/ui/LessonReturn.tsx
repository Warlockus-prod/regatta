'use client';

import { useEffect, useState } from "react";
import { findSailLesson } from "../../../data/sailing-lab/course";
import { guideCopy } from "../../../data/sailing-lab/lesson-guide";
import type { Language } from "../../../lib/product/catalog";

export function LessonReturn({ lang, initialSearch }: { lang: Language; initialSearch?: string }) {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const search = new URLSearchParams(initialSearch ?? window.location.search);
    const lesson = findSailLesson(search.get("lesson") ?? "");
    const timer = setTimeout(() => setId(search.get("embed") !== "1" && lesson ? lesson.id : null), 0);
    return () => clearTimeout(timer);
  }, [initialSearch]);
  if (!id) return null;
  return <div className="px-5 py-3 border-b border-[var(--border-subtle)]"><a className="inline-flex min-h-11 items-center gap-3 text-sm text-[var(--accent-cyan)]" href={`/learn/sails/${id}`}>← {guideCopy.return[lang]}: {findSailLesson(id)!.title[lang]}</a></div>;
}
