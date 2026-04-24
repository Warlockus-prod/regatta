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
    titleRu: 'Добро пожаловать в V3',
    titleEn: 'Welcome to V3',
    titlePl: 'Witaj w V3',
    titleEs: 'Bienvenido a V3',
    titleFr: 'Bienvenue sur V3',
    titleDe: 'Willkommen bei V3',
    titleIt: 'Benvenuto in V3',
    bodyRu:
      'Учебный тренажёр парусной яхты с живой физикой. Ты будешь видеть силы на парусах, крен и снос как на реальной лодке. 8-10 минут - и ты поймёшь триммирование.',
    bodyEn:
      'A live-physics sailing trainer. You will see the forces on the sails, heel, and leeway as on a real boat. 8-10 minutes gives you a solid feel for trim.',
    bodyPl:
      'Trener zeglarstwa z fizyka na zywo. Zobaczysz sily na zaglach, przechyl i dryf jak na prawdziwej lodzi. 8-10 minut i rozumiesz trymowanie.',
    bodyEs:
      'Entrenador de vela con fisica en vivo. Veras las fuerzas en las velas, la escora y el abatimiento como en una embarcacion real. 8-10 minutos y tendras buena sensibilidad para el trimado.',
    bodyFr:
      'Un simulateur de voile avec physique en temps reel. Tu verras les forces sur les voiles, la gite et la derive comme sur un vrai bateau. 8-10 minutes suffisent pour sentir le reglage des voiles.',
    bodyDe:
      'Ein Segelsimulator mit Echtzeit-Physik. Du siehst die Kraefte an den Segeln, die Kraengung und den Abdrift wie auf einem echten Boot. 8-10 Minuten genuegen fuer ein solides Gefuehl beim Trimmen.',
    bodyIt:
      'Un simulatore di vela con fisica in tempo reale. Vedrai le forze sulle vele, lo sbandamento e lo scarroccio come su una barca vera. 8-10 minuti ti danno un buon feeling per il trimmaggio.',
  },
  {
    icon: '🌬',
    titleRu: 'Ветер идёт сверху',
    titleEn: 'Wind always from the top',
    titlePl: 'Wiatr zawsze z gory',
    titleEs: 'El viento viene de arriba',
    titleFr: 'Le vent vient du haut',
    titleDe: 'Der Wind kommt von oben',
    titleIt: 'Il vento arriva dall\'alto',
    bodyRu:
      'Красный конус NO-GO - мёртвая зона (против ветра). Туда идти нельзя. Синяя стрелка TW показывает истинный ветер, AW - что чувствует лодка на ходу.',
    bodyEn:
      'The red NO-GO cone is the dead zone (into the wind). Blue TW arrow is the true wind, AW is the apparent wind the moving boat feels.',
    bodyPl:
      'Czerwony stozek NO-GO to strefa martwa (pod wiatr). Niebieska strzalka TW to wiatr prawdziwy, AW to wiatr pozorny odczuwany przez jacht.',
    bodyEs:
      'El cono rojo NO-GO es la zona muerta (contra el viento). La flecha azul TW es el viento real, AW es el viento aparente que siente la barca en movimiento.',
    bodyFr:
      'Le cone rouge NO-GO est la zone morte (au vent). La fleche bleue TW est le vent reel, AW est le vent apparent ressenti par le bateau en mouvement.',
    bodyDe:
      'Der rote NO-GO-Kegel ist die Totzone (in den Wind). Der blaue TW-Pfeil ist der wahre Wind, AW ist der scheinbare Wind, den das fahrende Boot spuert.',
    bodyIt:
      'Il cono rosso NO-GO e la zona morta (controvento). La freccia blu TW e il vento reale, AW e il vento apparente che sente la barca in movimento.',
  },
  {
    icon: '🧭',
    titleRu: 'ВЕТЕР + РУЛЬ - куда идём',
    titleEn: 'WIND + HELM - your course',
    titlePl: 'WIATR + STER - twoj kurs',
    titleEs: 'VIENTO + TIMON - tu rumbo',
    titleFr: 'VENT + BARRE - ton cap',
    titleDe: 'WIND + RUDER - dein Kurs',
    titleIt: 'VENTO + TIMONE - la tua rotta',
    bodyRu:
      'В поде ВЕТЕР - угол TWA (к ветру) и сила ветра. Нажми галс - лодка ПОВЕРНЁТСЯ через ветер за ~5 сек. РУЛЬ показывает текущий и целевой курс.',
    bodyEn:
      'The WIND pod has TWA (angle to wind) and wind speed. Click the tack label - the boat TURNS through the wind over ~5 s. HELM shows current vs target bearing.',
    bodyPl:
      'Pod WIATR ma TWA (kat do wiatru) i sile wiatru. Klik na hals - jacht SKRECA przez wiatr przez ~5 s. STER pokazuje kurs biezacy i docelowy.',
    bodyEs:
      'El pod VIENTO muestra TWA (angulo al viento) y fuerza del viento. Haz click en la amura - la barca VIRA a traves del viento en ~5 s. TIMON muestra rumbo actual vs objetivo.',
    bodyFr:
      'Le pod VENT affiche TWA (angle au vent) et force du vent. Clique sur l\'amure - le bateau VIRE de bord a travers le vent en ~5 s. BARRE montre le cap actuel vs cible.',
    bodyDe:
      'Der WIND-Pod zeigt TWA (Winkel zum Wind) und Windgeschwindigkeit. Klick auf den Halsenlabel - das Boot WENDET durch den Wind in ~5 s. RUDER zeigt aktuellen vs gewuenschten Kurs.',
    bodyIt:
      'Il pod VENTO mostra TWA (angolo al vento) e forza del vento. Clicca sulle mure - la barca VIRA attraverso il vento in ~5 s. TIMONE mostra rotta attuale vs obiettivo.',
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
      'Angle = how tightly the sheet is pulled. Reef (R1/R2) shrinks the main. Jib furl 0-100%. Green ATTACHED dot = sail working. Red STALL = flow detached.',
    bodyPl:
      'Kat = jak mocno wybrany szot. Ref (R1/R2) zmniejsza grota. Zwijanie foka 0-100. Zielony PRACUJE = zagiel dziala. Czerwony STALL = przeplyw oderwany.',
    bodyEs:
      'Angulo = cuanto se cazaba la escota. Rizo (R1/R2) reduce la mayor. Enrollado del foque 0-100. Punto verde PEGADO = vela funcionando. STALL rojo = flujo separado.',
    bodyFr:
      'Angle = a quel point l\'ecoute est bordee. Ris (R1/R2) reduit la grand-voile. Enroulement du foc 0-100. Point vert ATTACHE = voile qui porte. STALL rouge = ecoulement decroche.',
    bodyDe:
      'Winkel = wie fest die Schot angezogen ist. Reff (R1/R2) verkleinert das Gross. Fock-Roll 0-100. Gruener ATTACHED-Punkt = Segel arbeitet. Roter STALL = Stroemung abgerissen.',
    bodyIt:
      'Angolo = quanto la scotta e cazzata. Terzarolo (R1/R2) riduce la randa. Avvolgimento del fiocco 0-100. Punto verde ATTACCATO = vela che lavora. STALL rosso = flusso staccato.',
  },
  {
    icon: '👻',
    titleRu: 'Призрак оптимума',
    titleEn: 'Ghost optimum',
    titlePl: 'Duch optymalny',
    titleEs: 'Fantasma del optimo',
    titleFr: 'Fantome d\'optimum',
    titleDe: 'Geister-Optimum',
    titleIt: 'Fantasma dell\'ottimo',
    bodyRu:
      'Пунктирные зелёные силуэты - где паруса ДОЛЖНЫ стоять на этом курсе и ветре. Твои паруса должны лечь точно на них - тогда трим 100%.',
    bodyEn:
      'The dashed green silhouettes show where the sails SHOULD sit for this course and wind. Match them and trim hits 100%.',
    bodyPl:
      'Zielone przerywane sylwetki pokazuja gdzie zagle POWINNY byc dla tego kursu i wiatru. Nalicz je - trym 100%.',
    bodyEs:
      'Las siluetas verdes punteadas muestran donde DEBERIAN estar las velas para este rumbo y viento. Iguala esa posicion y el trimado llega al 100%.',
    bodyFr:
      'Les silhouettes vertes pointillees montrent ou les voiles DEVRAIENT etre pour cette allure et ce vent. Aligne-toi dessus et le trim monte a 100%.',
    bodyDe:
      'Die gestrichelten gruenen Umrisse zeigen, wo die Segel fuer diesen Kurs und Wind stehen SOLLTEN. Triffst du sie, steht der Trim bei 100%.',
    bodyIt:
      'Le sagome verdi tratteggiate mostrano dove DOVREBBERO stare le vele per questa andatura e vento. Allineale e il trim raggiunge il 100%.',
  },
  {
    icon: '📊',
    titleRu: 'Метрики и комментарий',
    titleEn: 'Metrics and commentary',
    titlePl: 'Metryki i komentarz',
    titleEs: 'Metricas y comentarios',
    titleFr: 'Metriques et commentaire',
    titleDe: 'Metriken und Kommentar',
    titleIt: 'Metriche e commento',
    bodyRu:
      'Снизу 4 числа: СКОРОСТЬ, КРЕН, AWA, ТРИМ. Под ними строчка от тренера - что сейчас не так или что хорошо. Цвет подсказывает уровень срочности.',
    bodyEn:
      'Bottom strip: SPEED, HEEL, AWA, TRIM. The line under it is the coach telling you what is wrong or right. Color signals urgency.',
    bodyPl:
      'Dolny pasek: PREDKOSC, PRZECHYL, AWA, TRYM. Linia pod nim to trener mowiacy co jest zle lub dobrze. Kolor sygnalizuje wage.',
    bodyEs:
      'Franja inferior: VELOCIDAD, ESCORA, AWA, TRIMADO. La linea debajo es el coach diciendo que va mal o bien. El color indica urgencia.',
    bodyFr:
      'Bandeau du bas : VITESSE, GITE, AWA, TRIM. La ligne en dessous c\'est le coach qui dit ce qui va ou ne va pas. La couleur indique l\'urgence.',
    bodyDe:
      'Unterer Streifen: GESCHWINDIGKEIT, KRAENGUNG, AWA, TRIM. Die Zeile darunter ist der Coach, der sagt was klappt oder nicht. Farbe signalisiert Dringlichkeit.',
    bodyIt:
      'Striscia in basso: VELOCITA, SBANDAMENTO, AWA, TRIM. La riga sotto e il coach che dice cosa va o non va. Il colore indica l\'urgenza.',
  },
  {
    icon: '🎯',
    titleRu: 'Три режима',
    titleEn: 'Three modes',
    titlePl: 'Trzy tryby',
    titleEs: 'Tres modos',
    titleFr: 'Trois modes',
    titleDe: 'Drei Modi',
    titleIt: 'Tre modalita',
    bodyRu:
      'СВОБОДНО - песочница. УПРАЖНЕНИЯ - задачи с таймером (держи трим 10 секунд). СЦЕНАРИИ - готовые ситуации (перегруз, плохой слот, перетянутый грот).',
    bodyEn:
      'Free Sail - sandbox. Drills - timed tasks (hold trim for 10 s). Scenarios - canned situations (overpowered, bad slot, overtrimmed main).',
    bodyPl:
      'Wolna jazda - piaskownica. Cwiczenia - zadania z czasem (trzymaj trym 10 s). Scenariusze - gotowe sytuacje (za duzo mocy, zly slot, przebrany grot).',
    bodyEs:
      'LIBRE - sandbox. EJERCICIOS - tareas con cronometro (manten el trim 10 s). ESCENARIOS - situaciones preparadas (sobrecarga, mal slot, mayor sobretrimada).',
    bodyFr:
      'LIBRE - bac a sable. EXERCICES - taches chronometrees (maintiens le trim 10 s). SCENARIOS - situations prefaites (surpuissance, mauvais slot, GV sur-bordee).',
    bodyDe:
      'FREI - Sandbox. DRILLS - Aufgaben mit Timer (halte den Trim 10 s). SZENARIEN - feste Situationen (ueberdrueckt, schlechter Slot, zu dicht gefahrenes Gross).',
    bodyIt:
      'LIBERA - sandbox. ESERCIZI - compiti a tempo (tieni il trim 10 s). SCENARI - situazioni preconfezionate (sovrapotenza, slot sbagliato, randa sovratesata).',
  },
  {
    icon: '👁',
    titleRu: 'ВИД - сверху / сзади / сбоку',
    titleEn: 'VIEW - top / rear / side',
    titlePl: 'WIDOK - gora / tyl / bok',
    titleEs: 'VISTA - cenital / popa / lateral',
    titleFr: 'VUE - dessus / arriere / cote',
    titleDe: 'ANSICHT - oben / hinten / seitlich',
    titleIt: 'VISTA - alto / poppa / lato',
    bodyRu:
      'Сверху читаешь курс. Сзади - видно крен и рангоут как с другой яхты. Сбоку - профиль с килем и рулём. В каждом режиме подсвечивается своё.',
    bodyEn:
      'Top-down for course reading. Rear for heel and rig as seen from another boat. Side for the profile with keel and rudder. Each view highlights different things.',
    bodyPl:
      'Gora dla odczytu kursu. Tyl dla przechylu i olinowania. Bok dla profilu z kilem i sterem. Kazdy widok podkresla co innego.',
    bodyEs:
      'Cenital para leer el rumbo. Popa para ver escora y aparejo como desde otro barco. Lateral para el perfil con quilla y timon. Cada vista resalta cosas distintas.',
    bodyFr:
      'Vue du dessus pour lire le cap. Arriere pour voir la gite et le greement comme depuis un autre bateau. Cote pour le profil avec quille et gouvernail. Chaque vue met en avant autre chose.',
    bodyDe:
      'Draufsicht zum Kurslesen. Heckansicht fuer Kraengung und Rigg wie vom anderen Boot aus. Seitenansicht fuer das Profil mit Kiel und Ruder. Jede Ansicht hebt andere Dinge hervor.',
    bodyIt:
      'Vista dall\'alto per leggere la rotta. Da poppa per sbandamento e attrezzatura come da un\'altra barca. Di lato per il profilo con chiglia e timone. Ogni vista evidenzia cose diverse.',
  },
  {
    icon: '🔗',
    titleRu: 'Поделись сетапом',
    titleEn: 'Share your setup',
    titlePl: 'Udostepnij setup',
    titleEs: 'Comparte tu setup',
    titleFr: 'Partage ta config',
    titleDe: 'Teile dein Setup',
    titleIt: 'Condividi il tuo setup',
    bodyRu:
      'Кнопка "Поделиться" копирует ссылку на твой текущий сетап. Отправь коллеге - у него откроется с теми же слайдерами. Или сохрани на потом.',
    bodyEn:
      '"Share" copies a link to your current setup. Send it to a friend - their page opens with the same sliders. Or save it for later.',
    bodyPl:
      'Udostepnij kopiuje link do twojego setupu. Wyslij kolezance - otworzy sie z tymi samymi slajderami. Albo zapisz na pozniej.',
    bodyEs:
      '"Compartir" copia un enlace a tu setup actual. Envialo a un amigo - su pagina se abrira con los mismos sliders. O guardalo para despues.',
    bodyFr:
      '"Partager" copie un lien vers ta config actuelle. Envoie-le a un ami - sa page s\'ouvre avec les memes sliders. Ou garde-le pour plus tard.',
    bodyDe:
      '"Teilen" kopiert einen Link zu deinem aktuellen Setup. Schick ihn einer Freundin - ihre Seite oeffnet mit den gleichen Slidern. Oder speichere fuer spaeter.',
    bodyIt:
      '"Condividi" copia un link al tuo setup attuale. Inviatelo a un amico - la sua pagina si apre con gli stessi slider. Oppure salvalo per dopo.',
  },
  {
    icon: '🚀',
    titleRu: 'Поехали',
    titleEn: 'Go sailing',
    titlePl: 'Do dziela',
    titleEs: 'A navegar',
    titleFr: 'Au plan d\'eau',
    titleDe: 'Leinen los',
    titleIt: 'Si salpa',
    bodyRu:
      'Начни с режима СВОБОДНО. Покрути слайдеры, посмотри как меняется трим. Потом в УПРАЖНЕНИЯ - "Держи трим" выдаёт первую цель. Помощь - кнопка "?" наверху.',
    bodyEn:
      'Start in Free Sail. Move sliders, watch trim change. Then try Drills - "Hold trim" gives you your first goal. Help button "?" is at the top any time.',
    bodyPl:
      'Zacznij od Wolna jazda. Rusz slajdery, zobacz jak zmienia sie trym. Potem Cwiczenia - "Utrzymaj trym" daje pierwszy cel. Pomoc - "?" na gorze.',
    bodyEs:
      'Empieza en LIBRE. Mueve los sliders, mira como cambia el trim. Luego prueba EJERCICIOS - "Manten el trim" te da el primer objetivo. El boton de ayuda "?" esta arriba siempre.',
    bodyFr:
      'Commence en LIBRE. Bouge les sliders, regarde le trim changer. Ensuite EXERCICES - "Maintiens le trim" te donne ton premier objectif. Le bouton d\'aide "?" est en haut a tout moment.',
    bodyDe:
      'Starte im FREI-Modus. Bewege die Slider, beobachte wie sich der Trim aendert. Dann DRILLS - "Halte den Trim" gibt dir das erste Ziel. Der Hilfe-Button "?" ist immer oben.',
    bodyIt:
      'Inizia in LIBERA. Sposta gli slider, guarda il trim cambiare. Poi prova ESERCIZI - "Tieni il trim" ti da il primo obiettivo. Il pulsante aiuto "?" e in alto sempre.',
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

  // Auto-open on first visit, unless the user already dismissed us.
  useEffect(() => {
    if (forceOpen) {
      setShow(true);
      setStep(0);
      return;
    }
    try {
      if (typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEY)) {
        const t = setTimeout(() => setShow(true), 700);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage blocked in private mode
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
          aria-label={tp('Закрыть обзор', 'Close tour', 'Zamknij przewodnik')}
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
              {tp('Назад', 'Back', 'Wstecz')}
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
              ? tp('Поехали', 'Go sailing', 'Do dziela')
              : tp('Дальше', 'Next', 'Dalej')}
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
          )}
        </div>
      </div>
    </div>
  );
}
