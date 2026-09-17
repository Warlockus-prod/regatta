'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "../../../lib/i18n";
import { destinations } from "../../../lib/product/catalog";
import { copy } from "../../../lib/product/copy";
import { findSailLesson, sailCourse, sailLessons } from "../../../data/sailing-lab/course";
import { checkSailTheory, emptySailProgress, nextSailLesson, readSailProgress, SAIL_PROGRESS_KEY, type SailProgress } from "../lessons/progress";
import { diagramCopy, diagramOptions, diagramReadout, sailDiagram } from "../lessons/diagrams";
import styles from "./SailingCourse.module.css";

export function SailingCourse({ lessonId }: { lessonId?: string }) {
  const { lang } = useI18n();
  const [progress, setProgress] = useState<SailProgress | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [selected, setSelected] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const lesson = lessonId ? findSailLesson(lessonId) : undefined;
  useEffect(() => {
    const timer = setTimeout(() => {
      try { setProgress(readSailProgress(localStorage.getItem(SAIL_PROGRESS_KEY))); }
      catch { setProgress(emptySailProgress()); setStorageError(true); }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const next = progress ? nextSailLesson(progress) : sailLessons[0];
  const persistCheck = () => {
    if (!lesson || !progress || answer === null) return;
    const updated = checkSailTheory(progress, lesson.id, answer);
    try { localStorage.setItem(SAIL_PROGRESS_KEY, JSON.stringify(updated)); setProgress(updated); setStorageError(false); }
    catch { setStorageError(true); }
  };
  if (lessonId && !lesson) return <article className={styles.page}><h1>{copy.empty[lang]}</h1><Link href="/learn/sails">{sailCourse.back[lang]}</Link></article>;
  if (!lesson) return <article className={styles.page}>
    <nav className={styles.breadcrumb}><Link href="/learn">{copy.sailing[lang]}</Link></nav>
    <h1>{sailCourse.title[lang]}</h1><p className={styles.lead}>{sailCourse.intro[lang]}</p>
    <p className={styles.note}>{sailCourse.scope[lang]}</p>
    <section className={styles.next}>
      <h2>{copy.next[lang]}</h2>
      <Link className={styles.primary} href={`/learn/sails/${(next ?? sailLessons[0]).id}`}>{next?.title[lang] ?? copy.overview[lang]} <span aria-hidden="true">→</span></Link>
      <p>{progress?.checked.length ?? 0}/{sailLessons.length} · {sailCourse.completed[lang]}</p>
    </section>
    <ol className={styles.lessons}>{sailLessons.map((item, index) => <li key={item.id}><Link href={`/learn/sails/${item.id}`}>
      <span className={styles.number}>{index + 1}</span><span><strong>{item.title[lang]}</strong><small>{item.minutes} {copy.minutes[lang]}{progress?.checked.includes(item.id) ? ` · ${sailCourse.completed[lang]}` : ""}</small></span><span aria-hidden="true">→</span>
    </Link></li>)}</ol>
  </article>;
  const index = sailLessons.findIndex(item => item.id === lesson.id);
  const destination = destinations.find(item => item.id === lesson.destination)!;
  const checked = progress?.checked.includes(lesson.id);
  return <article className={styles.page}>
    <nav className={styles.breadcrumb}><Link href="/learn/sails">← {sailCourse.back[lang]}</Link><span>{index + 1}/{sailLessons.length} · {lesson.minutes} {copy.minutes[lang]}</span></nav>
    <h1>{lesson.title[lang]}</h1>
    <figure className={styles.figure}>
      <div role="img" aria-label={diagramCopy[lesson.diagram][lang]} dangerouslySetInnerHTML={{ __html: sailDiagram(lesson.diagram, selected) }} />
      <figcaption>{diagramCopy[lesson.diagram][lang]}</figcaption>
      {diagramReadout(lesson.diagram, selected, lang) && <p aria-live="polite">{diagramReadout(lesson.diagram, selected, lang)}</p>}
      <div className={styles.controls}>{diagramOptions(lesson.diagram, lang).map(option => <button key={option.value} type="button" aria-pressed={selected === option.value} onClick={() => setSelected(option.value)}>{option.label}</button>)}</div>
      {lesson.diagram === "wind" && <p>{diagramCopy.windKeys.map((label, i) => `${i + 1}. ${label[lang]}`).join(" · ")}</p>}
    </figure>
    {lesson.sections.map((section, i) => <section className={styles.prose} key={i}><h2>{section.title[lang]}</h2><p>{section.body[lang]}</p></section>)}
    <section className={styles.check} aria-labelledby="theory-check">
      <h2 id="theory-check">{sailCourse.check[lang]}</h2><p>{lesson.question[lang]}</p>
      <div className={styles.answers}>{lesson.answers.map((option, i) => <button key={i} type="button" aria-pressed={answer === i} onClick={() => setAnswer(i)}>{option[lang]}</button>)}</div>
      {answer !== null && <div role="status"><strong>{answer === lesson.correct ? sailCourse.correct[lang] : sailCourse.retry[lang]}</strong><p>{lesson.explanation[lang]}</p></div>}
      {checked ? <p role="status">✓ {sailCourse.completed[lang]}</p> : <button type="button" className={styles.primary} disabled={!progress || answer !== lesson.correct} onClick={persistCheck}>{sailCourse.finish[lang]}</button>}
      {storageError && <p role="alert">{sailCourse.savedError[lang]}</p>}
    </section>
    <section className={styles.prose}><h2>{sailCourse.observe[lang]}</h2><p>{lesson.observe[lang]}</p><Link className={styles.secondary} href={`${destination.web!}${lesson.study ? `?study=${lesson.study}` : ""}`}>{destination.title[lang]} →</Link></section>
    <p className={styles.note}>{sailCourse.safety[lang]}</p>
    <details className={styles.sources}><summary>{sailCourse.sources[lang]}</summary>{lesson.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>)}</details>
    <footer className={styles.breadcrumb}><Link href="/learn/sails">{sailCourse.back[lang]}</Link>{sailLessons[index + 1] && <Link className={styles.secondary} href={`/learn/sails/${sailLessons[index + 1].id}`}>{sailCourse.next[lang]} →</Link>}</footer>
  </article>;
}
