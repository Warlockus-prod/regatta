import { Stack, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../../src/i18n/context';
import {
  Card,
  type CardAccent,
  EmptyState,
  Icon,
  type IconName,
  Screen,
  Text,
} from '../../src/design-system/components';
import { colors, spacing } from '../../src/design-system/tokens';
import { useRecentRooms, type RecentRoom } from '../../src/persistence/recent-rooms';

const ACCENT_COLOR: Record<CardAccent, string> = {
  cyan: colors.accentCyan,
  success: colors.success,
  warning: colors.warning,
};

/**
 * Multiplayer lobby. Replaces the Phase-4 PlaceholderScreen with three
 * tinted entry cards (Host / Join / Solo) plus a "Recent rooms" list
 * pulled from `useRecentRooms`. Mirrors the Home screen's "Where to
 * start" pattern (cyan / success / warning) so the visual language is
 * consistent across primary entry points.
 *
 * The skeleton is intentionally honest about its phase: ghost boats in
 * the actual race are clearly labelled "Practice ghosts" so the user
 * never thinks they are racing real people. Real-WS sync lands in
 * Phase 4.
 */
export default function Multiplayer() {
  const { tp } = useI18n();
  const router = useRouter();
  const { rooms, ready } = useRecentRooms();

  const screenTitle = tp('Мультиплеер', 'Multiplayer', 'Multiplayer', {
    es: 'Multijugador',
    fr: 'Multijoueur',
    de: 'Mehrspieler',
    it: 'Multigiocatore',
  });

  const intro = tp(
    'Создай комнату или присоединись по 4-символьному коду. Пока соперники - тренировочные призраки; настоящая сетевая синхронизация выйдет позже.',
    'Host a room or join by a 4-character code. Opponents are practice ghosts for now; real network sync ships later.',
    'Stworz pokoj albo dolacz przez 4-znakowy kod. Na razie przeciwnicy to treningowe duchy; pelna sec dolaczy pozniej.',
    {
      es: 'Crea una sala o unete con un codigo de 4 caracteres. Por ahora los rivales son fantasmas de practica; la red real llegara despues.',
      fr: 'Cree une salle ou rejoins avec un code a 4 caracteres. Les adversaires sont des fantomes d entrainement; la synchro reseau arrive plus tard.',
      de: 'Erstelle einen Raum oder tritt mit 4-Zeichen-Code bei. Gegner sind vorerst Trainings-Geister; echte Netz-Sync folgt spaeter.',
      it: 'Crea una stanza o unisciti con un codice di 4 caratteri. Per ora gli avversari sono fantasmi di pratica; la sincro di rete arrivera dopo.',
    },
  );

  const startSection = tp('С чего начать', 'Where to start', 'Od czego zaczac', {
    es: 'Donde empezar',
    fr: 'Par ou commencer',
    de: 'Wo anfangen',
    it: 'Da dove iniziare',
  });
  const recentSection = tp('Недавние комнаты', 'Recent rooms', 'Ostatnie pokoje', {
    es: 'Salas recientes',
    fr: 'Salles recentes',
    de: 'Letzte Raeume',
    it: 'Stanze recenti',
  });

  const ctaStart = tp('Начать', 'Start', 'Start', {
    es: 'Iniciar',
    fr: 'Commencer',
    de: 'Starten',
    it: 'Inizia',
  });

  const hostTitle = tp('Создать гонку', 'Host a race', 'Stworz wyscig', {
    es: 'Crear regata',
    fr: 'Creer une course',
    de: 'Rennen erstellen',
    it: 'Crea regata',
  });
  const hostSubtitle = tp(
    'Получи 4-символьный код',
    'Get a 4-character code',
    'Otrzymaj 4-znakowy kod',
    {
      es: 'Obten un codigo de 4 caracteres',
      fr: 'Recois un code a 4 caracteres',
      de: 'Erhalte 4-Zeichen-Code',
      it: 'Ottieni un codice di 4 caratteri',
    },
  );
  const hostDescription = tp(
    'Подними комнату и поделись кодом с друзьями. Старт - когда ты готов.',
    'Spin up a room and share the code with friends. Start when you are ready.',
    'Postaw pokoj i podziel sie kodem ze znajomymi. Start, kiedy bedziesz gotowy.',
    {
      es: 'Crea una sala y comparte el codigo con amigos. Empieza cuando quieras.',
      fr: 'Lance une salle et partage le code avec tes amis. Pars quand tu veux.',
      de: 'Eroeffne einen Raum und teile den Code. Start wenn du bereit bist.',
      it: 'Apri una stanza e condividi il codice con amici. Parti quando sei pronto.',
    },
  );

  const joinTitle = tp('Присоединиться', 'Join a race', 'Dolacz do wyscigu', {
    es: 'Unirse a la regata',
    fr: 'Rejoindre une course',
    de: 'Rennen beitreten',
    it: 'Unisciti alla regata',
  });
  const joinSubtitle = tp(
    'У тебя уже есть код',
    'You already have a code',
    'Masz juz kod',
    {
      es: 'Ya tienes un codigo',
      fr: 'Tu as deja un code',
      de: 'Du hast bereits einen Code',
      it: 'Hai gia un codice',
    },
  );
  const joinDescription = tp(
    'Введи 4-символьный код, и попадёшь прямо в комнату.',
    'Enter the 4-character code and jump straight into the room.',
    'Wpisz 4-znakowy kod i wskoczsz prosto do pokoju.',
    {
      es: 'Introduce el codigo de 4 caracteres y entra directo a la sala.',
      fr: 'Entre le code a 4 caracteres et rejoins la salle directement.',
      de: '4-Zeichen-Code eingeben und sofort in den Raum springen.',
      it: 'Inserisci il codice a 4 caratteri ed entra subito nella stanza.',
    },
  );

  const soloTitle = tp('Соло-гонка', 'Solo race', 'Wyscig solo', {
    es: 'Regata en solitario',
    fr: 'Course solo',
    de: 'Solo-Rennen',
    it: 'Gara solitaria',
  });
  const soloSubtitle = tp('Один на один с курсом', 'Just you and the course', 'Tylko ty i trasa', {
    es: 'Solo tu y el recorrido',
    fr: 'Toi et le parcours',
    de: 'Du und der Kurs',
    it: 'Tu e il percorso',
  });
  const soloDescription = tp(
    'Никаких призраков, обычная одиночная гонка.',
    'No ghosts, just the regular solo race.',
    'Bez duchow, zwykly solowy wyscig.',
    {
      es: 'Sin fantasmas, regata en solitario normal.',
      fr: 'Sans fantomes, course solo classique.',
      de: 'Keine Geister, normales Solo-Rennen.',
      it: 'Senza fantasmi, normale gara solitaria.',
    },
  );

  const roleHostLabel = tp('хост', 'host', 'host', {
    es: 'host',
    fr: 'hote',
    de: 'host',
    it: 'host',
  });
  const roleJoinLabel = tp('гость', 'guest', 'gosc', {
    es: 'invitado',
    fr: 'invite',
    de: 'gast',
    it: 'ospite',
  });

  const emptyTitle = tp(
    'Здесь появятся твои недавние комнаты',
    'Your recent rooms will show here',
    'Twoje ostatnie pokoje pojawia sie tutaj',
    {
      es: 'Aqui apareceran tus salas recientes',
      fr: 'Tes salles recentes apparaitront ici',
      de: 'Deine letzten Raeume erscheinen hier',
      it: 'Le tue stanze recenti appariranno qui',
    },
  );
  const emptySubtitle = tp(
    'Создай первую гонку или присоединись по коду.',
    'Host your first race or join one with a code.',
    'Stworz pierwszy wyscig lub dolacz przez kod.',
    {
      es: 'Crea tu primera regata o unete con un codigo.',
      fr: 'Lance ta premiere course ou rejoins avec un code.',
      de: 'Erstelle dein erstes Rennen oder tritt mit Code bei.',
      it: 'Crea la tua prima regata o unisciti con un codice.',
    },
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: screenTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <Text variant="caption" style={styles.introText}>
            {intro}
          </Text>
        </View>

        <Text variant="muted" style={styles.sectionLabel}>
          {startSection.toUpperCase()}
        </Text>

        <EntryCard
          accent="cyan"
          iconName="multiplayer"
          title={hostTitle}
          subtitle={hostSubtitle}
          description={hostDescription}
          ctaLabel={ctaStart}
          ctaA11yLabel={hostTitle}
          onPress={() => router.push('/multiplayer/host')}
        />

        <EntryCard
          accent="success"
          iconName="flag"
          title={joinTitle}
          subtitle={joinSubtitle}
          description={joinDescription}
          ctaLabel={ctaStart}
          ctaA11yLabel={joinTitle}
          onPress={() => router.push('/multiplayer/join')}
        />

        <EntryCard
          accent="warning"
          iconName="bolt"
          title={soloTitle}
          subtitle={soloSubtitle}
          description={soloDescription}
          ctaLabel={ctaStart}
          ctaA11yLabel={soloTitle}
          onPress={() => router.push('/game')}
        />

        <Text variant="muted" style={[styles.sectionLabel, styles.sectionLabelGap]}>
          {recentSection.toUpperCase()}
        </Text>
        {ready && rooms.length === 0 ? (
          <EmptyState
            icon="multiplayer"
            title={emptyTitle}
            subtitle={emptySubtitle}
          />
        ) : (
          <View style={styles.list}>
            {rooms.map((room, idx) => (
              <RecentRoomRow
                key={room.code}
                room={room}
                roleHostLabel={roleHostLabel}
                roleJoinLabel={roleJoinLabel}
                onPress={() => router.push(`/multiplayer/race/${room.code}`)}
                noBorder={idx === rooms.length - 1}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
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
      accessibilityLabel={ctaA11yLabel}
    >
      <Icon name={iconName} size={36} color={accentColor} style={styles.entryIcon} />
      <Text variant="subtitle" style={styles.entryTitle}>{title}</Text>
      <Text variant="muted" style={styles.entrySubtitle}>{subtitle}</Text>
      <Text variant="caption" style={styles.entryDescription}>
        {description}
      </Text>
      <View style={styles.entryCta}>
        <Text style={[styles.entryCtaLabel, { color: accentColor }]}>{ctaLabel}</Text>
        <Text style={[styles.entryCtaArrow, { color: accentColor }]}>→</Text>
      </View>
    </Card>
  );
}

interface RecentRoomRowProps {
  room: RecentRoom;
  roleHostLabel: string;
  roleJoinLabel: string;
  onPress: () => void;
  noBorder: boolean;
}

function RecentRoomRow({
  room,
  roleHostLabel,
  roleJoinLabel,
  onPress,
  noBorder,
}: RecentRoomRowProps) {
  const role = room.role === 'host' ? roleHostLabel : roleJoinLabel;
  return (
    <Card
      onPress={onPress}
      style={[styles.recentRow, noBorder ? null : styles.recentRowBorder]}
      accessibilityLabel={`${room.code} - ${role}`}
    >
      <View style={styles.recentRowInner}>
        <View style={styles.recentTextCol}>
          <Text variant="subtitle" style={styles.recentCode}>{room.code}</Text>
          <Text variant="muted" style={styles.recentMeta}>
            {role}
          </Text>
        </View>
        <Text style={styles.recentArrow}>→</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  intro: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  introText: {
    fontSize: 13,
    lineHeight: 19,
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
    backgroundColor: 'transparent',
  },
  recentRow: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
  },
  recentRowBorder: {},
  recentRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  recentTextCol: {
    flex: 1,
  },
  recentCode: {
    fontSize: 18,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  recentMeta: {
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  recentArrow: {
    color: colors.accentCyan,
    fontSize: 18,
    fontWeight: '600',
  },
});
