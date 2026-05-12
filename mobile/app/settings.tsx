import { Stack } from 'expo-router';
import Constants from 'expo-constants';
import { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useI18n } from '../src/i18n/context';
import { ENABLED_LANGUAGES } from '../src/i18n/languages';
import { Button, Card, Screen, Text, Wordmark } from '../src/design-system/components';
import { colors, radii, spacing } from '../src/design-system/tokens';

const SUPPORT_EMAIL = 'support@icoffio.com';

/**
 * Settings screen. v1 has only the language picker; about + version
 * info added in Phase 1 polish, telemetry opt-in in Phase 5.
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

  const phaseLabel = tp(
    'Phase 1 - Content shell',
    'Phase 1 - Content shell',
    'Phase 1 - Content shell',
  );

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

  const telemetryLabel = tp(
    'Телеметрия: выкл',
    'Telemetry: off',
    'Telemetria: wylaczona',
    {
      es: 'Telemetria: desactivada',
      fr: 'Telemetrie : desactivee',
      de: 'Telemetrie: aus',
      it: 'Telemetria: disattivata',
    },
  );

  const telemetryHelp = tp(
    'В этой версии телеметрия отключена. Переключатель появится в будущих сборках.',
    'Telemetry is disabled in this build. A toggle will appear in a future version.',
    'Telemetria jest wylaczona w tej wersji. Przelacznik pojawi sie w przyszlych wydaniach.',
    {
      es: 'La telemetria esta desactivada en esta version. Habra un interruptor en una futura compilacion.',
      fr: 'La telemetrie est desactivee dans cette version. Un commutateur arrivera dans une future build.',
      de: 'Telemetrie ist in dieser Version deaktiviert. Ein Schalter folgt in einem spaeteren Build.',
      it: 'La telemetria e disattivata in questa versione. Un interruttore arrivera in una build futura.',
    },
  );

  const supportHint = tp(
    'support@icoffio.com - откроется ваш почтовый клиент',
    'support@icoffio.com - opens your mail app',
    'support@icoffio.com - otworzy aplikacje pocztowa',
    {
      es: 'support@icoffio.com - abrira tu cliente de correo',
      fr: 'support@icoffio.com - ouvrira votre messagerie',
      de: 'support@icoffio.com - oeffnet Ihre Mail-App',
      it: 'support@icoffio.com - aprira il tuo client email',
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
                    <Text variant="accent" style={styles.check}>OK</Text>
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
          {aboutSectionLabel.toUpperCase()}
        </Text>
        <Card style={styles.aboutCard}>
          <Wordmark size="m" style={styles.aboutWordmark} />
          <Text variant="caption" style={styles.aboutLine}>
            {versionLabel} {version} (build {buildNumber})
          </Text>
          <Text variant="muted" style={styles.aboutLine}>
            {phaseLabel}
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
          <Card
            style={styles.privacyCard}
            accessibilityLabel={telemetryLabel}
          >
            <View style={styles.privacyText}>
              <Text variant="subtitle">{telemetryLabel}</Text>
              <Text variant="caption" style={styles.privacyHint}>
                {telemetryHelp}
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>
      <PrivacyModal visible={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </Screen>
  );
}

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
    'Week to Regatta уважает вашу приватность. Это приложение не отслеживает вас и не собирает персональные данные.',
    'Week to Regatta respects your privacy. This app does not track you and does not collect personal data.',
    'Week to Regatta szanuje Twoja prywatnosc. Aplikacja nie sledzi uzytkownikow ani nie zbiera danych osobowych.',
    {
      es: 'Week to Regatta respeta tu privacidad. Esta app no te rastrea y no recopila datos personales.',
      fr: 'Week to Regatta respecte votre vie privee. Cette application ne vous suit pas et ne collecte aucune donnee personnelle.',
      de: 'Week to Regatta respektiert Ihre Privatsphaere. Diese App verfolgt Sie nicht und sammelt keine personenbezogenen Daten.',
      it: 'Week to Regatta rispetta la tua privacy. Questa app non ti traccia e non raccoglie dati personali.',
    },
  );

  const noAnalytics = tp(
    'Никакие данные не отправляются во внешние аналитические сервисы из мобильного приложения. Telemetry: off в этой версии.',
    'No data is sent to external analytics services from the mobile app. Telemetry is off in this build.',
    'Aplikacja nie wysyla zadnych danych do zewnetrznych uslug analitycznych. Telemetria w tej wersji jest wylaczona.',
    {
      es: 'La app no envia datos a servicios de analitica externos. La telemetria esta desactivada en esta version.',
      fr: 'Lapplication nenvoie aucune donnee a des services danalyse externes. La telemetrie est desactivee dans cette build.',
      de: 'Es werden keine Daten an externe Analysedienste gesendet. Telemetrie ist in dieser Version deaktiviert.',
      it: 'Lapp non invia dati a servizi di analisi esterni. La telemetria e disattivata in questa versione.',
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
    'Изображения и видео в галерее загружаются из сети с regatta.icoffio.com. Сервер не получает идентификаторов и не строит профиль пользователя.',
    'Images and videos in the gallery load from regatta.icoffio.com over the network. The server does not receive identifiers and does not build a user profile.',
    'Obrazy i wideo w galerii laduja sie z regatta.icoffio.com przez siec. Serwer nie otrzymuje identyfikatorow i nie buduje profilu uzytkownika.',
    {
      es: 'Las imagenes y los videos de la galeria se cargan desde regatta.icoffio.com por red. El servidor no recibe identificadores ni crea un perfil de usuario.',
      fr: 'Les images et videos de la galerie sont chargees depuis regatta.icoffio.com via le reseau. Le serveur ne recoit pas didentifiants et ne construit pas de profil utilisateur.',
      de: 'Bilder und Videos in der Galerie werden ueber das Netzwerk von regatta.icoffio.com geladen. Der Server erhaelt keine Kennungen und legt kein Nutzerprofil an.',
      it: 'Immagini e video della galleria si caricano da regatta.icoffio.com tramite rete. Il server non riceve identificatori e non crea un profilo utente.',
    },
  );

  const webNote = tp(
    'У сайта regatta.icoffio.com есть собственный раздел приватности. Мобильное приложение использует те же базовые принципы.',
    'The website regatta.icoffio.com has its own privacy section. The mobile app uses the same baseline.',
    'Strona regatta.icoffio.com ma wlasna sekcje prywatnosci. Aplikacja mobilna stosuje te same zasady.',
    {
      es: 'El sitio regatta.icoffio.com tiene su propia seccion de privacidad. La app movil sigue los mismos principios.',
      fr: 'Le site regatta.icoffio.com possede sa propre section confidentialite. Lapplication mobile applique les memes principes.',
      de: 'Die Website regatta.icoffio.com hat einen eigenen Datenschutzbereich. Die mobile App folgt denselben Grundsaetzen.',
      it: 'Il sito regatta.icoffio.com ha una propria sezione privacy. Lapp mobile applica gli stessi principi.',
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
