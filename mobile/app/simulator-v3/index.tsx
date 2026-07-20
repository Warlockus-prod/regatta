import { useLocalSearchParams } from 'expo-router';
import { SimWebView } from '../../src/simulator/SimWebView';
import { useI18n } from '../../src/i18n/context';
import { passthroughQuery } from '../../src/simulator/passthroughQuery';

// ============================================================================
// Trainer (web V3) screen.
//
// Embeds the live web /simulator-v3 (the "Trener" tier) via WebView for full
// parity with the website (same physics, same UI, same content). Mobile-lane
// only: this loads the deployed web route, it does not edit any web V3 code.
// Route params (e.g. a bootcamp lesson's ?drill=) are passed through to the
// embed. Offline falls back to the native Trainer, which keeps working without
// a network.
// ============================================================================

export default function SimulatorV3Screen() {
  const { tp } = useI18n();
  const params = useLocalSearchParams();
  return (
    <SimWebView
      path="/simulator-v3"
      tier="trainer"
      query={passthroughQuery(params)}
      title={tp('Тренажёр', 'Trainer', 'Trener', {
        es: 'Entrenador',
        fr: 'Entraineur',
        de: 'Trainer',
        it: 'Trainer',
      })}
      fallbackRoute="/simulator"
    />
  );
}
