import { useLocalSearchParams } from 'expo-router';
import { SimWebView } from '../../src/simulator/SimWebView';
import { useI18n } from '../../src/i18n/context';
import { passthroughQuery } from '../../src/simulator/passthroughQuery';

// ============================================================================
// Basics (web V1) screen.
//
// Embeds the live web /simulator (the polished V1 "Podstawy" tier) via WebView
// for full parity with the website - same compass rose, points of sail and
// instruments. The page scrolls (compass on top, instrument cards below), so
// scroll stays enabled, like /anatomy. Offline falls back to the simple native
// Basics screen.
// ============================================================================

export default function SimulatorV1Screen() {
  const { tp } = useI18n();
  const params = useLocalSearchParams();
  return (
    <SimWebView
      path="/simulator"
      tier="basics"
      query={passthroughQuery(params)}
      title={tp('Основы', 'Basics', 'Podstawy', {
        es: 'Basicos',
        fr: 'Bases',
        de: 'Grundlagen',
        it: 'Basi',
      })}
      scrollEnabled
      fallbackRoute="/simulator-basics"
      fallbackLabel={tp('Основы офлайн (упрощённо)', 'Basics offline (simple)', 'Podstawy offline (uproszczone)', {
        es: 'Basicos sin conexion (simple)',
        fr: 'Bases hors ligne (simple)',
        de: 'Grundlagen offline (einfach)',
        it: 'Basi offline (semplice)',
      })}
    />
  );
}
