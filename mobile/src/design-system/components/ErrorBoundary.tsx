import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, spacing } from '../tokens';

/**
 * Single-name monospace font per platform. RN's StyleSheet `fontFamily`
 * accepts one font name (no CSS font-stack), so we resolve at compile
 * time. iOS ships Menlo system-wide; Android Material has `monospace`.
 */
const MONO_FONT = Platform.select({ ios: 'Menlo', default: 'monospace' });

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
    return (
      <View style={styles.root}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text variant="muted" style={styles.body}>
          The app hit an error and stopped rendering. Force-quit and reopen
          to continue. If it keeps happening, the dev console has the stack.
        </Text>
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
