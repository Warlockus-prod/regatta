'use client';

import Link from 'next/link';
import { legacyPick, legacyPickArray } from '@/lib/languages';
import { useState } from 'react';
import { onboardSections } from '@/data/onboard';
import { useI18n } from '@/lib/i18n';
import ContentFooterNav from '@/components/ContentFooterNav';

export default function OnboardPage() {
  const { lang, tp } = useI18n();
  // Open all sections by default so everything is readable in one scroll.
  // Users expected to see the full "how to behave on a yacht" reference,
  // not a click-by-click accordion.
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(onboardSections.map((s) => s.id)),
  );
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  return (
    <div className="page-enter max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-medium"
             style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.25)', color: 'var(--accent-cyan)' }}>
          ⚓ {tp('Первая неделя на яхте', 'First week on board', 'Pierwszy tydzień na jachcie', { es: 'Primera semana a bordo', fr: 'Première semaine à bord', de: 'Erste Woche an Bord', it: 'Prima settimana a bordo' })}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {tp('Что происходит на борту и как не чувствовать себя потерянным', 'What happens on board and how not to feel lost', 'Co się dzieje na pokładzie i jak się nie pogubić', { es: 'Qué pasa a bordo y cómo no sentirte perdido', fr: 'Ce qui se passe à bord et comment ne pas te sentir perdu', de: 'Was an Bord passiert und wie du dich nicht verloren fühlst', it: 'Cosa succede a bordo e come non sentirti perso' })}
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          {tp(
            'Для тех, кто впервые идёт на регату или чартер. Не учат как управлять яхтой, а как вести себя на борту, чтобы быть полезным и не мешать.',
            'For anyone joining a regatta or a charter for the first time. Not how to sail the boat, but how to behave on board so you are useful and not in the way.',
            'Dla tych, którzy pierwszy raz płyną na regaty albo w rejs czarterowy. Nie o tym, jak prowadzić jacht, tylko o tym, jak się zachować na pokładzie, żeby się przydać i nie przeszkadzać.',
            {
              es: 'Para quien va por primera vez a una regata o a un chárter. No enseña a gobernar el barco, sino a comportarte a bordo para ser útil y no estorbar.',
              fr: 'Pour toi qui pars pour la première fois en régate ou en croisière de location. On n\'apprend pas ici à barrer, mais à se comporter à bord pour être utile et ne pas gêner.',
              de: 'Für alle, die zum ersten Mal auf eine Regatta oder einen Chartertörn gehen. Nicht, wie man eine Yacht steuert, sondern wie du dich an Bord verhältst, um nützlich zu sein und nicht im Weg zu stehen.',
              it: 'Per chi va per la prima volta a una regata o in charter. Non insegna a condurre la barca, ma a comportarti a bordo per essere utile e non intralciare.',
            },
          )}
        </p>
      </div>

      <div className="space-y-3">
        {onboardSections.map((section) => {
          const isOpen = openIds.has(section.id);
          const items = legacyPickArray(section, 'items', lang);
          const title = legacyPick(section, 'title', lang);
          const warning = legacyPick(section, 'warning', lang);
          return (
            <div
              key={section.id}
              className="card overflow-hidden transition-all"
              style={{ borderColor: isOpen ? 'rgba(0, 212, 255, 0.3)' : undefined }}
            >
              <button
                onClick={() => toggle(section.id)}
                className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0">{section.icon}</span>
                  <div className="min-w-0">
                    <div className="text-base sm:text-lg font-semibold break-words">{title}</div>
                  </div>
                </div>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`shrink-0 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {isOpen && (
                <div className="px-4 sm:px-5 pb-5 space-y-3">
                  <ul className="space-y-2">
                    {items.map((item, i) => (
                      <li key={i} className="flex gap-3 text-sm leading-relaxed">
                        <span className="text-[var(--accent-cyan)] mt-0.5">•</span>
                        <span className="text-[var(--text-primary)]">{item}</span>
                      </li>
                    ))}
                  </ul>
                  {warning && (
                    <div className="p-3 rounded-lg text-sm leading-relaxed"
                         style={{ background: 'rgba(255, 170, 0, 0.08)', border: '1px solid rgba(255, 170, 0, 0.25)' }}>
                      <span className="font-semibold" style={{ color: 'var(--warning)' }}>⚠️ {tp('Важно', 'Important', 'Ważne', { es: 'Importante', fr: 'Important', de: 'Wichtig', it: 'Importante' })}:</span>{' '}
                      <span className="text-[var(--text-primary)]">{warning}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Deep-dive chapters (linked standalone pages) */}
      <div className="mt-10 mb-4">
        <h2 className="text-xl font-semibold mb-2">
          {tp('Глубже по темам', 'Go deeper', 'Więcej o tych tematach', { es: 'Para profundizar', fr: 'Pour aller plus loin', de: 'Zum Vertiefen', it: 'Per approfondire' })}
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          {tp(
            'Краткий обзор здесь - подробности в отдельных разделах.',
            'The overview is here; the details are on dedicated pages.',
            'Tu jest krótki przegląd, szczegóły znajdziesz w osobnych działach.',
            {
              es: 'Aquí tienes un resumen; los detalles, en secciones aparte.',
              fr: 'Ici, un aperçu ; les détails sont sur des pages dédiées.',
              de: 'Hier der Überblick, Details auf eigenen Seiten.',
              it: 'Qui una panoramica, i dettagli in sezioni dedicate.',
            },
          )}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/anatomy" className="card p-4 hover:border-[var(--accent-cyan)] transition">
            <div className="text-2xl mb-1">🔧</div>
            <div className="font-semibold">{tp('Устройство яхты', 'Yacht anatomy', 'Budowa jachtu', { es: 'Anatomía del velero', fr: 'Anatomie du voilier', de: 'Aufbau der Yacht', it: 'Anatomia della barca' })}</div>
            <div className="text-[10px] text-[var(--text-muted)] mb-1">Bavaria 46</div>
            <p className="text-xs text-[var(--text-secondary)]">
              {tp('17 деталей с описанием, интерактивная 3D модель.', '17 parts described, interactive 3D model.', '17 części z opisem, interaktywny model 3D.', { es: '17 piezas descritas, modelo 3D interactivo.', fr: '17 pièces décrites, modèle 3D interactif.', de: '17 Teile beschrieben, interaktives 3D-Modell.', it: '17 parti descritte, modello 3D interattivo.' })}
            </p>
          </Link>
          <Link href="/checklist" className="card p-4 hover:border-[var(--accent-cyan)] transition">
            <div className="text-2xl mb-1">✅</div>
            <div className="font-semibold">{tp('Чек-лист к регате', 'Pre-race checklist', 'Lista kontrolna przed regatami', { es: 'Checklist para la regata', fr: 'Check-list avant la régate', de: 'Checkliste vor der Regatta', it: 'Checklist prima della regata' })}</div>
            <div className="text-[10px] text-[var(--text-muted)] mb-1">{tp('Что взять, что знать', 'What to pack, what to know', 'Co zabrać, co wiedzieć', { es: 'Qué llevar, qué saber', fr: 'Quoi emporter, quoi savoir', de: 'Was mitnehmen, was wissen', it: 'Cosa portare, cosa sapere' })}</div>
            <p className="text-xs text-[var(--text-secondary)]">
              {tp('Что взять и проверить перед выходом. Читается за пару минут.', 'What to pack and check before casting off. A two-minute read.', 'Co zabrać i sprawdzić przed wyjściem. Przeczytasz w dwie minuty.', { es: 'Qué llevar y revisar antes de zarpar. Se lee en un par de minutos.', fr: 'Quoi emporter et vérifier avant d\'appareiller. Deux minutes de lecture.', de: 'Was du mitnimmst und vor dem Ablegen prüfst. In zwei Minuten gelesen.', it: 'Cosa portare e controllare prima di salpare. Si legge in un paio di minuti.' })}
            </p>
          </Link>
        </div>
      </div>

      <div className="mt-8 p-5 card text-center" style={{ background: 'rgba(68, 255, 136, 0.04)', borderColor: 'rgba(68, 255, 136, 0.2)' }}>
        <p className="text-sm text-[var(--text-secondary)]">
          {tp(
            'Это базовая подборка. Каждая яхта - свой маленький мир. Главное правило: не уверен - спроси, не трогай без команды.',
            'These are the basics. Every yacht is a small world of its own. The main rule: not sure? Ask, and don\'t touch anything without a command.',
            'To podstawy. Każdy jacht to osobny mały świat. Najważniejsza zasada: nie jesteś pewien - zapytaj i niczego nie ruszaj bez komendy.',
            {
              es: 'Esto es lo básico. Cada barco es un pequeño mundo. La regla principal: si no estás seguro, pregunta, y no toques nada sin una orden.',
              fr: 'Ce sont les bases. Chaque voilier est un petit monde à part. Règle principale : pas sûr, demande ; ne touche à rien sans ordre.',
              de: 'Das sind die Grundlagen. Jede Yacht ist eine eigene kleine Welt. Die wichtigste Regel: Unsicher? Frag nach, und fass nichts ohne Kommando an.',
              it: 'Queste sono le basi. Ogni barca è un piccolo mondo a sé. La regola principale: se non sei sicuro, chiedi, e non toccare niente senza un comando.',
            },
          )}
        </p>
      </div>

      <ContentFooterNav page="/onboard" />
    </div>
  );
}
