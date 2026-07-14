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
import { useBootcampProgress } from '../src/persistence/bootcamp';
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
    fr: 'Reglages',
    de: 'Einstellungen',
    it: 'Impostazioni',
  });

  const langSectionLabel = tp('Язык', 'Language', 'Jezyk', {
    es: 'Idioma',
    fr: 'Langue',
    de: 'Sprache',
    it: 'Lingua',
  });

  const unitsSectionLabel = tp('Единицы', 'Units', 'Jednostki', {
    es: 'Unidades',
    fr: 'Unites',
    de: 'Einheiten',
    it: 'Unita',
  });

  const aboutSectionLabel = tp('О приложении', 'About', 'O aplikacji', {
    es: 'Acerca de',
    fr: 'A propos',
    de: 'Uber die App',
    it: 'Informazioni',
  });

  const versionLabel = tp('Версия', 'Version', 'Wersja', {
    es: 'Version',
    fr: 'Version',
    de: 'Version',
    it: 'Versione',
  });

  const privacySectionLabel = tp(
    'Приватность',
    'Privacy',
    'Prywatnosc',
    {
      es: 'Privacidad',
      fr: 'Confidentialite',
      de: 'Datenschutz',
      it: 'Privacy',
    },
  );

  const dataSectionLabel = tp('Данные', 'Data', 'Dane', {
    es: 'Datos',
    fr: 'Donnees',
    de: 'Daten',
    it: 'Dati',
  });

  const privacyRowLabel = tp(
    'Политика конфиденциальности',
    'Privacy policy',
    'Polityka prywatnosci',
    {
      es: 'Politica de privacidad',
      fr: 'Politique de confidentialite',
      de: 'Datenschutzerklaerung',
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
      es: 'Analitica anonima',
      fr: 'Analyse anonyme',
      de: 'Anonyme Analyse',
      it: 'Analisi anonima',
    },
  );

  const analyticsHelp = tp(
    'Помогает улучшать приложение: просмотры экранов и события гонки, без привязки к вам и без межсервисного трекинга. Можно выключить в любой момент.',
    'Helps improve the app: screen views and race events, not linked to you and never used for cross-app tracking. You can turn it off anytime.',
    'Pomaga ulepszac aplikacje: odslony ekranow i zdarzenia wyscigu, bez powiazania z Toba i bez sledzenia miedzy aplikacjami. Mozesz to wylaczyc w kazdej chwili.',
    {
      es: 'Ayuda a mejorar la app: vistas de pantalla y eventos de regata, sin vincularse a ti ni rastreo entre apps. Puedes desactivarlo cuando quieras.',
      fr: 'Aide a ameliorer l\'app : vues d\'ecran et evenements de course, sans lien avec vous ni suivi entre applications. Vous pouvez le desactiver a tout moment.',
      de: 'Hilft, die App zu verbessern: Bildschirmaufrufe und Rennereignisse, nicht mit Ihnen verknuepft und kein App-uebergreifendes Tracking. Jederzeit abschaltbar.',
      it: 'Aiuta a migliorare l\'app: visualizzazioni delle schermate ed eventi di gara, senza legami con te ne tracciamento tra app. Puoi disattivarlo quando vuoi.',
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
    `${SUPPORT_EMAIL} - откроется ваш почтовый клиент`,
    `${SUPPORT_EMAIL} - opens your mail app`,
    `${SUPPORT_EMAIL} - otworzy aplikacje pocztowa`,
    {
      es: `${SUPPORT_EMAIL} - abrira tu cliente de correo`,
      fr: `${SUPPORT_EMAIL} - ouvrira votre messagerie`,
      de: `${SUPPORT_EMAIL} - oeffnet Ihre Mail-App`,
      it: `${SUPPORT_EMAIL} - aprira il tuo client email`,
    },
  );

  const mailErrorTitle = tp(
    'Не получилось открыть почту',
    'Could not open mail app',
    'Nie mozna otworzyc poczty',
    {
      es: 'No se pudo abrir el correo',
      fr: 'Impossible douvrir la messagerie',
      de: 'Mail-App liess sich nicht oeffnen',
      it: 'Impossibile aprire la posta',
    },
  );
  const mailErrorBody = tp(
    `Напишите на ${SUPPORT_EMAIL} вручную - укажите версию ${version}.`,
    `Write to ${SUPPORT_EMAIL} manually and mention version ${version}.`,
    `Napisz recznie na ${SUPPORT_EMAIL} i podaj wersje ${version}.`,
    {
      es: `Escribe manualmente a ${SUPPORT_EMAIL} e indica la version ${version}.`,
      fr: `Ecrivez manuellement a ${SUPPORT_EMAIL} en mentionnant la version ${version}.`,
      de: `Schreiben Sie an ${SUPPORT_EMAIL} und nennen Sie die Version ${version}.`,
      it: `Scrivi manualmente a ${SUPPORT_EMAIL} e indica la versione ${version}.`,
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
              `Wybierz jezyk: ${langMeta.nativeName}`,
              {
                es: `Elegir idioma: ${langMeta.nativeName}`,
                fr: `Choisir la langue : ${langMeta.nativeName}`,
                de: `Sprache waehlen: ${langMeta.nativeName}`,
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
                trackColor={{ true: colors.accentCyan, false: colors.bgCardHover }}
                thumbColor={colors.textPrimary}
                ios_backgroundColor={colors.bgCardHover}
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

  const speedRowLabel = tp('Скорость', 'Speed', 'Predkosc', {
    es: 'Velocidad',
    fr: 'Vitesse',
    de: 'Geschwindigkeit',
    it: 'Velocita',
  });

  const windSpeedRowLabel = tp(
    'Скорость ветра',
    'Wind speed',
    'Predkosc wiatru',
    {
      es: 'Velocidad del viento',
      fr: 'Vitesse du vent',
      de: 'Windgeschwindigkeit',
      it: 'Velocita del vento',
    },
  );

  const distanceRowLabel = tp('Дистанция', 'Distance', 'Dystans', {
    es: 'Distancia',
    fr: 'Distance',
    de: 'Distanz',
    it: 'Distanza',
  });

  const speedHint = tp(
    'Узлы по умолчанию. Тапни чтобы переключить.',
    'Knots by default. Tap to switch.',
    'Wezly domyslnie. Stuknij aby zmienic.',
    {
      es: 'Nudos por defecto. Toca para cambiar.',
      fr: 'Noeuds par defaut. Touchez pour changer.',
      de: 'Knoten Standard. Tippen zum Umschalten.',
      it: 'Nodi predefiniti. Tocca per cambiare.',
    },
  );

  const windSpeedHint = tp(
    'Узлы, м/с или Бофорт.',
    'Knots, m/s, or Beaufort.',
    'Wezly, m/s lub Beauforta.',
    {
      es: 'Nudos, m/s o Beaufort.',
      fr: 'Noeuds, m/s ou Beaufort.',
      de: 'Knoten, m/s oder Beaufort.',
      it: 'Nodi, m/s o Beaufort.',
    },
  );

  const distanceHint = tp(
    'Морские мили или километры.',
    'Nautical miles or kilometres.',
    'Mile morskie lub kilometry.',
    {
      es: 'Millas nauticas o kilometros.',
      fr: 'Milles nautiques ou kilometres.',
      de: 'Seemeilen oder Kilometer.',
      it: 'Miglia nautiche o chilometri.',
    },
  );

  const speedFullName = (u: SpeedUnit) =>
    u === 'mps'
      ? tp('м/с', 'm/s', 'm/s', { es: 'm/s', fr: 'm/s', de: 'm/s', it: 'm/s' })
      : tp('узлы', 'knots', 'wezly', {
          es: 'nudos',
          fr: 'noeuds',
          de: 'Knoten',
          it: 'nodi',
        });

  const windSpeedFullName = (u: WindSpeedUnit) => {
    if (u === 'mps') {
      return tp('м/с', 'm/s', 'm/s', { es: 'm/s', fr: 'm/s', de: 'm/s', it: 'm/s' });
    }
    if (u === 'beaufort') {
      return tp('Бофорт', 'Beaufort', 'Beauforta', {
        es: 'Beaufort',
        fr: 'Beaufort',
        de: 'Beaufort',
        it: 'Beaufort',
      });
    }
    return tp('узлы', 'knots', 'wezly', {
      es: 'nudos',
      fr: 'noeuds',
      de: 'Knoten',
      it: 'nodi',
    });
  };

  const distanceFullName = (u: DistanceUnit) =>
    u === 'km'
      ? tp('км', 'km', 'km', { es: 'km', fr: 'km', de: 'km', it: 'km' })
      : tp('мор. мили', 'nautical miles', 'mile morskie', {
          es: 'millas nauticas',
          fr: 'milles nautiques',
          de: 'Seemeilen',
          it: 'miglia nautiche',
        });

  const cycleA11y = (rowLabel: string, currentValue: string) =>
    tp(
      `${rowLabel}: ${currentValue}. Тап - переключить.`,
      `${rowLabel}: ${currentValue}. Tap to cycle.`,
      `${rowLabel}: ${currentValue}. Stuknij aby zmienic.`,
      {
        es: `${rowLabel}: ${currentValue}. Toca para cambiar.`,
        fr: `${rowLabel}: ${currentValue}. Touchez pour changer.`,
        de: `${rowLabel}: ${currentValue}. Tippen zum Wechseln.`,
        it: `${rowLabel}: ${currentValue}. Tocca per cambiare.`,
      },
    );

  // Long-press lets power users open a system Alert with named options
  // (full-name labels). Tap is the fast path (cycle), long-press is the
  // discoverable path. Both end in the same persistent state.
  const longPressTitle = tp('Выбрать единицу', 'Pick a unit', 'Wybierz jednostke', {
    es: 'Elige una unidad',
    fr: 'Choisir une unite',
    de: 'Einheit waehlen',
    it: 'Scegli unita',
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
    completedIds: bootcampDone,
    ready: bootcampReady,
  } = useBootcampProgress();
  const {
    checkedIds: checklistChecked,
    ready: checklistReady,
    reset: resetChecklist,
  } = useChecklistProgress();

  const racesCount = races.length;
  const totalLessons = bootcampLessons.length;
  const lessonsDone = bootcampDone.size;
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
    'Historia wyscigow',
    {
      es: 'Historial de regatas',
      fr: 'Historique des courses',
      de: 'Rennverlauf',
      it: 'Cronologia delle gare',
    },
  );

  const racesCountLabel = tp(
    `${racesCount} гонок сохранено`,
    `${racesCount} ${racesCount === 1 ? 'race' : 'races'} saved`,
    `${racesCount} wyscigow zapisano`,
    {
      es: `${racesCount} regatas guardadas`,
      fr: `${racesCount} courses enregistrees`,
      de: `${racesCount} Rennen gespeichert`,
      it: `${racesCount} gare salvate`,
    },
  );

  const exportLabel = tp('Экспорт', 'Export', 'Eksport', {
    es: 'Exportar',
    fr: 'Exporter',
    de: 'Exportieren',
    it: 'Esporta',
  });

  const clearLabel = tp('Очистить', 'Clear', 'Wyczysc', {
    es: 'Borrar',
    fr: 'Effacer',
    de: 'Loeschen',
    it: 'Cancella',
  });

  const clearRacesConfirmTitle = tp(
    'Удалить историю гонок?',
    'Clear race history?',
    'Wyczyscic historie wyscigow?',
    {
      es: 'Borrar historial de regatas?',
      fr: 'Effacer l historique des courses ?',
      de: 'Rennverlauf loeschen?',
      it: 'Cancellare la cronologia delle gare?',
    },
  );

  const clearRacesConfirmBody = tp(
    `Будут удалены все ${racesCount} записей. Это нельзя отменить.`,
    `All ${racesCount} entries will be deleted. This cannot be undone.`,
    `Wszystkie ${racesCount} wpisow zostanie usunietych. Nie da sie cofnac.`,
    {
      es: `Se eliminaran las ${racesCount} entradas. No se puede deshacer.`,
      fr: `Toutes les ${racesCount} entrees seront supprimees. Irreversible.`,
      de: `Alle ${racesCount} Eintraege werden geloescht. Nicht umkehrbar.`,
      it: `Tutte le ${racesCount} voci saranno eliminate. Non si puo annullare.`,
    },
  );

  const exportEmptyTitle = tp(
    'Пока нечего экспортировать',
    'Nothing to export yet',
    'Nic do eksportu',
    {
      es: 'Nada que exportar aun',
      fr: 'Rien a exporter pour l instant',
      de: 'Noch nichts zu exportieren',
      it: 'Nulla da esportare ancora',
    },
  );

  const exportEmptyBody = tp(
    'Сначала закончите хотя бы одну гонку.',
    'Finish at least one race first.',
    'Najpierw ukoncz przynajmniej jeden wyscig.',
    {
      es: 'Termina al menos una regata primero.',
      fr: 'Terminez au moins une course d abord.',
      de: 'Beenden Sie zuerst mindestens ein Rennen.',
      it: 'Completa prima almeno una gara.',
    },
  );

  const okLabel = tp('OK', 'OK', 'OK', { es: 'OK', fr: 'OK', de: 'OK', it: 'OK' });

  const exportFailTitle = tp(
    'Не удалось экспортировать',
    'Export failed',
    'Nie udalo sie eksportowac',
    {
      es: 'Falló la exportacion',
      fr: 'Echec de l exportation',
      de: 'Export fehlgeschlagen',
      it: 'Esportazione fallita',
    },
  );

  const exportFailBody = tp(
    'Поделиться не получилось. Попробуйте позже.',
    'Could not share the file. Try again later.',
    'Nie udalo sie udostepnic. Sprobuj pozniej.',
    {
      es: 'No se pudo compartir. Intenta mas tarde.',
      fr: 'Partage impossible. Reessayez plus tard.',
      de: 'Teilen fehlgeschlagen. Spaeter erneut versuchen.',
      it: 'Condivisione non riuscita. Riprova piu tardi.',
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
    'Postep Bootcamp',
    {
      es: 'Progreso de Bootcamp',
      fr: 'Progression Bootcamp',
      de: 'Bootcamp-Fortschritt',
      it: 'Progresso Bootcamp',
    },
  );

  const bootcampCountLabel = tp(
    `${lessonsDone} из ${totalLessons} уроков`,
    `${lessonsDone} of ${totalLessons} lessons complete`,
    `${lessonsDone} z ${totalLessons} lekcji`,
    {
      es: `${lessonsDone} de ${totalLessons} lecciones`,
      fr: `${lessonsDone} sur ${totalLessons} lecons`,
      de: `${lessonsDone} von ${totalLessons} Lektionen`,
      it: `${lessonsDone} di ${totalLessons} lezioni`,
    },
  );

  const resetProgressLabel = tp('Сбросить прогресс', 'Reset progress', 'Wyczysc postep', {
    es: 'Reiniciar progreso',
    fr: 'Reinitialiser progression',
    de: 'Fortschritt zuruecksetzen',
    it: 'Azzera progresso',
  });

  const resetBootcampConfirmTitle = tp(
    'Сбросить Bootcamp?',
    'Reset Bootcamp?',
    'Zresetowac Bootcamp?',
    {
      es: 'Reiniciar Bootcamp?',
      fr: 'Reinitialiser Bootcamp ?',
      de: 'Bootcamp zuruecksetzen?',
      it: 'Azzerare Bootcamp?',
    },
  );

  const resetBootcampConfirmBody = tp(
    'Все отметки уроков будут стерты.',
    'All lesson completion ticks will be cleared.',
    'Wszystkie znaczniki lekcji znikna.',
    {
      es: 'Se borraran todas las marcas de lecciones.',
      fr: 'Toutes les coches de lecons seront effacees.',
      de: 'Alle Lektion-Haken werden geloescht.',
      it: 'Tutte le spunte delle lezioni saranno cancellate.',
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
          void Promise.all([
            AsyncStorage.removeItem('regatta.progress.bootcamp.v1'),
            AsyncStorage.removeItem('regatta.progress.bootcamp.lastViewed.v1'),
          ]);
        },
      },
    ]);
  };

  // ----- checklist -----

  const checklistRowLabel = tp(
    'Прогресс чек-листа',
    'Checklist progress',
    'Postep listy',
    {
      es: 'Progreso de la lista',
      fr: 'Progression de la liste',
      de: 'Checklisten-Fortschritt',
      it: 'Progresso della lista',
    },
  );

  const checklistCountLabel = tp(
    `${checklistCount} из ${totalChecklistItems} пунктов`,
    `${checklistCount} of ${totalChecklistItems} items checked`,
    `${checklistCount} z ${totalChecklistItems} pozycji`,
    {
      es: `${checklistCount} de ${totalChecklistItems} elementos`,
      fr: `${checklistCount} sur ${totalChecklistItems} elements`,
      de: `${checklistCount} von ${totalChecklistItems} Punkten`,
      it: `${checklistCount} di ${totalChecklistItems} voci`,
    },
  );

  const resetChecklistConfirmTitle = tp(
    'Сбросить чек-лист?',
    'Reset checklist?',
    'Zresetowac liste?',
    {
      es: 'Reiniciar la lista?',
      fr: 'Reinitialiser la liste ?',
      de: 'Liste zuruecksetzen?',
      it: 'Azzerare la lista?',
    },
  );

  const resetChecklistConfirmBody = tp(
    'Все отметки удалятся, текст останется.',
    'All ticks will be cleared. The content stays.',
    'Wszystkie znaczniki znikna, tresc zostaje.',
    {
      es: 'Se borraran todas las marcas. El contenido se queda.',
      fr: 'Toutes les coches seront effacees. Le contenu reste.',
      de: 'Alle Haken werden geloescht. Der Inhalt bleibt.',
      it: 'Tutte le spunte saranno cancellate. Il testo resta.',
    },
  );

  // touch the helper so unused-import lint stays clean for downstream
  void itemKey;

  const resetLabel = tp('Сбросить', 'Reset', 'Wyczysc', {
    es: 'Reiniciar',
    fr: 'Reinitialiser',
    de: 'Zuruecksetzen',
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
    'Wyczysc wszystkie dane',
    {
      es: 'Borrar todos los datos',
      fr: 'Effacer toutes les donnees',
      de: 'Alle Daten loeschen',
      it: 'Cancella tutti i dati',
    },
  );

  const clearAllHint = tp(
    'Сотрет язык, прогресс, единицы и историю.',
    'Wipes language, progress, units, and history.',
    'Skasuje jezyk, postep, jednostki i historie.',
    {
      es: 'Borra idioma, progreso, unidades e historial.',
      fr: 'Supprime langue, progression, unites et historique.',
      de: 'Loescht Sprache, Fortschritt, Einheiten und Verlauf.',
      it: 'Cancella lingua, progresso, unita e cronologia.',
    },
  );

  const clearAllStep1Title = tp(
    'Удалить все данные?',
    'Clear all data?',
    'Wyczyscic wszystkie dane?',
    {
      es: 'Borrar todos los datos?',
      fr: 'Effacer toutes les donnees ?',
      de: 'Alle Daten loeschen?',
      it: 'Cancellare tutti i dati?',
    },
  );

  const clearAllStep1Body = tp(
    'Будут стерты прогресс, история гонок, единицы измерения и язык.',
    'Will erase progress, race history, unit preferences, and language.',
    'Skasuje postep, historie wyscigow, jednostki i jezyk.',
    {
      es: 'Borrara progreso, historial de regatas, unidades e idioma.',
      fr: 'Effacera progression, historique des courses, unites et langue.',
      de: 'Loescht Fortschritt, Rennverlauf, Einheiten und Sprache.',
      it: 'Cancellera progresso, cronologia delle gare, unita e lingua.',
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
    'Tego nie da sie cofnac',
    {
      es: 'Esto no se puede deshacer',
      fr: 'Cette action est irreversible',
      de: 'Dies kann nicht rueckgaengig gemacht werden',
      it: 'Questa azione non puo essere annullata',
    },
  );

  const clearAllStep2Body = tp(
    'Тапни «Удалить все», чтобы подтвердить.',
    'Tap "Delete all" to confirm.',
    'Stuknij "Usun wszystko" aby potwierdzic.',
    {
      es: 'Toca "Borrar todo" para confirmar.',
      fr: 'Touchez "Tout effacer" pour confirmer.',
      de: 'Tippen Sie "Alles loeschen" zum Bestaetigen.',
      it: 'Tocca "Elimina tutto" per confermare.',
    },
  );

  const deleteAllLabel = tp('Удалить все', 'Delete all', 'Usun wszystko', {
    es: 'Borrar todo',
    fr: 'Tout effacer',
    de: 'Alles loeschen',
    it: 'Elimina tutto',
  });

  const clearAllDoneTitle = tp('Готово', 'Done', 'Gotowe', {
    es: 'Listo',
    fr: 'Termine',
    de: 'Fertig',
    it: 'Fatto',
  });

  const clearAllDoneBody = tp(
    'Все локальные данные приложения удалены.',
    'All local app data has been removed.',
    'Wszystkie lokalne dane aplikacji usuniete.',
    {
      es: 'Se eliminaron todos los datos locales de la app.',
      fr: 'Toutes les donnees locales de l app ont ete supprimees.',
      de: 'Alle lokalen App-Daten wurden entfernt.',
      it: 'Tutti i dati locali dell app sono stati rimossi.',
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
            disabled={!bootcampReady || lessonsDone === 0}
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
    'Polityka prywatnosci',
    {
      es: 'Politica de privacidad',
      fr: 'Politique de confidentialite',
      de: 'Datenschutzerklaerung',
      it: 'Informativa sulla privacy',
    },
  );

  const closeLabel = tp('Закрыть', 'Close', 'Zamknij', {
    es: 'Cerrar',
    fr: 'Fermer',
    de: 'Schliessen',
    it: 'Chiudi',
  });

  const intro = tp(
    'Week to Regatta уважает вашу приватность. Приложение не отслеживает вас между сервисами и не собирает данные, которые вас идентифицируют.',
    'Week to Regatta respects your privacy. The app does not track you across services and does not collect data that identifies you personally.',
    'Week to Regatta szanuje Twoja prywatnosc. Aplikacja nie sledzi Cie miedzy uslugami i nie zbiera danych, ktore Cie identyfikuja.',
    {
      es: 'Week to Regatta respeta tu privacidad. La app no te rastrea entre servicios y no recopila datos que te identifiquen personalmente.',
      fr: 'Week to Regatta respecte votre vie privee. L\'application ne vous suit pas entre services et ne collecte pas de donnees qui vous identifient personnellement.',
      de: 'Week to Regatta respektiert Ihre Privatsphaere. Die App verfolgt Sie nicht ueber Dienste hinweg und sammelt keine Daten, die Sie persoenlich identifizieren.',
      it: 'Week to Regatta rispetta la tua privacy. L\'app non ti traccia tra servizi e non raccoglie dati che ti identificano personalmente.',
    },
  );

  // Honest disclosure of the anonymous PostHog product analytics that the app
  // actually ships (key in app.json -> analyticsEnabled true). Matches the
  // ASC App Privacy label "Data Collected: Analytics / Product Interaction,
  // not linked to identity, not used for tracking" and NSPrivacyTracking=false.
  const noAnalytics = tp(
    'Приложение отправляет анонимную продуктовую аналитику в PostHog: просмотры экранов и ключевые события (например, старт и финиш гонки), помеченные языком и версией приложения. Эти данные не привязаны к вашей личности и никогда не используются для межсервисного трекинга.',
    'The app sends anonymous product analytics to PostHog: screen views and key events (such as race start and finish), tagged with your app language and version. This data is not linked to your identity and is never used for cross-app tracking.',
    'Aplikacja wysyla anonimowa analityke produktowa do PostHog: odslony ekranow i kluczowe zdarzenia (np. start i meta wyscigu), oznaczone jezykiem i wersja aplikacji. Te dane nie sa powiazane z Twoja tozsamoscia i nigdy nie sluza do sledzenia miedzy aplikacjami.',
    {
      es: 'La app envia analitica de producto anonima a PostHog: vistas de pantalla y eventos clave (como el inicio y el final de la regata), etiquetados con tu idioma y version de la app. Estos datos no se vinculan a tu identidad y nunca se usan para rastreo entre apps.',
      fr: 'L\'application envoie des analyses produit anonymes a PostHog : vues d\'ecran et evenements cles (comme le depart et l\'arrivee de la course), associes a votre langue et version de l\'app. Ces donnees ne sont pas liees a votre identite et ne servent jamais au suivi entre applications.',
      de: 'Die App sendet anonyme Produktanalysen an PostHog: Bildschirmaufrufe und wichtige Ereignisse (z. B. Start und Ziel des Rennens), versehen mit Ihrer App-Sprache und -Version. Diese Daten sind nicht mit Ihrer Identitaet verknuepft und werden nie fuer App-uebergreifendes Tracking verwendet.',
      it: 'L\'app invia analisi di prodotto anonime a PostHog: visualizzazioni delle schermate ed eventi chiave (come partenza e arrivo della gara), contrassegnati con la lingua e la versione dell\'app. Questi dati non sono collegati alla tua identita e non vengono mai usati per il tracciamento tra app.',
    },
  );

  const localOnly = tp(
    'Прогресс по урокам и язык интерфейса хранятся только локально на вашем устройстве (AsyncStorage). Вы можете очистить их в любой момент через системные настройки приложения.',
    'Lesson progress and your language preference live only locally on your device (AsyncStorage). You can clear them anytime via the system app settings.',
    'Postep w lekcjach i preferencja jezyka sa przechowywane wylacznie lokalnie na urzadzeniu (AsyncStorage). Mozesz je usunac w dowolnym momencie z ustawien systemowych aplikacji.',
    {
      es: 'El progreso de las lecciones y tu idioma se guardan solo localmente en tu dispositivo (AsyncStorage). Puedes borrarlos cuando quieras desde los ajustes del sistema.',
      fr: 'La progression des lecons et votre langue sont stockees uniquement en local sur votre appareil (AsyncStorage). Vous pouvez les effacer a tout moment via les reglages systeme de lapp.',
      de: 'Lernfortschritt und Spracheinstellung werden ausschliesslich lokal auf Ihrem Geraet gespeichert (AsyncStorage). Sie koennen sie jederzeit ueber die System-Einstellungen der App loeschen.',
      it: 'Il progresso delle lezioni e la tua lingua restano solo in locale sul dispositivo (AsyncStorage). Puoi cancellarli in qualsiasi momento dalle impostazioni di sistema dellapp.',
    },
  );

  const network = tp(
    'Изображения и видео в галерее загружаются из сети с weektoregatta.com. Сервер не получает идентификаторов и не строит профиль пользователя.',
    'Images and videos in the gallery load from weektoregatta.com over the network. The server does not receive identifiers and does not build a user profile.',
    'Obrazy i wideo w galerii laduja sie z weektoregatta.com przez siec. Serwer nie otrzymuje identyfikatorow i nie buduje profilu uzytkownika.',
    {
      es: 'Las imagenes y los videos de la galeria se cargan desde weektoregatta.com por red. El servidor no recibe identificadores ni crea un perfil de usuario.',
      fr: 'Les images et videos de la galerie sont chargees depuis weektoregatta.com via le reseau. Le serveur ne recoit pas didentifiants et ne construit pas de profil utilisateur.',
      de: 'Bilder und Videos in der Galerie werden ueber das Netzwerk von weektoregatta.com geladen. Der Server erhaelt keine Kennungen und legt kein Nutzerprofil an.',
      it: 'Immagini e video della galleria si caricano da weektoregatta.com tramite rete. Il server non riceve identificatori e non crea un profilo utente.',
    },
  );

  const webNote = tp(
    'У сайта weektoregatta.com есть собственный раздел приватности. Мобильное приложение использует те же базовые принципы.',
    'The website weektoregatta.com has its own privacy section. The mobile app uses the same baseline.',
    'Strona weektoregatta.com ma wlasna sekcje prywatnosci. Aplikacja mobilna stosuje te same zasady.',
    {
      es: 'El sitio weektoregatta.com tiene su propia seccion de privacidad. La app movil sigue los mismos principios.',
      fr: 'Le site weektoregatta.com possede sa propre section confidentialite. Lapplication mobile applique les memes principes.',
      de: 'Die Website weektoregatta.com hat einen eigenen Datenschutzbereich. Die mobile App folgt denselben Grundsaetzen.',
      it: 'Il sito weektoregatta.com ha una propria sezione privacy. Lapp mobile applica gli stessi principi.',
    },
  );

  const contact = tp(
    `Вопросы по приватности: ${SUPPORT_EMAIL}.`,
    `Privacy questions: ${SUPPORT_EMAIL}.`,
    `Pytania o prywatnosc: ${SUPPORT_EMAIL}.`,
    {
      es: `Preguntas sobre privacidad: ${SUPPORT_EMAIL}.`,
      fr: `Questions sur la confidentialite : ${SUPPORT_EMAIL}.`,
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
    borderColor: 'rgba(255, 68, 68, 0.35)',
    marginTop: spacing.md,
  },
  dangerLabel: {
    color: colors.danger,
  },
});

const privacyStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 18, 36, 0.92)',
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
