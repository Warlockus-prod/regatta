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
  bodyRu: string;
  bodyEn: string;
  bodyPl: string;
}

const STEPS: TourStep[] = [
  {
    icon: '⛵',
    titleRu: 'Добро пожаловать в V3',
    titleEn: 'Welcome to V3',
    titlePl: 'Witaj w V3',
    bodyRu:
      'Учебный тренажёр парусной яхты с живой физикой. Ты будешь видеть силы на парусах, крен и снос как на реальной лодке. 8-10 минут - и ты поймёшь триммирование.',
    bodyEn:
      'A live-physics sailing trainer. You will see the forces on the sails, heel, and leeway as on a real boat. 8-10 minutes gives you a solid feel for trim.',
    bodyPl:
      'Trener zeglarstwa z fizyka na zywo. Zobaczysz sily na zaglach, przechyl i dryf jak na prawdziwej lodzi. 8-10 minut i rozumiesz trymowanie.',
  },
  {
    icon: '🌬',
    titleRu: 'Ветер идёт сверху',
    titleEn: 'Wind always from the top',
    titlePl: 'Wiatr zawsze z gory',
    bodyRu:
      'Красный конус NO-GO - мёртвая зона (против ветра). Туда идти нельзя. Синяя стрелка TW показывает истинный ветер, AW - что чувствует лодка на ходу.',
    bodyEn:
      'The red NO-GO cone is the dead zone (into the wind). Blue TW arrow is the true wind, AW is the apparent wind the moving boat feels.',
    bodyPl:
      'Czerwony stozek NO-GO to strefa martwa (pod wiatr). Niebieska strzalka TW to wiatr prawdziwy, AW to wiatr pozorny odczuwany przez jacht.',
  },
  {
    icon: '🧭',
    titleRu: 'ВЕТЕР + РУЛЬ - куда идём',
    titleEn: 'WIND + HELM - your course',
    titlePl: 'WIATR + STER - twoj kurs',
    bodyRu:
      'В поде ВЕТЕР - угол TWA (к ветру) и сила ветра. Нажми галс - лодка ПОВЕРНЁТСЯ через ветер за ~5 сек. РУЛЬ показывает текущий и целевой курс.',
    bodyEn:
      'The WIND pod has TWA (angle to wind) and wind speed. Click the tack label - the boat TURNS through the wind over ~5 s. HELM shows current vs target bearing.',
    bodyPl:
      'Pod WIATR ma TWA (kat do wiatru) i sile wiatru. Klik na hals - jacht SKRECA przez wiatr przez ~5 s. STER pokazuje kurs biezacy i docelowy.',
  },
  {
    icon: '🎏',
    titleRu: 'ГРОТ + СТАКСЕЛЬ',
    titleEn: 'MAIN + JIB',
    titlePl: 'GROT + FOK',
    bodyRu:
      'Угол - насколько шкот выбран. Риф (R1/R2) уменьшает грот. Раскрытие стакселя 0-100. Зелёная точка ТЯНЕТ - парус работает. Красный СРЫВ - поток оторвался.',
    bodyEn:
      'Angle = how tightly the sheet is pulled. Reef (R1/R2) shrinks the main. Jib furl 0-100%. Green ATTACHED dot = sail working. Red STALL = flow detached.',
    bodyPl:
      'Kat = jak mocno wybrany szot. Ref (R1/R2) zmniejsza grota. Zwijanie foka 0-100. Zielony PRACUJE = zagiel dziala. Czerwony STALL = przeplyw oderwany.',
  },
  {
    icon: '👻',
    titleRu: 'Призрак оптимума',
    titleEn: 'Ghost optimum',
    titlePl: 'Duch optymalny',
    bodyRu:
      'Пунктирные зелёные силуэты - где паруса ДОЛЖНЫ стоять на этом курсе и ветре. Твои паруса должны лечь точно на них - тогда трим 100%.',
    bodyEn:
      'The dashed green silhouettes show where the sails SHOULD sit for this course and wind. Match them and trim hits 100%.',
    bodyPl:
      'Zielone przerywane sylwetki pokazuja gdzie zagle POWINNY byc dla tego kursu i wiatru. Nalicz je - trym 100%.',
  },
  {
    icon: '📊',
    titleRu: 'Метрики и комментарий',
    titleEn: 'Metrics and commentary',
    titlePl: 'Metryki i komentarz',
    bodyRu:
      'Снизу 4 числа: СКОРОСТЬ, КРЕН, AWA, ТРИМ. Под ними строчка от тренера - что сейчас не так или что хорошо. Цвет подсказывает уровень срочности.',
    bodyEn:
      'Bottom strip: SPEED, HEEL, AWA, TRIM. The line under it is the coach telling you what is wrong or right. Color signals urgency.',
    bodyPl:
      'Dolny pasek: PREDKOSC, PRZECHYL, AWA, TRYM. Linia pod nim to trener mowiacy co jest zle lub dobrze. Kolor sygnalizuje wage.',
  },
  {
    icon: '🎯',
    titleRu: 'Три режима',
    titleEn: 'Three modes',
    titlePl: 'Trzy tryby',
    bodyRu:
      'СВОБОДНО - песочница. УПРАЖНЕНИЯ - задачи с таймером (держи трим 10 секунд). СЦЕНАРИИ - готовые ситуации (перегруз, плохой слот, перетянутый грот).',
    bodyEn:
      'Free Sail - sandbox. Drills - timed tasks (hold trim for 10 s). Scenarios - canned situations (overpowered, bad slot, overtrimmed main).',
    bodyPl:
      'Wolna jazda - piaskownica. Cwiczenia - zadania z czasem (trzymaj trym 10 s). Scenariusze - gotowe sytuacje (za duzo mocy, zly slot, przebrany grot).',
  },
  {
    icon: '👁',
    titleRu: 'ВИД - сверху / сзади / сбоку',
    titleEn: 'VIEW - top / rear / side',
    titlePl: 'WIDOK - gora / tyl / bok',
    bodyRu:
      'Сверху читаешь курс. Сзади - видно крен и рангоут как с другой яхты. Сбоку - профиль с килем и рулём. В каждом режиме подсвечивается своё.',
    bodyEn:
      'Top-down for course reading. Rear for heel and rig as seen from another boat. Side for the profile with keel and rudder. Each view highlights different things.',
    bodyPl:
      'Gora dla odczytu kursu. Tyl dla przechylu i olinowania. Bok dla profilu z kilem i sterem. Kazdy widok podkresla co innego.',
  },
  {
    icon: '🔗',
    titleRu: 'Поделись сетапом',
    titleEn: 'Share your setup',
    titlePl: 'Udostepnij setup',
    bodyRu:
      'Кнопка "Поделиться" копирует ссылку на твой текущий сетап. Отправь коллеге - у него откроется с теми же слайдерами. Или сохрани на потом.',
    bodyEn:
      '"Share" copies a link to your current setup. Send it to a friend - their page opens with the same sliders. Or save it for later.',
    bodyPl:
      'Udostepnij kopiuje link do twojego setupu. Wyslij kolezance - otworzy sie z tymi samymi slajderami. Albo zapisz na pozniej.',
  },
  {
    icon: '🚀',
    titleRu: 'Поехали',
    titleEn: 'Go sailing',
    titlePl: 'Do dziela',
    bodyRu:
      'Начни с режима СВОБОДНО. Покрути слайдеры, посмотри как меняется трим. Потом в УПРАЖНЕНИЯ - "Держи трим" выдаёт первую цель. Помощь - кнопка "?" наверху.',
    bodyEn:
      'Start in Free Sail. Move sliders, watch trim change. Then try Drills - "Hold trim" gives you your first goal. Help button "?" is at the top any time.',
    bodyPl:
      'Zacznij od Wolna jazda. Rusz slajdery, zobacz jak zmienia sie trym. Potem Cwiczenia - "Utrzymaj trym" daje pierwszy cel. Pomoc - "?" na gorze.',
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
  const pick = (ru: string, en: string, pl: string) =>
    lang === 'pl' ? pl : lang === 'en' ? en : ru;
  const title = pick(current.titleRu, current.titleEn, current.titlePl);
  const body = pick(current.bodyRu, current.bodyEn, current.bodyPl);
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
