'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { legacyPick, legacyPickArray } from '@/lib/languages';
import ContentFooterNav from '@/components/ContentFooterNav';
import { checklistSections } from '@/data/checklist';

// ============================================================================
// CHECKLIST (/checklist) - reference page for beginners stepping on a yacht.
//
// Per user request (2026-04-20): this is NOT an interactive checkbox form
// anymore. It's a reading reference: sections with practical advice on what
// to do, who to listen to, what's on the boat, what to bring. Same aesthetic
// as /onboard - all sections open by default so the first scroll is the full
// picture.
//
// Content owner: this is the single page a first-time regatta crew member
// should read once before they step on the boat. It does not try to make
// them a sailor, it tries to make them useful and not in the way.
//
// Section data lives in src/data/checklist.ts (full 7-language coverage).
// ============================================================================

export default function ChecklistPage() {
  const { lang, tp } = useI18n();

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-medium"
             style={{ background: 'rgba(255, 170, 0, 0.1)', border: '1px solid rgba(255, 170, 0, 0.25)', color: 'var(--warning)' }}>
          ⚓ {tp('Готовимся к регате', 'Getting ready for a regatta', 'Przygotowania do regat',
            { es: 'Preparando la regata', fr: 'On prépare la régate', de: 'Vorbereitung auf die Regatta', it: 'Prepariamo la regata' })}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {tp(
            'Что взять и как вести себя на яхте',
            'What to pack and how to behave on a yacht',
            'Co zabrać i jak się zachowywać na jachcie',
            {
              es: 'Qué llevar y cómo comportarte en un velero',
              fr: 'Quoi emporter et comment se comporter sur un voilier',
              de: 'Was du mitnimmst und wie du dich auf einer Yacht verhältst',
              it: 'Cosa portare e come comportarsi su una barca a vela',
            },
          )}
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          {tp(
            'Это одна страница, которую новичку стоит прочитать ДО того как он впервые встанет на палубу. Не учит как управлять яхтой - учит не мешать, быть полезным и не пораниться.',
            'One page a first-timer should read BEFORE stepping on deck. It does not teach you to sail: it teaches you to stay out of the way, be useful and not get hurt.',
            'Jedna strona, którą początkujący powinien przeczytać, ZANIM pierwszy raz wejdzie na pokład. Nie uczy prowadzenia jachtu, tylko tego, jak nie przeszkadzać, być pomocnym i nie zrobić sobie krzywdy.',
            {
              es: 'Una página que todo principiante debería leer ANTES de pisar la cubierta por primera vez. No enseña a gobernar un barco: enseña a no estorbar, a ser útil y a no hacerte daño.',
              fr: 'Une page qu\'un débutant devrait lire AVANT de mettre le pied sur le pont pour la première fois. Elle n\'apprend pas à mener un voilier, mais à ne pas gêner, à être utile et à ne pas se blesser.',
              de: 'Eine Seite, die jeder Neuling lesen sollte, BEVOR er zum ersten Mal an Deck geht. Sie bringt dir nicht das Segeln bei, sondern wie du nicht im Weg stehst, nützlich bist und dich nicht verletzt.',
              it: 'Una pagina che un principiante dovrebbe leggere PRIMA di mettere piede in coperta per la prima volta. Non insegna a condurre la barca: insegna a non intralciare, a essere utile e a non farsi male.',
            },
          )}
        </p>
      </div>

      <div className="space-y-4">
        {checklistSections.map((section) => {
          const title = legacyPick(section, 'title', lang);
          const intro = legacyPick(section, 'intro', lang);
          const items = legacyPickArray(section, 'items', lang);
          const warning = legacyPick(section, 'warning', lang);
          return (
            <section key={section.id} id={section.id} className="card p-4 sm:p-5 scroll-mt-24">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl shrink-0">{section.icon}</span>
                <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
              </div>
              {intro && (
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
                  {intro}
                </p>
              )}
              <ul className="space-y-2">
                {items.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span className="text-[var(--accent-cyan)] mt-0.5 shrink-0">•</span>
                    <span className="text-[var(--text-primary)]">{item}</span>
                  </li>
                ))}
              </ul>
              {warning && (
                <div className="mt-3 p-3 rounded-lg text-sm leading-relaxed"
                     style={{ background: 'rgba(255, 82, 82, 0.08)', border: '1px solid rgba(255, 82, 82, 0.25)' }}>
                  <span className="font-semibold" style={{ color: 'var(--danger)' }}>
                    ⚠️ {tp('Важно', 'Important', 'Ważne',
                      { es: 'Importante', fr: 'Important', de: 'Wichtig', it: 'Importante' })}:
                  </span>{' '}
                  <span className="text-[var(--text-primary)]">{warning}</span>
                </div>
              )}
              {section.id === 'maneuvers' && (
                <Link
                  href="/courses#turns"
                  className="inline-block mt-3 text-sm underline"
                  style={{ color: 'var(--accent-cyan)' }}
                >
                  {tp('Порядок для рулевого и шкотового, с числами', 'The helmsman and trimmer procedure, with numbers', 'Kolejność działań dla sternika i szotowego, z liczbami', {
                    es: 'El procedimiento del timonel y del trimmer, con números',
                    fr: 'La procédure du barreur et du régleur, avec les chiffres',
                    de: 'Ablauf für Rudergänger und Trimmer, mit Zahlen',
                    it: 'La procedura del timoniere e del trimmer, con i numeri',
                  })}{' '}
                  →
                </Link>
              )}
            </section>
          );
        })}
      </div>

      <div className="mt-8 p-5 card text-center"
           style={{ background: 'rgba(0, 212, 255, 0.04)', borderColor: 'rgba(0, 212, 255, 0.2)' }}>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {tp(
            'Это базовая подборка. Каждая яхта - свой маленький мир. Главное: не уверен - спроси, не трогай без команды.',
            'These are the basics. Every yacht is a small world of its own. The main thing: not sure? Ask. Don\'t touch anything without a command.',
            'To podstawy. Każdy jacht to osobny mały świat. Najważniejsze: nie jesteś pewien - zapytaj, niczego nie ruszaj bez komendy.',
            {
              es: 'Esto es lo básico. Cada velero es un pequeño mundo. Lo principal: si no estás seguro, pregunta, y no toques nada sin una orden.',
              fr: 'Ce sont les bases. Chaque voilier est un petit monde à part. L\'essentiel : pas sûr, demande ; ne touche à rien sans ordre.',
              de: 'Das sind die Grundlagen. Jede Yacht ist eine eigene kleine Welt. Das Wichtigste: Unsicher? Frag nach, und fass nichts ohne Kommando an.',
              it: 'Queste sono le basi. Ogni barca a vela è un piccolo mondo a sé. La cosa principale: se non sei sicuro, chiedi, e non toccare niente senza un comando.',
            },
          )}
        </p>
      </div>

      <ContentFooterNav page="/checklist" />
    </div>
  );
}
