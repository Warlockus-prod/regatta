'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LanguageToggle from "./LanguageToggle";
import ThemeToggle from "./ThemeToggle";
import { useI18n } from "@/lib/i18n";
import { sectionForPath } from "@/lib/product/catalog";
import { menuEntry, navigationItemForSection, primarySections } from "@/lib/product/menu";
import { copy } from "@/lib/product/copy";
import { bookmarkForPath } from "@/lib/product/learning";
import { saveLearningBookmark } from "@/lib/product/learning-web";
import styles from "./product/Navigation.module.css";

export default function Navigation() {
  const pathname = usePathname();
  const { lang } = useI18n();
  const navRef = useRef<HTMLElement>(null);
  const [embed, setEmbed] = useState(false);
  useEffect(() => {
    const bookmark = bookmarkForPath(pathname, "web");
    if (bookmark) saveLearningBookmark(bookmark);
  }, [pathname]);
  useEffect(() => {
    // The native WebViews supply their own navigation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEmbed(new URLSearchParams(window.location.search).get("embed") === "1");
  }, [pathname]);
  useEffect(() => {
    const element = navRef.current;
    const update = () => document.documentElement.style.setProperty("--site-nav-h", `${element?.getBoundingClientRect().height ?? 0}px`);
    update();
    const observer = new ResizeObserver(update);
    if (element) observer.observe(element);
    return () => { observer.disconnect(); document.documentElement.style.removeProperty("--site-nav-h"); };
  }, [embed]);
  if (embed) return null;
  const selected = navigationItemForSection(sectionForPath(pathname, "web"));
  return <nav data-product-navigation ref={navRef} className={styles.nav} aria-label={copy.navigation[lang]}>
    <div className={styles.inner}>
      <Link href="/" className={styles.brand} aria-label="Regatta">
        <svg width="26" height="28" viewBox="0 0 26 28" fill="none" aria-hidden="true">
          <path d="M14 2v19H3L14 2ZM17 7l7 14h-7V7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
          <path d="M2 24c6 3 16 3 22 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg><span>Regatta</span>
      </Link>
      <div className={styles.links}>{primarySections.map(s => <Link key={s.id} href={s.web} aria-current={selected === s.id ? "page" : undefined} className={styles.link}>{s.title[lang]}</Link>)}</div>
      <div className={styles.tools}>
        <Link href={menuEntry.web} className={styles.menu} aria-label={copy.menu[lang]} title={copy.allSections[lang]} aria-current={selected === "menu" ? "page" : undefined}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>{copy.menu[lang]}
        </Link>
        <LanguageToggle />{pathname !== menuEntry.web && <span className={styles.theme}><ThemeToggle /></span>}
      </div>
    </div>
  </nav>;
}
