'use client';

import { useRadioI18n } from "@/app/radio/localization/context";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTrainerI18n } from "./symulator/trainerText";

// Four tabs (owner, 2026-10-24: "too many tabs"). The practice pages that used
// to be tabs or sat behind "More" (controls lessons, live conversation,
// position dictation, the 26 UKE tasks) are rows of the Practice list on
// /radio/symulator; the cheat sheet belongs to Theory. Their addresses stay.
export default function RadioSubnav() {
  const { rt: radioText } = useRadioI18n();
  const pathname = usePathname();
  const { tp } = useTrainerI18n();

  const tabs = [
    { href: "/radio", label: tp("Курс", "Course", "Kurs"), match: ["/radio"] },
    { href: "/radio/teoria", label: tp("Теория", "Theory", "Teoria"), match: ["/radio/teoria", "/radio/sciaga"] },
    {
      href: "/radio/symulator",
      label: tp("Практика", "Practice", "Trening"),
      match: ["/radio/symulator", "/radio/obsluga", "/radio/rozmowa", "/radio/pozycja", "/radio/zadania"],
    },
    { href: "/radio/test", label: tp("Экзамен", "Exam", "Egzamin"), match: ["/radio/test"] },
  ];

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <nav className="flex w-full min-w-0 gap-1.5 sm:w-auto sm:flex-1" aria-label={radioText("Radio")}>
        {tabs.map((item) => {
          const active = item.match.includes(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="flex min-h-[44px] min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-xl px-2 text-sm font-semibold sm:flex-none sm:px-4"
              style={active
                ? { background: "var(--accent-cyan)", color: "var(--accent-ink)" }
                : {
                    background: "var(--bg-card)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-subtle)",
                  }}
            >
              {radioText(item.label)}
            </Link>
          );
        })}
      </nav>

    </div>
  );
}
