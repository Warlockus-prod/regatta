import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../src/i18n/context';
import {
  Card,
  type CardAccent,
  Icon,
  type IconName,
  ListRow,
  Screen,
  Text,
  WindNowCard,
  Wordmark,
} from '../src/design-system/components';
import { useBootcampProgress } from '../src/persistence/bootcamp';
import { summarizeContinue, TOTAL_DAYS } from '../src/bootcamp/days';
import { legacyPick } from '../src/i18n/languages';
import { colors, glow, spacing } from '../src/design-system/tokens';
import { fetchDaily, type DailyChallenge } from '../src/api/daily';
import { findCourse } from '../src/game/course';
import { useRaceHistory } from '../src/persistence/race-history';

const ACCENT_COLOR: Record<CardAccent, string> = {
  cyan: colors.accentCyan,
  success: colors.success,
  warning: colors.warning,
};

/**
 * Home v2. Mirrors the web home (`src/app/page.tsx`):
 *  - Brand wordmark stack header (mobile-only, web uses a top nav strip)
 *  - "Where to start" - three primary tinted Cards (Bootcamp / Quick / Rules)
 *    with per-card accent (cyan / green / orange) matching the web signature
 *  - Reference / Tools / More - secondary ListRows for visual hierarchy
 *
 * The per-card tinted background is the deliberate brand signature (web
 * uses 8% bg + 30% border on each entry card). Mobile inherits that.
 */
export default function Home() {
  const { tp, lang } = useI18n();
  const router = useRouter();
  const { completedIds, lastViewedLessonId, ready } = useBootcampProgress();
  // Sprint 10: Race history entry only renders once the user has a race
  // saved on device. We don't gate behind `raceHistory.ready` because
  // the row is OK to flicker in - it's quieter than rendering nothing
  // for half a second when there's actually content to show.
  const raceHistory = useRaceHistory();
  const hasRaceHistory = raceHistory.races.length > 0;
  const continueState = summarizeContinue(completedIds, lastViewedLessonId);
  const showContinue = ready && completedIds.size > 0 && !continueState.allDone;
  const showCelebration = ready && continueState.allDone && completedIds.size > 0;

  // Daily challenge: opportunistic fetch (cached 1h via daily.ts). The
  // banner only renders if the API returned a valid response for today.
  // 404 / network failure = nothing rendered, never an empty state.
  const [daily, setDaily] = useState<DailyChallenge | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchDaily().then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) setDaily(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const tagline = tp(
    'Учебник парусного спорта',
    'Sailing tutor',
    'Trener zeglarstwa',
    {
      es: 'Tutor de vela',
      fr: 'Tuteur de voile',
      de: 'Segel-Tutor',
      it: 'Tutor di vela',
    },
  );

  const startSection = tp('С чего начать', 'Where to start', 'Od czego zaczac', {
    es: 'Donde empezar',
    fr: 'Par ou commencer',
    de: 'Wo anfangen',
    it: 'Da dove iniziare',
  });
  const refSection = tp('Справочник', 'Reference', 'Spis', {
    es: 'Referencia',
    fr: 'Reference',
    de: 'Referenz',
    it: 'Riferimento',
  });
  const toolsSection = tp('Инструменты', 'Tools', 'Narzedzia', {
    es: 'Herramientas',
    fr: 'Outils',
    de: 'Werkzeuge',
    it: 'Strumenti',
  });
  const moreSection = tp('Ещё', 'More', 'Wiecej', {
    es: 'Mas',
    fr: 'Plus',
    de: 'Mehr',
    it: 'Altro',
  });
  const liveWindSection = tp('Ветер сейчас', 'Live wind', 'Wiatr teraz', {
    es: 'Viento en vivo',
    fr: 'Vent en direct',
    de: 'Wind live',
    it: 'Vento in diretta',
  });

  const ctaStart = tp('Начать', 'Start', 'Start', {
    es: 'Iniciar',
    fr: 'Commencer',
    de: 'Starten',
    it: 'Inizia',
  });

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Wordmark size="xl" />
          <Text variant="caption" style={styles.tagline}>{tagline}</Text>
        </View>

        {/* Daily challenge is rendered lower now - below the "Where to start"
            cards - so the primary learning path leads. See below. */}

        {showContinue && continueState.nextLesson && continueState.nextDay ? (
          <ContinueRow
            day={continueState.nextDay}
            doneInDay={continueState.doneInNextDay}
            totalInDay={continueState.totalInNextDay}
            lessonTitle={legacyPick(continueState.nextLesson, 'title', lang)}
            kicker={tp(
              `Продолжить День ${continueState.nextDay}`,
              `Continue Day ${continueState.nextDay}`,
              `Kontynuuj Dzien ${continueState.nextDay}`,
              {
                es: `Continuar Dia ${continueState.nextDay}`,
                fr: `Continuer Jour ${continueState.nextDay}`,
                de: `Tag ${continueState.nextDay} fortsetzen`,
                it: `Continua Giorno ${continueState.nextDay}`,
              },
            )}
            ctaLabel={tp('Продолжить', 'Continue', 'Kontynuuj', {
              es: 'Continuar',
              fr: 'Continuer',
              de: 'Weiter',
              it: 'Continua',
            })}
            dayCountLabel={tp(
              `День ${continueState.nextDay} из ${TOTAL_DAYS}`,
              `Day ${continueState.nextDay} of ${TOTAL_DAYS}`,
              `Dzien ${continueState.nextDay} z ${TOTAL_DAYS}`,
              {
                es: `Dia ${continueState.nextDay} de ${TOTAL_DAYS}`,
                fr: `Jour ${continueState.nextDay} sur ${TOTAL_DAYS}`,
                de: `Tag ${continueState.nextDay} von ${TOTAL_DAYS}`,
                it: `Giorno ${continueState.nextDay} di ${TOTAL_DAYS}`,
              },
            )}
            dayProgressLabel={
              continueState.totalInNextDay > 1
                ? tp(
                    `${continueState.doneInNextDay} из ${continueState.totalInNextDay} в этом дне`,
                    `${continueState.doneInNextDay} of ${continueState.totalInNextDay} in this day`,
                    `${continueState.doneInNextDay} z ${continueState.totalInNextDay} w tym dniu`,
                    {
                      es: `${continueState.doneInNextDay} de ${continueState.totalInNextDay} hoy`,
                      fr: `${continueState.doneInNextDay} sur ${continueState.totalInNextDay} aujourdhui`,
                      de: `${continueState.doneInNextDay} von ${continueState.totalInNextDay} heute`,
                      it: `${continueState.doneInNextDay} di ${continueState.totalInNextDay} oggi`,
                    },
                  )
                : null
            }
            onPress={() => router.push(`/bootcamp/${continueState.nextLesson!.id}`)}
          />
        ) : null}

        {showCelebration ? (
          <CelebrationRow
            title={tp(
              'Все 7 дней пройдены. Готов к регате.',
              'All 7 days done. Ready for the regatta.',
              'Wszystkie 7 dni gotowe. Gotowy do regat.',
              {
                es: 'Los 7 dias completados. Listo para la regata.',
                fr: 'Les 7 jours sont faits. Prêt pour la regate.',
                de: 'Alle 7 Tage geschafft. Bereit fuer die Regatta.',
                it: 'Tutti i 7 giorni completati. Pronto per la regata.',
              },
            )}
            ctaLabel={tp('К гонке', 'To the race', 'Do wyscigu', {
              es: 'A la regata',
              fr: 'A la course',
              de: 'Zum Rennen',
              it: 'Alla gara',
            })}
            onPress={() => router.push('/game')}
          />
        ) : null}

        <Text variant="muted" style={styles.sectionLabel}>
          {liveWindSection.toUpperCase()}
        </Text>
        <WindNowCard />

        <Text variant="muted" style={[styles.sectionLabel, styles.sectionLabelGap]}>
          {startSection.toUpperCase()}
        </Text>

        <EntryCard
          accent="cyan"
          iconName="cap"
          title="Bootcamp"
          subtitle={tp('С нуля', 'Start from zero', 'Od zera', {
            es: 'Desde cero',
            fr: 'Depuis zero',
            de: 'Von null',
            it: 'Da zero',
          })}
          description={tp(
            '8 уроков по основам парусного спорта - примерно 50 минут от ветра до правил.',
            '8 fundamentals lessons - around 50 min from wind to rules.',
            '8 lekcji podstaw - okolo 50 min od wiatru do zasad.',
            {
              es: '8 lecciones basicas - unos 50 min, del viento a las reglas.',
              fr: '8 lecons fondamentales - environ 50 min, du vent aux regles.',
              de: '8 Grundlagen-Lektionen - rund 50 min, vom Wind bis zu den Regeln.',
              it: '8 lezioni di base - circa 50 min, dal vento alle regole.',
            },
          )}
          ctaLabel={ctaStart}
          ctaA11yLabel={tp(
            'Открыть Bootcamp',
            'Open Bootcamp',
            'Otworz Bootcamp',
            {
              es: 'Abrir Bootcamp',
              fr: 'Ouvrir Bootcamp',
              de: 'Bootcamp oeffnen',
              it: 'Apri Bootcamp',
            },
          )}
          onPress={() => router.push('/bootcamp')}
        />

        <EntryCard
          accent="success"
          iconName="bolt"
          title={tp('Быстрый разогрев', 'Quick refresh', 'Szybkie powtorzenie', {
            es: 'Repaso rapido',
            fr: 'Revision rapide',
            de: 'Schnelle Auffrischung',
            it: 'Ripasso rapido',
          })}
          subtitle={tp('Освежить за ~15 мин', 'Refresh in ~15 min', 'Odswiez w ~15 min', {
            es: 'Repasar en ~15 min',
            fr: 'Reviser en ~15 min',
            de: 'Auffrischen in ~15 Min',
            it: 'Ripassare in ~15 min',
          })}
          description={tp(
            '6 коротких уроков для тех, кто уже ходил под парусом - быстро освежить ключевое.',
            '6 short lessons for sailors who already know the ropes - refresh the essentials.',
            '6 krotkich lekcji dla tych, ktorzy juz zeglowali - odswiez kluczowe.',
            {
              es: '6 lecciones cortas para quien ya ha navegado - lo esencial al dia.',
              fr: '6 lecons courtes pour ceux qui ont deja navigue - rafraichir les bases.',
              de: '6 kurze Lektionen fuer wer schon gesegelt ist - Wesentliches auffrischen.',
              it: '6 lezioni brevi per chi ha gia navigato - rinfrescare lessenziale.',
            },
          )}
          ctaLabel={ctaStart}
          ctaA11yLabel={tp(
            'Открыть быстрый разогрев',
            'Open Quick refresh',
            'Otworz szybkie powtorzenie',
            {
              es: 'Abrir repaso rapido',
              fr: 'Ouvrir Revision rapide',
              de: 'Schnelle Auffrischung oeffnen',
              it: 'Apri Ripasso rapido',
            },
          )}
          onPress={() => router.push('/quick')}
        />

        <EntryCard
          accent="warning"
          iconName="book"
          title={tp('Правила', 'Rules of the road', 'Zasady', {
            es: 'Reglas',
            fr: 'Regles',
            de: 'Regeln',
            it: 'Regole',
          })}
          subtitle={tp('RRS + COLREGS', 'RRS + COLREGS', 'RRS + COLREGS', {
            es: 'RRS + COLREGS',
            fr: 'RRS + COLREGS',
            de: 'RRS + COLREGS',
            it: 'RRS + COLREGS',
          })}
          description={tp(
            '8 сценариев расхождения с другими судами - кто кому уступает и почему.',
            '8 collision scenarios - who gives way and why.',
            '8 scenariuszy rozejscia - kto ustepuje i dlaczego.',
            {
              es: '8 escenarios de colision - quien cede paso y por que.',
              fr: '8 scenarios de collision - qui cede le passage et pourquoi.',
              de: '8 Kollisions-Szenarien - wer ausweicht und warum.',
              it: '8 scenari di collisione - chi cede e perche.',
            },
          )}
          ctaLabel={ctaStart}
          ctaA11yLabel={tp(
            'Открыть правила расхождения',
            'Open Rules of the road',
            'Otworz zasady',
            {
              es: 'Abrir Reglas',
              fr: 'Ouvrir Regles',
              de: 'Regeln oeffnen',
              it: 'Apri Regole',
            },
          )}
          onPress={() => router.push('/rules')}
        />

        <EntryCard
          accent="cyan"
          iconName="compass"
          title={tp('Спросить ассистента', 'Ask the assistant', 'Zapytaj asystenta', {
            es: 'Pregunta al asistente',
            fr: 'Demander a l assistant',
            de: 'Assistent fragen',
            it: 'Chiedi all assistente',
          })}
          subtitle={tp('ИИ-помощник по парусу', 'AI sailing helper', 'Pomocnik AI', {
            es: 'Asistente IA de vela',
            fr: 'Assistant voile IA',
            de: 'KI-Segelhelfer',
            it: 'Assistente vela IA',
          })}
          description={tp(
            'Задай вопрос про парус, гонки, правила или термины - ассистент ответит и подскажет нужный раздел.',
            'Ask anything about sailing, racing, rules or terms - the assistant answers and points you to a section.',
            'Zapytaj o zeglarstwo, regaty, zasady lub terminy - asystent odpowie i wskaze sekcje.',
            {
              es: 'Pregunta sobre vela, regatas, reglas o terminos: el asistente responde y te indica la seccion.',
              fr: 'Demande sur la voile, les regates, les regles ou les termes : l assistant repond et oriente vers une section.',
              de: 'Frag zu Segeln, Regatten, Regeln oder Begriffen - der Assistent antwortet und zeigt den Bereich.',
              it: 'Chiedi di vela, regate, regole o termini: l assistente risponde e ti indica la sezione.',
            },
          )}
          ctaLabel={tp('Спросить', 'Ask', 'Zapytaj', {
            es: 'Preguntar',
            fr: 'Demander',
            de: 'Fragen',
            it: 'Chiedi',
          })}
          ctaA11yLabel={tp('Открыть ассистента', 'Open the assistant', 'Otworz asystenta', {
            es: 'Abrir asistente',
            fr: 'Ouvrir l assistant',
            de: 'Assistent oeffnen',
            it: 'Apri assistente',
          })}
          onPress={() => router.push('/ask')}
        />

        {daily ? (
          <DailyBanner
            challenge={daily}
            badgeLabel={tp('Дневной', 'Daily', 'Dzienny', {
              es: 'Diario',
              fr: 'Du jour',
              de: 'Taeglich',
              it: 'Giornaliero',
            })}
            titleLabel={findCourse(daily.challenge.missionId ?? 'daily').title(tp)}
            parLabel={tp('Par', 'Par', 'Par', {
              es: 'Par',
              fr: 'Par',
              de: 'Par',
              it: 'Par',
            })}
            ctaLabel={tp(
              'Сыграть дневной',
              'Try the daily',
              'Zagraj dzienny',
              {
                es: 'Jugar el diario',
                fr: 'Tenter le defi du jour',
                de: 'Tagesziel spielen',
                it: 'Prova la giornaliera',
              },
            )}
            onPress={() => router.push('/game?course=daily')}
          />
        ) : null}

        <Text variant="muted" style={[styles.sectionLabel, styles.sectionLabelGap]}>
          {refSection.toUpperCase()}
        </Text>
        <View style={styles.list}>
          <ListRow
            icon="parts"
            title={tp('Анатомия яхты', 'Yacht anatomy', 'Anatomia jachtu', {
              es: 'Anatomia del yate',
              fr: 'Anatomie du yacht',
              de: 'Yacht-Anatomie',
              it: 'Anatomia dello yacht',
            })}
            onPress={() => router.push('/anatomy')}
          />
          <ListRow
            icon="onboard"
            title={tp('На борту', 'On board', 'Na pokladzie', {
              es: 'A bordo',
              fr: 'A bord',
              de: 'An Bord',
              it: 'A bordo',
            })}
            onPress={() => router.push('/onboard')}
          />
          <ListRow
            icon="glossary"
            title={tp('Глоссарий', 'Glossary', 'Glosariusz', {
              es: 'Glosario',
              fr: 'Glossaire',
              de: 'Glossar',
              it: 'Glossario',
            })}
            onPress={() => router.push('/glossary')}
          />
          <ListRow
            icon="polar"
            title={tp('Курсы относительно ветра', 'Points of sail', 'Kursy', {
              es: 'Rumbos',
              fr: 'Allures',
              de: 'Kurse zum Wind',
              it: 'Andature',
            })}
            onPress={() => router.push('/courses')}
          />
          <ListRow
            icon="tactics"
            title={tp('Тактика гонок', 'Racing tactics', 'Taktyka wyscigow', {
              es: 'Tactica de regata',
              fr: 'Tactique de regate',
              de: 'Regatta-Taktik',
              it: 'Tattica di regata',
            })}
            onPress={() => router.push('/racing')}
            noBorder
          />
        </View>

        <Text variant="muted" style={[styles.sectionLabel, styles.sectionLabelGap]}>
          {toolsSection.toUpperCase()}
        </Text>
        <View style={styles.list}>
          <ListRow
            icon="check"
            title={tp('Чек-лист перед стартом', 'Pre-race checklist', 'Lista przed startem', {
              es: 'Lista pre-regata',
              fr: 'Checklist avant course',
              de: 'Pre-Race-Checkliste',
              it: 'Checklist pre-gara',
            })}
            onPress={() => router.push('/checklist')}
          />
          <ListRow
            icon="compass"
            title={tp('Споты: где ходить', 'Spots: where to sail', 'Spoty: gdzie plywac', {
              es: 'Spots: donde navegar',
              fr: 'Spots : ou naviguer',
              de: 'Spots: wo segeln',
              it: 'Spot: dove navigare',
            })}
            caption={tp('Карта + ветер', 'Chart + wind', 'Mapa + wiatr', {
              es: 'Carta + viento',
              fr: 'Carte + vent',
              de: 'Karte + Wind',
              it: 'Carta + vento',
            })}
            onPress={() => router.push('/spots')}
          />
          <ListRow
            icon="simulator"
            title={tp('Симулятор', 'Simulator', 'Symulator', {
              es: 'Simulador',
              fr: 'Simulateur',
              de: 'Simulator',
              it: 'Simulatore',
            })}
            onPress={() => router.push('/simulator')}
          />
          <ListRow
            icon="multiplayer"
            title={tp('Мультиплеер', 'Multiplayer', 'Multiplayer', {
              es: 'Multijugador',
              fr: 'Multijoueur',
              de: 'Mehrspieler',
              it: 'Multigiocatore',
            })}
            onPress={() => router.push('/multiplayer')}
          />
          <ListRow
            icon="leaderboard"
            title={tp('Таблица лидеров', 'Leaderboard', 'Tabela liderow', {
              es: 'Clasificacion',
              fr: 'Classement',
              de: 'Bestenliste',
              it: 'Classifica',
            })}
            onPress={() => router.push('/leaderboard')}
            noBorder
          />
        </View>

        <Text variant="muted" style={[styles.sectionLabel, styles.sectionLabelGap]}>
          {moreSection.toUpperCase()}
        </Text>
        <View style={styles.list}>
          {hasRaceHistory ? (
            <ListRow
              icon="flag"
              title={tp(
                'История гонок',
                'Race history',
                'Historia wyscigow',
                {
                  es: 'Historial de regatas',
                  fr: 'Historique des courses',
                  de: 'Rennverlauf',
                  it: 'Cronologia gare',
                },
              )}
              caption={tp(
                `${raceHistory.races.length} гонок`,
                `${raceHistory.races.length} races`,
                `${raceHistory.races.length} wyscigow`,
                {
                  es: `${raceHistory.races.length} regatas`,
                  fr: `${raceHistory.races.length} courses`,
                  de: `${raceHistory.races.length} Rennen`,
                  it: `${raceHistory.races.length} gare`,
                },
              )}
              onPress={() => router.push('/history')}
            />
          ) : null}
          <ListRow
            icon="gallery"
            title={tp('Галерея', 'Gallery', 'Galeria', {
              es: 'Galeria',
              fr: 'Galerie',
              de: 'Galerie',
              it: 'Galleria',
            })}
            onPress={() => router.push('/gallery')}
          />
          <ListRow
            icon="gear"
            title={tp('Настройки', 'Settings', 'Ustawienia', {
              es: 'Ajustes',
              fr: 'Reglages',
              de: 'Einstellungen',
              it: 'Impostazioni',
            })}
            onPress={() => router.push('/settings')}
            noBorder
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

interface DailyBannerProps {
  challenge: DailyChallenge;
  badgeLabel: string;
  titleLabel: string;
  parLabel: string;
  ctaLabel: string;
  onPress: () => void;
}

/**
 * Daily challenge surface. Cyan-tinted Card variant, matches the
 * dark-ocean signature. Includes a small "Daily" badge, course name,
 * a par-time hint when the leaderboard is populated, and a CTA that
 * routes to `/game?course=daily` (Game screen aliases that to the
 * shared "daily" course definition).
 */
function DailyBanner({
  challenge,
  badgeLabel,
  titleLabel,
  parLabel,
  ctaLabel,
  onPress,
}: DailyBannerProps) {
  const accentColor = ACCENT_COLOR.cyan;
  const topTime = challenge.top[0]?.finishTimeSec;
  return (
    <Card
      accent="cyan"
      onPress={onPress}
      style={[styles.continueCard, glow.primary]}
    >
      <View style={styles.continueRow}>
        <Icon name="bolt" size={28} color={accentColor} />
        <View style={styles.continueText}>
          <Text style={[styles.continueKicker, { color: accentColor }]}>
            {badgeLabel.toUpperCase()}
          </Text>
          <Text variant="subtitle" style={styles.continueTitle}>
            {titleLabel}
          </Text>
          {topTime ? (
            <Text variant="muted" style={styles.continueMeta}>
              {`${parLabel}: ${formatSeconds(topTime)}`}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.continueArrow, { color: accentColor }]}>→</Text>
      </View>
      <View style={styles.continueCtaRow}>
        <Text style={[styles.continueCtaLabel, { color: accentColor }]}>
          {ctaLabel}
        </Text>
      </View>
    </Card>
  );
}

function formatSeconds(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

interface ContinueRowProps {
  day: number;
  doneInDay: number;
  totalInDay: number;
  lessonTitle: string;
  kicker: string;
  ctaLabel: string;
  dayCountLabel: string;
  dayProgressLabel: string | null;
  onPress: () => void;
}

function ContinueRow({
  lessonTitle,
  kicker,
  ctaLabel,
  dayCountLabel,
  dayProgressLabel,
  onPress,
}: ContinueRowProps) {
  const accentColor = ACCENT_COLOR.cyan;
  return (
    <Card accent="cyan" onPress={onPress} style={[styles.continueCard, glow.primary]}>
      <View style={styles.continueRow}>
        <Icon name="cap" size={28} color={accentColor} />
        <View style={styles.continueText}>
          <Text style={[styles.continueKicker, { color: accentColor }]}>
            {kicker.toUpperCase()}
          </Text>
          <Text variant="subtitle" style={styles.continueTitle}>
            {lessonTitle}
          </Text>
          <Text variant="muted" style={styles.continueMeta}>
            {dayProgressLabel
              ? `${dayCountLabel}  ·  ${dayProgressLabel}`
              : dayCountLabel}
          </Text>
        </View>
        <Text style={[styles.continueArrow, { color: accentColor }]}>→</Text>
      </View>
      <View style={styles.continueCtaRow}>
        <Text style={[styles.continueCtaLabel, { color: accentColor }]}>
          {ctaLabel}
        </Text>
      </View>
    </Card>
  );
}

interface CelebrationRowProps {
  title: string;
  ctaLabel: string;
  onPress: () => void;
}

function CelebrationRow({ title, ctaLabel, onPress }: CelebrationRowProps) {
  const accentColor = ACCENT_COLOR.success;
  return (
    <Card accent="success" onPress={onPress} style={[styles.continueCard, glow.success]}>
      <View style={styles.continueRow}>
        <Icon name="flag" size={28} color={accentColor} />
        <View style={styles.continueText}>
          <Text variant="subtitle" style={styles.continueTitle}>{title}</Text>
        </View>
        <Text style={[styles.continueArrow, { color: accentColor }]}>→</Text>
      </View>
      <View style={styles.continueCtaRow}>
        <Text style={[styles.continueCtaLabel, { color: accentColor }]}>
          {ctaLabel}
        </Text>
      </View>
    </Card>
  );
}

interface EntryCardProps {
  accent: CardAccent;
  iconName: IconName;
  title: string;
  subtitle: string;
  description: string;
  ctaLabel: string;
  ctaA11yLabel: string;
  onPress: () => void;
}

function EntryCard({
  accent,
  iconName,
  title,
  subtitle,
  description,
  ctaLabel,
  ctaA11yLabel,
  onPress,
}: EntryCardProps) {
  const accentColor = ACCENT_COLOR[accent];
  return (
    <Card
      accent={accent}
      onPress={onPress}
      style={styles.entryCard}
    >
      <Icon name={iconName} size={36} color={accentColor} style={styles.entryIcon} />
      <View accessible accessibilityRole="button" accessibilityLabel={ctaA11yLabel}>
        <Text variant="subtitle" style={styles.entryTitle}>{title}</Text>
        <Text variant="muted" style={styles.entrySubtitle}>{subtitle}</Text>
      </View>
      <Text variant="caption" style={styles.entryDescription}>
        {description}
      </Text>
      <View style={styles.entryCta}>
        <Text style={[styles.entryCtaLabel, { color: accentColor }]}>
          {ctaLabel}
        </Text>
        <Text style={[styles.entryCtaArrow, { color: accentColor }]}>→</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  tagline: {
    marginTop: spacing.xs,
    textAlign: 'center',
    fontSize: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  sectionLabelGap: {
    marginTop: spacing.xl,
  },
  entryCard: {
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    gap: spacing.md,
  },
  entryIcon: {
    marginBottom: spacing.xs,
  },
  entryTitle: {
    fontSize: 18,
    marginBottom: 2,
  },
  entrySubtitle: {
    fontSize: 12,
  },
  entryDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  entryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  entryCtaLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  entryCtaArrow: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    backgroundColor: colors.bgCard,
    borderColor: 'rgba(0, 212, 255, 0.10)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  continueCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  continueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  continueText: {
    flex: 1,
  },
  continueKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  continueTitle: {
    fontSize: 16,
  },
  continueMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  continueArrow: {
    fontSize: 18,
    fontWeight: '600',
  },
  continueCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  continueCtaLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
