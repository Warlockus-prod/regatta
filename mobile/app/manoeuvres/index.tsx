import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator } from 'react-native';
import { SimWebView } from '../../src/simulator/SimWebView';
import { Button, Screen, Text } from '../../src/design-system/components';
import { AppSurface, appStackOptions } from '../../src/design-system/surface';
import { colors } from '../../src/design-system/tokens';
import { useI18n } from '../../src/i18n/context';
import { ActivityBack } from '../../src/navigation/ActivityBack';
import { nativeDataEpoch } from '../../src/persistence/data-epoch';
import { MANOEUVRES_STORAGE_BRIDGE_SCRIPT, parseManoeuvresStorageEntries, useManoeuvresWebStorage } from '../../src/persistence/manoeuvres-web-storage';

const OFFLINE_SAILING = require('../../assets/sailing-offline.html');

// ============================================================================
// Manoeuvres screen.
//
// The shared web section (src/features/manoeuvres) runs from the bundled
// sailing package: docking under engine on the harbour model and the sail
// exercises. Its stars cross into AsyncStorage through the storage bridge
// (src/persistence/manoeuvres-web-storage.ts), not file-origin storage. No
// server is needed. The bottom bar stays hidden on this route while the
// learner steers (src/navigation/visibility.ts).
// ============================================================================

export default function ManoeuvresScreen() {
  const { tp } = useI18n();
  const params = useLocalSearchParams<{ ex?: string | string[] }>();
  const ex = typeof params.ex === 'string' && /^[a-z0-9-]{1,48}$/.test(params.ex) ? params.ex : undefined;
  const query = useMemo(() => (ex ? { ex } : undefined), [ex]);
  const storage = useManoeuvresWebStorage();
  const { persist, epoch } = storage;
  const onMessage = useCallback((message: string) => {
    if (message.length > 8192 || epoch !== nativeDataEpoch()) return;
    let data: { type?: unknown; entries?: unknown };
    try { data = JSON.parse(message) as typeof data; } catch { return; }
    if (!data || data.type !== 'manoeuvres-storage') return;
    const entries = parseManoeuvresStorageEntries(data.entries);
    if (entries) void persist(entries).catch(() => undefined);
  }, [persist, epoch]);
  const title = tp('Манёвры', 'Manoeuvres', 'Manewry', {
    es: 'Maniobras',
    fr: 'Manœuvres',
    de: 'Manöver',
    it: 'Manovre',
  });

  if (!storage.ready) return <AppSurface><Screen>
    <Stack.Screen options={{ ...appStackOptions, headerShown: true, title, headerBackVisible: false,
      headerLeft: () => <ActivityBack fallback="/simulators" tintColor={colors.accentCyan} />,
    }} />
    {storage.failed ? <>
      <Text>{tp('Не удалось прочитать звезды «Манёвров». Повтори попытку: сохраненный прогресс не удален.', 'Could not read your Manoeuvres stars. Try again; your saved progress has not been deleted.', 'Nie udało się odczytać gwiazdek z Manewrów. Spróbuj ponownie; zapisany postęp nie został usunięty.', { es: 'No se pudieron leer tus estrellas de Maniobras. Reintenta; tu progreso guardado no se ha borrado.', fr: 'Impossible de lire tes étoiles de Manœuvres. Réessaie ; ta progression n\'a pas été supprimée.', de: 'Deine Manöver-Sterne konnten nicht gelesen werden. Erneut versuchen; dein Fortschritt wurde nicht gelöscht.', it: 'Impossibile leggere le stelle delle Manovre. Riprova; i progressi salvati non sono stati eliminati.' })}</Text>
      <Button onPress={storage.retry}>{tp('Повторить', 'Retry', 'Ponów', { es: 'Reintentar', fr: 'Réessayer', de: 'Erneut versuchen', it: 'Riprova' })}</Button>
    </> : <ActivityIndicator color={colors.accentCyan} />}
  </Screen></AppSurface>;

  return (
    <SimWebView
      key={`manoeuvres-${epoch}`}
      path="/manoeuvres"
      query={query}
      offlineSource={OFFLINE_SAILING}
      localStorage={storage.entries}
      offlineBridgeScript={MANOEUVRES_STORAGE_BRIDGE_SCRIPT}
      onOfflineMessage={onMessage}
      title={title}
      scrollEnabled
      fallbackRoute="/simulator-basics"
      fallbackLabel={tp('Открыть Основы (офлайн)', 'Open Basics (offline)', 'Otwórz Podstawy (offline)', {
        es: 'Abrir Fundamentos (sin conexión)',
        fr: 'Ouvrir les Bases (hors ligne)',
        de: 'Grundlagen öffnen (offline)',
        it: 'Apri le Basi (offline)',
      })}
    />
  );
}
