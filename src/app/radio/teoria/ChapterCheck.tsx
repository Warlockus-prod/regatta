"use client";

import { OriginalPolish } from "../OriginalPolish";
import { examOptionText, examQuestionText, examExplanationText, hasEnglishOptions } from "../localization/examText";
import { useRadioI18n } from "@/app/radio/localization/context";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SRC_BANK, type SrcQuestion } from "@/data/src-radio";
import { useSternikPrefs } from "@/app/radio/prefs";
import {
  loadQuestionProgress,
  saveQuestionProgress,
  withQuestionAnswer,
} from "../questionProgress";
import { record as recordWeak } from "../weakSpots";
import type { TheoryChapter } from "./courseData";
import { PHONETIC_COPY, PHONETIC_DRILL_CHAPTER, PHONETIC_DRILL_HREF } from "@/data/radio/phonetic-copy";

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
  const { rt: radioText } = useRadioI18n();
  const { tp, tl, lang } = useRadioI18n();
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
              {radioText(complete
                ? tp("Проверка пройдена", "Check complete", "Sprawdzenie zaliczone")
                : tp("Проверь понимание", "Check your understanding", "Sprawdź zrozumienie"))}
            </h2>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {radioText(tl({
                ru: "Три вопроса из связанных экзаменационных материалов. Глава завершится только после трех правильных ответов.",
                en: "Three questions from the related exam material. The chapter completes after three correct answers.",
                pl: "Trzy pytania z powiązanych materiałów egzaminacyjnych. Rozdział kończy się po trzech poprawnych odpowiedziach.",
                es: "Tres preguntas de los materiales de examen relacionados. El capítulo se completa al responder correctamente las tres.",
                fr: "Trois questions tirées des documents d'examen associés. Le chapitre se termine après trois bonnes réponses.",
                de: "Drei Fragen aus den zugehörigen Prüfungsunterlagen. Das Kapitel endet nach drei richtigen Antworten.",
                it: "Tre domande tratte dai materiali d'esame correlati. Il capitolo termina dopo tre risposte corrette.",
              }))}
            </p>
            {chapter.id === PHONETIC_DRILL_CHAPTER && (
              <Link href={`${PHONETIC_DRILL_HREF}?from=${chapter.id}`} data-testid="chapter-phonetic-drill"
                className="mt-2 inline-flex min-h-[44px] items-center text-sm font-semibold underline underline-offset-4" style={{ color: "var(--accent-cyan)" }}>
                {tl(PHONETIC_COPY.chapterLink)}
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={reset}
            className="min-h-[48px] shrink-0 rounded-xl px-5 text-sm font-bold"
            style={{ background: "var(--accent-cyan)", color: "var(--accent-ink)" }}
          >
            {radioText(complete
              ? tp("Повторить", "Repeat", "Powtórz")
              : tp("Начать проверку", "Start check", "Zacznij sprawdzenie"))}
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
          {radioText(passed
            ? tp("Глава закреплена", "Chapter mastered", "Rozdział utrwalony")
            : tp("Нужно еще одно повторение", "One more review is needed", "Potrzebna jest jeszcze jedna powtórka"))}
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          {radioText(correctCount)}/{radioText(questions.length)}.{radioText(" ")}
          {radioText(passed
            ? tp(
                "Теперь переходи к практике.",
                "Now move to practice.",
                "Teraz przejdź do praktyki.",
              )
            : tp(
                "Вернись к схеме и объяснению, затем попробуй снова.",
                "Review the diagram and explanation, then try again.",
                "Wróć do schematu i wyjaśnienia, potem spróbuj ponownie.",
              ))}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="min-h-[46px] rounded-xl border px-5 text-sm font-bold"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
          >
            {radioText(tp("Пройти еще раз", "Try again", "Spróbuj ponownie"))}
          </button>
          <Link
            href={chapter.practiceHref}
            className="flex min-h-[46px] items-center rounded-xl px-5 text-sm font-bold"
            style={{ background: "var(--accent-cyan)", color: "var(--accent-ink)" }}
          >
            {radioText(explLang === "ru" ? chapter.practiceLabel.ru : chapter.practiceLabel.pl)}
          </Link>
        </div>
      </section>
    );
  }

  if (!current) return null;

  return (
    <section className="border-t pt-6" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="mb-3 flex items-center justify-between gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
        <span>{radioText(tp("Проверка главы", "Chapter check", "Sprawdzenie rozdziału"))}</span>
        <span>{radioText(index + 1)}/{radioText(questions.length)}</span>
      </div>
      <h2 className="max-w-3xl text-base font-semibold leading-relaxed" style={{ color: "var(--text-primary)" }}>
        {examQuestionText(current, lang, radioText)}
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
                {radioText(String.fromCharCode(65 + optionIndex))}
              </span>
              <span lang={hasEnglishOptions(current) ? "en" : lang}>{examOptionText(current, option, radioText)}</span>
            </button>
          );
        })}
      </div>
      <OriginalPolish><p>{current.q}</p><ol className="list-inside list-[upper-alpha]">{current.options.map((option,index)=><li key={index}>{option}</li>)}</ol></OriginalPolish>
      {picked !== null && (
        <div className="mt-4">
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {radioText(picked === current.correct ? "✓ " : "✕ ")}{examExplanationText(current, radioText)}
          </p>
          <button
            type="button"
            onClick={advance}
            className="mt-4 min-h-[46px] rounded-xl px-5 text-sm font-bold"
            style={{ background: "var(--accent-cyan)", color: "var(--accent-ink)" }}
          >
            {radioText(index === questions.length - 1
              ? tp("Показать результат", "Show result", "Pokaż wynik")
              : tp("Следующий вопрос", "Next question", "Następne pytanie"))}
          </button>
        </div>
      )}
    </section>
  );
}
