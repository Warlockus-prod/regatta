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
          {tp('Конфиденциальность', 'Privacy', 'Prywatnosc',
            { es: 'Privacidad', fr: 'Confidentialite', de: 'Datenschutz', it: 'Privacy' })}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          {tp('Политика конфиденциальности', 'Privacy Policy', 'Polityka prywatnosci',
            { es: 'Politica de privacidad', fr: 'Politique de confidentialite', de: 'Datenschutzerklaerung', it: 'Politica sulla privacy' })}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          {tp('Обновлено: 2026-05-21', 'Updated: 2026-05-21', 'Aktualizacja: 2026-05-21',
            { es: 'Actualizado: 2026-05-21', fr: 'Mis a jour : 2026-05-21', de: 'Aktualisiert: 2026-05-21', it: 'Aggiornato: 2026-05-21' })}
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
              { es: 'Aplicacion para iPhone / iPad', fr: 'Application iPhone / iPad', de: 'iPhone / iPad App', it: 'App per iPhone / iPad' })}
          </h2>
          <p className="text-sm">
            {tp(
              'Приложение «Week to Regatta» отправляет анонимную обобщённую продуктовую аналитику (просмотры экранов и события гонки, с пометкой языка и версии приложения), чтобы мы могли его улучшать. Это не привязано к твоей личности и никогда не используется для трекинга между приложениями; это можно выключить в Настройки -> Данные -> Анонимная аналитика. Больше ничего не покидает устройство: весь прогресс хранится локально (iOS AsyncStorage) и стирается в Настройки -> Данные -> Очистить. Остальная сеть используется только когда ты сам запускаешь: галерея, AI-разбор гонки, баннер дневного челленджа. Разделы ниже описывают САЙТ weektoregatta.com.',
              'The "Week to Regatta" app sends anonymous, aggregate product analytics (screen views and race events, tagged with app language and version) to help us improve it. This is not linked to your identity and is never used for cross-app tracking; you can turn it off in Settings -> Data -> Anonymous analytics. Nothing else leaves your device: all progress is stored locally (iOS AsyncStorage) and wiped from Settings -> Data -> Clear all. Other network use happens only on actions you start: gallery, AI race review, daily-challenge banner. The sections below describe the WEBSITE weektoregatta.com.',
              'Aplikacja "Week to Regatta" wysyla anonimowa, zbiorcza analityke produktowa (odslony ekranow i zdarzenia wyscigu, oznaczone jezykiem i wersja aplikacji), aby pomoc nam ja ulepszac. Nie jest to powiazane z Twoja tozsamoscia i nigdy nie sluzy do sledzenia miedzy aplikacjami; mozesz to wylaczyc w Ustawienia -> Dane -> Anonimowa analityka. Nic wiecej nie opuszcza urzadzenia: caly postep jest przechowywany lokalnie (iOS AsyncStorage) i kasowany w Ustawienia -> Dane -> Wyczysc. Reszta sieci dziala tylko gdy sam ja uruchomisz: galeria, analiza AI, baner wyzwania dnia. Sekcje ponizej opisuja STRONE weektoregatta.com.',
              {
                es: 'La aplicacion «Week to Regatta» envia analitica de producto anonima y agregada (vistas de pantalla y eventos de regata, etiquetados con el idioma y la version de la app) para ayudarnos a mejorarla. No se vincula a tu identidad y nunca se usa para rastreo entre apps; puedes desactivarla en Ajustes -> Datos -> Analitica anonima. Nada mas sale de tu dispositivo: todo el progreso se guarda localmente (iOS AsyncStorage) y se borra en Ajustes -> Datos -> Borrar todo. El resto de la red solo se usa en acciones que tu inicias: galeria, analisis de regata con IA, banner del reto diario. Las secciones siguientes describen el SITIO weektoregatta.com.',
                fr: 'L\'application « Week to Regatta » envoie des analyses produit anonymes et agregees (vues d\'ecran et evenements de course, associes a la langue et version de l\'app) pour nous aider a l\'ameliorer. Ce n\'est pas lie a ton identite et n\'est jamais utilise pour le suivi entre applications ; tu peux le desactiver dans Reglages -> Donnees -> Analyse anonyme. Rien d\'autre ne quitte ton appareil : toute la progression est stockee localement (iOS AsyncStorage) et effacee depuis Reglages -> Donnees -> Tout effacer. Le reste du reseau n\'est utilise que pour les actions que tu lances : galerie, analyse de course IA, banniere du defi du jour. Les sections ci-dessous decrivent le SITE weektoregatta.com.',
                de: 'Die App «Week to Regatta» sendet anonyme, aggregierte Produktanalysen (Bildschirmaufrufe und Rennereignisse, versehen mit App-Sprache und -Version), um uns zu helfen, sie zu verbessern. Das ist nicht mit deiner Identitaet verknuepft und wird nie fuer App-uebergreifendes Tracking verwendet; du kannst es unter Einstellungen -> Daten -> Anonyme Analyse abschalten. Sonst verlaesst nichts dein Geraet: der gesamte Fortschritt wird lokal gespeichert (iOS AsyncStorage) und unter Einstellungen -> Daten -> Alles loeschen entfernt. Das uebrige Netzwerk wird nur bei Aktionen genutzt, die du startest: Galerie, KI-Rennanalyse, Tages-Challenge-Banner. Die Abschnitte unten beschreiben die WEBSITE weektoregatta.com.',
                it: 'L\'app «Week to Regatta» invia analisi di prodotto anonime e aggregate (visualizzazioni delle schermate ed eventi di gara, contrassegnati con lingua e versione dell\'app) per aiutarci a migliorarla. Non e collegato alla tua identita e non viene mai usato per il tracciamento tra app; puoi disattivarlo in Impostazioni -> Dati -> Analisi anonima. Nient\'altro lascia il tuo dispositivo: tutti i progressi sono salvati localmente (iOS AsyncStorage) e cancellati da Impostazioni -> Dati -> Cancella tutto. Il resto della rete si usa solo per azioni che avvii tu: galleria, analisi gara con AI, banner della sfida del giorno. Le sezioni sotto descrivono il SITO weektoregatta.com.',
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
            { es: 'Que recopilamos', fr: 'Ce que nous collectons', de: 'Was wir erfassen', it: 'Cosa raccogliamo' })}
        >
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>
              {tp(
                'Технические события: открытие страниц, ошибки JavaScript, размер окна, язык браузера, тип устройства. Сохраняются в нашу базу для анализа стабильности.',
                'Technical events: page opens, JavaScript errors, viewport size, browser language, device type. Stored in our database for stability analysis.',
                'Zdarzenia techniczne: otwarcia stron, bledy JavaScript, rozmiar okna, jezyk przegladarki, typ urzadzenia. Zapisywane w bazie do analizy stabilnosci.',
                {
                  es: 'Eventos tecnicos: aperturas de paginas, errores de JavaScript, tamano de la ventana, idioma del navegador, tipo de dispositivo. Se guardan en nuestra base de datos para analisis de estabilidad.',
                  fr: 'Evenements techniques : ouvertures de pages, erreurs JavaScript, taille de fenetre, langue du navigateur, type d\'appareil. Conserves dans notre base de donnees pour l\'analyse de la stabilite.',
                  de: 'Technische Ereignisse: Seitenaufrufe, JavaScript-Fehler, Fenstergroesse, Browsersprache, Geraetetyp. Gespeichert in unserer Datenbank zur Stabilitaetsanalyse.',
                  it: 'Eventi tecnici: aperture di pagine, errori JavaScript, dimensione della finestra, lingua del browser, tipo di dispositivo. Memorizzati nel nostro database per analisi di stabilita.',
                },
              )}
            </li>
            <li>
              {tp(
                'Результаты гонок: время финиша, уровень сложности, выбранный никнейм. Сохраняются для лидерборда.',
                'Race results: finish time, difficulty level, chosen nickname. Stored for the leaderboard.',
                'Wyniki regat: czas finiszu, poziom trudnosci, wybrany pseudonim. Zapisywane dla rankingu.',
                {
                  es: 'Resultados de regata: tiempo de meta, nivel de dificultad, apodo elegido. Se guardan para la clasificacion.',
                  fr: 'Resultats de course : temps a l\'arrivee, niveau de difficulte, pseudo choisi. Conserves pour le classement.',
                  de: 'Renn-Ergebnisse: Zielzeit, Schwierigkeitsstufe, gewaehlter Spitzname. Gespeichert fuer die Bestenliste.',
                  it: 'Risultati di gara: tempo di arrivo, livello di difficolta, soprannome scelto. Memorizzati per la classifica.',
                },
              )}
            </li>
            <li>
              {tp(
                'Страна (приблизительно из IP-адреса), UTM-метки из ссылки.',
                'Country (approximated from IP address), UTM tags from incoming link.',
                'Kraj (przyblizony na podstawie adresu IP), tagi UTM z linku.',
                {
                  es: 'Pais (aproximado por la direccion IP), etiquetas UTM del enlace.',
                  fr: 'Pays (approxime depuis l\'adresse IP), parametres UTM du lien d\'arrivee.',
                  de: 'Land (geschaetzt anhand der IP-Adresse), UTM-Parameter aus dem Link.',
                  it: 'Paese (approssimato dall\'indirizzo IP), tag UTM dal link.',
                },
              )}
            </li>
            <li>
              {tp(
                'Сессионный cookie regatta_sid (UUID, без личных данных). Используется только для связи событий одной сессии.',
                'Session cookie regatta_sid (UUID, no personal data). Used only to group events of the same session.',
                'Cookie sesyjne regatta_sid (UUID, bez danych osobowych). Uzywane tylko do laczenia zdarzen tej samej sesji.',
                {
                  es: 'Cookie de sesion regatta_sid (UUID, sin datos personales). Solo se utiliza para agrupar eventos de la misma sesion.',
                  fr: 'Cookie de session regatta_sid (UUID, sans donnees personnelles). Utilise uniquement pour regrouper les evenements d\'une meme session.',
                  de: 'Sitzungs-Cookie regatta_sid (UUID, ohne personenbezogene Daten). Wird nur zur Gruppierung von Ereignissen derselben Sitzung verwendet.',
                  it: 'Cookie di sessione regatta_sid (UUID, senza dati personali). Usato solo per raggruppare eventi della stessa sessione.',
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
            <li>{tp('Имя, электронную почту, номер телефона.', 'Name, email, phone number.', 'Imie, e-mail, numer telefonu.',
              { es: 'Nombre, correo electronico, numero de telefono.', fr: 'Nom, e-mail, numero de telephone.', de: 'Name, E-Mail, Telefonnummer.', it: 'Nome, e-mail, numero di telefono.' })}</li>
            <li>{tp('Точную геолокацию.', 'Precise geolocation.', 'Dokladna lokalizacja.',
              { es: 'Geolocalizacion precisa.', fr: 'Geolocalisation precise.', de: 'Genaue Standortdaten.', it: 'Geolocalizzazione precisa.' })}</li>
            <li>{tp('Контент с других приложений или сайтов (мы не отслеживаем тебя вне regatta).', 'Content from other apps or websites (we do not track you outside regatta).', 'Tresci z innych aplikacji ani stron (nie sledzimy cie poza regatta).',
              { es: 'Contenido de otras aplicaciones o sitios web (no te rastreamos fuera de regatta).', fr: 'Contenu provenant d\'autres applis ou sites (nous ne te suivons pas hors de regatta).', de: 'Inhalte aus anderen Apps oder Webseiten (wir verfolgen dich nicht ausserhalb von regatta).', it: 'Contenuti da altre app o siti web (non ti tracciamo fuori da regatta).' })}</li>
            <li>{tp('Биометрию, контакты, фото, микрофон.', 'Biometrics, contacts, photos, microphone.', 'Biometria, kontakty, zdjecia, mikrofon.',
              { es: 'Biometria, contactos, fotos, microfono.', fr: 'Donnees biometriques, contacts, photos, microphone.', de: 'Biometrie, Kontakte, Fotos, Mikrofon.', it: 'Biometria, contatti, foto, microfono.' })}</li>
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
                'zagregowane statystyki odwiedzin. GA otrzymuje tylko anonimowe zdarzenia, IP jest anonimizowane po stronie Google.',
                {
                  es: 'estadisticas de visitas agregadas. GA solo recibe eventos anonimizados, la IP se anonimiza del lado de Google.',
                  fr: 'statistiques de visite agregees. GA ne recoit que des evenements anonymises ; l\'IP est anonymisee cote Google.',
                  de: 'aggregierte Besuchsstatistik. GA erhaelt nur anonymisierte Ereignisse, die IP wird seitens Google anonymisiert.',
                  it: 'statistiche di visita aggregate. GA riceve solo eventi anonimizzati; l\'IP viene anonimizzato lato Google.',
                },
              )}
            </li>
            <li>
              <strong>Anthropic (AI Coach)</strong>: {tp(
                'когда ты запрашиваешь AI-разбор гонки, твой лог гонки (без личных данных) отправляется в Anthropic для анализа. Anthropic не использует наши запросы для тренировки моделей.',
                'when you request the AI race review, your race log (no personal data) is sent to Anthropic for analysis. Anthropic does not use our requests to train models.',
                'kiedy zadasz analizy AI, twoj log regaty (bez danych osobowych) jest wysylany do Anthropic. Anthropic nie uzywa naszych zapytan do treningu modeli.',
                {
                  es: 'cuando solicitas el analisis de IA, tu registro de regata (sin datos personales) se envia a Anthropic. Anthropic no usa nuestras solicitudes para entrenar modelos.',
                  fr: 'lorsque tu demandes l\'analyse IA, ton log de course (sans donnees personnelles) est envoye a Anthropic. Anthropic n\'utilise pas nos requetes pour entrainer ses modeles.',
                  de: 'wenn du die KI-Auswertung anforderst, wird dein Rennlog (ohne personenbezogene Daten) an Anthropic gesendet. Anthropic nutzt unsere Anfragen nicht zum Trainieren der Modelle.',
                  it: 'quando richiedi l\'analisi AI, il tuo log di gara (senza dati personali) viene inviato ad Anthropic. Anthropic non utilizza le nostre richieste per addestrare i modelli.',
                },
              )}
            </li>
          </ul>
        </Section>

        <Section
          title={tp('Где хранятся данные', 'Where data is stored', 'Gdzie sa przechowywane dane',
            { es: 'Donde se almacenan los datos', fr: 'Ou les donnees sont stockees', de: 'Wo Daten gespeichert werden', it: 'Dove vengono memorizzati i dati' })}
        >
          <p className="text-sm">
            {tp(
              'SQLite-база на нашем VPS-сервере. Резервные копии шифруются и хранятся 30 дней. Доступ к серверу - только у владельца проекта (Andrey, icoffio.com).',
              'SQLite database on our VPS server. Backups are encrypted and retained for 30 days. Server access is limited to the project owner (Andrey, icoffio.com).',
              'Baza SQLite na naszym serwerze VPS. Kopie zapasowe sa szyfrowane i przechowywane przez 30 dni. Dostep do serwera ma tylko wlasciciel projektu (Andrey, icoffio.com).',
              {
                es: 'Base de datos SQLite en nuestro servidor VPS. Las copias de seguridad estan cifradas y se conservan durante 30 dias. El acceso al servidor lo tiene solo el propietario del proyecto (Andrey, icoffio.com).',
                fr: 'Base de donnees SQLite sur notre serveur VPS. Les sauvegardes sont chiffrees et conservees 30 jours. L\'acces au serveur est limite au proprietaire du projet (Andrey, icoffio.com).',
                de: 'SQLite-Datenbank auf unserem VPS-Server. Sicherungen werden verschluesselt und 30 Tage aufbewahrt. Serverzugriff hat nur der Projekteigentuemer (Andrey, icoffio.com).',
                it: 'Database SQLite sul nostro server VPS. I backup sono crittografati e conservati per 30 giorni. L\'accesso al server e limitato al proprietario del progetto (Andrey, icoffio.com).',
              },
            )}
          </p>
        </Section>

        <Section
          title={tp('AI-тренер: дополнительно', 'AI Coach: additional notes', 'Trener AI: dodatkowe uwagi',
            { es: 'Entrenador IA: notas adicionales', fr: 'Coach IA : notes complementaires', de: 'KI-Trainer: zusaetzliche Hinweise', it: 'AI Coach: note aggiuntive' })}
        >
          <p className="text-sm">
            {tp(
              'AI-разбор гонки генерируется языковой моделью Claude от Anthropic на основе твоего лога гонки. Модель может ошибаться. AI не дает медицинских, юридических или финансовых советов - только анализ техники парусного спорта.',
              'The AI race review is generated by Anthropic\'s Claude language model based on your race log. The model can be wrong. The AI does not give medical, legal, or financial advice - only sailing technique analysis.',
              'Analiza AI jest generowana przez model jezykowy Claude od Anthropic na podstawie twojego loga regaty. Model moze sie mylic. AI nie udziela porad medycznych, prawnych ani finansowych - tylko analizy techniki zeglarskiej.',
              {
                es: 'El analisis de IA lo genera el modelo de lenguaje Claude de Anthropic a partir de tu registro de regata. El modelo puede equivocarse. La IA no da consejos medicos, legales ni financieros, solo analisis de tecnica de vela.',
                fr: 'L\'analyse IA est generee par le modele de langage Claude d\'Anthropic a partir de ton log de course. Le modele peut se tromper. L\'IA ne donne pas de conseils medicaux, juridiques ou financiers - uniquement de l\'analyse de technique a la voile.',
                de: 'Die KI-Analyse wird vom Sprachmodell Claude von Anthropic auf Basis deines Rennlogs erstellt. Das Modell kann sich irren. Die KI gibt keine medizinischen, juristischen oder finanziellen Ratschlaege - nur Analyse der Segeltechnik.',
                it: 'L\'analisi AI e generata dal modello linguistico Claude di Anthropic in base al tuo log di gara. Il modello puo sbagliare. L\'AI non fornisce consigli medici, legali o finanziari - solo analisi della tecnica velica.',
              },
            )}
          </p>
        </Section>

        <Section
          title={tp('Удаление данных', 'Data deletion', 'Usuwanie danych',
            { es: 'Eliminacion de datos', fr: 'Suppression des donnees', de: 'Loeschen der Daten', it: 'Eliminazione dei dati' })}
        >
          <p className="text-sm">
            {tp(
              'Чтобы удалить свои данные (результаты гонок, события сессий), напиши на ',
              'To delete your data (race results, session events), email ',
              'Aby usunac swoje dane (wyniki regat, zdarzenia sesji), napisz na ',
              {
                es: 'Para eliminar tus datos (resultados de regata, eventos de sesion), escribe a ',
                fr: 'Pour supprimer tes donnees (resultats de course, evenements de session), ecris a ',
                de: 'Um deine Daten zu loeschen (Renn-Ergebnisse, Sitzungsereignisse), schreibe an ',
                it: 'Per eliminare i tuoi dati (risultati di gara, eventi di sessione), scrivi a ',
              },
            )}
            <a href="mailto:privacy@icoffio.com" className="text-[var(--accent-cyan)] hover:underline">privacy@icoffio.com</a>
            {tp(
              ' с указанием своего nickname (если есть). Удаление в течение 30 дней.',
              ' with your nickname (if any). Deletion within 30 days.',
              ' z podaniem swojego nicku (jesli istnieje). Usuniecie w ciagu 30 dni.',
              {
                es: ' con tu apodo (si lo hay). Eliminacion en 30 dias.',
                fr: ' en indiquant ton pseudo (le cas echeant). Suppression sous 30 jours.',
                de: ' und nenne deinen Spitznamen (falls vorhanden). Loeschung innerhalb von 30 Tagen.',
                it: ' con il tuo nickname (se presente). Eliminazione entro 30 giorni.',
              },
            )}
          </p>
        </Section>

        <Section
          title={tp('Изменения', 'Changes', 'Zmiany',
            { es: 'Cambios', fr: 'Modifications', de: 'Aenderungen', it: 'Modifiche' })}
        >
          <p className="text-sm">
            {tp(
              'Если политика меняется существенно, мы покажем баннер в приложении / на сайте перед вступлением в силу. Дата вверху страницы фиксирует последнее изменение.',
              'If the policy changes materially, we will show an in-app/web banner before it takes effect. The date at the top of this page marks the last change.',
              'Jesli polityka zmieni sie istotnie, pokazemy banner w aplikacji / na stronie przed wejsciem w zycie. Data u gory strony oznacza ostatnia zmiane.',
              {
                es: 'Si la politica cambia de manera importante, mostraremos un banner en la app / sitio antes de su entrada en vigor. La fecha en la parte superior indica el ultimo cambio.',
                fr: 'Si la politique change de maniere notable, nous afficherons une banniere dans l\'appli / sur le site avant l\'entree en vigueur. La date en haut de cette page marque la derniere modification.',
                de: 'Bei wesentlichen Aenderungen zeigen wir vor Inkrafttreten ein Banner in der App bzw. Webseite an. Das Datum oben auf der Seite zeigt die letzte Aenderung.',
                it: 'Se la politica cambia in modo sostanziale, mostreremo un banner nell\'app / sul sito prima dell\'entrata in vigore. La data in alto indica l\'ultima modifica.',
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
              'Pytania dotyczace polityki prywatnosci: ',
              {
                es: 'Preguntas sobre esta politica: ',
                fr: 'Questions sur cette politique : ',
                de: 'Fragen zu dieser Richtlinie: ',
                it: 'Domande su questa politica: ',
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
