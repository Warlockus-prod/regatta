'use client';

import { useI18n } from '@/lib/i18n';
import ContentFooterNav from '@/components/ContentFooterNav';

// Privacy policy at /privacy. Linked from mobile app + web nav footer, and it
// is the Privacy Policy URL of the App Store listing. Required for App Store
// submission (Apple Guideline 5.1.1). Keep it in plain language, honest, and
// reflect what the app actually does rather than the lawyer-template version.
// Update this when collection behavior changes (notably in /api/log,
// /api/race-result, /api/replay, /api/feedback, /api/support, the AI routes
// and the mobile analytics provider), bump the date and add a line under
// "Changes". The app-side twin is mobile/asc-metadata/PRIVACY_POLICY.md.

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
          {tp('Обновлено: 2026-10-19', 'Updated: 2026-10-19', 'Aktualizacja: 2026-10-19',
            { es: 'Actualizado: 2026-10-19', fr: 'Mis à jour : 2026-10-19', de: 'Aktualisiert: 2026-10-19', it: 'Aggiornato: 2026-10-19' })}
        </p>
      </div>

      <div className="space-y-6 text-[var(--text-secondary)] leading-relaxed">
        {/* iOS app callout. The native app sends pseudonymous product analytics
            (PostHog EU, opt-out in Settings) and uses the network for the
            course pages, Ask, the AI review, voice answers (SRC radio
            simulator and sternik oral exam, OpenAI speech-to-text), live
            multiplayer, the gallery, the daily banner and spot weather. This MUST stay consistent with
            the App Store App Privacy label (Data Collected: Usage Data /
            Product Interaction and Diagnostics / Other Diagnostic Data, purpose
            Analytics, not linked, not tracking), with NSPrivacyCollectedDataTypes
            in mobile/app.json, with mobile/asc-metadata/PRIVACY_POLICY.md and
            with the in-app Settings text. The sections below describe the
            WEBSITE, which uses GA4. */}
        <div className="p-4 rounded-lg" style={{ background: 'rgba(68, 255, 136, 0.06)', border: '1px solid rgba(68, 255, 136, 0.25)' }}>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--success)' }}>
            {tp('Приложение для iPhone / iPad', 'iPhone / iPad app', 'Aplikacja na iPhone / iPad',
              { es: 'Aplicación para iPhone / iPad', fr: 'Application iPhone / iPad', de: 'App für iPhone / iPad', it: 'App per iPhone / iPad' })}
          </h2>
          <p className="text-sm mb-3">
            {tp(
              'Приложение «Week to Regatta» отправляет псевдонимную продуктовую аналитику в PostHog (серверы в ЕС): просмотры экранов, запуск приложения и возврат в него, сворачивание, установку и обновление и несколько продуктовых событий (гонка начата и завершена, запрошен AI-разбор, задан вопрос ассистенту, урок пройден, пробный экзамен завершен с баллом). К каждому событию прикреплены случайный идентификатор установки, язык и версия приложения и базовые данные об устройстве (модель, версия iOS, региональные настройки, часовой пояс, размер экрана). Это не связано с твоей личностью и никогда не используется для трекинга между приложениями. PostHog видит IP-адрес соединения и может определить по нему примерное местоположение; в версиях новее 1.6.4 приложение просит PostHog этого не делать. Выключить: Настройки -> Данные -> Анонимная аналитика. Это сразу останавливает собственную аналитику приложения, а в версиях новее 1.6.4 и события страниц курсов, открытых внутри приложения.',
              'The "Week to Regatta" app sends pseudonymous product analytics to PostHog (servers in the EU): screen views, app opened, brought back to the foreground, backgrounded, installed and updated, and a few product events (race started and finished, AI review requested, question asked, lesson completed, mock exam finished with the score). Each event carries a random install id, the app language and version, and basic device data (model, iOS version, locale, time zone, screen size). It is not linked to your identity and is never used for cross-app tracking. PostHog sees the IP address of the connection and may estimate an approximate location from it; in app versions newer than 1.6.4 the app asks PostHog not to. To turn it off: Settings -> Data -> Anonymous analytics. This stops the app\'s own analytics at once and, in versions newer than 1.6.4, also the events of course pages opened inside the app.',
              'Aplikacja "Week to Regatta" wysyła pseudonimowe dane analityczne do PostHog (serwery w UE): wyświetlenia ekranów, otwarcie aplikacji i powrót do niej, przejście w tło, instalację i aktualizację oraz kilka zdarzeń produktowych (rozpoczęcie i ukończenie wyścigu, prośba o analizę AI, pytanie do asystenta, ukończona lekcja, ukończony egzamin próbny z wynikiem). Każde zdarzenie ma losowy identyfikator instalacji, język i wersję aplikacji oraz podstawowe dane o urządzeniu (model, wersja iOS, ustawienia regionalne, strefa czasowa, rozmiar ekranu). Nie są one powiązane z Twoją tożsamością i nigdy nie służą do śledzenia między aplikacjami. PostHog widzi adres IP połączenia i może na jego podstawie określić przybliżoną lokalizację; w wersjach nowszych niż 1.6.4 aplikacja prosi PostHog, aby tego nie robił. Wyłączysz to w Ustawienia -> Dane -> Anonimowa analityka. To od razu zatrzymuje analitykę samej aplikacji, a w wersjach nowszych niż 1.6.4 także zdarzenia stron kursów otwartych w aplikacji.',
              {
                es: 'La aplicación "Week to Regatta" envía analítica de producto seudónima a PostHog (servidores en la UE): pantallas vistas, apertura, vuelta a primer plano, paso a segundo plano, instalación y actualización de la app, y algunos eventos de producto (regata iniciada y terminada, análisis con IA solicitado, pregunta al asistente, lección completada, examen de prueba terminado con la puntuación). Cada evento lleva un identificador aleatorio de instalación, el idioma y la versión de la app y datos básicos del dispositivo (modelo, versión de iOS, configuración regional, zona horaria, tamaño de pantalla). No se vincula a tu identidad y nunca se usa para el seguimiento entre apps. PostHog ve la dirección IP de la conexión y puede estimar a partir de ella una ubicación aproximada; en las versiones posteriores a la 1.6.4 la app le pide que no lo haga. Para desactivarla: Ajustes -> Datos -> Analítica anónima. Así se detiene al momento la analítica propia de la app y, en las versiones posteriores a la 1.6.4, también los eventos de las páginas de cursos abiertas dentro de la app.',
                fr: 'L\'application "Week to Regatta" envoie des statistiques d\'usage pseudonymes à PostHog (serveurs dans l\'UE) : écrans consultés, ouverture, retour au premier plan, mise en arrière-plan, installation et mise à jour de l\'app, et quelques événements produit (course commencée et terminée, analyse IA demandée, question posée à l\'assistant, leçon terminée, examen blanc terminé avec le score). Chaque événement porte un identifiant d\'installation aléatoire, la langue et la version de l\'app et des données de base sur l\'appareil (modèle, version d\'iOS, réglages régionaux, fuseau horaire, taille d\'écran). Elles ne sont pas liées à ton identité et ne servent jamais au suivi entre applications. PostHog voit l\'adresse IP de la connexion et peut en déduire une localisation approximative ; dans les versions postérieures à 1.6.4, l\'app lui demande de ne pas le faire. Pour les désactiver : Réglages -> Données -> Statistiques anonymes. Cela arrête aussitôt les statistiques propres à l\'app et, dans les versions postérieures à 1.6.4, aussi les événements des pages de cours ouvertes dans l\'app.',
                de: 'Die App "Week to Regatta" sendet pseudonyme Produktanalysen an PostHog (Server in der EU): Bildschirmaufrufe, Öffnen, Rückkehr in den Vordergrund, Wechsel in den Hintergrund, Installation und Update der App sowie einige Produktereignisse (Rennen gestartet und beendet, KI-Analyse angefordert, Frage an den Assistenten, Lektion abgeschlossen, Probeprüfung beendet mit Punktzahl). Jedes Ereignis enthält eine zufällige Installations-ID, App-Sprache und -Version und grundlegende Gerätedaten (Modell, iOS-Version, Regionaleinstellung, Zeitzone, Bildschirmgröße). Diese Daten sind nicht mit deiner Identität verknüpft und werden nie für App-übergreifendes Tracking verwendet. PostHog sieht die IP-Adresse der Verbindung und kann daraus einen ungefähren Standort ableiten; in Versionen nach 1.6.4 bittet die App PostHog, das zu unterlassen. Abschalten: Einstellungen -> Daten -> Anonyme Analyse. Das stoppt sofort die Analyse der App selbst und in Versionen nach 1.6.4 auch die Ereignisse der Kursseiten, die in der App geöffnet werden.',
                it: 'L\'app "Week to Regatta" invia statistiche d\'uso pseudonime a PostHog (server nell\'UE): schermate visualizzate, apertura, ritorno in primo piano, passaggio in background, installazione e aggiornamento dell\'app e alcuni eventi di prodotto (regata iniziata e conclusa, analisi IA richiesta, domanda all\'assistente, lezione completata, esame di prova concluso con il punteggio). Ogni evento porta un identificativo casuale di installazione, lingua e versione dell\'app e dati di base sul dispositivo (modello, versione di iOS, impostazioni regionali, fuso orario, dimensioni dello schermo). Non sono collegate alla tua identità e non vengono mai usate per il tracciamento tra app. PostHog vede l\'indirizzo IP della connessione e può ricavarne una posizione approssimativa; nelle versioni successive alla 1.6.4 l\'app gli chiede di non farlo. Per disattivarle: Impostazioni -> Dati -> Statistiche anonime. Così si fermano subito le statistiche dell\'app e, nelle versioni successive alla 1.6.4, anche gli eventi delle pagine dei corsi aperte nell\'app.',
              },
            )}
          </p>
          <p className="text-sm mb-2">
            {tp(
              'Прогресс хранится только на устройстве (iOS AsyncStorage) и стирается в Настройки -> Данные -> Очистить все данные. В сеть приложение обращается в таких случаях:',
              'Your progress is stored only on the device (iOS AsyncStorage) and wiped from Settings -> Data -> Clear all data. The app uses the network in these cases:',
              'Postęp jest przechowywany tylko na urządzeniu (iOS AsyncStorage) i można go skasować w Ustawienia -> Dane -> Wyczyść wszystkie dane. Z sieci aplikacja korzysta w tych przypadkach:',
              {
                es: 'Tu progreso se guarda solo en el dispositivo (iOS AsyncStorage) y se borra en Ajustes -> Datos -> Borrar todos los datos. La app usa la red en estos casos:',
                fr: 'Ta progression est stockée uniquement sur l\'appareil (iOS AsyncStorage) et s\'efface dans Réglages -> Données -> Effacer toutes les données. L\'app utilise le réseau dans ces cas :',
                de: 'Dein Fortschritt wird nur auf dem Gerät gespeichert (iOS AsyncStorage) und unter Einstellungen -> Daten -> Alle Daten löschen entfernt. Das Netz nutzt die App in diesen Fällen:',
                it: 'I tuoi progressi restano solo sul dispositivo (iOS AsyncStorage) e si cancellano da Impostazioni -> Dati -> Cancella tutti i dati. L\'app usa la rete in questi casi:',
              },
            )}
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm mb-3">
            <li>
              {tp(
                'Страницы курсов (sternik, радио SRC, часть тренажеров) - это страницы weektoregatta.com, они отправляют события использования, описанные ниже для сайта.',
                'Course pages (sternik, SRC radio, some trainers) are pages of weektoregatta.com and send the usage events described below for the website.',
                'Strony kursów (sternik, radio SRC, część trenażerów) to strony weektoregatta.com i wysyłają zdarzenia użycia opisane niżej dla strony internetowej.',
                {
                  es: 'Las páginas de cursos (sternik, radio SRC, algunos simuladores) son páginas de weektoregatta.com y envían los eventos de uso que se describen abajo para el sitio web.',
                  fr: 'Les pages de cours (sternik, radio SRC, certains simulateurs) sont des pages de weektoregatta.com et envoient les événements d\'utilisation décrits plus bas pour le site.',
                  de: 'Kursseiten (sternik, SRC-Funk, einige Trainer) sind Seiten von weektoregatta.com und senden die unten für die Website beschriebenen Nutzungsereignisse.',
                  it: 'Le pagine dei corsi (sternik, radio SRC, alcuni simulatori) sono pagine di weektoregatta.com e inviano gli eventi di utilizzo descritti più sotto per il sito.',
                },
              )}
            </li>
            <li>
              {tp(
                '«Спросить ассистента»: вопрос и переписка идут через наш сервер в OpenAI, который пишет ответ (см. «Третьи стороны»).',
                'Ask the assistant: your question and the conversation go through our server to OpenAI, which writes the reply (see Third parties).',
                '"Zapytaj asystenta": pytanie i rozmowa trafiają przez nasz serwer do OpenAI, który przygotowuje odpowiedź (zob. "Strony trzecie").',
                {
                  es: 'Pregunta al asistente: tu pregunta y la conversación pasan por nuestro servidor hasta OpenAI, que redacta la respuesta (ver "Terceros").',
                  fr: 'Demander à l\'assistant : ta question et la conversation passent par notre serveur jusqu\'à OpenAI, qui rédige la réponse (voir "Tiers").',
                  de: 'Assistenten fragen: Deine Frage und der Verlauf gehen über unseren Server an OpenAI, das die Antwort schreibt (siehe "Drittanbieter").',
                  it: 'Chiedi all\'assistente: la tua domanda e la conversazione passano dal nostro server a OpenAI, che scrive la risposta (vedi "Terze parti").',
                },
              )}
            </li>
            <li>
              {tp(
                'AI-разбор гонки: лог гонки (позиции, время, счет, без личных данных) идет через наш сервер в OpenAI.',
                'AI race review: the race log (positions, times, score, no personal data) goes through our server to OpenAI.',
                'Analiza wyścigu przez AI: zapis wyścigu (pozycje, czasy, wynik, bez danych osobowych) trafia przez nasz serwer do OpenAI.',
                {
                  es: 'Análisis de regata con IA: el registro de la regata (posiciones, tiempos, puntuación, sin datos personales) pasa por nuestro servidor hasta OpenAI.',
                  fr: 'Analyse de course par IA : le journal de course (positions, temps, score, sans données personnelles) passe par notre serveur jusqu\'à OpenAI.',
                  de: 'KI-Rennanalyse: Das Rennprotokoll (Positionen, Zeiten, Punktzahl, keine personenbezogenen Daten) geht über unseren Server an OpenAI.',
                  it: 'Analisi della regata con l\'IA: il registro della regata (posizioni, tempi, punteggio, nessun dato personale) passa dal nostro server a OpenAI.',
                },
              )}
            </li>
            <li>
              {tp(
                'Голосовые ответы: в симуляторе радиосвязи SRC и в тренажере устного экзамена sternik запись, которую ты сам запускаешь, идет через наш сервер в OpenAI для распознавания речи и не сохраняется (см. «Третьи стороны»).',
                'Voice answers: in the SRC radio simulator and the sternik oral exam practice, a recording you start goes through our server to OpenAI to be turned into text and is not stored (see Third parties).',
                'Odpowiedzi głosowe: w symulatorze radiowym SRC i w ćwiczeniu egzaminu ustnego na sternika nagranie, które sam uruchomisz, trafia przez nasz serwer do OpenAI w celu zamiany mowy na tekst i nie jest zapisywane (zob. "Strony trzecie").',
                {
                  es: 'Respuestas de voz: en el simulador de radio SRC y en la práctica del examen oral de sternik, una grabación que inicias tú pasa por nuestro servidor hasta OpenAI para convertir la voz en texto y no se guarda (ver "Terceros").',
                  fr: 'Réponses vocales : dans le simulateur radio SRC et l\'entraînement à l\'examen oral sternik, un enregistrement que tu lances passe par notre serveur jusqu\'à OpenAI pour transcrire la parole et n\'est pas conservé (voir "Tiers").',
                  de: 'Gesprochene Antworten: Im SRC-Funksimulator und im Training für die mündliche sternik-Prüfung geht eine Aufnahme, die du selbst startest, über unseren Server an OpenAI, um die Sprache in Text umzuwandeln, und wird nicht gespeichert (siehe "Drittanbieter").',
                  it: 'Risposte vocali: nel simulatore radio SRC e nell\'allenamento per l\'esame orale sternik, una registrazione che avvii tu passa dal nostro server a OpenAI per trasformare la voce in testo e non viene salvata (vedi "Terze parti").',
                },
              )}
            </li>
            <li>
              {tp(
                'Мультиплеер: твой никнейм видят все в комнате; результаты финиша сохраняются в таблице лидеров с никнеймом и случайным идентификатором сессии.',
                'Live multiplayer: everyone in the room sees your nickname; finish results are stored on the leaderboard with your nickname and a random session id.',
                'Wyścig wieloosobowy: Twój pseudonim widzą wszyscy w pokoju; wyniki na mecie zapisujemy w rankingu z pseudonimem i losowym identyfikatorem sesji.',
                {
                  es: 'Multijugador en directo: todos en la sala ven tu apodo; los resultados al terminar se guardan en la clasificación con tu apodo y un identificador de sesión aleatorio.',
                  fr: 'Multijoueur en direct : tout le monde dans le salon voit ton pseudo ; les résultats à l\'arrivée sont enregistrés au classement avec ton pseudo et un identifiant de session aléatoire.',
                  de: 'Live-Mehrspieler: Alle im Raum sehen deinen Spitznamen; Zielergebnisse werden mit Spitznamen und einer zufälligen Sitzungs-ID in der Rangliste gespeichert.',
                  it: 'Multigiocatore dal vivo: tutti nella stanza vedono il tuo nickname; i risultati all\'arrivo vengono salvati in classifica con il nickname e un identificativo di sessione casuale.',
                },
              )}
            </li>
            <li>
              {tp(
                'Галерея: фото загружаются с weektoregatta.com, превью видео с YouTube.',
                'Gallery: photos load from weektoregatta.com, video thumbnails from YouTube.',
                'Galeria: zdjęcia ładują się z weektoregatta.com, miniatury filmów z YouTube.',
                {
                  es: 'Galería: las fotos se cargan desde weektoregatta.com y las miniaturas de vídeo desde YouTube.',
                  fr: 'Galerie : les photos viennent de weektoregatta.com, les miniatures des vidéos de YouTube.',
                  de: 'Galerie: Fotos laden von weektoregatta.com, Video-Vorschaubilder von YouTube.',
                  it: 'Galleria: le foto arrivano da weektoregatta.com, le anteprime dei video da YouTube.',
                },
              )}
            </li>
            <li>
              {tp(
                'Баннер дневного челленджа и погода для выбранного тобой места: простой запрос к weektoregatta.com без идентификаторов (координаты места, а не твои).',
                'Daily challenge banner and the weather for a spot you pick: a plain request to weektoregatta.com without any identifier (the spot\'s coordinates, never yours).',
                'Baner wyzwania dnia i pogoda dla wybranego miejsca: zwykłe zapytanie do weektoregatta.com bez identyfikatorów (współrzędne miejsca, nie Twoje).',
                {
                  es: 'Banner del reto diario y el tiempo del lugar que elijas: una petición simple a weektoregatta.com sin identificadores (las coordenadas del lugar, nunca las tuyas).',
                  fr: 'Bannière du défi du jour et météo d\'un spot que tu choisis : une simple requête à weektoregatta.com sans identifiant (les coordonnées du spot, jamais les tiennes).',
                  de: 'Banner der Tages-Challenge und Wetter für ein Revier, das du wählst: eine einfache Anfrage an weektoregatta.com ohne Kennung (die Koordinaten des Reviers, nie deine).',
                  it: 'Banner della sfida del giorno e meteo di uno spot che scegli: una semplice richiesta a weektoregatta.com senza identificativi (le coordinate dello spot, mai le tue).',
                },
              )}
            </li>
          </ul>
          <p className="text-sm">
            {tp(
              'Разделы ниже описывают САЙТ weektoregatta.com.',
              'The sections below describe the WEBSITE weektoregatta.com.',
              'Sekcje poniżej opisują STRONĘ weektoregatta.com.',
              {
                es: 'Las secciones siguientes describen el SITIO WEB weektoregatta.com.',
                fr: 'Les sections ci-dessous décrivent le SITE weektoregatta.com.',
                de: 'Die Abschnitte unten beschreiben die WEBSITE weektoregatta.com.',
                it: 'Le sezioni qui sotto descrivono il SITO weektoregatta.com.',
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
                'Технические события: открытие страниц, время на странице и глубина прокрутки, ошибки JavaScript, размер окна, язык браузера, строка User-Agent браузера и определенные по ней тип и модель устройства, страница, с которой ты пришел (referrer), и UTM-метки ссылки. Каждое событие сохраняется с укороченным IP-адресом (последняя часть удаляется до записи) и страной, определенной по нему. Сырые события хранятся 180 дней, затем удаляются.',
                'Technical events: page opens, time on page and how far you scrolled, JavaScript errors, window size, browser language, the browser User-Agent string with the device type and model read from it, the page you came from (referrer) and the UTM tags of the link. Each event is stored with a shortened IP address (the last part is removed before saving) and the country estimated from it. Raw events are kept for 180 days, then deleted.',
                'Zdarzenia techniczne: otwarcia stron, czas na stronie i głębokość przewinięcia, błędy JavaScript, rozmiar okna, język przeglądarki, ciąg User-Agent przeglądarki wraz z odczytanym z niego typem i modelem urządzenia, strona, z której przychodzisz (referrer), oraz tagi UTM linku. Każde zdarzenie zapisujemy ze skróconym adresem IP (ostatnią część usuwamy przed zapisem) i krajem ustalonym na jego podstawie. Surowe zdarzenia przechowujemy 180 dni, potem je usuwamy.',
                {
                  es: 'Eventos técnicos: aperturas de páginas, tiempo en la página y hasta dónde te desplazas, errores de JavaScript, tamaño de la ventana, idioma del navegador, la cadena User-Agent del navegador con el tipo y el modelo de dispositivo que se deducen de ella, la página de la que vienes (referrer) y las etiquetas UTM del enlace. Cada evento se guarda con una dirección IP acortada (la última parte se elimina antes de guardarla) y el país estimado a partir de ella. Los eventos sin procesar se conservan 180 días y después se eliminan.',
                  fr: "Événements techniques : ouvertures de pages, temps passé sur la page et profondeur de défilement, erreurs JavaScript, taille de la fenêtre, langue du navigateur, la chaîne User-Agent du navigateur avec le type et le modèle d'appareil qui s'en déduisent, la page d'où tu viens (referrer) et les paramètres UTM du lien. Chaque événement est enregistré avec une adresse IP raccourcie (la dernière partie est supprimée avant l'enregistrement) et le pays estimé à partir d'elle. Les événements bruts sont conservés 180 jours, puis supprimés.",
                  de: 'Technische Ereignisse: Seitenaufrufe, Verweildauer und Scrolltiefe, JavaScript-Fehler, Fenstergröße, Browsersprache, der User-Agent-String des Browsers samt daraus gelesenem Gerätetyp und -modell, die Seite, von der du kommst (Referrer), und die UTM-Parameter des Links. Jedes Ereignis wird mit einer gekürzten IP-Adresse (der letzte Teil wird vor dem Speichern entfernt) und dem daraus geschätzten Land gespeichert. Die Rohdaten werden 180 Tage aufbewahrt und dann gelöscht.',
                  it: "Eventi tecnici: aperture di pagine, tempo sulla pagina e profondità di scorrimento, errori JavaScript, dimensione della finestra, lingua del browser, la stringa User-Agent del browser con il tipo e il modello di dispositivo ricavati da essa, la pagina da cui arrivi (referrer) e i tag UTM del link. Ogni evento viene salvato con un indirizzo IP abbreviato (l'ultima parte viene rimossa prima del salvataggio) e il paese stimato a partire da esso. Gli eventi grezzi sono conservati per 180 giorni, poi cancellati.",
                },
              )}
            </li>
            <li>
              {tp(
                'Учебные события: пробный экзамен начат и завершен (балл, сдан или нет), пройденные уроки и задания по радио, переход в App Store и то, открыта ли страница внутри приложения. Без имени и без твоих ответов. Сырые события хранятся 180 дней, затем удаляются.',
                'Learning events: mock exam started and finished (score, passed or not), lessons and radio tasks completed, App Store link clicks, and whether a page was opened inside the app. No name and none of your answers. Raw events are kept for 180 days, then deleted.',
                'Zdarzenia nauki: rozpoczęcie i ukończenie egzaminu próbnego (wynik, zdany czy nie), ukończone lekcje i zadania radiowe, kliknięcia linku do App Store oraz to, czy strona została otwarta w aplikacji. Bez imienia i bez twoich odpowiedzi. Surowe zdarzenia przechowujemy 180 dni, potem je usuwamy.',
                {
                  es: 'Eventos de aprendizaje: inicio y fin del examen de prueba (puntuación, aprobado o no), lecciones y tareas de radio completadas, clics en el enlace de la App Store y si la página se abrió dentro de la app. Sin nombre y sin tus respuestas. Los eventos sin procesar se conservan 180 días y después se eliminan.',
                  fr: "Événements d'apprentissage : début et fin de l'examen blanc (score, réussi ou non), leçons et exercices radio terminés, clics sur le lien App Store et ouverture de la page dans l'application. Sans nom et sans tes réponses. Les événements bruts sont conservés 180 jours, puis supprimés.",
                  de: 'Lernereignisse: Probeprüfung begonnen und beendet (Punktzahl, bestanden oder nicht), abgeschlossene Lektionen und Funkaufgaben, Klicks auf den App-Store-Link und ob eine Seite in der App geöffnet wurde. Ohne Namen und ohne deine Antworten. Die Rohdaten werden 180 Tage aufbewahrt und dann gelöscht.',
                  it: "Eventi di apprendimento: inizio e fine dell'esame di prova (punteggio, superato o no), lezioni e compiti radio completati, clic sul link dell'App Store e se la pagina è stata aperta nell'app. Senza nome e senza le tue risposte. Gli eventi grezzi sono conservati per 180 giorni, poi cancellati.",
                },
              )}
            </li>
            <li>
              {tp(
                'Результаты гонок и реплеи: время финиша, уровень сложности, выбранный никнейм и, для завершенной гонки, трек лодки, чтобы работала ссылка на реплей. Сохраняются для лидерборда вместе со случайным идентификатором из cookie regatta_sid. Автоматически пока не удаляются; удаляем по запросу.',
                'Race results and replays: finish time, difficulty level, chosen nickname and, for a finished race, the boat track so its replay link works. Stored for the leaderboard together with the random identifier from the regatta_sid cookie. They do not expire automatically yet; we delete them on request.',
                'Wyniki wyścigów i powtórki: czas na mecie, poziom trudności, wybrany pseudonim oraz, dla ukończonego wyścigu, ślad łodzi, aby działał link do powtórki. Zapisujemy je na potrzeby rankingu razem z losowym identyfikatorem z pliku cookie regatta_sid. Na razie nie wygasają automatycznie; usuwamy je na prośbę.',
                {
                  es: 'Resultados de regata y repeticiones: tiempo de llegada, nivel de dificultad, apodo elegido y, en una regata terminada, la traza del barco para que funcione el enlace a la repetición. Se guardan para la clasificación junto con el identificador aleatorio de la cookie regatta_sid. Por ahora no caducan automáticamente; los eliminamos si lo pides.',
                  fr: "Résultats de course et replays : temps à l'arrivée, niveau de difficulté, pseudo choisi et, pour une course terminée, la trace du bateau pour que le lien du replay fonctionne. Conservés pour le classement avec l'identifiant aléatoire du cookie regatta_sid. Ils n'expirent pas encore automatiquement ; nous les supprimons sur demande.",
                  de: 'Rennergebnisse und Replays: Zielzeit, Schwierigkeitsstufe, gewählter Spitzname und bei einem beendeten Rennen die Bootsspur, damit der Replay-Link funktioniert. Gespeichert für die Rangliste zusammen mit der zufälligen Kennung aus dem Cookie regatta_sid. Sie laufen noch nicht automatisch ab; auf Anfrage löschen wir sie.',
                  it: "Risultati delle regate e replay: tempo all'arrivo, livello di difficoltà, nickname scelto e, per una regata conclusa, la traccia della barca perché il link al replay funzioni. Salvati per la classifica insieme all'identificativo casuale del cookie regatta_sid. Per ora non scadono automaticamente; li eliminiamo su richiesta.",
                },
              )}
            </li>
            <li>
              {tp(
                'Мы сами ставим два cookie, оба хранятся 1 год. regatta_sid - случайный псевдонимный идентификатор (UUID) без имени и контактов: связывает твои визиты и события, запоминает никнейм, результаты гонок, реплеи и лайки в галерее и используется для лимитов запросов против злоупотреблений. regatta_lang запоминает язык интерфейса. Google Analytics (см. «Третьи стороны») ставит на сайте собственные cookie _ga и _ga_*, они хранятся до 2 лет.',
                'We set two cookies ourselves, both kept for 1 year. regatta_sid is a random pseudonymous identifier (UUID) without your name or contact details: it links your visits and events, remembers your nickname, race results, replays and gallery likes, and is used for request limits against abuse. regatta_lang remembers your interface language. On the website, Google Analytics (see Third parties) sets its own _ga and _ga_* cookies, kept for up to 2 years.',
                'Sami ustawiamy dwa pliki cookie, oba przechowywane przez 1 rok. regatta_sid to losowy pseudonimowy identyfikator (UUID) bez imienia i danych kontaktowych: łączy Twoje wizyty i zdarzenia, zapamiętuje pseudonim, wyniki wyścigów, powtórki i polubienia w galerii oraz służy do limitów zapytań chroniących przed nadużyciami. regatta_lang zapamiętuje język interfejsu. Na stronie Google Analytics (zob. "Strony trzecie") ustawia własne pliki cookie _ga i _ga_*, przechowywane do 2 lat.',
                {
                  es: 'Nosotros ponemos dos cookies, ambas con una duración de 1 año. regatta_sid es un identificador seudónimo aleatorio (UUID), sin tu nombre ni tus datos de contacto: enlaza tus visitas y eventos, recuerda tu apodo, tus resultados, tus repeticiones y tus "me gusta" de la galería, y se usa para limitar peticiones contra abusos. regatta_lang recuerda el idioma de la interfaz. En el sitio web, Google Analytics (ver "Terceros") pone sus propias cookies _ga y _ga_*, que duran hasta 2 años.',
                  fr: "Nous déposons nous-mêmes deux cookies, conservés 1 an. regatta_sid est un identifiant pseudonyme aléatoire (UUID), sans ton nom ni tes coordonnées : il relie tes visites et tes événements, retient ton pseudo, tes résultats de course, tes replays et tes j'aime de la galerie, et sert aux limites de requêtes contre les abus. regatta_lang retient la langue de l'interface. Sur le site, Google Analytics (voir \"Tiers\") dépose ses propres cookies _ga et _ga_*, conservés jusqu'à 2 ans.",
                  de: 'Wir selbst setzen zwei Cookies, beide 1 Jahr gespeichert. regatta_sid ist eine zufällige pseudonyme Kennung (UUID) ohne Namen oder Kontaktdaten: Sie verknüpft deine Besuche und Ereignisse, merkt sich Spitznamen, Rennergebnisse, Replays und Likes in der Galerie und dient für Anfragelimits gegen Missbrauch. regatta_lang merkt sich die Sprache der Oberfläche. Auf der Website setzt Google Analytics (siehe "Drittanbieter") eigene Cookies _ga und _ga_*, die bis zu 2 Jahre gespeichert werden.',
                  it: "Impostiamo noi due cookie, entrambi conservati per 1 anno. regatta_sid è un identificativo pseudonimo casuale (UUID), senza nome né recapiti: collega le tue visite e i tuoi eventi, ricorda il nickname, i risultati delle regate, i replay e i mi piace della galleria e serve a limitare le richieste contro gli abusi. regatta_lang ricorda la lingua dell'interfaccia. Sul sito, Google Analytics (vedi \"Terze parti\") imposta i propri cookie _ga e _ga_*, conservati fino a 2 anni.",
                },
              )}
            </li>
            <li>
              {tp(
                'Запись голоса только по твоей команде: в голосовом режиме тренажера рации и на тренировке устного экзамена на /sternik. Аудио идет через наш сервер в OpenAI для распознавания речи (см. «Третьи стороны»), затем текст проверяется по чек-листу упражнения. Ни аудио, ни текст не сохраняются в нашей базе; аудио удаляется после обработки запроса.',
                'A voice recording, only when you start it: in the radio trainer voice mode and in the oral exam practice on /sternik. The audio goes through our server to OpenAI for transcription (see Third parties), then the text is checked against the exercise checklist. Neither the audio nor the text is stored in our database; the audio is discarded after the request is processed.',
                'Nagranie głosu, wyłącznie gdy sam je uruchomisz: w trybie głosowym trenażera radiowego i w ćwiczeniu egzaminu ustnego na /sternik. Dźwięk trafia przez nasz serwer do OpenAI w celu rozpoznania mowy (zob. "Strony trzecie"), a potem tekst jest sprawdzany według listy kontrolnej ćwiczenia. Ani dźwięku, ani tekstu nie zapisujemy w naszej bazie; dźwięk jest usuwany po obsłużeniu żądania.',
                {
                  es: 'Una grabación de voz, solo cuando la inicias: en el modo de voz del simulador de radio y en la práctica del examen oral de /sternik. El audio pasa por nuestro servidor hasta OpenAI para su transcripción (ver "Terceros") y después el texto se comprueba con la lista de control del ejercicio. Ni el audio ni el texto se guardan en nuestra base de datos; el audio se elimina tras procesar la solicitud.',
                  fr: "Un enregistrement vocal, uniquement quand tu le lances : dans le mode vocal du simulateur radio et dans l'entraînement à l'examen oral sur /sternik. L'audio passe par notre serveur jusqu'à OpenAI pour la transcription (voir \"Tiers\"), puis le texte est vérifié selon la liste de contrôle de l'exercice. Ni l'audio ni le texte ne sont stockés dans notre base de données ; l'audio est supprimé une fois la requête traitée.",
                  de: 'Eine Sprachaufnahme, nur wenn du sie startest: im Sprachmodus des Funktrainers und im Training für die mündliche Prüfung auf /sternik. Das Audio geht über unseren Server zur Transkription an OpenAI (siehe "Drittanbieter"), danach wird der Text anhand der Übungscheckliste geprüft. Weder Audio noch Text werden in unserer Datenbank gespeichert; das Audio wird nach der Verarbeitung der Anfrage gelöscht.',
                  it: "Una registrazione vocale, solo quando la avvii: nella modalità vocale del simulatore radio e nell'allenamento per l'esame orale su /sternik. L'audio passa dal nostro server a OpenAI per la trascrizione (vedi \"Terze parti\"), poi il testo viene verificato con la checklist dell'esercizio. Né l'audio né il testo vengono salvati nel nostro database; l'audio viene eliminato dopo l'elaborazione della richiesta.",
                },
              )}
            </li>
            <li>
              {tp(
                'Текст, который ты пишешь AI-ассистенту, и лог гонки для AI-разбора: передаются через наш сервер в OpenAI для ответа и не сохраняются в нашей базе (см. «Третьи стороны»).',
                'Text you type to an AI assistant and the race log for the AI review: passed through our server to OpenAI to write the reply and not stored in our database (see Third parties).',
                'Tekst, który piszesz do asystenta AI, i zapis wyścigu do analizy AI: przekazujemy je przez nasz serwer do OpenAI w celu przygotowania odpowiedzi i nie zapisujemy ich w naszej bazie (zob. "Strony trzecie").',
                {
                  es: 'El texto que escribes a un asistente de IA y el registro de regata para el análisis con IA: pasan por nuestro servidor hasta OpenAI para generar la respuesta y no se guardan en nuestra base de datos (ver "Terceros").',
                  fr: 'Le texte que tu écris à un assistant IA et le journal de course pour l\'analyse IA : ils passent par notre serveur jusqu\'à OpenAI pour rédiger la réponse et ne sont pas stockés dans notre base de données (voir "Tiers").',
                  de: 'Text, den du einem KI-Assistenten schreibst, und das Rennprotokoll für die KI-Analyse: Beides geht über unseren Server an OpenAI, um die Antwort zu schreiben, und wird nicht in unserer Datenbank gespeichert (siehe "Drittanbieter").',
                  it: 'Il testo che scrivi a un assistente IA e il registro della regata per l\'analisi IA: passano dal nostro server a OpenAI per scrivere la risposta e non vengono salvati nel nostro database (vedi "Terze parti").',
                },
              )}
            </li>
          </ul>
        </Section>

        <Section
          title={tp('Сообщения, которые ты нам отправляешь', 'Messages you send us', 'Wiadomości, które do nas wysyłasz',
            { es: 'Mensajes que nos envías', fr: 'Messages que tu nous envoies', de: 'Nachrichten, die du uns schickst', it: 'Messaggi che ci invii' })}
        >
          <p className="text-sm">
            {tp(
              'Если ты пишешь нам через форму отзыва в кнопке ассистента или через страницу поддержки, мы получаем сообщение, контакт, который ты решил оставить (email или ник в Telegram), страницу, с которой ты пишешь, язык интерфейса, тип браузера и укороченный IP-адрес. Отзывы и обращения в поддержку хранятся в нашей базе; обращения в поддержку также пересылаются в наш закрытый чат в Telegram через сервис ботов Telegram. Автоматически они пока не удаляются; удаляем по запросу.',
              'If you write to us through the feedback form in the assistant button or through the support page, we receive your message, the contact you choose to leave (email or Telegram username), the page you wrote from, the interface language, the browser type and a shortened IP address. Feedback and support messages are stored in our database; support messages are also forwarded to our private Telegram chat through the Telegram bot service. They do not expire automatically yet; we delete them on request.',
              'Jeśli piszesz do nas przez formularz opinii w przycisku asystenta albo przez stronę wsparcia, otrzymujemy wiadomość, kontakt, który zdecydujesz się zostawić (e-mail lub nazwę w Telegramie), stronę, z której piszesz, język interfejsu, typ przeglądarki i skrócony adres IP. Opinie i zgłoszenia do wsparcia przechowujemy w naszej bazie; zgłoszenia do wsparcia są też przekazywane na nasz prywatny czat w Telegramie przez usługę botów Telegrama. Na razie nie wygasają automatycznie; usuwamy je na prośbę.',
              {
                es: 'Si nos escribes con el formulario de opinión del botón del asistente o desde la página de soporte, recibimos tu mensaje, el contacto que decidas dejar (correo electrónico o usuario de Telegram), la página desde la que escribes, el idioma de la interfaz, el tipo de navegador y una dirección IP acortada. Las opiniones y los mensajes de soporte se guardan en nuestra base de datos; los mensajes de soporte también se reenvían a nuestro chat privado de Telegram mediante el servicio de bots de Telegram. Por ahora no caducan automáticamente; los eliminamos si lo pides.',
                fr: "Si tu nous écris via le formulaire d'avis du bouton de l'assistant ou via la page d'assistance, nous recevons ton message, le contact que tu choisis de laisser (e-mail ou pseudo Telegram), la page d'où tu écris, la langue de l'interface, le type de navigateur et une adresse IP raccourcie. Les avis et les messages d'assistance sont stockés dans notre base de données ; les messages d'assistance sont aussi transmis à notre discussion Telegram privée via le service de bots de Telegram. Ils n'expirent pas encore automatiquement ; nous les supprimons sur demande.",
                de: 'Wenn du uns über das Feedback-Formular im Assistenten-Button oder über die Support-Seite schreibst, erhalten wir deine Nachricht, den Kontakt, den du freiwillig angibst (E-Mail oder Telegram-Name), die Seite, von der du schreibst, die Sprache der Oberfläche, den Browsertyp und eine gekürzte IP-Adresse. Feedback und Support-Nachrichten werden in unserer Datenbank gespeichert; Support-Nachrichten werden außerdem über den Bot-Dienst von Telegram an unseren privaten Telegram-Chat weitergeleitet. Sie laufen noch nicht automatisch ab; auf Anfrage löschen wir sie.',
                it: "Se ci scrivi con il modulo di feedback nel pulsante dell'assistente o dalla pagina di supporto, riceviamo il tuo messaggio, il contatto che scegli di lasciare (e-mail o nome utente Telegram), la pagina da cui scrivi, la lingua dell'interfaccia, il tipo di browser e un indirizzo IP abbreviato. I feedback e i messaggi di supporto sono salvati nel nostro database; i messaggi di supporto vengono anche inoltrati alla nostra chat Telegram privata tramite il servizio bot di Telegram. Per ora non scadono automaticamente; li eliminiamo su richiesta.",
              },
            )}
          </p>
        </Section>

        <Section
          title={tp('Что мы НЕ собираем', 'What we do NOT collect', 'Czego NIE zbieramy',
            { es: 'Lo que NO recopilamos', fr: 'Ce que nous NE collectons PAS', de: 'Was wir NICHT erfassen', it: 'Cosa NON raccogliamo' })}
        >
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>{tp('Имя, электронную почту, номер телефона, если только ты сам не укажешь их в отзыве или обращении в поддержку.', 'Name, email, phone number, unless you put them in a feedback or support message yourself.', 'Imienia, adresu e-mail, numeru telefonu, chyba że sam podasz je w opinii lub zgłoszeniu do wsparcia.',
              { es: 'Nombre, correo electrónico, número de teléfono, salvo que tú mismo los incluyas en una opinión o un mensaje de soporte.', fr: "Nom, e-mail, numéro de téléphone, sauf si tu les indiques toi-même dans un avis ou un message d'assistance.", de: 'Name, E-Mail, Telefonnummer, außer du gibst sie selbst in einem Feedback oder einer Support-Nachricht an.', it: 'Nome, e-mail, numero di telefono, a meno che tu non li inserisca in un feedback o in un messaggio di supporto.' })}</li>
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
              <strong>
                {tp('OpenAI (AI-тренер и чат-ассистенты)', 'OpenAI (AI coach and chat assistants)', 'OpenAI (trener AI i asystenci czatu)',
                  { es: 'OpenAI (entrenador IA y asistentes de chat)', fr: 'OpenAI (coach IA et assistants de chat)', de: 'OpenAI (KI-Trainer und Chat-Assistenten)', it: 'OpenAI (coach IA e assistenti di chat)' })}
              </strong>: {tp(
                'когда ты запрашиваешь AI-разбор гонки, лог гонки (без личных данных) отправляется в OpenAI. Когда ты пишешь AI-ассистенту (чат на этом сайте, AI-инструктор на /sternik, который также получает текущий вопрос, и «Спросить ассистента» в приложении для iPhone), твой текст и переписка идут через наш сервер в OpenAI, который пишет ответ. Мы этот текст не храним. По условиям API OpenAI не использует такие запросы для обучения моделей и может хранить их до 30 дней для контроля злоупотреблений.',
                'when you ask for the AI race review, your race log (no personal data) is sent to OpenAI. When you write to an AI assistant (the chat on this site, the AI instructor on /sternik, which also receives the question you are on, and Ask the assistant in the iPhone app), the text you type and the conversation go through our server to OpenAI, which writes the reply. We do not store this text. Under its API terms, OpenAI does not use these requests to train its models and may keep them for up to 30 days to monitor abuse.',
                'gdy prosisz o analizę wyścigu przez AI, zapis wyścigu (bez danych osobowych) trafia do OpenAI. Gdy piszesz do asystenta AI (czat na tej stronie, instruktor AI na /sternik, który dostaje też bieżące pytanie, oraz "Zapytaj asystenta" w aplikacji na iPhone), wpisany tekst i rozmowa trafiają przez nasz serwer do OpenAI, który pisze odpowiedź. Nie przechowujemy tego tekstu. Zgodnie z warunkami API OpenAI nie wykorzystuje tych zapytań do trenowania modeli i może je przechowywać do 30 dni w celu wykrywania nadużyć.',
                {
                  es: 'cuando pides el análisis de tu regata con IA, el registro de la regata (sin datos personales) se envía a OpenAI. Cuando escribes a un asistente de IA (el chat de este sitio, el instructor de IA de /sternik, que también recibe la pregunta en la que estás, y Pregunta al asistente en la app para iPhone), el texto que escribes y la conversación pasan por nuestro servidor hasta OpenAI, que redacta la respuesta. No guardamos ese texto. Según las condiciones de su API, OpenAI no usa estas solicitudes para entrenar modelos y puede conservarlas hasta 30 días para vigilar abusos.',
                  fr: "lorsque tu demandes l'analyse de ta course par IA, le journal de course (sans données personnelles) est envoyé à OpenAI. Lorsque tu écris à un assistant IA (le chat de ce site, l'instructeur IA de /sternik, qui reçoit aussi la question en cours, et Demander à l'assistant dans l'app iPhone), ton texte et la conversation passent par notre serveur jusqu'à OpenAI, qui rédige la réponse. Nous ne conservons pas ce texte. Selon les conditions de son API, OpenAI n'utilise pas ces requêtes pour entraîner ses modèles et peut les conserver jusqu'à 30 jours pour détecter les abus.",
                  de: 'wenn du die KI-Rennanalyse anforderst, geht dein Rennprotokoll (ohne personenbezogene Daten) an OpenAI. Wenn du einem KI-Assistenten schreibst (dem Chat auf dieser Website, dem KI-Lehrer auf /sternik, der auch die aktuelle Frage erhält, und "Assistenten fragen" in der iPhone-App), gehen dein Text und der Verlauf über unseren Server an OpenAI, das die Antwort schreibt. Wir speichern diesen Text nicht. Laut seinen API-Bedingungen nutzt OpenAI diese Anfragen nicht zum Trainieren von Modellen und darf sie bis zu 30 Tage zur Missbrauchserkennung aufbewahren.',
                  it: "quando chiedi l'analisi della regata con l'IA, il registro della regata (senza dati personali) viene inviato a OpenAI. Quando scrivi a un assistente IA (la chat di questo sito, l'istruttore IA su /sternik, che riceve anche la domanda su cui stai lavorando, e Chiedi all'assistente nell'app per iPhone), il testo che scrivi e la conversazione passano dal nostro server a OpenAI, che scrive la risposta. Non conserviamo questo testo. Secondo i termini della sua API, OpenAI non usa queste richieste per addestrare i modelli e può conservarle fino a 30 giorni per controllare gli abusi.",
                },
              )}
            </li>
            <li>
              <strong>
                {tp('OpenAI (распознавание речи: тренажер рации и устный экзамен)', 'OpenAI (speech recognition: radio trainer and oral exam)', 'OpenAI (rozpoznawanie mowy: trenażer radiowy i egzamin ustny)',
                  { es: 'OpenAI (reconocimiento de voz: simulador de radio y examen oral)', fr: 'OpenAI (reconnaissance vocale : simulateur radio et examen oral)', de: 'OpenAI (Spracherkennung: Funktrainer und mündliche Prüfung)', it: 'OpenAI (riconoscimento vocale: simulatore radio ed esame orale)' })}
              </strong>: {tp(
                'когда ты отправляешь голосовой ответ в тренажере рации или на тренировке устного экзамена на /sternik (на сайте или внутри приложения для iPhone), аудио передается через наш сервер в OpenAI для распознавания речи. Затем текст проверяется по чек-листу упражнения на нашем сервере или в браузере.',
                'when you submit a voice answer in the radio trainer or in the oral exam practice on /sternik (on this site or inside the iPhone app), the audio is relayed through our server to OpenAI for speech transcription. The text is then checked against the exercise checklist on our server or in your browser.',
                'gdy wysyłasz odpowiedź głosową w trenażerze radiowym albo w ćwiczeniu egzaminu ustnego na /sternik (na tej stronie lub w aplikacji na iPhone), nagranie jest przekazywane przez nasz serwer do OpenAI w celu rozpoznania mowy. Następnie tekst jest sprawdzany według listy kontrolnej ćwiczenia na naszym serwerze lub w przeglądarce.',
                {
                  es: 'cuando envías una respuesta de voz en el simulador de radio o en la práctica del examen oral de /sternik (en este sitio o dentro de la app para iPhone), el audio pasa por nuestro servidor hasta OpenAI para transcribir el habla. Después, el texto se comprueba con la lista de control del ejercicio en nuestro servidor o en tu navegador.',
                  fr: "lorsque tu envoies une réponse vocale dans le simulateur radio ou dans l'entraînement à l'examen oral sur /sternik (sur ce site ou dans l'app iPhone), l'audio passe par notre serveur jusqu'à OpenAI pour la reconnaissance vocale. Le texte est ensuite vérifié selon la liste de contrôle de l'exercice, sur notre serveur ou dans ton navigateur.",
                  de: 'wenn du eine gesprochene Antwort im Funktrainer oder im Training für die mündliche Prüfung auf /sternik absendest (auf dieser Website oder in der iPhone-App), wird das Audio über unseren Server zur Spracherkennung an OpenAI weitergeleitet. Der Text wird danach anhand der Übungscheckliste geprüft, auf unserem Server oder in deinem Browser.',
                  it: "quando invii una risposta vocale nel simulatore radio o nell'allenamento per l'esame orale su /sternik (su questo sito o nell'app per iPhone), l'audio viene inoltrato tramite il nostro server a OpenAI per il riconoscimento vocale. Il testo viene poi verificato con la checklist dell'esercizio, sul nostro server o nel tuo browser.",
                },
              )}
            </li>
            <li>
              <strong>PostHog</strong>: {tp(
                'продуктовая аналитика приложения для iPhone / iPad на серверах в ЕС (eu.i.posthog.com), как описано в разделе о приложении выше.',
                'product analytics of the iPhone / iPad app, on servers in the EU (eu.i.posthog.com), as described in the app section above.',
                'analityka produktowa aplikacji na iPhone / iPad na serwerach w UE (eu.i.posthog.com), jak opisano w sekcji o aplikacji powyżej.',
                {
                  es: 'analítica de producto de la app para iPhone / iPad, en servidores de la UE (eu.i.posthog.com), como se describe en la sección de la app más arriba.',
                  fr: "statistiques d'usage de l'app iPhone / iPad, sur des serveurs dans l'UE (eu.i.posthog.com), comme décrit dans la partie sur l'app ci-dessus.",
                  de: 'Produktanalyse der iPhone / iPad-App auf Servern in der EU (eu.i.posthog.com), wie oben im Abschnitt zur App beschrieben.',
                  it: "statistiche d'uso dell'app per iPhone / iPad, su server nell'UE (eu.i.posthog.com), come descritto nella sezione sull'app più sopra.",
                },
              )}
            </li>
            <li>
              <strong>Telegram</strong>: {tp(
                'копия каждого обращения со страницы поддержки пересылается в наш закрытый чат в Telegram через сервис ботов Telegram, поэтому Telegram обрабатывает его содержимое.',
                'a copy of each message from the support page is forwarded to our private Telegram chat through the Telegram bot service, so Telegram processes its content.',
                'kopia każdego zgłoszenia ze strony wsparcia jest przekazywana na nasz prywatny czat w Telegramie przez usługę botów Telegrama, więc Telegram przetwarza jego treść.',
                {
                  es: 'una copia de cada mensaje de la página de soporte se reenvía a nuestro chat privado de Telegram mediante el servicio de bots de Telegram, así que Telegram procesa su contenido.',
                  fr: "une copie de chaque message de la page d'assistance est transmise à notre discussion Telegram privée via le service de bots de Telegram, qui traite donc son contenu.",
                  de: 'Eine Kopie jeder Nachricht von der Support-Seite wird über den Bot-Dienst von Telegram an unseren privaten Telegram-Chat weitergeleitet, Telegram verarbeitet also ihren Inhalt.',
                  it: 'una copia di ogni messaggio della pagina di supporto viene inoltrata alla nostra chat Telegram privata tramite il servizio bot di Telegram, che quindi ne tratta il contenuto.',
                },
              )}
            </li>
            <li>
              <strong>YouTube</strong>: {tp(
                'видео в галерее и их превью загружаются с YouTube; на этом сайте видео воспроизводится с youtube-nocookie.com, только когда ты его открываешь. YouTube при этом видит твой IP-адрес и браузер, как любой сайт.',
                'gallery videos and their thumbnails load from YouTube; on this site a video plays from youtube-nocookie.com only after you open it. YouTube then sees your IP address and browser, as any website does.',
                'filmy w galerii i ich miniatury ładują się z YouTube; na tej stronie film odtwarza się z youtube-nocookie.com dopiero, gdy go otworzysz. YouTube widzi wtedy Twój adres IP i przeglądarkę, jak każda strona.',
                {
                  es: 'los vídeos de la galería y sus miniaturas se cargan desde YouTube; en este sitio un vídeo se reproduce desde youtube-nocookie.com solo cuando lo abres. YouTube ve entonces tu dirección IP y tu navegador, como cualquier sitio web.',
                  fr: "les vidéos de la galerie et leurs miniatures viennent de YouTube ; sur ce site, une vidéo est lue depuis youtube-nocookie.com seulement quand tu l'ouvres. YouTube voit alors ton adresse IP et ton navigateur, comme n'importe quel site.",
                  de: 'Videos der Galerie und ihre Vorschaubilder laden von YouTube; auf dieser Website wird ein Video erst dann von youtube-nocookie.com abgespielt, wenn du es öffnest. YouTube sieht dabei deine IP-Adresse und deinen Browser, wie jede Website.',
                  it: 'i video della galleria e le loro anteprime arrivano da YouTube; su questo sito un video viene riprodotto da youtube-nocookie.com solo quando lo apri. YouTube vede allora il tuo indirizzo IP e il browser, come qualsiasi sito.',
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
              'SQLite-база на нашем VPS-сервере. Резервные копии сжимаются, хранятся на том же сервере и удаляются не позже чем через 14 дней. Доступ к серверу - только у владельца проекта (Andrey, icoffio.com).',
              'SQLite database on our VPS server. Backup copies are compressed, kept on the same server and deleted after 14 days at most. Server access is limited to the project owner (Andrey, icoffio.com).',
              'Baza SQLite na naszym serwerze VPS. Kopie zapasowe są kompresowane, przechowywane na tym samym serwerze i usuwane najpóźniej po 14 dniach. Dostęp do serwera ma tylko właściciel projektu (Andrey, icoffio.com).',
              {
                es: 'Base de datos SQLite en nuestro servidor VPS. Las copias de seguridad se comprimen, se guardan en el mismo servidor y se eliminan como máximo a los 14 días. Solo el propietario del proyecto (Andrey, icoffio.com) tiene acceso al servidor.',
                fr: 'Base de données SQLite sur notre serveur VPS. Les sauvegardes sont compressées, conservées sur le même serveur et supprimées au bout de 14 jours au plus. Seul le propriétaire du projet (Andrey, icoffio.com) a accès au serveur.',
                de: 'SQLite-Datenbank auf unserem VPS-Server. Sicherungen werden komprimiert, auf demselben Server aufbewahrt und spätestens nach 14 Tagen gelöscht. Zugriff auf den Server hat nur der Projektinhaber (Andrey, icoffio.com).',
                it: 'Database SQLite sul nostro server VPS. I backup sono compressi, conservati sullo stesso server ed eliminati al massimo dopo 14 giorni. Solo il proprietario del progetto (Andrey, icoffio.com) ha accesso al server.',
              },
            )}
          </p>
        </Section>

        <Section
          title={tp('AI-тренер и ассистенты: дополнительно', 'AI coach and assistants: additional notes', 'Trener AI i asystenci: dodatkowe informacje',
            { es: 'Entrenador IA y asistentes: notas adicionales', fr: 'Coach IA et assistants : informations complémentaires', de: 'KI-Trainer und Assistenten: weitere Hinweise', it: 'Coach IA e assistenti: note aggiuntive' })}
        >
          <p className="text-sm">
            {tp(
              'AI-разбор гонки и ответы ассистентов генерирует языковая модель OpenAI на основе твоего лога гонки или вопроса. Модель может ошибаться. AI не дает медицинских, юридических или финансовых советов - только помогает с парусным спортом и темами курсов.',
              'The AI race review and the assistants\' answers are generated by an OpenAI language model from your race log or your question. The model can be wrong. The AI does not give medical, legal, or financial advice - it only helps with sailing and the course topics.',
              'Analizę wyścigu przez AI i odpowiedzi asystentów generuje model językowy OpenAI na podstawie zapisu Twojego wyścigu lub Twojego pytania. Model może się mylić. AI nie udziela porad medycznych, prawnych ani finansowych - pomaga tylko w żeglarstwie i tematach kursów.',
              {
                es: 'El análisis de regata con IA y las respuestas de los asistentes los genera un modelo de lenguaje de OpenAI a partir de tu registro de regata o de tu pregunta. El modelo puede equivocarse. La IA no da consejos médicos, legales ni financieros: solo ayuda con la vela y los temas de los cursos.',
                fr: "L'analyse de course par IA et les réponses des assistants sont générées par un modèle de langage d'OpenAI à partir de ton journal de course ou de ta question. Le modèle peut se tromper. L'IA ne donne pas de conseils médicaux, juridiques ou financiers : elle aide seulement pour la voile et les sujets des cours.",
                de: 'Die KI-Rennanalyse und die Antworten der Assistenten erstellt ein Sprachmodell von OpenAI auf Basis deines Rennprotokolls oder deiner Frage. Das Modell kann sich irren. Die KI gibt keine medizinischen, rechtlichen oder finanziellen Ratschläge, sondern hilft nur beim Segeln und bei den Kursthemen.',
                it: "L'analisi della regata con l'IA e le risposte degli assistenti sono generate da un modello linguistico di OpenAI in base al registro della tua regata o alla tua domanda. Il modello può sbagliare. L'IA non fornisce consigli medici, legali o finanziari: aiuta solo con la vela e gli argomenti dei corsi.",
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
              'Чтобы удалить свои данные (результаты гонок, реплеи, события сессий, отзывы и обращения в поддержку), напиши на ',
              'To delete your data (race results, replays, session events, feedback and support messages), email ',
              'Aby usunąć swoje dane (wyniki wyścigów, powtórki, zdarzenia sesji, opinie i zgłoszenia do wsparcia), napisz na ',
              {
                es: 'Para eliminar tus datos (resultados de regatas, repeticiones, eventos de sesión, opiniones y mensajes de soporte), escribe a ',
                fr: 'Pour supprimer tes données (résultats de course, replays, événements de session, avis et messages d\'assistance), écris à ',
                de: 'Um deine Daten zu löschen (Rennergebnisse, Replays, Sitzungsereignisse, Feedback und Support-Nachrichten), schreib an ',
                it: 'Per eliminare i tuoi dati (risultati delle regate, replay, eventi di sessione, feedback e messaggi di supporto), scrivi a ',
              },
            )}
            <a href="mailto:privacy@icoffio.com" className="text-[var(--accent-cyan)] hover:underline">privacy@icoffio.com</a>
            {tp(
              ' с указанием своего никнейма (если есть) или контакта, который ты оставил в сообщении. Удаление в течение 30 дней.',
              ' with your nickname (if any) or the contact you left in a message. Deletion within 30 days.',
              ' i podaj swój pseudonim (jeśli go masz) albo kontakt zostawiony w wiadomości. Usunięcie nastąpi w ciągu 30 dni.',
              {
                es: ' indicando tu apodo (si tienes) o el contacto que dejaste en un mensaje. Los eliminamos en un plazo de 30 días.',
                fr: ' en indiquant ton pseudo (le cas échéant) ou le contact laissé dans un message. Suppression sous 30 jours.',
                de: ' und nenne deinen Spitznamen (falls vorhanden) oder den Kontakt aus deiner Nachricht. Die Löschung erfolgt innerhalb von 30 Tagen.',
                it: ' indicando il tuo nickname (se ne hai uno) o il contatto lasciato in un messaggio. Eliminazione entro 30 giorni.',
              },
            )}
          </p>
        </Section>

        <Section
          title={tp('Изменения', 'Changes', 'Zmiany',
            { es: 'Cambios', fr: 'Modifications', de: 'Änderungen', it: 'Modifiche' })}
        >
          <p className="text-sm mb-2">
            {tp(
              'Когда политика меняется, мы обновляем дату вверху страницы и кратко описываем изменение здесь.',
              'When this policy changes, we update the date at the top of this page and summarize the change here.',
              'Gdy polityka się zmienia, aktualizujemy datę u góry strony i krótko opisujemy zmianę tutaj.',
              {
                es: 'Cuando la política cambia, actualizamos la fecha de arriba y resumimos aquí el cambio.',
                fr: 'Quand la politique change, nous mettons à jour la date en haut de cette page et résumons le changement ici.',
                de: 'Wenn sich die Richtlinie ändert, aktualisieren wir das Datum oben und fassen die Änderung hier zusammen.',
                it: "Quando l'informativa cambia, aggiorniamo la data in alto e riassumiamo qui la modifica.",
              },
            )}
          </p>
          <p className="text-sm">
            {tp(
              '2026-10-19: поставщиком AI-тренера и всех чат-ассистентов указан OpenAI (раньше по ошибке был указан Anthropic); добавлены сетевые запросы приложения для iPhone, голосовые ответы на тренировке устного экзамена /sternik, сроки хранения cookie (включая cookie Google Analytics), сохраняемые технические поля, сообщения, которые ты нам отправляешь, PostHog, Telegram и YouTube; regatta_sid назван псевдонимным идентификатором; исправлено описание резервных копий.',
              '2026-10-19: OpenAI is named as the provider of the AI coach and all chat assistants (the page wrongly named Anthropic); added the iPhone app\'s network use, voice answers in the /sternik oral exam practice, cookie lifetimes (including the Google Analytics cookies), the stored technical fields, messages you send us, PostHog, Telegram and YouTube; regatta_sid is described as a pseudonymous identifier; corrected the backup description.',
              '2026-10-19: jako dostawcę trenera AI i wszystkich asystentów czatu wskazaliśmy OpenAI (wcześniej błędnie podano Anthropic); dodaliśmy połączenia sieciowe aplikacji na iPhone, odpowiedzi głosowe w ćwiczeniu egzaminu ustnego na /sternik, czas przechowywania plików cookie (także plików cookie Google Analytics), zapisywane pola techniczne, wiadomości, które do nas wysyłasz, PostHog, Telegram i YouTube; regatta_sid opisaliśmy jako identyfikator pseudonimowy; poprawiliśmy opis kopii zapasowych.',
              {
                es: '2026-10-19: se indica OpenAI como proveedor del entrenador IA y de todos los asistentes de chat (la página indicaba Anthropic por error); se añaden el uso de la red de la app para iPhone, las respuestas de voz de la práctica del examen oral de /sternik, la duración de las cookies (también las de Google Analytics), los campos técnicos que guardamos, los mensajes que nos envías, PostHog, Telegram y YouTube; regatta_sid se describe como identificador seudónimo; se corrige la descripción de las copias de seguridad.',
                fr: "2026-10-19 : OpenAI est indiqué comme fournisseur du coach IA et de tous les assistants de chat (la page citait Anthropic par erreur) ; ajout de l'usage réseau de l'app iPhone, des réponses vocales de l'entraînement à l'examen oral sur /sternik, de la durée des cookies (y compris ceux de Google Analytics), des champs techniques enregistrés, des messages que tu nous envoies, de PostHog, Telegram et YouTube ; regatta_sid est décrit comme un identifiant pseudonyme ; description des sauvegardes corrigée.",
                de: '2026-10-19: OpenAI ist als Anbieter des KI-Trainers und aller Chat-Assistenten genannt (die Seite nannte fälschlich Anthropic); ergänzt wurden die Netzwerknutzung der iPhone-App, gesprochene Antworten im Training für die mündliche Prüfung auf /sternik, die Laufzeit der Cookies (auch der Cookies von Google Analytics), die gespeicherten technischen Felder, Nachrichten, die du uns schickst, PostHog, Telegram und YouTube; regatta_sid wird als pseudonyme Kennung beschrieben; die Beschreibung der Sicherungen wurde korrigiert.',
                it: "2026-10-19: OpenAI è indicato come fornitore del coach IA e di tutti gli assistenti di chat (la pagina indicava Anthropic per errore); aggiunti l'uso della rete dell'app per iPhone, le risposte vocali dell'allenamento per l'esame orale su /sternik, la durata dei cookie (compresi quelli di Google Analytics), i campi tecnici salvati, i messaggi che ci invii, PostHog, Telegram e YouTube; regatta_sid è descritto come identificativo pseudonimo; corretta la descrizione dei backup.",
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
