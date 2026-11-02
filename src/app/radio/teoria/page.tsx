"use client";

import { useRadioI18n } from "@/app/radio/localization/context";

import { Component, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { trackLessonComplete } from "@/lib/funnel";
import { useSternikPrefs } from "@/app/radio/prefs";
import {
  THEORY_CHAPTERS,
  THEORY_SOURCES,
  TOTAL_THEORY_MINUTES,
  type BiText,
  type TheoryChapter,
} from "./courseData";
import { TheoryDiagram } from "./diagrams";
import { THEORY_SECTION_LABELS, type TheorySectionId } from "./sectionLabels";
import { RADIO_ROUTE_EVENT, radioRuntimeHash, radioRuntimeSearch } from "../runtimeSearch";
import { offlineRadio } from "../audio/localSpeech";

const ChapterCheck = dynamic(() => import("./ChapterCheck"), { ssr: false });

/**
 * The chapter check is a separate chunk, loaded on demand. Offline, with that
 * chunk not in the cache, the import rejects - and without a boundary the
 * error takes the whole theory page down to the route error screen, theory
 * text included. Contain it: the chapter stays readable, the check says why
 * it is missing.
 */
class ChapterCheckBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const PROGRESS_KEY = "radio.src.theory.progress.v2";
const CHAPTER_EVENT = "radio:theory-chapter";
type CourseMode = "learn" | "exam";

function readCompleted(): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(PROGRESS_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function saveCompleted(ids: string[]) {
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(ids));
  } catch {
    // Local progress is optional.
  }
}

function readChapterHash(): string {
  const hash = radioRuntimeHash().slice(1);
  return THEORY_CHAPTERS.some((item) => item.id === hash) ? hash : THEORY_CHAPTERS[0].id;
}

function subscribeChapterHash(listener: () => void) {
  window.addEventListener("hashchange", listener);
  window.addEventListener(CHAPTER_EVENT, listener);
  window.addEventListener(RADIO_ROUTE_EVENT, listener);
  return () => {
    window.removeEventListener("hashchange", listener);
    window.removeEventListener(CHAPTER_EVENT, listener);
    window.removeEventListener(RADIO_ROUTE_EVENT, listener);
  };
}

function Text({
  value,
  className = "",
  as = "span",
}: {
  value: BiText;
  className?: string;
  as?: "span" | "p" | "div";
}) {
  const { rt: radioText } = useRadioI18n();
  const { explLang } = useSternikPrefs();
  const Element = as;
  if (explLang === "ru") return <Element className={className}>{radioText(value.ru)}</Element>;
  if (explLang === "both") {
    return (
      <Element className={className}>
        <span>{radioText(value.pl)}</span>
        <span className="mt-1 block text-[0.92em]" style={{ color: "var(--text-muted)" }}>{radioText(value.ru)}</span>
      </Element>
    );
  }
  return <Element className={className}>{radioText(value.pl)}</Element>;
}

function Surface({
  children,
  className = "",
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "cyan" | "amber" | "green" | "red";
}) {
  const { rt: radioText } = useRadioI18n();
  const tones = {
    default: { background: "var(--bg-card)", borderColor: "var(--border-subtle)" },
    cyan: { background: "rgba(0,212,255,0.055)", borderColor: "rgba(0,212,255,0.25)" },
    amber: { background: "rgba(255,170,0,0.055)", borderColor: "rgba(255,170,0,0.26)" },
    green: { background: "rgba(68,255,136,0.05)", borderColor: "rgba(68,255,136,0.24)" },
    red: { background: "rgba(255,68,68,0.05)", borderColor: "rgba(255,68,68,0.24)" },
  };
  return (
    <div className={`rounded-2xl border ${className}`} style={tones[tone]}>
      {radioText(children)}
    </div>
  );
}

function SectionTitle({
  icon,
  id,
}: {
  icon: string;
  id: TheorySectionId;
}) {
  const { tl } = useRadioI18n();
  return (
    <h2 className="mb-3 flex items-center gap-2 text-base font-bold" style={{ color: "var(--text-primary)" }}>
      <span aria-hidden>{icon}</span>
      {tl(THEORY_SECTION_LABELS[id])}
    </h2>
  );
}

function CourseNav({
  activeId,
  completed,
  onSelect,
}: {
  activeId: string;
  completed: Set<string>;
  onSelect: (id: string) => void;
}) {
  const { rt: radioText } = useRadioI18n();
  const { explLang } = useSternikPrefs();
  return (
    <nav aria-label={radioText(explLang === "ru" ? "Главы курса" : "Rozdziały kursu")}>
      <ol className="space-y-1">
        {THEORY_CHAPTERS.map((chapter) => {
          const active = chapter.id === activeId;
          const done = completed.has(chapter.id);
          return (
            <li key={chapter.id}>
              <button
                type="button"
                onClick={() => onSelect(chapter.id)}
                aria-current={active ? "step" : undefined}
                className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition"
                style={active
                  ? { background: "rgba(0,212,255,0.1)", color: "var(--text-primary)", border: "1px solid rgba(0,212,255,0.32)" }
                  : { color: "var(--text-secondary)", border: "1px solid transparent" }}
              >
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold"
                  style={done
                    ? { background: "var(--success)", color: "#052019" }
                    : active
                      ? { background: "var(--accent-cyan)", color: "var(--accent-ink, #04222e)" }
                      : { background: "var(--bg-secondary)", color: "var(--text-muted)" }}
                >
                  {radioText(done ? "✓" : chapter.number)}
                </span>
                <span className="min-w-0">
                  <span className="block leading-tight">
                    {radioText(explLang === "ru" ? chapter.title.ru : chapter.title.pl)}
                  </span>
                  <span className="mt-0.5 block text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {radioText(chapter.minutes)}{radioText(" min ")}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ConceptGrid({ chapter }: { chapter: TheoryChapter }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {chapter.concepts.map((concept) => (
        <Surface key={concept.title.pl} className="p-4">
          <Text value={concept.title} as="div" className="mb-2 text-sm font-bold" />
          <Text value={concept.body} as="p" className="text-sm leading-relaxed" />
        </Surface>
      ))}
    </div>
  );
}

function Checklist({
  items,
  kind,
}: {
  items: BiText[];
  kind: "allowed" | "forbidden";
}) {
  const { rt: radioText } = useRadioI18n();
  const positive = kind === "allowed";
  return (
    <Surface tone={positive ? "green" : "red"} className="p-4">
      <div className="mb-3 text-sm font-bold" style={{ color: positive ? "var(--success)" : "var(--danger)" }}>
        {radioText(positive ? "✓ " : "✕ ")}
        <Text
          value={positive
            ? { pl: "Tak rób", ru: "Так можно и нужно" }
            : { pl: "Tego nie rób", ru: "Так делать нельзя" }}
        />
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.pl} className="flex gap-2 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            <span aria-hidden style={{ color: positive ? "var(--success)" : "var(--danger)" }}>{radioText(positive ? "✓" : "✕")}</span>
            <Text value={item} />
          </li>
        ))}
      </ul>
    </Surface>
  );
}

function SourceList({ sourceIds }: { sourceIds: string[] }) {
  const { rt: radioText } = useRadioI18n();
  const sources = THEORY_SOURCES.filter((source) => sourceIds.includes(source.id));
  return (
    <details className="group rounded-xl border px-4 py-3" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-secondary)" }}>
      <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
        <Text value={{ pl: `Źródła tej lekcji (${sources.length})`, ru: `Источники урока (${sources.length})` }} />
      </summary>
      <ul className="mt-3 space-y-2">
        {sources.map((source) => (
          <li key={source.id} className="text-xs leading-relaxed">
            <a href={source.href} target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-4" style={{ color: "var(--accent-cyan)" }}>
              {radioText(source.owner)}: {radioText(source.label)}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}

function MobileTheoryFlow({ chapter }: { chapter: TheoryChapter }) {
  const { rt: radioText } = useRadioI18n();
  const { explLang } = useSternikPrefs();
  return (
    <ol
      className="space-y-0 md:hidden"
      aria-label={radioText(explLang === "ru" ? "Краткая схема главы" : "Skrócony schemat rozdziału")}
    >
      {chapter.steps.slice(0, 4).map((step, index) => (
        <li key={step.pl} className="relative flex gap-3 pb-5 last:pb-0">
          {index < Math.min(chapter.steps.length, 4) - 1 && (
            <span
              aria-hidden
              className="absolute left-[17px] top-9 h-[calc(100%-1.25rem)] w-px"
              style={{ background: "var(--border-subtle)" }}
            />
          )}
          <span
            className="relative z-10 grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold"
            style={{ background: "var(--accent-cyan)", color: "var(--accent-ink)" }}
          >
            {radioText(index + 1)}
          </span>
          <Text value={step} as="div" className="pt-1.5 text-sm leading-relaxed" />
        </li>
      ))}
    </ol>
  );
}

export default function RadioTheoryCourse() {
  const router = useRouter();
  const { rt: radioText } = useRadioI18n();
  const { tp, tl } = useRadioI18n();
  const { explLang } = useSternikPrefs();
  const activeId = useSyncExternalStore(
    subscribeChapterHash,
    readChapterHash,
    () => THEORY_CHAPTERS[0].id,
  );
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [mode, setMode] = useState<CourseMode>("learn");
  const completed = useMemo(() => new Set(completedIds), [completedIds]);
  const activeIndex = THEORY_CHAPTERS.findIndex((chapter) => chapter.id === activeId);
  const chapter = THEORY_CHAPTERS[activeIndex] ?? THEORY_CHAPTERS[0];
  const progress = Math.round((completed.size / THEORY_CHAPTERS.length) * 100);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCompletedIds(readCompleted());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Choosing a chapter lands on its text, not the page top: on a fresh course
  // "Start from basics" picks the chapter already shown, so scrolling to the
  // top left the reader exactly where they were (TestFlight69 TF12).
  const articleRef = useRef<HTMLElement>(null);
  const pendingChapter = useRef<string | null>(null);
  const [chapterRequest, setChapterRequest] = useState(0);

  useEffect(() => {
    if (pendingChapter.current !== chapter.id || !articleRef.current) return;
    pendingChapter.current = null;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    articleRef.current.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    articleRef.current.focus({ preventScroll: true });
  }, [chapter.id, chapterRequest]);

  const selectChapter = (id: string) => {
    pendingChapter.current = id;
    if (offlineRadio()) router.replace(`/radio/teoria${radioRuntimeSearch()}#${id}`, { scroll: false });
    else window.history.replaceState(null, "", `#${id}`);
    window.dispatchEvent(new Event(CHAPTER_EVENT));
    setChapterRequest((n) => n + 1);
  };

  const markComplete = () => {
    if (completed.has(chapter.id)) return;
    const next = [...completedIds, chapter.id];
    setCompletedIds(next);
    saveCompleted(next);
    trackLessonComplete("radio-theory", chapter.id);
  };

  const continueCourse = () => {
    const next = THEORY_CHAPTERS.find((item) => !completed.has(item.id)) ?? THEORY_CHAPTERS[0];
    selectChapter(next.id);
  };

  return (
    <div id="radio-theory-course" className="pb-10">
      <header className="mb-6 overflow-hidden rounded-3xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--accent-cyan)" }}>
              {radioText(tp("Полный теоретический курс SRC", "Complete SRC theory course", "Pełny kurs teorii SRC"))}
            </div>
            <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-4xl" style={{ color: "var(--text-primary)" }}>
              {radioText(tp(
                "Понять морскую рацию до тренажёра",
                "Understand marine radio before the simulator",
                "Zrozum radio morskie przed symulatorem",
              ))}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: "var(--text-secondary)" }}>
              {radioText(tp(
                "Не список фактов, а цельная модель: почему VHF работает именно так, как выбрать приоритет, что реально передаёт DSC, зачем нужна каждая строка MAYDAY и как экзамен связан с практикой в море.",
                "A coherent model rather than a fact list: why VHF works this way, how to choose priority, what DSC actually sends, why every MAYDAY line exists, and how the exam connects to real operations.",
                "Nie lista faktów, lecz spójny model: dlaczego VHF działa w ten sposób, jak wybrać priorytet, co naprawdę wysyła DSC, po co jest każda linia MAYDAY i jak egzamin łączy się z praktyką.",
              ))}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="rounded-full px-3 py-1.5" style={{ background: "var(--bg-secondary)" }}>{radioText(THEORY_CHAPTERS.length)} {radioText(tp("глав", "chapters", "rozdziałów"))}</span>
              <span className="rounded-full px-3 py-1.5" style={{ background: "var(--bg-secondary)" }}>{radioText(THEORY_CHAPTERS.length)} {radioText(tp("схем", "diagrams", "schematów"))}</span>
              <span className="rounded-full px-3 py-1.5" style={{ background: "var(--bg-secondary)" }}>{radioText(TOTAL_THEORY_MINUTES)}{radioText(" min")}</span>
              <span className="rounded-full px-3 py-1.5" style={{ background: "var(--bg-secondary)" }}>324 {radioText(tl({ pl: "pytania egzaminacyjne", ru: "экзаменационных вопроса", en: "exam questions", es: "preguntas de examen", fr: "questions d'examen", de: "Prüfungsfragen", it: "domande d'esame" }))}</span>
            </div>
          </div>
          <Surface tone="cyan" className="self-start p-5">
            <div className="flex items-end justify-between">
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {radioText(tp("Прогресс курса", "Course progress", "Postęp kursu"))}
              </span>
              <span className="text-2xl font-bold" style={{ color: "var(--accent-cyan)" }}>{radioText(progress)}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: "var(--bg-secondary)" }}>
              <div className="h-full rounded-full transition-[width]" style={{ width: `${progress}%`, background: "var(--accent-cyan)" }} />
            </div>
            <div className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
              {radioText(completed.size)}/{radioText(THEORY_CHAPTERS.length)} {radioText(tp("завершено", "complete", "ukończono"))}
            </div>
            <button
              type="button"
              onClick={continueCourse}
              className="mt-5 min-h-[44px] w-full rounded-xl px-4 text-sm font-bold"
              style={{ background: "var(--accent-cyan)", color: "var(--accent-ink, #04222e)" }}
            >
              {radioText(completed.size === 0
                ? tp("Начать с основ", "Start from basics", "Zacznij od podstaw")
                : tp("Продолжить курс", "Continue course", "Kontynuuj kurs"))}
            </button>
          </Surface>
        </div>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border p-1" role="group" aria-label={radioText(tp("Режим курса", "Course mode", "Tryb kursu"))} style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}>
          {([
            { id: "learn" as const, label: tp("Учить по порядку", "Learn in order", "Nauka po kolei") },
            { id: "exam" as const, label: tp("Повторить к экзамену", "Exam review", "Powtórka do egzaminu") },
          ]).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              aria-pressed={mode === item.id}
              className="min-h-[44px] rounded-lg px-3 text-sm font-semibold"
              style={mode === item.id
                ? { background: "var(--accent-cyan)", color: "var(--accent-ink, #04222e)" }
                : { color: "var(--text-secondary)" }}
            >
              {radioText(item.label)}
            </button>
          ))}
        </div>
        <Link href="/radio/sciaga" className="ml-auto flex min-h-[44px] items-center rounded-xl border px-4 text-sm font-semibold" style={{ color: "var(--text-secondary)", borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}>
          {radioText(tp("Открыть шпаргалку", "Open cheat sheet", "Otwórz ściągę"))}
        </Link>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden rounded-2xl border p-2 lg:sticky lg:top-4 lg:block" style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
          <CourseNav activeId={chapter.id} completed={completed} onSelect={selectChapter} />
        </aside>

        <div className="lg:hidden">
          <label htmlFor="theory-chapter" className="mb-2 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            {radioText(tp("Глава курса", "Course chapter", "Rozdział kursu"))}
          </label>
          <select
            id="theory-chapter"
            value={chapter.id}
            onChange={(event) => selectChapter(event.target.value)}
            className="min-h-[48px] w-full rounded-xl border px-3 text-sm"
            style={{ background: "var(--bg-card)", color: "var(--text-primary)", borderColor: "var(--border-subtle)" }}
          >
            {THEORY_CHAPTERS.map((item) => (
              <option key={item.id} value={item.id}>
                {radioText(completed.has(item.id) ? "✓ " : "")}{radioText(item.number)}. {radioText(explLang === "ru" ? item.title.ru : item.title.pl)} ({radioText(item.minutes)}{radioText(" min) ")}</option>
            ))}
          </select>
        </div>

        <article key={chapter.id} ref={articleRef} tabIndex={-1} data-testid="theory-chapter" className="min-w-0 max-w-full outline-none">
          <Surface className="overflow-hidden">
            <div className="border-b p-5 sm:p-7" style={{ borderColor: "var(--border-subtle)" }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: "rgba(0,212,255,0.1)", color: "var(--accent-cyan)" }}>
                  {radioText(tp("Глава", "Chapter", "Rozdział"))} {radioText(chapter.number)}/{radioText(THEORY_CHAPTERS.length)}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{radioText(chapter.minutes)}{radioText(" min")}</span>
                {completed.has(chapter.id) && (
                  <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: "rgba(68,255,136,0.1)", color: "var(--success)" }}>
                    ✓ {radioText(tp("Пройдено", "Complete", "Ukończono"))}
                  </span>
                )}
              </div>
              <Text value={chapter.eyebrow} as="div" className="mt-5 text-xs font-bold uppercase tracking-[0.14em]" />
              <Text value={chapter.title} as="div" className="mt-2 text-2xl font-bold leading-tight sm:text-3xl" />
              <Text value={chapter.lead} as="p" className="mt-4 max-w-3xl text-base leading-relaxed" />
            </div>

            {mode === "exam" ? (
              <div className="space-y-5 p-5 sm:p-7">
                <Surface tone="amber" className="p-5">
                  <SectionTitle icon="🎯" id="examSummary" />
                  <Text value={chapter.exam} as="p" className="text-sm leading-relaxed" />
                </Surface>
                <div>
                  <SectionTitle icon="🧠" id="distinguishConcepts" />
                  <ConceptGrid chapter={chapter} />
                </div>
                <Surface className="p-5">
                  <SectionTitle icon="✅" id="questionAreas" />
                  <div className="flex flex-wrap gap-2">
                    {chapter.questionTopics.map((topic) => (
                      <span key={topic.pl} className="rounded-full border px-3 py-1.5 text-xs" style={{ color: "var(--text-secondary)", borderColor: "var(--border-subtle)" }}>
                        <Text value={topic} />
                      </span>
                    ))}
                  </div>
                  <Link href={`/radio/test?chapter=${chapter.id}`} className="mt-4 inline-flex min-h-[44px] items-center rounded-xl px-4 text-sm font-bold" style={{ background: "var(--accent-cyan)", color: "var(--accent-ink, #04222e)" }}>
                    {radioText(tl({ pl: "Przejdź do pytań egzaminacyjnych", ru: "Перейти к экзаменационным вопросам", en: "Open exam questions", es: "Ir a las preguntas de examen", fr: "Ouvrir les questions d'examen", de: "Zu den Prüfungsfragen", it: "Apri le domande d'esame" }))}
                  </Link>
                </Surface>
                <SourceList sourceIds={chapter.sourceIds} />
              </div>
            ) : (
              <div className="space-y-7 p-5 sm:p-7">
                <Surface tone="amber" className="p-5">
                  <SectionTitle icon="⛵" id="situation" />
                  <Text value={chapter.situation} as="p" className="text-sm leading-relaxed" />
                </Surface>

                <div>
                  <SectionTitle icon="🗺️" id="diagram" />
                  <div className="md:hidden">
                    <MobileTheoryFlow chapter={chapter} />
                  </div>
                  <div className="hidden max-w-full md:block">
                    <TheoryDiagram id={chapter.diagram} />
                  </div>
                </div>

                <Surface tone="cyan" className="p-5">
                  <SectionTitle icon="💡" id="why" />
                  <Text value={chapter.why} as="p" className="text-sm leading-relaxed" />
                </Surface>

                <div>
                  <SectionTitle icon="🧩" id="mentalModel" />
                  <ConceptGrid chapter={chapter} />
                </div>

                <div>
                  <SectionTitle icon="📋" id="procedure" />
                  <ol className="space-y-3">
                    {chapter.steps.map((step, index) => (
                      <li key={step.pl} className="flex gap-3 rounded-xl border p-4" style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
                        <span className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold" style={{ background: "var(--accent-cyan)", color: "var(--accent-ink, #04222e)" }}>{radioText(index + 1)}</span>
                        <Text value={step} as="div" className="pt-0.5 text-sm leading-relaxed" />
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Checklist items={chapter.allowed} kind="allowed" />
                  <Checklist items={chapter.forbidden} kind="forbidden" />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Surface tone="amber" className="p-5">
                    <SectionTitle icon="🎯" id="exam" />
                    <Text value={chapter.exam} as="p" className="text-sm leading-relaxed" />
                  </Surface>
                  <Surface tone="cyan" className="p-5">
                    <SectionTitle icon="🌊" id="practice" />
                    <Text value={chapter.practice} as="p" className="text-sm leading-relaxed" />
                  </Surface>
                </div>

                <Surface className="p-5">
                  <SectionTitle icon="🌍" id="world" />
                  <Text value={chapter.world} as="p" className="text-sm leading-relaxed" />
                </Surface>

                <Surface className="p-5">
                  <SectionTitle icon="🔎" id="questionPreview" />
                  <div className="flex flex-wrap gap-2">
                    {chapter.questionTopics.map((topic) => (
                      <span key={topic.pl} className="rounded-full border px-3 py-1.5 text-xs" style={{ color: "var(--text-secondary)", borderColor: "var(--border-subtle)" }}>
                        <Text value={topic} />
                      </span>
                    ))}
                  </div>
                </Surface>

                <SourceList sourceIds={chapter.sourceIds} />

                <ChapterCheckBoundary
                  key={chapter.id}
                  fallback={
                    <Surface className="p-5">
                      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        {radioText(tp(
                          "Проверка главы не загрузилась: похоже, нет сети. Теория выше доступна, а проверку можно пройти, когда связь вернётся.",
                          "The chapter check did not load, most likely because there is no connection. The theory above is all here; take the check once you are back online.",
                          "Sprawdzenie rozdziału nie załadowało się, prawdopodobnie z braku sieci. Teoria powyżej jest dostępna, a sprawdzenie zrobisz, gdy połączenie wróci.",
                        ))}
                      </p>
                    </Surface>
                  }
                >
                  <ChapterCheck
                    chapter={chapter}
                    complete={completed.has(chapter.id)}
                    onPassed={markComplete}
                  />
                </ChapterCheckBoundary>
              </div>
            )}
          </Surface>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={activeIndex === 0}
              onClick={() => selectChapter(THEORY_CHAPTERS[activeIndex - 1].id)}
              className="min-h-[44px] rounded-xl border px-4 text-sm font-semibold disabled:opacity-35"
              style={{ background: "var(--bg-card)", color: "var(--text-secondary)", borderColor: "var(--border-subtle)" }}
            >
              {radioText("<-")} {radioText(tp("Назад", "Previous", "Wstecz"))}
            </button>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{radioText(activeIndex + 1)}/{radioText(THEORY_CHAPTERS.length)}</span>
            <button
              type="button"
              disabled={activeIndex === THEORY_CHAPTERS.length - 1}
              onClick={() => selectChapter(THEORY_CHAPTERS[activeIndex + 1].id)}
              className="min-h-[44px] rounded-xl border px-4 text-sm font-semibold disabled:opacity-35"
              style={{ background: "var(--bg-card)", color: "var(--text-secondary)", borderColor: "var(--border-subtle)" }}
            >
              {radioText(tp("Дальше", "Next", "Dalej"))} {radioText("->")}
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
