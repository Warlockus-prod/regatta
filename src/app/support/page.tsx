'use client';

import { useI18n } from '@/lib/i18n';
import ContentFooterNav from '@/components/ContentFooterNav';
import { useState, useEffect } from 'react';

// Support page at /support. This is the URL set as the App Store "Support URL"
// (mobile/asc-metadata/<lang>/support_url.txt -> weektoregatta.com/support).
// Apple requires the Support URL to resolve (HTTP 200) and to offer a real way
// to get help, otherwise the submission is metadata-rejected.
//
// Two channels are offered:
//   1. In-page contact form -> POST /api/support -> Telegram (operator gets a
//      push within seconds; no IMAP polling required).
//   2. Email fallback to SUPPORT_EMAIL (for users who prefer their mail client
//      or for attachments). Both are kept visible so Apple and users always
//      have a working route.

const SUPPORT_EMAIL = 'support@gtframe.io';

export default function SupportPage() {
  const { tp, lang } = useI18n();

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
        <ContactForm lang={lang} />

        <div className="p-4 rounded-lg" style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.25)' }}>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--accent-cyan)' }}>
            {tp('Или просто напиши на email', 'Or just email us', 'Albo napisz na email',
              { es: 'O escribenos por correo', fr: 'Ou ecris-nous par email', de: 'Oder schreib uns per E-Mail', it: 'O scrivici via email' })}
          </h2>
          <p className="text-sm">
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[var(--accent-cyan)] hover:underline">{SUPPORT_EMAIL}</a>
            {tp(
              ' - удобно, если хочешь приложить скриншот или ответить с твоего почтового клиента. Обычно отвечаем в течение 1-2 рабочих дней.',
              ' - convenient if you want to attach a screenshot or reply from your mail client. We usually respond within 1-2 business days.',
              ' - wygodne, jesli chcesz dolaczyc zrzut ekranu albo odpowiedziec ze swojego klienta poczty. Odpowiadamy zwykle w 1-2 dni robocze.',
              {
                es: ' - util si quieres adjuntar una captura o responder desde tu cliente de correo. Solemos responder en 1-2 dias habiles.',
                fr: ' - pratique si tu veux joindre une capture ou repondre depuis ton client mail. Nous repondons en general sous 1-2 jours ouvres.',
                de: ' - praktisch, wenn du einen Screenshot anhaengen oder von deinem Mail-Client antworten moechtest. Antwort meist in 1-2 Werktagen.',
                it: ' - utile se vuoi allegare uno screenshot o rispondere dal tuo client di posta. Di solito rispondiamo entro 1-2 giorni lavorativi.',
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

// ----------------- Contact form -----------------

type FormState = 'idle' | 'sending' | 'ok' | 'err' | 'limit';

function ContactForm({ lang }: { lang: string }) {
  const { tp } = useI18n();
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [state, setState] = useState<FormState>('idle');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (state === 'ok') {
      const t = setTimeout(() => setState('idle'), 5000);
      return () => clearTimeout(t);
    }
  }, [state]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    const trimmed = message.trim();
    if (trimmed.length < 2) {
      setErrMsg(tp('Слишком короткое сообщение', 'Message is too short', 'Wiadomosc jest za krotka',
        { es: 'Mensaje demasiado corto', fr: 'Message trop court', de: 'Nachricht zu kurz', it: 'Messaggio troppo corto' }));
      setState('err');
      return;
    }
    setState('sending');
    setErrMsg('');
    try {
      const resp = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          contact: contact.trim() || undefined,
          company, // honeypot: empty for humans
          path: typeof window !== 'undefined' ? window.location.pathname : '',
          language: lang,
        }),
      });
      if (resp.status === 429) {
        setState('limit');
        return;
      }
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        setErrMsg(typeof j.error === 'string' ? j.error : `HTTP ${resp.status}`);
        setState('err');
        return;
      }
      setMessage('');
      setContact('');
      setState('ok');
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Network error');
      setState('err');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 rounded-lg space-y-3"
          style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.25)' }}>
      <h2 className="text-lg font-semibold" style={{ color: 'var(--accent-cyan)' }}>
        {tp('Напиши нам прямо здесь', 'Write to us right here', 'Napisz do nas tutaj',
          { es: 'Escribenos aqui mismo', fr: 'Ecris-nous ici', de: 'Schreib uns direkt hier', it: 'Scrivici direttamente qui' })}
      </h2>
      <p className="text-xs text-[var(--text-muted)]">
        {tp(
          'Сообщение придёт нам мгновенно. Если хочешь ответа - оставь email или Telegram. Без логина, без аккаунта.',
          'Your message reaches us instantly. If you want a reply, leave an email or Telegram. No sign-in, no account.',
          'Wiadomosc dotrze do nas natychmiast. Jesli chcesz odpowiedzi, podaj email lub Telegram. Bez logowania, bez konta.',
          {
            es: 'Tu mensaje nos llega al instante. Si quieres respuesta, deja un email o Telegram. Sin inicio de sesion, sin cuenta.',
            fr: 'Ton message nous parvient immediatement. Si tu veux une reponse, laisse un email ou un Telegram. Sans connexion, sans compte.',
            de: 'Deine Nachricht erreicht uns sofort. Wenn du eine Antwort willst, hinterlasse E-Mail oder Telegram. Keine Anmeldung, kein Konto.',
            it: 'Il tuo messaggio ci arriva subito. Se vuoi una risposta, lascia email o Telegram. Niente accesso, niente account.',
          },
        )}
      </p>

      <div>
        <label htmlFor="support-message" className="text-xs font-medium block mb-1 text-[var(--text-secondary)]">
          {tp('Сообщение', 'Message', 'Wiadomosc',
            { es: 'Mensaje', fr: 'Message', de: 'Nachricht', it: 'Messaggio' })}
          <span className="text-[var(--text-muted)]"> *</span>
        </label>
        <textarea
          id="support-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={5}
          maxLength={4000}
          className="w-full rounded-md px-3 py-2 text-sm"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          placeholder={tp(
            'Опиши вопрос, баг или идею. Если про баг - укажи модель устройства и iOS.',
            'Describe a question, bug, or idea. If a bug, please add device model and iOS version.',
            'Opisz pytanie, blad lub pomysl. Jesli blad - dodaj model urzadzenia i wersje iOS.',
            {
              es: 'Describe una pregunta, error o idea. Si es un error, indica el modelo del dispositivo y la version de iOS.',
              fr: 'Decris une question, un bug ou une idee. Pour un bug, indique le modele de l\'appareil et la version iOS.',
              de: 'Beschreibe eine Frage, einen Fehler oder eine Idee. Bei einem Fehler bitte Geraetemodell und iOS-Version angeben.',
              it: 'Descrivi una domanda, un bug o un idea. Per un bug, indica modello del dispositivo e versione iOS.',
            },
          )}
        />
      </div>

      <div>
        <label htmlFor="support-contact" className="text-xs font-medium block mb-1 text-[var(--text-secondary)]">
          {tp('Контакт для ответа (опционально)', 'Reply contact (optional)', 'Kontakt do odpowiedzi (opcjonalnie)',
            { es: 'Contacto para responder (opcional)', fr: 'Contact pour reponse (optionnel)', de: 'Kontakt fuer Antwort (optional)', it: 'Contatto per la risposta (opzionale)' })}
        </label>
        <input
          id="support-contact"
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          maxLength={200}
          className="w-full rounded-md px-3 py-2 text-sm"
          style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          placeholder="email / @telegram"
        />
      </div>

      {/* Honeypot: hidden from real users via aria + off-screen position.
          Bots that fill every field will be silently dropped server-side. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
        <label htmlFor="support-company">Company</label>
        <input
          id="support-company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={state === 'sending'}
          className="px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-60"
          style={{ background: 'var(--accent-cyan)', color: '#001018' }}
        >
          {state === 'sending'
            ? tp('Отправка...', 'Sending...', 'Wysylanie...',
                { es: 'Enviando...', fr: 'Envoi...', de: 'Senden...', it: 'Invio...' })
            : tp('Отправить', 'Send', 'Wyslij',
                { es: 'Enviar', fr: 'Envoyer', de: 'Senden', it: 'Invia' })}
        </button>
        {state === 'ok' && (
          <span className="text-sm" style={{ color: 'var(--success, #44ff88)' }} role="status">
            {tp('Получили! Спасибо.', 'Got it. Thanks!', 'Mamy! Dzieki.',
              { es: 'Recibido! Gracias.', fr: 'Bien recu, merci !', de: 'Erhalten. Danke!', it: 'Ricevuto, grazie!' })}
          </span>
        )}
        {state === 'limit' && (
          <span className="text-sm text-[var(--text-muted)]" role="status">
            {tp('Слишком часто. Попробуй через час.', 'Too many requests. Try again in an hour.', 'Zbyt czesto. Sprobuj za godzine.',
              { es: 'Demasiadas solicitudes. Intenta en una hora.', fr: 'Trop de requetes. Reessaie dans une heure.', de: 'Zu viele Anfragen. Versuch es in einer Stunde.', it: 'Troppe richieste. Riprova tra un\'ora.' })}
          </span>
        )}
        {state === 'err' && (
          <span className="text-sm" style={{ color: '#ff6e6e' }} role="alert">
            {errMsg || tp('Не удалось отправить', 'Failed to send', 'Nie udalo sie wyslac',
              { es: 'No se pudo enviar', fr: 'Echec de l\'envoi', de: 'Senden fehlgeschlagen', it: 'Invio non riuscito' })}
          </span>
        )}
      </div>
    </form>
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
