"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SRC_BANK, type SrcQuestion } from "@/data/src-radio";
import { useI18n } from "@/lib/i18n";
import { useSternikPrefs } from "../../sternik/prefs";
import {
  loadQuestionProgress,
  saveQuestionProgress,
  withQuestionAnswer,
} from "../questionProgress";
import { record as recordWeak } from "../weakSpots";
import type { TheoryChapter } from "./courseData";

function selectChecks(questionIds: string[]): SrcQuestion[] {
  const available = questionIds
    .map((id) => SRC_BANK.find((question) => question.id === id))
    .filter((question): question is SrcQuestion => Boolean(question));
  if (available.length <= 3) return available;
  return [
    available[0],
    available[Math.floor((available.length - 1) / 2)],
    available[available.length - 1],
  ];
}

export default function ChapterCheck({
  chapter,
  complete,
  onPassed,
}: {
  chapter: TheoryChapter;
  complete: boolean;
  onPassed: () => void;
}) {
  const { tp } = useI18n();
  const { explLang } = useSternikPrefs();
  const questions = useMemo(
    () => selectChecks(chapter.questionIds ?? []),
    [chapter.questionIds],
  );
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = questions[index];

  const reset = () => {
    setStarted(true);
    setIndex(0);
    setPicked(null);
    setCorrectCount(0);
    setFinished(false);
  };

  const answer = (option: number) => {
    if (!current || picked !== null) return;
    const correct = option === current.correct;
    setPicked(option);
    if (correct) setCorrectCount((value) => value + 1);

    const progress = withQuestionAnswer(
      loadQuestionProgress(),
      current.id,
      correct,
    );
    saveQuestionProgress(progress);
    recordWeak(
      "theory",
      correct ? [] : [{ id: current.id, label: current.q }],
      correct ? [{ id: current.id }] : [],
    );
  };

  const advance = () => {
    if (index < questions.length - 1) {
      setIndex((value) => value + 1);
      setPicked(null);
      return;
    }
    const finalCorrect = correctCount;
    setFinished(true);
    if (finalCorrect === questions.length) onPassed();
  };

  if (questions.length === 0) return null;

  if (!started) {
    return (
      <section className="border-t pt-6" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="max-w-2xl">
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              {complete
                ? tp("Проверка пройдена", "Check complete", "Sprawdzenie zaliczone")
                : tp("Проверь понимание", "Check your understanding", "Sprawdz zrozumienie")}
            </h2>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {tp(
                "Три вопроса из связанных материалов UKE. Глава завершится только после трех правильных ответов.",
                "Three questions from the related UKE material. The chapter completes after three correct answers.",
                "Trzy pytania z powiazanych materialow UKE. Rozdzial konczy sie po trzech poprawnych odpowiedziach.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="min-h-[48px] shrink-0 rounded-xl px-5 text-sm font-bold"
            style={{ background: "var(--accent-cyan)", color: "var(--accent-ink)" }}
          >
            {complete
              ? tp("Повторить", "Repeat", "Powtorz")
              : tp("Начать проверку", "Start check", "Zacznij sprawdzenie")}
          </button>
        </div>
      </section>
    );
  }

  if (finished) {
    const passed = correctCount === questions.length;
    return (
      <section
        role="status"
        className="border-t pt-6"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <h2 className="text-lg font-bold" style={{ color: passed ? "var(--success-text, var(--success))" : "var(--warning-text, var(--warning))" }}>
          {passed
            ? tp("Глава закреплена", "Chapter mastered", "Rozdzial utrwalony")
            : tp("Нужно еще одно повторение", "One more review is needed", "Potrzebna jest jeszcze jedna powtorka")}
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          {correctCount}/{questions.length}.{" "}
          {passed
            ? tp(
                "Теперь переходи к практике.",
                "Now move to practice.",
                "Teraz przejdz do praktyki.",
              )
            : tp(
                "Вернись к схеме и объяснению, затем попробуй снова.",
                "Review the diagram and explanation, then try again.",
                "Wroc do schematu i wyjasnienia, potem sprobuj ponownie.",
              )}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="min-h-[46px] rounded-xl border px-5 text-sm font-bold"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
          >
            {tp("Пройти еще раз", "Try again", "Sprobuj ponownie")}
          </button>
          <Link
            href={chapter.practiceHref}
            className="flex min-h-[46px] items-center rounded-xl px-5 text-sm font-bold"
            style={{ background: "var(--accent-cyan)", color: "var(--accent-ink)" }}
          >
            {explLang === "ru" ? chapter.practiceLabel.ru : chapter.practiceLabel.pl}
          </Link>
        </div>
      </section>
    );
  }

  if (!current) return null;

  return (
    <section className="border-t pt-6" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="mb-3 flex items-center justify-between gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
        <span>{tp("Проверка главы", "Chapter check", "Sprawdzenie rozdzialu")}</span>
        <span>{index + 1}/{questions.length}</span>
      </div>
      <h2 className="max-w-3xl text-base font-semibold leading-relaxed" style={{ color: "var(--text-primary)" }}>
        {current.q}
      </h2>
      <div className="mt-4 space-y-2">
        {current.options.map((option, optionIndex) => {
          const show = picked !== null;
          const correct = optionIndex === current.correct;
          const selected = optionIndex === picked;
          return (
            <button
              key={option}
              type="button"
              disabled={show}
              onClick={() => answer(optionIndex)}
              className="flex min-h-[48px] w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm"
              style={{
                borderColor: show && correct
                  ? "var(--success)"
                  : show && selected
                    ? "var(--danger)"
                    : "var(--border-subtle)",
                background: show && correct
                  ? "rgba(68,255,136,0.08)"
                  : show && selected
                    ? "rgba(255,68,68,0.08)"
                    : "var(--bg-secondary)",
                color: "var(--text-primary)",
              }}
            >
              <span className="font-bold" style={{ color: "var(--accent-cyan)" }}>
                {String.fromCharCode(65 + optionIndex)}
              </span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="mt-4">
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {picked === current.correct ? "✓ " : "✕ "}{current.whyPl}
          </p>
          <button
            type="button"
            onClick={advance}
            className="mt-4 min-h-[46px] rounded-xl px-5 text-sm font-bold"
            style={{ background: "var(--accent-cyan)", color: "var(--accent-ink)" }}
          >
            {index === questions.length - 1
              ? tp("Показать результат", "Show result", "Pokaz wynik")
              : tp("Следующий вопрос", "Next question", "Nastepne pytanie")}
          </button>
        </div>
      )}
    </section>
  );
}
