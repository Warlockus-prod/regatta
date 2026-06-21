import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Card } from './Card';
import { Text } from './Text';
import { Icon } from './Icon';
import { colors, radii, spacing } from '../tokens';
import { useI18n } from '../../i18n/context';
import { fetchWeatherNow, type WeatherNow } from '../../api/weather';

/**
 * Live wind-now card for the home screen.
 *
 * Reads a single real wind/wave snapshot from the existing web
 * `/api/weather` endpoint for one of a few preset sailing venues. There is
 * deliberately NO geolocation: the app must not add a Location permission
 * (it would change the App Store privacy disclosure), so the user picks a
 * spot from a chip row instead. The default spot is fetched once on mount;
 * tapping a chip fetches that spot.
 *
 * This is a teaching widget, not navigation - the footer says so and shows
 * the required Open-Meteo attribution from the response.
 */

interface Spot {
  /** Stable key for selection + chip rendering. */
  key: string;
  /** Display name (same in all locales - these are place names). */
  label: string;
  lat: number;
  lon: number;
}

// Preset venues only (no geolocation). Well-known sailing spots spread
// across the brand's core regions so the card has variety on first open.
const SPOTS: readonly Spot[] = [
  { key: 'palma', label: 'Palma', lat: 39.57, lon: 2.65 },
  { key: 'tarifa', label: 'Tarifa', lat: 36.01, lon: -5.6 },
  { key: 'cowes', label: 'Cowes', lat: 50.76, lon: -1.3 },
  { key: 'hyeres', label: 'Hyeres', lat: 43.07, lon: 6.15 },
] as const;

const FALLBACK_ATTRIBUTION = 'Weather data by Open-Meteo.com (CC BY 4.0).';

type LoadState =
  | { status: 'loading' }
  | { status: 'ok'; data: WeatherNow }
  | { status: 'error' };

/** 16-point would be overkill for a teaching card; 8-point cardinal reads cleaner. */
const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

function toCardinal(dirDeg: number): string {
  // Normalise into [0, 360) then bucket into 45-degree sectors centred on
  // each cardinal (N spans 337.5-22.5, etc).
  const normalized = ((dirDeg % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return CARDINALS[index];
}

export function WindNowCard() {
  const { tp } = useI18n();
  const [selectedKey, setSelectedKey] = useState<string>(SPOTS[0].key);
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  // Track the in-flight request's spot so a slow earlier response can't
  // overwrite a newer selection (last-tap-wins).
  const requestKeyRef = useRef<string>(SPOTS[0].key);

  const load = useCallback(async (spot: Spot) => {
    requestKeyRef.current = spot.key;
    setState({ status: 'loading' });
    const res = await fetchWeatherNow(spot.lat, spot.lon);
    // Ignore responses for a spot the user has since navigated away from.
    if (requestKeyRef.current !== spot.key) return;
    if (res.ok && res.data) {
      setState({ status: 'ok', data: res.data });
    } else {
      setState({ status: 'error' });
    }
  }, []);

  // Single fetch on mount of the default spot. The server caches per cell
  // for ~15 min, so this is one cheap call.
  useEffect(() => {
    void load(SPOTS[0]);
  }, [load]);

  const onSelect = useCallback(
    (spot: Spot) => {
      setSelectedKey(spot.key);
      void load(spot);
    },
    [load],
  );

  const selectedSpot =
    SPOTS.find((s) => s.key === selectedKey) ?? SPOTS[0];

  const title = tp('Ветер сейчас', 'Wind now', 'Wiatr teraz', {
    es: 'Viento ahora',
    fr: 'Vent maintenant',
    de: 'Wind jetzt',
    it: 'Vento ora',
  });

  const unitKn = tp('уз', 'kn', 'w', {
    es: 'kn',
    fr: 'nd',
    de: 'kn',
    it: 'kn',
  });

  const gustLabel = tp('порывы', 'gusts', 'porywy', {
    es: 'rachas',
    fr: 'rafales',
    de: 'Boeen',
    it: 'raffiche',
  });

  const waveLabel = tp('волны', 'waves', 'fale', {
    es: 'olas',
    fr: 'vagues',
    de: 'Wellen',
    it: 'onde',
  });

  const currentLabel = tp('течение', 'current', 'prad', {
    es: 'corriente',
    fr: 'courant',
    de: 'Stroemung',
    it: 'corrente',
  });

  const loadingLabel = tp('Загрузка...', 'Loading...', 'Ladowanie...', {
    es: 'Cargando...',
    fr: 'Chargement...',
    de: 'Laden...',
    it: 'Caricamento...',
  });

  const errorLabel = tp(
    'Не удалось загрузить ветер.',
    'Could not load wind.',
    'Nie udalo sie pobrac wiatru.',
    {
      es: 'No se pudo cargar el viento.',
      fr: 'Impossible de charger le vent.',
      de: 'Wind konnte nicht geladen werden.',
      it: 'Impossibile caricare il vento.',
    },
  );

  const retryLabel = tp('Повторить', 'Retry', 'Ponow', {
    es: 'Reintentar',
    fr: 'Reessayer',
    de: 'Erneut',
    it: 'Riprova',
  });

  const disclaimer = tp(
    'Для тренировки, не для навигации.',
    'For training, not for navigation.',
    'Do treningu, nie do nawigacji.',
    {
      es: 'Para entrenar, no para navegar.',
      fr: "Pour l'entrainement, pas pour la navigation.",
      de: 'Zum Training, nicht zur Navigation.',
      it: "Per l'allenamento, non per la navigazione.",
    },
  );

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <Icon name="wind" size={22} color={colors.windColor} />
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.chipsRow}>
        {SPOTS.map((spot) => {
          const active = spot.key === selectedKey;
          return (
            <Pressable
              key={spot.key}
              onPress={() => onSelect(spot)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && !active && styles.chipPressed,
              ]}
            >
              <Text
                style={[styles.chipLabel, active && styles.chipLabelActive]}
              >
                {spot.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.body}>
        {state.status === 'loading' ? (
          <View style={styles.centerRow}>
            <ActivityIndicator color={colors.accentCyan} />
            <Text variant="muted" style={styles.loadingText}>
              {loadingLabel}
            </Text>
          </View>
        ) : null}

        {state.status === 'error' ? (
          <View>
            <Text variant="caption" style={styles.errorText}>
              {errorLabel}
            </Text>
            <Pressable
              onPress={() => onSelect(selectedSpot)}
              accessibilityRole="button"
              accessibilityLabel={retryLabel}
              style={({ pressed }) => [
                styles.retryBtn,
                pressed && styles.retryBtnPressed,
              ]}
            >
              <Text style={styles.retryLabel}>{retryLabel}</Text>
            </Pressable>
          </View>
        ) : null}

        {state.status === 'ok' ? (
          <WindReadout
            data={state.data}
            unitKn={unitKn}
            gustLabel={gustLabel}
            waveLabel={waveLabel}
            currentLabel={currentLabel}
          />
        ) : null}
      </View>

      <Text variant="muted" style={styles.footer}>
        {`${disclaimer} ${
          state.status === 'ok'
            ? state.data.attribution || FALLBACK_ATTRIBUTION
            : FALLBACK_ATTRIBUTION
        }`}
      </Text>
    </Card>
  );
}

interface WindReadoutProps {
  data: WeatherNow;
  unitKn: string;
  gustLabel: string;
  waveLabel: string;
  currentLabel: string;
}

function WindReadout({ data, unitKn, gustLabel, waveLabel, currentLabel }: WindReadoutProps) {
  const speed = Math.round(data.wind.speedKn);
  const dirDeg = Math.round(data.wind.dirDeg);
  const cardinal = toCardinal(data.wind.dirDeg);
  return (
    <View>
      <View style={styles.readoutRow}>
        <Text style={styles.speedValue}>{`${speed}`}</Text>
        <Text style={styles.speedUnit}>{` ${unitKn}`}</Text>
        <Text style={styles.dirText}>{`  ${cardinal} (${dirDeg}deg)`}</Text>
      </View>
      {data.wind.gustKn != null ? (
        <Text variant="caption" style={styles.metaText}>
          {`${gustLabel}: ${Math.round(data.wind.gustKn)} ${unitKn}`}
        </Text>
      ) : null}
      {data.wave != null ? (
        <Text variant="caption" style={styles.metaText}>
          {`${waveLabel}: ${data.wave.heightM.toFixed(1)} m / ${Math.round(
            data.wave.periodS,
          )} s`}
        </Text>
      ) : null}
      {data.current != null ? (
        <Text variant="caption" style={styles.metaText}>
          {`${currentLabel}: ${data.current.setKn.toFixed(1)} ${unitKn} -> ${toCardinal(
            data.current.dirDeg,
          )}`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderCyanFaint,
    backgroundColor: colors.bgSecondary,
  },
  chipActive: {
    borderColor: colors.borderCyanStrong,
    backgroundColor: colors.surfaceCyanSoft,
  },
  chipPressed: {
    backgroundColor: colors.bgCardHover,
  },
  chipLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  chipLabelActive: {
    color: colors.accentCyan,
    fontWeight: '600',
  },
  body: {
    minHeight: 44,
    justifyContent: 'center',
  },
  centerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 13,
  },
  errorText: {
    marginBottom: spacing.sm,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderCyanSoft,
    backgroundColor: colors.bgCard,
  },
  retryBtnPressed: {
    backgroundColor: colors.bgCardHover,
  },
  retryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accentCyan,
  },
  readoutRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  speedValue: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  speedUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dirText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.windColor,
  },
  metaText: {
    marginTop: spacing.xs,
  },
  footer: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
  },
});
