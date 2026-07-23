"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n";
import { useSternikPrefs } from "../../sternik/prefs";
import {
  THEORY_CHAPTERS,
  THEORY_SOURCES,
  TOTAL_THEORY_MINUTES,
  type BiText,
  type TheoryChapter,
} from "./courseData";
import { TheoryDiagram } from "./diagrams";

const ChapterCheck = dynamic(() => import("./ChapterCheck"), { ssr: false });

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
  const hash = window.location.hash.slice(1);
  return THEORY_CHAPTERS.some((item) => item.id === hash) ? hash : THEORY_CHAPTERS[0].id;
}

function subscribeChapterHash(listener: () => void) {
  window.addEventListener("hashchange", listener);
  window.addEventListener(CHAPTER_EVENT, listener);
  return () => {
    window.removeEventListener("hashchange", listener);
    window.removeEventListener(CHAPTER_EVENT, listener);
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
  const { explLang } = useSternikPrefs();
  const Element = as;
  if (explLang === "ru") return <Element className={className}>{value.ru}</Element>;
  if (explLang === "both") {
    return (
      <Element className={className}>
        <span>{value.pl}</span>
        <span className="mt-1 block text-[0.92em]" style={{ color: "var(--text-muted)" }}>{value.ru}</span>
      </Element>
    );
  }
  return <Element className={className}>{value.pl}</Element>;
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
  const tones = {
    default: { background: "var(--bg-card)", borderColor: "var(--border-subtle)" },
    cyan: { background: "rgba(0,212,255,0.055)", borderColor: "rgba(0,212,255,0.25)" },
    amber: { background: "rgba(255,170,0,0.055)", borderColor: "rgba(255,170,0,0.26)" },
    green: { background: "rgba(68,255,136,0.05)", borderColor: "rgba(68,255,136,0.24)" },
    red: { background: "rgba(255,68,68,0.05)", borderColor: "rgba(255,68,68,0.24)" },
  };
  return (
    <div className={`rounded-2xl border ${className}`} style={tones[tone]}>
      {children}
    </div>
  );
}

function SectionTitle({
  icon,
  pl,
  ru,
}: {
  icon: string;
  pl: string;
  ru: string;
}) {
  const { explLang } = useSternikPrefs();
  return (
    <h2 className="mb-3 flex items-center gap-2 text-base font-bold" style={{ color: "var(--text-primary)" }}>
      <span aria-hidden>{icon}</span>
      {explLang === "ru" ? ru : pl}
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
  const { explLang } = useSternikPrefs();
  return (
    <nav aria-label={explLang === "ru" ? "Главы курса" : "Rozdzialy kursu"}>
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
                  {done ? "✓" : chapter.number}
                </span>
                <span className="min-w-0">
                  <span className="block leading-tight">
                    {explLang === "ru" ? chapter.title.ru : chapter.title.pl}
                  </span>
                  <span className="mt-0.5 block text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {chapter.minutes} min
                  </span>
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
  const positive = kind === "allowed";
  return (
    <Surface tone={positive ? "green" : "red"} className="p-4">
      <div className="mb-3 text-sm font-bold" style={{ color: positive ? "var(--success)" : "var(--danger)" }}>
        {positive ? "✓ " : "✕ "}
        <Text
          value={positive
            ? { pl: "Tak rob", ru: "Так можно и нужно" }
            : { pl: "Tego nie rob", ru: "Так делать нельзя" }}
        />
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.pl} className="flex gap-2 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            <span aria-hidden style={{ color: positive ? "var(--success)" : "var(--danger)" }}>{positive ? "✓" : "✕"}</span>
            <Text value={item} />
          </li>
        ))}
      </ul>
    </Surface>
  );
}

function SourceList({ sourceIds }: { sourceIds: string[] }) {
  const sources = THEORY_SOURCES.filter((source) => sourceIds.includes(source.id));
  return (
    <details className="group rounded-xl border px-4 py-3" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-secondary)" }}>
      <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
        <Text value={{ pl: `Zrodla tej lekcji (${sources.length})`, ru: `Источники урока (${sources.length})` }} />
      </summary>
      <ul className="mt-3 space-y-2">
        {sources.map((source) => (
          <li key={source.id} className="text-xs leading-relaxed">
            <a href={source.href} target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-4" style={{ color: "var(--accent-cyan)" }}>
              {source.owner}: {source.label}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}

function MobileTheoryFlow({ chapter }: { chapter: TheoryChapter }) {
  const { explLang } = useSternikPrefs();
  return (
    <ol
      className="space-y-0 md:hidden"
      aria-label={explLang === "ru" ? "Краткая схема главы" : "Skrocony schemat rozdzialu"}
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
            {index + 1}
          </span>
          <Text value={step} as="div" className="pt-1.5 text-sm leading-relaxed" />
        </li>
      ))}
    </ol>
  );
}

export default function RadioTheoryCourse() {
  const { tp } = useI18n();
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

  const selectChapter = (id: string) => {
    window.history.replaceState(null, "", `#${id}`);
    window.dispatchEvent(new Event(CHAPTER_EVENT));
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  const markComplete = () => {
    if (completed.has(chapter.id)) return;
    const next = [...completedIds, chapter.id];
    setCompletedIds(next);
    saveCompleted(next);
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
              {tp("Полный теоретический курс SRC", "Complete SRC theory course", "Pelny kurs teorii SRC")}
            </div>
            <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-4xl" style={{ color: "var(--text-primary)" }}>
              {tp(
                "Понять морскую рацию до тренажёра",
                "Understand marine radio before the simulator",
                "Zrozum radio morskie przed symulatorem",
              )}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: "var(--text-secondary)" }}>
              {tp(
                "Не список фактов, а цельная модель: почему VHF работает именно так, как выбрать приоритет, что реально передаёт DSC, зачем нужна каждая строка MAYDAY и как польский экзамен связан с практикой в море.",
                "A coherent model rather than a fact list: why VHF works this way, how to choose priority, what DSC actually sends, why every MAYDAY line exists, and how the Polish exam connects to real operations.",
                "Nie lista faktow, lecz spojny model: dlaczego VHF dziala w ten sposob, jak wybrac priorytet, co naprawde wysyla DSC, po co jest kazda linia MAYDAY i jak egzamin laczy sie z praktyka.",
              )}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="rounded-full px-3 py-1.5" style={{ background: "var(--bg-secondary)" }}>{THEORY_CHAPTERS.length} {tp("глав", "chapters", "rozdzialow")}</span>
              <span className="rounded-full px-3 py-1.5" style={{ background: "var(--bg-secondary)" }}>{THEORY_CHAPTERS.length} {tp("схем", "diagrams", "schematow")}</span>
              <span className="rounded-full px-3 py-1.5" style={{ background: "var(--bg-secondary)" }}>{TOTAL_THEORY_MINUTES} min</span>
              <span className="rounded-full px-3 py-1.5" style={{ background: "var(--bg-secondary)" }}>324 {tp("вопроса UKE", "UKE questions", "pytania UKE")}</span>
            </div>
          </div>
          <Surface tone="cyan" className="self-start p-5">
            <div className="flex items-end justify-between">
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {tp("Прогресс курса", "Course progress", "Postep kursu")}
              </span>
              <span className="text-2xl font-bold" style={{ color: "var(--accent-cyan)" }}>{progress}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: "var(--bg-secondary)" }}>
              <div className="h-full rounded-full transition-[width]" style={{ width: `${progress}%`, background: "var(--accent-cyan)" }} />
            </div>
            <div className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
              {completed.size}/{THEORY_CHAPTERS.length} {tp("завершено", "complete", "ukonczono")}
            </div>
            <button
              type="button"
              onClick={continueCourse}
              className="mt-5 min-h-[44px] w-full rounded-xl px-4 text-sm font-bold"
              style={{ background: "var(--accent-cyan)", color: "var(--accent-ink, #04222e)" }}
            >
              {completed.size === 0
                ? tp("Начать с основ", "Start from basics", "Zacznij od podstaw")
                : tp("Продолжить курс", "Continue course", "Kontynuuj kurs")}
            </button>
          </Surface>
        </div>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border p-1" role="group" aria-label={tp("Режим курса", "Course mode", "Tryb kursu")} style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}>
          {([
            { id: "learn" as const, label: tp("Учить по порядку", "Learn in order", "Nauka po kolei") },
            { id: "exam" as const, label: tp("Повторить к экзамену", "Exam review", "Powtorka do egzaminu") },
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
              {item.label}
            </button>
          ))}
        </div>
        <Link href="/radio/sciaga" className="ml-auto flex min-h-[44px] items-center rounded-xl border px-4 text-sm font-semibold" style={{ color: "var(--text-secondary)", borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}>
          {tp("Открыть шпаргалку", "Open cheat sheet", "Otworz sciage")}
        </Link>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden rounded-2xl border p-2 lg:sticky lg:top-4 lg:block" style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
          <CourseNav activeId={chapter.id} completed={completed} onSelect={selectChapter} />
        </aside>

        <div className="lg:hidden">
          <label htmlFor="theory-chapter" className="mb-2 block text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            {tp("Глава курса", "Course chapter", "Rozdzial kursu")}
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
                {completed.has(item.id) ? "✓ " : ""}{item.number}. {explLang === "ru" ? item.title.ru : item.title.pl} ({item.minutes} min)
              </option>
            ))}
          </select>
        </div>

        <article key={chapter.id} className="min-w-0 max-w-full">
          <Surface className="overflow-hidden">
            <div className="border-b p-5 sm:p-7" style={{ borderColor: "var(--border-subtle)" }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: "rgba(0,212,255,0.1)", color: "var(--accent-cyan)" }}>
                  {tp("Глава", "Chapter", "Rozdzial")} {chapter.number}/{THEORY_CHAPTERS.length}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{chapter.minutes} min</span>
                {completed.has(chapter.id) && (
                  <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: "rgba(68,255,136,0.1)", color: "var(--success)" }}>
                    ✓ {tp("Пройдено", "Complete", "Ukonczono")}
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
                  <SectionTitle icon="🎯" pl="Sedno na egzamin" ru="Суть для экзамена" />
                  <Text value={chapter.exam} as="p" className="text-sm leading-relaxed" />
                </Surface>
                <div>
                  <SectionTitle icon="🧠" pl="Pojecia, ktore trzeba rozroznic" ru="Понятия, которые нужно различать" />
                  <ConceptGrid chapter={chapter} />
                </div>
                <Surface className="p-5">
                  <SectionTitle icon="✅" pl="Powiazane obszary banku UKE" ru="Связанные темы базы UKE" />
                  <div className="flex flex-wrap gap-2">
                    {chapter.questionTopics.map((topic) => (
                      <span key={topic.pl} className="rounded-full border px-3 py-1.5 text-xs" style={{ color: "var(--text-secondary)", borderColor: "var(--border-subtle)" }}>
                        <Text value={topic} />
                      </span>
                    ))}
                  </div>
                  <Link href={`/radio/test?chapter=${chapter.id}`} className="mt-4 inline-flex min-h-[44px] items-center rounded-xl px-4 text-sm font-bold" style={{ background: "var(--accent-cyan)", color: "var(--accent-ink, #04222e)" }}>
                    {tp("Перейти к вопросам UKE", "Open UKE questions", "Przejdz do pytan UKE")}
                  </Link>
                </Surface>
                <SourceList sourceIds={chapter.sourceIds} />
              </div>
            ) : (
              <div className="space-y-7 p-5 sm:p-7">
                <Surface tone="amber" className="p-5">
                  <SectionTitle icon="⛵" pl="Sytuacja z zycia" ru="Ситуация из жизни" />
                  <Text value={chapter.situation} as="p" className="text-sm leading-relaxed" />
                </Surface>

                <div>
                  <SectionTitle icon="🗺️" pl="Schemat: zobacz zaleznosc" ru="Схема: увидь связь" />
                  <div className="md:hidden">
                    <MobileTheoryFlow chapter={chapter} />
                  </div>
                  <div className="hidden max-w-full md:block">
                    <TheoryDiagram id={chapter.diagram} />
                  </div>
                </div>

                <Surface tone="cyan" className="p-5">
                  <SectionTitle icon="💡" pl="Dlaczego to dziala wlasnie tak" ru="Почему это работает именно так" />
                  <Text value={chapter.why} as="p" className="text-sm leading-relaxed" />
                </Surface>

                <div>
                  <SectionTitle icon="🧩" pl="Model mentalny" ru="Ментальная модель" />
                  <ConceptGrid chapter={chapter} />
                </div>

                <div>
                  <SectionTitle icon="📋" pl="Procedura krok po kroku" ru="Процедура по шагам" />
                  <ol className="space-y-3">
                    {chapter.steps.map((step, index) => (
                      <li key={step.pl} className="flex gap-3 rounded-xl border p-4" style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}>
                        <span className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold" style={{ background: "var(--accent-cyan)", color: "var(--accent-ink, #04222e)" }}>{index + 1}</span>
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
                    <SectionTitle icon="🎯" pl="Na egzaminie UKE" ru="На экзамене UKE" />
                    <Text value={chapter.exam} as="p" className="text-sm leading-relaxed" />
                  </Surface>
                  <Surface tone="cyan" className="p-5">
                    <SectionTitle icon="🌊" pl="Na prawdziwym rejsie" ru="В реальном рейсе" />
                    <Text value={chapter.practice} as="p" className="text-sm leading-relaxed" />
                  </Surface>
                </div>

                <Surface className="p-5">
                  <SectionTitle icon="🌍" pl="Europa i swiat" ru="Европа и мир" />
                  <Text value={chapter.world} as="p" className="text-sm leading-relaxed" />
                </Surface>

                <Surface className="p-5">
                  <SectionTitle icon="🔎" pl="Co znajdziesz w pytaniach UKE" ru="Что встретится в вопросах UKE" />
                  <div className="flex flex-wrap gap-2">
                    {chapter.questionTopics.map((topic) => (
                      <span key={topic.pl} className="rounded-full border px-3 py-1.5 text-xs" style={{ color: "var(--text-secondary)", borderColor: "var(--border-subtle)" }}>
                        <Text value={topic} />
                      </span>
                    ))}
                  </div>
                </Surface>

                <SourceList sourceIds={chapter.sourceIds} />

                <ChapterCheck
                  chapter={chapter}
                  complete={completed.has(chapter.id)}
                  onPassed={markComplete}
                />
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
              {"<-"} {tp("Назад", "Previous", "Wstecz")}
            </button>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{activeIndex + 1}/{THEORY_CHAPTERS.length}</span>
            <button
              type="button"
              disabled={activeIndex === THEORY_CHAPTERS.length - 1}
              onClick={() => selectChapter(THEORY_CHAPTERS[activeIndex + 1].id)}
              className="min-h-[44px] rounded-xl border px-4 text-sm font-semibold disabled:opacity-35"
              style={{ background: "var(--bg-card)", color: "var(--text-secondary)", borderColor: "var(--border-subtle)" }}
            >
              {tp("Дальше", "Next", "Dalej")} {"->"}
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
