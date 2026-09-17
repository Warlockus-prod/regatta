import { useLocalSearchParams } from 'expo-router';
import { SimWebView } from '../../src/simulator/SimWebView';
import { useI18n } from '../../src/i18n/context';
import { passthroughQuery } from '../../src/simulator/passthroughQuery';

const OFFLINE_SAILING = require("../../assets/sailing-offline.html");

// The same Trainer source and yacht as the website, bundled for first-launch
// offline use. Deep-link parameters are injected before the local app mounts.

export default function SimulatorV3Screen() {
  const { tp } = useI18n();
  const params = useLocalSearchParams();
  return (
    <SimWebView
      path="/simulator-v3"
      tier="trainer"
      offlineSource={OFFLINE_SAILING}
      query={passthroughQuery(params)}
      title={tp('Тренажёр', 'Trainer', 'Trener', {
        es: 'Entrenador',
        fr: 'Entraineur',
        de: 'Trainer',
        it: 'Trainer',
      })}
      fallbackRoute="/simulator-basics"
      fallbackLabel={tp("Открыть Основы (офлайн)", "Open Basics (offline)", "Otwórz Podstawy (offline)", {
        es: "Abrir Básicos (sin conexión)", fr: "Ouvrir les Bases (hors ligne)", de: "Grundlagen öffnen (offline)", it: "Apri le Basi (offline)",
      })}
    />
  );
}
