'use client';

import { useEffect, useState } from 'react';
import type { Lang } from '@/lib/languages';
import { type TpFn } from '../shared';

// ---------------------------------------------------------------------------
// V3 guided tour - appears on first visit to /simulator-v3, can be re-
// triggered later from the top-bar "?" button. Ten short steps; the user
// reads through the layout, physics idea, and the three modes in their
// active language. Seen-flag lives in localStorage so the overlay doesn't
// block returning users.
//
// This is a modal overlay (not a spotlight tour) because the V3 layout is
// dense on mobile - a spotlight would fight with the pods. A clear modal
// with "here's what each area does" copy proved more readable in early
// testing than CSS highlights on a 375-wide viewport.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'regatta.v3.tour.v1';

export interface TourStep {
  icon: string;
  titleRu: string;
  titleEn: string;
  titlePl: string;
  titleEs?: string;
  titleFr?: string;
  titleDe?: string;
  titleIt?: string;
  bodyRu: string;
  bodyEn: string;
  bodyPl: string;
  bodyEs?: string;
  bodyFr?: string;
  bodyDe?: string;
  bodyIt?: string;
}

const STEPS: TourStep[] = [
  {
    icon: '⛵',
    titleRu: 'Настройка парусов',
    titleEn: 'Sail trim',
    titlePl: 'Trym żagli',
    titleEs: 'Trimado de velas',
    titleFr: 'Réglage des voiles',
    titleDe: 'Segeltrimm',
    titleIt: 'Regolazione delle vele',
    bodyRu:
      'Учебный тренажёр парусной яхты с живой физикой. Ты будешь видеть силы на парусах, крен и снос как на реальной лодке. 8-10 минут - и ты поймёшь триммирование.',
    bodyEn:
      'A live-physics sailing trainer. You will see the forces on the sails, heel, and leeway as on a real boat. 8-10 minutes gives you a solid feel for trim.',
    bodyPl:
      'Szkoleniowy symulator jachtu z fizyką na żywo. Zobaczysz siły na żaglach, przechył i dryf jak na prawdziwym jachcie. Po 8-10 minutach zrozumiesz trymowanie.',
    bodyEs:
      'Un simulador de vela con física en tiempo real. Verás las fuerzas en las velas, la escora y el abatimiento como en un barco de verdad. En 8-10 minutos entenderás el trimado.',
    bodyFr:
      'Un simulateur de voile avec une physique en temps réel. Tu verras les forces sur les voiles, la gîte et la dérive comme sur un vrai bateau. 8-10 minutes suffisent pour comprendre le réglage des voiles.',
    bodyDe:
      'Ein Segelsimulator mit Echtzeit-Physik. Du siehst die Kräfte an den Segeln, die Krängung und die Abdrift wie auf einem echten Boot. Nach 8-10 Minuten hast du ein solides Gefühl fürs Trimmen.',
    bodyIt:
      'Un simulatore di vela con fisica in tempo reale. Vedrai le forze sulle vele, lo sbandamento e lo scarroccio come su una barca vera. In 8-10 minuti capirai la regolazione delle vele.',
  },
  {
    icon: '🌬',
    titleRu: 'Ветер идёт сверху',
    titleEn: 'Wind always from the top',
    titlePl: 'Wiatr zawsze wieje z góry',
    titleEs: 'El viento viene de arriba',
    titleFr: 'Le vent vient du haut',
    titleDe: 'Der Wind kommt von oben',
    titleIt: 'Il vento arriva dall\'alto',
    bodyRu:
      'Красный конус NO-GO - мёртвая зона (против ветра). Туда идти нельзя. Синяя стрелка TW показывает истинный ветер, AW - что чувствует лодка на ходу.',
    bodyEn:
      'The red NO-GO cone is the no-go zone (straight into the wind): you cannot sail there. The blue TW arrow is the true wind; AW is the apparent wind the moving boat feels.',
    bodyPl:
      'Czerwony stożek NO-GO to kąt martwy (prosto pod wiatr): tam nie popłyniesz. Niebieska strzałka TW to wiatr prawdziwy, AW to wiatr pozorny, który czuje płynący jacht.',
    bodyEs:
      'El cono rojo NO-GO es la zona muerta (contra el viento): por ahí no se puede navegar. La flecha azul TW es el viento real; AW, el viento aparente que siente el barco en movimiento.',
    bodyFr:
      "Le cône rouge NO-GO est la zone morte (face au vent) : impossible d'y naviguer. La flèche bleue TW est le vent réel, AW le vent apparent ressenti par le bateau en mouvement.",
    bodyDe:
      'Der rote NO-GO-Kegel ist der tote Winkel (gegen den Wind): Dorthin kannst du nicht segeln. Der blaue TW-Pfeil ist der wahre Wind, AW der scheinbare Wind, den das fahrende Boot spürt.',
    bodyIt:
      "Il cono rosso NO-GO è l'angolo morto (controvento): lì non si naviga. La freccia blu TW è il vento reale, AW il vento apparente che sente la barca in movimento.",
  },
  {
    icon: '🧭',
    titleRu: 'ВЕТЕР + РУЛЬ - куда идём',
    titleEn: 'WIND + HELM - your course',
    titlePl: 'WIATR + STER - twój kurs',
    titleEs: 'VIENTO + TIMÓN - tu rumbo',
    titleFr: 'VENT + BARRE - ton cap',
    titleDe: 'WIND + RUDER - dein Kurs',
    titleIt: 'VENTO + TIMONE - la tua rotta',
    bodyRu:
      'В поде ВЕТЕР - угол TWA (к ветру) и сила ветра. Нажми галс - лодка ПОВЕРНЁТСЯ через ветер за ~5 сек. РУЛЬ показывает текущий и целевой курс.',
    bodyEn:
      'The WIND pod has TWA (angle to wind) and wind speed. Click the tack label - the boat TURNS through the wind over ~5 s. HELM shows the current and target heading.',
    bodyPl:
      'Panel WIATR pokazuje TWA (kąt do wiatru) i siłę wiatru. Kliknij hals: jacht ZMIENI HALS w ~5 s. STER pokazuje kurs bieżący i docelowy.',
    bodyEs:
      'El panel VIENTO muestra el TWA (ángulo al viento) y la fuerza del viento. Pulsa la amura: el barco CAMBIA DE AMURA en ~5 s. TIMÓN muestra el rumbo actual y el objetivo.',
    bodyFr:
      'Le panneau VENT affiche le TWA (angle au vent) et la force du vent. Touche l\'amure : le bateau CHANGE D\'AMURE en ~5 s. BARRE affiche le cap actuel et le cap visé.',
    bodyDe:
      'Das Feld WIND zeigt TWA (Winkel zum Wind) und Windstärke. Tippe auf die Bug-Anzeige: Das Boot WECHSELT in ~5 s DEN BUG. RUDER zeigt aktuellen Kurs und Zielkurs.',
    bodyIt:
      'Il riquadro VENTO mostra il TWA (angolo al vento) e la forza del vento. Tocca le mure: la barca CAMBIA MURE in ~5 s. TIMONE mostra la rotta attuale e quella obiettivo.',
  },
  {
    icon: '🎏',
    titleRu: 'ГРОТ + СТАКСЕЛЬ',
    titleEn: 'MAIN + JIB',
    titlePl: 'GROT + FOK',
    titleEs: 'MAYOR + FOQUE',
    titleFr: 'GV + FOC',
    titleDe: 'GROSS + FOCK',
    titleIt: 'RANDA + FIOCCO',
    bodyRu:
      'Угол - насколько шкот выбран. Риф (R1/R2) уменьшает грот. Раскрытие стакселя 0-100. Зелёная точка ТЯНЕТ - парус работает. Красный СРЫВ - поток оторвался.',
    bodyEn:
      'Angle = how tightly the sheet is pulled. Reef (R1/R2) shrinks the main. Jib unfurled 0-100%. Green ATTACHED dot = sail working. Red STALL = flow detached.',
    bodyPl:
      'Kąt: jak mocno wybrany jest szot. Ref (R1/R2) zmniejsza grot. Rozwinięcie foka 0-100%. Zielona kropka PRACUJE: żagiel działa. Czerwone ODERWANIE PRZEPŁYWU: przepływ się oderwał.',
    bodyEs:
      'Ángulo: cuánto está cazada la escota. El rizo (R1/R2) reduce la mayor. Foque desenrollado 0-100%. Punto verde TIRA: la vela trabaja. Rojo FLUJO DESPRENDIDO: el flujo se ha separado.',
    bodyFr:
      'Angle : à quel point l\'écoute est bordée. Le ris (R1/R2) réduit la grand-voile. Foc déroulé de 0 à 100%. Point vert PORTE : la voile travaille. Rouge DÉCROCHÉ : l\'écoulement a décroché.',
    bodyDe:
      'Winkel: wie dicht die Schot geholt ist. Das Reff (R1/R2) verkleinert das Groß. Fock ausgerollt 0-100%. Grüner Punkt ZIEHT: das Segel arbeitet. Rot STRÖMUNGSABRISS: die Strömung ist abgerissen.',
    bodyIt:
      'Angolo: quanto è cazzata la scotta. La mano di terzaroli (R1/R2) riduce la randa. Fiocco svolto 0-100%. Punto verde PORTA: la vela lavora. Rosso STALLO: il flusso si è staccato.',
  },
  {
    icon: '👻',
    titleRu: 'Призрак оптимума',
    titleEn: 'Ghost optimum',
    titlePl: 'Duch optimum',
    titleEs: 'Fantasma del óptimo',
    titleFr: 'Fantôme de l\'optimum',
    titleDe: 'Optimum-Geist',
    titleIt: 'Fantasma dell\'ottimo',
    bodyRu:
      'Пунктирные зелёные силуэты - где паруса ДОЛЖНЫ стоять на этом курсе и ветре. Твои паруса должны лечь точно на них - тогда трим 100%.',
    bodyEn:
      'The dashed green silhouettes show where the sails SHOULD sit for this course and wind. Match them and trim hits 100%.',
    bodyPl:
      'Zielone przerywane sylwetki pokazują, gdzie żagle POWINNY stać na tym kursie i przy tym wietrze. Ustaw na nich swoje żagle, a trym dojdzie do 100%.',
    bodyEs:
      'Las siluetas verdes punteadas muestran dónde DEBERÍAN estar las velas con este rumbo y este viento. Coloca tus velas encima y el trim llegará al 100%.',
    bodyFr:
      'Les silhouettes vertes pointillées montrent où les voiles DEVRAIENT être pour cette allure et ce vent. Superpose tes voiles dessus et le trim monte à 100%.',
    bodyDe:
      'Die gestrichelten grünen Umrisse zeigen, wo die Segel bei diesem Kurs und Wind stehen SOLLTEN. Legst du deine Segel genau darauf, steht der Trimm bei 100%.',
    bodyIt:
      'Le sagome verdi tratteggiate mostrano dove DOVREBBERO stare le vele per questa andatura e questo vento. Allinea le tue vele e il trim arriva al 100%.',
  },
  {
    icon: '📊',
    titleRu: 'Метрики и комментарий',
    titleEn: 'Metrics and commentary',
    titlePl: 'Wskaźniki i komentarz',
    titleEs: 'Métricas y comentarios',
    titleFr: 'Métriques et commentaire',
    titleDe: 'Messwerte und Kommentar',
    titleIt: 'Metriche e commento',
    bodyRu:
      'Снизу 4 числа: СКОРОСТЬ, КРЕН, AWA, ТРИМ. Под ними строчка от тренера - что сейчас не так или что хорошо. Цвет подсказывает уровень срочности.',
    bodyEn:
      'Bottom strip: SPEED, HEEL, AWA, TRIM. The line under it is the coach telling you what is wrong or right. Color signals urgency.',
    bodyPl:
      'Na dole cztery liczby: PRĘDKOŚĆ, PRZECHYŁ, AWA, TRYM. Pod nimi linijka od trenera: co jest nie tak, a co dobrze. Kolor pokazuje, jak pilna jest sprawa.',
    bodyEs:
      'Abajo hay 4 cifras: VELOCIDAD, ESCORA, AWA, TRIM. Debajo, una línea del entrenador te dice qué va mal y qué va bien. El color indica la urgencia.',
    bodyFr:
      'En bas, 4 chiffres : VITESSE, GÎTE, AWA, TRIM. La ligne en dessous, c\'est le coach qui dit ce qui va ou ne va pas. La couleur indique l\'urgence.',
    bodyDe:
      'Unten stehen 4 Werte: FAHRT, KRÄNGUNG, AWA, TRIMM. Die Zeile darunter ist der Coach: Er sagt, was klappt und was nicht. Die Farbe zeigt die Dringlichkeit.',
    bodyIt:
      'In basso 4 numeri: VELOCITÀ, SBANDAMENTO, AWA, TRIM. La riga sotto è il coach che ti dice cosa va e cosa no. Il colore indica l\'urgenza.',
  },
  {
    icon: '🎯',
    titleRu: 'Три режима',
    titleEn: 'Three modes',
    titlePl: 'Trzy tryby',
    titleEs: 'Tres modos',
    titleFr: 'Trois modes',
    titleDe: 'Drei Modi',
    titleIt: 'Tre modalità',
    bodyRu:
      'СВОБОДНО - песочница. УПРАЖНЕНИЯ - задачи с таймером (держи трим 10 секунд). СЦЕНАРИИ - готовые ситуации (перегруз, плохой слот, перетянутый грот).',
    bodyEn:
      'Free Sail - sandbox. Drills - timed tasks (hold trim for 10 s). Scenarios - canned situations (overpowered, bad slot, overtrimmed main).',
    bodyPl:
      'SWOBODNIE: piaskownica. ĆWICZENIA: zadania na czas (utrzymaj trym przez 10 s). SCENARIUSZE: gotowe sytuacje (za dużo mocy, zła szczelina, za mocno wybrany grot).',
    bodyEs:
      'LIBRE: navegación sin reglas. EJERCICIOS: tareas con cronómetro (mantén el trim 10 s). ESCENARIOS: situaciones preparadas (exceso de potencia, mala ranura, mayor demasiado cazada).',
    bodyFr:
      'LIBRE : bac à sable. EXERCICES : tâches chronométrées (maintiens le trim 10 s). SCÉNARIOS : situations toutes prêtes (trop de puissance, mauvaise fente, GV trop bordée).',
    bodyDe:
      'FREI: Sandbox. ÜBUNGEN: Aufgaben auf Zeit (halte den Trimm 10 s). SZENARIEN: vorbereitete Situationen (zu viel Druck, schlechter Spalt, zu dicht geholtes Groß).',
    bodyIt:
      'LIBERA: navigazione senza vincoli. ESERCIZI: compiti a tempo (tieni il trim per 10 s). SCENARI: situazioni pronte (troppa potenza, fessura sbagliata, randa troppo cazzata).',
  },
  {
    icon: '👁',
    titleRu: 'ВИД - сверху / сзади / сбоку',
    titleEn: 'VIEW - top / rear / side',
    titlePl: 'WIDOK - z góry / z tyłu / z boku',
    titleEs: 'VISTA - cenital / popa / lateral',
    titleFr: 'VUE - dessus / arrière / côté',
    titleDe: 'ANSICHT - oben / Heck / Seite',
    titleIt: 'VISTA - alto / poppa / lato',
    bodyRu:
      'Сверху читаешь курс. Сзади - видно крен и рангоут как с другой яхты. Сбоку - профиль с килем и рулём. В каждом режиме подсвечивается своё.',
    bodyEn:
      'Top-down for course reading. Rear for heel and rig as seen from another boat. Side for the profile with keel and rudder. Each view highlights different things.',
    bodyPl:
      'Z góry odczytasz kurs. Z tyłu widać przechył i omasztowanie, jak z innego jachtu. Z boku widać profil z kilem i sterem. Każdy widok pokazuje co innego.',
    bodyEs:
      'Cenital para leer el rumbo. Popa para ver la escora y el aparejo como desde otro barco. Lateral para el perfil con quilla y timón. Cada vista resalta cosas distintas.',
    bodyFr:
      'Dessus pour lire le cap. Arrière pour voir la gîte et le gréement comme depuis un autre bateau. Côté pour le profil avec la quille et le gouvernail. Chaque vue met en avant autre chose.',
    bodyDe:
      'Von oben liest du den Kurs. Von achtern siehst du Krängung und Rigg wie von einem anderen Boot aus. Seitlich siehst du das Profil mit Kiel und Ruder. Jede Ansicht zeigt etwas anderes.',
    bodyIt:
      'Vista dall\'alto per leggere la rotta. Da poppa per sbandamento e attrezzatura come da un\'altra barca. Di lato per il profilo con chiglia e timone. Ogni vista evidenzia cose diverse.',
  },
  {
    icon: '🔗',
    titleRu: 'Поделись сетапом',
    titleEn: 'Share your setup',
    titlePl: 'Udostępnij ustawienia',
    titleEs: 'Comparte tu setup',
    titleFr: 'Partage ta config',
    titleDe: 'Teile dein Setup',
    titleIt: 'Condividi il tuo setup',
    bodyRu:
      'Кнопка "Поделиться" копирует ссылку на твой текущий сетап. Отправь коллеге - у него откроется с теми же слайдерами. Или сохрани на потом.',
    bodyEn:
      '"Share" copies a link to your current setup. Send it to a friend - their page opens with the same sliders. Or save it for later.',
    bodyPl:
      '"Udostępnij" kopiuje link do twoich bieżących ustawień. Wyślij go znajomemu: otworzą mu się te same suwaki. Możesz też zapisać link na później.',
    bodyEs:
      '"Compartir" copia un enlace a tu setup actual. Envíaselo a un amigo: su página se abrirá con los mismos controles. O guárdalo para después.',
    bodyFr:
      '"Partager" copie un lien vers ta config actuelle. Envoie-le à un ami : sa page s\'ouvre avec les mêmes curseurs. Ou garde-le pour plus tard.',
    bodyDe:
      '"Teilen" kopiert einen Link zu deinem aktuellen Setup. Schick ihn weiter: Die Seite öffnet sich mit denselben Reglern. Oder speichere ihn für später.',
    bodyIt:
      '"Condividi" copia un link al tuo setup attuale. Invialo a un amico: la sua pagina si apre con gli stessi cursori. Oppure salvalo per dopo.',
  },
  {
    icon: '🚀',
    titleRu: 'Поехали',
    titleEn: 'Go sailing',
    titlePl: 'Do dzieła',
    titleEs: 'A navegar',
    titleFr: 'Au plan d\'eau',
    titleDe: 'Leinen los',
    titleIt: 'Si salpa',
    bodyRu:
      'Начни с режима СВОБОДНО. Покрути слайдеры, посмотри как меняется трим. Потом в УПРАЖНЕНИЯ - "Держи трим" выдаёт первую цель. Помощь - кнопка "?" наверху.',
    bodyEn:
      'Start in Free Sail. Move sliders, watch trim change. Then try Drills - "Hold trim" gives you your first goal. Help button "?" is at the top any time.',
    bodyPl:
      'Zacznij od trybu SWOBODNIE. Poruszaj suwakami i zobacz, jak zmienia się trym. Potem przejdź do ĆWICZEŃ: "Utrzymaj trym" to pierwszy cel. Pomoc jest zawsze pod przyciskiem "?" na górze.',
    bodyEs:
      'Empieza en LIBRE. Mueve los controles y mira cómo cambia el trim. Luego prueba EJERCICIOS: "Mantén el trim" es tu primer objetivo. El botón de ayuda "?" está siempre arriba.',
    bodyFr:
      'Commence en LIBRE. Bouge les curseurs et regarde le trim changer. Ensuite, EXERCICES : "Maintiens le trim" te donne ton premier objectif. Le bouton d\'aide "?" est toujours en haut.',
    bodyDe:
      'Starte im Modus FREI. Bewege die Regler und beobachte, wie sich der Trimm ändert. Dann ÜBUNGEN: "Halte den Trimm" ist dein erstes Ziel. Die Hilfe "?" findest du jederzeit oben.',
    bodyIt:
      'Inizia in modalità LIBERA. Muovi i cursori e guarda come cambia il trim. Poi prova ESERCIZI: "Tieni il trim" è il tuo primo obiettivo. Il pulsante di aiuto "?" è sempre in alto.',
  },
];

interface Props {
  lang: Lang;
  tp: TpFn;
  /** When true, overlay is open (re-opened via "?" button). */
  forceOpen?: boolean;
  /** Called on close (force-open or first-time). */
  onClose?: () => void;
}

export function TourOverlay({ lang, tp, forceOpen, onClose }: Props) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  // Help is explicitly requested. Do not cover controls or an active lesson.
  useEffect(() => {
    if (forceOpen) {
      const timer = setTimeout(() => { setShow(true); setStep(0); }, 0);
      return () => clearTimeout(timer);
    }
  }, [forceOpen]);

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setShow(false);
    setStep(0);
    onClose?.();
  };

  if (!show) return null;

  const current = STEPS[step];
  // Pick per active lang with EN as the fallback for any missing ES/FR/DE/IT
  // string (RU only wins when lang === 'ru').
  const pickStep = (field: 'title' | 'body'): string => {
    const ru = current[`${field}Ru`] as string;
    const en = current[`${field}En`] as string;
    const pl = current[`${field}Pl`] as string;
    const es = current[`${field}Es`] as string | undefined;
    const fr = current[`${field}Fr`] as string | undefined;
    const de = current[`${field}De`] as string | undefined;
    const it = current[`${field}It`] as string | undefined;
    switch (lang) {
      case 'ru': return ru;
      case 'pl': return pl;
      case 'es': return es ?? en;
      case 'fr': return fr ?? en;
      case 'de': return de ?? en;
      case 'it': return it ?? en;
      default:   return en;
    }
  };
  const title = pickStep('title');
  const body = pickStep('body');
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(5, 12, 24, 0.8)', backdropFilter: 'blur(8px)' }}
      onClick={finish}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 sm:p-6 relative"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(8, 24, 48, 0.95)',
          border: '1px solid rgba(0, 212, 255, 0.35)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
        }}
      >
        <button
          onClick={finish}
          aria-label={tp('Закрыть обзор', 'Close tour', 'Zamknij przewodnik', {
            es: 'Cerrar la guía',
            fr: 'Fermer le guide',
            de: 'Tour schließen',
            it: 'Chiudi il tour',
          })}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-lg transition"
          style={{
            color: 'var(--text-muted)',
            background: 'rgba(139, 167, 184, 0.1)',
          }}
        >
          ×
        </button>

        <div className="text-4xl sm:text-5xl mb-3">{current.icon}</div>
        <h2
          className="text-xl sm:text-2xl font-bold mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h2>
        <p
          className="text-sm sm:text-[15px] leading-relaxed mb-5"
          style={{ color: 'var(--text-secondary)' }}
        >
          {body}
        </p>

        <div className="flex items-center justify-center gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className="h-1.5 rounded-full transition-all cursor-pointer"
              style={{
                width: i === step ? 22 : 6,
                background:
                  i === step
                    ? 'var(--accent-cyan)'
                    : i < step
                    ? 'rgba(0, 212, 255, 0.4)'
                    : 'rgba(139, 167, 184, 0.25)',
              }}
              aria-label={tp(
                `Шаг ${i + 1}`,
                `Step ${i + 1}`,
                `Krok ${i + 1}`,
                {
                  es: `Paso ${i + 1}`,
                  fr: `Étape ${i + 1}`,
                  de: `Schritt ${i + 1}`,
                  it: `Passo ${i + 1}`,
                },
              )}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-2.5 rounded-lg border text-sm font-semibold transition"
              style={{
                borderColor: 'rgba(139, 167, 184, 0.3)',
                color: 'var(--text-secondary)',
              }}
            >
              {tp('Назад', 'Back', 'Wstecz', {
                es: 'Atrás',
                fr: 'Retour',
                de: 'Zurück',
                it: 'Indietro',
              })}
            </button>
          )}
          <button
            onClick={() => (isLast ? finish() : setStep(step + 1))}
            className="flex-[2] py-2.5 rounded-lg font-bold text-sm transition"
            style={{
              background: 'linear-gradient(135deg, var(--accent-cyan), #0099cc)',
              color: '#0a1628',
            }}
          >
            {isLast
              ? tp('Поехали', 'Go sailing', 'Do dzieła', {
                  es: 'A navegar',
                  fr: "Au plan d'eau",
                  de: 'Leinen los',
                  it: 'Si salpa',
                })
              : tp('Дальше', 'Next', 'Dalej', {
                  es: 'Siguiente',
                  fr: 'Suivant',
                  de: 'Weiter',
                  it: 'Avanti',
                })}
          </button>
        </div>

        <div
          className="mt-4 text-[10px] text-center"
          style={{ color: 'var(--text-muted)' }}
        >
          {tp(
            `Шаг ${step + 1} из ${STEPS.length}`,
            `Step ${step + 1} of ${STEPS.length}`,
            `Krok ${step + 1} z ${STEPS.length}`,
            {
              es: `Paso ${step + 1} de ${STEPS.length}`,
              fr: `Étape ${step + 1} sur ${STEPS.length}`,
              de: `Schritt ${step + 1} von ${STEPS.length}`,
              it: `Passo ${step + 1} di ${STEPS.length}`,
            },
          )}
        </div>
      </div>
    </div>
  );
}
