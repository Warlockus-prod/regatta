'use client';

import { useI18n } from '@/lib/i18n';
import ContentFooterNav from '@/components/ContentFooterNav';

// Privacy policy at /privacy. Linked from mobile app + web nav footer.
// Required for App Store submission (Apple Guideline 5.1.1). Keep it
// in plain language, honest, and reflect what the app actually does
// rather than the lawyer-template version. Update this when collection
// behavior changes (notably in /api/log and /api/race-result).

export default function PrivacyPage() {
  const { tp } = useI18n();

  return (
    <div className="page-enter max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-medium"
             style={{ background: 'rgba(0, 212, 255, 0.08)', border: '1px solid rgba(0, 212, 255, 0.2)', color: 'var(--accent-cyan)' }}>
          {tp('Конфиденциальность', 'Privacy', 'Prywatność',
            { es: 'Privacidad', fr: 'Confidentialité', de: 'Datenschutz', it: 'Privacy' })}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {tp('Политика конфиденциальности', 'Privacy Policy', 'Polityka prywatności',
            { es: 'Política de privacidad', fr: 'Politique de confidentialité', de: 'Datenschutzerklärung', it: 'Informativa sulla privacy' })}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          {tp('Обновлено: 2026-07-10', 'Updated: 2026-07-10', 'Aktualizacja: 2026-07-10',
            { es: 'Actualizado: 2026-07-10', fr: 'Mis à jour : 2026-07-10', de: 'Aktualisiert: 2026-07-10', it: 'Aggiornato: 2026-07-10' })}
        </p>
      </div>

      <div className="space-y-6 text-[var(--text-secondary)] leading-relaxed">
        {/* iOS app callout: the native app sends ANONYMOUS product analytics
            (PostHog, opt-out in Settings), no personal data, no cross-app
            tracking. This MUST stay consistent with the App Store App Privacy
            label (Data Collected: Analytics / Product Interaction, not linked
            to identity, not used for tracking) and with
            mobile/asc-metadata/PRIVACY_POLICY.md + the in-app Settings text.
            The sections below describe the WEBSITE, which uses GA4. */}
        <div className="p-4 rounded-lg" style={{ background: 'rgba(68, 255, 136, 0.06)', border: '1px solid rgba(68, 255, 136, 0.25)' }}>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--success)' }}>
            {tp('Приложение для iPhone / iPad', 'iPhone / iPad app', 'Aplikacja na iPhone / iPad',
              { es: 'Aplicación para iPhone / iPad', fr: 'Application iPhone / iPad', de: 'App für iPhone / iPad', it: 'App per iPhone / iPad' })}
          </h2>
          <p className="text-sm">
            {tp(
              'Приложение «Week to Regatta» отправляет анонимную обобщённую продуктовую аналитику (просмотры экранов и события гонки, с пометкой языка и версии приложения), чтобы мы могли его улучшать. Это не привязано к твоей личности и никогда не используется для трекинга между приложениями; это можно выключить в Настройки -> Данные -> Анонимная аналитика. Больше ничего не покидает устройство: весь прогресс хранится локально (iOS AsyncStorage) и стирается в Настройки -> Данные -> Очистить все данные. Остальная сеть используется только когда ты сам запускаешь: галерея, AI-разбор гонки, баннер дневного челленджа. Разделы ниже описывают САЙТ weektoregatta.com.',
              'The "Week to Regatta" app sends anonymous, aggregate product analytics (screen views and race events, tagged with app language and version) to help us improve it. This is not linked to your identity and is never used for cross-app tracking; you can turn it off in Settings -> Data -> Anonymous analytics. Nothing else leaves your device: all progress is stored locally (iOS AsyncStorage) and wiped from Settings -> Data -> Clear all data. Other network use happens only on actions you start: gallery, AI race review, daily-challenge banner. The sections below describe the WEBSITE weektoregatta.com.',
              'Aplikacja "Week to Regatta" wysyła anonimowe, zbiorcze dane analityczne (wyświetlenia ekranów i zdarzenia wyścigu, oznaczone językiem i wersją aplikacji), abyśmy mogli ją ulepszać. Nie są one powiązane z Twoją tożsamością i nigdy nie służą do śledzenia między aplikacjami; możesz je wyłączyć w Ustawienia -> Dane -> Anonimowa analityka. Nic więcej nie opuszcza urządzenia: cały postęp jest przechowywany lokalnie (iOS AsyncStorage) i można go skasować w Ustawienia -> Dane -> Wyczyść wszystkie dane. Z sieci aplikacja korzysta poza tym tylko wtedy, gdy sam coś uruchomisz: galerię, analizę wyścigu przez AI, baner wyzwania dnia. Sekcje poniżej opisują STRONĘ weektoregatta.com.',
              {
                es: 'La aplicación "Week to Regatta" envía analítica de producto anónima y agregada (vistas de pantalla y eventos de regata, etiquetados con el idioma y la versión de la app) para ayudarnos a mejorarla. No se vincula a tu identidad y nunca se usa para el seguimiento entre apps; puedes desactivarla en Ajustes -> Datos -> Analítica anónima. Nada más sale de tu dispositivo: todo el progreso se guarda localmente (iOS AsyncStorage) y se borra en Ajustes -> Datos -> Borrar todos los datos. El resto del uso de la red solo ocurre con acciones que inicias tú: galería, análisis de regata con IA, banner del reto diario. Las secciones siguientes describen el SITIO WEB weektoregatta.com.',
                fr: 'L\'application "Week to Regatta" envoie des statistiques d\'usage anonymes et agrégées (écrans consultés et événements de course, avec la langue et la version de l\'app) pour nous aider à l\'améliorer. Elles ne sont pas liées à ton identité et ne servent jamais au suivi entre applications ; tu peux les désactiver dans Réglages -> Données -> Statistiques anonymes. Rien d\'autre ne quitte ton appareil : toute ta progression est stockée localement (iOS AsyncStorage) et s\'efface dans Réglages -> Données -> Effacer toutes les données. Le reste de l\'accès réseau ne sert qu\'aux actions que tu lances toi-même : galerie, analyse de course par IA, bannière du défi du jour. Les sections ci-dessous décrivent le SITE weektoregatta.com.',
                de: 'Die App "Week to Regatta" sendet anonyme, aggregierte Produktanalysen (Bildschirmaufrufe und Rennereignisse, versehen mit App-Sprache und -Version), damit wir sie verbessern können. Diese Daten sind nicht mit deiner Identität verknüpft und werden nie für App-übergreifendes Tracking verwendet; du kannst sie unter Einstellungen -> Daten -> Anonyme Analyse abschalten. Sonst verlässt nichts dein Gerät: Der gesamte Fortschritt wird lokal gespeichert (iOS AsyncStorage) und unter Einstellungen -> Daten -> Alle Daten löschen entfernt. Weitere Netzwerkzugriffe gibt es nur bei Aktionen, die du selbst startest: Galerie, KI-Rennanalyse, Banner der Tages-Challenge. Die Abschnitte unten beschreiben die WEBSITE weektoregatta.com.',
                it: 'L\'app "Week to Regatta" invia statistiche d\'uso anonime e aggregate (visualizzazioni delle schermate ed eventi di regata, contrassegnati con lingua e versione dell\'app) per aiutarci a migliorarla. Non sono collegate alla tua identità e non vengono mai usate per il tracciamento tra app; puoi disattivarle in Impostazioni -> Dati -> Statistiche anonime. Nient\'altro lascia il tuo dispositivo: tutti i progressi sono salvati localmente (iOS AsyncStorage) e si cancellano da Impostazioni -> Dati -> Cancella tutti i dati. La rete viene usata solo per le azioni che avvii tu: galleria, analisi della regata con IA, banner della sfida del giorno. Le sezioni qui sotto descrivono il SITO weektoregatta.com.',
              },
            )}
          </p>
        </div>

        <h2 className="text-2xl font-bold pt-2 text-[var(--text-primary)]">
          {tp('Сайт weektoregatta.com', 'Website weektoregatta.com', 'Strona weektoregatta.com',
            { es: 'Sitio weektoregatta.com', fr: 'Site weektoregatta.com', de: 'Website weektoregatta.com', it: 'Sito weektoregatta.com' })}
        </h2>

        <Section
          title={tp('Что мы собираем', 'What we collect', 'Co zbieramy',
            { es: 'Qué recopilamos', fr: 'Ce que nous collectons', de: 'Was wir erfassen', it: 'Cosa raccogliamo' })}
        >
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>
              {tp(
                'Технические события: открытие страниц, ошибки JavaScript, размер окна, язык браузера, тип устройства. Сохраняются в нашу базу для анализа стабильности.',
                'Technical events: page opens, JavaScript errors, viewport size, browser language, device type. Stored in our database for stability analysis.',
                'Zdarzenia techniczne: otwarcia stron, błędy JavaScript, rozmiar okna, język przeglądarki, typ urządzenia. Zapisujemy je w naszej bazie danych do analizy stabilności.',
                {
                  es: 'Eventos técnicos: aperturas de páginas, errores de JavaScript, tamaño de la ventana, idioma del navegador, tipo de dispositivo. Se guardan en nuestra base de datos para analizar la estabilidad.',
                  fr: "Événements techniques : ouvertures de pages, erreurs JavaScript, taille de la fenêtre, langue du navigateur, type d'appareil. Conservés dans notre base de données pour analyser la stabilité.",
                  de: 'Technische Ereignisse: Seitenaufrufe, JavaScript-Fehler, Fenstergröße, Browsersprache, Gerätetyp. Gespeichert in unserer Datenbank zur Stabilitätsanalyse.',
                  it: "Eventi tecnici: aperture di pagine, errori JavaScript, dimensione della finestra, lingua del browser, tipo di dispositivo. Salvati nel nostro database per l'analisi della stabilità.",
                },
              )}
            </li>
            <li>
              {tp(
                'Результаты гонок: время финиша, уровень сложности, выбранный никнейм. Сохраняются для лидерборда.',
                'Race results: finish time, difficulty level, chosen nickname. Stored for the leaderboard.',
                'Wyniki wyścigów: czas na mecie, poziom trudności, wybrany pseudonim. Zapisywane na potrzeby rankingu.',
                {
                  es: 'Resultados de regata: tiempo de llegada, nivel de dificultad, apodo elegido. Se guardan para la clasificación.',
                  fr: "Résultats de course : temps à l'arrivée, niveau de difficulté, pseudo choisi. Conservés pour le classement.",
                  de: 'Rennergebnisse: Zielzeit, Schwierigkeitsstufe, gewählter Spitzname. Gespeichert für die Rangliste.',
                  it: "Risultati delle regate: tempo all'arrivo, livello di difficoltà, nickname scelto. Salvati per la classifica.",
                },
              )}
            </li>
            <li>
              {tp(
                'Страна (приблизительно из IP-адреса), UTM-метки из ссылки.',
                'Country (approximated from IP address), UTM tags from incoming link.',
                'Kraj (w przybliżeniu, na podstawie adresu IP), tagi UTM z linku wejściowego.',
                {
                  es: 'País (aproximado a partir de la dirección IP), etiquetas UTM del enlace de entrada.',
                  fr: "Pays (estimé à partir de l'adresse IP), paramètres UTM du lien d'arrivée.",
                  de: 'Land (geschätzt anhand der IP-Adresse), UTM-Parameter aus dem aufgerufenen Link.',
                  it: "Paese (stimato dall'indirizzo IP), tag UTM del link di arrivo.",
                },
              )}
            </li>
            <li>
              {tp(
                'Сессионный cookie regatta_sid (UUID, без личных данных). Используется только для связи событий одной сессии.',
                'Session cookie regatta_sid (UUID, no personal data). Used only to group events of the same session.',
                'Sesyjny plik cookie regatta_sid (UUID, bez danych osobowych). Służy tylko do łączenia zdarzeń z tej samej sesji.',
                {
                  es: 'Cookie de sesión regatta_sid (UUID, sin datos personales). Solo se usa para agrupar los eventos de una misma sesión.',
                  fr: "Cookie de session regatta_sid (UUID, sans données personnelles). Utilisé uniquement pour regrouper les événements d'une même session.",
                  de: 'Sitzungs-Cookie regatta_sid (UUID, ohne personenbezogene Daten). Dient nur dazu, Ereignisse derselben Sitzung zusammenzufassen.',
                  it: 'Cookie di sessione regatta_sid (UUID, senza dati personali). Serve solo a raggruppare gli eventi della stessa sessione.',
                },
              )}
            </li>
            <li>
              {tp(
                'Запись голоса только по твоей команде в голосовом режиме тренажера рации. Аудио отправляется на наш сервер для распознавания и оценки, не сохраняется в нашей базе и удаляется после обработки запроса.',
                'A voice recording only when you start it in the radio trainer voice mode. Audio is sent to our server for transcription and grading, is not stored in our database, and is discarded after the request is processed.',
                'Nagranie głosu, wyłącznie gdy sam je uruchomisz w trybie głosowym trenażera radiowego. Dźwięk jest wysyłany na nasz serwer do rozpoznania i oceny, nie jest zapisywany w naszej bazie i jest usuwany po obsłużeniu żądania.',
                {
                  es: 'Una grabación de voz, solo cuando la inicias en el modo de voz del simulador de radio. El audio se envía a nuestro servidor para su transcripción y evaluación, no se guarda en nuestra base de datos y se elimina tras procesar la solicitud.',
                  fr: "Un enregistrement vocal, uniquement quand tu le lances dans le mode vocal du simulateur radio. L'audio est envoyé à notre serveur pour la transcription et l'évaluation, n'est pas stocké dans notre base de données et est supprimé une fois la requête traitée.",
                  de: 'Eine Sprachaufnahme, nur wenn du sie im Sprachmodus des Funktrainers startest. Das Audio wird zur Transkription und Bewertung an unseren Server gesendet, nicht in unserer Datenbank gespeichert und nach der Verarbeitung der Anfrage gelöscht.',
                  it: "Una registrazione vocale, solo quando la avvii nella modalità vocale del simulatore radio. L'audio viene inviato al nostro server per la trascrizione e la valutazione, non viene salvato nel nostro database e viene eliminato dopo l'elaborazione della richiesta.",
                },
              )}
            </li>
          </ul>
        </Section>

        <Section
          title={tp('Что мы НЕ собираем', 'What we do NOT collect', 'Czego NIE zbieramy',
            { es: 'Lo que NO recopilamos', fr: 'Ce que nous NE collectons PAS', de: 'Was wir NICHT erfassen', it: 'Cosa NON raccogliamo' })}
        >
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>{tp('Имя, электронную почту, номер телефона.', 'Name, email, phone number.', 'Imienia, adresu e-mail, numeru telefonu.',
              { es: 'Nombre, correo electrónico, número de teléfono.', fr: 'Nom, e-mail, numéro de téléphone.', de: 'Name, E-Mail, Telefonnummer.', it: 'Nome, e-mail, numero di telefono.' })}</li>
            <li>{tp('Точную геолокацию.', 'Precise geolocation.', 'Dokładnej lokalizacji.',
              { es: 'Geolocalización precisa.', fr: 'Géolocalisation précise.', de: 'Genaue Standortdaten.', it: 'Geolocalizzazione precisa.' })}</li>
            <li>{tp('Контент с других приложений или сайтов (мы не отслеживаем тебя вне regatta).', 'Content from other apps or websites (we do not track you outside Regatta).', 'Treści z innych aplikacji ani stron (nie śledzimy Cię poza Regatta).',
              { es: 'Contenido de otras apps o sitios web (no te rastreamos fuera de Regatta).', fr: "Contenu provenant d'autres applis ou sites (nous ne te suivons pas en dehors de Regatta).", de: 'Inhalte aus anderen Apps oder Websites (wir verfolgen dich nicht außerhalb von Regatta).', it: 'Contenuti da altre app o siti web (non ti tracciamo fuori da Regatta).' })}</li>
            <li>{tp('Биометрию, контакты и фото. Доступ к микрофону запрашивается только для выбранного тобой голосового упражнения.', 'Biometrics, contacts, or photos. Microphone access is requested only for a voice exercise you choose to start.', 'Danych biometrycznych, kontaktów ani zdjęć. O dostęp do mikrofonu prosimy tylko przy ćwiczeniu głosowym, które sam uruchomisz.',
              { es: 'Datos biométricos, contactos o fotos. El acceso al micrófono solo se solicita para un ejercicio de voz que decidas iniciar.', fr: "Données biométriques, contacts ou photos. L'accès au micro n'est demandé que pour un exercice vocal que tu choisis de lancer.", de: 'Biometrische Daten, Kontakte oder Fotos. Der Mikrofonzugriff wird nur für eine Sprachübung angefragt, die du selbst startest.', it: "Dati biometrici, contatti o foto. L'accesso al microfono viene richiesto solo per un esercizio vocale che scegli di avviare." })}</li>
          </ul>
        </Section>

        <Section
          title={tp('Третьи стороны', 'Third parties', 'Strony trzecie',
            { es: 'Terceros', fr: 'Tiers', de: 'Drittanbieter', it: 'Terze parti' })}
        >
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>
              <strong>Google Analytics 4</strong>: {tp(
                'агрегированная статистика посещений. GA получает только обезличенные события, IP анонимизируется на стороне Google.',
                'aggregated visit statistics. GA receives only anonymized events; IP is anonymized on Google\'s side.',
                'zbiorcze statystyki odwiedzin. GA otrzymuje tylko zanonimizowane zdarzenia, a adres IP jest anonimizowany po stronie Google.',
                {
                  es: 'estadísticas de visitas agregadas. GA solo recibe eventos anonimizados; la IP se anonimiza por parte de Google.',
                  fr: "statistiques de visite agrégées. GA ne reçoit que des événements anonymisés ; l'IP est anonymisée côté Google.",
                  de: 'aggregierte Besuchsstatistiken. GA erhält nur anonymisierte Ereignisse; die IP-Adresse wird auf Seiten von Google anonymisiert.',
                  it: 'statistiche di visita aggregate. GA riceve solo eventi anonimizzati; l\'IP viene anonimizzato lato Google.',
                },
              )}
            </li>
            <li>
              <strong>Anthropic (AI Coach)</strong>: {tp(
                'когда ты запрашиваешь AI-разбор гонки, твой лог гонки (без личных данных) отправляется в Anthropic для анализа. Anthropic не использует наши запросы для тренировки моделей.',
                'when you request the AI race review, your race log (no personal data) is sent to Anthropic for analysis. Anthropic does not use our requests to train models.',
                'gdy prosisz o analizę wyścigu przez AI, Twój zapis wyścigu (bez danych osobowych) jest wysyłany do Anthropic do analizy. Anthropic nie wykorzystuje naszych zapytań do trenowania modeli.',
                {
                  es: 'cuando solicitas el análisis de tu regata con IA, tu registro de regata (sin datos personales) se envía a Anthropic para su análisis. Anthropic no usa nuestras solicitudes para entrenar modelos.',
                  fr: "lorsque tu demandes l'analyse de ta course par IA, le journal de ta course (sans données personnelles) est envoyé à Anthropic pour analyse. Anthropic n'utilise pas nos requêtes pour entraîner ses modèles.",
                  de: 'wenn du die KI-Rennanalyse anforderst, wird dein Rennprotokoll (ohne personenbezogene Daten) zur Analyse an Anthropic gesendet. Anthropic nutzt unsere Anfragen nicht zum Trainieren von Modellen.',
                  it: "quando richiedi l'analisi della regata con l'IA, il registro della tua regata (senza dati personali) viene inviato ad Anthropic per l'analisi. Anthropic non utilizza le nostre richieste per addestrare i modelli.",
                },
              )}
            </li>
            <li>
              <strong>OpenAI (Radio voice trainer)</strong>: {tp(
                'когда ты отправляешь голосовое упражнение, аудио передается через наш сервер в OpenAI для распознавания речи. Затем текст оценивается на нашем сервере по учебному чек-листу.',
                'when you submit a radio voice exercise, the audio is relayed through our server to OpenAI for speech transcription. The transcript is then graded on our server against the training checklist.',
                'gdy wysyłasz ćwiczenie głosowe, nagranie jest przekazywane przez nasz serwer do OpenAI w celu rozpoznania mowy. Następnie tekst jest oceniany na naszym serwerze według listy kontrolnej ćwiczenia.',
                {
                  es: 'cuando envías un ejercicio de voz, el audio pasa por nuestro servidor hasta OpenAI para transcribir el habla. Después, el texto se evalúa en nuestro servidor con la lista de control del ejercicio.',
                  fr: "lorsque tu envoies un exercice vocal, l'audio passe par notre serveur jusqu'à OpenAI pour la reconnaissance vocale. Le texte est ensuite évalué sur notre serveur selon la liste de contrôle de l'exercice.",
                  de: 'wenn du eine Sprachübung absendest, wird das Audio über unseren Server zur Spracherkennung an OpenAI weitergeleitet. Der Text wird danach auf unserem Server anhand der Übungscheckliste bewertet.',
                  it: "quando invii un esercizio vocale, l'audio viene inoltrato tramite il nostro server a OpenAI per il riconoscimento vocale. Il testo viene poi valutato sul nostro server in base alla checklist dell'esercizio.",
                },
              )}
            </li>
          </ul>
        </Section>

        <Section
          title={tp('Где хранятся данные', 'Where data is stored', 'Gdzie przechowywane są dane',
            { es: 'Dónde se almacenan los datos', fr: 'Où sont stockées les données', de: 'Wo Daten gespeichert werden', it: 'Dove vengono memorizzati i dati' })}
        >
          <p className="text-sm">
            {tp(
              'SQLite-база на нашем VPS-сервере. Резервные копии шифруются и хранятся 30 дней. Доступ к серверу - только у владельца проекта (Andrey, icoffio.com).',
              'SQLite database on our VPS server. Backups are encrypted and retained for 30 days. Server access is limited to the project owner (Andrey, icoffio.com).',
              'Baza SQLite na naszym serwerze VPS. Kopie zapasowe są szyfrowane i przechowywane przez 30 dni. Dostęp do serwera ma tylko właściciel projektu (Andrey, icoffio.com).',
              {
                es: 'Base de datos SQLite en nuestro servidor VPS. Las copias de seguridad se cifran y se conservan 30 días. Solo el propietario del proyecto (Andrey, icoffio.com) tiene acceso al servidor.',
                fr: 'Base de données SQLite sur notre serveur VPS. Les sauvegardes sont chiffrées et conservées 30 jours. Seul le propriétaire du projet (Andrey, icoffio.com) a accès au serveur.',
                de: 'SQLite-Datenbank auf unserem VPS-Server. Sicherungen werden verschlüsselt und 30 Tage aufbewahrt. Zugriff auf den Server hat nur der Projektinhaber (Andrey, icoffio.com).',
                it: 'Database SQLite sul nostro server VPS. I backup sono crittografati e conservati per 30 giorni. Solo il proprietario del progetto (Andrey, icoffio.com) ha accesso al server.',
              },
            )}
          </p>
        </Section>

        <Section
          title={tp('AI-тренер: дополнительно', 'AI Coach: additional notes', 'Trener AI: dodatkowe informacje',
            { es: 'Entrenador IA: notas adicionales', fr: 'Coach IA : informations complémentaires', de: 'KI-Trainer: weitere Hinweise', it: 'Coach IA: note aggiuntive' })}
        >
          <p className="text-sm">
            {tp(
              'AI-разбор гонки генерируется языковой моделью Claude от Anthropic на основе твоего лога гонки. Модель может ошибаться. AI не дает медицинских, юридических или финансовых советов - только анализ техники парусного спорта.',
              'The AI race review is generated by Anthropic\'s Claude language model based on your race log. The model can be wrong. The AI does not give medical, legal, or financial advice - only sailing technique analysis.',
              'Analizę wyścigu przez AI generuje model językowy Claude firmy Anthropic na podstawie zapisu Twojego wyścigu. Model może się mylić. AI nie udziela porad medycznych, prawnych ani finansowych - tylko analizuje technikę żeglarską.',
              {
                es: 'El análisis de regata con IA lo genera el modelo de lenguaje Claude de Anthropic a partir de tu registro de regata. El modelo puede equivocarse. La IA no da consejos médicos, legales ni financieros: solo analiza la técnica de navegación a vela.',
                fr: "L'analyse de course par IA est générée par le modèle de langage Claude d'Anthropic à partir du journal de ta course. Le modèle peut se tromper. L'IA ne donne pas de conseils médicaux, juridiques ou financiers : uniquement une analyse de ta technique de voile.",
                de: 'Die KI-Rennanalyse wird vom Sprachmodell Claude von Anthropic auf Basis deines Rennprotokolls erstellt. Das Modell kann sich irren. Die KI gibt keine medizinischen, rechtlichen oder finanziellen Ratschläge, sondern analysiert nur die Segeltechnik.',
                it: "L'analisi della regata con l'IA è generata dal modello linguistico Claude di Anthropic in base al registro della tua regata. Il modello può sbagliare. L'IA non fornisce consigli medici, legali o finanziari: solo analisi della tecnica velica.",
              },
            )}
          </p>
        </Section>

        <Section
          title={tp('Удаление данных', 'Data deletion', 'Usuwanie danych',
            { es: 'Eliminación de datos', fr: 'Suppression des données', de: 'Löschen der Daten', it: 'Eliminazione dei dati' })}
        >
          <p className="text-sm">
            {tp(
              'Чтобы удалить свои данные (результаты гонок, события сессий), напиши на ',
              'To delete your data (race results, session events), email ',
              'Aby usunąć swoje dane (wyniki wyścigów, zdarzenia sesji), napisz na ',
              {
                es: 'Para eliminar tus datos (resultados de regatas, eventos de sesión), escribe a ',
                fr: 'Pour supprimer tes données (résultats de course, événements de session), écris à ',
                de: 'Um deine Daten zu löschen (Rennergebnisse, Sitzungsereignisse), schreib an ',
                it: 'Per eliminare i tuoi dati (risultati delle regate, eventi di sessione), scrivi a ',
              },
            )}
            <a href="mailto:privacy@icoffio.com" className="text-[var(--accent-cyan)] hover:underline">privacy@icoffio.com</a>
            {tp(
              ' с указанием своего nickname (если есть). Удаление в течение 30 дней.',
              ' with your nickname (if any). Deletion within 30 days.',
              ' i podaj swój pseudonim (jeśli go masz). Usunięcie nastąpi w ciągu 30 dni.',
              {
                es: ' indicando tu apodo (si tienes). Los eliminamos en un plazo de 30 días.',
                fr: ' en indiquant ton pseudo (le cas échéant). Suppression sous 30 jours.',
                de: ' und nenne deinen Spitznamen (falls vorhanden). Die Löschung erfolgt innerhalb von 30 Tagen.',
                it: ' indicando il tuo nickname (se ne hai uno). Eliminazione entro 30 giorni.',
              },
            )}
          </p>
        </Section>

        <Section
          title={tp('Изменения', 'Changes', 'Zmiany',
            { es: 'Cambios', fr: 'Modifications', de: 'Änderungen', it: 'Modifiche' })}
        >
          <p className="text-sm">
            {tp(
              'Если политика меняется существенно, мы покажем баннер в приложении / на сайте перед вступлением в силу. Дата вверху страницы фиксирует последнее изменение.',
              'If the policy changes materially, we will show an in-app/web banner before it takes effect. The date at the top of this page marks the last change.',
              'Jeśli polityka istotnie się zmieni, przed wejściem zmian w życie pokażemy baner w aplikacji / na stronie. Data u góry strony oznacza ostatnią zmianę.',
              {
                es: 'Si la política cambia de forma importante, mostraremos un banner en la app / el sitio antes de que entre en vigor. La fecha en la parte superior de la página indica el último cambio.',
                fr: "Si la politique change de manière notable, nous afficherons une bannière dans l'appli / sur le site avant son entrée en vigueur. La date en haut de cette page indique la dernière modification.",
                de: 'Bei wesentlichen Änderungen zeigen wir vor dem Inkrafttreten ein Banner in der App bzw. auf der Website. Das Datum oben auf der Seite zeigt die letzte Änderung.',
                it: "Se l'informativa cambia in modo sostanziale, mostreremo un banner nell'app / sul sito prima dell'entrata in vigore. La data in alto nella pagina indica l'ultima modifica.",
              },
            )}
          </p>
        </Section>

        <Section
          title={tp('Контакт', 'Contact', 'Kontakt',
            { es: 'Contacto', fr: 'Contact', de: 'Kontakt', it: 'Contatto' })}
        >
          <p className="text-sm">
            {tp(
              'Вопросы по политике конфиденциальности: ',
              'Questions about this policy: ',
              'Pytania dotyczące polityki prywatności: ',
              {
                es: 'Preguntas sobre esta política: ',
                fr: 'Questions sur cette politique : ',
                de: 'Fragen zu dieser Richtlinie: ',
                it: 'Domande su questa informativa: ',
              },
            )}
            <a href="mailto:privacy@icoffio.com" className="text-[var(--accent-cyan)] hover:underline">privacy@icoffio.com</a>
          </p>
        </Section>
      </div>

      <ContentFooterNav page="/privacy" />
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
