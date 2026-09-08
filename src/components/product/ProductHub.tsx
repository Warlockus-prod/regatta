'use client';

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { destinations, searchDestinations, sections, type Section } from "@/lib/product/catalog";
import { copy } from "@/lib/product/copy";
import styles from "./Product.module.css";

export default function ProductHub({ section }: { section: Exclude<Section, "home"> }) {
  const { lang } = useI18n();
  const [query, setQuery] = useState("");
  const current = sections.find(s => s.id === section)!;
  const visible = section === "library" ? searchDestinations(query, lang, "web") : destinations.filter(d => d.section === section && d.web);
  const groups = section === "library" ? sections.filter(s => s.id !== "home").map(s => ({ id: s.id, title: s.title[lang], entries: visible.filter(d => d.section === s.id) }))
    : section === "learn" ? [
      { id: "sailing", title: copy.sailing[lang], entries: visible.filter(d => !d.certificate) },
      { id: "exam", title: copy.exam[lang], entries: visible.filter(d => d.certificate) },
    ] : [{ id: section, title: "", entries: visible }];
  return <div className={styles.page}>
    <header className={styles.header}>
      <h1 className={styles.title}>{current.title[lang]}</h1>
      <p className={styles.intro}>{current.description[lang]}</p>
    </header>
    {section === "library" && <div role="search" className={styles.search}>
      <label className="sr-only" htmlFor="section-search">{copy.search[lang]}</label>
      <input id="section-search" type="search" autoComplete="off" placeholder={copy.hint[lang]} value={query} onChange={e => setQuery(e.target.value)} />
      {query && <button className={styles.secondary} onClick={() => setQuery("")}>{copy.clear[lang]}</button>}
    </div>}
    <div className={section === "library" || section === "learn" ? styles.groupsGrid : undefined} aria-live={section === "library" ? "polite" : undefined}>
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
