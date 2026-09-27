'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

// ============================================================================
// The two Polish licence courses, surfaced in the theory section.
//
// They belong here because this is where somebody who wants a CERTIFICATE looks
// - and because /radio used to be reachable only through a link buried inside
// /sternik, so a visitor who came for the radio exam could not find it from the
// navigation at all.
//
// LANGUAGE. The course content is Polish and stays Polish: these are Polish
// state exams, and a half-translated licence course is worse than none. What
// changes with the site language is only the FRAMING around them - and on the
// Russian version, the courses themselves offer optional Russian commentary
// (see SternikLangScope / ExplLangToggle). Every other language gets the courses
// in Polish, with no Russian anywhere.
// ============================================================================

interface Course {
  href: string;
  icon: string;
  /** the Polish name of the licence - never translated, it is what it is called */
  name: string;
  blurb: string;
  bullets: string[];
}

export default function CoursesSection() {
  const { tp, lang } = useI18n();

  const courses: Course[] = [
    {
      href: '/sternik',
      icon: '⚓',
      name: 'Sternik motorowodny',
      blurb: tp(
        'Польские права на моторную лодку. Теория, банк из 879 вопросов, пробный экзамен.',
        'The Polish powerboat licence. Theory, an 879-question bank, and a mock exam.',
        'Patent sternika motorowodnego. Teoria, baza 879 pytań, egzamin próbny.',
        {
          es: 'La licencia polaca de patrón de motor. Teoría, banco de 879 preguntas y examen de prueba.',
          fr: 'Le permis bateau polonais. Théorie, banque de 879 questions et examen blanc.',
          de: 'Der polnische Motorbootführerschein. Theorie, 879 Prüfungsfragen, Probeprüfung.',
          it: "La patente nautica polacca per barche a motore. Teoria, 879 domande e simulazione d'esame.",
        },
      ),
      bullets: [
        tp('Теория по разделам', 'Theory by topic', 'Teoria według działów', { es: 'Teoría por temas', fr: 'Théorie par thèmes', de: 'Theorie nach Themen', it: 'Teoria per argomenti' }),
        tp('879 вопросов', '879 questions', '879 pytań', { es: '879 preguntas', fr: '879 questions', de: '879 Fragen', it: '879 domande' }),
        tp('Пробный экзамен', 'Mock exam', 'Egzamin próbny', { es: 'Examen de prueba', fr: 'Examen blanc', de: 'Probeprüfung', it: "Simulazione d'esame" }),
      ],
    },
    {
      href: '/radio',
      icon: '📻',
      name: 'Radio SRC (VHF / DSC)',
      blurb: tp(
        'Свидетельство оператора SRC: экзамен в UKE. Симулятор настоящей ICOM, 26 практических заданий, голосовая тренировка.',
        'The SRC operator certificate, examined by UKE. A simulator of the real ICOM, all 26 practical tasks, and voice practice.',
        'Świadectwo operatora SRC: egzamin w UKE. Symulator prawdziwego ICOM-a, 26 zadań praktycznych i trening głosowy.',
        {
          es: 'El certificado de operador SRC, con examen en la UKE. Un simulador del ICOM real, las 26 tareas prácticas y práctica de voz.',
          fr: "Le certificat d'opérateur SRC, avec examen à l'UKE. Un simulateur du vrai ICOM, les 26 exercices pratiques et un entraînement vocal.",
          de: 'Das SRC-Funkzeugnis, Prüfung beim UKE. Ein Simulator des echten ICOM, alle 26 Praxisaufgaben und Sprechtraining.',
          it: "Il certificato di operatore SRC, con esame all'UKE. Un simulatore del vero ICOM, tutti i 26 esercizi pratici e allenamento vocale.",
        },
      ),
      bullets: [
        tp('Симулятор ICOM', 'ICOM simulator', 'Symulator ICOM', { es: 'Simulador ICOM', fr: 'Simulateur ICOM', de: 'ICOM-Simulator', it: 'Simulatore ICOM' }),
        tp('26 заданий UKE', 'All 26 UKE tasks', '26 zadań UKE', { es: 'Las 26 tareas UKE', fr: 'Les 26 exercices UKE', de: 'Alle 26 UKE-Aufgaben', it: 'Tutti i 26 esercizi UKE' }),
        tp('Голос и разбор', 'Voice and review', 'Głos i omówienie', { es: 'Voz y revisión', fr: 'Voix et correction', de: 'Sprechen und Auswertung', it: 'Voce e revisione' }),
      ],
    },
  ];

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center gap-3">
        <div
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{ background: 'rgba(0, 212, 255, 0.12)', border: '1px solid rgba(0, 212, 255, 0.28)', color: 'var(--accent-cyan)' }}
        >
          🎓 {tp('Курсы', 'Courses', 'Kursy', { es: 'Cursos', fr: 'Cours', de: 'Kurse', it: 'Corsi' })}
        </div>
        <h2 className="text-base font-semibold sm:text-lg">
          {tp(
            'Польские патенты: sternik motorowodny и radio SRC',
            'Polish licences: sternik motorowodny and SRC radio',
            'Polskie patenty: sternik motorowodny i radio SRC',
            {
              es: 'Títulos polacos: sternik motorowodny y radio SRC',
              fr: 'Permis polonais : sternik motorowodny et radio SRC',
              de: 'Polnische Scheine: sternik motorowodny und SRC-Funk',
              it: 'Patenti polacche: sternik motorowodny e radio SRC',
            },
          )}
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {courses.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="card group flex flex-col p-4 transition-all sm:p-5"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{c.icon}</span>
              <div className="min-w-0">
                <div className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{c.name}</div>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{c.blurb}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.bullets.map((b) => (
                <span
                  key={b}
                  className="rounded-full px-2 py-1 text-[11px]"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                >
                  {b}
                </span>
              ))}
            </div>

            <span className="mt-3 text-sm font-semibold" style={{ color: 'var(--accent-cyan)' }}>
              {tp('Открыть', 'Open', 'Otwórz', { es: 'Abrir', fr: 'Ouvrir', de: 'Öffnen', it: 'Apri' })} {'->'}
            </span>
          </Link>
        ))}
      </div>

      {/* The language rule, stated where the reader meets the courses rather than
          discovered by surprise inside them. */}
      <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {lang === 'ru'
          ? 'Оба курса ведутся на польском - это язык экзамена, и переводить его наполовину было бы хуже, чем не переводить вовсе. Внутри курса можно дополнительно включить русские комментарии: кнопка 💬 в подменю раздела.'
          : tp(
              '',
              'Both courses are taught in Polish - it is the language of the exam, and a half-translated licence course would be worse than none.',
              'Oba kursy są po polsku - to język egzaminu.',
              {
                es: 'Ambos cursos son en polaco: es el idioma del examen, y un curso a medio traducir sería peor que ninguno.',
                fr: "Les deux cours sont en polonais : c'est la langue de l'examen, et un cours à moitié traduit serait pire que rien.",
                de: 'Beide Kurse sind auf Polnisch - das ist die Prüfungssprache; ein halb übersetzter Kurs wäre schlechter als keiner.',
                it: "Entrambi i corsi sono in polacco: è la lingua dell'esame, e un corso tradotto a metà sarebbe peggio di nessuno.",
              },
            )}
      </p>
    </section>
  );
}
