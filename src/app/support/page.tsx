'use client';

import { useI18n } from '@/lib/i18n';
import ContentFooterNav from '@/components/ContentFooterNav';

// Support page at /support. This is the URL set as the App Store "Support URL"
// (mobile/asc-metadata/<lang>/support_url.txt -> regatta.icoffio.com/support).
// Apple requires the Support URL to resolve (HTTP 200) and to offer a real way
// to get help, otherwise the submission is metadata-rejected. Keep the support
// email here in sync with the App Review contact in App Store Connect.

const SUPPORT_EMAIL = 'support@gtframe.io';

export default function SupportPage() {
  const { tp } = useI18n();

  return (
    <div className="page-enter max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-medium"
             style={{ background: 'rgba(0, 212, 255, 0.08)', border: '1px solid rgba(0, 212, 255, 0.2)', color: 'var(--accent-cyan)' }}>
          {tp('Поддержка', 'Support', 'Pomoc',
            { es: 'Soporte', fr: 'Assistance', de: 'Support', it: 'Supporto' })}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {tp('Поддержка Week to Regatta', 'Week to Regatta Support', 'Pomoc Week to Regatta',
            { es: 'Soporte de Week to Regatta', fr: 'Assistance Week to Regatta', de: 'Week to Regatta Support', it: 'Supporto Week to Regatta' })}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          {tp(
            'Week to Regatta - тренажёр и обучалка по яхтингу: за неделю от основ ветра до правил мини-гонки.',
            'Week to Regatta is a sailing tutor and simulator: from wind basics to mini-race rules in one week.',
            'Week to Regatta to trener i nauka zeglarstwa: od podstaw wiatru do zasad mini-regat w tydzien.',
            {
              es: 'Week to Regatta es un tutor y simulador de vela: de los conceptos del viento a las reglas de la mini regata en una semana.',
              fr: 'Week to Regatta est un tuteur et simulateur de voile : des bases du vent aux regles de la mini-course en une semaine.',
              de: 'Week to Regatta ist ein Segel-Tutor und -Simulator: von den Windgrundlagen bis zu den Mini-Rennregeln in einer Woche.',
              it: 'Week to Regatta e un tutor e simulatore di vela: dalle basi del vento alle regole della mini regata in una settimana.',
            },
          )}
        </p>
      </div>

      <div className="space-y-6 text-[var(--text-secondary)] leading-relaxed">
        {/* Contact - the primary thing Apple and users look for here. */}
        <div className="p-4 rounded-lg" style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.25)' }}>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--accent-cyan)' }}>
            {tp('Связаться с нами', 'Contact us', 'Kontakt',
              { es: 'Contactanos', fr: 'Nous contacter', de: 'Kontakt', it: 'Contattaci' })}
          </h2>
          <p className="text-sm">
            {tp(
              'Вопрос, баг или идея? Напиши на ',
              'A question, a bug, or an idea? Email ',
              'Pytanie, blad lub pomysl? Napisz na ',
              {
                es: 'Una pregunta, un error o una idea? Escribe a ',
                fr: 'Une question, un bug ou une idee ? Ecris a ',
                de: 'Eine Frage, ein Fehler oder eine Idee? Schreibe an ',
                it: 'Una domanda, un bug o un idea? Scrivi a ',
              },
            )}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[var(--accent-cyan)] hover:underline">{SUPPORT_EMAIL}</a>
            {tp(
              '. Обычно отвечаем в течение 1-2 рабочих дней. Чтобы помочь быстрее, укажи модель устройства, версию iOS и что именно происходит.',
              '. We usually reply within 1-2 business days. To help faster, include your device model, iOS version, and what exactly happens.',
              '. Zwykle odpowiadamy w 1-2 dni robocze. Aby pomoc szybciej, podaj model urzadzenia, wersje iOS i co dokladnie sie dzieje.',
              {
                es: '. Normalmente respondemos en 1-2 dias habiles. Para ayudarte mas rapido, incluye el modelo del dispositivo, la version de iOS y que ocurre exactamente.',
                fr: '. Nous repondons en general sous 1 a 2 jours ouvres. Pour aller plus vite, indique le modele de l\'appareil, la version d\'iOS et ce qui se passe exactement.',
                de: '. Wir antworten in der Regel innerhalb von 1-2 Werktagen. Fuer schnellere Hilfe nenne Geraetemodell, iOS-Version und was genau passiert.',
                it: '. Di solito rispondiamo entro 1-2 giorni lavorativi. Per aiutarti piu in fretta, indica il modello del dispositivo, la versione di iOS e cosa succede esattamente.',
              },
            )}
          </p>
        </div>

        <Section
          title={tp('Частые вопросы', 'Frequently asked', 'Czeste pytania',
            { es: 'Preguntas frecuentes', fr: 'Questions frequentes', de: 'Haeufige Fragen', it: 'Domande frequenti' })}
        >
          <div className="space-y-4 text-sm">
            <Faq
              q={tp('Нужен ли аккаунт или вход?', 'Do I need an account or sign-in?', 'Czy potrzebne jest konto lub logowanie?',
                { es: 'Necesito una cuenta o iniciar sesion?', fr: 'Faut-il un compte ou une connexion ?', de: 'Brauche ich ein Konto oder eine Anmeldung?', it: 'Serve un account o l\'accesso?' })}
              a={tp(
                'Нет. Вход не нужен, аккаунта нет. Весь прогресс хранится локально на устройстве.',
                'No. No sign-in, no account. All progress is stored locally on your device.',
                'Nie. Bez logowania i konta. Caly postep jest przechowywany lokalnie na urzadzeniu.',
                {
                  es: 'No. Sin inicio de sesion ni cuenta. Todo el progreso se guarda localmente en tu dispositivo.',
                  fr: 'Non. Pas de connexion, pas de compte. Toute la progression est stockee localement sur ton appareil.',
                  de: 'Nein. Keine Anmeldung, kein Konto. Der gesamte Fortschritt wird lokal auf dem Geraet gespeichert.',
                  it: 'No. Niente accesso, niente account. Tutti i progressi sono salvati localmente sul dispositivo.',
                },
              )}
            />
            <Faq
              q={tp('Как сбросить прогресс?', 'How do I reset my progress?', 'Jak zresetowac postep?',
                { es: 'Como reinicio mi progreso?', fr: 'Comment reinitialiser ma progression ?', de: 'Wie setze ich meinen Fortschritt zurueck?', it: 'Come azzero i progressi?' })}
              a={tp(
                'Открой Настройки -> Данные -> Очистить все данные. Это сотрёт уроки, чек-лист, историю гонок и настройки.',
                'Open Settings -> Data -> Clear all data. This wipes lessons, the checklist, race history, and preferences.',
                'Otworz Ustawienia -> Dane -> Wyczysc wszystkie dane. To usunie lekcje, liste kontrolna, historie regat i ustawienia.',
                {
                  es: 'Abre Ajustes -> Datos -> Borrar todos los datos. Esto elimina lecciones, la lista de verificacion, el historial de regatas y las preferencias.',
                  fr: 'Ouvre Reglages -> Donnees -> Tout effacer. Cela supprime les lecons, la checklist, l\'historique des courses et les preferences.',
                  de: 'Oeffne Einstellungen -> Daten -> Alles loeschen. Damit werden Lektionen, Checkliste, Rennverlauf und Einstellungen entfernt.',
                  it: 'Apri Impostazioni -> Dati -> Cancella tutti i dati. Questo elimina lezioni, checklist, cronologia gare e preferenze.',
                },
              )}
            />
            <Faq
              q={tp('Какие устройства поддерживаются?', 'Which devices are supported?', 'Jakie urzadzenia sa wspierane?',
                { es: 'Que dispositivos son compatibles?', fr: 'Quels appareils sont pris en charge ?', de: 'Welche Geraete werden unterstuetzt?', it: 'Quali dispositivi sono supportati?' })}
              a={tp(
                'iPhone и iPad с iOS 15.1 и новее. Приложение работает офлайн; интернет нужен только для отдельных действий (галерея, AI-разбор гонки).',
                'iPhone and iPad on iOS 15.1 and later. The app works offline; the internet is only needed for a few actions (gallery, AI race review).',
                'iPhone i iPad z iOS 15.1 i nowszym. Aplikacja dziala offline; internet jest potrzebny tylko do kilku akcji (galeria, analiza AI).',
                {
                  es: 'iPhone y iPad con iOS 15.1 o posterior. La app funciona sin conexion; solo se necesita internet para algunas acciones (galeria, analisis de regata con IA).',
                  fr: 'iPhone et iPad sous iOS 15.1 ou plus recent. L\'appli fonctionne hors ligne ; internet n\'est requis que pour quelques actions (galerie, analyse de course IA).',
                  de: 'iPhone und iPad ab iOS 15.1. Die App funktioniert offline; Internet wird nur fuer wenige Aktionen benoetigt (Galerie, KI-Rennanalyse).',
                  it: 'iPhone e iPad con iOS 15.1 o successivo. L\'app funziona offline; internet serve solo per alcune azioni (galleria, analisi gara con AI).',
                },
              )}
            />
            <Faq
              q={tp('Лидерборд и онлайн-гонки?', 'Leaderboard and online races?', 'Ranking i gry online?',
                { es: 'Clasificacion y carreras en linea?', fr: 'Classement et courses en ligne ?', de: 'Bestenliste und Online-Rennen?', it: 'Classifica e gare online?' })}
              a={tp(
                'В этой версии гонки и мультиплеер - локальная тренировка с ботами. Личные рекорды хранятся на устройстве. Онлайн-лидерборд появится в следующем обновлении.',
                'In this version, races and multiplayer are local practice against bots. Personal bests are kept on the device. An online leaderboard is coming in a later update.',
                'W tej wersji regaty i multiplayer to lokalny trening z botami. Rekordy sa na urzadzeniu. Ranking online pojawi sie w kolejnej aktualizacji.',
                {
                  es: 'En esta version, las regatas y el multijugador son practica local contra bots. Los records se guardan en el dispositivo. La clasificacion en linea llegara en una actualizacion posterior.',
                  fr: 'Dans cette version, les courses et le multijoueur sont un entrainement local contre des bots. Les records restent sur l\'appareil. Un classement en ligne arrivera dans une mise a jour ulterieure.',
                  de: 'In dieser Version sind Rennen und Mehrspieler ein lokales Training gegen Bots. Bestzeiten bleiben auf dem Geraet. Eine Online-Bestenliste folgt in einem spaeteren Update.',
                  it: 'In questa versione, gare e multiplayer sono allenamento locale contro i bot. I record restano sul dispositivo. Una classifica online arrivera in un aggiornamento successivo.',
                },
              )}
            />
          </div>
        </Section>

        <Section
          title={tp('Конфиденциальность', 'Privacy', 'Prywatnosc',
            { es: 'Privacidad', fr: 'Confidentialite', de: 'Datenschutz', it: 'Privacy' })}
        >
          <p className="text-sm">
            {tp(
              'Приложение не собирает данные, не отслеживает тебя и ничего не передаёт третьим лицам. Подробности - в ',
              'The app collects no data, does not track you, and shares nothing with third parties. Details are in the ',
              'Aplikacja nie zbiera danych, nie sledzi cie i nic nie przekazuje stronom trzecim. Szczegoly w ',
              {
                es: 'La app no recopila datos, no te rastrea y no comparte nada con terceros. Los detalles estan en la ',
                fr: 'L\'appli ne collecte aucune donnee, ne te suit pas et ne partage rien avec des tiers. Les details sont dans la ',
                de: 'Die App erfasst keine Daten, verfolgt dich nicht und teilt nichts mit Dritten. Details in der ',
                it: 'L\'app non raccoglie dati, non ti traccia e non condivide nulla con terze parti. I dettagli sono nella ',
              },
            )}
            <a href="/privacy" className="text-[var(--accent-cyan)] hover:underline">
              {tp('Политике конфиденциальности', 'Privacy Policy', 'Polityce prywatnosci',
                { es: 'Politica de privacidad', fr: 'Politique de confidentialite', de: 'Datenschutzerklaerung', it: 'Politica sulla privacy' })}
            </a>
            {tp('.', '.', '.', { es: '.', fr: '.', de: '.', it: '.' })}
          </p>
        </Section>
      </div>

      <ContentFooterNav page="/onboard" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-3 text-[var(--text-primary)]">{title}</h2>
      {children}
    </section>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <p className="font-semibold text-[var(--text-primary)]">{q}</p>
      <p className="text-[var(--text-secondary)]">{a}</p>
    </div>
  );
}
