import { Stack } from 'expo-router';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAnalyticsConsent } from '../src/persistence/analytics-consent';
import { useAnalyticsClient } from '../src/analytics/context';
import { useI18n } from '../src/i18n/context';
import { ENABLED_LANGUAGES } from '../src/i18n/languages';
import { Button, Card, Icon, Screen, Text, Wordmark } from '../src/design-system/components';
import { colors, radii, spacing } from '../src/design-system/tokens';
import { useRaceHistory } from '../src/persistence/race-history';
import { BOOTCAMP_PROGRESS_KEYS, useBootcampProgress } from '../src/persistence/bootcamp';
import { QUIZ_RESULTS_KEY, useBootcampQuiz } from '../src/persistence/bootcamp-quiz';
import { passedLessonIds } from '../src/bootcamp/status';
import { useChecklistProgress, itemKey } from '../src/persistence/checklist';
import { checklistSections, bootcampLessons } from '../src/data';
import {
  type DistanceUnit,
  type SpeedUnit,
  type WindSpeedUnit,
  distanceUnitLabel,
  speedUnitLabel,
  windSpeedUnitLabel,
  useUnits,
} from '../src/persistence/units';

const SUPPORT_EMAIL = 'support@gtframe.io';

/**
 * Settings screen.
 *
 * Sprint 1 shipped only the language picker.
 * Sprint 10 adds:
 *   - Units section (speed / wind speed / distance with tap-to-cycle).
 *   - Data section (race-history export + clear, bootcamp / checklist
 *     reset, and a destructive "clear everything" with two-step confirm).
 */
export default function Settings() {
  const { tp, lang, setLang } = useI18n();
  const version = Constants.expoConfig?.version ?? 'dev';
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode ??
    '?';

  const [privacyOpen, setPrivacyOpen] = useState(false);

  const title = tp('Настройки', 'Settings', 'Ustawienia', {
    es: 'Ajustes',
    fr: 'Réglages',
    de: 'Einstellungen',
    it: 'Impostazioni',
  });

  const langSectionLabel = tp('Язык', 'Language', 'Język', {
    es: 'Idioma',
    fr: 'Langue',
    de: 'Sprache',
    it: 'Lingua',
  });

  const unitsSectionLabel = tp('Единицы', 'Units', 'Jednostki', {
    es: 'Unidades',
    fr: 'Unités',
    de: 'Einheiten',
    it: 'Unità',
  });

  const aboutSectionLabel = tp('О приложении', 'About', 'O aplikacji', {
    es: 'Acerca de',
    fr: 'À propos',
    de: 'Über die App',
    it: 'Informazioni',
  });

  const versionLabel = tp('Версия', 'Version', 'Wersja', {
    es: 'Versión',
    fr: 'Version',
    de: 'Version',
    it: 'Versione',
  });

  const privacySectionLabel = tp(
    'Приватность',
    'Privacy',
    'Prywatność',
    {
      es: 'Privacidad',
      fr: 'Confidentialité',
      de: 'Datenschutz',
      it: 'Privacy',
    },
  );

  const dataSectionLabel = tp('Данные', 'Data', 'Dane', {
    es: 'Datos',
    fr: 'Données',
    de: 'Daten',
    it: 'Dati',
  });

  const privacyRowLabel = tp(
    'Политика конфиденциальности',
    'Privacy policy',
    'Polityka prywatności',
    {
      es: 'Política de privacidad',
      fr: 'Politique de confidentialité',
      de: 'Datenschutzerklärung',
      it: 'Informativa sulla privacy',
    },
  );

  const supportRowLabel = tp(
    'Поддержка',
    'Support',
    'Pomoc techniczna',
    {
      es: 'Soporte',
      fr: 'Assistance',
      de: 'Support',
      it: 'Supporto',
    },
  );

  const analyticsLabel = tp(
    'Анонимная аналитика',
    'Anonymous analytics',
    'Anonimowa analityka',
    {
      es: 'Analítica anónima',
      fr: 'Statistiques anonymes',
      de: 'Anonyme Analyse',
      it: 'Statistiche anonime',
    },
  );

  const analyticsHelp = tp(
    'Помогает улучшать приложение: просмотры экранов и события гонки, без привязки к тебе и без межсервисного трекинга. Можно выключить в любой момент.',
    'Helps improve the app: screen views and race events, not linked to you and never used for cross-app tracking. You can turn it off anytime.',
    'Pomaga ulepszać aplikację: odsłony ekranów i zdarzenia z wyścigów, bez powiązania z tobą i bez śledzenia między aplikacjami. Możesz to wyłączyć w każdej chwili.',
    {
      es: 'Ayuda a mejorar la app: pantallas vistas y eventos de regata, sin vincularlos a ti y sin rastreo entre apps. Puedes desactivarla cuando quieras.',
      fr: 'Elles aident à améliorer l\'app : écrans consultés et événements de course, sans lien avec toi ni suivi entre applications. Tu peux les désactiver à tout moment.',
      de: 'Hilft, die App zu verbessern: Bildschirmaufrufe und Rennereignisse, nicht mit dir verknüpft und ohne App-übergreifendes Tracking. Jederzeit abschaltbar.',
      it: 'Aiutano a migliorare l\'app: schermate visualizzate ed eventi di regata, senza collegamenti a te né tracciamento tra app. Puoi disattivarle quando vuoi.',
    },
  );

  const { enabled: analyticsOn, ready: analyticsReady, setEnabled: setAnalyticsOn } =
    useAnalyticsConsent();
  const analyticsClient = useAnalyticsClient();
  const toggleAnalytics = useCallback(
    (next: boolean) => {
      setAnalyticsOn(next);
      try {
        if (next) analyticsClient?.optIn();
        else analyticsClient?.optOut();
      } catch {
        /* best-effort; the stored choice is the source of truth */
      }
    },
    [analyticsClient, setAnalyticsOn],
  );

  const supportHint = tp(
    `${SUPPORT_EMAIL} - откроется твой почтовый клиент`,
    `${SUPPORT_EMAIL} - opens your mail app`,
    `${SUPPORT_EMAIL} - otworzy aplikację pocztową`,
    {
      es: `${SUPPORT_EMAIL} - abrirá tu app de correo`,
      fr: `${SUPPORT_EMAIL} - ouvre ta messagerie`,
      de: `${SUPPORT_EMAIL} - öffnet deine Mail-App`,
      it: `${SUPPORT_EMAIL} - apre la tua app di posta`,
    },
  );

  const mailErrorTitle = tp(
    'Не получилось открыть почту',
    'Could not open mail app',
    'Nie można otworzyć poczty',
    {
      es: 'No se pudo abrir el correo',
      fr: 'Impossible d\'ouvrir la messagerie',
      de: 'Mail-App lässt sich nicht öffnen',
      it: 'Impossibile aprire la posta',
    },
  );
  const mailErrorBody = tp(
    `Напиши на ${SUPPORT_EMAIL} вручную и укажи версию ${version}.`,
    `Write to ${SUPPORT_EMAIL} manually and mention version ${version}.`,
    `Wyślij e-mail na ${SUPPORT_EMAIL} i podaj wersję ${version}.`,
    {
      es: `Escribe a ${SUPPORT_EMAIL} desde tu correo e indica la versión ${version}.`,
      fr: `Écris directement à ${SUPPORT_EMAIL} en indiquant la version ${version}.`,
      de: `Schreib direkt an ${SUPPORT_EMAIL} und nenne die Version ${version}.`,
      it: `Scrivi direttamente a ${SUPPORT_EMAIL} e indica la versione ${version}.`,
    },
  );

  const openSupportMail = async () => {
    const subject = `Week to Regatta v${version} feedback`;
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        Alert.alert(mailErrorTitle, mailErrorBody);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert(mailErrorTitle, mailErrorBody);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text variant="muted" style={styles.sectionLabel}>
          {langSectionLabel.toUpperCase()}
        </Text>
        <View style={styles.langList}>
          {ENABLED_LANGUAGES.map((langMeta) => {
            const isSelected = langMeta.id === lang;
            const langA11y = tp(
              `Выбрать язык: ${langMeta.nativeName}`,
              `Select language: ${langMeta.name}`,
              `Wybierz język: ${langMeta.nativeName}`,
              {
                es: `Elegir idioma: ${langMeta.nativeName}`,
                fr: `Choisir la langue : ${langMeta.nativeName}`,
                de: `Sprache wählen: ${langMeta.nativeName}`,
                it: `Scegli la lingua: ${langMeta.nativeName}`,
              },
            );
            return (
              <Card
                key={langMeta.id}
                onPress={() => setLang(langMeta.id)}
                style={[styles.langCard, isSelected && styles.langCardSelected]}
                accessibilityRole="button"
                accessibilityLabel={langA11y}
                accessibilityState={{ selected: isSelected }}
              >
                <View style={styles.langRow}>
                  <View style={styles.langText}>
                    <Text variant="subtitle">{langMeta.nativeName}</Text>
                    <Text variant="caption">{langMeta.name}</Text>
                  </View>
                  {isSelected ? (
                    <Icon name="check" size={18} color={colors.accentCyan} />
                  ) : null}
                </View>
              </Card>
            );
          })}
        </View>

        <Text
          variant="muted"
          style={[styles.sectionLabel, styles.sectionLabelGap]}
        >
          {unitsSectionLabel.toUpperCase()}
        </Text>
        <UnitsSection />

        <Text
          variant="muted"
          style={[styles.sectionLabel, styles.sectionLabelGap]}
        >
          {aboutSectionLabel.toUpperCase()}
        </Text>
        <Card style={styles.aboutCard}>
          <Wordmark size="m" style={styles.aboutWordmark} />
          <Text variant="caption" style={styles.aboutLine}>
            {versionLabel} {version} (build {buildNumber})
          </Text>
        </Card>

        <Text
          variant="muted"
          style={[styles.sectionLabel, styles.sectionLabelGap]}
        >
          {privacySectionLabel.toUpperCase()}
        </Text>
        <View style={styles.privacyList}>
          <Card
            onPress={() => setPrivacyOpen(true)}
            style={styles.privacyCard}
            accessibilityLabel={privacyRowLabel}
          >
            <View style={styles.privacyRow}>
              <Text variant="subtitle">{privacyRowLabel}</Text>
              <Text variant="accent" style={styles.chevron}>{'>'}</Text>
            </View>
          </Card>
          <Card
            onPress={() => { void openSupportMail(); }}
            style={styles.privacyCard}
            accessibilityLabel={supportRowLabel}
          >
            <View style={styles.privacyRow}>
              <View style={styles.privacyText}>
                <Text variant="subtitle">{supportRowLabel}</Text>
                <Text variant="caption" style={styles.privacyHint}>
                  {supportHint}
                </Text>
              </View>
              <Text variant="accent" style={styles.chevron}>{'>'}</Text>
            </View>
          </Card>
          <Card style={styles.privacyCard} accessibilityLabel={analyticsLabel}>
            <View style={styles.privacyRow}>
              <View style={styles.privacyText}>
                <Text variant="subtitle">{analyticsLabel}</Text>
                <Text variant="caption" style={styles.privacyHint}>
                  {analyticsHelp}
                </Text>
              </View>
              <Switch
                value={analyticsOn}
                onValueChange={toggleAnalytics}
                disabled={!analyticsReady}
                trackColor={{ true: colors.accentCyan, false: 'rgba(18, 50, 71, 0.16)' }}
                ios_backgroundColor="rgba(18, 50, 71, 0.16)"
                thumbColor="#ffffff"
                accessibilityLabel={analyticsLabel}
              />
            </View>
          </Card>
        </View>

        <Text
          variant="muted"
          style={[styles.sectionLabel, styles.sectionLabelGap]}
        >
          {dataSectionLabel.toUpperCase()}
        </Text>
        <DataSection />

        {/* Version footer: makes "which build am I on?" answerable at a
            glance (user feedback 2026-07-08 - TestFlight testers could not
            tell an old build from a new one inside the app). */}
        <Text variant="muted" style={styles.versionFooter}>
          {`Week to Regatta ${Application.nativeApplicationVersion ?? '?'} (${Application.nativeBuildVersion ?? '?'})`}
        </Text>
      </ScrollView>
      <PrivacyModal visible={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </Screen>
  );
}

// ---------------------------------------------------------------------------
//  Units section
// ---------------------------------------------------------------------------

function UnitsSection() {
  const { tp } = useI18n();
  const {
    units,
    setSpeedUnit,
    setWindSpeedUnit,
    setDistanceUnit,
    cycleSpeed,
    cycleWindSpeed,
    cycleDistance,
  } = useUnits();

  const speedRowLabel = tp('Скорость', 'Speed', 'Prędkość', {
    es: 'Velocidad',
    fr: 'Vitesse',
    de: 'Geschwindigkeit',
    it: 'Velocità',
  });

  const windSpeedRowLabel = tp(
    'Скорость ветра',
    'Wind speed',
    'Prędkość wiatru',
    {
      es: 'Velocidad del viento',
      fr: 'Vitesse du vent',
      de: 'Windgeschwindigkeit',
      it: 'Velocità del vento',
    },
  );

  const distanceRowLabel = tp('Дистанция', 'Distance', 'Odległość', {
    es: 'Distancia',
    fr: 'Distance',
    de: 'Entfernung',
    it: 'Distanza',
  });

  const speedHint = tp(
    'Узлы по умолчанию. Тапни, чтобы переключить.',
    'Knots by default. Tap to switch.',
    'Domyślnie węzły. Stuknij, aby zmienić.',
    {
      es: 'Nudos por defecto. Toca para cambiar.',
      fr: 'Nœuds par défaut. Touche pour changer.',
      de: 'Standardmäßig Knoten. Zum Umschalten tippen.',
      it: 'Predefinito: nodi. Tocca per cambiare.',
    },
  );

  const windSpeedHint = tp(
    'Узлы, м/с или Бофорт.',
    'Knots, m/s, or Beaufort.',
    'Węzły, m/s lub skala Beauforta.',
    {
      es: 'Nudos, m/s o Beaufort.',
      fr: 'Nœuds, m/s ou Beaufort.',
      de: 'Knoten, m/s oder Beaufort.',
      it: 'Nodi, m/s o Beaufort.',
    },
  );

  const distanceHint = tp(
    'Морские мили или километры.',
    'Nautical miles or kilometres.',
    'Mile morskie lub kilometry.',
    {
      es: 'Millas náuticas o kilómetros.',
      fr: 'Milles nautiques ou kilomètres.',
      de: 'Seemeilen oder Kilometer.',
      it: 'Miglia nautiche o chilometri.',
    },
  );

  const speedFullName = (u: SpeedUnit) =>
    u === 'mps'
      ? tp('м/с', 'm/s', 'm/s', { es: 'm/s', fr: 'm/s', de: 'm/s', it: 'm/s' })
      : tp('узлы', 'knots', 'węzły', {
          es: 'nudos',
          fr: 'nœuds',
          de: 'Knoten',
          it: 'nodi',
        });

  const windSpeedFullName = (u: WindSpeedUnit) => {
    if (u === 'mps') {
      return tp('м/с', 'm/s', 'm/s', { es: 'm/s', fr: 'm/s', de: 'm/s', it: 'm/s' });
    }
    if (u === 'beaufort') {
      return tp('Бофорт', 'Beaufort', 'skala Beauforta', {
        es: 'Beaufort',
        fr: 'Beaufort',
        de: 'Beaufort',
        it: 'Beaufort',
      });
    }
    return tp('узлы', 'knots', 'węzły', {
      es: 'nudos',
      fr: 'nœuds',
      de: 'Knoten',
      it: 'nodi',
    });
  };

  const distanceFullName = (u: DistanceUnit) =>
    u === 'km'
      ? tp('км', 'km', 'km', { es: 'km', fr: 'km', de: 'km', it: 'km' })
      : tp('мор. мили', 'nautical miles', 'mile morskie', {
          es: 'millas náuticas',
          fr: 'milles nautiques',
          de: 'Seemeilen',
          it: 'miglia nautiche',
        });

  const cycleA11y = (rowLabel: string, currentValue: string) =>
    tp(
      `${rowLabel}: ${currentValue}. Тап - переключить.`,
      `${rowLabel}: ${currentValue}. Tap to cycle.`,
      `${rowLabel}: ${currentValue}. Stuknij, aby zmienić.`,
      {
        es: `${rowLabel}: ${currentValue}. Toca para cambiar.`,
        fr: `${rowLabel} : ${currentValue}. Touche pour changer.`,
        de: `${rowLabel}: ${currentValue}. Zum Wechseln tippen.`,
        it: `${rowLabel}: ${currentValue}. Tocca per cambiare.`,
      },
    );

  // Long-press lets power users open a system Alert with named options
  // (full-name labels). Tap is the fast path (cycle), long-press is the
  // discoverable path. Both end in the same persistent state.
  const longPressTitle = tp('Выбрать единицу', 'Pick a unit', 'Wybierz jednostkę', {
    es: 'Elige una unidad',
    fr: 'Choisir une unité',
    de: 'Einheit wählen',
    it: 'Scegli l\'unità',
  });
  const cancelLabel = tp('Отмена', 'Cancel', 'Anuluj', {
    es: 'Cancelar',
    fr: 'Annuler',
    de: 'Abbrechen',
    it: 'Annulla',
  });

  const promptSpeed = useCallback(() => {
    Alert.alert(longPressTitle, speedRowLabel, [
      { text: speedFullName('kt'), onPress: () => setSpeedUnit('kt') },
      { text: speedFullName('mps'), onPress: () => setSpeedUnit('mps') },
      { text: cancelLabel, style: 'cancel' },
    ]);
  }, [longPressTitle, speedRowLabel, speedFullName, cancelLabel, setSpeedUnit]);

  const promptWindSpeed = useCallback(() => {
    Alert.alert(longPressTitle, windSpeedRowLabel, [
      { text: windSpeedFullName('kt'), onPress: () => setWindSpeedUnit('kt') },
      { text: windSpeedFullName('mps'), onPress: () => setWindSpeedUnit('mps') },
      { text: windSpeedFullName('beaufort'), onPress: () => setWindSpeedUnit('beaufort') },
      { text: cancelLabel, style: 'cancel' },
    ]);
  }, [
    longPressTitle,
    windSpeedRowLabel,
    windSpeedFullName,
    cancelLabel,
    setWindSpeedUnit,
  ]);

  const promptDistance = useCallback(() => {
    Alert.alert(longPressTitle, distanceRowLabel, [
      { text: distanceFullName('nm'), onPress: () => setDistanceUnit('nm') },
      { text: distanceFullName('km'), onPress: () => setDistanceUnit('km') },
      { text: cancelLabel, style: 'cancel' },
    ]);
  }, [
    longPressTitle,
    distanceRowLabel,
    distanceFullName,
    cancelLabel,
    setDistanceUnit,
  ]);

  return (
    <View style={styles.privacyList}>
      <UnitRow
        label={speedRowLabel}
        hint={speedHint}
        chip={speedUnitLabel(units.speed)}
        a11y={cycleA11y(speedRowLabel, speedFullName(units.speed))}
        onPress={cycleSpeed}
        onLongPress={promptSpeed}
      />
      <UnitRow
        label={windSpeedRowLabel}
        hint={windSpeedHint}
        chip={windSpeedUnitLabel(units.windSpeed)}
        a11y={cycleA11y(windSpeedRowLabel, windSpeedFullName(units.windSpeed))}
        onPress={cycleWindSpeed}
        onLongPress={promptWindSpeed}
      />
      <UnitRow
        label={distanceRowLabel}
        hint={distanceHint}
        chip={distanceUnitLabel(units.distance)}
        a11y={cycleA11y(distanceRowLabel, distanceFullName(units.distance))}
        onPress={cycleDistance}
        onLongPress={promptDistance}
      />
    </View>
  );
}

interface UnitRowProps {
  label: string;
  hint: string;
  chip: string;
  a11y: string;
  onPress: () => void;
  onLongPress: () => void;
}

function UnitRow({ label, hint, chip, a11y, onPress, onLongPress }: UnitRowProps) {
  return (
    <Card
      onPress={onPress}
      style={styles.privacyCard}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="button"
        accessibilityLabel={a11y}
      >
        <View style={styles.privacyRow}>
          <View style={styles.privacyText}>
            <Text variant="subtitle">{label}</Text>
            <Text variant="caption" style={styles.privacyHint}>{hint}</Text>
          </View>
          <View style={styles.unitChip}>
            <Text variant="accent" style={styles.unitChipLabel}>{chip}</Text>
          </View>
        </View>
      </Pressable>
    </Card>
  );
}

// ---------------------------------------------------------------------------
//  Data section
// ---------------------------------------------------------------------------

function DataSection() {
  const { tp } = useI18n();
  const { races, ready: racesReady, clear: clearRaces } = useRaceHistory();
  const {
    completedIds: bootcampViewed,
    doneIds: bootcampMarked,
    lastViewedLessonId,
    ready: bootcampProgressReady,
  } = useBootcampProgress();
  const { results: quizResults, ready: quizReady } = useBootcampQuiz();
  const bootcampReady = bootcampProgressReady && quizReady;
  const {
    checkedIds: checklistChecked,
    ready: checklistReady,
    reset: resetChecklist,
  } = useChecklistProgress();

  const racesCount = races.length;
  const totalLessons = bootcampLessons.length;
  // Passed with evidence (quiz passed, or marked done where there is no quiz);
  // merely opened lessons do not count. See src/bootcamp/status.ts.
  const lessonsDone = passedLessonIds({
    viewedIds: bootcampViewed,
    doneIds: bootcampMarked,
    quizResults,
    lastViewedLessonId,
  }).size;
  const totalChecklistItems = useMemo(
    () =>
      checklistSections.reduce((acc, sec) => {
        const items =
          ((sec as { itemsEn?: unknown }).itemsEn as unknown[] | undefined) ?? [];
        return acc + items.length;
      }, 0),
    [],
  );
  const checklistCount = checklistChecked.size;

  // ----- labels -----

  const cancelLabel = tp('Отмена', 'Cancel', 'Anuluj', {
    es: 'Cancelar',
    fr: 'Annuler',
    de: 'Abbrechen',
    it: 'Annulla',
  });

  const racesRowLabel = tp(
    'История гонок',
    'Race history',
    'Historia wyścigów',
    {
      es: 'Historial de regatas',
      fr: 'Historique des courses',
      de: 'Rennverlauf',
      it: 'Storico delle regate',
    },
  );

  const racesCountLabel = tp(
    `Сохранено гонок: ${racesCount}`,
    `${racesCount} ${racesCount === 1 ? 'race' : 'races'} saved`,
    `Zapisane wyścigi: ${racesCount}`,
    {
      es: `Regatas guardadas: ${racesCount}`,
      fr: `Courses enregistrées : ${racesCount}`,
      de: `Gespeicherte Rennen: ${racesCount}`,
      it: `Regate salvate: ${racesCount}`,
    },
  );

  const exportLabel = tp('Экспорт', 'Export', 'Eksportuj', {
    es: 'Exportar',
    fr: 'Exporter',
    de: 'Exportieren',
    it: 'Esporta',
  });

  const clearLabel = tp('Очистить', 'Clear', 'Wyczyść', {
    es: 'Borrar',
    fr: 'Effacer',
    de: 'Löschen',
    it: 'Cancella',
  });

  const clearRacesConfirmTitle = tp(
    'Удалить историю гонок?',
    'Clear race history?',
    'Usunąć historię wyścigów?',
    {
      es: '¿Borrar el historial de regatas?',
      fr: 'Effacer l\'historique des courses ?',
      de: 'Rennverlauf löschen?',
      it: 'Cancellare lo storico delle regate?',
    },
  );

  const clearRacesConfirmBody = tp(
    `Будут удалены все сохраненные гонки (${racesCount}). Это нельзя отменить.`,
    `All saved races (${racesCount}) will be deleted. This cannot be undone.`,
    `Wszystkie zapisane wyścigi (${racesCount}) zostaną usunięte. Tego nie da się cofnąć.`,
    {
      es: `Se borrarán todas las regatas guardadas (${racesCount}). No se puede deshacer.`,
      fr: `Toutes les courses enregistrées (${racesCount}) seront supprimées. C'est irréversible.`,
      de: `Alle gespeicherten Rennen (${racesCount}) werden gelöscht. Das lässt sich nicht rückgängig machen.`,
      it: `Tutte le regate salvate (${racesCount}) verranno eliminate. Non si può annullare.`,
    },
  );

  const exportEmptyTitle = tp(
    'Пока нечего экспортировать',
    'Nothing to export yet',
    'Na razie nie ma czego eksportować',
    {
      es: 'Aún no hay nada que exportar',
      fr: 'Rien à exporter pour l\'instant',
      de: 'Noch nichts zu exportieren',
      it: 'Ancora niente da esportare',
    },
  );

  const exportEmptyBody = tp(
    'Сначала закончи хотя бы одну гонку.',
    'Finish at least one race first.',
    'Najpierw ukończ przynajmniej jeden wyścig.',
    {
      es: 'Termina al menos una regata primero.',
      fr: 'Termine d\'abord au moins une course.',
      de: 'Beende zuerst mindestens ein Rennen.',
      it: 'Completa prima almeno una regata.',
    },
  );

  const okLabel = tp('OK', 'OK', 'OK', { es: 'OK', fr: 'OK', de: 'OK', it: 'OK' });

  const exportFailTitle = tp(
    'Не удалось экспортировать',
    'Export failed',
    'Eksport się nie udał',
    {
      es: 'Error al exportar',
      fr: 'Échec de l\'exportation',
      de: 'Export fehlgeschlagen',
      it: 'Esportazione non riuscita',
    },
  );

  const exportFailBody = tp(
    'Поделиться не получилось. Попробуй позже.',
    'Could not share the file. Try again later.',
    'Nie udało się udostępnić pliku. Spróbuj później.',
    {
      es: 'No se pudo compartir el archivo. Inténtalo más tarde.',
      fr: 'Impossible de partager le fichier. Réessaie plus tard.',
      de: 'Teilen fehlgeschlagen. Versuch es später noch einmal.',
      it: 'Condivisione non riuscita. Riprova più tardi.',
    },
  );

  const handleExport = async () => {
    if (racesCount === 0) {
      Alert.alert(exportEmptyTitle, exportEmptyBody, [{ text: okLabel }]);
      return;
    }
    const payload = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      app: 'Week to Regatta',
      version: Constants.expoConfig?.version ?? 'dev',
      races,
    };
    try {
      await Share.share({
        title: 'Week to Regatta race history',
        message: JSON.stringify(payload, null, 2),
      });
    } catch {
      Alert.alert(exportFailTitle, exportFailBody, [{ text: okLabel }]);
    }
  };

  const handleClearRaces = () => {
    if (racesCount === 0) {
      return;
    }
    Alert.alert(clearRacesConfirmTitle, clearRacesConfirmBody, [
      { text: cancelLabel, style: 'cancel' },
      {
        text: clearLabel,
        style: 'destructive',
        onPress: () => { void clearRaces(); },
      },
    ]);
  };

  // ----- bootcamp -----

  const bootcampRowLabel = tp(
    'Прогресс Bootcamp',
    'Bootcamp progress',
    'Postęp w Bootcampie',
    {
      es: 'Progreso del Bootcamp',
      fr: 'Progression du Bootcamp',
      de: 'Bootcamp-Fortschritt',
      it: 'Progressi del Bootcamp',
    },
  );

  const bootcampCountLabel = tp(
    `${lessonsDone} из ${totalLessons} уроков`,
    `${lessonsDone} of ${totalLessons} lessons complete`,
    `${lessonsDone} z ${totalLessons} lekcji`,
    {
      es: `${lessonsDone} de ${totalLessons} lecciones`,
      fr: `${lessonsDone} sur ${totalLessons} leçons`,
      de: `${lessonsDone} von ${totalLessons} Lektionen`,
      it: `${lessonsDone} su ${totalLessons} lezioni`,
    },
  );

  const resetProgressLabel = tp('Сбросить прогресс', 'Reset progress', 'Zresetuj postęp', {
    es: 'Reiniciar progreso',
    fr: 'Réinitialiser',
    de: 'Fortschritt zurücksetzen',
    it: 'Azzera i progressi',
  });

  const resetBootcampConfirmTitle = tp(
    'Сбросить Bootcamp?',
    'Reset Bootcamp?',
    'Zresetować Bootcamp?',
    {
      es: '¿Reiniciar el Bootcamp?',
      fr: 'Réinitialiser le Bootcamp ?',
      de: 'Bootcamp zurücksetzen?',
      it: 'Azzerare il Bootcamp?',
    },
  );

  const resetBootcampConfirmBody = tp(
    'Все отметки уроков будут стерты.',
    'All lesson completion ticks will be cleared.',
    'Wszystkie oznaczenia ukończonych lekcji znikną.',
    {
      es: 'Se borrarán todas las marcas de lecciones completadas.',
      fr: 'Toutes les coches des leçons terminées seront effacées.',
      de: 'Alle Häkchen bei den Lektionen werden gelöscht.',
      it: 'Tutte le spunte delle lezioni verranno cancellate.',
    },
  );

  const handleResetBootcamp = () => {
    Alert.alert(resetBootcampConfirmTitle, resetBootcampConfirmBody, [
      { text: cancelLabel, style: 'cancel' },
      {
        text: resetProgressLabel,
        style: 'destructive',
        onPress: () => {
          // The hook does not expose a reset; clear the storage rows
          // directly. The next mount will re-hydrate as empty.
          void AsyncStorage.multiRemove([...BOOTCAMP_PROGRESS_KEYS, QUIZ_RESULTS_KEY]);
        },
      },
    ]);
  };

  // ----- checklist -----

  const checklistRowLabel = tp(
    'Прогресс чек-листа',
    'Checklist progress',
    'Postęp checklisty',
    {
      es: 'Progreso de la lista',
      fr: 'Progression de la liste',
      de: 'Checklisten-Fortschritt',
      it: 'Progressi della checklist',
    },
  );

  const checklistCountLabel = tp(
    `${checklistCount} из ${totalChecklistItems} пунктов`,
    `${checklistCount} of ${totalChecklistItems} items checked`,
    `${checklistCount} z ${totalChecklistItems} pozycji`,
    {
      es: `${checklistCount} de ${totalChecklistItems} puntos`,
      fr: `${checklistCount} sur ${totalChecklistItems} points`,
      de: `${checklistCount} von ${totalChecklistItems} Punkten`,
      it: `${checklistCount} su ${totalChecklistItems} voci`,
    },
  );

  const resetChecklistConfirmTitle = tp(
    'Сбросить чек-лист?',
    'Reset checklist?',
    'Zresetować checklistę?',
    {
      es: '¿Reiniciar la lista?',
      fr: 'Réinitialiser la liste ?',
      de: 'Checkliste zurücksetzen?',
      it: 'Azzerare la checklist?',
    },
  );

  const resetChecklistConfirmBody = tp(
    'Все отметки удалятся, текст останется.',
    'All ticks will be cleared. The content stays.',
    'Wszystkie zaznaczenia znikną, a treść zostanie.',
    {
      es: 'Se borrarán todas las marcas. El contenido se mantiene.',
      fr: 'Toutes les coches seront effacées. Le contenu reste.',
      de: 'Alle Häkchen werden gelöscht. Der Inhalt bleibt.',
      it: 'Tutte le spunte verranno cancellate. Il testo resta.',
    },
  );

  // touch the helper so unused-import lint stays clean for downstream
  void itemKey;

  const resetLabel = tp('Сбросить', 'Reset', 'Zresetuj', {
    es: 'Reiniciar',
    fr: 'Réinitialiser',
    de: 'Zurücksetzen',
    it: 'Azzera',
  });

  const handleResetChecklist = () => {
    Alert.alert(resetChecklistConfirmTitle, resetChecklistConfirmBody, [
      { text: cancelLabel, style: 'cancel' },
      {
        text: resetLabel,
        style: 'destructive',
        onPress: () => { resetChecklist(); },
      },
    ]);
  };

  // ----- clear-all -----

  const clearAllLabel = tp(
    'Очистить все данные',
    'Clear all data',
    'Wyczyść wszystkie dane',
    {
      es: 'Borrar todos los datos',
      fr: 'Effacer toutes les données',
      de: 'Alle Daten löschen',
      it: 'Cancella tutti i dati',
    },
  );

  const clearAllHint = tp(
    'Сотрет язык, прогресс, единицы и историю.',
    'Wipes language, progress, units, and history.',
    'Usuwa język, postęp, jednostki i historię.',
    {
      es: 'Borra idioma, progreso, unidades e historial.',
      fr: 'Supprime la langue, la progression, les unités et l\'historique.',
      de: 'Löscht Sprache, Fortschritt, Einheiten und Verlauf.',
      it: 'Cancella lingua, progressi, unità e storico.',
    },
  );

  const clearAllStep1Title = tp(
    'Удалить все данные?',
    'Clear all data?',
    'Usunąć wszystkie dane?',
    {
      es: '¿Borrar todos los datos?',
      fr: 'Effacer toutes les données ?',
      de: 'Alle Daten löschen?',
      it: 'Cancellare tutti i dati?',
    },
  );

  const clearAllStep1Body = tp(
    'Будут стерты прогресс, история гонок, единицы измерения и язык.',
    'Will erase progress, race history, unit preferences, and language.',
    'Zostaną usunięte: postęp, historia wyścigów, jednostki i język.',
    {
      es: 'Se borrarán el progreso, el historial de regatas, las unidades y el idioma.',
      fr: 'La progression, l\'historique des courses, les unités et la langue seront effacés.',
      de: 'Fortschritt, Rennverlauf, Einheiten und Sprache werden gelöscht.',
      it: 'Verranno cancellati progressi, storico delle regate, unità e lingua.',
    },
  );

  const continueLabel = tp('Продолжить', 'Continue', 'Kontynuuj', {
    es: 'Continuar',
    fr: 'Continuer',
    de: 'Weiter',
    it: 'Continua',
  });

  const clearAllStep2Title = tp(
    'Это нельзя отменить',
    'This cannot be undone',
    'Tego nie da się cofnąć',
    {
      es: 'Esto no se puede deshacer',
      fr: 'Cette action est irréversible',
      de: 'Das lässt sich nicht rückgängig machen',
      it: 'Non si può annullare',
    },
  );

  const clearAllStep2Body = tp(
    'Тапни «Удалить все», чтобы подтвердить.',
    'Tap "Delete all" to confirm.',
    'Stuknij "Usuń wszystko", aby potwierdzić.',
    {
      es: 'Toca "Borrar todo" para confirmar.',
      fr: 'Touche "Tout effacer" pour confirmer.',
      de: 'Tippe auf "Alles löschen", um zu bestätigen.',
      it: 'Tocca "Elimina tutto" per confermare.',
    },
  );

  const deleteAllLabel = tp('Удалить все', 'Delete all', 'Usuń wszystko', {
    es: 'Borrar todo',
    fr: 'Tout effacer',
    de: 'Alles löschen',
    it: 'Elimina tutto',
  });

  const clearAllDoneTitle = tp('Готово', 'Done', 'Gotowe', {
    es: 'Listo',
    fr: 'Terminé',
    de: 'Fertig',
    it: 'Fatto',
  });

  const clearAllDoneBody = tp(
    'Все локальные данные приложения удалены.',
    'All local app data has been removed.',
    'Wszystkie lokalne dane aplikacji zostały usunięte.',
    {
      es: 'Se eliminaron todos los datos locales de la app.',
      fr: 'Toutes les données locales de l\'app ont été supprimées.',
      de: 'Alle lokalen App-Daten wurden entfernt.',
      it: 'Tutti i dati locali dell\'app sono stati rimossi.',
    },
  );

  const handleClearAll = () => {
    Alert.alert(clearAllStep1Title, clearAllStep1Body, [
      { text: cancelLabel, style: 'cancel' },
      {
        text: continueLabel,
        onPress: () => {
          Alert.alert(clearAllStep2Title, clearAllStep2Body, [
            { text: cancelLabel, style: 'cancel' },
            {
              text: deleteAllLabel,
              style: 'destructive',
              onPress: () => { void wipeAllRegattaKeys(clearAllDoneTitle, clearAllDoneBody, okLabel); },
            },
          ]);
        },
      },
    ]);
  };

  return (
    <View style={styles.privacyList}>
      <Card style={styles.privacyCard} accessibilityLabel={racesRowLabel}>
        <View style={styles.dataHeader}>
          <View style={styles.privacyText}>
            <Text variant="subtitle">{racesRowLabel}</Text>
            <Text variant="caption" style={styles.privacyHint}>
              {racesReady ? racesCountLabel : '...'}
            </Text>
          </View>
        </View>
        <View style={styles.dataActions}>
          <View style={styles.dataActionHalf}>
            <Button
              onPress={() => { void handleExport(); }}
              variant="secondary"
              disabled={!racesReady || racesCount === 0}
            >
              {exportLabel}
            </Button>
          </View>
          <View style={styles.dataActionHalf}>
            <Button
              onPress={handleClearRaces}
              variant="ghost"
              disabled={!racesReady || racesCount === 0}
            >
              {clearLabel}
            </Button>
          </View>
        </View>
      </Card>

      <Card style={styles.privacyCard} accessibilityLabel={bootcampRowLabel}>
        <View style={styles.dataHeader}>
          <View style={styles.privacyText}>
            <Text variant="subtitle">{bootcampRowLabel}</Text>
            <Text variant="caption" style={styles.privacyHint}>
              {bootcampReady ? bootcampCountLabel : '...'}
            </Text>
          </View>
        </View>
        <View style={styles.dataActions}>
          <Button
            onPress={handleResetBootcamp}
            variant="ghost"
            disabled={!bootcampReady || (lessonsDone === 0 && bootcampViewed.size === 0 && Object.keys(quizResults).length === 0)}
          >
            {resetProgressLabel}
          </Button>
        </View>
      </Card>

      <Card style={styles.privacyCard} accessibilityLabel={checklistRowLabel}>
        <View style={styles.dataHeader}>
          <View style={styles.privacyText}>
            <Text variant="subtitle">{checklistRowLabel}</Text>
            <Text variant="caption" style={styles.privacyHint}>
              {checklistReady ? checklistCountLabel : '...'}
            </Text>
          </View>
        </View>
        <View style={styles.dataActions}>
          <Button
            onPress={handleResetChecklist}
            variant="ghost"
            disabled={!checklistReady || checklistCount === 0}
          >
            {resetLabel}
          </Button>
        </View>
      </Card>

      <Card
        style={[styles.privacyCard, styles.dangerCard]}
        accessibilityLabel={clearAllLabel}
      >
        <View style={styles.dataHeader}>
          <View style={styles.privacyText}>
            <Text variant="subtitle" style={styles.dangerLabel}>
              {clearAllLabel}
            </Text>
            <Text variant="caption" style={styles.privacyHint}>
              {clearAllHint}
            </Text>
          </View>
        </View>
        <View style={styles.dataActions}>
          <Button onPress={handleClearAll} variant="ghost">
            {clearAllLabel}
          </Button>
        </View>
      </Card>
    </View>
  );
}

/**
 * Removes every AsyncStorage key with the `regatta.` prefix. Best-effort:
 * any individual key that fails to remove is ignored so a single bad row
 * does not abort the wipe.
 */
async function wipeAllRegattaKeys(
  doneTitle: string,
  doneBody: string,
  okLabel: string,
): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => typeof k === 'string' && k.startsWith('regatta.'));
    if (ours.length > 0) {
      await AsyncStorage.multiRemove(ours);
    }
  } catch {
    /* ignore - best effort */
  }
  Alert.alert(doneTitle, doneBody, [{ text: okLabel }]);
}

// ---------------------------------------------------------------------------
//  Privacy modal (unchanged from sprint 1)
// ---------------------------------------------------------------------------

interface PrivacyModalProps {
  visible: boolean;
  onClose: () => void;
}

function PrivacyModal({ visible, onClose }: PrivacyModalProps) {
  const { tp } = useI18n();

  const heading = tp(
    'Политика конфиденциальности',
    'Privacy policy',
    'Polityka prywatności',
    {
      es: 'Política de privacidad',
      fr: 'Politique de confidentialité',
      de: 'Datenschutzerklärung',
      it: 'Informativa sulla privacy',
    },
  );

  const closeLabel = tp('Закрыть', 'Close', 'Zamknij', {
    es: 'Cerrar',
    fr: 'Fermer',
    de: 'Schließen',
    it: 'Chiudi',
  });

  const intro = tp(
    'Week to Regatta уважает твою приватность. Приложение не отслеживает тебя между сервисами и не собирает данные, которые тебя идентифицируют.',
    'Week to Regatta respects your privacy. The app does not track you across services and does not collect data that identifies you personally.',
    'Week to Regatta szanuje twoją prywatność. Aplikacja nie śledzi cię między usługami i nie zbiera danych, które pozwalają cię zidentyfikować.',
    {
      es: 'Week to Regatta respeta tu privacidad. La app no te rastrea entre servicios y no recopila datos que te identifiquen personalmente.',
      fr: 'Week to Regatta respecte ta vie privée. L\'application ne te suit pas d\'un service à l\'autre et ne collecte aucune donnée permettant de t\'identifier.',
      de: 'Week to Regatta respektiert deine Privatsphäre. Die App verfolgt dich nicht über Dienste hinweg und sammelt keine Daten, die dich persönlich identifizieren.',
      it: 'Week to Regatta rispetta la tua privacy. L\'app non ti traccia tra servizi diversi e non raccoglie dati che possano identificarti.',
    },
  );

  // Honest disclosure of the anonymous PostHog product analytics that the app
  // actually ships (key in app.json -> analyticsEnabled true). Matches the
  // ASC App Privacy label "Data Collected: Analytics / Product Interaction,
  // not linked to identity, not used for tracking" and NSPrivacyTracking=false.
  const noAnalytics = tp(
    'Приложение отправляет анонимную продуктовую аналитику в PostHog: просмотры экранов и ключевые события (например, старт и финиш гонки), помеченные языком и версией приложения. Эти данные не привязаны к твоей личности и никогда не используются для межсервисного трекинга.',
    'The app sends anonymous product analytics to PostHog: screen views and key events (such as race start and finish), tagged with your app language and version. This data is not linked to your identity and is never used for cross-app tracking.',
    'Aplikacja wysyła anonimowe dane analityczne do PostHog: odsłony ekranów i kluczowe zdarzenia (np. start i metę wyścigu), oznaczone językiem i wersją aplikacji. Te dane nie są powiązane z twoją tożsamością i nigdy nie służą do śledzenia między aplikacjami.',
    {
      es: 'La app envía analítica de producto anónima a PostHog: pantallas vistas y eventos clave (como la salida y la llegada de una regata), etiquetados con el idioma y la versión de la app. Estos datos no se vinculan a tu identidad y nunca se usan para rastrearte entre apps.',
      fr: 'L\'application envoie des statistiques d\'usage anonymes à PostHog : écrans consultés et événements clés (comme le départ et l\'arrivée d\'une course), associés à la langue et à la version de l\'app. Ces données ne sont pas liées à ton identité et ne servent jamais au suivi entre applications.',
      de: 'Die App sendet anonyme Produktanalysen an PostHog: Bildschirmaufrufe und wichtige Ereignisse (z. B. Start und Zieldurchgang eines Rennens), versehen mit App-Sprache und -Version. Diese Daten sind nicht mit deiner Identität verknüpft und werden nie für App-übergreifendes Tracking verwendet.',
      it: 'L\'app invia statistiche d\'uso anonime a PostHog: schermate visualizzate ed eventi chiave (come partenza e arrivo di una regata), contrassegnati con la lingua e la versione dell\'app. Questi dati non sono collegati alla tua identità e non vengono mai usati per il tracciamento tra app.',
    },
  );

  const localOnly = tp(
    'Прогресс по урокам и язык интерфейса хранятся только локально на твоем устройстве (AsyncStorage). Ты можешь очистить их в любой момент через системные настройки приложения.',
    'Lesson progress and your language preference live only locally on your device (AsyncStorage). You can clear them anytime via the system app settings.',
    'Postępy w lekcjach i wybrany język są zapisane wyłącznie lokalnie na twoim urządzeniu (AsyncStorage). Możesz je usunąć w dowolnej chwili w ustawieniach systemowych aplikacji.',
    {
      es: 'El progreso de las lecciones y el idioma de la interfaz se guardan solo en tu dispositivo (AsyncStorage). Puedes borrarlos cuando quieras desde los ajustes del sistema.',
      fr: 'La progression des leçons et la langue de l\'interface sont stockées uniquement sur ton appareil (AsyncStorage). Tu peux les effacer à tout moment dans les réglages système de l\'app.',
      de: 'Lernfortschritt und Spracheinstellung werden ausschließlich lokal auf deinem Gerät gespeichert (AsyncStorage). Du kannst sie jederzeit über die Systemeinstellungen der App löschen.',
      it: 'I progressi delle lezioni e la lingua dell\'interfaccia restano solo in locale sul tuo dispositivo (AsyncStorage). Puoi cancellarli in qualsiasi momento dalle impostazioni di sistema dell\'app.',
    },
  );

  const network = tp(
    'Изображения и видео в галерее загружаются из сети с weektoregatta.com. Сервер не получает идентификаторов и не строит профиль пользователя.',
    'Images and videos in the gallery load from weektoregatta.com over the network. The server does not receive identifiers and does not build a user profile.',
    'Zdjęcia i filmy w galerii ładują się z sieci, z weektoregatta.com. Serwer nie otrzymuje żadnych identyfikatorów i nie tworzy profilu użytkownika.',
    {
      es: 'Las imágenes y los videos de la galería se cargan desde weektoregatta.com. El servidor no recibe identificadores ni crea un perfil de usuario.',
      fr: 'Les images et vidéos de la galerie sont chargées depuis weektoregatta.com. Le serveur ne reçoit aucun identifiant et ne crée pas de profil utilisateur.',
      de: 'Bilder und Videos in der Galerie werden über das Netz von weektoregatta.com geladen. Der Server erhält keine Kennungen und legt kein Nutzerprofil an.',
      it: 'Immagini e video della galleria vengono caricati da weektoregatta.com. Il server non riceve identificatori e non crea un profilo utente.',
    },
  );

  const webNote = tp(
    'У сайта weektoregatta.com есть собственный раздел приватности. Мобильное приложение использует те же базовые принципы.',
    'The website weektoregatta.com has its own privacy section. The mobile app uses the same baseline.',
    'Strona weektoregatta.com ma własną sekcję o prywatności. Aplikacja mobilna stosuje te same zasady.',
    {
      es: 'El sitio weektoregatta.com tiene su propia sección de privacidad. La app móvil sigue los mismos principios.',
      fr: 'Le site weektoregatta.com a sa propre section confidentialité. L\'application mobile applique les mêmes principes.',
      de: 'Die Website weektoregatta.com hat einen eigenen Datenschutzbereich. Die mobile App folgt denselben Grundsätzen.',
      it: 'Il sito weektoregatta.com ha una propria sezione sulla privacy. L\'app mobile segue gli stessi principi.',
    },
  );

  const contact = tp(
    `Вопросы по приватности: ${SUPPORT_EMAIL}.`,
    `Privacy questions: ${SUPPORT_EMAIL}.`,
    `Pytania o prywatność: ${SUPPORT_EMAIL}.`,
    {
      es: `Preguntas sobre privacidad: ${SUPPORT_EMAIL}.`,
      fr: `Questions sur la confidentialité : ${SUPPORT_EMAIL}.`,
      de: `Datenschutzfragen: ${SUPPORT_EMAIL}.`,
      it: `Domande sulla privacy: ${SUPPORT_EMAIL}.`,
    },
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      transparent
      statusBarTranslucent
    >
      <View style={privacyStyles.backdrop}>
        <View style={privacyStyles.sheet}>
          <View style={privacyStyles.header}>
            <Text variant="title">{heading}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              style={({ pressed }) => [
                privacyStyles.closeBtn,
                pressed && privacyStyles.closePressed,
              ]}
            >
              <Text variant="accent">{closeLabel}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={privacyStyles.body}>
            <Text variant="body" style={privacyStyles.para}>{intro}</Text>
            <Text variant="body" style={privacyStyles.para}>{noAnalytics}</Text>
            <Text variant="body" style={privacyStyles.para}>{localOnly}</Text>
            <Text variant="body" style={privacyStyles.para}>{network}</Text>
            <Text variant="body" style={privacyStyles.para}>{webNote}</Text>
            <Text variant="caption" style={privacyStyles.contact}>{contact}</Text>
          </ScrollView>
          <View style={privacyStyles.footer}>
            <Button onPress={onClose} variant="secondary">{closeLabel}</Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  versionFooter: {
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    fontSize: 12,
    opacity: 0.7,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionLabelGap: {
    marginTop: spacing.xl,
  },
  langList: {
    gap: spacing.sm,
  },
  aboutCard: {
    paddingVertical: spacing.md,
  },
  aboutWordmark: {
    marginBottom: 4,
  },
  aboutLine: {
    marginTop: 2,
  },
  langCard: {
    paddingVertical: spacing.md,
  },
  langCardSelected: {
    borderColor: colors.accentCyan,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  langText: {
    flex: 1,
  },
  check: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  privacyList: {
    gap: spacing.sm,
  },
  privacyCard: {
    paddingVertical: spacing.md,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  privacyText: {
    flex: 1,
    paddingRight: spacing.md,
  },
  privacyHint: {
    marginTop: 2,
  },
  chevron: {
    fontSize: 18,
    fontWeight: '700',
  },
  unitChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceCyanFaint,
    borderWidth: 1,
    borderColor: colors.borderCyanSoft,
  },
  unitChipLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  dataHeader: {
    marginBottom: spacing.sm,
  },
  dataActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dataActionHalf: {
    flex: 1,
  },
  dangerCard: {
    borderColor: 'rgba(179, 38, 30, 0.35)',
    marginTop: spacing.md,
  },
  dangerLabel: {
    color: colors.danger,
  },
});

const privacyStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 50, 71, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgSecondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: colors.borderCyanFaint,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  closeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  closePressed: {
    opacity: 0.7,
  },
  body: {
    paddingBottom: spacing.lg,
  },
  para: {
    marginBottom: spacing.md,
  },
  contact: {
    marginTop: spacing.sm,
  },
  footer: {
    marginTop: spacing.sm,
  },
});
