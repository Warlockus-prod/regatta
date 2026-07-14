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
        'Польские права на моторную лодку. Теория, банк из 148 вопросов, пробный экзамен.',
        'The Polish powerboat licence. Theory, a 148-question bank, and a mock exam.',
        'Patent na lodz motorowa. Teoria, bank 148 pytan, egzamin probny.',
        {
          es: 'La licencia polaca de motora. Teoria, banco de 148 preguntas y examen de prueba.',
          fr: 'Le permis bateau polonais. Theorie, banque de 148 questions et examen blanc.',
          de: 'Der polnische Motorbootfuehrerschein. Theorie, 148 Pruefungsfragen, Probepruefung.',
          it: 'La patente nautica polacca. Teoria, banca di 148 domande ed esame di prova.',
        },
      ),
      bullets: [
        tp('Теория по разделам', 'Theory by topic', 'Teoria wedlug dzialow', { es: 'Teoria por temas', fr: 'Theorie par themes', de: 'Theorie nach Themen', it: 'Teoria per argomenti' }),
        tp('148 вопросов', '148 questions', '148 pytan', { es: '148 preguntas', fr: '148 questions', de: '148 Fragen', it: '148 domande' }),
        tp('Пробный экзамен', 'Mock exam', 'Egzamin probny', { es: 'Examen de prueba', fr: 'Examen blanc', de: 'Probepruefung', it: 'Esame di prova' }),
      ],
    },
    {
      href: '/radio',
      icon: '📻',
      name: 'Radio SRC (VHF / DSC)',
      blurb: tp(
        'Свидетельство оператора SRC: экзамен в UKE. Симулятор настоящей ICOM, 26 практических заданий, голосовая тренировка.',
        'The SRC operator certificate, examined by UKE. A simulator of the real ICOM, all 26 practical tasks, and voice practice.',
        'Swiadectwo operatora SRC: egzamin w UKE. Symulator prawdziwego ICOM, 26 zadan praktycznych i trening glosowy.',
        {
          es: 'El certificado de operador SRC, examinado por UKE. Un simulador del ICOM real, las 26 tareas practicas y practica de voz.',
          fr: 'Le certificat d\'operateur SRC, examine par UKE. Un simulateur du vrai ICOM, les 26 taches pratiques et un entrainement vocal.',
          de: 'Das SRC-Betriebszeugnis, geprueft von UKE. Ein Simulator des echten ICOM, alle 26 Praxisaufgaben und Sprechtraining.',
          it: 'Il certificato di operatore SRC, esaminato da UKE. Un simulatore del vero ICOM, tutti i 26 compiti pratici e pratica vocale.',
        },
      ),
      bullets: [
        tp('Симулятор ICOM', 'ICOM simulator', 'Symulator ICOM', { es: 'Simulador ICOM', fr: 'Simulateur ICOM', de: 'ICOM-Simulator', it: 'Simulatore ICOM' }),
        tp('26 заданий UKE', 'All 26 UKE tasks', '26 zadan UKE', { es: 'Las 26 tareas UKE', fr: 'Les 26 taches UKE', de: 'Alle 26 UKE-Aufgaben', it: 'Tutti i 26 compiti UKE' }),
        tp('Голос и разбор', 'Voice and inspect', 'Glos i rozbior', { es: 'Voz e inspeccion', fr: 'Voix et inspection', de: 'Sprache und Inspektion', it: 'Voce e ispezione' }),
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
            'Patenty PL: sternik motorowodny i radio SRC',
            {
              es: 'Titulos polacos: sternik motorowodny y radio SRC',
              fr: 'Permis polonais: sternik motorowodny et radio SRC',
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
              {tp('Открыть', 'Open', 'Otworz', { es: 'Abrir', fr: 'Ouvrir', de: 'Oeffnen', it: 'Apri' })} {'->'}
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
              'Oba kursy sa po polsku - to jezyk egzaminu.',
              {
                es: 'Ambos cursos son en polaco: es el idioma del examen, y un curso a medio traducir seria peor que ninguno.',
                fr: 'Les deux cours sont en polonais: c\'est la langue de l\'examen, et un cours a moitie traduit serait pire que rien.',
                de: 'Beide Kurse sind auf Polnisch - das ist die Pruefungssprache; ein halb uebersetzter Kurs waere schlechter als keiner.',
                it: 'Entrambi i corsi sono in polacco: e la lingua dell\'esame, e un corso tradotto a meta sarebbe peggio di nessuno.',
              },
            )}
      </p>
    </section>
  );
}
