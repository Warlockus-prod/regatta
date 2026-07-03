'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import type { Lang } from '@/lib/languages';
import { WindNowCard } from '@/components/WindNowCard';

// ============================================================================
// Three primary entry points - matches the "who are you" framing
// ============================================================================

interface Localized {
  ru: string; en: string; pl: string;
  es?: string; fr?: string; de?: string; it?: string;
}

interface EntryPoint {
  href: string;
  emoji: string;
  title: Localized;
  subtitle: Localized;
  desc: Localized;
  accent: string; border: string; bg: string;
}

const entryPoints: EntryPoint[] = [
  {
    href: '/start',
    emoji: '🎓',
    title: {
      ru: 'Начать с нуля', en: 'Start from zero', pl: 'Zacznij od zera',
      es: 'Empezar desde cero', fr: 'Demarrer de zero', de: 'Bei null anfangen', it: 'Iniziare da zero',
    },
    subtitle: {
      ru: 'Bootcamp', en: 'Bootcamp', pl: 'Bootcamp',
      es: 'Bootcamp', fr: 'Bootcamp', de: 'Bootcamp', it: 'Bootcamp',
    },
    desc: {
      ru: '8 уроков по 5 минут. От ветра до мини-гонки. Прогресс сохраняется.',
      en: '8 lessons, 5 minutes each. From wind basics to a mini-race. Progress saved.',
      pl: '8 lekcji po 5 minut. Od wiatru do mini-regaty. Postep jest zapisywany.',
      es: '8 lecciones de 5 minutos. Desde el viento hasta una mini-regata. Progreso guardado.',
      fr: '8 lecons de 5 minutes. Du vent a la mini-regate. Progression sauvegardee.',
      de: '8 Lektionen je 5 Minuten. Vom Wind bis zum Mini-Rennen. Fortschritt gespeichert.',
      it: '8 lezioni da 5 minuti. Dal vento alla mini-regata. Progresso salvato.',
    },
    accent: 'var(--accent-cyan)',
    border: 'rgba(0, 212, 255, 0.3)',
    bg: 'rgba(0, 212, 255, 0.08)',
  },
  {
    href: '/quick',
    emoji: '⚡',
    title: {
      ru: 'Освежить за 15 мин', en: 'Refresh in 15 min', pl: 'Odswiez w 15 min',
      es: 'Repasar en 15 min', fr: 'Reviser en 15 min', de: 'Auffrischen in 15 Min', it: 'Ripassare in 15 min',
    },
    subtitle: {
      ru: 'Quick refresh', en: 'Quick refresh', pl: 'Szybkie powtorzenie',
      es: 'Repaso rapido', fr: 'Revision rapide', de: 'Schnelles Auffrischen', it: 'Ripasso rapido',
    },
    desc: {
      ru: 'Опыт есть, но регата - завтра. 6 ключевых тем без воды, прямо к делу.',
      en: 'Got some experience but race is tomorrow. 6 key topics, no fluff.',
      pl: 'Masz doswiadczenie, ale regata jutro. 6 kluczowych tematow bez zbednych slow.',
      es: 'Tienes experiencia, pero la regata es manana. 6 temas clave, sin paja.',
      fr: 'Tu as l\'experience mais la regate est demain. 6 sujets cles, sans blabla.',
      de: 'Erfahrung da, aber Rennen ist morgen. 6 Kernthemen, ohne Fueller.',
      it: 'Hai esperienza, ma la regata e domani. 6 temi chiave, senza fronzoli.',
    },
    accent: 'var(--success)',
    border: 'rgba(68, 255, 136, 0.3)',
    bg: 'rgba(68, 255, 136, 0.08)',
  },
  {
    href: '/rules',
    emoji: '📖',
    title: {
      ru: 'Разобрать правила', en: 'Learn the rules', pl: 'Poznaj przepisy',
      es: 'Aprender las reglas', fr: 'Apprendre les regles', de: 'Regeln lernen', it: 'Imparare le regole',
    },
    subtitle: {
      ru: 'Simple rules', en: 'Simple rules', pl: 'Proste przepisy',
      es: 'Reglas simples', fr: 'Regles simples', de: 'Einfache Regeln', it: 'Regole semplici',
    },
    desc: {
      ru: 'Правый галс, место у знака, старт, столкновение - через 8 карточек-сценариев.',
      en: 'Starboard tack, mark room, start, collision - via 8 scenario cards.',
      pl: 'Hals prawy, miejsce przy znaku, start, kolizja - przez 8 kart-scenariuszy.',
      es: 'Amura a estribor, espacio en boya, salida, colision - a traves de 8 escenarios.',
      fr: 'Tribord amure, place a la marque, depart, collision - via 8 fiches-scenarios.',
      de: 'Steuerbordbug, Bahnmarken-Raum, Start, Kollision - per 8 Szenario-Karten.',
      it: 'Mure a dritta, spazio alla boa, partenza, collisione - tramite 8 carte-scenari.',
    },
    accent: 'var(--warning)',
    border: 'rgba(255, 170, 0, 0.3)',
    bg: 'rgba(255, 170, 0, 0.08)',
  },
];

// ============================================================================
// Secondary tools (after the main entry points)
// ============================================================================

interface Tool {
  href: string;
  title: Localized;
  subtitle: Localized;
  desc: Localized;
  accent: string; icon: string;
}

const secondaryTools: Tool[] = [
  {
    href: '/onboard',
    title: {
      ru: 'Первая неделя на яхте', en: 'First week on board', pl: 'Pierwszy tydzien na jachcie',
      es: 'Primera semana a bordo', fr: 'Premiere semaine a bord', de: 'Erste Woche an Bord', it: 'Prima settimana a bordo',
    },
    subtitle: {
      ru: 'First week on board', en: 'First week on board', pl: 'Pierwszy tydzien na jachcie',
      es: 'Primera semana a bordo', fr: 'Premiere semaine a bord', de: 'Erste Woche an Bord', it: 'Prima settimana a bordo',
    },
    desc: {
      ru: 'Не как управлять, а как вести себя на борту: команды, что опасно, что брать.',
      en: 'Not how to sail - how to behave aboard: commands, dangers, what to pack.',
      pl: 'Nie jak sterowac - jak zachowac sie na pokladzie: komendy, zagrozenia, co zabrac.',
      es: 'No como navegar, sino como comportarse a bordo: comandos, peligros, que llevar.',
      fr: 'Pas comment naviguer - comment se tenir a bord : commandes, dangers, quoi prendre.',
      de: 'Nicht wie segeln - wie an Bord verhalten: Kommandos, Gefahren, was mitnehmen.',
      it: 'Non come navigare, ma come comportarsi a bordo: comandi, pericoli, cosa portare.',
    },
    accent: 'var(--success)',
    icon: '⚓',
  },
  {
    href: '/anatomy',
    title: {
      ru: 'Устройство яхты', en: 'Yacht anatomy', pl: 'Budowa jachtu',
      es: 'Anatomia del velero', fr: 'Anatomie du voilier', de: 'Aufbau der Yacht', it: 'Anatomia della barca',
    },
    subtitle: {
      ru: 'Yacht anatomy', en: 'Yacht anatomy', pl: 'Budowa jachtu',
      es: 'Anatomia del velero', fr: 'Anatomie du voilier', de: 'Aufbau der Yacht', it: 'Anatomia della barca',
    },
    desc: {
      ru: 'Bavaria 46 с кликабельными деталями: нос, мачта, гик, шкоты, лебёдки.',
      en: 'Bavaria 46 with clickable parts: bow, mast, boom, sheets, winches.',
      pl: 'Bavaria 46 z klikalnymi elementami: dziob, maszt, bom, szoty, kabestany.',
      es: 'Bavaria 46 con partes clicables: proa, mastil, boton, escotas, winches.',
      fr: 'Bavaria 46 avec parties cliquables : etrave, mat, bome, ecoutes, winchs.',
      de: 'Bavaria 46 mit klickbaren Teilen: Bug, Mast, Baum, Schoten, Winschen.',
      it: 'Bavaria 46 con parti cliccabili: prua, albero, boma, scotte, winch.',
    },
    accent: 'var(--success)',
    icon: '🔧',
  },
  {
    href: '/checklist',
    title: {
      ru: 'Чек-лист к регате', en: 'Pre-race checklist', pl: 'Lista przed regata',
      es: 'Checklist pre-regata', fr: 'Checklist pre-regate', de: 'Pre-Race-Checkliste', it: 'Checklist pre-regata',
    },
    subtitle: {
      ru: 'Pre-race checklist', en: 'Pre-race checklist', pl: 'Lista przed regata',
      es: 'Checklist pre-regata', fr: 'Checklist pre-regate', de: 'Pre-Race-Checkliste', it: 'Checklist pre-regata',
    },
    desc: {
      ru: 'Что взять, что узнать, что сделать перед выходом. Читается за пару минут.',
      en: 'What to pack, learn, and do before casting off. A two-minute read.',
      pl: 'Co zabrac, czego sie dowiedziec, co zrobic przed wyjsciem. Czyta sie w pare minut.',
      es: 'Que llevar, que saber, que hacer antes de soltar amarras. Se lee en dos minutos.',
      fr: 'Quoi prendre, savoir, faire avant de larguer. Se lit en deux minutes.',
      de: 'Was mitnehmen, lernen, tun vor dem Ablegen. In zwei Minuten gelesen.',
      it: 'Cosa portare, sapere, fare prima di mollare. Si legge in due minuti.',
    },
    accent: 'var(--warning)',
    icon: '✅',
  },
  {
    href: '/simulator',
    title: {
      ru: 'Симулятор', en: 'Simulator', pl: 'Symulator',
      es: 'Simulador', fr: 'Simulateur', de: 'Simulator', it: 'Simulatore',
    },
    subtitle: {
      ru: 'Simulator', en: 'Simulator', pl: 'Symulator',
      es: 'Simulador', fr: 'Simulateur', de: 'Simulator', it: 'Simulatore',
    },
    desc: {
      ru: 'Интерактивная яхта: top-view + side-view с креном. Почувствуй ветер руками.',
      en: 'Interactive yacht: top view + side view with heel. Feel the wind.',
      pl: 'Interaktywny jacht: widok z gory + z boku z przechylem. Poczuj wiatr.',
      es: 'Velero interactivo: vista cenital + lateral con escora. Siente el viento.',
      fr: 'Voilier interactif : vue dessus + cote avec gite. Sens le vent.',
      de: 'Interaktive Yacht: Drauf- + Seitenansicht mit Krängung. Spuere den Wind.',
      it: 'Barca interattiva: vista dall\'alto + di lato con sbandamento. Senti il vento.',
    },
    accent: 'var(--accent-cyan)',
    icon: '🎮',
  },
  {
    href: '/spots',
    title: {
      ru: 'Споты: где ходить', en: 'Spots: where to sail', pl: 'Spoty: gdzie plywac',
      es: 'Spots: donde navegar', fr: 'Spots : ou naviguer', de: 'Spots: wo segeln', it: 'Spot: dove navigare',
    },
    subtitle: {
      ru: 'Where to sail', en: 'Where to sail', pl: 'Where to sail',
      es: 'Where to sail', fr: 'Where to sail', de: 'Where to sail', it: 'Where to sail',
    },
    desc: {
      ru: 'Морская карта и живой ветер для известных парусных точек. Для тренировки, не для навигации.',
      en: 'Nautical chart and live wind for well-known sailing venues. For training, not for navigation.',
      pl: 'Mapa morska i wiatr na zywo dla znanych miejscowek zeglarskich. Do treningu, nie do nawigacji.',
      es: 'Carta nautica y viento en vivo para lugares conocidos de navegacion. Para entrenamiento, no para navegacion.',
      fr: 'Carte marine et vent en direct pour des spots de voile connus. Pour l\'entrainement, pas pour la navigation.',
      de: 'Seekarte und Live-Wind fuer bekannte Segelreviere. Zum Training, nicht zur Navigation.',
      it: 'Carta nautica e vento dal vivo per localita veliche note. Per allenamento, non per navigazione.',
    },
    accent: 'var(--accent-cyan)',
    icon: '📍',
  },
  {
    href: '/racing',
    title: {
      ru: 'Тактика', en: 'Tactics', pl: 'Taktyka',
      es: 'Tactica', fr: 'Tactique', de: 'Taktik', it: 'Tattica',
    },
    subtitle: {
      ru: 'Tactics', en: 'Tactics', pl: 'Taktyka',
      es: 'Tactica', fr: 'Tactique', de: 'Taktik', it: 'Tattica',
    },
    desc: {
      ru: 'Лавировка, старт, огибание знаков, правила расхождения - диаграммы.',
      en: 'Upwind, start, mark rounding, right-of-way - diagrams.',
      pl: 'Halsowanie, start, oplywanie znakow, pierwszenstwo - diagramy.',
      es: 'Cenida, salida, redondeo de boyas, derecho de paso - diagramas.',
      fr: 'Au pres, depart, contournage de marques, priorite - schemas.',
      de: 'Am Wind, Start, Tonnenrunden, Vorfahrt - Diagramme.',
      it: 'Bolina, partenza, aggiramento boe, diritto di rotta - diagrammi.',
    },
    accent: 'var(--warning)',
    icon: '🎯',
  },
  {
    href: '/courses',
    title: {
      ru: 'Курсы относительно ветра', en: 'Points of sail', pl: 'Kursy wzgledem wiatru',
      es: 'Rumbos respecto al viento', fr: 'Allures', de: 'Windkurse', it: 'Andature',
    },
    subtitle: {
      ru: 'Points of sail', en: 'Points of sail', pl: 'Kursy wzgledem wiatru',
      es: 'Rumbos respecto al viento', fr: 'Allures', de: 'Windkurse', it: 'Andature',
    },
    desc: {
      ru: 'Левентик, бейдевинд, галфвинд, бакштаг, фордевинд - интерактивная диаграмма.',
      en: 'In-irons, close-hauled, beam, broad, running - interactive diagram.',
      pl: 'W linii wiatru, ostry, polwiatr, baksztag, fordewind - interaktywny diagram.',
      es: 'En facha, cenida, traves, largo, popa - diagrama interactivo.',
      fr: 'Vent debout, au pres, vent de travers, grand largue, vent arriere - schema interactif.',
      de: 'Im Wind, am Wind, Halbwind, Raumwind, vor dem Wind - interaktives Diagramm.',
      it: 'In panna, bolina, traverso, lasco, fil di ruota - diagramma interattivo.',
    },
    accent: 'var(--success)',
    icon: '🧭',
  },
  {
    href: '/glossary',
    title: {
      ru: 'Глоссарий', en: 'Glossary', pl: 'Glosariusz',
      es: 'Glosario', fr: 'Glossaire', de: 'Glossar', it: 'Glossario',
    },
    subtitle: {
      ru: 'Glossary', en: 'Glossary', pl: 'Glosariusz',
      es: 'Glosario', fr: 'Glossaire', de: 'Glossar', it: 'Glossario',
    },
    desc: {
      ru: '52 термина на 7 языках. Бейдевинд = close-hauled = cenida = au pres. Ищи и фильтруй.',
      en: '52 terms across 7 languages. Search and filter.',
      pl: '52 pojecia w 7 jezykach. Szukaj i filtruj.',
      es: '52 terminos en 7 idiomas. Busca y filtra.',
      fr: '52 termes en 7 langues. Cherche et filtre.',
      de: '52 Begriffe in 7 Sprachen. Suchen und filtern.',
      it: '52 termini in 7 lingue. Cerca e filtra.',
    },
    accent: '#8844ff',
    icon: '📚',
  },
];

// ============================================================================
// "Why" bullets
// ============================================================================

interface WhyBullet {
  icon: string;
  title: Localized;
  text: Localized;
}

const whyBullets: WhyBullet[] = [
  {
    icon: '⚡',
    title: {
      ru: 'За 45 минут', en: 'In 45 minutes', pl: 'W 45 minut',
      es: 'En 45 minutos', fr: 'En 45 minutes', de: 'In 45 Minuten', it: 'In 45 minuti',
    },
    text: {
      ru: 'От «я ничего не понимаю» до «я готов слушать брифинг».',
      en: 'From "I don\'t get any of this" to "I can follow the briefing".',
      pl: 'Od „nic nie rozumiem" do „jestem gotowy na odprawe".',
      es: 'De "no entiendo nada" a "puedo seguir el briefing".',
      fr: 'De "je ne comprends rien" a "je peux suivre le briefing".',
      de: 'Von "ich verstehe nichts" zu "ich kann dem Briefing folgen".',
      it: 'Da "non capisco niente" a "posso seguire il briefing".',
    },
  },
  {
    icon: '🎯',
    title: {
      ru: 'Через сценарии', en: 'Via scenarios', pl: 'Przez scenariusze',
      es: 'Por escenarios', fr: 'Par scenarios', de: 'Durch Szenarien', it: 'Tramite scenari',
    },
    text: {
      ru: 'Не учебник, а ситуации с воды. Действие → объяснение.',
      en: 'Not a textbook - real on-water situations. Action -> explanation.',
      pl: 'Nie podrecznik - realne sytuacje z wody. Akcja -> wyjasnienie.',
      es: 'No un libro de texto, sino situaciones reales en el agua. Accion -> explicacion.',
      fr: 'Pas un manuel - de vraies situations en mer. Action -> explication.',
      de: 'Kein Lehrbuch - echte Situationen auf dem Wasser. Aktion -> Erklaerung.',
      it: 'Non un manuale, ma situazioni reali in acqua. Azione -> spiegazione.',
    },
  },
  {
    icon: '🌐',
    title: {
      ru: '7 языков', en: '7 languages', pl: '7 jezykow',
      es: '7 idiomas', fr: '7 langues', de: '7 Sprachen', it: '7 lingue',
    },
    text: {
      ru: 'RU / EN / PL / ES / FR / DE / IT. Термины на родном языке - и не только.',
      en: 'RU / EN / PL / ES / FR / DE / IT. Sailing terms in your language and beyond.',
      pl: 'RU / EN / PL / ES / FR / DE / IT. Terminologia w jezyku ojczystym i nie tylko.',
      es: 'RU / EN / PL / ES / FR / DE / IT. Terminos en tu idioma y mas alla.',
      fr: 'RU / EN / PL / ES / FR / DE / IT. Les termes dans ta langue et au-dela.',
      de: 'RU / EN / PL / ES / FR / DE / IT. Begriffe in deiner Sprache und darueber hinaus.',
      it: 'RU / EN / PL / ES / FR / DE / IT. Terminologia nella tua lingua e oltre.',
    },
  },
  {
    icon: '📱',
    title: {
      ru: 'В браузере', en: 'In the browser', pl: 'W przegladarce',
      es: 'En el navegador', fr: 'Dans le navigateur', de: 'Im Browser', it: 'Nel browser',
    },
    text: {
      ru: 'Ничего не ставишь. Открыл ссылку - учишься.',
      en: 'Nothing to install. Open the link, start learning.',
      pl: 'Nic nie instalujesz. Otwierasz link, uczysz sie.',
      es: 'Nada que instalar. Abre el enlace y aprende.',
      fr: 'Rien a installer. Ouvre le lien, apprends.',
      de: 'Nichts zu installieren. Link oeffnen, loslernen.',
      it: 'Nulla da installare. Apri il link e impara.',
    },
  },
];

function pickL(obj: Localized, lang: Lang): string {
  switch (lang) {
    case 'ru': return obj.ru;
    case 'pl': return obj.pl;
    case 'es': return obj.es ?? obj.en;
    case 'fr': return obj.fr ?? obj.en;
    case 'de': return obj.de ?? obj.en;
    case 'it': return obj.it ?? obj.en;
    default:   return obj.en;
  }
}

export default function HomePage() {
  const { lang, tp } = useI18n();

  return (
    <div className="page-enter">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-medium"
               style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.25)', color: 'var(--accent-cyan)' }}>
            <span className="w-1.5 h-1.5 rounded-full pulse-gentle" style={{ background: 'var(--accent-cyan)' }} />
            {tp(
              'Быстрый вход в яхтенные гонки',
              'Fast track into sailing races',
              'Szybki start w regatach',
              {
                es: 'Acceso rapido a la regata',
                fr: 'Acces rapide aux regates',
                de: 'Schnelleinstieg in den Regattasport',
                it: 'Accesso rapido alle regate',
              },
            )}
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-4 leading-[1.1]">
            {tp(
              'До регаты неделя?',
              'Race in a week?',
              'Regata za tydzien?',
              {
                es: 'Regata en una semana?',
                fr: 'Regate dans une semaine ?',
                de: 'Rennen in einer Woche?',
                it: 'Regata tra una settimana?',
              },
            ).split('?')[0]}{' '}
            <span style={{ color: 'var(--accent-cyan)' }}>?</span>
            <br />
            {tp(
              'Успеешь разобраться.',
              "You'll figure it out.",
              'Zdazysz sie ogarnac.',
              {
                es: 'Tienes tiempo de prepararte.',
                fr: 'Tu as le temps de t\'y preparer.',
                de: 'Du schaffst es noch.',
                it: 'Fai in tempo a prepararti.',
              },
            )}
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed mb-3">
            {tp(
              'Интерактивный тренажёр для тех, кому скоро на регату, тренировку или первая неделя на яхте. Ветер, курсы, паруса, базовые правила - через короткие сценарии, не учебник.',
              'Interactive trainer for anyone with a race, a training day, or a first week on board coming up. Wind, points of sail, sails, basic rules - via short scenarios, not a textbook.',
              'Interaktywny trener dla osob, ktore maja przed soba regate, trening lub pierwszy tydzien na jachcie. Wiatr, kursy, zagle, podstawowe przepisy - przez krotkie scenariusze, nie podrecznik.',
              {
                es: 'Entrenador interactivo para quienes tienen una regata, un dia de entrenamiento o su primera semana a bordo. Viento, rumbos, velas, reglas basicas - en escenarios cortos, no un libro de texto.',
                fr: 'Entraineur interactif pour ceux qui ont une regate, un entrainement ou leur premiere semaine a bord. Vent, allures, voiles, regles de base - en scenarios courts, pas un manuel.',
                de: 'Interaktiver Trainer fuer alle mit einem Rennen, Trainingstag oder der ersten Woche an Bord. Wind, Kurse, Segel, Grundregeln - in kurzen Szenarien, kein Lehrbuch.',
                it: 'Allenatore interattivo per chi ha una regata, un allenamento o la prima settimana a bordo. Vento, andature, vele, regole di base - in scenari brevi, non un manuale.',
              },
            )}
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-10">
            {tp(
              'Тренажёр в браузере · 7 языков',
              'Browser-based sailing trainer · 7 languages',
              'Trener w przegladarce · 7 jezykow',
              {
                es: 'Entrenador en el navegador · 7 idiomas',
                fr: 'Entraineur dans le navigateur · 7 langues',
                de: 'Browser-Trainer · 7 Sprachen',
                it: 'Allenatore nel browser · 7 lingue',
              },
            )}
          </p>

          {/* CTA badges */}
          <div className="inline-flex flex-wrap gap-2 justify-center text-xs text-[var(--text-muted)]">
            <span className="px-2.5 py-1 rounded-full" style={{ border: '1px solid rgba(139, 167, 184, 0.2)' }}>
              {tp('~45 мин базы', '~45 min basics', '~45 min podstaw',
                { es: '~45 min de base', fr: '~45 min de base', de: '~45 Min Basis', it: '~45 min di base' })}
            </span>
            <span className="px-2.5 py-1 rounded-full" style={{ border: '1px solid rgba(139, 167, 184, 0.2)' }}>
              {tp('Без установки', 'No install', 'Bez instalacji',
                { es: 'Sin instalacion', fr: 'Aucune installation', de: 'Ohne Installation', it: 'Senza installazione' })}
            </span>
            <span className="px-2.5 py-1 rounded-full" style={{ border: '1px solid rgba(139, 167, 184, 0.2)' }}>
              7 langs
            </span>
            <span className="px-2.5 py-1 rounded-full" style={{ border: '1px solid rgba(139, 167, 184, 0.2)' }}>
              {tp('AI-тренер после гонки', 'AI coach after the race', 'Trener AI po regatach',
                { es: 'Coach IA despues de la regata', fr: 'Coach IA apres la course', de: 'KI-Coach nach dem Rennen', it: 'Coach IA dopo la regata' })}
            </span>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px"
             style={{ background: 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.3), transparent)' }} />
      </section>

      {/* ===== THREE ENTRY POINTS ===== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold mb-2">
            {tp('С чего начнёшь?', 'Where do you start?', 'Od czego zaczniesz?',
              { es: '?Por donde empiezas?', fr: 'Par ou commences-tu ?', de: 'Wo faengst du an?', it: 'Da dove inizi?' })}
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            {tp('Выбери точку входа', 'Pick your entry point', 'Wybierz punkt startu',
              { es: 'Elige tu punto de entrada', fr: 'Choisis ton point d\'entree', de: 'Waehle deinen Einstieg', it: 'Scegli il tuo punto di partenza' })}
          </p>
        </div>

        <div className="stagger grid grid-cols-1 md:grid-cols-3 gap-4">
          {entryPoints.map((ep) => (
            <Link
              key={ep.href}
              href={ep.href}
              className="group card lift p-6 flex flex-col gap-4"
              style={{ borderColor: ep.border, background: ep.bg }}
            >
              <div className="text-4xl">{ep.emoji}</div>
              <div>
                <div className="text-lg font-semibold mb-0.5">{pickL(ep.title, lang)}</div>
                <div className="text-xs text-[var(--text-muted)]">{pickL(ep.subtitle, lang)}</div>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-1">
                {pickL(ep.desc, lang)}
              </p>
              <div className="flex items-center gap-1 text-xs font-medium mt-auto" style={{ color: ep.accent }}>
                <span>{tp('Начать', 'Start', 'Zacznij',
                  { es: 'Empezar', fr: 'Commencer', de: 'Los', it: 'Inizia' })}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     className="group-hover:translate-x-1 transition-transform">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== WHY BULLETS ===== */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="stagger grid grid-cols-2 md:grid-cols-4 gap-3">
          {whyBullets.map((b) => (
            <div key={b.title.en} className="card p-4">
              <div className="text-2xl mb-2">{b.icon}</div>
              <div className="text-sm font-semibold mb-1">{pickL(b.title, lang)}</div>
              <div className="text-xs text-[var(--text-muted)] leading-relaxed">{pickL(b.text, lang)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== LIVE WIND ===== */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-1">
            {tp('Живой ветер', 'Live wind', 'Wiatr na zywo',
              { es: 'Viento en vivo', fr: 'Vent en direct', de: 'Live-Wind', it: 'Vento dal vivo' })}
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            {tp('Свяжи теорию с реальной погодой', 'Connect the theory to real weather', 'Polacz teorie z prawdziwa pogoda',
              { es: 'Conecta la teoria con el clima real', fr: 'Relie la theorie a la meteo reelle', de: 'Verbinde die Theorie mit echtem Wetter', it: 'Collega la teoria al meteo reale' })}
          </p>
        </div>
        <WindNowCard />
      </section>

      {/* ===== SECONDARY TOOLS ===== */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-1">
            {tp('Дополнительно', 'Extras', 'Dodatkowo',
              { es: 'Extras', fr: 'En plus', de: 'Mehr', it: 'Extra' })}
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            {tp('Инструменты под руками', 'Tools at hand', 'Narzedzia pod reka',
              { es: 'Herramientas al alcance', fr: 'Outils a portee de main', de: 'Werkzeuge griffbereit', it: 'Strumenti a portata' })}
          </p>
        </div>

        <div className="stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {secondaryTools.map((t2) => (
            <Link
              key={t2.href}
              href={t2.href}
              className="group card p-4 flex flex-col gap-2 hover:border-[var(--accent-cyan)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{t2.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold group-hover:text-[var(--accent-cyan)] transition-colors line-clamp-1">
                    {pickL(t2.title, lang)}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">{pickL(t2.subtitle, lang)}</div>
                </div>
              </div>
              <div className="text-xs text-[var(--text-secondary)] line-clamp-2">
                {pickL(t2.desc, lang)}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== GET THE iOS APP ===== */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div
          className="card p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 sm:gap-8 text-center sm:text-left"
          style={{ background: 'rgba(0, 212, 255, 0.04)', borderColor: 'rgba(0, 212, 255, 0.2)' }}
        >
          <div className="text-5xl sm:text-6xl shrink-0">📱</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold mb-1">
              {tp('Скачай приложение', 'Get the app', 'Pobierz aplikacje',
                { es: 'Descarga la app', fr: 'Telecharge l\'application', de: 'Hol dir die App', it: 'Scarica l\'app' })}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {tp(
                'Week to Regatta теперь и на iPhone и iPad. Уроки, симулятор и гонка - офлайн, прогресс с собой.',
                'Week to Regatta is on iPhone and iPad too. Lessons, simulator and race - offline, your progress in your pocket.',
                'Week to Regatta jest tez na iPhone i iPad. Lekcje, symulator i regata - offline, postep zawsze przy sobie.',
                {
                  es: 'Week to Regatta tambien en iPhone y iPad. Lecciones, simulador y regata - sin conexion, con tu progreso siempre contigo.',
                  fr: 'Week to Regatta aussi sur iPhone et iPad. Lecons, simulateur et course - hors ligne, ta progression dans ta poche.',
                  de: 'Week to Regatta jetzt auch auf iPhone und iPad. Lektionen, Simulator und Rennen - offline, dein Fortschritt immer dabei.',
                  it: 'Week to Regatta anche su iPhone e iPad. Lezioni, simulatore e regata - offline, i tuoi progressi sempre con te.',
                },
              )}
            </p>
          </div>
          <a
            href="https://apps.apple.com/app/id6768134329"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2.5 px-5 py-3 rounded-xl font-medium transition-transform hover:scale-[1.03]"
            style={{ background: 'var(--accent-cyan)', color: '#06121f' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M16.365 1.43c0 1.14-.42 2.2-1.13 2.99-.83.92-2.2 1.64-3.34 1.55-.13-1.1.42-2.27 1.08-3 .76-.85 2.13-1.5 3.39-1.54zM20.7 17.06c-.55 1.27-.82 1.84-1.53 2.97-.99 1.57-2.39 3.53-4.12 3.54-1.54.02-1.93-1-4.02-.99-2.09.01-2.52 1.01-4.06.99-1.73-.03-3.06-1.79-4.05-3.36C-.07 16.86-.3 11.74 1.4 9.05c1.2-1.93 3.1-3.06 4.88-3.06 1.81 0 2.95 1 4.45 1 1.45 0 2.34-1 4.44-1 1.58 0 3.26.86 4.45 2.35-3.91 2.14-3.27 7.72.68 8.72z" />
            </svg>
            <span className="text-sm whitespace-nowrap">
              {tp('App Store', 'App Store', 'App Store',
                { es: 'App Store', fr: 'App Store', de: 'App Store', it: 'App Store' })}
            </span>
          </a>
        </div>
      </section>

      {/* ===== CALL-TO-ACTION / TIP ===== */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="card p-5 sm:p-6 text-center" style={{ background: 'rgba(0, 212, 255, 0.04)', borderColor: 'rgba(0, 212, 255, 0.2)' }}>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            <span className="font-semibold text-[var(--text-primary)]">
              {tp('Не знаешь куда идти?', 'Not sure where to go?', 'Nie wiesz od czego zaczac?',
                { es: '?No sabes por donde empezar?', fr: 'Tu ne sais pas par ou commencer ?', de: 'Weisst du nicht wo anfangen?', it: 'Non sai da dove iniziare?' })}
            </span>{' '}
            {tp('Начни с', 'Start with', 'Zacznij od',
              { es: 'Empieza por', fr: 'Commence par', de: 'Beginne mit', it: 'Inizia da' })}{' '}
            <Link href="/courses" className="text-[var(--accent-cyan)] hover:underline font-medium">
              {tp('«Курсов относительно ветра»', '"Points of sail"', '"Kursy wzgledem wiatru"',
                { es: '"Rumbos respecto al viento"', fr: '"Allures"', de: '"Windkurse"', it: '"Andature"' })}
            </Link>
            {' '}- {tp('это база всего парусного. Потом', "it's the foundation. Then", 'to fundament. Potem',
              { es: 'es la base de todo el velerismo. Luego', fr: 'c\'est la base de la voile. Puis', de: 'das ist die Basis vom Segeln. Dann', it: 'e la base della vela. Poi' })}{' '}
            <Link href="/simulator" className="text-[var(--accent-cyan)] hover:underline font-medium">
              {tp('Симулятор', 'Simulator', 'Symulator',
                { es: 'Simulador', fr: 'Simulateur', de: 'Simulator', it: 'Simulatore' })}
            </Link>
            {' '}{tp('для ощущения в руках, потом', 'to feel it, then', 'zeby poczuc, potem',
              { es: 'para sentirlo, luego', fr: 'pour le sentir, puis', de: 'um es zu spueren, dann', it: 'per sentirlo, poi' })}{' '}
            <Link href="/game" className="text-[var(--accent-cyan)] hover:underline font-medium">
              {tp('Гонка', 'Race', 'Regata',
                { es: 'Regata', fr: 'Course', de: 'Rennen', it: 'Regata' })}
            </Link>
            {' '}{tp('с AI-соперниками для практики.', 'with AI opponents for practice.', 'z AI dla praktyki.',
              { es: 'con rivales IA para practicar.', fr: 'avec des rivaux IA pour t\'entrainer.', de: 'mit KI-Gegnern zum Ueben.', it: 'con rivali IA per allenarsi.' })}
          </p>
        </div>
      </section>
    </div>
  );
}
