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
            'Week to Regatta to trenażer i kurs żeglarstwa: w tydzień od podstaw wiatru do zasad mini-regat.',
            {
              es: 'Week to Regatta es un tutor y simulador de vela: de lo básico del viento a las reglas de una mini regata en una semana.',
              fr: "Week to Regatta est un tuteur et simulateur de voile : des bases du vent aux règles d'une mini-régate, en une semaine.",
              de: 'Week to Regatta ist Segelkurs und Simulator in einem: in einer Woche von den Grundlagen des Windes bis zu den Regeln einer Mini-Regatta.',
              it: 'Week to Regatta è un tutor e simulatore di vela: dalle basi del vento alle regole di una mini regata in una settimana.',
            },
          )}
        </p>
      </div>

      <div className="space-y-6 text-[var(--text-secondary)] leading-relaxed">
        <ContactForm lang={lang} />

        <div className="p-4 rounded-lg" style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.25)' }}>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--accent-cyan)' }}>
            {tp('Или просто напиши на email', 'Or just email us', 'Albo napisz na email',
              { es: 'O escríbenos por correo', fr: 'Ou écris-nous par e-mail', de: 'Oder schreib uns per E-Mail', it: 'O scrivici via email' })}
          </h2>
          <p className="text-sm">
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[var(--accent-cyan)] hover:underline">{SUPPORT_EMAIL}</a>
            {tp(
              ' - удобно, если хочешь приложить скриншот или ответить с твоего почтового клиента. Обычно отвечаем в течение 1-2 рабочих дней.',
              ' - convenient if you want to attach a screenshot or reply from your mail client. We usually respond within 1-2 business days.',
              ' - wygodne, jeśli chcesz dołączyć zrzut ekranu albo odpowiedzieć ze swojego programu pocztowego. Zwykle odpowiadamy w ciągu 1-2 dni roboczych.',
              {
                es: ' - útil si quieres adjuntar una captura o responder desde tu cliente de correo. Solemos responder en 1-2 días hábiles.',
                fr: " - pratique si tu veux joindre une capture d'écran ou répondre depuis ta messagerie. Nous répondons en général sous 1-2 jours ouvrés.",
                de: ' - praktisch, wenn du einen Screenshot anhängen oder aus deinem Mailprogramm antworten möchtest. Wir antworten meist innerhalb von 1-2 Werktagen.',
                it: ' - utile se vuoi allegare uno screenshot o rispondere dal tuo client di posta. Di solito rispondiamo entro 1-2 giorni lavorativi.',
              },
            )}
          </p>
        </div>

        <Section
          title={tp('Частые вопросы', 'Frequently asked', 'Częste pytania',
            { es: 'Preguntas frecuentes', fr: 'Questions fréquentes', de: 'Häufige Fragen', it: 'Domande frequenti' })}
        >
          <div className="space-y-4 text-sm">
            <Faq
              q={tp('Нужен ли аккаунт или вход?', 'Do I need an account or sign-in?', 'Czy potrzebne jest konto lub logowanie?',
                { es: '¿Necesito una cuenta o iniciar sesión?', fr: 'Faut-il un compte ou une connexion ?', de: 'Brauche ich ein Konto oder eine Anmeldung?', it: 'Serve un account o l\'accesso?' })}
              a={tp(
                'Нет. Вход не нужен, аккаунта нет. Весь прогресс хранится локально на устройстве.',
                'No. No sign-in, no account. All progress is stored locally on your device.',
                'Nie. Bez logowania i bez konta. Cały postęp jest przechowywany lokalnie na urządzeniu.',
                {
                  es: 'No. Sin inicio de sesión ni cuenta. Todo el progreso se guarda localmente en tu dispositivo.',
                  fr: 'Non. Pas de connexion, pas de compte. Toute ta progression est stockée localement sur ton appareil.',
                  de: 'Nein. Keine Anmeldung, kein Konto. Der gesamte Fortschritt wird lokal auf deinem Gerät gespeichert.',
                  it: 'No. Niente accesso, niente account. Tutti i progressi sono salvati localmente sul dispositivo.',
                },
              )}
            />
            <Faq
              q={tp('Как сбросить прогресс?', 'How do I reset my progress?', 'Jak wyzerować postęp?',
                { es: '¿Cómo reinicio mi progreso?', fr: 'Comment réinitialiser ma progression ?', de: 'Wie setze ich meinen Fortschritt zurück?', it: 'Come azzero i progressi?' })}
              a={tp(
                'Открой Настройки -> Данные -> Очистить все данные. Это сотрёт уроки, чек-лист, историю гонок и настройки.',
                'Open Settings -> Data -> Clear all data. This wipes lessons, the checklist, race history, and preferences.',
                'Otwórz Ustawienia -> Dane -> Wyczyść wszystkie dane. To usunie lekcje, listę kontrolną, historię wyścigów i ustawienia.',
                {
                  es: 'Abre Ajustes -> Datos -> Borrar todos los datos. Esto borra las lecciones, la checklist, el historial de regatas y las preferencias.',
                  fr: "Ouvre Réglages -> Données -> Effacer toutes les données. Cela supprime les leçons, la check-list, l'historique des courses et les préférences.",
                  de: 'Öffne Einstellungen -> Daten -> Alle Daten löschen. Damit werden Lektionen, Checkliste, Rennverlauf und Einstellungen gelöscht.',
                  it: 'Apri Impostazioni -> Dati -> Cancella tutti i dati. Questo elimina lezioni, checklist, cronologia delle regate e preferenze.',
                },
              )}
            />
            <Faq
              q={tp('Какие устройства поддерживаются?', 'Which devices are supported?', 'Jakie urządzenia są obsługiwane?',
                { es: '¿Qué dispositivos son compatibles?', fr: 'Quels appareils sont pris en charge ?', de: 'Welche Geräte werden unterstützt?', it: 'Quali dispositivi sono supportati?' })}
              a={tp(
                'iPhone и iPad с iOS 15.1 и новее. Приложение работает офлайн; интернет нужен только для отдельных действий (галерея, AI-разбор гонки).',
                'iPhone and iPad on iOS 15.1 and later. The app works offline; the internet is only needed for a few actions (gallery, AI race review).',
                'iPhone i iPad z iOS 15.1 lub nowszym. Aplikacja działa offline; internet jest potrzebny tylko do kilku funkcji (galeria, analiza wyścigu przez AI).',
                {
                  es: 'iPhone y iPad con iOS 15.1 o posterior. La app funciona sin conexión; solo necesitas internet para algunas acciones (galería, análisis de regata con IA).',
                  fr: "iPhone et iPad sous iOS 15.1 ou plus récent. L'appli fonctionne hors ligne ; internet n'est nécessaire que pour quelques actions (galerie, analyse de course par IA).",
                  de: 'iPhone und iPad ab iOS 15.1. Die App funktioniert offline; Internet brauchst du nur für wenige Aktionen (Galerie, KI-Rennanalyse).',
                  it: "iPhone e iPad con iOS 15.1 o successivo. L'app funziona offline; internet serve solo per alcune azioni (galleria, analisi della regata con IA).",
                },
              )}
            />
            <Faq
              q={tp('Лидерборд и онлайн-гонки?', 'Leaderboard and online races?', 'Ranking i wyścigi online?',
                { es: '¿Clasificación y regatas en línea?', fr: 'Classement et courses en ligne ?', de: 'Bestenliste und Online-Rennen?', it: 'Classifica e gare online?' })}
              a={tp(
                'История твоих гонок хранится на устройстве. Общий лидерборд и мультиплеер уже работают онлайн - на сайте и в приложении.',
                'Your race history stays on your device. The global leaderboard and multiplayer already work online, on the website and in the app.',
                'Historia Twoich wyścigów zostaje na urządzeniu. Globalny ranking i tryb multiplayer działają już online - na stronie i w aplikacji.',
                {
                  es: 'Tu historial de regatas se queda en tu dispositivo. La clasificación global y el multijugador ya funcionan en línea, en la web y en la app.',
                  fr: "L'historique de tes courses reste sur ton appareil. Le classement général et le multijoueur fonctionnent déjà en ligne, sur le site et dans l'appli.",
                  de: 'Dein Rennverlauf bleibt auf deinem Gerät. Die globale Rangliste und der Mehrspielermodus funktionieren bereits online, auf der Website und in der App.',
                  it: "La cronologia delle tue regate resta sul dispositivo. La classifica globale e il multiplayer funzionano già online, sul sito e nell'app.",
                },
              )}
            />
          </div>
        </Section>

        <Section
          title={tp('Конфиденциальность', 'Privacy', 'Prywatność',
            { es: 'Privacidad', fr: 'Confidentialité', de: 'Datenschutz', it: 'Privacy' })}
        >
          <p className="text-sm">
            {tp(
              'Аккаунта нет, и личные данные приложение не собирает. Оно отправляет только анонимную обобщённую аналитику (просмотры экранов и события гонки), не привязанную к твоей личности; её можно выключить в Настройки -> Данные -> Анонимная аналитика. Подробности - в ',
              'There is no account, and the app does not collect personal data. It only sends anonymous, aggregate analytics (screen views and race events) that are not linked to your identity; you can turn them off in Settings -> Data -> Anonymous analytics. Details are in the ',
              'Nie ma konta, a aplikacja nie zbiera danych osobowych. Wysyła tylko anonimowe, zbiorcze dane analityczne (wyświetlenia ekranów i zdarzenia wyścigu), niepowiązane z Twoją tożsamością; możesz je wyłączyć w Ustawienia -> Dane -> Anonimowa analityka. Szczegóły w ',
              {
                es: 'No hay cuenta y la app no recopila datos personales. Solo envía analítica anónima y agregada (vistas de pantalla y eventos de regata), no vinculada a tu identidad; puedes desactivarla en Ajustes -> Datos -> Analítica anónima. Los detalles están en la ',
                fr: "Il n'y a pas de compte, et l'appli ne collecte aucune donnée personnelle. Elle envoie seulement des statistiques d'usage anonymes et agrégées (écrans consultés et événements de course), non liées à ton identité ; tu peux les désactiver dans Réglages -> Données -> Statistiques anonymes. Les détails sont dans la ",
                de: 'Es gibt kein Konto, und die App erfasst keine personenbezogenen Daten. Sie sendet nur anonyme, aggregierte Analysen (Bildschirmaufrufe und Rennereignisse), die nicht mit deiner Identität verknüpft sind; du kannst sie unter Einstellungen -> Daten -> Anonyme Analyse abschalten. Details in der ',
                it: "Non c'è nessun account e l'app non raccoglie dati personali. Invia solo statistiche d'uso anonime e aggregate (visualizzazioni delle schermate ed eventi di regata), non collegate alla tua identità; puoi disattivarle in Impostazioni -> Dati -> Statistiche anonime. I dettagli sono nell'",
              },
            )}
            <a href="/privacy" className="text-[var(--accent-cyan)] hover:underline">
              {tp('Политике конфиденциальности', 'Privacy Policy', 'Polityce prywatności',
                { es: 'Política de privacidad', fr: 'Politique de confidentialité', de: 'Datenschutzerklärung', it: 'Informativa sulla privacy' })}
            </a>
            {tp('.', '.', '.', { es: '.', fr: '.', de: '.', it: '.' })}
          </p>
        </Section>
      </div>

      <ContentFooterNav page="/support" />
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
      setErrMsg(tp('Слишком короткое сообщение', 'Message is too short', 'Wiadomość jest za krótka',
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
      setErrMsg(err instanceof Error ? err.message : tp('Ошибка сети', 'Network error', 'Błąd sieci',
        { es: 'Error de red', fr: 'Erreur réseau', de: 'Netzwerkfehler', it: 'Errore di rete' }));
      setState('err');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 rounded-lg space-y-3"
          style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid rgba(0, 212, 255, 0.25)' }}>
      <h2 className="text-lg font-semibold" style={{ color: 'var(--accent-cyan)' }}>
        {tp('Напиши нам прямо здесь', 'Write to us right here', 'Napisz do nas tutaj',
          { es: 'Escríbenos aquí mismo', fr: 'Écris-nous ici', de: 'Schreib uns direkt hier', it: 'Scrivici direttamente qui' })}
      </h2>
      <p className="text-xs text-[var(--text-muted)]">
        {tp(
          'Сообщение придёт нам мгновенно. Если хочешь ответа - оставь email или Telegram. Без логина, без аккаунта.',
          'Your message reaches us instantly. If you want a reply, leave an email or Telegram. No sign-in, no account.',
          'Wiadomość dotrze do nas od razu. Jeśli chcesz odpowiedzi, zostaw e-mail lub Telegram. Bez logowania, bez konta.',
          {
            es: 'Tu mensaje nos llega al instante. Si quieres respuesta, deja un email o tu Telegram. Sin inicio de sesión, sin cuenta.',
            fr: 'Ton message nous parvient immédiatement. Si tu veux une réponse, laisse un e-mail ou ton Telegram. Sans connexion, sans compte.',
            de: 'Deine Nachricht erreicht uns sofort. Wenn du eine Antwort möchtest, hinterlass deine E-Mail oder deinen Telegram-Namen. Keine Anmeldung, kein Konto.',
            it: 'Il tuo messaggio ci arriva subito. Se vuoi una risposta, lascia email o Telegram. Niente accesso, niente account.',
          },
        )}
      </p>

      <div>
        <label htmlFor="support-message" className="text-xs font-medium block mb-1 text-[var(--text-secondary)]">
          {tp('Сообщение', 'Message', 'Wiadomość',
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
            'Opisz pytanie, błąd lub pomysł. Jeśli to błąd, dodaj model urządzenia i wersję iOS.',
            {
              es: 'Describe una pregunta, un error o una idea. Si es un error, indica el modelo del dispositivo y la versión de iOS.',
              fr: "Décris une question, un bug ou une idée. Pour un bug, indique le modèle de l'appareil et la version d'iOS.",
              de: 'Beschreibe deine Frage, einen Fehler oder eine Idee. Bei einem Fehler gib bitte Gerätemodell und iOS-Version an.',
              it: "Descrivi una domanda, un bug o un'idea. Per un bug, indica il modello del dispositivo e la versione di iOS.",
            },
          )}
        />
      </div>

      <div>
        <label htmlFor="support-contact" className="text-xs font-medium block mb-1 text-[var(--text-secondary)]">
          {tp('Контакт для ответа (опционально)', 'Reply contact (optional)', 'Kontakt do odpowiedzi (opcjonalnie)',
            { es: 'Contacto para responder (opcional)', fr: 'Contact pour la réponse (facultatif)', de: 'Kontakt für die Antwort (optional)', it: 'Contatto per la risposta (facoltativo)' })}
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
            ? tp('Отправка...', 'Sending...', 'Wysyłanie...',
                { es: 'Enviando...', fr: 'Envoi...', de: 'Wird gesendet...', it: 'Invio...' })
            : tp('Отправить', 'Send', 'Wyślij',
                { es: 'Enviar', fr: 'Envoyer', de: 'Senden', it: 'Invia' })}
        </button>
        {state === 'ok' && (
          <span className="text-sm" style={{ color: 'var(--success, #44ff88)' }} role="status">
            {tp('Получили! Спасибо.', 'Got it. Thanks!', 'Dotarło! Dzięki.',
              { es: '¡Recibido! Gracias.', fr: 'Bien reçu, merci !', de: 'Erhalten. Danke!', it: 'Ricevuto, grazie!' })}
          </span>
        )}
        {state === 'limit' && (
          <span className="text-sm text-[var(--text-muted)]" role="status">
            {tp('Слишком часто. Попробуй через час.', 'Too many requests. Try again in an hour.', 'Zbyt często. Spróbuj za godzinę.',
              { es: 'Demasiadas solicitudes. Inténtalo dentro de una hora.', fr: 'Trop de requêtes. Réessaie dans une heure.', de: 'Zu viele Anfragen. Versuch es in einer Stunde.', it: 'Troppe richieste. Riprova tra un\'ora.' })}
          </span>
        )}
        {state === 'err' && (
          <span className="text-sm" style={{ color: '#ff6e6e' }} role="alert">
            {errMsg || tp('Не удалось отправить', 'Failed to send', 'Nie udało się wysłać',
              { es: 'No se pudo enviar', fr: "Échec de l'envoi", de: 'Senden fehlgeschlagen', it: 'Invio non riuscito' })}
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
