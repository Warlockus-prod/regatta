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
          ⚓ {tp('Первая неделя на яхте', 'First week on board', 'Pierwszy tydzien na jachcie', { es: 'Primera semana a bordo', fr: 'Premiere semaine a bord', de: 'Erste Woche an Bord', it: 'Prima settimana a bordo' })}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {tp('Что происходит на борту и как не чувствовать себя потерянным', 'What happens on board and how to not feel lost', 'Co dzieje sie na pokladzie i jak sie nie zagubic', { es: 'Que pasa a bordo y como no sentirse perdido', fr: 'Ce qui se passe a bord et comment ne pas se sentir perdu', de: 'Was an Bord passiert und wie man sich nicht verloren fuhlt', it: 'Cosa succede a bordo e come non sentirsi persi' })}
        </h1>
        <p className="text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          {tp(
            'Для тех, кто впервые идёт на регату или чартер. Не учат как управлять яхтой, а как вести себя на борту, чтобы быть полезным и не мешать.',
            'For first-time regatta/charter crew. Not how to sail - how to behave on board so you\'re useful and not in the way.',
            'Dla tych, ktorzy pierwszy raz ida na regate lub czarter. Nie uczymy jak sterowac - jak zachowac sie na pokladzie, aby byc pomocnym i nie przeszkadzac.',
            {
              es: 'Para quienes van por primera vez a una regata o un charter. No ensena a llevar el timon, sino como comportarse a bordo para ser util y no estorbar.',
              fr: 'Pour ceux qui partent en regate ou en location pour la premiere fois. On n\'apprend pas a barrer, mais a se comporter a bord pour etre utile et ne pas gener.',
              de: 'Fur alle, die zum ersten Mal auf eine Regatta oder einen Charter gehen. Kein Steuern lernen, sondern wie man sich an Bord verhalt, um nutzlich zu sein und nicht im Weg zu stehen.',
              it: 'Per chi va per la prima volta a una regata o a un charter. Non insegna a timonare, ma come comportarsi a bordo per essere utili e non intralciare.',
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
                    <div className="text-base sm:text-lg font-semibold truncate">{title}</div>
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
                      <span className="font-semibold" style={{ color: 'var(--warning)' }}>⚠️ {tp('Важно', 'Important', 'Wazne', { es: 'Importante', fr: 'Important', de: 'Wichtig', it: 'Importante' })}:</span>{' '}
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
          {tp('Глубже по темам', 'Deeper by topic', 'Glebiej po tematach', { es: 'Mas a fondo por tema', fr: 'Plus en profondeur par theme', de: 'Tiefer nach Thema', it: 'Piu a fondo per argomento' })}
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          {tp(
            'Краткий обзор здесь - подробности в отдельных разделах.',
            'Overview here - details on dedicated pages.',
            'Krotki przeglad tutaj - szczegoly w osobnych sekcjach.',
            {
              es: 'Resumen aqui, los detalles en secciones aparte.',
              fr: 'Apercu ici, les details sur des pages dediees.',
              de: 'Uberblick hier, Details auf eigenen Seiten.',
              it: 'Panoramica qui, i dettagli in sezioni dedicate.',
            },
          )}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/anatomy" className="card p-4 hover:border-[var(--accent-cyan)] transition">
            <div className="text-2xl mb-1">🔧</div>
            <div className="font-semibold">{tp('Устройство яхты', 'Yacht anatomy', 'Budowa jachtu', { es: 'Anatomia del yate', fr: 'Anatomie du voilier', de: 'Aufbau der Yacht', it: 'Anatomia della barca' })}</div>
            <div className="text-[10px] text-[var(--text-muted)] mb-1">Bavaria 46</div>
            <p className="text-xs text-[var(--text-secondary)]">
              {tp('17 деталей с описанием, интерактивная 3D модель.', '17 parts described, interactive 3D model.', '17 czesci z opisem, interaktywny model 3D.', { es: '17 piezas descritas, modelo 3D interactivo.', fr: '17 pieces decrites, modele 3D interactif.', de: '17 Teile beschrieben, interaktives 3D-Modell.', it: '17 parti descritte, modello 3D interattivo.' })}
            </p>
          </Link>
          <Link href="/checklist" className="card p-4 hover:border-[var(--accent-cyan)] transition">
            <div className="text-2xl mb-1">✅</div>
            <div className="font-semibold">{tp('Чек-лист к регате', 'Pre-race checklist', 'Lista przed regata', { es: 'Lista antes de la regata', fr: 'Checklist avant la regate', de: 'Checkliste vor der Regatta', it: 'Checklist prima della regata' })}</div>
            <div className="text-[10px] text-[var(--text-muted)] mb-1">{tp('Что взять, что знать', 'Pack, know, do', 'Co wziac, co wiedziec', { es: 'Preparar, saber, hacer', fr: 'Preparer, savoir, faire', de: 'Packen, wissen, tun', it: 'Preparare, sapere, fare' })}</div>
            <p className="text-xs text-[var(--text-secondary)]">
              {tp('Что взять и проверить перед выходом. Читается за пару минут.', 'What to pack and check before casting off. A two-minute read.', 'Co zabrac i sprawdzic przed wyjsciem. Czyta sie w pare minut.', { es: 'Que llevar y comprobar antes de zarpar. Se lee en un par de minutos.', fr: 'Quoi emporter et verifier avant d\'appareiller. Une lecture de deux minutes.', de: 'Was mitnehmen und vor dem Ablegen prufen. In zwei Minuten gelesen.', it: 'Cosa portare e controllare prima di salpare. Si legge in un paio di minuti.' })}
            </p>
          </Link>
        </div>
      </div>

      <div className="mt-8 p-5 card text-center" style={{ background: 'rgba(68, 255, 136, 0.04)', borderColor: 'rgba(68, 255, 136, 0.2)' }}>
        <p className="text-sm text-[var(--text-secondary)]">
          {tp(
            'Это базовая подборка. Каждая яхта - свой маленький мир. Главное правило: не уверен - спроси, не трогай без команды.',
            'This is the basics. Each yacht has its own quirks. Main rule: not sure - ask. Don\'t touch without a command.',
            'To podstawy. Kazdy jacht ma swoje kwirki. Glowna zasada: nie jestes pewien - zapytaj, nie dotykaj bez komendy.',
            {
              es: 'Esto es lo basico. Cada yate es un pequeno mundo propio. Regla principal: si no estas seguro, pregunta; no toques sin una orden.',
              fr: 'Ce sont les bases. Chaque voilier est un petit monde a part. Regle principale: si tu n\'es pas sur, demande; ne touche a rien sans ordre.',
              de: 'Das sind die Grundlagen. Jede Yacht ist ihre eigene kleine Welt. Hauptregel: unsicher, dann frag; fass nichts ohne Kommando an.',
              it: 'Queste sono le basi. Ogni barca e un piccolo mondo a se. Regola principale: se non sei sicuro, chiedi; non toccare senza un ordine.',
            },
          )}
        </p>
      </div>

      <ContentFooterNav page="/onboard" />
    </div>
  );
}
