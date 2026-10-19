'use client';

import { useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import type { SimLabels } from './types';
import { SAIL_PLAN } from "@/lib/sailing-physics/sail-plan";

// Load the heavy three.js scene only on the client (keeps it out of SSR).
const Simulator3D = dynamic(() => import('./Simulator3D').then((m) => m.Simulator3D), { ssr: false });

// ============================================================================
// SimulatorV2 - the app-integrated wrapper around the standalone Simulator3D.
//
// This is the ONLY file in the module that touches Next.js and the app i18n.
// It localizes the labels and supplies the Basics/Trainer/3D switcher; the
// core Simulator3D stays portable. Remove this file (and use Simulator3D
// directly) to lift the module into another app.
//
// ?embed=1 (sent by the iOS app's WebView) hides the switcher and turns on the
// compact 100dvh layout so every control is reachable without page scroll -
// the WKWebView embeds these pages with page scrolling disabled.
// ============================================================================

function SimulatorV2Inner() {
  const { tp } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const embed = searchParams.get('embed') === '1';
  const offline = searchParams.get("offline") === "1";

  const labels: SimLabels = useMemo(
    () => ({
      scene: {
        both: tp("Оба", "Both", "Oba", { es: "Ambas", fr: "Les deux", de: "Beide", it: "Entrambe" }),
        main: tp("Грот", "Main", "Grot", { es: "Mayor", fr: "Grand-voile", de: "Großsegel", it: "Randa" }),
        jib: tp("Стаксель", "Jib", "Fok", { es: "Foque", fr: "Foc", de: "Fock", it: "Fiocco" }),
        stern: tp("С кормы", "Astern", "Od rufy", { es: "Desde popa", fr: "De poupe", de: "Von achtern", it: "Da poppa" }),
        flow: tp("Поток ветра", "Airflow", "Przepływ", { es: "Flujo de aire", fr: "Flux d'air", de: "Luftstrom", it: "Flusso d'aria" }),
        relativeWind: tp("относительно носа", "relative to bow", "względem dziobu", { es: "respecto a proa", fr: "par rapport à l'étrave", de: "relativ zum Bug", it: "rispetto alla prua" }),
        trueWind: tp("Истинный", "True wind", "Wiatr prawdziwy", { es: "Viento real", fr: "Vent réel", de: "Wahrer Wind", it: "Vento reale" }),
        calmWind: tp("Нет потока воздуха", "No airflow", "Brak przepływu", { es: "Sin flujo de aire", fr: "Pas de flux d'air", de: "Kein Luftstrom", it: "Nessun flusso d'aria" }),

        fullSailPlan: tp(`Полные паруса: грот ${SAIL_PLAN.main.area} м², стаксель ${SAIL_PLAN.jib.area} м²`,
          `Full sails: main ${SAIL_PLAN.main.area} m², jib ${SAIL_PLAN.jib.area} m²`,
          `Pełne żagle: grot ${SAIL_PLAN.main.area} m², fok ${SAIL_PLAN.jib.area} m²`, {
            es: `Velas completas: mayor ${SAIL_PLAN.main.area} m², foque ${SAIL_PLAN.jib.area} m²`,
            fr: `Voiles entières : grand-voile ${SAIL_PLAN.main.area} m², foc ${SAIL_PLAN.jib.area} m²`,
            de: `Volle Segel: Groß ${SAIL_PLAN.main.area} m², Fock ${SAIL_PLAN.jib.area} m²`,
            it: `Vele complete: randa ${SAIL_PLAN.main.area} m², fiocco ${SAIL_PLAN.jib.area} m²`,
          }),
        whole: tp("Вся яхта", "Whole yacht", "Cały jacht", { es: "Yate completo", fr: "Tout le bateau", de: "Ganze Yacht", it: "Tutta la barca" }),
        sails: tp("Паруса", "Sails", "Żagle", { es: "Velas", fr: "Voiles", de: "Segel", it: "Vele" }),
        deck: tp("Палуба", "Deck", "Pokład", { es: "Cubierta", fr: "Pont", de: "Deck", it: "Coperta" }),
        resetView: tp("Сбросить камеру", "Reset camera", "Resetuj kamerę", { es: "Restablecer cámara", fr: "Réinitialiser la caméra", de: "Kamera zurücksetzen", it: "Reimposta camera" }),
        more: tp("Ветер и точная настройка", "Wind and fine tuning", "Wiatr i dokładne ustawienia", { es: "Viento y ajuste fino", fr: "Vent et réglages fins", de: "Wind und Feineinstellung", it: "Vento e regolazioni fini" }),
        instruments: tp("Все приборы", "More instruments", "Więcej przyrządów", { es: "Más instrumentos", fr: "Plus de mesures", de: "Weitere Instrumente", it: "Altri strumenti" }),
        loading: tp("Загружаем яхту...", "Loading yacht...", "Ładowanie jachtu...", { es: "Cargando el yate...", fr: "Chargement du bateau...", de: "Yacht wird geladen...", it: "Caricamento della barca..." }),
        error: offline ? tp("Локальная 3D-сцена недоступна. Повтори запуск; интернет не требуется.", "The local 3D scene is unavailable. Try again; no internet is needed.", "Lokalna scena 3D jest niedostępna. Spróbuj ponownie; internet nie jest potrzebny.", { es: "La escena 3D local no está disponible. Reintenta; no necesitas internet.", fr: "La scène 3D locale est indisponible. Réessaie ; internet n'est pas nécessaire.", de: "Die lokale 3D-Szene ist nicht verfügbar. Erneut versuchen; kein Internet nötig.", it: "La scena 3D locale non è disponibile. Riprova; non serve internet." }) : tp("Не удалось загрузить 3D. Проверь соединение или попробуй другой браузер.", "The 3D scene could not load. Check your connection or try another browser.", "Nie udało się załadować 3D. Sprawdź połączenie lub użyj innej przeglądarki.", { es: "No se pudo cargar la escena 3D. Comprueba la conexión o prueba otro navegador.", fr: "La scène 3D ne se charge pas. Vérifie la connexion ou essaie un autre navigateur.", de: "Die 3D-Szene konnte nicht geladen werden. Prüfe die Verbindung oder versuche einen anderen Browser.", it: "Impossibile caricare la scena 3D. Controlla la connessione o prova un altro browser." }),
        retry: tp("Попробовать снова", "Try again", "Spróbuj ponownie", { es: "Reintentar", fr: "Réessayer", de: "Erneut versuchen", it: "Riprova" }),
        heading: tp("Курс", "Heading", "Kurs", { es: "Rumbo", fr: "Cap", de: "Kurs", it: "Rotta" }),
        windDial: tp("Указатель ветра", "Wind dial", "Wskaźnik wiatru", { es: "Indicador de viento", fr: "Indicateur de vent", de: "Windanzeige", it: "Indicatore del vento" }),
        target: tp("Целевая скорость", "Target speed", "Prędkość docelowa", { es: "Velocidad objetivo", fr: "Vitesse cible", de: "Zielgeschwindigkeit", it: "Velocità obiettivo" }),
        apparent: tp("Вымпельный ветер", "Apparent wind", "Wiatr pozorny", { es: "Viento aparente", fr: "Vent apparent", de: "Scheinbarer Wind", it: "Vento apparente" }),
        light: tp("Лёгкая графика", "Light graphics", "Lekka grafika", { es: "Gráficos ligeros", fr: "Graphismes légers", de: "Leichte Grafik", it: "Grafica leggera" }),
        quality: tp("Графика", "Graphics", "Grafika", { es: "Gráficos", fr: "Graphismes", de: "Grafik", it: "Grafica" }),
        sailingHint: tp("Есть помощь руления на малой скорости. Держи стрелку, чтобы повернуть. Паруса перейдут сами; шкоты регулируешь ты.", "Low-speed steering assistance is enabled. Hold an arrow to steer. Sails change sides automatically; you control the sheets.", "Pomoc sterowania działa przy małej prędkości. Przytrzymaj strzałkę, aby skręcić. Żagle przejdą same; ty regulujesz szoty.", { es: "Hay ayuda al timón a baja velocidad. Mantén una flecha para girar. Las velas cambian de banda solas; tú regulas las escotas.", fr: "Une aide à la barre agit à faible vitesse. Maintiens une flèche pour tourner. Les voiles changent de bord seules ; tu règles les écoutes.", de: "Bei geringer Fahrt hilft eine Steuerhilfe. Halte einen Pfeil zum Steuern. Die Segel wechseln automatisch die Seite; du stellst die Schoten ein.", it: "È attivo l'aiuto al timone a bassa velocità. Tieni premuta una freccia per girare. Le vele cambiano lato da sole; tu regoli le scotte." }),
      },
      badge: tp('ЛОДКА 3D', '3D BOAT', 'ŁÓDKA 3D', {
        es: 'BARCO 3D', fr: 'BATEAU 3D', de: '3D-BOOT', it: 'BARCA 3D',
      }),
      freeModeHint: tp(
        'Здесь ты позируешь такелаж. Повернуть лодку и рулить - в режиме "Ход под парусом".',
        'Free trim poses the rig. To steer and turn the boat, switch to "Sailing".',
        'Tu ustawiasz olinowanie i żagle ręcznie. Aby sterować i obracać jacht, przełącz na "Żeglowanie".',
        {
          es: 'Aquí colocas el aparejo a mano. Para gobernar y girar el barco, cambia a "Navegando".',
          fr: 'Ici, tu places le gréement à la main. Pour barrer et tourner, passe en "En navigation".',
          de: 'Hier stellst du das Rigg frei ein. Zum Steuern und Drehen wechsle zu "Segeln".',
          it: 'Qui posizioni l\'attrezzatura a mano. Per governare e girare la barca passa a "In navigazione".',
        },
      ),
      orbitHint: tp('тяни мышью - орбита, колесо - зум', 'drag to orbit, wheel to zoom', 'przeciągnij - orbita, kółko - zoom', {
        es: 'arrastra - órbita, rueda - zoom', fr: 'glisser - orbite, molette - zoom', de: 'ziehen - Orbit, Rad - Zoom', it: 'trascina - orbita, rotella - zoom',
      }),
      modeFree: tp('Свободный трим', 'Free trim', 'Swobodny trym', {
        es: 'Trimado libre', fr: 'Réglage libre', de: 'Freier Trimm', it: 'Regolazione libera',
      }),
      modeSail: tp('Ход под парусом', 'Sailing', 'Żeglowanie', {
        es: 'Navegando', fr: 'En navigation', de: 'Segeln', it: 'In navigazione',
      }),
      pointOfSail: tp('Точка курса', 'Point of sail', 'Kurs', {
        es: 'Rumbo', fr: 'Allure', de: 'Kurs zum Wind', it: 'Andatura',
      }),
      mainsheet: tp('Гика-шкот', 'Mainsheet', 'Szot grota', {
        es: 'Escota de mayor', fr: 'Écoute de grand-voile', de: 'Großschot', it: 'Scotta della randa',
      }),
      jibsheet: tp('Стаксель-шкот', 'Jib sheet', 'Szot foka', {
        es: 'Escota de foque', fr: 'Écoute de foc', de: 'Fockschot', it: 'Scotta del fiocco',
      }),
      camber: tp('Пузо (камбер)', 'Draft (camber)', 'Brzuch (głębokość)', {
        es: 'Bolsa (camber)', fr: 'Creux (camber)', de: 'Bauch (Camber)', it: 'Grasso (camber)',
      }),
      twist: tp('Твист', 'Twist', 'Skręt', { es: 'Torsión', fr: 'Vrillage', de: 'Twist', it: 'Svergolamento' }),
      luffing: tp('Полоскание', 'Luffing', 'Łopot', {
        es: 'Flameo', fr: 'Faseyement', de: 'Killen', it: 'Fileggiamento',
      }),
      reef: tp('Риф', 'Reef', 'Ref', { es: 'Rizo', fr: 'Ris', de: 'Reff', it: 'Terzaroli' }),
      rudder: tp('Руль', 'Rudder', 'Ster', { es: 'Timón', fr: 'Gouvernail', de: 'Ruder', it: 'Timone' }),
      heel: tp('Крен', 'Heel', 'Przechył', { es: 'Escora', fr: 'Gîte', de: 'Krängung', it: 'Sbandamento' }),
      helm: tp('Руль', 'Helm', 'Ster', { es: 'Timón', fr: 'Barre', de: 'Ruder', it: 'Timone' }),
      wind: tp('Ветер откуда', 'Wind from', 'Wiatr z kierunku', {
        es: 'Viento de', fr: 'Vent de', de: 'Wind aus', it: 'Vento da',
      }),
      windSpeed: tp('Сила ветра', 'Wind speed', 'Siła wiatru', {
        es: 'Fuerza del viento', fr: 'Force du vent', de: 'Windstärke', it: 'Forza del vento',
      }),
      speed: tp('Скорость', 'Speed', 'Prędkość', { es: 'Velocidad', fr: 'Vitesse', de: 'Fahrt', it: 'Velocità' }),
      sound: tp('Звук', 'Sound', 'Dźwięk', { es: 'Sonido', fr: 'Son', de: 'Ton', it: 'Suono' }),
      bestVmg: tp('Лучший VMG', 'Best VMG', 'Najlepszy VMG', {
        es: 'Mejor VMG', fr: 'Meilleur VMG', de: 'Bestes VMG', it: 'Miglior VMG',
      }),
      reset: tp('Сброс', 'Reset', 'Reset', { es: 'Reiniciar', fr: 'Réinitialiser', de: 'Zurücksetzen', it: 'Azzera' }),
      presets: {
        luff: tp('Левентик', 'In irons', 'Łopot', { es: 'Proa al viento', fr: 'Vent debout', de: 'Im Wind', it: 'Prua al vento' }),
        close: tp('Бейдевинд', 'Close-hauled', 'Bajdewind', { es: 'Ceñida', fr: 'Près', de: 'Hoch am Wind', it: 'Bolina' }),
        beam: tp('Галфвинд', 'Beam reach', 'Półwiatr', { es: 'Través', fr: 'Travers', de: 'Halber Wind', it: 'Traverso' }),
        broad: tp('Бакштаг', 'Broad reach', 'Baksztag', { es: 'Largo', fr: 'Grand largue', de: 'Raumer Wind', it: 'Lasco' }),
        run: tp('Фордевинд', 'Run', 'Fordewind', { es: 'Popa', fr: 'Vent arrière', de: 'Vor dem Wind', it: 'Poppa' }),
      },
      steerLeft: tp('Руль влево', 'Steer left', 'Ster w lewo', {
        es: 'Girar a babor', fr: 'Tourner à bâbord', de: 'Nach Backbord steuern', it: 'Girare a sinistra',
      }),
      steerRight: tp('Руль вправо', 'Steer right', 'Ster w prawo', {
        es: 'Girar a estribor', fr: 'Tourner à tribord', de: 'Nach Steuerbord steuern', it: 'Girare a dritta',
      }),
      tour: {
        open: tp('Гид', 'Guide', 'Przewodnik', { es: 'Guía', fr: 'Guide', de: 'Anleitung', it: 'Guida' }),
        next: tp('Дальше', 'Next', 'Dalej', { es: 'Siguiente', fr: 'Suivant', de: 'Weiter', it: 'Avanti' }),
        back: tp('Назад', 'Back', 'Wstecz', { es: 'Atrás', fr: 'Retour', de: 'Zurück', it: 'Indietro' }),
        done: tp('Понятно', 'Got it', 'Rozumiem', { es: 'Entendido', fr: 'Compris', de: 'Verstanden', it: 'Capito' }),
        steps: [
          {
            title: tp('Лодка 3D', '3D Boat', 'Łódka 3D', { es: 'Barco 3D', fr: 'Bateau 3D', de: '3D-Boot', it: 'Barca 3D' }),
            body: tp(
              'Тяни сцену - орбита вокруг лодки, колесо или щипок - зум. Паруса, колдунчики и море - живые.',
              'Drag the scene to orbit the boat, pinch or scroll to zoom. Sails, telltales and the sea are live.',
              'Przeciągnij scenę, aby obracać widok wokół jachtu; kółko lub szczypnięcie to zoom. Żagle, włóczki i morze reagują na żywo.',
              {
                es: 'Arrastra la escena para girar alrededor del barco; pellizca o usa la rueda para el zoom. Las velas, los catavientos y el mar se mueven en tiempo real.',
                fr: 'Fais glisser la scène pour tourner autour du bateau ; pince ou molette pour zoomer. Voiles, penons et mer bougent en temps réel.',
                de: 'Ziehe die Szene, um das Boot zu umkreisen; zoome mit zwei Fingern oder dem Mausrad. Segel, Windfäden und Meer bewegen sich live.',
                it: 'Trascina la scena per girare attorno alla barca; pizzica o usa la rotella per lo zoom. Vele, filetti e mare si muovono in tempo reale.',
              },
            ),
          },
          {
            title: tp('Руль', 'Steering', 'Ster', { es: 'Timón', fr: 'Barre', de: 'Ruder', it: 'Timone' }),
            body: tp(
              'Держи круглые кнопки по краям сцены (или стрелки влево/вправо на клавиатуре), чтобы поворачивать. Отпустишь - руль вернётся в 0. Слайдер - для точной настройки.',
              'Hold the round buttons at the scene edges (or the left/right arrow keys) to turn. Release and the helm returns to 0. The slider is for fine trim.',
              'Przytrzymaj okrągłe przyciski przy krawędziach sceny (albo strzałki w lewo i w prawo na klawiaturze), aby skręcać. Gdy puścisz, ster wróci do 0. Suwak służy do dokładnego ustawienia.',
              {
                es: 'Mantén pulsados los botones redondos de los bordes (o las flechas izquierda y derecha del teclado) para girar. Al soltar, el timón vuelve a 0. El control deslizante sirve para el ajuste fino.',
                fr: 'Maintiens les boutons ronds sur les bords (ou les flèches gauche et droite du clavier) pour tourner. Relâche et la barre revient à 0. Le curseur sert au réglage fin.',
                de: 'Halte die runden Knöpfe am Rand der Szene (oder die Pfeiltasten links und rechts), um zu steuern. Lässt du los, geht das Ruder auf 0. Der Schieberegler dient zum Feineinstellen.',
                it: 'Tieni premuti i pulsanti rotondi ai bordi (o le frecce sinistra e destra della tastiera) per girare. Al rilascio il timone torna a 0. Il cursore serve per la regolazione fine.',
              },
            ),
          },
          {
            title: tp('Шкоты', 'Sheets', 'Szoty', { es: 'Escotas', fr: 'Écoutes', de: 'Schoten', it: 'Scotte' }),
            body: tp(
              'Трави гика-шкот и стаксель-шкот, пока парус не начнёт полоскать, потом чуть подбери. Подсказка коуча называет, какой шкот трогать, она внизу сцены.',
              'Ease the mainsheet and the jib sheet until the sail just starts to luff, then sheet back in a touch. The coach hint at the bottom names the sheet to adjust.',
              'Luzuj szot grota i szot foka, aż żagiel zacznie łopotać, potem lekko go wybierz. Podpowiedź trenera na dole sceny mówi, który szot ruszyć.',
              {
                es: 'Lasca la escota de mayor y la de foque hasta que la vela empiece a flamear; luego caza un poco. El consejo del entrenador, abajo, dice qué escota tocar.',
                fr: "Choque l'écoute de grand-voile et celle de foc jusqu'à ce que la voile commence à faseyer, puis borde un peu. Le conseil du coach, en bas, indique quelle écoute régler.",
                de: 'Fiere Groß- und Fockschot, bis das Segel zu killen beginnt, dann hol etwas dicht. Der Coach-Hinweis unten nennt die Schot, die du bedienen sollst.',
                it: 'Lasca la scotta della randa e quella del fiocco finché la vela comincia a fileggiare, poi cazza un poco. Il consiglio del coach, in basso, dice quale scotta regolare.',
              },
            ),
          },
          {
            title: tp('Приборы', 'Instruments', 'Przyrządy', { es: 'Instrumentos', fr: 'Instruments', de: 'Instrumente', it: 'Strumenti' }),
            body: tp(
              'СКОРОСТЬ - твоя, ЦЕЛЕВАЯ СКОРОСТЬ - при идеальном триме, VMG - продвижение к ветру. «Лучший VMG» - угол, на который стоит идти.',
              'SPEED is yours, TARGET SPEED is what perfect trim would give, VMG is progress toward the wind. "Best VMG" is the angle worth sailing.',
              'PRĘDKOŚĆ to twoja prędkość, PRĘDKOŚĆ DOCELOWA to prędkość przy idealnym trymie, VMG to postęp w kierunku wiatru. "Najlepszy VMG" to kąt, pod którym warto płynąć.',
              {
                es: 'VELOCIDAD es la tuya, VELOCIDAD OBJETIVO la que daría el trimado ideal y VMG el avance hacia el viento. "Mejor VMG" es el ángulo al que conviene navegar.',
                fr: 'VITESSE est la tienne, VITESSE CIBLE celle du réglage idéal, VMG la progression vers le vent. "Meilleur VMG" est l\'angle auquel il vaut mieux naviguer.',
                de: 'FAHRT ist deine, ZIELGESCHWINDIGKEIT die bei idealem Trimm, VMG der Fortschritt gegen den Wind. "Bestes VMG" ist der Winkel, den du segeln solltest.',
                it: 'VELOCITÀ è la tua, VELOCITÀ OBIETTIVO quella con il trim ideale, VMG il progresso verso il vento. "Miglior VMG" è l\'angolo a cui conviene navigare.',
              },
            ),
          },
          {
            title: tp('Свободный трим', 'Free trim', 'Swobodny trym', { es: 'Trimado libre', fr: 'Réglage libre', de: 'Freier Trimm', it: 'Regolazione libera' }),
            body: tp(
              'Второй режим - позирование такелажа: камбер, твист, риф. Вернуться к этому гиду можно кнопкой «?».',
              'The second mode poses the rig: camber, twist, reef. Reopen this guide anytime with the "?" button.',
              'Drugi tryb to swobodne ustawianie olinowania: brzuch, skręt, ref. Do tego przewodnika wrócisz przyciskiem "?".',
              {
                es: 'El segundo modo coloca el aparejo a mano: bolsa, torsión, rizo. Vuelve a esta guía con el botón "?".',
                fr: 'Le second mode place le gréement à la main : creux, vrillage, ris. Rouvre ce guide avec le bouton "?".',
                de: 'Im zweiten Modus stellst du das Rigg frei ein: Bauch, Twist, Reff. Die Anleitung öffnest du jederzeit wieder mit "?".',
                it: 'La seconda modalità posiziona l\'attrezzatura a mano: grasso, svergolamento, terzaroli. Riapri la guida con "?".',
              },
            ),
          },
        ],
      },
      sheetScale: tp("0% шкот выбран · 100% потравлен", "0% sheeted in · 100% eased out", "0% szot wybrany · 100% poluzowany", { es: "0% cazada · 100% lascada", fr: "0% bordée · 100% choquée", de: "0% dichtgeholt · 100% gefiert", it: "0% cazzata · 100% lascata" }),
      maneuver: {
        tacking: tp("Оверштаг: паруса разгружаются и наполняются на новом галсе", "Tacking: sails unload and fill on the new side", "Zwrot przez sztag: żagle tracą napór i napełniają się na nowym halsie", { es: "Virada por avante: las velas pierden presión y se llenan en la nueva banda", fr: "Virement : les voiles se déchargent puis se remplissent sur le nouveau bord", de: "Wende: Die Segel entlasten und füllen sich auf dem neuen Bug", it: "Virata: le vele si scaricano e si riempiono sulle nuove mure" }),
        gybing: tp("Фордевинд: экипаж автоматически переносит паруса", "Gybing: the crew transfers the sails automatically", "Zwrot przez rufę: załoga automatycznie przenosi żagle", { es: "Trasluchada: la tripulación cambia las velas de banda automáticamente", fr: "Empannage : l'équipage fait passer les voiles automatiquement", de: "Halse: Die Crew bringt die Segel automatisch auf die andere Seite", it: "Strambata: l'equipaggio fa passare le vele automaticamente" }),
      },
      sailStatus: {
        transferring: tp("Переходит на другой борт", "Changing sides", "Przechodzi na drugą burtę", { es: "Cambiando de banda", fr: "Changement de bord", de: "Wechselt die Seite", it: "Cambia lato" }),
        inIrons: tp("Левентик: увались", "In irons: bear away", "W łopocie: odpadnij", { es: "Proa al viento: arriba", fr: "Vent debout : abats", de: "Im Wind: abfallen", it: "Prua al vento: poggia" }),
        calm: tp("Мало потока", "Little airflow", "Słaby przepływ", { es: "Poco flujo", fr: "Peu de flux", de: "Wenig Strömung", it: "Poco flusso" }),
        luffing: tp("Полощет", "Luffing", "Łopocze", { es: "Flamea", fr: "Faseye", de: "Killt", it: "Fileggia" }),
        stalled: tp("Срыв потока", "Stalled", "Oderwanie przepływu", { es: "Flujo desprendido", fr: "Décrochage", de: "Strömungsabriss", it: "Stallo" }),
        drawing: tp("Наполнен, тянет", "Filled and drawing", "Wypełniony, pracuje", { es: "Llena y tira", fr: "Gonflée, elle porte", de: "Gefüllt, zieht", it: "Gonfia e tira" }),
      },
      sailHint: {
        mainLuffing: tp("Полощет: немного выбери гика-шкот", "Luffing: trim the mainsheet slightly", "Łopocze: lekko wybierz szot grota", { es: "Flamea: caza un poco la escota de mayor", fr: "Faseye : borde un peu l'écoute de grand-voile", de: "Killt: Großschot leicht dichtholen", it: "Fileggia: cazza un poco la scotta della randa" }),
        mainStalled: tp("Срыв потока: потрави гика-шкот", "Stalled: ease the mainsheet", "Oderwanie przepływu: poluzuj szot grota", { es: "Flujo desprendido: lasca la escota de mayor", fr: "Décrochage : choque l'écoute de grand-voile", de: "Strömungsabriss: Großschot fieren", it: "Stallo: lasca la scotta della randa" }),
        jibLuffing: tp("Полощет: немного выбери стаксель-шкот", "Luffing: trim the jib sheet slightly", "Łopocze: lekko wybierz szot foka", { es: "Flamea: caza un poco la escota de foque", fr: "Faseye : borde un peu l'écoute de foc", de: "Killt: Fockschot leicht dichtholen", it: "Fileggia: cazza un poco la scotta del fiocco" }),
        jibStalled: tp("Срыв потока: потрави стаксель-шкот", "Stalled: ease the jib sheet", "Oderwanie przepływu: poluzuj szot foka", { es: "Flujo desprendido: lasca la escota de foque", fr: "Décrochage : choque l'écoute de foc", de: "Strömungsabriss: Fockschot fieren", it: "Stallo: lasca la scotta del fiocco" }),
      },
      coach: {
        inIrons: tp('В левентике - увались, чтобы наполнить паруса', 'In irons - bear away to fill the sails', 'W łopocie: odpadnij, żeby napełnić żagle', {
          es: 'Proa al viento: arriba para llenar las velas', fr: 'Vent debout : abats pour remplir les voiles', de: 'Im Wind: abfallen, um die Segel zu füllen', it: 'Prua al vento: poggia per riempire le vele',
        }),
        luffMain: tp('Грот полощет - выбери гика-шкот или увались', 'Main luffing - trim the mainsheet or bear away', 'Grot łopocze: wybierz szot grota lub odpadnij', {
          es: 'La mayor flamea: caza la escota de mayor o arriba', fr: 'La grand-voile faseye : borde l\'écoute de grand-voile ou abats', de: 'Großsegel killt: Großschot dichtholen oder abfallen', it: 'La randa fileggia: cazza la scotta della randa o poggia',
        }),
        luffJib: tp('Стаксель полощет - выбери стаксель-шкот или увались', 'Jib luffing - trim the jib sheet or bear away', 'Fok łopocze: wybierz szot foka lub odpadnij', {
          es: 'El foque flamea: caza la escota de foque o arriba', fr: 'Le foc faseye : borde l\'écoute de foc ou abats', de: 'Fock killt: Fockschot dichtholen oder abfallen', it: 'Il fiocco fileggia: cazza la scotta del fiocco o poggia',
        }),
        luffBoth: tp('Оба паруса полощут - выбери гика-шкот и стаксель-шкот или увались', 'Both sails luffing - trim the mainsheet and the jib sheet or bear away', 'Oba żagle łopoczą: wybierz szot grota i szot foka lub odpadnij', {
          es: 'Las dos velas flamean: caza la escota de mayor y la de foque o arriba', fr: 'Les deux voiles faseyent : borde l\'écoute de grand-voile et celle de foc ou abats', de: 'Beide Segel killen: Groß- und Fockschot dichtholen oder abfallen', it: 'Entrambe le vele fileggiano: cazza la scotta della randa e quella del fiocco o poggia',
        }),
        stallMain: tp('Срыв на гроте - потрави гика-шкот', 'Main stalled - ease the mainsheet', 'Oderwanie na grocie: poluzuj szot grota', {
          es: 'Flujo desprendido en la mayor: lasca la escota de mayor', fr: 'Grand-voile décrochée : choque l\'écoute de grand-voile', de: 'Abriss am Großsegel: Großschot fieren', it: 'Randa in stallo: lasca la scotta della randa',
        }),
        stallJib: tp('Срыв на стакселе - потрави стаксель-шкот', 'Jib stalled - ease the jib sheet', 'Oderwanie na foku: poluzuj szot foka', {
          es: 'Flujo desprendido en el foque: lasca la escota de foque', fr: 'Foc décroché : choque l\'écoute de foc', de: 'Abriss an der Fock: Fockschot fieren', it: 'Fiocco in stallo: lasca la scotta del fiocco',
        }),
        stallBoth: tp('Срыв на обоих парусах - потрави гика-шкот и стаксель-шкот', 'Both sails stalled - ease the mainsheet and the jib sheet', 'Oderwanie na obu żaglach: poluzuj szot grota i szot foka', {
          es: 'Flujo desprendido en las dos velas: lasca la escota de mayor y la de foque', fr: 'Les deux voiles décrochent : choque l\'écoute de grand-voile et celle de foc', de: 'Abriss an beiden Segeln: Groß- und Fockschot fieren', it: 'Entrambe le vele in stallo: lasca la scotta della randa e quella del fiocco',
        }),
        pinching: tp('Слишком круто - чуть увались', 'Pinching - bear away a touch', 'Za ostro: lekko odpadnij', {
          es: 'Demasiado ceñido: arriba un poco', fr: 'Trop près : abats un peu', de: 'Zu hoch: etwas abfallen', it: 'Troppo stretto: poggia un poco',
        }),
        good: tp('Хороший трим - оба паруса тянут', 'Well trimmed - both sails pulling', 'Dobry trym: oba żagle pracują', {
          es: 'Buen trimado: las dos velas tiran', fr: 'Bien réglé : les deux voiles portent', de: 'Gut getrimmt: beide Segel ziehen', it: 'Buona regolazione: entrambe le vele tirano',
        }),
        reachOn: tp('Настрой под галфвинд', 'Trim for the reach', 'Wytrymuj żagle na półwiatr', {
          es: 'Trima para el través', fr: 'Règle pour le travers', de: 'Für Halbwind trimmen', it: 'Regola per il traverso',
        }),
        run: tp("Фордевинд: потрави гика-шкот и стаксель-шкот", "Running: ease the mainsheet and the jib sheet", "Fordewind: poluzuj szot grota i szot foka", {
          es: "En popa: lasca la escota de mayor y la de foque", fr: "Vent arrière : choque l'écoute de grand-voile et celle de foc", de: "Vorwind: Groß- und Fockschot fieren", it: "In poppa: lasca la scotta della randa e quella del fiocco",
        }),
      },
    }),
    [tp, offline],
  );

  const versions = useMemo(
    () => [
      {
        href: '/simulator',
        label: tp('Основы', 'Basics', 'Podstawy', { es: 'Fundamentos', fr: 'Bases', de: 'Grundlagen', it: 'Basi' }),
        title: tp('Ветер и повороты - шаг 1', 'Wind and turns - step 1', 'Wiatr i zwroty - krok 1', {
          es: 'Viento y viradas - paso 1', fr: 'Vent et virements - étape 1', de: 'Wind und Wenden - Schritt 1', it: 'Vento e virate - passo 1',
        }),
      },
      {
        href: '/simulator-v3',
        label: tp('Тренажёр', 'Trainer', 'Trener', { es: 'Entrenador', fr: 'Réglage', de: 'Trainer', it: 'Trainer' }),
        title: tp('Полный тренажёр трима - шаг 2', 'Full trim trainer - step 2', 'Pełny trener trymu - krok 2', {
          es: 'Entrenador de trimado completo - paso 2', fr: 'Réglage des voiles complet - étape 2', de: 'Voller Trimm-Trainer - Schritt 2', it: 'Trainer di regolazione completo - passo 2',
        }),
      },
      {
        href: '/simulator2',
        label: tp('Лодка 3D', '3D Boat', 'Łódka 3D', { es: 'Barco 3D', fr: 'Bateau 3D', de: '3D-Boot', it: 'Barca 3D' }),
        title: tp('Орбита 360 и живые паруса', 'Orbit 360 and live sails', 'Orbita 360 i żywe żagle', {
          es: 'Órbita 360 y velas vivas', fr: 'Orbite 360 et voiles vivantes', de: 'Orbit 360 und lebendige Segel', it: 'Orbita 360 e vele vive',
        }),
      },
    ],
    [tp],
  );

  const switcher = embed ? null : (
    <div className="flex gap-1">
      {versions.map((v) => {
        const active = pathname === v.href;
        return (
          <Link
            key={v.href}
            href={v.href}
            title={v.title}
            className={
              'rounded-md px-3 py-1 text-sm font-semibold transition ' +
              (active
                ? 'bg-[var(--accent-cyan,#00d4ff)] text-[#04222d]'
                : 'border border-[rgba(255,255,255,0.12)] text-[var(--text-secondary,#9fb6c4)] hover:border-[rgba(0,212,255,0.4)]')
            }
          >
            {v.label}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-[calc(100dvh-var(--site-nav-h,56px))] bg-[var(--bg-primary,#0a1118)] text-[var(--text-primary,#e7f1f7)]">
      <Simulator3D labels={labels} headerSlot={switcher} embed={embed} initialMode="sail" />
    </div>
  );
}

export default function SimulatorV2() {
  // useSearchParams requires a Suspense boundary in the app router.
  return (
    <Suspense fallback={null}>
      <SimulatorV2Inner />
    </Suspense>
  );
}
