'use client';

import { useEffect, useState } from 'react';
import type { Lang } from '@/lib/languages';
import { type TpFn } from '../shared';
import { NO_GO_HALF_DEG } from '@/lib/sailing-physics/constants';

// ---------------------------------------------------------------------------
// Trainer help, opened only by the "?" button. Never opens by itself (DESIGN.md:
// no automatic welcome dialogs), and it is three cards, not a tour (audit B5):
// the coach line under the scene explains the rest at the moment it matters.
// ---------------------------------------------------------------------------

export interface TourStep {
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
    titleRu: 'Ветер идёт сверху',
    titleEn: 'Wind always from the top',
    titlePl: 'Wiatr zawsze wieje z góry',
    titleEs: 'El viento viene de arriba',
    titleFr: 'Le vent vient du haut',
    titleDe: 'Der Wind kommt von oben',
    titleIt: 'Il vento arriva dall\'alto',
    bodyRu:
      `Красный конус - мёртвая зона, ±${NO_GO_HALF_DEG}° от ветра. Туда идти нельзя. Синяя стрелка TW показывает истинный ветер, AW - что чувствует лодка на ходу.`,
    bodyEn:
      `The red cone is the no-go zone, ±${NO_GO_HALF_DEG}° from the wind: you cannot sail there. The blue TW arrow is the true wind; AW is the apparent wind the moving boat feels.`,
    bodyPl:
      `Czerwony stożek to kąt martwy, ±${NO_GO_HALF_DEG}° od wiatru: tam nie popłyniesz. Niebieska strzałka TW to wiatr prawdziwy, AW to wiatr pozorny, który czuje płynący jacht.`,
    bodyEs:
      `El cono rojo es la zona muerta, ±${NO_GO_HALF_DEG}° respecto al viento: por ahí no se puede navegar. La flecha azul TW es el viento real; AW, el viento aparente que siente el barco en movimiento.`,
    bodyFr:
      `Le cône rouge est la zone morte, ±${NO_GO_HALF_DEG}° du vent : impossible d'y naviguer. La flèche bleue TW est le vent réel, AW le vent apparent ressenti par le bateau en mouvement.`,
    bodyDe:
      `Der rote Kegel ist der tote Winkel, ±${NO_GO_HALF_DEG}° zum Wind: Dorthin kannst du nicht segeln. Der blaue TW-Pfeil ist der wahre Wind, AW der scheinbare Wind, den das fahrende Boot spürt.`,
    bodyIt:
      `Il cono rosso è l'angolo morto, ±${NO_GO_HALF_DEG}° dal vento: lì non si naviga. La freccia blu TW è il vento reale, AW il vento apparente che sente la barca in movimento.`,
  },
  {
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
  /** Called on close. */
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
          background: 'color-mix(in srgb, var(--bg-secondary) 95%, transparent)',
          border: '1px solid var(--border-subtle)',
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
          className="absolute top-2 right-2 w-11 h-11 rounded-full flex items-center justify-center text-lg transition"
          style={{
            color: 'var(--text-muted)',
          }}
        >
          ×
        </button>

        <h2
          className="text-xl sm:text-2xl font-bold mb-2 pr-10"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h2>
        <p
          className="text-base leading-relaxed mb-5"
          style={{ color: 'var(--text-secondary)' }}
        >
          {body}
        </p>

        <div className="flex gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 min-h-11 py-2.5 rounded-lg border text-sm font-semibold transition"
              style={{
                borderColor: 'var(--border-subtle)',
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
            className="flex-[2] min-h-11 py-2.5 rounded-lg font-bold text-sm transition"
            style={{
              background: 'var(--accent-cyan)',
              color: 'var(--accent-ink, #04222e)',
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
          className="mt-4 text-sm text-center"
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
