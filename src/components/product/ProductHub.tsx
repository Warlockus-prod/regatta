'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { destinations, sections } from "@/lib/product/catalog";
import { copy } from "@/lib/product/copy";
import { SCENE_STILL_SIZE, SCENE_STILL_WEB, homeEntryCopy } from "@/lib/product/home-entry";
import { raceHubCopy, raceSetupSummary } from "@/lib/product/race-hub";
import { DEFAULT_LAST_RACE_SETUP, raceSetupHref, readLastRaceSetup, type LastRaceSetup } from "@/lib/race-last-setup";
import { RACE_MODE_LABELS } from "@/app/game/race-mode-labels";
import styles from "./Product.module.css";

/** The race mode row the race page keeps (src/app/game/race-prefs.ts RACE_MODE_KEY). */
const RACE_MODE_KEY = "regatta.race.mode.v1";

export default function ProductHub({ section }: { section: "learn" | "practice" | "race" }) {
  const { lang } = useI18n();
  const current = sections.find(s => s.id === section)!;
  // Package 9 (audit B10): the Race hub plays the solo race itself, so it is not a row.
  const visible = destinations.filter(d => d.section === section && d.web && !(section === "race" && d.id === "solo"));
  const groups = section === "learn" ? [
      { id: "sailing", title: copy.sailing[lang], entries: visible.filter(d => !d.certificate) },
      { id: "exam", title: copy.exam[lang], entries: visible.filter(d => d.certificate) },
    ] : [{ id: section, title: "", entries: visible }];
  return <div className={styles.page}>
    <header className={styles.header}>
      <h1 className={styles.title}>{current.title[lang]}</h1>
      <p className={styles.intro}>{current.description[lang]}</p>
    </header>
    {section === "race" && <RacePlay lang={lang} />}
    <div className={section === "learn" ? styles.groupsGrid : undefined}>
      {groups.filter(g => g.entries.length).map(group => <section key={group.id} className={styles.section}>
        {group.title && <h2 className={styles.sectionTitle}>{group.title}</h2>}
        <div className={styles.list}>{group.entries.map((entry, index) => <Link className={styles.row} key={entry.id} href={entry.web!}>
          {section === "practice" && <span aria-hidden="true" className={styles.number}>{String(index + 1).padStart(2, "0")}</span>}
          <div><strong>{entry.title[lang]}</strong>{entry.detail && <p className={styles.description}>{entry.detail[lang]}</p>}</div>
          <span className={styles.arrow} aria-hidden="true">→</span>
        </Link>)}</div>
      </section>)}
      {!visible.length && <p className={styles.description}>{copy.empty[lang]}</p>}
    </div>
  </div>;
}

/**
 * One "Play" with the last used settings (they are named under it), the
 * choices behind "Change" (the race lobby, filled in with the same setup), and
 * a frame of the real race scene instead of a bay photo.
 */
function RacePlay({ lang }: { lang: keyof typeof RACE_MODE_LABELS.simple }) {
  const [setup, setSetup] = useState<LastRaceSetup>(DEFAULT_LAST_RACE_SETUP);
  const [mode, setMode] = useState<"simple" | "pro">("simple");
  useEffect(() => {
    const timer = setTimeout(() => {
      let storage: Storage | null = null;
      try { storage = localStorage; } catch { /* blocked storage: the first race */ }
      setSetup(readLastRaceSetup(storage));
      try { setMode(storage?.getItem(RACE_MODE_KEY) === "pro" ? "pro" : "simple"); } catch { /* simple */ }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  return <section className={styles.play} aria-labelledby="race-play-summary">
    <figure className={styles.playScene}>
      {/* eslint-disable-next-line @next/next/no-img-element -- one local still of the race scene */}
      <img src={SCENE_STILL_WEB} width={SCENE_STILL_SIZE.width} height={SCENE_STILL_SIZE.height} alt={homeEntryCopy.sceneAlt[lang]} decoding="async" />
    </figure>
    <div className={styles.playActions}>
      <p className={styles.playSummary} id="race-play-summary" data-testid="race-play-summary">{raceSetupSummary(setup, lang)} · {RACE_MODE_LABELS[mode][lang]}</p>
      <Link className={styles.primary} data-action="primary" href={raceSetupHref(setup, true)}>{raceHubCopy.play[lang]}<span aria-hidden="true">→</span></Link>
      <Link className={styles.secondary} href={raceSetupHref(setup, false)}>{raceHubCopy.change[lang]}</Link>
    </div>
  </section>;
}
