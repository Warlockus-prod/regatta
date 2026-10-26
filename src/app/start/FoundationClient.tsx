"use client";

import { windDirectionPractice } from "@/data/foundation-practice";

import Image from "next/image";
import { lessonCopy } from "@/data/lesson-copy";
import SailShapeIllustration from "./SailShapeIllustration";
import type { SailShapeContent } from "@/data/sail-shape";
import Link from "next/link";
import { useEffect, useState } from "react";
import { bootcampLessons, type BootcampLesson } from "@/data/bootcamp";
import { getQuizForLesson, isQuizPassed, pickPrompt } from "@/data/bootcamp-quiz";
import { foundationCopy, foundationModules } from "@/data/foundation-copy";
import type { FoundationGuide } from "@/data/foundation-guide";
import { useI18n } from "@/lib/i18n";
import { legacyPick } from "@/lib/languages";
import { renderScene, SCENE_HEIGHT, SCENE_WIDTH, type SceneId } from "@/lib/learning/foundation-drawings";
import { foundationPracticeHref, foundationSteps, isFoundationLesson, passedFoundationIds, theoryResult, updateFoundationCheck, updateFoundationDraft, type FoundationAnswers, type FoundationStep } from "@/lib/learning/foundation-progress";
import { destinations } from "@/lib/product/catalog";
import { saveLearningBookmark } from "@/lib/product/learning-web";
import { foundationWebCopy as copy } from "./copy";
import { announceFoundation, useFoundationProgress } from "./useFoundationProgress";
import styles from "./start.module.css";

export default function FoundationClient({ guides, shapeCopy }: { guides: Record<string, FoundationGuide>; shapeCopy: SailShapeContent }) {
  const { lang } = useI18n();
  const state = useFoundationProgress();
  const id = isFoundationLesson(state.lesson) ? state.lesson : state.display.current ?? state.legacyCurrent ?? bootcampLessons[0].id;
  const lesson = bootcampLessons.find(item => item.id === id)!;
  const position = state.display.positions[id] ?? { step: "understand" as const, diagram: 0 as const };
  const step = foundationSteps.includes(state.step as FoundationStep) ? state.step as FoundationStep : position.step;
  const { ready, readError, write } = state;
  useEffect(() => {
    if (!ready || readError) return;
    // Record a visit only after mounting, never as a passed check.
    const timer = setTimeout(() => {
      if (write(previous => ({ ...previous, current: id, visited: [...new Set([...previous.visited, id])] }))) {
        saveLearningBookmark({ version: 1, course: "course", lesson: id });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [id, ready, readError, write]);

  function navigate(nextId: string, nextStep: FoundationStep = "understand") {
    if (!state.write(previous => ({ ...previous, current: nextId, visited: [...new Set([...previous.visited, nextId])], positions: { ...previous.positions, [nextId]: { diagram: previous.positions[nextId]?.diagram ?? 0, step: nextStep } } }))) return;
    saveLearningBookmark({ version: 1, course: "course", lesson: nextId });
    const url = new URL(window.location.href);
    url.searchParams.set("lesson", nextId); url.searchParams.set("step", nextStep);
    window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
    announceFoundation();
    document.getElementById("foundation-lesson")?.focus();
  }
  const lessonDiagram = step === "understand" ? <figure className={styles.diagram}>
              <Image src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderScene(id as SceneId, position.diagram, "paper"))}`} width={SCENE_WIDTH} height={SCENE_HEIGHT} unoptimized alt={guides[id]?.descriptions?.[position.diagram][lang] ?? `${legacyPick(lesson, "title", lang)}: ${guides[id]?.states[position.diagram][lang] ?? `${[0, 90, 180][position.diagram]}°`}`} />
              <div className={styles.diagramControls} role="group" aria-label={legacyPick(lesson, "title", lang)}>
                {([0, 1, 2] as const).map(diagram => <button key={diagram} disabled={state.readError || state.saveError} aria-pressed={position.diagram === diagram} onClick={() => state.write(previous => ({ ...previous, positions: { ...previous.positions, [id]: { step: "understand", diagram } } }))}>{guides[id]?.states[diagram][lang] ?? `${[0, 90, 180][diagram]}°`}</button>)}
              </div>
              <figcaption>{guides[id]?.notes[position.diagram][lang] ?? legacyPick(lesson, "focus", lang)}</figcaption>
            </figure> : null;
  const checked = passedFoundationIds(state.progress);
  return <div className={styles.page}>
    <header className={styles.header}>
      <h1>{copy.title[lang]}</h1>
      <p>{copy.intro[lang]}</p>
      <div className={styles.metrics} aria-live="polite">
        <span>{copy.viewed[lang]}: {state.ready ? state.visited.length : "..."}/8</span>
        <span>{copy.checked[lang]}: {state.ready ? checked.length : "..."}/8</span>
      </div>
      <p className={styles.secondary}>{copy.progressNote[lang]}</p>
      <a className={styles.outlineLink} href="#foundation-outline">{foundationCopy.outline[lang]} ↓</a>
    </header>
    {state.readError && <div className={styles.error} role="alert"><p>{copy.readError[lang]}</p><button onClick={state.retry}>{foundationCopy.retry[lang]}</button></div>}
    {state.saveError && <div className={styles.error} role="alert"><p>{foundationCopy.savedError[lang]}</p><button onClick={state.retry}>{foundationCopy.retry[lang]}</button></div>}
    <div className={styles.layout}>
      <nav id="foundation-outline" className={styles.outline} aria-label={foundationCopy.outline[lang]}>
        <h2>{foundationCopy.outline[lang]}</h2>
        {foundationModules.map(module => <div key={module.id} className={styles.module}>
          <h3>{module.title[lang]}</h3>
          {module.lessons.map(lessonId => {
            const item = bootcampLessons.find(entry => entry.id === lessonId)!;
            return <button key={item.id} type="button" disabled={!state.ready || state.readError || state.saveError} onClick={() => navigate(item.id, state.display.positions[item.id]?.step)} aria-current={id === item.id ? "step" : undefined}>
              <span>{item.order}. {legacyPick(item, "title", lang)}</span>
              {checked.includes(item.id) ? <small className={styles.success}>✓ {copy.passed[lang]}</small> : state.visited.includes(item.id) ? <small>{copy.viewed[lang]}</small> : null}
            </button>;
          })}
        </div>)}
      </nav>
      <section id="foundation-lesson" tabIndex={-1} className={styles.lesson} aria-labelledby="lesson-title" aria-busy={!state.ready}>
        <p className={styles.secondary}>{lesson.order}/8</p>
        <h2 id="lesson-title">{legacyPick(lesson, "title", lang)}</h2>
        <p>{legacyPick(lesson, "summary", lang)}</p>
        {!state.ready ? <p role="status">{copy.loading[lang]}</p> : <>
          <div className={styles.steps} role="group" aria-label={legacyPick(lesson, "title", lang)}>
            {foundationSteps.map((value, index) => <button key={value} disabled={state.readError || state.saveError} onClick={() => navigate(id, value)} aria-pressed={step === value}>{index + 1}. {foundationCopy[value][lang]}</button>)}
          </div>
          {step === "understand" && <>
            <h3>{copy.goal[lang]}</h3>
            <p>{guides[id]?.goal[lang] ?? legacyPick(lesson, "summary", lang)}</p>
            {guides[id]?.situation && <p>{guides[id].situation[lang]}</p>}
            {id === "how-sail-works" ? <SailShapeIllustration copy={shapeCopy} lang={lang}>{lessonDiagram}</SailShapeIllustration> : lessonDiagram}

            {guides[id] && <>
              <ul className={styles.legend}>{guides[id].legend.map((label, index) => <li key={index}>{label[lang]}</li>)}</ul>
              {guides[id].explanation && <><h3>{lessonCopy.explanation[lang]}</h3>{guides[id].explanation.map((paragraph, index) => <p key={index}>{paragraph[lang]}</p>)}</>}
              <h3>{copy.mistake[lang]}</h3><p>{guides[id].mistake[lang]}</p>
              <h3>{copy.limit[lang]}</h3><p className={styles.secondary}>{guides[id].limit[lang]}</p>
            </>}
            <button className={styles.primary} disabled={state.readError || state.saveError} onClick={() => navigate(id, "check")}>{foundationCopy.check[lang]} →</button>
          </>}
          {step === "check" && <LessonCheck key={id} lesson={lesson} state={state} />}
          {step === "practice" && <>
            <h3>{foundationCopy.practice[lang]}</h3>
            <p>{legacyPick(lesson, "focus", lang)}</p>
            <p className={styles.secondary}>{copy.practiceNote[lang]}</p>
            {state.progress.practiceOpened.includes(id) && <p>{copy.opened[lang]}</p>}
            <Link className={styles.primary} href={foundationPracticeHref(id)} onClick={event => {
              if (state.readError || state.saveError || !state.write(previous => ({ ...previous, current: id, practiceOpened: [...new Set([...previous.practiceOpened, id])], positions: { ...previous.positions, [id]: { ...position, step: "practice" } } }))) event.preventDefault();
            }}>{id === "wind-direction" ? windDirectionPractice.title[lang] : copy.openPractice[lang]} →</Link>
            {lesson.order < bootcampLessons.length && <button className={styles.next} disabled={state.readError || state.saveError} onClick={() => navigate(bootcampLessons[lesson.order].id)}>{foundationCopy.next[lang]} →</button>}
          </>}
        </>}
      </section>
    </div>
    {state.legacyVisits > 0 && <p className={styles.secondary}>{copy.legacy[lang]}</p>}
    <footer className={styles.links}>
      {["quick", "onboard", "checklist", "glossary"].map(item => {
        const destination = destinations.find(entry => entry.id === item)!;
        return <Link key={item} href={destination.web!}>{destination.title[lang]} →</Link>;
      })}

    </footer>
  </div>;
}

function LessonCheck({ lesson, state }: { lesson: BootcampLesson; state: ReturnType<typeof useFoundationProgress> }) {
  const { lang } = useI18n();
  const questions = getQuizForLesson(lesson.id);
  const [answers, setAnswers] = useState<FoundationAnswers>(state.display.drafts[lesson.id] ?? state.display.checks[lesson.id]?.answers ?? {});
  const [revealed, setRevealed] = useState(Boolean(state.display.checks[lesson.id]));
  const allAnswered = questions.every(question => Boolean(answers[question.id]));
  const score = questions.filter(question => question.options.some(option => option.id === answers[question.id] && option.correct)).length;
  const savedResult = theoryResult(state.progress, lesson.id);
  return <form onSubmit={event => { event.preventDefault(); if (!allAnswered || state.readError) return; state.write(previous => updateFoundationCheck(previous, lesson.id, answers)); setRevealed(true); }}>
    <p className={styles.secondary}>{copy.threshold[lang]}</p>
    {savedResult.answered && <p className={savedResult.passed ? styles.success : styles.secondary}>{savedResult.passed ? `✓ ${copy.passed[lang]}` : copy.notChecked[lang]}</p>}
    {questions.map((question, index) => <fieldset className={styles.question} key={question.id}>
      <legend>{index + 1}. {pickPrompt(question.prompt, lang)}</legend>
      {question.options.map(option => <label key={option.id} className={styles.option}>
        <input type="radio" name={question.id} value={option.id} checked={answers[question.id] === option.id} disabled={state.readError || state.saveError} onChange={() => { const next = { ...answers, [question.id]: option.id }; setAnswers(next); setRevealed(false); state.write(previous => updateFoundationDraft(previous, lesson.id, next)); }} />
        <span>{pickPrompt(option.label, lang)}</span>
      </label>)}
      {revealed && <p className={styles.explanation}><strong>{question.options.some(option => option.id === answers[question.id] && option.correct) ? copy.correct[lang] : copy.incorrect[lang]}.</strong> {pickPrompt(question.explanation, lang)}</p>}
    </fieldset>)}
    <button className={styles.primary} type="submit" disabled={!allAnswered || state.readError || state.saveError}>{copy.submit[lang]}</button>
    {revealed && <div role="status" className={styles.result}><p>{copy.result[lang]}: {score}/{questions.length}. {isQuizPassed(score, questions.length) ? copy.passed[lang] : copy.notChecked[lang]}</p></div>}
  </form>;
}
