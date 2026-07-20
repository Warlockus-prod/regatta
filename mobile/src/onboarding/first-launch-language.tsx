import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'expo-router';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useI18n } from '../i18n/context';
import { detectDeviceLang } from '../i18n/device-locale';
import { ENABLED_LANGUAGES, isLang, type Lang } from '../i18n/languages';
import { Button, Card, Icon, type IconName, Text } from '../design-system/components';
import { colors, motion, radii, spacing } from '../design-system/tokens';
import { useFirstLaunch, type FirstLaunchStage } from '../persistence/firstLaunch';

/**
 * First-launch gate. Sits below `<I18nProvider>` and above `<Stack />`.
 *
 * Day-1 behavior (sprint 1):
 *  - Single language picker, auto-resolve from device locale if possible.
 *
 * Sprint 10:
 *  - Picker becomes Screen 1 of a 3-screen tour:
 *    1. Language picker (skipped automatically if device locale matches)
 *    2. Welcome / value prop with 3 feature cards
 *    3. "Where to start?" with 2 routing chips (Bootcamp / Simulator)
 *  - The flag is now tri-state: pending -> in-tour -> done so an
 *    interruption (app killed mid-tour) resumes correctly on next launch.
 *
 * Children always render so that the splash screen (handled by SplashGate
 * one level up) and the Stack stay mounted; the tour modal layers on top.
 */
export function FirstLaunchGate({ children }: { children: ReactNode }) {
  const { lang, setLang, ready: i18nReady } = useI18n();
  const {
    ready: flagReady,
    stage,
    markInTour,
    markDone,
  } = useFirstLaunch();
  const [tourStep, setTourStep] = useState<TourStep | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (resolved) return;
    if (!i18nReady || !flagReady) return;
    if (stage === 'done') {
      setResolved(true);
      return;
    }
    if (stage === 'in-tour') {
      // App was killed mid-tour. Resume at Screen 2 (welcome) so the
      // user does not have to re-pick the language they already chose.
      setTourStep('welcome');
      return;
    }
    // pristine: try to auto-resolve language from the device locale and
    // jump straight to Screen 2; otherwise show the picker.
    const device = detectDeviceLang();
    if (isLang(device)) {
      setLang(device);
      markInTour();
      setTourStep('welcome');
      return;
    }
    setTourStep('language');
  }, [
    i18nReady,
    flagReady,
    stage,
    resolved,
    setLang,
    markInTour,
  ]);

  const handleLanguageContinue = () => {
    markInTour();
    setTourStep('welcome');
  };

  const handleWelcomeNext = () => {
    setTourStep('start');
  };

  const handleWelcomeBack = () => {
    // Allow going back to language only if we showed it. If we
    // auto-resolved, "back" still goes to language as a courtesy.
    setTourStep('language');
  };

  const handleStartBack = () => {
    setTourStep('welcome');
  };

  const finishTour = () => {
    markDone();
    setTourStep(null);
    setResolved(true);
  };

  return (
    <>
      {children}
      {tourStep ? (
        <OnboardingTourModal
          step={tourStep}
          currentLang={lang}
          onPickLanguage={(next) => setLang(next)}
          onLanguageContinue={handleLanguageContinue}
          onWelcomeNext={handleWelcomeNext}
          onWelcomeBack={handleWelcomeBack}
          onStartBack={handleStartBack}
          onFinish={finishTour}
        />
      ) : null}
    </>
  );
}

type TourStep = 'language' | 'welcome' | 'start';
const TOUR_ORDER: TourStep[] = ['language', 'welcome', 'start'];

interface OnboardingTourModalProps {
  step: TourStep;
  currentLang: Lang;
  onPickLanguage: (l: Lang) => void;
  onLanguageContinue: () => void;
  onWelcomeNext: () => void;
  onWelcomeBack: () => void;
  onStartBack: () => void;
  onFinish: () => void;
}

function OnboardingTourModal({
  step,
  currentLang,
  onPickLanguage,
  onLanguageContinue,
  onWelcomeNext,
  onWelcomeBack,
  onStartBack,
  onFinish,
}: OnboardingTourModalProps) {
  const router = useRouter();
  const { tp } = useI18n();
  const stepIndex = TOUR_ORDER.indexOf(step);

  const skipLabel = tp('Пропустить', 'Skip', 'Pomin', {
    es: 'Saltar',
    fr: 'Passer',
    de: 'Ueberspringen',
    it: 'Salta',
  });

  const stepCountLabel = tp(
    `${stepIndex + 1} из ${TOUR_ORDER.length}`,
    `${stepIndex + 1} of ${TOUR_ORDER.length}`,
    `${stepIndex + 1} z ${TOUR_ORDER.length}`,
    {
      es: `${stepIndex + 1} de ${TOUR_ORDER.length}`,
      fr: `${stepIndex + 1} sur ${TOUR_ORDER.length}`,
      de: `${stepIndex + 1} von ${TOUR_ORDER.length}`,
      it: `${stepIndex + 1} di ${TOUR_ORDER.length}`,
    },
  );

  const handleStart = (target: '/bootcamp' | '/simulators') => {
    onFinish();
    // Defer to next tick so the modal teardown doesn't race the route push.
    setTimeout(() => {
      router.push(target);
    }, 0);
  };

  return (
    <Modal
      visible
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onFinish}
    >
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.headerRow}>
            <View style={modalStyles.dotRow} accessibilityLabel={stepCountLabel}>
              {TOUR_ORDER.map((id, i) => (
                <View
                  key={id}
                  style={[
                    modalStyles.dot,
                    i === stepIndex && modalStyles.dotActive,
                  ]}
                />
              ))}
            </View>
            <Pressable
              onPress={onFinish}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={skipLabel}
              style={({ pressed }) => [
                modalStyles.skipBtn,
                pressed && modalStyles.skipBtnPressed,
              ]}
            >
              <Text variant="accent" style={modalStyles.skipLabel}>
                {skipLabel}
              </Text>
            </Pressable>
          </View>

          <SlideStage stepKey={step}>
            {step === 'language' ? (
              <LanguageStep
                currentLang={currentLang}
                onPick={onPickLanguage}
                onContinue={onLanguageContinue}
              />
            ) : null}
            {step === 'welcome' ? (
              <WelcomeStep onBack={onWelcomeBack} onNext={onWelcomeNext} />
            ) : null}
            {step === 'start' ? (
              <StartStep
                onBack={onStartBack}
                onSkip={onFinish}
                onPickBootcamp={() => handleStart('/bootcamp')}
                // The simulators hub, not the native trainer directly: the hub
                // mirrors the web tiers (Basics / Trainer / 3D) since 1.5.0 b30.
                onPickSimulator={() => handleStart('/simulators')}
              />
            ) : null}
          </SlideStage>
        </View>
      </View>
    </Modal>
  );
}

interface SlideStageProps {
  stepKey: TourStep;
  children: ReactNode;
}

function SlideStage({ stepKey, children }: SlideStageProps) {
  // Cross-fade between steps. We deliberately stay with Animated (not
  // reanimated) here because the worklet runtime isn't always ready
  // during the very first frame of a cold launch.
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(SLIDE_OFFSET)).current;

  useEffect(() => {
    fade.setValue(0);
    slide.setValue(SLIDE_OFFSET);
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: motion.base,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: motion.base,
        useNativeDriver: true,
      }),
    ]).start();
  }, [stepKey, fade, slide]);

  return (
    <Animated.View
      style={[
        modalStyles.slideStage,
        { opacity: fade, transform: [{ translateX: slide }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const SLIDE_OFFSET = 24;

interface LanguageStepProps {
  currentLang: Lang;
  onPick: (l: Lang) => void;
  onContinue: () => void;
}

function LanguageStep({
  currentLang,
  onPick,
  onContinue,
}: LanguageStepProps) {
  const { tp } = useI18n();

  const title = tp('Выберите язык', 'Pick your language', 'Wybierz jezyk', {
    es: 'Elige tu idioma',
    fr: 'Choisissez votre langue',
    de: 'Sprache waehlen',
    it: 'Scegli la lingua',
  });

  const subtitle = tp(
    'Можно сменить позже в настройках.',
    'You can change this later in Settings.',
    'Mozesz to zmienic pozniej w ustawieniach.',
    {
      es: 'Puedes cambiarlo mas tarde en Ajustes.',
      fr: 'Vous pouvez changer plus tard dans les Reglages.',
      de: 'Aenderung jederzeit in den Einstellungen moeglich.',
      it: 'Puoi cambiarlo in seguito nelle Impostazioni.',
    },
  );

  const continueLabel = tp('Продолжить', 'Continue', 'Kontynuuj', {
    es: 'Continuar',
    fr: 'Continuer',
    de: 'Weiter',
    it: 'Continua',
  });

  const cards = useMemo(() => ENABLED_LANGUAGES, []);

  return (
    <View style={modalStyles.body}>
      <Text variant="title" style={modalStyles.title}>{title}</Text>
      <Text variant="caption" style={modalStyles.subtitle}>{subtitle}</Text>
      <ScrollView
        style={modalStyles.list}
        contentContainerStyle={modalStyles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {cards.map((langMeta) => {
          const isSelected = langMeta.id === currentLang;
          return (
            <Card
              key={langMeta.id}
              onPress={() => onPick(langMeta.id)}
              style={[
                modalStyles.langCard,
                isSelected && modalStyles.langCardSelected,
              ]}
            >
              <View style={modalStyles.langRow}>
                <View style={modalStyles.langText}>
                  <Text variant="subtitle">{langMeta.nativeName}</Text>
                  <Text variant="caption">{langMeta.name}</Text>
                </View>
                {isSelected ? (
                  <Text variant="accent" style={modalStyles.check}>OK</Text>
                ) : null}
              </View>
            </Card>
          );
        })}
      </ScrollView>
      <View style={modalStyles.footer}>
        <Button onPress={onContinue}>{continueLabel}</Button>
      </View>
    </View>
  );
}

interface WelcomeStepProps {
  onBack: () => void;
  onNext: () => void;
}

function WelcomeStep({ onBack, onNext }: WelcomeStepProps) {
  const { tp } = useI18n();

  const title = tp(
    'Добро пожаловать - неделя до регаты',
    'Welcome - your race-ready week',
    'Witaj - tydzien do regat',
    {
      es: 'Bienvenido - tu semana lista para regata',
      fr: 'Bienvenue - votre semaine pour la regate',
      de: 'Willkommen - Ihre Woche bis zur Regatta',
      it: 'Benvenuto - la tua settimana fino alla regata',
    },
  );

  const subtitle = tp(
    'Учим парусный спорт за неделю и идем под реальный старт.',
    'Learn the basics in a week and step onto the start line confident.',
    'Naucz sie zeglarstwa w tydzien i wyrusz na linie startu.',
    {
      es: 'Aprende lo esencial en una semana y llega a la linea de salida con confianza.',
      fr: 'Apprenez les bases en une semaine et atteignez la ligne de depart avec confiance.',
      de: 'Lerne die Grundlagen in einer Woche und stehe sicher an der Startlinie.',
      it: 'Impara le basi in una settimana e arriva alla linea di partenza con sicurezza.',
    },
  );

  const featureBootcamp = {
    icon: 'cap' as IconName,
    title: tp('Bootcamp', 'Bootcamp', 'Bootcamp', {
      es: 'Bootcamp',
      fr: 'Bootcamp',
      de: 'Bootcamp',
      it: 'Bootcamp',
    }),
    desc: tp(
      '8 уроков за 7 дней - от ветра до правил.',
      '8 lessons across 7 days - from wind to rules.',
      '8 lekcji w 7 dni - od wiatru do zasad.',
      {
        es: '8 lecciones en 7 dias - del viento a las reglas.',
        fr: '8 lecons sur 7 jours - du vent aux regles.',
        de: '8 Lektionen in 7 Tagen - vom Wind bis zu den Regeln.',
        it: '8 lezioni in 7 giorni - dal vento alle regole.',
      },
    ),
  };

  const featureSimulator = {
    icon: 'simulator' as IconName,
    title: tp('Симулятор', 'Simulator', 'Symulator', {
      es: 'Simulador',
      fr: 'Simulateur',
      de: 'Simulator',
      it: 'Simulatore',
    }),
    desc: tp(
      'Чувство паруса и тактики - без выхода в море.',
      'Feel for sail and tactics, without leaving the dock.',
      'Wyczucie zagla i taktyki - bez wyplyniecia.',
      {
        es: 'Tacto de vela y tactica, sin salir del puerto.',
        fr: 'Sens de la voile et tactique, sans quitter le port.',
        de: 'Gespuer fuer Segel und Taktik - ohne den Hafen zu verlassen.',
        it: 'Sensibilita per vela e tattica, senza lasciare il porto.',
      },
    ),
  };

  const featureChecklist = {
    icon: 'check' as IconName,
    title: tp('Чек-лист', 'Pre-race checklist', 'Lista przed startem', {
      es: 'Lista pre-regata',
      fr: 'Liste pre-course',
      de: 'Vorstart-Checkliste',
      it: 'Lista pre-gara',
    }),
    desc: tp(
      'Чтобы ничего не забыть в утро гонки.',
      'So you forget nothing on race morning.',
      'Aby nic nie zapomniec w poranek wyscigu.',
      {
        es: 'Para que no olvides nada la manana de la regata.',
        fr: 'Pour ne rien oublier le matin de la course.',
        de: 'Damit Sie am Renntag nichts vergessen.',
        it: 'Cosi non dimentichi nulla la mattina della gara.',
      },
    ),
  };

  const features = [featureBootcamp, featureSimulator, featureChecklist];

  const backLabel = tp('Назад', 'Back', 'Wstecz', {
    es: 'Atras',
    fr: 'Retour',
    de: 'Zurueck',
    it: 'Indietro',
  });

  const nextLabel = tp('Далее', 'Next', 'Dalej', {
    es: 'Siguiente',
    fr: 'Suivant',
    de: 'Weiter',
    it: 'Avanti',
  });

  return (
    <View style={modalStyles.body}>
      <Text variant="title" style={modalStyles.title}>{title}</Text>
      <Text variant="caption" style={modalStyles.subtitle}>{subtitle}</Text>
      <ScrollView
        style={modalStyles.list}
        contentContainerStyle={modalStyles.featureList}
        showsVerticalScrollIndicator={false}
      >
        {features.map((feat) => (
          <Card key={feat.title} style={modalStyles.featureCard}>
            <View style={modalStyles.featureRow}>
              <Icon
                name={feat.icon}
                size={32}
                color={colors.accentCyan}
                style={modalStyles.featureIcon}
              />
              <View style={modalStyles.featureText}>
                <Text variant="subtitle">{feat.title}</Text>
                <Text variant="caption" style={modalStyles.featureDesc}>
                  {feat.desc}
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
      <View style={modalStyles.footerRow}>
        <View style={modalStyles.footerHalf}>
          <Button onPress={onBack} variant="secondary">{backLabel}</Button>
        </View>
        <View style={modalStyles.footerHalf}>
          <Button onPress={onNext}>{nextLabel}</Button>
        </View>
      </View>
    </View>
  );
}

interface StartStepProps {
  onBack: () => void;
  onSkip: () => void;
  onPickBootcamp: () => void;
  onPickSimulator: () => void;
}

function StartStep({
  onBack,
  onSkip,
  onPickBootcamp,
  onPickSimulator,
}: StartStepProps) {
  const { tp } = useI18n();

  const title = tp(
    'С чего начнем?',
    'Where would you like to start?',
    'Od czego zaczniemy?',
    {
      es: 'Por donde quieres empezar?',
      fr: 'Par ou voulez-vous commencer ?',
      de: 'Wo moechten Sie anfangen?',
      it: 'Da dove vuoi iniziare?',
    },
  );

  const subtitle = tp(
    'Можно сменить выбор - все экраны доступны с главного.',
    'You can switch later - everything is available from Home.',
    'Mozesz zmienic - wszystko dostepne z ekranu glownego.',
    {
      es: 'Puedes cambiar luego - todo esta disponible desde Inicio.',
      fr: 'Vous pouvez changer - tout est accessible depuis l accueil.',
      de: 'Sie koennen spaeter wechseln - alles ist vom Start erreichbar.',
      it: 'Puoi cambiare - tutto e disponibile dalla Home.',
    },
  );

  const newToSailing = {
    icon: 'cap' as IconName,
    label: tp(
      'День 1 - я новичок в парусе',
      'Day 1 - I am new to sailing',
      'Dzien 1 - jestem nowy w zeglarstwie',
      {
        es: 'Dia 1 - soy nuevo en la vela',
        fr: 'Jour 1 - je debute en voile',
        de: 'Tag 1 - ich bin neu im Segeln',
        it: 'Giorno 1 - sono nuovo nella vela',
      },
    ),
    hint: tp(
      'Пройдем 8 уроков от основ к гонке.',
      'We walk through 8 lessons, from basics to a mini-race.',
      'Przejdziemy 8 lekcji od podstaw do wyscigu.',
      {
        es: 'Recorremos 8 lecciones, de las bases a la mini-regata.',
        fr: 'Nous parcourons 8 lecons, des bases a une mini-course.',
        de: 'Wir gehen 8 Lektionen durch, von den Grundlagen bis zum Mini-Rennen.',
        it: 'Percorriamo 8 lezioni, dalle basi a una mini-gara.',
      },
    ),
  };

  const knowsBasics = {
    icon: 'simulator' as IconName,
    label: tp(
      'Основы знаю - дай симулятор',
      'I have basics, take me to the simulator',
      'Znam podstawy, pokaz symulator',
      {
        es: 'Tengo lo basico, llevame al simulador',
        fr: 'J ai les bases, allons au simulateur',
        de: 'Ich kenne die Grundlagen, zum Simulator',
        it: 'Conosco le basi, portami al simulatore',
      },
    ),
    hint: tp(
      'Вертикальные парусные сценарии и гонки 1-к-1.',
      'Sail-trim scenarios and head-to-head sprints.',
      'Scenariusze trymu i pojedynki 1-na-1.',
      {
        es: 'Escenarios de trimado y carreras uno-contra-uno.',
        fr: 'Scenarios de reglage et duels en tete-a-tete.',
        de: 'Trimm-Szenarien und 1-zu-1-Sprints.',
        it: 'Scenari di trimaggio e duelli 1-contro-1.',
      },
    ),
  };

  const backLabel = tp('Назад', 'Back', 'Wstecz', {
    es: 'Atras',
    fr: 'Retour',
    de: 'Zurueck',
    it: 'Indietro',
  });

  const skipLabel = tp('На главный', 'Go to Home', 'Do strony glownej', {
    es: 'Ir a Inicio',
    fr: 'Aller a l accueil',
    de: 'Zur Startseite',
    it: 'Vai alla Home',
  });

  const options = [
    { ...newToSailing, onPress: onPickBootcamp, key: 'bootcamp' as const },
    { ...knowsBasics, onPress: onPickSimulator, key: 'simulator' as const },
  ];

  return (
    <View style={modalStyles.body}>
      <Text variant="title" style={modalStyles.title}>{title}</Text>
      <Text variant="caption" style={modalStyles.subtitle}>{subtitle}</Text>
      <ScrollView
        style={modalStyles.list}
        contentContainerStyle={modalStyles.startList}
        showsVerticalScrollIndicator={false}
      >
        {options.map((opt) => (
          <Card
            key={opt.key}
            accent="cyan"
            onPress={opt.onPress}
            style={modalStyles.startCard}
          >
            <View style={modalStyles.featureRow}>
              <Icon
                name={opt.icon}
                size={36}
                color={colors.accentCyan}
                style={modalStyles.featureIcon}
              />
              <View style={modalStyles.featureText}>
                <Text variant="subtitle">{opt.label}</Text>
                <Text variant="caption" style={modalStyles.featureDesc}>
                  {opt.hint}
                </Text>
              </View>
              <Text variant="accent" style={modalStyles.startArrow}>
                {'>'}
              </Text>
            </View>
          </Card>
        ))}
      </ScrollView>
      <View style={modalStyles.footerRow}>
        <View style={modalStyles.footerHalf}>
          <Button onPress={onBack} variant="secondary">{backLabel}</Button>
        </View>
        <View style={modalStyles.footerHalf}>
          <Button onPress={onSkip} variant="ghost">{skipLabel}</Button>
        </View>
      </View>
    </View>
  );
}

const screenHeight = Dimensions.get('window').height;

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 18, 36, 0.96)',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderCyanFaint,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    maxHeight: Math.max(screenHeight - 80, 480),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  dotRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderCyanSoft,
  },
  dotActive: {
    backgroundColor: colors.accentCyan,
  },
  skipBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  skipBtnPressed: {
    opacity: 0.6,
  },
  skipLabel: {
    fontSize: 14,
  },
  slideStage: {
    flexShrink: 1,
  },
  body: {
    flexShrink: 1,
  },
  title: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.lg,
  },
  list: {
    flexShrink: 1,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
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
  featureList: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  featureCard: {
    paddingVertical: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIcon: {
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
  },
  featureDesc: {
    marginTop: 2,
  },
  startList: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  startCard: {
    paddingVertical: spacing.lg,
  },
  startArrow: {
    fontSize: 20,
    fontWeight: '700',
  },
  footer: {
    marginTop: spacing.lg,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  footerHalf: {
    flex: 1,
  },
});

// Re-export the stage type so other modules can reference it without
// re-importing from `persistence/firstLaunch`.
export type { FirstLaunchStage };
