"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { ExplLangToggle } from "../sternik/prefs";

export default function RadioSubnav() {
  const pathname = usePathname();
  const { tp } = useI18n();

  const primary = [
    { href: "/radio", label: tp("Карта курса", "Course map", "Mapa kursu") },
    { href: "/radio/teoria", label: tp("Теория", "Theory", "Teoria") },
    { href: "/radio/obsluga", label: tp("Управление", "Controls", "Obsluga") },
    { href: "/radio/symulator", label: tp("Симулятор", "Simulator", "Symulator") },
    { href: "/radio/test", label: tp("Экзамен", "Exam", "Egzamin") },
  ];
  const secondary = [
    { href: "/radio/rozmowa", label: tp("Живой разговор", "Live conversation", "Rozmowa na zywo") },
    { href: "/radio/pozycja", label: tp("Диктовка позиции", "Position dictation", "Dyktowanie pozycji") },
    { href: "/radio/zadania", label: tp("26 заданий UKE", "26 UKE tasks", "26 zadan UKE") },
    { href: "/radio/sciaga", label: tp("Шпаргалка", "Cheat sheet", "Sciaga") },
    { href: "/sternik", label: tp("Раздел шкипера", "Skipper section", "Dzial sternika") },
  ];
  const secondaryActive = secondary.some((item) => pathname === item.href);

  const linkStyle = (active: boolean) => active
    ? { background: "var(--accent-cyan)", color: "var(--accent-ink)" }
    : {
        background: "var(--bg-card)",
        color: "var(--text-secondary)",
        border: "1px solid var(--border-subtle)",
      };

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <nav className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1" aria-label="Radio">
        {primary.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? "page" : undefined}
            className="flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-xl px-4 text-sm font-semibold"
            style={linkStyle(pathname === item.href)}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <details className="group relative">
        <summary
          className="flex min-h-[44px] cursor-pointer list-none items-center rounded-xl px-4 text-sm font-semibold"
          style={linkStyle(secondaryActive)}
        >
          {tp("Еще", "More", "Wiecej")}
          <span className="ml-2 transition-transform group-open:rotate-180" aria-hidden>⌄</span>
        </summary>
        <nav
          aria-label={tp("Дополнительные разделы", "Additional sections", "Dodatkowe dzialy")}
          className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border p-2 shadow-xl"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)" }}
        >
          {secondary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className="flex min-h-[44px] items-center rounded-lg px-3 text-sm"
              style={{
                color: pathname === item.href ? "var(--accent-cyan)" : "var(--text-secondary)",
                background: pathname === item.href ? "var(--hover-bg)" : "transparent",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </details>

      <ExplLangToggle />
    </div>
  );
}
