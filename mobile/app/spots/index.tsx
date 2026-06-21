import { Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useI18n } from '../../src/i18n/context';
import {
  Button,
  Card,
  Icon,
  Screen,
  Text,
} from '../../src/design-system/components';
import { colors, radii, spacing } from '../../src/design-system/tokens';
import { fetchWeatherNow, type WeatherNow } from '../../src/api/weather';

/**
 * Spots / where to sail. Mobile half of Phase 4 (charts) in
 * docs/design/live-weather/DESIGN.md, mirroring the web `/spots` page
 * (`src/app/spots/page.tsx`).
 *
 * Six well-known European sailing venues. For the selected venue we show:
 *   - the live wind/wave/current snapshot from the existing `/api/weather`
 *     endpoint (read-only, reuses `fetchWeatherNow`, same as WindNowCard),
 *   - a primary button that opens the FREE OpenSeaMap nautical chart in the
 *     device browser.
 *
 * Deliberate constraints (per the task + privacy posture in WindNowCard):
 *   - NO geolocation: the user picks a preset spot, the app never asks for a
 *     Location permission.
 *   - NO WebView / map library: the chart opens in the external browser via
 *     `Linking.openURL`, so the bundle stays tiny.
 *
 * This is a teaching / planning aid, not navigation - the footer says so and
 * carries the required OpenSeaMap + Open-Meteo attribution.
 */

interface Spot {
  /** Display name (a proper noun, kept as-is in every language). */
  name: string;
  lat: number;
  lon: number;
  /** Country code, localized to a country label at render time. */
  cc: 'es' | 'gb' | 'fr' | 'pl';
}

// Same six venues as web (`src/app/spots/page.tsx`). First is the default.
const SPOTS: readonly Spot[] = [
  { name: 'Palma', lat: 39.57, lon: 2.65, cc: 'es' },
  { name: 'Tarifa', lat: 36.01, lon: -5.6, cc: 'es' },
  { name: 'Cowes', lat: 50.76, lon: -1.3, cc: 'gb' },
  { name: 'Hyeres', lat: 43.07, lon: 6.15, cc: 'fr' },
  { name: 'Sopot', lat: 54.45, lon: 18.57, cc: 'pl' },
  { name: 'Valencia', lat: 39.46, lon: -0.33, cc: 'es' },
] as const;

const FALLBACK_ATTRIBUTION = 'Weather data by Open-Meteo.com (CC BY 4.0).';

/**
 * OpenSeaMap chart URL. The `layers` mask turns on the seamark overlay on
 * top of the base map; mlat/mlon drop a marker on the venue. Identical to
 * the web `chartUrl()` so both clients open the same view.
 */
function chartUrl(spot: Spot): string {
  return (
    `https://map.openseamap.org/?zoom=12` +
    `&lat=${spot.lat}&lon=${spot.lon}` +
    `&mlat=${spot.lat}&mlon=${spot.lon}` +
    `&layers=BFTFFFTFFTF0`
  );
}

/** 8-point cardinal reads cleaner than 16-point for a teaching readout. */
const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

function cardinal(dirDeg: number): string {
  const normalized = ((dirDeg % 360) + 360) % 360;
  return CARDINALS[Math.round(normalized / 45) % 8];
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ok'; data: WeatherNow }
  | { status: 'error' };

export default function Spots() {
  const { tp } = useI18n();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  // Track the in-flight request's index so a slow earlier response can't
  // overwrite a newer selection (last-tap-wins).
  const requestIndexRef = useRef(0);

  const spot = SPOTS[selectedIndex];

  const load = useCallback(async (index: number) => {
    requestIndexRef.current = index;
    setState({ status: 'loading' });
    const target = SPOTS[index];
    const res = await fetchWeatherNow(target.lat, target.lon);
    // Ignore responses for a spot the user has since navigated away from.
    if (requestIndexRef.current !== index) return;
    if (res.ok && res.data) {
      setState({ status: 'ok', data: res.data });
    } else {
      setState({ status: 'error' });
    }
  }, []);

  // One fetch of the default spot on mount; another on each chip tap.
  useEffect(() => {
    void load(0);
  }, [load]);

  const onSelect = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      void load(index);
    },
    [load],
  );

  const headerTitle = tp(
    'Споты: где ходить',
    'Spots: where to sail',
    'Spoty: gdzie plywac',
    {
      es: 'Spots: donde navegar',
      fr: 'Spots : ou naviguer',
      de: 'Spots: wo segeln',
      it: 'Spot: dove navigare',
    },
  );

  const intro = tp(
    'Известные парусные точки: морская карта и ветер прямо сейчас. Прикинь, какой это будет курс, когда поедешь.',
    'Well-known sailing venues: a nautical chart and the wind right now. Work out what point of sail it will be when you go.',
    'Znane miejscowki zeglarskie: mapa morska i wiatr teraz. Ustal, jaki to bedzie kurs, gdy poplyniesz.',
    {
      es: 'Lugares conocidos para navegar: una carta nautica y el viento ahora mismo. Deduce que rumbo sera cuando vayas.',
      fr: 'Spots de voile connus : une carte marine et le vent en ce moment. Deduis quelle allure ce sera quand tu iras.',
      de: 'Bekannte Segelreviere: eine Seekarte und der Wind genau jetzt. Bestimme, welcher Kurs es sein wird, wenn du faehrst.',
      it: 'Localita veliche note: una carta nautica e il vento in questo momento. Deduci che andatura sara quando andrai.',
    },
  );

  const unitKn = tp('уз', 'kn', 'w', { es: 'kn', fr: 'nd', de: 'kn', it: 'kn' });

  const fromLabel = tp('от', 'from', 'z', {
    es: 'desde',
    fr: 'de',
    de: 'aus',
    it: 'da',
  });

  const gustLabel = tp('Порывы', 'Gusts', 'Porywy', {
    es: 'Rachas',
    fr: 'Rafales',
    de: 'Boeen',
    it: 'Raffiche',
  });

  const waveLabel = tp('Волна', 'Waves', 'Fale', {
    es: 'Olas',
    fr: 'Vagues',
    de: 'Wellen',
    it: 'Onde',
  });

  const currentLabel = tp('Течение', 'Current', 'Prad', {
    es: 'Corriente',
    fr: 'Courant',
    de: 'Stroemung',
    it: 'Corrente',
  });

  const loadingLabel = tp(
    'Загружаю ветер...',
    'Loading wind...',
    'Laduje wiatr...',
    {
      es: 'Cargando viento...',
      fr: 'Chargement du vent...',
      de: 'Wind laedt...',
      it: 'Caricamento vento...',
    },
  );

  const errorLabel = tp(
    'Не удалось получить погоду.',
    'Could not fetch the weather.',
    'Nie udalo sie pobrac pogody.',
    {
      es: 'No se pudo obtener el clima.',
      fr: 'Impossible de recuperer la meteo.',
      de: 'Wetter konnte nicht geladen werden.',
      it: 'Impossibile ottenere il meteo.',
    },
  );

  const retryLabel = tp('Повторить', 'Retry', 'Ponow', {
    es: 'Reintentar',
    fr: 'Reessayer',
    de: 'Erneut',
    it: 'Riprova',
  });

  const openChartLabel = tp(
    'Открыть морскую карту (OpenSeaMap)',
    'Open nautical chart (OpenSeaMap)',
    'Otworz mape morska (OpenSeaMap)',
    {
      es: 'Abrir carta nautica (OpenSeaMap)',
      fr: 'Ouvrir la carte marine (OpenSeaMap)',
      de: 'Seekarte oeffnen (OpenSeaMap)',
      it: 'Apri carta nautica (OpenSeaMap)',
    },
  );

  const openErrorTitle = tp(
    'Не удалось открыть карту',
    'Could not open the chart',
    'Nie udalo sie otworzyc mapy',
    {
      es: 'No se pudo abrir la carta',
      fr: 'Impossible d\'ouvrir la carte',
      de: 'Karte konnte nicht geoeffnet werden',
      it: 'Impossibile aprire la carta',
    },
  );

  const openErrorBody = tp(
    'Не получилось открыть браузер. Проверь соединение и попробуй снова.',
    'Could not open a browser. Check your connection and try again.',
    'Nie udalo sie otworzyc przegladarki. Sprawdz internet i sprobuj ponownie.',
    {
      es: 'No se pudo abrir el navegador. Comprueba la conexion e intenta de nuevo.',
      fr: 'Impossible d\'ouvrir un navigateur. Verifiez la connexion et reessayez.',
      de: 'Browser konnte nicht geoeffnet werden. Verbindung pruefen und erneut versuchen.',
      it: 'Impossibile aprire un browser. Controlla la connessione e riprova.',
    },
  );

  const disclaimer = tp(
    'Для тренировки, не для навигации.',
    'For training, not for navigation.',
    'Do treningu, nie do nawigacji.',
    {
      es: 'Para entrenamiento, no para navegacion.',
      fr: 'Pour l\'entrainement, pas pour la navigation.',
      de: 'Zum Training, nicht zur Navigation.',
      it: 'Per allenamento, non per navigazione.',
    },
  );

  const attributionLine = tp(
    'Карта: OpenSeaMap / участники OpenStreetMap. Погода: Open-Meteo.com (CC BY 4.0).',
    'Chart: OpenSeaMap / OpenStreetMap contributors. Weather: Open-Meteo.com (CC BY 4.0).',
    'Mapa: OpenSeaMap / wspoltworcy OpenStreetMap. Pogoda: Open-Meteo.com (CC BY 4.0).',
    {
      es: 'Carta: OpenSeaMap / colaboradores de OpenStreetMap. Clima: Open-Meteo.com (CC BY 4.0).',
      fr: 'Carte : OpenSeaMap / contributeurs OpenStreetMap. Meteo : Open-Meteo.com (CC BY 4.0).',
      de: 'Karte: OpenSeaMap / OpenStreetMap-Mitwirkende. Wetter: Open-Meteo.com (CC BY 4.0).',
      it: 'Carta: OpenSeaMap / contributori OpenStreetMap. Meteo: Open-Meteo.com (CC BY 4.0).',
    },
  );

  const countryLabel = (cc: Spot['cc']): string => {
    switch (cc) {
      case 'es':
        return tp('Испания', 'Spain', 'Hiszpania', {
          es: 'Espana',
          fr: 'Espagne',
          de: 'Spanien',
          it: 'Spagna',
        });
      case 'gb':
        return tp('Великобритания', 'United Kingdom', 'Wielka Brytania', {
          es: 'Reino Unido',
          fr: 'Royaume-Uni',
          de: 'Vereinigtes Koenigreich',
          it: 'Regno Unito',
        });
      case 'fr':
        return tp('Франция', 'France', 'Francja', {
          es: 'Francia',
          fr: 'France',
          de: 'Frankreich',
          it: 'Francia',
        });
      case 'pl':
        return tp('Польша', 'Poland', 'Polska', {
          es: 'Polonia',
          fr: 'Pologne',
          de: 'Polen',
          it: 'Polonia',
        });
    }
  };

  const onOpenChart = useCallback(async () => {
    const url = chartUrl(spot);
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        Alert.alert(openErrorTitle, openErrorBody);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(openErrorTitle, openErrorBody);
    }
  }, [spot, openErrorTitle, openErrorBody]);

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <Text variant="caption" style={styles.introText}>{intro}</Text>
        </View>

        {/* Spot selector chips */}
        <View style={styles.chipsRow}>
          {SPOTS.map((s, i) => {
            const active = i === selectedIndex;
            return (
              <Pressable
                key={s.name}
                onPress={() => onSelect(i)}
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
                  {s.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Selected spot: live weather + chart link */}
        <Card style={styles.card}>
          <View style={styles.spotHeader}>
            <Text variant="subtitle" style={styles.spotName}>{spot.name}</Text>
            <Text variant="muted" style={styles.spotCountry}>
              {countryLabel(spot.cc)}
            </Text>
          </View>
          <Text variant="muted" style={styles.coords}>
            {`${spot.lat.toFixed(2)}, ${spot.lon.toFixed(2)}`}
          </Text>

          <View style={styles.weatherBody}>
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
                  onPress={() => onSelect(selectedIndex)}
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
                fromLabel={fromLabel}
                gustLabel={gustLabel}
                waveLabel={waveLabel}
                currentLabel={currentLabel}
              />
            ) : null}
          </View>

          <View style={styles.chartBtn}>
            <Button
              variant="primary"
              onPress={onOpenChart}
              accessibilityLabel={openChartLabel}
            >
              {openChartLabel}
            </Button>
          </View>
        </Card>

        {/* Footer: disclaimer + attribution */}
        <View style={styles.footer}>
          <Text variant="muted" style={styles.footerStrong}>{disclaimer}</Text>
          <Text variant="muted" style={styles.footerText}>
            {state.status === 'ok'
              ? state.data.attribution || attributionLine
              : attributionLine}
          </Text>
          <Text variant="muted" style={styles.footerFallback}>
            {FALLBACK_ATTRIBUTION}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

interface WindReadoutProps {
  data: WeatherNow;
  unitKn: string;
  fromLabel: string;
  gustLabel: string;
  waveLabel: string;
  currentLabel: string;
}

function WindReadout({
  data,
  unitKn,
  fromLabel,
  gustLabel,
  waveLabel,
  currentLabel,
}: WindReadoutProps) {
  const speed = Math.round(data.wind.speedKn);
  const dirDeg = Math.round(data.wind.dirDeg);
  return (
    <View>
      <View style={styles.windRow}>
        <Icon name="wind" size={28} color={colors.windColor} />
        <View style={styles.windText}>
          <View style={styles.speedRow}>
            <Text style={styles.speedValue}>{`${speed}`}</Text>
            <Text style={styles.speedUnit}>{` ${unitKn}`}</Text>
          </View>
          <Text variant="muted" style={styles.dirText}>
            {`${fromLabel} ${cardinal(data.wind.dirDeg)} (${dirDeg}deg)`}
          </Text>
        </View>
      </View>

      <View style={styles.metaGrid}>
        {data.wind.gustKn != null ? (
          <View style={styles.metaItem}>
            <Text variant="muted" style={styles.metaLabel}>{gustLabel}</Text>
            <Text style={styles.metaValue}>
              {`${Math.round(data.wind.gustKn)} ${unitKn}`}
            </Text>
          </View>
        ) : null}

        {data.wave != null ? (
          <View style={styles.metaItem}>
            <Text variant="muted" style={styles.metaLabel}>{waveLabel}</Text>
            <Text style={styles.metaValue}>
              {`${data.wave.heightM.toFixed(1)} m / ${Math.round(
                data.wave.periodS,
              )} s`}
            </Text>
          </View>
        ) : null}

        {data.current != null ? (
          <View style={styles.metaItem}>
            <Text variant="muted" style={styles.metaLabel}>{currentLabel}</Text>
            <Text style={styles.metaValue}>
              {`${data.current.setKn.toFixed(1)} ${unitKn} ${cardinal(
                data.current.dirDeg,
              )}`}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xxl,
  },
  intro: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  introText: {
    lineHeight: 20,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
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
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  spotHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  spotName: {
    fontSize: 18,
  },
  spotCountry: {
    fontSize: 12,
  },
  coords: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  weatherBody: {
    minHeight: 64,
    justifyContent: 'center',
    marginTop: spacing.sm,
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
    color: colors.warning,
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
  windRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  windText: {
    flex: 1,
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
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
    fontSize: 13,
    marginTop: 2,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  metaItem: {
    minWidth: 80,
  },
  metaLabel: {
    fontSize: 11,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 2,
  },
  chartBtn: {
    marginTop: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  footerStrong: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
  },
  footerFallback: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
  },
});
