'use client';

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { setCurrentLesson } from "@/lib/storage";
import { destinations } from "@/lib/product/catalog";
import { copy } from "@/lib/product/copy";
import { homeCopy, homeLearning, learningTracks, type LearningSnapshot } from "@/lib/product/learning";
import { readWebLearning } from "@/lib/product/learning-web";
import styles from "@/components/product/Home.module.css";

export default function Home() {
  const { lang } = useI18n();
  const [snapshot, setSnapshot] = useState<LearningSnapshot | null>(null);
  const [error, setError] = useState(false);
  const refresh = useCallback(() => {
    try { setSnapshot(readWebLearning()); setError(false); }
    catch { setSnapshot(null); setError(true); }
  }, []);
  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); window.removeEventListener("storage", refresh); };
  }, [refresh]);
  const next = snapshot ? homeLearning(snapshot, lang, "web") : null;
  const alternatives = learningTracks.filter(id => id !== next?.course.id);
  return <div className={styles.page}>
    <header className={styles.header}>
      <Image src="/design-v3/sailing-editorial.webp" alt="" fill priority sizes="(max-width: 800px) 100vw, 1084px" className={styles.heroImage} />
      <div className={styles.heroCopy}>
        <p className={styles.wordmark}>WEEK TO REGATTA</p>
        <h1>{homeCopy.title[lang]}</h1>
        <p>{homeCopy.intro[lang]}</p>
      </div>
    </header>
    <div className={styles.layout}>
      <section className={styles.resume} aria-labelledby="next-step" aria-busy={!snapshot && !error}>
        {next ? <>
          <p className={styles.eyebrow}>{next.course.title[lang]}{next.minutes ? ` · ${next.minutes} ${copy.minutes[lang]}` : ""}</p>
          <h2 id="next-step">{next.title}</h2>
          <p className={styles.detail}>{next.detail}</p>
          {next.total !== null && <div className={styles.progressBlock}>
            <div className={styles.progressLabel}><span>{next.metric}</span><span>{next.count}/{next.total}</span></div>
            <progress value={next.count!} max={next.total} aria-label={next.metric!} />
          </div>}
          <Link className={styles.primary} href={next.href} onClick={() => { if (next.course.id === "course" && next.lessonId) setCurrentLesson(next.lessonId); }}>
            {next.complete ? homeCopy.review[lang] : next.started ? copy.resume[lang] : copy.start[lang]}<span aria-hidden="true">→</span>
          </Link>
          {next.href !== next.overview && <Link className={styles.overview} href={next.overview}>{copy.overview[lang]}</Link>}
        </> : <div role={error ? "alert" : "status"} className={styles.placeholder}>
          <h2 id="next-step">{error ? homeCopy.unavailable[lang] : homeCopy.loading[lang]}</h2>
          {error && <button type="button" className={styles.overview} onClick={refresh}>{homeCopy.retry[lang]}</button>}
        </div>}
      </section>
      <section className={styles.courses} aria-labelledby="choose-course">
        <h2 id="choose-course">{homeCopy.choose[lang]}</h2>
        {alternatives.map(id => {
          const course = destinations.find(d => d.id === id)!;
          return <Link className={styles.course} href={course.web!} key={id}>
            <span><strong>{course.title[lang]}</strong><span className={styles.courseDetail}>{course.detail![lang]}</span></span><span aria-hidden="true">→</span>
          </Link>;
        })}
      </section>
    </div>
    <footer className={styles.footer}><span>{homeCopy.tools[lang]}</span><Link href="/menu">{copy.allSections[lang]} <span aria-hidden="true">→</span></Link></footer>
  </div>;
}
