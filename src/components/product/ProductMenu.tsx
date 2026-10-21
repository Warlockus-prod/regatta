'use client';

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { copy } from "@/lib/product/copy";
import { menuCopy, menuGroups } from "@/lib/product/menu";
import ThemeToggle from "../ThemeToggle";
import styles from "./Product.module.css";

/** Web directory: addressable page, keyboard search, columns on a wide screen. */
export default function ProductMenu() {
  const { lang } = useI18n();
  const [query, setQuery] = useState("");
  const groups = menuGroups(query, lang, "web");
  return <div className={styles.page}>
    <header className={styles.header}>
      <h1 className={styles.title}>{copy.menu[lang]}</h1>
      <p className={styles.intro}>{copy.allSections[lang]}. {copy.menuIntro[lang]}</p>
    </header>
    <div role="search" className={styles.search}>
      <label className="sr-only" htmlFor="menu-search">{copy.search[lang]}</label>
      <input id="menu-search" type="search" autoComplete="off" placeholder={copy.hint[lang]} value={query} onChange={e => setQuery(e.target.value)} />
      {query && <button className={styles.secondary} type="button" onClick={() => setQuery("")}>{copy.clear[lang]}</button>}
    </div>
    <div className={styles.groupsGrid} aria-live="polite">
      {groups.map(group => <section key={group.id} className={styles.section}>
        <h2 className={styles.sectionTitle}>{group.title[lang]}</h2>
        <div className={styles.list}>{group.entries.map(entry => <Link key={entry.id} href={entry.web!} className={`${styles.row} ${styles.menuRow}`}><strong>{entry.title[lang]}</strong><span aria-hidden="true" className={styles.arrow}>→</span></Link>)}</div>
      </section>)}
      {!groups.length && <p role="status" className={styles.description}>{copy.empty[lang]}</p>}
    </div>
    <div className={styles.menuAppearance}><span>{menuCopy.appearance[lang]}</span><ThemeToggle /></div>
  </div>;
}
