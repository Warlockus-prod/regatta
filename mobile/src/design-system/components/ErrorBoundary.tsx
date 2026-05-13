import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, spacing } from '../tokens';
import { detectDeviceLang } from '../../i18n/device-locale';
import { type Lang } from '../../i18n/languages';

/**
 * Single-name monospace font per platform. RN's StyleSheet `fontFamily`
 * accepts one font name (no CSS font-stack), so we resolve at compile
 * time. iOS ships Menlo system-wide; Android Material has `monospace`.
 */
const MONO_FONT = Platform.select({ ios: 'Menlo', default: 'monospace' });

/**
 * The ErrorBoundary lives ABOVE `<I18nProvider>` in the tree (it has to
 * - the provider itself could throw on first hydration). We can't call
 * `useI18n()` from a class component above the provider, so we resolve
 * the device locale once at render time and hand-roll a tiny lookup for
 * the only two strings rendered in the fallback.
 *
 * Source RU is included so a Russian-locale device sees a familiar
 * string instead of EN. Other locales fall back to EN. This duplicates
 * the i18n machinery but keeps the safety net dependency-free.
 */
const FALLBACK_COPY: Record<Lang, { title: string; body: string }> = {
  ru: {
    title: 'Что-то пошло не так',
    body: 'Приложение столкнулось с ошибкой. Закройте его и откройте снова. Если повторяется - стек в dev-консоли.',
  },
  en: {
    title: 'Something went wrong',
    body: 'The app hit an error and stopped rendering. Force-quit and reopen to continue. If it keeps happening, the dev console has the stack.',
  },
  pl: {
    title: 'Cos poszlo nie tak',
    body: 'Aplikacja napotkala blad. Zamknij i uruchom ponownie. Jesli sie powtarza - stos w konsoli dev.',
  },
  es: {
    title: 'Algo salio mal',
    body: 'La app tuvo un error y dejo de renderizar. Cierrala y vuelve a abrir. Si persiste, mira la consola dev.',
  },
  fr: {
    title: 'Une erreur est survenue',
    body: 'L application a rencontre une erreur. Fermez et rouvrez. Si cela persiste, la console dev a la pile.',
  },
  de: {
    title: 'Etwas ist schiefgelaufen',
    body: 'Die App hatte einen Fehler. Beenden und neu oeffnen. Bei Wiederholung steht der Stack in der Dev-Konsole.',
  },
  it: {
    title: 'Qualcosa e andato storto',
    body: 'L app ha avuto un errore. Chiudila e riaprila. Se persiste, lo stack e nella console dev.',
  },
};

function resolveFallbackCopy(): { title: string; body: string } {
  const detected = detectDeviceLang();
  // detectDeviceLang returns DEFAULT_LANG ('ru') as the safe fallback.
  return FALLBACK_COPY[detected] ?? FALLBACK_COPY.en;
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Root error boundary. Catches uncaught errors in the React tree and
 * shows a brand-styled fallback instead of letting Expo's white-screen
 * red-box error escape to the user. In development the error message
 * is surfaced for quick triage; in production we keep it muted and
 * just instruct the user to relaunch.
 *
 * For Phase 5 polish we will wire `expo-updates`'s `reloadAsync` here
 * for a one-tap recovery, and ship `Sentry` capture so the JS stack
 * surfaces in the dashboard.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[Regatta] ErrorBoundary caught:', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    const copy = resolveFallbackCopy();
    return (
      <View style={styles.root}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text variant="muted" style={styles.body}>{copy.body}</Text>
        {__DEV__ && this.state.error ? (
          <View style={styles.devBox}>
            <Text variant="muted" style={styles.devText}>
              {this.state.error.message}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bgPrimary,
  },
  title: {
    color: colors.accentCyan,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
  devBox: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.bgCard,
    borderColor: 'rgba(255, 68, 68, 0.40)',
    borderWidth: 1,
    maxWidth: 320,
  },
  devText: {
    fontFamily: MONO_FONT,
    fontSize: 12,
    color: colors.danger,
  },
});
