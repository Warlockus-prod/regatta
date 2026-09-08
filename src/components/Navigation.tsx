'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LanguageToggle from "./LanguageToggle";
import ThemeToggle from "./ThemeToggle";
import { useI18n } from "@/lib/i18n";
import { sectionForPath, sections } from "@/lib/product/catalog";
import { copy } from "@/lib/product/copy";
import styles from "./product/Navigation.module.css";

export default function Navigation() {
  const pathname = usePathname();
  const { lang } = useI18n();
  const navRef = useRef<HTMLElement>(null);
  const [embed, setEmbed] = useState(false);
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
  const selected = sectionForPath(pathname, "web");
  return <nav data-product-navigation ref={navRef} className={styles.nav} aria-label={copy.navigation[lang]}>
    <div className={styles.inner}>
      <Link href="/" className={styles.brand} aria-label="Regatta">
        <svg width="26" height="28" viewBox="0 0 26 28" fill="none" aria-hidden="true">
          <path d="M14 2v19H3L14 2ZM17 7l7 14h-7V7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
          <path d="M2 24c6 3 16 3 22 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg><span>Regatta</span>
      </Link>
      <div className={styles.links}>{sections.map(s => <Link key={s.id} href={s.web} aria-current={selected === s.id ? "page" : undefined} className={styles.link}>{s.title[lang]}</Link>)}</div>
      <div className={styles.tools}><LanguageToggle /><ThemeToggle /></div>
    </div>
  </nav>;
}
