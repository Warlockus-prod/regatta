import { useI18n } from '../../src/i18n/context';
import { PlaceholderScreen } from '../../src/design-system/components';

export default function Game() {
  const { tp } = useI18n();
  return (
    <PlaceholderScreen
      title={tp('Гонка', 'Race', 'Wyscig', {
        es: 'Regata',
        fr: 'Course',
        de: 'Rennen',
        it: 'Gara',
      })}
      badge={tp('Phase 2', 'Phase 2', 'Phase 2', {
        es: 'Fase 2',
        fr: 'Phase 2',
        de: 'Phase 2',
        it: 'Fase 2',
      })}
      note={tp(
        'Сольный режим гонки - короткий курс с буями, реальной физикой ветра и автоматическим финишем. Приходит вместе с симулятором.',
        'Solo race mode - a short buoy course with real wind physics and automatic finish line. Lands together with the simulator.',
        'Tryb solo - krotki kurs z bojami, prawdziwa fizyka wiatru i automatyczna meta. Pojawia sie razem z symulatorem.',
        {
          es: 'Modo solo - recorrido corto de boyas, fisica real del viento y meta automatica. Llega con el simulador.',
          fr: 'Mode solo - parcours court avec bouees, physique du vent reelle et arrivee automatique. Arrive avec le simulateur.',
          de: 'Solo-Modus - kurzer Bojenkurs mit echter Windphysik und Auto-Ziellinie. Kommt mit dem Simulator.',
          it: 'Modalita solo - percorso breve con boe, fisica del vento reale e traguardo automatico. Arriva con il simulatore.',
        },
      )}
      highlights={[
        tp(
          'Старт по обратному отсчёту, финиш по таймеру',
          'Countdown start, timed finish',
          'Start na odliczanie, meta na czas',
          {
            es: 'Salida con cuenta atras, meta cronometrada',
            fr: 'Depart en compte a rebours, arrivee chronometree',
            de: 'Countdown-Start, Zielzeit gemessen',
            it: 'Partenza con countdown, arrivo a tempo',
          },
        ),
        tp(
          'Подсказки от AI-тренера на ходу',
          'AI coach hints on the fly',
          'Podpowiedzi trenera AI na biezaco',
          {
            es: 'Consejos del entrenador IA al vuelo',
            fr: 'Conseils du coach IA en direct',
            de: 'KI-Coach-Tipps im Verlauf',
            it: 'Suggerimenti del coach IA in corsa',
          },
        ),
        tp(
          'Запись повтора и публикация в таблицу лидеров',
          'Replay recording, publish to leaderboard',
          'Nagrywanie powtorki, publikacja na tabeli',
          {
            es: 'Grabacion de repeticion, publicacion en clasificacion',
            fr: 'Enregistrement et publication dans le classement',
            de: 'Replay-Aufnahme, Veroeffentlichung in der Bestenliste',
            it: 'Registrazione del replay e pubblicazione in classifica',
          },
        ),
      ]}
    />
  );
}
