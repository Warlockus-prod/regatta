'use client';

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
          ⚓ {tp('Готовимся к регате', 'Getting ready', 'Przygotowanie',
            { es: 'Preparandonos', fr: 'On se prepare', de: 'Vorbereitung', it: 'Ci prepariamo' })}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {tp(
            'Что взять и как вести себя на яхте',
            'What to pack and how to behave on a yacht',
            'Co zabrac i jak zachowac sie na jachcie',
            {
              es: 'Que llevar y como comportarse en un velero',
              fr: 'Quoi emporter et comment se comporter sur un voilier',
              de: 'Was mitnehmen und wie man sich auf einer Yacht verhaelt',
              it: 'Cosa portare e come comportarsi su una barca a vela',
            },
          )}
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          {tp(
            'Это одна страница, которую новичку стоит прочитать ДО того как он впервые встанет на палубу. Не учит как управлять яхтой - учит не мешать, быть полезным и не пораниться.',
            'One page a first-timer should read BEFORE stepping on deck. It does not teach how to sail - it teaches how to not be in the way, be useful, and not get hurt.',
            'Jedna strona, ktora nowicjusz powinien przeczytac PRZED wejsciem na poklad. Nie uczy jak zeglowac - uczy jak nie przeszkadzac, byc przydatnym i nie zranic sie.',
            {
              es: 'Una pagina que un principiante deberia leer ANTES de subir por primera vez a cubierta. No ensena a navegar - ensena a no estorbar, ser util y no lastimarse.',
              fr: 'Une page qu\'un debutant devrait lire AVANT de monter pour la premiere fois sur le pont. Elle n\'apprend pas a naviguer - elle apprend a ne pas gener, a etre utile et a ne pas se blesser.',
              de: 'Eine Seite, die ein Neuling lesen sollte, BEVOR er zum ersten Mal an Deck geht. Sie lehrt nicht das Segeln - sie lehrt, nicht im Weg zu sein, nuetzlich zu sein und sich nicht zu verletzen.',
              it: 'Una pagina che un principiante dovrebbe leggere PRIMA di salire per la prima volta in coperta. Non insegna a navigare - insegna a non intralciare, a essere utile e a non farsi male.',
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
            <section key={section.id} className="card p-4 sm:p-5">
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
                    ⚠️ {tp('Важно', 'Important', 'Wazne',
                      { es: 'Importante', fr: 'Important', de: 'Wichtig', it: 'Importante' })}:
                  </span>{' '}
                  <span className="text-[var(--text-primary)]">{warning}</span>
                </div>
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
            'This is the basics. Each yacht is its own small world. Main rule: not sure - ask. Do not touch without a command.',
            'To podstawa. Kazdy jacht jest innym malym swiatem. Glowna zasada: nie jestes pewien - pytaj, nie dotykaj bez polecenia.',
            {
              es: 'Esto es lo basico. Cada velero es su propio pequeno mundo. Regla principal: si no estas seguro - pregunta, no toques sin una orden.',
              fr: 'Voici les bases. Chaque voilier est son propre petit monde. Regle principale : si tu n\'es pas sur - demande, ne touche a rien sans ordre.',
              de: 'Das sind die Grundlagen. Jede Yacht ist ihre eigene kleine Welt. Hauptregel: nicht sicher - frag nach, fass nichts ohne Kommando an.',
              it: 'Queste sono le basi. Ogni barca a vela e un piccolo mondo a se. Regola principale: se non sei sicuro - chiedi, non toccare senza un ordine.',
            },
          )}
        </p>
      </div>

      <ContentFooterNav page="/checklist" />
    </div>
  );
}
